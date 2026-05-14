import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin, Sparkles, Eye, Calendar, MessageCircle, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import ProductPreviewModal, { type PreviewItem } from "./ProductPreviewModal";
import SmartImage from "./SmartImage";
import { DEFAULT_CARD_SIZES } from "@/lib/imageOptimizer";
import { computeNatlevaPlan, formatMoneyBR } from "@/lib/prateleira/payment-plan";

export type RowItem = {
  id: string;
  slug: string;
  title: string;
  cover?: string | null;
  destination?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  kindLabel?: string | null;
  isPromo?: boolean | null;
  promoBadge?: string | null;
  pricePromo?: number | null;
  priceFrom?: number | null;
  currency?: string | null;
  departureDate?: string | null;
  returnDate?: string | null;
  flexibleDates?: boolean | null;
  gallery?: string[] | null;
  nights?: number | null;
  hotelName?: string | null;
};

function money(v?: number | null, currency = "BRL") {
  if (v == null) return null;
  const sym = currency === "USD" ? "US$" : currency === "EUR" ? "€" : "R$";
  return `${sym} ${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

function fmtDate(d?: string | null) {
  if (!d) return null;
  try {
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch { return d; }
}

function buildWhatsLink(phone: string, item: RowItem) {
  const onlyDigits = (phone || "").replace(/\D/g, "");
  const msg = `Olá! Tenho interesse na viagem "${item.title}"${item.destination ? ` em ${item.destination}` : ""}. Pode me passar mais detalhes?`;
  return `https://wa.me/${onlyDigits}?text=${encodeURIComponent(msg)}`;
}

