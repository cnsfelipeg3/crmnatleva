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

/** Extract caption tracks from YouTube page HTML */
async function fetchYouTubeCaptions(videoId: string): Promise<{ transcript: string; title: string }> {
  const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  const res = await fetch(pageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch YouTube page: ${res.status}`);
  const html = await res.text();

  // Extract video title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const rawTitle = titleMatch ? titleMatch[1].replace(/ - YouTube$/, "").trim() : `Video ${videoId}`;

  // Extract captions from ytInitialPlayerResponse
  const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
  if (!playerMatch) {
    // Try alternative pattern
    const altMatch = html.match(/"captions"\s*:\s*(\{[^}]+?"captionTracks"\s*:\s*\[[^\]]+?\][^}]*?\})/s);
    if (!altMatch) throw new Error("NO_CAPTIONS_FOUND");
  }

  // Find captionTracks URLs
  const captionTracksMatch = html.match(/"captionTracks"\s*:\s*(\[[\s\S]*?\])\s*[,}]/);
  if (!captionTracksMatch) throw new Error("NO_CAPTIONS_FOUND");

  let captionTracks: any[];
  try {
    captionTracks = JSON.parse(captionTracksMatch[1]);
  } catch {
    throw new Error("NO_CAPTIONS_FOUND");
  }

  if (!captionTracks || captionTracks.length === 0) throw new Error("NO_CAPTIONS_FOUND");

  // Prefer Portuguese, then auto-generated Portuguese, then any available
  const preferred = 
    captionTracks.find((t: any) => t.languageCode === "pt" && t.kind !== "asr") ||
    captionTracks.find((t: any) => t.languageCode === "pt") ||
    captionTracks.find((t: any) => t.languageCode?.startsWith("pt")) ||
    captionTracks.find((t: any) => t.kind !== "asr") ||
    captionTracks[0];

  let captionUrl = preferred.baseUrl;
  // Request plain text format (srv1 = timed text XML, but we want json3 for easy parsing)
  if (!captionUrl.includes("fmt=")) {
    captionUrl += "&fmt=json3";
  }

  console.log(`Fetching captions: lang=${preferred.languageCode}, kind=${preferred.kind || "manual"}`);

  const captionRes = await fetch(captionUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!captionRes.ok) throw new Error(`Failed to fetch captions: ${captionRes.status}`);
  
  const contentType = captionRes.headers.get("content-type") || "";
  let transcript = "";

  if (contentType.includes("json") || captionUrl.includes("json3")) {
    const json = await captionRes.json();
    // json3 format has events[] with segs[] containing utf8 text
    const events = json.events || [];
    for (const event of events) {
      if (event.segs) {
        for (const seg of event.segs) {
          if (seg.utf8 && seg.utf8.trim() !== "\n") {
            transcript += seg.utf8;
          }
        }
      }
    }
  } else {
    // XML format fallback
    const xml = await captionRes.text();
    const textMatches = xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g);
    for (const match of textMatches) {
      let text = match[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n/g, " ");
      transcript += text + " ";
    }
  }

  transcript = transcript
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();

  if (!transcript || transcript.length < 20) throw new Error("EMPTY_TRANSCRIPT");

  return { transcript, title: rawTitle };
}

const SYSTEM_PROMPT = `Você é um especialista em extrair conhecimento útil de transcrições de vídeos sobre viagens e turismo.
Sua tarefa é analisar a TRANSCRIÇÃO COMPLETA de um vídeo do YouTube e transformá-la em um documento de conhecimento estruturado e prático que será usado por agentes de IA de uma agência de viagens.

REGRAS CRÍTICAS:
- Extraia SOMENTE o que é REALMENTE dito na transcrição. NÃO invente informações.
- Seja ESPECÍFICO e DETALHADO — cite nomes de lugares, preços, dicas práticas, opiniões e recomendações exatas do apresentador.
- Se o apresentador menciona um restaurante, diga QUAL restaurante, ONDE fica, O QUE ele recomendou e QUANTO custou.
- Se fala de hotel, diga QUAL hotel, a experiência real, prós e contras mencionados.
- Se fala de transporte, diga COMO ir, QUANTO custa, TEMPO de deslocamento.
- NÃO use frases genéricas como "o vídeo discute sobre idiomas" — diga exatamente O QUE foi dito sobre idiomas.

FORMATO DE SAÍDA (em português, use markdown):

# [Título descritivo baseado no conteúdo REAL]

## Resumo
[3-5 frases detalhadas sobre o que o vídeo REALMENTE cobre, com dados específicos]

## Conhecimento Extraído
[Lista DETALHADA e organizada dos pontos-chave com informações ESPECÍFICAS: nomes de lugares, preços exatos, durações, dicas práticas reais, recomendações concretas do apresentador, experiências relatadas]

## Dados Práticos
- **Destino**: [destino REAL do vídeo]
- **Cidades/Regiões cobertas**: [lista de todos os locais mencionados]
- **Melhor época**: [se mencionado, com detalhes]
- **Faixa de preço**: [valores EXATOS mencionados]
- **Duração sugerida**: [se mencionado]
- **Dicas importantes**: [lista detalhada de dicas REAIS dadas no vídeo]
- **O que evitar**: [se mencionado]
- **Documentação necessária**: [se mencionado]

## Categoria sugerida
[uma de: destinos, scripts, preços, fornecedores, processos, treinamento, compliance, geral]

IMPORTANTE: Seja EXTREMAMENTE fiel à transcrição. Cada informação deve poder ser rastreada de volta ao que foi dito no vídeo. Quanto mais específico e detalhado, melhor.`;

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

    // Step 1: Fetch real captions/subtitles
    let transcript = "";
    let videoTitle = "";

    try {
      const result = await fetchYouTubeCaptions(videoId);
      transcript = result.transcript;
      videoTitle = result.title;
      console.log(`Got real transcript: ${transcript.length} chars`);
    } catch (captionErr: any) {
      console.warn(`Caption extraction failed: ${captionErr.message}, falling back to Firecrawl`);
      
      // Fallback: use Firecrawl to scrape page
      const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
      if (!FIRECRAWL_API_KEY) throw new Error("Não foi possível extrair legendas e FIRECRAWL_API_KEY não configurada");

      const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: `https://www.youtube.com/watch?v=${videoId}`,
          formats: ["markdown"],
        }),
      });

      if (!scrapeRes.ok) throw new Error(`Firecrawl error: ${scrapeRes.status}`);
      const scrapeData = await scrapeRes.json();
      transcript = scrapeData?.data?.markdown || "";
      videoTitle = scrapeData?.data?.metadata?.title || `Vídeo YouTube: ${videoId}`;
      
      if (!transcript || transcript.length < 50) {
        return new Response(JSON.stringify({
          error: "Não foi possível extrair conteúdo deste vídeo. Verifique se o vídeo tem legendas/closed captions ativadas.",
          videoId,
        }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Step 2: Process transcript with AI (chunking strategy for long transcripts)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let structuredKnowledge = "";
    const MAX_CHUNK = 25000; // chars per chunk

    if (transcript.length <= MAX_CHUNK) {
      // Single pass — transcript fits in one request
      structuredKnowledge = await callAI(LOVABLE_API_KEY, SYSTEM_PROMPT, 
        `Analise a transcrição COMPLETA deste vídeo do YouTube chamado "${videoTitle}" e extraia TODOS os detalhes específicos mencionados. Seja extremamente detalhado e específico.\n\nTRANSCRIÇÃO COMPLETA:\n${transcript}`
      );
    } else {
      // Chunked approach: extract key points from each chunk, then synthesize
      console.log(`Long transcript (${transcript.length} chars), using chunked approach`);
      
      const chunks: string[] = [];
      for (let i = 0; i < transcript.length; i += MAX_CHUNK) {
        chunks.push(transcript.slice(i, i + MAX_CHUNK));
      }
      console.log(`Split into ${chunks.length} chunks`);

      // Phase 1: Extract detailed notes from each chunk
      const chunkSummaries: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        console.log(`Processing chunk ${i + 1}/${chunks.length}...`);
        const chunkResult = await callAI(LOVABLE_API_KEY,
          `Você é um especialista em extrair informações detalhadas de transcrições de vídeos de viagem. Extraia TODAS as informações específicas: nomes de lugares, preços, dicas, recomendações, horários, experiências. Seja extremamente detalhado. Não invente nada.`,
          `Esta é a PARTE ${i + 1} de ${chunks.length} da transcrição do vídeo "${videoTitle}". Extraia TODOS os detalhes específicos mencionados neste trecho.\n\nTRECHO:\n${chunks[i]}`
        );
        chunkSummaries.push(`--- PARTE ${i + 1} ---\n${chunkResult}`);
      }

      // Phase 2: Synthesize all chunk summaries into final structured knowledge
      console.log("Synthesizing final knowledge...");
      const combinedSummaries = chunkSummaries.join("\n\n");
      
      // Truncate combined summaries if too long
      const summaryInput = combinedSummaries.length > 30000 
        ? combinedSummaries.slice(0, 30000) + "\n\n[... notas adicionais truncadas]"
        : combinedSummaries;

      structuredKnowledge = await callAI(LOVABLE_API_KEY, SYSTEM_PROMPT,
        `Abaixo estão notas DETALHADAS extraídas de ${chunks.length} partes da transcrição do vídeo "${videoTitle}". Organize tudo em um documento de conhecimento ÚNICO, coerente e completo. Mantenha TODOS os detalhes específicos (nomes, preços, dicas). NÃO descarte informações.\n\nNOTAS EXTRAÍDAS:\n${summaryInput}`
      );
    }

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
    const title = titleMatch ? titleMatch[1].trim() : (videoTitle || `Vídeo YouTube: ${videoId}`);

    console.log(`Successfully extracted knowledge: ${title} (transcript: ${transcript.length} chars)`);

    return new Response(JSON.stringify({
      videoId,
      title,
      transcript,
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

async function callAI(apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!aiResponse.ok) {
    const status = aiResponse.status;
    if (status === 429) throw new Error("Rate limit atingido. Tente novamente em alguns segundos.");
    if (status === 402) throw new Error("Créditos de IA insuficientes.");
    throw new Error(`AI gateway error: ${status}`);
  }

  const aiData = await aiResponse.json();
  return aiData.choices?.[0]?.message?.content || "";
}
