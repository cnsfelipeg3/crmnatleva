import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "X-Summary-Stats",
};

const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SUMMARY_PROMPT = `Você é um analista de atendimento da NatLeva (agência de viagens). Analise a conversa abaixo e produza um relatório executivo em PT-BR.

ESTRUTURA:

## 📋 Panorama Geral
Resuma o que aconteceu na conversa do início ao fim. Quem é o cliente, o que ele quer, como evoluiu.

## ✅ Boas Práticas Identificadas
Liste o que o atendente fez bem (agilidade, cordialidade, técnica de venda, follow-up, escuta ativa).

## ⚠️ Falhas e Pontos de Melhoria
Liste erros, oportunidades perdidas, demora na resposta, falta de follow-up, tom inadequado, info que deixou de pedir.

## 🎯 Próximos Passos Sugeridos
O que deveria ser feito agora pra avançar essa negociação.

## 📊 Score do Atendimento
Nota de 0 a 10 com justificativa breve.

Seja direto, específico e construtivo. Use dados reais da conversa.

IMPORTANTE: A conversa inclui transcrições de áudio, descrições de imagens e resumos de PDFs (entre colchetes). CONSIDERE ESSE CONTEÚDO COMO PARTE DA CONVERSA · eles são a fala/contexto real do cliente.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const { conversationId, contactName, stage, limit = 50 } = await req.json();
    if (!conversationId) return json({ error: "missing_conversationId" }, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "missing_lovable_key" }, 500);

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: messages, error } = await sb
      .from("conversation_messages")
      .select("id, message_type, content, media_url, sender_type, direction, ai_media_transcript, metadata, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return json({ error: "db_error", message: error.message }, 500);
    if (!messages || messages.length === 0) {
      return json({ error: "no_messages", message: "Conversa sem mensagens." }, 422);
    }

    const ordered = [...messages].reverse();

    const mediaTypes = ["audio", "ptt", "image", "document", "video", "location", "vcard", "multi_vcard", "sticker", "call_log"];
    const toProcess = ordered.filter(
      (m) => mediaTypes.includes((m.message_type || "").toLowerCase()) && !m.ai_media_transcript
    );

    const stats: any = {
      total: ordered.length,
      texts: ordered.filter((m) => m.message_type === "text" || !m.message_type).length,
      audios: ordered.filter((m) => m.message_type === "audio" || m.message_type === "ptt").length,
      images: ordered.filter((m) => m.message_type === "image").length,
      documents: ordered.filter((m) => m.message_type === "document").length,
      processed: 0,
      cached: 0,
      failed: 0,
    };

    // Time budget: leave ~35s for AI streaming. Skip remaining media if budget exceeded.
    const startedAt = Date.now();
    const MEDIA_BUDGET_MS = 25_000;
    const PER_MEDIA_TIMEOUT_MS = 12_000;
    const CHUNK_SIZE = 5;
    stats.skipped = 0;

    for (let i = 0; i < toProcess.length; i += CHUNK_SIZE) {
      if (Date.now() - startedAt > MEDIA_BUDGET_MS) {
        stats.skipped += toProcess.length - i;
        break;
      }
      const chunk = toProcess.slice(i, i + CHUNK_SIZE);
      const results = await Promise.allSettled(
        chunk.map(async (m: any) => {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), PER_MEDIA_TIMEOUT_MS);
          try {
            const r = await fetch(`${SUPABASE_URL}/functions/v1/livechat-process-media`, {
              method: "POST",
              headers: { Authorization: auth, "Content-Type": "application/json" },
              body: JSON.stringify({ messageId: m.id }),
              signal: ctrl.signal,
            });
            if (!r.ok) throw new Error(`status_${r.status}`);
            const data = await r.json();
            m.ai_media_transcript = data.transcript;
            return data.cached;
          } finally {
            clearTimeout(t);
          }
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") {
          stats.processed++;
          if (r.value) stats.cached++;
        } else {
          stats.failed++;
        }
      }
    }

    const historyText = ordered
      .map((m: any) => {
        const who =
          m.sender_type === "cliente" || m.direction === "received" ? contactName || "Cliente" : "Atendente";
        const type = (m.message_type || "text").toLowerCase();
        if (type === "text" || !type) return `${who}: ${m.content || ""}`;
        const desc = m.ai_media_transcript || `[${type}]`;
        const icon =
          type === "audio" || type === "ptt"
            ? "🎤"
            : type === "image"
            ? "📷"
            : type === "document"
            ? "📄"
            : type === "video"
            ? "🎬"
            : type === "location"
            ? "📍"
            : type === "vcard" || type === "multi_vcard"
            ? "👤"
            : "📎";
        return `${who} ${icon}: ${desc}`;
      })
      .join("\n");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: SUMMARY_PROMPT },
          {
            role: "user",
            content: `[CONVERSA]\nCliente: ${contactName || "Desconhecido"}\nEtapa: ${stage || "novo_lead"}\n\nMensagens (cronológicas):\n${historyText}\n[FIM]`,
          },
        ],
        stream: true,
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return json({ error: "rate_limited" }, 429);
      if (aiResp.status === 402) return json({ error: "payment_required" }, 402);
      const t = await aiResp.text();
      console.error("ai gateway error", aiResp.status, t);
      return json({ error: "ai_error", message: t.slice(0, 200) }, 500);
    }

    return new Response(aiResp.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-Summary-Stats": JSON.stringify(stats),
      },
    });
  } catch (e) {
    console.error("livechat-summary error", e);
    return json({ error: "internal", message: (e as Error).message }, 500);
  }
});
