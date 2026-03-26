import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL não fornecida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return new Response(JSON.stringify({ error: "URL do YouTube inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing YouTube video: ${videoId}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Use Gemini with the YouTube URL directly — Gemini can process YouTube videos natively
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em extrair conhecimento útil de vídeos sobre viagens e turismo.
Sua tarefa é assistir o vídeo e transformar o conteúdo em um documento de conhecimento estruturado e prático que será usado por agentes de IA de uma agência de viagens.

FORMATO DE SAÍDA (em português, use markdown):

# [Título descritivo do conteúdo]

## Resumo
[2-3 frases sobre o que o vídeo cobre]

## Conhecimento Extraído
[Lista organizada dos pontos-chave: dicas, informações práticas, recomendações, preços mencionados, locais, restaurantes, hotéis, etc. Organize por subtópicos quando relevante.]

## Dados Práticos
- **Melhor época**: [se mencionado]
- **Faixa de preço**: [se mencionado]
- **Duração sugerida**: [se mencionado]
- **Dicas importantes**: [lista]

## Categoria sugerida
[uma de: destinos, scripts, preços, fornecedores, processos, treinamento, compliance, geral]

IMPORTANTE: Seja extremamente detalhado e objetivo. Extraia TODAS as informações acionáveis que um agente de viagens poderia usar para atender clientes. Inclua nomes específicos de hotéis, restaurantes, atrações, preços e dicas práticas mencionados no vídeo.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Assista este vídeo do YouTube e extraia todo o conhecimento relevante para uma agência de viagens: ${youtubeUrl}`,
              },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errorBody = await aiResponse.text();
      console.error(`AI gateway error: ${status}`, errorBody.slice(0, 500));
      
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit atingido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const structuredKnowledge = aiData.choices?.[0]?.message?.content || "";

    if (!structuredKnowledge || structuredKnowledge.length < 50) {
      return new Response(JSON.stringify({
        error: "Não foi possível extrair conhecimento deste vídeo. Tente outro vídeo.",
        videoId,
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract title from the AI response (first heading)
    const titleMatch = structuredKnowledge.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : `Vídeo YouTube: ${videoId}`;

    console.log(`Successfully extracted knowledge for: ${title}`);

    return new Response(JSON.stringify({
      videoId,
      title,
      transcript: structuredKnowledge,
      structured_knowledge: structuredKnowledge,
      language: "pt",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("youtube-transcribe error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Erro ao processar vídeo",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
