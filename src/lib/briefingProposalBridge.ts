/**
 * Briefing → Proposal Bridge
 * Auto-creates and progressively fills a draft proposal
 * as AI agents extract travel data from conversations.
 * 
 * v3: Auto-selects template + smart dates + suggestive items (flights, hotels, experiences).
 */
import { supabase } from "@/integrations/supabase/client";

/** Fields we track to calculate completeness */
const PROPOSAL_TRACKED_FIELDS = [
  "client_name", "destinations", "origin", "travel_start_date",
  "travel_end_date", "passenger_count", "intro_text",
] as const;

export function countProposalCompleteness(proposal: Record<string, any>): number {
  return PROPOSAL_TRACKED_FIELDS.filter(f => {
    const v = proposal[f];
    if (Array.isArray(v)) return v.length > 0;
    return v != null && v !== "";
  }).length;
}

export const PROPOSAL_TOTAL_FIELDS = PROPOSAL_TRACKED_FIELDS.length;

// ─── Template Matching (uses real template names from DB) ───

/**
 * Maps destination/motivation keywords → template name patterns.
 * Ordered by specificity (most specific first).
 */
const TEMPLATE_RULES: Array<{ keywords: RegExp; templateNames: RegExp }> = [
  // Safari / África
  { keywords: /safari|tanzânia|zanzibar|quênia|serengeti|masai|kruger|botsuana|namíbia|africa/i, templateNames: /safari/i },
  // Lua de mel / Romântico
  { keywords: /lua de mel|honeymoon|romântic|casamento|noivos|bodas/i, templateNames: /lua de mel|romance|romântic/i },
  // Ásia
  { keywords: /japão|tóquio|kyoto|osaka|tailândia|bangkok|bali|vietnam|singapura|china|coreia|ásia/i, templateNames: /ásia|asia|futurista/i },
  // Praia / Tropical (Orlando, Miami, Caribe, Maldivas, etc.)
  { keywords: /maldivas|caribe|cancún|punta cana|aruba|curaçao|bahamas|praia|resort|tropical|orlando|miami|fernando de noronha|porto de galinhas|nordeste|fortaleza|salvador|recife|natal/i, templateNames: /tropical/i },
  // Europa / Clássico
  { keywords: /grécia|grecia|santorini|atenas|mykonos|itália|italia|roma|florença|veneza|paris|londres|amsterdam|barcelona|madrid|europa|portugal|lisboa|porto|croácia|dubrovnik|suíça|viena|praga|budapeste/i, templateNames: /elegância|clássica/i },
  // Aventura / Patagônia
  { keywords: /patagônia|patagonia|torres del paine|ushuaia|aventura|trekking|hiking|atacama/i, templateNames: /premium|safari/i },
];

async function pickBestTemplate(briefing: Record<string, any>): Promise<string | null> {
  try {
    const { data: templates } = await (supabase as any)
      .from("proposal_templates")
      .select("id, name, description, is_default")
      .eq("is_active", true);

    if (!templates || templates.length === 0) return null;

    const searchText = [
      briefing.destination,
      briefing.trip_motivation,
      briefing.group_details,
      briefing.hotel_preference,
    ].filter(Boolean).join(" ");

    // Try to match a specialized template
    for (const rule of TEMPLATE_RULES) {
      if (rule.keywords.test(searchText)) {
        const match = templates.find((t: any) =>
          rule.templateNames.test(t.name) || rule.templateNames.test(t.description || "")
        );
        if (match) return match.id;
      }
    }

    // Luxury keywords → Minimalista Premium or Elegância Clássica
    if (/luxo|premium|vip|sofistic|exclusiv/i.test(searchText)) {
      const match = templates.find((t: any) =>
        /minimalista|premium|elegância|clássica/i.test(t.name)
      );
      if (match) return match.id;
    }

    // Fallback to default template
    const defaultTpl = templates.find((t: any) => t.is_default);
    return defaultTpl?.id || templates[0]?.id || null;
  } catch {
    return null;
  }
}

// ─── Smart Date Parsing ───

