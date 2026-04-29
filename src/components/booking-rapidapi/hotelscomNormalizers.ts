// Normalizadores específicos pra cada endpoint de detalhes do Hotels.com.
// Cada endpoint do RapidAPI ntd119 retorna formato GraphQL bem diferente,
// então isolamos a lógica de extração aqui pra manter o drawer enxuto.

// ============================================================
// GALERIA: data.categorizedImages[].images[]
// ============================================================

export interface HotelscomPhoto {
  url: string;
  thumbUrl?: string;
  caption?: string;
  category?: string;
}

export function extractGallery(gallery: any): {
  photos: HotelscomPhoto[];
  categories: Array<{ id: string; name: string; count: number }>;
} {
  if (!gallery?.categorizedImages) return { photos: [], categories: [] };
  const cats = Array.isArray(gallery.categorizedImages)
    ? gallery.categorizedImages
    : [];
  const photos: HotelscomPhoto[] = [];
  const seen = new Set<string>();
  const categories: Array<{ id: string; name: string; count: number }> = [];

  for (const cat of cats) {
    const catId: string = cat?.categoryId ?? "all";
    const catName: string = cat?.categoryName ?? "Fotos";
    const imgs: any[] = Array.isArray(cat?.images) ? cat.images : [];
    if (catId !== "all") {
      categories.push({ id: catId, name: catName, count: imgs.length });
    }
    for (const im of imgs) {
      const url = im?.image?.url;
      if (!url || seen.has(url)) continue;
      seen.add(url);
      photos.push({
        url,
        thumbUrl: im?.lowResImage?.url ?? url,
        caption: im?.image?.description ?? im?.description,
        category: catId === "all" ? undefined : catId,
      });
    }
  }
  return { photos, categories };
}

// ============================================================
// QUARTOS: data.categorizedListings[].primarySelections[].propertyUnit
// ============================================================

export interface HotelscomRoomImage {
  url: string;
  caption?: string;
}

export interface HotelscomRoomFeature {
  text: string;
  iconId?: string;
  positive?: boolean;
}

export interface HotelscomRoomRate {
  /** Preço total formatado (ex: "$156 total") */
  totalFormatted?: string;
  /** Valor numérico do preço total */
  totalValue?: number;
  /** Preço por noite formatado (ex: "$47 nightly") */
  perNightFormatted?: string;
  perNightValue?: number;
  /** Preço riscado (ex: "$174") */
  strikeFormatted?: string;
  strikeValue?: number;
  currency?: string;
  /** "PAY_LATER" | "PAY_NOW" | "PAY_LATER_WITH_DEPOSIT" */
  paymentModel?: string;
  paymentLabel?: string;
  /** Mensagem tipo "Pay the property directly..." */
  paymentDescription?: string;
  /** "We have 5 left" */
  scarcityMessage?: string;
  cancellationLabel?: string;
  /** "$17 off" */
  dealBadge?: string;
  /** Texto sob o preço total: "Total with taxes and fees" */
  taxesLabel?: string;
}

export interface HotelscomRoom {
  id: string;
  name: string;
  features: HotelscomRoomFeature[];
  amenities: string[];
  images: HotelscomRoomImage[];
  rates: HotelscomRoomRate[];
  /** Avaliação específica do quarto, se houver */
  reviewScore?: string;
  reviewLabel?: string;
}

function extractDisplayPrice(displayMessages: any[]): {
  total?: string;
  perNight?: string;
  strike?: string;
  taxes?: string;
} {
  const out: ReturnType<typeof extractDisplayPrice> = {};
  if (!Array.isArray(displayMessages)) return out;
  for (const dm of displayMessages) {
    for (const li of dm?.lineItems ?? []) {
      const t = li?.__typename;
      if (t === "DisplayPrice") {
        const formatted = li?.price?.formatted;
        if (li?.role === "LEAD") out.total = formatted;
        else if (li?.role === "STRIKEOUT") out.strike = formatted;
      } else if (t === "LodgingEnrichedMessage") {
        if (li?.state === "REASSURANCE_DISPLAY_QUALIFIER")
          out.perNight = li.value;
        else if (li?.state?.includes("TAX_AND_FEE")) out.taxes = li.value;
      }
    }
  }
  return out;
}

