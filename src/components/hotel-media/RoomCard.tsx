import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera, Bed, Maximize2, Users, Eye, Globe, Paperclip, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { getConfidenceLevel, buildCommercialSummary, getHighlightAmenity, getPhotoTag, PHOTO_TAG_CONFIG } from "./types";
import type { HotelPhoto, SectionDetail, RoomBlock } from "./types";

interface Props {
  name: string;
  photos: HotelPhoto[];
  detail?: SectionDetail;
  getDisplayUrl: (url: string) => string;
  onImageError: (url: string) => void;
  onViewGallery: (name: string) => void;
  onUseRoom: (block: RoomBlock) => void;
}

const CONFIDENCE_COLORS: Record<string, string> = {
  alta: "border-success/30 text-success bg-success/10",
  media: "border-warning/30 text-warning bg-warning/10",
  revisar: "border-destructive/30 text-destructive bg-destructive/10",
};

export default function RoomCard({ name, photos, detail, getDisplayUrl, onImageError, onViewGallery, onUseRoom }: Props) {
  const coverPhoto = photos[0];
  const secondPhoto = photos[1];
  const avgConfidence = photos.reduce((s, p) => s + (p.confidence || 0.5), 0) / photos.length;
  const confidenceLevel = getConfidenceLevel(avgConfidence);
  const isOfficial = photos.filter(p => p.source === "official").length > photos.length / 2;
  const summary = buildCommercialSummary(detail);
  const highlight = detail ? getHighlightAmenity(detail.amenities) : null;
  const coverTag = coverPhoto ? getPhotoTag(coverPhoto, photos, name) : null;

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
  };

  return (
    <div
      onClick={() => onViewGallery(name)}
      className="group relative rounded-xl overflow-hidden border border-border/40 hover:border-primary/30 hover:shadow-lg transition-all bg-card cursor-pointer"
    >
      {/* Photo strip */}
      <div className="flex h-40 sm:h-44">
        <div className="flex-[2] overflow-hidden bg-muted relative">
          {coverPhoto && (
            <>
            <img
              src={getDisplayUrl(coverPhoto.url)}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => onImageError(coverPhoto.url)}
            />
            {coverTag && (
              <div className={cn("absolute bottom-1.5 left-1.5 text-[7px] font-bold px-1.5 py-0.5 rounded-sm", PHOTO_TAG_CONFIG[coverTag].className)}>
                {PHOTO_TAG_CONFIG[coverTag].label}
              </div>
            )}
            </>
          )}
        </div>
        {secondPhoto && (
          <div className="flex-[1] overflow-hidden bg-muted border-l border-border/20">
            <img
              src={getDisplayUrl(secondPhoto.url)}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => onImageError(secondPhoto.url)}
            />
          </div>
        )}
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
          <Camera className="w-2.5 h-2.5" /> {photos.length}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">{name}</h4>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", CONFIDENCE_COLORS[confidenceLevel])}>
              {confidenceLevel === "alta" ? "Alta" : confidenceLevel === "media" ? "Média" : "Revisar"}
            </Badge>
            {isOfficial ? (
              <span className="text-[9px] text-success flex items-center gap-0.5"><Globe className="w-2.5 h-2.5" /> Oficial</span>
            ) : (
              <span className="text-[9px] text-info flex items-center gap-0.5"><Paperclip className="w-2.5 h-2.5" /> Compl.</span>
            )}
          </div>
        </div>

        {/* Commercial summary — max 2 lines, truncated */}
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
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" className="flex-1 text-[10px] h-7" onClick={(e) => { e.stopPropagation(); onViewGallery(name); }}>
            Ver galeria
          </Button>
          <Button type="button" size="sm" className="flex-1 text-[10px] h-7 gap-1" onClick={handleUse}>
            Usar ▶
          </Button>
        </div>
      </div>
    </div>
  );
}
