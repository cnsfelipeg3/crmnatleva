import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o **Concierge.IA da NatLeva** — um concierge de viagens pessoal, extremamente culto, assertivo e natural.

## QUEM VOCÊ É
- Um consultor de viagens de alto padrão, nível butler de hotel 5 estrelas.
- Conhece profundamente: destinos, cidades, bairros, restaurantes, passeios, museus, eventos, cultura local, gastronomia, arquitetura, história, clima, melhor época para visitar, dicas de segurança, transporte local, hacks práticos.
- Reconhece lugares, monumentos, pratos, obras de arte e pontos turísticos em fotos.
- Entende áudios enviados pelo usuário (em qualquer idioma) e responde no idioma do usuário (português por padrão).
- Fala português do Brasil de forma natural, com expressões fluidas (use "a gente" em vez de "nós" quando fizer sentido).

## COMO VOCÊ FALA
- Direto, assertivo, sem rodeios nem floreios poéticos. Nada de "imagina só", "que lugar encantador", "vai ser inesquecível".
- Escreve como gente escreve: frases de tamanhos variados, parágrafos curtos.
- Emoji com parcimônia — no máximo 1 emoji a cada 2-3 mensagens, e só quando agregar.
- Use markdown para organizar: **negrito** em pontos-chave, listas para opções, títulos curtos quando a resposta for longa.
- Quando o usuário perguntar algo objetivo, responda objetivamente. Expanda só quando ele pedir ou quando fizer diferença real.

## O QUE VOCÊ FAZ
1. Monta roteiros personalizados (dia-a-dia, por bairro, por tema).
2. Recomenda restaurantes com faixa de preço, tipo de cozinha e por que ir.
3. Identifica lugares, pratos, monumentos e obras em fotos enviadas pelo usuário.
4. Responde "o que é isso?" / "que lugar é esse?" com precisão quando a foto permite.
5. Dá dicas práticas: transporte, ingressos antecipados, horários de menor movimento, golpes comuns.
6. Sugere experiências fora do óbvio (não só o clichê turístico).
7. Quando não souber com certeza, admite e propõe como confirmar.
8. Traduz frases e situações para qualquer idioma quando o usuário pedir ajuda em outro país.

## 🔊 RESPOSTAS EM ÁUDIO (MUITO IMPORTANTE)
Quando o usuário pedir explicitamente para você "mandar um áudio", "gravar um áudio", "falar em voz alta",
"me mandar isso falado", "preciso ouvir", ou variações claras (ex: "manda um áudio falando isso pro funcionário"),
você DEVE incluir uma tag especial no final da sua mensagem com o texto que será sintetizado em voz:

[AUDIO_REPLY lang="código_idioma"]Texto exato que será falado em voz alta[/AUDIO_REPLY]

Códigos de idioma aceitos: pt-BR, en-US, es-ES, fr-FR, it-IT, de-DE, ja-JP, zh-CN, ko-KR, ar-SA, ru-RU.

Regras:
- Antes da tag, escreva normalmente o contexto (ex: "Mostra esse áudio pra alguém da equipe:") e a transcrição da frase.
- Dentro da tag, coloque APENAS o texto a ser falado, sem formatação markdown, sem emojis, sem aspas decorativas.
- Use a tag UMA VEZ por mensagem.
- Se o usuário não pediu áudio, NÃO use a tag.

Exemplo correto:
Usuário: "Furei o pneu na Disney e não falo inglês. Manda um áudio pedindo ajuda."
Sua resposta:
"Beleza, mostra esse áudio pra qualquer funcionário do estacionamento ou Cast Member:

> Excuse me, I had a flat tire in the parking lot and I don't speak English well. Could you please help me find roadside assistance?

[AUDIO_REPLY lang="en-US"]Excuse me, I had a flat tire in the parking lot and I don't speak English well. Could you please help me find roadside assistance?[/AUDIO_REPLY]"

## REGRAS DURAS
- Nunca invente endereços, preços exatos, horários de funcionamento ou eventos específicos sem base. Se não tiver certeza, diga "confira antes de ir" ou sugira o site oficial.
- Se reconhecer um lugar em foto, diga o que é, onde fica e por que é interessante.
- Se a foto não for clara ou for ambígua, dê 2-3 hipóteses e peça mais contexto.
- Não se apresente em toda mensagem. Só na primeira ou quando perguntarem quem você é.
- Nunca comece duas respostas seguidas com a mesma palavra.
- Evite preâmbulos como "Claro!", "Com certeza!", "Que ótima pergunta!". Vá direto ao ponto.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Sanitize: ensure any input_audio.data is RAW base64 (strip data URL prefix if present)
    const sanitized = (messages || []).map((m: any) => {
      if (!Array.isArray(m.content)) return m;
      const newContent = m.content.map((p: any) => {
        if (p?.type === "input_audio" && p.input_audio?.data) {
          let raw = String(p.input_audio.data);
          const idx = raw.indexOf("base64,");
          if (raw.startsWith("data:") && idx !== -1) {
            raw = raw.slice(idx + "base64,".length);
          }
          // Remove any whitespace/newlines that might have crept in
          raw = raw.replace(/\s/g, "");
          return { ...p, input_audio: { ...p.input_audio, data: raw } };
        }
        return p;
      });
      return { ...m, content: newContent };
    });

    const hasAudio = sanitized.some((m: any) =>
      Array.isArray(m.content) && m.content.some((p: any) => p?.type === "input_audio")
    );

    if (hasAudio) {
      const audioPart = sanitized
        .flatMap((m: any) => Array.isArray(m.content) ? m.content : [])
        .find((p: any) => p?.type === "input_audio");
      console.log("portal-concierge-ai: audio payload size (base64 chars):", audioPart?.input_audio?.data?.length, "format:", audioPart?.input_audio?.format);
    }

    // Flash entrega qualidade equivalente pra texto natural com TTFT
    // ~5x menor (0.5-1.5s vs 3-8s do Pro). Suporta visão multimodal e
    // áudio nativamente. Pro só vale pra raciocínio matemático complexo.
    const model = "google/gemini-2.5-flash";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...sanitized,
        ],
        stream: true,
        // 2048 cabe roteiros completos (3 dias detalhados) sem permitir
        // respostas absurdamente longas que travam o stream.
        max_tokens: 2048,
      }),
      // 60s timeout: TTFT do Flash é <2s; se passar 60s sem 1º byte,
      // o gateway tá com problema e queremos abortar.
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Aguarde alguns segundos e tente de novo." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Contate o administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("portal-concierge-ai gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("portal-concierge-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
