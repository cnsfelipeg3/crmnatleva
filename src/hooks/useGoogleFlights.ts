// Hooks do módulo Google Flights BETA (DataCrawler via RapidAPI)
// Isolado: não toca em useBookingRapidApi nem em outros módulos de voo.

import { useQuery } from "@tanstack/react-query";
import { addDays, format, parseISO, isValid } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type {
  GAirport,
  GBookingProvider,
  GBookingDetailsResponse,
  GBagInfo,
  GBookingSubOffer,
  GCalendarDay,
  GFlightCabin,
  GPriceGraphPoint,
  GPriceHistory,
  GPriceInsight,
  GPriceLevel,
  GSearchFlightsResult,
} from "@/components/google-flights/gflightsTypes";

const FUNCTION_NAME = "google-flights-rapidapi";

export async function invokeGFlights<T = unknown>(
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

      function pushAirport(it: any, nearLabel?: string, group?: { city: string; count: number }) {
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
          groupCity: group?.city,
          groupCount: group?.count,
        } as GAirport);
      }

      for (const it of candidates) {
        if (it?.type === "airport") {
          pushAirport(it);
        } else if (it?.type === "other" && Array.isArray(it.list)) {
          const nearLabel = it.title || it.city || "";
          // Marca apenas o PRIMEIRO sub-aeroporto do grupo com o cabeçalho
          // (a UI usa isso para renderizar o divisor "Paris · 4 aeroportos")
          let first = true;
          for (const sub of it.list) {
            const groupMeta = first ? { city: nearLabel, count: it.list.length } : undefined;
            pushAirport(sub, nearLabel, groupMeta);
            first = false;
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
          aircraft: leg?.aircraft,
          seat: leg?.seat,
          legroom: leg?.legroom,
          travel_class: leg?.travel_class,
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
          duration_text: typeof leg?.duration === "object" ? leg.duration?.text : undefined,
          extensions: Array.isArray(leg?.extensions) ? leg.extensions : undefined,
        };
      }

      function mapLayover(lv: any) {
        return {
          duration: lv?.duration,
          duration_text: lv?.duration_label,
          name: lv?.airport_name,
          id: lv?.airport_code,
          city: lv?.city,
          overnight: lv?.overnight ?? false,
        };
      }

      function mapItinerary(it: any) {
        const flights = Array.isArray(it?.flights) ? it.flights.map(mapLeg) : [];
        // API DataCrawler retorna stops:0 mesmo com conexão. Sempre derivar de layovers/legs.
        const stops = Math.max(
          Array.isArray(it?.layovers) ? it.layovers.length : 0,
          Array.isArray(it?.flights) ? Math.max(0, it.flights.length - 1) : 0,
        );
        return {
          flights,
          layovers: Array.isArray(it?.layovers) ? it.layovers.map(mapLayover) : [],
          total_duration: typeof it?.duration === "object" ? it.duration?.raw : it?.duration,
          total_duration_text: typeof it?.duration === "object" ? it.duration?.text : undefined,
          departure_time_text: it?.departure_time,
          arrival_time_text: it?.arrival_time,
          stops,
          self_transfer: !!it?.self_transfer,
          delay: it?.delay ? {
            values: !!it.delay.values,
            text: typeof it.delay.text === "number" ? it.delay.text : (it.delay.text ? String(it.delay.text) : undefined),
          } : undefined,
          bags: it?.bags ? {
            carry_on: it.bags.carry_on ?? null,
            checked: it.bags.checked ?? null,
          } : undefined,
          price: typeof it?.price === "number" ? it.price : (typeof it?.price === "string" ? Number(it.price) : undefined),
          airline_logo: it?.airline_logo,
          booking_token: it?.booking_token,
          departure_token: it?.departure_token,
          type: it?.type,
          carbon_emissions: it?.carbon_emissions ? {
            this_flight: it.carbon_emissions?.CO2e,
            typical_for_this_route: it.carbon_emissions?.typical_for_this_route,
            difference_percent: it.carbon_emissions?.difference_percent,
            higher: it.carbon_emissions?.higher,
          } : undefined,
        };
      }

      // Insights agregados a partir dos resultados (a DataCrawler não devolve price_insights)
      const allItins = [...topRaw, ...otherRaw].map(mapItinerary);
      const prices = allItins.map(i => i.price).filter((p): p is number => typeof p === "number" && Number.isFinite(p));
      let priceInsights: any = undefined;
      if (prices.length) {
        const sorted = [...prices].sort((a, b) => a - b);
        const lowest = sorted[0];
        const highest = sorted[sorted.length - 1];
        const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
        const median = sorted[Math.floor(sorted.length / 2)];
        let level: "low" | "typical" | "high" = "typical";
        if (highest > lowest) {
          const ratio = (lowest - lowest) / (highest - lowest); // sempre 0
          // melhor heurística: comparar avg vs lowest
          const span = highest - lowest;
          if (lowest < avg - span * 0.15) level = "low";
        }
        priceInsights = {
          lowest_price: lowest,
          highest_price: highest,
          average_price: avg,
          median_price: median,
          price_level: level,
        };
      }

      // -------- priceHistory (vem dentro do searchFlights, antes ignorado) --------
      const ph = root?.priceHistory;
      let priceHistory: GPriceHistory | undefined;
      if (ph && (Array.isArray(ph.history) || ph.summary)) {
        const historyArr: { date: string; price: number }[] = Array.isArray(ph.history)
          ? ph.history
              .map((h: any) => {
                const t = h?.time ?? h?.date;
                const v = typeof h?.value === "number" ? h.value : Number(h?.value);
                if (!t || !Number.isFinite(v)) return null;
                // time pode vir como timestamp (ms) ou string ISO
                let date: string;
                if (typeof t === "number") {
                  date = new Date(t).toISOString().slice(0, 10);
                } else {
                  const d = new Date(String(t));
                  date = isNaN(d.getTime()) ? String(t) : d.toISOString().slice(0, 10);
                }
                return { date, price: v };
              })
              .filter((x: any): x is { date: string; price: number } => !!x)
          : [];
        function bands(arr: any): any[] | undefined {
          if (!Array.isArray(arr)) return undefined;
          return arr
            .map((b: any) => ({
              value: typeof b?.value === "number" ? b.value : Number(b?.value),
              operation: String(b?.operation ?? ""),
            }))
            .filter((b: any) => Number.isFinite(b.value));
        }
        priceHistory = {
          history: historyArr,
          current: typeof ph?.summary?.current === "number" ? ph.summary.current : undefined,
          low: bands(ph?.summary?.low),
          typical: bands(ph?.summary?.typical),
          high: bands(ph?.summary?.high),
        };
      }

      // -------- price_insight (banner inteligente · derivado de priceHistory) --------
      let price_insight: GPriceInsight | undefined;
      if (ph) {
        const current = typeof ph?.summary?.current === "number" ? ph.summary.current : null;
        const lowOp = (ph?.summary?.low ?? []).find((x: any) => x?.operation === "<" || x?.operation === "<=");
        const typicalOps: any[] = Array.isArray(ph?.summary?.typical) ? ph.summary.typical : [];
        const lowThreshold = typeof lowOp?.value === "number" ? lowOp.value : undefined;
        const highOp = typicalOps.find((x: any) => x?.operation === "<=" || x?.operation === "<");
        const highThreshold = typeof highOp?.value === "number" ? highOp.value : undefined;

        let level: GPriceLevel = "unknown";
        if (typeof current === "number" && typeof lowThreshold === "number" && typeof highThreshold === "number") {
          if (current < lowThreshold) level = "low";
          else if (current > highThreshold) level = "high";
          else level = "typical";
        }

        const historyArr: any[] = Array.isArray(ph?.history) ? ph.history : [];
        const historyPoints = historyArr
          .map((p: any) => {
            const t = p?.time ?? p?.date;
            if (t == null) return null;
            const v = typeof p?.value === "number" ? p.value : Number(p?.value ?? p?.price);
            if (!Number.isFinite(v)) return null;
            const d = typeof t === "number" ? new Date(t) : new Date(String(t));
            if (isNaN(d.getTime())) return null;
            return { date: d.toISOString().slice(0, 10), price: v };
          })
          .filter((x: any): x is { date: string; price: number } => !!x)
          .sort((a, b) => a.date.localeCompare(b.date));

        const prices = historyPoints.map(p => p.price);
        const averageHistory = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
        const minHistory = prices.length ? Math.min(...prices) : 0;
        const maxHistory = prices.length ? Math.max(...prices) : 0;

        if (typeof current === "number") {
          price_insight = {
            current,
            lowThreshold,
            highThreshold,
            level,
            historyPoints,
            averageHistory,
            minHistory,
            maxHistory,
          };
        }
      }

      return {
        price_insight,
        best_flights: topRaw.map(mapItinerary),
        other_flights: otherRaw.map(mapItinerary),
        price_insights: priceInsights,
        price_history: priceHistory,
        search_metadata: { source: "DataCrawler", action: "searchFlights", count: allItins.length },
        fetched_at: typeof data?.timestamp === "number"
          ? new Date(data.timestamp).toISOString()
          : new Date().toISOString(),
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
          const ret = it?.return ?? it?.return_date ?? null;
          return {
            date: String(date),
            price: Number.isFinite(priceNum) ? priceNum : null,
            is_outbound: true,
            return_date: ret ? String(ret) : null,
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

// --------------------------------------------------------------------
// 5) Helper: converte priceGraph[] em GCalendarDay[] com classificação low/typical/high.
// Usado para alimentar o calendário quando getCalendarPicker da DataCrawler falha.
// --------------------------------------------------------------------
export function priceGraphToCalendar(points: GPriceGraphPoint[]): GCalendarDay[] {
  if (!points?.length) return [];
  const prices = points
    .map(p => p.price)
    .filter((p): p is number => typeof p === "number" && Number.isFinite(p));
  if (!prices.length) {
    return points.map(p => ({ date: p.date, price: p.price ?? null, level: null }));
  }
  const sorted = [...prices].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.33)];
  const q3 = sorted[Math.floor(sorted.length * 0.66)];
  return points.map(p => {
    let level: "low" | "typical" | "high" | null = null;
    if (typeof p.price === "number") {
      if (p.price <= q1) level = "low";
      else if (p.price >= q3) level = "high";
      else level = "typical";
    }
    return { date: p.date, price: p.price ?? null, level };
  });
}

// --------------------------------------------------------------------
// 6) Booking details · providers/OTAs que oferecem o voo + preços
// --------------------------------------------------------------------
export interface BookingDetailsInput extends SearchGFlightsInput {
  booking_token: string;
}

export function useFlightBookingDetails(
  input: SearchGFlightsInput | null,
  bookingToken: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["gflights", "getBookingDetails", "v2-token", input, bookingToken],
    queryFn: async (): Promise<GBookingDetailsResponse> => {
      const empty: GBookingDetailsResponse = { providers: [], bag_info: null };
      if (!input || !bookingToken) return empty;
      try {
        const data = await invokeGFlights<any>("getBookingDetails", {
          ...input,
          booking_token: bookingToken,
        });
        // A API pode retornar data: [...] ou data: { providers: [...] } ou data: { booking_options: [...] }
        const raw = data?.data;
        const arr: any[] =
          (Array.isArray(raw) && raw) ||
          (Array.isArray(raw?.providers) && raw.providers) ||
          (Array.isArray(raw?.booking_options) && raw.booking_options) ||
          (Array.isArray(raw?.together) && raw.together) ||
          [];

        const providers: GBookingProvider[] = arr
          .map((it: any) => {
            const subBookings: GBookingSubOffer[] = Array.isArray(it?.bookings)
              ? it.bookings.map((b: any) => ({
                  price: typeof b?.price === "number" ? b.price : Number(b?.price) || undefined,
                  title: b?.title ? String(b.title) : undefined,
                  website: b?.website ? String(b.website) : (b?.url ? String(b.url) : undefined),
                  meta: b?.meta ?? undefined,
                  ...b,
                }))
              : [];
            return {
              id: String(it?.id ?? it?.code ?? it?.title ?? ""),
              title: String(it?.title ?? it?.name ?? "Desconhecido"),
              website: it?.website ? String(it.website) : (it?.url ? String(it.url) : undefined),
              price: typeof it?.price === "number" ? it.price : Number(it?.price) || 0,
              is_airline: !!it?.is_airline,
              individualBooking: !!it?.individualBooking,
              token: it?.token ? String(it.token) : undefined,
              logo: it?.logo ? String(it.logo) : undefined,
              bookings: subBookings,
              meta: it?.meta ?? undefined,
            };
          })
          .filter((p) => p.id || p.title);

        // bag_info pode vir no nível raiz da resposta ou dentro de data
        const rawBag = data?.bag_info ?? raw?.bag_info ?? null;
        let bag_info: GBagInfo | null = null;
        if (rawBag && typeof rawBag === "object") {
          const norm = (b: any) => {
            if (!b || typeof b !== "object") return undefined;
            return {
              included: !!(b.included ?? b.is_included),
              price: typeof b.price === "number" ? b.price : (b.price ? Number(b.price) : undefined),
              description: b.description ?? b.text ?? b.label ?? undefined,
            };
          };
          bag_info = {
            carry_on: norm(rawBag.carry_on ?? rawBag.cabin) ?? null,
            checked: norm(rawBag.checked ?? rawBag.hold) ?? null,
            raw: rawBag,
          };
        }

        return { providers, bag_info };
      } catch (e) {
        console.warn("[gflights] getBookingDetails failed:", e);
        return empty;
      }
    },
    enabled: enabled && !!input && !!bookingToken,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
}


// --------------------------------------------------------------------
// 7) fetchBookingURL · resolve deeplink real do provider via getBookingURL.
// Função pura (não-hook) · pode ser chamada de qualquer handler.
// Recebe o token do provider (vem de getBookingDetails), retorna URL ou null.
// --------------------------------------------------------------------
export async function fetchBookingURL(providerToken: string): Promise<string | null> {
  if (!providerToken) return null;
  try {
    const data = await invokeGFlights<any>("getBookingURL", { token: providerToken });
    if (data && data.status === false) return null;
    if (typeof data?.data === "string") return data.data;
    if (typeof data?.url === "string") return data.url;
    return null;
  } catch (e) {
    console.warn("[gflights] getBookingURL failed:", e);
    return null;
  }
}
