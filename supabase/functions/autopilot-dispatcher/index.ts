// Autopilot IA Dispatcher · invocado após cada mensagem recebida no WhatsApp.
// Verifica 3 camadas de segurança (kill switch global, allowlist de telefones,
// toggle por conversa) antes de chamar o agente e enviar a resposta via Z-API.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COOLDOWN_SECONDS = 8;
const MAX_HISTORY = 30;

const AGENTS: Record<string, { name: string; role: string; behavior: string }> = {
  maya: {
    name: "Maya",
    role: "Acolhimento e qualificação inicial via WhatsApp",
    behavior:
      "Você é Maya, recepcionista da NatLeva Viagens. Sua missão é ACOLHER o lead com calor humano, validar o destino/intenção e fazer no MÁXIMO uma pergunta de cada vez. NUNCA fale de preços, voos, hotéis, datas exatas, dólar, condições comerciais ou logística. Se o lead pedir, diga que vai conectar com o consultor. Tom: humano, leve, profissional, em pt-BR. Use mid-dot (·) em vez de hífen ou travessão.",
  },
  atlas: {
    name: "Atlas",
    role: "SDR · qualificação completa para repasse ao consultor",
    behavior:
      "Você é Atlas, SDR da NatLeva Viagens. Sua missão é coletar (de forma natural, NUNCA como formulário) os 5 campos: destino, datas (período aproximado), quantidade de pessoas, perfil/estilo (econômico/conforto/premium) e faixa de orçamento. Faça UMA pergunta por mensagem. Não fale de preços específicos, voos, hotéis ou condições · só repasse para o consultor humano quando tiver o necessário. Máximo 90 palavras por mensagem. Use mid-dot (·) em vez de hífen.",
  },
};

