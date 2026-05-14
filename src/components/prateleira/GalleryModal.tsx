import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Camera, X, Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import GalleryLightbox from "./GalleryLightbox";

type Props = {
  open: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
  title?: string;
};

/**
 * Modal de galeria estilo proposta — hero com thumbnails dentro de um Dialog.
 * Permite expandir para fullscreen via GalleryLightbox.
 */
export default function GalleryModal({ open, images, initialIndex = 0, onClose, title }: Props) {
  const [active, setActive] = useState(initialIndex);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (open) setActive(initialIndex);
  }, [open, initialIndex]);

  const go = useCallback(
    (dir: 1 | -1) => setActive((i) => (i + dir + images.length) % images.length),
    [images.length]
  );

  if (images.length === 0) return null;

  return (
    <>
      <Dialog open={open && !fullscreen} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-card">
          <DialogTitle className="sr-only">{title ? `Galeria · ${title}` : "Galeria"}</DialogTitle>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
            <div className="flex items-center gap-2 min-w-0">
              <Camera className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium truncate">
                {title ? `${title} · ` : ""}
                <span className="text-muted-foreground tabular-nums font-normal">
                  {active + 1} / {images.length}
                </span>
              </span>
            </div>
          </div>

          {/* Hero */}
          <div className="relative aspect-[16/10] bg-muted group/hero">
            <AnimatePresence mode="wait">
              <motion.img
                key={active}
                src={images[active]}
                alt={`${title || "Foto"} ${active + 1}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 w-full h-full object-cover cursor-zoom-in"
                onClick={() => setFullscreen(true)}
                draggable={false}
              />
            </AnimatePresence>

            <button
              onClick={() => setFullscreen(true)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-sm text-white flex items-center justify-center transition-colors"
              aria-label="Tela cheia"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {images.length > 1 && (
              <>
                <button
                  onClick={() => go(-1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover/hero:opacity-100 transition-opacity"
                  aria-label="Foto anterior"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
                <button
                  onClick={() => go(1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover/hero:opacity-100 transition-opacity"
                  aria-label="Próxima foto"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm text-white text-[11px] font-medium flex items-center gap-1.5 tabular-nums">
                  <Camera className="w-3 h-3" /> {active + 1} / {images.length}
                </div>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto px-4 py-3 bg-muted/30 border-t border-border/30">
              {images.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`relative shrink-0 w-20 h-14 sm:w-24 sm:h-16 rounded-md overflow-hidden transition-all ${
                    i === active
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "opacity-55 hover:opacity-100"
                  }`}
                  aria-label={`Foto ${i + 1}`}
                >
                  <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <GalleryLightbox
        open={fullscreen}
        images={images}
        initialIndex={active}
        onClose={() => setFullscreen(false)}
        title={title}
      />
    </>
  );
}
