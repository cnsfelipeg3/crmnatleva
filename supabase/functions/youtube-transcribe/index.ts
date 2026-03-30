import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

async function getVideoTitle(videoId: string): Promise<string> {
  try {
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    if (res.ok) {
      const data = await res.json();
      return data.title || `Video ${videoId}`;
    }
    await res.text().catch(() => {});
  } catch {}
  return `Video ${videoId}`;
}

const DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const IOS_UA = "com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)";

/** Download and parse a caption track URL — tries multiple formats and user agents */
async function downloadCaptionTrack(track: any, callerUA?: string): Promise<string> {
  let captionUrl = track.baseUrl || "";
  const lang = track.languageCode || "?";
  const kind = track.kind || "manual";
  console.log(`Downloading captions: lang=${lang}, kind=${kind}`);

  // Try multiple format+UA combinations
  const attempts = [
    { url: captionUrl.replace(/&fmt=[^&]*/g, "") + "&fmt=json3", ua: callerUA || DESKTOP_UA, label: "json3+caller" },
    { url: captionUrl.replace(/&fmt=[^&]*/g, ""), ua: callerUA || DESKTOP_UA, label: "xml+caller" },
    { url: captionUrl.replace(/&fmt=[^&]*/g, "") + "&fmt=json3", ua: DESKTOP_UA, label: "json3+desktop" },
    { url: captionUrl.replace(/&fmt=[^&]*/g, ""), ua: DESKTOP_UA, label: "xml+desktop" },
    { url: captionUrl.replace(/&fmt=[^&]*/g, "") + "&fmt=json3", ua: IOS_UA, label: "json3+ios" },
    { url: captionUrl.replace(/&fmt=[^&]*/g, ""), ua: IOS_UA, label: "xml+ios" },
  ];

  // Deduplicate by url+ua
  const seen = new Set<string>();
  const uniqueAttempts = attempts.filter(a => {
    const key = a.url + "|" + a.ua;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  for (const attempt of uniqueAttempts) {
    try {
      const captionRes = await fetch(attempt.url, {
        headers: { "User-Agent": attempt.ua },
      });
      if (!captionRes.ok) {
        console.warn(`Caption fetch (${attempt.label}): HTTP ${captionRes.status}`);
        await captionRes.text().catch(() => {});
        continue;
      }

      const captionText = await captionRes.text();
      if (!captionText || captionText.length < 20) {
        console.warn(`Caption fetch (${attempt.label}): empty response`);
        continue;
      }

      let transcript = "";

      // Try JSON parsing
      if (attempt.url.includes("json3") || captionText.trimStart().startsWith("{")) {
        try {
          const json = JSON.parse(captionText);
          const segments: string[] = [];
          for (const event of (json.events || [])) {
            if (event.segs) {
              let line = "";
              for (const seg of event.segs) {
                if (seg.utf8 && seg.utf8.trim() !== "\n" && seg.utf8.trim() !== "") line += seg.utf8;
              }
              if (line.trim()) segments.push(line.trim());
            }
          }
          transcript = segments.join(" ").replace(/\s+/g, " ").trim();
        } catch {}
      }

      // Try XML parsing if JSON didn't work or was empty
      if (!transcript || transcript.length < 20) {
        const segments: string[] = [];
        for (const match of captionText.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)) {
          const text = match[1]
            .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n/g, " ").trim();
          if (text) segments.push(text);
        }
        const xmlTranscript = segments.join(" ").replace(/\s+/g, " ").trim();
        if (xmlTranscript.length > (transcript?.length || 0)) {
          transcript = xmlTranscript;
        }
      }

      if (transcript && transcript.length >= 20) {
        console.log(`✅ Caption download (${attempt.label}): ${transcript.length} chars`);
        return transcript;
      }
      console.warn(`Caption fetch (${attempt.label}): parsed but too short (${transcript?.length || 0})`);
    } catch (e: any) {
      console.warn(`Caption fetch (${attempt.label}): ${e.message}`);
    }
  }

  throw new Error("EMPTY_TRANSCRIPT");
}

/** Pick best caption track: manual PT > manual any > auto PT > auto any */
function pickBestTrack(tracks: any[]): any {
  return (
    tracks.find((t: any) => t.languageCode === "pt" && t.kind !== "asr") ||
    tracks.find((t: any) => t.languageCode?.startsWith("pt") && t.kind !== "asr") ||
    tracks.find((t: any) => t.kind !== "asr") ||
    tracks.find((t: any) => t.languageCode === "pt") ||
    tracks.find((t: any) => t.languageCode?.startsWith("pt")) ||
    tracks[0]
  );
}