const MONTH_MAP: Record<string, string> = {
  janeiro: "01", fevereiro: "02", março: "03", marco: "03",
  abril: "04", maio: "05", junho: "06",
  julho: "07", agosto: "08", setembro: "09",
  outubro: "10", novembro: "11", dezembro: "12",
  jan: "01", fev: "02", mar: "03", abr: "04",
  mai: "05", jun: "06", jul: "07", ago: "08",
  set: "09", out: "10", nov: "11", dez: "12",
};

function smartParseDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const s = dateStr.trim().toLowerCase();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const dmyMatch = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
  const ptMatch = s.match(/(?:(\d{1,2})\s+de\s+)?([a-záàâãéèêíïóôõúüçñ]+)\s+(?:de\s+)?(\d{4})/);
  if (ptMatch) {
    const month = MONTH_MAP[ptMatch[2]];
    if (month) {
      const day = ptMatch[1] ? ptMatch[1].padStart(2, "0") : "01";
      return `${ptMatch[3]}-${month}-${day}`;
    }
  }
  const simpleMatch = s.match(/^([a-záàâãéèêíïóôõúüçñ]+)\s+(\d{4})$/);
  if (simpleMatch) {
    const month = MONTH_MAP[simpleMatch[1]];
    if (month) return `${simpleMatch[2]}-${month}-01`;
  }
  return null;
}

function calcReturnDate(departureISO: string | null, durationDays: number | null): string | null {
  if (!departureISO || !durationDays || durationDays <= 0) return null;
  try {
    const d = new Date(departureISO + "T12:00:00Z");
    d.setDate(d.getDate() + durationDays);
    return d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

// ─── Title & Intro Builders ───

function buildTitle(b: Record<string, any>): string {
  const parts: string[] = [];
  if (b.lead_name) parts.push(b.lead_name);
  if (b.destination) parts.push(b.destination);
  return parts.length > 0 ? parts.join(" — ") : "Proposta IA";
}

function buildIntroText(b: Record<string, any>, startDate: string | null, endDate: string | null): string {
  const sections: string[] = [];
  if (b.destination) sections.push(`Destino: ${b.destination}`);
  if (startDate || endDate) {
    const fmtDate = (iso: string) => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };
    const parts = [startDate ? fmtDate(startDate) : null, endDate ? fmtDate(endDate) : null].filter(Boolean).join(" a ");
    sections.push(`Período: ${parts}${b.duration_days ? ` (${b.duration_days} dias)` : ""}`);
  } else if (b.departure_date) {
    sections.push(`Período: ${b.departure_date}${b.duration_days ? ` (${b.duration_days} dias)` : ""}`);
  }
  if (b.total_people || b.adults) {
    const paxParts: string[] = [];
    if (b.adults) paxParts.push(`${b.adults} adulto${b.adults > 1 ? "s" : ""}`);
    if (b.children && b.children > 0) paxParts.push(`${b.children} criança${b.children > 1 ? "s" : ""}`);
    sections.push(`Passageiros: ${paxParts.join(" + ") || b.total_people}`);
  }
  if (b.group_details) sections.push(`Tipo: ${b.group_details}`);
  if (b.trip_motivation) sections.push(`Motivação: ${b.trip_motivation}`);
  if (b.hotel_preference || b.hotel_stars) sections.push(`Hotel: ${[b.hotel_preference, b.hotel_stars].filter(Boolean).join(" · ")}`);
  if (b.cabin_class || b.flight_preference) sections.push(`Voo: ${[b.cabin_class, b.flight_preference].filter(Boolean).join(" · ")}`);
  if (b.budget_range) sections.push(`Orçamento: ${b.budget_range}`);
  if (b.transfer_needed) sections.push("Transfer: necessário");
  if (b.rental_car) sections.push("Carro aluguel: sim");
  return sections.length > 0 ? `📋 Briefing extraído automaticamente pela IA:\n\n${sections.join("\n")}` : "";
}

function generateSlug(title: string): string {
  return title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) + "-" + Date.now().toString(36);
}

// ─── Suggestive Items Generator ───

