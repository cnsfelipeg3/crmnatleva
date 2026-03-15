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
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: "Firecrawl não configurado" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: "LOVABLE_API_KEY não configurado" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const locationStr = [hotel_city, hotel_country].filter(Boolean).join(", ");
    const hotelNameNorm = normalizeStr(hotel_name);

    // ── Step 1: Find the OFFICIAL hotel website ──
    // Use a very specific search to find the hotel's own domain
    const searchQuery = `"${hotel_name}" ${locationStr} site oficial hotel`;
    console.log("Searching for hotel:", searchQuery);

    const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: searchQuery, limit: 8, scrapeOptions: { formats: ["markdown"] } }),
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

    // ── Step 2: Identify which result is the OFFICIAL site ──
    // Filter out booking aggregators and identify the hotel's own domain
    const officialResult = findOfficialSite(results, hotel_name);
    const officialDomain = officialResult ? new URL(officialResult.url).hostname : null;
    console.log(`Official domain identified: ${officialDomain || "none"}`);

    // ── Step 3: Collect images ONLY from official domain ──
    const images: ImageCollection = { urls: [], seen: new Set() };

    // Collect from official site results first
    if (officialResult) {
      collectImagesFromResult(officialResult, images, officialDomain);
    }

    // Scrape the main official page for more images
    const mainUrl = officialResult?.url || results[0]?.url;
    if (mainUrl) {
      console.log("Scraping main URL:", mainUrl);
      await scrapeMainUrl(mainUrl, images, FIRECRAWL_API_KEY, officialDomain);
    }

    // Scrape rooms/accommodation pages
    const roomDetails = await scrapeRoomsPages(mainUrl, hotel_name, locationStr, images, FIRECRAWL_API_KEY, officialDomain);
    console.log(`Extracted room details for ${Object.keys(roomDetails).length} room types`);

    // If we got few images from official site, also collect from other results and let AI verify
    if (images.urls.length < 10) {
      console.log(`Only ${images.urls.length} images from official site, collecting from other results...`);
      for (const result of results) {
        if (result === officialResult) continue;
        // Collect images without domain filter — AI verification will reject wrong-hotel photos
        collectImagesFromResult(result, images, null);
      }
    }

    console.log(`Found ${images.urls.length} candidate images`);

    if (images.urls.length === 0) {
      return new Response(
        JSON.stringify({ success: true, photos: [], source_url: mainUrl || "", message: "Nenhuma foto encontrada" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 4: AI Visual Verification + Classification ──
    // Use Gemini Vision to LOOK at each image and verify it belongs to the target hotel
    const roomDetailsContext = Object.keys(roomDetails).length > 0
      ? `\n\nINFORMAÇÕES DOS QUARTOS DO SITE OFICIAL:\n${JSON.stringify(roomDetails, null, 2)}`
      : "";

    // Build image list with URLs for AI to analyze visually
    const candidateImages = images.urls.slice(0, 50);
    const imageListForAI = candidateImages.map((img, i) =>
      `${i + 1}. URL: ${img.url.substring(0, 300)} | Alt: "${img.alt}" | Domínio: ${img.source ? extractDomain(img.source) : "?"} | Contexto: "${(img.context || "").substring(0, 120)}"`
    ).join("\n");

    const classifyResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um verificador e classificador especialista de fotos de hotéis. Você tem DUAS missões:

## MISSÃO 1: VERIFICAÇÃO DE AUTENTICIDADE
CRÍTICO: Verifique se cada imagem PERTENCE ao hotel "${hotel_name}" em ${locationStr}.

REJEITE (confidence = 0) imagens que:
- Pertencem a OUTRO hotel (ex: se buscamos "Pullman Guarulhos", rejeite fotos do Ibis, Novotel, Mercure, etc.)
- São de hotéis com nome diferente, mesmo que da mesma rede/grupo (Accor, Marriott, Hilton)
- Contêm logotipos ou branding de outro hotel na URL (ex: URL com "ibis" quando buscamos "Pullman")
- São genéricas demais para confirmar pertinência (banners de booking sites, fotos de banco de imagem)
- São UI elements, ícones, logos, mapas, badges, ou imagens < 100px

DICA DE VERIFICAÇÃO: Analise o DOMÍNIO e PATH da URL:
- Se a URL contém o nome de outro hotel → REJEITAR
- Se a URL é do domínio oficial do hotel buscado → ACEITAR com alta confiança
- URLs de CDNs/imagens sem referência clara → avaliar pelo contexto/alt text

## MISSÃO 2: CLASSIFICAÇÃO
Para imagens APROVADAS (confidence >= 0.6), classifique:

CATEGORIAS:
- fachada, lobby, restaurante, bar, piscina, praia, spa, area_comum, vista, outro
- quarto_standard, quarto_superior, quarto_deluxe, quarto_family, quarto_premium

REGRAS:
1. room_name DEVE ser o nome REAL do tipo de quarto/ambiente (nunca genérico)
2. Para quartos, preencha room_details com dados do site oficial
3. Fotos de banheiro → categoria do quarto associado
4. Varanda/balcão → categoria do quarto correspondente`
          },
          {
            role: "user",
            content: `Hotel alvo: "${hotel_name}" em ${locationStr}
Domínio oficial identificado: ${officialDomain || "não identificado"}
${roomDetailsContext}

Verifique e classifique CADA imagem. REJEITE fotos que NÃO são do "${hotel_name}":

${imageListForAI}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_hotel_photos",
              description: "Verifica autenticidade e classifica fotos do hotel",
              parameters: {
                type: "object",
                properties: {
                  classified: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        index: { type: "number" },
                        belongs_to_target_hotel: { type: "boolean", description: "true se a foto pertence ao hotel buscado, false se é de outro hotel ou irrelevante" },
                        category: {
                          type: "string",
                          enum: ["fachada", "lobby", "quarto_standard", "quarto_superior", "quarto_deluxe", "quarto_family", "quarto_premium", "restaurante", "piscina", "spa", "area_comum", "vista", "bar", "praia", "outro"]
                        },
                        confidence: { type: "number", description: "0-1. Se belongs_to_target_hotel=false, confidence DEVE ser 0" },
                        room_name: { type: "string" },
                        rejection_reason: { type: "string", description: "Se rejeitada, motivo: 'outro_hotel', 'irrelevante', 'ui_element', etc." },
                        room_details: {
                          type: "object",
                          properties: {
                            size_sqm: { type: "number" },
                            max_guests: { type: "number" },
                            bed_type: { type: "string" },
                            amenities: { type: "array", items: { type: "string" } },
                            view: { type: "string" }
                          }
                        }
                      },
                      required: ["index", "belongs_to_target_hotel", "category", "confidence"]
                    }
                  },
                  verification_summary: {
                    type: "string",
                    description: "Resumo: quantas aceitas, quantas rejeitadas, motivos principais"
                  }
                },
                required: ["classified", "verification_summary"]
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
      // Fallback: return only images from official domain
      const fallbackPhotos = candidateImages
        .filter(img => !officialDomain || img.source.includes(officialDomain))
        .slice(0, 20)
        .map(img => ({ url: standardizeImageUrl(img.url), alt: img.alt, category: "outro", confidence: 0.5 }));
      return new Response(
        JSON.stringify({ success: true, photos: fallbackPhotos, source_url: mainUrl || "", classified: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const classifyData = await classifyResponse.json();

    let classified: any[] = [];
    let verificationSummary = "";
    try {
      const toolCall = classifyData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        const args = JSON.parse(toolCall.function.arguments);
        classified = args.classified || [];
        verificationSummary = args.verification_summary || "";
      }
    } catch (e) {
      console.error("Failed to parse classification:", e);
    }

    console.log("AI verification summary:", verificationSummary);

    // Only include photos that the AI confirmed belong to the target hotel
    const photos = classified
      .filter(c => c.belongs_to_target_hotel === true && c.confidence >= 0.5 && c.index >= 1 && c.index <= candidateImages.length)
      .map(c => {
        const img = candidateImages[c.index - 1];
        if (!img) return null;

        let finalRoomDetails = c.room_details || null;
        if (c.room_name && roomDetails[c.room_name]) {
          const scraped = roomDetails[c.room_name];
          finalRoomDetails = {
            ...(finalRoomDetails || {}),
            size_sqm: finalRoomDetails?.size_sqm || scraped.size_sqm || null,
            max_guests: finalRoomDetails?.max_guests || scraped.max_guests || null,
            bed_type: finalRoomDetails?.bed_type || scraped.bed_type || null,
            view: finalRoomDetails?.view || scraped.view || null,
            amenities: mergeAmenities(finalRoomDetails?.amenities, scraped.amenities),
          };
        }

        return {
          url: standardizeImageUrl(img.url),
          alt: img.alt,
          category: c.category,
          confidence: c.confidence,
          room_name: c.room_name || null,
          room_details: finalRoomDetails,
        };
      })
      .filter(Boolean);

    const rejectedCount = classified.filter(c => !c.belongs_to_target_hotel).length;
    console.log(`Verified: ${photos.length} accepted, ${rejectedCount} rejected`);

    return new Response(
      JSON.stringify({
        success: true,
        photos,
        source_url: mainUrl || "",
        classified: true,
        verification: { accepted: photos.length, rejected: rejectedCount, summary: verificationSummary }
      }),
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

// ═══════════════════════════════════════════════
// Helper types & functions
// ═══════════════════════════════════════════════

interface ImageCollection {
  urls: { url: string; alt: string; source: string; context: string }[];
  seen: Set<string>;
}

interface RoomDetail {
  size_sqm?: number | null;
  max_guests?: number | null;
  bed_type?: string | null;
  amenities?: string[];
  view?: string | null;
}

function normalizeStr(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname; } catch { return ""; }
}

// ── Standardize image URLs for consistent quality/size ──
function standardizeImageUrl(url: string): string {
  try {
    const u = new URL(url);

    // Cloudinary: request w_1200, q_auto, f_auto
    if (u.hostname.includes("cloudinary.com")) {
      const path = u.pathname;
      if (path.includes("/upload/")) {
        const newPath = path.replace(/\/upload\/[^/]*\//, "/upload/w_1200,q_auto,f_auto/");
        if (newPath !== path) return u.origin + newPath + u.search;
      }
    }

    // imgix: set w, q, fit params
    if (u.hostname.includes("imgix") || u.searchParams.has("w") || u.searchParams.has("fit")) {
      u.searchParams.set("w", "1200");
      u.searchParams.set("q", "80");
      u.searchParams.set("fit", "max");
      u.searchParams.set("auto", "format");
      return u.toString();
    }

    // Accor/hotel CDN patterns: replace size params
    if (u.search.includes("wid=") || u.search.includes("width=")) {
      u.searchParams.set("wid", "1200");
      u.searchParams.delete("width");
      if (u.searchParams.has("hei")) u.searchParams.delete("hei");
      if (u.searchParams.has("height")) u.searchParams.delete("height");
      u.searchParams.set("qlt", "80");
      return u.toString();
    }

    // Generic resize patterns in URL path: try to bump resolution
    const pathLower = u.pathname.toLowerCase();
    if (/[-_]\d{2,3}x\d{2,3}/.test(pathLower)) {
      // Small dimensions in path, try to increase
      u.pathname = u.pathname.replace(/[-_](\d{2,3})x(\d{2,3})/, (m, w, h) => {
        return m.replace(`${w}x${h}`, "1200x800");
      });
      return u.toString();
    }

    return url;
  } catch {
    return url;
  }
}

// ── Find the official hotel website from search results ──
function findOfficialSite(results: any[], hotelName: string): any | null {
  const nameNorm = normalizeStr(hotelName);
  const nameWords = nameNorm.split(/\s+/).filter(w => w.length > 2);

  // Domains that are NOT official hotel sites
  const aggregators = [
    "booking.com", "expedia.com", "hotels.com", "trivago.com", "kayak.com",
    "tripadvisor.com", "agoda.com", "priceline.com", "hotelscombined.com",
    "google.com", "bing.com", "wikipedia.org", "facebook.com", "instagram.com",
    "decolar.com", "hurb.com", "cvc.com.br",
    // Hotel directory / aggregator sites that list MULTIPLE hotels
    "lemeshotel.com", "hoteis.com", "hotel.com.br", "guiadoturismo.com",
    "melhoreshoteis.com", "hotelurbano.com", "zarpo.com", "omnibees.com",
    "hotelsdotcom.com", "oyster.com", "hotel.info", "hrs.com",
    "laterooms.com", "hostelworld.com", "bestday.com",
  ];

  // Detect generic hotel directory patterns
  const directoryPatterns = [
    /hotel(?:is|s|eiro|eira)?\.com/i,       // generic "hotel(s/is).com" sites
    /guia|directory|listings|comparador/i,    // directory keywords in domain
  ];

  // Score each result
  let bestScore = -1;
  let bestResult: any = null;

  for (const result of results) {
    if (!result.url) continue;
    const domain = extractDomain(result.url);
    const domainNorm = normalizeStr(domain);

    // Skip aggregators
    if (aggregators.some(a => domain.includes(a))) continue;

    // Skip generic hotel directory sites
    if (directoryPatterns.some(p => p.test(domain))) continue;

    let score = 0;

    // Check if domain contains hotel name words
    const domainMatchCount = nameWords.filter(w => domainNorm.includes(w)).length;
    score += domainMatchCount * 3;

    // Check if page title/content mentions the exact hotel
    const title = normalizeStr(result.title || "");
    const markdown = normalizeStr((result.markdown || "").substring(0, 500));
    if (title.includes(nameNorm)) score += 5;
    if (markdown.includes(nameNorm)) score += 2;

    // Hotel chain official domains get bonus
    const chainDomains = [
      "accor.com", "all.accor.com", "hilton.com", "marriott.com", "ihg.com", "hyatt.com",
      "pullman-hotels.com", "sofitel.com", "novotel.com", "ibis.com",
      "starwoodhotels.com", "wyndham.com", "radisson.com",
      "ahstatic.com", // Accor CDN
    ];
    if (chainDomains.some(c => domain.includes(c))) score += 4;

    // Bonus for domains that look like the hotel's own site (contain brand + city)
    const brandWords = ["pullman", "sofitel", "novotel", "hilton", "marriott", "hyatt", "sheraton", "westin", "fairmont"];
    for (const brand of brandWords) {
      if (nameNorm.includes(brand) && domainNorm.includes(brand)) {
        score += 6; // Strong signal: domain matches the hotel brand
      }
    }

    // Penalize if domain contains a DIFFERENT hotel name
    const otherHotels = ["ibis", "novotel", "mercure", "sofitel", "fairmont", "mgallery"];
    const targetBrand = nameWords.find(w => otherHotels.includes(w));
    for (const other of otherHotels) {
      if (other === targetBrand) continue;
      if (domainNorm.includes(other) || result.url.toLowerCase().includes(`/${other}`)) {
        score -= 10; // Heavy penalty for wrong hotel brand in URL
      }
    }

    // Penalize sites that list multiple hotels (check if content mentions "outros hotéis", multiple hotel names, etc.)
    const contentSample = (result.markdown || "").substring(0, 2000).toLowerCase();
    const multiHotelSignals = ["outros hotéis", "hotéis em", "lista de hotéis", "compare hotéis", "veja também"];
    if (multiHotelSignals.some(s => contentSample.includes(s))) score -= 5;

    if (score > bestScore) {
      bestScore = score;
      bestResult = result;
    }
  }

  return bestResult;
}

// ── Check if a search result is relevant to our target hotel ──
function isResultRelevant(result: any, hotelName: string): boolean {
  const nameNorm = normalizeStr(hotelName);
  const nameWords = nameNorm.split(/\s+/).filter(w => w.length > 3);
  const title = normalizeStr(result.title || "");
  const url = (result.url || "").toLowerCase();

  // Check if title or URL mentions the hotel name
  const matches = nameWords.filter(w => title.includes(w) || url.includes(w)).length;

  // Check for competing hotel names in URL
  const otherBrands = ["ibis", "novotel", "mercure", "sofitel", "fairmont", "mgallery", "holiday-inn", "crowne-plaza"];
  const targetWords = nameNorm.split(/\s+/);
  for (const brand of otherBrands) {
    if (targetWords.includes(brand)) continue;
    if (url.includes(brand) || title.includes(brand)) return false;
  }

  return matches >= 1;
}

// ── Collect images from a search result, optionally filtering by domain ──
function collectImagesFromResult(result: any, collection: ImageCollection, filterDomain: string | null) {
  const markdown = result.markdown || "";
  const sourceUrl = result.url || "";

  const mdImgRegex = /!\[([^\]]*)\]\(([^)]+)\)/gi;
  let match;
  while ((match = mdImgRegex.exec(markdown)) !== null) {
    const imgUrl = match[2]?.trim();
    if (filterDomain && !isFromDomain(imgUrl, sourceUrl, filterDomain)) continue;
    addImage(collection, imgUrl, match[1] || "", sourceUrl, "");
  }

  const urlRegex = /https?:\/\/[^\s\)>"']+\.(?:jpg|jpeg|png|webp)(?:\?[^\s\)>"']*)?/gi;
  while ((match = urlRegex.exec(markdown)) !== null) {
    const imgUrl = match[0];
    if (filterDomain && !isFromDomain(imgUrl, sourceUrl, filterDomain)) continue;
    addImage(collection, imgUrl, "", sourceUrl, "");
  }
}

function isFromDomain(imageUrl: string, sourceUrl: string, officialDomain: string): boolean {
  // Images from CDNs are OK if they came from the official domain page
  const sourceDomain = extractDomain(sourceUrl);
  if (sourceDomain.includes(officialDomain) || officialDomain.includes(sourceDomain)) return true;

  // Check if image URL itself is from the official domain
  const imgDomain = extractDomain(imageUrl.startsWith("http") ? imageUrl : `https://${officialDomain}${imageUrl}`);
  if (imgDomain.includes(officialDomain) || officialDomain.includes(imgDomain)) return true;

  // CDNs serving the hotel's images (common patterns)
  const allowedCDNs = ["cloudinary", "akamai", "cloudfront", "amazonaws", "imgix", "ctfassets", "bstatic", "trvl-media"];
  if (allowedCDNs.some(cdn => imageUrl.toLowerCase().includes(cdn))) return true;

  return false;
}

function addImage(collection: ImageCollection, rawUrl: string, alt: string, sourceUrl: string, context: string) {
  if (!rawUrl || collection.seen.has(rawUrl)) return;
  if (!isRelevantImage(rawUrl)) return;
  const absUrl = makeAbsolute(rawUrl, sourceUrl);
  collection.seen.add(absUrl);
  collection.urls.push({ url: absUrl, alt, source: sourceUrl, context });
}

async function scrapeMainUrl(mainUrl: string, collection: ImageCollection, apiKey: string, officialDomain: string | null) {
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

async function scrapeRoomsPages(
  mainUrl: string | undefined, hotelName: string, locationStr: string,
  collection: ImageCollection, apiKey: string, officialDomain: string | null
): Promise<Record<string, RoomDetail>> {
  const roomDetails: Record<string, RoomDetail> = {};
  if (!mainUrl) return roomDetails;

  const roomPaths = [
    "/rooms", "/quartos", "/habitaciones", "/accommodations", "/suites",
    "/rooms-suites", "/rooms-and-suites", "/accommodation", "/acomodacoes",
    "/guest-rooms", "/habitaciones-y-suites",
  ];

  let base: URL;
  try { base = new URL(mainUrl); } catch { return roomDetails; }

  let foundRoomsPage = false;

  for (const path of roomPaths) {
    if (foundRoomsPage) break;
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

      if (html.length > 500 || markdown.length > 300) {
        console.log(`Found rooms page at ${roomUrl}`);
        foundRoomsPage = true;

        extractImagesWithContext(html, roomUrl, collection);
        extractImagesFromHtml(html, roomUrl, collection);
        extractRoomDetailsFromContent(markdown, html, roomDetails);

        const roomLinks = extractRoomLinks(html, base.origin);
        console.log(`Found ${roomLinks.length} individual room pages`);

        await Promise.all(roomLinks.slice(0, 8).map(async (link) => {
          try {
            const roomResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
              method: "POST",
              headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({ url: link.url, formats: ["html", "markdown"], onlyMainContent: true, waitFor: 2000 }),
            });
            if (!roomResp.ok) return;
            const roomData = await roomResp.json();
            const roomHtml = roomData.data?.html || roomData.html || "";
            const roomMarkdown = roomData.data?.markdown || roomData.markdown || "";

            extractImagesWithContext(roomHtml, link.url, collection);
            extractImagesFromHtml(roomHtml, link.url, collection);

            const detail = extractSingleRoomDetails(roomMarkdown, roomHtml, link.name);
            if (detail && link.name) {
              roomDetails[link.name] = {
                ...(roomDetails[link.name] || {}),
                ...detail,
                amenities: mergeAmenities(roomDetails[link.name]?.amenities, detail.amenities),
              };
            }
          } catch { /* skip */ }
        }));
      }
    } catch { continue; }
  }

  return roomDetails;
}

function mergeAmenities(a?: string[] | null, b?: string[] | null): string[] {
  const set = new Set<string>();
  (a || []).forEach(x => set.add(x.toLowerCase().trim()));
  (b || []).forEach(x => set.add(x.toLowerCase().trim()));
  return Array.from(set).map(s => s.charAt(0).toUpperCase() + s.slice(1));
}

function extractRoomLinks(html: string, origin: string): { url: string; name: string }[] {
  const links: { url: string; name: string }[] = [];
  const seen = new Set<string>();
  const linkRegex = /<a[^>]*href=["']([^"']*(?:room|suite|quarto|habitaci|accommodation)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const linkText = match[2].replace(/<[^>]+>/g, "").trim();
    if (!href || href === "#" || href.includes("javascript:")) continue;
    const fullUrl = makeAbsolute(href, origin);
    if (seen.has(fullUrl)) continue;
    seen.add(fullUrl);
    const name = linkText.length > 2 && linkText.length < 100 ? linkText : extractNameFromUrl(href);
    if (name) links.push({ url: fullUrl, name });
  }
  return links;
}

function extractNameFromUrl(url: string): string {
  const parts = url.split("/").filter(Boolean);
  const last = parts[parts.length - 1] || "";
  return last.replace(/[-_]/g, " ").replace(/\.(html?|php|aspx?)$/i, "").replace(/\b\w/g, c => c.toUpperCase()).trim();
}

function extractRoomDetailsFromContent(markdown: string, html: string, details: Record<string, RoomDetail>) {
  const sections = markdown.split(/(?=^#{1,3}\s)/m);
  for (const section of sections) {
    const headerMatch = section.match(/^#{1,3}\s+(.+)/m);
    if (!headerMatch) continue;
    const name = headerMatch[1].trim();
    const roomKeywords = /suite|room|quarto|habitaci|deluxe|standard|premium|family|familiar|king|queen|double|twin|villa|bungalow|cottage|cabana/i;
    if (!roomKeywords.test(name) && !roomKeywords.test(section)) continue;
    const detail = extractSingleRoomDetails(section, "", name);
    if (detail) details[name] = detail;
  }
}

function extractSingleRoomDetails(markdown: string, html: string, name: string): RoomDetail | null {
  const content = markdown + " " + html.replace(/<[^>]+>/g, " ");
  const detail: RoomDetail = {};

  const sqmMatch = content.match(/(\d+)\s*(?:m²|m2|metros?\s*quadrados?|sq\.?\s*m)/i);
  if (sqmMatch) detail.size_sqm = parseInt(sqmMatch[1]);
  if (!detail.size_sqm) {
    const ftMatch = content.match(/(\d+)\s*(?:sq\.?\s*ft|square\s*feet|ft²)/i);
    if (ftMatch) detail.size_sqm = Math.round(parseInt(ftMatch[1]) * 0.0929);
  }

  const guestMatch = content.match(/(?:até|up\s*to|max|máximo|capacity|capacidade)\s*(\d+)\s*(?:hóspedes?|guests?|pessoas?|pax)/i);
  if (guestMatch) detail.max_guests = parseInt(guestMatch[1]);

  const bedPatterns = [
    /(\d+\s*(?:cama|bed)s?\s*(?:de\s*)?(?:king|queen|casal|solteiro|twin|double|single)(?:\s*size)?)/i,
    /(king\s*(?:size)?\s*bed|queen\s*(?:size)?\s*bed|twin\s*beds?|double\s*bed|cama\s*(?:de\s*)?(?:casal|solteiro|king|queen))/i,
    /(\d+\s*King\s*(?:Size)?|\d+\s*Queen|\d+\s*Twin|\d+\s*Double)/i,
  ];
  for (const p of bedPatterns) { const m = content.match(p); if (m) { detail.bed_type = m[1].trim(); break; } }

  const viewMatch = content.match(/(?:vista|view)\s*(?:para\s*(?:o\s*)?|of\s*(?:the\s*)?|:?\s*)(mar|ocean|sea|garden|jardim|pool|piscina|city|cidade|mountain|montanha|lagoon|lagoa|beach|praia|resort|park|parque|river|rio|lake|lago)/i);
  if (viewMatch) {
    const viewMap: Record<string, string> = {
      mar: "Vista Mar", ocean: "Vista Mar", sea: "Vista Mar", garden: "Vista Jardim", jardim: "Vista Jardim",
      pool: "Vista Piscina", piscina: "Vista Piscina", city: "Vista Cidade", cidade: "Vista Cidade",
      mountain: "Vista Montanha", montanha: "Vista Montanha", beach: "Vista Praia", praia: "Vista Praia",
      lagoon: "Vista Lagoa", lagoa: "Vista Lagoa", resort: "Vista Resort", park: "Vista Parque", parque: "Vista Parque",
      river: "Vista Rio", rio: "Vista Rio", lake: "Vista Lago", lago: "Vista Lago",
    };
    detail.view = viewMap[viewMatch[1].toLowerCase()] || `Vista ${viewMatch[1]}`;
  }

  const amenityPatterns: [RegExp, string][] = [
    [/secador\s*(?:de\s*cabelo)?|hair\s*dryer|blow\s*dryer/i, "Secador de cabelo"],
    [/cofre\s*(?:digital|eletr[oô]nico)?|(?:digital\s*)?safe(?:\s*box)?|in-room\s*safe/i, "Cofre digital"],
    [/minibar|mini[\s-]?bar|frigobar/i, "Minibar"],
    [/ar[\s-]?condicionado|air[\s-]?condition/i, "Ar-condicionado"],
    [/tv\s*(?:tela\s*plana|flat[\s-]?screen|lcd|led|smart)|smart\s*tv|flat[\s-]?screen\s*tv|television/i, "TV tela plana"],
    [/wi[\s-]?fi|wifi|internet\s*(?:sem\s*fio|wireless)/i, "Wi-Fi"],
    [/roup[aã]o|bathrobe/i, "Roupão"],
    [/chinelo|slipper/i, "Chinelos"],
    [/nespresso|m[aá]quina\s*(?:de\s*)?caf[eé]|coffee\s*(?:maker|machine)|espresso/i, "Máquina de café"],
    [/chaleira|kettle|electric\s*kettle/i, "Chaleira elétrica"],
    [/banheira|bathtub|soaking\s*tub|jacuzzi|whirlpool/i, "Banheira"],
    [/ducha|rain\s*shower|chuveiro/i, "Ducha"],
    [/varanda|balc[aã]o|terraço|balcony|terrace|patio/i, "Varanda/Terraço"],
    [/sala\s*(?:de\s*)?estar|living\s*(?:room|area)|sitting\s*area/i, "Sala de estar"],
    [/closet|walk[\s-]?in\s*closet|armário/i, "Closet"],
    [/ferro\s*(?:de\s*)?passar|iron(?:ing)?(?:\s*board)?/i, "Ferro de passar"],
    [/room\s*service\s*24|servi[cç]o\s*(?:de\s*)?quarto\s*24/i, "Room service 24h"],
    [/tomada\s*usb|usb\s*(?:port|charging|outlet)/i, "Tomadas USB"],
    [/dock\s*(?:station)?|bluetooth\s*speaker/i, "Dock station"],
    [/amenities\s*(?:premium|luxo|l'occitane|bvlgari|hermès|molton\s*brown)/i, "Amenities premium"],
    [/fechadura\s*eletr[oô]nica|electronic\s*(?:key|lock)|key\s*card/i, "Fechadura eletrônica"],
    [/cozinha|kitchenette|kitchen/i, "Cozinha/Kitchenette"],
    [/mesa\s*(?:de\s*)?trabalho|work\s*desk|escritório|desk/i, "Mesa de trabalho"],
    [/ventilador\s*(?:de\s*)?teto|ceiling\s*fan/i, "Ventilador de teto"],
    [/black[\s-]?out|cortina\s*(?:black[\s-]?out)/i, "Cortinas blackout"],
    [/espelho\s*(?:de\s*)?maquiagem|vanity\s*mirror|magnifying\s*mirror/i, "Espelho de maquiagem"],
    [/travesseiro|pillow\s*menu/i, "Menu de travesseiros"],
    [/turn[\s-]?down\s*service/i, "Turndown service"],
    [/bidet/i, "Bidê"],
    [/sofá[\s-]?cama|sofa[\s-]?bed|pull[\s-]?out\s*(?:sofa|couch)/i, "Sofá-cama"],
  ];

  const amenities: string[] = [];
  for (const [pattern, label] of amenityPatterns) { if (pattern.test(content)) amenities.push(label); }
  if (amenities.length > 0) detail.amenities = amenities;

  if (detail.size_sqm || detail.bed_type || (detail.amenities && detail.amenities.length > 0) || detail.view || detail.max_guests) return detail;
  return null;
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
        ? raw.split(",").map(s => s.trim().split(/\s+/)[0]) : [raw];
      for (const url of urls) addImage(collection, url, "", sourceUrl, "");
    }
  }
  const imgWithAlt = /<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']+)["']/gi;
  let m;
  while ((m = imgWithAlt.exec(html)) !== null) {
    const existing = collection.urls.find(i => i.url.includes(m[1]) || m[1].includes(i.url));
    if (existing && !existing.alt) existing.alt = m[2];
  }
}

function extractImagesWithContext(html: string, sourceUrl: string, collection: ImageCollection) {
  const sectionRegex = /<(?:div|section|article)[^>]*>[\s\S]*?<\/(?:div|section|article)>/gi;
  const keywords = /suite|room|quarto|habitaci|deluxe|standard|premium|family|familiar|king|queen|restaurant|restaurante|bar|lounge|pool|piscina|spa|lobby|beach|praia/i;
  let match;
  while ((match = sectionRegex.exec(html)) !== null) {
    const section = match[0];
    if (!keywords.test(section)) continue;
    const textContent = section.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().substring(0, 200);
    const imgRegex = /(?:src|data-src)\s*=\s*["']([^"']+)["']/gi;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(section)) !== null) {
      const url = imgMatch[1];
      if (isRelevantImage(url)) {
        const existing = collection.urls.find(i => i.url === makeAbsolute(url, sourceUrl));
        if (existing) { existing.context = textContent; }
        else { addImage(collection, url, "", sourceUrl, textContent); }
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
  } catch { return url; }
}
