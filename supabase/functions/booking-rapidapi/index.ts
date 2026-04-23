// ============================================================
// booking-rapidapi — Proxy para a API do Booking.com via RapidAPI
// Isolado: não interfere em hotel-search, scrape-hotel-photos, etc.
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RAPIDAPI_HOST = "booking-com15.p.rapidapi.com";
const RAPIDAPI_BASE = `https://${RAPIDAPI_HOST}`;

// TTL (em segundos) por ação — balanceia frescor e consumo de requests
const CACHE_TTL: Record<string, number> = {
  searchDestinations: 60 * 60 * 24 * 7, // 7 dias
  searchHotels: 60 * 60,                // 1 hora
  hotelDetails: 60 * 60 * 24,           // 1 dia
  hotelPhotos: 60 * 60 * 24 * 7,        // 7 dias
  hotelReviews: 60 * 60 * 24,           // 1 dia
  roomAvailability: 60 * 30,            // 30 min
  getCurrency: 60 * 60 * 24 * 30,       // 30 dias
  getLanguages: 60 * 60 * 24 * 30,      // 30 dias
};

const ACTION_ENDPOINTS: Record<string, string> = {
  searchDestinations: "/api/v1/hotels/searchDestination",
  searchHotels: "/api/v1/hotels/searchHotels",
  hotelDetails: "/api/v1/hotels/getHotelDetails",
  hotelPhotos: "/api/v1/hotels/getHotelPhotos",
  hotelReviews: "/api/v1/hotels/getHotelReviews",
  roomAvailability: "/api/v1/hotels/getRoomAvailability",
  getCurrency: "/api/v1/meta/getCurrency",
  getLanguages: "/api/v1/meta/getLanguages",
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
      .from("booking_rapidapi_cache")
      .select("response, expires_at")
      .eq("cache_key", cacheKey)
      .maybeSingle();
    if (error || !data) return null;
    if (new Date(data.expires_at).getTime() < Date.now()) return null;
    return data.response;
  } catch (err) {
    console.error("readCache error:", err);
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
    const ttl = CACHE_TTL[action] ?? 60 * 60;
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

    await supabase.from("booking_rapidapi_cache").upsert(
      {
        cache_key: cacheKey,
        action,
        params,
        response,
        expires_at: expiresAt,
      },
      { onConflict: "cache_key" },
    );
  } catch (err) {
    console.error("writeCache error:", err);
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
    await supabase.from("booking_rapidapi_logs").insert({
      action: payload.action,
      params: payload.params,
      cache_hit: payload.cache_hit,
      status_code: payload.status_code ?? null,
      latency_ms: payload.latency_ms ?? null,
      error_message: payload.error_message ?? null,
    });
  } catch (err) {
    console.error("logCall error:", err);
  }
}

