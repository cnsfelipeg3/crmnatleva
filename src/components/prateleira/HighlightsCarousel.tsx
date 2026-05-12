import { useRef, useState, MouseEvent } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin, Sparkles, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import SmartImage from "./SmartImage";

export type HighlightItem = {
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
};

function money(v?: number | null, currency = "BRL") {
  if (v == null) return null;
  const sym = currency === "USD" ? "US$" : currency === "EUR" ? "€" : "R$";
  return `${sym} ${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

function TiltCard({ item, index }: { item: HighlightItem; index: number }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduced = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), { stiffness: 200, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-12, 12]), { stiffness: 200, damping: 18 });
  const glareX = useTransform(mx, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(my, [-0.5, 0.5], ["0%", "100%"]);
  const [hover, setHover] = useState(false);

  const onMove = (e: MouseEvent<HTMLAnchorElement>) => {
    if (reduced) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const reset = () => { mx.set(0); my.set(0); setHover(false); };

  const promo = money(item.pricePromo, item.currency ?? "BRL");
  const full = money(item.priceFrom, item.currency ?? "BRL");

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 40 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: Math.min(index * 0.06, 0.3), ease: [0.16, 1, 0.3, 1] }}
      style={{ perspective: reduced ? undefined : 1200 }}
      className="snap-start shrink-0 w-[78vw] sm:w-[340px] lg:w-[360px]"
    >
      <Link
        ref={ref}
        to={`/p/${item.slug}`}
        onMouseMove={onMove}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={reset}
        className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 rounded-2xl"
      >
        <motion.div
          style={reduced ? undefined : { rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
          className="relative rounded-2xl overflow-hidden border border-border bg-card shadow-[0_10px_40px_-20px_rgba(0,0,0,0.45)] will-change-transform"
        >
          {/* Image */}
          <div className="relative aspect-[4/5] overflow-hidden bg-muted">
            {item.cover ? (
              <motion.div
                className="absolute inset-0"
                animate={reduced ? undefined : { scale: hover ? 1.08 : 1 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                style={{ willChange: "transform" }}
              >
                <SmartImage
                  src={item.cover}
                  alt={item.title}
                  sizes="(min-width: 1280px) 28vw, (min-width: 768px) 40vw, 80vw"
                  priority
                  pictureClassName="absolute inset-0 w-full h-full"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </motion.div>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/10" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

            {/* Glare */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mix-blend-overlay"
              style={{
                background: `radial-gradient(circle at ${glareX as any} ${glareY as any}, rgba(255,255,255,0.35), transparent 55%)`,
              }}
            />

            {/* Top badges */}
            <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2" style={{ transform: "translateZ(40px)" }}>
              {item.destination && (
                <span className="inline-flex items-center gap-1 bg-black/60 backdrop-blur px-2.5 py-1 rounded-full text-[11px] text-white">
                  <MapPin className="w-3 h-3" /> {item.destination}
                </span>
              )}
              {item.isPromo && item.promoBadge && (
                <Badge className="bg-amber-500 text-black hover:bg-amber-500 shadow-lg">
                  <Sparkles className="w-3 h-3 mr-1" />{item.promoBadge}
                </Badge>
              )}
            </div>

            {/* Bottom content */}
            <div className="absolute bottom-0 left-0 right-0 p-5" style={{ transform: "translateZ(60px)" }}>
              {item.kindLabel && (
                <span className="inline-block text-[10px] uppercase tracking-[0.18em] text-amber-300/90 mb-2">
                  {item.kindLabel}
                </span>
              )}
              <h3 className="font-serif t-h3 t-balance text-white drop-shadow line-clamp-2">
                {item.title}
              </h3>
              {item.shortDescription && (
                <p className="t-body-sm t-pretty text-white/75 mt-1.5 line-clamp-2">{item.shortDescription}</p>
              )}

              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  {promo && full && (
                    <div className="text-[10px] text-white/60 line-through leading-none">{full}</div>
                  )}
                  <div className="t-numeric text-white font-bold text-lg leading-tight">
                    {promo || full || "Sob consulta"}
                  </div>
                </div>
                <motion.span
                  initial={{ opacity: 0.85 }}
                  animate={{ opacity: hover ? 1 : 0.85, x: hover ? 0 : -4 }}
                  className="inline-flex items-center gap-1.5 bg-white text-black text-xs font-semibold px-3 py-2 rounded-full shadow-lg"
                >
                  Ver detalhes <ArrowUpRight className="w-3.5 h-3.5" />
                </motion.span>
              </div>
            </div>
          </div>

          {/* Gold accent line */}
          <motion.div
            aria-hidden
            className="absolute left-0 right-0 bottom-0 h-[3px] bg-gradient-to-r from-amber-500/0 via-amber-400 to-amber-500/0"
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

export default function HighlightsCarousel({ items, title = "Destaques da semana", subtitle = "Selecionados pela curadoria NatLeva", loading = false }: { items: HighlightItem[]; title?: string; subtitle?: string; loading?: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const step = card ? card.getBoundingClientRect().width + 20 : 360;
    el.scrollBy({ left: dir * step * 1.1, behavior: "smooth" });
  };

  if (!loading && (!items || items.length === 0)) return null;

  return (
    <section className="relative py-10 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-amber-500/90 mb-2"
            >
              <Sparkles className="w-3.5 h-3.5" /> Curadoria
            </motion.div>
            <h2 className="font-serif t-h1 t-balance text-foreground">{title}</h2>
            <p className="t-body-sm t-pretty text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => scrollBy(-1)}
              aria-label="Anterior"
              className="w-10 h-10 rounded-full border border-border bg-card hover:bg-foreground hover:text-background transition-colors flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollBy(1)}
              aria-label="Próximo"
              className="w-10 h-10 rounded-full border border-border bg-card hover:bg-foreground hover:text-background transition-colors flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative">
        {/* Edge fades */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-background to-transparent z-10" />

        <div
          ref={trackRef}
          className={cn(
            "flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth",
            "px-4 sm:px-6 lg:px-[max(1.5rem,calc((100vw-80rem)/2))] pb-6 pt-2",
            "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          )}
          style={{ overscrollBehaviorX: "contain" }}
        >
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`sk-${i}`}
                  data-card
                  className="snap-start shrink-0 w-[78vw] sm:w-[340px] lg:w-[360px]"
                  aria-hidden
                >
                  <div className="rounded-2xl overflow-hidden border border-border bg-card">
                    <div className="relative aspect-[4/5] bg-muted overflow-hidden">
                      <div className="absolute inset-0 animate-shimmer bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.06)_50%,transparent_70%)] bg-[length:200%_100%]" />
                      <div className="absolute top-3 left-3 h-6 w-24 rounded-full bg-white/5" />
                      <div className="absolute bottom-5 left-5 right-5 space-y-2">
                        <div className="h-3 w-16 rounded-full bg-white/10" />
                        <div className="h-5 w-3/4 rounded bg-white/15" />
                        <div className="h-3 w-2/3 rounded bg-white/10" />
                        <div className="flex justify-between items-center pt-2">
                          <div className="h-5 w-20 rounded bg-white/15" />
                          <div className="h-7 w-24 rounded-full bg-white/20" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            : items.map((it, i) => (
                <div data-card key={it.id}>
                  <TiltCard item={it} index={i} />
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}
