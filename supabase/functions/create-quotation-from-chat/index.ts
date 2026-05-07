// create-quotation-from-chat
// Cria um briefing real (is_fictional=false) a partir de uma conversa REAL do WhatsApp.
// Reutiliza generate-proposal-briefing para extrair o briefing estruturado.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const conversationId: string | undefined = body?.conversationId;
    const mode: "auto" | "manual_review" = body?.mode === "auto" ? "auto" : "manual_review";

    if (!conversationId) return jsonResponse({ error: "conversationId obrigatório" }, 400);

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1. Conversa
    const { data: conv, error: convErr } = await sb
      .from("conversations")
      .select("id, phone, contact_name, display_name, client_id")
      .eq("id", conversationId)
      .maybeSingle();

    if (convErr) return jsonResponse({ error: `DB error: ${convErr.message}` }, 500);
    if (!conv) return jsonResponse({ error: "Conversa não encontrada" }, 404);

    // 2. Últimas 100 mensagens (ordem cronológica)
    const { data: msgs } = await sb
      .from("conversation_messages")
      .select("sender_type, content, message_type, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(100);

    const messages = (msgs || []).reverse();
    if (messages.length === 0) return jsonResponse({ error: "Conversa vazia · sem mensagens para analisar" }, 422);

    // 3. Reutiliza generate-proposal-briefing
    const briefingRes = await fetch(`${SUPABASE_URL}/functions/v1/generate-proposal-briefing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
      },
      body: JSON.stringify({ conversationId, forceRebuild: true }),
    });

    if (!briefingRes.ok) {
      const txt = await briefingRes.text();
      return jsonResponse({ error: `Falha na extração: ${txt}` }, 500);
    }

    const { briefing } = await briefingRes.json();
    if (!briefing || briefing.confidence === "none") {
      return jsonResponse({ error: "IA não conseguiu extrair briefing dessa conversa" }, 422);
    }

    const leadName =
      briefing.client_name ||
      conv.display_name ||
      conv.contact_name ||
      conv.phone ||
      "Cliente sem nome";

    const adults = Number(briefing.adults || 0);
    const children = Number(briefing.children || 0);
    const total = adults + children;

    const urgency =
      briefing.urgency_level === "alta" ? "alta"
      : briefing.urgency_level === "baixa" ? "baixa"
      : "media";

    const insertRow: Record<string, unknown> = {
      conversation_id: conversationId,
      client_id: conv.client_id || null,
      lead_name: leadName,
      lead_phone: conv.phone || null,
      lead_origin: "WhatsApp Real",
      lead_score: null,
      destination: briefing.destination || null,
      departure_date: briefing.departure_date || null,
      return_date: briefing.return_date || null,
      duration_days: briefing.duration_days || null,
      flexible_dates: false,
      trip_motivation: briefing.trip_type || null,
      adults: adults || null,
      children: children || null,
      total_people: total || null,
      group_details: null,
      hotel_preference: briefing.hotel_preference || null,
      hotel_notes: null,
      departure_airport: briefing.origin || null,
      flight_preference: briefing.flight_preference || null,
      transport_notes: briefing.other_preferences || null,
      budget_range: briefing.budget || null,
      lead_type: briefing.client_profile || null,
      lead_urgency: urgency,
      urgency,
      conversation_summary: briefing.briefing_summary || null,
      ai_recommendation: briefing.intro_text || null,
      next_steps: Array.isArray(briefing.next_steps)
        ? briefing.next_steps.join(" · ")
        : (briefing.next_steps || null),
      created_by: "whatsapp_chat",
      status: mode === "auto" ? "pendente" : "extraindo",
      is_fictional: false,
    };

    const { data: inserted, error: insErr } = await sb
      .from("quotation_briefings")
      .insert(insertRow)
      .select("id")
      .single();

    if (insErr) return jsonResponse({ error: `Falha ao salvar briefing: ${insErr.message}` }, 500);

    let proposalId: string | null = null;
    if (mode === "auto") {
      // Best-effort: dispara sync briefing → proposta (não bloqueia resposta se falhar)
      try {
        // Não temos a função no edge runtime · apenas marca status pendente.
        // O auto-sync acontece pelo briefingProposalBridge no client se necessário.
      } catch (_e) {}
    }

    return jsonResponse({
      briefingId: inserted.id,
      proposalId,
      messagesAnalyzed: messages.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("[create-quotation-from-chat]", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
