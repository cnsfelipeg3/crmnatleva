// Normalizadores de pagamento · Booking RapidAPI + Hotels.com
// Converte os formatos brutos das duas APIs em RoomOffer unificado em PT-BR.

import {
  PaymentModality,
  CancellationPolicy,
  RoomOffer,
  PAYMENT_MODALITY_LABEL,
  CANCELLATION_POLICY_LABEL,
} from "@/types/hotel";
import type {
  BookingBlock,
  BookingHotel,
  BookingRoomDetails,
} from "@/components/booking-rapidapi/types";
import type {
  HotelscomRoom,
  HotelscomRoomRate,
} from "@/components/booking-rapidapi/hotelscomNormalizers";

// ------------------------------------------------------------
// Helpers de label (formatação BR de data)
// ------------------------------------------------------------

function formatBR(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function getPaymentLabel(m: PaymentModality): string {
  return PAYMENT_MODALITY_LABEL[m];
}

export function getCancellationLabel(
  c: CancellationPolicy,
  until?: string,
): string {
  if (c === "free_cancellation") {
    const f = formatBR(until);
    return f ? `Cancelamento grátis até ${f}` : CANCELLATION_POLICY_LABEL[c];
  }
  return CANCELLATION_POLICY_LABEL[c];
}

// ============================================================
// BOOKING.COM
// ============================================================

function pickBookingPrice(block: BookingBlock): {
  amount: number;
  currency: string;
} {
  // Tenta vários caminhos comuns no JSON do Booking
  const b: any = block as any;
  const amt =
    b?.product_price_breakdown?.gross_amount?.value ??
    b?.composite_price_breakdown?.gross_amount?.value ??
    b?.gross_amount ??
    b?.min_price?.price ??
    0;
  const cur =
    b?.product_price_breakdown?.gross_amount?.currency ??
    b?.composite_price_breakdown?.gross_amount?.currency ??
    b?.currency ??
    b?.currency_code ??
    "BRL";
  return { amount: Number(amt) || 0, currency: cur };
}

function pickBookingPerNight(block: BookingBlock):
  | { amount: number; currency: string }
  | undefined {
  const b: any = block as any;
  const amt =
    b?.product_price_breakdown?.gross_amount_per_night?.value ??
    b?.composite_price_breakdown?.gross_amount_per_night?.value;
  const cur =
    b?.product_price_breakdown?.gross_amount_per_night?.currency ??
    b?.composite_price_breakdown?.gross_amount_per_night?.currency;
  if (amt == null || cur == null) return undefined;
  return { amount: Number(amt) || 0, currency: cur };
}

function pickBookingStrike(block: BookingBlock):
  | { amount: number; currency: string }
  | undefined {
  const b: any = block as any;
  const amt =
    b?.product_price_breakdown?.strikethrough_amount?.value ??
    b?.composite_price_breakdown?.strikethrough_amount?.value;
  const cur =
    b?.product_price_breakdown?.strikethrough_amount?.currency ??
    b?.composite_price_breakdown?.strikethrough_amount?.currency;
  if (amt == null || cur == null) return undefined;
  return { amount: Number(amt) || 0, currency: cur };
}

function bookingBeds(block: BookingBlock, room?: BookingRoomDetails): string | undefined {
  const b: any = block as any;
  if (typeof b?.bed_configurations === "string") return b.bed_configurations;
  const beds = room?.bed_configurations?.[0]?.bed_types;
  if (Array.isArray(beds) && beds.length) {
    return beds
      .map((bt) => bt?.name_with_count ?? bt?.description ?? bt?.name)
      .filter(Boolean)
      .join(" · ");
  }
  return undefined;
}

export function normalizeBookingBlock(
  block: BookingBlock,
  room?: BookingRoomDetails,
): RoomOffer {
  const prepayType = block.paymentterms?.prepayment?.type?.toLowerCase() ?? "";
  const prepayExt =
    (block as any)?.paymentterms?.prepayment?.type_extended?.toLowerCase?.() ?? "";
  const cancelType = block.paymentterms?.cancellation?.type?.toLowerCase() ?? "";
  const refundable = Number(block.refundable ?? 0) === 1;
  const depositRequired = Number(block.deposit_required ?? 0) === 1;
  const payInAdvance = Number(block.pay_in_advance ?? 0) === 1;

  // Modalidade
  let modality: PaymentModality;
  if (depositRequired || /deposit/.test(prepayExt)) {
    modality = "pay_with_deposit";
  } else if (
    /required_now|required|prepayment_required|charged_now|stay_now/.test(prepayType) ||
    /required_now|charged_now/.test(prepayExt)
  ) {
    modality = "pay_now";
  } else if (payInAdvance || /partial|advance/.test(prepayExt)) {
    modality = "partial_prepay";
  } else {
    modality = "pay_at_property";
  }

  // Cancelamento
  let cancellation: CancellationPolicy;
  if (refundable || /free|refundable/.test(cancelType)) {
    cancellation = "free_cancellation";
  } else if (/partial/.test(cancelType)) {
    cancellation = "partial_refund";
  } else {
    cancellation = "non_refundable";
  }

  const refundableUntil =
    block.refundable_until ??
    block.paymentterms?.cancellation?.info?.refundable_date ??
    block.paymentterms?.cancellation?.info?.date;

  const breakfast =
    Number(block.breakfast_included ?? 0) === 1 ||
    /breakfast/i.test(String(block.mealplan ?? ""));

  return {
    id: String(block.block_id ?? `${block.room_id}-${modality}`),
    roomId: String(block.room_id ?? ""),
    roomName: block.name_without_policy ?? block.room_name ?? block.name ?? "Quarto",
    source: "booking",
    price: pickBookingPrice(block),
    pricePerNight: pickBookingPerNight(block),
    strikePrice: pickBookingStrike(block),
    paymentModality: modality,
    paymentLabel: getPaymentLabel(modality),
    paymentDescription:
      block.paymentterms?.prepayment?.simple_translation ??
      block.paymentterms?.prepayment?.description,
    cancellationPolicy: cancellation,
    cancellationLabel: getCancellationLabel(cancellation, refundableUntil),
    freeCancellationUntil: cancellation === "free_cancellation" ? refundableUntil : undefined,
    refundableDeadline: refundableUntil,
    breakfastIncluded: breakfast,
    beds: bookingBeds(block, room),
    dealBadge:
      Number(block.is_flash_deal ?? 0) === 1
        ? "Flash deal"
        : Number(block.is_smart_deal ?? 0) === 1
        ? "Smart deal"
        : Number(block.is_last_minute_deal ?? 0) === 1
        ? "Last minute"
        : block.genius_discount_percentage
        ? `-${block.genius_discount_percentage}%`
        : undefined,
  };
}

/** Extrai TODAS as ofertas (blocks) de um hotel Booking */
export function extractBookingOffers(hotel: BookingHotel): RoomOffer[] {
  const blocks = Array.isArray(hotel.block) ? hotel.block : [];
  const rooms = (hotel.rooms ?? {}) as Record<string, BookingRoomDetails>;
  return blocks
    .filter(Boolean)
    .map((b) => normalizeBookingBlock(b, rooms[String(b.room_id)]));
}

// ============================================================
// HOTELS.COM
// ============================================================

export function normalizeHotelscomRate(
  rate: HotelscomRoomRate,
  room: HotelscomRoom,
  index: number,
): RoomOffer {
  const model = (rate.paymentModel ?? "").toUpperCase();
  let modality: PaymentModality = "pay_now";
  if (/PAY_LATER_WITH_DEPOSIT/.test(model)) modality = "pay_with_deposit";
  else if (/PAY_LATER/.test(model)) modality = "pay_at_property";
  else if (/PAY_NOW/.test(model)) modality = "pay_now";

  // Cancelamento · Hotels.com manda texto livre · inferir por keywords
  const cancelText = (rate.cancellationLabel ?? "").toLowerCase();
  let cancellation: CancellationPolicy = "non_refundable";
  if (/free cancel|fully refundable|cancelamento gr|reembols.vel/.test(cancelText)) {
    cancellation = "free_cancellation";
  } else if (/partial|parcial/.test(cancelText)) {
    cancellation = "partial_refund";
  }

  return {
    id: `${room.id}-r${index}`,
    roomId: room.id,
    roomName: room.name,
    source: "hotelscom",
    price: {
      amount: Number(rate.totalValue ?? 0),
      currency: rate.currency ?? "BRL",
    },
    pricePerNight: rate.perNightValue
      ? { amount: rate.perNightValue, currency: rate.currency ?? "BRL" }
      : undefined,
    strikePrice: rate.strikeValue
      ? { amount: rate.strikeValue, currency: rate.currency ?? "BRL" }
      : undefined,
    paymentModality: modality,
    paymentLabel: getPaymentLabel(modality),
    paymentDescription: rate.paymentDescription,
    cancellationPolicy: cancellation,
    cancellationLabel:
      rate.cancellationLabel ?? getCancellationLabel(cancellation),
    breakfastIncluded: room.features?.some((f) =>
      /breakfast|caf.\s*da\s*manh./i.test(f.text),
    ),
    scarcityMessage: rate.scarcityMessage,
    dealBadge: rate.dealBadge,
  };
}

/** Extrai TODAS as ofertas dos quartos Hotels.com (uma room pode ter N rates) */
export function extractHotelscomOffers(rooms: HotelscomRoom[]): RoomOffer[] {
  const out: RoomOffer[] = [];
  for (const room of rooms ?? []) {
    const rates = Array.isArray(room.rates) ? room.rates : [];
    rates.forEach((r, i) => out.push(normalizeHotelscomRate(r, room, i)));
  }
  return out;
}

// ============================================================
// AGREGAÇÃO PARA CACHE
// ============================================================

export function summarizeOffers(offers: RoomOffer[]): {
  availableModalities: PaymentModality[];
  hasFreeCancellation: boolean;
  offersCount: number;
} {
  const set = new Set<PaymentModality>();
  let hasFree = false;
  for (const o of offers) {
    set.add(o.paymentModality);
    if (o.cancellationPolicy === "free_cancellation") hasFree = true;
  }
  return {
    availableModalities: Array.from(set),
    hasFreeCancellation: hasFree,
    offersCount: offers.length,
  };
}

/** Ordena por preço asc, com nulls/zeros ao final */
export function sortOffersByPrice(offers: RoomOffer[]): RoomOffer[] {
  return offers.slice().sort((a, b) => {
    const av = a.price.amount || Number.MAX_SAFE_INTEGER;
    const bv = b.price.amount || Number.MAX_SAFE_INTEGER;
    return av - bv;
  });
}

/** Agrupa ofertas por roomId mantendo ordem por preço */
export function groupOffersByRoom(offers: RoomOffer[]): Array<{
  roomId: string;
  roomName: string;
  offers: RoomOffer[];
}> {
  const map = new Map<string, { roomName: string; offers: RoomOffer[] }>();
  for (const o of sortOffersByPrice(offers)) {
    const key = o.roomId || o.id;
    const ex = map.get(key);
    if (ex) ex.offers.push(o);
    else map.set(key, { roomName: o.roomName, offers: [o] });
  }
  return Array.from(map.entries()).map(([roomId, v]) => ({
    roomId,
    roomName: v.roomName,
    offers: v.offers,
  }));
}
