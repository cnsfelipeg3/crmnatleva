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

    // Step 1: Search for official hotel site
    const searchQuery = `${hotel_name} ${locationStr} site oficial`;
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

    // Step 3: Scrape rooms/accommodation pages for detailed room info
    const roomDetails = await scrapeRoomsPages(mainUrl, hotel_name, locationStr, images, FIRECRAWL_API_KEY);
    console.log(`Extracted room details for ${Object.keys(roomDetails).length} room types`);

    console.log(`Found ${images.urls.length} potential hotel images`);

    if (images.urls.length === 0) {
      return new Response(
        JSON.stringify({ success: true, photos: [], source_url: mainUrl || "", message: "Nenhuma foto encontrada" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 4: Classify with AI - enhanced prompt for room details
    const roomDetailsContext = Object.keys(roomDetails).length > 0
      ? `\n\nINFORMAÇÕES DETALHADAS DOS QUARTOS EXTRAÍDAS DO SITE OFICIAL:\n${JSON.stringify(roomDetails, null, 2)}`
      : "";

    const imageList = images.urls.slice(0, 60).map((img, i) =>
      `${i + 1}. ${img.url.substring(0, 300)} | Alt: "${img.alt}" | Context: "${(img.context || "").substring(0, 150)}"`
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
            content: `Você é um classificador especialista de fotos de hotéis de luxo. Sua missão é classificar imagens com PRECISÃO MÁXIMA, usando nomes REAIS dos ambientes e quartos.

CATEGORIAS DE ÁREAS:
- fachada (exterior, vista aérea, entrada principal)
- lobby (recepção, hall de entrada)
- restaurante (cada restaurante deve ter seu NOME REAL — ex: "Restaurante Zen", "Ciao Ristorante")
- bar (bares, lounges — usar nome real: "Center Bar", "Moon Lounge")
- piscina (piscinas — diferenciar: "Piscina Principal", "Piscina Familiar", "Parque Aquático")
- praia (área de praia)
- spa (spa, sauna, jacuzzi — usar nome real se disponível)
- area_comum (casino, nightclub, loja, campo de golfe, salão de eventos, academia, kids club)
- vista (vistas panorâmicas)
- outro (não classificável mas relevante)

CATEGORIAS DE QUARTOS — CRÍTICO: Identifique o NOME EXATO do tipo de quarto!
- quarto_standard (quartos básicos, junior suites)
- quarto_superior (suítes superiores/intermediárias)
- quarto_deluxe (quartos deluxe, suítes de luxo)
- quarto_family (quartos familiares, family suites)
- quarto_premium (suítes presidenciais, royalty, penthouse)

REGRAS:
1. Para QUARTOS: room_name DEVE conter o nome REAL (ex: "Islander Junior Suite", "Rock Family Suite"). NUNCA genérico.
2. Para RESTAURANTES e BARES: use o nome real no room_name.
3. Se a URL contém "suite", "room", "habitacion" → SEMPRE é quarto.
4. Fotos de banheiro = categoria do quarto associado.
5. Varanda/balcão de quarto = categoria do quarto correspondente.

ROOM DETAILS — CRÍTICO: Use as informações extraídas do site oficial para preencher room_details com DADOS REAIS:
- size_sqm: metragem REAL do quarto em m² (converta de ft² se necessário: 1 ft² = 0.0929 m²)
- max_guests: capacidade máxima de hóspedes
- bed_type: tipo REAL de cama (ex: "1 King Size", "2 Camas Queen", "1 King + 1 Sofá-cama")
- view: tipo de vista (ex: "Vista Mar", "Vista Jardim", "Vista Piscina")
- amenities: lista COMPLETA de amenidades do quarto extraídas do site:
  - Itens de conforto: ar-condicionado, aquecedor, ventilador de teto
  - Banheiro: secador de cabelo, roupão, chinelos, amenities premium, banheira, ducha
  - Tecnologia: TV tela plana, Smart TV, WiFi, dock station, tomadas USB
  - Segurança: cofre digital, fechadura eletrônica
  - Cozinha/bar: minibar, frigobar, máquina de café/Nespresso, chaleira
  - Extras: varanda/terraço, sala de estar, closet, ferro de passar, room service 24h
  
EXCLUA: banners, ícones, logos, mapas, UI, redes sociais, imagens < 100px.`
          },
          {
            role: "user",
            content: `Hotel: ${hotel_name} em ${locationStr}
${roomDetailsContext}

Imagens encontradas:
${imageList}

Classifique CADA imagem. Para quartos, USE AS INFORMAÇÕES REAIS DO SITE OFICIAL para preencher room_details completos (metragem, cama, amenidades, etc).`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_hotel_photos",
              description: "Classifica fotos de hotel por categoria com detalhes completos de quartos",
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
                        room_name: { type: "string", description: "Nome real do tipo de quarto ou ambiente" },
                        room_details: {
                          type: "object",
                          description: "Detalhes REAIS do quarto extraídos do site oficial",
                          properties: {
                            size_sqm: { type: "number", description: "Tamanho em m²" },
                            max_guests: { type: "number", description: "Capacidade máxima" },
                            bed_type: { type: "string", description: "Tipo de cama real" },
                            amenities: {
                              type: "array",
                              items: { type: "string" },
                              description: "Lista COMPLETA de amenidades: secador, cofre, minibar, TV, WiFi, roupão, etc"
                            },
                            view: { type: "string", description: "Tipo de vista" }
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

    // Merge room details from scraping into AI classification
    const photos = classified
      .filter(c => c.confidence >= 0.4 && c.index >= 1 && c.index <= images.urls.length)
      .map(c => {
        const img = images.urls[c.index - 1];
        if (!img) return null;

        // Enrich with scraped room details if available
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
          url: img.url,
          alt: img.alt,
          category: c.category,
          confidence: c.confidence,
          room_name: c.room_name || null,
          room_details: finalRoomDetails,
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

interface RoomDetail {
  size_sqm?: number | null;
  max_guests?: number | null;
  bed_type?: string | null;
  amenities?: string[];
  view?: string | null;
}

function mergeAmenities(a?: string[] | null, b?: string[] | null): string[] {
  const set = new Set<string>();
  (a || []).forEach(x => set.add(x.toLowerCase().trim()));
  (b || []).forEach(x => set.add(x.toLowerCase().trim()));
  return Array.from(set).map(s => s.charAt(0).toUpperCase() + s.slice(1));
}

function collectImages(results: any[]): ImageCollection {
  const collection: ImageCollection = { urls: [], seen: new Set() };

  for (const result of results) {
    const markdown = result.markdown || "";
    const sourceUrl = result.url || "";

    const mdImgRegex = /!\[([^\]]*)\]\(([^)]+)\)/gi;
    let match;
    while ((match = mdImgRegex.exec(markdown)) !== null) {
      addImage(collection, match[2]?.trim(), match[1] || "", sourceUrl, "");
    }

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

async function scrapeRoomsPages(
  mainUrl: string | undefined,
  hotelName: string,
  locationStr: string,
  collection: ImageCollection,
  apiKey: string
): Promise<Record<string, RoomDetail>> {
  const roomDetails: Record<string, RoomDetail> = {};
  if (!mainUrl) return roomDetails;

  const roomPaths = [
    "/rooms", "/quartos", "/habitaciones", "/accommodations", "/suites",
    "/rooms-suites", "/rooms-and-suites", "/accommodation", "/acomodacoes",
    "/guest-rooms", "/habitaciones-y-suites",
  ];
  const base = new URL(mainUrl);

  let foundRoomsPage = false;

  for (const path of roomPaths) {
    if (foundRoomsPage) break;
    const roomUrl = base.origin + path;
    try {
      const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          url: roomUrl,
          formats: ["html", "markdown"],
          onlyMainContent: true,
          waitFor: 3000,
        }),
      });

      if (!resp.ok) continue;
      const data = await resp.json();
      const html = data.data?.html || data.html || "";
      const markdown = data.data?.markdown || data.markdown || "";

      if (html.length > 500 || markdown.length > 300) {
        console.log(`Found rooms page at ${roomUrl}`);
        foundRoomsPage = true;

        // Extract images with context
        extractImagesWithContext(html, roomUrl, collection);
        extractImagesFromHtml(html, roomUrl, collection);

        // Extract room details from the markdown/html content
        extractRoomDetailsFromContent(markdown, html, roomDetails);

        // Try to find and scrape individual room type pages
        const roomLinks = extractRoomLinks(html, base.origin);
        console.log(`Found ${roomLinks.length} individual room pages to scrape`);

        // Scrape up to 8 individual room pages for detailed amenities
        const individualPages = roomLinks.slice(0, 8);
        await Promise.all(individualPages.map(async (link) => {
          try {
            const roomResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
              method: "POST",
              headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                url: link.url,
                formats: ["html", "markdown"],
                onlyMainContent: true,
                waitFor: 2000,
              }),
            });

            if (!roomResp.ok) return;
            const roomData = await roomResp.json();
            const roomHtml = roomData.data?.html || roomData.html || "";
            const roomMarkdown = roomData.data?.markdown || roomData.markdown || "";

            // Extract images
            extractImagesWithContext(roomHtml, link.url, collection);
            extractImagesFromHtml(roomHtml, link.url, collection);

            // Extract detailed room info
            const detail = extractSingleRoomDetails(roomMarkdown, roomHtml, link.name);
            if (detail && link.name) {
              roomDetails[link.name] = {
                ...(roomDetails[link.name] || {}),
                ...detail,
                amenities: mergeAmenities(roomDetails[link.name]?.amenities, detail.amenities),
              };
            }
          } catch {
            // Skip failed individual room pages
          }
        }));
      }
    } catch {
      continue;
    }
  }

  return roomDetails;
}

function extractRoomLinks(html: string, origin: string): { url: string; name: string }[] {
  const links: { url: string; name: string }[] = [];
  const seen = new Set<string>();

  // Match links that look like room/suite detail pages
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
    if (name) {
      links.push({ url: fullUrl, name });
    }
  }

  return links;
}

