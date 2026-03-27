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

// Public InnerTube API key (used by YouTube's own web player)
const INNERTUBE_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

// ─── InnerTube client configs ───
const INNERTUBE_CLIENTS = [
  {
    name: "WEB_CREATOR",
    url: `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_API_KEY}&prettyPrint=false`,
    body: (videoId: string) => ({
      context: {
        client: {
          hl: "pt", gl: "BR",
          clientName: "WEB_CREATOR",
          clientVersion: "1.20250320.01.00",
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
      },
      videoId,
    }),
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Origin": "https://studio.youtube.com",
      "Referer": "https://studio.youtube.com/",
      "X-Youtube-Client-Name": "62",
      "X-Youtube-Client-Version": "1.20250320.01.00",
    },
  },
  {
    name: "ANDROID_TESTSUITE",
    url: `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_API_KEY}&prettyPrint=false`,
    body: (videoId: string) => ({
      context: {
        client: {
          hl: "pt", gl: "BR",
          clientName: "ANDROID_TESTSUITE",
          clientVersion: "1.9",
          androidSdkVersion: 34,
        },
      },
      videoId,
    }),
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "com.google.android.youtube/19.29.37 (Linux; U; Android 14) gzip",
    },
  },
  {
    name: "MWEB",
    url: `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_API_KEY}&prettyPrint=false`,
    body: (videoId: string) => ({
      context: {
        client: {
          hl: "pt", gl: "BR",
          clientName: "MWEB",
          clientVersion: "2.20250320.01.00",
          userAgent: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        },
      },
      videoId,
    }),
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "Origin": "https://m.youtube.com",
      "Referer": "https://m.youtube.com/",
    },
  },
  {
    name: "IOS",
    url: `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_API_KEY}&prettyPrint=false`,
    body: (videoId: string) => ({
      context: {
        client: {
          hl: "pt", gl: "BR",
          clientName: "IOS",
          clientVersion: "19.29.1",
          deviceMake: "Apple",
          deviceModel: "iPhone16,2",
          osName: "iPhone",
          osVersion: "17.5.1.21F90",
        },
      },
      videoId,
    }),
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)",
    },
  },
  {
    name: "TV_EMBEDDED",
    url: `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_API_KEY}&prettyPrint=false`,
    body: (videoId: string) => ({
      context: {
        client: {
          hl: "pt", gl: "BR",
          clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
          clientVersion: "2.0",
        },
        thirdParty: { embedUrl: "https://www.google.com" },
      },
      videoId,
    }),
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (SMART-TV; Linux; Tizen 6.5)",
    },
  },
  {
    name: "WEB",
    url: `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_API_KEY}&prettyPrint=false`,
    body: (videoId: string) => ({
      context: {
        client: {
          hl: "pt", gl: "BR",
          clientName: "WEB",
          clientVersion: "2.20250320.01.00",
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
      },
      videoId,
    }),
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Origin": "https://www.youtube.com",
      "Referer": "https://www.youtube.com/",
      "X-Youtube-Client-Name": "1",
      "X-Youtube-Client-Version": "2.20250320.01.00",
    },
  },
];

function parseTimedTextEvents(events: any[]): string {
  const segments: string[] = [];
  for (const event of events) {
    if (event.segs) {
      let line = "";
      for (const seg of event.segs) {
        if (seg.utf8 && seg.utf8.trim() !== "\n" && seg.utf8.trim() !== "") {
          line += seg.utf8;
        }
      }
      if (line.trim()) segments.push(line.trim());
    }
  }
  return segments.join(" ").replace(/\s+/g, " ").trim();
}

