const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

interface ScrapedPhoto {
  url: string;
  alt: string;
  section_name: string; // The heading/section this image belongs to
  category: string;
  confidence: number;
}

interface ImageCollection {
  photos: ScrapedPhoto[];
  seen: Set<string>;
}

// ═══════════════════════════════════════════════
// Main handler
// ═══════════════════════════════════════════════

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
    console.log("🔍 Searching for hotel:", searchQuery);

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

    // ── Step 2: Identify the OFFICIAL site ──
    const officialResult = findOfficialSite(results, hotel_name);
    const mainUrl = officialResult?.url || results[0]?.url;
    const officialDomain = mainUrl ? new URL(mainUrl).hostname : null;
    console.log(`🏨 Official domain: ${officialDomain || "none"} → ${mainUrl}`);

    const collection: ImageCollection = { photos: [], seen: new Set() };

    // ── Step 3: MAP the entire site to discover ALL pages ──
    console.log("🗺️ Mapping entire hotel website...");
    const allSiteUrls = await mapEntireSite(mainUrl, FIRECRAWL_API_KEY);
    console.log(`📄 Found ${allSiteUrls.length} pages on the site`);

    // ── Step 4: Categorize pages by relevance ──
    const categorizedPages = categorizePages(allSiteUrls, mainUrl);
    console.log(`  Priority pages: ${categorizedPages.priority.length}`);
    console.log(`  Gallery pages: ${categorizedPages.gallery.length}`);
    console.log(`  Other pages: ${categorizedPages.other.length}`);

    // ── Step 5: Scrape ALL relevant pages (priority first, then gallery, then others) ──
    // Priority = rooms, suites, accommodation pages
    // Gallery = gallery, photos, media pages  
    // Other = restaurant, spa, facilities, etc.

    const pagesToScrape = [
      ...categorizedPages.priority,
      ...categorizedPages.gallery,
      ...categorizedPages.other,
    ].slice(0, 30); // Max 30 pages to stay within limits

    console.log(`🕷️ Scraping ${pagesToScrape.length} pages for high-res photos...`);

    // Scrape pages in parallel batches of 3
    const batchSize = 3;
    for (let i = 0; i < pagesToScrape.length; i += batchSize) {
      const batch = pagesToScrape.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(page => scrapePageForPhotos(page.url, page.inferredSection, collection, FIRECRAWL_API_KEY, hotel_name))
      );
      console.log(`  Scraped ${Math.min(i + batchSize, pagesToScrape.length)}/${pagesToScrape.length} pages, ${collection.photos.length} photos so far`);
    }

    // Also scrape the main/home page if we haven't
    if (mainUrl && !pagesToScrape.some(p => p.url === mainUrl)) {
      await scrapePageForPhotos(mainUrl, "", collection, FIRECRAWL_API_KEY, hotel_name);
    }

    // Fallback: if still few images, use search results markdown
    if (collection.photos.length < 10) {
      console.log(`⚠️ Only ${collection.photos.length} photos, extracting from search results...`);
      if (officialResult) {
        collectImagesFromMarkdown(officialResult.markdown || "", officialResult.url || "", collection, officialDomain);
      }
      for (const result of results) {
        if (result === officialResult) continue;
        collectImagesFromMarkdown(result.markdown || "", result.url || "", collection, null);
      }
    }

    console.log(`📸 Total candidate images: ${collection.photos.length}`);

    // ── Step 6: Filter, deduplicate, maximize quality, and return ──
    const photos = collection.photos
      .filter(img => {
        const url = img.url.toLowerCase();
        if (url.includes("icon") || url.includes("logo") || url.includes("sprite")) return false;
        if (url.includes("1x1") || url.includes("pixel") || url.includes("tracking")) return false;
        if (isLikelyThumbnail(img.url)) return false;
        return /\.(jpg|jpeg|png|webp|avif)(\?|$)/i.test(img.url) && img.url.length > 50;
      })
      // Prioritize photos WITH section names
      .sort((a, b) => {
        if (a.section_name && !b.section_name) return -1;
        if (!a.section_name && b.section_name) return 1;
        return (b.confidence || 0) - (a.confidence || 0);
      })
      .slice(0, 80)
      .map(img => ({
        url: standardizeImageUrl(img.url),
        alt: img.alt || `${hotel_name} foto`,
        section_name: img.section_name,
        category: inferCategory(img.section_name, img.alt),
        confidence: img.section_name ? 0.95 : 0.5,
      }));

    const roomNames = [...new Set(photos.map(p => p.section_name).filter(Boolean))];
    console.log(`✅ Returning ${photos.length} HD photos with ${roomNames.length} sections:`, roomNames);

    return new Response(
      JSON.stringify({
        success: true,
        photos,
        source_url: mainUrl || "",
        room_names: roomNames,
        pages_scraped: pagesToScrape.length,
        total_site_pages: allSiteUrls.length,
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
// Core: Scrape pages and associate images with their section headings
// ═══════════════════════════════════════════════

async function scrapePageWithContext(url: string, collection: ImageCollection, apiKey: string, hotelName: string) {
  try {
    console.log("Scraping page with context:", url);
    const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["html"], onlyMainContent: false, waitFor: 3000 }),
    });
    if (!resp.ok) return;
    const data = await resp.json();
    const html = data.data?.html || data.html || "";
    if (html.length < 200) return;

    extractImagesWithSectionContext(html, url, collection, hotelName);
  } catch (e) {
    console.error("Scrape failed:", e);
  }
}

