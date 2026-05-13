// Helpers de filtro client-side por modalidade de pagamento + cancelamento grátis
// Aplica sobre o cache hot/cold de hotel_payment_cache (Leva 1).

import type { PaymentModality, HotelPaymentSummary, HotelSource } from "@/types/hotel";
import { PAYMENT_MODALITY_LABEL, PAYMENT_MODALITY_COLOR } from "@/types/hotel";

export const PAYMENT_FILTER_OPTIONS: Array<{
  id: PaymentModality;
  label: string;
}> = [
  { id: "pay_at_property", label: PAYMENT_MODALITY_LABEL.pay_at_property },
  { id: "pay_now", label: PAYMENT_MODALITY_LABEL.pay_now },
  { id: "pay_with_deposit", label: PAYMENT_MODALITY_LABEL.pay_with_deposit },
  { id: "partial_prepay", label: PAYMENT_MODALITY_LABEL.partial_prepay },
];

export function getModalityColor(m: PaymentModality) {
  return PAYMENT_MODALITY_COLOR[m];
}

/** Chave canônica do cache · alinhada à PK (hotel_id, source) */
export function paymentCacheKey(hotelId: string | number, source: HotelSource): string {
  return `${source}:${String(hotelId)}`;
}

/**
 * Verifica se um summary do hotel atende aos filtros de pagamento.
 * Quando NÃO há summary disponível (cold/missing), retorna `null` · o caller
 * decide se exibe (default · não filtra) ou esconde.
 */
export function hotelMatchesPaymentFilters(
  summary: HotelPaymentSummary | undefined,
  modalities: Set<string>,
  freeCancellationOnly: boolean,
  hotelId?: string,
): boolean | null {
  const hasModalityFilter = modalities.size > 0;
  if (!hasModalityFilter && !freeCancellationOnly) return true;
  if (!summary) {
    // DEBUG: console.log("[PAY_FILTER] match", { hotelId, modalitiesRequested: Array.from(modalities), freeCancellationOnly, summary: null, result: null });
    return null;
  }
  let result: boolean = true;
  if (freeCancellationOnly && !summary.hasFreeCancellation) result = false;
  if (result && hasModalityFilter) {
    const hit = summary.availableModalities.some((m) => modalities.has(m));
    if (!hit) result = false;
  }
  // DEBUG: console.log("[PAY_FILTER] match", { hotelId, modalitiesRequested: Array.from(modalities), freeCancellationOnly, available: summary.availableModalities, hasFree: summary.hasFreeCancellation, result });
  return result;
}
