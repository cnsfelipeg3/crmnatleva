import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X, ChevronLeft, ChevronRight, Check, ExternalLink,
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

type ViewMode = "grid" | "lightbox";

export default function RoomGalleryDrawer({
  open, onClose, name, photos, detail,
  getDisplayUrl, onImageError, selectedPhotos, toggleSelect,
}: Props) {
  const [mode, setMode] = useState<ViewMode>("grid");
  const [activeIdx, setActiveIdx] = useState(0);
  const thumbStripRef = useRef<HTMLDivElement>(null);

  // Reset state when closed
  useEffect(() => {
    if (!open) { setMode("grid"); setActiveIdx(0); }
  }, [open]);

  // Scroll active thumbnail into view
  useEffect(() => {
    if (mode !== "lightbox" || !thumbStripRef.current) return;
    const el = thumbStripRef.current.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeIdx, mode]);

  const goNext = useCallback(() => {
    setActiveIdx(prev => (prev + 1) % photos.length);
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setActiveIdx(prev => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const openLightbox = useCallback((idx: number) => {
    setActiveIdx(idx);
    setMode("lightbox");
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (mode === "lightbox") setMode("grid");
        else onClose();
      }
      if (mode === "lightbox") {
        if (e.key === "ArrowRight") goNext();
        if (e.key === "ArrowLeft") goPrev();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, mode, goNext, goPrev, onClose]);

  // Touch swipe for lightbox
  const touchStart = useRef<number | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(diff) > 50) {
      diff > 0 ? goPrev() : goNext();
    }
    touchStart.current = null;
  }, [goNext, goPrev]);

  if (!open) return null;

  const hasDetail = detail && (detail.description || Object.keys(detail.details).length > 0 || detail.amenities.length > 0);
  const currentPhoto = photos[activeIdx];

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative bg-card w-full h-full sm:w-[94vw] sm:h-[92vh] sm:max-w-5xl sm:rounded-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-card shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {mode === "lightbox" && (
              <button
                onClick={() => setMode("grid")}
                className="mr-1 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <h3 className="text-sm sm:text-base font-bold text-foreground truncate">{name}</h3>
            <Badge variant="secondary" className="text-[10px] shrink-0 rounded-full">
              {mode === "lightbox" ? `${activeIdx + 1}/${photos.length}` : `${photos.length} fotos`}
            </Badge>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── GRID MODE ── */}
        {mode === "grid" && (
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-4 space-y-4">
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
                          <span className="text-accent/70">{amenityIcon(a)}</span> {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Photo grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {photos.map((photo, i) => {
                  const isSelected = selectedPhotos.has(photo.url);
                  const tag = getPhotoTag(photo, photos, name);
                  return (
                    <div
                      key={photo.url + i}
                      className={cn(
                        "relative group aspect-[4/3] rounded-lg overflow-hidden border-2 cursor-pointer transition-all duration-150",
                        isSelected ? "border-accent ring-1 ring-accent/30" : "border-transparent hover:border-muted-foreground/20"
                      )}
                      onClick={() => openLightbox(i)}
                    >
                      <img
                        src={getDisplayUrl(photo.url)}
                        alt={photo.description || name}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={() => onImageError(photo.url)}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-150" />
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(photo.url); }}
                        className={cn(
                          "absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-150 border",
                          isSelected
                            ? "bg-accent text-accent-foreground border-accent"
                            : "bg-black/40 text-white border-white/30 opacity-0 group-hover:opacity-100"
                        )}
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      {tag && (
                        <div className={cn("absolute bottom-1.5 left-1.5 text-[7px] font-bold px-1.5 py-0.5 rounded-sm", PHOTO_TAG_CONFIG[tag].className)}>
                          {PHOTO_TAG_CONFIG[tag].label}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── LIGHTBOX MODE ── */}
        {mode === "lightbox" && currentPhoto && (
          <div className="flex-1 flex flex-col min-h-0 bg-black">
            {/* Main image area */}
            <div
              className="flex-1 relative flex items-center justify-center min-h-0 px-2 sm:px-14 py-2"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Nav buttons — hidden on touch, visible on hover */}
              <button
                onClick={goPrev}
                className="absolute left-1 sm:left-3 z-10 w-10 h-10 rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white flex items-center justify-center transition-colors duration-150 hidden sm:flex"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <img
                key={currentPhoto.url}
                src={getDisplayUrl(currentPhoto.url)}
                alt={currentPhoto.description || name}
                className="max-w-full max-h-full object-contain rounded-lg select-none"
                draggable={false}
                referrerPolicy="no-referrer"
                onError={() => onImageError(currentPhoto.url)}
              />

              <button
                onClick={goNext}
                className="absolute right-1 sm:right-3 z-10 w-10 h-10 rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white flex items-center justify-center transition-colors duration-150 hidden sm:flex"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Select + source link buttons */}
              <div className="absolute top-3 right-3 sm:right-16 z-10 flex items-center gap-2">
                <a
                  href={currentPhoto.url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-black/40 text-white/60 border border-white/20 hover:bg-black/60 hover:text-white transition-colors duration-150"
                  title="Ver imagem original"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => toggleSelect(currentPhoto.url)}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-150",
                    selectedPhotos.has(currentPhoto.url)
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-black/40 text-white border-white/30 hover:bg-black/60"
                  )}
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Thumbnail strip */}
            <div className="shrink-0 px-3 py-2.5 bg-black/90 border-t border-white/10">
              <div
                ref={thumbStripRef}
                className="flex gap-1.5 overflow-x-auto scrollbar-hide"
              >
                {photos.map((p, i) => (
                  <button
                    key={p.url + i}
                    onClick={() => setActiveIdx(i)}
                    className={cn(
                      "shrink-0 w-16 h-11 rounded-md overflow-hidden border-2 transition-all duration-150",
                      i === activeIdx
                        ? "border-accent opacity-100 scale-105"
                        : "border-transparent opacity-40 hover:opacity-70"
                    )}
                  >
                    <img
                      src={getDisplayUrl(p.url)}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
