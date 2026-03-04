import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
  fullContent?: string;
}

// ── DuckDuckGo HTML Search ──
async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  try {
    const encoded = encodeURIComponent(query);
    const resp = await fetch(`https://html.duckduckgo.com/html/?q=${encoded}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NatLeva-Intelligence/2.0)" },
    });
    if (!resp.ok) return [];
    const html = await resp.text();

    const results: SearchResult[] = [];
    const resultBlocks = html.split('class="result__body"');
    for (let i = 1; i < Math.min(resultBlocks.length, 8); i++) {
      const block = resultBlocks[i];
      const titleMatch = block.match(/class="result__a"[^>]*>([^<]+)</);
      const title = titleMatch ? decodeHTMLEntities(titleMatch[1].trim()) : "";
      const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
      const snippet = snippetMatch
        ? decodeHTMLEntities(snippetMatch[1].replace(/<[^>]+>/g, "").trim())
        : "";
      const urlMatch = block.match(/class="result__url"[^>]*href="([^"]+)"/);
      let url = "";
      if (urlMatch) {
        url = urlMatch[1];
        if (url.startsWith("//duckduckgo.com/l/")) {
          const uddgMatch = url.match(/uddg=([^&]+)/);
          if (uddgMatch) url = decodeURIComponent(uddgMatch[1]);
        }
        if (!url.startsWith("http")) url = "https:" + url;
      }
      if (title && (snippet || url)) {
        results.push({ title, snippet, url, source: "DuckDuckGo" });
      }
    }
    return results;
  } catch (e) {
    console.error("DuckDuckGo search error:", e);
    return [];
  }
}

// ── Wikipedia Search ──
async function searchWikipedia(query: string, lang = "pt"): Promise<SearchResult[]> {
  try {
    const encoded = encodeURIComponent(query);
    const resp = await fetch(
      `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&srinfo=totalhits&srprop=snippet&srlimit=3&format=json`,
      { headers: { "User-Agent": "NatLeva-Intelligence/2.0" } }
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.query?.search || []).map((r: any) => ({
      title: r.title,
      snippet: decodeHTMLEntities(r.snippet.replace(/<[^>]+>/g, "").trim()),
      url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`,
      source: "Wikipedia",
    }));
  } catch (e) {
    console.error("Wikipedia search error:", e);
    return [];
  }
}

// ── Wikidata ──
async function searchWikidata(query: string): Promise<SearchResult[]> {
  try {
    const encoded = encodeURIComponent(query);
    const resp = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encoded}&language=pt&limit=3&format=json`,
      { headers: { "User-Agent": "NatLeva-Intelligence/2.0" } }
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.search || []).map((r: any) => ({
      title: r.label || r.id,
      snippet: r.description || "",
      url: r.concepturi || `https://www.wikidata.org/wiki/${r.id}`,
      source: "Wikidata",
    }));
  } catch {
    return [];
  }
}

// ── News via Google News RSS ──
async function searchNews(query: string): Promise<SearchResult[]> {
  try {
    const encoded = encodeURIComponent(query);
    const resp = await fetch(
      `https://news.google.com/rss/search?q=${encoded}&hl=pt-BR&gl=BR&ceid=BR:pt-419`,
      { headers: { "User-Agent": "NatLeva-Intelligence/2.0" } }
    );
    if (!resp.ok) return [];
    const xml = await resp.text();

    const results: SearchResult[] = [];
    const items = xml.split("<item>");
    for (let i = 1; i < Math.min(items.length, 6); i++) {
      const item = items[i];
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const sourceMatch = item.match(/<source[^>]*>(.*?)<\/source>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);

      const title = titleMatch ? (titleMatch[1] || titleMatch[2] || "").trim() : "";
      const url = linkMatch ? linkMatch[1].trim() : "";
      const sourceName = sourceMatch ? sourceMatch[1].trim() : "Google News";
      const pubDate = pubDateMatch ? pubDateMatch[1].trim() : "";

      if (title && url) {
        results.push({
          title: decodeHTMLEntities(title),
          snippet: pubDate ? `${sourceName} — ${new Date(pubDate).toLocaleDateString("pt-BR")}` : sourceName,
          url,
          source: "Notícias",
        });
      }
    }
    return results;
  } catch (e) {
    console.error("News search error:", e);
    return [];
  }
}

// ── Deep scrape: fetch actual page content from top URLs ──
async function scrapePageContent(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!resp.ok) return "";
    const contentType = resp.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) return "";
    
    const html = await resp.text();
    
    // Remove scripts, styles, nav, header, footer
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<aside[\s\S]*?<\/aside>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    
    return cleaned.slice(0, 8000);
  } catch {
    return "";
  }
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, sources, deepScrape } = await req.json();
    if (!query || query.length < 3) {
      return new Response(JSON.stringify({ results: [], summary: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const enabledSources = sources || ["web", "wikipedia", "news"];
    const shouldDeepScrape = deepScrape !== false; // default true
    
    // Run all searches in parallel
    const searchPromises: Promise<SearchResult[]>[] = [];
    if (enabledSources.includes("web")) searchPromises.push(searchDuckDuckGo(query));
    if (enabledSources.includes("wikipedia")) searchPromises.push(searchWikipedia(query));
    if (enabledSources.includes("news")) searchPromises.push(searchNews(query));
    if (enabledSources.includes("wikidata")) searchPromises.push(searchWikidata(query));

    const allResults = await Promise.all(searchPromises);
    const results = allResults.flat().slice(0, 15);

    // Deep scrape: fetch actual content from top 3 web results for richer data
    if (shouldDeepScrape && results.length > 0) {
      const webResults = results.filter(r => r.source === "DuckDuckGo" && r.url && !r.url.includes("duckduckgo.com"));
      const topUrls = webResults.slice(0, 3);
      
      const scrapePromises = topUrls.map(async (r) => {
        const content = await scrapePageContent(r.url);
        if (content && content.length > 100) {
          r.fullContent = content;
        }
      });
      await Promise.all(scrapePromises);
    }

    // Build a text summary for AI consumption
    const summary = results.map((r, i) => {
      let entry = `[${i + 1}] ${r.title} (${r.source})\n${r.snippet}\nFonte: ${r.url}`;
      if (r.fullContent) {
        entry += `\n\n📄 CONTEÚDO COMPLETO DA PÁGINA:\n${r.fullContent}`;
      }
      return entry;
    }).join("\n\n");

    return new Response(JSON.stringify({ results, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("web-search error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido", results: [], summary: "" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
