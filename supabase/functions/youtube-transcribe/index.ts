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

  const attempts = [
    { url: captionUrl.replace(/&fmt=[^&]*/g, "") + "&fmt=json3", ua: callerUA || DESKTOP_UA, label: "json3+caller" },
    { url: captionUrl.replace(/&fmt=[^&]*/g, ""), ua: callerUA || DESKTOP_UA, label: "xml+caller" },
    { url: captionUrl.replace(/&fmt=[^&]*/g, "") + "&fmt=json3", ua: DESKTOP_UA, label: "json3+desktop" },
    { url: captionUrl.replace(/&fmt=[^&]*/g, ""), ua: DESKTOP_UA, label: "xml+desktop" },
    { url: captionUrl.replace(/&fmt=[^&]*/g, "") + "&fmt=json3", ua: IOS_UA, label: "json3+ios" },
    { url: captionUrl.replace(/&fmt=[^&]*/g, ""), ua: IOS_UA, label: "xml+ios" },
  ];

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
        const status = captionRes.status;
        console.warn(`Caption fetch (${attempt.label}): HTTP ${status}`);
        await captionRes.text().catch(() => {});
        if (status === 429) throw new Error("RATE_LIMITED");
        continue;
      }

      const captionText = await captionRes.text();
      if (!captionText || captionText.length < 20) {
        console.warn(`Caption fetch (${attempt.label}): empty response`);
        continue;
      }

      const transcript = parseCaptionResponse(captionText, attempt.url.includes("json3"));

      if (transcript && transcript.length >= 100) {
        console.log(`✅ Caption download (${attempt.label}): ${transcript.length} chars, ${transcript.split(/\s+/).length} words`);
        return transcript;
      }
      console.warn(`Caption fetch (${attempt.label}): parsed but too short (${transcript?.length || 0})`);
    } catch (e: any) {
      if (e.message === "RATE_LIMITED") throw e;
      console.warn(`Caption fetch (${attempt.label}): ${e.message}`);
    }
  }

  throw new Error("EMPTY_TRANSCRIPT");
}

/** Parse caption text (JSON3 or XML) into plain text */
function parseCaptionResponse(text: string, isJson3: boolean): string {
  let transcript = "";

  // Try JSON parsing
  if (isJson3 || text.trimStart().startsWith("{")) {
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
      transcript = segments.join(" ").replace(/\s+/g, " ").trim();
    } catch {}
  }

  // Try XML parsing if JSON didn't work
  if (!transcript || transcript.length < 50) {
    const segments: string[] = [];
    for (const match of text.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)) {
      const t = match[1]
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n/g, " ").trim();
      if (t) segments.push(t);
    }
    const xmlTranscript = segments.join(" ").replace(/\s+/g, " ").trim();
    if (xmlTranscript.length > (transcript?.length || 0)) {
      transcript = xmlTranscript;
    }
  }

  return transcript;
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

/** Extract caption tracks from YouTube HTML page */
function extractCaptionTracksFromHTML(html: string): any[] | null {
  if (!html.includes("captionTracks")) return null;
  const marker = '"captionTracks":';
  const markerIdx = html.indexOf(marker);
  if (markerIdx === -1) return null;

  const arrayStart = html.indexOf("[", markerIdx);
  if (arrayStart === -1 || arrayStart - markerIdx - marker.length > 5) return null;

  for (let end = arrayStart + 10; end < Math.min(arrayStart + 10000, html.length); end++) {
    if (html[end] === "]") {
      try {
        return JSON.parse(html.slice(arrayStart, end + 1));
      } catch {}
    }
  }
  return null;
}

