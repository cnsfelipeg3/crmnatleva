import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY not configured");

    const { action, query, place_id, photo_reference, max_width, location_bias } = await req.json();

    // ── Action: autocomplete search ──
    if (action === "search") {
      if (!query || query.length < 2) {
        return new Response(JSON.stringify({ results: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}&language=pt-BR&type=lodging|tourist_attraction|restaurant|point_of_interest`;

      if (location_bias) {
        url += `&location=${location_bias.lat},${location_bias.lng}&radius=50000`;
      }

      const resp = await fetch(url);
      const data = await resp.json();

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        console.error("Places API error:", data.status, data.error_message);
        throw new Error(data.error_message || data.status);
      }

      const results = (data.results || []).slice(0, 8).map((p: any) => ({
        place_id: p.place_id,
        name: p.name,
        address: p.formatted_address || "",
        rating: p.rating || null,
        user_ratings_total: p.user_ratings_total || 0,
        types: p.types || [],
        photo_reference: p.photos?.[0]?.photo_reference || null,
        location: p.geometry?.location || null,
        price_level: p.price_level ?? null,
        business_status: p.business_status || null,
      }));

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: get place details (full info + all photos) ──
    if (action === "details") {
      if (!place_id) throw new Error("place_id required");

      const fields = "place_id,name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,price_level,types,geometry,photos,editorial_summary,reviews,opening_hours";
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(place_id)}&fields=${fields}&key=${apiKey}&language=pt-BR`;

      const resp = await fetch(url);
      const data = await resp.json();

      if (data.status !== "OK") {
        throw new Error(data.error_message || data.status);
      }

      const p = data.result;
      const photos = (p.photos || []).slice(0, 10).map((ph: any) => ({
        photo_reference: ph.photo_reference,
        width: ph.width,
        height: ph.height,
        attributions: ph.html_attributions || [],
      }));

      return new Response(JSON.stringify({
        place_id: p.place_id,
        name: p.name,
        address: p.formatted_address,
        phone: p.formatted_phone_number || null,
        website: p.website || null,
        rating: p.rating || null,
        user_ratings_total: p.user_ratings_total || 0,
        price_level: p.price_level ?? null,
        types: p.types || [],
        location: p.geometry?.location || null,
        photos,
        editorial_summary: p.editorial_summary?.overview || null,
        reviews: (p.reviews || []).slice(0, 3).map((r: any) => ({
          author: r.author_name,
          rating: r.rating,
          text: r.text,
          time: r.relative_time_description,
        })),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: get photo URL ──
    if (action === "photo") {
      if (!photo_reference) throw new Error("photo_reference required");
      const width = max_width || 800;
      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${width}&photo_reference=${encodeURIComponent(photo_reference)}&key=${apiKey}`;

      // Fetch the actual image and return as redirect or proxy
      const photoResp = await fetch(photoUrl, { redirect: "follow" });
      const finalUrl = photoResp.url;

      return new Response(JSON.stringify({ url: finalUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    console.error("places-search error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