/** Try timedtext API directly — simplest method */
async function fetchViaTimedText(videoId: string): Promise<{ transcript: string; title: string; isAutoGenerated: boolean }> {
  console.log(`Trying timedtext API for ${videoId}...`);
  const title = await getVideoTitle(videoId);

  // Try multiple language codes
  const langs = ["pt", "pt-BR", "en", "es"];
  for (const lang of langs) {
    for (const kind of ["", "asr"]) {
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}${kind ? `&kind=${kind}` : ""}&fmt=json3`;
      try {
        const res = await fetch(url, { headers: { "User-Agent": DESKTOP_UA } });
        if (!res.ok) { await res.text().catch(() => {}); continue; }
        const text = await res.text();
        if (!text || text.length < 30) continue;
        
        try {
          const json = JSON.parse(text);
          const segments: string[] = [];
          for (const event of (json.events || [])) {
            if (event.segs) {
              let line = "";
              for (const seg of event.segs) {
                if (seg.utf8 && seg.utf8.trim() !== "\n" && seg.utf8.trim() !== "") line += seg.utf8;
              }
              if (line.trim()) segments.push(line.trim());
            }
          }
          const transcript = segments.join(" ").replace(/\s+/g, " ").trim();
          if (transcript.length >= 20) {
            console.log(`✅ timedtext (lang=${lang}, kind=${kind || "manual"}): ${transcript.length} chars`);
            return { transcript, title, isAutoGenerated: kind === "asr" };
          }
        } catch {}
      } catch {}
    }
  }
  throw new Error("NO_CAPTIONS_TIMEDTEXT");
}

/** Try InnerTube iOS client API */
async function fetchViaInnerTubeIOS(videoId: string): Promise<{ transcript: string; title: string; isAutoGenerated: boolean }> {
  console.log(`Trying InnerTube iOS client for ${videoId}...`);

  const playerRes = await fetch("https://www.youtube.com/youtubei/v1/player", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": IOS_UA },
    body: JSON.stringify({
      videoId,
      context: {
        client: { clientName: "IOS", clientVersion: "19.29.1", deviceMake: "Apple", deviceModel: "iPhone16,2", hl: "pt", gl: "BR" },
      },
    }),
  });

  if (!playerRes.ok) { await playerRes.text().catch(() => {}); throw new Error(`InnerTube iOS player: ${playerRes.status}`); }
  const playerData = await playerRes.json();

  const videoTitle = playerData?.videoDetails?.title || `Video ${videoId}`;
  const captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!captionTracks || captionTracks.length === 0) throw new Error("NO_CAPTIONS_IOS");

  console.log(`iOS: Found ${captionTracks.length} tracks: ${captionTracks.map((t: any) => `${t.languageCode}(${t.kind || "manual"})`).join(", ")}`);

  const preferred = pickBestTrack(captionTracks);
  const isAutoGenerated = preferred.kind === "asr";
  const transcript = await downloadCaptionTrack(preferred, IOS_UA);
  return { transcript, title: videoTitle, isAutoGenerated };
}

/** Try HTML page scrape */
async function fetchViaHTMLScrape(videoId: string): Promise<{ transcript: string; title: string; isAutoGenerated: boolean }> {
  console.log(`Trying HTML scrape for ${videoId}...`);
  const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const cookieStrategies = [
    "CONSENT=PENDING+987; SOCS=CAESEwgDEgk2MTcyNTcyNjQaAmVuIAEaBgiA_LyaBg",
    "CONSENT=YES+yt.477269918+FP+XXXX; SOCS=CAISEwgDEgk0OTc4ODE2NTkaAmVuIAEaBgiA_LyaBg",
    "",
  ];

  let html = "";
  for (const cookie of cookieStrategies) {
    const headers: Record<string, string> = {
      "User-Agent": DESKTOP_UA,
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    };
    if (cookie) headers["Cookie"] = cookie;
    const res = await fetch(pageUrl, { headers });
    if (!res.ok) { await res.text().catch(() => {}); continue; }
    html = await res.text();
    if (html.includes("captionTracks")) break;
  }

  if (!html) throw new Error("Failed to fetch YouTube page");

  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const rawTitle = titleMatch ? titleMatch[1].replace(/ - YouTube$/, "").trim() : `Video ${videoId}`;

  if (!html.includes("captionTracks")) throw new Error("NO_CAPTIONS_HTML");

  const marker = '"captionTracks":';
  const markerIdx = html.indexOf(marker);
  let captionTracks: any[] | null = null;
  if (markerIdx !== -1) {
    const arrayStart = html.indexOf("[", markerIdx);
    if (arrayStart !== -1 && arrayStart - markerIdx - marker.length < 5) {
      for (let end = arrayStart + 10; end < Math.min(arrayStart + 10000, html.length); end++) {
        if (html[end] === "]") {
          try { captionTracks = JSON.parse(html.slice(arrayStart, end + 1)); break; } catch {}
        }
      }
    }
  }

  if (!captionTracks || captionTracks.length === 0) throw new Error("NO_CAPTIONS_HTML");

  console.log(`HTML: Found ${captionTracks.length} tracks: ${captionTracks.map((t: any) => `${t.languageCode}(${t.kind || "manual"})`).join(", ")}`);

  const preferred = pickBestTrack(captionTracks);
  const isAutoGenerated = preferred.kind === "asr";
  const transcript = await downloadCaptionTrack(preferred, DESKTOP_UA);
  return { transcript, title: rawTitle, isAutoGenerated };
}

/** Try InnerTube WEB client */
async function fetchViaInnerTubeWEB(videoId: string): Promise<{ transcript: string; title: string; isAutoGenerated: boolean }> {
  console.log(`Trying InnerTube WEB client for ${videoId}...`);

  const playerRes = await fetch("https://www.youtube.com/youtubei/v1/player", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": DESKTOP_UA },
    body: JSON.stringify({
      videoId,
      context: { client: { clientName: "WEB", clientVersion: "2.20250101.00.00", hl: "pt", gl: "BR" } },
    }),
  });

  if (!playerRes.ok) { await playerRes.text().catch(() => {}); throw new Error(`InnerTube WEB player: ${playerRes.status}`); }
  const playerData = await playerRes.json();

  const videoTitle = playerData?.videoDetails?.title || `Video ${videoId}`;
  const captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!captionTracks || captionTracks.length === 0) throw new Error("NO_CAPTIONS_WEB");

  const preferred = pickBestTrack(captionTracks);
  const isAutoGenerated = preferred.kind === "asr";
  const transcript = await downloadCaptionTrack(preferred, DESKTOP_UA);
  return { transcript, title: videoTitle, isAutoGenerated };
}

/** Try ANDROID client — often works when iOS is blocked */
async function fetchViaInnerTubeAndroid(videoId: string): Promise<{ transcript: string; title: string; isAutoGenerated: boolean }> {
  console.log(`Trying InnerTube Android client for ${videoId}...`);
  const ANDROID_UA = "com.google.android.youtube/19.29.37 (Linux; U; Android 14; en_US) gzip";

  const playerRes = await fetch("https://www.youtube.com/youtubei/v1/player", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": ANDROID_UA },
    body: JSON.stringify({
      videoId,
      context: {
        client: { clientName: "ANDROID", clientVersion: "19.29.37", androidSdkVersion: 34, hl: "pt", gl: "BR" },
      },
    }),
  });

  if (!playerRes.ok) { await playerRes.text().catch(() => {}); throw new Error(`InnerTube Android player: ${playerRes.status}`); }
  const playerData = await playerRes.json();

  const videoTitle = playerData?.videoDetails?.title || `Video ${videoId}`;
  const captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!captionTracks || captionTracks.length === 0) throw new Error("NO_CAPTIONS_ANDROID");

  const preferred = pickBestTrack(captionTracks);
  const isAutoGenerated = preferred.kind === "asr";
  const transcript = await downloadCaptionTrack(preferred, ANDROID_UA);
  return { transcript, title: videoTitle, isAutoGenerated };
}

/** Main extraction with multiple fallback strategies */
async function fetchYouTubeCaptions(videoId: string): Promise<{ transcript: string; title: string; isAutoGenerated: boolean }> {
  const strategies = [
    { name: "TimedText API", fn: () => fetchViaTimedText(videoId) },
    { name: "InnerTube iOS", fn: () => fetchViaInnerTubeIOS(videoId) },
    { name: "InnerTube Android", fn: () => fetchViaInnerTubeAndroid(videoId) },
    { name: "HTML Scrape", fn: () => fetchViaHTMLScrape(videoId) },
    { name: "InnerTube WEB", fn: () => fetchViaInnerTubeWEB(videoId) },
  ];

  let lastError: Error | null = null;
  for (const strategy of strategies) {
    try {
      const result = await strategy.fn();
      console.log(`✅ ${strategy.name} succeeded: ${result.transcript.length} chars`);
      return result;
    } catch (err: any) {
      console.warn(`❌ ${strategy.name} failed: ${err.message}`);
      lastError = err;
    }
  }

  throw lastError || new Error("NO_CAPTIONS_FOUND");
}

/** Use AI to add punctuation to raw auto-generated captions */
async function addPunctuation(apiKey: string, rawText: string): Promise<string> {
  const MAX_PUNCT_CHUNK = 20000;
  
  if (rawText.length <= MAX_PUNCT_CHUNK) {
    return await callPunctuationAI(apiKey, rawText);
  }

  const chunks: string[] = [];
  let start = 0;
  while (start < rawText.length) {
    let end = Math.min(start + MAX_PUNCT_CHUNK, rawText.length);
    if (end < rawText.length) {
      const spaceIdx = rawText.lastIndexOf(" ", end);
      if (spaceIdx > start + MAX_PUNCT_CHUNK * 0.7) end = spaceIdx;
    }
    chunks.push(rawText.slice(start, end).trim());
    start = end;
  }

  console.log(`Punctuation: splitting into ${chunks.length} chunks`);
  const results: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Punctuating chunk ${i + 1}/${chunks.length}...`);
    results.push(await callPunctuationAI(apiKey, chunks[i]));
  }
  return results.join("\n\n");
}