/** Try timedtext API directly */
async function fetchViaTimedText(videoId: string): Promise<{ transcript: string; title: string; isAutoGenerated: boolean }> {
  console.log(`Trying timedtext API for ${videoId}...`);
  const title = await getVideoTitle(videoId);
  const langs = ["pt", "pt-BR", "en", "es"];
  for (const lang of langs) {
    for (const kind of ["", "asr"]) {
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}${kind ? `&kind=${kind}` : ""}&fmt=json3`;
      try {
        const res = await fetch(url, { headers: { "User-Agent": DESKTOP_UA } });
        if (!res.ok) { await res.text().catch(() => {}); continue; }
        const text = await res.text();
        if (!text || text.length < 30) continue;
        const transcript = parseCaptionResponse(text, true);
        if (transcript.length >= 100) {
          console.log(`✅ timedtext (lang=${lang}, kind=${kind || "manual"}): ${transcript.length} chars`);
          return { transcript, title, isAutoGenerated: kind === "asr" };
        }
      } catch {}
    }
  }
  throw new Error("NO_CAPTIONS_TIMEDTEXT");
}

/** Try InnerTube client (iOS/Android/WEB) */
async function fetchViaInnerTube(videoId: string, clientName: string): Promise<{ transcript: string; title: string; isAutoGenerated: boolean; captionTracks?: any[] }> {
  const clients: Record<string, { ua: string; body: any }> = {
    IOS: {
      ua: IOS_UA,
      body: { videoId, context: { client: { clientName: "IOS", clientVersion: "19.29.1", deviceMake: "Apple", deviceModel: "iPhone16,2", hl: "pt", gl: "BR" } } },
    },
    ANDROID: {
      ua: "com.google.android.youtube/19.29.37 (Linux; U; Android 14; en_US) gzip",
      body: { videoId, context: { client: { clientName: "ANDROID", clientVersion: "19.29.37", androidSdkVersion: 34, hl: "pt", gl: "BR" } } },
    },
    WEB: {
      ua: DESKTOP_UA,
      body: { videoId, context: { client: { clientName: "WEB", clientVersion: "2.20250101.00.00", hl: "pt", gl: "BR" } } },
    },
  };

  const config = clients[clientName];
  if (!config) throw new Error(`Unknown client: ${clientName}`);

  console.log(`Trying InnerTube ${clientName} for ${videoId}...`);
  const playerRes = await fetch("https://www.youtube.com/youtubei/v1/player", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": config.ua },
    body: JSON.stringify(config.body),
  });

  if (!playerRes.ok) { await playerRes.text().catch(() => {}); throw new Error(`InnerTube ${clientName}: ${playerRes.status}`); }
  const playerData = await playerRes.json();
  if (playerData.error) throw new Error(`InnerTube ${clientName}: API error`);

  const videoTitle = playerData?.videoDetails?.title || `Video ${videoId}`;
  const captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!captionTracks || captionTracks.length === 0) throw new Error(`NO_CAPTIONS_${clientName}`);

  console.log(`${clientName}: Found ${captionTracks.length} tracks: ${captionTracks.map((t: any) => `${t.languageCode}(${t.kind || "manual"})`).join(", ")}`);
  const preferred = pickBestTrack(captionTracks);
  const isAutoGenerated = preferred.kind === "asr";

  try {
    const transcript = await downloadCaptionTrack(preferred, config.ua);
    return { transcript, title: videoTitle, isAutoGenerated, captionTracks };
  } catch (e: any) {
    if (e.message === "RATE_LIMITED") {
      // Return tracks for client-side download
      throw Object.assign(new Error("RATE_LIMITED"), { captionTracks, videoTitle });
    }
    throw e;
  }
}

/** Try HTML page scrape */
async function fetchViaHTMLScrape(videoId: string): Promise<{ transcript: string; title: string; isAutoGenerated: boolean; captionTracks?: any[] }> {
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

  const captionTracks = extractCaptionTracksFromHTML(html);
  if (!captionTracks || captionTracks.length === 0) throw new Error("NO_CAPTIONS_HTML");

  console.log(`HTML: Found ${captionTracks.length} tracks: ${captionTracks.map((t: any) => `${t.languageCode}(${t.kind || "manual"})`).join(", ")}`);
  const preferred = pickBestTrack(captionTracks);
  const isAutoGenerated = preferred.kind === "asr";

  try {
    const transcript = await downloadCaptionTrack(preferred, DESKTOP_UA);
    return { transcript, title: rawTitle, isAutoGenerated, captionTracks };
  } catch (e: any) {
    if (e.message === "RATE_LIMITED" || e.message === "EMPTY_TRANSCRIPT") {
      // Return tracks for client-side download
      throw Object.assign(new Error("RATE_LIMITED"), { captionTracks, videoTitle: rawTitle });
    }
    throw e;
  }
}

const SUPADATA_API_KEY = Deno.env.get("SUPADATA_API_KEY");

/** Try Supadata.ai transcript API (with 1 retry on network/5xx errors) */
async function fetchViaSupadata(videoId: string): Promise<{ transcript: string; title: string; isAutoGenerated: boolean }> {
  if (!SUPADATA_API_KEY) {
    console.warn("[Supadata] SUPADATA_API_KEY not configured, skipping");
    throw new Error("SUPADATA_KEY_MISSING");
  }
  console.log(`[Supadata] Trying Supadata.ai for ${videoId}...`);
  const url = `https://api.supadata.ai/v1/transcript?url=https://youtu.be/${videoId}`;

  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { "x-api-key": SUPADATA_API_KEY },
      });
      if (!response.ok) {
        const status = response.status;
        await response.text().catch(() => {});
        if (status >= 500 && attempt === 0) {
          console.warn(`[Supadata] 5xx (${status}), retrying in 1s...`);
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        throw new Error(`Supadata API returned ${status}`);
      }
      const data = await response.json();
      if (!Array.isArray(data.content) || data.content.length === 0) {
        throw new Error("Supadata returned empty content");
      }
      const transcript = data.content.map((item: any) => item.text).join(" ").trim();
      if (transcript.length < 100) {
        throw new Error(`Supadata transcript too short (${transcript.length} chars)`);
      }
      const title = data.title || await getVideoTitle(videoId);
      console.log(`[Supadata] Success: ${transcript.length} chars, title="${title}"`);
      return { transcript, title, isAutoGenerated: false };
    } catch (e: any) {
      lastErr = e;
      if (attempt === 0 && (e.message?.includes("fetch") || e.name === "TypeError")) {
        console.warn(`[Supadata] Network error, retrying in 1s: ${e.message}`);
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      throw e;
    }
  }
  throw lastErr || new Error("Supadata failed after retries");
}

