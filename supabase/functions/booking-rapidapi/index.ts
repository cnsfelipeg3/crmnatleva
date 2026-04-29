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

// Host alternativo pra Hotels.com (via RapidAPI, provider tipsters/hotels-com-provider)
const HOTELSCOM_HOST = "hotels-com-provider.p.rapidapi.com";
const HOTELSCOM_BASE = `https://${HOTELSCOM_HOST}`;

// TTL (em segundos) por ação — balanceia frescor e consumo de requests
const CACHE_TTL: Record<string, number> = {
  searchDestinations: 60 * 60 * 24 * 7, // 7 dias
  searchHotels: 60 * 60,                // 1 hora
  hotelDetails: 60 * 60 * 24,           // 1 dia
  hotelPhotos: 60 * 60 * 24 * 7,        // 7 dias
  hotelReviews: 60 * 60 * 24,           // 1 dia
  roomAvailability: 60 * 30,            // 30 min
  getRoomList: 60 * 30,                 // 30 min — lista rica de ofertas
  getHotelFilter: 60 * 60 * 6,          // 6h — filtros variam pouco
  // ---- Hotels.com (provider ntd119) ----
  hotelscomAutocomplete: 60 * 60 * 24 * 7, // 7 dias
  hotelscomSearch: 60 * 60,                // 1h
  hotelscomDetails: 60 * 60 * 24,          // 1 dia (legado, mantido por compat)
  hotelscomContent: 60 * 60 * 24,
  hotelscomGallery: 60 * 60 * 24 * 3,
  hotelscomAmenities: 60 * 60 * 24 * 3,
  hotelscomOffers: 60 * 30,
  hotelscomSummary: 60 * 60 * 24,
  hotelscomLocation: 60 * 60 * 24 * 3,
  hotelscomRatingSummary: 60 * 60 * 12,
  hotelscomHighlights: 60 * 60 * 24,
  hotelscomReviewsList: 60 * 60 * 12,
  hotelscomReviewsSummary: 60 * 60 * 12,
  hotelscomHeadline: 60 * 60 * 24,
  hotelscomSlugToId: 60 * 60 * 24 * 7,
  // ---- Voos ----
  searchFlightDestinations: 60 * 60 * 24 * 30, // 30 dias — aeroportos não mudam
  searchFlights: 60 * 30,                       // 30 min — preços mudam rápido
  getFlightDetails: 60 * 30,                    // 30 min
  getMinPrice: 60 * 60 * 6,                     // 6h — calendário de preços
  getSeatMap: 60 * 60 * 24,                     // 1 dia
  getCurrency: 60 * 60 * 24 * 30,       // 30 dias
  getLanguages: 60 * 60 * 24 * 30,      // 30 dias
};

