import { supabase } from "@/integrations/supabase/client";
import { callSimulatorAI } from "./simuladorAutoUtils";
import type { LeadInteligente, MensagemLead } from "./intelligentLeads";

/**
 * Extracts a structured quotation briefing from the conversation history
 * and saves it to the quotation_briefings table.
 * Called when ATLAS (or the last qualifying agent) escalates to human.
 */

const BRIEFING_EXTRACTION_PROMPT = `Voce e um assistente que extrai informacoes de conversas de qualificacao de viagem para gerar um briefing estruturado de cotacao.

Analise TODA a conversa abaixo e extraia as informacoes em formato JSON com estes campos:
{
  "lead_name": "nome do lead (string)",
  "destination": "destino principal (string)",
  "departure_date": "data de ida aproximada (string ou null)",
  "return_date": "data de volta aproximada (string ou null)",
  "duration_days": numero de dias (number ou null),
  "flexible_dates": true/false,
  "adults": numero de adultos (number),
  "children": numero de criancas (number),
  "children_ages": ["idade1", "idade2"] ou [],
  "total_people": total de pessoas (number),
  "group_details": "descricao do grupo: casal, familia, etc (string)",
  "budget_range": "faixa de orcamento mencionada ou 'Nao definido' (string)",
  "budget_behavioral_reading": "leitura comportamental do orcamento baseada no tom e comportamento do lead (string)",
  "price_sensitivity": "alta | media | baixa",
  "hotel_preference": "tipo de hospedagem preferido (string ou null)",
  "hotel_stars": "estrelas preferidas (string ou null)",
  "hotel_needs": ["necessidades especiais do hotel"],
  "hotel_location": "localizacao preferida (string ou null)",
  "hotel_notes": "observacoes sobre hospedagem (string ou null)",
  "departure_airport": "aeroporto de saida (string ou null)",
  "flight_preference": "preferencia de voo: direto, escala, etc (string ou null)",
  "cabin_class": "classe: economica, executiva, etc (string ou null)",
  "preferred_airline": "companhia preferida (string ou null)",
  "rental_car": true/false/null,
  "transfer_needed": true/false/null,
  "transport_notes": "observacoes de transporte (string ou null)",
  "must_have_experiences": ["experiencias obrigatorias"],
  "desired_experiences": ["experiencias desejadas"],
  "travel_pace": "ritmo: intenso, moderado, relaxado (string ou null)",
  "experience_notes": "observacoes sobre experiencias (string ou null)",
  "lead_type": "familia, casal, solo, amigos, corporativo (string)",
  "lead_sentiment": "animado, ansioso, cauteloso, indeciso, VIP (string)",
  "lead_urgency": "alta | media | baixa",
  "trip_motivation": "motivacao: lua de mel, ferias, aniversario, etc (string ou null)",
  "travel_experience": "nivel de experiencia do viajante (string ou null)",
  "behavioral_notes": "como lidar com esse lead: notas comportamentais (string)",
  "conversation_summary": "resumo de 3-5 frases dos pontos mais relevantes (string)",
  "ai_recommendation": "sugestao de como montar a cotacao (string)",
  "next_steps": "proximos passos recomendados (string)",
  "lead_score": score de 0 a 100 baseado na qualidade do lead (number)
}

REGRAS:
- Extraia SOMENTE informacoes que foram REALMENTE mencionadas na conversa
- Para campos nao mencionados, use null ou valores padrao razoaveis
- O conversation_summary deve ser conciso e util para quem vai cotar
- A ai_recommendation deve ser pratica e acionavel
- behavioral_notes deve ajudar o humano a entender como lidar com o lead
- Retorne SOMENTE o JSON, sem markdown ou texto extra`;

interface BriefingExtractionResult {
  success: boolean;
  briefingId?: string;
  error?: string;
}