/** Destination-specific experience/activity suggestions */
const DESTINATION_EXPERIENCES: Record<string, Array<{ title: string; description: string; type: "experience" }>> = {
  orlando: [
    { title: "🎢 Walt Disney World — Magic Kingdom", description: "Dia inteiro no parque mais icônico da Disney com acesso FastPass+", type: "experience" },
    { title: "🌊 Universal Studios & Islands of Adventure", description: "Combo de 2 parques incluindo The Wizarding World of Harry Potter", type: "experience" },
    { title: "🚀 Kennedy Space Center", description: "Visita ao centro espacial da NASA com simulador de lançamento", type: "experience" },
  ],
  miami: [
    { title: "🏖️ South Beach & Art Deco District", description: "Tour guiado pela icônica Ocean Drive e arquitetura Art Deco", type: "experience" },
    { title: "🛥️ Passeio de barco Biscayne Bay", description: "Cruzeiro pelas mansões de Star Island e Fisher Island", type: "experience" },
    { title: "🛍️ Sawgrass Mills Outlet", description: "Dia de compras no maior outlet da Flórida", type: "experience" },
  ],
  paris: [
    { title: "🗼 Torre Eiffel — Acesso prioritário", description: "Ingresso com horário marcado ao 2º andar + champagne no topo", type: "experience" },
    { title: "🎨 Museu do Louvre — Tour privado", description: "Visita guiada de 3h com especialista em arte", type: "experience" },
    { title: "🥐 Passeio gastronômico por Le Marais", description: "Degustação de queijos, vinhos e doces artesanais", type: "experience" },
  ],
  europa: [
    { title: "🏛️ Tour histórico guiado", description: "Visita aos principais monumentos e museus com guia local em português", type: "experience" },
    { title: "🍷 Experiência enogastronômica", description: "Degustação de vinhos e culinária regional com sommelier", type: "experience" },
    { title: "🚂 Passe de trem europeu", description: "Deslocamento entre cidades com conforto e flexibilidade", type: "experience" },
  ],
  maldivas: [
    { title: "🤿 Snorkeling com mantas e tubarões-baleia", description: "Excursão guiada aos melhores pontos de mergulho do atol", type: "experience" },
    { title: "🌅 Jantar privado na praia", description: "Mesa exclusiva na areia com menu degustação e vista do pôr do sol", type: "experience" },
    { title: "💆 Spa overwater", description: "Tratamento relaxante no spa flutuante sobre o oceano", type: "experience" },
  ],
  japao: [
    { title: "⛩️ Templos de Kyoto — Tour guiado", description: "Visita ao Fushimi Inari, Kinkaku-ji e Arashiyama com guia", type: "experience" },
    { title: "🍣 Experiência culinária em Tsukiji", description: "Aula de sushi e tour pelo mercado de peixes", type: "experience" },
    { title: "🗻 Day trip ao Monte Fuji", description: "Excursão com parada em Hakone e vista panorâmica do Fuji", type: "experience" },
  ],
  safari: [
    { title: "🦁 Game drive ao amanhecer", description: "Safari matinal guiado em veículo 4x4 com ranger especializado", type: "experience" },
    { title: "🎈 Voo de balão sobre Serengeti", description: "Experiência inesquecível ao amanhecer com vista da Grande Migração", type: "experience" },
    { title: "🏕️ Glamping luxury no bush", description: "Hospedagem em tenda premium com todas as comodidades", type: "experience" },
  ],
};

