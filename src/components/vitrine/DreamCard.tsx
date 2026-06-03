import { motion } from "framer-motion";
import { Plane, Pencil } from "lucide-react";
import CountUp from "./CountUp";
import { Button } from "@/components/ui/button";

type Props = {
  destination: string;
  imageUrl: string;
  goal: number;
  achieved: number;
  inspiration?: string;
};

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function DreamCard({ destination, imageUrl, goal, achieved, inspiration }: Props) {
  const pct = Math.min(100, Math.round((achieved / Math.max(1, goal)) * 100));
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="relative overflow-hidden rounded-3xl border border-emerald-900/15 shadow-[0_20px_60px_-30px_rgba(13,58,40,0.4)] group"
    >
      <div
        className="absolute inset-0 bg-cover bg-center scale-105 group-hover:scale-100 transition-transform duration-[1.6s] ease-out"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10" />

      <div className="relative p-6 sm:p-7 min-h-[260px] flex flex-col justify-between text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-amber-300/90">
            <Plane className="h-4 w-4" />
            <span className="text-[10px] uppercase tracking-[0.22em] font-semibold">
              Seu próximo destino
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-2 gap-1 text-xs"
          >
            <Pencil className="h-3 w-3" /> trocar sonho
          </Button>
        </div>

        <div className="space-y-3">
          <h3 className="font-serif text-3xl sm:text-4xl tracking-tight">{destination}</h3>
          {inspiration && (
            <p className="text-sm text-white/75 max-w-md leading-relaxed">{inspiration}</p>
          )}
          <div className="flex items-end justify-between pt-1">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/55">conquistado</p>
              <div className="text-xl font-semibold">
                <CountUp value={achieved} prefix="R$ " /> <span className="text-white/50 text-sm font-normal">/ {fmtBRL(goal)}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-amber-300">progresso</p>
              <div className="text-2xl font-serif">{pct}%</div>
            </div>
          </div>
          <div className="h-2 rounded-full bg-white/15 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-emerald-300"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
