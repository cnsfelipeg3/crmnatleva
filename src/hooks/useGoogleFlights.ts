// Hooks do módulo Google Flights BETA (DataCrawler via RapidAPI)
// Isolado: não toca em useBookingRapidApi nem em outros módulos de voo.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  GAirport,
  GCalendarDay,
  GFlightCabin,
  GPriceGraphPoint,
  GSearchFlightsResult,
} from "@/components/google-flights/gflightsTypes";

const FUNCTION_NAME = "google-flights-rapidapi";

async function invokeGFlights<T = unknown>(
  action: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message || "Erro desconhecido");
  if (data && typeof data === "object" && (data as any).error) {
    const d = data as any;
    const details = typeof d.message === "string" ? d.message : JSON.stringify(d).slice(0, 300);
    throw new Error(`${d.error}${details ? ` — ${details}` : ""}`);
  }
  return data as T;
}

// --------------------------------------------------------------------
// 1) Autocomplete de aeroportos
// --------------------------------------------------------------------
export function useAirportSearch(query: string, enabled = true) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["gflights", "searchAirport", "iata-only-v2", trimmed],
    queryFn: async (): Promise<GAirport[]> => {
      const data = await invokeGFlights<any>("searchAirport", { query: trimmed });
      // DataCrawler retorna estruturas variáveis. Tentamos os caminhos mais comuns.
      const candidates: any[] =
        (Array.isArray(data?.data) && data.data) ||
        (Array.isArray(data?.results) && data.results) ||
        (Array.isArray(data?.airports) && data.airports) ||
        (Array.isArray(data) && data) ||
        [];
      const flat: GAirport[] = [];
      const seen = new Set<string>();

      function pushAirport(it: any, nearLabel?: string) {
        const rawId = it?.id ?? it?.code ?? it?.iata ?? it?.airport_code;
        if (!rawId || typeof rawId !== "string") return;
        const normalizedId = rawId.trim();
        const lowerId = normalizedId.toLowerCase();
        if (lowerId.startsWith("/m/") || lowerId.startsWith("/g/")) return;
        const type = typeof it?.type === "string" ? it.type.toLowerCase() : "airport";
        if (type !== "airport") return;
        const code = normalizedId.toUpperCase();
        if (!/^[A-Z]{3}$/.test(code)) return;
        if (seen.has(code)) return;
        seen.add(code);
        flat.push({
          id: code,
          name: it?.title ?? it?.name ?? it?.airport_name ?? code,
          city: it?.city ?? it?.city_name ?? nearLabel,
          country: it?.country ?? it?.country_name,
          type: "AIRPORT",
          nearLabel,
          distance: it?.distance || undefined,
        } as GAirport);
      }

      for (const it of candidates) {
        const type = typeof it?.type === "string" ? it.type.toLowerCase() : "";
        if (type === "airport") {
          pushAirport(it);
        } else if (type === "other" && Array.isArray(it.list)) {
          const nearLabel = it?.title || it?.city || it?.name || "";
          for (const sub of it.list) {
            pushAirport(sub, nearLabel);
          }
        }
      }

      return flat;
    },
    enabled: enabled && trimmed.length >= 2,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

// --------------------------------------------------------------------
// 2) Busca principal
// --------------------------------------------------------------------
export interface SearchGFlightsInput {
  departure_id: string;
  arrival_id: string;
  outbound_date: string;     // YYYY-MM-DD
  return_date?: string;
  travel_class?: GFlightCabin;
  adults?: number;
  children?: number;
  infant_in_seat?: number;
  infant_on_lap?: number;
  stops?: 0 | 1 | 2;
  max_price?: number;
  max_duration?: number;     // minutos
  included_airlines?: string;
  excluded_airlines?: string;
  sort_by?: string;
  currency?: string;
}

