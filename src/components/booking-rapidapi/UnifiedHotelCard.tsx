import { Star, MapPin, ImageOff, Check, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  SOURCE_LABELS,
  type HotelSource,
  type UnifiedHotelGroup,
  type UnifiedHotelOffer,
} from "./unifiedHotelTypes";
import { normalizeAmenities } from "./amenityLabels";

interface Props {
  group: UnifiedHotelGroup;
  /** Ao clicar numa oferta específica (abre drawer daquela fonte) */
  onOfferClick?: (offer: UnifiedHotelOffer, group: UnifiedHotelGroup) => void;
  /** Ao clicar na foto/header do card (abre drawer da melhor oferta) */
  onCardClick?: (group: UnifiedHotelGroup) => void;
}

function formatPriceBRL(value?: number, currency?: string): string {
  if (value === undefined || value === null) return "—";
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency || ""} ${value.toFixed(0)}`;
  }
}

/** Cores do dot por fonte (bolinha colorida antes do nome) */
const SOURCE_DOT_CLASS: Record<HotelSource, string> = {
  booking: "bg-blue-500",
  hotelscom: "bg-rose-500",
};

/** Linha de oferta — versão compacta empilhada no card */
function OfferRow({
  offer,
  isBest,
  onClick,
}: {
  offer: UnifiedHotelOffer;
  isBest: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-left transition-colors",
        "hover:bg-muted/60",
        isBest && "bg-emerald-50 dark:bg-emerald-950/30",
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn("h-2 w-2 rounded-full shrink-0", SOURCE_DOT_CLASS[offer.source])} />
        <span className="text-xs font-medium text-foreground truncate">
          {SOURCE_LABELS[offer.source]}
        </span>
        {offer.isMemberPrice && (
          <Badge
            variant="outline"
            className="text-[9px] px-1 py-0 h-4 shrink-0 border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10"
            title="Tarifa Member Price — só aparece para usuários logados na Hotels.com. O preço público pode ser mais alto."
          >
            membro
          </Badge>
        )}
        {offer.isEstimatedPrice && (
          <Badge
            variant="outline"
            className="text-[9px] px-1 py-0 h-4 shrink-0 border-orange-500/40 text-orange-700 dark:text-orange-400 bg-orange-500/10"
            title="O provedor retornou esta tarifa em outra moeda/mercado. O valor em BRL é apenas estimado — confira o preço final no site."
          >
            estimado
          </Badge>
        )}
        {isBest && (
          <Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0 h-4 shrink-0">
            MELHOR
          </Badge>
        )}
      </div>
      <div className="flex flex-col items-end shrink-0">
        {offer.priceStriked &&
          offer.priceStriked > (offer.priceTotal ?? 0) &&
          !offer.isEstimatedPrice && (
            <span className="text-[10px] text-muted-foreground line-through leading-none">
              {formatPriceBRL(offer.priceStriked, offer.priceCurrency)}
            </span>
          )}
        {offer.isEstimatedPrice ? (
          <span className="text-[11px] font-semibold text-orange-700 dark:text-orange-400 leading-tight">
            ver no site
          </span>
        ) : (
          <span
            className={cn(
              "text-sm font-bold leading-tight",
              isBest ? "text-emerald-700 dark:text-emerald-400" : "text-foreground",
            )}
          >
            {formatPriceBRL(offer.priceTotal, offer.priceCurrency)}
          </span>
        )}
        {offer.isMemberPrice && !offer.isEstimatedPrice && (
          <span className="text-[9px] text-amber-700/80 dark:text-amber-400/80 leading-none mt-0.5">
            tarifa membro
          </span>
        )}
      </div>
    </button>
  );
}

export function UnifiedHotelCard({ group, onOfferClick, onCardClick }: Props) {
  const { bestOffer, offers, priceDeltaPercent, savings } = group;

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow flex flex-col"
      onClick={() => onCardClick?.(group)}
    >
      {/* Foto principal */}
      <div className="relative aspect-[4/3] bg-muted">
        {group.photoUrl ? (
          <img
            src={group.photoUrl}
            alt={group.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <ImageOff className="h-10 w-10" />
          </div>
        )}

        {/* Rating (top-right) */}
        {typeof group.reviewScore === "number" && (
          <div className="absolute top-2 right-2 bg-background/90 backdrop-blur rounded-md px-2 py-1 text-xs flex items-center gap-1 shadow">
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            <span className="font-semibold">{group.reviewScore.toFixed(1)}</span>
            {group.reviewScoreWord && (
              <span className="text-muted-foreground hidden sm:inline">
                · {group.reviewScoreWord}
              </span>
            )}
          </div>
        )}

        {/* Badge "Economia X%" foi removido daqui pra não estragar a foto.
            O delta agora aparece embaixo, junto ao preço (ver bloco abaixo). */}
      </div>

      {/* Conteúdo */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm line-clamp-2 flex-1">
            {group.name}
          </h3>
          {typeof group.stars === "number" && group.stars > 0 && (
            <div className="flex shrink-0">
              {Array.from({ length: Math.round(group.stars) }).map((_, i) => (
                <Star
                  key={i}
                  className="h-3 w-3 fill-yellow-500 text-yellow-500"
                />
              ))}
            </div>
          )}
        </div>

        {group.location && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="line-clamp-1">{group.location}</span>
          </div>
        )}

        {typeof group.reviewCount === "number" && group.reviewCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {group.reviewCount.toLocaleString("pt-BR")} avaliações
          </p>
        )}

        {(() => {
          const niceAmenities = normalizeAmenities(group.amenities);
          if (niceAmenities.length === 0) return null;
          return (
            <div className="flex flex-wrap gap-1">
              {niceAmenities.slice(0, 3).map((a, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] py-0 font-normal">
                  {a}
                </Badge>
              ))}
            </div>
          );
        })()}

        {/* Área de ofertas comparativas */}
        <div className="mt-auto pt-2 border-t border-border flex flex-col gap-1">
          {offers.map((offer, i) => (
            <OfferRow
              key={`${offer.source}:${offer.id}:${i}`}
              offer={offer}
              isBest={offer === bestOffer && offers.length > 1}
              onClick={() => onOfferClick?.(offer, group)}
            />
          ))}

          <div className="flex items-center justify-between mt-1 pt-1 gap-2">
            <span className="text-[10px] text-muted-foreground truncate">
              {offers.length === 1
                ? "total da estadia"
                : `${offers.length} fontes · total da estadia`}
            </span>
            {offers.length > 1 && priceDeltaPercent >= 3 && typeof savings === "number" ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 shrink-0">
                <TrendingDown className="h-3 w-3" />
                economize {priceDeltaPercent}%
              </span>
            ) : (
              <span className="text-xs text-primary font-medium shrink-0">
                Ver detalhes
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
