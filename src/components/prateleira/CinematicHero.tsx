import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { ArrowLeft, Share2, MapPin, Calendar, Sparkles, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Props = {
  cover?: string | null;
  title: string;
  shortDescription?: string | null;
  destination?: string | null;
  destinationCountry?: string | null;
  kindLabel?: string | null;
  promoBadge?: string | null;
  isPromo?: boolean;
  dateRange?: string | null;
  onBack: () => void;
  onShare: () => void;
};

export default function CinematicHero({
  cover,
  title,
  shortDescription,
  destination,
  destinationCountry,
  kindLabel,
  promoBadge,
  isPromo,
  dateRange,
  onBack,
  onShare,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Scroll-driven parallax
  const { scrollY } = useScroll();
  const y = useSpring(useTransform(scrollY, [0, 800], [0, 240]), { stiffness: 80, damping: 30, mass: 0.4 });
  const scale = useTransform(scrollY, [0, 800], [1, 1.15]);
  const overlayOpacity = useTransform(scrollY, [0, 500], [1, 0.6]);

  // Mouse parallax (3D feel)
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const onMouseMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: px, y: py });
  };
  const onMouseLeave = () => setTilt({ x: 0, y: 0 });

  // Floating particles
  const particles = useMemo(
    () =>
      Array.from({ length: 28 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: 40 + Math.random() * 60,
        size: 1 + Math.random() * 3,
        delay: Math.random() * 6,
        duration: 8 + Math.random() * 10,
        opacity: 0.15 + Math.random() * 0.5,
      })),
    []
  );

  const titleWords = title.split(" ");

  return (
    <section
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="relative w-full h-[92vh] min-h-[560px] max-h-[920px] overflow-hidden bg-black isolate"
      style={{ perspective: 1400 }}
    >
      {/* === BACKGROUND IMAGE LAYER (Ken Burns + scroll parallax + mouse tilt) === */}
      <motion.div
        className="absolute inset-0 will-change-transform"
        style={{ y, scale, x: tilt.x * -30 }}
      >
        <motion.div
          initial={{ scale: 1.25, filter: "blur(12px)" }}
          animate={{ scale: 1.05, filter: "blur(0px)" }}
          transition={{ duration: 2.4, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          <motion.img
            src={cover || ""}
            alt=""
            initial={{ scale: 1.0 }}
            animate={{ scale: 1.18 }}
            transition={{ duration: 26, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
            className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
            draggable={false}
          />
        </motion.div>
      </motion.div>

      {/* === CINEMATIC GRADIENTS === */}
      <motion.div style={{ opacity: overlayOpacity }} className="absolute inset-0 pointer-events-none">
        {/* Bottom heavy gradient like Netflix hero */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 via-30% to-transparent" />
        {/* Left side darken for legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />
        {/* Top vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />
        {/* Cinematic color cast */}
        <div className="absolute inset-0 mix-blend-overlay opacity-40 bg-[radial-gradient(ellipse_at_30%_60%,rgba(255,180,80,0.5),transparent_60%),radial-gradient(ellipse_at_80%_20%,rgba(80,140,255,0.4),transparent_55%)]" />
      </motion.div>

      {/* === ANIMATED LIGHT SWEEP === */}
      <motion.div
        className="absolute inset-y-0 -inset-x-1/4 pointer-events-none mix-blend-screen"
        initial={{ x: "-30%", opacity: 0 }}
        animate={{ x: ["-30%", "130%"], opacity: [0, 0.35, 0] }}
        transition={{ duration: 7, ease: "easeInOut", repeat: Infinity, repeatDelay: 4 }}
        style={{
          background: "linear-gradient(110deg, transparent 35%, rgba(255,210,150,0.45) 50%, transparent 65%)",
          width: "60%",
        }}
      />

      {/* === FLOATING PARTICLES === */}
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
            animate={{
              y: [0, -120, 0],
              opacity: [0, p.opacity, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* === GRAIN === */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      {/* === LETTERBOX BARS === */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-16 bg-black z-20"
        initial={{ y: 0 }}
        animate={{ y: mounted ? -64 : 0 }}
        transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-16 bg-black z-20"
        initial={{ y: 0 }}
        animate={{ y: mounted ? 64 : 0 }}
        transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* === TOP CONTROLS === */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-30">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={onBack}
            className="bg-black/40 hover:bg-black/60 text-white border border-white/15 backdrop-blur-md"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Vitrine
          </Button>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={onShare}
            className="bg-black/40 hover:bg-black/60 text-white border border-white/15 backdrop-blur-md"
          >
            <Share2 className="w-4 h-4 mr-1.5" /> Compartilhar
          </Button>
        </motion.div>
      </div>

      {/* === CONTENT === */}
      <div className="absolute inset-0 flex items-end z-10">
        <div
          className="w-full max-w-7xl mx-auto px-6 sm:px-12 pb-20 sm:pb-28"
          style={{
            transform: `translate3d(${tilt.x * 14}px, ${tilt.y * 8}px, 0) rotateX(${tilt.y * -2}deg) rotateY(${tilt.x * 2}deg)`,
            transformStyle: "preserve-3d",
          }}
        >
          {/* Top eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.7 }}
            className="flex flex-wrap items-center gap-2 mb-5"
          >
            {kindLabel && (
              <Badge className="bg-white/10 text-white border border-white/25 backdrop-blur-md hover:bg-white/15 px-3 py-1 text-[11px] tracking-[0.18em] uppercase">
                {kindLabel}
              </Badge>
            )}
            {isPromo && promoBadge && (
              <Badge className="bg-amber-400 text-black hover:bg-amber-400 px-3 py-1 text-[11px] tracking-wider uppercase font-semibold">
                <Sparkles className="w-3 h-3 mr-1" /> {promoBadge}
              </Badge>
            )}
            {(destination || destinationCountry) && (
              <span className="text-xs text-white/85 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/15 backdrop-blur-md">
                <MapPin className="w-3 h-3" />
                {destination}{destinationCountry ? `, ${destinationCountry}` : ""}
              </span>
            )}
          </motion.div>

          {/* Title · Netflix-style: primary + secondary line, letter stagger + shimmer */}
          {(() => {
            const parts = title.split(" · ");
            const primary = parts[0] ?? title;
            const secondary = parts.slice(1).join(" · ");
            const letters = Array.from(primary);
            return (
              <div className="max-w-[95%]">
                <h1
                  className="font-serif text-white leading-[1.02] tracking-[-0.02em] drop-shadow-[0_10px_40px_rgba(0,0,0,0.7)] relative"
                  style={{ fontSize: "clamp(2.5rem, 6.2vw, 6rem)" }}
                >
                  <span className="inline-block overflow-hidden align-baseline relative">
                    {letters.map((ch, i) => (
                      <motion.span
                        key={i}
                        className="inline-block"
                        initial={{ y: "100%", opacity: 0, rotateX: -60 }}
                        animate={{ y: "0%", opacity: 1, rotateX: 0 }}
                        transition={{ delay: 0.55 + i * 0.025, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                        style={{ transformOrigin: "50% 100%", whiteSpace: ch === " " ? "pre" : "normal" }}
                      >
                        {ch}
                </motion.span>
              </span>
            ))}
          </h1>

          {/* Subtitle */}
          {shortDescription && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="mt-6 text-white/85 text-base sm:text-lg max-w-2xl leading-relaxed font-light"
            >
              {shortDescription}
            </motion.p>
          )}

          {/* Action chips */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.7 }}
            className="mt-7 flex flex-wrap items-center gap-3"
          >
            <button className="group flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-white/90 transition-colors">
              <Play className="w-4 h-4 fill-current" />
              Ver detalhes
            </button>
            {dateRange && (
              <span className="inline-flex items-center gap-2 text-sm text-white bg-white/10 border border-white/20 backdrop-blur-md px-4 py-2.5 rounded-full">
                <Calendar className="w-4 h-4" /> {dateRange}
              </span>
            )}
          </motion.div>
        </div>
      </div>

      {/* === SCROLL HINT === */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 text-white/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
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
