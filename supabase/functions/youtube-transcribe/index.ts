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

async function fetchYouTubeTranscript(videoId: string): Promise<{ text: string; title: string }> {
  // Step 1: Fetch the YouTube page to get caption tracks
  const pageResp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
  });
  const html = await pageResp.text();

  // Extract title
  const titleMatch = html.match(/<title>([^<]*)<\/title>/);
  const rawTitle = titleMatch ? titleMatch[1].replace(/ - YouTube$/, "").trim() : `Video ${videoId}`;

  // Look for captions in the page data
  const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
  if (!captionMatch) {
    // No captions available - fall back to AI-based description
    throw new Error("NO_CAPTIONS");
  }

  const captionTracks = JSON.parse(captionMatch[1]);

  // Prefer Portuguese, then English, then first available
  let selectedTrack = captionTracks.find((t: any) =>
    t.languageCode === "pt" || t.languageCode === "pt-BR"
  );
  if (!selectedTrack) {
    selectedTrack = captionTracks.find((t: any) =>
      t.languageCode === "en" || t.languageCode === "en-US"
    );
  }
  if (!selectedTrack && captionTracks.length > 0) {
    selectedTrack = captionTracks[0];
  }

  if (!selectedTrack?.baseUrl) {
    throw new Error("NO_CAPTIONS");
  }

  // Step 2: Fetch the captions XML
  const captionResp = await fetch(selectedTrack.baseUrl);
  const captionXml = await captionResp.text();

  // Step 3: Parse XML to extract text
  const textSegments: string[] = [];
  const regex = /<text[^>]*>(.*?)<\/text>/gs;
  let match;
  while ((match = regex.exec(captionXml)) !== null) {
    let text = match[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n/g, " ")
      .trim();
    if (text) textSegments.push(text);
  }

  const fullText = textSegments.join(" ");
  return { text: fullText, title: rawTitle };
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

    let transcript: string;
    let title: string;

    try {
      const result = await fetchYouTubeTranscript(videoId);
      transcript = result.text;
      title = result.title;
    } catch (e) {
      if (e instanceof Error && e.message === "NO_CAPTIONS") {
        return new Response(JSON.stringify({
          error: "Este vídeo não possui legendas disponíveis. Tente um vídeo com legendas ativadas.",
          videoId,
        }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw e;
    }

    if (!transcript || transcript.length < 20) {
      return new Response(JSON.stringify({
        error: "Transcrição muito curta ou vazia.",
        videoId,
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 4: Use AI to summarize and structure the knowledge
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
            content: `Você é um especialista em extrair conhecimento útil de transcrições de vídeos sobre viagens e turismo.
Sua tarefa é transformar a transcrição bruta em um documento de conhecimento estruturado e prático que será usado por agentes de IA de uma agência de viagens.

FORMATO DE SAÍDA (em português):
1. **Título sugerido** (1 linha)
2. **Resumo** (2-3 frases sobre o que o vídeo cobre)
3. **Conhecimento Extraído** (lista organizada dos pontos-chave: dicas, informações práticas, recomendações, preços mencionados, locais, restaurantes, hotéis, etc.)
4. **Categoria sugerida** (uma de: destinos, scripts, preços, fornecedores, processos, treinamento, compliance, geral)

Seja objetivo e foque em informações acionáveis que um agente de viagens possa usar para atender clientes.`,
          },
          {
            role: "user",
            content: `Transcrição do vídeo "${title}":\n\n${transcript.slice(0, 15000)}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
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

    return new Response(JSON.stringify({
      videoId,
      title,
      transcript: transcript.slice(0, 20000),
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
