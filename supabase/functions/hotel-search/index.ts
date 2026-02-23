import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await req.json();
    if (!query || query.length < 3) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Nominatim (OpenStreetMap) for global hotel search - free, no API key
    const searchQuery = encodeURIComponent(query);
    const url = `https://nominatim.openstreetmap.org/search?q=hotel+${searchQuery}&format=json&limit=15&addressdetails=1&extratags=1&namedetails=1`;

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

    // Parse and format results
    const results = data
      .filter((item: any) => {
        // Filter for relevant results (hotels, tourism, accommodation)
        const type = item.type || "";
        const category = item.class || "";
        const name = (item.display_name || "").toLowerCase();
        return (
          type === "hotel" ||
          type === "hostel" ||
          type === "resort" ||
          type === "motel" ||
          type === "guest_house" ||
          category === "tourism" ||
          name.includes("hotel") ||
          name.includes("resort") ||
          name.includes("pousada") ||
          name.includes("inn")
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
        const address = [road, houseNumber].filter(Boolean).join(" ").trim();

        return {
          name: name.trim(),
          city: [city, state].filter(Boolean).join(", "),
          country,
          address,
          lat: parseFloat(item.lat) || 0,
          lng: parseFloat(item.lon) || 0,
          place_id: String(item.place_id || ""),
        };
      })
      .slice(0, 15);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("hotel-search error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", results: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
