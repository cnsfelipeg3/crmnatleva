// AllRoomOffersBlock · seção "Todas as ofertas deste quarto"
// Plugável em qualquer drawer · aceita ofertas Booking ou Hotels.com já normalizadas
// e renderiza agrupado por quarto, ordenado por preço crescente.

import { useMemo, useState } from "react";
import { RoomOffer, PaymentModality, PAYMENT_MODALITY_LABEL } from "@/types/hotel";
import { groupOffersByRoom, summarizeOffers } from "@/lib/hotels/paymentNormalizer";
import { RoomOfferCard } from "./RoomOfferCard";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Filter, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  offers: RoomOffer[];
  /** Quantas ofertas mostrar por quarto antes de "ver todas" */
  initialPerRoom?: number;
  /** Click em "Selecionar" (opcional) */
  onSelect?: (offer: RoomOffer) => void;
  /** URL externa fallback (Booking) · usada quando não há onSelect */
  externalUrl?: string;
  className?: string;
}

const MODALITY_ORDER: PaymentModality[] = [
  "pay_at_property",
  "pay_now",
  "partial_prepay",
  "pay_with_deposit",
];

export default function AllRoomOffersBlock({
  offers,
  initialPerRoom = 3,
  onSelect,
  externalUrl,
  className,
}: Props) {
  const [modalityFilter, setModalityFilter] = useState<PaymentModality | "all">("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const summary = useMemo(() => summarizeOffers(offers), [offers]);

  const filtered = useMemo(() => {
    if (modalityFilter === "all") return offers;
    return offers.filter((o) => o.paymentModality === modalityFilter);
  }, [offers, modalityFilter]);

  const groups = useMemo(() => groupOffersByRoom(filtered), [filtered]);

  if (!offers.length) return null;

  const availableModalities = MODALITY_ORDER.filter((m) =>
    summary.availableModalities.includes(m),
  );

  return (
    <section className={cn("space-y-3", className)} aria-label="Todas as ofertas deste hotel">
      {/* Header + filtro de modalidade */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Todas as ofertas deste hotel
          </h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {summary.offersCount}{" "}
            {summary.offersCount === 1 ? "oferta encontrada" : "ofertas encontradas"} ·{" "}
            {availableModalities.length}{" "}
            {availableModalities.length === 1
              ? "forma de pagamento"
              : "formas de pagamento"}
            {summary.hasFreeCancellation ? " · com cancelamento grátis disponível" : ""}
          </p>
        </div>
      </div>

      {/* Chips de filtro por modalidade */}
      {availableModalities.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
          <Filter className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden />
          <button
            type="button"
            onClick={() => setModalityFilter("all")}
            className={cn(
              "shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
              modalityFilter === "all"
                ? "bg-foreground text-background border-foreground"
                : "bg-muted/40 text-foreground/70 border-border hover:bg-muted",
            )}
          >
            Todas ({summary.offersCount})
          </button>
          {availableModalities.map((m) => {
            const count = offers.filter((o) => o.paymentModality === m).length;
            const active = modalityFilter === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setModalityFilter(m)}
                className={cn(
                  "shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                  active
                    ? "bg-foreground text-background border-foreground"
                    : "bg-muted/40 text-foreground/70 border-border hover:bg-muted",
                )}
              >
                {PAYMENT_MODALITY_LABEL[m]} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Lista agrupada por quarto */}
      {groups.length === 0 ? (
        <div className="rounded border border-dashed p-4 text-center text-xs text-muted-foreground">
          Nenhuma oferta com essa modalidade.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const isExp = expanded[g.roomId] ?? false;
            const visible = isExp ? g.offers : g.offers.slice(0, initialPerRoom);
            const hidden = g.offers.length - visible.length;
            return (
              <div key={g.roomId} className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <h5 className="text-[12.5px] font-semibold text-foreground/90 truncate">
                    {g.roomName}
                  </h5>
                  <span className="text-[10.5px] text-muted-foreground shrink-0">
                    {g.offers.length}{" "}
                    {g.offers.length === 1 ? "oferta" : "ofertas"}
                  </span>
                </div>
                <div className="space-y-2">
                  {visible.map((o, i) => (
                    <RoomOfferCard
                      key={o.id}
                      offer={o}
                      position={i}
                      onSelect={onSelect}
                      externalUrl={externalUrl}
                    />
                  ))}
                </div>
                {hidden > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                    onClick={() =>
                      setExpanded((p) => ({ ...p, [g.roomId]: !isExp }))
                    }
                  >
                    {isExp ? (
                      <>
                        <ChevronUp className="h-3 w-3" />
                        Ver menos
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3" />
                        Ver mais {hidden}{" "}
                        {hidden === 1 ? "oferta" : "ofertas"}
                      </>
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