async function fetchYouTubeCaptions(videoId: string): Promise<{ transcript: string; title: string; isAutoGenerated: boolean }> {
  let captionTracks: any[] | null = null;
  let rawTitle = `Video ${videoId}`;

  // Try all InnerTube clients
  for (const client of INNERTUBE_CLIENTS) {
    try {
      console.log(`Trying InnerTube ${client.name}...`);
      const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
        method: "POST",
        headers: client.headers,
        body: JSON.stringify(client.body(videoId)),
      });

      if (res.ok) {
        const playerData = await res.json();
        rawTitle = playerData?.videoDetails?.title || rawTitle;
        const tracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (tracks && tracks.length > 0) {
          captionTracks = tracks;
          console.log(`✓ ${client.name}: found ${tracks.length} caption tracks`);
          break;
        }
        const status = playerData?.playabilityStatus?.status;
        console.log(`${client.name}: no captions (playability=${status})`);
      } else {
        console.warn(`${client.name}: HTTP ${res.status}`);
        await res.text().catch(() => {});
      }
    } catch (e) {
      console.warn(`${client.name} error: ${e}`);
    }
  }

  // Method: Direct timedtext API (works independently of InnerTube)
  if (!captionTracks || captionTracks.length === 0) {
    console.log("Trying direct timedtext API...");
    for (const lang of ["pt", "pt-BR", "en", "es"]) {
      for (const kind of ["", "asr"]) {
        try {
          const params = new URLSearchParams({ v: videoId, lang, fmt: "json3" });
          if (kind) params.set("kind", kind);
          const ttUrl = `https://www.youtube.com/api/timedtext?${params}`;
          const ttRes = await fetch(ttUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          });
          if (ttRes.ok) {
            const ttText = await ttRes.text();
            if (ttText.length > 50 && ttText.includes("events")) {
              const ttJson = JSON.parse(ttText);
              const transcript = parseTimedTextEvents(ttJson.events || []);
              if (transcript.length > 20) {
                console.log(`✓ timedtext API (${lang}/${kind || "manual"}): ${transcript.length} chars`);
                return { transcript, title: rawTitle, isAutoGenerated: kind === "asr" };
              }
            }
          } else {
            await ttRes.text().catch(() => {});
          }
        } catch { /* next */ }
      }
    }
  }

  // Method: Page HTML scraping with multiple cookie strategies
  if (!captionTracks || captionTracks.length === 0) {
    console.log("Trying page HTML scrape...");
    const cookies = [
      "CONSENT=PENDING+987; SOCS=CAESEwgDEgk2MTcyNTcyNjQaAmVuIAEaBgiA_LyaBg",
      "CONSENT=YES+yt.477269918+FP+XXXX; SOCS=CAISEwgDEgk0OTc4ODE2NTkaAmVuIAEaBgiA_LyaBg",
    ];
    for (const cookie of cookies) {
      try {
        const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
            "Cookie": cookie,
          },
        });
        if (res.ok) {
          const html = await res.text();
          if (html.includes("captionTracks")) {
            const marker = '"captionTracks":';
            const idx = html.indexOf(marker);
            if (idx !== -1) {
              const arrStart = html.indexOf("[", idx);
              if (arrStart !== -1 && arrStart - idx - marker.length < 5) {
                for (let end = arrStart + 10; end < Math.min(arrStart + 10000, html.length); end++) {
                  if (html[end] === "]") {
                    try {
                      captionTracks = JSON.parse(html.slice(arrStart, end + 1));
                      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
                      if (titleMatch) rawTitle = titleMatch[1].replace(/ - YouTube$/, "").trim();
                      console.log(`✓ HTML scrape: found ${captionTracks!.length} tracks`);
                      break;
                    } catch { /* keep trying */ }
                  }
                }
                if (captionTracks && captionTracks.length > 0) break;
              }
            }
          }
        } else {
          await res.text().catch(() => {});
        }
      } catch {}
    }
  }

  if (!captionTracks || captionTracks.length === 0) {
    throw new Error("NO_CAPTIONS_FOUND");
  }

  // Priority: manual PT > manual any > auto PT > auto any
  const preferred =
    captionTracks.find((t: any) => t.languageCode === "pt" && t.kind !== "asr") ||
    captionTracks.find((t: any) => t.languageCode?.startsWith("pt") && t.kind !== "asr") ||
    captionTracks.find((t: any) => t.kind !== "asr") ||
    captionTracks.find((t: any) => t.languageCode === "pt") ||
    captionTracks.find((t: any) => t.languageCode?.startsWith("pt")) ||
    captionTracks[0];

  const isAutoGenerated = preferred.kind === "asr";
  let captionUrl = preferred.baseUrl || "";
  if (!captionUrl.includes("fmt=")) captionUrl += "&fmt=json3";

  console.log(`Fetching captions: lang=${preferred.languageCode}, kind=${preferred.kind || "manual"}`);

  const captionRes = await fetch(captionUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
  });
  if (!captionRes.ok) throw new Error(`Caption fetch failed: ${captionRes.status}`);

  const captionText = await captionRes.text();
  let transcript = "";

  // Try JSON
  if (captionUrl.includes("json3") || captionText.trimStart().startsWith("{")) {
    try {
      const json = JSON.parse(captionText);
      transcript = parseTimedTextEvents(json.events || []);
    } catch {
      console.warn("JSON parse failed, trying XML");
    }
  }

  // Fallback XML
  if (!transcript) {
    const segments: string[] = [];
    const matches = captionText.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g);
    for (const m of matches) {
      let text = m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n/g, " ").trim();
      if (text) segments.push(text);
    }
    transcript = segments.join(" ").replace(/\s+/g, " ").trim();
  }

  if (!transcript || transcript.length < 20) throw new Error("EMPTY_TRANSCRIPT");

  return { transcript, title: rawTitle, isAutoGenerated };
}

