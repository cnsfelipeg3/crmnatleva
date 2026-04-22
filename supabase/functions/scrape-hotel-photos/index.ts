import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizeHotelNameForCache(name: string): string {
  return name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "");
}

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

interface ScrapedPhoto {
  url: string;
  alt: string;
  section_name: string;
  category: string;
  confidence: number;
  source: "official" | "booking" | "google";
  html_context?: string; // surrounding HTML context for AI classification
}

interface SectionInfo {
  name: string;
  description: string;
  details: Record<string, string>;
  amenities: string[];
}

interface ImageCollection {
  photos: ScrapedPhoto[];
  seen: Set<string>;
  sections: Map<string, SectionInfo>;
}

interface BookingRoomData {
  name: string;
  photos: string[];
  details: Record<string, string>;
  amenities: string[];
}

interface RoomRegistryEntry {
  name: string;
  normalized: string;
  source_url: string;
  text_evidence: {
    heading?: string;
    description?: string;
    amenities?: string[];
    slug?: string;
  };
  confidence: number;
  category: string;
}

// ═══════════════════════════════════════════════
// Main handler
// ═══════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { hotel_name, hotel_city, hotel_country, force_refresh } = await req.json();

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

    const normalizedName = normalizeHotelNameForCache(hotel_name);
    const supabaseAdmin = getSupabaseAdmin();

    // ── CHECK CACHE (unless force_refresh) ──
    if (!force_refresh) {
      const { data: cached } = await supabaseAdmin
        .from("hotel_media_cache")
        .select("*")
        .eq("hotel_name_normalized", normalizedName)
        .maybeSingle();

      if (cached && cached.scrape_result) {
        const ageHours = (Date.now() - new Date(cached.updated_at).getTime()) / (1000 * 60 * 60);
        // Cache valid for 72 hours
        if (ageHours < 72) {
          console.log(`📦 Cache hit for "${hotel_name}" (${ageHours.toFixed(1)}h old, ${cached.photos_count} photos)`);
          const result = cached.scrape_result as any;
          return new Response(JSON.stringify({
            ...result,
            success: true,
            from_cache: true,
            cache_age_hours: Math.round(ageHours * 10) / 10,
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        console.log(`📦 Cache expired for "${hotel_name}" (${ageHours.toFixed(1)}h old), re-scraping...`);
      }
    }

    const locationStr = [hotel_city, hotel_country].filter(Boolean).join(", ");
    const cleanHotelName = hotel_name.replace(/\s*[-–—]\s*(Rod\.|Acesso|Av\.|Rua|R\.).*$/i, "").trim();

    // ═══════════════════════════════════════════════
    // OFFICIAL-SITE-FIRST: scrape official, evaluate, then booking ONLY if needed
    // ═══════════════════════════════════════════════
    console.log("🚀 STEP 1: Scraping OFFICIAL SITE first (primary source)...");

    let official: Awaited<ReturnType<typeof scrapeOfficialSite>> | null = null;
    try {
      official = await scrapeOfficialSite(cleanHotelName, locationStr, hotel_name, FIRECRAWL_API_KEY);
    } catch (e) {
      console.warn("Official scrape failed:", e);
    }

    const collection: ImageCollection = { photos: [], seen: new Set(), sections: new Map() };

    // 1. Add ALL official photos (this is the structural backbone)
    if (official) {
      for (const photo of official.photos) {
        if (!collection.seen.has(normalizeUrlForDedup(photo.url))) {
          collection.seen.add(normalizeUrlForDedup(photo.url));
          collection.photos.push(photo);
        }
      }
      for (const [name, info] of official.sections) {
        collection.sections.set(name, info);
      }
    }

    const officialPhotoCount = collection.photos.length;
    const officialRoomNames = official
      ? [...new Set(official.photos.map(p => p.section_name).filter(Boolean).filter(isLikelyRoomOrFacilityName))]
      : [];

    console.log(`📸 Official site: ${officialPhotoCount} photos, ${officialRoomNames.length} rooms identified`);

    // ═══════════════════════════════════════════════
    // PHASE 1: Build Room Registry from textual evidence (before any image assignment)
    // ═══════════════════════════════════════════════
    const roomRegistry = buildRoomRegistry(collection, hotel_name);
    console.log(`🏷️ PHASE 1 — Room Registry: ${roomRegistry.length} entries: ${roomRegistry.map(r => r.name).join(", ")}`);

    // 2. Extract room names with AI if official data is sparse
    let validatedRoomNames = [...officialRoomNames];
    if (validatedRoomNames.length < 3 && official && official.photos.length > 3) {
      const aiRoomNames = await extractRoomNamesWithAI(cleanHotelName, official.photos, collection);
      if (aiRoomNames.length > 0) {
        validatedRoomNames = [...new Set([...validatedRoomNames, ...aiRoomNames])];
        console.log(`🤖 AI extracted room names: ${aiRoomNames.join(", ")}`);
        // Merge AI-discovered names into registry
        for (const aiName of aiRoomNames) {
          const norm = normalizeStr(aiName);
          if (!roomRegistry.some(r => r.normalized === norm)) {
            roomRegistry.push({
              name: aiName, normalized: norm, source_url: "",
              text_evidence: { heading: aiName },
              confidence: 0.75, category: inferCategory(aiName, ""),
            });
          }
        }
      }
    }

    // 3. BOOKING AS STRICT FALLBACK — only when official is truly insufficient
    const OFFICIAL_MINIMUM_PHOTOS = 15;
    const needsBookingFallback = officialPhotoCount < OFFICIAL_MINIMUM_PHOTOS;
    let booking: Awaited<ReturnType<typeof scrapeBookingCom>> | null = null;

    if (needsBookingFallback) {
      console.log(`⚠️ Official site yielded only ${officialPhotoCount} photos (< ${OFFICIAL_MINIMUM_PHOTOS}). Running Booking.com as FALLBACK...`);
      try {
        booking = await scrapeBookingCom(cleanHotelName, locationStr, hotel_name, FIRECRAWL_API_KEY);
      } catch (e) {
        console.warn("Booking fallback failed:", e);
      }
    } else {
      console.log(`✅ Official site sufficient (${officialPhotoCount} photos). Skipping Booking.com.`);
    }

    // 4. Add Booking data ONLY as labeled supplement (never override official structure)
    if (booking && booking.rooms.length > 0) {
      // Add room names from Booking as supplementary validation only
      const bookingRoomNames = booking.rooms.map(r => r.name);
      validatedRoomNames = [...new Set([...validatedRoomNames, ...bookingRoomNames])];

      const officialCategoryCount: Record<string, number> = {};
      for (const p of collection.photos) {
        officialCategoryCount[p.category || "outro"] = (officialCategoryCount[p.category || "outro"] || 0) + 1;
      }

      for (const room of booking.rooms) {
        const cat = inferCategory(room.name, "");
        const officialHasEnough = (officialCategoryCount[cat] || 0) >= 3;

        // Only add Booking photos for categories the official site doesn't cover well
        if (officialHasEnough && collection.photos.length >= 30) continue;

        for (const photoUrl of room.photos) {
          const dedupKey = normalizeUrlForDedup(photoUrl);
          if (collection.seen.has(dedupKey)) continue;
          if (collection.photos.length > 80) break;

          collection.seen.add(dedupKey);
          collection.photos.push({
            url: photoUrl,
            alt: room.name,
            section_name: `[Booking] ${room.name}`,
            category: cat,
            confidence: 0.7,
            source: "booking",
            html_context: `[FALLBACK] Booking.com: "${room.name}". ${Object.entries(room.details).map(([k,v]) => `${k}: ${v}`).join(", ")}`,
          });
          officialCategoryCount[cat] = (officialCategoryCount[cat] || 0) + 1;
        }

        // Add section details from Booking only if official doesn't have them
        if (!collection.sections.has(room.name) && (Object.keys(room.details).length > 0 || room.amenities.length > 0)) {
          collection.sections.set(room.name, {
            name: room.name,
            description: "",
            details: room.details,
            amenities: room.amenities,
          });
        }
      }
    }

    const bookingCountMerged = collection.photos.filter(p => p.source === "booking").length;
    console.log(`📸 Final merged: ${collection.photos.length} photos (${officialPhotoCount} official, ${bookingCountMerged} booking fallback)`);

    // ═══════════════════════════════════════════════
    // PHASE 2: Re-assign images to the room registry (structure-first, then images)
    // ═══════════════════════════════════════════════
    if (roomRegistry.length > 0) {
      const beforeOrphans = collection.photos.filter(p => !p.section_name || p.section_name === "").length;
      collection.photos = assignPhotosToRegistry(collection.photos, roomRegistry);
      const afterOrphans = collection.photos.filter(p => !p.section_name || p.section_name === "").length;
      console.log(`🏷️ PHASE 2 — Registry assignment: ${beforeOrphans - afterOrphans} orphan photos matched to rooms`);
    }

    // ── Filter, deduplicate, maximize quality, and return ──
    const photos = collection.photos
      .filter(img => {
        const url = img.url.toLowerCase();
        if (url.includes("icon") || url.includes("logo") || url.includes("sprite")) return false;
        if (url.includes("1x1") || url.includes("pixel") || url.includes("tracking")) return false;
        if (isLikelyThumbnail(img.url)) return false;
        return /\.(jpg|jpeg|png|webp|avif)(\?|$)/i.test(img.url) && img.url.length > 50;
      })
      .sort((a, b) => {
        // Official first, then booking
        if (a.source === "official" && b.source !== "official") return -1;
        if (a.source !== "official" && b.source === "official") return 1;
        // Photos with section names first
        if (a.section_name && !b.section_name) return -1;
        if (!a.section_name && b.section_name) return 1;
        return (b.confidence || 0) - (a.confidence || 0);
      })
      .slice(0, 80)
      .map(img => {
        // Sanitize section_name: strip hotel name if it leaked as section
        let sectionName = img.section_name || "";
        const hotelLower = hotel_name.toLowerCase().trim();
        const sectionLower = sectionName.toLowerCase().trim();
        if (sectionLower === hotelLower || sectionLower === cleanHotelName.toLowerCase().trim()) {
          sectionName = "";
        }
        return {
          url: standardizeImageUrl(img.url),
          alt: img.alt || `${hotel_name} foto`,
          section_name: sectionName,
          category: inferCategory(sectionName, img.alt),
          confidence: sectionName ? 0.95 : 0.5,
          source: img.source,
          html_context: img.html_context,
        };
      });

    const roomNames = validatedRoomNames.length > 0 ? validatedRoomNames : [...new Set(photos.map(p => p.section_name).filter(Boolean))];

    // Build section_details
    const rawSectionDetails: Record<string, { description: string; details: Record<string, string>; amenities: string[] }> = {};
    for (const [name, info] of collection.sections) {
      rawSectionDetails[name] = { description: info.description, details: info.details, amenities: info.amenities };
    }

    const sectionDetails = await translateSectionDetails(rawSectionDetails, hotel_name);

    const officialCount = photos.filter(p => p.source === "official").length;
    const bookingCount = photos.filter(p => p.source === "booking").length;
    console.log(`✅ Returning ${photos.length} photos (${officialCount} official, ${bookingCount} booking) with ${roomNames.length} rooms`);

    const officialDomain = official?.sourceUrl ? extractDomain(official.sourceUrl) : null;

    const finalBookingCount = photos.filter(p => p.source === "booking").length;
    const responsePayload = {
      success: true,
      photos,
      source_url: official?.sourceUrl || "",
      room_names: roomNames,
      room_registry: roomRegistry.map(r => ({
        name: r.name, source_url: r.source_url, category: r.category,
        confidence: r.confidence, text_evidence: r.text_evidence,
      })),
      section_details: sectionDetails,
      pages_scraped: official?.pagesScraped || 0,
      total_site_pages: official?.totalPages || 0,
      booking_rooms_found: booking?.rooms.length || 0,
      booking_used_as_fallback: needsBookingFallback && finalBookingCount > 0,
      sources_used: {
        official: (official?.photos.length || 0) > 0,
        booking: finalBookingCount > 0,
      },
    };

    // ── PERSIST TO CACHE (fire-and-forget) ──
    supabaseAdmin
      .from("hotel_media_cache")
      .upsert({
        hotel_name: hotel_name,
        hotel_name_normalized: normalizedName,
        official_domain: officialDomain,
        domain_confidence: officialDomain ? 80 : 0,
        scrape_result: responsePayload,
        photos_count: photos.length,
        rooms_found: roomNames.length,
        source_url: official?.sourceUrl || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "hotel_name_normalized" })
      .then(({ error: cacheErr }) => {
        if (cacheErr) console.warn("Cache write failed:", cacheErr.message);
        else console.log(`💾 Cached "${hotel_name}" (${photos.length} photos, ${roomNames.length} rooms)`);
      });

    return new Response(
      JSON.stringify({ ...responsePayload, from_cache: false }),
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
// OFFICIAL SITE SCRAPING (enhanced with HTML context)
// ═══════════════════════════════════════════════

async function scrapeOfficialSite(
  cleanHotelName: string,
  locationStr: string,
  hotelName: string,
  apiKey: string
): Promise<{ photos: ScrapedPhoto[]; sections: Map<string, SectionInfo>; sourceUrl: string; pagesScraped: number; totalPages: number }> {
  const searchQuery = `${cleanHotelName} ${locationStr} site oficial`;
  console.log("🔍 Searching for official site:", searchQuery);

  const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: searchQuery, limit: 8, scrapeOptions: { formats: ["markdown"] } }),
  });

  const searchData = await searchResponse.json();
  if (!searchResponse.ok) throw new Error(searchData.error || "Erro na busca");

  const results = searchData.data || [];
  if (results.length === 0) throw new Error("Nenhum resultado encontrado");

  const officialResult = findOfficialSite(results, hotelName);
  const mainUrl = officialResult?.url || results[0]?.url;
  const officialDomain = mainUrl ? new URL(mainUrl).hostname : null;
  console.log(`🏨 Official domain: ${officialDomain || "none"} → ${mainUrl}`);

  const collection: ImageCollection = { photos: [], seen: new Set(), sections: new Map() };

  // ── STEP A: Map the entire official site AGGRESSIVELY ──
  let allSiteUrls = await mapEntireSite(mainUrl, apiKey);
  if (allSiteUrls.length < 5 && mainUrl) {
    console.log("⚠️ Map returned few URLs, generating common paths...");
    allSiteUrls = await generateCommonUrls(mainUrl);
  }

  const categorizedPages = categorizePages(allSiteUrls, mainUrl);
  const pagesToScrape = [
    ...categorizedPages.priority,
    ...categorizedPages.gallery,
    ...categorizedPages.other,
  ].slice(0, 30); // Reduced from 50 → 30 to stay within 150s edge timeout

  if (pagesToScrape.length === 0 && mainUrl) {
    pagesToScrape.push({ url: mainUrl, inferredSection: "" });
  }

  console.log(`🕷️ Scraping ${pagesToScrape.length} official pages (${categorizedPages.priority.length} room pages, ${categorizedPages.gallery.length} gallery, ${categorizedPages.other.length} facility)...`);

  // ── STEP B: Scrape pages in batches of 4 ──
  const batchSize = 4;
  const discoveredLinks = new Set<string>();
  const scrapedUrls = new Set<string>();

  for (let i = 0; i < pagesToScrape.length; i += batchSize) {
    const batch = pagesToScrape.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(page => scrapePageForPhotosWithLinks(page.url, page.inferredSection, collection, apiKey, hotelName, "official"))
    );
    for (const r of batchResults) {
      if (r.status === "fulfilled" && r.value) {
        scrapedUrls.add(r.value.url);
        for (const link of r.value.discoveredLinks) discoveredLinks.add(link);
      }
    }
  }

  // ── STEP C: SECOND PASS — follow discovered links to room/gallery pages not yet scraped ──
  const officialDomainForLinks = mainUrl ? new URL(mainUrl).hostname : "";
  const secondPassPages: CategorizedPage[] = [];
  for (const link of discoveredLinks) {
    if (scrapedUrls.has(link)) continue;
    if (pagesToScrape.some(p => p.url === link)) continue;
    try {
      const linkDomain = new URL(link).hostname;
      if (linkDomain !== officialDomainForLinks) continue;
    } catch { continue; }
    const lower = link.toLowerCase();
    if (/room|suite|villa|accommodation|gallery|photo|camera|chambre|zimmer|客室|お部屋/i.test(lower)) {
      const seg = new URL(link).pathname.split("/").filter(Boolean).pop() || "";
      secondPassPages.push({ url: link, inferredSection: seg.replace(/[-_]/g, " ").replace(/\.\w+$/, "").split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") });
    }
  }

  if (secondPassPages.length > 0) {
    const extraPages = secondPassPages.slice(0, 20);
    console.log(`🔍 SECOND PASS: Found ${secondPassPages.length} new room/gallery links, scraping ${extraPages.length}...`);
    for (let i = 0; i < extraPages.length; i += batchSize) {
      const batch = extraPages.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(page => scrapePageForPhotos(page.url, page.inferredSection, collection, apiKey, hotelName, "official"))
      );
    }
  }

  // ── STEP D: Scrape main URL if not already done ──
  if (mainUrl && !scrapedUrls.has(mainUrl) && !pagesToScrape.some(p => p.url === mainUrl)) {
    await scrapePageForPhotos(mainUrl, "", collection, apiKey, hotelName, "official");
  }

  // ── STEP E: Fallback from search results if still sparse ──
  if (collection.photos.length < 10) {
    console.log("⚠️ Very few photos from official pages, extracting from search results...");
    if (officialResult) collectImagesFromMarkdown(officialResult.markdown || "", officialResult.url || "", collection, officialDomain, "official");
    for (const result of results) {
      if (result === officialResult) continue;
      collectImagesFromMarkdown(result.markdown || "", result.url || "", collection, null, "official");
    }
  }

  const totalScraped = pagesToScrape.length + secondPassPages.filter((_, i) => i < 20).length;
  return {
    photos: collection.photos,
    sections: collection.sections,
    sourceUrl: mainUrl || "",
    pagesScraped: totalScraped,
    totalPages: allSiteUrls.length + discoveredLinks.size,
  };
}

// ═══════════════════════════════════════════════
// BOOKING.COM SCRAPING (room names + fallback photos)
// ═══════════════════════════════════════════════

async function scrapeBookingCom(
  cleanHotelName: string,
  locationStr: string,
  hotelName: string,
  apiKey: string
): Promise<{ rooms: BookingRoomData[] }> {
  // Search for the hotel on Booking.com
  const searchQuery = `site:booking.com ${cleanHotelName} ${locationStr} hotel`;
  console.log("🔍 Searching Booking.com for:", searchQuery);

  const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: searchQuery, limit: 5, scrapeOptions: { formats: ["markdown", "html"] } }),
  });

  const searchData = await searchResponse.json();
  if (!searchResponse.ok) {
    console.warn("Booking search failed:", searchData.error);
    return { rooms: [] };
  }

  const results = searchData.data || [];
  const bookingResult = results.find((r: any) => r.url && r.url.includes("booking.com/hotel"));
  if (!bookingResult) {
    console.log("❌ No Booking.com result found");
    return { rooms: [] };
  }

  console.log(`📖 Found Booking page: ${bookingResult.url}`);

  // Scrape the Booking.com page for structured room data
  let html = bookingResult.html || "";
  let markdown = bookingResult.markdown || "";

  // If we don't have HTML from search, scrape the page directly
  if (html.length < 500) {
    try {
      const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: bookingResult.url, formats: ["html", "markdown"], onlyMainContent: false, waitFor: 3000 }),
      });
      if (scrapeResp.ok) {
        const scrapeData = await scrapeResp.json();
        html = scrapeData.data?.html || scrapeData.html || html;
        markdown = scrapeData.data?.markdown || scrapeData.markdown || markdown;
      }
    } catch (e) {
      console.warn("Booking.com scrape failed:", e);
    }
  }

  const rooms = extractBookingRoomData(html, markdown, bookingResult.url);
  console.log(`🏨 Booking.com: Found ${rooms.length} room types: ${rooms.map(r => r.name).join(", ")}`);
  return { rooms };
}