function parsePriceNumber(formatted?: string): {
  value?: number;
  currency?: string;
} {
  if (!formatted) return {};
  const m = formatted.match(/[\d.,]+/);
  if (!m) return {};
  let raw = m[0];
  const isBRL = /R\$/i.test(formatted);
  if (isBRL) raw = raw.replace(/\./g, "").replace(",", ".");
  else raw = raw.replace(/,/g, "");
  const v = parseFloat(raw);
  let currency = "USD";
  if (/R\$/i.test(formatted)) currency = "BRL";
  else if (formatted.includes("€")) currency = "EUR";
  else if (formatted.includes("£")) currency = "GBP";
  return { value: Number.isFinite(v) ? v : undefined, currency };
}

function paymentLabelFromModel(model?: string): string | undefined {
  if (!model) return undefined;
  if (/PAY_LATER_WITH_DEPOSIT/i.test(model)) return "Reserva com depósito";
  if (/PAY_LATER/i.test(model)) return "Pague no hotel";
  if (/PAY_NOW/i.test(model)) return "Pagamento imediato";
  return undefined;
}

function extractCancellationLabel(cp: any): string | undefined {
  if (!cp) return undefined;
  // free cancellation message frequently nested
  const text =
    cp?.headerMessage ??
    cp?.shortDescription?.value ??
    cp?.text ??
    cp?.description;
  if (typeof text === "string") return text;
  return undefined;
}

export function extractRooms(offers: any): HotelscomRoom[] {
  const list: any[] = Array.isArray(offers?.categorizedListings)
    ? offers.categorizedListings
    : [];
  const out: HotelscomRoom[] = [];

  for (const cl of list) {
    const ps0 = cl?.primarySelections?.[0];
    const propertyUnit = ps0?.propertyUnit;
    if (!propertyUnit) continue;

    const id: string = String(propertyUnit?.id ?? cl?.unitId ?? "");
    const name: string =
      propertyUnit?.header?.text ?? cl?.header?.text ?? "Quarto";

    const features: HotelscomRoomFeature[] = [];
    for (const f of cl?.features ?? []) {
      if (typeof f?.text !== "string") continue;
      features.push({
        text: f.text,
        iconId: f?.icon?.id ?? f?.graphic?.id,
        positive: f?.theme === "POSITIVE",
      });
    }

    const images: HotelscomRoomImage[] = [];
    const seenImg = new Set<string>();
    for (const g of propertyUnit?.unitGallery?.gallery ?? []) {
      const url = g?.image?.url;
      if (!url || seenImg.has(url)) continue;
      seenImg.add(url);
      images.push({ url, caption: g?.image?.description });
    }

    // Amenities do quarto (estrutura aninhada)
    const amenities: string[] = [];
    const amBody = propertyUnit?.roomAmenities?.bodySubSections ?? [];
    for (const sub of amBody) {
      for (const c of sub?.contents ?? []) {
        for (const it of c?.items ?? []) {
          for (const ic of it?.contents ?? []) {
            const v = ic?.primary?.value;
            if (typeof v === "string") amenities.push(v);
          }
        }
      }
    }

    // Rate plans
    const rates: HotelscomRoomRate[] = [];
    for (const rp of propertyUnit?.ratePlans ?? []) {
      for (const pd of rp?.priceDetails ?? []) {
        const dm = pd?.price?.displayMessages ?? [];
        const px = extractDisplayPrice(dm);
        const total = parsePriceNumber(px.total);
        const strike = parsePriceNumber(px.strike);
        const perNight = parsePriceNumber(px.perNight);
        rates.push({
          totalFormatted: px.total,
          totalValue: total.value,
          perNightFormatted: px.perNight,
          perNightValue: perNight.value,
          strikeFormatted: px.strike,
          strikeValue: strike.value,
          currency: total.currency ?? perNight.currency,
          paymentModel: pd?.paymentModel,
          paymentLabel: paymentLabelFromModel(pd?.paymentModel),
          paymentDescription:
            pd?.paymentReassuranceMessage?.value ?? rp?.paymentReassuranceMessage?.value,
          scarcityMessage: pd?.availability?.scarcityMessage,
          cancellationLabel: extractCancellationLabel(pd?.cancellationPolicy),
          dealBadge: rp?.badge?.text,
          taxesLabel: px.taxes,
        });
      }
    }

    out.push({
      id,
      name,
      features,
      amenities,
      images,
      rates,
      reviewScore: cl?.lodgingReview?.scoreText,
      reviewLabel: cl?.lodgingReview?.scoreLabel,
    });
  }
  return out;
}

