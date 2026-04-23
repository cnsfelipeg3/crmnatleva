// Tipos e utilitários específicos para o módulo Busca Voos BETA
// Baseados na estrutura real retornada pela API Booking COM15 (RapidAPI).

export type CabinClass = "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";

export type FlightSort =
  | "BEST"
  | "CHEAPEST"
  | "FASTEST"
  | "EARLIEST_DEPARTURE"
  | "LATEST_DEPARTURE";

export interface FlightLocation {
  id: string; // "GRU.AIRPORT" | "SAO.CITY"
  type: "AIRPORT" | "CITY";
  code: string; // "GRU" | "SAO"
  name: string;
  city?: string;
  cityName?: string;
  country?: string;
  countryName?: string;
  regionName?: string;
  photoUri?: string;
  distanceToCity?: { value: number; unit: string };
  parent?: string;
}

/** Preço da API: units + nanos (1 nano = 10^-9). Converter com moneyToNumber() */
export interface MoneyAmount {
  currencyCode: string;
  units: number;
  nanos: number;
}

export interface FlightAirport {
  type: string;
  code: string;
  name: string;
  city?: string;
  cityName?: string;
  country?: string;
  countryName?: string;
  province?: string;
  provinceCode?: string;
}

export interface CarrierData {
  name: string;
  code: string;
  logo?: string;
}

export interface FlightLeg {
  departureTime: string;
  arrivalTime: string;
  departureAirport: FlightAirport;
  arrivalAirport: FlightAirport;
  cabinClass: string;
  flightInfo?: {
    facilities?: unknown[];
    flightNumber?: number;
    planeType?: string;
    carrierInfo?: {
      operatingCarrier?: string;
      marketingCarrier?: string;
      operatingCarrierDisclosureText?: string;
    };
  };
  carriers?: string[];
  carriersData?: CarrierData[];
  totalTime?: number; // segundos
  flightStops?: unknown[];
  amenities?: unknown[];
  departureTimeTz?: string;
  arrivalTimeTz?: string;
}

export interface LuggageAllowance {
  luggageType?: string;
  maxPiece?: number;
  maxWeightPerPiece?: number;
  massUnit?: string;
  sizeRestrictions?: {
    maxLength?: number;
    maxWidth?: number;
    maxHeight?: number;
    sizeUnit?: string;
  };
  ruleType?: string;
  ruleString?: string;
}

export interface FlightSegment {
  departureAirport: FlightAirport;
  arrivalAirport: FlightAirport;
  departureTime: string;
  arrivalTime: string;
  departureTimeTz?: string;
  arrivalTimeTz?: string;
  legs: FlightLeg[];
  totalTime?: number;
  travellerCheckedLuggage?: Array<{
    travellerReference?: string;
    luggageAllowance?: LuggageAllowance;
  }>;
  travellerCabinLuggage?: Array<{
    travellerReference?: string;
    luggageAllowance?: LuggageAllowance;
    personalItem?: boolean;
  }>;
  isAtolProtected?: boolean;
}

export interface BrandedFareFeature {
  featureName?: string;
  category?: string;
  code?: string;
  label?: string;
  availability?: "INCLUDED" | "NOT_INCLUDED" | "PAID";
  priority?: number;
  content?: Record<string, unknown>;
  sectionCategory?: {
    groupingKey?: string;
    heading?: string;
    priority?: number;
  };
}

export interface BrandedFareInfo {
  fareName?: string;
  cabinClass?: string;
  features?: BrandedFareFeature[];
  fareAttributes?: unknown[];
  nonIncludedFeaturesRequirePayment?: unknown;
}

export interface FlightPriceBreakdown {
  total?: MoneyAmount;
  baseFare?: MoneyAmount;
  fee?: MoneyAmount;
  tax?: MoneyAmount;
  totalRounded?: MoneyAmount;
  discount?: MoneyAmount;
  totalWithoutDiscount?: MoneyAmount;
  totalWithoutDiscountRounded?: MoneyAmount;
  bcomMargin?: MoneyAmount;
  bcomPricingItems?: Array<{
    amount?: MoneyAmount;
    itemType?: string;
    name?: string;
  }>;
  carrierTaxBreakdown?: Array<{
    carrier?: CarrierData;
    avgPerAdult?: { base?: MoneyAmount; tax?: MoneyAmount };
  }>;
}

