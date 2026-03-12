import { motion } from "framer-motion";
import { CircleDollarSign, CheckCircle2, Clock, TrendingUp, Sparkles } from "lucide-react";

const fmt = (v: number) =>
  v?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "R$ 0,00";
const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

interface Receivable {
  id?: string;
  description?: string;
  gross_value: number;
  status: string;
  due_date?: string;
  payment_method?: string;
  installment_number?: number;
  installment_total?: number;
}

interface FinanceSummaryProps {
  receivables: Receivable[];
}

export default function FinanceSummary({ receivables }: FinanceSummaryProps) {
  const totalReceivable = receivables.reduce((s, r) => s + (r.gross_value || 0), 0);
  const totalPaid = receivables
    .filter((r) => r.status === "recebido")
    .reduce((s, r) => s + (r.gross_value || 0), 0);
  const totalPending = totalReceivable - totalPaid;
  const pct = totalReceivable > 0 ? Math.round((totalPaid / totalReceivable) * 100) : 0;

  const paidCount = receivables.filter((r) => r.status === "recebido").length;
  const pendingCount = receivables.length - paidCount;

  return (
    <div className="relative rounded-2xl border border-border/30 overflow-hidden bg-card/80 backdrop-blur-sm">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full opacity-[0.07]"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)",
        }}
      />

      {/* ── Hero metric strip ── */}
      <div className="relative p-6 sm:p-8">
        {/* Main value */}
        <div className="flex items-baseline gap-3 mb-6">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl sm:text-5xl font-black tracking-tight text-foreground tabular-nums"
          >
            {fmt(totalReceivable)}
          </motion.p>
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
            valor total
          </span>
        </div>

        {/* Metric duo */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="relative flex items-center gap-3 rounded-xl border border-primary/10 bg-primary/[0.04] p-4"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/70">
                Recebido
              </p>
              <p className="text-lg font-black tabular-nums text-foreground">
                {fmt(totalPaid)}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="relative flex items-center gap-3 rounded-xl border border-warning/10 bg-warning/[0.04] p-4"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-warning/70">
                Pendente
              </p>
              <p className="text-lg font-black tabular-nums text-foreground">
                {fmt(totalPending)}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Progress arc */}
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary/60" />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                Progresso
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {pct === 100 && <Sparkles className="h-3 w-3 text-primary" />}
              <span className="text-xs font-black tabular-nums text-foreground">
                {pct}%
              </span>
            </div>
          </div>

          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/30">
            {/* Animated shimmer on track */}
            <div className="absolute inset-0 overflow-hidden rounded-full">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
                className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
              />
            </div>

            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative h-full rounded-full bg-gradient-to-r from-primary via-primary to-[hsl(var(--primary)/0.7)]"
              style={{
                boxShadow: "0 0 16px hsl(var(--primary) / 0.35), 0 0 4px hsl(var(--primary) / 0.2)",
              }}
            />
          </div>

          <div className="mt-2 flex justify-between">
            <span className="text-[10px] text-muted-foreground/50">
              {paidCount} de {receivables.length} parcelas
            </span>
            <span className="text-[10px] text-muted-foreground/50">
              {pendingCount === 0 ? "Tudo quitado ✓" : `${pendingCount} restante${pendingCount > 1 ? "s" : ""}`}
            </span>
          </div>
        </div>
      </div>

      {/* ── Installment timeline ── */}
      <div className="border-t border-border/20 px-6 sm:px-8 py-5">
        <div className="space-y-1">
          {receivables.map((r, i) => {
            const isPaid = r.status === "recebido";
            const isLast = i === receivables.length - 1;

            return (
              <motion.div
                key={r.id || i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.06 }}
                className="group relative flex items-stretch gap-4"
              >
                {/* Timeline spine */}
                <div className="relative flex flex-col items-center pt-4">
                  <div
                    className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                      isPaid
                        ? "border-primary bg-primary/10"
                        : "border-warning/50 bg-warning/5"
                    }`}
                  >
                    <div
                      className={`h-2 w-2 rounded-full ${
                        isPaid ? "bg-primary" : "bg-warning animate-pulse"
                      }`}
                    />
                  </div>
                  {!isLast && (
                    <div
                      className={`w-px flex-1 mt-1 ${
                        isPaid ? "bg-primary/20" : "bg-border/30"
                      }`}
                    />
                  )}
                </div>

                {/* Content card */}
                <div
                  className={`flex-1 flex items-center justify-between rounded-xl px-4 py-3.5 mb-1 transition-all duration-200 group-hover:scale-[1.005] group-hover:shadow-sm ${
                    isPaid
                      ? "bg-primary/[0.03] border border-primary/[0.06]"
                      : "bg-warning/[0.02] border border-warning/[0.06]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                        isPaid
                          ? "bg-primary/10 text-primary"
                          : "bg-warning/10 text-warning"
                      }`}
                    >
                      {r.installment_number || i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {r.description || `Parcela ${r.installment_number || i + 1}`}
                        {(r.installment_total ?? 0) > 1 && (
                          <span className="text-muted-foreground/50 font-normal">
                            {" "}/ {r.installment_total}
                          </span>
                        )}
                      </p>
                      {r.due_date && (
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                          {fmtDate(r.due_date)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <p className="text-sm font-black tabular-nums text-foreground">
                      {fmt(r.gross_value)}
                    </p>
                    <div
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        isPaid
                          ? "bg-primary/10 text-primary"
                          : "bg-warning/10 text-warning"
                      }`}
                    >
                      {isPaid ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          Pago
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3" />
                          Aberto
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
