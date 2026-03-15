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

    const mainUrl = officialResult?.url || results[0]?.url;
    const collection: ImageCollection = { photos: [], seen: new Set() };

    // ── Step 3: Scrape rooms/accommodation pages with SECTION CONTEXT ──
    // This is the KEY part: we parse the HTML to associate each image with its section heading
    await scrapeRoomsPagesWithContext(mainUrl, collection, FIRECRAWL_API_KEY, hotel_name);

    // ── Step 4: If rooms pages didn't yield much, scrape the main page too ──
    if (collection.photos.length < 5 && mainUrl) {
      console.log("Few photos from rooms pages, scraping main URL...");
      await scrapePageWithContext(mainUrl, collection, FIRECRAWL_API_KEY, hotel_name);
    }

    // If still few images, collect from search results markdown
    if (collection.photos.length < 10) {
      console.log(`Only ${collection.photos.length} photos, collecting from search results...`);
      if (officialResult) {
        collectImagesFromMarkdown(officialResult.markdown || "", officialResult.url || "", collection, officialDomain);
      }
      for (const result of results) {
        if (result === officialResult) continue;
        collectImagesFromMarkdown(result.markdown || "", result.url || "", collection, null);
      }
    }

    console.log(`Found ${collection.photos.length} candidate images`);

    // ── Step 5: Filter and return ──
    const photos = collection.photos
      .filter(img => {
        const url = img.url.toLowerCase();
        if (url.includes("icon") || url.includes("logo") || url.includes("sprite")) return false;
        if (url.includes("1x1") || url.includes("pixel") || url.includes("tracking")) return false;
        return /\.(jpg|jpeg|png|webp|avif)(\?|$)/i.test(img.url) && img.url.length > 50;
      })
      .slice(0, 60)
      .map(img => ({
        url: standardizeImageUrl(img.url),
        alt: img.alt || `${hotel_name} foto`,
        section_name: img.section_name,
        category: inferCategory(img.section_name, img.alt),
        confidence: img.section_name ? 0.95 : 0.5,
      }));

    // Extract unique room/section names found
    const roomNames = [...new Set(photos.map(p => p.section_name).filter(Boolean))];
    console.log(`Returning ${photos.length} photos with ${roomNames.length} sections:`, roomNames);

    return new Response(
      JSON.stringify({ success: true, photos, source_url: mainUrl || "", room_names: roomNames }),
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
 * KEY FUNCTION: Parse HTML and associate each image with its closest preceding heading.
 * This gives us the REAL room/section name directly from the hotel site structure.
 */
function extractImagesWithSectionContext(html: string, sourceUrl: string, collection: ImageCollection, hotelName: string) {
  // Strategy: Split HTML by heading tags. Each section = heading + content with images.
  // The heading gives us the section name, and all images in that content belong to it.

  // First, find all headings and their positions
  const headingRegex = /<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/gi;
  const imgRegex = /(?:src|data-src|data-lazy-src|data-original|data-bg)\s*=\s*["']([^"']+\.(?:jpg|jpeg|png|webp|avif)[^"']*)["']/gi;
  const altRegex = /alt\s*=\s*["']([^"']{3,120})["']/i;

  interface Section {
    name: string;
    startIdx: number;
    endIdx: number;
  }

  // Collect all headings with positions
  const sections: Section[] = [];
  let hMatch;
  while ((hMatch = headingRegex.exec(html)) !== null) {
    const rawHeading = hMatch[2].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#\d+;/g, " ").trim();
    if (rawHeading.length >= 3 && rawHeading.length <= 100) {
      // Skip generic navigation headings
      const lower = rawHeading.toLowerCase();
      if (!isGenericHeading(lower)) {
        sections.push({ name: rawHeading, startIdx: hMatch.index, endIdx: 0 });
      }
    }
  }

  // Set endIdx for each section (start of next section or end of HTML)
  for (let i = 0; i < sections.length; i++) {
    sections[i].endIdx = i < sections.length - 1 ? sections[i + 1].startIdx : html.length;
  }

  // Also try to capture images from structured containers (div/article/section with data attributes or class names)
  // that contain both a title element and images
  extractFromStructuredContainers(html, sourceUrl, collection);

  // Process each section: extract images that appear within it
  for (const section of sections) {
    const sectionHtml = html.substring(section.startIdx, section.endIdx);
    let iMatch;
    const sectionImgRegex = new RegExp(imgRegex.source, "gi");

    while ((iMatch = sectionImgRegex.exec(sectionHtml)) !== null) {
      const imgUrl = iMatch[1].trim();
      if (!isRelevantImage(imgUrl)) continue;
      const absUrl = makeAbsolute(imgUrl, sourceUrl);
      if (collection.seen.has(absUrl)) continue;
      collection.seen.add(absUrl);

      // Try to find alt text near this image
      const nearbyHtml = sectionHtml.substring(Math.max(0, iMatch.index - 100), iMatch.index + 300);
      const altText = altRegex.exec(nearbyHtml)?.[1] || "";

      collection.photos.push({
        url: absUrl,
        alt: altText || section.name,
        section_name: section.name,
        category: inferCategory(section.name, altText),
        confidence: 0.95,
      });
    }
  }

  // Also collect images NOT under any heading (e.g., hero images, gallery sliders)
  if (sections.length > 0) {
    // Images before the first heading
    const preHeadingHtml = html.substring(0, sections[0].startIdx);
    extractOrphanImages(preHeadingHtml, sourceUrl, collection, hotelName);
  } else {
    // No headings found, extract all images with alt-text context
    extractOrphanImages(html, sourceUrl, collection, hotelName);
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

function extractOrphanImages(html: string, sourceUrl: string, collection: ImageCollection, hotelName: string) {
  const imgRegex = /(?:src|data-src|data-lazy-src|data-original)\s*=\s*["']([^"']+\.(?:jpg|jpeg|png|webp|avif)[^"']*)["']/gi;
  const altRegex = /alt\s*=\s*["']([^"']{3,120})["']/i;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const imgUrl = match[1].trim();
    if (!isRelevantImage(imgUrl)) continue;
    const absUrl = makeAbsolute(imgUrl, sourceUrl);
    if (collection.seen.has(absUrl)) continue;
    collection.seen.add(absUrl);

    const nearbyHtml = html.substring(Math.max(0, match.index - 100), match.index + 300);
    const altText = altRegex.exec(nearbyHtml)?.[1] || "";

    // Use alt text as section_name if it looks meaningful
    const sectionName = (altText && altText.length > 3 && !isGenericAlt(altText))
      ? altText
      : "";

    collection.photos.push({
      url: absUrl,
      alt: altText || hotelName,
      section_name: sectionName,
      category: inferCategory(sectionName, altText),
      confidence: sectionName ? 0.7 : 0.4,
    });
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
