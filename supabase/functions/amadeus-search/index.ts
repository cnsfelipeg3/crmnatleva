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

    if (action === "flight_by_number") {
      // Lookup by airline + flight number + date using Flight Status API
      const { airline, flightNumber, departureDate } = params;
      if (!airline || !flightNumber || !departureDate) {
        throw new Error("airline, flightNumber and departureDate are required");
      }
      const flightNumOnly = flightNumber.replace(/^[A-Z]{2,3}/i, "").trim();
      const carrierCode = airline.toUpperCase();

      try {
        const data = await amadeusGet("/v2/schedule/flights", {
          carrierCode,
          flightNumber: flightNumOnly,
          scheduledDepartureDate: departureDate,
        });

        const flights = data.data || [];
        if (flights.length === 0) {
          return new Response(JSON.stringify({ data: [] }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Map schedule data to our format
        const enrichedOffers = flights.slice(0, 3).map((flight: any) => {
          const legs = flight.flightPoints || [];
          const departure = legs[0];
          const arrival = legs[legs.length - 1];

          const depTime = departure?.departure?.timings?.[0]?.value || "";
          const arrTime = arrival?.arrival?.timings?.[0]?.value || "";
          const depTerminal = departure?.departure?.terminal?.code || "";
          const arrTerminal = arrival?.arrival?.terminal?.code || "";

          // Parse times for duration
          let durationMinutes = 0;
          if (depTime && arrTime) {
            const depDate = new Date(`${departureDate}T${depTime}`);
            const arrDate = new Date(`${departureDate}T${arrTime}`);
            durationMinutes = Math.round((arrDate.getTime() - depDate.getTime()) / 60000);
            if (durationMinutes < 0) durationMinutes += 24 * 60; // next day arrival
          }

          const segments = [{
            direction: "ida",
            segment_order: 1,
            airline: carrierCode,
            airline_name: carrierCode,
            flight_number: flightNumOnly,
            origin_iata: departure?.iataCode || "",
            destination_iata: arrival?.iataCode || "",
            departure_date: departureDate,
            departure_time: depTime ? depTime.slice(0, 5) : "",
            arrival_time: arrTime ? arrTime.slice(0, 5) : "",
            duration_minutes: durationMinutes,
            terminal: depTerminal,
            arrival_terminal: arrTerminal,
            operated_by: "",
            connection_time_minutes: 0,
            cabin_type: "",
            flight_class: "",
          }];

          // Handle multi-leg (stops) flights
          if (legs.length > 2) {
            segments.length = 0;
            for (let i = 0; i < legs.length - 1; i++) {
              const dep = legs[i];
              const arr = legs[i + 1];
              const dTime = dep?.departure?.timings?.[0]?.value || "";
              const aTime = arr?.arrival?.timings?.[0]?.value || "";
              let dur = 0;
              if (dTime && aTime) {
                const d1 = new Date(`${departureDate}T${dTime}`);
                const d2 = new Date(`${departureDate}T${aTime}`);
                dur = Math.round((d2.getTime() - d1.getTime()) / 60000);
                if (dur < 0) dur += 24 * 60;
              }
              let connTime = 0;
              if (i > 0 && segments.length > 0) {
                const prevArr = segments[segments.length - 1].arrival_time;
                if (prevArr && dTime) {
                  const p = new Date(`${departureDate}T${prevArr}:00`);
                  const c = new Date(`${departureDate}T${dTime}`);
                  connTime = Math.round((c.getTime() - p.getTime()) / 60000);
                  if (connTime < 0) connTime += 24 * 60;
                }
              }
              segments.push({
                direction: "ida",
                segment_order: i + 1,
                airline: carrierCode,
                airline_name: carrierCode,
                flight_number: flightNumOnly,
                origin_iata: dep?.iataCode || "",
                destination_iata: arr?.iataCode || "",
                departure_date: departureDate,
                departure_time: dTime ? dTime.slice(0, 5) : "",
                arrival_time: aTime ? aTime.slice(0, 5) : "",
                duration_minutes: dur,
                terminal: dep?.departure?.terminal?.code || "",
                arrival_terminal: arr?.arrival?.terminal?.code || "",
                operated_by: "",
                connection_time_minutes: connTime,
                cabin_type: "",
                flight_class: "",
              });
            }
          }

          return {
            itineraries: [{
              direction: "ida",
              segments,
              totalDurationMinutes: durationMinutes,
            }],
          };
        });

        return new Response(JSON.stringify({ data: enrichedOffers }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err: unknown) {
        console.error("Flight schedule lookup failed:", err);
      }

      // Schedule API returned nothing or failed — return empty with fallback flag
      return new Response(JSON.stringify({ data: [], fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "hotel_search") {
      const { keyword, cityCode: rawCityCode, latitude, longitude, cityHint } = params;
      
      // Map common city names to IATA codes for fallback
      const CITY_NAME_TO_IATA: Record<string, string> = {
        "roma": "ROM", "rome": "ROM", "milão": "MIL", "milano": "MIL", "milan": "MIL",
        "veneza": "VCE", "venice": "VCE", "venezia": "VCE", "paris": "PAR", "londres": "LON",
        "london": "LON", "madrid": "MAD", "barcelona": "BCN", "lisboa": "LIS", "lisbon": "LIS",
        "amsterdam": "AMS", "berlim": "BER", "berlin": "BER", "viena": "VIE", "vienna": "VIE",
        "praga": "PRG", "prague": "PRG", "dubai": "DXB", "nova york": "NYC", "new york": "NYC",
        "miami": "MIA", "orlando": "MCO", "cancun": "CUN", "cancún": "CUN",
        "são paulo": "SAO", "sao paulo": "SAO", "rio de janeiro": "RIO",
        "buenos aires": "BUE", "santiago": "SCL", "lima": "LIM", "bogotá": "BOG", "bogota": "BOG",
        "cairo": "CAI", "atenas": "ATH", "athens": "ATH", "istambul": "IST", "istanbul": "IST",
        "bangkok": "BKK", "tóquio": "TYO", "tokyo": "TYO", "singapura": "SIN", "singapore": "SIN",
        "florença": "FLR", "florence": "FLR", "firenze": "FLR", "nápoles": "NAP", "napoli": "NAP",
        "zurique": "ZRH", "zurich": "ZRH", "genebra": "GVA", "geneva": "GVA",
        "munique": "MUC", "munich": "MUC", "frankfurt": "FRA", "copenhague": "CPH", "copenhagen": "CPH",
        "dublin": "DUB", "edimburgo": "EDI", "edinburgh": "EDI", "bruxelas": "BRU", "brussels": "BRU",
        "marrakech": "RAK", "punta cana": "PUJ", "bariloche": "BRC",
      };
      
      // Resolve cityCode from hint if not provided directly
      let cityCode = rawCityCode || "";
      if (!cityCode && cityHint) {
        const hint = (cityHint as string).toLowerCase().trim();
        cityCode = CITY_NAME_TO_IATA[hint] || "";
        // Also try the keyword itself as a city
        if (!cityCode && keyword) {
          const kw = keyword.toLowerCase().trim();
          cityCode = CITY_NAME_TO_IATA[kw] || "";
        }
      }
      
      // Strategy 1: Search by keyword (Hotel Name Autocomplete)
      if (keyword && keyword.length >= 4) {
        const searchParams: Record<string, string> = {
          keyword: keyword.toUpperCase(),
          subType: "HOTEL_LEISURE,HOTEL_GDS",
          max: "15",
        };
        
        try {
          const data = await amadeusGet("/v1/reference-data/locations/hotel", searchParams);
          const results = (data.data || []).map((h: any) => ({
            hotelId: h.id || "",
            name: h.name || "",
            iataCode: h.iataCode || "",
            subType: h.subType || "",
            address: h.address ? [h.address.lines?.join(", "), h.address.cityName, h.address.countryCode].filter(Boolean).join(", ") : "",
            location: h.geoCode ? { lat: h.geoCode.latitude, lng: h.geoCode.longitude } : null,
          }));
          if (results.length > 0) {
            return new Response(JSON.stringify({ data: results }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } catch (err) {
          console.error("Amadeus hotel keyword search failed:", err);
        }
      }

      // Strategy 2: Search by geocode
      if (latitude && longitude) {
        try {
          const data = await amadeusGet("/v1/reference-data/locations/hotels/by-geocode", {
            latitude: String(latitude),
            longitude: String(longitude),
            radius: "20",
            radiusUnit: "KM",
            hotelSource: "ALL",
          });
          const allResults = data.data || [];
          // If keyword provided, filter by name match
          let filtered = allResults;
          if (keyword && keyword.length >= 2) {
            const kw = keyword.toUpperCase();
            filtered = allResults.filter((h: any) => (h.name || "").toUpperCase().includes(kw));
            if (filtered.length === 0) filtered = allResults;
          }
          const results = filtered.slice(0, 15).map((h: any) => ({
            hotelId: h.hotelId || "",
            name: h.name || "",
            iataCode: h.iataCode || "",
            chainCode: h.chainCode || "",
            address: h.address ? [h.address.countryCode].filter(Boolean).join(", ") : "",
            location: h.geoCode ? { lat: h.geoCode.latitude, lng: h.geoCode.longitude } : null,
            distance: h.distance ? `${h.distance.value} ${h.distance.unit}` : null,
          }));
          if (results.length > 0) {
            return new Response(JSON.stringify({ data: results }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } catch (err) {
          console.error("Amadeus hotel geocode search failed:", err);
        }
      }

      // Strategy 3: Search by city code
      if (cityCode) {
        try {
          const data = await amadeusGet("/v1/reference-data/locations/hotels/by-city", {
            cityCode: cityCode.toUpperCase(),
            hotelSource: "ALL",
          });
          const allResults = data.data || [];
          let filtered = allResults;
          if (keyword && keyword.length >= 2) {
            const kw = keyword.toUpperCase();
            filtered = allResults.filter((h: any) => (h.name || "").toUpperCase().includes(kw));
            if (filtered.length === 0) filtered = allResults;
          }
          const results = filtered.slice(0, 15).map((h: any) => ({
            hotelId: h.hotelId || "",
            name: h.name || "",
            iataCode: h.iataCode || "",
            chainCode: h.chainCode || "",
            address: h.address ? [h.address.countryCode].filter(Boolean).join(", ") : "",
            location: h.geoCode ? { lat: h.geoCode.latitude, lng: h.geoCode.longitude } : null,
            distance: h.distance ? `${h.distance.value} ${h.distance.unit}` : null,
          }));
          return new Response(JSON.stringify({ data: results }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("Amadeus hotel city search failed:", err);
        }
      }

      return new Response(JSON.stringify({ data: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "flight_schedule") {
      // Flight Offers Search - but we only extract schedule info, NO prices
      const { origin, destination, departureDate, returnDate, airline, flightNumber } = params;
      if (!origin || !destination || !departureDate) {
        throw new Error("origin, destination, departureDate are required");
      }

      // Extract numeric part from flight number (e.g. "EK262" -> "262")
      const flightNumOnly = flightNumber
        ? flightNumber.replace(/^[A-Z]{2,3}/i, "").trim()
        : "";

      const searchParams: Record<string, string> = {
        originLocationCode: origin.toUpperCase(),
        destinationLocationCode: destination.toUpperCase(),
        departureDate,
        adults: "1",
        max: flightNumOnly ? "10" : "3",
        currencyCode: "BRL",
        nonStop: "false",
      };
      if (returnDate) searchParams.returnDate = returnDate;
      if (airline) searchParams.includedAirlineCodes = airline.toUpperCase();

      const data = await amadeusGet("/v2/shopping/flight-offers", searchParams);

      // Extract only schedule info from the first offer
      const offers = (data.data || []).slice(0, 3);
      const dictionaries = data.dictionaries || {};

      // Filter offers by flight number if provided
      let filteredOffers = offers;
      if (flightNumOnly) {
        filteredOffers = offers.filter((offer: any) => {
          return (offer.itineraries || []).some((itin: any) =>
            (itin.segments || []).some((seg: any) =>
              seg.number === flightNumOnly || `${seg.carrierCode}${seg.number}` === flightNumber?.toUpperCase()
            )
          );
        });
        // If no exact match found, fall back to all offers but limited to 3
        if (filteredOffers.length === 0) {
          filteredOffers = offers.slice(0, 3);
        }
      }

      const enrichedOffers = filteredOffers.slice(0, 3).map((offer: any) => {
        const itineraries = (offer.itineraries || []).map((itin: any, itinIdx: number) => {
          const direction = itinIdx === 0 ? "ida" : "volta";
          const segments = (itin.segments || []).map((seg: any, segIdx: number) => {
            const durationMatch = seg.duration?.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
            const durationMinutes = durationMatch
              ? (parseInt(durationMatch[1] || "0") * 60 + parseInt(durationMatch[2] || "0"))
              : 0;

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
