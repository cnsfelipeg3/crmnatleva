/**
 * Quote Request → Proposal Bridge
 * Converts a portal quote request into a draft proposal,
 * reusing template matching and suggestive items from briefingProposalBridge.
 */
import { supabase } from "@/integrations/supabase/client";

// ─── Template matching (same logic as briefingProposalBridge) ───

const TEMPLATE_RULES: Array<{ keywords: RegExp; templateNames: RegExp }> = [
  { keywords: /safari|tanzânia|zanzibar|quênia|serengeti|kruger|botsuana|namíbia|africa/i, templateNames: /safari/i },
  { keywords: /lua de mel|honeymoon|romântic|casamento|noivos|bodas/i, templateNames: /lua de mel|romance|romântic/i },
  { keywords: /japão|tóquio|kyoto|tailândia|bangkok|bali|vietnam|singapura|ásia/i, templateNames: /ásia|asia|futurista/i },
  { keywords: /maldivas|caribe|cancún|punta cana|aruba|bahamas|praia|resort|tropical|orlando|miami|nordeste|fortaleza|salvador|recife|natal/i, templateNames: /tropical/i },
  { keywords: /grécia|santorini|itália|roma|paris|londres|amsterdam|barcelona|madrid|europa|portugal|lisboa|croácia|suíça|viena|praga|budapeste/i, templateNames: /elegância|clássica/i },
  { keywords: /patagônia|torres del paine|ushuaia|aventura|trekking|atacama/i, templateNames: /premium|safari/i },
];

async function pickBestTemplate(searchText: string): Promise<string | null> {
  try {
    const { data: templates } = await (supabase as any)
      .from("proposal_templates")
      .select("id, name, description, is_default")
      .eq("is_active", true);
    if (!templates || templates.length === 0) return null;

    for (const rule of TEMPLATE_RULES) {
      if (rule.keywords.test(searchText)) {
        const match = templates.find((t: any) =>
          rule.templateNames.test(t.name) || rule.templateNames.test(t.description || "")
        );
        if (match) return match.id;
      }
    }

    if (/luxo|premium|vip|sofistic|exclusiv/i.test(searchText)) {
      const match = templates.find((t: any) => /minimalista|premium|elegância|clássica/i.test(t.name));
      if (match) return match.id;
    }

    const defaultTpl = templates.find((t: any) => t.is_default);
    return defaultTpl?.id || templates[0]?.id || null;
  } catch { return null; }
}

// ─── Destination experiences (reused from briefingProposalBridge) ───

const DESTINATION_EXPERIENCES: Record<string, Array<{ title: string; description: string }>> = {
  orlando: [
    { title: "🎢 Walt Disney World — Magic Kingdom", description: "Dia inteiro no parque mais icônico da Disney" },
    { title: "🌊 Universal Studios & Islands of Adventure", description: "Combo de 2 parques incluindo Harry Potter" },
  ],
  miami: [
    { title: "🏖️ South Beach & Art Deco District", description: "Tour guiado pela icônica Ocean Drive" },
    { title: "🛍️ Sawgrass Mills Outlet", description: "Dia de compras no maior outlet da Flórida" },
  ],
  paris: [
    { title: "🗼 Torre Eiffel — Acesso prioritário", description: "Ingresso com horário marcado + champagne no topo" },
    { title: "🎨 Museu do Louvre — Tour privado", description: "Visita guiada de 3h com especialista" },
  ],
  europa: [
    { title: "🏛️ Tour histórico guiado", description: "Monumentos e museus com guia local em português" },
    { title: "🍷 Experiência enogastronômica", description: "Degustação de vinhos e culinária regional" },
  ],
  maldivas: [
    { title: "🤿 Snorkeling com mantas", description: "Excursão guiada aos melhores pontos de mergulho" },
    { title: "🌅 Jantar privado na praia", description: "Menu degustação com vista do pôr do sol" },
  ],
};

function getExperiences(dest: string): Array<{ title: string; description: string }> {
  const norm = dest.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [key, exps] of Object.entries(DESTINATION_EXPERIENCES)) {
    if (norm.includes(key)) return exps;
  }
  if (/italia|roma|grecia|santorini|portugal|lisboa|espanha|barcelona|londres/.test(norm)) return DESTINATION_EXPERIENCES.europa || [];
  if (/cancun|punta cana|caribe|aruba/.test(norm)) return DESTINATION_EXPERIENCES.maldivas || [];
  return [];
}

// ─── Cabin / Budget labels ───

const CABIN_LABELS: Record<string, string> = {
  economy: "Econômica", premium_economy: "Premium Economy",
  business: "Executiva", first: "Primeira Classe",
};

const BUDGET_LABELS: Record<string, string> = {
  ate_5k: "Até R$ 5.000", "5k_10k": "R$ 5.000 – 10.000",
  "10k_20k": "R$ 10.000 – 20.000", "20k_50k": "R$ 20.000 – 50.000",
  acima_50k: "Acima de R$ 50.000", aberto: "Orçamento aberto",
};

function fmtBR(iso: string) { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; }

function generateSlug(title: string): string {
  return title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) + "-" + Date.now().toString(36);
}

// ─── Main function ───

export interface QuoteToProposalResult {
  proposalId: string;
  slug: string;
}

