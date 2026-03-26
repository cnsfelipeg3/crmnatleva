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

async function fetchTranscript(videoId: string): Promise<string> {
  // Step 1: Fetch YouTube page to extract caption tracks
  const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const pageRes = await fetch(pageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!pageRes.ok) {
    throw new Error(`Failed to fetch YouTube page: ${pageRes.status}`);
  }

  const html = await pageRes.text();

  // Step 2: Extract captions data from playerCaptionsTracklistRenderer
  const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
  if (!captionMatch) {
    // Try alternative: check for timedtext in the page
    const timedTextMatch = html.match(/\/api\/timedtext[^"']*/);
    if (timedTextMatch) {
      const ttUrl = `https://www.youtube.com${timedTextMatch[0].replace(/\\u0026/g, '&')}`;
      return await fetchCaptionXml(ttUrl);
    }
    throw new Error("NO_CAPTIONS");
  }

  let tracks: any[];
  try {
    const raw = captionMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    tracks = JSON.parse(raw);
  } catch {
    // Try a more lenient extraction
    const urlMatch = captionMatch[1].match(/"baseUrl":\s*"([^"]+)"/);
    if (urlMatch) {
      const captionUrl = urlMatch[1].replace(/\\u0026/g, '&');
      return await fetchCaptionXml(captionUrl);
    }
    throw new Error("NO_CAPTIONS");
  }

  if (!tracks || tracks.length === 0) {
    throw new Error("NO_CAPTIONS");
  }

  // Step 3: Prefer Portuguese, then English, then first available
  const ptTrack = tracks.find((t: any) => t.languageCode?.startsWith('pt'));
  const enTrack = tracks.find((t: any) => t.languageCode?.startsWith('en'));
  const selectedTrack = ptTrack || enTrack || tracks[0];

  const captionUrl = selectedTrack.baseUrl.replace(/\\u0026/g, '&');
  return await fetchCaptionXml(captionUrl);
}

async function fetchCaptionXml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch captions: ${res.status}`);
  const xml = await res.text();

  // Parse XML to extract text
  const textParts: string[] = [];
  const regex = /<text[^>]*>(.*?)<\/text>/gs;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    let text = match[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/<[^>]+>/g, '') // remove any nested tags
      .trim();
    if (text) textParts.push(text);
  }

  if (textParts.length === 0) {
    throw new Error("NO_CAPTIONS");
  }

  return textParts.join(' ');
}

const SYSTEM_PROMPT = `Você é um especialista em extrair conhecimento útil de transcrições de vídeos sobre viagens e turismo.
Sua tarefa é analisar a transcrição fornecida e transformar o conteúdo em um documento de conhecimento estruturado e prático que será usado por agentes de IA de uma agência de viagens.

REGRAS CRÍTICAS:
- Extraia SOMENTE o que é REALMENTE dito na transcrição. NÃO invente informações.
- Se a transcrição é sobre a China, o conteúdo deve ser sobre a China. Se é sobre Dubai, deve ser sobre Dubai.
- Nunca substitua o destino real por outro.

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

IMPORTANTE: Seja fiel ao conteúdo da transcrição. Extraia TODAS as informações acionáveis mencionadas.`;

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

    // Step 1: Extract transcript from captions
    let transcript: string;
    try {
      transcript = await fetchTranscript(videoId);
      console.log(`Transcript extracted: ${transcript.length} chars`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "NO_CAPTIONS") {
        return new Response(JSON.stringify({
          error: "Este vídeo não possui legendas/captions disponíveis. Tente outro vídeo que tenha legendas ativadas.",
          videoId,
        }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw e;
    }

    // Step 2: Send transcript to AI for structuring
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Truncate transcript if too long (keep first ~15000 chars)
    const truncatedTranscript = transcript.length > 15000 
      ? transcript.slice(0, 15000) + "\n\n[... transcrição truncada por limite de tamanho]"
      : transcript;

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
            content: `Analise esta transcrição de um vídeo do YouTube e extraia todo o conhecimento relevante. Seja fiel ao conteúdo REAL — não invente nada.\n\nTRANSCRIÇÃO:\n${truncatedTranscript}`,
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
    const title = titleMatch ? titleMatch[1].trim() : `Vídeo YouTube: ${videoId}`;

    console.log(`Successfully extracted knowledge for: ${title}`);

    return new Response(JSON.stringify({
      videoId,
      title,
      transcript: truncatedTranscript,
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