const ACTION_ENDPOINTS: Record<string, string> = {
  searchDestinations: "/api/v1/hotels/searchDestination",
  searchHotels: "/api/v1/hotels/searchHotels",
  hotelDetails: "/api/v1/hotels/getHotelDetails",
  hotelPhotos: "/api/v1/hotels/getHotelPhotos",
  hotelReviews: "/api/v1/hotels/getHotelReviews",
  roomAvailability: "/api/v1/hotels/getAvailability",
  getRoomList: "/api/v1/hotels/getRoomList",
  getHotelFilter: "/api/v1/hotels/getFilter",
  // ---- Hotels.com (legado provider ntd119 — comentado pra referência) ----
  // hotelscomAutocomplete: "/hotels/auto-complete",
  // hotelscomSearch: "/hotels/search",
  // hotelscomDetails: "/hotels/details-content",
  // hotelscomContent: "/hotels/details-content",
  // hotelscomGallery: "/hotels/details-gallery",
  // hotelscomAmenities: "/hotels/details-amenities",
  // hotelscomOffers: "/hotels/details-offers",
  // hotelscomSummary: "/hotels/details-summary",
  // hotelscomLocation: "/hotels/details-location",
  // hotelscomRatingSummary: "/hotels/details-rating-summary",
  // hotelscomHighlights: "/hotels/details-highlights",
  // hotelscomReviewsList: "/hotels/reviews-list",
  // hotelscomReviewsSummary: "/hotels/reviews-summary",
  // hotelscomHeadline: "/hotels/details-headline",
  // ---- Hotels.com (tipsters/hotels-com-provider) ----
  hotelscomAutocomplete: "/v2/regions",
  hotelscomSearch: "/v3/hotels/search",
  hotelscomDetails: "/v2/hotels/details",
  hotelscomContent: "/v2/hotels/details",
  hotelscomGallery: "/v2/hotels/details",
  hotelscomAmenities: "/v2/hotels/details",
  hotelscomOffers: "/v3/hotels/offers",
  hotelscomSummary: "/v3/hotels/summary",
  hotelscomLocation: "/v2/hotels/details",
  hotelscomRatingSummary: "/v2/hotels/reviews/scores",
  hotelscomHighlights: "/v2/hotels/details",
  hotelscomReviewsList: "/v2/hotels/reviews/list",
  hotelscomReviewsSummary: "/v2/hotels/reviews/summary",
  hotelscomHeadline: "/v3/hotels/info",
  hotelscomSlugToId: "/v2/meta/convert/slug-id",
  // ---- Voos ----
  searchFlightDestinations: "/api/v1/flights/searchDestination",
  searchFlights: "/api/v1/flights/searchFlights",
  getFlightDetails: "/api/v1/flights/getFlightDetails",
  getMinPrice: "/api/v1/flights/getMinPrice",
  getSeatMap: "/api/v1/flights/getSeatMap",
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

/** Actions que devem ser roteadas pro host do Hotels.com (ntd119) */
const HOTELSCOM_ACTIONS = new Set([
  "hotelscomAutocomplete",
  "hotelscomSearch",
  "hotelscomDetails",
  "hotelscomContent",
  "hotelscomGallery",
  "hotelscomAmenities",
  "hotelscomOffers",
  "hotelscomSummary",
  "hotelscomLocation",
  "hotelscomRatingSummary",
  "hotelscomHighlights",
  "hotelscomReviewsList",
  "hotelscomReviewsSummary",
  "hotelscomHeadline",
  "hotelscomSlugToId",
]);

async function callRapidApi(
  endpoint: string,
  params: Record<string, string>,
  action?: string,
): Promise<{ data: unknown; status: number }> {
  const apiKey = Deno.env.get("RAPIDAPI_KEY");
  if (!apiKey) {
    throw new Error("RAPIDAPI_KEY não configurado.");
  }

  const useHotelscom = action ? HOTELSCOM_ACTIONS.has(action) : false;
  const host = useHotelscom ? HOTELSCOM_HOST : RAPIDAPI_HOST;
  const base = useHotelscom ? HOTELSCOM_BASE : RAPIDAPI_BASE;

  const qs = new URLSearchParams(params).toString();
  const url = `${base}${endpoint}${qs ? `?${qs}` : ""}`;

  // Retry com backoff em erros transitórios (502/503/504/timeout) do provedor RapidAPI.
  const MAX_ATTEMPTS = 3;
  const PER_ATTEMPT_TIMEOUT_MS = 25_000;
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
          "x-rapidapi-host": host,
          "x-rapidapi-key": apiKey,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      const data = await res.json().catch(() => ({ raw: "<invalid json>" }));
      lastStatus = res.status;
      lastData = data;

      const isTransient = res.status === 502 || res.status === 503 || res.status === 504;
      if (!isTransient) {
        return { data, status: res.status };
      }
      console.warn(
        `[booking-rapidapi] ${action ?? endpoint} attempt ${attempt}/${MAX_ATTEMPTS} returned ${res.status}; retrying…`,
      );
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      console.warn(
        `[booking-rapidapi] ${action ?? endpoint} attempt ${attempt}/${MAX_ATTEMPTS} failed: ${(err as Error)?.message}`,
      );
    }

    if (attempt < MAX_ATTEMPTS) {
      // Backoff: 800ms, 2000ms
      await new Promise((r) => setTimeout(r, attempt === 1 ? 800 : 2000));
    }
  }

  if (lastStatus > 0) {
    return { data: lastData, status: lastStatus };
  }
  // Se nem fetch completou (timeout/network), devolve 504 sintético pra UI tratar.
  return {
    data: {
      error: "upstream_unreachable",
      message: (lastError as Error)?.message ?? "RapidAPI provider unreachable",
    },
    status: 504,
  };
}

