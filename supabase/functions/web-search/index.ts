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
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" },
    });
    if (!resp.ok) return [];
    const html = await resp.text();

    const results: SearchResult[] = [];
    const resultBlocks = html.split('class="result__body"');
    for (let i = 1; i < Math.min(resultBlocks.length, 10); i++) {
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

// ── Google Search via scraping ──
async function searchGoogle(query: string): Promise<SearchResult[]> {
  try {
    const encoded = encodeURIComponent(query);
    const resp = await fetch(`https://www.google.com/search?q=${encoded}&hl=pt-BR&gl=BR&num=8`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    
    // Extract results from Google's HTML
    const results: SearchResult[] = [];
    // Google wraps results in <div class="g"> blocks
    const blocks = html.split('<div class="g"');
    for (let i = 1; i < Math.min(blocks.length, 8); i++) {
      const block = blocks[i];
      const linkMatch = block.match(/<a href="(https?:\/\/[^"]+)"/);
      const titleMatch = block.match(/<h3[^>]*>(.*?)<\/h3>/s);
      // Snippet is typically in a <span> or <div> after the URL
      const snippetMatch = block.match(/class="[^"]*VwiC3b[^"]*"[^>]*>([\s\S]*?)<\/span>/);
      
      const url = linkMatch?.[1] || "";
      const title = titleMatch ? decodeHTMLEntities(titleMatch[1].replace(/<[^>]+>/g, "").trim()) : "";
      const snippet = snippetMatch ? decodeHTMLEntities(snippetMatch[1].replace(/<[^>]+>/g, "").trim()) : "";
      
      if (title && url && !url.includes("google.com")) {
        results.push({ title, snippet, url, source: "Google" });
      }
    }
    return results;
  } catch (e) {
    console.error("Google search error:", e);
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
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
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
    
    return cleaned.slice(0, 12000);
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

// ── Generate multiple search query variations for better coverage ──
function generateQueryVariations(query: string): string[] {
  const q = query.trim();
  const variations: string[] = [q];
  
  const now = new Date();
  const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const monthYear = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  const isoDate = now.toISOString().split("T")[0];
  
  // For event/agenda queries, create targeted variations
  const isEventQuery = /(evento|show|festival|concert|exposiç|museu|teatro|espetáculo|agenda|programaç|o que fazer|things to do|what'?s on|happening|atividade|atração|tour|passeio)/i.test(q);
  const isWeekQuery = /(essa\s+semana|esta\s+semana|this\s+week|fim\s+de\s+semana|weekend)/i.test(q);
  const isMonthQuery = /(esse\s+m[eê]s|este\s+m[eê]s|this\s+month)/i.test(q);
  
  // Extract city/destination
  const cityMatch = q.match(/(nyc|new\s*york|paris|london|londres|tokyo|tóquio|dubai|miami|orlando|las\s+vegas|los\s+angeles|madrid|barcelona|lisboa|porto|roma|milão|amsterdam|berlim|cancun|punta\s+cana|santiago|buenos\s+aires|montevidéu|bariloche|cartagena|bogotá|são\s+paulo|rio\s+de\s+janeiro|salvador|recife|fortaleza|florianópolis|curitiba|belo\s+horizonte|brasília)/i);
  const city = cityMatch?.[0] || "";
  
  if (isEventQuery || city) {
    // Add English variation for international cities
    if (city) {
      const cityNormalized = city.replace(/nyc/i, "New York City");
      variations.push(`events ${cityNormalized} ${monthYear}`);
      variations.push(`${cityNormalized} events ${isWeekQuery ? "this week" : isMonthQuery ? "this month" : monthYear} ${isoDate}`);
      variations.push(`o que fazer em ${cityNormalized} ${monthYear}`);
      // TimeOut / event listing sites
      variations.push(`site:timeout.com ${cityNormalized} events ${now.getFullYear()}`);
    }
  }
  
  // Enrich temporal references
  if (isWeekQuery) {
    variations[0] = `${q} ${monthYear} ${isoDate}`;
  } else if (isMonthQuery) {
    variations[0] = `${q} ${monthYear}`;
  }
  
  // Deduplicate
  return [...new Set(variations)].slice(0, 4);
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

    const enabledSources = sources || ["web", "google", "wikipedia", "news"];
    const shouldDeepScrape = deepScrape !== false;
    
    // Generate query variations for broader coverage
    const queryVariations = generateQueryVariations(query);
    
    // Run all searches in parallel across all query variations
    const searchPromises: Promise<SearchResult[]>[] = [];
    
    for (const q of queryVariations) {
      if (enabledSources.includes("web")) searchPromises.push(searchDuckDuckGo(q));
      if (enabledSources.includes("google")) searchPromises.push(searchGoogle(q));
    }
    // Wikipedia and news only for primary query
    if (enabledSources.includes("wikipedia")) searchPromises.push(searchWikipedia(query));
    if (enabledSources.includes("news")) searchPromises.push(searchNews(query));

    const allResults = await Promise.all(searchPromises);
    
    // Deduplicate by URL
    const seen = new Set<string>();
    const results: SearchResult[] = [];
    for (const r of allResults.flat()) {
      const key = r.url.replace(/\/$/, "").toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        results.push(r);
      }
    }
    
    // Limit to top 20
    const topResults = results.slice(0, 20);

    // Deep scrape: fetch actual content from top 5 web results for richer data
    if (shouldDeepScrape && topResults.length > 0) {
      const webResults = topResults.filter(r => 
        (r.source === "DuckDuckGo" || r.source === "Google") && 
        r.url && 
        !r.url.includes("duckduckgo.com") &&
        !r.url.includes("google.com")
      );
      const topUrls = webResults.slice(0, 5);
      
      const scrapePromises = topUrls.map(async (r) => {
        const content = await scrapePageContent(r.url);
        if (content && content.length > 100) {
          r.fullContent = content;
        }
      });
      await Promise.all(scrapePromises);
    }

    // Build a text summary for AI consumption
    const summary = topResults.map((r, i) => {
      let entry = `[${i + 1}] ${r.title} (${r.source})\n${r.snippet}\nFonte: ${r.url}`;
      if (r.fullContent) {
        entry += `\n\n📄 CONTEÚDO EXTRAÍDO DA PÁGINA (use para dados específicos):\n${r.fullContent}`;
      }
      return entry;
    }).join("\n\n---\n\n");

    return new Response(JSON.stringify({ results: topResults, summary, queriesUsed: queryVariations }), {
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
