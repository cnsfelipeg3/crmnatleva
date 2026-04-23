// Hooks para o módulo Booking RapidAPI (BETA)
// Usa TanStack Query + edge function booking-rapidapi.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  BookingAction,
  BookingDestination,
  BookingHotel,
  BookingHotelPhoto,
  BookingHotelReview,
  BookingSearchParams,
  HotelFilter,
  HotelFiltersResponse,
} from "@/components/booking-rapidapi/types";
import type {
  CabinClass,
  FlightDeal,
  FlightLocation,
  FlightOffer,
  FlightSort,
  SearchFlightsResult,
} from "@/components/booking-rapidapi/flightTypes";

const FUNCTION_NAME = "booking-rapidapi";

async function invokeBooking<T = unknown>(
  action: BookingAction,
  params: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: { action, ...params },
  });

  if (error) throw new Error(error.message || "Erro desconhecido");
  if (data?.error) {
    const details =
      typeof data.details === "object"
        ? JSON.stringify(data.details)
        : data.details ?? "";
    throw new Error(`${data.error}${details ? ` — ${details}` : ""}`);
  }
  return data as T;
}

export function useDestinationSearch(query: string, enabled: boolean = true) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["booking-rapidapi", "destinations", trimmed],
    queryFn: async () => {
      const envelope = await invokeBooking<{ data: BookingDestination[] }>(
        "searchDestinations",
        { query: trimmed },
      );
      return (envelope.data || []) as BookingDestination[];
    },
    enabled: enabled && trimmed.length >= 2,
    staleTime: 60 * 60 * 1000,
  });
}

export interface SearchHotelsResult {
  hotels: BookingHotel[];
  meta: Record<string, unknown>;
  cache_hit: boolean;
  totalHotels: number | null;
  pageSize: number;
}

/**
 * Extrai o total de hotéis do campo `meta` retornado pela API.
 * Formato observado: meta: [{ "title": "5278 acomodações" }]
 */
function extractTotalHotels(meta: unknown): number | null {
  try {
    if (!Array.isArray(meta) || meta.length === 0) return null;
    const title = (meta[0] as any)?.title;
    if (typeof title !== "string") return null;
    const match = title.match(/([\d.,]+)/);
    if (!match) return null;
    return parseInt(match[1].replace(/[^\d]/g, ""), 10);
  } catch {
    return null;
  }
}

export function useSearchHotels(
  params: Partial<BookingSearchParams> | null,
  enabled: boolean = true,
) {
  const keyParams = params
    ? {
        dest_id: params.dest_id,
        search_type: params.search_type,
        arrival_date: params.arrival_date,
        departure_date: params.departure_date,
        adults: params.adults ?? 2,
        children_age: params.children_age ?? "",
        room_qty: params.room_qty ?? 1,
        page_number: params.page_number ?? 1,
        currency_code: params.currency_code ?? "BRL",
        languagecode: params.languagecode ?? "pt-br",
        sort_by: params.sort_by ?? undefined,
        categories_filter: params.categories_filter ?? undefined,
        price_min: params.price_min ?? undefined,
        price_max: params.price_max ?? undefined,
      }
    : null;

  return useQuery({
    queryKey: ["booking-rapidapi", "searchHotels", keyParams],
    queryFn: async (): Promise<SearchHotelsResult> => {
      if (!keyParams) throw new Error("Params inválidos");
      const envelope = await invokeBooking<{
        data: { hotels?: BookingHotel[]; [k: string]: unknown };
        __cache?: boolean;
      }>("searchHotels", keyParams);

      const rawHotels = Array.isArray(envelope?.data?.hotels)
        ? (envelope.data.hotels as any[])
        : [];
      // A API retorna os campos do hotel aninhados em `property`.
      // Achatamos para que o HotelCard consuma direto.
      const hotels: BookingHotel[] = rawHotels.map((h) => {
        const p = (h?.property ?? {}) as Record<string, any>;
        const photoUrls: string[] = Array.isArray(p.photoUrls) ? p.photoUrls : [];
        return {
          ...p,
          ...h,
          hotel_id: h?.hotel_id ?? p?.id,
          name: p?.name ?? h?.name,
          reviewScore: p?.reviewScore ?? h?.reviewScore,
          reviewScoreWord: p?.reviewScoreWord ?? h?.reviewScoreWord,
          reviewCount: p?.reviewCount ?? h?.reviewCount,
          priceBreakdown: p?.priceBreakdown ?? h?.priceBreakdown,
          photoUrls,
          main_photo_url: photoUrls[0] ?? h?.main_photo_url,
          wishlistName: p?.wishlistName ?? h?.wishlistName,
          accuratePropertyClass:
            p?.accuratePropertyClass ?? p?.qualityClass ?? p?.propertyClass ?? h?.accuratePropertyClass,
          class: p?.qualityClass ?? p?.propertyClass ?? h?.class,
          latitude: p?.latitude ?? h?.latitude,
          longitude: p?.longitude ?? h?.longitude,
          checkin: p?.checkin ?? h?.checkin,
          checkout: p?.checkout ?? h?.checkout,
        } as BookingHotel;
      });
      const { hotels: _ignore, ...meta } = envelope?.data ?? {};
      const totalHotels = extractTotalHotels((meta as any)?.meta);
      return { hotels, meta, cache_hit: !!envelope?.__cache, totalHotels, pageSize: 20 };
    },
    enabled:
      enabled &&
      !!keyParams?.dest_id &&
      !!keyParams?.arrival_date &&
      !!keyParams?.departure_date,
    staleTime: 10 * 60 * 1000,
  });
}