async function addPunctuation(apiKey: string, rawText: string): Promise<string> {
  const MAX_PUNCT_CHUNK = 20000;
  if (rawText.length <= MAX_PUNCT_CHUNK) return await callPunctuationAI(apiKey, rawText);

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

  console.log(`Punctuation: ${chunks.length} chunks`);
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
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: `Você é um especialista em transcrição de vídeos em português brasileiro.

Sua ÚNICA tarefa é adicionar pontuação, letras maiúsculas e quebras de parágrafo ao texto bruto de legendas automáticas do YouTube.

REGRAS ABSOLUTAS:
- NÃO altere, remova, adicione ou substitua NENHUMA palavra.
- NÃO corrija gírias, regionalismos ou informalidades.
- NÃO traduza palavras em outros idiomas.
- NÃO adicione títulos, cabeçalhos, marcadores ou formatação markdown.
- Adicione: vírgulas, pontos finais, pontos de interrogação, exclamação, dois-pontos, reticências.
- Adicione letras maiúsculas no início de frases e em nomes próprios.
- Quebre em parágrafos a cada mudança de assunto ou a cada 3-5 frases.
- Retorne APENAS o texto pontuado, sem comentários.` },
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
        console.warn(`All direct caption methods failed: ${captionErr.message}`);

        // Fallback 1: yt.lemnoslife.com (reliable free YouTube data API)
        if (!transcript || transcript.length < 50) {
          try {
            console.log("Trying yt.lemnoslife.com captions API...");
            const lemnosRes = await fetch(`https://yt.lemnoslife.com/captions?v=${videoId}`);
            if (lemnosRes.ok) {
              const lemnosData = await lemnosRes.json();
              // Find best caption track
              const tracks = lemnosData?.captions || lemnosData?.captionTracks || [];
              if (Array.isArray(tracks) && tracks.length > 0) {
                const best = tracks.find((t: any) => t.languageCode === "pt" && t.kind !== "asr") ||
                  tracks.find((t: any) => t.languageCode?.startsWith("pt")) ||
                  tracks.find((t: any) => t.kind !== "asr") ||
                  tracks[0];
                const subtitleUrl = best?.baseUrl || best?.url || "";
                if (subtitleUrl) {
                  const subRes = await fetch(subtitleUrl + (subtitleUrl.includes("?") ? "&" : "?") + "fmt=json3");
                  if (subRes.ok) {
                    const subText = await subRes.text();
                    try {
                      const subJson = JSON.parse(subText);
                      transcript = parseTimedTextEvents(subJson.events || []);
                      isAutoGenerated = best.kind === "asr";
                      console.log(`✓ Lemnoslife: ${transcript.length} chars`);
                    } catch {
                      // Try XML
                      const segs: string[] = [];
                      for (const m of subText.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)) {
                        const t = m[1].replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\n/g," ").trim();
                        if (t) segs.push(t);
                      }
                      transcript = segs.join(" ").replace(/\s+/g," ").trim();
                      isAutoGenerated = true;
                      console.log(`✓ Lemnoslife (XML): ${transcript.length} chars`);
                    }
                  }
                }
              }
            } else {
              console.warn(`Lemnoslife: HTTP ${lemnosRes.status}`);
              await lemnosRes.text().catch(() => {});
            }
          } catch (e: any) {
            console.warn(`Lemnoslife error: ${e.message}`);
          }
        }

        // Fallback 2: Tactiq transcript API
        if (!transcript || transcript.length < 50) {
          try {
            console.log("Trying Tactiq transcript API...");
            const tactiqRes = await fetch(`https://tactiq-apps-prod.tactiq.io/transcript?videoId=${videoId}&langCode=pt`, {
              headers: { "Accept": "application/json" },
            });
            if (tactiqRes.ok) {
              const tactiqData = await tactiqRes.json();
              if (tactiqData?.captions && Array.isArray(tactiqData.captions)) {
                transcript = tactiqData.captions.map((c: any) => c.text || "").join(" ").replace(/\s+/g, " ").trim();
                isAutoGenerated = true;
                console.log(`✓ Tactiq: ${transcript.length} chars`);
              }
            } else {
              console.warn(`Tactiq: HTTP ${tactiqRes.status}`);
              await tactiqRes.text().catch(() => {});
            }
          } catch (e: any) {
            console.warn(`Tactiq error: ${e.message}`);
          }
        }

        // Fallback 3: Kome.ai transcript API
        if (!transcript || transcript.length < 50) {
          try {
            console.log("Trying Kome.ai transcript API...");
            const komeRes = await fetch("https://api.kome.ai/api/tools/youtube-transcripts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ video_id: videoId, format: true }),
            });
            if (komeRes.ok) {
              const komeData = await komeRes.json();
              const komeText = komeData?.transcript || komeData?.text || "";
              if (typeof komeText === "string" && komeText.length > 20) {
                transcript = komeText.replace(/\s+/g, " ").trim();
                isAutoGenerated = true;
                console.log(`✓ Kome.ai: ${transcript.length} chars`);
              }
            } else {
              console.warn(`Kome.ai: HTTP ${komeRes.status}`);
              await komeRes.text().catch(() => {});
            }
          } catch (e: any) {
            console.warn(`Kome.ai error: ${e.message}`);
          }
        }

        // Fallback 4: Firecrawl 
        if (!transcript || transcript.length < 50) {
          const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
          if (FIRECRAWL_API_KEY) {
            try {
              console.log("Trying Firecrawl...");
              const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  url: `https://www.youtube.com/watch?v=${videoId}`,
                  formats: ["markdown"],
                  timeout: 15000,
                }),
              });
              if (scrapeRes.ok) {
                const scrapeData = await scrapeRes.json();
                transcript = scrapeData?.data?.markdown || "";
                videoTitle = scrapeData?.data?.metadata?.title || videoTitle;
                console.log(`Firecrawl got ${transcript.length} chars`);
              } else {
                console.warn(`Firecrawl: ${scrapeRes.status}`);
                await scrapeRes.text().catch(() => {});
              }
            } catch (e: any) {
              console.warn(`Firecrawl error: ${e.message}`);
            }
          }
        }

        if (!videoTitle) videoTitle = await getVideoTitle(videoId);

        if (!transcript || transcript.length < 50) {
          return new Response(JSON.stringify({
            error: "TRANSCRIPT_UNAVAILABLE",
            message: "Não foi possível extrair legendas automaticamente. O YouTube bloqueia servidores em nuvem. Use a opção de colar a transcrição manualmente.",
            videoId,
            videoTitle,
          }), {
            status: 422,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (isAutoGenerated && transcript.length > 50) {
      console.log("Adding punctuation to auto-generated captions...");
      transcript = await addPunctuation(LOVABLE_API_KEY, transcript);
    }

    // Process with AI
    let structuredKnowledge = "";
    const MAX_CHUNK = 25000;

    if (transcript.length <= MAX_CHUNK) {
      structuredKnowledge = await callAI(LOVABLE_API_KEY, SYSTEM_PROMPT,
        `Analise a transcrição COMPLETA deste vídeo do YouTube chamado "${videoTitle}" e extraia TODOS os detalhes específicos mencionados.\n\nTRANSCRIÇÃO COMPLETA:\n${transcript}`
      );
    } else {
      console.log(`Long transcript (${transcript.length} chars), chunking...`);
      const chunks: string[] = [];
      for (let i = 0; i < transcript.length; i += MAX_CHUNK) {
        chunks.push(transcript.slice(i, i + MAX_CHUNK));
      }

      const chunkSummaries: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        console.log(`Processing chunk ${i + 1}/${chunks.length}...`);
        const chunkResult = await callAI(LOVABLE_API_KEY,
          `Você é um especialista em extrair informações detalhadas de transcrições de vídeos de viagem. Extraia TODAS as informações específicas: nomes de lugares, preços, dicas, recomendações, horários, experiências. Seja extremamente detalhado.`,
          `PARTE ${i + 1} de ${chunks.length} do vídeo "${videoTitle}". Extraia TODOS os detalhes.\n\nTRECHO:\n${chunks[i]}`
        );
        chunkSummaries.push(`--- PARTE ${i + 1} ---\n${chunkResult}`);
      }

      const combined = chunkSummaries.join("\n\n");
      const summaryInput = combined.length > 30000 ? combined.slice(0, 30000) + "\n\n[... truncado]" : combined;

      structuredKnowledge = await callAI(LOVABLE_API_KEY, SYSTEM_PROMPT,
        `Organize as notas de ${chunks.length} partes do vídeo "${videoTitle}" em um documento ÚNICO e completo. Mantenha TODOS os detalhes.\n\nNOTAS:\n${summaryInput}`
      );
    }

    if (!structuredKnowledge || structuredKnowledge.length < 50) {
      return new Response(JSON.stringify({
        error: "Não foi possível extrair conhecimento deste vídeo.",
        videoId,
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
