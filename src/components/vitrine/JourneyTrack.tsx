import { motion } from "framer-motion";
import { Lock, Sparkles } from "lucide-react";
import { LevelTier } from "./useAffiliateLevel";

type Props = {
  tiers: LevelTier[];
  currentId: string;
  nextId: string | null;
  progress: number;
  missingSales: number;
  missingRevenue: number;
};

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function JourneyTrack({
  tiers, currentId, nextId, progress, missingSales, missingRevenue,
}: Props) {
  const sorted = [...tiers].sort((a, b) => a.display_order - b.display_order);
  const currentIdx = sorted.findIndex((t) => t.id === currentId);
  const nextTier = nextId ? sorted.find((t) => t.id === nextId) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-amber-700 font-semibold">
            Sua Jornada NatLeva
          </p>
          <h2 className="font-serif text-2xl mt-1">
            Você está no nível{" "}
            <span className="text-emerald-800">{sorted[currentIdx]?.name}</span>
          </h2>
        </div>
        {nextTier && (
          <div className="text-right text-xs text-muted-foreground">
            Próximo: <span className="font-semibold text-foreground">{nextTier.name}</span>
          </div>
        )}
      </div>

      {/* Trilha visual */}
      <div className="relative px-2 pt-6 pb-2">
        {/* linha base */}
        <div className="absolute left-6 right-6 top-[42px] h-[3px] rounded-full bg-emerald-900/10" />
        {/* linha de progresso */}
        <motion.div
          className="absolute left-6 top-[42px] h-[3px] rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-600"
          initial={{ width: 0 }}
          animate={{
            width: `calc(${Math.min(100, ((currentIdx + progress / 100) / Math.max(1, sorted.length - 1)) * 100)}% - 3rem)`,
          }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />

        <div className="relative grid" style={{ gridTemplateColumns: `repeat(${sorted.length}, 1fr)` }}>
          {sorted.map((t, i) => {
            const reached = i <= currentIdx;
            const isCurrent = i === currentIdx;
            return (
              <div key={t.id} className="flex flex-col items-center text-center gap-1.5">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.08, type: "spring", stiffness: 200, damping: 14 }}
                  className={`relative h-14 w-14 rounded-full grid place-items-center text-2xl transition-all duration-300 ${
                    isCurrent
                      ? "shadow-[0_0_0_4px_rgba(245,200,80,0.25),0_8px_24px_-6px_rgba(13,58,40,0.45)] scale-110"
                      : reached
                      ? "shadow-md"
                      : "grayscale opacity-50"
                  }`}
                  style={{
                    background: reached
                      ? `radial-gradient(120% 120% at 30% 20%, ${t.color}55, ${t.color}22 60%, transparent)`
                      : "#f1f1ee",
                  }}
                >
                  {reached ? t.emoji : <Lock className="h-4 w-4 text-muted-foreground" />}
                  {isCurrent && (
                    <motion.span
                      className="absolute inset-0 rounded-full border-2 border-amber-400/60"
                      animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 2.2, repeat: Infinity }}
                    />
                  )}
                </motion.div>
                <span className={`text-xs font-medium ${reached ? "text-foreground" : "text-muted-foreground"}`}>
                  {t.name}
                </span>
                {isCurrent && (
                  <span className="text-[9px] uppercase tracking-wider text-amber-700 font-semibold">
                    você está aqui
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Próximo nível */}
      {nextTier && (
        <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-50 to-emerald-50/50 dark:from-amber-500/5 dark:to-emerald-500/5 p-5">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Faltam pra desbloquear {nextTier.name}</p>
              <p className="text-xl font-semibold mt-0.5">
                {missingSales > 0 && <span>{missingSales} vendas</span>}
                {missingSales > 0 && missingRevenue > 0 && <span className="text-muted-foreground"> · </span>}
                {missingRevenue > 0 && <span>{fmtBRL(missingRevenue)} em vendas</span>}
                {missingSales === 0 && missingRevenue === 0 && <span>1 passo · você está quase lá</span>}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl">{nextTier.emoji}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{progress}% do caminho</p>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-emerald-900/8 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-400 to-emerald-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.1, ease: "easeOut" }}
            />
          </div>
          {nextTier.perks?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-amber-400/20">
              <p className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold mb-2">
                ao alcançar {nextTier.name} você desbloqueia
              </p>
              <ul className="grid sm:grid-cols-2 gap-1.5 text-sm">
                {nextTier.perks.slice(0, 4).map((p, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <span className="text-foreground/80">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
