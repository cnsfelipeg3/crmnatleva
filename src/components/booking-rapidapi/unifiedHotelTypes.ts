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
  /** Selo de desconto formatado (ex: "$67 off") */
  discountBadge?: string;
  /** Legendas das fotos (mesma ordem de photoUrls) */
  photoCaptions?: string[];
  /** Selos de promoção (ex: "Promoção pública", "Cancelamento grátis") */
  promoBadges?: string[];
  /** Frase pronta de preço (ex: "Price was $252, price is now $185 for 3 nights") */
  accessibilityPriceLabel?: string;
  /** Bairro / região extraída da URL */
  neighborhood?: string;
  /** Tema do badge de nota (positive/neutral/negative) — pra cor */
  ratingTheme?: string;
  /** ID composto do Hotels.com ("regionId_propertyId") usado nos endpoints de detalhe */
  propertyIdComposite?: string;
  /** True quando o preço é tarifa de membro/loyalty (pode diferir do preço público no site) */
  isMemberPrice?: boolean;
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
  featuredHeader?: { text?: string } | null;
  callOut?: { text?: string } | null;
  headingSection?: {
    heading?: string;
    messages?: Array<{ text?: string }>;
    productRating?: number | string;
    amenities?: Array<{ icon?: { id?: string; description?: string }; text?: string }>;
  };
  priceSection?: {
    badge?: { text?: string; theme?: string };
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
      badge?: { text?: string; accessibility?: string; theme?: string };
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
  analyticsEvents?: Array<{
    attribute?: { name?: string; content?: string };
  }>;
  [key: string]: unknown;
}

/** Traduz captions comuns de fotos do Hotels.com pt-BR */
function translatePhotoCaption(en?: string): string | undefined {
  if (!en) return undefined;
  const map: Array<[RegExp, string]> = [
    [/\breception\b/i, "Recepção"],
    [/\blobby\b/i, "Lobby"],
    [/\bexterior\b/i, "Exterior"],
    [/\bfacade\b/i, "Fachada"],
    [/\bpool\b/i, "Piscina"],
    [/\bgym\b|\bfitness\b/i, "Academia"],
    [/\bbar\b/i, "Bar"],
    [/\brestaurant\b/i, "Restaurante"],
    [/\bsuite\b/i, "Suíte"],
    [/\bbedroom\b/i, "Quarto"],
    [/\bbathroom\b/i, "Banheiro"],
    [/\bbeach\b/i, "Praia"],
    [/\bview\b/i, "Vista"],
    [/\bspa\b/i, "Spa"],
    [/\bbreakfast\b/i, "Café da manhã"],
    [/\bterrace\b|\bbalcony\b/i, "Terraço"],
    [/\blounge\b/i, "Lounge"],
  ];
  // Pega só a primeira parte antes de "."
  const first = en.split(".")[0].trim();
  for (const [re, pt] of map) {
    if (re.test(first)) return pt;
  }
  return first;
}

/** Extrai lat/long do parâmetro `latLong=lat,long` da URL do Hotels.com */
function extractLatLongFromUrl(url?: string): { lat?: number; lng?: number } {
  if (!url) return {};
  const m = url.match(/latLong=(-?\d+\.?\d*)[,%]+(-?\d+\.?\d*)/);
  if (!m) return {};
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  return {
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
  };
}

/** Extrai bairro do parâmetro `destination=` da URL do Hotels.com */
function extractNeighborhoodFromUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const m = url.match(/destination=([^&]+)/);
  if (!m) return undefined;
  try {
    const decoded = decodeURIComponent(m[1].replace(/\+/g, " "));
    return decoded.split(",")[0]?.trim() || undefined;
  } catch {
    return undefined;
  }
}

/** Extrai badges promocionais do bloco analyticsEvents.product_list */
function extractPromoBadges(card: HotelscomLodgingCard): string[] {
  const badges: string[] = [];
  const productListEvent = card.analyticsEvents?.find(
    (e) => e.attribute?.name === "product_list",
  );
  if (!productListEvent?.attribute?.content) return badges;
  try {
    const parsed = JSON.parse(productListEvent.attribute.content);
    const item = Array.isArray(parsed) ? parsed[0] : parsed;
    const rawBadges: string[] = item?.lodging_product?.badges ?? [];
    for (const b of rawBadges) {
      if (/Public_Promo/i.test(b)) badges.push("Promoção pública");
      else if (/Member/i.test(b)) badges.push("Oferta para membros");
      else if (/VIP/i.test(b)) badges.push("VIP");
      else badges.push(b.replace(/_/g, " "));
    }
    if (item?.free_cancellation_bool === true) badges.push("Cancelamento grátis");
    if (item?.earn_eligible_bool === true) badges.push("Elegível a pontos");
  } catch {
    /* ignore */
  }
  return badges;
}

