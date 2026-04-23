// Extract Hotel/Room data from any public URL using Firecrawl + Lovable AI
// Aggressive quality filtering, hi-res upgrade, smart dedup.
import { corsHeaders } from "@supabase/supabase-js/cors";

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SCHEMA = {
  name: "extract_accommodation",
  description: "Extract structured hotel/room data from scraped page content",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Nome do hotel ou propriedade" },
      room_type: { type: "string", description: "Nome/tipo do quarto exato como aparece na página (ex: 'Lagoon Villa with Pool')" },
      description: { type: "string", description: "Descrição completa do quarto em português brasileiro (4-8 frases ricas, mencionando vista, espaço, diferenciais, comodidades destaque)" },
      amenities: { type: "array", items: { type: "string" }, description: "Lista de comodidades do quarto em português (Wi-Fi, varanda, banheira de hidromassagem, vista mar, piscina privativa, etc)" },
      size_sqm: { type: "string", description: "Tamanho em m² (apenas o número como string, ex: '120'). Procure por 'm²', 'sqm', 'square meters', 'tamanho', 'size'." },
      capacity: { type: "string", description: "Capacidade de hóspedes (ex: '2 adultos', '2 adultos + 1 criança', 'até 4 pessoas')" },
      bed_type: { type: "string", description: "Tipo de cama (ex: 'King size', '2 camas de solteiro', 'Queen + sofá-cama')" },
      view: { type: "string", description: "Vista/posição (ex: 'Vista para o mar', 'Frente para a lagoa', 'Sobre as águas')" },
      location: { type: "string", description: "Localização/endereço resumido do hotel" },
      stars: { type: "string", description: "Categoria em estrelas (1-5)" },
      meal_plan: { type: "string", description: "Regime alimentar (ex: 'Café da manhã incluso', 'All-inclusive', 'Meia pensão')" },
      photo_urls: {
        type: "array",
        description: "URLs das melhores fotos do quarto/hotel (apenas fotos reais do quarto/propriedade — NUNCA logos, badges como 'Genius', ícones, avatars ou banners promocionais). Selecione apenas URLs da lista fornecida.",
        items: { type: "string" },
      },
    },
    required: ["photo_urls"],
  },
};

// ── URL filters: block logos, badges, icons, tracking pixels ──
const BLOCK_PATTERNS = [
  /genius/i, /loyalty/i, /badge/i, /logo/i, /favicon/i, /sprite/i,
  /avatar/i, /flag[s]?\//i, /icon/i, /pixel/i, /tracking/i,
  /\/static\//i, /\/assets\//i, /placeholder/i, /spinner/i, /loading/i,
  /1x1\./i, /blank\./i, /transparent\./i,
  /\/ui\//i, /\/svg\//i, /\.svg(\?|$)/i, /\.gif(\?|$)/i,
  /tripadvisor.*\/img\//i, /trustyou/i, /booking_logos/i,
  /reviewer/i, /profile_pictures/i, /user_photos/i,
];

function isBlockedUrl(u: string): boolean {
  return BLOCK_PATTERNS.some((re) => re.test(u));
}