export interface FlightOffer {
  token: string;
  segments: FlightSegment[];
  priceBreakdown?: FlightPriceBreakdown;
  travellerPrices?: Array<{
    travellerReference?: string;
    travellerPriceBreakdown?: FlightPriceBreakdown;
  }>;
  tripType?: string;
  brandedFareInfo?: BrandedFareInfo;
  includedProducts?: {
    areAllSegmentsIdentical?: boolean;
    segments?: LuggageAllowance[][];
  };
  includedProductsBySegment?: unknown[][];
  pointOfSale?: string;
  posMismatch?: string;
  extraProducts?: unknown[];
  ancillaries?: unknown;
  appliedDiscounts?: unknown;
  offerKeyToHighlight?: string;
  flightKey?: string;
  requestableBrandedFares?: unknown[];
}

export interface FlightDeal {
  key: "BEST" | "CHEAPEST" | "FASTEST" | string;
  offerToken?: string;
  price?: MoneyAmount;
}

export interface SearchFlightsResult {
  offers: FlightOffer[];
  deals: FlightDeal[];
  aggregation?: Record<string, unknown>;
  searchId?: string;
  cache_hit: boolean;
  totalCount: number | null;
  filteredTotalCount: number | null;
  pageSize: number;
}

// ------------------------------------------------------------
// Utilitários
// ------------------------------------------------------------

/**
 * Converte o formato { currencyCode, units, nanos } em número decimal.
 * Ex: { units: 3928, nanos: 90000000 } → 3928.09
 */
export function moneyToNumber(m?: MoneyAmount | null): number | null {
  if (!m || typeof m.units !== "number") return null;
  const nanos = typeof m.nanos === "number" ? m.nanos : 0;
  return m.units + nanos / 1_000_000_000;
}

export function formatMoney(m?: MoneyAmount | null, locale = "pt-BR"): string {
  const n = moneyToNumber(m);
  if (n === null) return "—";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: m!.currencyCode || "BRL",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${m!.currencyCode || ""} ${n.toFixed(2)}`;
  }
}

/** Formata duração em segundos como "10h 35min" */
export function formatDuration(seconds?: number): string {
  if (typeof seconds !== "number" || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/** Formata ISO timestamp como "HH:MM" */
export function formatTime(iso?: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

/** Formata ISO timestamp como "dd/MM" */
export function formatDateShort(iso?: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** Dias de diferença entre dois timestamps (pra indicar chegada em outro dia) */
export function dayDiff(fromIso?: string, toIso?: string): number {
  if (!fromIso || !toIso) return 0;
  try {
    const a = new Date(fromIso);
    const b = new Date(toIso);
    const diffMs = b.setHours(0, 0, 0, 0) - a.setHours(0, 0, 0, 0);
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

/** Traduz cabinClass pra pt-BR */
export function cabinClassLabel(c?: string): string {
  switch (c) {
    case "ECONOMY":
      return "Econômica";
    case "PREMIUM_ECONOMY":
      return "Econômica Premium";
    case "BUSINESS":
      return "Executiva";
    case "FIRST":
      return "Primeira Classe";
    default:
      return c ?? "";
  }
}

/** Categoria de features pra agrupar no UI */
export const FEATURE_CATEGORY_LABELS: Record<string, string> = {
  BAGGAGE: "Bagagem",
  CABIN: "Cabine",
  SEAT: "Assento",
  CANCELLATION: "Cancelamento",
  CHANGE: "Alteração",
  MEAL: "Refeição",
  ENTERTAINMENT: "Entretenimento",
  PRIORITY: "Prioridade",
  MILES: "Milhas",
  REFUND: "Reembolso",
};
