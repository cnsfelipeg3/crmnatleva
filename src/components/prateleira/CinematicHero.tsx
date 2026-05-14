import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform, useSpring, useReducedMotion } from "framer-motion";
import { ArrowLeft, Share2, MapPin, Calendar, Sparkles, Play, Images, MessageCircle, Link2, Twitter, Facebook, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
  galleryCount?: number;
  onBack: () => void;
  onShare: () => void;
  onOpenGallery?: () => void;
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
  galleryCount,
  onBack,
  onShare,
  onOpenGallery,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();

  // Responsive flags
  const [isSmall, setIsSmall] = useState(false);
  const [isCoarse, setIsCoarse] = useState(false);
  useEffect(() => {
    setMounted(true);
    const mqSmall = window.matchMedia("(max-width: 640px)");
    const mqCoarse = window.matchMedia("(pointer: coarse)");
    const upd = () => {
      setIsSmall(mqSmall.matches);
      setIsCoarse(mqCoarse.matches);
    };
    upd();
    mqSmall.addEventListener?.("change", upd);
    mqCoarse.addEventListener?.("change", upd);
    return () => {
      mqSmall.removeEventListener?.("change", upd);
      mqCoarse.removeEventListener?.("change", upd);
    };
  }, []);

  // Scroll-driven parallax (reduced em mobile)
  const { scrollY } = useScroll();
  const yRange = isSmall ? 90 : 240;
  const scaleMax = isSmall ? 1.06 : 1.15;
  const y = useSpring(useTransform(scrollY, [0, 800], [0, yRange]), { stiffness: 80, damping: 30, mass: 0.4 });
  const scale = useTransform(scrollY, [0, 800], [1, scaleMax]);
  const overlayOpacity = useTransform(scrollY, [0, 500], [1, 0.6]);

  // Mouse tilt (desativado em touch/mobile)
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const tiltEnabled = !isCoarse && !isSmall && !reduceMotion;
  const onMouseMove = (e: React.MouseEvent) => {
    if (!tiltEnabled) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: px, y: py });
  };
  const onMouseLeave = () => setTilt({ x: 0, y: 0 });

  // Floating particles (bem menos no mobile · GPU-friendly)
  const particleCount = reduceMotion ? 0 : isSmall ? 8 : 24;
  const particles = useMemo(
    () =>
      Array.from({ length: particleCount }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: 40 + Math.random() * 60,
        size: 1 + Math.random() * (isSmall ? 2 : 3),
        delay: Math.random() * 6,
        duration: 8 + Math.random() * 10,
        opacity: 0.15 + Math.random() * 0.5,
      })),
    [particleCount, isSmall]
  );

  // Letterbox menor em mobile
  const letterboxH = isSmall ? 28 : 64;

  return (
    <section
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="relative w-full h-[88vh] sm:h-[92vh] min-h-[500px] max-h-[920px] overflow-hidden bg-black isolate"
      style={{ perspective: 1400, maxWidth: "100vw" }}
    >
      {/* === BACKGROUND IMAGE LAYER (GPU-friendly · sem filter blur em mobile) === */}
      <motion.div
        className="absolute inset-0 will-change-transform"
        style={{ y, scale, x: tiltEnabled ? tilt.x * -30 : 0, transform: "translateZ(0)" }}
      >
        <motion.div
          initial={{ scale: isSmall ? 1.12 : 1.25, opacity: 0 }}
          animate={{ scale: 1.05, opacity: 1 }}
          transition={{ duration: isSmall ? 1.4 : 2.4, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
          style={{ willChange: "transform, opacity" }}
        >
          <motion.img
            src={cover || ""}
            alt=""
            initial={{ scale: 1.0 }}
            animate={{ scale: isSmall ? 1.1 : 1.18 }}
            transition={{ duration: isSmall ? 36 : 26, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
            className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
            draggable={false}
            style={{ willChange: "transform", backfaceVisibility: "hidden" }}
          />
        </motion.div>
      </motion.div>

      {/* === CINEMATIC GRADIENTS === */}
      <motion.div style={{ opacity: overlayOpacity }} className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 via-30% to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/35 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-transparent" />
        {/* Cinematic color cast pulsante */}
        <motion.div
          className="absolute inset-0 mix-blend-overlay bg-[radial-gradient(ellipse_at_30%_60%,rgba(255,180,80,0.55),transparent_60%),radial-gradient(ellipse_at_80%_20%,rgba(80,140,255,0.45),transparent_55%)]"
          animate={{ opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
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
            animate={{ y: [0, -120, 0], opacity: [0, p.opacity, 0] }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
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
        className="absolute top-0 left-0 right-0 bg-black z-20"
        style={{ height: letterboxH }}
        initial={{ y: 0 }}
        animate={{ y: mounted ? -letterboxH : 0 }}
        transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="absolute bottom-0 left-0 right-0 bg-black z-20"
        style={{ height: letterboxH }}
        initial={{ y: 0 }}
        animate={{ y: mounted ? letterboxH : 0 }}
        transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* === TOP CONTROLS === */}
      <div
        className="absolute left-3 right-3 sm:left-4 sm:right-4 flex items-center justify-between z-30 gap-2"
        style={{ top: "max(12px, env(safe-area-inset-top))" }}
      >
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4, duration: 0.6 }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={onBack}
            className="bg-black/40 hover:bg-black/60 text-white border border-white/15 backdrop-blur-md h-9 px-3 text-xs sm:text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Vitrine
          </Button>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="flex items-center gap-2"
        >
          {onOpenGallery && (galleryCount ?? 0) >= 1 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenGallery}
              className="bg-black/40 hover:bg-black/60 text-white border border-white/15 backdrop-blur-md h-9 px-3 text-xs sm:text-sm"
              aria-label="Abrir galeria de fotos"
            >
              <Images className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Fotos</span>
              <span className="ml-1 opacity-80 tabular-nums">{galleryCount}</span>
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={onShare}
            className="bg-black/40 hover:bg-black/60 text-white border border-white/15 backdrop-blur-md h-9 px-3 text-xs sm:text-sm"
          >
            <Share2 className="w-4 h-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Compartilhar</span>
          </Button>
        </motion.div>
      </div>

      {/* === CONTENT === */}
      <div className="absolute inset-0 flex items-end z-10">
        <div
          className="w-full max-w-7xl mx-auto px-4 sm:px-12 pb-14 sm:pb-24"
          style={{
            transform: tiltEnabled
              ? `translate3d(${tilt.x * 14}px, ${tilt.y * 8}px, 0) rotateX(${tilt.y * -2}deg) rotateY(${tilt.x * 2}deg)`
              : undefined,
            transformStyle: "preserve-3d",
          }}
        >
          {/* Top eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.7 }}
            className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-3 sm:mb-5"
          >
            {kindLabel && (
              <Badge className="bg-white/10 text-white border border-white/25 backdrop-blur-md hover:bg-white/15 px-2.5 py-0.5 text-[10px] sm:text-[11px] tracking-[0.18em] uppercase">
                {kindLabel}
              </Badge>
            )}
            {isPromo && promoBadge && (
              <motion.div
                animate={{ scale: [1, 1.04, 1], boxShadow: ["0 0 0 0 rgba(251,191,36,0)", "0 0 0 8px rgba(251,191,36,0)", "0 0 0 0 rgba(251,191,36,0)"] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                className="rounded-full"
              >
                <Badge className="bg-amber-400 text-black hover:bg-amber-400 px-2.5 py-0.5 text-[10px] sm:text-[11px] tracking-wider uppercase font-semibold">
                  <Sparkles className="w-3 h-3 mr-1" /> {promoBadge}
                </Badge>
              </motion.div>
            )}
            {(destination || destinationCountry) && (
              <span className="text-[11px] sm:text-xs text-white/85 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/15 backdrop-blur-md max-w-full">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  {destination}{destinationCountry ? `, ${destinationCountry}` : ""}
                </span>
              </span>
            )}
          </motion.div>

          {/* Title · Netflix-style · quebra inteligente por palavras */}
          {(() => {
            const parts = title.split(" · ");
            const primary = parts[0] ?? title;
            const secondary = parts.slice(1).join(" · ");
            const words = primary.split(" ");
            // delay base para letras (stagger por letra dentro de cada palavra, sequencial entre palavras)
            let letterIdx = 0;
            const baseDelay = 0.55;
            const stepLetter = isSmall ? 0.018 : 0.025;
            const totalLetters = primary.replace(/\s/g, "").length;
            const primaryEnd = baseDelay + totalLetters * stepLetter;

            const secondaryLetters = secondary ? Array.from(secondary) : [];

            return (
              <div className="max-w-full">
                <h1
                  className="font-serif text-white leading-[1.04] tracking-[-0.02em] drop-shadow-[0_10px_40px_rgba(0,0,0,0.7)] relative"
                  style={{ fontSize: "clamp(1.85rem, 6.2vw, 6rem)" }}
                >
                  <span className="relative inline-block w-full">
                    {/* Palavras como blocos · nunca cortam no meio */}
                    {words.map((word, wi) => {
                      const chars = Array.from(word);
                      return (
                        <span
                          key={wi}
                          className="inline-block align-baseline overflow-hidden"
                          style={{ marginRight: "0.28em" }}
                        >
                          <span className="inline-block">
                            {chars.map((ch, ci) => {
                              const idx = letterIdx++;
                              return (
                                <motion.span
                                  key={ci}
                                  className="inline-block"
                                  initial={{ y: "100%", opacity: 0, rotateX: -60 }}
                                  animate={{ y: "0%", opacity: 1, rotateX: 0 }}
                                  transition={{
                                    delay: baseDelay + idx * stepLetter,
                                    duration: 0.9,
                                    ease: [0.16, 1, 0.3, 1],
                                  }}
                                  style={{ transformOrigin: "50% 100%" }}
                                >
                                  {ch}
                                </motion.span>
                              );
                            })}
                          </span>
                        </span>
                      );
                    })}
                    {/* Shimmer sweep · sobreposto */}
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 pointer-events-none whitespace-pre-wrap"
                      initial={{ backgroundPositionX: "-150%", opacity: 0 }}
                      animate={{ backgroundPositionX: ["-150%", "250%"], opacity: [0, 1, 1, 0] }}
                      transition={{
                        backgroundPositionX: { duration: 4, ease: "easeInOut", repeat: Infinity, repeatDelay: 3, delay: primaryEnd + 0.2 },
                        opacity: { duration: 4, ease: "easeInOut", repeat: Infinity, repeatDelay: 3, delay: primaryEnd + 0.2, times: [0, 0.15, 0.85, 1] },
                      }}
                      style={{
                        backgroundImage: "linear-gradient(105deg, transparent 38%, rgba(255,225,170,0.95) 50%, transparent 62%)",
                        backgroundSize: "60% 100%",
                        backgroundRepeat: "no-repeat",
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        color: "transparent",
                      }}
                    >
                      {primary}
                    </motion.span>
                  </span>
                </h1>

                {secondary && (
                  <div
                    className="mt-2 sm:mt-4 font-sans text-white/85 font-light tracking-wide flex items-center gap-2 sm:gap-3 flex-wrap"
                    style={{ perspective: 800, fontSize: "clamp(0.85rem, 1.5vw, 1.4rem)" }}
                  >
                    <motion.span
                      className="h-px bg-amber-300/80 shrink-0"
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: isSmall ? 24 : 48, opacity: 1 }}
                      transition={{ delay: primaryEnd + 0.05, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    />
                    <span className="inline-flex flex-wrap" style={{ transformStyle: "preserve-3d" }}>
                      {secondaryLetters.map((ch, i) => (
                        <span
                          key={i}
                          className="inline-block overflow-hidden align-baseline"
                          style={{ whiteSpace: ch === " " ? "pre" : "normal" }}
                        >
                          <motion.span
                            className="inline-block"
                            initial={{ y: "110%", opacity: 0, rotateX: -75, z: -30 }}
                            animate={{ y: "0%", opacity: 1, rotateX: 0, z: 0 }}
                            transition={{
                              delay: primaryEnd + 0.18 + i * (isSmall ? 0.022 : 0.03),
                              duration: 0.75,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                            style={{ transformOrigin: "50% 100%" }}
                          >
                            {ch}
                          </motion.span>
                        </span>
                      ))}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Subtitle */}
          {shortDescription && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="mt-4 sm:mt-6 text-white/85 text-sm sm:text-lg max-w-2xl leading-relaxed font-light line-clamp-3 sm:line-clamp-none"
            >
              {shortDescription}
            </motion.p>
          )}

          {/* Action chips */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.7 }}
            className="mt-5 sm:mt-7 flex flex-wrap items-center gap-2 sm:gap-3"
          >
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="group relative flex items-center gap-2 bg-white text-black px-4 sm:px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-white/95 transition-colors min-h-[44px] overflow-hidden"
            >
              <motion.span
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                initial={{ x: "-120%" }}
                animate={{ x: ["-120%", "120%"] }}
                transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
                style={{ background: "linear-gradient(110deg, transparent 40%, rgba(255,210,150,0.6) 50%, transparent 60%)" }}
              />
              <Play className="w-4 h-4 fill-current relative" />
              <span className="relative">Ver detalhes</span>
            </motion.button>
            {dateRange && (
              <span className="inline-flex items-center gap-2 text-xs sm:text-sm text-white bg-white/10 border border-white/20 backdrop-blur-md px-3 sm:px-4 py-2.5 rounded-full min-h-[44px]">
                <Calendar className="w-4 h-4 shrink-0" />
                <span className="truncate">{dateRange}</span>
              </span>
            )}
          </motion.div>
        </div>
      </div>

      {/* === SCROLL HINT (oculto em mobile) === */}
      <motion.div
        className="hidden sm:flex absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex-col items-center gap-2 text-white/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 6, 0] }}
        transition={{ opacity: { delay: 2, duration: 1 }, y: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } }}
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
