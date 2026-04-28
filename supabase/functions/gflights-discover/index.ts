// deploy trigger v3 (unsplash + rich cards)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RAPIDAPI_HOST = "google-flights2.p.rapidapi.com";
const RAPIDAPI_BASE = `https://${RAPIDAPI_HOST}`;
const CACHE_TTL_HOURS = 24;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const {
      naturalQuery, budget, origin, monthOffset, durationDays, paxAdults,
      mood, regions, countries, cities, excludeCountries,
    } = body;

    let extracted: {
      budget: number | null;
      origin: string;
      monthOffset: number;
      durationDays: number;
      paxAdults: number;
      mood: string | null;
      regions: string[];
      countries: string[];
      cities: string[];
      excludeCountries: string[];
    } = {
      budget: typeof budget === "number" ? budget : null,
      origin: origin || "GRU",
      monthOffset: typeof monthOffset === "number" ? monthOffset : 2,
      durationDays: durationDays || 7,
      paxAdults: paxAdults || 1,
      mood: mood || null,
      regions: regions || [],
      countries: countries || [],
      cities: cities || [],
      excludeCountries: excludeCountries || [],
    };

    if (naturalQuery && typeof naturalQuery === "string") {
      const aiResult = await extractEntitiesFromQuery(naturalQuery);
      extracted = {
        budget: extracted.budget ?? aiResult.budget,
        origin: extracted.origin || aiResult.origin || "GRU",
        monthOffset: extracted.monthOffset ?? aiResult.monthOffset ?? 2,
        durationDays: extracted.durationDays ?? aiResult.durationDays ?? 7,
        paxAdults: extracted.paxAdults ?? aiResult.paxAdults ?? 1,
        mood: extracted.mood ?? aiResult.mood,
        regions: extracted.regions?.length ? extracted.regions : (aiResult.regions || []),
        countries: extracted.countries?.length ? extracted.countries : (aiResult.countries || []),
        cities: extracted.cities?.length ? extracted.cities : (aiResult.cities || []),
        excludeCountries: extracted.excludeCountries?.length
          ? extracted.excludeCountries : (aiResult.excludeCountries || []),
      };
    }

    if (!extracted.budget || extracted.budget < 500) {
      return json({
        error: "missing_budget",
        message: "Não consegui identificar um orçamento válido. Diga algo como 'tenho R$ 5.000'.",
      }, 400);
    }

    const { data: destinations, error: destErr } = await supabase
      .from("popular_destinations")
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .limit(60);

    if (destErr) return json({ error: "db_error", message: destErr.message }, 500);

    // Filtro hierárquico: cities > countries > regions
    let filteredDests = destinations || [];
    if (extracted.cities?.length) {
      filteredDests = filteredDests.filter((d: any) => extracted.cities.includes(d.iata));
    } else if (extracted.countries?.length) {
      filteredDests = filteredDests.filter((d: any) => extracted.countries.includes(d.country_code));
    } else if (extracted.regions?.length) {
      filteredDests = filteredDests.filter((d: any) => extracted.regions.includes(d.region));
    }

    if (extracted.excludeCountries?.length) {
      filteredDests = filteredDests.filter((d: any) => !extracted.excludeCountries.includes(d.country_code));
    }

    if (extracted.mood) {
      filteredDests.sort((a: any, b: any) => {
        const aMatch = a.tags?.includes(extracted.mood) ? 1 : 0;
        const bMatch = b.tags?.includes(extracted.mood) ? 1 : 0;
        return bMatch - aMatch;
      });
    }

    if (filteredDests.length === 0) {
      const requested =
        extracted.cities?.[0] ||
        extracted.countries?.[0] ||
        extracted.regions?.[0] ||
        "esses critérios";
      return json({
        success: false,
        error: "no_matching_destinations",
        message: `Não tenho destinos cadastrados para "${requested}". Tenta sem o nome do país/cidade · vou achar alternativas.`,
        extracted,
      }, 200);
    }

    filteredDests = filteredDests.slice(0, 20);


    const target = new Date();
    target.setMonth(target.getMonth() + extracted.monthOffset);
    const periodMonth = target.getMonth() + 1;
    const periodYear = target.getFullYear();
    const day1 = `${periodYear}-${String(periodMonth).padStart(2, "0")}-15`;
    const returnDate = (() => {
      const d = new Date(day1);
      d.setDate(d.getDate() + (extracted.durationDays || 7));
      return d.toISOString().slice(0, 10);
    })();

    const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_GFLIGHTS_KEY");
    if (!RAPIDAPI_KEY) {
      return json({ error: "config", message: "RAPIDAPI_GFLIGHTS_KEY não configurado" }, 500);
    }

    // Concorrência limitada (5 em paralelo) pra evitar 429 do RapidAPI
    const CONCURRENCY = 5;
    const fetchOne = async (dest: any) => {
      const { data: cached } = await supabase
        .from("gflights_discovery_cache")
        .select("*")
        .eq("origin_iata", extracted.origin)
        .eq("destination_iata", dest.iata)
        .eq("period_month", periodMonth)
        .eq("period_year", periodYear)
        .eq("adults", extracted.paxAdults)
        .gte("fetched_at", new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (cached?.min_price) {
        return { dest, minPrice: Number(cached.min_price), sample: cached.sample_flight, fromCache: true };
      }

      const params = new URLSearchParams({
        departure_id: extracted.origin,
        arrival_id: dest.iata,
        outbound_date: day1,
        return_date: returnDate,
        travel_class: "ECONOMY",
        adults: String(extracted.paxAdults),
        currency: "BRL",
        country_code: "BR",
        language_code: "pt-BR",
      });

      const url = `${RAPIDAPI_BASE}/api/v1/searchFlights?${params}`;
      let resp: Response;
      try {
        resp = await fetch(url, {
          headers: { "x-rapidapi-host": RAPIDAPI_HOST, "x-rapidapi-key": RAPIDAPI_KEY },
          signal: AbortSignal.timeout(15000),
        });
      } catch (e: any) {
        return { dest, error: `fetch_${e?.name || "fail"}` };
      }

      // 429 · backoff curto e 1 retry
      if (resp.status === 429) {
        await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
        try {
          resp = await fetch(url, {
            headers: { "x-rapidapi-host": RAPIDAPI_HOST, "x-rapidapi-key": RAPIDAPI_KEY },
            signal: AbortSignal.timeout(15000),
          });
        } catch (e: any) {
          return { dest, error: `retry_${e?.name || "fail"}` };
        }
      }

      if (!resp.ok) return { dest, error: `status_${resp.status}` };
      const data = await resp.json();
      if (data?.status === false) return { dest, error: "api_false" };

      const top = data?.data?.itineraries?.topFlights || [];
      const other = data?.data?.itineraries?.otherFlights || [];
      const all = [...top, ...other];
      if (all.length === 0) return { dest, error: "no_flights" };

      const cheapest = all.reduce((min: any, it: any) => {
        if (typeof it.price !== "number") return min;
        if (!min || it.price < min.price) return it;
        return min;
      }, null);

      if (!cheapest) return { dest, error: "no_price" };

      await supabase.from("gflights_discovery_cache").upsert({
        origin_iata: extracted.origin,
        destination_iata: dest.iata,
        period_month: periodMonth,
        period_year: periodYear,
        adults: extracted.paxAdults,
        travel_class: "ECONOMY",
        min_price: cheapest.price,
        sample_flight: cheapest,
        fetched_at: new Date().toISOString(),
      }, { onConflict: "origin_iata,destination_iata,period_month,period_year,adults,travel_class" });

      return { dest, minPrice: cheapest.price, sample: cheapest, fromCache: false };
    };

    // Executa em batches de CONCURRENCY
    const results: PromiseSettledResult<any>[] = [];
    for (let i = 0; i < filteredDests.length; i += CONCURRENCY) {
      const batch = filteredDests.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(batch.map((d: any) => fetchOne(d)));
      results.push(...batchResults);
    }

    const successful = results
      .filter((r): r is PromiseFulfilledResult<any> =>
        r.status === "fulfilled" && r.value && !r.value.error && r.value.minPrice
      )
      .map((r) => r.value);

    const fitsInBudget = successful.filter((r) => r.minPrice <= extracted.budget! * 0.7);
    const ranked = (fitsInBudget.length > 0 ? fitsInBudget : successful)
      .sort((a, b) => a.minPrice - b.minPrice)
      .slice(0, 5);

    // Enriquecer com fotos Unsplash (cache de 30 dias na tabela)
    const supaWrite = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const enriched = await Promise.all(ranked.map(async (r) => {
      const heroFresh = r.dest.hero_fetched_at
        ? (Date.now() - new Date(r.dest.hero_fetched_at).getTime()) < (30 * 24 * 60 * 60 * 1000)
        : false;
      if (r.dest.hero_image_url && heroFresh) return r;
      const photo = await fetchUnsplashHero(`${r.dest.city} ${r.dest.country}`);
      if (!photo) return r;
      await supaWrite.from("popular_destinations").update({
        hero_image_url: photo.url,
        hero_photographer: photo.photographer,
        hero_photographer_url: photo.photographerUrl,
        hero_unsplash_id: photo.id,
        hero_fetched_at: new Date().toISOString(),
      }).eq("iata", r.dest.iata);
      return {
        ...r,
        dest: {
          ...r.dest,
          hero_image_url: photo.url,
          hero_photographer: photo.photographer,
          hero_photographer_url: photo.photographerUrl,
        },
      };
    }));

    return json({
      success: true,
      extracted,
      period: { month: periodMonth, year: periodYear, day1, returnDate },
      totalCandidates: filteredDests.length,
      totalWithFlights: successful.length,
      totalFitsBudget: fitsInBudget.length,
      results: enriched.map((r) => {
        const flightsArr = Array.isArray(r.sample?.flights) ? r.sample.flights : [];
        const layoversArr = Array.isArray(r.sample?.layovers) ? r.sample.layovers : [];
        const lastFlight = flightsArr.length > 0 ? flightsArr[flightsArr.length - 1] : null;
        return {
          iata: r.dest.iata,
          city: r.dest.city,
          country: r.dest.country,
          country_code: r.dest.country_code,
          region: r.dest.region,
          tags: r.dest.tags,
          hero_image_url: r.dest.hero_image_url,
          hero_photographer: r.dest.hero_photographer,
          hero_photographer_url: r.dest.hero_photographer_url,
          description: r.dest.description,
          visa_required: r.dest.visa_required,
          avg_trip_days: r.dest.avg_trip_days,
          minPrice: r.minPrice,
          sampleFlight: r.sample,
          flightDeparture: flightsArr[0]?.departure_airport?.time ?? null,
          flightArrival: lastFlight?.arrival_airport?.time ?? null,
          flightDuration: r.sample?.duration?.text ?? null,
          flightStops: Math.max(layoversArr.length, Math.max(0, flightsArr.length - 1)),
          flightAirline: flightsArr[0]?.airline ?? null,
          flightAirlineLogo: r.sample?.airline_logo ?? flightsArr[0]?.airline_logo ?? null,
          flightLayovers: layoversArr.map((l: any) => ({
            id: l.airport_code,
            city: l.city,
            duration: l.duration,
            durationText: l.duration_label,
          })),
          fromCache: r.fromCache,
          fitsBudget: r.minPrice <= extracted.budget! * 0.7,
        };
      }),
    });
  } catch (e: any) {
    console.error("[gflights-discover] error:", e?.message);
    return json({ error: "internal_error", message: e?.message }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function extractEntitiesFromQuery(query: string): Promise<{
  budget: number | null;
  origin: string | null;
  monthOffset: number | null;
  durationDays: number | null;
  paxAdults: number | null;
  mood: string | null;
  regions: string[];
}> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return regexFallback(query);

  const systemPrompt = `Você é um extrator de informação de viagem. Recebe uma frase em português brasileiro descrevendo uma intenção de viagem e devolve um JSON estrito com os campos abaixo. Se algum campo não puder ser inferido, devolva null.

Campos:
- budget: número em BRL (ex: "R$ 5.000" ou "5 mil" → 5000). Se não houver, null.
- origin: código IATA do aeroporto de origem (ex: "São Paulo" → "GRU", "Rio de Janeiro" → "GIG", "Recife" → "REC"). Se não houver, null.
- monthOffset: meses à frente da data atual (1=mês que vem, 2=daqui 2 meses). Se mencionado mês específico, calcule. Default null.
- durationDays: duração em dias (ex: "10 dias" → 10, "uma semana" → 7, "fim de semana" → 3). Default null.
- paxAdults: número de adultos (ex: "com a esposa" → 2, "sozinho" → 1, "família de 4" → 4). Default null.
- mood: UMA das seguintes (string única) ou null: praia, urbano, montanha, gastronomia, romantico, familia, aventura, cultura, luxo, natureza.
- regions: lista de regiões mencionadas (de: ["Brasil","Américas","Europa","Caribe","Oriente Médio","Ásia","África"]). Vazio se não mencionado.

Devolva APENAS o JSON, sem markdown, sem explicação.`;

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) return regexFallback(query);
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    return {
      budget: typeof parsed.budget === "number" ? parsed.budget : null,
      origin: typeof parsed.origin === "string" ? parsed.origin.toUpperCase() : null,
      monthOffset: typeof parsed.monthOffset === "number" ? parsed.monthOffset : null,
      durationDays: typeof parsed.durationDays === "number" ? parsed.durationDays : null,
      paxAdults: typeof parsed.paxAdults === "number" ? parsed.paxAdults : null,
      mood: typeof parsed.mood === "string" ? parsed.mood : null,
      regions: Array.isArray(parsed.regions) ? parsed.regions : [],
    };
  } catch {
    return regexFallback(query);
  }
}

