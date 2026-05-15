// Scrape any URL via Firecrawl and return condensed markdown + image candidates.
// Used by ProductAIChat so the AI can build a product from a link.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

type ScrapeDoc = {
  url: string;
  title: string;
  markdown: string;
  html: string;
  links: string[];
};

const BLOCK = [
  /favicon/i, /sprite/i, /logo/i, /badge/i, /icon[s]?\//i, /tracking/i,
  /pixel/i, /\.svg(\?|$)/i, /\.gif(\?|$)/i, /placeholder/i, /spinner/i,
  /1x1\./i, /blank\./i, /transparent\./i, /avatar/i, /flag[s]?\//i,
];
const isBlocked = (u: string) => BLOCK.some((re) => re.test(u));

function extractImages(html: string, markdown: string, links: string[], baseUrl: string): string[] {
  const out = new Set<string>();
  let origin = "";
  try { origin = new URL(baseUrl).origin; } catch { /* */ }

  const push = (raw: string) => {
    if (!raw) return;
    let abs = raw.trim().replace(/&amp;/g, "&");
    if (abs.startsWith("//")) abs = `https:${abs}`;
    else if (abs.startsWith("/") && origin) abs = `${origin}${abs}`;
    if (!/^https?:\/\//i.test(abs)) return;
    if (!/\.(jpe?g|png|webp|avif)(\?|$|#)/i.test(abs)) return;
    if (isBlocked(abs)) return;
    out.add(abs);
  };

  const reImg = /<img\b[^>]*\b(?:src|data-src|data-lazy-src|data-original|data-large)\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = reImg.exec(html)) !== null) push(m[1]);

  const reSrcset = /\bsrcset\s*=\s*["']([^"']+)["']/gi;
  while ((m = reSrcset.exec(html)) !== null) {
    const candidates = m[1].split(",").map((p) => {
      const parts = p.trim().split(/\s+/);
      const w = parseInt((parts[1] || "").replace(/\D/g, ""), 10) || 0;
      return { url: parts[0], w };
    }).sort((a, b) => b.w - a.w);
    if (candidates[0]) push(candidates[0].url);
  }

  const reBg = /background(?:-image)?\s*:\s*url\(["']?([^"')]+)["']?\)/gi;
  while ((m = reBg.exec(html)) !== null) push(m[1]);

  const reMarkdownImage = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/gi;
  while ((m = reMarkdownImage.exec(markdown)) !== null) push(m[1]);

  for (const link of links) push(link);

  return Array.from(out).slice(0, 40);
}

function isBlockedOrEmpty(markdown: string, images: string[]) {
  const clean = markdown.replace(/\s+/g, " ").trim();
  const blocked = [
    /please enable js/i,
    /disable any ad blocker/i,
    /enable javascript/i,
    /access denied/i,
    /captcha/i,
    /robot check/i,
  ].some((re) => re.test(clean));
  return blocked || (clean.length < 120 && images.length === 0);
}

function knownFallbackUrls(rawUrl: string): string[] {
  const urls = new Set<string>();
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.replace(/^www\./, "");
    const decolarId = u.pathname.match(/\/accommodations\/detail\/(\d+)/i)?.[1];
    if ((host.includes("decolar.com") || host.includes("despegar.com")) && decolarId) {
      urls.add(`https://www.decolar.com/hoteis/h-${decolarId}`);
    }
  } catch { /* ignore */ }
  return Array.from(urls);
}