// ============================================================
// COMODIDADES: data.amenitiesSummary.amenities.sections[]
// ============================================================

export interface AmenityGroup {
  title: string;
  items: Array<{ text: string; iconId?: string }>;
}

export function extractAmenityGroups(amenities: any): AmenityGroup[] {
  const out: AmenityGroup[] = [];
  const sections =
    amenities?.amenitiesSummary?.amenities?.sections ??
    amenities?.amenities?.sections ??
    amenities?.sections ??
    [];
  if (!Array.isArray(sections)) return out;

  for (const s of sections) {
    const subs = s?.bodySubSections ?? [];
    for (const sub of subs) {
      const elements = sub?.elementsV2 ?? sub?.elements ?? [];
      for (const el of elements) {
        const inner = el?.elements ?? [el];
        for (const propContent of inner) {
          const heading: string =
            propContent?.header?.text ??
            propContent?.heading ??
            sub?.header?.text ??
            "Comodidades";
          const items: AmenityGroup["items"] = [];
          for (const it of propContent?.items ?? []) {
            const txt = it?.content?.primary?.value ?? it?.text;
            const subt = it?.content?.secondary?.value;
            if (typeof txt === "string") {
              items.push({
                text: subt ? `${txt}: ${subt}` : txt,
                iconId: propContent?.header?.icon?.id ?? it?.icon?.id,
              });
            }
          }
          if (items.length) out.push({ title: heading, items });
        }
      }
    }
  }
  // Mescla grupos com mesmo título
  const merged = new Map<string, AmenityGroup["items"]>();
  for (const g of out) {
    const existing = merged.get(g.title);
    if (existing) existing.push(...g.items);
    else merged.set(g.title, [...g.items]);
  }
  return Array.from(merged.entries()).map(([title, items]) => ({
    title,
    items,
  }));
}

// ============================================================
// LOCALIZAÇÃO: data.address + data.contents[].content.landmarks[]
// ============================================================

export interface NearbyPlace {
  name: string;
  distance?: string;
}

export function extractLocation(loc: any): {
  address?: string;
  latitude?: number;
  longitude?: number;
  editorial?: string;
  nearby: NearbyPlace[];
} {
  const addr = loc?.address;
  const lines: string[] = Array.isArray(addr?.address) ? addr.address : [];
  const fullAddress = lines.length ? lines.join(", ") : undefined;
  const latitude = addr?.coordinates?.latitude;
  const longitude = addr?.coordinates?.longitude;

  let editorial: string | undefined;
  const nearby: NearbyPlace[] = [];

  for (const c of loc?.contents ?? []) {
    const inner = c?.content;
    if (!inner) continue;
    const ed: string[] = inner?.editorial ?? [];
    if (!editorial && ed.length) editorial = ed.join(" ");
    for (const lm of inner?.landmarks ?? []) {
      for (const it of lm?.items ?? []) {
        const text: string = it?.text;
        if (!text) continue;
        // text vem como "Municipal Theater - 2 min walk"
        const m = text.match(/^(.+?)\s*[-–]\s*(.+)$/);
        if (m) nearby.push({ name: m[1].trim(), distance: m[2].trim() });
        else nearby.push({ name: text });
      }
    }
  }

  return { address: fullAddress, latitude, longitude, editorial, nearby };
}

// ============================================================
// AVALIAÇÕES SUMMARY: data.summary
// ============================================================

export interface RatingSummary {
  score?: string;
  label?: string;
  totalReviews?: number;
  reviewsCtaText?: string;
}

export function extractRatingSummary(ratingSummary: any): RatingSummary {
  const s = ratingSummary?.summary;
  const out: RatingSummary = {
    score: s?.primary,
    label: s?.secondary,
  };
  // CTA "See all 2,452 reviews"
  const cta = s?.supportingMessages?.[0]?.link?.text;
  if (typeof cta === "string") {
    out.reviewsCtaText = cta;
    const m = cta.match(/([\d.,]+)/);
    if (m) {
      const n = parseInt(m[1].replace(/[^\d]/g, ""), 10);
      if (Number.isFinite(n)) out.totalReviews = n;
    }
  }
  return out;
}