/**
 * Extract structured room data from Booking.com HTML/Markdown.
 * Booking has a well-structured room listing with names, photos, and details.
 */
function extractBookingRoomData(html: string, markdown: string, sourceUrl: string): BookingRoomData[] {
  const rooms: BookingRoomData[] = [];
  const seenRoomNames = new Set<string>();

  // Strategy 1: Extract from HTML structure
  // Booking uses data-room-id or class patterns like "hprt-table", "room_header", "rt-photo-cell"
  
  // Extract room names from headings and spans
  const roomNamePatterns = [
    /<(?:h[1-4]|span|a)[^>]*class="[^"]*(?:hprt-roomtype|room_link|room-header|room_title|roomType)[^"]*"[^>]*>([^<]{3,80})</gi,
    /<(?:h[1-4])[^>]*>\s*<a[^>]*>\s*([^<]{3,80})<\/a>/gi,
    /data-room-name="([^"]{3,80})"/gi,
  ];

  for (const pattern of roomNamePatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const name = match[1].replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/<[^>]+>/g, "").trim();
      if (name.length >= 3 && name.length <= 80 && !seenRoomNames.has(name.toLowerCase())) {
        seenRoomNames.add(name.toLowerCase());
        rooms.push({ name, photos: [], details: {}, amenities: [] });
      }
    }
  }

  // Strategy 2: Extract from markdown (more reliable for text)
  const mdRoomPattern = /#{1,4}\s+(.+?)(?:\n|$)/g;
  let mdMatch;
  while ((mdMatch = mdRoomPattern.exec(markdown)) !== null) {
    const heading = mdMatch[1].replace(/\*+/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
    if (heading.length >= 3 && heading.length <= 80 && !seenRoomNames.has(heading.toLowerCase())) {
      // Only add if it looks like a room name (not generic heading)
      const lower = heading.toLowerCase();
      if (/room|suite|studio|deluxe|superior|standard|classic|twin|double|single|king|queen|penthouse|villa|bungalow|apartment|junior|executive|premium|comfort|economy|family|cottage|chalet|loft/i.test(lower)) {
        seenRoomNames.add(lower);
        rooms.push({ name: heading, photos: [], details: {}, amenities: [] });
      }
    }
  }

  // Strategy 3: Extract photos from bstatic.com (Booking's CDN)
  const bookingPhotoRegex = /(?:src|data-src|srcset)\s*=\s*["']([^"']*bstatic\.com[^"']*\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi;
  const allBookingPhotos: string[] = [];
  let photoMatch;
  while ((photoMatch = bookingPhotoRegex.exec(html)) !== null) {
    let url = photoMatch[1].trim();
    // Get the highest resolution: remove /max\d+/ or replace with max1280
    url = url.replace(/\/max\d+\//, "/max1280/");
    url = url.replace(/\/square\d+\//, "/max1280/");
    if (url.startsWith("//")) url = "https:" + url;
    if (!allBookingPhotos.includes(url) && !isLikelyThumbnail(url)) {
      allBookingPhotos.push(url);
    }
  }

  // Also extract from markdown image links
  const mdImgRegex = /!\[([^\]]*)\]\(([^)]*bstatic\.com[^)]*)\)/gi;
  while ((photoMatch = mdImgRegex.exec(markdown)) !== null) {
    let url = photoMatch[2].trim();
    url = url.replace(/\/max\d+\//, "/max1280/");
    if (url.startsWith("//")) url = "https:" + url;
    if (!allBookingPhotos.includes(url) && !isLikelyThumbnail(url)) {
      allBookingPhotos.push(url);
    }
  }

  // Try to associate photos with rooms using proximity in HTML
  // For each room, find photos near its heading in the HTML
  for (const room of rooms) {
    const roomIdx = html.toLowerCase().indexOf(room.name.toLowerCase());
    if (roomIdx === -1) continue;
    
    // Look for bstatic photos within ~5000 chars after the room name
    const nearbyHtml = html.substring(roomIdx, roomIdx + 5000);
    const nearbyPhotos: string[] = [];
    let nearMatch;
    const nearRegex = /(?:src|data-src)\s*=\s*["']([^"']*bstatic\.com[^"']*\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi;
    while ((nearMatch = nearRegex.exec(nearbyHtml)) !== null) {
      let url = nearMatch[1].trim();
      url = url.replace(/\/max\d+\//, "/max1280/");
      if (url.startsWith("//")) url = "https:" + url;
      if (!nearbyPhotos.includes(url) && !isLikelyThumbnail(url)) {
        nearbyPhotos.push(url);
      }
    }
    room.photos = nearbyPhotos.slice(0, 5); // Max 5 photos per room from Booking

    // Extract room details from nearby text
    const nearbyText = markdown.substring(
      Math.max(0, markdown.toLowerCase().indexOf(room.name.toLowerCase())),
      Math.min(markdown.length, markdown.toLowerCase().indexOf(room.name.toLowerCase()) + 2000)
    );

    // Size
    const sizeMatch = nearbyText.match(/(\d{2,4})\s*(?:m²|m2|sqm|sq\.?\s*(?:m|ft))/i);
    if (sizeMatch) room.details["Tamanho"] = `${sizeMatch[1]} m²`;

    // Bed type
    const bedMatch = nearbyText.match(/(?:bed|cama|lit)\s*[:：]?\s*(\d+\s*(?:king|queen|twin|double|single|casal|solteiro)[^,.\n]{0,30})/i);
    if (bedMatch) room.details["Cama"] = bedMatch[1].trim();

    // Guests
    const guestMatch = nearbyText.match(/(?:sleep|hóspede|guest|person|adulto)\s*[:：]?\s*(\d+)/i);
    if (guestMatch) room.details["Capacidade"] = `Até ${guestMatch[1]} hóspedes`;

    // Amenities from bullet lists
    const amenityRegex = /[-•*]\s+([^-•*\n]{4,60})/g;
    let amenMatch;
    while ((amenMatch = amenityRegex.exec(nearbyText)) !== null) {
      const item = amenMatch[1].trim();
      if (item.length > 3 && item.length < 60 && !room.amenities.includes(item)) {
        room.amenities.push(item);
      }
    }
  }

  // Distribute unassociated photos to rooms that have none
  const unassociatedPhotos = allBookingPhotos.filter(url => !rooms.some(r => r.photos.includes(url)));
  let photoIdx = 0;
  for (const room of rooms) {
    if (room.photos.length === 0 && photoIdx < unassociatedPhotos.length) {
      room.photos.push(unassociatedPhotos[photoIdx]);
      photoIdx++;
    }
  }

  // If no rooms were identified but we have photos, create a generic room entry
  if (rooms.length === 0 && allBookingPhotos.length > 0) {
    rooms.push({
      name: "Hotel Photos",
      photos: allBookingPhotos.slice(0, 10),
      details: {},
      amenities: [],
    });
  }

  return rooms;
}

// ═══════════════════════════════════════════════
// Full-site navigation: Map → Categorize → Scrape
// ═══════════════════════════════════════════════

interface CategorizedPage {
  url: string;
  inferredSection: string;
}

async function mapEntireSite(mainUrl: string | undefined, apiKey: string): Promise<string[]> {
  if (!mainUrl) return [];
  try {
    const resp = await fetch("https://api.firecrawl.dev/v1/map", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: mainUrl, limit: 500, includeSubdomains: false }),
    });
    if (!resp.ok) return [mainUrl];
    const data = await resp.json();
    const urls: string[] = data.links || [];
    const baseDomain = new URL(mainUrl).hostname;
    return urls.filter(u => { try { return new URL(u).hostname === baseDomain; } catch { return false; } });
  } catch { return [mainUrl]; }
}