async function scrapeUrl(url: string, apiKey: string): Promise<ScrapeDoc> {
  const res = await fetch(`${FIRECRAWL_V2}/scrape`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      formats: ["markdown", "html", "links"],
      onlyMainContent: false,
      waitFor: 5000,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error("[scrape-url-for-product] firecrawl", res.status, t);
    throw new Error(`Falha ao acessar a página (${res.status})`);
  }
  const j = await res.json();
  const doc = j.data ?? j;
  return {
    url,
    title: doc?.metadata?.title || "",
    markdown: String(doc.markdown || "").slice(0, 18000),
    html: String(doc.html || ""),
    links: Array.isArray(doc.links) ? doc.links.filter((x: unknown): x is string => typeof x === "string") : [],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify({ error: "URL inválida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("Scraper não configurado");

    const candidates = [url, ...knownFallbackUrls(url)];
    let best: { doc: ScrapeDoc; images: string[] } | null = null;
    let lastError: string | null = null;
    for (const candidate of candidates) {
      try {
        const doc = await scrapeUrl(candidate, FIRECRAWL_API_KEY);
        const images = extractImages(doc.html, doc.markdown, doc.links, candidate);
        if (!best || doc.markdown.length + images.length * 300 > best.doc.markdown.length + best.images.length * 300) {
          best = { doc, images };
        }
        if (!isBlockedOrEmpty(doc.markdown, images)) break;
      } catch (err) {
        lastError = (err as Error).message;
        console.warn("[scrape-url-for-product] candidate failed", candidate, lastError);
      }
    }

    if (!best || isBlockedOrEmpty(best.doc.markdown, best.images)) {
      const msg = !best
        ? (lastError || "Não foi possível ler a página")
        : "A página bloqueou a leitura automática. Use prints desta tela ou tente um link público do hotel/anúncio.";
      return new Response(JSON.stringify({ url, error: msg, blocked: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (false) {
      return new Response(JSON.stringify({
        url,
        error: "A página bloqueou a leitura automática. Use prints desta tela ou tente um link público do hotel/anúncio.",
        blocked: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const markdown = best.doc.markdown;
    const title = best.doc.title || new URL(best.doc.url).hostname.replace(/^www\./, "");
    const images = best.images;

    // === Extração estruturada com IA ===
    // Pede pra Lovable AI ler o markdown e devolver um JSON com TODOS os campos
    // úteis pra montar o produto (hotel, local, datas, hóspedes, preço, quarto, etc).
    let structured: Record<string, unknown> | null = null;
    try {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY && markdown.length > 80) {
        const ai = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content:
                  "Você extrai dados estruturados de páginas de hotéis, pacotes, voos e cotações. " +
                  "Devolva SOMENTE chamando a função extract_product_info com o que conseguir inferir do conteúdo. " +
                  "Datas SEMPRE em ISO YYYY-MM-DD. Preço em número puro (sem R$, sem vírgula). " +
                  "Não invente — se não achar o dado, omita o campo. " +
                  "Ignore marcas/preços de concorrentes (Booking, Decolar, Despegar, Expedia, Hoteis.com, Trivago, Hurb) e capture só dados objetivos.",
              },
              {
                role: "user",
                content: `URL: ${url}\nTítulo: ${title}\n\n=== CONTEÚDO ===\n${markdown.slice(0, 16000)}`,
              },
            ],
            tools: [{
              type: "function",
              function: {
                name: "extract_product_info",
                description: "Dados estruturados extraídos da página",
                parameters: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "Nome principal do produto/hotel/pacote" },
                    product_kind: { type: "string", enum: ["pacote", "aereo", "hospedagem", "passeio", "cruzeiro", "outros"] },
                    hotel_name: { type: "string" },
                    hotel_stars: { type: "number" },
                    hotel_address: { type: "string" },
                    destination: { type: "string", description: "Cidade principal" },
                    destination_country: { type: "string" },
                    checkin_date: { type: "string", description: "YYYY-MM-DD" },
                    checkout_date: { type: "string", description: "YYYY-MM-DD" },
                    nights: { type: "number" },
                    departure_date: { type: "string", description: "YYYY-MM-DD" },
                    return_date: { type: "string", description: "YYYY-MM-DD" },
                    adults: { type: "number" },
                    children: { type: "number" },
                    children_ages: { type: "array", items: { type: "number" } },
                    rooms: { type: "number" },
                    room_type: { type: "string", description: "Nome do quarto/categoria" },
                    bed_type: { type: "string" },
                    room_size_sqm: { type: "string" },
                    room_view: { type: "string" },
                    room_description: { type: "string" },
                    meal_plan: { type: "string", description: "Café, meia pensão, pensão completa, all inclusive..." },
                    amenities: { type: "array", items: { type: "string" } },
                    includes: { type: "array", items: { type: "string" } },
                    excludes: { type: "array", items: { type: "string" } },
                    cancellation_policy: { type: "string" },
                    price_total: { type: "number", description: "Preço total em BRL (número puro)" },
                    price_per_person: { type: "number" },
                    currency: { type: "string", enum: ["BRL", "USD", "EUR"] },
                    payment_notes: { type: "string", description: "Condições de pagamento/parcelamento" },
                    airline: { type: "string" },
                    flight_origin: { type: "string" },
                    flight_destination: { type: "string" },
                    flight_class: { type: "string" },
                    flight_baggage: { type: "string" },
                    short_description: { type: "string", description: "1 frase resumo (máx 160 chars)" },
                    description: { type: "string", description: "2-3 parágrafos descritivos em PT-BR" },
                    highlights: { type: "array", items: { type: "string" }, description: "3-6 destaques" },
                  },
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "extract_product_info" } },
          }),
        });
        if (ai.ok) {
          const j = await ai.json();
          const args = j?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
          if (args) {
            try { structured = JSON.parse(args); } catch { /* ignore */ }
          }
        } else {
          console.warn("[scrape-url-for-product] AI extract status", ai.status);
        }
      }
    } catch (e) {
      console.warn("[scrape-url-for-product] AI extract error", e);
    }

    return new Response(JSON.stringify({ url, title, markdown, images, structured }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[scrape-url-for-product]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
