// Search real photos (Wikimedia) + generate 4 AI cinematic variants in parallel.
// Designed to always return at least 4 usable cover options for any query
// (destination, hotel, cruise ship, attraction, etc.).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface CoverImage {
  url: string;
  source: "wikimedia" | "ai";
  title?: string;
  attribution?: string;
}

async function searchWikimedia(query: string, limit = 4): Promise<CoverImage[]> {
  const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=${limit * 3}&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1600&origin=*`;
  try {
    const res = await fetch(searchUrl, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const json = await res.json();
    const pages = json?.query?.pages ?? {};
    const items: CoverImage[] = [];
    for (const key of Object.keys(pages)) {
      const p: any = pages[key];
      const info = p.imageinfo?.[0];
      if (!info) continue;
      const url: string = info.thumburl || info.url;
      if (!url || !/\.(jpg|jpeg|png|webp)(\?|$)/i.test(url)) continue;
      const w = info.thumbwidth || info.width || 0;
      const h = info.thumbheight || info.height || 0;
      if (w < 1000 || h < 600) continue;
      const title = (p.title || "").replace(/^File:/, "");
      if (/logo|map|coat_of_arms|flag|seal|diagram|chart|graph/i.test(title)) continue;
      const attribution = info.extmetadata?.Artist?.value
        ? String(info.extmetadata.Artist.value).replace(/<[^>]+>/g, "").trim().slice(0, 80)
        : undefined;
      items.push({ url, source: "wikimedia", title, attribution });
      if (items.length >= limit) break;
    }
    return items;
  } catch (e) {
    console.error("wikimedia error:", e);
    return [];
  }
}

async function generateAIImage(prompt: string): Promise<CoverImage | null> {
  if (!LOVABLE_API_KEY) return null;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) {
      console.error("AI image error:", res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const data = await res.json();
    const url = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!url) return null;
    return { url, source: "ai" };
  } catch (e) {
    console.error("AI generation error:", e);
    return null;
  }
}

function buildPrompts(query: string): string[] {
  const q = query.trim();
  const base = `Subject: ${q}. Strict rules: NO text, NO captions, NO watermarks, NO logos, NO UI overlays, NO borders. Photo realistic, magazine quality, 16:9 cinematic composition.`;
  return [
    `Cinematic golden-hour travel photograph of ${q}. Wide establishing shot, dramatic warm light, ultra detailed, professional travel magazine cover. ${base}`,
    `Stunning aerial drone view of ${q}, vibrant blue sky, crystal clear water or vivid landscape, magazine cover composition. ${base}`,
    `Dreamy dusk scene of ${q}, soft pastel sky, ambient lights starting to glow, luxury travel mood, atmospheric and elegant. ${base}`,
    `Iconic close-up perspective of ${q}, rich textures and colors, depth of field, premium editorial photography, eye-catching framing. ${base}`,
  ];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { destination, count } = await req.json();
    if (!destination || typeof destination !== "string" || destination.trim().length < 2) {
      return new Response(JSON.stringify({ error: "destination is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dest = destination.trim();
    const aiCount = Math.min(Math.max(Number(count) || 4, 2), 6);
    const prompts = buildPrompts(dest).slice(0, aiCount);

    // Run real photo search + N AI generations in parallel
    const [realPhotos, ...aiResults] = await Promise.all([
      searchWikimedia(dest, 4),
      ...prompts.map((p) => generateAIImage(p)),
    ]);

    const aiPhotos = aiResults.filter(Boolean) as CoverImage[];
    // Show AI first (mais consistente), depois fotos reais como complemento
    const images = [...aiPhotos, ...realPhotos];

    return new Response(
      JSON.stringify({
        images,
        destination: dest,
        ai_count: aiPhotos.length,
        real_count: realPhotos.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("cover-image-search error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
