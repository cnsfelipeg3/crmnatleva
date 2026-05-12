import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ChevronLeft, ChevronRight, MapPin, Sparkles, Calendar, MessageCircle, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { RowItem } from "./NetflixRow";

function money(v?: number | null, currency = "BRL") {
  if (v == null) return null;
  const sym = currency === "USD" ? "US$" : currency === "EUR" ? "€" : "R$";
  return `${sym} ${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

function fmtDate(d?: string | null) {
  if (!d) return null;
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch { return d; }
}

function buildWhatsLink(phone: string, item: RowItem) {
  const onlyDigits = (phone || "").replace(/\D/g, "");
  const msg = `Olá! Tenho interesse na viagem "${item.title}"${item.destination ? ` em ${item.destination}` : ""}. Pode me passar mais detalhes?`;
  return `https://wa.me/${onlyDigits}?text=${encodeURIComponent(msg)}`;
}

export type PreviewItem = RowItem & {
  gallery?: string[] | null;
  description?: string | null;
  nights?: number | null;
  hotelName?: string | null;
};

export default function ProductPreviewModal({
  item,
  open,
  onOpenChange,
  whatsapp,
}: {
  item: PreviewItem | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  whatsapp?: string | null;
}) {
  const reduced = useReducedMotion();
  const [idx, setIdx] = useState(0);

  useEffect(() => { if (open) setIdx(0); }, [open, item?.id]);

  if (!item) return null;

  const images = (() => {
    const arr: string[] = [];
    if (item.cover) arr.push(item.cover);
    if (Array.isArray(item.gallery)) {
      item.gallery.forEach((g) => { if (g && !arr.includes(g)) arr.push(g); });
    }
    return arr;
  })();
  const hasMany = images.length > 1;

  const promo = money(item.pricePromo, item.currency ?? "BRL");
  const full = money(item.priceFrom, item.currency ?? "BRL");
  const dateRange = item.flexibleDates
    ? "Datas flexíveis"
    : item.departureDate && item.returnDate
    ? `${fmtDate(item.departureDate)} · ${fmtDate(item.returnDate)}`
    : item.departureDate ? `Saída ${fmtDate(item.departureDate)}` : null;

  const next = () => setIdx((i) => (i + 1) % images.length);
  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "p-0 overflow-hidden border-white/10 bg-[#0a0a0a] text-white",
          "max-w-[min(960px,96vw)] w-[min(960px,96vw)] max-h-[92vh]",
          "rounded-2xl"
        )}
      >
        <DialogTitle className="sr-only">{item.title}</DialogTitle>
        <DialogDescription className="sr-only">
          {item.shortDescription || `Pré-visualização de ${item.title}`}
        </DialogDescription>

        <div className="grid md:grid-cols-[1.15fr_1fr] max-h-[92vh] overflow-hidden">
          {/* Galeria */}
          <div className="relative bg-neutral-950 aspect-[4/3] md:aspect-auto md:min-h-[420px]">
            <AnimatePresence mode="wait">
              {images[idx] ? (
                <motion.div
                  key={images[idx] + idx}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0"
                >
                  <SmartImage
                    src={images[idx]}
                    alt={`${item.title} · imagem ${idx + 1}`}
                    sizes="(min-width: 1024px) 60vw, 95vw"
                    priority={idx === 0}
                    widths={[640, 900, 1280, 1600, 2000]}
                    pictureClassName="absolute inset-0 w-full h-full"
                    className="absolute inset-0 w-full h-full object-cover select-none"
                    draggable={false}
                  />
                </motion.div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950" />
              )}
            </AnimatePresence>

            {/* Gradient + meta */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent pointer-events-none" />

            <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
              {item.destination && (
                <span className="inline-flex items-center gap-1 bg-black/65 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] text-white/95 border border-white/10">
                  <MapPin className="w-3 h-3" aria-hidden /> {item.destination}
                </span>
              )}
              {item.isPromo && item.promoBadge && (
                <span className="inline-flex items-center gap-1 bg-amber-400 text-black px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-lg">
                  <Sparkles className="w-3 h-3" aria-hidden /> {item.promoBadge}
                </span>
              )}
            </div>

            {hasMany && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Imagem anterior"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/55 hover:bg-black/80 border border-white/15 backdrop-blur flex items-center justify-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Próxima imagem"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/55 hover:bg-black/80 border border-white/15 backdrop-blur flex items-center justify-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIdx(i)}
                      aria-label={`Ir para imagem ${i + 1}`}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        i === idx ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Conteúdo */}
          <div className="flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div>
                {item.kindLabel && (
                  <span className="inline-block text-[10px] uppercase tracking-[0.22em] text-amber-300/90 mb-1.5">
                    {item.kindLabel}
                  </span>
                )}
                <h2 className="font-serif text-2xl sm:text-3xl leading-tight text-white">
                  {item.title}
                </h2>
                {(item.destination || dateRange) && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-white/65">
                    {item.destination && (
                      <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" aria-hidden /> {item.destination}</span>
                    )}
                    {dateRange && (
                      <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" aria-hidden /> {dateRange}</span>
                    )}
                    {item.nights ? <span>· {item.nights} noites</span> : null}
                  </div>
                )}
              </div>

              {(item.shortDescription || item.description) && (
                <p className="text-[13.5px] leading-relaxed text-white/80 line-clamp-[8]">
                  {item.shortDescription || item.description}
                </p>
              )}

              {item.hotelName && (
                <div className="text-[12.5px] text-white/60">
                  <span className="text-white/40">Hospedagem · </span>{item.hotelName}
                </div>
              )}
            </div>

            {/* Preço + CTAs */}
            <div className="border-t border-white/10 p-5 sm:p-6 bg-black/40 backdrop-blur space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-[10.5px] uppercase tracking-[0.2em] text-white/45">A partir de</div>
                  {promo && full && (
                    <div className="text-[11px] text-white/45 line-through leading-none">{full}</div>
                  )}
                  <div className="text-white font-bold text-2xl leading-tight">
                    {promo || full || "Sob consulta"}
                  </div>
                </div>
                {item.isPromo && (
                  <span className="inline-flex items-center gap-1 bg-amber-400 text-black px-2.5 py-1 rounded-full text-[11px] font-semibold">
                    <Sparkles className="w-3 h-3" /> Oferta
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Link
                  to={`/p/${item.slug}`}
                  onClick={() => onOpenChange(false)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white text-black hover:bg-amber-400 transition-colors font-semibold text-sm px-4 py-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
                >
                  Abrir página completa <ArrowUpRight className="w-4 h-4" />
                </Link>
                {whatsapp && (
                  <a
                    href={buildWhatsLink(whatsapp, item)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm px-4 py-2.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
                  >
                    <MessageCircle className="w-4 h-4" /> Falar com especialista
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
