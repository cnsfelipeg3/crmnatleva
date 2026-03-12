import { motion } from "framer-motion";

const fmt = (v: number) => v?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "R$ 0,00";
const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
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
  const totalPaid = receivables.filter(r => r.status === "recebido").reduce((s, r) => s + (r.gross_value || 0), 0);
  const totalPending = totalReceivable - totalPaid;
  const pct = totalReceivable > 0 ? Math.round((totalPaid / totalReceivable) * 100) : 0;

  return (
    <div className="rounded-2xl border border-border/40 overflow-hidden bg-card">
      {/* Summary */}
      <div className="p-5 sm:p-6 border-b border-border/30">
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground">{fmt(totalReceivable)}</p>
          </div>
          <div>
            <p className="text-[10px] text-accent uppercase tracking-wider mb-1">Pago</p>
            <p className="text-xl sm:text-2xl font-bold text-accent">{fmt(totalPaid)}</p>
          </div>
          <div>
            <p className="text-[10px] text-warning uppercase tracking-wider mb-1">Pendente</p>
            <p className="text-xl sm:text-2xl font-bold text-warning">{fmt(totalPending)}</p>
          </div>
        </div>

        <div className="relative w-full h-2 bg-muted/50 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-accent to-[hsl(160,80%,60%)]"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-right">{pct}% quitado</p>
      </div>

      {/* Installments */}
      <div className="p-5 sm:p-6 space-y-2.5">
        {receivables.map((r, i) => {
          const isPaid = r.status === "recebido";
          return (
            <motion.div
              key={r.id || i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + i * 0.04 }}
              className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                isPaid
                  ? "bg-accent/5 border border-accent/10"
                  : "bg-warning/5 border border-warning/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isPaid ? "bg-accent" : "bg-warning animate-pulse"}`} />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {r.description || `Parcela ${r.installment_number || i + 1}`}
                    {(r.installment_total ?? 0) > 1 && ` de ${r.installment_total}`}
                  </p>
                  {r.due_date && <p className="text-xs text-muted-foreground mt-0.5">Venc. {fmtDate(r.due_date)}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{fmt(r.gross_value)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{isPaid ? "✓ Pago" : "Pendente"}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