function NetflixCard({ item, index, whatsapp, onPreview }: { item: RowItem; index: number; whatsapp?: string | null; onPreview: (item: RowItem) => void }) {
  const [hover, setHover] = useState(false);
  const reduced = useReducedMotion();
  const promo = money(item.pricePromo, item.currency ?? "BRL");
  const full = money(item.priceFrom, item.currency ?? "BRL");
  const basePrice = item.pricePromo ?? item.priceFrom ?? null;
  const plan = computeNatlevaPlan(basePrice, item.departureDate, { currency: item.currency ?? "BRL" });
  const dateRange = item.flexibleDates
    ? "Datas flexíveis"
    : item.departureDate && item.returnDate
    ? `${fmtDate(item.departureDate)} · ${fmtDate(item.returnDate)}`
    : item.departureDate ? `Saída ${fmtDate(item.departureDate)}` : null;

  const ariaLabel = `${item.title}${item.destination ? ` · ${item.destination}` : ""}${promo || full ? ` · ${promo || full}` : ""}`;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 20 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.035, 0.32), ease: [0.16, 1, 0.3, 1] }}
      className="snap-start shrink-0 w-[68vw] sm:w-[300px] lg:w-[340px]"
    >
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="group relative"
      >
        <button
          type="button"
          onClick={() => onPreview(item)}
          aria-label={`Pré-visualizar ${ariaLabel}`}
          aria-haspopup="dialog"
          className="block w-full text-left rounded-xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
        >
          <motion.div
            animate={reduced ? undefined : { scale: hover ? 1.035 : 1, y: hover ? -4 : 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative aspect-[16/10] rounded-xl overflow-hidden bg-neutral-900 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.8)] ring-1 ring-white/5 group-hover:ring-amber-400/40 group-hover:shadow-[0_25px_60px_-20px_rgba(0,0,0,0.9)]"
            style={{ willChange: "transform" }}
          >
            {item.cover ? (
              <motion.div
                className="absolute inset-0"
                animate={reduced ? undefined : { scale: hover ? 1.07 : 1 }}
                transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
                style={{ willChange: "transform" }}
              >
                <SmartImage
                  src={item.cover}
                  alt={item.title}
                  sizes={DEFAULT_CARD_SIZES}
                  priority={index < 3}
                  pictureClassName="absolute inset-0 w-full h-full"
                  className="absolute inset-0 w-full h-full object-cover select-none"
                  draggable={false}
                />
              </motion.div>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2">
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

            <div className="absolute bottom-0 left-0 right-0 p-3.5">
              {item.kindLabel && (
                <span className="inline-block text-[9.5px] uppercase tracking-[0.2em] text-amber-300/90 mb-1">
                  {item.kindLabel}
                </span>
              )}
              <h3 className="font-serif t-balance text-white text-[15px] sm:text-base leading-snug line-clamp-2 drop-shadow">
                {item.title}
              </h3>
              <div className="mt-1.5 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  {plan ? (
                    <>
                      <div className="text-[9.5px] uppercase tracking-[0.14em] text-amber-300/90 font-semibold leading-none">
                        Entrada
                      </div>
                      <div className="t-numeric text-white text-[15px] sm:text-base font-bold leading-tight mt-0.5">
                        {formatMoneyBR(plan.entryAmount, plan.currency)}
                      </div>
                      <div className="text-[10.5px] text-white/80 leading-tight mt-0.5">
                        + <span className="font-semibold tabular-nums">{plan.installments}x</span> de{" "}
                        <span className="font-semibold tabular-nums">{formatMoneyBR(plan.installmentAmount, plan.currency)}</span>
                        <span className="text-white/55"> no boleto</span>
                      </div>
                    </>
                  ) : (
                    <div className="t-numeric text-white/95 text-sm font-bold">Sob consulta</div>
                  )}
                </div>
                {dateRange && (
                  <span className="text-[10px] text-white/70 inline-flex items-center gap-1 shrink-0">
                    <Calendar className="w-3 h-3" aria-hidden /> {dateRange}
                  </span>
                )}
              </div>
            </div>

            <AnimatePresence>
              {hover && !reduced && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 hidden sm:flex flex-col justify-end p-4 bg-gradient-to-t from-black/95 via-black/70 to-black/10"
                >
                  {item.shortDescription && (
                    <motion.p
                      initial={{ y: 8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.05, duration: 0.25 }}
                      className="text-[12px] text-white/85 line-clamp-3 mb-3"
                    >
                      {item.shortDescription}
                    </motion.p>
                  )}
                  <motion.div
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.08, duration: 0.25 }}
                    className="flex items-center gap-2 flex-wrap"
                  >
                    <span className="inline-flex items-center gap-1.5 bg-white text-black text-[12px] font-bold px-3.5 py-1.5 rounded-full">
                      <Eye className="w-3.5 h-3.5" aria-hidden /> Pré-visualizar
                    </span>
                    {promo && full && (
                      <span className="text-[10px] text-white/60 line-through">{full}</span>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              aria-hidden
              className="absolute left-0 right-0 bottom-0 h-[2px] bg-gradient-to-r from-amber-400/0 via-amber-400 to-amber-400/0"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: hover ? 1 : 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: "left" }}
            />
          </motion.div>
        </button>

        {/* Quick "abrir página completa" — vai direto para a página do produto sem o modal */}
        <Link
          to={`/p/${item.slug}`}
          aria-label={`Abrir página completa de ${item.title}`}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute z-20 top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full",
            "bg-black/65 hover:bg-white hover:text-black text-white text-[11px] font-semibold",
            "px-2.5 py-1 border border-white/15 backdrop-blur-md shadow-lg",
            "opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100",
            "transition-all duration-200",
            "max-sm:opacity-100"
          )}
        >
          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
          <span className="hidden sm:inline">Página</span>
        </Link>

        {/* Quick WhatsApp CTA · always reachable, also via keyboard */}
        {whatsapp && (
          <a
            href={buildWhatsLink(whatsapp, item)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Falar no WhatsApp sobre ${item.title}`}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "absolute z-20 bottom-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-full",
              "bg-emerald-500/95 hover:bg-emerald-400 text-white text-[11px] font-semibold",
              "px-2.5 py-1.5 border border-emerald-300/30 shadow-lg backdrop-blur-sm",
              "opacity-0 translate-y-1 sm:group-hover:opacity-100 sm:group-hover:translate-y-0",
              "focus-visible:opacity-100 focus-visible:translate-y-0",
              "transition-all duration-300",
              "max-sm:opacity-100 max-sm:translate-y-0"
            )}
          >
            <MessageCircle className="w-3.5 h-3.5" aria-hidden />
            <span className="hidden sm:inline">Especialista</span>
            <span className="sm:hidden">WhatsApp</span>
          </a>
        )}
      </div>
    </motion.div>
  );
}

export default function NetflixRow({
  title,
  subtitle,
  items,
  accent = "amber",
  whatsapp,
}: {
  title: string;
  subtitle?: string;
  items: RowItem[];
  accent?: "amber" | "white";
  whatsapp?: string | null;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [items.length, updateArrows]);

  const scrollBy = useCallback((dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-row-card]");
    const step = card ? card.getBoundingClientRect().width + 16 : 320;
    el.scrollBy({ left: dir * step * 1.5, behavior: "smooth" });
  }, []);

  // Keyboard navigation on the track
  const onTrackKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") { e.preventDefault(); scrollBy(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); scrollBy(-1); }
    else if (e.key === "Home") {
      e.preventDefault();
      trackRef.current?.scrollTo({ left: 0, behavior: "smooth" });
    } else if (e.key === "End") {
      e.preventDefault();
      const el = trackRef.current;
      if (el) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
    }
  };

  const [previewItem, setPreviewItem] = useState<RowItem | null>(null);

  if (!items?.length) return null;

  const regionLabel = `${title}${subtitle ? ` — ${subtitle}` : ""}`;

  return (
    <section
      className="relative py-6 sm:py-8 group/row"
      aria-label={regionLabel}
      aria-roledescription="carrossel"
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex items-end justify-between gap-4 mb-3">
          <div className="min-w-0">
            <h2 className={cn(
              "font-serif t-h2 t-balance",
              accent === "amber" ? "text-white" : "text-white"
            )}>
              {title}
            </h2>
            {subtitle && (
              <p className="t-body-sm t-pretty text-white/55 mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className="hidden md:flex items-center gap-1.5 opacity-60 group-hover/row:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              disabled={!canPrev}
              aria-label={`Anterior em ${title}`}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white text-white hover:text-black border border-white/15 transition-all disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              disabled={!canNext}
              aria-label={`Próximo em ${title}`}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white text-white hover:text-black border border-white/15 transition-all disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
            >
              <ChevronRight className="w-4 h-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className={cn(
          "pointer-events-none absolute left-0 top-0 bottom-0 w-10 sm:w-20 z-10 transition-opacity bg-gradient-to-r from-[#0a0a0a] to-transparent",
          canPrev ? "opacity-100" : "opacity-0"
        )} />
        <div className={cn(
          "pointer-events-none absolute right-0 top-0 bottom-0 w-10 sm:w-20 z-10 transition-opacity bg-gradient-to-l from-[#0a0a0a] to-transparent",
          canNext ? "opacity-100" : "opacity-0"
        )} />

        <div
          ref={trackRef}
          tabIndex={0}
          role="group"
          aria-label={`${title} · use as setas para navegar`}
          onKeyDown={onTrackKeyDown}
          className={cn(
            "flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth py-3",
            // Alinha o início e fim da fileira com o container do título (max-w 1600 + paddings),
            // evitando cards encostados no canto da viewport em telas grandes
            "px-[max(1rem,calc((100vw-1600px)/2+1rem))] sm:px-[max(1.5rem,calc((100vw-1600px)/2+1.5rem))] lg:px-[max(2.5rem,calc((100vw-1600px)/2+2.5rem))]",
            "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 rounded"
          )}
          style={{ overscrollBehaviorX: "contain", touchAction: "pan-x pan-y" }}
        >
          {items.map((it, i) => (
            <div data-row-card key={it.id}>
              <NetflixCard item={it} index={i} whatsapp={whatsapp} onPreview={setPreviewItem} />
            </div>
          ))}
          <div className="shrink-0 w-2" aria-hidden />
        </div>
      </div>

      <ProductPreviewModal
        item={previewItem as PreviewItem | null}
        open={!!previewItem}
        onOpenChange={(v) => { if (!v) setPreviewItem(null); }}
        whatsapp={whatsapp}
      />
    </section>
  );
}
