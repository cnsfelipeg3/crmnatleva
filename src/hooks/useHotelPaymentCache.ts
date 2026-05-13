// Hook · cache hot/cold de modalidades de pagamento por hotel
//
// HOT  · TanStack Query em memória (5 min stale)
// COLD · tabela hotel_payment_cache (24h TTL via fetched_at)
//
// `useHotelPaymentSummaries` lê em batch para uma lista de hotéis visíveis.
// `prefetchBookingPaymentSummary` busca detalhes do hotel via edge function,
// extrai ofertas, agrega summary e faz upsert no cache cold.

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { HotelPaymentSummary, HotelSource, PaymentModality } from "@/types/hotel";
import type { BookingHotel } from "@/components/booking-rapidapi/types";
import {
  extractBookingOffers,
  summarizeOffers,
} from "@/lib/hotels/paymentNormalizer";
import { paymentCacheKey } from "@/lib/hotels/paymentFilter";

const QK_BATCH = "hotel_payment_cache_batch";
const TTL_MS = 24 * 60 * 60 * 1000; // 24h
const STALE_MS = 5 * 60 * 1000; // 5 min in-memory

export interface PaymentKey {
  hotelId: string;
  source: HotelSource;
}

function rowToSummary(row: any): HotelPaymentSummary {
  return {
    hotelId: String(row.hotel_id),
    source: row.source as HotelSource,
    availableModalities: (row.available_modalities ?? []) as PaymentModality[],
    hasFreeCancellation: !!row.has_free_cancellation,
    offersCount: Number(row.offers_count ?? 0),
    fetchedAt: row.fetched_at,
  };
}

function isFresh(s: HotelPaymentSummary): boolean {
  const age = Date.now() - new Date(s.fetchedAt).getTime();
  return age < TTL_MS;
}

/**
 * Lê do cache cold em batch · retorna Map keyed por `paymentCacheKey`.
 * Hotéis sem entry simplesmente ficam ausentes do Map.
 */
