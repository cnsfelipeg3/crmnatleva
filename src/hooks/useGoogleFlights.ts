// Hooks do módulo Google Flights BETA (DataCrawler via RapidAPI)
// Isolado: não toca em useBookingRapidApi nem em outros módulos de voo.

import { useQuery } from "@tanstack/react-query";
import { addDays, format, parseISO, isValid } from "date-fns";
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
    throw new Error(`${d.error}${details ? ` · ${details}` : ""}`);
  }
  return data as T;
}

// --------------------------------------------------------------------
// 1) Autocomplete de aeroportos
// --------------------------------------------------------------------
export function useAirportSearch(query: string, enabled = true) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["gflights", "searchAirport", trimmed],
    queryFn: async (): Promise<GAirport[]> => {
      const data = await invokeGFlights<any>("searchAirport", { query: trimmed });
      const candidates: any[] = Array.isArray(data?.data) ? data.data : [];

      const flat: GAirport[] = [];
      const seen = new Set<string>();

      function pushAirport(it: any, nearLabel?: string) {
        const id = it?.id;
        if (!id || typeof id !== "string") return;
        if (id.startsWith("/m/") || id.startsWith("/g/")) return;
        if (it.type !== "airport") return;
        const code = id.toUpperCase();
        if (seen.has(code)) return;
        seen.add(code);
        flat.push({
          id: code,
          name: it?.title || it?.name || code,
          city: it?.city || nearLabel,
          country: it?.country || it?.country_name,
          type: "AIRPORT",
          nearLabel,
          distance: typeof it?.distance === "string" ? it.distance : undefined,
        } as GAirport);
      }

      for (const it of candidates) {
        if (it?.type === "airport") {
          pushAirport(it);
        } else if (it?.type === "other" && Array.isArray(it.list)) {
          const nearLabel = it.title || it.city || "";
          for (const sub of it.list) pushAirport(sub, nearLabel);
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
  start_date?: string;
  end_date?: string;
}

export function useSearchGFlights(input: SearchGFlightsInput | null, enabled = true) {
  return useQuery({
    queryKey: ["gflights", "searchFlights", input],
    queryFn: async (): Promise<GSearchFlightsResult & { __cache?: boolean }> => {
      if (!input) throw new Error("input inválido");
      const data = await invokeGFlights<any>("searchFlights", input as unknown as Record<string, unknown>);
      const root = data?.data ?? {};
      const itineraries = root?.itineraries ?? {};
      const topRaw: any[] = Array.isArray(itineraries.topFlights) ? itineraries.topFlights : [];
      const otherRaw: any[] = Array.isArray(itineraries.otherFlights) ? itineraries.otherFlights : [];

      function mapLeg(leg: any) {
        return {
          airline: leg?.airline,
          airline_code: leg?.airline_code,
          airline_logo: leg?.airline_logo,
          flight_number: leg?.flight_number,
          airplane: leg?.aircraft,
          departure_airport: leg?.departure_airport ? {
            id: leg.departure_airport.airport_code,
            name: leg.departure_airport.airport_name,
            time: leg.departure_airport.time,
          } : undefined,
          arrival_airport: leg?.arrival_airport ? {
            id: leg.arrival_airport.airport_code,
            name: leg.arrival_airport.airport_name,
            time: leg.arrival_airport.time,
          } : undefined,
          duration: typeof leg?.duration === "object" ? leg.duration?.raw : leg?.duration,
          travel_class: leg?.travel_class,
          legroom: leg?.legroom,
          extensions: Array.isArray(leg?.extensions) ? leg.extensions : undefined,
        };
      }

      function mapLayover(lv: any) {
        return {
          duration: lv?.duration,
          name: lv?.airport_name,
          id: lv?.airport_code,
          overnight: lv?.overnight ?? false,
        };
      }

      function mapItinerary(it: any) {
        return {
          flights: Array.isArray(it?.flights) ? it.flights.map(mapLeg) : [],
          layovers: Array.isArray(it?.layovers) ? it.layovers.map(mapLayover) : [],
          total_duration: typeof it?.duration === "object" ? it.duration?.raw : it?.duration,
          price: typeof it?.price === "number" ? it.price : (typeof it?.price === "string" ? Number(it.price) : undefined),
          airline_logo: it?.airline_logo,
          booking_token: it?.booking_token,
          departure_token: it?.departure_token,
          type: it?.type,
          carbon_emissions: it?.carbon_emissions ? {
            this_flight: it.carbon_emissions?.CO2e,
            typical_for_this_route: it.carbon_emissions?.typical_for_this_route,
            difference_percent: it.carbon_emissions?.difference_percent,
          } : undefined,
        };
      }

      return {
        best_flights: topRaw.map(mapItinerary),
        other_flights: otherRaw.map(mapItinerary),
        price_insights: undefined,
        search_metadata: { source: "DataCrawler", action: "searchFlights" },
        __cache: !!data?.__cache,
      } as GSearchFlightsResult & { __cache?: boolean };
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
// 3) Calendar picker · heatmap mensal de preços (resiliente)
// --------------------------------------------------------------------
export function useCalendarPicker(input: SearchGFlightsInput | null, enabled = true) {
  return useQuery({
    queryKey: ["gflights", "getCalendarPicker", input],
    queryFn: async (): Promise<GCalendarDay[]> => {
      if (!input) return [];
      try {
        const data = await invokeGFlights<any>("getCalendarPicker", input as unknown as Record<string, unknown>);
        if (data && data.status === false) return [];
        const raw = data?.data ?? data;
        const arr: any[] =
          (Array.isArray(raw) && raw) ||
          (Array.isArray(raw?.calendar) && raw.calendar) ||
          (Array.isArray(raw?.days) && raw.days) ||
          [];
        return arr
          .map((it: any) => {
            const date = it?.departure ?? it?.date ?? it?.day;
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
      } catch (e) {
        console.warn("[gflights] getCalendarPicker failed (não-fatal):", e);
        return [];
      }
    },
    enabled:
      enabled &&
      !!input?.departure_id &&
      !!input?.arrival_id &&
      !!input?.outbound_date,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}

// --------------------------------------------------------------------
// 4) Price graph · gráfico de tendência
// --------------------------------------------------------------------
export function usePriceGraph(input: SearchGFlightsInput | null, enabled = true) {
  return useQuery({
    queryKey: ["gflights", "getPriceGraph", input],
    queryFn: async (): Promise<GPriceGraphPoint[]> => {
      if (!input) throw new Error("input inválido");
      // DataCrawler exige start_date/end_date · injeta janela ±14d se ausente
      const params: Record<string, unknown> = { ...(input as any) };
      if (!params.start_date || !params.end_date) {
        const base = parseISO(input.outbound_date);
        if (isValid(base)) {
          if (!params.start_date) params.start_date = format(addDays(base, -14), "yyyy-MM-dd");
          if (!params.end_date) params.end_date = format(addDays(base, 14), "yyyy-MM-dd");
        }
      }
      const data = await invokeGFlights<any>("getPriceGraph", params);
      const arr: any[] = Array.isArray(data?.data) ? data.data : [];
      return arr
        .map((it: any) => {
          const date = it?.departure ?? it?.date ?? it?.day;
          if (!date) return null;
          const priceNum = typeof it?.price === "number" ? it.price : Number(it?.price);
          return {
            date: String(date),
            price: Number.isFinite(priceNum) ? priceNum : null,
            is_outbound: true,
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
