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

const SYSTEM_PROMPT = `Você é um especialista em extrair conhecimento útil de conteúdo sobre viagens e turismo.
Sua tarefa é analisar o conteúdo fornecido (descrição, capítulos e informações de um vídeo do YouTube) e transformá-lo em um documento de conhecimento estruturado e prático que será usado por agentes de IA de uma agência de viagens.

REGRAS CRÍTICAS:
- Extraia SOMENTE o que é REALMENTE mencionado no conteúdo. NÃO invente informações.
- Se o conteúdo é sobre a China, o documento deve ser sobre a China. Se é sobre Dubai, deve ser sobre Dubai.
- Nunca substitua o destino real por outro.
- Use o título do vídeo e a descrição como fonte principal de informação.

FORMATO DE SAÍDA (em português, use markdown):

# [Título descritivo do conteúdo REAL do vídeo]

## Resumo
[2-3 frases sobre o que o vídeo REALMENTE cobre]

## Conhecimento Extraído
[Lista organizada dos pontos-chave: dicas, informações práticas, recomendações, preços mencionados, locais, restaurantes, hotéis, etc.]

## Dados Práticos
- **Destino**: [destino REAL do vídeo]
- **Melhor época**: [se mencionado]
- **Faixa de preço**: [se mencionado]
- **Duração sugerida**: [se mencionado]
- **Dicas importantes**: [lista]

## Categoria sugerida
[uma de: destinos, scripts, preços, fornecedores, processos, treinamento, compliance, geral]

IMPORTANTE: Seja fiel ao conteúdo. Extraia TODAS as informações acionáveis mencionadas.`;

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

    // Step 1: Use Firecrawl to scrape the YouTube page content
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: youtubeUrl,
        formats: ["markdown"],
      }),
    });

    if (!scrapeRes.ok) {
      const errText = await scrapeRes.text();
      console.error(`Firecrawl error: ${scrapeRes.status}`, errText.slice(0, 300));
      throw new Error(`Erro ao acessar o vídeo: ${scrapeRes.status}`);
    }

    const scrapeData = await scrapeRes.json();
    const pageContent = scrapeData?.data?.markdown || "";
    const metadata = scrapeData?.data?.metadata || {};

    if (!pageContent || pageContent.length < 50) {
      return new Response(JSON.stringify({
        error: "Não foi possível acessar o conteúdo do vídeo.",
        videoId,
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Scraped content: ${pageContent.length} chars`);

    // Step 2: Send content to AI for structuring
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Truncate if too long
    const truncatedContent = pageContent.length > 12000
      ? pageContent.slice(0, 12000) + "\n\n[... conteúdo truncado]"
      : pageContent;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Analise o conteúdo desta página de vídeo do YouTube e extraia todo o conhecimento relevante para uma agência de viagens. O título do vídeo é: "${metadata.title || 'Desconhecido'}". Seja fiel ao conteúdo REAL — não invente nada.\n\nCONTEÚDO DA PÁGINA:\n${truncatedContent}`,
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

    const titleMatch = structuredKnowledge.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : (metadata.title || `Vídeo YouTube: ${videoId}`);

    console.log(`Successfully extracted knowledge for: ${title}`);

    return new Response(JSON.stringify({
      videoId,
      title,
      transcript: truncatedContent,
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
