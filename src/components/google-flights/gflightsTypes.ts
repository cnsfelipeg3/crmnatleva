// Tipos do módulo Google Flights BETA (DataCrawler).
// Mapeia 100% dos campos retornados pela API.

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
  id: string;
  name?: string;
  city?: string;
  country?: string;
  type?: "AIRPORT" | "CITY" | string;
  nearLabel?: string;
  distance?: string;
  groupCity?: string;            // header de agrupamento "Paris · 4 aeroportos"
  groupCount?: number;
}

export interface GFlightLeg {
  airline?: string;
  airline_code?: string;
  airline_logo?: string;
  flight_number?: string;
  aircraft?: string;            // ex: "Airbus A330-900neo"
  seat?: string;                // ex: "Average legroom"
  legroom?: string;             // ex: "79 cm"
  travel_class?: string;
  departure_airport?: { id?: string; name?: string; time?: string; city?: string };
  arrival_airport?: { id?: string; name?: string; time?: string; city?: string };
  duration?: number;            // minutos
  duration_text?: string;       // "9 hr 50 min"
  extensions?: string[];        // amenities + CO2 estimate per leg
  [k: string]: unknown;
}

export interface GLayover {
  duration?: number;            // minutos
  duration_text?: string;       // "2 hr 5 min"
  name?: string;                // nome do aeroporto
  id?: string;                  // IATA
  city?: string;
  overnight?: boolean;
}

export interface GBags {
  carry_on?: number | null;
  checked?: number | null;
}

export interface GCarbonEmissions {
  this_flight?: number;             // gramas (CO2e)
  typical_for_this_route?: number;
  difference_percent?: number;
  higher?: number;
}

export interface GFlightItinerary {
  flights: GFlightLeg[];
  layovers?: GLayover[];
  total_duration?: number;          // minutos
  total_duration_text?: string;
  departure_time_text?: string;     // "28-05-2026 08:45 PM"
  arrival_time_text?: string;
  carbon_emissions?: GCarbonEmissions;
  price?: number;
  bags?: GBags;
  stops?: number;
  self_transfer?: boolean;
  delay?: { values?: boolean; text?: number | string };
  type?: string;
  airline_logo?: string;
  departure_token?: string;
  booking_token?: string;
  [k: string]: unknown;
}

// Sub-oferta de um provider (combos ida/volta · campo bookings[] da DataCrawler)
export interface GBookingSubOffer {
  price?: number;
  title?: string;
  website?: string;
  meta?: unknown;
  [k: string]: unknown;
}

// Detalhes de bagagem por provider (campo bag_info da DataCrawler)
export interface GBagInfo {
  carry_on?: { included?: boolean; price?: number; description?: string } | null;
  checked?: { included?: boolean; price?: number; description?: string } | null;
  raw?: unknown;
}

// Provider/agent que oferece o voo (retornado por getBookingDetails)
export interface GBookingProvider {
  id: string;
  title: string;
  website?: string;
  price: number;
  is_airline: boolean;
  individualBooking?: boolean;
  token?: string;
  logo?: string;
  bookings?: GBookingSubOffer[];     // sub-ofertas/combos
  meta?: unknown;                    // metadata adicional
}

export interface GBookingDetailsResponse {
  providers: GBookingProvider[];
  bag_info: GBagInfo | null;
}

// Histórico de preço da rota (vem dentro do searchFlights · não consumia até agora)
export interface GPriceBand {
  value: number;
  operation: string;     // "<", ">", "between"
}
export interface GPriceHistory {
  history: { date: string; price: number }[];
  current?: number;
  low?: GPriceBand[];
  typical?: GPriceBand[];
  high?: GPriceBand[];
  classification?: "low" | "typical" | "high" | null;
}

// Filtros laterais
export interface GFlightFilters {
  stops: ("0" | "1" | "2+")[];
  airlines: string[];
  priceMin: number;
  priceMax: number;
  durationMaxMin: number;
  depHourFrom: number;
  depHourTo: number;
  bagCarryOn: boolean;
  bagChecked: boolean;
  sortBy: "price_asc" | "duration_asc" | "departure_asc" | "co2_asc";
}

export const DEFAULT_GFLIGHT_FILTERS: GFlightFilters = {
  stops: ["0", "1", "2+"],
  airlines: [],
  priceMin: 0,
  priceMax: 0,
  durationMaxMin: 0,
  depHourFrom: 0,
  depHourTo: 24,
  bagCarryOn: false,
  bagChecked: false,
  sortBy: "price_asc",
};

export interface GPriceInsights {
  lowest_price?: number;
  highest_price?: number;
  average_price?: number;
  median_price?: number;
  price_level?: "low" | "typical" | "high" | string;
  best_day?: string;                // YYYY-MM-DD
  best_day_price?: number;
  typical_price_range?: [number, number];
}

export interface GSearchFlightsResult {
  best_flights?: GFlightItinerary[];
  other_flights?: GFlightItinerary[];
  price_insights?: GPriceInsights;
  search_metadata?: Record<string, unknown>;
  [k: string]: unknown;
}

