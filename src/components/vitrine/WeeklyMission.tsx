import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Target, Clock, Coins } from "lucide-react";

type Props = {
  title?: string;
  description: string;
  current: number;
  target: number;
  rewardLabel: string;
  endsAt?: Date | null;
};

function diff(now: Date, end: Date) {
  const ms = Math.max(0, end.getTime() - now.getTime());
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return { d, h, m, done: ms === 0 };
}

export default function WeeklyMission({
  title = "Missão da semana",
  description,
  current,
  target,
  rewardLabel,
  endsAt,
}: Props) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const pct = Math.min(100, Math.round((current / Math.max(1, target)) * 100));
  const end = endsAt ||
    (() => {
      const d = new Date(now);
      const day = d.getDay();
      const until = (7 - day) % 7 || 7;
      d.setDate(d.getDate() + until);
      d.setHours(23, 59, 59, 0);
      return d;
    })();
  const t = diff(now, end);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-emerald-900/15 bg-gradient-to-br from-emerald-50/60 to-amber-50/40 dark:from-emerald-500/5 dark:to-amber-500/5 p-5 sm:p-6"
    >
      <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl" />
      <div className="relative flex flex-col sm:flex-row sm:items-start gap-5">
        <div className="h-12 w-12 rounded-xl bg-emerald-900/10 grid place-items-center shrink-0">
          <Target className="h-5 w-5 text-emerald-800" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-700 font-semibold">
                🎯 {title}
              </p>
              <h3 className="font-serif text-lg sm:text-xl mt-1 leading-tight">{description}</h3>
            </div>
            <span className="text-sm font-semibold tabular-nums">{current}/{target}</span>
          </div>

          <div className="mt-4 h-2.5 rounded-full bg-emerald-900/8 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-400"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 sm:gap-5 text-xs">
            <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
              <Coins className="h-3.5 w-3.5" /> {rewardLabel}
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {t.done ? "Termina hoje" : `Termina em ${t.d}d ${t.h}h ${t.m}min`}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
