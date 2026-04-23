// Extract Hotel/Room data from any public URL using Firecrawl + Lovable AI
import { corsHeaders } from "@supabase/supabase-js/cors";

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface ExtractResult {
  success: boolean;
  data?: {
    name?: string;
    room_type?: string;
    description?: string;
    amenities?: string[];
    size_sqm?: string;
    capacity?: string;
    bed_type?: string;
    location?: string;
    stars?: string;
    meal_plan?: string;
    photos?: { url: string; description?: string; category?: string }[];
    raw_extras?: Record<string, unknown>;
  };
  source_url?: string;
  error?: string;
}

const SCHEMA = {
  name: "extract_accommodation",
  description: "Extract structured hotel/room data from scraped page content",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Nome do hotel ou propriedade" },
      room_type: { type: "string", description: "Nome/tipo do quarto (ex: 'Deluxe King Suite com vista mar')" },
      description: { type: "string", description: "Descrição completa em português (3-6 frases)" },
      amenities: { type: "array", items: { type: "string" }, description: "Comodidades em português (Wi-Fi, varanda, banheira de hidromassagem...)" },
      size_sqm: { type: "string", description: "Tamanho em m² (apenas número como string, ex: '45')" },
      capacity: { type: "string", description: "Capacidade de hóspedes (ex: '2 adultos + 1 criança')" },
      bed_type: { type: "string", description: "Tipo de cama (ex: 'King size', '2 camas de solteiro')" },
      location: { type: "string", description: "Localização/endereço resumido" },
      stars: { type: "string", description: "Categoria em estrelas (1-5)" },
      meal_plan: { type: "string", description: "Regime alimentar (ex: 'Café da manhã incluso', 'All-inclusive')" },
      photos: {
        type: "array",
        description: "URLs absolutas de fotos do quarto/hotel encontradas na página",
        items: {
          type: "object",
          properties: {
            url: { type: "string" },
            description: { type: "string" },
            category: { type: "string", description: "quarto, banheiro, vista, area_comum, restaurante, piscina, spa, fachada, outro" },
          },
          required: ["url"],
        },
      },
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify({ success: false, error: "URL inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY não configurado");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurado");

    // 1) Scrape via Firecrawl (markdown + html + links)
    console.log("[extract-from-url] Scraping:", url);
    const scrapeRes = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "html", "links"],
        onlyMainContent: false,
        waitFor: 2500,
      }),
    });

    if (!scrapeRes.ok) {
      const t = await scrapeRes.text();
      console.error("[extract-from-url] Firecrawl error:", scrapeRes.status, t);
      throw new Error(`Falha no scraping (${scrapeRes.status})`);
    }

    const scraped = await scrapeRes.json();
    const doc = scraped.data ?? scraped;
    const markdown: string = doc.markdown ?? "";
    const html: string = doc.html ?? "";
    const links: string[] = Array.isArray(doc.links) ? doc.links : [];

    // 2) Extract image URLs from HTML (img src + srcset + data-src + lazy)
    const imgUrls = new Set<string>();
    const origin = new URL(url).origin;
    const imgRegex = /<img\b[^>]*?(?:src|data-src|data-lazy-src|data-original)\s*=\s*["']([^"']+)["'][^>]*>/gi;
    const srcsetRegex = /srcset\s*=\s*["']([^"']+)["']/gi;
    const styleBgRegex = /background(?:-image)?\s*:\s*url\(["']?([^"')]+)["']?\)/gi;
    let m: RegExpExecArray | null;
    const pushUrl = (raw: string) => {
      try {
        const abs = raw.startsWith("//") ? `https:${raw}` : raw.startsWith("/") ? `${origin}${raw}` : raw;
        if (/^https?:\/\//i.test(abs) && /\.(jpe?g|png|webp|avif)(\?|$)/i.test(abs)) imgUrls.add(abs);
      } catch { /* ignore */ }
    };
    while ((m = imgRegex.exec(html)) !== null) pushUrl(m[1]);
    while ((m = srcsetRegex.exec(html)) !== null) {
      m[1].split(",").forEach(part => pushUrl(part.trim().split(/\s+/)[0]));
    }
    while ((m = styleBgRegex.exec(html)) !== null) pushUrl(m[1]);
    links.forEach(l => { if (typeof l === "string") pushUrl(l); });

    const candidatePhotos = Array.from(imgUrls).slice(0, 60);

    // 3) Send to Lovable AI for structured extraction
    const truncatedMarkdown = markdown.slice(0, 18000);
    console.log("[extract-from-url] Calling AI with", candidatePhotos.length, "candidate images,", truncatedMarkdown.length, "chars md");

    const aiRes = await fetch(LOVABLE_AI_URL, {
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
            content:
              "Você é um especialista em extrair dados estruturados de páginas de hotéis/quartos (Booking, Decolar, Expedia, Hoteis.com, Azul Viagens, sites oficiais, etc.). Responda APENAS chamando a função extract_accommodation. Traduza descrição e comodidades para português brasileiro. Inclua TODAS as fotos relevantes do quarto/hotel a partir da lista fornecida. Não invente URLs.",
          },
          {
            role: "user",
            content: `URL: ${url}\n\n=== CONTEÚDO DA PÁGINA (markdown) ===\n${truncatedMarkdown}\n\n=== FOTOS CANDIDATAS (URLs absolutas) ===\n${candidatePhotos.join("\n")}`,
          },
        ],
        tools: [{ type: "function", function: SCHEMA }],
        tool_choice: { type: "function", function: { name: "extract_accommodation" } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("[extract-from-url] AI error:", aiRes.status, t);
      if (aiRes.status === 429) throw new Error("Limite de requisições da IA atingido. Tente novamente em instantes.");
      if (aiRes.status === 402) throw new Error("Créditos da IA esgotados. Adicione créditos em Settings → Workspace → Usage.");
      throw new Error(`Falha na IA (${aiRes.status})`);
    }

    const aiData = await aiRes.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;
    if (!argsStr) throw new Error("IA não retornou dados estruturados");

    const parsed = JSON.parse(argsStr);

    // Sanitize photos: ensure unique + valid URLs
    const seen = new Set<string>();
    const photos = (parsed.photos || [])
      .filter((p: any) => p?.url && /^https?:\/\//i.test(p.url))
      .filter((p: any) => { if (seen.has(p.url)) return false; seen.add(p.url); return true; })
      .map((p: any) => ({
        url: p.url,
        description: p.description || "",
        category: p.category || "outro",
        source: "url_extract",
      }));

    const result: ExtractResult = {
      success: true,
      source_url: url,
      data: { ...parsed, photos },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[extract-from-url] Fatal:", err);
    return new Response(JSON.stringify({ success: false, error: err.message || "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
