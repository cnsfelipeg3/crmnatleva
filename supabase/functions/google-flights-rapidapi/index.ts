// ============================================================
// google-flights-rapidapi — Proxy DataCrawler Google Flights
// Isolado: NÃO interfere em booking-rapidapi, hotel-search, etc.
// Cache em gflights_rapidapi_cache + logs em gflights_rapidapi_logs.
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RAPIDAPI_HOST = "google-flights2.p.rapidapi.com";
const RAPIDAPI_BASE = `https://${RAPIDAPI_HOST}`;

// Slugs reais do playground DataCrawler (todos com prefixo /api/v1/)
const ACTION_ENDPOINTS: Record<string, string> = {
  searchAirport: "/api/v1/searchAirport",
  searchFlights: "/api/v1/searchFlights",
  searchMultiCityFlights: "/api/v1/searchMultiCityFlights",
  getCalendarPicker: "/api/v1/getCalendarPicker",
  getCalendarGrid: "/api/v1/getCalendarGrid",
  getPriceGraph: "/api/v1/getPriceGraph",
  getNextFlights: "/api/v1/getNextFlights",
  getBookingDetails: "/api/v1/getBookingDetails",
  getBookingURL: "/api/v1/getBookingURL",
  getLanguages: "/api/v1/getLanguages",
  getLocations: "/api/v1/getLocations",
  getCurrency: "/api/v1/getCurrency",
  checkServer: "/api/v1/checkServer",
};

// TTL (segundos) — balancear frescor x consumo. Scraper é caro.
const CACHE_TTL: Record<string, number> = {
  searchAirport: 60 * 60 * 24 * 7,        // 7 dias
  searchFlights: 60 * 30,                  // 30 min
  searchMultiCityFlights: 60 * 30,
  getCalendarPicker: 60 * 60 * 6,          // 6h — calendário
  getCalendarGrid: 60 * 60 * 6,
  getPriceGraph: 60 * 60 * 6,              // 6h — tendência
  getNextFlights: 60 * 30,
  getBookingDetails: 60 * 30,
  getBookingURL: 60 * 30,
  getLanguages: 60 * 60 * 24 * 30,
  getLocations: 60 * 60 * 24 * 30,
  getCurrency: 60 * 60 * 24 * 30,
  checkServer: 60,
};

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function buildCacheKey(action: string, params: Record<string, string>): string {
  const ordered = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return `${action}::${ordered}`;
}

async function readCache(action: string, params: Record<string, string>) {
  try {
    const supabase = getSupabaseAdmin();
    const cacheKey = buildCacheKey(action, params);
    const { data, error } = await supabase
      .from("gflights_rapidapi_cache")
      .select("response, expires_at")
      .eq("cache_key", cacheKey)
      .maybeSingle();
    if (error || !data) return null;
    if (new Date(data.expires_at).getTime() < Date.now()) return null;
    return data.response;
  } catch (err) {
    console.error("[gflights] readCache error:", err);
    return null;
  }
}

async function writeCache(
  action: string,
  params: Record<string, string>,
  response: unknown,
) {
  try {
    const supabase = getSupabaseAdmin();
    const cacheKey = buildCacheKey(action, params);
    const ttl = CACHE_TTL[action] ?? 60 * 30;
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
    await supabase.from("gflights_rapidapi_cache").upsert(
      { cache_key: cacheKey, action, params, response, expires_at: expiresAt },
      { onConflict: "cache_key" },
    );
  } catch (err) {
    console.error("[gflights] writeCache error:", err);
  }
}

async function logCall(payload: {
  action: string;
  params: Record<string, string>;
  cache_hit: boolean;
  status_code?: number;
  latency_ms?: number;
  error_message?: string;
}) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("gflights_rapidapi_logs").insert({
      action: payload.action,
      params: payload.params,
      cache_hit: payload.cache_hit,
      status_code: payload.status_code ?? null,
      latency_ms: payload.latency_ms ?? null,
      error_message: payload.error_message ?? null,
    });
  } catch (err) {
    console.error("[gflights] logCall error:", err);
  }
}

async function callRapidApi(
  endpoint: string,
  params: Record<string, string>,
  action: string,
): Promise<{ data: unknown; status: number }> {
  const apiKey = Deno.env.get("RAPIDAPI_GFLIGHTS_KEY");
  if (!apiKey) throw new Error("RAPIDAPI_GFLIGHTS_KEY não configurado.");

  const qs = new URLSearchParams(params).toString();
  const url = `${RAPIDAPI_BASE}${endpoint}${qs ? `?${qs}` : ""}`;

  const MAX_ATTEMPTS = 3;
  const PER_ATTEMPT_TIMEOUT_MS = 30_000;
  let lastStatus = 0;
  let lastData: unknown = null;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PER_ATTEMPT_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "x-rapidapi-host": RAPIDAPI_HOST,
          "x-rapidapi-key": apiKey,
        },
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await res.json().catch(() => ({ raw: "<invalid json>" }));
      lastStatus = res.status;
      lastData = data;
      const isTransient = res.status === 502 || res.status === 503 || res.status === 504;
      if (!isTransient) return { data, status: res.status };
      console.warn(`[gflights] ${action} attempt ${attempt}/${MAX_ATTEMPTS} → ${res.status}; retrying`);
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      console.warn(`[gflights] ${action} attempt ${attempt}/${MAX_ATTEMPTS} failed: ${(err as Error)?.message}`);
    }
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, attempt === 1 ? 1000 : 2500));
    }
  }
  if (lastStatus > 0) return { data: lastData, status: lastStatus };
  return {
    data: { error: "upstream_unreachable", message: (lastError as Error)?.message ?? "RapidAPI unreachable" },
    status: 504,
  };
}

