import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAmadeusToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }
  const key = Deno.env.get("AMADEUS_API_KEY");
  const secret = Deno.env.get("AMADEUS_API_SECRET");
  if (!key || !secret) throw new Error("Amadeus credentials not configured");

  const res = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=client_credentials&client_id=${key}&client_secret=${secret}`,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Amadeus auth failed [${res.status}]: ${text}`);
  }
  const data = await res.json();
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return tokenCache.token;
}

async function amadeusGet(path: string, params: Record<string, string>) {
  const token = await getAmadeusToken();
  const qs = new URLSearchParams(params).toString();
  const url = `https://test.api.amadeus.com${path}?${qs}`;
  console.log("Amadeus GET:", url);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Amadeus API [${res.status}]: ${text}`);
  }
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    if (action === "airport_search") {
      // Airport & City Search
      const { keyword } = params;
      if (!keyword || keyword.length < 2) {
        return new Response(JSON.stringify({ data: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await amadeusGet("/v1/reference-data/locations", {
        subType: "AIRPORT,CITY",
        keyword: keyword.toUpperCase(),
        "page[limit]": "10",
        sort: "analytics.travelers.score",
        view: "LIGHT",
      });
      const results = (data.data || []).map((loc: any) => ({
        iata: loc.iataCode,
        name: loc.name,
        city: loc.address?.cityName || "",
        country: loc.address?.countryCode || "",
        subType: loc.subType,
      }));
      return new Response(JSON.stringify({ data: results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "airline_search") {
      const { keyword } = params;
      if (!keyword || keyword.length < 2) {
        return new Response(JSON.stringify({ data: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Use airline lookup by IATA code if 2 chars, otherwise use name-based
      if (keyword.length === 2) {
        try {
          const data = await amadeusGet("/v1/reference-data/airlines", {
            airlineCodes: keyword.toUpperCase(),
          });
          const results = (data.data || []).map((a: any) => ({
            iata: a.iataCode,
            icao: a.icaoCode || "",
            name: a.businessName || a.commonName || "",
          }));
          return new Response(JSON.stringify({ data: results }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch {
          return new Response(JSON.stringify({ data: [] }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      // For longer keywords, we can't search airlines by name in Amadeus free tier
      // Return empty and let frontend handle with local filtering
      return new Response(JSON.stringify({ data: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "flight_schedule") {
      // Flight Offers Search - but we only extract schedule info, NO prices
      const { origin, destination, departureDate, returnDate, airline } = params;
      if (!origin || !destination || !departureDate) {
        throw new Error("origin, destination, departureDate are required");
      }

      const searchParams: Record<string, string> = {
        originLocationCode: origin.toUpperCase(),
        destinationLocationCode: destination.toUpperCase(),
        departureDate,
        adults: "1",
        max: "3",
        currencyCode: "BRL",
        nonStop: "false",
      };
      if (returnDate) searchParams.returnDate = returnDate;
      if (airline) searchParams.includedAirlineCodes = airline.toUpperCase();

      const data = await amadeusGet("/v2/shopping/flight-offers", searchParams);

      // Extract only schedule info from the first offer
      const offers = (data.data || []).slice(0, 3);
      const dictionaries = data.dictionaries || {};

      const enrichedOffers = offers.map((offer: any) => {
        const itineraries = (offer.itineraries || []).map((itin: any, itinIdx: number) => {
          const direction = itinIdx === 0 ? "ida" : "volta";
          const segments = (itin.segments || []).map((seg: any, segIdx: number) => {
            const durationMatch = seg.duration?.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
            const durationMinutes = durationMatch
              ? (parseInt(durationMatch[1] || "0") * 60 + parseInt(durationMatch[2] || "0"))
              : 0;

            // Calculate connection time from previous segment
            let connectionTimeMinutes = 0;
            if (segIdx > 0) {
              const prevArrival = new Date(itin.segments[segIdx - 1].arrival.at);
              const currDeparture = new Date(seg.departure.at);
              connectionTimeMinutes = Math.round((currDeparture.getTime() - prevArrival.getTime()) / 60000);
            }

            const carrierCode = seg.carrierCode || "";
            const operatingCode = seg.operating?.carrierCode || "";
            const carrierName = dictionaries?.carriers?.[carrierCode] || carrierCode;
            const operatingName = operatingCode && operatingCode !== carrierCode
              ? (dictionaries?.carriers?.[operatingCode] || operatingCode)
              : "";

            return {
              direction,
              segment_order: segIdx + 1,
              airline: carrierCode,
              airline_name: carrierName,
              flight_number: seg.number || "",
              origin_iata: seg.departure?.iataCode || "",
              destination_iata: seg.arrival?.iataCode || "",
              departure_date: seg.departure?.at?.split("T")[0] || "",
              departure_time: seg.departure?.at?.split("T")[1]?.slice(0, 5) || "",
              arrival_time: seg.arrival?.at?.split("T")[1]?.slice(0, 5) || "",
              duration_minutes: durationMinutes,
              terminal: seg.departure?.terminal || "",
              arrival_terminal: seg.arrival?.terminal || "",
              operated_by: operatingName,
              connection_time_minutes: connectionTimeMinutes,
              cabin_type: "",
              flight_class: "",
            };
          });
          const totalDuration = itin.duration?.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
          const totalMinutes = totalDuration
            ? (parseInt(totalDuration[1] || "0") * 60 + parseInt(totalDuration[2] || "0"))
            : 0;
          return { direction, segments, totalDurationMinutes: totalMinutes };
        });
        return { itineraries };
      });

      return new Response(JSON.stringify({ data: enrichedOffers }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (err: unknown) {
    console.error("Amadeus search error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