function regexFallback(q: string) {
  const budgetMatch = q.match(/(?:r\$\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)\s*(?:mil|k)?/i);
  let budget: number | null = null;
  if (budgetMatch) {
    const n = Number(budgetMatch[1].replace(/[.,]/g, ""));
    budget = /mil|k/i.test(budgetMatch[0]) ? n * 1000 : n;
  }
  return { budget, origin: null, monthOffset: null, durationDays: null, paxAdults: null, mood: null, regions: [] };
}

async function fetchUnsplashHero(query: string): Promise<{
  url: string; photographer: string; photographerUrl: string; id: string;
} | null> {
  const key = Deno.env.get("UNSPLASH_ACCESS_KEY");
  if (!key) return null;
  try {
    const params = new URLSearchParams({
      query: `${query} cityscape landmark travel`,
      orientation: "landscape",
      content_filter: "high",
      per_page: "10",
      order_by: "relevant",
    });
    const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
      headers: { "Authorization": `Client-ID ${key}`, "Accept-Version": "v1" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const photos = Array.isArray(data?.results) ? data.results : [];
    if (photos.length === 0) return null;
    const photo = photos[0];
    const baseUrl = photo?.urls?.regular || photo?.urls?.small || "";
    if (!baseUrl) return null;
    const optimizedUrl = baseUrl.includes("?")
      ? `${baseUrl}&w=800&h=400&fit=crop&q=85`
      : `${baseUrl}?w=800&h=400&fit=crop&q=85`;
    return {
      url: optimizedUrl,
      photographer: photo?.user?.name || "Unsplash",
      photographerUrl: photo?.user?.links?.html || "https://unsplash.com",
      id: photo?.id || "",
    };
  } catch { return null; }
}
