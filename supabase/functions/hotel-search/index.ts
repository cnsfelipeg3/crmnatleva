import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type HotelResult = {
  name: string;
  city: string;
  country: string;
  address: string;
  lat: number;
  lng: number;
  place_id: string;
};

const HOTEL_KEYWORDS = ["hotel", "hostel", "resort", "motel", "pousada", "inn", "guest house", "suite"];

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const containsHotelKeyword = (value: string) => {
  const text = normalize(value);
  return HOTEL_KEYWORDS.some((keyword) => text.includes(keyword));
};

const dedupeResults = (results: HotelResult[]) => {
  const seen = new Set<string>();
  return results.filter((item) => {
    const key = `${normalize(item.name)}|${normalize(item.city)}|${item.lat.toFixed(5)}|${item.lng.toFixed(5)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

async function searchPhoton(query: string): Promise<HotelResult[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(`hotel ${query}`)}&limit=25`;
  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Photon returned ${response.status}`);
  }

  const data = await response.json();
  const features = Array.isArray(data?.features) ? data.features : [];

  const results: HotelResult[] = features
    .filter((feature: any) => {
      const props = feature?.properties || {};
      const name = props.name || "";
      const osmKey = props.osm_key || "";
      const osmValue = props.osm_value || "";

      const isTourismHotel = osmKey === "tourism" && ["hotel", "hostel", "motel", "guest_house", "resort", "apartment"].includes(osmValue);
      return isTourismHotel || containsHotelKeyword(name);
    })
    .map((feature: any) => {
      const props = feature?.properties || {};
      const coords = feature?.geometry?.coordinates || [];
      const lat = Number(coords[1]);
      const lng = Number(coords[0]);

      return {
        name: (props.name || query).trim(),
        city: [props.city, props.state].filter(Boolean).join(", "),
        country: props.country || "",
        address: [props.street, props.housenumber].filter(Boolean).join(" ").trim(),
        lat: Number.isFinite(lat) ? lat : 0,
        lng: Number.isFinite(lng) ? lng : 0,
        place_id: `photon:${String(props.osm_type || "")}:${String(props.osm_id || "")}`,
      };
    })
    .filter((item) => item.name.length > 0);

  return dedupeResults(results).slice(0, 15);
}

async function searchNominatim(query: string): Promise<HotelResult[]> {
  const searchQuery = encodeURIComponent(query);
  const url = `https://nominatim.openstreetmap.org/search?q=hotel+${searchQuery}&format=json&limit=20&addressdetails=1&extratags=1&namedetails=1`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "NatLeva-TravelCRM/1.0",
      "Accept-Language": "pt-BR,pt,en",
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim returned ${response.status}`);
  }

  const data = await response.json();
  const results: HotelResult[] = (Array.isArray(data) ? data : [])
    .filter((item: any) => {
      const type = item.type || "";
      const category = item.class || "";
      const name = item.namedetails?.name || item.display_name || "";
      return (
        ["hotel", "hostel", "resort", "motel", "guest_house"].includes(type) ||
        category === "tourism" ||
        containsHotelKeyword(name)
      );
    })
    .map((item: any) => {
      const addr = item.address || {};
      const name = item.namedetails?.name || item.display_name?.split(",")[0] || query;
      const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || "";
      const state = addr.state || "";
      const country = addr.country || "";
      const road = addr.road || "";
      const houseNumber = addr.house_number || "";

      return {
        name: name.trim(),
        city: [city, state].filter(Boolean).join(", "),
        country,
        address: [road, houseNumber].filter(Boolean).join(" ").trim(),
        lat: parseFloat(item.lat) || 0,
        lng: parseFloat(item.lon) || 0,
        place_id: `nominatim:${String(item.place_id || "")}`,
      };
    });

  return dedupeResults(results).slice(0, 15);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await req.json();
    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedQuery = query.trim();

    let results: HotelResult[] = [];

    try {
      results = await searchPhoton(normalizedQuery);
    } catch (photonError) {
      console.error("hotel-search photon error:", photonError);
    }

    if (results.length === 0) {
      try {
        results = await searchNominatim(normalizedQuery);
      } catch (nominatimError) {
        console.error("hotel-search nominatim error:", nominatimError);
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("hotel-search error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", results: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