async function generateCommonUrls(mainUrl: string): Promise<string[]> {
  const commonPaths = [
    "/rooms", "/suites", "/accommodation", "/accommodations",
    "/dining", "/restaurant", "/restaurants",
    "/spa", "/wellness",
    "/gallery", "/photos", "/photo-gallery", "/media",
    "/facilities", "/amenities", "/experiences",
    "/pool", "/fitness", "/meetings", "/events",
    "/guest-rooms", "/guestrooms",
    "/en/rooms", "/en/dining", "/en/spa", "/en/gallery",
    "/en/accommodation", "/en/facilities", "/en/experiences",
  ];
  const base = new URL(mainUrl);
  const generatedUrls = commonPaths.map(p => base.origin + p);
  const validUrls: string[] = [mainUrl];
  const headChecks = await Promise.allSettled(
    generatedUrls.map(async (url) => {
      try {
        const resp = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(5000) });
        if (resp.ok || resp.status === 301 || resp.status === 302) return url;
      } catch { /* skip */ }
      return null;
    })
  );
  for (const result of headChecks) {
    if (result.status === "fulfilled" && result.value) validUrls.push(result.value);
  }
  return validUrls;
}

function categorizePages(urls: string[], mainUrl: string | undefined): {
  priority: CategorizedPage[];
  gallery: CategorizedPage[];
  other: CategorizedPage[];
} {
  const priority: CategorizedPage[] = [];
  const gallery: CategorizedPage[] = [];
  const other: CategorizedPage[] = [];

  const roomKeywords = [
    "room", "suite", "accommodation", "camera", "chambre", "zimmer", "quarto", "habitacion", "camere",
    "客室", "お部屋", "ルーム", "スイート", "和室", "洋室", "和洋室", "guestroom",
  ];
  const galleryKeywords = ["gallery", "galeria", "photo", "foto", "image", "media", "virtual-tour", "ギャラリー", "写真"];
  const facilityKeywords = [
    "restaurant", "ristorante", "dining", "bar", "lounge",
    "spa", "wellness", "pool", "piscina", "fitness", "gym", "academia",
    "meeting", "event", "wedding", "garden", "terrace", "rooftop",
    "experience", "service", "facility", "amenities",
    "レストラン", "ダイニング", "温泉", "大浴場", "スパ", "プール", "フィットネス",
    "宴会", "ウェディング", "庭園", "施設",
  ];
  const skipKeywords = [
    "book", "reserv", "checkout", "cart", "login", "account", "profile",
    "privacy", "cookie", "legal", "terms", "conditions", "sitemap",
    "career", "job", "press", "news", "blog", "faq", "contact",
    "xml", "json", "api", "feed", "rss", ".pdf", ".doc",
  ];

  for (const url of urls) {
    const lower = url.toLowerCase();
    if (url === mainUrl) continue;
    if (skipKeywords.some(k => lower.includes(k))) continue;

    const path = new URL(url).pathname.toLowerCase();
    const pathSegments = path.split("/").filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1] || "";
    let inferredSection = lastSegment.replace(/[-_]/g, " ").replace(/\.\w+$/, "")
      .split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

    if (roomKeywords.some(k => lower.includes(k))) priority.push({ url, inferredSection });
    else if (galleryKeywords.some(k => lower.includes(k))) gallery.push({ url, inferredSection });
    else if (facilityKeywords.some(k => lower.includes(k))) other.push({ url, inferredSection });
  }

  return { priority, gallery, other };
}

