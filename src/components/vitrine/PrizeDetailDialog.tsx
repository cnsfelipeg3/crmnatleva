import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Flame,
  Sparkles,
  Trophy,
  Clock,
  CheckCircle2,
  Star,
  Play,
  Quote,
  Share2,
  X,
  MapPin,
  Gift,
  Crown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface PrizeDetail {
  id: string;
  kind: "campaign" | "level";
  name: string;
  tagline: string;
  prize: string;
  prizeValue?: string;
  heroImage: string;
  prizeImage?: string;
  videoUrl?: string; // YouTube embed url (https://www.youtube.com/embed/...)
  gallery: string[];
  accent: string;
  accentDark?: string;
  longDescription: string;
  psychologyHook?: string;
  powerLaw?: string;
  deadline?: string;
  competitors?: number;
  whatsIncluded: string[];
  experienceSteps?: { title: string; detail: string }[];
  testimonials?: { name: string; role: string; quote: string; avatar?: string }[];
  cta: string;
  ranking?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prize: PrizeDetail | null;
  onPrimaryAction?: (prize: PrizeDetail) => void;
}

function useCountdown(deadline?: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, [deadline]);
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - now;
  if (diff <= 0) return { days: 0, hours: 0, expired: true };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  return { days, hours, expired: false };
}

