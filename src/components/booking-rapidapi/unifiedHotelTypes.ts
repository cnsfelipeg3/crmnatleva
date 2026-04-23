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

/**
 * Extrai número de uma string de preço.
 *
 * A API do Hotels.com (ntd119) retorna em formato AMERICANO:
 *   "$4,186"  → vírgula é separador de milhar, ponto é decimal
 *   "$249"    → sem separadores
 *   "$249.99" → ponto é decimal
 *
 * A API do Booking também retorna valores numéricos diretos, mas às vezes
 * em formato BR "R$ 1.234,56". Por isso tentamos detectar o formato.
 */
function extractNumber(str?: string): number | undefined {
  if (!str) return undefined;
  // Pega só dígitos, pontos e vírgulas
  const match = str.match(/[\d.,]+/);
  if (!match) return undefined;
  let cleaned = match[0];

  // Detecta formato: se tem TANTO vírgula quanto ponto, o que aparecer
  // primeiro é separador de milhar e o último é decimal
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  if (hasComma && hasDot) {
    // Formato misto: o ÚLTIMO símbolo antes do fim é o decimal
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    if (lastDot > lastComma) {
      // Formato US: "1,234.56" → remove vírgulas
      cleaned = cleaned.replace(/,/g, "");
    } else {
      // Formato BR: "1.234,56" → remove pontos, troca vírgula por ponto
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    }
  } else if (hasComma) {
    // Só vírgula — ambíguo. Heurística: se depois da vírgula tem 3+ dígitos,
    // é separador de milhar (formato US "1,234"). Se tem 1-2, é decimal BR.
    const afterComma = cleaned.split(",").pop() || "";
    if (afterComma.length >= 3) {
      cleaned = cleaned.replace(/,/g, ""); // milhar US
    } else {
      cleaned = cleaned.replace(",", "."); // decimal BR
    }
  }
  // Só ponto ou sem separador: parse direto

  const n = parseFloat(cleaned);
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

/**
 * Converte um preço pra BRL usando a taxa de câmbio fornecida.
 * Se já estiver em BRL ou rate indisponível, retorna o valor original.
 *
 * `rates` vem do useExchangeRates — formato { USD: X, EUR: Y, ... }
 * onde X é quantos BRL valem 1 unidade daquela moeda.
 */
export function convertPriceToBRL(
  value: number | undefined,
  from: string | undefined,
  rates: Record<string, number> | null | undefined,
): { value: number | undefined; currency: string; converted: boolean } {
  if (typeof value !== "number") {
    return { value, currency: from ?? "BRL", converted: false };
  }
  const fromCurrency = (from || "USD").toUpperCase();
  if (fromCurrency === "BRL") {
    return { value, currency: "BRL", converted: false };
  }
  if (!rates || !rates[fromCurrency]) {
    return { value, currency: fromCurrency, converted: false };
  }
  // rates[X] = quantos BRL valem 1 X, então valor_em_BRL = valor * rates[X]
  return {
    value: value * rates[fromCurrency],
    currency: "BRL",
    converted: true,
  };
}

/**
 * Aplica conversão a um UnifiedHotelOffer — retorna nova offer em BRL.
 */
export function convertOfferToBRL(
  offer: UnifiedHotelOffer,
  rates: Record<string, number> | null | undefined,
): UnifiedHotelOffer {
  if (!offer.priceCurrency || offer.priceCurrency === "BRL") return offer;
  const total = convertPriceToBRL(offer.priceTotal, offer.priceCurrency, rates);
  const striked = convertPriceToBRL(
    offer.priceStriked,
    offer.priceCurrency,
    rates,
  );
  const taxes = convertPriceToBRL(offer.priceTaxes, offer.priceCurrency, rates);
  const perNight = convertPriceToBRL(
    offer.pricePerNight,
    offer.priceCurrency,
    rates,
  );
  if (!total.converted) return offer;
  return {
    ...offer,
    priceTotal: total.value,
    priceCurrency: total.currency,
    priceStriked: striked.value,
    priceTaxes: taxes.value,
    pricePerNight: perNight.value,
    // Limpa o priceFormatted porque ele era formatado em USD pela API
    priceFormatted: undefined,
  };
}

// ============================================================
// AGRUPAMENTO TRIVAGO-STYLE
// 1 card por hotel, com múltiplas ofertas de fontes diferentes
// ============================================================

/** Uma oferta de preço pra o hotel vindo de uma fonte específica */
export interface UnifiedHotelOffer {
  source: HotelSource;
  /** ID na fonte original — usado pra abrir drawer/link */
  id: string | number;
  priceTotal?: number;
  priceCurrency?: string;
  priceStriked?: number;
  priceTaxes?: number;
  pricePerNight?: number;
  priceFormatted?: string;
  freeCancellation?: boolean;
  breakfastIncluded?: boolean;
  externalUrl?: string;
  /** Dados brutos pra abrir drawer ou detalhes */
  raw?: unknown;
}

/** Grupo Trivago: 1 hotel (mesclado), múltiplas ofertas */
export interface UnifiedHotelGroup {
  /** Key única pra React (baseada em nome+local normalizado) */
  groupKey: string;
  /** Dados comuns (primeira fonte que trouxe vence) */
  name: string;
  location?: string;
  photoUrl?: string;
  photoUrls?: string[];
  stars?: number;
  reviewScore?: number;
  reviewScoreWord?: string;
  reviewCount?: number;
  amenities?: string[];
  latitude?: number;
  longitude?: number;
  /** Todas as ofertas disponíveis (ordenadas pelo menor preço) */
  offers: UnifiedHotelOffer[];
  /** Melhor oferta (menor preço). Pode ser undefined se nenhuma tem priceTotal */
  bestOffer?: UnifiedHotelOffer;
  /** Diferença em % entre menor e maior preço (0 se só 1 oferta) */
  priceDeltaPercent: number;
  /** Economia absoluta vs maior preço (0 se só 1 oferta) */
  savings?: number;
  savingsCurrency?: string;
}

/**
 * Normaliza string pra matching entre fontes.
 * Remove acentos, lowercase, pontuação, stop-words comuns.
 */
function normalizeForMatch(str?: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .replace(/\b(hotel|hostel|resort|pousada|motel|apart|by|the|da|de|do|dos|das)\b/gi, "")
    .replace(/[^\w\s]/g, " ") // remove pontuação
    .replace(/\s+/g, " ")
    .trim();
}

/** Converte UnifiedHotel em UnifiedHotelOffer */
function toOffer(h: UnifiedHotel): UnifiedHotelOffer {
  return {
    source: h.source,
    id: h.id,
    priceTotal: h.priceTotal,
    priceCurrency: h.priceCurrency,
    priceStriked: h.priceStriked,
    priceTaxes: h.priceTaxes,
    pricePerNight: h.pricePerNight,
    priceFormatted: h.priceFormatted,
    freeCancellation: h.freeCancellation,
    breakfastIncluded: h.breakfastIncluded,
    externalUrl: h.externalUrl,
    raw: h.raw,
  };
}

/**
 * Agrupa hotéis das múltiplas fontes em cards Trivago-style.
 * Match por nome normalizado + proximidade de localização quando disponível.
 *
 * Trade-offs:
 * - Match é fuzzy (remove acentos/pontuação/stop-words) — pega a maioria mas pode errar em hotéis com nomes parecidos
 * - Hotéis que não fazem match aparecem como grupo com 1 oferta só (ainda renderiza bonito)
 */
export function groupHotelsByIdentity(
  hotels: UnifiedHotel[],
): UnifiedHotelGroup[] {
  // Fase 1: agrupar por nome normalizado
  const groups = new Map<string, UnifiedHotel[]>();
  for (const h of hotels) {
    const nameKey = normalizeForMatch(h.name);
    if (!nameKey) continue;
    const existing = groups.get(nameKey);
    if (existing) {
      existing.push(h);
    } else {
      groups.set(nameKey, [h]);
    }
  }

  // Fase 2: converter cada grupo em UnifiedHotelGroup
  const result: UnifiedHotelGroup[] = [];
  for (const [key, members] of groups) {
    // Dados comuns: pegar da primeira fonte (ou preferir Booking que geralmente tem mais dados)
    const primary =
      members.find((m) => m.source === "booking") ?? members[0];

    // Coletar todas as ofertas
    const offers = members.map(toOffer);
    // Ordenar por menor preço (undefined vai pro fim)
    offers.sort((a, b) => {
      const pa = a.priceTotal;
      const pb = b.priceTotal;
      if (typeof pa !== "number" && typeof pb !== "number") return 0;
      if (typeof pa !== "number") return 1;
      if (typeof pb !== "number") return -1;
      return pa - pb;
    });

    const bestOffer = offers.find((o) => typeof o.priceTotal === "number");
    const worstOffer = [...offers]
      .reverse()
      .find((o) => typeof o.priceTotal === "number");

    let priceDeltaPercent = 0;
    let savings: number | undefined;
    if (
      bestOffer &&
      worstOffer &&
      bestOffer !== worstOffer &&
      typeof bestOffer.priceTotal === "number" &&
      typeof worstOffer.priceTotal === "number" &&
      worstOffer.priceTotal > 0
    ) {
      savings = worstOffer.priceTotal - bestOffer.priceTotal;
      priceDeltaPercent = Math.round(
        (savings / worstOffer.priceTotal) * 100,
      );
    }

    // Merge de fotos: todas as fotos de todas as fontes (dedupadas por URL)
    const allPhotos = new Set<string>();
    for (const m of members) {
      m.photoUrls?.forEach((p) => p && allPhotos.add(p));
    }

    // Merge de amenidades
    const allAmenities = new Set<string>();
    for (const m of members) {
      m.amenities?.forEach((a) => a && allAmenities.add(a));
    }

    result.push({
      groupKey: key,
      name: primary.name,
      location: primary.location,
      photoUrl: primary.photoUrl ?? Array.from(allPhotos)[0],
      photoUrls: Array.from(allPhotos),
      stars: primary.stars,
      reviewScore: primary.reviewScore,
      reviewScoreWord: primary.reviewScoreWord,
      reviewCount: primary.reviewCount,
      amenities: Array.from(allAmenities),
      latitude: primary.latitude,
      longitude: primary.longitude,
      offers,
      bestOffer,
      priceDeltaPercent,
      savings,
      savingsCurrency: bestOffer?.priceCurrency,
    });
  }

  // Ordenar grupos por menor preço disponível (grupos sem preço vão pro fim)
  result.sort((a, b) => {
    const pa = a.bestOffer?.priceTotal;
    const pb = b.bestOffer?.priceTotal;
    if (typeof pa !== "number" && typeof pb !== "number") return 0;
    if (typeof pa !== "number") return 1;
    if (typeof pb !== "number") return -1;
    return pa - pb;
  });

  return result;
}

/** Mantém compatibilidade com código antigo que chamava dedupHotels */
export function dedupHotels(hotels: UnifiedHotel[]): UnifiedHotel[] {
  const seen = new Map<string, UnifiedHotel>();
  for (const h of hotels) {
    const key = `${normalizeForMatch(h.name)}|${(h.location || "").toLowerCase().trim()}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, h);
    } else {
      const newBetter =
        typeof h.priceTotal === "number" &&
        (!existing.priceTotal || h.priceTotal < existing.priceTotal);
      if (newBetter) {
        seen.set(key, h);
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
