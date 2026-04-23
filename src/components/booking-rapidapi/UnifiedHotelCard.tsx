import { Star, MapPin, ImageOff, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  SOURCE_BADGE_CLASSES,
  SOURCE_LABELS,
  type UnifiedHotel,
} from "./unifiedHotelTypes";

interface Props {
  hotel: UnifiedHotel;
  onClick?: (hotel: UnifiedHotel) => void;
  isBestPrice?: boolean;
  comparisonPrice?: { value: number; currency: string; source: string } | null;
}

function formatPrice(value?: number, currency?: string): string {
  if (value === undefined || value === null) return "—";
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency || ""} ${value.toFixed(0)}`;
  }
}

export function UnifiedHotelCard({
  hotel,
  onClick,
  isBestPrice,
  comparisonPrice,
}: Props) {
  const badgeClass = SOURCE_BADGE_CLASSES[hotel.source];
  const sourceLabel = SOURCE_LABELS[hotel.source];

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow flex flex-col"
      onClick={() => onClick?.(hotel)}
    >
      <div className="relative aspect-[4/3] bg-muted">
        {hotel.photoUrl ? (
          <img
            src={hotel.photoUrl}
            alt={hotel.name}
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

        <Badge
          variant="outline"
          className={cn("absolute top-2 left-2 text-xs", badgeClass)}
        >
          {sourceLabel}
        </Badge>

        {typeof hotel.reviewScore === "number" && (
          <div className="absolute top-2 right-2 bg-background/90 backdrop-blur rounded-md px-2 py-1 text-xs flex items-center gap-1 shadow">
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            <span className="font-semibold">{hotel.reviewScore.toFixed(1)}</span>
            {hotel.reviewScoreWord && (
              <span className="text-muted-foreground hidden sm:inline">
                · {hotel.reviewScoreWord}
              </span>
            )}
          </div>
        )}

        {isBestPrice && (
          <Badge className="absolute bottom-2 left-2 bg-emerald-600 text-white gap-1">
            <Check className="h-3 w-3" />
            Melhor preço
          </Badge>
        )}
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm line-clamp-2 flex-1">
            {hotel.name}
          </h3>
          {typeof hotel.stars === "number" && hotel.stars > 0 && (
            <div className="flex shrink-0">
              {Array.from({ length: Math.round(hotel.stars) }).map((_, i) => (
                <Star
                  key={i}
                  className="h-3 w-3 fill-yellow-500 text-yellow-500"
                />
              ))}
            </div>
          )}
        </div>

        {hotel.location && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="line-clamp-1">{hotel.location}</span>
          </div>
        )}

        {typeof hotel.reviewCount === "number" && hotel.reviewCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {hotel.reviewCount.toLocaleString("pt-BR")} avaliações
          </p>
        )}

        {hotel.amenities && hotel.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {hotel.amenities.slice(0, 3).map((a, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] py-0">
                {a}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-auto pt-2 border-t border-border flex items-end justify-between gap-2">
          <div className="flex flex-col">
            {hotel.priceStriked &&
              hotel.priceStriked > (hotel.priceTotal ?? 0) && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatPrice(hotel.priceStriked, hotel.priceCurrency)}
                </span>
              )}
            <span className="text-base font-bold text-foreground">
              {hotel.priceFormatted ||
                formatPrice(hotel.priceTotal, hotel.priceCurrency)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              total da estadia
            </span>
            {typeof hotel.priceTaxes === "number" && hotel.priceTaxes > 0 && (
              <span className="text-[10px] text-muted-foreground">
                + {formatPrice(hotel.priceTaxes, hotel.priceCurrency)} impostos
              </span>
            )}
            {hotel.freeCancellation && (
              <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                <Check className="h-3 w-3" />
                Cancelamento grátis
              </span>
            )}
            {comparisonPrice && (
              <span className="text-[10px] text-muted-foreground mt-0.5">
                {comparisonPrice.source}:{" "}
                {formatPrice(comparisonPrice.value, comparisonPrice.currency)}
              </span>
            )}
          </div>
          <span className="text-xs text-primary font-medium shrink-0">
            Ver detalhes
          </span>
        </div>
      </div>
    </Card>
  );
}