/**
 * Scrape a single page — now captures HTML CONTEXT around each image for AI classification.
 */
async function scrapePageForPhotos(
  url: string,
  inferredSection: string,
  collection: ImageCollection,
  apiKey: string,
  hotelName: string,
  source: "official" | "booking" | "google"
) {
  try {
    const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["html", "markdown"], onlyMainContent: false, waitFor: 3000 }),
    });
    if (!resp.ok) return;
    const data = await resp.json();
    const html = data.data?.html || data.html || "";
    const markdown = data.data?.markdown || data.markdown || "";
    if (html.length < 300) return;

    // Enhanced extraction with HTML context
    extractImagesWithSectionContext(html, url, collection, hotelName, source);
    extractSectionDescriptions(markdown, collection);

    const photosBeforeOrphan = collection.photos.length;
    extractHighResImages(html, url, collection, "", source);

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
 * Same as scrapePageForPhotos but also returns discovered internal links for second-pass crawling.
 */
async function scrapePageForPhotosWithLinks(
  url: string,
  inferredSection: string,
  collection: ImageCollection,
  apiKey: string,
  hotelName: string,
  source: "official" | "booking" | "google"
): Promise<{ url: string; discoveredLinks: string[] } | null> {
  try {
    const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["html", "markdown", "links"], onlyMainContent: false, waitFor: 3000 }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const html = data.data?.html || data.html || "";
    const markdown = data.data?.markdown || data.markdown || "";
    if (html.length < 300) return { url, discoveredLinks: [] };

    extractImagesWithSectionContext(html, url, collection, hotelName, source);
    extractSectionDescriptions(markdown, collection);

    const photosBeforeOrphan = collection.photos.length;
    extractHighResImages(html, url, collection, "", source);

    if (inferredSection) {
      for (let i = photosBeforeOrphan; i < collection.photos.length; i++) {
        if (!collection.photos[i].section_name) {
          collection.photos[i].section_name = inferredSection;
          collection.photos[i].confidence = 0.7;
        }
      }
    }

    // Extract internal links for deeper discovery
    const pageLinks: string[] = data.data?.links || data.links || [];
    // Also extract href links from HTML for room/gallery pages
    const hrefRegex = /href=["']([^"']+)["']/gi;
    let hrefMatch;
    while ((hrefMatch = hrefRegex.exec(html)) !== null) {
      const href = hrefMatch[1];
      if (href && !href.startsWith("#") && !href.startsWith("javascript")) {
        try {
          const absLink = href.startsWith("http") ? href : new URL(href, url).href;
          pageLinks.push(absLink);
        } catch { /* skip */ }
      }
    }

    return { url, discoveredLinks: [...new Set(pageLinks)] };
  } catch (e) {
    console.warn(`Failed scraping ${url}:`, e);
    return null;
  }
}

/**
 * Extract images with rich HTML context for AI classification.
 * Captures: parent heading, alt text, surrounding captions, nearby text, CSS classes.
 */
function extractImagesWithSectionContext(
  html: string,
  sourceUrl: string,
  collection: ImageCollection,
  hotelName: string,
  source: "official" | "booking" | "google"
) {
  const headingRegex = /<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/gi;

  interface Section { name: string; startIdx: number; endIdx: number; }
  const sections: Section[] = [];
  let hMatch;
  while ((hMatch = headingRegex.exec(html)) !== null) {
    const rawHeading = hMatch[2].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#\d+;/g, " ").trim();
    if (rawHeading.length >= 3 && rawHeading.length <= 100 && !isGenericHeading(rawHeading.toLowerCase())) {
      sections.push({ name: rawHeading, startIdx: hMatch.index, endIdx: 0 });
    }
  }
  for (let i = 0; i < sections.length; i++) {
    sections[i].endIdx = i < sections.length - 1 ? sections[i + 1].startIdx : html.length;
  }

  extractFromStructuredContainers(html, sourceUrl, collection, source);

  for (const section of sections) {
    const sectionHtml = html.substring(section.startIdx, section.endIdx);
    extractHighResImagesWithContext(sectionHtml, sourceUrl, collection, section.name, source);
  }

  if (sections.length > 0) {
    const preHeadingHtml = html.substring(0, sections[0].startIdx);
    extractHighResImages(preHeadingHtml, sourceUrl, collection, "", source);
  } else {
    extractHighResImages(html, sourceUrl, collection, "", source);
  }
}

/**
 * Enhanced image extraction that captures surrounding HTML context (captions, figcaption, nearby text).
 */
