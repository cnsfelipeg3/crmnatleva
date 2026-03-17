import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Maximize2, Bed, Users, Eye, Sparkles, ExternalLink, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildCommercialSummary, getHighlightAmenity } from "./types";
import { toast } from "sonner";
import type { HotelPhoto, SectionDetail, RoomBlock } from "./types";

interface Props {
  name: string;
  photos: HotelPhoto[];
  detail?: SectionDetail;
  sourceUrl?: string;
  getDisplayUrl: (url: string) => string;
  onImageError: (url: string) => void;
  onViewGallery: (name: string) => void;
  onUseRoom: (block: RoomBlock) => void;
}

export default function RoomCard({ name, photos, detail, sourceUrl, getDisplayUrl, onImageError, onViewGallery, onUseRoom }: Props) {
  const [added, setAdded] = useState(false);
  const coverPhoto = photos[0];
  const secondPhoto = photos[1];
  const isOfficial = photos.filter(p => p.source === "official").length > photos.length / 2;
  const summary = buildCommercialSummary(detail);
  const highlight = detail ? getHighlightAmenity(detail.amenities) : null;

  const handleUse = (e: React.MouseEvent) => {
    e.stopPropagation();
    const autoDescription = [summary.line1, summary.line2].filter(Boolean).join(" · ");
    onUseRoom({
      room_name: name,
      description: detail?.description || autoDescription,
      amenities: detail?.amenities || [],
      photos: photos.slice(0, 5),
      source: isOfficial ? "official" : "booking",
    });
    setAdded(true);
    toast.success(`"${name}" adicionado à proposta`, { duration: 2000 });
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div
      onClick={() => onViewGallery(name)}
      className={cn(
        "group relative rounded-xl overflow-hidden border hover:shadow-md cursor-pointer transition-all duration-200 bg-card",
        added
          ? "border-accent/50 shadow-[0_0_16px_-4px_hsl(var(--accent)/0.25)]"
          : "border-border/40 hover:border-accent/30"
      )}
    >
      {/* Added check overlay */}
      {added && (
        <div className="absolute top-3 right-3 z-10 w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center animate-in zoom-in-50 duration-200">
          <Check className="w-3.5 h-3.5" />
        </div>
      )}

      {/* Photo strip */}
      <div className="flex h-44 sm:h-48 relative">
        <div className="flex-[2] overflow-hidden bg-muted relative">
          {coverPhoto && (
            <img
              src={getDisplayUrl(coverPhoto.url)}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => onImageError(coverPhoto.url)}
            />
          )}
        </div>
        {secondPhoto && (
          <div className="flex-[1] overflow-hidden bg-muted border-l border-border/20">
            <img
              src={getDisplayUrl(secondPhoto.url)}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => onImageError(secondPhoto.url)}
            />
          </div>
        )}

        {/* Gradient overlay for name */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 via-black/25 to-transparent pointer-events-none" />

        {/* Room name over photo */}
        <h4 className="absolute bottom-2.5 left-3 text-sm font-bold text-white drop-shadow-sm truncate max-w-[70%] leading-tight">
          {name}
        </h4>

        {/* Photo count */}
        <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
          <Camera className="w-2.5 h-2.5" /> {photos.length}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        {/* Commercial summary */}
        {(summary.line1 || detail?.description) && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
            {summary.line1 || detail?.description}
            {summary.line2 && <><br />{summary.line2}</>}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          {detail?.details?.["Tamanho"] && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 rounded-md px-1.5 py-0.5">
              <Maximize2 className="w-2.5 h-2.5" /> {detail.details["Tamanho"]}
            </span>
          )}
          {detail?.details?.["Cama"] && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 rounded-md px-1.5 py-0.5">
              <Bed className="w-2.5 h-2.5" /> {detail.details["Cama"]}
            </span>
          )}
          {detail?.details?.["Capacidade"] && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 rounded-md px-1.5 py-0.5">
              <Users className="w-2.5 h-2.5" /> {detail.details["Capacidade"]}
            </span>
          )}
          {detail?.details?.["Vista"] && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 rounded-md px-1.5 py-0.5">
              <Eye className="w-2.5 h-2.5" /> {detail.details["Vista"]}
            </span>
          )}
          {highlight && !detail?.details?.["Vista"]?.toLowerCase().includes(highlight.toLowerCase()) && (
            <span className="inline-flex items-center gap-1 text-[10px] text-accent bg-accent/10 rounded-md px-1.5 py-0.5 font-medium">
              <Sparkles className="w-2.5 h-2.5" /> {highlight}
            </span>
          )}
          {isOfficial && (
            <span className="text-[9px] text-success font-medium ml-auto">Oficial</span>
          )}
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="ml-auto text-muted-foreground/50 hover:text-accent transition-colors duration-150 p-0.5"
              title="Ver fonte original"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" className="flex-1 text-[10px] h-7 hover:bg-muted/50 transition-colors duration-150" onClick={(e) => { e.stopPropagation(); onViewGallery(name); }}>
            Explorar fotos
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={added}
            className={cn(
              "flex-1 text-[10px] h-7 gap-1 transition-all duration-200",
              added
                ? "bg-accent/80 text-accent-foreground"
                : "bg-gradient-to-r from-accent to-accent/80 text-accent-foreground hover:scale-[1.01] active:scale-[0.99] shadow-[0_1px_8px_-2px_hsl(var(--accent)/0.3)]"
            )}
            onClick={handleUse}
          >
            {added ? <><Check className="w-3 h-3" /> Adicionado</> : "Usar na proposta"}
          </Button>
        </div>
      </div>
    </div>
  );
}