export function PrizeDetailDialog({ open, onOpenChange, prize, onPrimaryAction }: Props) {
  const [activeMedia, setActiveMedia] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const countdown = useCountdown(prize?.deadline);

  useEffect(() => {
    if (open) {
      setActiveMedia(0);
      setShowVideo(false);
    }
  }, [open, prize?.id]);

  if (!prize) return null;

  const medias = prize.gallery.length ? prize.gallery : [prize.heroImage];
  const currentMedia = medias[activeMedia] || prize.heroImage;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden gap-0 bg-background border-0 max-h-[92vh] overflow-y-auto rounded-3xl">
        {/* Close button absolute */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-50 h-9 w-9 rounded-full bg-black/55 backdrop-blur-md text-white grid place-items-center hover:bg-black/80 transition-all"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        {/* ============ HERO MEDIA ============ */}
        <div className="relative h-[420px] sm:h-[480px] overflow-hidden bg-black">
          <AnimatePresence mode="wait">
            {showVideo && prize.videoUrl ? (
              <motion.div
                key="video"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0"
              >
                <iframe
                  src={`${prize.videoUrl}?autoplay=1&rel=0&modestbranding=1`}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  title={prize.name}
                />
              </motion.div>
            ) : (
              <motion.img
                key={currentMedia}
                src={currentMedia}
                alt={prize.name}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
          </AnimatePresence>

          {!showVideo && (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/10" />
              <div
                className="absolute inset-0 mix-blend-overlay opacity-60"
                style={{ background: `linear-gradient(135deg, ${prize.accent}66, transparent 60%)` }}
              />
            </>
          )}

          {/* Top badges */}
          {!showVideo && (
            <div className="absolute top-5 left-5 flex items-center gap-2 z-10">
              {prize.kind === "campaign" && (
                <Badge className="bg-rose-500/95 text-white border-0 backdrop-blur-md gap-1.5 px-2.5 py-1 shadow-lg">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                  </span>
                  AO VIVO
                </Badge>
              )}
              {prize.kind === "level" && (
                <Badge className="bg-gradient-to-r from-amber-400 to-yellow-600 text-black border-0 gap-1.5 px-2.5 py-1 shadow-lg">
                  <Crown className="h-3 w-3" /> NÍVEL EXCLUSIVO
                </Badge>
              )}
              {countdown && !countdown.expired && (
                <div className="bg-black/60 backdrop-blur-md rounded-full px-3 py-1 text-white text-[11px] font-semibold flex items-center gap-1.5 border border-white/10">
                  <Clock className="h-3 w-3" /> {countdown.days}d {countdown.hours}h restantes
                </div>
              )}
            </div>
          )}

          {/* Title + tagline */}
          {!showVideo && (
            <div className="absolute bottom-6 left-6 right-6 text-white z-10">
              <p
                className="text-[10px] uppercase tracking-[0.3em] font-semibold mb-2 opacity-90"
                style={{ color: "#fde68a" }}
              >
                {prize.kind === "campaign" ? "Campanha exclusiva" : "Prêmio de nível"} · {prize.id}
              </p>
              <h2 className="font-serif text-3xl sm:text-5xl leading-[1.05] drop-shadow-lg max-w-3xl">
                {prize.name}
              </h2>
              <p className="text-base sm:text-lg mt-3 opacity-95 max-w-2xl font-light italic">
                {prize.tagline}
              </p>
            </div>
          )}

          {/* Play video button */}
          {prize.videoUrl && !showVideo && (
            <button
              onClick={() => setShowVideo(true)}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-20 w-20 rounded-full bg-white/95 hover:bg-white grid place-items-center shadow-2xl transition-all hover:scale-110 group z-10"
              aria-label="Ver vídeo"
            >
              <Play className="h-8 w-8 text-black fill-black ml-1 group-hover:scale-110 transition-transform" />
              <span className="absolute inset-0 rounded-full ring-4 ring-white/30 animate-ping" />
            </button>
          )}
        </div>

        {/* ============ THUMBNAIL STRIP ============ */}
        {!showVideo && medias.length > 1 && (
          <div className="px-6 pt-4 flex gap-2 overflow-x-auto scrollbar-none">
            {medias.map((m, i) => (
              <button
                key={i}
                onClick={() => setActiveMedia(i)}
                className={`relative shrink-0 h-16 w-24 rounded-lg overflow-hidden border-2 transition-all ${
                  i === activeMedia
                    ? "border-foreground scale-105 shadow-lg"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img src={m} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* ============ CONTENT ============ */}
        <div className="px-6 sm:px-8 py-6 space-y-6">
          {/* Psychology hook */}
          {prize.psychologyHook && (
            <div
              className="rounded-2xl p-4 border-l-4 italic"
              style={{
                borderColor: prize.accent,
                background: `linear-gradient(90deg, ${prize.accent}12, transparent)`,
              }}
            >
              <p className="text-sm font-medium leading-relaxed">"{prize.psychologyHook}"</p>
              {prize.powerLaw && (
                <p
                  className="text-[10px] uppercase tracking-wider font-semibold mt-2 not-italic"
                  style={{ color: prize.accent }}
                >
                  {prize.powerLaw}
                </p>
              )}
            </div>
          )}

          {/* Prize banner */}
          {prize.prizeImage && (
            <div
              className="relative rounded-2xl overflow-hidden border-2 shadow-md grid grid-cols-[140px_1fr] sm:grid-cols-[200px_1fr]"
              style={{ borderColor: `${prize.accent}50` }}
            >
              <div className="relative h-32 sm:h-36 bg-muted overflow-hidden">
                <img src={prize.prizeImage} alt={prize.prize} className="w-full h-full object-cover" />
              </div>
              <div
                className="p-4 flex flex-col justify-center"
                style={{ background: `linear-gradient(135deg, ${prize.accent}18, transparent)` }}
              >
                <p
                  className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-1"
                  style={{ color: prize.accent }}
                >
                  <Trophy className="h-3 w-3" /> O que você leva pra casa
                </p>
                <p className="font-serif text-xl sm:text-2xl leading-tight mt-1">{prize.prize}</p>
                {prize.prizeValue && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Valor de mercado{" "}
                    <span className="font-bold text-foreground">{prize.prizeValue}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Long description */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-muted-foreground mb-2">
              A história por trás do prêmio
            </p>
            <p className="text-[15px] leading-relaxed text-foreground/85 whitespace-pre-line">
              {prize.longDescription}
            </p>
          </div>

          {/* What's included */}
          {prize.whatsIncluded.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
              <p className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Gift className="h-4 w-4" style={{ color: prize.accent }} />
                Tudo que está incluso
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {prize.whatsIncluded.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <CheckCircle2
                      className="h-4 w-4 mt-0.5 shrink-0"
                      style={{ color: prize.accent }}
                    />
                    <span className="text-foreground/85">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Experience timeline */}
          {prize.experienceSteps && prize.experienceSteps.length > 0 && (
            <div>
              <p className="text-sm font-semibold flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4" style={{ color: prize.accent }} /> Como vai ser a experiência
              </p>
              <ol className="space-y-3 border-l-2 pl-5 ml-2" style={{ borderColor: `${prize.accent}40` }}>
                {prize.experienceSteps.map((step, i) => (
                  <li key={i} className="relative">
                    <span
                      className="absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-background"
                      style={{ background: prize.accent }}
                    />
                    <p className="font-semibold text-sm">{step.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Testimonials */}
          {prize.testimonials && prize.testimonials.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Star className="h-4 w-4 fill-amber-500 text-amber-500" /> Quem já levou conta como foi
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {prize.testimonials.map((t, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-border/60 p-4 bg-card relative"
                  >
                    <Quote
                      className="absolute top-3 right-3 h-5 w-5 opacity-20"
                      style={{ color: prize.accent }}
                    />
                    <p className="text-sm italic text-foreground/85 leading-relaxed">"{t.quote}"</p>
                    <div className="mt-3 flex items-center gap-2">
                      <div
                        className="h-9 w-9 rounded-full grid place-items-center text-xs font-bold text-white"
                        style={{ background: prize.accent }}
                      >
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold">{t.name}</p>
                        <p className="text-[10px] text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Urgency footer */}
          {(countdown || prize.competitors) && (
            <div
              className="rounded-2xl p-4 flex flex-wrap items-center gap-4 justify-between"
              style={{ background: `linear-gradient(135deg, ${prize.accent}14, transparent)` }}
            >
              {prize.competitors && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Concorrência
                  </p>
                  <p className="font-bold text-lg">
                    {prize.competitors} afiliados na disputa
                  </p>
                </div>
              )}
              {countdown && !countdown.expired && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Janela fecha em
                  </p>
                  <p className="font-bold text-lg" style={{ color: prize.accent }}>
                    {countdown.days}d {countdown.hours}h
                  </p>
                </div>
              )}
              <div className="flex-1 min-w-[160px] text-right">
                <p className="text-xs italic text-muted-foreground">
                  Quem se mexe hoje, embarca. Quem espera, assiste.
                </p>
              </div>
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 sticky bottom-0 bg-gradient-to-t from-background via-background to-background/80 pt-3 pb-1 -mx-6 sm:-mx-8 px-6 sm:px-8 border-t border-border/40">
            <Button
              type="button"
              size="lg"
              onClick={() => {
                onPrimaryAction?.(prize);
                onOpenChange(false);
              }}
              className="flex-1 rounded-full py-6 font-semibold text-base hover:scale-[1.02] transition-all gap-2 border-0 text-white"
              style={{
                background: `linear-gradient(135deg, ${prize.accent}, ${prize.accentDark || prize.accent})`,
                boxShadow: `0 10px 28px -10px ${prize.accent}`,
              }}
            >
              <Flame className="h-5 w-5" /> {prize.cta} <Sparkles className="h-4 w-4 opacity-80" />
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={() => {
                const url = window.location.href;
                if (navigator.share) {
                  navigator.share({ title: prize.name, text: prize.tagline, url }).catch(() => {});
                } else {
                  navigator.clipboard?.writeText(url);
                }
              }}
              className="rounded-full px-6 gap-2"
            >
              <Share2 className="h-4 w-4" /> Compartilhar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