function extractHighResImagesWithContext(
  html: string,
  sourceUrl: string,
  collection: ImageCollection,
  sectionName: string,
  source: "official" | "booking" | "google"
) {
  const imgTagRegex = /<img[^>]+>/gi;
  let tagMatch;
  while ((tagMatch = imgTagRegex.exec(html)) !== null) {
    const tag = tagMatch[0];
    const bestUrl = getBestImageUrl(tag, sourceUrl);
    if (!bestUrl || !isRelevantImage(bestUrl)) continue;
    if (collection.seen.has(normalizeUrlForDedup(bestUrl))) continue;
    if (isLikelyThumbnail(bestUrl)) continue;

    collection.seen.add(normalizeUrlForDedup(bestUrl));

    const altMatch = tag.match(/alt\s*=\s*["']([^"']{3,120})["']/i);
    const altText = altMatch?.[1] || "";
    const titleMatch = tag.match(/title\s*=\s*["']([^"']{3,120})["']/i);
    const titleText = titleMatch?.[1] || "";

    // Capture HTML context: look for figcaption, caption, or nearby text
    const imgIdx = tagMatch.index;
    const contextStart = Math.max(0, imgIdx - 300);
    const contextEnd = Math.min(html.length, imgIdx + tag.length + 300);
    const surroundingHtml = html.substring(contextStart, contextEnd);

    // Extract figcaption
    const figcaptionMatch = surroundingHtml.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
    const caption = figcaptionMatch?.[1]?.replace(/<[^>]+>/g, "").trim() || "";

    // Extract nearby paragraph text
    const nearbyPMatch = surroundingHtml.match(/<p[^>]*>([^<]{10,200})<\/p>/i);
    const nearbyText = nearbyPMatch?.[1]?.trim() || "";

    // Extract class names from parent containers
    const classMatch = surroundingHtml.match(/class="([^"]*(?:room|suite|gallery|photo|image|slider|hero|banner|feature)[^"]*)"/i);
    const cssClasses = classMatch?.[1] || "";

    // Build rich context string
    const contextParts = [
      sectionName ? `Section: "${sectionName}"` : "",
      altText ? `Alt: "${altText}"` : "",
      titleText ? `Title: "${titleText}"` : "",
      caption ? `Caption: "${caption}"` : "",
      nearbyText ? `Nearby text: "${nearbyText.substring(0, 100)}"` : "",
      cssClasses ? `CSS: "${cssClasses}"` : "",
    ].filter(Boolean);
    const htmlContext = contextParts.join(" | ");

    collection.photos.push({
      url: bestUrl,
      alt: altText || caption || titleText || sectionName,
      section_name: sectionName,
      category: inferCategory(sectionName, altText + " " + caption),
      confidence: sectionName ? 0.95 : 0.5,
      source,
      html_context: htmlContext,
    });
  }

  // Background images
  const bgRegex = /(?:data-bg|data-image|style\s*=\s*["'][^"']*url\s*\(\s*["']?)([^"')\s]+\.(?:jpg|jpeg|png|webp|avif)[^"')\s]*)["')\s]*/gi;
  let bgMatch;
  while ((bgMatch = bgRegex.exec(html)) !== null) {
    const imgUrl = bgMatch[1].trim();
    if (!isRelevantImage(imgUrl)) continue;
    const absUrl = makeAbsolute(imgUrl, sourceUrl);
    const dedupKey = normalizeUrlForDedup(absUrl);
    if (collection.seen.has(dedupKey)) continue;
    if (isLikelyThumbnail(absUrl)) continue;
    collection.seen.add(dedupKey);
    collection.photos.push({
      url: absUrl,
      alt: sectionName,
      section_name: sectionName,
      category: inferCategory(sectionName, ""),
      confidence: sectionName ? 0.9 : 0.4,
      source,
      html_context: sectionName ? `Background image in section: "${sectionName}"` : "",
    });
  }
}

function extractHighResImages(html: string, sourceUrl: string, collection: ImageCollection, sectionName: string, source: "official" | "booking" | "google" = "official") {
  extractHighResImagesWithContext(html, sourceUrl, collection, sectionName, source);
}

function extractFromStructuredContainers(html: string, sourceUrl: string, collection: ImageCollection, source: "official" | "booking" | "google") {
  const containerRegex = /<(?:div|article|section|li)[^>]*class="[^"]*(?:room|suite|accommodation|camera|chambre|zimmer)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|article|section|li)>/gi;
  let cMatch;
  while ((cMatch = containerRegex.exec(html)) !== null) {
    const containerHtml = cMatch[1];
    const nameMatch = containerHtml.match(/<(?:h[1-6]|strong|span[^>]*class="[^"]*title[^"]*")[^>]*>([^<]{3,80})<\//i);
    if (!nameMatch) continue;
    const roomName = nameMatch[1].replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim();
    if (roomName.length < 3 || isGenericHeading(roomName.toLowerCase())) continue;

    const imgRegex2 = /(?:src|data-src)\s*=\s*["']([^"']+\.(?:jpg|jpeg|png|webp|avif)[^"']*)["']/gi;
    let iMatch;
    while ((iMatch = imgRegex2.exec(containerHtml)) !== null) {
      const imgUrl = iMatch[1].trim();
      if (!isRelevantImage(imgUrl)) continue;
      const absUrl = makeAbsolute(imgUrl, sourceUrl);
      const dedupKey = normalizeUrlForDedup(absUrl);
      if (collection.seen.has(dedupKey)) continue;
      collection.seen.add(dedupKey);

      // Extract description text from container
      const descMatch = containerHtml.match(/<p[^>]*>([^<]{10,200})<\/p>/i);
      const desc = descMatch?.[1]?.trim() || "";

      collection.photos.push({
        url: absUrl,
        alt: roomName,
        section_name: roomName,
        category: inferCategory(roomName, ""),
        confidence: 0.95,
        source,
        html_context: `Room card: "${roomName}"${desc ? ` | Description: "${desc.substring(0, 100)}"` : ""}`,
      });
    }
  }
}

function extractSectionDescriptions(markdown: string, collection: ImageCollection) {
  if (!markdown || markdown.length < 50) return;
  const lines = markdown.split("\n");
  let currentSection = "";
  let currentText: string[] = [];
  let currentAmenities: string[] = [];
  let currentDetails: Record<string, string> = {};

  const flushSection = () => {
    if (!currentSection || currentSection.length < 3) return;
    const sectionKey = findMatchingSection(currentSection, collection);
    if (!sectionKey) return;
    const desc = currentText.filter(t => t.length > 15 && !isGenericHeading(t.toLowerCase())).slice(0, 3).join(" ").substring(0, 500);
    const existing = collection.sections.get(sectionKey);
    if (existing) {
      if (!existing.description && desc) existing.description = desc;
      if (currentAmenities.length > 0) existing.amenities = [...new Set([...existing.amenities, ...currentAmenities])];
      Object.assign(existing.details, currentDetails);
    } else {
      collection.sections.set(sectionKey, { name: sectionKey, description: desc, details: { ...currentDetails }, amenities: [...currentAmenities] });
    }
  };

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,4}\s+(.+)/);
    if (headingMatch) {
      flushSection();
      currentSection = headingMatch[1].replace(/\*+/g, "").trim();
      currentText = []; currentAmenities = []; currentDetails = {};
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
      const item = trimmed.replace(/^[-*•]\s+/, "").trim();
      if (item.length > 2 && item.length < 80) currentAmenities.push(item);
      continue;
    }
    const kvMatch = trimmed.match(/^([A-Za-zÀ-ÿ\s]{3,25})[:：]\s*(.{2,80})$/);
    if (kvMatch) {
      const key = kvMatch[1].trim(), val = kvMatch[2].trim(), keyLower = key.toLowerCase();
      if (/taman|size|m²|sqm|metr|área|area|dimensi/i.test(keyLower + val)) currentDetails["Tamanho"] = val;
      else if (/cama|bed|lit/i.test(keyLower)) currentDetails["Cama"] = val;
      else if (/capaci|guest|hóspede|ospiti|person|ocupa/i.test(keyLower)) currentDetails["Capacidade"] = val;
      else if (/vista|view|panoram|affaccio/i.test(keyLower)) currentDetails["Vista"] = val;
      else if (/andar|floor|piano/i.test(keyLower)) currentDetails["Andar"] = val;
      else if (key.length >= 3) currentDetails[key] = val;
      continue;
    }
    if (trimmed.length > 15 && !trimmed.startsWith("[") && !trimmed.startsWith("!")) {
      currentText.push(trimmed.replace(/\*+/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"));
    }
    const sizeMatch = trimmed.match(/(\d{2,4})\s*(?:m²|m2|sqm|sq\.?\s*(?:m|ft|feet))/i);
    if (sizeMatch && !currentDetails["Tamanho"]) {
      const unit = trimmed.toLowerCase().includes("ft") ? "sq ft" : "m²";
      currentDetails["Tamanho"] = `${sizeMatch[1]} ${unit}`;
    }
    const guestMatch = trimmed.match(/(?:up to|até|max|maximum|fino a)\s*(\d+)\s*(?:guest|hóspede|ospiti|person|adulto|people)/i);
    if (guestMatch && !currentDetails["Capacidade"]) currentDetails["Capacidade"] = `Até ${guestMatch[1]} hóspedes`;
  }
  flushSection();
}

