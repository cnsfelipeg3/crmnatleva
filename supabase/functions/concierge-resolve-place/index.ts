import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_TTL_DAYS = 30;
const GOOGLE_KEY =
  Deno.env.get("GOOGLE_PLACES_API_KEY") ||
  Deno.env.get("GOOGLE_MAPS_API_KEY") ||
  Deno.env.get("VITE_GOOGLE_MAPS_API_KEY");

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { name, city } = await req.json().catch(() => ({}));
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return new Response(JSON.stringify({ error: "name required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const queryNormalized = normalize(name);
    const cityContext = city ? normalize(city) : "";

    const cacheCutoff = new Date(Date.now() - CACHE_TTL_DAYS * 86400 * 1000).toISOString();
    const { data: cached } = await supabase
      .from("concierge_places_cache")
      .select("*")
      .eq("query_normalized", queryNormalized)
      .eq("city_context", cityContext)
      .gte("fetched_at", cacheCutoff)
      .maybeSingle();

    if (cached?.place_id) {
      return new Response(JSON.stringify({ ...cached, resolved: true, fromCache: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!GOOGLE_KEY) {
      return new Response(JSON.stringify({ error: "no_api_key", resolved: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const query = city ? `${name} ${city}` : name;
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=pt-BR&key=${GOOGLE_KEY}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await r.json();

    if (data.status !== "OK" || !data.results?.length) {
      await supabase.from("concierge_places_cache").upsert(
        {
          query_normalized: queryNormalized,
          city_context: cityContext,
          name,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "query_normalized,city_context" },
      );
      return new Response(JSON.stringify({ resolved: false, status: data.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const best = data.results.sort(
      (a: any, b: any) => (b.user_ratings_total || 0) - (a.user_ratings_total || 0),
    )[0];

    const result = {
      query_normalized: queryNormalized,
      city_context: cityContext,
      place_id: best.place_id,
      name: best.name,
      address: best.formatted_address || "",
      lat: best.geometry?.location?.lat ?? null,
      lng: best.geometry?.location?.lng ?? null,
      rating: best.rating ?? null,
      user_ratings_total: best.user_ratings_total ?? 0,
      photo_reference: best.photos?.[0]?.photo_reference ?? null,
      types: best.types ?? [],
      price_level: best.price_level ?? null,
      business_status: best.business_status ?? null,
      google_maps_url: `https://www.google.com/maps/place/?q=place_id:${best.place_id}`,
      fetched_at: new Date().toISOString(),
    };

    await supabase
      .from("concierge_places_cache")
      .upsert(result, { onConflict: "query_normalized,city_context" });

    return new Response(JSON.stringify({ ...result, resolved: true, fromCache: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "internal", message: e?.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