// ============================================================
// Normalizador HOTELS.COM → UnifiedHotel
// ============================================================

/**
 * Extrai número de uma string formatada em moeda.
 * Suporta locale BR ("R$ 1.684,50") e EN-US ("$1,684.50" ou "$1,167").
 * A heurística: se a string contém o símbolo "R$", trata como BR (vírgula = decimal,
 * ponto = milhar). Caso contrário, trata como EN-US (vírgula = milhar, ponto = decimal).
 */
function extractNumber(str?: string): number | undefined {
  if (!str) return undefined;
  // captura apenas dígitos, vírgulas e pontos do primeiro número
  const m = str.match(/[\d.,]+/);
  if (!m) return undefined;
  let raw = m[0];

  const isBRL = /R\$/i.test(str);
  if (isBRL) {
    // BR: remove pontos (milhar) e troca vírgula por ponto (decimal)
    raw = raw.replace(/\./g, "").replace(",", ".");
  } else {
    // EN-US: remove vírgulas (milhar). Ponto já é decimal.
    raw = raw.replace(/,/g, "");
  }

  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** Detecta moeda a partir do símbolo no texto formatado */
function detectCurrency(str?: string): string {
  if (!str) return "USD";
  if (/R\$/i.test(str)) return "BRL";
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

  // Preço principal — formattedDisplayPrice é geralmente o TOTAL da estadia
  // (confirmado pelo accessibilityLabel "for N nights"). A API ntd119 retorna
  // valores em USD por padrão e os preços costumam ser tarifas promocionais
  // ("Member Price") que diferem do site público. Por isso exibimos per-night
  // calculado também, pra o vendedor sanity-check.
  const priceOptV2 = card.priceSection?.priceSummary?.optionsV2?.[0];
  const priceFormatted =
    priceOptV2?.formattedDisplayPrice ?? priceOptV2?.displayPrice?.formatted;
  const priceTotal = extractNumber(priceFormatted);
  const priceCurrency = detectCurrency(priceFormatted);
  const strikedFormatted = priceOptV2?.strikeOut?.formatted;
  const priceStriked =
    priceOptV2?.strikeOut?.amount ?? extractNumber(strikedFormatted);

  // Preço por noite (procura em todos os displayMessagesV2)
  let pricePerNight: number | undefined;
  const dmList = card.priceSection?.priceSummary?.displayMessagesV2 ?? [];
  for (const dm of dmList) {
    for (const li of dm?.lineItems ?? []) {
      if (
        li?.state === "REASSURANCE_DISPLAY_QUALIFIER" &&
        typeof li.value === "string" &&
        /night/i.test(li.value)
      ) {
        pricePerNight = extractNumber(li.value);
        break;
      }
    }
    if (pricePerNight) break;
  }

  // Detecta se é tarifa de membro/promocional (badge "Member Price")
  const badgeText = card.priceSection?.badge?.text ?? "";
  const isMemberPrice = /member|loyalty|signed.in/i.test(badgeText);

  // Fotos + legendas
  const mediaItems = card.mediaSection?.gallery?.media ?? [];
  const photoUrls = mediaItems
    .map((m) => m.media?.url)
    .filter((u): u is string => !!u);
  const photoUrl = photoUrls[0];
  const photoCaptions = mediaItems
    .map((m) => translatePhotoCaption(m.media?.description))
    .filter((c): c is string => !!c);

  // Rating
  const ratingBadge = card.summarySections?.[0]?.guestRatingSectionV2?.badge;
  const reviewScoreStr = ratingBadge?.text;
  const reviewScore = reviewScoreStr
    ? parseFloat(reviewScoreStr.replace(",", "."))
    : undefined;
  const ratingTheme = ratingBadge?.theme;

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

  // Selo de desconto, frase de preço, lat/long, bairro, badges promo
  const discountBadge = card.priceSection?.badge?.text;
  const accessibilityPriceLabel = priceOptV2?.accessibilityLabel;
  const { lat, lng } = extractLatLongFromUrl(externalUrl);
  const neighborhood = extractNeighborhoodFromUrl(externalUrl);
  const promoBadges = extractPromoBadges(card);

  return {
    source: "hotelscom",
    id: card.id,
    uid: `hotelscom:${card.id}`,
    name: heading,
    location,
    latitude: lat,
    longitude: lng,
    photoUrl,
    photoUrls,
    photoCaptions,
    stars: Number.isFinite(stars as number) ? (stars as number) : undefined,
    reviewScore,
    reviewScoreWord,
    reviewCount,
    ratingTheme,
    priceTotal,
    priceCurrency,
    priceStriked,
    pricePerNight,
    priceFormatted,
    freeCancellation,
    amenities,
    externalUrl,
    discountBadge,
    accessibilityPriceLabel,
    promoBadges: promoBadges.length > 0 ? promoBadges : undefined,
    neighborhood,
    propertyIdComposite: card.propertyId,
    isMemberPrice,
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
    priceFormatted: undefined,
  };
}

// ============================================================
// AGRUPAMENTO TRIVAGO-STYLE
// ============================================================

/** Uma oferta de preço pra o hotel vindo de uma fonte específica */
export interface UnifiedHotelOffer {
  source: HotelSource;
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
  discountBadge?: string;
  promoBadges?: string[];
  accessibilityPriceLabel?: string;
  /** ID composto do Hotels.com ("regionId_propertyId") — usado pra buscar detalhes ricos */
  propertyIdComposite?: string;
  /** True quando o preço é tarifa de membro/loyalty (não bate com o preço público) */
  isMemberPrice?: boolean;
  raw?: unknown;
}

/** Grupo Trivago: 1 hotel (mesclado), múltiplas ofertas */
export interface UnifiedHotelGroup {
  groupKey: string;
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
  hasBooking: boolean;
  hasHotelscom: boolean;
  offers: UnifiedHotelOffer[];
  bestOffer?: UnifiedHotelOffer;
  priceDeltaPercent: number;
  savings?: number;
  savingsCurrency?: string;
}

function compareReviewStrength(a?: UnifiedHotel, b?: UnifiedHotel): number {
  const aCount = a?.reviewCount ?? -1;
  const bCount = b?.reviewCount ?? -1;
  if (aCount !== bCount) return bCount - aCount;

  const aScore = a?.reviewScore ?? -1;
  const bScore = b?.reviewScore ?? -1;
  if (aScore !== bScore) return bScore - aScore;

  return 0;
}

function normalizeForMatch(str?: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    // remove ruído comum de nomes de hotéis pra aumentar match cross-OTA
    .replace(
      /\b(hotel|hostel|resort|pousada|motel|apart|aparthotel|inn|suites?|suite|residence|residences|spa|boutique|by|the|and|y|e|of|le|la|el|al|de|da|do|des|das|dos|du)\b/gi,
      "",
    )
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tokens significativos do nome (>=3 chars, sem ruído) pra fuzzy match */
function tokensFromName(str?: string): Set<string> {
  const norm = normalizeForMatch(str);
  if (!norm) return new Set();
  return new Set(norm.split(" ").filter((t) => t.length >= 3));
}

/** Distância em km entre 2 coords (haversine simplificado) */
function geoDistanceKm(
  lat1?: number,
  lon1?: number,
  lat2?: number,
  lon2?: number,
): number | undefined {
  if (
    typeof lat1 !== "number" ||
    typeof lon1 !== "number" ||
    typeof lat2 !== "number" ||
    typeof lon2 !== "number"
  )
    return undefined;
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Score 0–1 de similaridade entre 2 hotéis (nome + geo) */
function similarityScore(a: UnifiedHotel, b: UnifiedHotel): number {
  const ta = tokensFromName(a.name);
  const tb = tokensFromName(b.name);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const jaccard = inter / (ta.size + tb.size - inter);

  const dist = geoDistanceKm(a.latitude, a.longitude, b.latitude, b.longitude);
  // Geo boost: se < 80m → mesma propriedade praticamente certa
  if (typeof dist === "number") {
    if (dist < 0.08 && jaccard >= 0.34) return 1; // praticamente colado + algum nome match
    if (dist < 0.25 && jaccard >= 0.5) return 0.95;
    if (dist > 1.5) return Math.min(jaccard, 0.4); // longe → não é o mesmo
  }
  return jaccard;
}

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
    discountBadge: h.discountBadge,
    promoBadges: h.promoBadges,
    accessibilityPriceLabel: h.accessibilityPriceLabel,
    propertyIdComposite: h.propertyIdComposite,
    isMemberPrice: h.isMemberPrice,
    raw: h.raw,
  };
}

export function groupHotelsByIdentity(
  hotels: UnifiedHotel[],
): UnifiedHotelGroup[] {
  // ---------- ETAPA 1: bucketização por chave normalizada ----------
  // Hotéis com mesma chave de nome são agrupados direto.
  // Depois, fazemos um 2º passe fuzzy entre buckets pra unificar
  // os que escaparam (ex.: "Ritz Carlton" vs "The Ritz-Carlton, Maceió").
  const buckets = new Map<string, UnifiedHotel[]>();
  for (const h of hotels) {
    const nameKey = normalizeForMatch(h.name);
    if (!nameKey) continue;
    const existing = buckets.get(nameKey);
    if (existing) existing.push(h);
    else buckets.set(nameKey, [h]);
  }

  // ---------- ETAPA 2: merge fuzzy (nome + geo) entre buckets ----------
  type Cluster = { key: string; members: UnifiedHotel[]; centroid: UnifiedHotel };
  const clusters: Cluster[] = [];
  for (const [key, members] of buckets) {
    // Centroide = primeiro Booking se houver, senão primeiro
    const centroid =
      members.find((m) => m.source === "booking") ?? members[0];

    // Tenta encaixar em cluster existente
    let merged = false;
    for (const c of clusters) {
      const score = similarityScore(centroid, c.centroid);
      if (score >= 0.85) {
        c.members.push(...members);
        merged = true;
        break;
      }
    }
    if (!merged) clusters.push({ key, members: [...members], centroid });
  }

  const result: UnifiedHotelGroup[] = [];
  for (const { key, members } of clusters) {
    const primary =
      members.find((m) => m.source === "booking") ?? members[0];
    const reviewRepresentative = [...members].sort(compareReviewStrength)[0] ?? primary;
    const hasBooking = members.some((m) => m.source === "booking");
    const hasHotelscom = members.some((m) => m.source === "hotelscom");

    const offers = members.map(toOffer);
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

    const allPhotos = new Set<string>();
    for (const m of members) {
      m.photoUrls?.forEach((p) => p && allPhotos.add(p));
    }

    const allAmenities = new Set<string>();
    for (const m of members) {
      m.amenities?.forEach((a) => a && allAmenities.add(a));
    }

    result.push({
      groupKey: key,
      name: primary.name,
      location: primary.location ?? reviewRepresentative.location,
      photoUrl: primary.photoUrl ?? reviewRepresentative.photoUrl ?? Array.from(allPhotos)[0],
      photoUrls: Array.from(allPhotos),
      stars: primary.stars,
      reviewScore: reviewRepresentative.reviewScore,
      reviewScoreWord: reviewRepresentative.reviewScoreWord,
      reviewCount: reviewRepresentative.reviewCount,
      amenities: Array.from(allAmenities),
      latitude: primary.latitude ?? reviewRepresentative.latitude,
      longitude: primary.longitude ?? reviewRepresentative.longitude,
      hasBooking,
      hasHotelscom,
      offers,
      bestOffer,
      priceDeltaPercent,
      savings,
      savingsCurrency: bestOffer?.priceCurrency,
    });
  }

  result.sort((a, b) => {
    const aBucket = a.hasBooking && a.hasHotelscom ? 0 : a.hasBooking ? 1 : 2;
    const bBucket = b.hasBooking && b.hasHotelscom ? 0 : b.hasBooking ? 1 : 2;
    if (aBucket !== bBucket) return aBucket - bBucket;

    const reviewCountDiff = (b.reviewCount ?? -1) - (a.reviewCount ?? -1);
    if (reviewCountDiff !== 0) return reviewCountDiff;

    const reviewScoreDiff = (b.reviewScore ?? -1) - (a.reviewScore ?? -1);
    if (reviewScoreDiff !== 0) return reviewScoreDiff;

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
