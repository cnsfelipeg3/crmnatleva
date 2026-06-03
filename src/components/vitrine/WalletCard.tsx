import { motion } from "framer-motion";
import { Wallet, ArrowDownToLine, TrendingUp } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import CountUp from "./CountUp";
import { MonthPoint } from "./useAffiliateTimeSeries";

type Props = {
  available: number;
  pending: number;
  future: number;
  lifetime: number;
  series: MonthPoint[];
  onWithdraw?: () => void;
  hasPix: boolean;
};

const fmtBRLshort = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function WalletCard({
  available, pending, future, lifetime, series, onWithdraw, hasPix,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative overflow-hidden rounded-3xl text-white shadow-[0_24px_80px_-20px_rgba(5,46,30,0.55)]"
      style={{
        background:
          "radial-gradient(120% 120% at 0% 0%, #1a5a3f 0%, #0d3a28 45%, #051f15 100%)",
      }}
    >
      {/* aurora */}
      <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-emerald-300/10 blur-3xl" />
      <div className="absolute inset-0 opacity-[0.04] mix-blend-screen pointer-events-none"
        style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

      <div className="relative p-6 sm:p-8 grid lg:grid-cols-[1.2fr_1fr] gap-8 lg:gap-6">
        {/* esquerda · saldo principal */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-200/90">
              <Wallet className="h-4 w-4" />
              <span className="text-[10px] uppercase tracking-[0.22em] font-semibold">
                Carteira NatLeva
              </span>
            </div>
            <span className="text-[10px] text-white/40 uppercase tracking-widest">PIX direto</span>
          </div>

          <div>
            <p className="text-xs text-white/60 mb-2">Saldo disponível pra saque</p>
            <div className="font-serif text-5xl sm:text-6xl tracking-tight leading-none">
              <CountUp value={available} prefix="R$ " decimals={2} />
            </div>
            <div className="mt-5 flex items-center gap-3">
              <Button
                onClick={onWithdraw}
                disabled={available <= 0 || !hasPix}
                className="bg-amber-400 hover:bg-amber-300 text-emerald-950 font-semibold rounded-full h-11 px-6 gap-2 shadow-[0_8px_24px_-6px_rgba(245,200,80,0.55)]"
              >
                <ArrowDownToLine className="h-4 w-4" />
                {hasPix ? "Receber via PIX" : "Cadastrar PIX"}
              </Button>
              <span className="text-[11px] text-white/50 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> liberado em até 1 dia útil
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/10">
            <Mini label="Em aprovação" value={pending} tone="amber" />
            <Mini label="Comissões futuras" value={future} tone="sky" />
            <Mini label="Total recebido" value={lifetime} tone="emerald" />
          </div>
        </div>

        {/* direita · sparkline */}
        <div className="rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-white/10 p-4 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-white/60">Últimos 6 meses</span>
            <span className="text-xs text-amber-200 font-semibold">
              {fmtBRLshort(series.reduce((s, p) => s + p.value, 0))}
            </span>
          </div>
          <div className="flex-1 min-h-[140px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="walletArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  cursor={{ stroke: "rgba(255,255,255,0.2)" }}
                  contentStyle={{ background: "#0a2a1d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: "#fbbf24" }}
                  formatter={(v: number) => [fmtBRLshort(v), "Comissão"]}
                />
                <Area type="monotone" dataKey="value" stroke="#fbbf24" strokeWidth={2.2} fill="url(#walletArea)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between text-[10px] text-white/40 pt-1">
            {series.map((p) => (
              <span key={p.month} className="capitalize">{p.label}</span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Mini({ label, value, tone }: { label: string; value: number; tone: "amber" | "sky" | "emerald" }) {
  const dot: Record<string, string> = {
    amber: "bg-amber-300",
    sky: "bg-sky-300",
    emerald: "bg-emerald-300",
  };
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/55">
        <span className={`h-1.5 w-1.5 rounded-full ${dot[tone]}`} />
        {label}
      </div>
      <div className="text-base sm:text-lg font-semibold mt-1">
        <CountUp value={value} prefix="R$ " decimals={0} />
      </div>
    </div>
  );
}
