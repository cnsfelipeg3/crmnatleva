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
    for (const candidate of candidates) {
      const doc = await scrapeUrl(candidate, FIRECRAWL_API_KEY);
      const images = extractImages(doc.html, doc.markdown, doc.links, candidate);
      if (!best || doc.markdown.length + images.length * 300 > best.doc.markdown.length + best.images.length * 300) {
        best = { doc, images };
      }
      if (!isBlockedOrEmpty(doc.markdown, images)) break;
    }

    if (!best || isBlockedOrEmpty(best.doc.markdown, best.images)) {
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

    return new Response(JSON.stringify({ url, title, markdown, images }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[scrape-url-for-product]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