async function scrapeRoomsPagesWithContext(mainUrl: string | undefined, collection: ImageCollection, apiKey: string, hotelName: string) {
  if (!mainUrl) return;

  const roomPaths = [
    "/rooms", "/quartos", "/habitaciones", "/accommodations", "/suites",
    "/rooms-suites", "/rooms-and-suites", "/accommodation", "/acomodacoes",
    "/rooms-and-rates", "/our-rooms", "/guest-rooms",
    "/camere", "/camere-e-suite", "/zimmer",
  ];

  let base: URL;
  try { base = new URL(mainUrl); } catch { return; }

  // Also try to discover rooms page URL via map
  const discoveredPaths = await discoverRoomsPaths(mainUrl, apiKey);
  const allPaths = [...new Set([...roomPaths, ...discoveredPaths])];

  let foundRoomsPage = false;

  for (const path of allPaths) {
    const roomUrl = path.startsWith("http") ? path : base.origin + path;
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
        console.log(`✅ Found rooms page at ${roomUrl}`);
        extractImagesWithSectionContext(html, roomUrl, collection, hotelName);
        foundRoomsPage = true;

        // Also try to find individual room detail pages linked from this page
        const roomDetailLinks = extractRoomDetailLinks(html, roomUrl);
        console.log(`Found ${roomDetailLinks.length} room detail page links`);

        // Scrape up to 8 individual room pages for more photos
        for (const link of roomDetailLinks.slice(0, 8)) {
          await scrapeIndividualRoomPage(link.url, link.roomName, collection, apiKey, hotelName);
        }
        break;
      }
    } catch { continue; }
  }

  if (!foundRoomsPage) {
    console.log("No rooms page found via paths, trying main page sections");
  }
}

async function scrapeIndividualRoomPage(url: string, roomName: string, collection: ImageCollection, apiKey: string, _hotelName: string) {
  try {
    console.log(`  Scraping room detail: "${roomName}" → ${url}`);
    const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["html"], onlyMainContent: true, waitFor: 2000 }),
    });
    if (!resp.ok) return;
    const data = await resp.json();
    const html = data.data?.html || data.html || "";
    if (html.length < 300) return;

    // Extract all images including srcset high-res variants
    extractHighResImages(html, url, collection, roomName);
  } catch (e) {
    console.warn(`Failed scraping room page ${url}:`, e);
  }
}

/**
 * Extract images from HTML, preferring srcset high-res versions.
 * Associates each image with its parent section heading.
 */
