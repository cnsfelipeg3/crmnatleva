import { Star, MapPin, ImageOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { resizeBookingPhoto, type BookingHotel } from "./types";

interface Props {
  hotel: BookingHotel;
  onClick?: (hotel: BookingHotel) => void;
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

export function HotelCard({ hotel, onClick }: Props) {
  const photo = hotel.main_photo_url || hotel.photoUrls?.[0] || null;
  const photoHighRes = photo ? resizeBookingPhoto(photo, "max500") : null;

  const price = hotel.priceBreakdown?.grossPrice?.value;
  const currency = hotel.priceBreakdown?.grossPrice?.currency;
  const striked = hotel.priceBreakdown?.strikethroughPrice?.value;

  const score = hotel.reviewScore;
  const scoreWord = hotel.reviewScoreWord;
  const reviewCount = hotel.reviewCount;
  const stars = hotel.accuratePropertyClass ?? hotel.class;

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
      onClick={() => onClick?.(hotel)}
    >
      <div className="relative aspect-[4/3] bg-muted">
        {photoHighRes ? (
          <img
            src={photoHighRes}
            alt={hotel.name || "Hotel"}
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

        {typeof score === "number" && (
          <div className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-background/90 backdrop-blur px-2 py-1 text-xs font-semibold shadow">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {score.toFixed(1)}
            {scoreWord && <span className="text-muted-foreground font-normal"> · {scoreWord}</span>}
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-semibold text-foreground line-clamp-2 flex-1">
            {hotel.name || "Hotel sem nome"}
          </div>
          {typeof stars === "number" && stars > 0 && (
            <div className="flex shrink-0">
              {Array.from({ length: Math.round(stars) }).map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
              ))}
            </div>
          )}
        </div>

        {hotel.wishlistName && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{hotel.wishlistName}</span>
          </div>
        )}

        {typeof reviewCount === "number" && reviewCount > 0 && (
          <div className="text-xs text-muted-foreground">
            {reviewCount.toLocaleString("pt-BR")} avaliações
          </div>
        )}

        <div className="flex items-end justify-between pt-1">
          <div>
            {striked && striked > (price ?? 0) && (
              <div className="text-xs text-muted-foreground line-through">
                {formatPriceBRL(striked, currency)}
              </div>
            )}
            <div className="text-base font-bold text-foreground">{formatPriceBRL(price, currency)}</div>
            <div className="text-[10px] text-muted-foreground">total da estadia</div>
          </div>
          <Badge variant="secondary" className="text-[10px]">Ver detalhes</Badge>
        </div>
      </div>
    </Card>
  );
}