function assertParams(input: Record<string, any>, required: string[]) {
  const missing = required.filter(
    (k) => input[k] === undefined || input[k] === null || input[k] === "",
  );
  if (missing.length > 0) {
    throw new Error(`Parâmetros obrigatórios faltando: ${missing.join(", ")}`);
  }
}

function buildParams(action: string, input: Record<string, any>): Record<string, string> {
  const defaults = { currency: "BRL", language_code: "pt-BR", country_code: "BR" };

  switch (action) {
    case "searchAirport": {
      assertParams(input, ["query"]);
      return {
        query: String(input.query),
        language_code: defaults.language_code,
        country_code: defaults.country_code,
      };
    }
    case "searchFlights": {
      assertParams(input, ["departure_id", "arrival_id", "outbound_date"]);
      const p: Record<string, string> = {
        departure_id: String(input.departure_id),
        arrival_id: String(input.arrival_id),
        outbound_date: String(input.outbound_date),
        travel_class: String(input.travel_class ?? "ECONOMY"),
        adults: String(input.adults ?? 1),
        show_hidden: String(input.show_hidden ?? "0"),
      currency: defaults.currency,
        language_code: defaults.language_code,
        country_code: defaults.country_code,
      };
      if (input.return_date) p.return_date = String(input.return_date);
      if (input.children !== undefined) p.children = String(input.children);
      if (input.infant_in_seat !== undefined) p.infant_in_seat = String(input.infant_in_seat);
      if (input.infant_on_lap !== undefined) p.infant_on_lap = String(input.infant_on_lap);
      if (input.stops !== undefined) p.stops = String(input.stops);
      if (input.max_price !== undefined) p.max_price = String(input.max_price);
      if (input.max_duration !== undefined) p.max_duration = String(input.max_duration);
      if (input.included_airlines) p.included_airlines = String(input.included_airlines);
      if (input.excluded_airlines) p.excluded_airlines = String(input.excluded_airlines);
      if (input.included_connecting_airports) p.included_connecting_airports = String(input.included_connecting_airports);
      if (input.excluded_connecting_airports) p.excluded_connecting_airports = String(input.excluded_connecting_airports);
      if (input.sort_by) p.sort_by = String(input.sort_by);
      if (input.next_token) p.next_token = String(input.next_token);
      return p;
    }
    case "getCalendarPicker":
    case "getCalendarGrid": {
      assertParams(input, ["departure_id", "arrival_id", "outbound_date"]);
      const p: Record<string, string> = {
        departure_id: String(input.departure_id),
        arrival_id: String(input.arrival_id),
        outbound_date: String(input.outbound_date),
        travel_class: String(input.travel_class ?? "ECONOMY"),
        adults: String(input.adults ?? 1),
        currency: defaults.currency,
        language_code: defaults.language_code,
        country_code: defaults.country_code,
      };
      if (input.return_date) p.return_date = String(input.return_date);
      if (input.trip_length !== undefined) p.trip_length = String(input.trip_length);
      return p;
    }
    case "getPriceGraph": {
      assertParams(input, ["departure_id", "arrival_id", "outbound_date"]);
      const p: Record<string, string> = {
        departure_id: String(input.departure_id),
        arrival_id: String(input.arrival_id),
        outbound_date: String(input.outbound_date),
        travel_class: String(input.travel_class ?? "ECONOMY"),
        adults: String(input.adults ?? 1),
        currency: defaults.currency,
        language_code: defaults.language_code,
        country_code: defaults.country_code,
      };
      if (input.return_date) p.return_date = String(input.return_date);
      return p;
    }
    case "getNextFlights":
    case "getBookingDetails": {
      // DataCrawler aceita booking_token como alias para next_token
      const token = input.next_token ?? input.booking_token;
      if (!token) {
        throw new Error("Parâmetros obrigatórios faltando: next_token (ou booking_token)");
      }
      return {
        booking_token: String(token),
        currency: defaults.currency,
        language_code: defaults.language_code,
        country_code: defaults.country_code,
      };
    }
    case "getBookingURL": {
      // getBookingURL exige PROVIDER token (vem de getBookingDetails), NÃO o booking_token do voo.
      // O nome do parâmetro aceito pela DataCrawler é exclusivamente "token".
      const token = input.token ?? input.next_token ?? input.booking_token;
      if (!token) {
        throw new Error("Token obrigatório (provider token)");
      }
      return {
        token: String(token),
        currency: defaults.currency,
        language_code: defaults.language_code,
        country_code: defaults.country_code,
      };
    }
    case "getLanguages":
    case "getLocations":
    case "getCurrency":
    case "checkServer": {
      return {};
    }
    default:
      throw new Error(`Action desconhecida: ${action}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let action = "unknown";
  let params: Record<string, string> = {};

  try {
    // verify_jwt = true → valida claims
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    action = String(body.action ?? "");
    if (!action || !ACTION_ENDPOINTS[action]) {
      return new Response(
        JSON.stringify({ error: "invalid_action", message: `Action inválida: ${action}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    params = buildParams(action, body);

    // 1) Cache
    const cached = await readCache(action, params);
    if (cached) {
      await logCall({
        action,
        params,
        cache_hit: true,
        status_code: 200,
        latency_ms: Date.now() - startTime,
      });
      return new Response(JSON.stringify({ ...cached, __cache: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Upstream — para searchFlights, faz auto-paginação até MAX_PAGES
    const endpoint = ACTION_ENDPOINTS[action];
    let { data, status } = await callRapidApi(endpoint, params, action);

    if (action === "searchFlights" && status >= 200 && status < 300) {
      const MAX_PAGES = 5; // 1 inicial + 4 próximas (~ até 100-150 voos)
      const mergedTop: any[] = [];
      const mergedOther: any[] = [];
      let pageData: any = data;
      let pagesFetched = 0;

      function extractNextToken(d: any): string | null {
        // DataCrawler já testou múltiplos formatos · cobrir todos
        return (
          d?.data?.next_token ??
          d?.data?.itineraries?.next_token ??
          d?.data?.nextToken ??
          d?.next_token ??
          d?.nextToken ??
          null
        );
      }

      // Página 1 já está em "data"
      const itin0 = pageData?.data?.itineraries ?? {};
      if (Array.isArray(itin0.topFlights)) mergedTop.push(...itin0.topFlights);
      if (Array.isArray(itin0.otherFlights)) mergedOther.push(...itin0.otherFlights);
      pagesFetched = 1;

      let nextToken = extractNextToken(pageData);
      while (nextToken && pagesFetched < MAX_PAGES) {
        try {
          const nextParams = { ...params, next_token: nextToken };
          const { data: nextData, status: nextStatus } = await callRapidApi(endpoint, nextParams, action + "_next");
          if (nextStatus < 200 || nextStatus >= 300) break;
          const itinN = (nextData as any)?.data?.itineraries ?? {};
          const addedTop = Array.isArray(itinN.topFlights) ? itinN.topFlights.length : 0;
          const addedOther = Array.isArray(itinN.otherFlights) ? itinN.otherFlights.length : 0;
          if (Array.isArray(itinN.topFlights)) mergedTop.push(...itinN.topFlights);
          if (Array.isArray(itinN.otherFlights)) mergedOther.push(...itinN.otherFlights);
          pagesFetched += 1;
          console.log(`[gflights] page ${pagesFetched} → +${addedTop} top, +${addedOther} other`);
          if (addedTop + addedOther === 0) break; // página vazia · evita loop
          nextToken = extractNextToken(nextData);
        } catch (e) {
          console.warn(`[gflights] pagination break: ${(e as Error)?.message}`);
          break;
        }
      }

      // Reconstroi o payload com todas as páginas mescladas + dedupe leve por booking_token/key
      const dedupeKey = (it: any) =>
        it?.booking_token ?? it?.departure_token ?? JSON.stringify({
          p: it?.price,
          d: it?.duration?.raw ?? it?.duration,
          f: (it?.flights ?? []).map((l: any) => `${l?.flight_number}-${l?.departure_airport?.time}`).join("|"),
        });
      const seen = new Set<string>();
      const dedupe = (arr: any[]) => arr.filter((it) => {
        const k = dedupeKey(it);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      const finalTop = dedupe(mergedTop);
      const finalOther = dedupe(mergedOther);

      console.log(`[gflights] ✓ search complete · ${pagesFetched} page(s) · ${finalTop.length} top + ${finalOther.length} other`);

      data = {
        ...(pageData as object),
        data: {
          ...((pageData as any)?.data ?? {}),
          itineraries: {
            ...((pageData as any)?.data?.itineraries ?? {}),
            topFlights: finalTop,
            otherFlights: finalOther,
          },
          __pagination: { pages_fetched: pagesFetched, total_top: finalTop.length, total_other: finalOther.length },
        },
      };
    }

    if (status >= 200 && status < 300) {
      await writeCache(action, params, data);
    }

    await logCall({
      action,
      params,
      cache_hit: false,
      status_code: status,
      latency_ms: Date.now() - startTime,
      error_message: status >= 400 ? JSON.stringify(data).slice(0, 500) : undefined,
    });

    return new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = (err as Error)?.message ?? "Erro interno";
    console.error("[gflights] handler error:", err);
    await logCall({
      action,
      params,
      cache_hit: false,
      latency_ms: Date.now() - startTime,
      error_message: message,
    });
    return new Response(JSON.stringify({ error: "internal_error", message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
