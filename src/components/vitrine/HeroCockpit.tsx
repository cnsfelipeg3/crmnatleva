import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Plane, Sparkles, ArrowRight, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import CountUp from "./CountUp";

type Props = {
  firstName: string;
  missingSales: number;
  nextTierName?: string | null;
  dreamLabel: string;
  dreamPct: number;
  dreamAchieved: number;
  dreamGoal: number;
};

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// Deterministic "random" particles so the layout doesn't jitter on re-render.
const PARTICLES = Array.from({ length: 22 }).map((_, i) => ({
  id: i,
  top: (i * 37) % 100,
  left: (i * 53) % 100,
  size: 1 + ((i * 7) % 3),
  delay: (i % 7) * 0.4,
  dur: 6 + ((i * 3) % 6),
}));

export default function HeroCockpit({
  firstName,
  missingSales,
  nextTierName,
  dreamLabel,
  dreamPct,
  dreamAchieved,
  dreamGoal,
}: Props) {
  const headline =
    missingSales > 0 && nextTierName
      ? `você está a ${missingSales} ${missingSales === 1 ? "venda" : "vendas"} da sua próxima conquista.`
      : `seu próximo capítulo começa agora.`;

  return (
    <motion.section
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[28px] text-white shadow-[0_30px_90px_-30px_rgba(5,40,28,0.65)]"
      style={{
        background:
          "radial-gradient(120% 90% at 15% 10%, #14583d 0%, #0a3a28 40%, #04200f 75%, #020d07 100%)",
      }}
    >
      {/* World map silhouette · extremamente sutil */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07] mix-blend-screen"
        style={{
          backgroundImage:
            "url('https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/World_map_-_low_resolution.svg/1280px-World_map_-_low_resolution.svg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Rotas aéreas animadas */}
      <svg
        aria-hidden
        className="absolute inset-0 w-full h-full opacity-50"
        viewBox="0 0 1200 500"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="routeGold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0" />
            <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="routeEmerald" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0" />
            <stop offset="50%" stopColor="#6ee7b7" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#6ee7b7" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[
          { d: "M -50 340 Q 400 80 1250 280", stroke: "url(#routeGold)", dur: 14 },
          { d: "M -50 200 Q 600 420 1250 120", stroke: "url(#routeEmerald)", dur: 18 },
          { d: "M -50 420 Q 500 200 1250 420", stroke: "url(#routeGold)", dur: 22 },
        ].map((r, i) => (
          <g key={i}>
            <path d={r.d} stroke={r.stroke} strokeWidth="1.2" fill="none" strokeDasharray="4 8" />
            <circle r="3" fill="#fbbf24">
              <animateMotion dur={`${r.dur}s`} repeatCount="indefinite" path={r.d} />
              <animate attributeName="opacity" values="0;1;1;0" dur={`${r.dur}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}
      </svg>

      {/* Partículas douradas */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        {PARTICLES.map((p) => (
          <motion.span
            key={p.id}
            className="absolute rounded-full bg-amber-200/70"
            style={{
              top: `${p.top}%`,
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              filter: "blur(0.5px)",
            }}
            animate={{ y: [0, -18, 0], opacity: [0.2, 0.9, 0.2] }}
            transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Aurora glows */}
      <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-amber-400/15 blur-[120px]" />
      <div className="absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-emerald-400/15 blur-[140px]" />

      {/* Conteúdo */}
      <div className="relative px-6 sm:px-10 lg:px-14 py-12 sm:py-16 lg:py-20 grid lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-14 items-center min-h-[440px]">
        <div className="space-y-7">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/8 border border-amber-300/25 text-amber-200 text-[10px] uppercase tracking-[0.25em] font-semibold backdrop-blur-md"
          >
            <Sparkles className="h-3 w-3" /> NatLeva Partners Club
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.55 }}
            className="font-serif text-[2.2rem] sm:text-5xl lg:text-[3.6rem] leading-[1.05] tracking-tight"
          >
            {firstName},<br />
            <span className="text-white/90">{headline}</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex flex-wrap items-center gap-3 pt-2"
          >
            <Button
              asChild
              className="rounded-full h-12 px-7 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-semibold shadow-[0_10px_30px_-8px_rgba(245,200,80,0.6)] hover:-translate-y-0.5 transition"
            >
              <Link to="/vitrine/pacotes">
                Continuar minha jornada <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-full h-12 px-6 bg-white/5 border-white/25 text-white hover:bg-white/12 hover:text-white backdrop-blur-md"
            >
              <Link to="/vitrine/indicacoes">
                <Compass className="mr-1.5 h-4 w-4" /> Ver minhas oportunidades
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* Cartão "próximo objetivo" */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45, duration: 0.6 }}
          className="relative rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur-xl p-6 sm:p-7 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)]"
        >
          <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
          <div className="flex items-center gap-2 text-amber-200">
            <Plane className="h-4 w-4" />
            <span className="text-[10px] uppercase tracking-[0.22em] font-semibold">Seu próximo objetivo</span>
          </div>
          <h3 className="font-serif text-3xl sm:text-[2rem] mt-3 leading-tight">{dreamLabel}</h3>

          <div className="mt-5 flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/55">conquistado</p>
              <div className="text-xl font-semibold mt-0.5">
                <CountUp value={dreamAchieved} prefix="R$ " />
                <span className="text-white/45 text-sm font-normal"> / {fmtBRL(dreamGoal)}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-amber-200/80">progresso</p>
              <div className="text-3xl font-serif">{Math.round(dreamPct)}%</div>
            </div>
          </div>

          <div className="mt-3 h-2 rounded-full bg-white/12 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-emerald-300 shadow-[0_0_18px_rgba(251,191,36,0.6)]"
              initial={{ width: 0 }}
              animate={{ width: `${dreamPct}%` }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>

          <p className="mt-4 text-xs text-white/60 leading-relaxed">
            cada indicação te aproxima de embarcar nessa.
          </p>
        </motion.div>
      </div>
    </motion.section>
  );
}
