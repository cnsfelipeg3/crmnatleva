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

    // Step 1: Search for the hotel website
    const locationStr = [hotel_city, hotel_country].filter(Boolean).join(", ");
    const searchQuery = `${hotel_name} ${locationStr} hotel official website`;

    console.log("Searching for hotel:", searchQuery);

    const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 3,
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

    // Find best URL (prefer official hotel site, booking pages with photos)
    const results = searchData.data || [];
    if (results.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Nenhum resultado encontrado para este hotel" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hotelUrl = results[0]?.url;
    console.log("Scraping hotel URL:", hotelUrl);

    // Step 2: Scrape the hotel website for images
    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: hotelUrl,
        formats: ["markdown", "links", "html"],
        onlyMainContent: false,
        waitFor: 2000,
      }),
    });

    const scrapeData = await scrapeResponse.json();
    if (!scrapeResponse.ok) {
      console.error("Scrape error:", scrapeData);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao acessar site do hotel" }),
        { status: scrapeResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract image URLs from HTML content
    const html = scrapeData.data?.html || scrapeData.html || "";
    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";

    // Extract images from HTML (src attributes)
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?/gi;
    const srcsetRegex = /srcset=["']([^"']+)["']/gi;
    const bgRegex = /background(?:-image)?\s*:\s*url\(["']?([^"')]+)["']?\)/gi;
    
    const images: { url: string; alt: string }[] = [];
    const seen = new Set<string>();

    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      const url = match[1];
      const alt = match[2] || "";
      if (isValidImageUrl(url) && !seen.has(url)) {
        seen.add(url);
        images.push({ url: makeAbsolute(url, hotelUrl), alt });
      }
    }

    // Extract from srcset
    while ((match = srcsetRegex.exec(html)) !== null) {
      const parts = match[1].split(",");
      for (const part of parts) {
        const url = part.trim().split(/\s+/)[0];
        if (isValidImageUrl(url) && !seen.has(url)) {
          seen.add(url);
          images.push({ url: makeAbsolute(url, hotelUrl), alt: "" });
        }
      }
    }

    // Extract from CSS backgrounds
    while ((match = bgRegex.exec(html)) !== null) {
      const url = match[1];
      if (isValidImageUrl(url) && !seen.has(url)) {
        seen.add(url);
        images.push({ url: makeAbsolute(url, hotelUrl), alt: "" });
      }
    }

    // Filter out tiny icons, tracking pixels, etc.
    const filteredImages = images.filter(img => {
      const u = img.url.toLowerCase();
      if (u.includes("logo") || u.includes("icon") || u.includes("favicon")) return false;
      if (u.includes("tracking") || u.includes("pixel") || u.includes("1x1")) return false;
      if (u.includes(".svg") || u.includes(".gif")) return false;
      if (u.includes("sprite") || u.includes("button")) return false;
      return true;
    });

    console.log(`Found ${filteredImages.length} potential hotel images`);

    if (filteredImages.length === 0) {
      return new Response(
        JSON.stringify({ success: true, photos: [], source_url: hotelUrl, message: "Nenhuma foto encontrada no site" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Use AI to classify images by category
    const imageList = filteredImages.slice(0, 40).map((img, i) => `${i + 1}. URL: ${img.url} | Alt: ${img.alt}`).join("\n");

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
            content: `Você é um classificador de fotos de hotéis. Analise a lista de imagens abaixo (URLs e textos alt) e classifique cada uma em uma das categorias:
- fachada (exterior do hotel)
- lobby (recepção, entrada)
- quarto_standard (quartos simples/standard)
- quarto_superior (suítes, quartos superiores, deluxe)
- restaurante (restaurante, bar, área de refeições)
- piscina (piscina, área de lazer aquática)
- spa (spa, sauna, área de bem-estar)
- area_comum (áreas comuns, jardins, lounge)
- vista (vistas panorâmicas, paisagens do hotel)
- outro (fotos não classificáveis)

IMPORTANTE: Exclua imagens que parecem ser banners promocionais, ícones ou elementos de UI do site.
Retorne SOMENTE um JSON válido sem markdown.`
          },
          {
            role: "user",
            content: `Hotel: ${hotel_name} em ${locationStr}\n\nImagens encontradas:\n${imageList}\n\nRetorne um JSON com o formato: {"classified": [{"index": 1, "category": "fachada", "confidence": 0.9}]}. Apenas imagens relevantes do hotel.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_hotel_photos",
              description: "Classifica fotos de hotel por categoria",
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
                          enum: ["fachada", "lobby", "quarto_standard", "quarto_superior", "restaurante", "piscina", "spa", "area_comum", "vista", "outro"]
                        },
                        confidence: { type: "number", description: "Confiança de 0 a 1" }
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
        return new Response(JSON.stringify({ success: false, error: "Limite de requisições excedido, tente novamente em alguns segundos" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (classifyResponse.status === 402) {
        return new Response(JSON.stringify({ success: false, error: "Créditos insuficientes" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI classify error:", classifyResponse.status);
      // Return unclassified photos as fallback
      const photos = filteredImages.slice(0, 20).map((img, i) => ({
        url: img.url,
        alt: img.alt,
        category: "outro",
        confidence: 0.5,
      }));
      return new Response(
        JSON.stringify({ success: true, photos, source_url: hotelUrl, classified: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const classifyData = await classifyResponse.json();
    
    let classified: { index: number; category: string; confidence: number }[] = [];
    try {
      const toolCall = classifyData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        const args = JSON.parse(toolCall.function.arguments);
        classified = args.classified || [];
      }
    } catch (e) {
      console.error("Failed to parse classification:", e);
    }

    // Build final photo list
    const photos = classified
      .filter(c => c.confidence >= 0.5 && c.category !== "outro")
      .map(c => {
        const img = filteredImages[c.index - 1];
        if (!img) return null;
        return {
          url: img.url,
          alt: img.alt,
          category: c.category,
          confidence: c.confidence,
        };
      })
      .filter(Boolean);

    console.log(`Classified ${photos.length} hotel photos`);

    return new Response(
      JSON.stringify({ success: true, photos, source_url: hotelUrl, classified: true }),
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

function isValidImageUrl(url: string): boolean {
  if (!url || url.length < 10) return false;
  const lower = url.toLowerCase();
  if (lower.startsWith("data:")) return false;
  if (lower.includes(".jpg") || lower.includes(".jpeg") || lower.includes(".png") || lower.includes(".webp")) return true;
  if (lower.includes("/image") || lower.includes("/photo") || lower.includes("/gallery")) return true;
  if (lower.includes("cloudinary") || lower.includes("imgix") || lower.includes("akamai") || lower.includes("cloudfront")) return true;
  return false;
}

function makeAbsolute(url: string, baseUrl: string): string {
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return "https:" + url;
  try {
    const base = new URL(baseUrl);
    if (url.startsWith("/")) return base.origin + url;
    return base.origin + "/" + url;
  } catch {
    return url;
  }
}
