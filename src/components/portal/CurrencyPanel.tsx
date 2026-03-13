import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight, ArrowDownRight, RefreshCw, TrendingUp,
  ArrowRight, Globe, Loader2, AlertCircle, Repeat,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { cn } from "@/lib/utils";

/* ── Currency metadata ── */
interface CurrencyMeta {
  code: string;
  name: string;
  flag: string;
  symbol: string;
}

const CURRENCIES: CurrencyMeta[] = [
  { code: "USD", name: "Dólar Americano", flag: "🇺🇸", symbol: "$" },
  { code: "EUR", name: "Euro", flag: "🇪🇺", symbol: "€" },
  { code: "CHF", name: "Franco Suíço", flag: "🇨🇭", symbol: "Fr" },
  { code: "AED", name: "Dirham Emirados", flag: "🇦🇪", symbol: "د.إ" },
  { code: "CLP", name: "Peso Chileno", flag: "🇨🇱", symbol: "$" },
  { code: "ARS", name: "Peso Argentino", flag: "🇦🇷", symbol: "$" },
];

const ALL_CURRENCIES = [...CURRENCIES, { code: "BRL", name: "Real Brasileiro", flag: "🇧🇷", symbol: "R$" }];

const fmtBrl = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtTime = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};
const fmtDateTime = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) + " · " + fmtTime(ts);
};

/* ═══════════════════════════════════════════════════════════
   CURRENCY CARD
   ═══════════════════════════════════════════════════════════ */
