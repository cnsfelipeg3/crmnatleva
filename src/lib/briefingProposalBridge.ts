/**
 * Briefing → Proposal Bridge
 * Auto-creates and progressively fills a draft proposal
 * as AI agents extract travel data from conversations.
 * 
 * v2: Auto-selects best template based on trip profile + smart date parsing.
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

// ─── Template Matching ───

interface TemplateCandidate {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
}

/** Keyword-based scoring to pick the best template for a trip */
const TEMPLATE_RULES: Array<{
  keywords: RegExp;
  templatePatterns: RegExp;
}> = [
  // Safari / África
  { keywords: /safari|tanzânia|zanzibar|quênia|serengeti|masai|kruger|botsuana|namíbia|africa/i, templatePatterns: /safari/i },
  // Lua de mel / Romântico
  { keywords: /lua de mel|honeymoon|romântic|casamento|noivos|bodas/i, templatePatterns: /roman|lua de mel/i },
  // Ásia
  { keywords: /japão|tóquio|kyoto|osaka|tailândia|bangkok|bali|vietnam|singapura|china|coreia|ásia/i, templatePatterns: /ásia|asia|futurista/i },
  // Praia / Tropical
  { keywords: /maldivas|caribe|cancún|punta cana|aruba|curaçao|bahamas|praia|resort|tropical|orlando|miami|fernando de noronha|porto de galinhas/i, templatePatterns: /tropical|paradise/i },
  // Aventura / Patagônia
  { keywords: /patagônia|patagonia|torres del paine|ushuaia|aventura|trekking|hiking|atacama/i, templatePatterns: /safari|premium/i },
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
        const match = (templates as TemplateCandidate[]).find(t =>
          rule.templatePatterns.test(t.name) || rule.templatePatterns.test(t.description || "")
        );
        if (match) return match.id;
      }
    }

    // Luxury keywords → Elegância Clássica or Minimalista Premium
    if (/luxo|premium|vip|sofistic|exclusiv/i.test(searchText)) {
      const match = (templates as TemplateCandidate[]).find(t =>
        /elegância|clássica|premium|minimalista/i.test(t.name)
      );
      if (match) return match.id;
    }

    // Fallback to default template
    const defaultTpl = (templates as TemplateCandidate[]).find(t => t.is_default);
    return defaultTpl?.id || (templates as TemplateCandidate[])[0]?.id || null;
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

/**
 * Parse flexible date strings like:
 * - "março 2027" → "2027-03-01"
 * - "15/03/2027" → "2027-03-15"  
 * - "2027-03-15" → "2027-03-15"
 * - "março de 2027" → "2027-03-01"
 * - "15 de março de 2027" → "2027-03-15"
 */
function smartParseDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const s = dateStr.trim().toLowerCase();

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  // DD/MM/YYYY
  const dmyMatch = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
  }

  // "15 de março de 2027" or "março de 2027" or "março 2027"
  const ptMatch = s.match(/(?:(\d{1,2})\s+de\s+)?([a-záàâãéèêíïóôõúüçñ]+)\s+(?:de\s+)?(\d{4})/);
  if (ptMatch) {
    const month = MONTH_MAP[ptMatch[2]];
    if (month) {
      const day = ptMatch[1] ? ptMatch[1].padStart(2, "0") : "01";
      return `${ptMatch[3]}-${month}-${day}`;
    }
  }

  // "month year" without "de" (e.g. "março 2027")
  const simpleMatch = s.match(/^([a-záàâãéèêíïóôõúüçñ]+)\s+(\d{4})$/);
  if (simpleMatch) {
    const month = MONTH_MAP[simpleMatch[1]];
    if (month) return `${simpleMatch[2]}-${month}-01`;
  }

  return null;
}

/** Calculate return date from departure + duration */
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
    const fmtDate = (iso: string) => {
      const [y, m, d] = iso.split("-");
      return `${d}/${m}/${y}`;
    };
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
  if (b.hotel_preference || b.hotel_stars) {
    sections.push(`Hotel: ${[b.hotel_preference, b.hotel_stars].filter(Boolean).join(" · ")}`);
  }
  if (b.cabin_class || b.flight_preference) {
    sections.push(`Voo: ${[b.cabin_class, b.flight_preference].filter(Boolean).join(" · ")}`);
  }
  if (b.budget_range) sections.push(`Orçamento: ${b.budget_range}`);
  if (b.transfer_needed) sections.push("Transfer: necessário");
  if (b.rental_car) sections.push("Carro aluguel: sim");

  return sections.length > 0
    ? `📋 Briefing extraído automaticamente pela IA:\n\n${sections.join("\n")}`
    : "";
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) + "-" + Date.now().toString(36);
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

      console.log("[Bridge] Proposal updated:", existing.id);
      return existing.id;
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

      console.log("[Bridge] Proposal created:", created.id, "template:", templateId);
      return created.id;
    }
  } catch (err) {
    console.error("[Bridge] Sync exception:", err);
    return null;
  }
}
