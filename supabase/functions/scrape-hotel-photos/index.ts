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

    const locationStr = [hotel_city, hotel_country].filter(Boolean).join(", ");
    const cleanHotelName = hotel_name.replace(/\s*[-–—]\s*(Rod\.|Acesso|Av\.|Rua|R\.).*$/i, "").trim();

    // ── Step 1: Find the OFFICIAL hotel website ──
    const searchQuery = `${cleanHotelName} ${locationStr} site oficial`;
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
    const officialResult = findOfficialSite(results, hotel_name);
    const officialDomain = officialResult ? new URL(officialResult.url).hostname : null;
    console.log(`Official domain identified: ${officialDomain || "none"}`);

    // ── Step 3: Collect images from official domain ──
    const images: ImageCollection = { urls: [], seen: new Set() };

    if (officialResult) {
      collectImagesFromResult(officialResult, images, officialDomain);
    }

    // Scrape the main official page for more images
    const mainUrl = officialResult?.url || results[0]?.url;
    if (mainUrl) {
      console.log("Scraping main URL:", mainUrl);
      await scrapeMainUrl(mainUrl, images, FIRECRAWL_API_KEY);
    }

    // Scrape rooms/accommodation pages
    await scrapeRoomsPages(mainUrl, images, FIRECRAWL_API_KEY);

    // If we got few images from official site, also collect from other results
    if (images.urls.length < 10) {
      console.log(`Only ${images.urls.length} images from official site, collecting from other results...`);
      for (const result of results) {
        if (result === officialResult) continue;
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

    // ── Step 4: Return photos directly (no AI) ──
    const photos = images.urls
      .filter(img => {
        const url = img.url.toLowerCase();
        if (url.includes("icon") || url.includes("logo") || url.includes("sprite")) return false;
        if (url.includes("1x1") || url.includes("pixel") || url.includes("tracking")) return false;
        return /\.(jpg|jpeg|png|webp|avif)(\?|$)/i.test(img.url) && img.url.length > 50;
      })
      .slice(0, 40)
      .map(img => ({
        url: standardizeImageUrl(img.url),
        alt: img.alt || `${hotel_name} foto`,
        category: "outro",
        confidence: 0.8,
      }));

    console.log(`Returning ${photos.length} photos`);

    return new Response(
      JSON.stringify({ success: true, photos, source_url: mainUrl || "" }),
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

function normalizeStr(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname; } catch { return ""; }
}

function standardizeImageUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("cloudinary.com") && u.pathname.includes("/upload/")) {
      const newPath = u.pathname.replace(/\/upload\/[^/]*\//, "/upload/w_1200,q_auto,f_auto/");
      if (newPath !== u.pathname) return u.origin + newPath + u.search;
    }
    if (u.hostname.includes("imgix") || u.searchParams.has("w") || u.searchParams.has("fit")) {
      u.searchParams.set("w", "1200");
      u.searchParams.set("q", "80");
      u.searchParams.set("fit", "max");
      u.searchParams.set("auto", "format");
      return u.toString();
    }
    if (u.search.includes("wid=") || u.search.includes("width=")) {
      u.searchParams.set("wid", "1200");
      u.searchParams.delete("width");
      if (u.searchParams.has("hei")) u.searchParams.delete("hei");
      if (u.searchParams.has("height")) u.searchParams.delete("height");
      u.searchParams.set("qlt", "80");
      return u.toString();
    }
    return url;
  } catch {
    return url;
  }
}

