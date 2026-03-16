import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    return (data.results || []).slice(0, 10).map((p: any) => ({
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

// ── IATA Resolution ──
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

function resolveIATA(name: string): string {
  const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  return CITY_TO_IATA[normalized] || name.toUpperCase().slice(0, 3);
}

// ── Cabin class mapping ──
const cabinMap: Record<string, string> = {
  "economica": "ECONOMY", "economy": "ECONOMY",
  "premium economy": "PREMIUM_ECONOMY", "premium": "PREMIUM_ECONOMY",
  "executiva": "BUSINESS", "business": "BUSINESS",
  "primeira classe": "FIRST", "first": "FIRST",
};

// ── Fetch learned patterns for context ──
async function fetchLearnedInsights(destination?: string, tripStyle?: string): Promise<string> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: patterns } = await supabase
      .from("ai_learned_patterns")
      .select("detected_rule, confidence, category")
      .eq("is_active", true)
      .gte("confidence", 50)
      .order("confidence", { ascending: false })
      .limit(10);

    if (!patterns || patterns.length === 0) return "";

    const relevant = patterns.filter(p => {
      if (!destination) return true;
      return p.detected_rule.toLowerCase().includes(destination.toLowerCase()) ||
             p.category === "estrategia_comercial" ||
             p.category === "timing_comercial" ||
             p.category === "analise_perdas";
    });

    if (relevant.length === 0) return "";

    return "\n\nAPRENDIZADOS DA OPERAÇÃO (use como guia para priorização):\n" +
      relevant.map(p => `- [${p.confidence}% confiança] ${p.detected_rule}`).join("\n");
  } catch (e) {
    console.warn("Failed to fetch learned patterns:", e);
    return "";
  }
}

// ── AI Package Builder ──
async function buildPackagesWithAI(flights: any[], hotels: Record<string, any[]>, briefing: any): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.warn("No LOVABLE_API_KEY, building packages manually");
    return buildPackagesFallback(flights, hotels);
  }

  const learnedInsights = await fetchLearnedInsights(briefing.destination, briefing.trip_style);

  const prompt = `Você é um consultor de viagens especializado. Analise as opções abaixo e monte EXATAMENTE 3 pacotes de viagem:

1. **Essencial** (💰) - Menor investimento possível, sem abrir mão de qualidade aceitável.
2. **Conforto** (⭐) - Melhor custo-benefício, equilíbrio ideal entre preço e experiência.
3. **Premium** (✨) - Melhor experiência possível, priorizar conforto e qualidade máxima.

CONTEXTO DA VIAGEM:
- Destino: ${briefing.destination || "não especificado"}
- Perfil: ${briefing.trip_style || "conforto"}
- Passageiros: ${briefing.adults || 1} adultos${briefing.children ? `, ${briefing.children} crianças` : ""}
- Classe desejada: ${briefing.flight_preference || "não especificado"}
- Hotel desejado: ${briefing.hotel_preference || "não especificado"}
${learnedInsights}

VOOS DISPONÍVEIS (escolha 1 por pacote):
${JSON.stringify(flights.map((f, i) => ({ index: i, airline: f.airline_name, stops: f.stops, duration: f.total_duration_minutes, price: f.price, cabin: f.cabin })), null, 2)}

HOTÉIS POR CIDADE (escolha 1 por cidade por pacote):
${JSON.stringify(Object.entries(hotels).map(([city, hs]) => ({ city, hotels: (hs as any[]).map((h, i) => ({ index: i, name: h.name, rating: h.rating, price_level: h.price_level })) })), null, 2)}

Para cada pacote, selecione o voo e hotel mais adequado ao perfil do pacote. Adicione uma justificativa curta.`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Responda SOMENTE com o tool call solicitado. Seja preciso nos índices." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "build_packages",
            description: "Monta 3 pacotes de viagem (essencial, conforto, premium)",
            parameters: {
              type: "object",
              properties: {
                packages: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      tier: { type: "string", enum: ["essencial", "conforto", "premium"] },
                      flight_index: { type: "number", description: "Index do voo selecionado para este pacote" },
                      hotel_selections: {
                        type: "object",
                        description: "Map de cidade para index do hotel selecionado",
                        additionalProperties: { type: "number" },
                      },
                      flight_reason: { type: "string", description: "Justificativa curta da escolha de voo" },
                      hotel_reason: { type: "string", description: "Justificativa curta da escolha de hotel" },
                      highlight: { type: "string", description: "Frase destaque do pacote (max 80 chars)" },
                    },
                    required: ["tier", "flight_index", "hotel_selections", "highlight"],
                  },
                  minItems: 3,
                  maxItems: 3,
                },
              },
              required: ["packages"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "build_packages" } },
      }),
    });

    if (!res.ok) {
      console.error("AI package build failed:", res.status);
      return buildPackagesFallback(flights, hotels);
    }

    const data = await res.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      const packages = parsed.packages || [];
      if (packages.length > 0) {
        // Validate bounds: clamp flight_index and hotel_selections to valid ranges
        const maxFlightIdx = flights.length - 1;
        for (const pkg of packages) {
          if (typeof pkg.flight_index === "number") {
            pkg.flight_index = Math.max(0, Math.min(pkg.flight_index, maxFlightIdx));
          } else {
            pkg.flight_index = 0;
          }
          if (pkg.hotel_selections && typeof pkg.hotel_selections === "object") {
            for (const [city, idx] of Object.entries(pkg.hotel_selections)) {
              const maxHotelIdx = (hotels[city]?.length || 1) - 1;
              const numIdx = typeof idx === "number" ? idx : 0;
              pkg.hotel_selections[city] = Math.max(0, Math.min(numIdx, maxHotelIdx));
            }
          }
        }
        return packages;
      }
      return buildPackagesFallback(flights, hotels);
    }
    return buildPackagesFallback(flights, hotels);
  } catch (e) {
    console.error("AI package build error:", e);
    return buildPackagesFallback(flights, hotels);
  }
}