function extractHighResImages(html: string, sourceUrl: string, collection: ImageCollection, sectionName: string) {
  // First pass: collect srcset high-res URLs per img tag
  const imgTagRegex = /<img[^>]+>/gi;
  let tagMatch;
  while ((tagMatch = imgTagRegex.exec(html)) !== null) {
    const tag = tagMatch[0];
    const bestUrl = getBestImageUrl(tag, sourceUrl);
    if (!bestUrl || !isRelevantImage(bestUrl)) continue;
    if (collection.seen.has(bestUrl)) continue;

    // Skip tiny thumbnails by checking URL for small dimensions
    if (isLikelyThumbnail(bestUrl)) continue;

    collection.seen.add(bestUrl);

    const altMatch = tag.match(/alt\s*=\s*["']([^"']{3,120})["']/i);
    const altText = altMatch?.[1] || "";

    collection.photos.push({
      url: bestUrl,
      alt: altText || sectionName,
      section_name: sectionName,
      category: inferCategory(sectionName, altText),
      confidence: sectionName ? 0.95 : 0.5,
    });
  }

  // Second pass: background images and data attributes not in img tags
  const bgRegex = /(?:data-bg|data-image|style\s*=\s*["'][^"']*url\s*\(\s*["']?)([^"')\s]+\.(?:jpg|jpeg|png|webp|avif)[^"')\s]*)["')\s]*/gi;
  let bgMatch;
  while ((bgMatch = bgRegex.exec(html)) !== null) {
    const imgUrl = bgMatch[1].trim();
    if (!isRelevantImage(imgUrl)) continue;
    const absUrl = makeAbsolute(imgUrl, sourceUrl);
    if (collection.seen.has(absUrl)) continue;
    if (isLikelyThumbnail(absUrl)) continue;
    collection.seen.add(absUrl);
    collection.photos.push({
      url: absUrl,
      alt: sectionName,
      section_name: sectionName,
      category: inferCategory(sectionName, ""),
      confidence: sectionName ? 0.9 : 0.4,
    });
  }
}

/**
 * From an <img> tag, extract the HIGHEST resolution URL available.
 * Priority: srcset (largest) > data-src > data-lazy-src > data-original > src
 */
function getBestImageUrl(imgTag: string, sourceUrl: string): string | null {
  // Try srcset first — pick the largest variant
  const srcsetMatch = imgTag.match(/srcset\s*=\s*["']([^"']+)["']/i);
  if (srcsetMatch) {
    const srcsetUrl = pickLargestFromSrcset(srcsetMatch[1], sourceUrl);
    if (srcsetUrl) return srcsetUrl;
  }

  // Try high-res data attributes
  const hiResAttrs = ["data-src-lg", "data-src-xl", "data-full-src", "data-zoom-src", "data-highres", "data-original"];
  for (const attr of hiResAttrs) {
    const match = imgTag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, "i"));
    if (match) {
      const url = makeAbsolute(match[1].trim(), sourceUrl);
      if (isRelevantImage(url)) return url;
    }
  }

  // Fallback data attributes
  const fallbackAttrs = ["data-src", "data-lazy-src"];
  for (const attr of fallbackAttrs) {
    const match = imgTag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, "i"));
    if (match) {
      const url = makeAbsolute(match[1].trim(), sourceUrl);
      if (isRelevantImage(url)) return url;
    }
  }

  // Regular src
  const srcMatch = imgTag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
  if (srcMatch) {
    const url = makeAbsolute(srcMatch[1].trim(), sourceUrl);
    if (isRelevantImage(url)) return url;
  }

  return null;
}

/**
 * Parse srcset and return the URL with the largest width descriptor.
 * srcset format: "url1 300w, url2 800w, url3 1600w"
 */
function pickLargestFromSrcset(srcset: string, sourceUrl: string): string | null {
  const candidates = srcset.split(",").map(s => {
    const parts = s.trim().split(/\s+/);
    const url = parts[0];
    const descriptor = parts[1] || "";
    let width = 0;
    if (descriptor.endsWith("w")) {
      width = parseInt(descriptor, 10) || 0;
    } else if (descriptor.endsWith("x")) {
      width = (parseFloat(descriptor) || 1) * 1000; // approximate
    }
    return { url, width };
  }).filter(c => c.url && isRelevantImage(c.url));

  if (candidates.length === 0) return null;

  // Pick the one with largest width, minimum 600w to avoid tiny thumbs
  candidates.sort((a, b) => b.width - a.width);
  const best = candidates[0];
  return makeAbsolute(best.url, sourceUrl);
}

/**
 * KEY FUNCTION: Parse HTML and associate each image with its closest preceding heading.
 */
function extractImagesWithSectionContext(html: string, sourceUrl: string, collection: ImageCollection, hotelName: string) {
  const headingRegex = /<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/gi;

  interface Section {
    name: string;
    startIdx: number;
    endIdx: number;
  }

  const sections: Section[] = [];
  let hMatch;
  while ((hMatch = headingRegex.exec(html)) !== null) {
    const rawHeading = hMatch[2].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#\d+;/g, " ").trim();
    if (rawHeading.length >= 3 && rawHeading.length <= 100) {
      const lower = rawHeading.toLowerCase();
      if (!isGenericHeading(lower)) {
        sections.push({ name: rawHeading, startIdx: hMatch.index, endIdx: 0 });
      }
    }
  }

  for (let i = 0; i < sections.length; i++) {
    sections[i].endIdx = i < sections.length - 1 ? sections[i + 1].startIdx : html.length;
  }

  extractFromStructuredContainers(html, sourceUrl, collection);

  // Process each section: extract HIGH-RES images
  for (const section of sections) {
    const sectionHtml = html.substring(section.startIdx, section.endIdx);
    extractHighResImages(sectionHtml, sourceUrl, collection, section.name);
  }

  // Orphan images before first heading
  if (sections.length > 0) {
    const preHeadingHtml = html.substring(0, sections[0].startIdx);
    extractHighResImages(preHeadingHtml, sourceUrl, collection, "");
  } else {
    extractHighResImages(html, sourceUrl, collection, "");
  }
}

