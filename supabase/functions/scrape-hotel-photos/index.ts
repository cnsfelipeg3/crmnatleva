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

    // Step 1: Use Firecrawl scrape with screenshot format to get the page + extract markdown images
    // Also try searching for the hotel gallery page directly
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
        scrapeOptions: {
          formats: ["markdown"],
        },
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

    // Collect all images from all search results' markdown
    const images: { url: string; alt: string; source: string }[] = [];
    const seen = new Set<string>();

    for (const result of results) {
      const markdown = result.markdown || "";
      const sourceUrl = result.url || "";

      // Extract markdown images: ![alt](url)
      const mdImgRegex = /!\[([^\]]*)\]\(([^)]+)\)/gi;
      let match;
      while ((match = mdImgRegex.exec(markdown)) !== null) {
        const alt = match[1] || "";
        const url = match[2]?.trim();
        if (url && !seen.has(url) && isRelevantImage(url)) {
          seen.add(url);
          images.push({ url: makeAbsolute(url, sourceUrl), alt, source: sourceUrl });
        }
      }

      // Also extract raw URLs that look like images from the markdown
      const urlRegex = /https?:\/\/[^\s\)>"']+\.(?:jpg|jpeg|png|webp)(?:\?[^\s\)>"']*)?/gi;
      while ((match = urlRegex.exec(markdown)) !== null) {
        const url = match[0];
        if (!seen.has(url) && isRelevantImage(url)) {
          seen.add(url);
          images.push({ url, alt: "", source: sourceUrl });
        }
      }
    }

    // Also scrape the main hotel URL with full HTML to catch lazy-loaded images
    const mainUrl = results[0]?.url;
    if (mainUrl) {
      console.log("Scraping main URL for more images:", mainUrl);
      try {
        const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: mainUrl,
            formats: ["html"],
            onlyMainContent: false,
            waitFor: 3000,
          }),
        });

        if (scrapeResp.ok) {
          const scrapeData = await scrapeResp.json();
          const html = scrapeData.data?.html || scrapeData.html || "";
          
          // Extract ALL image-like attributes from HTML
          // This catches src, data-src, data-lazy-src, data-original, content (og:image), etc.
          const attrPatterns = [
            /(?:src|data-src|data-lazy-src|data-original|data-bg|data-image|data-photo|content)\s*=\s*["']([^"']+)["']/gi,
            /srcset\s*=\s*["']([^"']+)["']/gi,
            /url\(["']?([^"')]+)["']?\)/gi,
          ];

          for (const regex of attrPatterns) {
            let m;
            while ((m = regex.exec(html)) !== null) {
              const raw = m[1];
              // Handle srcset (multiple URLs)
              const urls = raw.includes(",") && regex === attrPatterns[1]
                ? raw.split(",").map(s => s.trim().split(/\s+/)[0])
                : [raw];
              
              for (const url of urls) {
                if (url && !seen.has(url) && isRelevantImage(url)) {
                  seen.add(url);
                  images.push({ url: makeAbsolute(url, mainUrl), alt: "", source: mainUrl });
                }
              }
            }
          }

          // Extract alt text for images that have it
          const imgWithAlt = /<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']+)["']/gi;
          const imgWithAlt2 = /<img[^>]*alt=["']([^"']+)["'][^>]*src=["']([^"']+)["']/gi;
          let m;
          while ((m = imgWithAlt.exec(html)) !== null) {
            const existing = images.find(i => i.url.includes(m[1]) || m[1].includes(i.url));
            if (existing && !existing.alt) existing.alt = m[2];
          }
          while ((m = imgWithAlt2.exec(html)) !== null) {
            const existing = images.find(i => i.url.includes(m[2]) || m[2].includes(i.url));
            if (existing && !existing.alt) existing.alt = m[1];
          }
        }
      } catch (e) {
        console.error("Secondary scrape failed:", e);
      }
    }

    console.log(`Found ${images.length} potential hotel images`);

    if (images.length === 0) {
      return new Response(
        JSON.stringify({ success: true, photos: [], source_url: mainUrl || "", message: "Nenhuma foto encontrada" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Use AI to classify images
    const imageList = images.slice(0, 50).map((img, i) => 
      `${i + 1}. ${img.url.substring(0, 200)} | Alt: "${img.alt}"`
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
            content: `Você é um classificador de fotos de hotéis. Analise as URLs e textos alt das imagens e classifique cada uma relevante em categorias:
- fachada (exterior do hotel)
- lobby (recepção, entrada)
- quarto_standard (quartos simples/standard)
- quarto_superior (suítes, quartos superiores, deluxe)
- restaurante (restaurante, bar, área de refeições)
- piscina (piscina, área de lazer aquática)
- spa (spa, sauna, área de bem-estar)
- area_comum (áreas comuns, jardins, lounge)
- vista (vistas panorâmicas, paisagens do hotel)
- outro (fotos não classificáveis mas relevantes do hotel)

EXCLUA: banners, ícones, logos, mapas, elementos de UI, imagens muito pequenas, imagens de redes sociais.
Inclua apenas fotos que pareçam ser FOTOS REAIS do hotel.`
          },
          {
            role: "user",
            content: `Hotel: ${hotel_name} em ${locationStr}\n\nImagens:\n${imageList}\n\nClassifique as que são fotos reais do hotel.`
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
        return new Response(JSON.stringify({ success: false, error: "Limite de requisições excedido" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (classifyResponse.status === 402) {
        return new Response(JSON.stringify({ success: false, error: "Créditos insuficientes" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Return unclassified as fallback
      const photos = images.slice(0, 20).map(img => ({
        url: img.url, alt: img.alt, category: "outro", confidence: 0.5,
      }));
      return new Response(
        JSON.stringify({ success: true, photos, source_url: mainUrl || "", classified: false }),
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

    const photos = classified
      .filter(c => c.confidence >= 0.4 && c.index >= 1 && c.index <= images.length)
      .map(c => {
        const img = images[c.index - 1];
        if (!img) return null;
        return { url: img.url, alt: img.alt, category: c.category, confidence: c.confidence };
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

function isRelevantImage(url: string): boolean {
  if (!url || url.length < 10) return false;
  const lower = url.toLowerCase();
  
  // Reject
  if (lower.startsWith("data:")) return false;
  if (lower.endsWith(".svg") || lower.endsWith(".gif") || lower.endsWith(".ico")) return false;
  if (lower.includes("logo") && lower.includes("svg")) return false;
  if (lower.includes("tracking") || lower.includes("pixel") || lower.includes("1x1")) return false;
  if (lower.includes("sprite") || lower.includes("spacer")) return false;
  if (lower.includes("facebook.com") || lower.includes("twitter.com") || lower.includes("instagram.com")) return false;
  if (lower.includes("google-analytics") || lower.includes("doubleclick")) return false;
  if (lower.includes("badge") || lower.includes("flag") && lower.includes("16")) return false;
  
  // Accept: common image extensions
  if (/\.(jpg|jpeg|png|webp|avif)(\?|$|#)/i.test(url)) return true;
  
  // Accept: CDN patterns (Hilton, Marriott, Booking, etc.)
  if (lower.includes("ctfassets") || lower.includes("cloudinary")) return true;
  if (lower.includes("imgix") || lower.includes("akamai")) return true;
  if (lower.includes("cloudfront") || lower.includes("amazonaws")) return true;
  if (lower.includes("hilton.com") && lower.includes("image")) return true;
  if (lower.includes("marriott.com") && lower.includes("image")) return true;
  if (lower.includes("/photo") || lower.includes("/gallery") || lower.includes("/image")) return true;
  if (lower.includes("bstatic.com")) return true; // Booking.com CDN
  if (lower.includes("trvl-media") || lower.includes("expedia")) return true;
  
  // Accept: URLs with image-related query params
  if (lower.includes("w=") && lower.includes("h=")) return true;
  if (lower.includes("width=") || lower.includes("height=")) return true;
  if (lower.includes("resize") || lower.includes("crop")) return true;
  
  // Accept: Any URL that looks like it serves images
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
