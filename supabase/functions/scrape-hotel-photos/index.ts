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

interface SectionInfo {
  name: string;
  description: string;
  details: Record<string, string>; // e.g. { "Tamanho": "45 m²", "Cama": "King" }
  amenities: string[];
}

interface ImageCollection {
  photos: ScrapedPhoto[];
  seen: Set<string>;
  sections: Map<string, SectionInfo>;
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

    const collection: ImageCollection = { photos: [], seen: new Set(), sections: new Map() };

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
// Full-site navigation: Map → Categorize → Scrape all pages
// ═══════════════════════════════════════════════

interface CategorizedPage {
  url: string;
  inferredSection: string; // pre-inferred section name from URL/path
}

/**
 * Use Firecrawl Map to discover ALL pages on the hotel website.
 */
async function mapEntireSite(mainUrl: string | undefined, apiKey: string): Promise<string[]> {
  if (!mainUrl) return [];
  try {
    const resp = await fetch("https://api.firecrawl.dev/v1/map", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: mainUrl, limit: 200, includeSubdomains: false }),
    });
    if (!resp.ok) {
      console.warn("Map failed, falling back to manual discovery");
      return [mainUrl];
    }
    const data = await resp.json();
    const urls: string[] = data.links || [];
    // Filter to same domain
    const baseDomain = new URL(mainUrl).hostname;
    return urls.filter(u => {
      try { return new URL(u).hostname === baseDomain; } catch { return false; }
    });
  } catch (e) {
    console.warn("Map error:", e);
    return [mainUrl];
  }
}

/**
 * Categorize discovered pages by relevance for hotel photos.
 * Priority: rooms/suites > gallery > restaurant/spa/facilities > other
 */
function categorizePages(urls: string[], mainUrl: string | undefined): {
  priority: CategorizedPage[];
  gallery: CategorizedPage[];
  other: CategorizedPage[];
} {
  const priority: CategorizedPage[] = [];
  const gallery: CategorizedPage[] = [];
  const other: CategorizedPage[] = [];

  const roomKeywords = ["room", "suite", "accommodation", "camera", "chambre", "zimmer", "quarto", "habitacion", "camere"];
  const galleryKeywords = ["gallery", "galeria", "photo", "foto", "image", "media", "virtual-tour"];
  const facilityKeywords = [
    "restaurant", "ristorante", "dining", "bar", "lounge",
    "spa", "wellness", "pool", "piscina",
    "fitness", "gym", "academia",
    "meeting", "event", "wedding",
    "garden", "terrace", "rooftop",
    "experience", "service", "facility", "amenities",
  ];

  // Skip these pages entirely
  const skipKeywords = [
    "book", "reserv", "checkout", "cart", "login", "account", "profile",
    "privacy", "cookie", "legal", "terms", "conditions", "sitemap",
    "career", "job", "press", "news", "blog", "faq", "contact",
    "xml", "json", "api", "feed", "rss", ".pdf", ".doc",
  ];

  for (const url of urls) {
    const lower = url.toLowerCase();
    if (url === mainUrl) continue; // handled separately
    if (skipKeywords.some(k => lower.includes(k))) continue;

    const path = new URL(url).pathname.toLowerCase();
    const pathSegments = path.split("/").filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1] || "";

    // Infer a section name from the URL path
    let inferredSection = "";
    if (pathSegments.length > 0) {
      // Use last meaningful segment as section context hint
      inferredSection = lastSegment
        .replace(/[-_]/g, " ")
        .replace(/\.\w+$/, "")
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }

    if (roomKeywords.some(k => lower.includes(k))) {
      priority.push({ url, inferredSection });
    } else if (galleryKeywords.some(k => lower.includes(k))) {
      gallery.push({ url, inferredSection });
    } else if (facilityKeywords.some(k => lower.includes(k))) {
      other.push({ url, inferredSection });
    }
    // Pages that don't match any keyword are skipped (about, history, etc.)
  }

  return { priority, gallery, other };
}

/**
 * Scrape a single page and extract high-res images with section context.
 */
async function scrapePageForPhotos(
  url: string,
  inferredSection: string,
  collection: ImageCollection,
  apiKey: string,
  hotelName: string
) {
  try {
    const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["html"], onlyMainContent: false, waitFor: 3000 }),
    });
    if (!resp.ok) return;
    const data = await resp.json();
    const html = data.data?.html || data.html || "";
    if (html.length < 300) return;

    // First try structured extraction (headings → images)
    extractImagesWithSectionContext(html, url, collection, hotelName);

    // Also extract any images that might not be under headings
    // Use the inferred section name from URL if no heading context was found
    const photosBeforeOrphan = collection.photos.length;
    extractHighResImages(html, url, collection, "");

    // For orphan images (added without section), apply the inferred section
    if (inferredSection) {
      for (let i = photosBeforeOrphan; i < collection.photos.length; i++) {
        if (!collection.photos[i].section_name) {
          collection.photos[i].section_name = inferredSection;
          collection.photos[i].confidence = 0.7;
        }
      }
    }
  } catch (e) {
    console.warn(`Failed scraping ${url}:`, e);
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