// ── Hi-res upgrades for known CDNs ──
function upgradeResolution(u: string): string {
  let out = u;
  // Booking: cf.bstatic.com/xdata/images/hotel/square60/... → max1024x768
  out = out.replace(/\/(square\d+|max\d+|thumb|small|sm|xs)\//gi, "/max1024x768/");
  out = out.replace(/[?&]w=\d+/g, "");
  out = out.replace(/[?&]h=\d+/g, "");
  out = out.replace(/[?&]size=\w+/g, "");
  // Hoteis.com / Expedia: _b.jpg, _t.jpg → _z.jpg (largest)
  out = out.replace(/_(t|s|b|m|y)\.(jpe?g|png|webp)(\?|$)/i, "_z.$2$3");
  // Decolar/Despegar: ?w=... or /resize/...
  out = out.replace(/\/resize\/[^/]+\//gi, "/");
  // Generic resize params
  out = out.replace(/[?&](width|height|quality|q|wh|fit|crop)=[^&]+/gi, "");
  // Cleanup leftover ? or &
  out = out.replace(/\?&/, "?").replace(/[?&]$/, "");
  return out;
}

// ── Dedup by "core" path (ignoring resolution segments) ──
function dedupKey(u: string): string {
  try {
    const url = new URL(u);
    let path = url.pathname.toLowerCase();
    path = path.replace(/\/(square\d+|max\d+x?\d*|thumb|small|sm|xs|large|xl|original)\//g, "/");
    path = path.replace(/_(t|s|b|m|y|z|l|xl|orig)\.(jpe?g|png|webp)$/i, ".$2");
    path = path.replace(/-\d+x\d+\./g, ".");
    return `${url.host}${path}`;
  } catch {
    return u;
  }
}

interface ImageWithContext {
  url: string;
  context: string; // surrounding HTML/alt text (lowercase)
}

function extractImageUrls(html: string, baseUrl: string): ImageWithContext[] {
  const found = new Map<string, string>(); // url → context
  let origin = "";
  try { origin = new URL(baseUrl).origin; } catch { /* ignore */ }

  const push = (raw: string, context = "") => {
    if (!raw) return;
    let abs = raw.trim().replace(/&amp;/g, "&");
    if (abs.startsWith("//")) abs = `https:${abs}`;
    else if (abs.startsWith("/") && origin) abs = `${origin}${abs}`;
    if (!/^https?:\/\//i.test(abs)) return;
    if (!/\.(jpe?g|png|webp|avif)(\?|$|#)/i.test(abs)) return;
    if (isBlockedUrl(abs)) return;
    const prev = found.get(abs) || "";
    found.set(abs, (prev + " " + context).toLowerCase().slice(0, 500));
  };

  // <img ...> with surrounding context (alt, title, parent text)
  const imgTagRe = /<img\b([^>]*)>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgTagRe.exec(html)) !== null) {
    const tag = m[1];
    const idx = m.index;
    // Grab ~300 chars of surrounding HTML for room-name matching
    const ctx = html.slice(Math.max(0, idx - 200), Math.min(html.length, idx + 300));
    const altMatch = tag.match(/\balt\s*=\s*["']([^"']+)["']/i);
    const titleMatch = tag.match(/\btitle\s*=\s*["']([^"']+)["']/i);
    const ariaMatch = tag.match(/\baria-label\s*=\s*["']([^"']+)["']/i);
    const fullCtx = [altMatch?.[1], titleMatch?.[1], ariaMatch?.[1], ctx].filter(Boolean).join(" ");

    const srcAttrs = ["src", "data-src", "data-lazy-src", "data-original", "data-hires", "data-large", "data-zoom", "data-image-src"];
    for (const attr of srcAttrs) {
      const re = new RegExp(`\\b${attr}\\s*=\\s*["']([^"']+)["']`, "i");
      const sm = tag.match(re);
      if (sm) push(sm[1], fullCtx);
    }
    // srcset → pick largest
    const ssMatch = tag.match(/\bsrcset\s*=\s*["']([^"']+)["']/i);
    if (ssMatch) {
      const candidates = ssMatch[1].split(",").map((p) => {
        const parts = p.trim().split(/\s+/);
        const w = parseInt((parts[1] || "").replace(/\D/g, ""), 10) || 0;
        return { url: parts[0], w };
      }).sort((a, b) => b.w - a.w);
      if (candidates[0]) push(candidates[0].url, fullCtx);
    }
  }

  // background-image
  const bgRe = /background(?:-image)?\s*:\s*url\(["']?([^"')]+)["']?\)/gi;
  while ((m = bgRe.exec(html)) !== null) push(m[1], "");

  // JSON-LD / inline JSON
  const jsonImgRe = /["'](?:contentUrl|image|photo|url|large_url|max_url|original_url)["']\s*:\s*["'](https?:\/\/[^"']+\.(?:jpe?g|png|webp|avif)[^"']*)["']/gi;
  while ((m = jsonImgRe.exec(html)) !== null) {
    // Try to capture surrounding JSON context for room-name hints
    const idx = m.index;
    const ctx = html.slice(Math.max(0, idx - 300), Math.min(html.length, idx + 100));
    push(m[1], ctx);
  }

  return Array.from(found.entries()).map(([url, context]) => ({ url, context }));
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function scoreByRoomMatch(ctx: string, roomTokens: string[]): number {
  if (!roomTokens.length) return 0;
  const nctx = normalize(ctx);
  let hits = 0;
  for (const t of roomTokens) if (t.length >= 3 && nctx.includes(t)) hits++;
  return hits;
}

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

    console.log("[extract-from-url] Scraping:", url);

    // 1) Primary scrape
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
        waitFor: 4000,
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

    // 2) Collect image URLs (HTML + links from any embedded JSON)
    let allImages = extractImageUrls(html, url);

    // Also scan the markdown for image markdown syntax  ![](url)
    const mdImgRe = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;
    let mm: RegExpExecArray | null;
    while ((mm = mdImgRe.exec(markdown)) !== null) {
      const u = mm[1];
      if (/\.(jpe?g|png|webp|avif)(\?|$|#)/i.test(u) && !isBlockedUrl(u)) {
        allImages.push(u);
      }
    }
    // From discovered links
    for (const l of links) {
      if (typeof l === "string" && /\.(jpe?g|png|webp|avif)(\?|$|#)/i.test(l) && !isBlockedUrl(l)) {
        allImages.push(l);
      }
    }

    // 3) Upgrade resolution + dedupe by core key (keep first/longest URL per key)
    const byKey = new Map<string, string>();
    for (const raw of allImages) {
      const upgraded = upgradeResolution(raw);
      const key = dedupKey(upgraded);
      const existing = byKey.get(key);
      if (!existing || upgraded.length > existing.length) {
        byKey.set(key, upgraded);
      }
    }
    const candidatePhotos = Array.from(byKey.values()).slice(0, 80);

    console.log("[extract-from-url] candidates:", candidatePhotos.length, "md:", markdown.length);

    // 4) Send to AI for structured extraction (only ask for URLs from the candidate list)
    const truncatedMarkdown = markdown.slice(0, 22000);

    const aiRes = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content:
              "Você é um especialista em extrair dados de páginas de hotéis/quartos (Booking, Decolar, Hoteis.com, Expedia, Azul Viagens, sites oficiais). Responda APENAS chamando a função extract_accommodation. " +
              "Regras CRÍTICAS para fotos: " +
              "1) Selecione APENAS URLs presentes na lista 'FOTOS CANDIDATAS'. NUNCA invente URLs. " +
              "2) PROIBIDO incluir: logos (especialmente 'Genius' do Booking), badges, ícones, banners promocionais, fotos de avatar/usuários, fotos de comida genérica não relacionada ao hotel, mapas. " +
              "3) Inclua TODAS as fotos reais do quarto/hotel/propriedade — geralmente entre 15 e 60 fotos. Quanto mais melhor, desde que sejam fotos legítimas. " +
              "4) Priorize fotos da acomodação específica (quarto, banheiro, varanda, vista, piscina privativa, sala). " +
              "5) Traduza descrição/comodidades para português brasileiro fluente. " +
              "6) Extraia m², capacidade, tipo de cama e vista SEMPRE que estiverem na página.",
          },
          {
            role: "user",
            content: `URL: ${url}\n\n=== CONTEÚDO DA PÁGINA (markdown) ===\n${truncatedMarkdown}\n\n=== FOTOS CANDIDATAS (${candidatePhotos.length} URLs absolutas em alta resolução) ===\n${candidatePhotos.join("\n")}`,
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

    // 5) Validate AI-selected URLs against candidate list (the AI sometimes hallucinates)
    const candidateSet = new Set(candidatePhotos);
    const aiUrls: string[] = Array.isArray(parsed.photo_urls) ? parsed.photo_urls : [];
    const validAiUrls = aiUrls.filter((u) => typeof u === "string" && candidateSet.has(u) && !isBlockedUrl(u));

    // 6) Fallback: if AI returned too few, supplement with top candidates
    let finalUrls = validAiUrls;
    if (finalUrls.length < 8) {
      const supplement = candidatePhotos.filter((u) => !finalUrls.includes(u)).slice(0, 30 - finalUrls.length);
      finalUrls = [...finalUrls, ...supplement];
    }

    // 7) Final dedup
    const seen = new Set<string>();
    const photos = finalUrls
      .filter((u) => { const k = dedupKey(u); if (seen.has(k)) return false; seen.add(k); return true; })
      .map((u) => ({
        url: u,
        description: "",
        category: "outro",
        source: "url_extract",
      }));

    console.log("[extract-from-url] returning", photos.length, "photos");

    return new Response(
      JSON.stringify({
        success: true,
        source_url: url,
        data: {
          name: parsed.name,
          room_type: parsed.room_type,
          description: parsed.description,
          amenities: parsed.amenities || [],
          size_sqm: parsed.size_sqm,
          capacity: parsed.capacity,
          bed_type: parsed.bed_type,
          view: parsed.view,
          location: parsed.location,
          stars: parsed.stars,
          meal_plan: parsed.meal_plan,
          photos,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[extract-from-url] Fatal:", err);
    return new Response(JSON.stringify({ success: false, error: err.message || "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
