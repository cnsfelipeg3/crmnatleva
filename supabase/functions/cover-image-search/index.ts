// Search real destination photos (Wikimedia Commons) + AI-generated cinematic options
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

async function searchWikimedia(query: string, limit = 6): Promise<CoverImage[]> {
  // Use Wikimedia Commons API to search for high-quality images
  const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=${limit * 2}&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1600&origin=*`;
  try {
    const res = await fetch(searchUrl);
    if (!res.ok) return [];
    const json = await res.json();
    const pages = json?.query?.pages ?? {};
    const items: CoverImage[] = [];
    for (const key of Object.keys(pages)) {
      const p: any = pages[key];
      const info = p.imageinfo?.[0];
      if (!info) continue;
      const url: string = info.thumburl || info.url;
      const ext = (url || "").toLowerCase();
      if (!/\.(jpg|jpeg|png|webp)(\?|$)/.test(ext)) continue;
      // Filter out tiny images and likely logos/maps
      const w = info.thumbwidth || info.width || 0;
      const h = info.thumbheight || info.height || 0;
      if (w < 1000 || h < 600) continue;
      const title = (p.title || "").replace(/^File:/, "");
      if (/logo|map|coat_of_arms|flag|seal|diagram/i.test(title)) continue;
      const attribution = info.extmetadata?.Artist?.value
        ? String(info.extmetadata.Artist.value).replace(/<[^>]+>/g, "").trim()
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
    });
    if (!res.ok) {
      console.error("AI image error:", res.status, await res.text());
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { destination } = await req.json();
    if (!destination || typeof destination !== "string" || destination.trim().length < 2) {
      return new Response(JSON.stringify({ error: "destination is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dest = destination.trim();

    // Run real photo search + 2 AI generations in parallel
    const [realPhotos, ai1, ai2] = await Promise.all([
      searchWikimedia(dest, 4),
      generateAIImage(
        `Cinematic, high-resolution travel photography of ${dest}. Golden hour lighting, dramatic landscape, ultra detailed, professional photo, no text, no watermark, no logos, 16:9 aspect ratio.`,
      ),
      generateAIImage(
        `Stunning aerial drone view of ${dest}, vibrant colors, magazine cover quality travel photo, blue sky, no text, no watermark, no people in foreground, 16:9.`,
      ),
    ]);

    const aiPhotos = [ai1, ai2].filter(Boolean) as CoverImage[];
    const images = [...realPhotos, ...aiPhotos];

    return new Response(JSON.stringify({ images, destination: dest }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cover-image-search error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