export async function createProposalFromQuote(quote: Record<string, any>): Promise<QuoteToProposalResult | null> {
  try {
    const dest = quote.destination_city || "Destino";
    const origin = quote.origin_city || "";
    const cabin = CABIN_LABELS[quote.cabin_class || "economy"] || "Econômica";
    const pax = (quote.adults || 0) + (quote.children || 0) + (quote.infants || 0);

    // Build intro text
    const sections: string[] = [];
    if (dest) sections.push(`Destino: ${dest}`);
    if (origin) sections.push(`Origem: ${origin}`);
    if (quote.departure_date || quote.return_date) {
      const parts = [
        quote.departure_date ? fmtBR(quote.departure_date) : null,
        quote.return_date ? fmtBR(quote.return_date) : null,
      ].filter(Boolean).join(" a ");
      sections.push(`Período: ${parts}`);
    }
    const paxParts: string[] = [];
    if (quote.adults) paxParts.push(`${quote.adults} adulto${quote.adults > 1 ? "s" : ""}`);
    if (quote.children) paxParts.push(`${quote.children} criança${quote.children > 1 ? "s" : ""}`);
    if (quote.infants) paxParts.push(`${quote.infants} bebê${quote.infants > 1 ? "s" : ""}`);
    if (paxParts.length) sections.push(`Passageiros: ${paxParts.join(" + ")}`);
    sections.push(`Classe: ${cabin}`);
    if (quote.budget_range) sections.push(`Orçamento: ${BUDGET_LABELS[quote.budget_range] || quote.budget_range}`);
    if (quote.hotel_needed) sections.push("Hotel: solicitado");
    if (quote.transfer_needed) sections.push("Transfer: solicitado");
    if (quote.insurance_needed) sections.push("Seguro viagem: solicitado");
    if (quote.special_requests) sections.push(`Pedidos especiais: ${quote.special_requests}`);

    const introText = `📋 Solicitação recebida do Portal do Viajante:\n\n${sections.join("\n")}`;

    const title = `Proposta ${dest}${quote.client_name ? ` — ${quote.client_name}` : ""}`;
    const slug = generateSlug(title);

    // Pick template
    const searchText = [dest, origin, quote.special_requests, quote.hotel_preferences].filter(Boolean).join(" ");
    const templateId = await pickBestTemplate(searchText);

    // Create proposal
    const { data: created, error } = await (supabase as any)
      .from("proposals")
      .insert({
        title,
        slug,
        status: "rascunho_ia",
        client_name: quote.client_name || null,
        client_id: quote.client_id || null,
        origin: origin || null,
        destinations: dest ? [dest] : [],
        travel_start_date: quote.departure_date || null,
        travel_end_date: quote.return_date || null,
        passenger_count: pax || null,
        intro_text: introText,
        template_id: templateId,
        quote_request_id: quote.id,
      })
      .select("id")
      .single();

    if (error || !created) {
      console.error("[QuoteBridge] Create error:", error);
      return null;
    }

    const proposalId = created.id;

    // Link back: update quote with proposal_id
    await (supabase as any)
      .from("portal_quote_requests")
      .update({ proposal_id: proposalId, status: "quoted", updated_at: new Date().toISOString() })
      .eq("id", quote.id);

    // Build suggestive items
    const items: Array<{ proposal_id: string; item_type: string; position: number; title: string; description: string; data: Record<string, any> }> = [];
    let pos = 0;

    // Flight ida
    if (origin || dest) {
      items.push({
        proposal_id: proposalId, item_type: "flight", position: pos++,
        title: `✈️ Voo ${origin || "Origem"} → ${dest}`,
        description: `Trecho de ida · Classe ${cabin}${quote.departure_date ? ` · ${fmtBR(quote.departure_date)}` : ""}`,
        data: { origin, destination: dest, cabin_class: cabin, departure_date: quote.departure_date, direction: "ida", suggested: true },
      });
      if (quote.return_date) {
        items.push({
          proposal_id: proposalId, item_type: "flight", position: pos++,
          title: `✈️ Voo ${dest} → ${origin || "Origem"}`,
          description: `Trecho de volta · Classe ${cabin} · ${fmtBR(quote.return_date)}`,
          data: { origin: dest, destination: origin, cabin_class: cabin, departure_date: quote.return_date, direction: "volta", suggested: true },
        });
      }
    }

    // Hotel
    if (dest && quote.hotel_needed) {
      const nights = quote.departure_date && quote.return_date
        ? Math.ceil((new Date(quote.return_date + "T12:00:00").getTime() - new Date(quote.departure_date + "T12:00:00").getTime()) / 86400000)
        : null;
      items.push({
        proposal_id: proposalId, item_type: "hotel", position: pos++,
        title: `🏨 Hospedagem em ${dest}`,
        description: `${quote.hotel_preferences || "Hotel"}${nights ? ` · ${nights} noite${nights > 1 ? "s" : ""}` : ""}`,
        data: { destination: dest, check_in: quote.departure_date, check_out: quote.return_date, nights, suggested: true },
      });
    }

    // Transfer
    if (quote.transfer_needed) {
      items.push({
        proposal_id: proposalId, item_type: "transfer", position: pos++,
        title: `🚐 Transfer aeroporto ↔ hotel`,
        description: `Transfer privativo em ${dest} · Ida e volta`,
        data: { destination: dest, round_trip: true, suggested: true },
      });
    }

    // Experiences
    if (dest) {
      for (const exp of getExperiences(dest)) {
        items.push({
          proposal_id: proposalId, item_type: "experience", position: pos++,
          title: exp.title, description: exp.description,
          data: { destination: dest, suggested: true },
        });
      }
    }

    if (items.length > 0) {
      await (supabase as any).from("proposal_items").insert(items);
    }

    return { proposalId, slug };
  } catch (err) {
    console.error("[QuoteBridge] Exception:", err);
    return null;
  }
}