function extractNameFromUrl(url: string): string {
  const parts = url.split("/").filter(Boolean);
  const last = parts[parts.length - 1] || "";
  return last
    .replace(/[-_]/g, " ")
    .replace(/\.(html?|php|aspx?)$/i, "")
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

function extractRoomDetailsFromContent(markdown: string, html: string, details: Record<string, RoomDetail>) {
  // Extract room sections from markdown
  const sections = markdown.split(/(?=^#{1,3}\s)/m);

  for (const section of sections) {
    const headerMatch = section.match(/^#{1,3}\s+(.+)/m);
    if (!headerMatch) continue;

    const name = headerMatch[1].trim();
    const roomKeywords = /suite|room|quarto|habitaci|deluxe|standard|premium|family|familiar|king|queen|double|twin|villa|bungalow|cottage|cabana/i;
    if (!roomKeywords.test(name) && !roomKeywords.test(section)) continue;

    const detail = extractSingleRoomDetails(section, "", name);
    if (detail) {
      details[name] = detail;
    }
  }
}

function extractSingleRoomDetails(markdown: string, html: string, name: string): RoomDetail | null {
  const content = markdown + " " + html.replace(/<[^>]+>/g, " ");
  const detail: RoomDetail = {};

  // Size in m²
  const sqmMatch = content.match(/(\d+)\s*(?:m²|m2|metros?\s*quadrados?|sq\.?\s*m)/i);
  if (sqmMatch) detail.size_sqm = parseInt(sqmMatch[1]);

  // Size in ft² → convert
  if (!detail.size_sqm) {
    const ftMatch = content.match(/(\d+)\s*(?:sq\.?\s*ft|square\s*feet|ft²)/i);
    if (ftMatch) detail.size_sqm = Math.round(parseInt(ftMatch[1]) * 0.0929);
  }

  // Max guests
  const guestMatch = content.match(/(?:até|up\s*to|max|máximo|capacity|capacidade)\s*(\d+)\s*(?:hóspedes?|guests?|pessoas?|pax)/i);
  if (guestMatch) detail.max_guests = parseInt(guestMatch[1]);

  // Bed type
  const bedPatterns = [
    /(\d+\s*(?:cama|bed)s?\s*(?:de\s*)?(?:king|queen|casal|solteiro|twin|double|single)(?:\s*size)?)/i,
    /(king\s*(?:size)?\s*bed|queen\s*(?:size)?\s*bed|twin\s*beds?|double\s*bed|cama\s*(?:de\s*)?(?:casal|solteiro|king|queen))/i,
    /(\d+\s*King\s*(?:Size)?|\d+\s*Queen|\d+\s*Twin|\d+\s*Double)/i,
  ];
  for (const pattern of bedPatterns) {
    const bedMatch = content.match(pattern);
    if (bedMatch) {
      detail.bed_type = bedMatch[1].trim();
      break;
    }
  }

  // View
  const viewMatch = content.match(/(?:vista|view)\s*(?:para\s*(?:o\s*)?|of\s*(?:the\s*)?|:?\s*)(mar|ocean|sea|garden|jardim|pool|piscina|city|cidade|mountain|montanha|lagoon|lagoa|beach|praia|resort|park|parque|river|rio|lake|lago)/i);
  if (viewMatch) {
    const viewMap: Record<string, string> = {
      mar: "Vista Mar", ocean: "Vista Mar", sea: "Vista Mar",
      garden: "Vista Jardim", jardim: "Vista Jardim",
      pool: "Vista Piscina", piscina: "Vista Piscina",
      city: "Vista Cidade", cidade: "Vista Cidade",
      mountain: "Vista Montanha", montanha: "Vista Montanha",
      beach: "Vista Praia", praia: "Vista Praia",
      lagoon: "Vista Lagoa", lagoa: "Vista Lagoa",
      resort: "Vista Resort", park: "Vista Parque", parque: "Vista Parque",
      river: "Vista Rio", rio: "Vista Rio", lake: "Vista Lago", lago: "Vista Lago",
    };
    detail.view = viewMap[viewMatch[1].toLowerCase()] || `Vista ${viewMatch[1]}`;
  }

  // Amenities extraction — comprehensive list
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
    [/piso\s*(?:aquecido|radiante)|heated\s*floor|underfloor\s*heating/i, "Piso aquecido"],
    [/black[\s-]?out|cortina\s*(?:black[\s-]?out)/i, "Cortinas blackout"],
    [/espelho\s*(?:de\s*)?maquiagem|vanity\s*mirror|magnifying\s*mirror/i, "Espelho de maquiagem"],
    [/travesseiro|pillow\s*menu/i, "Menu de travesseiros"],
    [/turn[\s-]?down\s*service/i, "Turndown service"],
    [/bidet/i, "Bidê"],
    [/sofá[\s-]?cama|sofa[\s-]?bed|pull[\s-]?out\s*(?:sofa|couch)/i, "Sofá-cama"],
  ];

  const amenities: string[] = [];
  for (const [pattern, label] of amenityPatterns) {
    if (pattern.test(content)) {
      amenities.push(label);
    }
  }
  if (amenities.length > 0) detail.amenities = amenities;

  // Only return if we found something useful
  if (detail.size_sqm || detail.bed_type || (detail.amenities && detail.amenities.length > 0) || detail.view || detail.max_guests) {
    return detail;
  }

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
        ? raw.split(",").map(s => s.trim().split(/\s+/)[0])
        : [raw];
      for (const url of urls) {
        addImage(collection, url, "", sourceUrl, "");
      }
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
  const roomKeywords = /suite|room|quarto|habitaci|deluxe|standard|premium|family|familiar|king|queen|double|twin|restaurant|restaurante|bar|lounge|pool|piscina|spa|lobby|beach|praia/i;

  let match;
  while ((match = sectionRegex.exec(html)) !== null) {
    const section = match[0];
    if (!roomKeywords.test(section)) continue;

    const textContent = section.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().substring(0, 200);

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
