import { motion } from "framer-motion";
import { Lock } from "lucide-react";

export type Achievement = {
  code: string;
  title: string;
  desc: string;
  icon: string;
  rare?: boolean;
  unlocked: boolean;
};

export default function AchievementsGrid({
  items,
  title = "Suas Conquistas",
}: {
  items: Achievement[];
  title?: string;
}) {
  const unlockedCount = items.filter((i) => i.unlocked).length;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-700 font-semibold">trofeus</p>
          <h2 className="font-serif text-2xl mt-1">{title}</h2>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {unlockedCount}/{items.length} desbloqueadas
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {items.map((a, i) => (
          <motion.div
            key={a.code}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03, type: "spring", stiffness: 180, damping: 16 }}
            className={`group relative rounded-2xl p-4 text-center border transition-all duration-300 hover:-translate-y-0.5 ${
              a.unlocked
                ? a.rare
                  ? "border-amber-400/50 bg-gradient-to-br from-amber-50 to-amber-100/40 dark:from-amber-500/10 dark:to-amber-500/5 shadow-[0_8px_24px_-12px_rgba(245,200,80,0.55)]"
                  : "border-emerald-700/25 bg-emerald-50/40 dark:bg-emerald-500/5"
                : "border-dashed border-border bg-muted/30 opacity-70"
            }`}
          >
            {a.rare && a.unlocked && (
              <span className="absolute top-1.5 right-1.5 text-[9px] uppercase tracking-wider font-bold text-amber-700 bg-amber-300/40 px-1.5 py-0.5 rounded">
                rara
              </span>
            )}
            <div
              className={`h-14 w-14 mx-auto rounded-2xl grid place-items-center text-3xl mb-2 transition-transform group-hover:scale-110 ${
                a.unlocked
                  ? a.rare
                    ? "bg-gradient-to-br from-amber-300 to-amber-500 shadow-inner"
                    : "bg-emerald-500/15"
                  : "bg-muted"
              }`}
            >
              {a.unlocked ? a.icon : <Lock className="h-5 w-5 text-muted-foreground" />}
            </div>
            <h3 className="text-xs font-semibold leading-tight">{a.title}</h3>
            <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{a.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
