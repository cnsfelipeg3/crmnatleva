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

    // Detect if any message contains audio — Gemini 2.5 Flash handles audio input natively
    const hasAudio = (messages || []).some((m: any) =>
      Array.isArray(m.content) && m.content.some((p: any) => p?.type === "input_audio" || p?.type === "audio_url")
    );

    // Pro doesn't accept audio reliably via gateway; Flash does. Use Flash whenever audio is present.
    const model = hasAudio ? "google/gemini-2.5-flash" : "google/gemini-2.5-pro";

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
          ...(messages || []),
        ],
        stream: true,
        max_tokens: 8192,
      }),
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