// ============================================================
// AVALIAÇÕES LISTA: data.reviewInfo.reviews[]
// ============================================================

export interface HotelscomReview {
  id: string;
  authorContext?: string;
  score?: string;
  scoreLabel?: string;
  date?: string;
  title?: string;
  text?: string;
}

export function extractReviewsList(reviewsList: any): HotelscomReview[] {
  const reviews: any[] = reviewsList?.reviewInfo?.reviews ?? [];
  if (!Array.isArray(reviews)) return [];
  return reviews
    .filter((r) => r?.id)
    .map((r) => {
      const scoreText: string = r?.reviewScoreWithDescription?.value ?? "";
      const [score, ...labelParts] = scoreText.split(" ");
      return {
        id: String(r.id),
        authorContext: r?.reviewFooter?.messages?.[0]?.text?.text,
        score: score || undefined,
        scoreLabel: labelParts.join(" ") || undefined,
        date: r?.submissionTimeLocalized,
        title: r?.title || undefined,
        text: r?.text,
      };
    });
}

// ============================================================
// HEADLINE: data.primary + supportingMessages
// ============================================================

export interface HotelscomHeadline {
  primary?: string;
  rating?: number;
  ratingAccessibility?: string;
  /** Frases curtas tipo "Hotel with outdoor pool, near Flamengo Beach" */
  supportingMessages: string[];
}

export function extractHeadline(headline: any): HotelscomHeadline {
  const supporting: string[] = [];
  for (const m of headline?.supportingMessages ?? []) {
    const t = m?.text;
    if (typeof t === "string" && t.trim()) supporting.push(t.trim());
  }
  return {
    primary: headline?.primary,
    rating: headline?.rating?.rating,
    ratingAccessibility: headline?.rating?.accessibility,
    supportingMessages: supporting,
  };
}

// ============================================================
// SUMMARY (allOffersInclude badges + perks gerais)
// ============================================================

export interface OfferPerk {
  text: string;
  iconId?: string;
}

export function extractAllOfferPerks(offers: any): OfferPerk[] {
  const out: OfferPerk[] = [];
  const badges = offers?.allOffersInclude?.badges ?? [];
  for (const b of badges) {
    if (typeof b?.text === "string")
      out.push({ text: b.text, iconId: b?.graphic?.id });
  }
  return out;
}

// ============================================================
// Tipsters / hotels-com-provider — normalizers
// ============================================================

import type { UnifiedHotel } from "./unifiedHotelTypes";

/**
 * Normaliza a resposta de /v3/hotels/search (tipsters).
 * Estrutura: { data: { properties: [...] } }
 */
export function normalizeHotelscomTipsterSearch(raw: any): UnifiedHotel[] {
  const properties: any[] = raw?.data?.properties ?? raw?.properties ?? [];
  return properties.map((p: any) => {
    const priceLead = p?.price?.lead;
    const priceStrike = p?.price?.strikeOut;
    const photo = p?.propertyImage?.image?.url ?? null;
    const guestRating = p?.guestRating ?? p?.reviews;

    const messages: any[] = Array.isArray(p?.messages) ? p.messages : [];

    return {
      source: "hotelscom" as const,
      id: String(p.id),
      uid: `hotelscom:${p.id}`,
      name: p.name || "Hotel sem nome",
      location: p.neighborhood ?? p?.regionNames?.shortName,
      latitude: p?.mapMarker?.latLong?.latitude,
      longitude: p?.mapMarker?.latLong?.longitude,
      photoUrl: photo,
      photoUrls: photo ? [photo] : [],
      stars: p.starRating ?? null,
      reviewScore: guestRating?.rating ?? null,
      reviewScoreWord: guestRating?.wordRating ?? null,
      reviewCount: guestRating?.totalReviewCount ?? guestRating?.totalCount ?? 0,
      priceTotal: priceLead?.amount ?? null,
      priceCurrency: priceLead?.currencyInfo?.code ?? "BRL",
      priceStriked: priceStrike?.amount ?? null,
      pricePerNight: priceLead?.amount ?? null,
      priceFormatted: priceLead?.formatted ?? null,
      freeCancellation: messages.some((m: any) => m?.type === "FREE_CANCELLATION"),
      breakfastIncluded: messages.some((m: any) => m?.type === "BREAKFAST"),
      amenities: (p?.amenities ?? []).map((a: any) => a?.label || a?.id).filter(Boolean),
      externalUrl: `https://www.hotels.com/ho${p.id}`,
      discountBadge:
        priceStrike?.amount && priceLead?.amount
          ? `-${Math.round(((priceStrike.amount - priceLead.amount) / priceStrike.amount) * 100)}%`
          : undefined,
      photoCaptions: [p?.propertyImage?.image?.description].filter(Boolean) as string[],
      promoBadges: messages.filter((m: any) => m?.type === "DEAL").map((m: any) => m?.text).filter(Boolean),
      neighborhood: p.neighborhood,
      raw: p,
    } as unknown as UnifiedHotel;
  });
}

