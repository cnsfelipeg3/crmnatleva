const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { hotel_name, hotel_city, hotel_country } = await req.json();

    if (!hotel_name) {
      return new Response(JSON.stringify({ success: false, error: "hotel_name é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: "Firecrawl não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: "LOVABLE_API_KEY não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const locationStr = [hotel_city, hotel_country].filter(Boolean).join(", ");

    // Step 1: Search for hotel photos
    const searchQuery = `${hotel_name} ${locationStr} site oficial fotos galeria`;
    console.log("Searching for hotel:", searchQuery);

    const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 5,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    const searchData = await searchResponse.json();
    if (!searchResponse.ok) {
      console.error("Search error:", searchData);
      return new Response(
        JSON.stringify({ success: false, error: searchData.error || "Erro na busca" }),
        { status: searchResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = searchData.data || [];
    if (results.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Nenhum resultado encontrado para este hotel" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Collect images from search results
    const images = collectImages(results);

    // Step 2: Scrape the main hotel URL for more images
    const mainUrl = results[0]?.url;
    if (mainUrl) {
      console.log("Scraping main URL:", mainUrl);
      await scrapeMainUrl(mainUrl, images, FIRECRAWL_API_KEY);
    }

    // Also try to scrape the rooms/accommodation page
    await scrapeRoomsPage(mainUrl, hotel_name, locationStr, images, FIRECRAWL_API_KEY);

    console.log(`Found ${images.urls.length} potential hotel images`);

    if (images.urls.length === 0) {
      return new Response(
        JSON.stringify({ success: true, photos: [], source_url: mainUrl || "", message: "Nenhuma foto encontrada" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Classify with AI - enhanced prompt for room details
    const imageList = images.urls.slice(0, 50).map((img, i) =>
      `${i + 1}. ${img.url.substring(0, 250)} | Alt: "${img.alt}" | Context: "${img.context || ""}"`
    ).join("\n");

    const classifyResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `Você é um classificador especialista de fotos de hotéis. Analise URLs, alt text e contexto para classificar imagens E identificar tipos de quartos com precisão.

CATEGORIAS:
- fachada, lobby, restaurante, piscina, spa, area_comum, vista, bar, praia, outro

CATEGORIAS DE QUARTOS (use o nome REAL do tipo de quarto encontrado na URL/alt/contexto):
- quarto_standard (quartos básicos/standard)
- quarto_superior (suítes superiores)
- quarto_deluxe (quartos deluxe)
- quarto_family (quartos familiares)
- quarto_premium (suítes premium/presidenciais/royalty)

IMPORTANTE para quartos:
1. Identifique o NOME REAL do quarto pela URL e contexto (ex: "Islander Junior Suite", "Rock Family Suite", "Caribbean Sand Suite")
2. Se possível, extraia detalhes como tipo de cama, metragem, vista
3. NÃO generalize todos como "quarto_superior" - diferencie entre standard, deluxe, family, premium etc.

EXCLUA: banners, ícones, logos, mapas, elementos UI, imagens sociais, imagens muito pequenas.`
          },
          {
            role: "user",
            content: `Hotel: ${hotel_name} em ${locationStr}\n\nImagens:\n${imageList}\n\nClassifique cada foto relevante com categoria correta e, para quartos, identifique o nome real do tipo de quarto.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_hotel_photos",
              description: "Classifica fotos de hotel por categoria com detalhes de quartos",
              parameters: {
                type: "object",
                properties: {
                  classified: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        index: { type: "number", description: "Índice da imagem (1-based)" },
                        category: {
                          type: "string",
                          enum: ["fachada", "lobby", "quarto_standard", "quarto_superior", "quarto_deluxe", "quarto_family", "quarto_premium", "restaurante", "piscina", "spa", "area_comum", "vista", "bar", "praia", "outro"]
                        },
                        confidence: { type: "number", description: "Confiança de 0 a 1" },
                        room_name: { type: "string", description: "Nome real do tipo de quarto (ex: 'Islander Junior Suite', 'Rock Family Suite'). Null se não for quarto." },
                        room_details: {
                          type: "object",
                          description: "Detalhes do quarto se identificáveis pela URL/contexto. Null se não disponível.",
                          properties: {
                            size_sqm: { type: "number", description: "Tamanho em m² se disponível" },
                            max_guests: { type: "number", description: "Capacidade máxima" },
                            bed_type: { type: "string", description: "Tipo de cama (ex: 'King', '2 Camas de Casal', 'Queen')" },
                            amenities: { type: "array", items: { type: "string" }, description: "Amenidades visíveis/inferíveis" },
                            view: { type: "string", description: "Tipo de vista se identificável" }
                          }
                        }
                      },
                      required: ["index", "category", "confidence"]
                    }
                  }
                },
                required: ["classified"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "classify_hotel_photos" } }
      }),
    });

    if (!classifyResponse.ok) {
      if (classifyResponse.status === 429) {
        return new Response(JSON.stringify({ success: false, error: "Limite de requisições excedido" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (classifyResponse.status === 402) {
        return new Response(JSON.stringify({ success: false, error: "Créditos insuficientes" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const photos = images.urls.slice(0, 20).map(img => ({
        url: img.url, alt: img.alt, category: "outro", confidence: 0.5,
      }));
      return new Response(
        JSON.stringify({ success: true, photos, source_url: mainUrl || "", classified: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const classifyData = await classifyResponse.json();

    let classified: any[] = [];
    try {
      const toolCall = classifyData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        const args = JSON.parse(toolCall.function.arguments);
        classified = args.classified || [];
      }
    } catch (e) {
      console.error("Failed to parse classification:", e);
    }

    const photos = classified
      .filter(c => c.confidence >= 0.4 && c.index >= 1 && c.index <= images.urls.length)
      .map(c => {
        const img = images.urls[c.index - 1];
        if (!img) return null;
        return {
          url: img.url,
          alt: img.alt,
          category: c.category,
          confidence: c.confidence,
          room_name: c.room_name || null,
          room_details: c.room_details || null,
        };
      })
      .filter(Boolean);

    console.log(`Classified ${photos.length} hotel photos`);

    return new Response(
      JSON.stringify({ success: true, photos, source_url: mainUrl || "", classified: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// --- Helper types & functions ---

interface ImageCollection {
  urls: { url: string; alt: string; source: string; context: string }[];
  seen: Set<string>;
}

function collectImages(results: any[]): ImageCollection {
  const collection: ImageCollection = { urls: [], seen: new Set() };

  for (const result of results) {
    const markdown = result.markdown || "";
    const sourceUrl = result.url || "";

    // Extract markdown images
    const mdImgRegex = /!\[([^\]]*)\]\(([^)]+)\)/gi;
    let match;
    while ((match = mdImgRegex.exec(markdown)) !== null) {
      addImage(collection, match[2]?.trim(), match[1] || "", sourceUrl, "");
    }

    // Extract raw image URLs
    const urlRegex = /https?:\/\/[^\s\)>"']+\.(?:jpg|jpeg|png|webp)(?:\?[^\s\)>"']*)?/gi;
    while ((match = urlRegex.exec(markdown)) !== null) {
      addImage(collection, match[0], "", sourceUrl, "");
    }
  }

  return collection;
}

function addImage(collection: ImageCollection, rawUrl: string, alt: string, sourceUrl: string, context: string) {
  if (!rawUrl || collection.seen.has(rawUrl)) return;
  if (!isRelevantImage(rawUrl)) return;
  collection.seen.add(rawUrl);
  collection.urls.push({ url: makeAbsolute(rawUrl, sourceUrl), alt, source: sourceUrl, context });
}

async function scrapeMainUrl(mainUrl: string, collection: ImageCollection, apiKey: string) {
  try {
    const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: mainUrl, formats: ["html"], onlyMainContent: false, waitFor: 3000 }),
    });

    if (!resp.ok) return;
    const data = await resp.json();
    const html = data.data?.html || data.html || "";
    extractImagesFromHtml(html, mainUrl, collection);
  } catch (e) {
    console.error("Main URL scrape failed:", e);
  }
}

async function scrapeRoomsPage(mainUrl: string | undefined, hotelName: string, locationStr: string, collection: ImageCollection, apiKey: string) {
  if (!mainUrl) return;

  // Try common room page patterns
  const roomPaths = ["/rooms", "/quartos", "/habitaciones", "/accommodations", "/suites", "/rooms-suites"];
  const base = new URL(mainUrl);

  for (const path of roomPaths) {
    const roomUrl = base.origin + path;
    try {
      const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: roomUrl, formats: ["html", "markdown"], onlyMainContent: true, waitFor: 3000 }),
      });

      if (!resp.ok) continue;
      const data = await resp.json();
      const html = data.data?.html || data.html || "";
      const markdown = data.data?.markdown || data.markdown || "";

      if (html.length > 500) {
        console.log(`Found rooms page at ${roomUrl}`);
        // Extract images with surrounding text context for room identification
        extractImagesWithContext(html, roomUrl, collection);
        extractImagesFromHtml(html, roomUrl, collection);
        break; // Found a valid rooms page
      }
    } catch {
      continue;
    }
  }
}

function extractImagesFromHtml(html: string, sourceUrl: string, collection: ImageCollection) {
  const attrPatterns = [
    /(?:src|data-src|data-lazy-src|data-original|data-bg|data-image|content)\s*=\s*["']([^"']+)["']/gi,
    /srcset\s*=\s*["']([^"']+)["']/gi,
  ];

  for (const regex of attrPatterns) {
    let m;
    while ((m = regex.exec(html)) !== null) {
      const raw = m[1];
      const urls = raw.includes(",") && regex === attrPatterns[1]
        ? raw.split(",").map(s => s.trim().split(/\s+/)[0])
        : [raw];
      for (const url of urls) {
        addImage(collection, url, "", sourceUrl, "");
      }
    }
  }

  // Extract alt text
  const imgWithAlt = /<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']+)["']/gi;
  let m;
  while ((m = imgWithAlt.exec(html)) !== null) {
    const existing = collection.urls.find(i => i.url.includes(m[1]) || m[1].includes(i.url));
    if (existing && !existing.alt) existing.alt = m[2];
  }
}

function extractImagesWithContext(html: string, sourceUrl: string, collection: ImageCollection) {
  // Extract images inside elements that contain room-related text
  const sectionRegex = /<(?:div|section|article)[^>]*>[\s\S]*?<\/(?:div|section|article)>/gi;
  const roomKeywords = /suite|room|quarto|habitaci|deluxe|standard|premium|family|familiar|king|queen|double|twin/i;

  let match;
  while ((match = sectionRegex.exec(html)) !== null) {
    const section = match[0];
    if (!roomKeywords.test(section)) continue;

    // Extract text context
    const textContent = section.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().substring(0, 200);

    // Extract images from this section
    const imgRegex = /(?:src|data-src)\s*=\s*["']([^"']+)["']/gi;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(section)) !== null) {
      const url = imgMatch[1];
      if (isRelevantImage(url)) {
        const existing = collection.urls.find(i => i.url === makeAbsolute(url, sourceUrl));
        if (existing) {
          existing.context = textContent;
        } else {
          addImage(collection, url, "", sourceUrl, textContent);
        }
      }
    }
  }
}

function isRelevantImage(url: string): boolean {
  if (!url || url.length < 10) return false;
  const lower = url.toLowerCase();

  if (lower.startsWith("data:")) return false;
  if (lower.endsWith(".svg") || lower.endsWith(".gif") || lower.endsWith(".ico")) return false;
  if (lower.includes("logo") && lower.includes("svg")) return false;
  if (lower.includes("tracking") || lower.includes("pixel") || lower.includes("1x1")) return false;
  if (lower.includes("sprite") || lower.includes("spacer")) return false;
  if (lower.includes("facebook.com") || lower.includes("twitter.com") || lower.includes("instagram.com")) return false;
  if (lower.includes("google-analytics") || lower.includes("doubleclick")) return false;
  if (lower.includes("badge") || (lower.includes("flag") && lower.includes("16"))) return false;

  if (/\.(jpg|jpeg|png|webp|avif)(\?|$|#)/i.test(url)) return true;
  if (lower.includes("ctfassets") || lower.includes("cloudinary")) return true;
  if (lower.includes("imgix") || lower.includes("akamai")) return true;
  if (lower.includes("cloudfront") || lower.includes("amazonaws")) return true;
  if (lower.includes("hilton.com") && lower.includes("image")) return true;
  if (lower.includes("marriott.com") && lower.includes("image")) return true;
  if (lower.includes("/photo") || lower.includes("/gallery") || lower.includes("/image")) return true;
  if (lower.includes("bstatic.com")) return true;
  if (lower.includes("trvl-media") || lower.includes("expedia")) return true;
  if (lower.includes("w=") && lower.includes("h=")) return true;
  if (lower.includes("width=") || lower.includes("height=")) return true;
  if (lower.includes("resize") || lower.includes("crop")) return true;
  if (/\/\w+[-_]\d{3,4}x\d{3,4}/i.test(url)) return true;

  return false;
}

function makeAbsolute(url: string, baseUrl: string): string {
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return "https:" + url;
  try {
    const base = new URL(baseUrl);
    if (url.startsWith("/")) return base.origin + url;
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}