/** Try Apify youtube-transcript-scraper (only if APIFY_TOKEN is set) */
async function fetchViaApify(videoId: string): Promise<{ transcript: string; title: string; isAutoGenerated: boolean }> {
  const apifyToken = Deno.env.get("APIFY_TOKEN");
  if (!apifyToken) {
    throw new Error("APIFY_TOKEN not configured, skipping");
  }
  console.log(`[Apify] Trying Apify transcript scraper for ${videoId}...`);
  const endpoint = `https://api.apify.com/v2/acts/pintostudio~youtube-transcript-scraper/run-sync-get-dataset-items?token=${apifyToken}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videoUrl: `https://www.youtube.com/watch?v=${videoId}` }),
  });
  if (!response.ok) {
    const status = response.status;
    await response.text().catch(() => {});
    throw new Error(`Apify API returned ${status}`);
  }
  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Apify returned empty array");
  }
  const transcript = data.map((item: any) => item.text).filter(Boolean).join(" ").trim();
  if (transcript.length < 100) {
    throw new Error(`Apify transcript too short (${transcript.length} chars)`);
  }
  const title = await getVideoTitle(videoId);
  console.log(`[Apify] Success: ${transcript.length} chars`);
  return { transcript, title, isAutoGenerated: false };
}

/** Main extraction with multiple fallback strategies */
async function fetchYouTubeCaptions(videoId: string): Promise<{ transcript: string; title: string; isAutoGenerated: boolean } | { clientDownloadNeeded: true; captionTracks: any[]; videoTitle: string; lastError?: string }> {
  const strategies = [
    { name: "Supadata.ai", fn: () => fetchViaSupadata(videoId) },
    { name: "Apify", fn: () => fetchViaApify(videoId) },
    { name: "TimedText API", fn: () => fetchViaTimedText(videoId) },
    { name: "InnerTube iOS", fn: () => fetchViaInnerTube(videoId, "IOS") },
    { name: "InnerTube Android", fn: () => fetchViaInnerTube(videoId, "ANDROID") },
    { name: "HTML Scrape", fn: () => fetchViaHTMLScrape(videoId) },
    { name: "InnerTube WEB", fn: () => fetchViaInnerTube(videoId, "WEB") },
  ];

  let lastError: any = null;
  let captionTracksForClient: any[] | null = null;
  let videoTitleForClient = "";

  for (const strategy of strategies) {
    try {
      const result = await strategy.fn();
      console.log(`✅ ${strategy.name} succeeded: ${result.transcript.length} chars`);
      return result;
    } catch (err: any) {
      console.warn(`❌ ${strategy.name} failed: ${err.message}`);
      // Capture caption tracks from rate-limited strategies for client download
      if (err.message === "RATE_LIMITED" && err.captionTracks?.length) {
        captionTracksForClient = err.captionTracks;
        videoTitleForClient = err.videoTitle || "";
      }
      lastError = err;
    }
  }

  // If we found tracks but couldn't download them, ask the client to download
  if (captionTracksForClient && captionTracksForClient.length > 0) {
    console.log(`Returning ${captionTracksForClient.length} caption tracks for client-side download`);
    return { clientDownloadNeeded: true, captionTracks: captionTracksForClient, videoTitle: videoTitleForClient, lastError: lastError?.message || "Unknown error" };
  }

  // Even if NO tracks were found server-side, generate standard timedtext URLs
  // so the client browser can try (YouTube often blocks cloud IPs but allows browsers)
  const fallbackTitle = videoTitleForClient || await getVideoTitle(videoId);
  console.log(`No tracks found server-side, generating fallback timedtext URLs for client download`);
  const fallbackTracks = [
    { baseUrl: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=pt&fmt=json3`, languageCode: "pt", kind: "manual", name: "Português" },
    { baseUrl: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=pt&kind=asr&fmt=json3`, languageCode: "pt", kind: "asr", name: "Português (auto)" },
    { baseUrl: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=pt-BR&fmt=json3`, languageCode: "pt-BR", kind: "manual", name: "Português BR" },
    { baseUrl: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=pt-BR&kind=asr&fmt=json3`, languageCode: "pt-BR", kind: "asr", name: "Português BR (auto)" },
    { baseUrl: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`, languageCode: "en", kind: "manual", name: "English" },
    { baseUrl: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&kind=asr&fmt=json3`, languageCode: "en", kind: "asr", name: "English (auto)" },
  ];
  return { clientDownloadNeeded: true, captionTracks: fallbackTracks, videoTitle: fallbackTitle, lastError: lastError?.message || "All strategies exhausted" };
}

