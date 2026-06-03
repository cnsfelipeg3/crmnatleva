import { motion } from "framer-motion";
import { Crown, TrendingUp, ArrowUp } from "lucide-react";

type Row = { rank: number; name: string; revenue: number; me?: boolean; commission?: number };

type Props = {
  myRank: number;
  delta?: number;
  totalAffiliates?: number;
  above?: Row;
  me: Row;
  below?: Row;
};

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function NationalRankCard({ myRank, delta = 0, totalAffiliates, above, me, below }: Props) {
  const toBeat = above ? Math.max(0, above.revenue - me.revenue) : 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-50/60 via-background to-emerald-50/40 dark:from-amber-500/5 dark:to-emerald-500/5 p-5 sm:p-6"
    >
      <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-amber-400/15 blur-3xl" />
      <div className="relative flex flex-col gap-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-amber-700 font-semibold flex items-center gap-1.5">
              <Crown className="h-3 w-3" /> Ranking nacional
            </p>
            <h3 className="font-serif text-3xl sm:text-4xl mt-1">
              Você é o <span className="text-amber-600">#{myRank}</span> do Brasil
            </h3>
            {delta !== 0 && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${delta > 0 ? "text-emerald-700" : "text-rose-600"}`}>
                {delta > 0 ? <ArrowUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />}
                {delta > 0 ? `subiu ${delta} posições essa semana` : `desceu ${Math.abs(delta)} posições`}
              </p>
            )}
            {totalAffiliates && (
              <p className="text-[11px] text-muted-foreground mt-0.5">de {totalAffiliates} afiliados ativos</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {above && <RankRow row={above} dim />}
          <RankRow row={me} highlight />
          {below && <RankRow row={below} dim />}
        </div>

        {above && toBeat > 0 && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 px-4 py-3 text-xs flex items-center justify-between">
            <span className="text-foreground/80">
              Faltam apenas <strong className="text-amber-700">{fmtBRL(toBeat)}</strong> em vendas pra ultrapassar <strong>{above.name}</strong>.
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function RankRow({ row, highlight, dim }: { row: Row; highlight?: boolean; dim?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
      highlight
        ? "bg-gradient-to-r from-amber-400/20 to-emerald-500/10 border border-amber-400/40 shadow-sm"
        : dim
        ? "opacity-60"
        : ""
    }`}>
      <div className={`h-8 w-8 rounded-lg grid place-items-center text-xs font-bold ${
        highlight ? "bg-amber-500 text-emerald-950" : "bg-muted text-muted-foreground"
      }`}>
        #{row.rank}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{row.name}</p>
        <p className="text-[11px] text-muted-foreground">{fmtBRL(row.revenue)} vendidos</p>
      </div>
    </div>
  );
}