async function callPunctuationAI(apiKey: string, text: string): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: `Você é um especialista em transcrição. Sua ÚNICA tarefa é adicionar pontuação, maiúsculas e parágrafos ao texto bruto. NÃO altere nenhuma palavra. Retorne APENAS o texto pontuado.` },
        { role: "user", content: text },
      ],
    }),
  });

  if (!response.ok) {
    console.warn(`Punctuation AI failed: ${response.status}`);
    return text;
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || text;
}

const SYSTEM_PROMPT = `Você é um especialista em extrair conhecimento útil de transcrições de vídeos sobre viagens e turismo.
Sua tarefa é analisar a TRANSCRIÇÃO COMPLETA de um vídeo do YouTube e transformá-la em um documento de conhecimento estruturado e prático que será usado por agentes de IA de uma agência de viagens.

REGRAS CRÍTICAS:
- Extraia SOMENTE o que é REALMENTE dito na transcrição. NÃO invente informações.
- Seja ESPECÍFICO e DETALHADO — cite nomes de lugares, preços, dicas práticas, opiniões e recomendações exatas do apresentador.
- Se o apresentador menciona um restaurante, diga QUAL restaurante, ONDE fica, O QUE ele recomendou e QUANTO custou.
- Se fala de hotel, diga QUAL hotel, a experiência real, prós e contras mencionados.
- Se fala de transporte, diga COMO ir, QUANTO custa, TEMPO de deslocamento.
- NÃO use frases genéricas como "o vídeo discute sobre idiomas" — diga exatamente O QUE foi dito.

FORMATO DE SAÍDA (em português, use markdown):

# [Título descritivo baseado no conteúdo REAL]

## Resumo
[3-5 frases detalhadas sobre o que o vídeo REALMENTE cobre, com dados específicos]

## Conhecimento Extraído
[Lista DETALHADA e organizada dos pontos-chave com informações ESPECÍFICAS]

## Dados Práticos
- **Destino**: [destino REAL do vídeo]
- **Cidades/Regiões cobertas**: [lista de todos os locais mencionados]
- **Melhor época**: [se mencionado]
- **Faixa de preço**: [valores EXATOS mencionados]
- **Duração sugerida**: [se mencionado]
- **Dicas importantes**: [lista detalhada de dicas REAIS]
- **O que evitar**: [se mencionado]
- **Documentação necessária**: [se mencionado]

## Categoria sugerida
[uma de: destinos, scripts, preços, fornecedores, processos, treinamento, compliance, geral]

IMPORTANTE: Seja EXTREMAMENTE fiel à transcrição.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url, manual_transcript } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL não fornecida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return new Response(JSON.stringify({ error: "URL do YouTube inválida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing video: ${videoId}, manual=${!!manual_transcript}`);

    let transcript = "";
    let videoTitle = "";
    let isAutoGenerated = false;

    if (manual_transcript && manual_transcript.trim().length > 20) {
      transcript = manual_transcript.trim();
      videoTitle = await getVideoTitle(videoId);
      console.log(`Using manual transcript: ${transcript.length} chars`);
    } else {
      try {
        const result = await fetchYouTubeCaptions(videoId);
        transcript = result.transcript;
        videoTitle = result.title;
        isAutoGenerated = result.isAutoGenerated;
        console.log(`Got transcript: ${transcript.length} chars, auto=${isAutoGenerated}`);
      } catch (captionErr: any) {
        console.warn(`All caption strategies failed: ${captionErr.message}`);

        // Firecrawl as absolute last resort — but limit content aggressively
        const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
        if (FIRECRAWL_API_KEY) {
          try {
            console.log("Trying Firecrawl as last resort...");
            const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
              method: "POST",
              headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${videoId}`, formats: ["markdown"] }),
            });
            if (scrapeRes.ok) {
              const scrapeData = await scrapeRes.json();
              let rawMarkdown = scrapeData?.data?.markdown || "";
              videoTitle = scrapeData?.data?.metadata?.title || `Vídeo YouTube: ${videoId}`;

              // Firecrawl returns the whole YouTube page. Extract only useful text.
              // The transcript is NOT in the page markdown — this is description + comments.
              // Cap to 25k to avoid massive AI processing.
              const MAX_FIRECRAWL = 25000;
              
              // Try to find description section only
              const descMarker = rawMarkdown.indexOf("...more");
              const commentsMarker = rawMarkdown.search(/\d+\s*Comment/i);
              if (descMarker > 0 && commentsMarker > descMarker) {
                rawMarkdown = rawMarkdown.slice(0, commentsMarker);
              }
              
              if (rawMarkdown.length > MAX_FIRECRAWL) {
                rawMarkdown = rawMarkdown.slice(0, MAX_FIRECRAWL);
              }
              
              // Only use if we got meaningful content (not just nav/boilerplate)
              if (rawMarkdown.length > 200) {
                transcript = rawMarkdown;
                console.log(`Firecrawl fallback: ${transcript.length} chars`);
              }
            } else {
              console.warn(`Firecrawl: ${scrapeRes.status}`);
              await scrapeRes.text().catch(() => {});
            }
          } catch (e: any) {
            console.warn(`Firecrawl error: ${e.message}`);
          }
        }

        if (!videoTitle) videoTitle = await getVideoTitle(videoId);

        if (!transcript || transcript.length < 50) {
          return new Response(JSON.stringify({
            error: "TRANSCRIPT_UNAVAILABLE",
            message: "Não foi possível extrair legendas automaticamente. Use a opção de colar a transcrição manualmente.",
            videoId,
            videoTitle,
          }), {
            status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Cap transcript to reasonable size (150k chars)
    const MAX_TRANSCRIPT = 150000;
    if (transcript.length > MAX_TRANSCRIPT) {
      transcript = transcript.slice(0, MAX_TRANSCRIPT);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Add punctuation to auto-generated captions
    if (isAutoGenerated && transcript.length > 50 && transcript.length < 80000) {
      console.log("Adding punctuation to auto-generated captions...");
      transcript = await addPunctuation(LOVABLE_API_KEY, transcript);
    }

    // Process with AI — use a single pass with truncated input for speed
    let structuredKnowledge = "";
    const MAX_AI_INPUT = 25000;

    if (transcript.length <= MAX_AI_INPUT) {
      structuredKnowledge = await callAI(LOVABLE_API_KEY, SYSTEM_PROMPT,
        `Analise a transcrição COMPLETA deste vídeo do YouTube chamado "${videoTitle}" e extraia TODOS os detalhes específicos mencionados.\n\nTRANSCRIÇÃO COMPLETA:\n${transcript}`
      );
    } else {
      // For long transcripts: take beginning + end (most important parts)
      console.log(`Long transcript (${transcript.length} chars), using smart truncation...`);
      const headSize = Math.floor(MAX_AI_INPUT * 0.6);
      const tailSize = Math.floor(MAX_AI_INPUT * 0.35);
      const truncated = transcript.slice(0, headSize) + "\n\n[... parte central omitida por tamanho ...]\n\n" + transcript.slice(-tailSize);
      
      structuredKnowledge = await callAI(LOVABLE_API_KEY, SYSTEM_PROMPT,
        `Analise esta transcrição (truncada por tamanho) do vídeo "${videoTitle}" e extraia TODOS os detalhes específicos mencionados.\n\nTRANSCRIÇÃO:\n${truncated}`
      );
    }

    if (!structuredKnowledge || structuredKnowledge.length < 50) {
      return new Response(JSON.stringify({ error: "Não foi possível extrair conhecimento deste vídeo.", videoId }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const titleMatch = structuredKnowledge.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : (videoTitle || `Vídeo YouTube: ${videoId}`);

    return new Response(JSON.stringify({
      videoId, title, transcript, structured_knowledge: structuredKnowledge, language: "pt",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("youtube-transcribe error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Erro ao processar vídeo",
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function callAI(apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const status = res.status;
    if (status === 429) throw new Error("Rate limit atingido. Tente novamente em alguns segundos.");
    if (status === 402) throw new Error("Créditos de IA insuficientes.");
    throw new Error(`AI gateway error: ${status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}