export function useSearchGFlights(input: SearchGFlightsInput | null, enabled = true) {
  return useQuery({
    queryKey: ["gflights", "searchFlights", input],
    queryFn: async (): Promise<GSearchFlightsResult & { __cache?: boolean }> => {
      if (!input) throw new Error("input inválido");
      const data = await invokeGFlights<any>("searchFlights", input as unknown as Record<string, unknown>);
      // O scraper costuma envelopar em data.data
      const payload = data?.data ?? data;
      return {
        ...payload,
        __cache: !!data?.__cache,
      };
    },
    enabled:
      enabled &&
      !!input?.departure_id &&
      !!input?.arrival_id &&
      !!input?.outbound_date,
    staleTime: 15 * 60 * 1000,
  });
}

// --------------------------------------------------------------------
// 3) Calendar picker — heatmap mensal de preços
// --------------------------------------------------------------------
export function useCalendarPicker(input: SearchGFlightsInput | null, enabled = true) {
  return useQuery({
    queryKey: ["gflights", "getCalendarPicker", input],
    queryFn: async (): Promise<GCalendarDay[]> => {
      if (!input) throw new Error("input inválido");
      const data = await invokeGFlights<any>("getCalendarPicker", input as unknown as Record<string, unknown>);
      const raw = data?.data ?? data;
      const arr: any[] =
        (Array.isArray(raw?.calendar) && raw.calendar) ||
        (Array.isArray(raw?.days) && raw.days) ||
        (Array.isArray(raw) && raw) ||
        [];
      return arr
        .map((it: any) => {
          const date = it?.date ?? it?.day;
          if (!date || typeof date !== "string") return null;
          const priceRaw = it?.price ?? it?.lowest_price ?? it?.value ?? null;
          const priceNum = typeof priceRaw === "number"
            ? priceRaw
            : typeof priceRaw === "string"
              ? Number(priceRaw.replace(/[^\d.,]/g, "").replace(",", "."))
              : null;
          return {
            date,
            price: Number.isFinite(priceNum as number) ? (priceNum as number) : null,
            level: it?.level ?? it?.price_level ?? null,
            group: it?.group,
          } as GCalendarDay;
        })
        .filter((x): x is GCalendarDay => !!x);
    },
    enabled:
      enabled &&
      !!input?.departure_id &&
      !!input?.arrival_id &&
      !!input?.outbound_date,
    staleTime: 60 * 60 * 1000,
  });
}

// --------------------------------------------------------------------
// 4) Price graph — gráfico de tendência
// --------------------------------------------------------------------
export function usePriceGraph(input: SearchGFlightsInput | null, enabled = true) {
  return useQuery({
    queryKey: ["gflights", "getPriceGraph", input],
    queryFn: async (): Promise<GPriceGraphPoint[]> => {
      if (!input) throw new Error("input inválido");
      const data = await invokeGFlights<any>("getPriceGraph", input as unknown as Record<string, unknown>);
      const raw = data?.data ?? data;
      const arr: any[] =
        (Array.isArray(raw?.price_graph) && raw.price_graph) ||
        (Array.isArray(raw?.prices) && raw.prices) ||
        (Array.isArray(raw) && raw) ||
        [];
      return arr
        .map((it: any) => {
          const date = it?.date ?? it?.day;
          if (!date) return null;
          const priceRaw = it?.price ?? it?.value ?? it?.lowest_price ?? null;
          const priceNum = typeof priceRaw === "number"
            ? priceRaw
            : typeof priceRaw === "string"
              ? Number(priceRaw.replace(/[^\d.,]/g, "").replace(",", "."))
              : null;
          return {
            date: String(date),
            price: Number.isFinite(priceNum as number) ? (priceNum as number) : null,
            is_outbound: it?.is_outbound ?? true,
          } as GPriceGraphPoint;
        })
        .filter((x): x is GPriceGraphPoint => !!x);
    },
    enabled:
      enabled &&
      !!input?.departure_id &&
      !!input?.arrival_id &&
      !!input?.outbound_date,
    staleTime: 60 * 60 * 1000,
  });
}