async function callRapidApi(
  endpoint: string,
  params: Record<string, string>,
): Promise<{ data: unknown; status: number }> {
  const apiKey = Deno.env.get("RAPIDAPI_KEY");
  if (!apiKey) {
    throw new Error("RAPIDAPI_KEY não configurado.");
  }

  const qs = new URLSearchParams(params).toString();
  const url = `${RAPIDAPI_BASE}${endpoint}${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-rapidapi-host": RAPIDAPI_HOST,
      "x-rapidapi-key": apiKey,
      "Content-Type": "application/json",
    },
  });

  const data = await res.json().catch(() => ({ raw: "<invalid json>" }));
  return { data, status: res.status };
}

function assertParams(params: Record<string, any>, required: string[]) {
  const missing = required.filter(
    (k) => params[k] === undefined || params[k] === null || params[k] === "",
  );
  if (missing.length > 0) {
    throw new Error(`Parâmetros obrigatórios faltando: ${missing.join(", ")}`);
  }
}

function buildParams(
  action: string,
  input: Record<string, any>,
): Record<string, string> {
  const defaults = { currency_code: "BRL", locale: "pt-br" };

  switch (action) {
    case "searchDestinations": {
      assertParams(input, ["query"]);
      return { query: String(input.query) };
    }
    case "searchHotels": {
      assertParams(input, ["dest_id", "search_type", "arrival_date", "departure_date"]);
      return {
        dest_id: String(input.dest_id),
        search_type: String(input.search_type),
        arrival_date: String(input.arrival_date),
        departure_date: String(input.departure_date),
        adults: String(input.adults ?? 2),
        children_age: String(input.children_age ?? ""),
        room_qty: String(input.room_qty ?? 1),
        page_number: String(input.page_number ?? 1),
        units: String(input.units ?? "metric"),
        temperature_unit: String(input.temperature_unit ?? "c"),
        languagecode: String(input.languagecode ?? defaults.locale),
        currency_code: String(input.currency_code ?? defaults.currency_code),
      };
    }
    case "hotelDetails": {
      assertParams(input, ["hotel_id", "arrival_date", "departure_date"]);
      return {
        hotel_id: String(input.hotel_id),
        arrival_date: String(input.arrival_date),
        departure_date: String(input.departure_date),
        adults: String(input.adults ?? 2),
        children_age: String(input.children_age ?? ""),
        room_qty: String(input.room_qty ?? 1),
        units: String(input.units ?? "metric"),
        temperature_unit: String(input.temperature_unit ?? "c"),
        languagecode: String(input.languagecode ?? defaults.locale),
        currency_code: String(input.currency_code ?? defaults.currency_code),
      };
    }
    case "hotelPhotos": {
      assertParams(input, ["hotel_id"]);
      return {
        hotel_id: String(input.hotel_id),
        languagecode: String(input.languagecode ?? defaults.locale),
      };
    }
    case "hotelReviews": {
      assertParams(input, ["hotel_id"]);
      return {
        hotel_id: String(input.hotel_id),
        sort_option_id: String(input.sort_option_id ?? "sort_most_relevant"),
        page_number: String(input.page_number ?? 1),
        languagecode: String(input.languagecode ?? defaults.locale),
      };
    }
    case "roomAvailability": {
      assertParams(input, ["hotel_id", "min_date", "max_date"]);
      return {
        hotel_id: String(input.hotel_id),
        min_date: String(input.min_date),
        max_date: String(input.max_date),
        currency_code: String(input.currency_code ?? defaults.currency_code),
        location: String(input.location ?? "US"),
      };
    }
    case "getCurrency":
    case "getLanguages":
      return {};
    default:
      throw new Error(`Ação desconhecida: ${action}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();
  let action = "";
  let params: Record<string, string> = {};

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      action = url.searchParams.get("action") ?? "";
      const raw: Record<string, any> = {};
      url.searchParams.forEach((v, k) => {
        if (k !== "action") raw[k] = v;
      });
      params = buildParams(action, raw);
    } else if (req.method === "POST") {
      const body = await req.json();
      action = body.action ?? "";
      params = buildParams(action, body);
    } else {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!action || !(action in ACTION_ENDPOINTS)) {
      return new Response(
        JSON.stringify({
          error: `Ação inválida. Ações válidas: ${Object.keys(ACTION_ENDPOINTS).join(", ")}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cached = await readCache(action, params);
    if (cached) {
      await logCall({
        action,
        params,
        cache_hit: true,
        latency_ms: Date.now() - startedAt,
      });
      return new Response(
        JSON.stringify({ ...(cached as object), __cache: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const endpoint = ACTION_ENDPOINTS[action];
    const { data, status } = await callRapidApi(endpoint, params);

    if (status >= 400) {
      await logCall({
        action,
        params,
        cache_hit: false,
        status_code: status,
        latency_ms: Date.now() - startedAt,
        error_message: typeof data === "object" ? JSON.stringify(data) : String(data),
      });
      return new Response(
        JSON.stringify({
          error: "Erro na API do Booking.com (via RapidAPI)",
          status,
          details: data,
        }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await writeCache(action, params, data);
    await logCall({
      action,
      params,
      cache_hit: false,
      status_code: status,
      latency_ms: Date.now() - startedAt,
    });

    return new Response(JSON.stringify({ ...(data as object), __cache: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("booking-rapidapi error:", message);

    await logCall({
      action,
      params,
      cache_hit: false,
      latency_ms: Date.now() - startedAt,
      error_message: message,
    });

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});