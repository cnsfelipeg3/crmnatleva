/**
 * Quotation Monitor — Progressive field extraction for real-time dashboard
 * NatLeva v4.3
 */
import { supabase } from "@/integrations/supabase/client";
import { syncBriefingToProposal } from "@/lib/briefingProposalBridge";

// Field groups revealed progressively by exchange count
export const FIELD_GROUPS = [
  { exchangeAt: 0, label: "Lead", fields: ["lead_name", "lead_origin"] },
  { exchangeAt: 1, label: "Viagem", fields: ["destination", "trip_motivation"] },
  { exchangeAt: 2, label: "Grupo", fields: ["total_people", "adults", "children", "group_details"] },
  { exchangeAt: 3, label: "Datas", fields: ["departure_date", "return_date", "duration_days"] },
  { exchangeAt: 4, label: "Orçamento", fields: ["budget_range", "price_sensitivity"] },
  { exchangeAt: 5, label: "Hotel", fields: ["hotel_preference", "hotel_stars", "hotel_location"] },
  { exchangeAt: 6, label: "Perfil", fields: ["lead_type", "lead_sentiment", "travel_experience"] },
  { exchangeAt: 7, label: "Transporte", fields: ["cabin_class", "departure_airport", "flight_preference"] },
  { exchangeAt: 8, label: "Análise", fields: ["behavioral_notes", "conversation_summary"] },
  { exchangeAt: 9, label: "Ação", fields: ["ai_recommendation", "next_steps", "lead_score"] },
] as const;

export const MONITOR_ALL_FIELDS = FIELD_GROUPS.flatMap(g => g.fields);
export const MONITOR_TOTAL_FIELDS = MONITOR_ALL_FIELDS.length;

/** Returns how many briefing fields are non-null */
export function countFilledFields(briefing: Record<string, any>): number {
  return MONITOR_ALL_FIELDS.filter(f => briefing[f] != null && briefing[f] !== "").length;
}

/** Map any lead profile shape to briefing field values */
function mapLeadToFields(lead: any): Record<string, any> {
  // Support both auto mode (LeadInteligente) and chameleon (ChameleonProfile)
  const motivacoes = ["lua de mel", "férias", "aventura", "descanso", "aniversário", "evento", "solo"];
  const sentimentos = ["animado", "cauteloso", "indeciso", "ansioso", "empolgado"];
  const tipos = ["família", "casal", "solo", "amigos", "corporativo"];
  const classes = ["econômica", "executiva", "premium economy"];
  const aeroportos = ["GRU", "CGH", "GIG", "BSB", "CNF", "SSA", "REC", "CWB", "POA", "FOR"];
  const hotelStars = ["3 estrelas", "4 estrelas", "5 estrelas", "Resort", "Boutique"];
  const hotelPrefs = ["Beira-mar", "Centro", "Com piscina", "All-inclusive", "Boutique"];
  const vooPrefs = ["Direto", "1 escala", "Mais barato", "Melhor horário"];

  return {
    lead_name: lead.nome || lead.lead_name || "Lead",
    lead_origin: lead.origem || lead.lead_origin || "Simulador",
    destination: lead.destino || lead.destination || null,
    trip_motivation: lead.motivacao || lead.trip_motivation || motivacoes[Math.floor(Math.random() * motivacoes.length)],
    total_people: lead.pax || lead.total_people || Math.floor(Math.random() * 4) + 1,
    adults: lead.adultos || lead.adults || Math.floor(Math.random() * 3) + 1,
    children: lead.criancas || lead.children || Math.floor(Math.random() * 3),
    group_details: lead.paxLabel || lead.composicaoLabel || lead.group_details || tipos[Math.floor(Math.random() * tipos.length)],
    departure_date: lead.dataIda || lead.departure_date || lead.periodo?.split(" - ")?.[0] || null,
    return_date: lead.dataVolta || lead.return_date || lead.periodo?.split(" - ")?.[1] || null,
    duration_days: lead.duracao || lead.duration_days || Math.floor(Math.random() * 10) + 5,
    budget_range: lead.orcamento || lead.orcamentoLabel || lead.budget_range || null,
    price_sensitivity: lead.sensibilidadePreco || lead.price_sensitivity || ["alta", "media", "baixa"][Math.floor(Math.random() * 3)],
    hotel_preference: lead.hotelPref || lead.hotel_preference || hotelPrefs[Math.floor(Math.random() * hotelPrefs.length)],
    hotel_stars: lead.hotelEstrelas || lead.hotel_stars || hotelStars[Math.floor(Math.random() * hotelStars.length)],
    hotel_location: lead.hotelLocalizacao || lead.hotel_location || null,
    lead_type: lead.tipoLead || lead.lead_type || lead.perfil?.tipo || tipos[Math.floor(Math.random() * tipos.length)],
    lead_sentiment: lead.sentimento || lead.lead_sentiment || sentimentos[Math.floor(Math.random() * sentimentos.length)],
    travel_experience: lead.experienciaViagem || lead.travel_experience || ["iniciante", "intermediário", "experiente"][Math.floor(Math.random() * 3)],
    cabin_class: lead.classe || lead.cabin_class || classes[Math.floor(Math.random() * classes.length)],
    departure_airport: lead.aeroportoSaida || lead.departure_airport || aeroportos[Math.floor(Math.random() * aeroportos.length)],
    flight_preference: lead.prefVoo || lead.flight_preference || vooPrefs[Math.floor(Math.random() * vooPrefs.length)],
    behavioral_notes: lead.notasComportamentais || lead.behavioral_notes || null,
    conversation_summary: lead.resumo || lead.conversation_summary || null,
    ai_recommendation: lead.recomendacaoIA || lead.ai_recommendation || null,
    next_steps: lead.proximosPassos || lead.next_steps || null,
    lead_score: lead.leadScore || lead.lead_score || null,
  };
}

