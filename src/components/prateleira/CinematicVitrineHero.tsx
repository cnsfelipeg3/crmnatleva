import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useReducedMotion } from "framer-motion";
import { Search, Sparkles, MapPin, ChevronLeft, ChevronRight, Play, Compass } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

type Slide = {
  id: string;
  slug: string;
  title: string;
  cover?: string | null;
  destination?: string | null;
  destinationCountry?: string | null;
  shortDescription?: string | null;
  kindLabel?: string | null;
  promoBadge?: string | null;
  isPromo?: boolean;
};

type Props = {
  slides: Slide[];
  q: string;
  setQ: (v: string) => void;
  sort: string;
  setSort: (v: any) => void;
};

const HEADLINE_PRIMARY = "A próxima viagem";
const HEADLINE_ACCENT = "começa aqui";

export default function CinematicVitrineHero({ slides, q, setQ, sort, setSort }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [idx, setIdx] = useState(0);
  const valid = useMemo(() => slides.filter((s) => !!s.cover).slice(0, 6), [slides]);
  const active = valid[idx];

  useEffect(() => { setMounted(true); }, []);

  // Auto rotate every 6s
  useEffect(() => {
    if (valid.length <= 1) return;
    const t = setInterval(() => setIdx((p) => (p + 1) % valid.length), 6500);
    return () => clearInterval(t);
  }, [valid.length]);

  // Scroll parallax
  const { scrollY } = useScroll();
  const y = useSpring(useTransform(scrollY, [0, 800], [0, 220]), { stiffness: 80, damping: 30, mass: 0.4 });
  const scale = useTransform(scrollY, [0, 800], [1, 1.15]);
  const overlayOpacity = useTransform(scrollY, [0, 500], [1, 0.55]);

  // Mouse tilt
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const onMouseMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setTilt({
      x: (e.clientX - rect.left) / rect.width - 0.5,
      y: (e.clientY - rect.top) / rect.height - 0.5,
    });
  };
  const onMouseLeave = () => setTilt({ x: 0, y: 0 });

  // Particles
  const particles = useMemo(
    () =>
      Array.from({ length: 32 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: 30 + Math.random() * 70,
        size: 1 + Math.random() * 3,
        delay: Math.random() * 6,
        duration: 8 + Math.random() * 12,
        opacity: 0.2 + Math.random() * 0.5,
      })),
    []
  );

  const primaryLetters = Array.from(HEADLINE_PRIMARY);
  const accentLetters = Array.from(HEADLINE_ACCENT);

  return (
    <section
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="relative w-full h-[92vh] min-h-[620px] max-h-[940px] overflow-hidden bg-black isolate"
      style={{ perspective: 1400 }}
    >
      {/* === BACKGROUND CAROUSEL with Ken Burns + parallax === */}
      <motion.div
        className="absolute inset-0 will-change-transform"
        style={{ y, scale, x: tilt.x * -25 }}
      >
        <AnimatePresence mode="sync">
          {active && (
            <motion.div
              key={active.id}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.18, filter: "blur(14px)" }}
              animate={{ opacity: 1, scale: 1.04, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.0, filter: "blur(8px)" }}
              transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.img
                src={active.cover!}
                alt=""
                initial={{ scale: 1.0 }}
                animate={{ scale: 1.18 }}
                transition={{ duration: 22, ease: "linear" }}
                className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                draggable={false}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* === Cinematic gradients === */}
      <motion.div style={{ opacity: overlayOpacity }} className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 via-30% to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-transparent" />
        <div className="absolute inset-0 mix-blend-overlay opacity-50 bg-[radial-gradient(ellipse_at_25%_55%,rgba(255,180,80,0.55),transparent_60%),radial-gradient(ellipse_at_85%_15%,rgba(80,140,255,0.45),transparent_55%)]" />
      </motion.div>

      {/* === Animated light sweep === */}
      <motion.div
        className="absolute inset-y-0 -inset-x-1/4 pointer-events-none mix-blend-screen"
        initial={{ x: "-30%", opacity: 0 }}
        animate={{ x: ["-30%", "130%"], opacity: [0, 0.32, 0] }}
        transition={{ duration: 8, ease: "easeInOut", repeat: Infinity, repeatDelay: 4 }}
        style={{
          background: "linear-gradient(110deg, transparent 35%, rgba(255,210,150,0.45) 50%, transparent 65%)",
          width: "60%",
        }}
      />

      {/* === Floating particles === */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <motion.span
            key={p.id}
            className="absolute rounded-full bg-amber-200"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              boxShadow: `0 0 ${p.size * 4}px rgba(255,210,150,0.9)`,
              opacity: p.opacity,
            }}
            animate={{ y: [0, -130, 0], opacity: [0, p.opacity, 0] }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Grain */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      {/* Letterbox bars */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-16 bg-black z-20"
        initial={{ y: 0 }} animate={{ y: mounted ? -64 : 0 }}
        transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-16 bg-black z-20"
        initial={{ y: 0 }} animate={{ y: mounted ? 64 : 0 }}
        transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* === Top brand strip === */}
      <motion.div
        className="absolute top-4 left-0 right-0 z-30 flex items-center justify-between px-6 sm:px-12"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.6 }}
      >
        <div className="flex items-center gap-2 text-white">
          <div className="w-8 h-8 rounded-md bg-amber-400 grid place-items-center text-black">
            <Compass className="w-4 h-4" />
          </div>
          <div className="leading-none">
            <div className="text-[10px] tracking-[0.3em] uppercase text-white/60">NatLeva</div>
            <div className="font-serif text-base">Prateleira</div>
          </div>
        </div>
        {valid.length > 1 && (
          <div className="hidden sm:flex items-center gap-2">
            {valid.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className="group h-1.5 rounded-full overflow-hidden bg-white/20"
                style={{ width: i === idx ? 36 : 18 }}
                aria-label={`Slide ${i + 1}`}
              >
                {i === idx && (
                  <motion.span
                    key={`bar-${idx}`}
                    className="block h-full bg-white"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 6.4, ease: "linear" }}
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* === CONTENT === */}
      <div className="absolute inset-0 flex items-end z-10">
        <div
          className="w-full max-w-7xl mx-auto px-6 sm:px-12 pb-20 sm:pb-24"
          style={{
            transform: `translate3d(${tilt.x * 14}px, ${tilt.y * 8}px, 0) rotateX(${tilt.y * -2}deg) rotateY(${tilt.x * 2}deg)`,
            transformStyle: "preserve-3d",
          }}
        >
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.7 }}
            className="flex items-center gap-2 mb-5"
          >
            <span className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.3em] uppercase text-amber-300 px-3 py-1 rounded-full bg-white/5 border border-amber-300/30 backdrop-blur-md">
              <Sparkles className="w-3 h-3" /> Curadoria NatLeva
            </span>
          </motion.div>

          {/* Big headline · split em palavras para quebra inteligente e sem corte de descendentes */}
          <h1
            className="font-serif text-white leading-[1.08] tracking-[-0.02em] drop-shadow-[0_10px_40px_rgba(0,0,0,0.7)] max-w-[95%]"
            style={{ fontSize: "clamp(2.1rem, 6.2vw, 6rem)" }}
            aria-label={`${HEADLINE_PRIMARY} ${HEADLINE_ACCENT}`}
          >
            <span className="block">
              <span className="inline-flex flex-wrap gap-x-[0.25em]" aria-hidden>
                {HEADLINE_PRIMARY.split(" ").map((word, wi) => (
                  <span key={wi} className="inline-block overflow-hidden pb-[0.18em] -mb-[0.15em]">
                    <span className="inline-block whitespace-nowrap">
                      {Array.from(word).map((ch, i) => {
                        const idx = HEADLINE_PRIMARY.split(" ").slice(0, wi).join(" ").length + (wi > 0 ? 1 : 0) + i;
                        return (
                          <motion.span
                            key={i}
                            className="inline-block"
                            initial={{ y: "100%", opacity: 0, rotateX: -60 }}
                            animate={{ y: "0%", opacity: 1, rotateX: 0 }}
                            transition={{ delay: 0.55 + idx * 0.025, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                            style={{ transformOrigin: "50% 100%" }}
                          >{ch}</motion.span>
                        );
                      })}
                    </span>
                  </span>
                ))}
              </span>
            </span>
            <span className="block">
              <span className="inline-flex flex-wrap gap-x-[0.25em]" aria-hidden>
                {HEADLINE_ACCENT.split(" ").map((word, wi) => (
                  <span key={wi} className="inline-block overflow-hidden pb-[0.22em] -mb-[0.18em]">
                    <span className="inline-block whitespace-nowrap italic">
                      {Array.from(word).map((ch, i) => {
                        const baseIdx = primaryLetters.length;
                        const idx = baseIdx + HEADLINE_ACCENT.split(" ").slice(0, wi).join(" ").length + (wi > 0 ? 1 : 0) + i;
                        return (
                          <motion.span
                            key={i}
                            className="inline-block"
                            initial={{ y: "100%", opacity: 0, rotateX: -60 }}
                            animate={{ y: "0%", opacity: 1, rotateX: 0 }}
                            transition={{ delay: 0.55 + idx * 0.025, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                              transformOrigin: "50% 100%",
                              backgroundImage: "linear-gradient(120deg, #fde68a 0%, #f59e0b 60%, #fde68a 100%)",
                              WebkitBackgroundClip: "text",
                              backgroundClip: "text",
                              color: "transparent",
                            }}
                          >{ch}</motion.span>
                        );
                      })}
                    </span>
                  </span>
                ))}
              </span>
            </span>
          </h1>

          {/* Slide caption (live) */}
          <div className="mt-5 min-h-[2rem]">
            <AnimatePresence mode="wait">
              {active && (
                <motion.div
                  key={`cap-${active.id}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-3 text-white/80 font-light"
                  style={{ fontSize: "clamp(0.9rem, 1.4vw, 1.15rem)" }}
                >
                  <span className="h-px w-10 bg-amber-300/80" />
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-white">{active.destination}</span>
                    {active.destinationCountry ? <span className="text-white/60">, {active.destinationCountry}</span> : null}
                  </span>
                  <span className="text-white/40">·</span>
                  <span className="line-clamp-1">{active.title}</span>
                  {active.isPromo && active.promoBadge && (
                    <Badge className="bg-amber-400 text-black hover:bg-amber-400 ml-1 text-[10px] tracking-wider uppercase">
                      <Sparkles className="w-3 h-3 mr-1" /> {active.promoBadge}
                    </Badge>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Glass search */}
          <motion.div
            initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mt-7 flex flex-col sm:flex-row gap-3 max-w-2xl"
          >
            <div className="relative flex-1 group">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-300/30 via-white/10 to-amber-300/30 blur-md opacity-60 group-focus-within:opacity-100 transition-opacity" />
              <div className="relative flex items-center bg-black/55 border border-white/20 rounded-2xl backdrop-blur-xl pl-4 pr-2 h-14">
                <Search className="w-4 h-4 text-white/70" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar destino, pacote, hotel..."
                  className="border-0 bg-transparent text-white placeholder:text-white/50 focus-visible:ring-0 h-12 text-base"
                />
                {active && (
                  <Link
                    to={`/p/${active.slug}`}
                    className="hidden sm:inline-flex items-center gap-1.5 bg-white text-black px-4 py-2 rounded-xl font-semibold text-sm hover:bg-white/90"
                  >
                    <Play className="w-4 h-4 fill-current" /> Ver destaque
                  </Link>
                )}
              </div>
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-black/55 border border-white/20 text-white rounded-2xl px-4 h-14 text-sm backdrop-blur-xl"
            >
              <option value="relevance" className="text-foreground">Mais relevantes</option>
              <option value="price_asc" className="text-foreground">Menor preço</option>
              <option value="soon" className="text-foreground">Saindo em breve</option>
              <option value="new" className="text-foreground">Novidades</option>
            </select>
          </motion.div>
        </div>
      </div>

      {/* Side arrows */}
      {valid.length > 1 && (
        <>
          <button
            onClick={() => setIdx((p) => (p - 1 + valid.length) % valid.length)}
            className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/40 hover:bg-black/70 border border-white/15 backdrop-blur-md text-white items-center justify-center"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIdx((p) => (p + 1) % valid.length)}
            className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/40 hover:bg-black/70 border border-white/15 backdrop-blur-md text-white items-center justify-center"
            aria-label="Próximo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Scroll hint */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 text-white/60"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2, duration: 1 }}
      >
        <span className="text-[10px] tracking-[0.3em] uppercase">Scroll</span>
        <motion.div
          className="w-px h-10 bg-gradient-to-b from-white/80 to-transparent"
          animate={{ scaleY: [0.3, 1, 0.3], originY: 0 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </section>
  );
}