export interface GCalendarDay {
  date: string;
  price?: number | null;
  level?: "low" | "typical" | "high" | null;
  group?: string;
}

export interface GPriceGraphPoint {
  date: string;
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

/**
 * A DataCrawler entrega timestamps no formato "YYYY-M-D HH:MM" (sem zero-padding e sem TZ).
 * Trabalhamos como hora local SEM aplicar timezone do browser.
 */
export function parseDcDateTime(s?: string): { date: Date; hh: string; mm: string } | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  return {
    date: new Date(+y, +mo - 1, +d, +h, +mi, 0, 0),
    hh: h.padStart(2, "0"),
    mm: mi.padStart(2, "0"),
  };
}

export function getDepHour(it: GFlightItinerary): number | null {
  const t = it.flights?.[0]?.departure_airport?.time;
  const p = parseDcDateTime(t);
  return p ? p.date.getHours() : null;
}

export function hasExtension(it: GFlightItinerary, regex: RegExp): boolean {
  return it.flights?.some(f => f.extensions?.some(e => regex.test(e))) ?? false;
}

export function formatTime(iso?: string): string {
  if (!iso) return "";
  const p = parseDcDateTime(iso);
  if (p) return `${p.hh}:${p.mm}`;
  // Fallback ISO clássico
  try {
    const d = new Date(iso);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
    }
  } catch { /* noop */ }
  return iso;
}

export function formatDateShort(iso?: string): string {
  if (!iso) return "";
  const p = parseDcDateTime(iso);
  if (p) {
    return p.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }
  try {
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch { /* noop */ }
  return iso;
}

export function formatDateLong(iso?: string): string {
  if (!iso) return "";
  const p = parseDcDateTime(iso);
  const d = p ? p.date : (() => { try { return new Date(iso); } catch { return null; } })();
  if (!d || isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}

export function dayDiff(a?: string, b?: string): number {
  if (!a || !b) return 0;
  const pa = parseDcDateTime(a);
  const pb = parseDcDateTime(b);
  const da = pa ? pa.date : new Date(a);
  const db = pb ? pb.date : new Date(b);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return 0;
  const dayA = new Date(da.getFullYear(), da.getMonth(), da.getDate()).getTime();
  const dayB = new Date(db.getFullYear(), db.getMonth(), db.getDate()).getTime();
  return Math.round((dayB - dayA) / 86400000);
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

export function priceLevelClass(level?: string | null, price?: number | null, min?: number, max?: number): string {
  if (level === "low") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
  if (level === "high") return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
  if (level === "typical") return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
  if (price !== null && price !== undefined && min !== undefined && max !== undefined && max > min) {
    const ratio = (price - min) / (max - min);
    if (ratio < 0.33) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    if (ratio > 0.66) return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
    return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
  }
  return "bg-muted/40 text-muted-foreground border-border";
}

/**
 * Classifica extensions[] por categoria pra renderização (Wi-Fi, USB, vídeo, etc).
 * As extensions vêm em PT/EN aleatórias; usamos heurística por substring.
 */
export type ExtensionTag = {
  label: string;
  kind: "wifi" | "power" | "video" | "audio" | "legroom" | "co2" | "meal" | "other";
};

export function classifyExtensions(extensions?: string[]): ExtensionTag[] {
  if (!extensions?.length) return [];
  const tags: ExtensionTag[] = [];
  for (const raw of extensions) {
    const s = raw.toLowerCase();
    if (s.includes("wi-fi") || s.includes("wifi")) {
      tags.push({ label: raw, kind: "wifi" });
    } else if (s.includes("power") || s.includes("usb") || s.includes("tomada") || s.includes("energia")) {
      tags.push({ label: raw, kind: "power" });
    } else if (s.includes("video") || s.includes("vídeo") || s.includes("on-demand") || s.includes("entertainment")) {
      tags.push({ label: raw, kind: "video" });
    } else if (s.includes("audio") || s.includes("áudio") || s.includes("music")) {
      tags.push({ label: raw, kind: "audio" });
    } else if (s.includes("legroom") || s.includes("espaço") || s.includes("cm)")) {
      tags.push({ label: raw, kind: "legroom" });
    } else if (s.includes("co2") || s.includes("emissions") || s.includes("emissões") || s.includes("emissão")) {
      tags.push({ label: raw, kind: "co2" });
    } else if (s.includes("meal") || s.includes("refeição") || s.includes("snack")) {
      tags.push({ label: raw, kind: "meal" });
    } else {
      tags.push({ label: raw, kind: "other" });
    }
  }
  return tags;
}

export function formatCO2(grams?: number): string {
  if (!grams || !Number.isFinite(grams)) return "—";
  const kg = grams / 1000;
  if (kg < 10) return `${kg.toFixed(1)} kg CO₂`;
  return `${Math.round(kg)} kg CO₂`;
}
