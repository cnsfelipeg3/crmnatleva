// RoomOfferCard · renderização unificada de uma RoomOffer (Booking + Hotels.com)
// Visual neutro, segue brandbook: cards brancos, ring sutil, badges semânticos.

import { memo } from "react";
import {
  RoomOffer,
  PAYMENT_MODALITY_COLOR,
  CANCELLATION_POLICY_COLOR,
} from "@/types/hotel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Building2,
  Wallet,
  PiggyBank,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Coffee,
  BedDouble,
  Flame,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------- Helpers ----------

function fmtMoney(amount?: number, currency?: string): string {
  if (typeof amount !== "number" || !isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `R$ ${amount.toFixed(0)}`;
  }
}

const PAYMENT_ICON = {
  pay_now: CreditCard,
  pay_at_property: Building2,
  pay_with_deposit: PiggyBank,
  partial_prepay: Wallet,
} as const;

const CANCELLATION_ICON = {
  free_cancellation: ShieldCheck,
  partial_refund: ShieldAlert,
  non_refundable: ShieldOff,
} as const;

// ---------- Component ----------

export interface RoomOfferCardProps {
  offer: RoomOffer;
  /** Posição na lista (a primeira ganha destaque "Melhor preço") */
  position?: number;
  /** Click em "Reservar" (opcional · se não passar, esconde o botão) */
  onSelect?: (offer: RoomOffer) => void;
  /** URL externa para reserva direta (se houver) · abre em nova aba */
  externalUrl?: string;
  className?: string;
}

function RoomOfferCardImpl({
  offer,
  position,
  onSelect,
  externalUrl,
  className,
}: RoomOfferCardProps) {
  const payColor = PAYMENT_MODALITY_COLOR[offer.paymentModality];
  const cancelColor = CANCELLATION_POLICY_COLOR[offer.cancellationPolicy];
  const PayIcon = PAYMENT_ICON[offer.paymentModality];
  const CancelIcon = CANCELLATION_ICON[offer.cancellationPolicy];

  const isBest = position === 0;

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-card p-3 sm:p-4 ring-1 ring-border/50 hover:ring-foreground/15 transition-all",
        isBest && "ring-2 ring-amber-400/60 shadow-[0_8px_24px_-12px_rgba(245,158,11,0.45)]",
        className,
      )}
    >
      {isBest && (
        <span className="absolute -top-2 left-3 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-400 text-amber-950 shadow-sm">
          Melhor preço
        </span>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
        {/* === Esquerda · pagamento + cancelamento + extras === */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Modalidade de pagamento (destaque principal) */}
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium ring-1",
              payColor.bg,
              payColor.text,
              payColor.ring,
            )}
          >
            <PayIcon className="h-3.5 w-3.5" />
            <span>{offer.paymentLabel}</span>
          </div>

          {offer.paymentDescription && (
            <p className="text-[11.5px] text-muted-foreground leading-snug">
              {offer.paymentDescription}
            </p>
          )}

          {/* Política de cancelamento */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn(
                "text-[10.5px] gap-1 border-transparent",
                cancelColor.bg,
                cancelColor.text,
                "ring-1",
                cancelColor.ring,
              )}
            >
              <CancelIcon className="h-3 w-3" />
              {offer.cancellationLabel}
            </Badge>

            {offer.breakfastIncluded && (
              <Badge
                variant="outline"
                className="text-[10.5px] gap-1 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 border-transparent dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60"
              >
                <Coffee className="h-3 w-3" />
                Café da manhã
              </Badge>
            )}

            {offer.dealBadge && (
              <Badge className="text-[10.5px] gap-1 bg-rose-500 hover:bg-rose-500 text-white border-transparent">
                <Flame className="h-3 w-3" />
                {offer.dealBadge}
              </Badge>
            )}

            {offer.beds && (
              <Badge variant="outline" className="text-[10.5px] gap-1 bg-muted/40 text-foreground/70">
                <BedDouble className="h-3 w-3" />
                {offer.beds}
              </Badge>
            )}
          </div>

          {offer.scarcityMessage && (
            <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium inline-flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {offer.scarcityMessage}
            </p>
          )}

          {offer.prepaymentAmount && offer.paymentModality === "pay_with_deposit" && (
            <p className="text-[11px] text-muted-foreground">
              Depósito agora ·{" "}
              <strong className="text-foreground">
                {fmtMoney(offer.prepaymentAmount.amount, offer.prepaymentAmount.currency)}
              </strong>
            </p>
          )}
        </div>

        {/* === Direita · preço + CTA === */}
        <div className="text-right shrink-0 min-w-[140px]">
          {offer.strikePrice && (
            <div className="text-[11px] text-muted-foreground line-through">
              {fmtMoney(offer.strikePrice.amount, offer.strikePrice.currency)}
            </div>
          )}
          <div className="font-bold text-base sm:text-lg leading-tight text-foreground">
            {fmtMoney(offer.price.amount, offer.price.currency)}
          </div>
          {offer.pricePerNight && (
            <div className="text-[10.5px] text-muted-foreground">
              {fmtMoney(offer.pricePerNight.amount, offer.pricePerNight.currency)}/noite
            </div>
          )}

          {(onSelect || externalUrl) && (
            <div className="mt-2 flex justify-end">
              {onSelect ? (
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => onSelect(offer)}
                >
                  Selecionar
                </Button>
              ) : externalUrl ? (
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="h-8 text-xs gap-1"
                >
                  <a href={externalUrl} target="_blank" rel="noopener noreferrer">
                    Reservar
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const RoomOfferCard = memo(RoomOfferCardImpl);