export function useHotelDetails(
  hotelId: string | number | null,
  arrival: string | null,
  departure: string | null,
  extra?: { adults?: number; children_age?: string; room_qty?: number },
) {
  return useQuery({
    queryKey: [
      "booking-rapidapi",
      "hotelDetails",
      hotelId,
      arrival,
      departure,
      extra?.adults,
      extra?.children_age,
      extra?.room_qty,
    ],
    queryFn: async () => {
      const envelope = await invokeBooking<{ data: Record<string, unknown> }>(
        "hotelDetails",
        {
          hotel_id: hotelId,
          arrival_date: arrival,
          departure_date: departure,
          adults: extra?.adults ?? 2,
          children_age: extra?.children_age ?? "",
          room_qty: extra?.room_qty ?? 1,
        },
      );
      return envelope.data;
    },
    enabled: !!hotelId && !!arrival && !!departure,
    staleTime: 30 * 60 * 1000,
  });
}

export function useHotelPhotos(hotelId: string | number | null) {
  return useQuery({
    queryKey: ["booking-rapidapi", "hotelPhotos", hotelId],
    queryFn: async () => {
      const envelope = await invokeBooking<{ data: BookingHotelPhoto[] }>(
        "hotelPhotos",
        { hotel_id: hotelId },
      );
      return (envelope.data || []) as BookingHotelPhoto[];
    },
    enabled: !!hotelId,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useHotelReviews(
  hotelId: string | number | null,
  page: number = 1,
) {
  return useQuery({
    queryKey: ["booking-rapidapi", "hotelReviews", hotelId, page],
    queryFn: async () => {
      const envelope = await invokeBooking<{
        data: { result?: BookingHotelReview[]; [k: string]: unknown };
      }>("hotelReviews", { hotel_id: hotelId, page_number: page });
      const list = Array.isArray(envelope?.data?.result)
        ? (envelope.data.result as BookingHotelReview[])
        : Array.isArray((envelope?.data as any)?.reviews)
          ? ((envelope.data as any).reviews as BookingHotelReview[])
          : [];
      return list;
    },
    enabled: !!hotelId,
    staleTime: 60 * 60 * 1000,
  });
}

export function useRoomAvailability(
  hotelId: string | number | null,
  minDate: string | null,
  maxDate: string | null,
) {
  return useQuery({
    queryKey: ["booking-rapidapi", "roomAvailability", hotelId, minDate, maxDate],
    queryFn: async () => {
      const envelope = await invokeBooking<{ data: unknown }>(
        "roomAvailability",
        { hotel_id: hotelId, min_date: minDate, max_date: maxDate },
      );
      return envelope.data;
    },
    enabled: !!hotelId && !!minDate && !!maxDate,
    staleTime: 10 * 60 * 1000,
  });
}

// ------------------------------------------------------------
// 6.5) Filtros de hotéis (sidebar: price, stars, facilities, etc)
// ------------------------------------------------------------

export function useHotelFilters(
  params: Partial<BookingSearchParams> | null,
  enabled: boolean = true,
) {
  const keyParams = params
    ? {
        dest_id: params.dest_id,
        search_type: params.search_type,
        arrival_date: params.arrival_date,
        departure_date: params.departure_date,
        adults: params.adults ?? 2,
        children_age: params.children_age ?? "",
        room_qty: params.room_qty ?? 1,
        currency_code: params.currency_code ?? "BRL",
        languagecode: params.languagecode ?? "pt-br",
      }
    : null;

  return useQuery({
    queryKey: ["booking-rapidapi", "hotelFilters", keyParams],
    queryFn: async (): Promise<HotelFiltersResponse> => {
      if (!keyParams) throw new Error("Params inválidos");
      const envelope = await invokeBooking<{
        data: {
          filters?: HotelFilter[];
          pagination?: { nbResultsTotal?: number };
          availabilityInfo?: Record<string, unknown>;
        };
      }>("getHotelFilter" as BookingAction, keyParams);
      return {
        filters: envelope?.data?.filters ?? [],
        pagination: envelope?.data?.pagination,
        availabilityInfo: envelope?.data?.availabilityInfo,
      };
    },
    enabled:
      enabled &&
      !!keyParams?.dest_id &&
      !!keyParams?.arrival_date &&
      !!keyParams?.departure_date,
    staleTime: 6 * 60 * 60 * 1000,
  });
}

// ------------------------------------------------------------
// Lista rica de quartos/ofertas (recomendado pra UI)
// ------------------------------------------------------------

export interface RoomPhoto {
  photo_id: number;
  url_original?: string;
  url_max300?: string;
  url_max500?: string;
  url_max750?: string;
  url_max1280?: string;
  url_square60?: string;
  url_square180?: string;
  url_640x200?: string;
}

export interface RoomDetail {
  highlights?: Array<{ translated_name?: string; icon?: string; id?: number }>;
  photos?: RoomPhoto[];
  description?: string;
  name?: string;
  private_bathroom_count?: number;
  private_bathroom_highlight?: { has_highlight?: boolean };
}

export interface RoomOffer {
  block_id: string;
  room_id: number | string;
  name?: string;
  name_without_policy?: string;
  room_name?: string;
  nr_adults?: number;
  nr_children?: number;
  max_occupancy?: number | string;
  number_of_bathrooms?: number;
  room_surface_in_m2?: number;
  refundable?: number;
  refundable_until?: string;
  breakfast_included?: number;
  half_board?: number;
  full_board?: number;
  all_inclusive?: number;
  is_last_minute_deal?: number;
  is_flash_deal?: number;
  is_smart_deal?: number;
  genius_discount_percentage?: number;
  can_reserve_free_parking?: number;
  paymentterms?: {
    prepayment?: {
      type?: string;
      simple_translation?: string;
      description?: string;
    };
    cancellation?: {
      description?: string;
      non_refundable_anymore?: number;
      info?: { date?: string; refundable?: number };
    };
  };
  product_price_breakdown?: {
    gross_amount?: { value?: number; currency?: string };
    gross_amount_per_night?: { value?: number; currency?: string };
    strikethrough_amount?: { value?: number; currency?: string };
    excluded_amount?: { value?: number; currency?: string };
    all_inclusive_amount?: { value?: number; currency?: string };
  };
  price_breakdown?: RoomOffer["product_price_breakdown"];
  [key: string]: unknown;
}

export interface RoomListResult {
  offers: RoomOffer[];
  rooms: Record<string, RoomDetail>;
  cancellation_policies: unknown[];
  prepayment_policies: unknown[];
  cache_hit: boolean;
}

export function useRoomList(
  hotelId: string | number | null,
  arrival: string | null,
  departure: string | null,
  extra?: { adults?: number; children_age?: string; room_qty?: number },
) {
  return useQuery({
    queryKey: [
      "booking-rapidapi",
      "roomList",
      hotelId,
      arrival,
      departure,
      extra?.adults,
      extra?.children_age,
      extra?.room_qty,
    ],
    queryFn: async (): Promise<RoomListResult> => {
      const envelope = await invokeBooking<{
        data: {
          rooms?: Record<string, RoomDetail>;
          block?: RoomOffer[];
          cancellation_policies?: unknown[];
          prepayment_policies?: unknown[];
        };
        __cache?: boolean;
      }>("getRoomList", {
        hotel_id: hotelId,
        arrival_date: arrival,
        departure_date: departure,
        adults: extra?.adults ?? 2,
        children_age: extra?.children_age ?? "",
        room_qty: extra?.room_qty ?? 1,
      });
      return {
        offers: envelope?.data?.block ?? [],
        rooms: envelope?.data?.rooms ?? {},
        cancellation_policies: envelope?.data?.cancellation_policies ?? [],
        prepayment_policies: envelope?.data?.prepayment_policies ?? [],
        cache_hit: !!envelope?.__cache,
      };
    },
    enabled: !!hotelId && !!arrival && !!departure,
    staleTime: 10 * 60 * 1000,
  });
}

// ============================================================
// VOOS
// ============================================================

export function useFlightDestinations(
  query: string,
  enabled: boolean = true,
) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["booking-rapidapi", "flightDestinations", trimmed],
    queryFn: async () => {
      const envelope = await invokeBooking<{ data: FlightLocation[] }>(
        "searchFlightDestinations" as BookingAction,
        { query: trimmed },
      );
      return (envelope.data || []) as FlightLocation[];
    },
    enabled: enabled && trimmed.length >= 2,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export interface SearchFlightsInput {
  fromId: string;
  toId: string;
  departDate: string;
  returnDate?: string;
  adults?: number;
  children?: string;
  cabinClass?: CabinClass;
  sort?: FlightSort;
  pageNo?: number;
  currency_code?: string;
}

export function useSearchFlights(
  params: SearchFlightsInput | null,
  enabled: boolean = true,
) {
  const keyParams = params
    ? {
        fromId: params.fromId,
        toId: params.toId,
        departDate: params.departDate,
        returnDate: params.returnDate ?? "",
        adults: params.adults ?? 1,
        children: params.children ?? "",
        cabinClass: params.cabinClass ?? "ECONOMY",
        sort: params.sort ?? "BEST",
        pageNo: params.pageNo ?? 1,
        currency_code: params.currency_code ?? "BRL",
      }
    : null;

  return useQuery({
    queryKey: ["booking-rapidapi", "searchFlights", keyParams],
    queryFn: async (): Promise<SearchFlightsResult> => {
      if (!keyParams) throw new Error("Params inválidos");
      const envelope = await invokeBooking<{
        data: {
          flightOffers?: FlightOffer[];
          flightDeals?: FlightDeal[];
          aggregation?: Record<string, unknown>;
          searchId?: string;
        };
        __cache?: boolean;
      }>("searchFlights" as BookingAction, keyParams);
      return {
        offers: envelope?.data?.flightOffers ?? [],
        deals: envelope?.data?.flightDeals ?? [],
        aggregation: envelope?.data?.aggregation,
        searchId: envelope?.data?.searchId,
        cache_hit: !!envelope?.__cache,
      };
    },
    enabled:
      enabled &&
      !!keyParams?.fromId &&
      !!keyParams?.toId &&
      !!keyParams?.departDate,
    staleTime: 10 * 60 * 1000,
  });
}

export function useFlightDetails(token: string | null, currencyCode = "BRL") {
  return useQuery({
    queryKey: ["booking-rapidapi", "flightDetails", token, currencyCode],
    queryFn: async () => {
      const envelope = await invokeBooking<{ data: unknown }>(
        "getFlightDetails" as BookingAction,
        { token, currency_code: currencyCode },
      );
      return envelope?.data;
    },
    enabled: !!token,
    staleTime: 10 * 60 * 1000,
  });
}

export function useMinPrice(
  fromId: string | null,
  toId: string | null,
  cabinClass: CabinClass = "ECONOMY",
) {
  return useQuery({
    queryKey: ["booking-rapidapi", "minPrice", fromId, toId, cabinClass],
    queryFn: async () => {
      const envelope = await invokeBooking<{ data: unknown }>(
        "getMinPrice" as BookingAction,
        {
          fromId,
          toId,
          cabinClass,
          currency_code: "BRL",
        },
      );
      return envelope?.data;
    },
    enabled: !!fromId && !!toId,
    staleTime: 6 * 60 * 60 * 1000,
  });
}

export function useSeatMap(token: string | null) {
  return useQuery({
    queryKey: ["booking-rapidapi", "seatMap", token],
    queryFn: async () => {
      const envelope = await invokeBooking<{ data: unknown }>(
        "getSeatMap" as BookingAction,
        { token },
      );
      return envelope?.data;
    },
    enabled: !!token,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
