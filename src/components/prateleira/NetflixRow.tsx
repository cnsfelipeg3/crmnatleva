import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin, Sparkles, Play, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export type RowItem = {
  id: string;
  slug: string;
  title: string;
  cover?: string | null;
  destination?: string | null;
  shortDescription?: string | null;
  kindLabel?: string | null;
  isPromo?: boolean | null;
  promoBadge?: string | null;
  pricePromo?: number | null;
  priceFrom?: number | null;
  currency?: string | null;
  departureDate?: string | null;
  returnDate?: string | null;
  flexibleDates?: boolean | null;
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

function NetflixCard({ item, index }: { item: RowItem; index: number }) {
  const [hover, setHover] = useState(false);
  const promo = money(item.pricePromo, item.currency ?? "BRL");
  const full = money(item.priceFrom, item.currency ?? "BRL");
  const dateRange = item.flexibleDates
    ? "Datas flexíveis"
    : item.departureDate && item.returnDate
    ? `${fmtDate(item.departureDate)} · ${fmtDate(item.returnDate)}`
    : item.departureDate ? `Saída ${fmtDate(item.departureDate)}` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.04, 0.4), ease: [0.16, 1, 0.3, 1] }}
      className="snap-start shrink-0 w-[68vw] sm:w-[300px] lg:w-[340px]"
    >
      <Link
        to={`/p/${item.slug}`}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="group relative block rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-amber-400/70"
      >
        <motion.div
          animate={{ scale: hover ? 1.04 : 1, y: hover ? -4 : 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="relative aspect-[16/10] rounded-xl overflow-hidden bg-neutral-900 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.8)] ring-1 ring-white/5 group-hover:ring-amber-400/40 group-hover:shadow-[0_25px_60px_-20px_rgba(0,0,0,0.9)]"
          style={{ willChange: "transform" }}
        >
          {item.cover ? (
            <motion.img
              src={item.cover}
              alt={item.title}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
              animate={{ scale: hover ? 1.08 : 1 }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950" />
          )}

          {/* Base gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

          {/* Top ribbons */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2">
            {item.destination && (
              <span className="inline-flex items-center gap-1 bg-black/65 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] text-white/95 border border-white/10">
                <MapPin className="w-3 h-3" /> {item.destination}
              </span>
            )}
            {item.isPromo && item.promoBadge && (
              <span className="inline-flex items-center gap-1 bg-amber-400 text-black px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-lg">
                <Sparkles className="w-3 h-3" /> {item.promoBadge}
              </span>
            )}
          </div>

          {/* Bottom title */}
          <div className="absolute bottom-0 left-0 right-0 p-3.5">
            {item.kindLabel && (
              <span className="inline-block text-[9.5px] uppercase tracking-[0.2em] text-amber-300/90 mb-1">
                {item.kindLabel}
              </span>
            )}
            <h3 className="font-serif text-white text-[15px] sm:text-base leading-snug line-clamp-2 drop-shadow">
              {item.title}
            </h3>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <div className="text-white/95 text-sm font-bold">
                {promo || full || "Sob consulta"}
              </div>
              {dateRange && (
                <span className="text-[10px] text-white/70 inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {dateRange}
                </span>
              )}
            </div>
          </div>

          {/* Hover overlay */}
          <AnimatePresence>
            {hover && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 hidden sm:flex flex-col justify-end p-4 bg-gradient-to-t from-black/95 via-black/70 to-black/10"
              >
                {item.shortDescription && (
                  <motion.p
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.05, duration: 0.3 }}
                    className="text-[12px] text-white/85 line-clamp-3 mb-3"
                  >
                    {item.shortDescription}
                  </motion.p>
                )}
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="flex items-center gap-2"
                >
                  <span className="inline-flex items-center gap-1.5 bg-white text-black text-[12px] font-bold px-3.5 py-1.5 rounded-full">
                    <Play className="w-3.5 h-3.5 fill-black" /> Ver detalhes
                  </span>
                  {promo && full && (
                    <span className="text-[10px] text-white/60 line-through">{full}</span>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Gold underline */}
          <motion.div
            aria-hidden
            className="absolute left-0 right-0 bottom-0 h-[2px] bg-gradient-to-r from-amber-400/0 via-amber-400 to-amber-400/0"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: hover ? 1 : 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: "left" }}
          />
        </motion.div>
      </Link>
    </motion.div>
  );
}

export default function NetflixRow({
  title,
  subtitle,
  items,
  accent = "amber",
}: {
  title: string;
  subtitle?: string;
  items: RowItem[];
  accent?: "amber" | "white";
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const updateArrows = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

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
  }, [items.length]);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-row-card]");
    const step = card ? card.getBoundingClientRect().width + 16 : 320;
    el.scrollBy({ left: dir * step * 1.5, behavior: "smooth" });
  };

  if (!items?.length) return null;

  return (
    <section className="relative py-6 sm:py-8 group/row">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex items-end justify-between gap-4 mb-3">
          <div className="min-w-0">
            <h2 className={cn(
              "font-serif text-xl sm:text-2xl lg:text-[28px] leading-tight",
              accent === "amber" ? "text-white" : "text-white"
            )}>
              {title}
            </h2>
            {subtitle && (
              <p className="text-[12px] sm:text-sm text-white/55 mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className="hidden md:flex items-center gap-1.5 opacity-60 group-hover/row:opacity-100 transition-opacity">
            <button
              onClick={() => scrollBy(-1)}
              disabled={!canPrev}
              aria-label="Anterior"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white text-white hover:text-black border border-white/15 transition-all disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center backdrop-blur"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollBy(1)}
              disabled={!canNext}
              aria-label="Próximo"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white text-white hover:text-black border border-white/15 transition-all disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center backdrop-blur"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative">
        {/* Edge fades */}
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
          className={cn(
            "flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth",
            "px-4 sm:px-6 lg:px-10 py-3",
            "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          )}
          style={{ overscrollBehaviorX: "contain", touchAction: "pan-x pan-y" }}
        >
          {items.map((it, i) => (
            <div data-row-card key={it.id}>
              <NetflixCard item={it} index={i} />
            </div>
          ))}
          <div className="shrink-0 w-2" aria-hidden />
        </div>
      </div>
    </section>
  );
}
