import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type LocationBias = { lat: number; lng: number };

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isRefererRestrictedError = (status?: string, message?: string) =>
  status === "REQUEST_DENIED" && /referer restrictions/i.test(message || "");

const mapGoogleResults = (items: any[]) =>
  (items || []).slice(0, 8).map((p: any) => ({
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

const mapFallbackResults = (items: any[], query: string) =>
  (items || []).slice(0, 8).map((item: any, idx: number) => ({
    place_id: `fallback:${item.place_id || item.osm_id || idx}`,
    name: item.name || item.display_name?.split(",")?.[0] || query,
    address: item.formatted_address || item.display_name || "",
    rating: null,
    user_ratings_total: 0,
    types: item.type ? [item.type] : ["point_of_interest"],
    photo_reference: null,
    location: Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng))
      ? { lat: Number(item.lat), lng: Number(item.lng) }
      : null,
    price_level: null,
    business_status: null,
  }));

async function fallbackSearch(query: string, _locationBias?: LocationBias) {
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=12`;
    const photonResp = await fetch(photonUrl, { headers: { Accept: "application/json" } });

    if (photonResp.ok) {
      const photonData = await photonResp.json();
      const photonItems = (photonData?.features || []).map((feature: any) => {
        const props = feature?.properties || {};
        const coords = feature?.geometry?.coordinates || [];
        return {
          place_id: `${props.osm_type || ""}:${props.osm_id || ""}`,
          name: props.name || props.street || query,
          formatted_address: [props.street, props.housenumber, props.city, props.country].filter(Boolean).join(", "),
          lat: Number(coords[1]),
          lng: Number(coords[0]),
          type: props.osm_value || props.osm_key || "point_of_interest",
        };
      });

      const mappedPhoton = mapFallbackResults(photonItems, query);
      if (mappedPhoton.length > 0) return mappedPhoton;
    }
  } catch (err) {
    console.warn("places-search photon fallback failed:", err);
  }

  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=8&addressdetails=1`;
    const nominatimResp = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "NatLeva-TravelCRM/1.0",
        "Accept-Language": "pt-BR,pt,en",
      },
    });

    if (!nominatimResp.ok) return [];
    const nominatimData = await nominatimResp.json();
    return mapFallbackResults(Array.isArray(nominatimData) ? nominatimData : [], query);
  } catch (err) {
    console.warn("places-search nominatim fallback failed:", err);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY not configured");

    let payload: any = {};
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }

    const { action, query, place_id, photo_reference, max_width, location_bias } = payload;

    if (action === "search") {
      if (!query || String(query).trim().length < 2) return json({ results: [] });

      let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}&language=pt-BR`;

      if (location_bias && Number.isFinite(location_bias.lat) && Number.isFinite(location_bias.lng)) {
        url += `&location=${location_bias.lat},${location_bias.lng}&radius=50000`;
      }

      const resp = await fetch(url);
      const data = await resp.json();

      if (data.status === "OK" || data.status === "ZERO_RESULTS") {
        return json({ results: mapGoogleResults(data.results || []) });
      }

      if (isRefererRestrictedError(data.status, data.error_message)) {
        const fallback = await fallbackSearch(String(query), location_bias as LocationBias | undefined);
        console.warn("places-search using fallback provider because Google key is referer-restricted");
        return json({ results: fallback, provider: "fallback" });
      }

      console.error("Places API error:", data.status, data.error_message);
      throw new Error(data.error_message || data.status);
    }

    if (action === "details") {
      if (!place_id) throw new Error("place_id required");

      const fields = "place_id,name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,price_level,types,geometry,photos,editorial_summary,reviews,opening_hours";
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(place_id)}&fields=${fields}&key=${apiKey}&language=pt-BR`;

      const resp = await fetch(url);
      const data = await resp.json();

      if (data.status === "OK") {
        const p = data.result;
        const photos = (p.photos || []).slice(0, 10).map((ph: any) => ({
          photo_reference: ph.photo_reference,
          width: ph.width,
          height: ph.height,
          attributions: ph.html_attributions || [],
        }));

        return json({
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
        });
      }

      if (isRefererRestrictedError(data.status, data.error_message)) {
        return json({ error: "Google Places indisponível para detalhes no momento." });
      }

      throw new Error(data.error_message || data.status);
    }

    if (action === "photo") {
      if (!photo_reference) throw new Error("photo_reference required");
      const width = max_width || 800;

      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${width}&photo_reference=${encodeURIComponent(photo_reference)}&key=${apiKey}`;

      try {
        const photoResp = await fetch(photoUrl, { redirect: "follow" });
        if (!photoResp.ok) {
          return json({ error: "Não foi possível carregar a foto no momento." });
        }
        return json({ url: photoResp.url });
      } catch {
        return json({ error: "Não foi possível carregar a foto no momento." });
      }
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    console.error("places-search error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