export async function extractAndSaveBriefing(
  leadOrMessages: LeadInteligente | { nome: string; messages: Array<{ role: string; content: string; agentName?: string }> },
  source: "auto" | "manual" = "auto",
): Promise<BriefingExtractionResult> {
  try {
    // Build conversation text
    let conversationText = "";
    let leadName = "";

    if ("mensagens" in leadOrMessages) {
      // LeadInteligente from auto mode
      const lead = leadOrMessages as LeadInteligente;
      leadName = lead.nome;
      conversationText = lead.mensagens
        .map(m => `${m.role === "client" ? "LEAD" : `AGENTE (${m.agentName || "Nath"})`}: ${m.content}`)
        .join("\n");
    } else {
      // Manual mode messages
      leadName = leadOrMessages.nome;
      conversationText = leadOrMessages.messages
        .map(m => `${m.role === "user" ? "LEAD" : `AGENTE (${m.agentName || "Nath"})`}: ${m.content}`)
        .join("\n");
    }

    if (!conversationText || conversationText.length < 50) {
      return { success: false, error: "Conversa muito curta para extrair briefing" };
    }

    // Call AI to extract structured data
    const result = await callSimulatorAI(
      BRIEFING_EXTRACTION_PROMPT,
      [{ role: "user", content: `CONVERSA COMPLETA:\n\n${conversationText}` }],
      "evaluate",
    );

    // Parse JSON from response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, error: "Falha ao extrair JSON do briefing" };
    }

    const briefingData = JSON.parse(jsonMatch[0]);

    // Determine urgency
    const urgency = briefingData.lead_urgency || "media";

    // Save to database
    const { data, error } = await (supabase as any)
      .from("quotation_briefings")
      .insert({
        lead_name: briefingData.lead_name || leadName,
        destination: briefingData.destination,
        departure_date: briefingData.departure_date,
        return_date: briefingData.return_date,
        duration_days: briefingData.duration_days,
        flexible_dates: briefingData.flexible_dates ?? false,
        adults: briefingData.adults ?? 1,
        children: briefingData.children ?? 0,
        children_ages: briefingData.children_ages,
        total_people: briefingData.total_people ?? 1,
        group_details: briefingData.group_details,
        budget_range: briefingData.budget_range,
        budget_behavioral_reading: briefingData.budget_behavioral_reading,
        price_sensitivity: briefingData.price_sensitivity,
        hotel_preference: briefingData.hotel_preference,
        hotel_stars: briefingData.hotel_stars,
        hotel_needs: briefingData.hotel_needs,
        hotel_location: briefingData.hotel_location,
        hotel_notes: briefingData.hotel_notes,
        departure_airport: briefingData.departure_airport,
        flight_preference: briefingData.flight_preference,
        cabin_class: briefingData.cabin_class,
        preferred_airline: briefingData.preferred_airline,
        rental_car: briefingData.rental_car,
        transfer_needed: briefingData.transfer_needed,
        transport_notes: briefingData.transport_notes,
        must_have_experiences: briefingData.must_have_experiences,
        desired_experiences: briefingData.desired_experiences,
        travel_pace: briefingData.travel_pace,
        experience_notes: briefingData.experience_notes,
        lead_type: briefingData.lead_type,
        lead_sentiment: briefingData.lead_sentiment,
        lead_urgency: urgency,
        trip_motivation: briefingData.trip_motivation,
        travel_experience: briefingData.travel_experience,
        behavioral_notes: briefingData.behavioral_notes,
        conversation_summary: briefingData.conversation_summary,
        ai_recommendation: briefingData.ai_recommendation,
        next_steps: briefingData.next_steps,
        lead_score: briefingData.lead_score,
        lead_origin: source === "auto" ? "Simulador Automático" : "Simulador Manual",
        urgency,
        status: "pendente",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Erro ao salvar briefing:", error);
      return { success: false, error: error.message };
    }

    return { success: true, briefingId: data.id };
  } catch (err: any) {
    console.error("Erro na extração de briefing:", err);
    return { success: false, error: err.message || "Erro desconhecido" };
  }
}