function extractFromStructuredContainers(html: string, sourceUrl: string, collection: ImageCollection) {
  // Look for common hotel site patterns: containers with a title + images
  // e.g., <div class="room-card"><h3>Deluxe Room</h3><img src="..."/></div>
  const containerRegex = /<(?:div|article|section|li)[^>]*class="[^"]*(?:room|suite|accommodation|camera|chambre|zimmer)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|article|section|li)>/gi;
  let cMatch;
  while ((cMatch = containerRegex.exec(html)) !== null) {
    const containerHtml = cMatch[1];
    // Find the first heading or strong/span with text as the room name
    const nameMatch = containerHtml.match(/<(?:h[1-6]|strong|span[^>]*class="[^"]*title[^"]*")[^>]*>([^<]{3,80})<\//i);
    if (!nameMatch) continue;
    const roomName = nameMatch[1].replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim();
    if (roomName.length < 3 || isGenericHeading(roomName.toLowerCase())) continue;

    // Extract images from this container
    const imgRegex2 = /(?:src|data-src)\s*=\s*["']([^"']+\.(?:jpg|jpeg|png|webp|avif)[^"']*)["']/gi;
    let iMatch;
    while ((iMatch = imgRegex2.exec(containerHtml)) !== null) {
      const imgUrl = iMatch[1].trim();
      if (!isRelevantImage(imgUrl)) continue;
      const absUrl = makeAbsolute(imgUrl, sourceUrl);
      if (collection.seen.has(absUrl)) continue;
      collection.seen.add(absUrl);
      collection.photos.push({
        url: absUrl,
        alt: roomName,
        section_name: roomName,
        category: inferCategory(roomName, ""),
        confidence: 0.95,
      });
    }
  }
}




function extractRoomDetailLinks(html: string, baseUrl: string): Array<{ url: string; roomName: string }> {
  const links: Array<{ url: string; roomName: string }> = [];
  const seen = new Set<string>();

  // Pattern: <a href="/rooms/deluxe">Deluxe Room</a>
  const linkRegex = /<a[^>]*href=["']([^"']+(?:room|suite|camera|chambre|zimmer|quarto|accommodation)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1].trim();
    const linkText = match[2].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim();
    if (linkText.length < 3 || linkText.length > 80) continue;
    if (isGenericHeading(linkText.toLowerCase())) continue;

    const absUrl = makeAbsolute(href, baseUrl);
    if (seen.has(absUrl)) continue;
    seen.add(absUrl);
    links.push({ url: absUrl, roomName: linkText });
  }

  // Also look for links in room containers that use different patterns
  const altLinkRegex = /<a[^>]*href=["']([^"']{10,200})["'][^>]*>[^<]*<(?:h[1-6]|span|strong)[^>]*>([^<]{3,80})<\//gi;
  while ((match = altLinkRegex.exec(html)) !== null) {
    const href = match[1].trim();
    const text = match[2].replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim();
    if (text.length < 3 || isGenericHeading(text.toLowerCase())) continue;
    const absUrl = makeAbsolute(href, baseUrl);
    if (seen.has(absUrl)) continue;
    // Only include if the URL looks like a room page
    const lowerHref = absUrl.toLowerCase();
    if (lowerHref.includes("room") || lowerHref.includes("suite") || lowerHref.includes("camera") ||
        lowerHref.includes("accommodation") || lowerHref.includes("quarto") || lowerHref.includes("chambre")) {
      seen.add(absUrl);
      links.push({ url: absUrl, roomName: text });
    }
  }

  return links;
}

