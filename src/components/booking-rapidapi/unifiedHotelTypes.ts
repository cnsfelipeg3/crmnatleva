// Tipos e normalizadores para busca unificada de hotéis (Booking.com + Hotels.com)
// Cada fonte retorna formato diferente; aqui normalizamos pra um UnifiedHotel comum.

import type { BookingHotel } from "./types";

export type HotelSource = "booking" | "hotelscom";

export interface UnifiedHotel {
  source: HotelSource;
  /** ID original da fonte (número no Booking, string no Hotels.com) */
  id: string | number;
  /** ID composto único: "{source}:{id}" — pra usar como React key */
  uid: string;
  name: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  /** URL da foto principal em tamanho bom pra card */
  photoUrl?: string;
  /** Todas as fotos disponíveis */
  photoUrls?: string[];
  /** Estrelas da propriedade (1–5) */
  stars?: number;
  /** Nota de avaliação (0–10) */
  reviewScore?: number;
  /** Texto da nota ("Excepcional", "Wonderful", etc) */
  reviewScoreWord?: string;
  /** Quantidade de avaliações */
  reviewCount?: number;
  /** Preço total da estadia */
  priceTotal?: number;
  /** Moeda do preço (BRL, USD, etc) */
  priceCurrency?: string;
  /** Preço riscado (antes do desconto) */
  priceStriked?: number;
  /** Impostos/taxas adicionais */
  priceTaxes?: number;
  /** Preço por noite (alguns providers dão separado) */
  pricePerNight?: number;
  /** String formatada exata como a API retornou (fallback) */
  priceFormatted?: string;
  /** Cancelamento grátis (true/false) */
  freeCancellation?: boolean;
  /** Café da manhã incluso */
  breakfastIncluded?: boolean;
  /** Amenidades curtas pra badges (ex: ["pool", "wifi"]) */
  amenities?: string[];
  /** Link pra página do hotel no site original */
  externalUrl?: string;
  /** Dados brutos originais pra debug/detalhamento */
  raw?: unknown;
}

// ============================================================
// Normalizador BOOKING → UnifiedHotel
// ============================================================

export function normalizeBookingHotel(h: BookingHotel): UnifiedHotel {
  const priceValue = h.priceBreakdown?.grossPrice?.value;
  const priceCurrency = h.priceBreakdown?.grossPrice?.currency ?? "BRL";
  const striked = h.priceBreakdown?.strikethroughPrice?.value;
  const taxes = (h.priceBreakdown as any)?.excludedPrice?.value;

  return {
    source: "booking",
    id: h.hotel_id,
    uid: `booking:${h.hotel_id}`,
    name: h.name || "Hotel sem nome",
    location: h.wishlistName,
    latitude: h.latitude,
    longitude: h.longitude,
    photoUrl: h.main_photo_url || h.photoUrls?.[0],
    photoUrls: h.photoUrls,
    stars: h.accuratePropertyClass ?? h.class,
    reviewScore: h.reviewScore,
    reviewScoreWord: h.reviewScoreWord,
    reviewCount: h.reviewCount,
    priceTotal: priceValue,
    priceCurrency,
    priceStriked: striked && striked > (priceValue ?? 0) ? striked : undefined,
    priceTaxes: taxes,
    externalUrl: `https://www.booking.com/hotel.html?hotel_id=${h.hotel_id}`,
    raw: h,
  };
}

// ============================================================
// Tipos do Hotels.com (ntd119) — estrutura real da resposta
// ============================================================

export interface HotelscomLodgingCard {
  __typename?: string;
  id: string;
  propertyId?: string;
  headingSection?: {
    heading?: string;
    messages?: Array<{ text?: string }>;
    productRating?: number | string;
    amenities?: Array<{ icon?: { id?: string; description?: string }; text?: string }>;
  };
  priceSection?: {
    priceSummary?: {
      optionsV2?: Array<{
        formattedDisplayPrice?: string;
        displayPrice?: { formatted?: string };
        strikeOut?: { amount?: number; formatted?: string };
        accessibilityLabel?: string;
      }>;
      displayMessagesV2?: Array<{
        lineItems?: Array<{
          state?: string;
          value?: string;
          price?: { formatted?: string };
          role?: string;
        }>;
      }>;
      priceMessagingV2?: Array<{ value?: string }>;
      reassuranceMessage?: { value?: string };
    };
  };
  mediaSection?: {
    gallery?: {
      media?: Array<{
        id?: string;
        media?: { url?: string; description?: string };
      }>;
    };
  };
  summarySections?: Array<{
    guestRatingSectionV2?: {
      badge?: { text?: string; accessibility?: string };
      phrases?: Array<{
        phraseParts?: Array<{ text?: string; accessibility?: string }>;
      }>;
    };
    footerMessages?: {
      listItems?: Array<{ text?: string; style?: string }>;
    };
  }>;
  cardLink?: {
    resource?: { value?: string };
  };
  [key: string]: unknown;
}

// ============================================================
// Normalizador HOTELS.COM → UnifiedHotel
// ============================================================