/** Clean and format raw transcript using Claude — fixes names, punctuation, paragraphs */
async function cleanTranscript(rawText: string): Promise<string> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) {
    console.warn("ANTHROPIC_API_KEY not set, skipping cleanTranscript");
    return rawText;
  }

  const MAX_PUNCT_CHUNK = 30000;
  if (rawText.length <= MAX_PUNCT_CHUNK) {
    return await callCleanAI(ANTHROPIC_API_KEY, rawText);
  }

  // Split into chunks at word boundaries
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

  console.log(`cleanTranscript: splitting into ${chunks.length} chunks`);
  const results: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Cleaning chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)...`);
    results.push(await callCleanAI(ANTHROPIC_API_KEY, chunks[i]));
  }
  return results.join("\n\n");
}

const CLEAN_SYSTEM_PROMPT = `Você recebeu uma transcrição automática de um vídeo do YouTube sobre viagens. O texto tem erros de speech-to-text, nomes próprios errados, falta de pontuação e timestamps misturados.

Sua tarefa: LIMPAR e FORMATAR o texto. Retorne APENAS o texto limpo, sem explicações.

Regras:
- Corrigir nomes próprios de lugares, hotéis, restaurantes, atrações (ex: Torrei Fé → Torre Eiffel, lá do rei → Ladurée, Jard Trileri → Jardin des Tuileries, Mahé → Le Marais, xanze lizê → Champs-Élysées, sacre cór → Sacré-Cœur, mondimarte → Montmartre, muzê dorsê → Musée d'Orsay)
- Adicionar pontuação correta (vírgulas, pontos, interrogações)
- Separar em parágrafos por assunto/tema (quando muda de tópico, novo parágrafo)
- Remover timestamps, marcações de [Música], ruídos e repetições
- Remover frases que são claramente falas de produção do vídeo (tipo "ajusta a câmera", "olha ali", "espera", "corta")
- Manter o conteúdo ORIGINAL, não inventar informação. Apenas limpar e formatar
- Manter em português brasileiro
- Se um trecho for ininteligível, omitir em vez de inventar
- Preservar TODOS os dados úteis: nomes de estabelecimentos, preços, dicas, opiniões, recomendações`;

async function callCleanAI(apiKey: string, text: string): Promise<string> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system: CLEAN_SYSTEM_PROMPT,
        messages: [{ role: "user", content: text }],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      console.warn(`cleanTranscript AI failed: HTTP ${status}`);
      await response.text().catch(() => {});
      return text; // fallback to raw
    }

    const data = await response.json();
    const cleaned = data?.content?.[0]?.text?.trim();
    if (cleaned && cleaned.length > text.length * 0.3) {
      console.log(`✅ cleanTranscript: ${text.length} → ${cleaned.length} chars`);
      return cleaned;
    }
    console.warn(`cleanTranscript: output too short (${cleaned?.length || 0}), using raw`);
    return text;
  } catch (e: any) {
    console.warn(`cleanTranscript error: ${e.message}`);
    return text; // fallback to raw
  }
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

REGRA DE CONFIDENCIALIDADE DE PREÇOS (CRÍTICA):
- Extraia TODOS os preços, valores e custos mencionados no vídeo — eles são dados VALIOSOS para referência interna.
- MARQUE claramente todos os dados de preço com o prefixo "[USO INTERNO]" antes do valor.
- Exemplo: "[USO INTERNO] Passeio de barco: R$ 150 por pessoa" ou "[USO INTERNO] Diária do hotel: US$ 300"
- Esses valores servem EXCLUSIVAMENTE como referência interna para a equipe montar propostas.
- NUNCA serão compartilhados diretamente com clientes pelos agentes de atendimento.

REGRA DE ANONIMIZAÇÃO DE CONCORRENTES E CANAIS EXTERNOS (CRÍTICA):
- REMOVA completamente qualquer menção a agências de viagem concorrentes, sites de reserva ou canais de venda externos.
- Lista de termos que devem ser FILTRADOS/REMOVIDOS do conteúdo extraído:
  Booking, Booking.com, Airbnb, GetYourGuide, Viator, Expedia, TripAdvisor, Trivago, Hotels.com,
  Kayak, Skyscanner, Google Flights, Decolar, CVC, Hurb, 123Milhas, MaxMilhas, Submarino Viagens,
  Hotel Urbano, Trip.com, Agoda, Hostelworld, Priceline, Hotwire, Travelocity, Orbitz,
  Klook, Civitatis, Musement, Flytour, Hotelbeds, Despegar
- Se o vídeo recomenda "reserve pelo Booking" ou "compre no GetYourGuide", SUBSTITUA por:
  "Consulte a NatLeva para reservas" ou simplesmente OMITA a recomendação de canal.
- Se o vídeo menciona um link de afiliado ou código de desconto de terceiros, OMITA completamente.
- Mantenha apenas informações úteis sobre o SERVIÇO/EXPERIÊNCIA em si, não sobre ONDE comprar.

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
- **Faixa de preço**: [USO INTERNO] [valores EXATOS mencionados]
- **Duração sugerida**: [se mencionado]
- **Dicas importantes**: [lista detalhada de dicas REAIS]
- **O que evitar**: [se mencionado]
- **Documentação necessária**: [se mencionado]

## Categoria sugerida
[uma de: destinos, scripts, preços, fornecedores, processos, treinamento, compliance, geral]

IMPORTANTE: Seja EXTREMAMENTE fiel à transcrição. Preços devem SEMPRE ser marcados como [USO INTERNO].`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { url, manual_transcript, diagnose } = (body ?? {}) as {
      url?: string;
      manual_transcript?: string;
      diagnose?: boolean | string | number;
    };

    const diagnosticMode = diagnose === true || diagnose === "true" || diagnose === 1 || diagnose === "1";

    if (diagnosticMode) {
      const runtimeSupadataKey = Deno.env.get("SUPADATA_API_KEY");
      const requestUrlProvided = typeof url === "string" && url.trim().length > 0;
      const diagnostic: Record<string, unknown> = {
        diagnostic: true,
        secret: {
          name: "SUPADATA_API_KEY",
          configuredAtStartup: !!SUPADATA_API_KEY,
          configuredAtRuntime: !!runtimeSupadataKey,
        },
        requestUrlProvided,
      };

      if (requestUrlProvided && runtimeSupadataKey) {
        try {
          const probeResponse = await fetch(
            `https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(url.trim())}`,
            {
              method: "GET",
              headers: { "x-api-key": runtimeSupadataKey },
            },
          );
          await probeResponse.text().catch(() => {});

          diagnostic.probe = {
            attempted: true,
            ok: probeResponse.ok,
            status: probeResponse.status,
            hint: probeResponse.ok
              ? "Credencial aceita pela Supadata"
              : probeResponse.status === 401 || probeResponse.status === 403
                ? "Chave inválida, sem permissão ou nome incorreto"
                : probeResponse.status === 402 || probeResponse.status === 429
                  ? "Possível falta de créditos ou limite atingido"
                  : `Resposta inesperada da Supadata (${probeResponse.status})`,
          };
        } catch (probeError) {
          diagnostic.probe = {
            attempted: true,
            ok: false,
            error: probeError instanceof Error ? probeError.message : String(probeError),
          };
        }
      } else {
        diagnostic.probe = {
          attempted: false,
          reason: !runtimeSupadataKey
            ? "SUPADATA_API_KEY não configurada em runtime"
            : "Envie uma URL junto com diagnose=true para testar a chamada na Supadata",
        };
      }

      console.log("[youtube-transcribe] Diagnostic mode", {
        configuredAtStartup: !!SUPADATA_API_KEY,
        configuredAtRuntime: !!runtimeSupadataKey,
        requestUrlProvided,
      });

      return new Response(JSON.stringify(diagnostic), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    if (manual_transcript && manual_transcript.trim().length > 50) {
      transcript = manual_transcript.trim();
      videoTitle = await getVideoTitle(videoId);
      console.log(`Using manual transcript: ${transcript.length} chars, ${transcript.split(/\s+/).length} words`);
    } else {
      try {
        const result = await fetchYouTubeCaptions(videoId);

        // Check if client needs to download captions
        if ("clientDownloadNeeded" in result) {
          console.log(`Returning CLIENT_DOWNLOAD_NEEDED with ${result.captionTracks.length} tracks`);
          // Prepare caption URLs for the client
          const tracks = result.captionTracks.map((t: any) => ({
            baseUrl: t.baseUrl,
            languageCode: t.languageCode,
            kind: t.kind || "manual",
            name: t.name?.simpleText || t.name || "",
          }));
          return new Response(JSON.stringify({
            error: "CLIENT_DOWNLOAD_NEEDED",
            captionTracks: tracks,
            videoTitle: result.videoTitle,
            videoId,
            message: "O servidor não conseguiu baixar as legendas. O navegador vai tentar automaticamente.",
          }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        transcript = result.transcript;
        videoTitle = result.title;
        isAutoGenerated = result.isAutoGenerated;
        console.log(`Got transcript: ${transcript.length} chars, ${transcript.split(/\s+/).length} words, auto=${isAutoGenerated}`);
      } catch (captionErr: any) {
        console.warn(`All caption strategies failed: ${captionErr.message}`);

        // Firecrawl as absolute last resort — but ONLY accept if substantial content
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

              // Firecrawl returns the whole YouTube page — NOT the transcript.
              // Only use description section, capped aggressively.
              const MAX_FIRECRAWL = 100000;
              const descMarker = rawMarkdown.indexOf("...more");
              const commentsMarker = rawMarkdown.search(/\d+\s*Comment/i);
              if (descMarker > 0 && commentsMarker > descMarker) {
                rawMarkdown = rawMarkdown.slice(0, commentsMarker);
              }
              if (rawMarkdown.length > MAX_FIRECRAWL) {
                rawMarkdown = rawMarkdown.slice(0, MAX_FIRECRAWL);
              }

              // Validate: Firecrawl CANNOT get full transcripts.
              // Only accept if it has meaningful content (description, chapters, etc.)
              const wordCount = rawMarkdown.split(/\s+/).length;
              if (wordCount >= 100) {
                transcript = rawMarkdown;
                console.log(`Firecrawl fallback: ${transcript.length} chars, ${wordCount} words (description only, NOT transcript)`);
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

    // Cap transcript to reasonable size (1M chars)
    const MAX_TRANSCRIPT = 1000000;
    if (transcript.length > MAX_TRANSCRIPT) {
      transcript = transcript.slice(0, MAX_TRANSCRIPT);
    }

    // Save the raw transcript before cleaning
    const rawTranscript = transcript;

    // Clean and format transcript using Claude (replaces old addPunctuation)
    if (transcript.length > 50) {
      console.log("Cleaning transcript with Claude...");
      try {
        transcript = await cleanTranscript(transcript);
      } catch (e: any) {
        console.warn(`cleanTranscript failed, using raw: ${e.message}`);
        // fallback: keep raw transcript
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Process with AI
    let structuredKnowledge = "";
    const MAX_AI_INPUT = 150000;

    if (transcript.length <= MAX_AI_INPUT) {
      structuredKnowledge = await callAI(LOVABLE_API_KEY, SYSTEM_PROMPT,
        `Analise a transcrição COMPLETA deste vídeo do YouTube chamado "${videoTitle}" e extraia TODOS os detalhes específicos mencionados.\n\nTRANSCRIÇÃO COMPLETA:\n${transcript}`
      );
    } else {
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
      videoId, title, transcript, raw_transcript: rawTranscript, structured_knowledge: structuredKnowledge, language: "pt",
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
