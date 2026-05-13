import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
  title?: string;
};

export default function GalleryLightbox({ open, images, initialIndex = 0, onClose, title }: Props) {
  const [idx, setIdx] = useState(initialIndex);

  useEffect(() => {
    if (open) setIdx(initialIndex);
  }, [open, initialIndex]);

  const next = useCallback(() => setIdx((p) => (p + 1) % images.length), [images.length]);
  const prev = useCallback(() => setIdx((p) => (p - 1 + images.length) % images.length), [images.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, next, prev]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && images.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Galeria de fotos"
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4 border-b border-white/10 shrink-0"
            style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
          >
            <div className="flex items-center gap-2 text-white min-w-0">
              <ImageIcon className="w-4 h-4 shrink-0 opacity-70" />
              <span className="text-xs sm:text-sm font-medium truncate">
                {title ? `${title} · ` : ""}
                <span className="opacity-70 tabular-nums">
                  {idx + 1} / {images.length}
                </span>
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center transition-colors"
              aria-label="Fechar galeria"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stage */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.img
                key={idx}
                src={images[idx]}
                alt={`Foto ${idx + 1}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-[95vw] max-h-full object-contain select-none"
                draggable={false}
              />
            </AnimatePresence>

            {images.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/25 border border-white/15 backdrop-blur-md text-white flex items-center justify-center transition-colors"
                  aria-label="Foto anterior"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <button
                  onClick={next}
                  className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/25 border border-white/15 backdrop-blur-md text-white flex items-center justify-center transition-colors"
                  aria-label="Próxima foto"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </>
            )}
          </div>

          {/* Thumbs */}
          {images.length > 1 && (
            <div
              className="shrink-0 border-t border-white/10 bg-black/40"
              style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
            >
              <div className="flex gap-2 overflow-x-auto px-3 sm:px-6 py-3 scroll-smooth">
                {images.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setIdx(i)}
                    className={`shrink-0 w-20 h-14 sm:w-24 sm:h-16 rounded-md overflow-hidden border-2 transition-all ${
                      i === idx
                        ? "border-white opacity-100 scale-[1.02]"
                        : "border-transparent opacity-50 hover:opacity-90"
                    }`}
                    aria-label={`Ir para foto ${i + 1}`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
