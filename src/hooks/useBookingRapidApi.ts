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
} from "@/components/booking-rapidapi/types";

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

      const hotels = Array.isArray(envelope?.data?.hotels)
        ? (envelope.data.hotels as BookingHotel[])
        : [];
      const { hotels: _ignore, ...meta } = envelope?.data ?? {};
      return { hotels, meta, cache_hit: !!envelope?.__cache };
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