function findOfficialSite(results: any[], hotelName: string): any | null {
  const nameNorm = normalizeStr(hotelName);
  const nameWords = nameNorm.split(/\s+/).filter(w => w.length > 2);

  const aggregators = [
    "booking.com", "expedia.com", "hotels.com", "trivago.com", "kayak.com",
    "tripadvisor.com", "agoda.com", "priceline.com", "hotelscombined.com",
    "google.com", "bing.com", "wikipedia.org", "facebook.com", "instagram.com",
    "decolar.com", "hurb.com", "cvc.com.br",
    "hoteis.com", "hotel.com.br", "zarpo.com", "omnibees.com",
    "skyscanner.com", "momondo.com", "orbitz.com",
    "travelocity.com", "wotif.com", "lastminute.com",
  ];

  let bestScore = -1;
  let bestResult: any = null;

  for (const result of results) {
    if (!result.url) continue;
    const domain = extractDomain(result.url);
    const domainNorm = normalizeStr(domain);

    if (aggregators.some(a => domain.includes(a))) continue;

    let score = 0;
    const domainMatchCount = nameWords.filter(w => domainNorm.includes(w)).length;
    score += domainMatchCount * 3;

    const title = normalizeStr(result.title || "");
    if (title.includes(nameNorm)) score += 5;

    const chainDomains = [
      "accor.com", "all.accor.com", "hilton.com", "marriott.com", "ihg.com", "hyatt.com",
      "pullman-hotels.com", "sofitel.com", "novotel.com", "ibis.com",
      "wyndham.com", "radisson.com", "ahstatic.com",
    ];
    if (chainDomains.some(c => domain.includes(c))) score += 4;

    const brandWords = ["pullman", "sofitel", "novotel", "hilton", "marriott", "hyatt", "sheraton", "westin", "fairmont"];
    for (const brand of brandWords) {
      if (nameNorm.includes(brand) && domainNorm.includes(brand)) score += 6;
    }

    if (score > bestScore) {
      bestScore = score;
      bestResult = result;
    }
  }

  return bestResult;
}

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
  const sourceDomain = extractDomain(sourceUrl);
  if (sourceDomain.includes(officialDomain) || officialDomain.includes(sourceDomain)) return true;

  const imgDomain = extractDomain(imageUrl.startsWith("http") ? imageUrl : `https://${officialDomain}${imageUrl}`);
  if (imgDomain.includes(officialDomain) || officialDomain.includes(imgDomain)) return true;

  const allowedCDNs = [
    "cloudinary", "akamai", "cloudfront", "amazonaws", "imgix", "ctfassets",
    "bstatic", "trvl-media", "ahstatic", "fastbooking", "accor",
    "hilton.com/im/", "marriott.com/content", "wyndham", "ihg.com",
  ];
  if (allowedCDNs.some(cdn => imageUrl.toLowerCase().includes(cdn))) return true;

  return false;
}

function addImage(collection: ImageCollection, rawUrl: string, alt: string, sourceUrl: string, context: string) {
  if (!rawUrl || collection.seen.has(rawUrl)) return;
  if (!isRelevantImage(rawUrl)) return;
  const absUrl = makeAbsolute(rawUrl, sourceUrl);
  if (collection.seen.has(absUrl)) return;
  collection.seen.add(absUrl);
  collection.urls.push({ url: absUrl, alt, source: sourceUrl, context });
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

async function scrapeRoomsPages(mainUrl: string | undefined, collection: ImageCollection, apiKey: string) {
  if (!mainUrl) return;

  const roomPaths = [
    "/rooms", "/quartos", "/habitaciones", "/accommodations", "/suites",
    "/rooms-suites", "/rooms-and-suites", "/accommodation", "/acomodacoes",
  ];

  let base: URL;
  try { base = new URL(mainUrl); } catch { return; }

  for (const path of roomPaths) {
    const roomUrl = base.origin + path;
    try {
      const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: roomUrl, formats: ["html"], onlyMainContent: true, waitFor: 3000 }),
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      const html = data.data?.html || data.html || "";

      if (html.length > 500) {
        console.log(`Found rooms page at ${roomUrl}`);
        extractImagesFromHtml(html, roomUrl, collection);
        break; // Found a rooms page, stop searching
      }
    } catch { continue; }
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
        ? raw.split(",").map(s => s.trim().split(/\s+/)[0]) : [raw];
      for (const url of urls) addImage(collection, url, "", sourceUrl, "");
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
