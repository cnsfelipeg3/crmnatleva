import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Amadeus Auth ──
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAmadeusToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;
  const key = Deno.env.get("AMADEUS_API_KEY");
  const secret = Deno.env.get("AMADEUS_API_SECRET");
  if (!key || !secret) throw new Error("Amadeus credentials not configured");

  const res = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=client_credentials&client_id=${key}&client_secret=${secret}`,
  });
  if (!res.ok) throw new Error(`Amadeus auth failed [${res.status}]`);
  const data = await res.json();
  tokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return tokenCache.token;
}

async function amadeusGet(path: string, params: Record<string, string>) {
  const token = await getAmadeusToken();
  const qs = new URLSearchParams(params).toString();
  const url = `https://test.api.amadeus.com${path}?${qs}`;
  console.log("Amadeus GET:", url);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Amadeus API [${res.status}]:`, text);
    throw new Error(`Amadeus API [${res.status}]`);
  }
  return res.json();
}

// ── Google Places Hotel Search ──
async function searchHotelsGooglePlaces(city: string, country?: string): Promise<any[]> {
  const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!apiKey) return [];

  const query = `hotels in ${city}${country ? `, ${country}` : ""}`;
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&type=lodging&key=${apiKey}&language=pt-BR`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) { await res.text(); return []; }
    const data = await res.json();
    return (data.results || []).slice(0, 8).map((p: any) => ({
      name: p.name,
      address: p.formatted_address || "",
      rating: p.rating || null,
      user_ratings_total: p.user_ratings_total || 0,
      price_level: p.price_level || null,
      place_id: p.place_id,
      location: p.geometry?.location || null,
      photo_ref: p.photos?.[0]?.photo_reference || null,
      types: p.types || [],
    }));
  } catch (e) {
    console.error("Google Places error:", e);
    return [];
  }
}

