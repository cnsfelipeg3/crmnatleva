import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════
// 🔍 WEB SEARCH — FONTES GRATUITAS SEM API KEY
// ═══════════════════════════════════════════
// Usa DuckDuckGo HTML + Wikipedia API + NewsAPI (RSS)
// Tudo gratuito, sem necessidade de chave de API

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
}

// ── DuckDuckGo HTML Search (free, no key) ──
async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  try {
    const encoded = encodeURIComponent(query);
    const resp = await fetch(`https://html.duckduckgo.com/html/?q=${encoded}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NatLeva-Intelligence/2.0)",
      },
    });
    if (!resp.ok) return [];
    const html = await resp.text();

    const results: SearchResult[] = [];
    // Parse result blocks from DuckDuckGo HTML
    const resultBlocks = html.split('class="result__body"');
    for (let i = 1; i < Math.min(resultBlocks.length, 8); i++) {
      const block = resultBlocks[i];
      // Extract title
      const titleMatch = block.match(/class="result__a"[^>]*>([^<]+)</);
      const title = titleMatch ? decodeHTMLEntities(titleMatch[1].trim()) : "";
      // Extract snippet
      const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
      const snippet = snippetMatch 
        ? decodeHTMLEntities(snippetMatch[1].replace(/<[^>]+>/g, "").trim())
        : "";
      // Extract URL
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

// ── Wikipedia Search (free, no key) ──
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

// ── Wikidata for structured facts ──
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

// ── News search via Google News RSS (free) ──
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
    const { query, sources } = await req.json();
    if (!query || query.length < 3) {
      return new Response(JSON.stringify({ results: [], summary: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const enabledSources = sources || ["web", "wikipedia", "news"];
    
    // Run all searches in parallel
    const searchPromises: Promise<SearchResult[]>[] = [];
    if (enabledSources.includes("web")) searchPromises.push(searchDuckDuckGo(query));
    if (enabledSources.includes("wikipedia")) searchPromises.push(searchWikipedia(query));
    if (enabledSources.includes("news")) searchPromises.push(searchNews(query));
    if (enabledSources.includes("wikidata")) searchPromises.push(searchWikidata(query));

    const allResults = await Promise.all(searchPromises);
    const results = allResults.flat().slice(0, 15);

    // Build a text summary for AI consumption
    const summary = results.map((r, i) => 
      `[${i + 1}] ${r.title} (${r.source})\n${r.snippet}\nFonte: ${r.url}`
    ).join("\n\n");

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
