import { TrendingDown, Minus, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL, type GPriceInsight } from "./gflightsTypes";

interface Props {
  insight?: GPriceInsight;
  onShowHistory?: () => void;
  showHistory?: boolean;
}

const META = {
  low: {
    icon: TrendingDown,
    bg: "bg-emerald-500/10 border-emerald-500/30",
    color: "text-emerald-700 dark:text-emerald-300",
    title: "Preços abaixo do normal",
    sub: "Boa hora para fechar · economia significativa vs média da rota",
  },
  typical: {
    icon: Minus,
    bg: "bg-amber-500/10 border-amber-500/30",
    color: "text-amber-700 dark:text-amber-300",
    title: "Preços normais para essa rota",
    sub: "Dentro da faixa esperada · sem urgência nem oportunidade clara",
  },
  high: {
    icon: TrendingUp,
    bg: "bg-rose-500/10 border-rose-500/30",
    color: "text-rose-700 dark:text-rose-300",
    title: "Preços acima do normal",
    sub: "Vale tentar datas próximas ou aguardar queda",
  },
  unknown: {
    icon: Minus,
    bg: "bg-muted border-border",
    color: "text-muted-foreground",
    title: "Análise de preço indisponível",
    sub: "Histórico insuficiente para essa rota",
  },
} as const;

export function GFlightPriceInsightBanner({ insight, onShowHistory, showHistory }: Props) {
  if (!insight) return null;
  const meta = META[insight.level];
  const Icon = meta.icon;
  const economy =
    insight.level === "low" && insight.lowThreshold
      ? insight.lowThreshold - insight.current
      : 0;
  const overprice =
    insight.level === "high" && insight.highThreshold
      ? insight.current - insight.highThreshold
      : 0;

  return (
    <div className={cn("border rounded-lg p-4 flex gap-3", meta.bg)}>
      <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", meta.color)} />
      <div className="flex-1 min-w-0 space-y-1">
        <div className={cn("text-sm font-semibold", meta.color)}>{meta.title}</div>
        <div className="text-xs text-muted-foreground">{meta.sub}</div>

        {economy > 0 && (
          <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium pt-1">
            Economia · {formatBRL(economy)} vs limite "preço baixo"
          </div>
        )}
        {overprice > 0 && (
          <div className="text-[11px] text-rose-700 dark:text-rose-300 font-medium pt-1">
            Acima do esperado · {formatBRL(overprice)} acima do limite "preço normal"
          </div>
        )}

        {insight.historyPoints.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[10px] text-muted-foreground pt-1">
            <span>Mín 60d: <strong className="text-foreground">{formatBRL(insight.minHistory)}</strong></span>
            <span>Média 60d: <strong className="text-foreground">{formatBRL(insight.averageHistory)}</strong></span>
            <span>Máx 60d: <strong className="text-foreground">{formatBRL(insight.maxHistory)}</strong></span>
            <span>Atual: <strong className="text-foreground">{formatBRL(insight.current)}</strong></span>
          </div>
        )}

        {onShowHistory && insight.historyPoints.length > 0 && (
          <button
            type="button"
            onClick={onShowHistory}
            className="text-[11px] text-primary hover:underline mt-1.5"
          >
            {showHistory ? "Esconder histórico ↑" : "Ver histórico de preços ↓"}
          </button>
        )}
      </div>
    </div>
  );
}
