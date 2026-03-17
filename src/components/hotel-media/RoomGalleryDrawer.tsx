import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  X, ChevronLeft, ChevronRight, Check,
  Wifi, Wind, Tv, LockKeyhole, Wine, Coffee, Droplets, Shirt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPhotoTag, PHOTO_TAG_CONFIG } from "./types";
import type { HotelPhoto, SectionDetail } from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  name: string;
  photos: HotelPhoto[];
  detail?: SectionDetail;
  getDisplayUrl: (url: string) => string;
  onImageError: (url: string) => void;
  selectedPhotos: Set<string>;
  toggleSelect: (url: string) => void;
}

const amenityIcon = (amenity: string) => {
  const a = amenity.toLowerCase();
  if (a.includes("wi-fi") || a.includes("wifi")) return <Wifi className="w-3 h-3" />;
  if (a.includes("ar-condicionado") || a.includes("air")) return <Wind className="w-3 h-3" />;
  if (a.includes("tv")) return <Tv className="w-3 h-3" />;
  if (a.includes("cofre") || a.includes("safe")) return <LockKeyhole className="w-3 h-3" />;
  if (a.includes("minibar") || a.includes("frigobar")) return <Wine className="w-3 h-3" />;
  if (a.includes("café") || a.includes("coffee")) return <Coffee className="w-3 h-3" />;
  if (a.includes("banheir") || a.includes("ducha") || a.includes("banheira")) return <Droplets className="w-3 h-3" />;
  if (a.includes("roupão") || a.includes("chinelo")) return <Shirt className="w-3 h-3" />;
  return <Check className="w-3 h-3" />;
};

export default function RoomGalleryDrawer({
  open, onClose, name, photos, detail,
  getDisplayUrl, onImageError, selectedPhotos, toggleSelect,
}: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!open) { setLightboxIdx(null); }
  }, [open]);

  const goNext = useCallback(() => {
    if (lightboxIdx === null) return;
    setLightboxIdx((lightboxIdx + 1) % photos.length);
  }, [lightboxIdx, photos.length]);

  const goPrev = useCallback(() => {
    if (lightboxIdx === null) return;
    setLightboxIdx((lightboxIdx - 1 + photos.length) % photos.length);
  }, [lightboxIdx, photos.length]);

  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") setLightboxIdx(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIdx, goNext, goPrev]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && lightboxIdx === null) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, lightboxIdx]);

  if (!open) return null;

  const hasDetail = detail && (detail.description || Object.keys(detail.details).length > 0 || detail.amenities.length > 0);

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="relative bg-card w-full sm:w-[90vw] sm:max-w-3xl max-h-[90vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/40 bg-card/95 backdrop-blur-[2px]">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-base font-bold text-foreground truncate">{name}</h3>
            <Badge variant="secondary" className="text-[10px] shrink-0">{photos.length} fotos</Badge>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Detail info */}
          {hasDetail && (
            <div className="space-y-3">
              {detail.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{detail.description}</p>
              )}
              {Object.keys(detail.details).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(detail.details).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5">
                      <span className="text-[10px] text-muted-foreground uppercase">{key}</span>
                      <span className="text-xs font-semibold text-foreground">{val}</span>
                    </div>
                  ))}
                </div>
              )}
              {detail.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {detail.amenities.slice(0, 16).map((a, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5">
                      <span className="text-primary/70">{amenityIcon(a)}</span> {a}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Photo grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {photos.map((photo, i) => {
              const isSelected = selectedPhotos.has(photo.url);
              const tag = getPhotoTag(photo, photos, name);
              return (
                <div
                  key={photo.url + i}
                  className={cn(
                    "relative group aspect-[3/2] rounded-lg overflow-hidden border-2 cursor-pointer transition-all",
                    isSelected ? "border-primary ring-1 ring-primary/30" : "border-transparent hover:border-muted-foreground/20"
                  )}
                  onClick={() => setLightboxIdx(i)}
                >
                  <img
                    src={getDisplayUrl(photo.url)}
                    alt={photo.description || name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => onImageError(photo.url)}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(photo.url); }}
                    className={cn(
                      "absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center transition-all border",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-black/30 text-white border-white/30 opacity-0 group-hover:opacity-100"
                    )}
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  {tag && (
                    <div className={cn("absolute top-1 left-1 text-[7px] font-bold px-1.5 py-0.5 rounded-sm", PHOTO_TAG_CONFIG[tag].className)}>
                      {PHOTO_TAG_CONFIG[tag].label}
                    </div>
                  )}
                  {!tag && photo.source !== "official" && (
                    <div className="absolute bottom-1 left-1 text-[7px] font-bold bg-info/80 text-info-foreground px-1 py-0.5 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      Compl.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Lightbox inside drawer */}
        {lightboxIdx !== null && photos[lightboxIdx] && (
          <div className="absolute inset-0 z-10 bg-black flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 bg-black/90 border-b border-white/10">
              <span className="text-white/50 text-xs">{lightboxIdx + 1}/{photos.length}</span>
              <button onClick={() => setLightboxIdx(null)} className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 relative flex items-center justify-center px-12">
              <button onClick={goPrev} className="absolute left-2 z-10 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <img
                src={getDisplayUrl(photos[lightboxIdx].url)}
                alt=""
                className="max-w-full max-h-full object-contain"
                draggable={false}
                referrerPolicy="no-referrer"
                onError={() => onImageError(photos[lightboxIdx].url)}
              />
              <button onClick={goNext} className="absolute right-2 z-10 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="px-3 py-2 bg-black/90 border-t border-white/10">
              <ScrollArea className="w-full">
                <div className="flex gap-1.5">
                  {photos.map((p, i) => (
                    <button
                      key={p.url + i}
                      onClick={() => setLightboxIdx(i)}
                      className={cn(
                        "shrink-0 w-14 h-10 rounded overflow-hidden border-2 transition-all",
                        i === lightboxIdx ? "border-primary opacity-100 scale-110" : "border-transparent opacity-40 hover:opacity-70"
                      )}
                    >
                      <img src={getDisplayUrl(p.url)} alt="" className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