/** Extrai número de uma string tipo "$249 total" ou "R$ 1.200" */
function extractNumber(str?: string): number | undefined {
  if (!str) return undefined;
  const m = str.replace(/\./g, "").match(/[\d,]+/);
  if (!m) return undefined;
  const n = parseFloat(m[0].replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

/** Detecta moeda a partir do símbolo no texto formatado */
function detectCurrency(str?: string): string {
  if (!str) return "USD";
  if (str.includes("R$")) return "BRL";
  if (str.includes("€")) return "EUR";
  if (str.includes("£")) return "GBP";
  if (str.includes("$")) return "USD";
  return "USD";
}

export function normalizeHotelscomHotel(
  card: HotelscomLodgingCard,
): UnifiedHotel {
  const heading = card.headingSection?.heading || "Hotel sem nome";
  const location = card.headingSection?.messages?.[0]?.text;

  // Preço principal
  const priceOptV2 = card.priceSection?.priceSummary?.optionsV2?.[0];
  const priceFormatted =
    priceOptV2?.formattedDisplayPrice ?? priceOptV2?.displayPrice?.formatted;
  const priceTotal = extractNumber(priceFormatted);
  const priceCurrency = detectCurrency(priceFormatted);
  const strikedFormatted = priceOptV2?.strikeOut?.formatted;
  const priceStriked =
    priceOptV2?.strikeOut?.amount ?? extractNumber(strikedFormatted);

  // Preço por noite (em displayMessagesV2)
  let pricePerNight: number | undefined;
  const firstMsg = card.priceSection?.priceSummary?.displayMessagesV2?.[0]
    ?.lineItems?.[0];
  if (firstMsg?.state === "REASSURANCE_DISPLAY_QUALIFIER") {
    pricePerNight = extractNumber(firstMsg.value);
  }

  // Fotos
  const mediaItems = card.mediaSection?.gallery?.media ?? [];
  const photoUrls = mediaItems
    .map((m) => m.media?.url)
    .filter((u): u is string => !!u);
  const photoUrl = photoUrls[0];

  // Rating
  const ratingBadge = card.summarySections?.[0]?.guestRatingSectionV2?.badge;
  const reviewScoreStr = ratingBadge?.text;
  const reviewScore = reviewScoreStr
    ? parseFloat(reviewScoreStr.replace(",", "."))
    : undefined;

  const phrases = card.summarySections?.[0]?.guestRatingSectionV2?.phrases;
  const reviewScoreWord = phrases?.[0]?.phraseParts?.[0]?.text;
  const reviewCountText = phrases?.[1]?.phraseParts?.[0]?.text;
  const reviewCount = reviewCountText
    ? extractNumber(reviewCountText)
    : undefined;

  // Estrelas: productRating pode vir como "4.0" ou similar
  const starsRaw = card.headingSection?.productRating;
  const stars =
    typeof starsRaw === "number"
      ? starsRaw
      : typeof starsRaw === "string"
        ? parseFloat(starsRaw)
        : undefined;

  // Cancelamento grátis
  const footer = card.summarySections?.[0]?.footerMessages?.listItems ?? [];
  const freeCancellation = footer.some(
    (l) =>
      typeof l.text === "string" &&
      /refund|cancel/i.test(l.text) &&
      l.style === "POSITIVE",
  );

  // Amenidades
  const amenities =
    card.headingSection?.amenities
      ?.map((a) => a.icon?.id || a.text)
      .filter((s): s is string => !!s) ?? [];

  // URL externa
  const externalUrl = card.cardLink?.resource?.value;

  return {
    source: "hotelscom",
    id: card.id,
    uid: `hotelscom:${card.id}`,
    name: heading,
    location,
    photoUrl,
    photoUrls,
    stars: Number.isFinite(stars as number) ? (stars as number) : undefined,
    reviewScore,
    reviewScoreWord,
    reviewCount,
    priceTotal,
    priceCurrency,
    priceStriked,
    pricePerNight,
    priceFormatted,
    freeCancellation,
    amenities,
    externalUrl,
    raw: card,
  };
}

// ============================================================
// Helpers agregados
// ============================================================

/** Dedupa hotéis que aparecem em ambas fontes (match por nome + localização) */
export function dedupHotels(hotels: UnifiedHotel[]): UnifiedHotel[] {
  const seen = new Map<string, UnifiedHotel>();
  for (const h of hotels) {
    const key = `${h.name.toLowerCase().trim()}|${(h.location || "")
      .toLowerCase()
      .trim()}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, h);
    } else {
      const newBetter =
        typeof h.priceTotal === "number" &&
        (!existing.priceTotal || h.priceTotal < existing.priceTotal);
      if (newBetter) {
        seen.set(key, { ...h, raw: { ...(h.raw as any), _duplicateOf: existing.uid } });
      }
    }
  }
  return Array.from(seen.values());
}

/** Label amigável da fonte pra mostrar em badge */
export const SOURCE_LABELS: Record<HotelSource, string> = {
  booking: "Booking.com",
  hotelscom: "Hotels.com",
};

/** Cor do badge por fonte (Tailwind classes) */
export const SOURCE_BADGE_CLASSES: Record<HotelSource, string> = {
  booking:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
  hotelscom:
    "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300",
};
