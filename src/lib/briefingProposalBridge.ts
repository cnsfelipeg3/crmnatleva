/**
 * Briefing → Proposal Bridge
 * Auto-creates and progressively fills a draft proposal
 * as AI agents extract travel data from conversations.
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

/** Build a human-friendly title from briefing data */
function buildTitle(b: Record<string, any>): string {
  const parts: string[] = [];
  if (b.lead_name) parts.push(b.lead_name);
  if (b.destination) parts.push(b.destination);
  if (b.departure_date) {
    // Try to extract month/year
    const match = b.departure_date.match(/(\d{2})\/(\d{4})/);
    if (match) {
      const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
      parts.push(`${months[parseInt(match[1]) - 1] || match[1]} ${match[2]}`);
    }
  }
  return parts.length > 0 ? parts.join(" — ") : "Proposta IA";
}

/** Build intro_text with available briefing info */
function buildIntroText(b: Record<string, any>): string {
  const sections: string[] = [];

  if (b.destination) {
    sections.push(`Destino: ${b.destination}`);
  }
  if (b.departure_date || b.return_date) {
    const dates = [b.departure_date, b.return_date].filter(Boolean).join(" a ");
    sections.push(`Período: ${dates}${b.duration_days ? ` (${b.duration_days} dias)` : ""}`);
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

/** Parse a date string (DD/MM/YYYY or YYYY-MM-DD) to ISO date */
function parseToISODate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.slice(0, 10);
  // DD/MM/YYYY
  const m = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) + "-" + Date.now().toString(36);
}

/**
 * Main sync function — call this whenever briefing data changes.
 * Creates or updates the linked draft proposal.
 */
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
      .select("id")
      .eq("source_briefing_id", briefingId)
      .maybeSingle();

    const title = buildTitle(briefing);
    const introText = buildIntroText(briefing);
    const destinations = briefing.destination ? [briefing.destination] : [];

    const proposalFields: Record<string, any> = {
      title,
      client_name: briefing.lead_name || null,
      client_id: briefing.client_id || null,
      origin: briefing.departure_airport || null,
      destinations,
      travel_start_date: parseToISODate(briefing.departure_date),
      travel_end_date: parseToISODate(briefing.return_date),
      passenger_count: briefing.total_people || briefing.adults || null,
      intro_text: introText || null,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      // 3a. Update existing proposal
      await (supabase as any)
        .from("proposals")
        .update(proposalFields)
        .eq("id", existing.id);

      console.log("[Bridge] Proposal updated:", existing.id);
      return existing.id;
    } else {
      // 3b. Create new draft proposal
      const slug = generateSlug(title);
      const { data: created, error: cErr } = await (supabase as any)
        .from("proposals")
        .insert({
          ...proposalFields,
          slug,
          status: "rascunho_ia",
          source_briefing_id: briefingId,
        })
        .select("id")
        .single();

      if (cErr) {
        console.error("[Bridge] Create error:", cErr);
        return null;
      }

      console.log("[Bridge] Proposal created:", created.id);
      return created.id;
    }
  } catch (err) {
    console.error("[Bridge] Sync exception:", err);
    return null;
  }
}
