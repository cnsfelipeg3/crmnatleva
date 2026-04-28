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
  // Round-trip · quando is_round_trip=true, flights/layovers refletem a VOLTA
  // (compatibilidade), e os campos outbound_* trazem a IDA.
  is_round_trip?: boolean;
  outbound_flights?: GFlightLeg[];
  outbound_layovers?: GLayover[];
  outbound_duration?: number;
  outbound_duration_text?: string;
  outbound_departure_time?: string;
  outbound_arrival_time?: string;
  outbound_carbon_emissions?: GCarbonEmissions;
  return_flights?: GFlightLeg[];
  return_layovers?: GLayover[];
  return_duration?: number;
  return_duration_text?: string;
  return_departure_time?: string;
  return_arrival_time?: string;
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

// 6 tiers normalizados de tarifa (independente da cia)
export type GFareTier = "basic" | "standard" | "flexible" | "premium" | "business" | "first";

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
  // Campos crus extraídos da resposta da DataCrawler:
  cabin?: string;                    // ex: "BASIC ECONOMY", "PREMIUM ECONOMY"
  fareType?: string;                 // meta.fare_type ("Economy Fully Refundable")
  baggage?: string[];                // ["1 bagagem de mão incluída", ...]
  features?: string[];               // ["Seleção de assentos gratuita", ...]
  // Derivados pelo classifier (fareClassifier.ts):
  fareTier?: GFareTier;
  fareDisplayName?: string;
  benefits?: string[];
  restrictions?: string[];
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
  // Filtros premium · novos
  excludeSelfTransfer: boolean;
  excludeProblematicLayovers: boolean;
  arrHourFrom: number;
  arrHourTo: number;
  excludeConnectingAirports: string[];
  onlyConnectingAirports: string[];
  quickFilter: "direct" | "morning" | "afternoon" | "evening" | "eco" | null;
  // Filtros de tarifa (atuam dentro do drawer · sobre os providers do voo selecionado):
  fareTiers: GFareTier[];
  requireCheckedBag: boolean;
  requireRefundable: boolean;
  requireFreeChange: boolean;
  requireFreeSeat: boolean;
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
  excludeSelfTransfer: false,
  excludeProblematicLayovers: false,
  arrHourFrom: 0,
  arrHourTo: 24,
  excludeConnectingAirports: [],
  onlyConnectingAirports: [],
  quickFilter: null,
  fareTiers: ["basic", "standard", "flexible", "premium", "business", "first"],
  requireCheckedBag: false,
  requireRefundable: false,
  requireFreeChange: false,
  requireFreeSeat: false,
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

// Inteligência de preço · derivada de priceHistory.summary + priceHistory.history
export type GPriceLevel = "low" | "typical" | "high" | "unknown";

export interface GPriceInsight {
  current: number;
  lowThreshold?: number;
  highThreshold?: number;
  level: GPriceLevel;
  historyPoints: Array<{ date: string; price: number }>;
  averageHistory: number;
  minHistory: number;
  maxHistory: number;
}