function CurrencyCard({ currency, rate, index }: { currency: CurrencyMeta; rate: number; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, type: "spring", stiffness: 180 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="group relative overflow-hidden rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm p-5 hover:border-accent/20 hover:shadow-xl hover:shadow-accent/5 transition-all duration-300"
    >
      {/* Subtle gradient on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-accent/[0.03] via-transparent to-transparent" />

      <div className="relative z-10 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{currency.flag}</div>
          <div>
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.15em] font-bold">{currency.name}</p>
            <p className="text-sm font-black text-foreground tracking-wider mt-0.5">{currency.code}</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-4">
        <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider mb-1">1 {currency.code} =</p>
        <p className="text-2xl sm:text-3xl font-black text-foreground tabular-nums tracking-tight leading-none">
          R$ {fmtBrl(rate)}
        </p>
      </div>

      {/* Decorative accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CURRENCY CONVERTER
   ═══════════════════════════════════════════════════════════ */
function CurrencyConverter({ convert }: { convert: (amount: number, from: string, to: string) => number | null }) {
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("BRL");

  const result = useMemo(() => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return null;
    return convert(val, from, to);
  }, [amount, from, to, convert]);

  const swap = () => { setFrom(to); setTo(from); };

  const fromMeta = ALL_CURRENCIES.find(c => c.code === from);
  const toMeta = ALL_CURRENCIES.find(c => c.code === to);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm p-5 sm:p-6"
    >
      <div className="flex items-center gap-2 mb-5">
        <Repeat className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-bold text-foreground">Conversor de Moedas</h3>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
        {/* Amount */}
        <div className="flex-1">
          <label className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-bold mb-1.5 block">Valor</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded-xl text-lg font-black h-12 bg-background/50"
            placeholder="100"
          />
        </div>

        {/* From */}
        <div className="flex-1">
          <label className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-bold mb-1.5 block">De</label>
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger className="rounded-xl h-12 bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_CURRENCIES.map(c => (
                <SelectItem key={c.code} value={c.code}>
                  <span className="flex items-center gap-2">{c.flag} {c.code}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Swap */}
        <Button variant="ghost" size="icon" onClick={swap} className="rounded-xl h-12 w-12 shrink-0 hover:bg-accent/10 hover:text-accent">
          <ArrowRight className="h-4 w-4" />
        </Button>

        {/* To */}
        <div className="flex-1">
          <label className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-bold mb-1.5 block">Para</label>
          <Select value={to} onValueChange={setTo}>
            <SelectTrigger className="rounded-xl h-12 bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_CURRENCIES.map(c => (
                <SelectItem key={c.code} value={c.code}>
                  <span className="flex items-center gap-2">{c.flag} {c.code}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Result */}
      <AnimatePresence mode="wait">
        {result !== null && (
          <motion.div
            key={`${from}-${to}-${amount}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-5 p-4 rounded-xl bg-accent/5 border border-accent/10"
          >
            <p className="text-xs text-muted-foreground">
              {fromMeta?.flag} {parseFloat(amount).toLocaleString("pt-BR")} {from} =
            </p>
            <p className="text-3xl font-black text-foreground tabular-nums tracking-tight mt-1">
              {toMeta?.flag} {toMeta?.symbol} {result.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPACT SUMMARY (for Dashboard)
   ═══════════════════════════════════════════════════════════ */
export function CurrencySummary({ onExpand }: { onExpand?: () => void }) {
  const { data, loading, error } = useExchangeRates();

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-bold text-foreground">Câmbio do Dia</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-16 rounded-xl bg-muted/20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data?.rates) return null;

  const mainCurrencies = CURRENCIES.slice(0, 3); // USD, EUR, CHF

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm p-5 hover:border-accent/10 transition-all group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Câmbio do Dia</h3>
            <p className="text-[10px] text-muted-foreground/60">{fmtDateTime(data.timestamp)}</p>
          </div>
        </div>
        {onExpand && (
          <button
            onClick={onExpand}
            className="text-[10px] text-accent font-bold uppercase tracking-wider hover:underline"
          >
            Ver tudo
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {mainCurrencies.map((curr, i) => {
          const rate = data.rates[curr.code];
          if (!rate) return null;
          return (
            <motion.div
              key={curr.code}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 * i }}
              className="flex flex-col items-center gap-1 py-3 rounded-xl bg-muted/10 border border-border/10"
            >
              <span className="text-base">{curr.flag}</span>
              <span className="text-[10px] text-muted-foreground font-bold">{curr.code}</span>
              <span className="text-sm font-black text-foreground tabular-nums">R$ {fmtBrl(rate)}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FULL PANEL (for Finance page)
   ═══════════════════════════════════════════════════════════ */
export default function CurrencyPanel() {
  const { data, loading, error, refresh, convert } = useExchangeRates();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setTimeout(() => setRefreshing(false), 800);
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-accent animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando cotações...</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-36 rounded-2xl bg-card/60 border border-border/20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error && !data) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
        <h3 className="text-sm font-bold text-foreground mb-1">Não foi possível carregar as cotações</h3>
        <p className="text-xs text-muted-foreground mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="rounded-xl">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Tentar novamente
        </Button>
      </div>
    );
  }

  if (!data?.rates) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-accent" />
            </div>
            Cotações Internacionais
          </h2>
          <p className="text-xs text-muted-foreground mt-1 ml-[52px]">
            Acompanhe as moedas mais importantes para sua viagem
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data.stale && (
            <span className="text-[10px] text-warning bg-warning/10 px-2 py-1 rounded-full font-bold">
              Dados em cache
            </span>
          )}
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Atualizado</p>
            <p className="text-xs text-muted-foreground font-bold">{fmtDateTime(data.timestamp)}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            className="rounded-xl h-9 w-9 hover:bg-accent/10 hover:text-accent"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Currency Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {CURRENCIES.map((curr, i) => {
          const rate = data.rates[curr.code];
          if (!rate) return null;
          return <CurrencyCard key={curr.code} currency={curr} rate={rate} index={i} />;
        })}
      </div>

      {/* Converter */}
      <CurrencyConverter convert={convert} />

      {/* Mobile update info */}
      <div className="sm:hidden text-center">
        <p className="text-[10px] text-muted-foreground/40">
          Atualizado em {fmtDateTime(data.timestamp)}
        </p>
      </div>
    </div>
  );
}