function getPhotoUrl(photoRef: string): string {
  const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference=${photoRef}&key=${apiKey}`;
}

// ── AI Classification ──
async function classifyWithAI(flights: any[], hotels: Record<string, any[]>, briefing: any): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.warn("No LOVABLE_API_KEY, skipping AI classification");
    return { flight_tags: {}, hotel_tags: {} };
  }

  const prompt = `Você é um consultor de viagens especializado. Analise as opções de voo e hotel abaixo e classifique cada uma com tags úteis para um comercial escolher rapidamente.

CONTEXTO DA VIAGEM:
- Destino: ${briefing.destination || "não especificado"}
- Perfil: ${briefing.trip_style || "conforto"}
- Passageiros: ${briefing.adults || 1} adultos${briefing.children ? `, ${briefing.children} crianças` : ""}
- Classe desejada: ${briefing.flight_preference || "não especificado"}
- Hotel desejado: ${briefing.hotel_preference || "não especificado"}

VOOS DISPONÍVEIS:
${JSON.stringify(flights.map((f, i) => ({ index: i, airline: f.airline_name, stops: f.stops, duration: f.total_duration_minutes, price: f.price, cabin: f.cabin })), null, 2)}

HOTÉIS POR CIDADE:
${JSON.stringify(Object.entries(hotels).map(([city, hs]) => ({ city, hotels: (hs as any[]).map((h, i) => ({ index: i, name: h.name, rating: h.rating, price_level: h.price_level })) })), null, 2)}`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Responda SOMENTE com o tool call solicitado." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify_options",
            description: "Classifica voos e hotéis com tags para o comercial",
            parameters: {
              type: "object",
              properties: {
                flight_tags: {
                  type: "object",
                  description: "Map de index do voo para array de tags. Tags possíveis: Melhor conforto, Melhor preço, Melhor custo-benefício, Menor duração, Voo direto, Recomendado",
                  additionalProperties: { type: "array", items: { type: "string" } },
                },
                hotel_tags: {
                  type: "object",
                  description: "Map de 'cidade_index' para array de tags. Tags possíveis: Melhor localização, Melhor custo-benefício, Premium, Melhor avaliação, Ideal para família, Recomendado",
                  additionalProperties: { type: "array", items: { type: "string" } },
                },
                flight_recommendation: { type: "number", description: "Index do voo mais recomendado" },
                hotel_recommendations: {
                  type: "object",
                  description: "Map de cidade para index do hotel mais recomendado",
                  additionalProperties: { type: "number" },
                },
              },
              required: ["flight_tags", "hotel_tags"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "classify_options" } },
      }),
    });

    if (!res.ok) {
      console.error("AI classification failed:", res.status);
      return { flight_tags: {}, hotel_tags: {} };
    }

    const data = await res.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      return JSON.parse(toolCall.function.arguments);
    }
    return { flight_tags: {}, hotel_tags: {} };
  } catch (e) {
    console.error("AI classification error:", e);
    return { flight_tags: {}, hotel_tags: {} };
  }
}

// ── Main ──
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { origin, destination, sub_destinations, departure_date, return_date, adults, children, babies, flight_preference, hotel_preference, trip_style } = body;

    if (!origin || !destination || !departure_date) {
      return new Response(JSON.stringify({ error: "origin, destination, departure_date obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Map city names to IATA codes ──
    const CITY_TO_IATA: Record<string, string> = {
      "tóquio": "TYO", "tokyo": "TYO", "osaka": "OSA", "quioto": "UKY", "kyoto": "UKY",
      "rio de janeiro": "GIG", "são paulo": "GRU", "sao paulo": "GRU",
      "paris": "PAR", "londres": "LON", "london": "LON", "roma": "ROM", "rome": "ROM",
      "nova york": "NYC", "new york": "NYC", "miami": "MIA", "orlando": "MCO",
      "dubai": "DXB", "bangkok": "BKK", "singapura": "SIN", "singapore": "SIN",
      "lisboa": "LIS", "lisbon": "LIS", "madrid": "MAD", "barcelona": "BCN",
      "buenos aires": "EZE", "santiago": "SCL", "cancun": "CUN", "cancún": "CUN",
      "punta cana": "PUJ", "cairo": "CAI", "istambul": "IST", "istanbul": "IST",
      "florença": "FLR", "florence": "FLR", "milão": "MXP", "milan": "MXP",
      "veneza": "VCE", "venice": "VCE", "amsterdam": "AMS", "berlim": "TXL", "berlin": "TXL",
      "zurique": "ZRH", "zurich": "ZRH", "munique": "MUC", "munich": "MUC",
      "atenas": "ATH", "athens": "ATH", "marrakech": "RAK", "bariloche": "BRC",
      "salvador": "SSA", "recife": "REC", "natal": "NAT", "fortaleza": "FOR",
      "florianópolis": "FLN", "florianopolis": "FLN", "maceió": "MCZ", "maceio": "MCZ",
      "brasília": "BSB", "brasilia": "BSB", "belo horizonte": "CNF", "curitiba": "CWB",
      "porto alegre": "POA", "manaus": "MAO",
    };

    const resolveIATA = (name: string): string => {
      const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      return CITY_TO_IATA[normalized] || name.toUpperCase().slice(0, 3);
    };

    const originIATA = resolveIATA(origin);
    const destIATA = resolveIATA(destination);
    const totalPax = (adults || 1) + (children || 0) + (babies || 0);

    // ── Cabin class mapping ──
    const cabinMap: Record<string, string> = {
      "economica": "ECONOMY", "economy": "ECONOMY",
      "premium economy": "PREMIUM_ECONOMY", "premium": "PREMIUM_ECONOMY",
      "executiva": "BUSINESS", "business": "BUSINESS",
      "primeira classe": "FIRST", "first": "FIRST",
    };
    const cabin = flight_preference ? cabinMap[flight_preference.toLowerCase()] || "" : "";

    // ── PARALLEL: Search flights + hotels ──
    const allCities = [destination, ...(sub_destinations || [])].filter(Boolean);

    console.log(`🔍 Searching flights: ${originIATA} → ${destIATA}, ${departure_date}${return_date ? ` / ${return_date}` : ""}`);
    console.log(`🏨 Searching hotels in: ${allCities.join(", ")}`);

    const [flightResult, ...hotelResults] = await Promise.allSettled([
      // Flights
      (async () => {
        const params: Record<string, string> = {
          originLocationCode: originIATA,
          destinationLocationCode: destIATA,
          departureDate: departure_date,
          adults: String(adults || 1),
          max: "6",
          currencyCode: "BRL",
          nonStop: "false",
        };
        if (return_date) params.returnDate = return_date;
        if (children) params.children = String(children);
        if (cabin) params.travelClass = cabin;

        const data = await amadeusGet("/v2/shopping/flight-offers", params);
        const dictionaries = data.dictionaries || {};
        
        return (data.data || []).slice(0, 6).map((offer: any) => {
          const itineraries = (offer.itineraries || []).map((itin: any, itinIdx: number) => {
            const segments = (itin.segments || []).map((seg: any, segIdx: number) => {
              const durationMatch = seg.duration?.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
              const durationMinutes = durationMatch
                ? (parseInt(durationMatch[1] || "0") * 60 + parseInt(durationMatch[2] || "0"))
                : 0;

              let connectionTimeMinutes = 0;
              if (segIdx > 0) {
                const prevArr = new Date(itin.segments[segIdx - 1].arrival.at);
                const currDep = new Date(seg.departure.at);
                connectionTimeMinutes = Math.round((currDep.getTime() - prevArr.getTime()) / 60000);
              }

              const carrierCode = seg.carrierCode || "";
              const operatingCode = seg.operating?.carrierCode || "";
              const aircraftCode = seg.aircraft?.code || "";

              return {
                airline: carrierCode,
                airline_name: dictionaries?.carriers?.[carrierCode] || carrierCode,
                flight_number: `${carrierCode}${seg.number || ""}`,
                origin_iata: seg.departure?.iataCode || "",
                destination_iata: seg.arrival?.iataCode || "",
                departure_time: seg.departure?.at || "",
                arrival_time: seg.arrival?.at || "",
                duration_minutes: durationMinutes,
                connection_time_minutes: connectionTimeMinutes,
                terminal_departure: seg.departure?.terminal || "",
                terminal_arrival: seg.arrival?.terminal || "",
                operated_by: operatingCode && operatingCode !== carrierCode
                  ? (dictionaries?.carriers?.[operatingCode] || operatingCode)
                  : "",
                aircraft: dictionaries?.aircraft?.[aircraftCode] || aircraftCode,
                cabin: offer.travelerPricings?.[0]?.fareDetailsBySegment?.find((f: any) => f.segmentId === seg.id)?.cabin || "",
              };
            });

            const totalDuration = itin.duration?.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
            const totalMinutes = totalDuration
              ? (parseInt(totalDuration[1] || "0") * 60 + parseInt(totalDuration[2] || "0"))
              : 0;

            return {
              direction: itinIdx === 0 ? "ida" : "volta",
              segments,
              total_duration_minutes: totalMinutes,
              stops: segments.length - 1,
            };
          });

          // Baggage info
          const baggage = offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.includedCheckedBags;
          const baggageInfo = baggage
            ? (baggage.weight ? `${baggage.weight}${baggage.weightUnit || "KG"}` : baggage.quantity ? `${baggage.quantity} mala(s)` : "")
            : "";

          return {
            price: offer.price?.grandTotal || offer.price?.total || "N/A",
            currency: offer.price?.currency || "BRL",
            itineraries,
            airline_name: itineraries[0]?.segments?.[0]?.airline_name || "",
            airline: itineraries[0]?.segments?.[0]?.airline || "",
            total_duration_minutes: itineraries[0]?.total_duration_minutes || 0,
            stops: itineraries[0]?.stops || 0,
            cabin: itineraries[0]?.segments?.[0]?.cabin || cabin || "",
            baggage: baggageInfo,
            passengers: totalPax,
          };
        });
      })(),
      // Hotels per city
      ...allCities.map(city => searchHotelsGooglePlaces(city)),
    ]);

    // ── Process results ──
    const flights = flightResult.status === "fulfilled" ? flightResult.value : [];
    if (flightResult.status === "rejected") console.error("Flight search failed:", flightResult.reason);

    const hotelsByCity: Record<string, any[]> = {};
    allCities.forEach((city, i) => {
      const result = hotelResults[i];
      if (result.status === "fulfilled" && result.value.length > 0) {
        hotelsByCity[city] = result.value.map((h: any) => ({
          ...h,
          photo_url: h.photo_ref ? getPhotoUrl(h.photo_ref) : null,
          city,
          stars: h.price_level != null ? Math.min(h.price_level + 2, 5) : null,
        }));
      }
    });

    console.log(`✈️ Found ${flights.length} flight options`);
    console.log(`🏨 Found hotels: ${Object.entries(hotelsByCity).map(([c, h]) => `${c}: ${h.length}`).join(", ")}`);

    // ── AI Classification ──
    const classification = await classifyWithAI(flights, hotelsByCity, body);

    // Apply tags to flights
    const taggedFlights = flights.map((f: any, i: number) => ({
      ...f,
      tags: classification.flight_tags?.[String(i)] || [],
      is_recommended: classification.flight_recommendation === i,
    }));

    // Apply tags to hotels
    const taggedHotels: Record<string, any[]> = {};
    for (const [city, cityHotels] of Object.entries(hotelsByCity)) {
      taggedHotels[city] = (cityHotels as any[]).map((h, i) => ({
        ...h,
        tags: classification.hotel_tags?.[`${city}_${i}`] || [],
        is_recommended: classification.hotel_recommendations?.[city] === i,
      }));
    }

    return new Response(JSON.stringify({
      flights: taggedFlights,
      hotels: taggedHotels,
      search_params: { origin: originIATA, destination: destIATA, departure_date, return_date, cabin, passengers: totalPax },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("proposal-suggestions error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
