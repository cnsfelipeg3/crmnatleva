/**
 * HotelPhotoGallery — UX-focused gallery manager for the proposal editor.
 *
 * Goals:
 * - Larger, clean thumbnails (no text overlays covering the image)
 * - Cover photo is unmistakable and easy to change (one click)
 * - Lightbox with arrow navigation, "set as cover" and "remove" actions
 * - Inline label below each thumb, badge for source ("Oficial"/"Manual")
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Star,
  Trash2,
  X,
  Check,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import SmartImage from "@/components/proposal/SmartImage";
import { cn } from "@/lib/utils";

export interface HotelPhoto {
  url: string;
  label?: string;
  room_name?: string;
  category?: string;
  source?: "official" | "manual" | string;
}

interface HotelPhotoGalleryProps {
  photos: HotelPhoto[];
  coverUrl?: string;
  onPhotosChange: (next: HotelPhoto[]) => void;
  onCoverChange: (url: string) => void;
}

export function HotelPhotoGallery({
  photos,
  coverUrl,
  onPhotosChange,
  onCoverChange,
}: HotelPhotoGalleryProps) {
  const cleanPhotos = useMemo(
    () => (photos || []).filter((p) => typeof p?.url === "string" && p.url.trim().length > 0),
    [photos],
  );

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [manualUrl, setManualUrl] = useState("");

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const goPrev = useCallback(() => {
    setLightboxIndex((i) => (i === null ? null : (i - 1 + cleanPhotos.length) % cleanPhotos.length));
  }, [cleanPhotos.length]);
  const goNext = useCallback(() => {
    setLightboxIndex((i) => (i === null ? null : (i + 1) % cleanPhotos.length));
  }, [cleanPhotos.length]);

  // Keyboard navigation in lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, closeLightbox, goPrev, goNext]);

  const handleSetCover = (url: string) => {
    onCoverChange(url);
    toast.success("Foto definida como capa");
  };

  const handleRemove = (idx: number) => {
    const removed = cleanPhotos[idx];
    const next = cleanPhotos.filter((_, i) => i !== idx);
    onPhotosChange(next);
    if (removed?.url === coverUrl) {
      onCoverChange(next[0]?.url || "");
    }
    if (lightboxIndex !== null) {
      if (next.length === 0) closeLightbox();
      else setLightboxIndex(Math.min(lightboxIndex, next.length - 1));
    }
  };

  const handleAddManual = () => {
    const url = manualUrl.trim();
    if (!url) return;
    const next: HotelPhoto[] = [
      ...cleanPhotos,
      { url, label: "Manual", category: "outros", source: "manual" },
    ];
    onPhotosChange(next);
    if (!coverUrl) onCoverChange(url);
    setManualUrl("");
    toast.success("Foto adicionada");
  };

  const current = lightboxIndex !== null ? cleanPhotos[lightboxIndex] : null;
  const currentIsCover = current ? current.url === coverUrl : false;

  return (
    <div className="md:col-span-2 space-y-3 p-3 rounded-xl border border-border/60 bg-muted/20">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold">
            Galeria de fotos
            {cleanPhotos.length > 0 && (
              <span className="ml-1.5 text-muted-foreground font-normal">
                ({cleanPhotos.length})
              </span>
            )}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground hidden sm:block">
          Clique em uma foto para abrir. Use ⭐ para definir como capa.
        </span>
      </div>

      {/* Thumbnails grid — bigger thumbs, label below */}
      {cleanPhotos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {cleanPhotos.map((photo, pIdx) => {
            const isCover = photo.url === coverUrl;
            const badgeLabel =
              photo.source === "official"
                ? "Oficial"
                : photo.source === "manual"
                  ? "Manual"
                  : null;
            const photoLabel = photo.label || photo.room_name || `Foto ${pIdx + 1}`;
            return (
              <div key={`${photo.url}-${pIdx}`} className="group flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => setLightboxIndex(pIdx)}
                  className={cn(
                    "relative aspect-[4/3] w-full overflow-hidden rounded-lg border bg-muted/40 transition-all",
                    isCover
                      ? "border-primary ring-2 ring-primary/40 shadow-md"
                      : "border-border/40 hover:border-primary/40 hover:shadow-sm",
                  )}
                >
                  <SmartImage
                    src={photo.url}
                    alt={photoLabel}
                    className="absolute inset-0 h-full w-full"
                    imgClassName="object-cover"
                    loading="lazy"
                    forceProxy={photo.source === "official"}
                  />

                  {/* Cover badge */}
                  {isCover && (
                    <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-sm">
                      <Star className="h-2.5 w-2.5 fill-current" />
                      CAPA
                    </div>
                  )}

                  {/* Source badge */}
                  {badgeLabel && !isCover && (
                    <div className="absolute top-1.5 left-1.5 z-10 rounded-md bg-background/85 px-1.5 py-0.5 text-[9px] font-medium text-foreground shadow-sm backdrop-blur-sm">
                      {badgeLabel}
                    </div>
                  )}

                  {/* Hover quick actions */}
                  <div className="absolute inset-x-0 top-1.5 flex justify-end gap-1 px-1.5 opacity-0 transition-opacity group-hover:opacity-100 z-10">
                    {!isCover && (
                      <button
                        type="button"
                        title="Definir como capa"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetCover(photo.url);
                        }}
                        className="rounded-md bg-background/90 p-1.5 text-foreground shadow-sm backdrop-blur-sm hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <Star className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      title="Remover foto"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(pIdx);
                      }}
                      className="rounded-md bg-background/90 p-1.5 text-foreground shadow-sm backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </button>
                <p className="truncate px-0.5 text-[11px] text-muted-foreground" title={photoLabel}>
                  {photoLabel}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground italic">
          Nenhuma foto adicionada. Use a busca de mídias acima ou cole uma URL abaixo.
        </p>
      )}

      {/* Manual photo URL input */}
      <div className="flex gap-1.5 items-center">
        <Input
          placeholder="Cole uma URL de imagem e pressione Enter..."
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
          className="h-8 text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddManual();
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={handleAddManual}
          disabled={!manualUrl.trim()}
        >
          Adicionar
        </Button>
      </div>

      {/* Lightbox */}
      {current && lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md"
          onClick={closeLightbox}
        >
          {/* Top bar */}
          <div
            className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-b from-background/80 to-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Badge variant="secondary" className="text-[10px]">
                {lightboxIndex + 1} / {cleanPhotos.length}
              </Badge>
              {current.source === "official" && (
                <Badge variant="outline" className="text-[10px]">Oficial</Badge>
              )}
              {current.source === "manual" && (
                <Badge variant="outline" className="text-[10px]">Manual</Badge>
              )}
              <span className="truncate text-sm font-medium text-foreground">
                {current.label || current.room_name || `Foto ${lightboxIndex + 1}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {currentIsCover ? (
                <Badge className="gap-1 bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" /> Capa atual
                </Badge>
              ) : (
                <Button
                  size="sm"
                  variant="default"
                  className="h-8 gap-1.5"
                  onClick={() => handleSetCover(current.url)}
                >
                  <Star className="h-3.5 w-3.5" /> Definir como capa
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                onClick={() => handleRemove(lightboxIndex)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remover
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={closeLightbox}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Prev/Next */}
          {cleanPhotos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-background/80 text-foreground shadow-lg backdrop-blur-sm hover:bg-background transition-colors"
                aria-label="Foto anterior"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-background/80 text-foreground shadow-lg backdrop-blur-sm hover:bg-background transition-colors"
                aria-label="Próxima foto"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Main image */}
          <div
            className="relative max-h-[82vh] max-w-[88vw] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <SmartImage
              src={current.url}
              alt={current.label || "Foto"}
              className="max-h-[82vh] max-w-[88vw] rounded-lg shadow-2xl"
              imgClassName="object-contain max-h-[82vh] max-w-[88vw]"
              forceProxy={current.source === "official"}
            />
          </div>

          {/* Bottom filmstrip */}
          {cleanPhotos.length > 1 && (
            <div
              className="absolute inset-x-0 bottom-0 z-10 px-4 pb-3 pt-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {cleanPhotos.map((p, i) => {
                  const isActive = i === lightboxIndex;
                  const isCover = p.url === coverUrl;
                  return (
                    <button
                      key={`strip-${p.url}-${i}`}
                      type="button"
                      onClick={() => setLightboxIndex(i)}
                      className={cn(
                        "relative h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-all",
                        isActive
                          ? "border-primary scale-105"
                          : "border-transparent opacity-60 hover:opacity-100",
                      )}
                    >
                      <SmartImage
                        src={p.url}
                        alt=""
                        className="absolute inset-0 h-full w-full"
                        imgClassName="object-cover"
                        loading="lazy"
                        forceProxy={p.source === "official"}
                      />
                      {isCover && (
                        <div className="absolute inset-0 flex items-start justify-start p-0.5">
                          <Star className="h-3 w-3 fill-primary text-primary drop-shadow" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HotelPhotoGallery;