async function discoverRoomsPaths(mainUrl: string, apiKey: string): Promise<string[]> {
  try {
    const resp = await fetch("https://api.firecrawl.dev/v1/map", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: mainUrl, search: "rooms suites accommodation", limit: 20 }),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    const urls: string[] = data.links || [];
    const roomKeywords = ["room", "suite", "accommodation", "camera", "chambre", "quarto", "zimmer"];
    return urls.filter(u => roomKeywords.some(kw => u.toLowerCase().includes(kw))).slice(0, 5);
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

function isGenericHeading(text: string): boolean {
  const generic = [
    "book now", "reserve", "reservar", "check", "cookie", "privacy", "menu",
    "contact", "about", "navigate", "home", "back", "more", "contato", "sobre",
    "read more", "see all", "show", "close", "open", "ver mais", "saiba mais",
    "loading", "©", "copyright", "newsletter", "subscribe", "inscreva",
    "follow us", "siga", "social", "share", "compartilh",
    "best rate", "melhor tarifa", "miglior tariffa",
    "book", "prenota", "réserver",
  ];
  return generic.some(g => text.includes(g));
}

function isGenericAlt(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes("logo") || lower.includes("icon") || lower.includes("banner") ||
    lower.includes("button") || lower.includes("arrow") || lower === "image" || lower === "photo" ||
    lower.includes("placeholder") || lower.length < 4;
}

function inferCategory(sectionName: string, alt: string): string {
  const text = `${sectionName} ${alt}`.toLowerCase();
  if (/fachada|exterior|facade|building|entrada/i.test(text)) return "fachada";
  if (/lobby|recep[çc]/i.test(text)) return "lobby";
  if (/suite|suíte|penthouse|presidential|royal/i.test(text)) return "suite";
  if (/room|quarto|camera|chambre|zimmer|deluxe|superior|standard|classic|double|twin|single|king|queen/i.test(text)) return "quarto";
  if (/banheiro|bathroom|bagno|salle de bain/i.test(text)) return "banheiro";
  if (/piscina|pool|swimming/i.test(text)) return "piscina";
  if (/praia|beach|spiaggia/i.test(text)) return "praia";
  if (/restaurante|restaurant|ristorante|dining/i.test(text)) return "restaurante";
  if (/bar|lounge|cocktail/i.test(text)) return "bar";
  if (/spa|wellness|benessere/i.test(text)) return "spa";
  if (/academia|gym|fitness|palestra/i.test(text)) return "academia";
  if (/jardim|garden|giardino/i.test(text)) return "jardim";
  if (/vista|view|panoram/i.test(text)) return "vista";
  if (/event|meeting|conferenc|sala/i.test(text)) return "eventos";
  if (/area.?comum|common|terrace|terrazzo|rooftop/i.test(text)) return "area_comum";
  return "outro";
}

function normalizeStr(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname; } catch { return ""; }
}

/**
 * Maximize image quality by requesting the largest version from known CDN patterns.
 */