function assertParams(params: Record<string, any>, required: string[]) {
  const missing = required.filter(
    (k) => params[k] === undefined || params[k] === null || params[k] === "",
  );
  if (missing.length > 0) {
    throw new Error(`Parâmetros obrigatórios faltando: ${missing.join(", ")}`);
  }
}

function extractHotelscomTotalFromSummary(summary: any): number | null {
  const messages = Array.isArray(summary?.resultMessages) ? summary.resultMessages : [];
  for (const item of messages) {
    const text = typeof item?.text === "string" ? item.text : "";
    const match = text.match(/(\d[\d.,]*)\s*\+?\s*(properties|property|acomodações|hoteis|hotéis)/i);
    if (!match) continue;
    const numeric = match[1].replace(/[.,]/g, "");
    const parsed = Number.parseInt(numeric, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
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
      assertParams(input, [
        "dest_id",
        "search_type",
        "arrival_date",
        "departure_date",
      ]);
      const params: Record<string, string> = {
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
      if (input.sort_by) params.sort_by = String(input.sort_by);
      if (input.categories_filter) {
        params.categories_filter = String(input.categories_filter);
      }
      if (input.price_min) params.price_min = String(input.price_min);
      if (input.price_max) params.price_max = String(input.price_max);
      return params;
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
    case "getRoomList": {
      assertParams(input, ["hotel_id", "arrival_date", "departure_date"]);
      return {
        hotel_id: String(input.hotel_id),
        arrival_date: String(input.arrival_date),
        departure_date: String(input.departure_date),
        adults: String(input.adults ?? 2),
        children_age: String(input.children_age ?? ""),
        room_qty: String(input.room_qty ?? 1),
        units: String(input.units ?? "metric"),
        currency_code: String(input.currency_code ?? defaults.currency_code),
        languagecode: String(input.languagecode ?? defaults.locale),
      };
    }
    // ============================================================
    // Hotels.com (provider tipsters/hotels-com-provider via RapidAPI)
    // ============================================================

    case "hotelscomAutocomplete": {
      assertParams(input, ["query"]);
      return {
        locale: String(input.locale ?? "pt_BR"),
        domain: String(input.domain ?? "BR"),
        query: String(input.query),
      };
    }

    case "hotelscomSearch": {
      const regionId = input.region_id ?? input.locationId;
      const checkin = input.checkin_date ?? input.checkinDate;
      const checkout = input.checkout_date ?? input.checkoutDate;
      const adultsNum = input.adults_number ?? input.adults ?? 2;
      assertParams(
        { region_id: regionId, checkin_date: checkin, checkout_date: checkout },
        ["region_id", "checkin_date", "checkout_date"],
      );
      const p: Record<string, string> = {
        domain: String(input.domain ?? "BR"),
        locale: String(input.locale ?? "pt_BR"),
        sort_order: String(input.sort_order ?? "RECOMMENDED"),
        region_id: String(regionId),
        checkin_date: String(checkin),
        checkout_date: String(checkout),
        adults_number: String(adultsNum),
      };
      if (input.children_ages) p.children_ages = String(input.children_ages);
      if (input.star_rating_ids) p.star_rating_ids = String(input.star_rating_ids);
      else if (input.star_rating) p.star_rating_ids = String(input.star_rating);
      if (input.price_min !== undefined && input.price_min !== "")
        p.price_min = String(input.price_min);
      if (input.price_max !== undefined && input.price_max !== "")
        p.price_max = String(input.price_max);
      if (input.guest_rating_min !== undefined)
        p.guest_rating_min = String(input.guest_rating_min);
      if (input.page_number) p.page_number = String(input.page_number);
      if (input.lodging_type) p.lodging_type = String(input.lodging_type);
      if (input.meal_plan) p.meal_plan = String(input.meal_plan);
      if (input.amenities) p.amenities = String(input.amenities);
      if (input.payment_type) p.payment_type = String(input.payment_type);
      if (input.available_filter) p.available_filter = String(input.available_filter);
      if (input.accessibility) p.accessibility = String(input.accessibility);
      return p;
    }

    case "hotelscomDetails":
    case "hotelscomContent":
    case "hotelscomGallery":
    case "hotelscomAmenities":
    case "hotelscomLocation":
    case "hotelscomHighlights":
    case "hotelscomSummary":
    case "hotelscomHeadline":
    case "hotelscomRatingSummary":
    case "hotelscomReviewsSummary": {
      const hotelId = input.hotel_id ?? input.propertyId;
      assertParams({ hotel_id: hotelId }, ["hotel_id"]);
      return {
        domain: String(input.domain ?? "BR"),
        locale: String(input.locale ?? "pt_BR"),
        hotel_id: String(hotelId),
      };
    }

    case "hotelscomOffers": {
      const hotelId = input.hotel_id ?? input.propertyId;
      const checkin = input.checkin_date ?? input.checkinDate;
      const checkout = input.checkout_date ?? input.checkoutDate;
      const adultsNum = input.adults_number ?? input.adults ?? 2;
      assertParams(
        { hotel_id: hotelId, checkin_date: checkin, checkout_date: checkout },
        ["hotel_id", "checkin_date", "checkout_date"],
      );
      const p: Record<string, string> = {
        domain: String(input.domain ?? "BR"),
        locale: String(input.locale ?? "pt_BR"),
        hotel_id: String(hotelId),
        checkin_date: String(checkin),
        checkout_date: String(checkout),
        adults_number: String(adultsNum),
      };
      if (input.children_ages) p.children_ages = String(input.children_ages);
      return p;
    }

    case "hotelscomReviewsList": {
      const hotelId = input.hotel_id ?? input.propertyId;
      assertParams({ hotel_id: hotelId }, ["hotel_id"]);
      return {
        domain: String(input.domain ?? "BR"),
        locale: String(input.locale ?? "pt_BR"),
        hotel_id: String(hotelId),
        page_number: String(input.page_number ?? 1),
        sort_order: String(input.sort_order ?? "NEWEST_TO_OLDEST"),
      };
    }

    case "hotelscomSlugToId": {
      assertParams(input, ["slug"]);
      return { slug: String(input.slug) };
    }

    case "getHotelFilter": {
      assertParams(input, ["dest_id", "search_type", "arrival_date", "departure_date"]);
      return {
        dest_id: String(input.dest_id),
        search_type: String(input.search_type),
        arrival_date: String(input.arrival_date),
        departure_date: String(input.departure_date),
        adults: String(input.adults ?? 2),
        children_age: String(input.children_age ?? ""),
        room_qty: String(input.room_qty ?? 1),
        units: String(input.units ?? "metric"),
        currency_code: String(input.currency_code ?? defaults.currency_code),
        languagecode: String(input.languagecode ?? defaults.locale),
      };
    }
    // ============================================================
    // Voos
    // ============================================================

    case "searchFlightDestinations": {
      assertParams(input, ["query"]);
      return { query: String(input.query) };
    }

    case "searchFlights": {
      assertParams(input, ["fromId", "toId", "departDate"]);
      const p: Record<string, string> = {
        fromId: String(input.fromId),
        toId: String(input.toId),
        departDate: String(input.departDate),
        returnDate: String(input.returnDate ?? ""),
        adults: String(input.adults ?? 1),
        children: String(input.children ?? ""),
        sort: String(input.sort ?? "BEST"),
        cabinClass: String(input.cabinClass ?? "ECONOMY"),
        pageNo: String(input.pageNo ?? 1),
        currency_code: String(input.currency_code ?? defaults.currency_code),
      };
      if (input.airlines) p.airlines = String(input.airlines);
      if (input.stops) p.stops = String(input.stops);
      if (input.departureTime) p.departureTime = String(input.departureTime);
      if (input.arrivalTime) p.arrivalTime = String(input.arrivalTime);
      if (input.maxDuration !== undefined && input.maxDuration !== null)
        p.maxDuration = String(input.maxDuration);
      if (input.maxLayoverDuration !== undefined && input.maxLayoverDuration !== null)
        p.maxLayoverDuration = String(input.maxLayoverDuration);
      if (input.maxBudget !== undefined && input.maxBudget !== null)
        p.maxBudget = String(input.maxBudget);
      if (input.baggage) p.baggage = String(input.baggage);
      if (input.flexibleTicket !== undefined && input.flexibleTicket !== null)
        p.flexibleTicket = String(input.flexibleTicket);
      if (input.departureAirports) p.departureAirports = String(input.departureAirports);
      if (input.arrivalAirports) p.arrivalAirports = String(input.arrivalAirports);
      return p;
    }

    case "getFlightDetails": {
      assertParams(input, ["token"]);
      return {
        token: String(input.token),
        currency_code: String(input.currency_code ?? defaults.currency_code),
      };
    }

    case "getMinPrice": {
      assertParams(input, ["fromId", "toId"]);
      return {
        fromId: String(input.fromId),
        toId: String(input.toId),
        cabinClass: String(input.cabinClass ?? "ECONOMY"),
        currency_code: String(input.currency_code ?? defaults.currency_code),
      };
    }

    case "getSeatMap": {
      assertParams(input, ["token"]);
      return {
        token: String(input.token),
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

    // ============================================================
    // Hotels.com: agrega múltiplas páginas em paralelo (~25/página)
    // pra entregar um pool maior de resultados em uma única chamada.
    // O cliente envia page_number=N como "página lógica"; convertemos
    // em N páginas físicas (1..N*PAGES_PER_LOGICAL).
    // ============================================================
    if (action === "hotelscomSearch") {
      const PAGES_PER_LOGICAL = 4; // 4 × 25 ≈ 100 hotéis por página lógica
      const MAX_PAGES = 8;
      const logicalPage = Math.max(1, parseInt(params.page_number ?? "1", 10) || 1);
      const startPage = (logicalPage - 1) * PAGES_PER_LOGICAL + 1;
      const endPage = Math.min(startPage + PAGES_PER_LOGICAL - 1, startPage + MAX_PAGES - 1);

      const pagePromises: Promise<{ data: any; status: number; page: number }>[] = [];
      for (let p = startPage; p <= endPage; p++) {
        const pageParams = { ...params, page_number: String(p) };
        pagePromises.push(
          callRapidApi(endpoint, pageParams, action).then((r) => ({ ...r, page: p })),
        );
      }
      const results = await Promise.all(pagePromises);

      const firstError = results.find((r) => r.status >= 400);
      if (firstError && results.every((r) => r.status >= 400)) {
        await logCall({
          action,
          params,
          cache_hit: false,
          status_code: firstError.status,
          latency_ms: Date.now() - startedAt,
          error_message:
            typeof firstError.data === "object"
              ? JSON.stringify(firstError.data)
              : String(firstError.data),
        });
        return new Response(
          JSON.stringify({
            error: "Erro na API do Hotels.com",
            status: firstError.status,
            details: firstError.data,
          }),
          { status: firstError.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Agrega listings de todas as páginas, dedup por id
      const seenIds = new Set<string>();
      const aggregated: any[] = [];
      let totalCount: number | null = null;
      let summary: any = undefined;

      for (const r of results.sort((a, b) => a.page - b.page)) {
        if (r.status >= 400) continue;
        const d: any = r.data?.data ?? {};
        const listings: any[] = Array.isArray(d.propertySearchListings)
          ? d.propertySearchListings
          : [];
        for (const item of listings) {
          const id = String(item?.id ?? item?.propertyId ?? Math.random());
          if (seenIds.has(id)) continue;
          seenIds.add(id);
          aggregated.push(item);
        }
        if (totalCount == null) {
          if (typeof d?.pagination?.totalCount === "number") {
            totalCount = d.pagination.totalCount;
          } else {
            totalCount = extractHotelscomTotalFromSummary(d?.summary);
          }
        }
        if (!summary && d?.summary) summary = d.summary;
      }

      const aggregatedEnvelope = {
        status: true,
        message: "Success",
        timestamp: Date.now(),
        data: {
          propertySearchListings: aggregated,
          pagination: { totalCount: totalCount ?? aggregated.length },
          summary,
          __pagesFetched: results.length,
          __logicalPage: logicalPage,
        },
      };

      await writeCache(action, params, aggregatedEnvelope);
      await logCall({
        action,
        params,
        cache_hit: false,
        status_code: 200,
        latency_ms: Date.now() - startedAt,
      });

      return new Response(
        JSON.stringify({ ...aggregatedEnvelope, __cache: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data, status } = await callRapidApi(endpoint, params, action);

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