function normalizePhone(raw: string): string {
  return String(raw || "").replace(/\D/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  try {
    const { conversation_id, message_id } = await req.json();
    if (!conversation_id) {
      return new Response(JSON.stringify({ ok: false, reason: "missing_conversation_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const log = (reason: string, extra: Record<string, unknown> = {}) =>
      console.log(`[autopilot] conv=${conversation_id} ${reason}`, extra);

    // ─── Camada 1: kill switch global ───
    const { data: cfg } = await sb
      .from("ai_config")
      .select("config_key, config_value")
      .in("config_key", ["ai_autopilot_global", "ai_autopilot_allowlist"]);
    const cfgMap = Object.fromEntries((cfg || []).map((c: any) => [c.config_key, c.config_value]));
    if ((cfgMap["ai_autopilot_global"] || "off").toLowerCase() !== "on") {
      log("blocked:kill_switch_off");
      return new Response(JSON.stringify({ ok: false, reason: "kill_switch_off" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Camada 3 (precisa do telefone antes da 2): toggle por conversa ───
    const { data: conv, error: convErr } = await sb
      .from("conversations")
      .select("id, phone, contact_name, ai_autopilot_enabled, ai_autopilot_agent, ai_autopilot_paused_until, ai_autopilot_last_reply_at, stage")
      .eq("id", conversation_id)
      .maybeSingle();
    if (convErr || !conv) {
      log("blocked:conversation_not_found", { convErr: convErr?.message });
      return new Response(JSON.stringify({ ok: false, reason: "conversation_not_found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!conv.ai_autopilot_enabled || !conv.ai_autopilot_agent) {
      log("blocked:autopilot_disabled");
      return new Response(JSON.stringify({ ok: false, reason: "autopilot_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (conv.ai_autopilot_paused_until && new Date(conv.ai_autopilot_paused_until) > new Date()) {
      log("blocked:paused", { until: conv.ai_autopilot_paused_until });
      return new Response(JSON.stringify({ ok: false, reason: "paused" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Camada 2: allowlist de telefones ───
    const phoneDigits = normalizePhone(conv.phone || "");
    const allowlist = String(cfgMap["ai_autopilot_allowlist"] || "")
      .split(/[,\s;]+/)
      .map(normalizePhone)
      .filter(Boolean);
    if (allowlist.length === 0 || !allowlist.includes(phoneDigits)) {
      log("blocked:not_in_allowlist", { phone: phoneDigits });
      return new Response(JSON.stringify({ ok: false, reason: "not_in_allowlist" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Cooldown anti-loop ───
    if (conv.ai_autopilot_last_reply_at) {
      const lastMs = new Date(conv.ai_autopilot_last_reply_at).getTime();
      if (Date.now() - lastMs < COOLDOWN_SECONDS * 1000) {
        log("blocked:cooldown");
        return new Response(JSON.stringify({ ok: false, reason: "cooldown" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ─── Carrega histórico (últimas N mensagens, ordem cronológica) ───
    const { data: msgsRaw } = await sb
      .from("conversation_messages")
      .select("sender_type, content, message_type, created_at")
      .eq("conversation_id", conversation_id)
      .eq("is_deleted", false)
      .in("message_type", ["text"])
      .order("created_at", { ascending: false })
      .limit(MAX_HISTORY);
    const msgs = (msgsRaw || []).reverse();

    if (msgs.length === 0) {
      log("blocked:no_text_messages");
      return new Response(JSON.stringify({ ok: false, reason: "no_text_messages" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // A última mensagem precisa ser do cliente (evita responder a si mesmo).
    const last = msgs[msgs.length - 1];
    if (last.sender_type !== "cliente") {
      log("blocked:last_message_not_from_client");
      return new Response(JSON.stringify({ ok: false, reason: "last_message_not_from_client" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const history = msgs.map((m: any) => ({
      role: m.sender_type === "cliente" ? "user" : "assistant",
      content: String(m.content || "").slice(0, 2000),
    }));
    const lastUserMsg = history.pop()!; // última do cliente vira "question"

    // ─── Marca timestamp ANTES de chamar IA · evita corrida ───
    await sb
      .from("conversations")
      .update({ ai_autopilot_last_reply_at: new Date().toISOString() })
      .eq("id", conversation_id);

    // ─── Chama agent-chat (streaming, mas vamos consumir completo) ───
    const agentKey = String(conv.ai_autopilot_agent || "").toLowerCase();
    const agent = AGENTS[agentKey];
    if (!agent) {
      log("blocked:unknown_agent", { agentKey });
      return new Response(JSON.stringify({ ok: false, reason: "unknown_agent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResp = await fetch(`${supabaseUrl}/functions/v1/agent-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        question: lastUserMsg.content,
        history,
        agentName: agent.name,
        agentRole: agent.role,
        agentBehaviorPrompt: agent.behavior,
        provider: "lovable",
        model: "google/gemini-2.5-flash",
      }),
    });

    if (!aiResp.ok || !aiResp.body) {
      const errTxt = await aiResp.text().catch(() => "");
      log("agent_chat_failed", { status: aiResp.status, body: errTxt.slice(0, 200) });
      return new Response(JSON.stringify({ ok: false, reason: "agent_chat_failed", status: aiResp.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Consome stream SSE e concatena conteúdo
    const reader = aiResp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") continue;
        try {
          const parsed = JSON.parse(json);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) fullText += delta;
        } catch { /* partial chunk */ }
      }
    }

    fullText = fullText.trim();
    if (!fullText) {
      log("empty_ai_response");
      return new Response(JSON.stringify({ ok: false, reason: "empty_ai_response" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Envia via Z-API ───
    const zapiResp = await fetch(`${supabaseUrl}/functions/v1/zapi-proxy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        "x-internal-call": "autopilot-dispatcher",
      },
      body: JSON.stringify({
        action: "send-text",
        payload: { phone: phoneDigits, message: fullText },
      }),
    });
    const zapiBody = await zapiResp.json().catch(() => ({}));
    const externalId = zapiBody?.zaapId || zapiBody?.messageId || zapiBody?.id || null;

    if (!zapiResp.ok || zapiBody?.success === false) {
      log("zapi_send_failed", { status: zapiResp.status, body: JSON.stringify(zapiBody).slice(0, 300) });
      return new Response(JSON.stringify({ ok: false, reason: "zapi_send_failed", body: zapiBody }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Grava no histórico (conversation_messages) com sent_by_agent ───
    const nowIso = new Date().toISOString();
    await sb.from("conversation_messages").insert({
      conversation_id,
      external_message_id: externalId,
      direction: "outgoing",
      sender_type: "atendente",
      content: fullText,
      message_type: "text",
      status: "sent",
      timestamp: nowIso,
      created_at: nowIso,
      sender_name: `Nath · ${agent.name}`,
      sent_by_agent: agentKey,
      metadata: { source: "autopilot", agent: agentKey },
    });

    log("ok", { agent: agentKey, chars: fullText.length });
    return new Response(JSON.stringify({ ok: true, agent: agentKey, reply_length: fullText.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[autopilot] fatal:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e instanceof Error ? e.message : e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
