// deploy trigger v2
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
    const { naturalQuery, budget, origin, monthOffset, durationDays, paxAdults, mood, regions } = body;

    let extracted: {
      budget: number | null;
      origin: string;
      monthOffset: number;
      durationDays: number;
      paxAdults: number;
      mood: string | null;
      regions: string[];
    } = {
      budget: typeof budget === "number" ? budget : null,
      origin: origin || "GRU",
      monthOffset: typeof monthOffset === "number" ? monthOffset : 2,
      durationDays: durationDays || 7,
      paxAdults: paxAdults || 1,
      mood: mood || null,
      regions: regions || [],
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
      .limit(40);

    if (destErr) return json({ error: "db_error", message: destErr.message }, 500);

    let filteredDests = destinations || [];
    if (extracted.regions?.length) {
      filteredDests = filteredDests.filter((d: any) => extracted.regions.includes(d.region));
    }
    if (extracted.mood) {
      filteredDests.sort((a: any, b: any) => {
        const aMatch = a.tags?.includes(extracted.mood) ? 1 : 0;
        const bMatch = b.tags?.includes(extracted.mood) ? 1 : 0;
        return bMatch - aMatch;
      });
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

    const results = await Promise.allSettled(
      filteredDests.map(async (dest: any) => {
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
        const resp = await fetch(url, {
          headers: { "x-rapidapi-host": RAPIDAPI_HOST, "x-rapidapi-key": RAPIDAPI_KEY },
          signal: AbortSignal.timeout(15000),
        });

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
      }),
    );

    const successful = results
      .filter((r): r is PromiseFulfilledResult<any> =>
        r.status === "fulfilled" && r.value && !r.value.error && r.value.minPrice
      )
      .map((r) => r.value);

    const fitsInBudget = successful.filter((r) => r.minPrice <= extracted.budget! * 0.7);
    const ranked = (fitsInBudget.length > 0 ? fitsInBudget : successful)
      .sort((a, b) => a.minPrice - b.minPrice)
      .slice(0, 5);

    return json({
      success: true,
      extracted,
      period: { month: periodMonth, year: periodYear, day1, returnDate },
      totalCandidates: filteredDests.length,
      totalWithFlights: successful.length,
      totalFitsBudget: fitsInBudget.length,
      results: ranked.map((r) => ({
        iata: r.dest.iata,
        city: r.dest.city,
        country: r.dest.country,
        region: r.dest.region,
        tags: r.dest.tags,
        hero_image_url: r.dest.hero_image_url,
        description: r.dest.description,
        visa_required: r.dest.visa_required,
        avg_trip_days: r.dest.avg_trip_days,
        minPrice: r.minPrice,
        sampleFlight: r.sample,
        fromCache: r.fromCache,
        fitsBudget: r.minPrice <= extracted.budget! * 0.7,
      })),
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