// ── Fallback: build packages without AI ──
function buildPackagesFallback(flights: any[], hotels: Record<string, any[]>): any[] {
  // Sort flights by price
  const sorted = flights.map((f, i) => ({ ...f, _idx: i })).sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

  const essentialFlight = sorted[0]?._idx ?? 0;
  const premiumFlight = sorted[sorted.length - 1]?._idx ?? 0;
  const comfortFlight = sorted[Math.floor(sorted.length / 2)]?._idx ?? 0;

  const hotelSelections = (tier: "low" | "mid" | "high") => {
    const result: Record<string, number> = {};
    for (const [city, hs] of Object.entries(hotels)) {
      const arr = hs as any[];
      if (arr.length === 0) continue;
      const byStar = [...arr].sort((a, b) => (a.price_level ?? 0) - (b.price_level ?? 0));
      if (tier === "low") result[city] = arr.indexOf(byStar[0]);
      else if (tier === "high") result[city] = arr.indexOf(byStar[byStar.length - 1]);
      else result[city] = arr.indexOf(byStar[Math.floor(byStar.length / 2)]);
    }
    return result;
  };

  return [
    { tier: "essencial", flight_index: essentialFlight, hotel_selections: hotelSelections("low"), highlight: "Menor investimento com qualidade aceitável", flight_reason: "Opção mais econômica", hotel_reason: "Hotéis com melhor preço" },
    { tier: "conforto", flight_index: comfortFlight, hotel_selections: hotelSelections("mid"), highlight: "Melhor equilíbrio entre preço e experiência", flight_reason: "Melhor custo-benefício", hotel_reason: "Hotéis com boa avaliação e preço justo" },
    { tier: "premium", flight_index: premiumFlight, hotel_selections: hotelSelections("high"), highlight: "Experiência máxima de conforto e qualidade", flight_reason: "Mais confortável", hotel_reason: "Hotéis top com melhores avaliações" },
  ];
}

// ── Parse Amadeus flight offers ──
function parseFlightOffers(data: any, totalPax: number, cabin: string): any[] {
  const dictionaries = data.dictionaries || {};
  return (data.data || []).slice(0, 8).map((offer: any) => {
    const itineraries = (offer.itineraries || []).map((itin: any, itinIdx: number) => {
      const segments = (itin.segments || []).map((seg: any, segIdx: number) => {
        const durationMatch = seg.duration?.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
        const durationMinutes = durationMatch ? (parseInt(durationMatch[1] || "0") * 60 + parseInt(durationMatch[2] || "0")) : 0;
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
          operated_by: operatingCode && operatingCode !== carrierCode ? (dictionaries?.carriers?.[operatingCode] || operatingCode) : "",
          aircraft: dictionaries?.aircraft?.[aircraftCode] || aircraftCode,
          cabin: offer.travelerPricings?.[0]?.fareDetailsBySegment?.find((f: any) => f.segmentId === seg.id)?.cabin || "",
        };
      });
      const totalDuration = itin.duration?.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
      const totalMinutes = totalDuration ? (parseInt(totalDuration[1] || "0") * 60 + parseInt(totalDuration[2] || "0")) : 0;
      return { direction: itinIdx === 0 ? "ida" : "volta", segments, total_duration_minutes: totalMinutes, stops: segments.length - 1 };
    });
    const baggage = offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.includedCheckedBags;
    const baggageInfo = baggage ? (baggage.weight ? `${baggage.weight}${baggage.weightUnit || "KG"}` : baggage.quantity ? `${baggage.quantity} mala(s)` : "") : "";
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

    const originIATA = resolveIATA(origin);
    const destIATA = resolveIATA(destination);
    const totalPax = (adults || 1) + (children || 0) + (babies || 0);
    const cabin = flight_preference ? cabinMap[flight_preference.toLowerCase()] || "" : "";
    const allCities = [destination, ...(sub_destinations || [])].filter(Boolean);

    console.log(`🔍 Searching flights: ${originIATA} → ${destIATA}, ${departure_date}${return_date ? ` / ${return_date}` : ""}`);
    console.log(`🏨 Searching hotels in: ${allCities.join(", ")}`);

    // ── PARALLEL: Search flights + hotels ──
    const [flightResult, ...hotelResults] = await Promise.allSettled([
      (async () => {
        const params: Record<string, string> = {
          originLocationCode: originIATA,
          destinationLocationCode: destIATA,
          departureDate: departure_date,
          adults: String(adults || 1),
          max: "8",
          currencyCode: "BRL",
          nonStop: "false",
        };
        if (return_date) params.returnDate = return_date;
        if (children) params.children = String(children);
        if (cabin) params.travelClass = cabin;
        const data = await amadeusGet("/v2/shopping/flight-offers", params);
        return parseFlightOffers(data, totalPax, cabin);
      })(),
      ...allCities.map(city => searchHotelsGooglePlaces(city)),
    ]);

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

    // ── AI builds 3-tier packages ──
    const packages = await buildPackagesWithAI(flights, hotelsByCity, body);

    return new Response(JSON.stringify({
      flights,
      hotels: hotelsByCity,
      packages,
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