/**
 * Consolida partes da tipsters (details + offers + reviews) num shape único.
 * Tolerante a campos ausentes — todos os getters caem em fallback.
 */
export function normalizeHotelscomTipsterDetails(parts: {
  details?: any;
  info?: any;
  offers?: any;
  summary?: any;
  reviewsSummary?: any;
  reviewsScores?: any;
  reviewsList?: any;
}) {
  const d = parts.details?.data ?? parts.details ?? {};
  const info = parts.info?.data ?? parts.info ?? {};
  return {
    name: d?.name ?? info?.name,
    starRating: d?.starRating ?? info?.starRating,
    address: d?.address ?? info?.address,
    latitude: d?.coordinates?.lat ?? info?.coordinates?.lat,
    longitude: d?.coordinates?.lng ?? info?.coordinates?.lng,
    phone: d?.phone ?? info?.phone,
    email: d?.email ?? info?.email,
    gallery: d?.gallery?.images ?? d?.images ?? [],
    amenitiesByCategory: d?.amenities?.categories ?? d?.amenityGroups ?? [],
    highlights: d?.highlights ?? d?.propertyHighlights ?? [],
    sustainability: d?.sustainability ?? d?.ecoCertifications ?? null,
    surroundings: d?.surroundings ?? d?.neighborhoodHighlights ?? [],
    policies: {
      checkIn: d?.policies?.checkIn ?? d?.checkInTime,
      checkOut: d?.policies?.checkOut ?? d?.checkOutTime,
      languages: d?.policies?.languagesSpoken ?? d?.languagesSpoken,
      pets: d?.policies?.pets ?? d?.petPolicy,
      family: d?.policies?.family ?? d?.familyPolicy,
    },
    brand: d?.brand ?? info?.brand,
    categories: d?.categories ?? info?.themes ?? [],
    description: d?.description ?? info?.description,
    rooms: parts.offers?.rooms ?? parts.offers?.data?.rooms ?? [],
    reviewsSummary: {
      rating: parts.reviewsSummary?.rating ?? null,
      ratingWord: parts.reviewsSummary?.ratingWord ?? null,
      totalCount: parts.reviewsSummary?.totalReviewCount ?? 0,
      summary: parts.reviewsSummary?.summary ?? null,
    },
    reviewsScoresBreakdown: parts.reviewsScores?.categories ?? [],
    reviewsList: parts.reviewsList?.reviews ?? [],
  };
}

/**
 * Normaliza /v2/regions (tipsters autocomplete).
 */
export function normalizeHotelscomTipsterAutocomplete(raw: any): Array<{
  id: string;
  name: string;
  fullName: string;
  type: string;
  coords?: { lat: number; lng: number };
}> {
  const items: any[] = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
  return items
    .filter((it: any) => it?.gaiaId ?? it?.id)
    .map((it: any) => ({
      id: String(it.gaiaId ?? it.id),
      name: it?.regionNames?.shortName ?? it?.name ?? "",
      fullName: it?.regionNames?.fullName ?? it?.name ?? "",
      type: it?.type ?? "REGION",
      coords:
        it?.coordinates && typeof it.coordinates.lat === "number"
          ? { lat: it.coordinates.lat, lng: it.coordinates.lng ?? it.coordinates.long }
          : undefined,
    }));
}
