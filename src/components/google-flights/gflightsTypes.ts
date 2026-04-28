// Tipos do módulo Google Flights BETA (DataCrawler).
// A API retorna estruturas próprias — esses tipos cobrem o uso na UI;
// campos extras passam por `[k: string]: unknown` pra não travar.

export type GFlightCabin = "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
export type GFlightSort =
  | "BEST"
  | "CHEAPEST"
  | "FASTEST"
  | "DEPARTURE_EARLIEST"
  | "DEPARTURE_LATEST"
  | "ARRIVAL_EARLIEST"
  | "ARRIVAL_LATEST";

export interface GAirport {
  id: string;          // IATA airport ou city code (ex: "GRU", "SAO")
  name?: string;
  city?: string;
  country?: string;
  type?: "AIRPORT" | "CITY" | string;
}

export interface GFlightLeg {
  airline?: string;        // nome
  airline_code?: string;   // IATA carrier
  airline_logo?: string;
  flight_number?: string;
  airplane?: string;
  departure_airport?: { id?: string; name?: string; time?: string; city?: string };
  arrival_airport?: { id?: string; name?: string; time?: string; city?: string };
  duration?: number;       // minutos
  travel_class?: string;
  legroom?: string;
  extensions?: string[];
  [k: string]: unknown;
}

export interface GLayover {
  duration?: number;        // minutos
  name?: string;            // nome do aeroporto de conexão
  id?: string;              // IATA
  overnight?: boolean;
}

export interface GFlightItinerary {
  flights: GFlightLeg[];
  layovers?: GLayover[];
  total_duration?: number;  // minutos
  carbon_emissions?: { this_flight?: number; typical_for_this_route?: number; difference_percent?: number };
  price?: number;           // preço total da opção (por adulto, geralmente)
  type?: string;
  airline_logo?: string;
  departure_token?: string;
  booking_token?: string;
  [k: string]: unknown;
}

export interface GPriceInsights {
  lowest_price?: number;
  price_level?: "low" | "typical" | "high" | string;
  typical_price_range?: [number, number];
  price_history?: Array<[number, number]>; // [timestampSec, price]
}

export interface GSearchFlightsResult {
  best_flights?: GFlightItinerary[];
  other_flights?: GFlightItinerary[];
  price_insights?: GPriceInsights;
  airports?: Array<{
    departure?: Array<{ airport?: { id?: string; name?: string }; city?: string; country?: string; image?: string; thumbnail?: string }>;
    arrival?: Array<{ airport?: { id?: string; name?: string }; city?: string; country?: string; image?: string; thumbnail?: string }>;
  }>;
  search_metadata?: Record<string, unknown>;
  search_parameters?: Record<string, unknown>;
  [k: string]: unknown;
}

// Calendar (getCalendarPicker) — formato típico: { date: "YYYY-MM-DD", price: number }
export interface GCalendarDay {
  date: string;
  price?: number | null;
  level?: "low" | "typical" | "high" | null;
  group?: string;
}

// Price graph (getPriceGraph) — datas vs preço médio numa janela
export interface GPriceGraphPoint {
  date: string;            // "YYYY-MM-DD"
  price?: number | null;
  is_outbound?: boolean;
}

// ----------------------------------------------------------------------
// Utilitários
// ----------------------------------------------------------------------

export function formatBRL(n?: number | null): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `R$ ${Math.round(n)}`;
  }
}

export function formatMinutes(min?: number | null): string {
  if (!min || min <= 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function formatTime(iso?: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return iso;
  }
}

export function formatDateShort(iso?: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch {
    return iso;
  }
}

export function dayDiff(a?: string, b?: string): number {
  if (!a || !b) return 0;
  try {
    const da = new Date(a); da.setHours(0, 0, 0, 0);
    const db = new Date(b); db.setHours(0, 0, 0, 0);
    return Math.round((db.getTime() - da.getTime()) / 86400000);
  } catch { return 0; }
}

export function cabinLabel(c?: string): string {
  switch (c) {
    case "ECONOMY": return "Econômica";
    case "PREMIUM_ECONOMY": return "Econômica Premium";
    case "BUSINESS": return "Executiva";
    case "FIRST": return "Primeira Classe";
    default: return c ?? "";
  }
}

/** Heatmap level: low/typical/high → classes Tailwind */
export function priceLevelClass(level?: string | null, price?: number | null, min?: number, max?: number): string {
  if (level === "low") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
  if (level === "high") return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
  if (level === "typical") return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
  // Fallback baseado em quantis
  if (price !== null && price !== undefined && min !== undefined && max !== undefined && max > min) {
    const ratio = (price - min) / (max - min);
    if (ratio < 0.33) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    if (ratio > 0.66) return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
    return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
  }
  return "bg-muted/40 text-muted-foreground border-border";
}