function findMatchingSection(heading: string, collection: ImageCollection): string | null {
  const headingNorm = normalizeStr(heading);
  const sectionNames = new Set(collection.photos.map(p => p.section_name).filter(Boolean));
  for (const name of sectionNames) { if (normalizeStr(name) === headingNorm) return name; }
  for (const name of sectionNames) {
    const nameNorm = normalizeStr(name);
    if (nameNorm.includes(headingNorm) || headingNorm.includes(nameNorm)) return name;
  }
  for (const [key] of collection.sections) { if (normalizeStr(key) === headingNorm) return key; }
  const lower = heading.toLowerCase();
  if (/room|suite|quarto|camera|chambre|deluxe|superior|standard|penthouse|presidential|royal|spa|pool|piscina|restaurante|restaurant|bar|lounge|gym|fitness|garden|terrace|rooftop|客室|和室|洋室|スイート|レストラン|温泉|スパ|プール|庭園|施設/i.test(lower)) {
    return heading;
  }
  return null;
}

async function translateSectionDetails(
  raw: Record<string, { description: string; details: Record<string, string>; amenities: string[] }>,
  hotelName: string
): Promise<Record<string, { description: string; details: Record<string, string>; amenities: string[] }>> {
  const entries = Object.entries(raw).filter(([_, v]) => v.description || v.amenities.length > 0 || Object.keys(v.details).length > 0);
  if (entries.length === 0) return raw;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return raw;

  try {
    const inputData = Object.fromEntries(entries.map(([name, info]) => [name, {
      description: info.description || "", details: info.details, amenities: info.amenities,
    }]));

    const prompt = `Você é um curador de conteúdo hoteleiro premium. Recebeu dados brutos extraídos do site do hotel "${hotelName}".

Sua tarefa:
1. TRADUZIR todas as descrições, detalhes e comodidades para português brasileiro fluente e elegante.
2. LIMPAR textos bagunçados.
3. REESCREVER as descrições de forma profissional e concisa (máx 2 frases por ambiente).
4. PADRONIZAR chaves: "Tamanho", "Cama", "Capacidade", "Vista", "Andar", "Banheiro".
5. TRADUZIR comodidades para PT-BR.
6. NÃO traduzir nomes dos quartos/ambientes (chaves do objeto).

Dados brutos:
${JSON.stringify(inputData, null, 2)}

Retorne APENAS JSON válido com a MESMA estrutura:
{
  "Nome Original": {
    "description": "Descrição elegante em PT-BR",
    "details": { "Tamanho": "45 m²", "Cama": "King Size" },
    "amenities": ["Wi-Fi gratuito", "Ar-condicionado"]
  }
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "user", content: prompt }] }),
    });

    if (!response.ok) return raw;
    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content || "";
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return raw;
    const translated = JSON.parse(jsonMatch[0]);
    const result = { ...raw };
    for (const [name, info] of Object.entries(translated) as [string, any][]) {
      if (result[name]) {
        result[name] = {
          description: info.description || result[name].description,
          details: info.details || result[name].details,
          amenities: Array.isArray(info.amenities) ? info.amenities : result[name].amenities,
        };
      }
    }
    return result;
  } catch { return raw; }
}

// ═══════════════════════════════════════════════
// Deduplication
// ═══════════════════════════════════════════════

/**
 * Normalize URL for deduplication: strips size params, CDN variants, etc.
 * Two URLs pointing to the same photo at different sizes should deduplicate.
 */
function normalizeUrlForDedup(url: string): string {
  try {
    const u = new URL(url);
    // Remove common size/quality params
    const sizeParams = ["w", "h", "width", "height", "wid", "hei", "resize", "fit", "q", "quality", "qlt", "fm", "fl", "auto", "crop", "downsize", "output-quality"];
    for (const p of sizeParams) u.searchParams.delete(p);
    // Remove WP dimension suffix
    const cleanPath = u.pathname.replace(/\-\d{2,4}x\d{2,4}\./, ".");
    // Remove Cloudinary transforms
    const finalPath = cleanPath.replace(/\/upload\/[^/]+\//, "/upload/");
    // Remove bstatic size dirs
    const bstaticPath = finalPath.replace(/\/max\d+\//, "/").replace(/\/square\d+\//, "/");
    return u.origin + bstaticPath;
  } catch { return url; }
}

// ═══════════════════════════════════════════════
// PHASE 1: Build Room Registry from textual evidence
// ═══════════════════════════════════════════════

function buildRoomRegistry(
  collection: ImageCollection,
  hotelName: string
): RoomRegistryEntry[] {
  const registry: RoomRegistryEntry[] = [];
  const seen = new Set<string>();
  const hotelNorm = normalizeStr(hotelName);

  // Source 1: Collection sections (have descriptions, amenities — strongest signal)
  for (const [name, info] of collection.sections) {
    const norm = normalizeStr(name);
    if (seen.has(norm)) continue;
    if (norm === hotelNorm) continue;
    if (!isLikelyRoomOrFacilityName(name)) continue;
    seen.add(norm);

    registry.push({
      name, normalized: norm, source_url: "",
      text_evidence: {
        heading: name,
        description: info.description || undefined,
        amenities: info.amenities.length > 0 ? info.amenities : undefined,
      },
      confidence: info.description ? 0.95 : 0.85,
      category: inferCategory(name, ""),
    });
  }

  // Source 2: Section names from photos (headings found near images)
  const sectionCounts = new Map<string, number>();
  for (const photo of collection.photos) {
    if (!photo.section_name) continue;
    const norm = normalizeStr(photo.section_name);
    sectionCounts.set(norm, (sectionCounts.get(norm) || 0) + 1);
  }

  for (const [norm, count] of sectionCounts) {
    if (seen.has(norm)) continue;
    if (norm === hotelNorm) continue;
    const original = collection.photos.find(p => normalizeStr(p.section_name) === norm)?.section_name || "";
    if (!original || !isLikelyRoomOrFacilityName(original)) continue;
    seen.add(norm);

    registry.push({
      name: original, normalized: norm, source_url: "",
      text_evidence: { heading: original },
      confidence: count >= 3 ? 0.85 : 0.7,
      category: inferCategory(original, ""),
    });
  }

  return registry;
}

// ═══════════════════════════════════════════════
// PHASE 2: Assign photos to room registry entries
// ═══════════════════════════════════════════════

function assignPhotosToRegistry(photos: ScrapedPhoto[], registry: RoomRegistryEntry[]): ScrapedPhoto[] {
  return photos.map(photo => {
    // Already has a confident assignment that matches registry — keep it
    if (photo.section_name && photo.confidence >= 0.9) {
      const norm = normalizeStr(photo.section_name);
      if (registry.some(r => r.normalized === norm)) return photo;
    }

    // Skip booking-tagged photos (they have their own naming)
    if (photo.section_name?.startsWith("[Booking]")) return photo;

    // Score each registry entry
    let bestScore = 0;
    let bestEntry: RoomRegistryEntry | null = null;

    const ctx = (photo.html_context || "").toLowerCase();
    const alt = (photo.alt || "").toLowerCase();
    const sec = (photo.section_name || "").toLowerCase();
    const url = photo.url.toLowerCase();

    for (const entry of registry) {
      let score = 0;
      const words = entry.normalized.split(/\s+/).filter(w => w.length > 2);

      // Section name overlap
      if (sec && (sec.includes(entry.normalized) || entry.normalized.includes(sec))) score += 4;

      // Alt text contains entry words
      const altHits = words.filter(w => alt.includes(w)).length;
      if (altHits > 0) score += altHits * 2;

      // HTML context contains entry words
      const ctxHits = words.filter(w => ctx.includes(w)).length;
      if (ctxHits > 0) score += ctxHits * 1.5;

      // URL/filename contains entry words
      const urlHits = words.filter(w => url.includes(w)).length;
      if (urlHits > 0) score += urlHits * 1.5;

      // Category alignment (weak)
      if (photo.category === entry.category && photo.category !== "outro") score += 1;

      if (score > bestScore) { bestScore = score; bestEntry = entry; }
    }

    // Only reassign with strong enough evidence (≥3 points)
    if (bestEntry && bestScore >= 3) {
      return {
        ...photo,
        section_name: bestEntry.name,
        category: bestEntry.category,
        confidence: Math.min(0.95, photo.confidence + 0.1),
        html_context: photo.html_context
          ? `${photo.html_context} | Registry: "${bestEntry.name}" (${bestScore.toFixed(1)})`
          : `Registry: "${bestEntry.name}" (${bestScore.toFixed(1)})`,
      };
    }

    return photo;
  });
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
    "best rate", "melhor tarifa", "book", "prenota", "réserver",
  ];
  return generic.some(g => text.includes(g));
}

/**
 * Returns true if a heading looks like an actual room/suite/facility name,
 * not a marketing headline like "2026 travel" or "A profound cultural experience".
 */
function isLikelyRoomOrFacilityName(name: string): boolean {
  if (!name || name.length < 3 || name.length > 80) return false;
  const lower = name.toLowerCase().trim();

  // Reject obvious non-room headings
  if (/^\d{4}\b/.test(lower)) return false; // starts with year like "2026"
  if (/^(notice|gallery|local|what's on|operation|news|blog|press|faq|map|access|contact|about|overview|welcome|discover|explore)/i.test(lower)) return false;
  if (lower.split(/\s+/).length > 8) return false; // too many words = marketing copy
  if (/\b(profound|experience|creating|oasis|heart of|secret|role of|boutique at)\b/i.test(lower) && !/room|suite|villa|cottage|bungalow/i.test(lower)) return false;

  // Positive match: contains room/facility keywords
  const roomFacilityKeywords = /\b(room|suite|studio|deluxe|superior|standard|classic|twin|double|single|king|queen|penthouse|villa|bungalow|apartment|junior|executive|premium|comfort|economy|family|cottage|chalet|loft|residence|presidential|royal|terrace|garden|ocean|sea|mountain|river|lake|pool|view|balcony|club|grand|master|spa|wellness|onsen|hot spring|bath|sauna|fitness|gym|pool|piscina|restaurant|ristorante|dining|breakfast|bar|lounge|lobby|reception|concierge|fachada|exterior|facade|客室|和室|洋室|和洋室|ルーム|スイート|レストラン|ダイニング|温泉|大浴場|露天風呂|スパ|プール|フィットネス|ロビー|庭園|朝食|バー|ラウンジ)\b/i;
  if (roomFacilityKeywords.test(lower)) return true;

  // Also accept short, capitalized names that look like proper nouns (room names are often proper nouns)
  // e.g., "Hassler Penthouse", "Amalfi Suite", "Sakura Room"
  if (/^[A-ZÀ-Ü]/.test(name) && name.split(/\s+/).length <= 4 && !/\b(the|an?|is|are|was|our|your|this|that|and|for|with|from|into)\b/i.test(lower)) {
    // Short proper noun — could be a room name, allow it through
    return true;
  }

  return false;
}

/**
 * Use AI to extract actual room/suite names from scraped photo data.
 */
async function extractRoomNamesWithAI(
  hotelName: string,
  photos: ScrapedPhoto[],
  collection: ImageCollection
): Promise<string[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return [];

  // Gather all section names and HTML contexts
  const sectionNames = [...new Set(photos.map(p => p.section_name).filter(Boolean))];
  const contexts = [...new Set(photos.map(p => p.html_context).filter(Boolean))].slice(0, 30);
  const sectionDescs = [...collection.sections.entries()].map(([k, v]) => `${k}: ${v.description}`).filter(Boolean).slice(0, 20);

  const prompt = `You are a hotel data analyst. Given scraped data from the website of "${hotelName}", extract ONLY the actual room/suite/accommodation names AND facility names (restaurant, spa, pool, bar, etc.).

SECTION HEADINGS found on the website:
${sectionNames.map(n => `- ${n}`).join("\n")}

SECTION DESCRIPTIONS:
${sectionDescs.join("\n")}

PHOTO CONTEXTS (sample):
${contexts.slice(0, 15).join("\n")}

RULES:
- Return ONLY names of actual rooms, suites, or hotel facilities (restaurant, spa, pool, bar, lobby, etc.)
- Do NOT include marketing headings like "2026 travel", "A profound cultural experience", "Creating a new landscape"
- Do NOT include navigation items like "Notice", "Gallery", "Local Attractions"
- Do NOT include dates, years, or event announcements
- If you cannot identify any real room names, return an empty array
- Keep the original language of the room name (don't translate)

Return ONLY a JSON array of strings:
["Room Name 1", "Room Name 2", "Restaurant Name", ...]`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) return [];
    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content || "";
    const jsonMatch = aiText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const names = JSON.parse(jsonMatch[0]);
    return Array.isArray(names) ? names.filter((n: any) => typeof n === "string" && n.length >= 3 && n.length <= 80) : [];
  } catch (e) {
    console.warn("AI room name extraction failed:", e);
    return [];
  }
}

function inferCategory(sectionName: string, alt: string): string {
  const text = `${sectionName} ${alt}`.toLowerCase();
  if (/fachada|exterior|facade|building|entrada|外観/i.test(text)) return "fachada";
  if (/lobby|recep[çc]|ロビー|フロント/i.test(text)) return "lobby";
  // Check banheiro/bathroom BEFORE room (avoids "bathroom" matching "room")
  if (/banheiro|bathroom|bagno|salle de bain/i.test(text)) return "banheiro";
  // Check events/meetings BEFORE room (avoids "meeting room" matching "room")
  if (/event|meeting|conferenc|sala de event|宴会|会議|ウェディング|ballroom|banquet/i.test(text)) return "eventos";
  if (/suite|suíte|penthouse|presidential|royal|スイート/i.test(text)) return "suite";
  if (/\b(?:room|quarto|camera|chambre|zimmer|deluxe|superior|standard|classic|double|twin|single|king|queen)\b|客室|和室|洋室|和洋室|ルーム|お部屋/i.test(text)) return "quarto";
  if (/piscina|pool|swimming|プール/i.test(text)) return "piscina";
  if (/praia|beach|spiaggia|ビーチ/i.test(text)) return "praia";
  if (/restaurante|restaurant|ristorante|dining|レストラン|ダイニング|朝食|食事/i.test(text)) return "restaurante";
  if (/bar|lounge|cocktail|バー|ラウンジ/i.test(text)) return "bar";
  if (/spa|wellness|benessere|温泉|大浴場|露天風呂|スパ|onsen/i.test(text)) return "spa";
  if (/academia|gym|fitness|palestra|フィットネス|ジム/i.test(text)) return "academia";
  if (/jardim|garden|giardino|庭園|庭/i.test(text)) return "jardim";
  if (/vista|view|panoram|眺望|景色/i.test(text)) return "vista";
  if (/area.?comum|common|terrace|terrazzo|rooftop|施設|館内|テラス/i.test(text)) return "area_comum";
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
    const lower = url.toLowerCase();
    if (u.hostname.includes("cloudinary.com") && u.pathname.includes("/upload/")) {
      const newPath = u.pathname.replace(/\/upload\/[^/]*\//, "/upload/w_2000,q_auto,f_auto/");
      if (newPath !== u.pathname) return u.origin + newPath;
    }
    if (u.hostname.includes("imgix") || (u.searchParams.has("w") && u.searchParams.has("fit"))) {
      u.searchParams.set("w", "2000"); u.searchParams.set("q", "85"); u.searchParams.set("fit", "max"); u.searchParams.set("auto", "format,compress");
      return u.toString();
    }
    if (u.search.includes("wid=") || u.search.includes("width=")) {
      u.searchParams.set("wid", "2000"); u.searchParams.delete("width");
      if (u.searchParams.has("hei")) u.searchParams.delete("hei");
      u.searchParams.set("qlt", "85"); return u.toString();
    }
    if (u.hostname.includes("ctfassets.net") || u.hostname.includes("contentful")) {
      u.searchParams.set("w", "2000"); u.searchParams.set("q", "85"); u.searchParams.set("fm", "jpg"); u.searchParams.set("fl", "progressive");
      return u.toString();
    }
    if (u.searchParams.has("width") || u.searchParams.has("w")) {
      u.searchParams.set("width", "2000"); u.searchParams.delete("w"); u.searchParams.set("quality", "85");
      return u.toString();
    }
    if (/\-\d{2,4}x\d{2,4}\.(jpg|jpeg|png|webp)/i.test(u.pathname)) {
      return u.origin + u.pathname.replace(/\-\d{2,4}x\d{2,4}\./, ".") + u.search;
    }
    if (lower.includes("bstatic.com")) {
      return url.replace(/\/max\d+\//, "/max1280/").replace(/\/square\d+\//, "/max1280/");
    }
    if (lower.includes("hilton.com") && lower.includes("/im/")) {
      u.searchParams.set("wid", "2000"); u.searchParams.set("resMode", "sharp2");
      return u.toString();
    }
    if (lower.includes("marriott.com")) {
      u.searchParams.set("downsize", "2000px:*"); u.searchParams.set("output-quality", "85");
      return u.toString();
    }
    return url;
  } catch { return url; }
}

function isLikelyThumbnail(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.includes("_thumb") || lower.includes("/thumb/") || lower.includes("/thumbnail/")) return true;
  if (lower.includes("_small") || lower.includes("/small/")) return true;
  const dimMatch = url.match(/[\-_/](\d{2,4})x(\d{2,4})/);
  if (dimMatch) {
    const w = parseInt(dimMatch[1], 10), h = parseInt(dimMatch[2], 10);
    if (w < 300 && h < 300) return true;
  }
  try {
    const u = new URL(url);
    const wParam = u.searchParams.get("w") || u.searchParams.get("width") || u.searchParams.get("wid");
    if (wParam && parseInt(wParam, 10) < 300) return true;
  } catch { /* ignore */ }
  return false;
}

function getBestImageUrl(imgTag: string, sourceUrl: string): string | null {
  const srcsetMatch = imgTag.match(/srcset\s*=\s*["']([^"']+)["']/i);
  if (srcsetMatch) {
    const srcsetUrl = pickLargestFromSrcset(srcsetMatch[1], sourceUrl);
    if (srcsetUrl) return srcsetUrl;
  }
  const hiResAttrs = ["data-src-lg", "data-src-xl", "data-full-src", "data-zoom-src", "data-highres", "data-original"];
  for (const attr of hiResAttrs) {
    const match = imgTag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, "i"));
    if (match) { const url = makeAbsolute(match[1].trim(), sourceUrl); if (isRelevantImage(url)) return url; }
  }
  const fallbackAttrs = ["data-src", "data-lazy-src"];
  for (const attr of fallbackAttrs) {
    const match = imgTag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, "i"));
    if (match) { const url = makeAbsolute(match[1].trim(), sourceUrl); if (isRelevantImage(url)) return url; }
  }
  const srcMatch = imgTag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
  if (srcMatch) { const url = makeAbsolute(srcMatch[1].trim(), sourceUrl); if (isRelevantImage(url)) return url; }
  return null;
}

function pickLargestFromSrcset(srcset: string, sourceUrl: string): string | null {
  const candidates = srcset.split(",").map(s => {
    const parts = s.trim().split(/\s+/);
    const url = parts[0];
    const descriptor = parts[1] || "";
    let width = 0;
    if (descriptor.endsWith("w")) width = parseInt(descriptor, 10) || 0;
    else if (descriptor.endsWith("x")) width = (parseFloat(descriptor) || 1) * 1000;
    return { url, width };
  }).filter(c => c.url && isRelevantImage(c.url));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.width - a.width);
  return makeAbsolute(candidates[0].url, sourceUrl);
}

function findOfficialSite(results: any[], hotelName: string): any | null {
  const nameNorm = normalizeStr(hotelName);
  const nameWords = nameNorm.split(/\s+/).filter(w => w.length > 2);
  const aggregators = [
    "booking.com", "expedia.com", "hotels.com", "trivago.com", "kayak.com",
    "tripadvisor.com", "agoda.com", "priceline.com", "hotelscombined.com",
    "google.com", "bing.com", "wikipedia.org", "facebook.com", "instagram.com",
    "decolar.com", "hurb.com", "cvc.com.br", "hoteis.com", "zarpo.com", "omnibees.com",
    "skyscanner.com", "momondo.com", "orbitz.com", "travelocity.com",
    "ctrip.com", "trip.com", "traveloka.com", "klook.com", "viator.com",
    "airbnb.com", "jalan.net", "ikyu.com", "rakuten.co.jp", "yelp.com",
    "lonelyplanet.com", "fodors.com", "frommers.com", "timeout.com",
    "pinterest.com", "twitter.com", "x.com", "linkedin.com", "youtube.com",
    "tiktok.com", "wego.com", "trivago.com.br", "melhordestino.com.br",
    "panrotas.com.br", "hotelurbano.com", "submarino.com.br",
  ];
  const chainDomains: Record<string, string[]> = {
    "aman": ["aman.com"], "four seasons": ["fourseasons.com"], "ritz carlton": ["ritzcarlton.com"],
    "st regis": ["stregis.com", "marriott.com"], "park hyatt": ["hyatt.com"],
    "mandarin oriental": ["mandarinoriental.com"], "rosewood": ["rosewoodhotels.com"],
    "bulgari": ["bulgarihotels.com"], "six senses": ["sixsenses.com"],
    "belmond": ["belmond.com"], "raffles": ["raffles.com"], "fairmont": ["fairmont.com"],
    "sofitel": ["sofitel.com", "all.accor.com"], "hilton": ["hilton.com"],
    "marriott": ["marriott.com"], "hyatt": ["hyatt.com"], "intercontinental": ["ihg.com"],
    "hassler": ["hotelhasslerroma.com"], "waldorf astoria": ["hilton.com"],
    "hoshinoya": ["hoshinoresorts.com"], "peninsula": ["peninsula.com"],
    "shangri-la": ["shangri-la.com"], "oberoi": ["oberoihotels.com"],
    "taj": ["tajhotels.com"], "anantara": ["anantara.com"],
    "kempinski": ["kempinski.com"], "banyan tree": ["banyantree.com"],
    "one&only": ["oneandonlyresorts.com"], "como": ["comohotels.com"],
    "fasano": ["fasano.com.br"], "emiliano": ["emiliano.com.br"],
  };

  let bestScore = -1, bestResult: any = null;
  for (const result of results) {
    if (!result.url) continue;
    const domain = extractDomain(result.url);
    if (aggregators.some(a => domain.includes(a))) continue;
    let score = 0;

    // Chain/brand domain match (very strong signal)
    for (const [brand, domains] of Object.entries(chainDomains)) {
      if (nameNorm.includes(brand) && domains.some(d => domain.includes(d))) score += 20;
    }

    // Domain contains hotel name words
    const domainNorm = normalizeStr(domain);
    const wordMatches = nameWords.filter(w => domainNorm.includes(w)).length;
    score += wordMatches * 4;

    // Title matches hotel name (strong signal)
    const title = normalizeStr(result.title || "");
    if (title.includes(nameNorm)) score += 8;
    else if (nameWords.length > 0 && nameWords.every(w => title.includes(w))) score += 5;

    // URL path hints (rooms page = definitely hotel site)
    const path = new URL(result.url).pathname.toLowerCase();
    if (/\/(rooms|accommodation|suites|gallery)/.test(path)) score += 3;

    // Penalize very generic domains
    if (/\.(gov|edu|org)$/.test(domain)) score -= 5;

    if (score > bestScore) { bestScore = score; bestResult = result; }
  }
  return bestResult;
}

function collectImagesFromMarkdown(markdown: string, sourceUrl: string, collection: ImageCollection, filterDomain: string | null, source: "official" | "booking" | "google") {
  const mdImgRegex = /!\[([^\]]*)\]\(([^)]+)\)/gi;
  let match;
  while ((match = mdImgRegex.exec(markdown)) !== null) {
    const imgUrl = match[2]?.trim();
    if (filterDomain && !isFromDomain(imgUrl, sourceUrl, filterDomain)) continue;
    addImageToCollection(collection, imgUrl, match[1] || "", sourceUrl, "", source);
  }
  const urlRegex = /https?:\/\/[^\s\)>"']+\.(?:jpg|jpeg|png|webp)(?:\?[^\s\)>"']*)?/gi;
  while ((match = urlRegex.exec(markdown)) !== null) {
    const imgUrl = match[0];
    if (filterDomain && !isFromDomain(imgUrl, sourceUrl, filterDomain)) continue;
    addImageToCollection(collection, imgUrl, "", sourceUrl, "", source);
  }
}

function isFromDomain(imageUrl: string, sourceUrl: string, officialDomain: string): boolean {
  const sourceDomain = extractDomain(sourceUrl);
  if (sourceDomain.includes(officialDomain) || officialDomain.includes(sourceDomain)) return true;
  const imgDomain = extractDomain(imageUrl.startsWith("http") ? imageUrl : `https://${officialDomain}${imageUrl}`);
  if (imgDomain.includes(officialDomain) || officialDomain.includes(imgDomain)) return true;
  const allowedCDNs = ["cloudinary", "akamai", "cloudfront", "amazonaws", "imgix", "ctfassets", "bstatic", "trvl-media", "ahstatic", "fastbooking", "accor"];
  return allowedCDNs.some(cdn => imageUrl.toLowerCase().includes(cdn));
}

function addImageToCollection(collection: ImageCollection, rawUrl: string, alt: string, sourceUrl: string, sectionName: string, source: "official" | "booking" | "google") {
  if (!rawUrl || !isRelevantImage(rawUrl)) return;
  const absUrl = makeAbsolute(rawUrl, sourceUrl);
  const dedupKey = normalizeUrlForDedup(absUrl);
  if (collection.seen.has(dedupKey)) return;
  collection.seen.add(dedupKey);
  collection.photos.push({
    url: absUrl, alt, section_name: sectionName,
    category: inferCategory(sectionName, alt),
    confidence: sectionName ? 0.8 : 0.4,
    source,
  });
}

function isRelevantImage(url: string): boolean {
  if (!url || url.length < 10) return false;
  const lower = url.toLowerCase();
  if (lower.startsWith("data:")) return false;
  if (lower.endsWith(".svg") || lower.endsWith(".gif") || lower.endsWith(".ico")) return false;
  if (lower.includes("tracking") || lower.includes("pixel") || lower.includes("1x1")) return false;
  if (lower.includes("sprite") || lower.includes("spacer")) return false;
  if (lower.includes("facebook.com") || lower.includes("twitter.com") || lower.includes("instagram.com")) return false;
  if (lower.includes("google-analytics") || lower.includes("doubleclick")) return false;
  if (lower.includes("badge") || (lower.includes("flag") && lower.includes("16"))) return false;
  if (/\.(jpg|jpeg|png|webp|avif)(\?|$|#)/i.test(url)) return true;
  if (lower.includes("ctfassets") || lower.includes("cloudinary") || lower.includes("imgix") || lower.includes("akamai")) return true;
  if (lower.includes("cloudfront") || lower.includes("amazonaws")) return true;
  if (lower.includes("bstatic.com")) return true;
  if (lower.includes("/photo") || lower.includes("/gallery") || lower.includes("/image")) return true;
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
