// Tipos unificados de oferta de hotel · Booking + Hotels.com
// Modalidade de pagamento e política de cancelamento normalizadas em PT-BR.

export type PaymentModality =
  | "pay_now"            // Paga online/agora
  | "pay_at_property"    // Paga no hotel
  | "pay_with_deposit"   // Reserva com depósito
  | "partial_prepay";    // Pré-pagamento parcial

export type CancellationPolicy =
  | "free_cancellation"  // Reembolsável grátis
  | "partial_refund"     // Reembolso parcial
  | "non_refundable";    // Não reembolsável

export type HotelSource = "booking" | "hotelscom";

export interface MoneyAmount {
  amount: number;
  currency: string;
}

export interface RoomOffer {
  id: string;
  roomId: string;
  roomName: string;
  source: HotelSource;
  price: MoneyAmount;
  /** Preço por noite (quando disponível) */
  pricePerNight?: MoneyAmount;
  /** Preço riscado (de) */
  strikePrice?: MoneyAmount;

  // Pagamento
  paymentModality: PaymentModality;
  paymentLabel: string;
  paymentDescription?: string;
  prepaymentAmount?: MoneyAmount;
  payAtPropertyDate?: string;

  // Cancelamento
  cancellationPolicy: CancellationPolicy;
  cancellationLabel: string;
  freeCancellationUntil?: string;
  refundableDeadline?: string;

  // Extras
  breakfastIncluded?: boolean;
  beds?: string;
  /** Mensagem de escassez (ex: "Restam 2 quartos") */
  scarcityMessage?: string;
  /** Badge de promoção (ex: "-10%") */
  dealBadge?: string;
}

export interface HotelPaymentSummary {
  hotelId: string;
  source: HotelSource;
  availableModalities: PaymentModality[];
  hasFreeCancellation: boolean;
  offersCount: number;
  fetchedAt: string;
}

// ------------------------------------------------------------
// Labels canônicos PT-BR
// ------------------------------------------------------------

export const PAYMENT_MODALITY_LABEL: Record<PaymentModality, string> = {
  pay_now: "Pague agora",
  pay_at_property: "Pague no hotel",
  pay_with_deposit: "Reserva com depósito",
  partial_prepay: "Pagamento parcial antecipado",
};

export const PAYMENT_MODALITY_DESCRIPTION: Record<PaymentModality, string> = {
  pay_now: "Cobrança total no momento da reserva.",
  pay_at_property: "Sem cobrança agora · pague direto no hotel no check-in.",
  pay_with_deposit: "Pague apenas um depósito agora e o restante depois.",
  partial_prepay: "Parte do valor agora · saldo cobrado antes da estadia.",
};

export const CANCELLATION_POLICY_LABEL: Record<CancellationPolicy, string> = {
  free_cancellation: "Cancelamento grátis",
  partial_refund: "Reembolso parcial",
  non_refundable: "Não reembolsável",
};

// ------------------------------------------------------------
// Cores (tokens compatíveis com tailwind / brandbook NatLeva)
// ------------------------------------------------------------

export const PAYMENT_MODALITY_COLOR: Record<PaymentModality, {
  bg: string; text: string; ring: string; dot: string;
}> = {
  pay_at_property: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-200 dark:ring-emerald-900/60",
    dot: "bg-emerald-500",
  },
  pay_now: {
    bg: "bg-sky-50 dark:bg-sky-950/40",
    text: "text-sky-700 dark:text-sky-300",
    ring: "ring-sky-200 dark:ring-sky-900/60",
    dot: "bg-sky-500",
  },
  pay_with_deposit: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-800 dark:text-amber-300",
    ring: "ring-amber-200 dark:ring-amber-900/60",
    dot: "bg-amber-500",
  },
  partial_prepay: {
    bg: "bg-violet-50 dark:bg-violet-950/40",
    text: "text-violet-700 dark:text-violet-300",
    ring: "ring-violet-200 dark:ring-violet-900/60",
    dot: "bg-violet-500",
  },
};

export const CANCELLATION_POLICY_COLOR: Record<CancellationPolicy, {
  bg: string; text: string; ring: string;
}> = {
  free_cancellation: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-200 dark:ring-emerald-900/60",
  },
  partial_refund: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-800 dark:text-amber-300",
    ring: "ring-amber-200 dark:ring-amber-900/60",
  },
  non_refundable: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    ring: "ring-rose-200 dark:ring-rose-900/60",
  },
};