function normalizeDestination(dest: string): string {
  return dest.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function getExperienceSuggestions(destination: string | null): Array<{ title: string; description: string; type: string }> {
  if (!destination) return [];
  const norm = normalizeDestination(destination);

  // Direct match
  for (const [key, experiences] of Object.entries(DESTINATION_EXPERIENCES)) {
    if (norm.includes(key)) return experiences;
  }

  // Broader matching
  if (/tailand|bangkok|phuket/.test(norm)) return DESTINATION_EXPERIENCES.maldivas || [];
  if (/italia|roma|florenc|venez|milao/.test(norm)) return DESTINATION_EXPERIENCES.europa || [];
  if (/grecia|santorini|atenas/.test(norm)) return DESTINATION_EXPERIENCES.europa || [];
  if (/portugal|lisboa|porto/.test(norm)) return DESTINATION_EXPERIENCES.europa || [];
  if (/espanha|barcelona|madrid/.test(norm)) return DESTINATION_EXPERIENCES.europa || [];
  if (/londres|amsterdam|viena|praga|budapest/.test(norm)) return DESTINATION_EXPERIENCES.europa || [];
  if (/tanzania|zanzibar|quenia|kruger|botsuana|namibia|africa/.test(norm)) return DESTINATION_EXPERIENCES.safari || [];
  if (/toquio|kyoto|osaka/.test(norm)) return DESTINATION_EXPERIENCES.japao || [];
  if (/cancun|punta cana|caribe|aruba/.test(norm)) return DESTINATION_EXPERIENCES.maldivas || [];

  return [];
}

function buildSuggestedItems(briefing: Record<string, any>, startDate: string | null, endDate: string | null): Array<{
  item_type: string; position: number; title: string; description: string; data: Record<string, any>;
}> {
  const items: Array<{ item_type: string; position: number; title: string; description: string; data: Record<string, any> }> = [];
  let pos = 0;

  // 1. Flight suggestion
  if (briefing.departure_airport || briefing.destination) {
    const origin = briefing.departure_airport || "Aeroporto de origem";
    const dest = briefing.destination || "Destino";
    const cabin = briefing.cabin_class || "Econômica";
    const airline = briefing.preferred_airline || null;

    items.push({
      item_type: "flight",
      position: pos++,
      title: `✈️ Voo ${origin} → ${dest}`,
      description: `Trecho de ida${airline ? ` — ${airline}` : ""} · Classe ${cabin}${startDate ? ` · ${formatDateBR(startDate)}` : ""}`,
      data: {
        origin, destination: dest, cabin_class: cabin,
        departure_date: startDate, airline, direction: "ida",
        suggested: true,
      },
    });

    if (endDate) {
      items.push({
        item_type: "flight",
        position: pos++,
        title: `✈️ Voo ${dest} → ${origin}`,
        description: `Trecho de volta${airline ? ` — ${airline}` : ""} · Classe ${cabin} · ${formatDateBR(endDate)}`,
        data: {
          origin: dest, destination: origin, cabin_class: cabin,
          departure_date: endDate, airline, direction: "volta",
          suggested: true,
        },
      });
    }
  }

  // 2. Hotel suggestion
  if (briefing.destination) {
    const stars = briefing.hotel_stars || "5 estrelas";
    const pref = briefing.hotel_preference || "Resort/Hotel";
    const nights = briefing.duration_days ? briefing.duration_days - 1 : null;

    items.push({
      item_type: "hotel",
      position: pos++,
      title: `🏨 Hospedagem em ${briefing.destination}`,
      description: `${pref} · ${stars}${nights ? ` · ${nights} noite${nights > 1 ? "s" : ""}` : ""}${briefing.hotel_location ? ` · ${briefing.hotel_location}` : ""}`,
      data: {
        destination: briefing.destination, stars, preference: pref,
        check_in: startDate, check_out: endDate, nights,
        location: briefing.hotel_location || null,
        needs: briefing.hotel_needs || [],
        suggested: true,
      },
    });
  }

  // 3. Transfer suggestion
  if (briefing.transfer_needed) {
    items.push({
      item_type: "transfer",
      position: pos++,
      title: `🚐 Transfer aeroporto ↔ hotel`,
      description: `Transfer privativo em ${briefing.destination || "destino"} · Ida e volta`,
      data: { destination: briefing.destination, round_trip: true, suggested: true },
    });
  }

  // 4. Rental car
  if (briefing.rental_car) {
    items.push({
      item_type: "transfer",
      position: pos++,
      title: `🚗 Aluguel de carro`,
      description: `Carro alugado em ${briefing.destination || "destino"}${briefing.duration_days ? ` · ${briefing.duration_days} dias` : ""}`,
      data: { destination: briefing.destination, rental: true, days: briefing.duration_days, suggested: true },
    });
  }

  // 5. Experience suggestions based on destination
  const experiences = getExperienceSuggestions(briefing.destination);
  for (const exp of experiences) {
    items.push({
      item_type: "experience",
      position: pos++,
      title: exp.title,
      description: exp.description,
      data: { destination: briefing.destination, suggested: true },
    });
  }

  return items;
}

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ─── Main Sync ───

export async function syncBriefingToProposal(briefingId: string): Promise<string | null> {
  try {
    // 1. Fetch the briefing
    const { data: briefing, error: bErr } = await (supabase as any)
      .from("quotation_briefings")
      .select("*")
      .eq("id", briefingId)
      .single();

    if (bErr || !briefing) {
      console.error("[Bridge] Briefing not found:", bErr);
      return null;
    }

    // 2. Check if a proposal already exists for this briefing
    const { data: existing } = await (supabase as any)
      .from("proposals")
      .select("id, template_id")
      .eq("source_briefing_id", briefingId)
      .maybeSingle();

    // 3. Smart date parsing
    const startDate = smartParseDate(briefing.departure_date);
    const endDate = smartParseDate(briefing.return_date)
      || calcReturnDate(startDate, briefing.duration_days);

    const title = buildTitle(briefing);
    const introText = buildIntroText(briefing, startDate, endDate);
    const destinations = briefing.destination ? [briefing.destination] : [];

    const proposalFields: Record<string, any> = {
      title,
      client_name: briefing.lead_name || null,
      client_id: briefing.client_id || null,
      origin: briefing.departure_airport || null,
      destinations,
      travel_start_date: startDate,
      travel_end_date: endDate,
      passenger_count: briefing.total_people || briefing.adults || null,
      intro_text: introText || null,
      updated_at: new Date().toISOString(),
    };

    let proposalId: string | null = null;

    if (existing?.id) {
      // 4a. Update — also pick template if not yet set
      if (!existing.template_id) {
        const templateId = await pickBestTemplate(briefing);
        if (templateId) proposalFields.template_id = templateId;
      }

      await (supabase as any)
        .from("proposals")
        .update(proposalFields)
        .eq("id", existing.id);

      proposalId = existing.id;
      console.log("[Bridge] Proposal updated:", proposalId);
    } else {
      // 4b. Create — pick best template
      const templateId = await pickBestTemplate(briefing);
      const slug = generateSlug(title);

      const { data: created, error: cErr } = await (supabase as any)
        .from("proposals")
        .insert({
          ...proposalFields,
          slug,
          status: "rascunho_ia",
          source_briefing_id: briefingId,
          template_id: templateId,
        })
        .select("id")
        .single();

      if (cErr) {
        console.error("[Bridge] Create error:", cErr);
        return null;
      }

      proposalId = created.id;
      console.log("[Bridge] Proposal created:", proposalId, "template:", templateId);
    }

    // 5. Generate and insert suggestive items
    if (proposalId) {
      await insertSuggestedItems(proposalId, briefing, startDate, endDate);
    }

    return proposalId;
  } catch (err) {
    console.error("[Bridge] Sync exception:", err);
    return null;
  }
}

async function insertSuggestedItems(
  proposalId: string,
  briefing: Record<string, any>,
  startDate: string | null,
  endDate: string | null,
) {
  try {
    // Check if items already exist for this proposal
    const { data: existingItems } = await (supabase as any)
      .from("proposal_items")
      .select("id")
      .eq("proposal_id", proposalId)
      .limit(1);

    if (existingItems && existingItems.length > 0) {
      console.log("[Bridge] Items already exist, skipping");
      return;
    }

    const items = buildSuggestedItems(briefing, startDate, endDate);
    if (items.length === 0) return;

    const rows = items.map(item => ({
      proposal_id: proposalId,
      item_type: item.item_type,
      position: item.position,
      title: item.title,
      description: item.description,
      data: item.data,
    }));

    const { error } = await (supabase as any)
      .from("proposal_items")
      .insert(rows);

    if (error) {
      console.error("[Bridge] Items insert error:", error);
    } else {
      console.log(`[Bridge] Inserted ${rows.length} suggestive items for proposal ${proposalId}`);
    }
  } catch (err) {
    console.error("[Bridge] Items exception:", err);
  }
}
