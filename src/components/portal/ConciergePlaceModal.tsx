import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Star, MapPin, ExternalLink, DollarSign } from "lucide-react";
import type { ResolvedPlace } from "@/hooks/useConciergePlace";

interface Props {
  place: ResolvedPlace;
  onClose: () => void;
}

function priceLevelLabel(level: number | null): string {
  if (level === null) return "";
  return "$".repeat(Math.max(1, level));
}

function buildPhotoUrl(ref: string | null): string | null {
  if (!ref) return null;
  const key = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ref}&key=${key}`;
}

function buildEmbedUrl(place: ResolvedPlace): string {
  const key = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) return place.google_maps_url;
  return `https://www.google.com/maps/embed/v1/place?key=${key}&q=place_id:${place.place_id}&language=pt-BR`;
}

export function ConciergePlaceModal({ place, onClose }: Props) {
  const photoUrl = buildPhotoUrl(place.photo_reference);
  const embedUrl = buildEmbedUrl(place);
  const isEmbed = embedUrl.includes("/embed");

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-y-auto">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="text-left">
            <div className="flex flex-col gap-1">
              <span className="text-base font-bold text-foreground">{place.name}</span>
              {place.address && (
                <span className="flex items-start gap-1 text-xs text-muted-foreground font-normal">
                  <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                  {place.address}
                </span>
              )}
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col">
          {photoUrl && (
            <div className="w-full h-48 bg-muted overflow-hidden">
              <img
                src={photoUrl}
                alt={place.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 p-4">
            {place.rating !== null && (
              <div className="flex flex-col gap-1 p-2 rounded-lg bg-muted/50">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Avaliação
                </span>
                <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  {place.rating.toFixed(1)}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({place.user_ratings_total})
                  </span>
                </div>
              </div>
            )}
            {place.price_level !== null && (
              <div className="flex flex-col gap-1 p-2 rounded-lg bg-muted/50">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Preço
                </span>
                <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                  <DollarSign className="w-3.5 h-3.5" />
                  {priceLevelLabel(place.price_level)}
                </div>
              </div>
            )}
            {place.business_status && place.business_status !== "OPERATIONAL" && (
              <div className="col-span-2 text-xs text-orange-600 dark:text-orange-400">
                ⚠️{" "}
                {place.business_status === "CLOSED_TEMPORARILY"
                  ? "Fechado temporariamente"
                  : `Status: ${place.business_status}`}
              </div>
            )}
          </div>

          {isEmbed ? (
            <div className="px-4 pb-4">
              <div className="w-full h-56 rounded-xl overflow-hidden border border-border">
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Mapa de ${place.name}`}
                />
              </div>
            </div>
          ) : (
            <div className="px-4 pb-4 text-xs text-muted-foreground">
              Mapa indisponível · use o link abaixo.
            </div>
          )}

          {place.types && place.types.length > 0 && (
            <div className="px-4 pb-4 flex flex-wrap gap-1">
              {place.types.slice(0, 5).map((t) => (
                <span
                  key={t}
                  className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground capitalize"
                >
                  {t.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border p-3 flex gap-2 sticky bottom-0 bg-background">
          <Button asChild variant="default" className="flex-1 gap-2">
            <a
              href={place.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir no Google Maps
            </a>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