function standardizeImageUrl(url: string): string {
  try {
    const u = new URL(url);
    const lower = url.toLowerCase();

    // Cloudinary: request w_2000 quality auto
    if (u.hostname.includes("cloudinary.com") && u.pathname.includes("/upload/")) {
      const newPath = u.pathname.replace(/\/upload\/[^/]*\//, "/upload/w_2000,q_auto,f_auto/");
      if (newPath !== u.pathname) return u.origin + newPath;
    }

    // Imgix: request high-quality
    if (u.hostname.includes("imgix") || (u.searchParams.has("w") && u.searchParams.has("fit"))) {
      u.searchParams.set("w", "2000");
      u.searchParams.set("q", "85");
      u.searchParams.set("fit", "max");
      u.searchParams.set("auto", "format,compress");
      return u.toString();
    }

    // Akamai / generic CDN with wid/width params
    if (u.search.includes("wid=") || u.search.includes("width=")) {
      u.searchParams.set("wid", "2000");
      u.searchParams.delete("width");
      if (u.searchParams.has("hei")) u.searchParams.delete("hei");
      if (u.searchParams.has("height")) u.searchParams.delete("height");
      u.searchParams.set("qlt", "85");
      return u.toString();
    }

    // Contentful
    if (u.hostname.includes("ctfassets.net") || u.hostname.includes("contentful")) {
      u.searchParams.set("w", "2000");
      u.searchParams.set("q", "85");
      u.searchParams.set("fm", "jpg");
      u.searchParams.set("fl", "progressive");
      return u.toString();
    }

    // Fastly / generic resize params
    if (u.searchParams.has("width") || u.searchParams.has("w")) {
      u.searchParams.set("width", "2000");
      u.searchParams.delete("w");
      if (u.searchParams.has("height")) u.searchParams.delete("height");
      u.searchParams.set("quality", "85");
      return u.toString();
    }

    // WordPress / WP thumbnails — remove dimension suffix like -300x200
    if (/\-\d{2,4}x\d{2,4}\.(jpg|jpeg|png|webp)/i.test(u.pathname)) {
      const cleanPath = u.pathname.replace(/\-\d{2,4}x\d{2,4}\./, ".");
      return u.origin + cleanPath;
    }

    // Hilton images
    if (lower.includes("hilton.com") && lower.includes("/im/")) {
      u.searchParams.set("wid", "2000");
      u.searchParams.set("resMode", "sharp2");
      u.searchParams.set("op_usm", "1.75,0.3,2,0");
      return u.toString();
    }

    // Marriott
    if (lower.includes("marriott.com") && (u.searchParams.has("downsize") || u.searchParams.has("output-quality"))) {
      u.searchParams.set("downsize", "2000px:*");
      u.searchParams.set("output-quality", "85");
      return u.toString();
    }

    // Accor / ahstatic
    if (lower.includes("ahstatic.com") || lower.includes("accor")) {
      if (u.searchParams.has("width")) u.searchParams.set("width", "2000");
      if (u.searchParams.has("w")) u.searchParams.set("w", "2000");
      return u.toString();
    }

    // Generic: if URL has resize/crop params, try to increase them
    if (u.searchParams.has("resize")) {
      u.searchParams.set("resize", "2000");
      return u.toString();
    }

    return url;
  } catch {
    return url;
  }
}

/**
 * Detect likely thumbnails by URL patterns (small dimensions).
 */
function isLikelyThumbnail(url: string): boolean {
  const lower = url.toLowerCase();
  // Skip tiny thumbnails: -100x100, _thumb, /thumb/, 150x150 etc.
  if (lower.includes("_thumb") || lower.includes("/thumb/") || lower.includes("/thumbnail/")) return true;
  if (lower.includes("_small") || lower.includes("/small/")) return true;

  // Check for explicit small dimensions in URL
  const dimMatch = url.match(/[\-_/](\d{2,4})x(\d{2,4})/);
  if (dimMatch) {
    const w = parseInt(dimMatch[1], 10);
    const h = parseInt(dimMatch[2], 10);
    if (w < 300 && h < 300) return true;
  }

  // Check for width params indicating small images
  try {
    const u = new URL(url);
    const wParam = u.searchParams.get("w") || u.searchParams.get("width") || u.searchParams.get("wid");
    if (wParam && parseInt(wParam, 10) < 300) return true;
  } catch { /* ignore */ }

  return false;
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

    const brandWords = ["pullman", "sofitel", "novotel", "hilton", "marriott", "hyatt", "sheraton", "westin", "fairmont", "hassler"];
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

function collectImagesFromMarkdown(markdown: string, sourceUrl: string, collection: ImageCollection, filterDomain: string | null) {
  const mdImgRegex = /!\[([^\]]*)\]\(([^)]+)\)/gi;
  let match;
  while ((match = mdImgRegex.exec(markdown)) !== null) {
    const imgUrl = match[2]?.trim();
    if (filterDomain && !isFromDomain(imgUrl, sourceUrl, filterDomain)) continue;
    addImageToCollection(collection, imgUrl, match[1] || "", sourceUrl, "");
  }

  const urlRegex = /https?:\/\/[^\s\)>"']+\.(?:jpg|jpeg|png|webp)(?:\?[^\s\)>"']*)?/gi;
  while ((match = urlRegex.exec(markdown)) !== null) {
    const imgUrl = match[0];
    if (filterDomain && !isFromDomain(imgUrl, sourceUrl, filterDomain)) continue;
    addImageToCollection(collection, imgUrl, "", sourceUrl, "");
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
  return allowedCDNs.some(cdn => imageUrl.toLowerCase().includes(cdn));
}

function addImageToCollection(collection: ImageCollection, rawUrl: string, alt: string, sourceUrl: string, sectionName: string) {
  if (!rawUrl || collection.seen.has(rawUrl)) return;
  if (!isRelevantImage(rawUrl)) return;
  const absUrl = makeAbsolute(rawUrl, sourceUrl);
  if (collection.seen.has(absUrl)) return;
  collection.seen.add(absUrl);
  collection.photos.push({
    url: absUrl,
    alt,
    section_name: sectionName,
    category: inferCategory(sectionName, alt),
    confidence: sectionName ? 0.8 : 0.4,
  });
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