export function useHotelPaymentSummaries(keys: PaymentKey[]) {
  const ids = keys.map((k) => `${k.source}:${k.hotelId}`).sort();
  const stableKey = ids.join("|");

  return useQuery({
    queryKey: [QK_BATCH, stableKey],
    enabled: keys.length > 0,
    staleTime: STALE_MS,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      if (!keys.length) return new Map<string, HotelPaymentSummary>();

      const bookingIds = keys.filter((k) => k.source === "booking").map((k) => k.hotelId);
      const hcomIds = keys.filter((k) => k.source === "hotelscom").map((k) => k.hotelId);

      const [bookingRes, hcomRes] = await Promise.all([
        bookingIds.length
          ? (supabase as any)
              .from("hotel_payment_cache")
              .select("*")
              .eq("source", "booking")
              .in("hotel_id", bookingIds)
          : Promise.resolve({ data: [] as any[] }),
        hcomIds.length
          ? (supabase as any)
              .from("hotel_payment_cache")
              .select("*")
              .eq("source", "hotelscom")
              .in("hotel_id", hcomIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const map = new Map<string, HotelPaymentSummary>();
      [...(bookingRes.data ?? []), ...(hcomRes.data ?? [])].forEach((row: any) => {
        const s = rowToSummary(row);
        if (isFresh(s)) map.set(paymentCacheKey(s.hotelId, s.source), s);
      });
      return map;
    },
  });
}

async function upsertSummary(
  hotelId: string,
  source: HotelSource,
  summary: ReturnType<typeof summarizeOffers>,
) {
  const { error } = await (supabase as any).from("hotel_payment_cache").upsert(
    {
      hotel_id: hotelId,
      source,
      available_modalities: summary.availableModalities,
      has_free_cancellation: summary.hasFreeCancellation,
      offers_count: summary.offersCount,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "hotel_id,source" },
  );

  if (error) {
    console.error("[PAY_FILTER] upsert FAILED", source, hotelId, error.message, error);
  } else {
    console.log("[PAY_FILTER] upsert OK", source, hotelId, summary.availableModalities);
  }
}

/**
 * Hook utilitário · dispara prefetch sob demanda dos hotéis visíveis que
 * ainda não têm cache. Limita concorrência e roda em background sem bloquear UI.
 *
 * Para Booking · chama edge function `booking-rapidapi/hotelDetails` para obter
 * `block` populado e extrair ofertas.
 * Para Hotels.com · prefetch é mais pesado (precisa de offers + content) · por
 * ora pulamos · o cache será populado quando o usuário abrir o drawer.
 */
export function usePrefetchHotelPayments(opts: {
  enabled: boolean;
  bookingHotels: BookingHotel[];
  arrival: string | null;
  departure: string | null;
  adults: number;
  childrenAges: string;
  rooms: number;
  existing: Map<string, HotelPaymentSummary> | undefined;
  maxConcurrent?: number;
  maxItems?: number;
}) {
  const queryClient = useQueryClient();
  const inflight = useRef<Set<string>>(new Set());

  const {
    enabled,
    bookingHotels,
    arrival,
    departure,
    adults,
    childrenAges,
    rooms,
    existing,
    maxConcurrent = 3,
    maxItems = 12,
  } = opts;

  const runOne = useCallback(
    async (hotel: BookingHotel) => {
      const id = String((hotel as any).hotel_id ?? hotel.id ?? "");
      if (!id) return;
      const key = paymentCacheKey(id, "booking");
      if (inflight.current.has(key)) return;

      // Se o hotel JÁ veio com `block` preenchido na resposta da busca, evita ida à API
      const hasBlocks = Array.isArray((hotel as any).block) && (hotel as any).block.length > 0;
      if (hasBlocks) {
        try {
          const offers = extractBookingOffers(hotel);
          if (offers.length === 0) {
            console.log("[PAY_FILTER] prefetch hotel", id, "no offers from inline blocks");
            return;
          }
          const summary = summarizeOffers(offers);
          console.log("[PAY_FILTER] prefetch hotel", id, "(inline)", summary.availableModalities, "free:", summary.hasFreeCancellation);
          await upsertSummary(id, "booking", summary);
          queryClient.invalidateQueries({ queryKey: [QK_BATCH] });
        } catch (e) {
          console.warn("[PAY_FILTER] prefetch inline failed", id, e);
        }
        return;
      }

      if (!arrival || !departure) {
        console.log("[PAY_FILTER] prefetch hotel", id, "skipped: no arrival/departure");
        return;
      }
      inflight.current.add(key);
      try {
        const { data, error } = await supabase.functions.invoke("booking-rapidapi", {
          body: {
            action: "hotelDetails",
            hotel_id: id,
            arrival_date: arrival,
            departure_date: departure,
            adults,
            children_age: childrenAges,
            room_qty: rooms,
          },
        });
        if (error) {
          console.warn("[PAY_FILTER] prefetch fn error", id, error);
          return;
        }
        const h: BookingHotel | undefined = (data as any)?.data;
        if (!h) {
          console.warn("[PAY_FILTER] prefetch no data", id);
          return;
        }
        const offers = extractBookingOffers(h);
        if (offers.length === 0) {
          console.warn("[PAY_FILTER] prefetch no offers extracted", id);
          return;
        }
        const summary = summarizeOffers(offers);
        console.log("[PAY_FILTER] prefetch hotel", id, "(api)", summary.availableModalities, "free:", summary.hasFreeCancellation);
        await upsertSummary(id, "booking", summary);
        queryClient.invalidateQueries({ queryKey: [QK_BATCH] });
      } catch (e) {
        console.warn("[PAY_FILTER] prefetch threw", id, e);
      } finally {
        inflight.current.delete(key);
      }
    },
    [arrival, departure, adults, childrenAges, rooms, queryClient],
  );

  useEffect(() => {
    if (!enabled || !bookingHotels.length) return;
    let cancelled = false;

    const todo = bookingHotels
      .slice(0, maxItems)
      .filter((h) => {
        const id = String((h as any).hotel_id ?? h.id ?? "");
        if (!id) return false;
        return !existing?.has(paymentCacheKey(id, "booking"));
      });

    if (!todo.length) return;

    let cursor = 0;
    const workers = Array.from({ length: Math.min(maxConcurrent, todo.length) }).map(
      async () => {
        while (!cancelled && cursor < todo.length) {
          const item = todo[cursor++];
          await runOne(item);
        }
      },
    );

    Promise.all(workers).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [enabled, bookingHotels, existing, maxItems, maxConcurrent, runOne]);
}
