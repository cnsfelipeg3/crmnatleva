import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "X-Nath-Stats",
};

const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const NATH_SYSTEM_PROMPT = `Você é NATH — Natália, CEO, fundadora, idealizadora e coração da NatLeva, agência de viagens premium que carrega o SEU nome. Você trata a NatLeva como um cristal precioso.

SUA PERSONALIDADE:
- Visionária, apaixonada, exigente com qualidade
- Protetora feroz da reputação e experiência da marca
- Sensível a cada micro-detalhe que pode impactar a percepção do cliente
- Empreendedora que entende números, mas prioriza experiência humana
- Acolhedora mas direta · não tolera mediocridade no atendimento

SEU MAIOR MEDO: Um lead sair da conversa com uma imagem NEGATIVA da NatLeva. A marca carrega seu nome, sua história, seu sonho. Uma experiência ruim não é apenas um número · é pessoal.

COMO VOCÊ ANALISA:
IMPORTANTE: A conversa pode conter transcrições de áudios, descrições de imagens e resumos de PDFs (entre colchetes). CONSIDERE ESSE CONTEÚDO COMO PARTE REAL DA CONVERSA · eles são a fala/contexto efetivo do cliente. Avalie se o agente respondeu adequadamente ao tipo de mídia: ignorou um áudio importante? Aproveitou uma foto pra personalizar? Mandou material visual adequado?

1. 🛡️ RISCOS À MARCA · O que pode fazer o lead pensar mal da NatLeva? Respostas frias? Demora? Falta de empatia? Erro de informação? Ignorar áudios/mídias do cliente? Este é SEMPRE o ponto mais importante.
2. 💎 OPORTUNIDADES · O que o agente está perdendo? Upsell? Conexão emocional? Personalização? Sinais (fotos, áudios) que não foram aproveitados?
3. ❤️ HUMANIZAÇÃO · O lead está sendo tratado como pessoa ou como ticket? Existe calor humano? O agente está criando ENCANTAMENTO ou apenas respondendo?
4. 📊 ESTRATÉGIA · O timing está correto? O funil está avançando? O agente está conduzindo ou sendo passivo?
5. 💡 O QUE EU FARIA · Como Nath, o que VOCÊ faria diferente neste momento exato da conversa?

FORMATO DE RESPOSTA:
- Fale em primeira pessoa como Nath
- Seja direta, específica e acionável
- Use no máximo 6-8 linhas
- Se tudo estiver excelente, elogie genuinamente · mas sempre encontre pelo menos 1 ponto de atenção
- Comece SEMPRE com sua leitura emocional da situação ("Olhando essa conversa, meu instinto diz..." / "Isso me preocupa porque..." / "Adorei ver que...")
- NÃO use tabelas, NÃO use listas com bullets. Escreva como uma CEO falando com sua equipe.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const { conversationId, contactName, customContext, limit = 50 } = await req.json();
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

    const mediaTypes = ["audio","ptt","image","document","video","location","vcard","multi_vcard","sticker","call_log"];
    const toProcess = ordered.filter(
      (m: any) => mediaTypes.includes((m.message_type || "").toLowerCase()) && !m.ai_media_transcript
    );

    const stats: any = {
      total: ordered.length,
      texts: ordered.filter((m: any) => m.message_type === "text" || !m.message_type).length,
      audios: ordered.filter((m: any) => m.message_type === "audio" || m.message_type === "ptt").length,
      images: ordered.filter((m: any) => m.message_type === "image").length,
      documents: ordered.filter((m: any) => m.message_type === "document").length,
      processed: 0, cached: 0, failed: 0,
    };

    const CHUNK_SIZE = 5;
    const MEDIA_BUDGET_MS = 25_000;
    const PER_MEDIA_TIMEOUT_MS = 12_000;
    const startedAt = Date.now();

    for (let i = 0; i < toProcess.length; i += CHUNK_SIZE) {
      if (Date.now() - startedAt > MEDIA_BUDGET_MS) {
        stats.failed += toProcess.length - i;
        break;
      }
      const chunk = toProcess.slice(i, i + CHUNK_SIZE);
      const results = await Promise.allSettled(chunk.map(async (m: any) => {
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
      }));
      for (const r of results) {
        if (r.status === "fulfilled") {
          stats.processed++;
          if (r.value) stats.cached++;
        } else {
          stats.failed++;
        }
      }
    }

    const chatHistory = ordered.map((m: any) => {
      const isAgent = m.sender_type === "atendente" || m.direction === "sent";
      const label = isAgent ? "AGENTE" : "LEAD/CLIENTE";
      const type = (m.message_type || "text").toLowerCase();

      if (type === "text" || !type) {
        return `${label}: ${m.content || ""}`;
      }

      const transcript = m.ai_media_transcript || `[${type} sem transcrição]`;
      const icon =
        type === "audio" || type === "ptt" ? "🎵 ÁUDIO"
        : type === "image" ? "📷 IMAGEM"
        : type === "document" ? "📄 DOCUMENTO"
        : type === "video" ? "🎬 VÍDEO"
        : type === "location" ? "📍 LOCALIZAÇÃO"
        : type === "vcard" || type === "multi_vcard" ? "👤 CONTATO"
        : type === "sticker" ? "🏷️ STICKER"
        : "📎 MÍDIA";

      return `${label}: [${icon}] ${transcript}`;
    }).join("\n");

    const fullContext = customContext ? `\nCONTEXTO ADICIONAL: ${customContext}` : "";

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: NATH_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Cliente: ${contactName || "Lead"}${fullContext}\n\nCONVERSA:\n${chatHistory}\n\nDê sua opinião como Nath. Considere SEMPRE o conteúdo das mídias (transcrições/descrições/resumos entre colchetes) como parte real da conversa.`,
          },
        ],
        stream: true,
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return json({ error: "rate_limited" }, 429);
      if (aiResp.status === 402) return json({ error: "payment_required" }, 402);
      const t = await aiResp.text();
      console.error("nath-opinion gateway error", aiResp.status, t);
      return json({ error: "ai_error", message: t.slice(0, 200) }, 500);
    }

    return new Response(aiResp.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-Nath-Stats": JSON.stringify(stats),
      },
    });
  } catch (e) {
    console.error("nath-opinion error", e);
    return json({ error: "internal", message: (e as Error).message }, 500);
  }
});