/** Create a blank/minimal briefing for a new lead — returns the briefing ID */
export async function createMonitorBriefing(lead: any): Promise<string | null> {
  try {
    const mapped = mapLeadToFields(lead);
    const { data, error } = await (supabase as any)
      .from("quotation_briefings")
      .insert({
        lead_name: mapped.lead_name,
        lead_origin: "Monitor · " + (mapped.lead_origin || "Simulador"),
        status: "extraindo",
        urgency: "media",
        is_fictional: true,
      })
      .select("id")
      .single();
    if (error) { console.error("[Monitor] Create error:", error); return null; }
    return data.id;
  } catch (err) {
    console.error("[Monitor] Create exception:", err);
    return null;
  }
}

/** Reveal the next batch of fields based on exchange count */
export async function revealMonitorFields(
  briefingId: string,
  exchangeCount: number,
  lead: any,
): Promise<void> {
  const group = FIELD_GROUPS.find(g => g.exchangeAt === exchangeCount);
  if (!group) return;

  const mapped = mapLeadToFields(lead);
  const updates: Record<string, any> = {};

  for (const field of group.fields) {
    if (mapped[field] != null) {
      updates[field] = mapped[field];
    }
  }

  if (Object.keys(updates).length === 0) return;

  try {
    await (supabase as any)
      .from("quotation_briefings")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", briefingId);

    // Sync updated fields to draft proposal
    syncBriefingToProposal(briefingId).catch(() => {});
  } catch (err) {
    console.error("[Monitor] Reveal error:", err);
  }
}

/** Mark briefing as completed extraction */
export async function completeMonitorBriefing(briefingId: string): Promise<void> {
  try {
    await (supabase as any)
      .from("quotation_briefings")
      .update({ status: "pendente", updated_at: new Date().toISOString() })
      .eq("id", briefingId);
  } catch (err) {
    console.error("[Monitor] Complete error:", err);
  }
}

/** Generate summary and recommendation for a completed conversation */
export async function fillAnalysisFields(
  briefingId: string,
  leadName: string,
  destination: string | null,
  conversationSummary?: string,
): Promise<void> {
  const updates: Record<string, any> = {};
  if (!conversationSummary) {
    updates.conversation_summary = `Conversa de qualificação com ${leadName}${destination ? ` sobre ${destination}` : ""}. Lead passou por atendimento completo via simulador.`;
  } else {
    updates.conversation_summary = conversationSummary;
  }
  updates.ai_recommendation = `Montar proposta personalizada para ${destination || "destino solicitado"} com base no perfil e preferências identificadas.`;
  updates.next_steps = "1. Revisar briefing completo 2. Buscar opções de voo e hotel 3. Montar proposta personalizada 4. Enviar ao cliente";
  updates.lead_score = Math.floor(Math.random() * 30) + 60;

  try {
    await (supabase as any)
      .from("quotation_briefings")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", briefingId);
  } catch {}
}
