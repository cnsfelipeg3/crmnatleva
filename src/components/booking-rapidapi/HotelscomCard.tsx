import { Star, MapPin, ImageOff, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UnifiedHotel } from "./unifiedHotelTypes";

interface Props {
  /** UnifiedHotel já normalizado do Hotels.com e com preço convertido pra BRL */
  hotel: UnifiedHotel;
  onClick?: (hotel: UnifiedHotel) => void;
}

function formatBRL(value?: number, currency?: string): string {
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

/**
 * Card visual de hotel da Hotels.com — mesmo padrão do HotelCard (Booking).
 * Diferença: só o badge de fonte muda (rosa) e o clique abre o drawer específico.
 */
export function HotelscomCard({ hotel, onClick }: Props) {
  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
      onClick={() => onClick?.(hotel)}
    >
      {/* Foto principal */}
      <div className="relative aspect-[4/3] bg-muted">
        {hotel.photoUrl ? (
          <img
            src={hotel.photoUrl}
            alt={hotel.name}
            loading="lazy"
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            <ImageOff className="h-8 w-8" />
          </div>
        )}

        {/* Badge de fonte — canto superior esquerdo, rosa */}
        <div className="absolute top-2 left-2">
          <Badge
            className={cn(
              "text-[10px] font-semibold border",
              "bg-rose-100 text-rose-800 border-rose-200",
              "dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900",
            )}
          >
            Hotels.com
          </Badge>
        </div>

        {/* Rating — canto superior direito, igual ao Booking */}
        {typeof hotel.reviewScore === "number" && (
          <div className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-background/90 backdrop-blur px-2 py-1 text-xs font-semibold shadow">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {hotel.reviewScore.toFixed(1)}
            {hotel.reviewScoreWord && (
              <span className="text-muted-foreground font-normal">
                · {hotel.reviewScoreWord}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Conteúdo — mesmo padrão do HotelCard (Booking) */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-semibold text-foreground line-clamp-2 flex-1">
            {hotel.name}
          </div>
          {typeof hotel.stars === "number" && hotel.stars > 0 && (
            <div className="flex shrink-0">
              {Array.from({ length: Math.round(hotel.stars) }).map((_, i) => (
                <Star
                  key={i}
                  className="h-3 w-3 fill-amber-400 text-amber-400"
                />
              ))}
            </div>
          )}
        </div>

        {hotel.location && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{hotel.location}</span>
          </div>
        )}

        {typeof hotel.reviewCount === "number" && hotel.reviewCount > 0 && (
          <div className="text-xs text-muted-foreground">
            {hotel.reviewCount.toLocaleString("pt-BR")} avaliações
          </div>
        )}

        {/* Comodidades em pills — se tiver */}
        {hotel.amenities && hotel.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {hotel.amenities.slice(0, 3).map((a, i) => (
              <span
                key={i}
                className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize"
              >
                {a}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end justify-between pt-1">
          <div>
            {hotel.priceStriked &&
              hotel.priceStriked > (hotel.priceTotal ?? 0) && (
                <div className="text-xs text-muted-foreground line-through">
                  {formatBRL(hotel.priceStriked, hotel.priceCurrency)}
                </div>
              )}
            <div className="text-base font-bold text-foreground">
              {formatBRL(hotel.priceTotal, hotel.priceCurrency)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              total da estadia
            </div>
            {typeof hotel.pricePerNight === "number" &&
              hotel.pricePerNight > 0 && (
                <div className="text-[10px] text-muted-foreground">
                  ~ {formatBRL(hotel.pricePerNight, hotel.priceCurrency)}/noite
                </div>
              )}
            {hotel.freeCancellation && (
              <div className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                <Check className="h-2.5 w-2.5" />
                Cancelamento grátis
              </div>
            )}
          </div>
          <Badge variant="secondary" className="text-[10px]">
            Ver detalhes
          </Badge>
        </div>
      </div>
    </Card>
  );
}