export interface GSearchFlightsResult {
  best_flights?: GFlightItinerary[];
  other_flights?: GFlightItinerary[];
  price_insights?: GPriceInsights;
  price_history?: GPriceHistory;            // novo · vem do searchFlights.priceHistory
  price_insight?: GPriceInsight;            // derivado · banner inteligente
  search_metadata?: Record<string, unknown>;
  fetched_at?: string;                      // ISO timestamp da resposta
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
  return_date?: string | null;              // par ida/volta para round-trip
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

/**
 * Resultado da detecção de bagagem · tristate.
 *  - "yes"     · há evidência POSITIVA explícita (numérico > 0 OU extensão "incluída")
 *  - "no"      · há evidência NEGATIVA explícita (numérico = 0 OU extensão "não inclusa / paga")
 *  - "unknown" · API não trouxe info confiável (não significa que não há bagagem)
 */
export type BagState = "yes" | "no" | "unknown";

export interface BagDetection {
  carry_on: BagState;
  checked: BagState;
}

// Palavras-chave de bagagem (cabin/checked) · ancoradas com word boundaries
const CARRY_KEYWORDS = [
  /\bcarry[\s-]?on\b/i,
  /\bcabin\s+bag(gage)?\b/i,
  /\bhand\s+bag(gage)?\b/i,
  /\bbagagem\s+de\s+m[ãa]o\b/i,
  /\bm[ãa]o\s+inclu/i,                 // "mão inclusa"
];

const CHECKED_KEYWORDS = [
  /\bchecked\s+bag(gage)?\b/i,
  /\bhold\s+bag(gage)?\b/i,
  /\bbagagem\s+despachada\b/i,
  /\bdespachad[ao]\b/i,
  /\b\d+\s*kg\s+(bag|baggage|despach)/i,
  /\b\d+\s*x?\s*\d*\s*kg\b.*(check|despach|hold)/i,
];

// Marcadores POSITIVOS · co-ocorrem com a keyword na mesma extensão
const POSITIVE_MARKERS = /\b(included|inclus[ao]|inclu[íi]da|gr[áa]tis|free|allowed|permitida)\b/i;

// Marcadores NEGATIVOS · co-ocorrem com a keyword na mesma extensão
const NEGATIVE_MARKERS = /\b(not\s+included|n[ãa]o\s+inclu|for\s+a\s+fee|extra\s+fee|paid|cobrad[ao]|charge[d]?|sem\s+bagagem|no\s+(carry|checked|hold|bag)|fee\s+applies)\b/i;

/**
 * Detecta bagagem inclusa de forma resiliente. A DataCrawler entrega:
 *  - it.bags.{carry_on, checked}: número (0 = explicitamente sem, > 0 = incluso, null/undef = desconhecido)
 *  - leg.extensions[]: strings tipo "1 carry-on bag included", "Checked bag for a fee"
 *
 * Estratégia:
 *  1. Numérico explícito ganha sempre (yes/no firmes).
 *  2. Senão, varre extensões e exige co-ocorrência keyword + marker POS/NEG na MESMA string.
 *  3. Se não encontrar nada, retorna "unknown" · NUNCA assume "no" por silêncio.
 */
export function detectBags(it: GFlightItinerary): BagDetection {
  // 1) Numérico explícito
  const numCarry = typeof it.bags?.carry_on === "number" ? it.bags.carry_on : null;
  const numChecked = typeof it.bags?.checked === "number" ? it.bags.checked : null;

  let carry_on: BagState = numCarry === null ? "unknown" : numCarry > 0 ? "yes" : "no";
  let checked: BagState = numChecked === null ? "unknown" : numChecked > 0 ? "yes" : "no";

  // 2) Se ainda unknown, varre extensões
  if (carry_on === "unknown" || checked === "unknown") {
    const allExt: string[] = [];
    for (const leg of it.flights ?? []) {
      if (Array.isArray(leg.extensions)) allExt.push(...leg.extensions);
    }

    function scan(keywords: RegExp[]): BagState {
      let pos = 0, neg = 0;
      for (const ext of allExt) {
        if (!keywords.some(k => k.test(ext))) continue;
        const isNeg = NEGATIVE_MARKERS.test(ext);
        const isPos = POSITIVE_MARKERS.test(ext);
        if (isNeg && !isPos) neg++;
        else if (isPos && !isNeg) pos++;
        // ambíguo (ambos ou nenhum) · ignora
      }
      if (pos > 0 && neg === 0) return "yes";
      if (neg > 0 && pos === 0) return "no";
      if (pos > 0 && neg > 0) return pos >= neg ? "yes" : "no"; // empate · prefere positivo
      return "unknown";
    }

    if (carry_on === "unknown") carry_on = scan(CARRY_KEYWORDS);
    if (checked === "unknown") checked = scan(CHECKED_KEYWORDS);
  }

  return { carry_on, checked };
}


/**
 * Classifica um preço dentro das faixas históricas (low/typical/high) usando as
 * regras de operação que vêm da API (>, <, between).
 */
// ----------------------------------------------------------------------
// Layover classification · severity por duração
// ----------------------------------------------------------------------

export type LayoverSeverity = "tight" | "ok" | "long" | "overnight";

export interface LayoverClassification {
  severity: LayoverSeverity;
  label: string;
  hint: string;
  // Tailwind tokens contextualizados
  textClass: string;
  bgClass: string;
  borderClass: string;
}

/**
 * Classifica uma conexão por duração + overnight.
 * - tight: < 60min (risco real de perder o voo)
 * - long: > 240min (4h+ arrastada)
 * - overnight: pernoite forçado
 * - ok: faixa saudável (1h-4h)
 */
export function classifyLayover(lay: GLayover): LayoverClassification {
  const dur = typeof lay.duration === "number" ? lay.duration : 0;
  if (lay.overnight) {
    return {
      severity: "overnight",
      label: "Pernoite",
      hint: "Conexão dorme no aeroporto · planeje hotel ou day-use",
      textClass: "text-indigo-700 dark:text-indigo-300",
      bgClass: "bg-indigo-500/10",
      borderClass: "border-indigo-500/30",
    };
  }
  if (dur > 0 && dur < 60) {
    return {
      severity: "tight",
      label: "Conexão apertada",
      hint: "Menos de 1h · risco de perder voo se primeiro atrasar",
      textClass: "text-rose-700 dark:text-rose-300",
      bgClass: "bg-rose-500/10",
      borderClass: "border-rose-500/30",
    };
  }
  if (dur > 240) {
    return {
      severity: "long",
      label: "Conexão arrastada",
      hint: "Mais de 4h de espera · considere bagunçar o roteiro",
      textClass: "text-amber-700 dark:text-amber-300",
      bgClass: "bg-amber-500/10",
      borderClass: "border-amber-500/30",
    };
  }
  return {
    severity: "ok",
    label: "Conexão tranquila",
    hint: "Tempo confortável entre voos",
    textClass: "text-emerald-700 dark:text-emerald-300",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/30",
  };
}

/** Pior layover do itinerário (para badge no card) */
export function worstLayover(it: GFlightItinerary): LayoverClassification | null {
  const layovers = it.layovers ?? [];
  if (!layovers.length) return null;
  const ranked = layovers.map(classifyLayover);
  const order: Record<LayoverSeverity, number> = { overnight: 3, tight: 4, long: 2, ok: 0 };
  return ranked.sort((a, b) => order[b.severity] - order[a.severity])[0] ?? null;
}

/** Extrai hora de chegada local do último leg */
export function getArrHour(it: GFlightItinerary): number | null {
  const legs = it.flights ?? [];
  const t = legs[legs.length - 1]?.arrival_airport?.time;
  const p = parseDcDateTime(t);
  return p ? p.date.getHours() : null;
}

/** Extrai todos os IATA de aeroportos de conexão */
export function getConnectingAirportIds(it: GFlightItinerary): string[] {
  return (it.layovers ?? []).map(l => l.id).filter((x): x is string => !!x);
}

export function classifyPriceAgainstHistory(
  price: number | null | undefined,
  history?: GPriceHistory,
): "low" | "typical" | "high" | null {
  if (!history || price == null || !Number.isFinite(price)) return null;
  if (history.classification) return history.classification;

  function matchBand(bands?: GPriceBand[]): boolean {
    if (!bands?.length) return false;
    // operações esperadas: "<", "<=", ">", ">=", "between"
    if (bands.length === 1) {
      const b = bands[0];
      if (b.operation === "<" || b.operation === "<=") return price <= b.value;
      if (b.operation === ">" || b.operation === ">=") return price >= b.value;
    }
    if (bands.length >= 2) {
      const vals = bands.map(b => b.value).sort((a, z) => a - z);
      return price >= vals[0] && price <= vals[vals.length - 1];
    }
    return false;
  }

  if (matchBand(history.low)) return "low";
  if (matchBand(history.high)) return "high";
  if (matchBand(history.typical)) return "typical";
  // Fallback: comparar com summary.current
  if (history.current) {
    if (price < history.current * 0.85) return "low";
    if (price > history.current * 1.15) return "high";
    return "typical";
  }
  return null;
}
