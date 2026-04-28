import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { formatBRL, type GPriceInsight } from "./gflightsTypes";

interface Props {
  insight?: GPriceInsight;
}

export function GFlightPriceHistoryChart({ insight }: Props) {
  if (!insight || insight.historyPoints.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-xs text-muted-foreground text-center py-6">
          Histórico de preços indisponível para essa rota.
        </div>
      </Card>
    );
  }

  const data = insight.historyPoints;
  const fmtDateShort = (v: string) => {
    const d = parseISO(v);
    return isValid(d) ? format(d, "d MMM", { locale: ptBR }) : v;
  };
  const fmtDateLong = (v: string) => {
    const d = parseISO(v);
    return isValid(d) ? format(d, "EEEE, d 'de' MMMM", { locale: ptBR }) : v;
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Histórico de preços (60 dias)</h3>
        <span className="text-[10px] text-muted-foreground">
          {data.length} pontos
        </span>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="gflightsPriceHistGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickFormatter={fmtDateShort}
              interval="preserveStartEnd"
              tick={{ fontSize: 10 }}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => `R$ ${(v / 1000).toFixed(1)}k`}
              tick={{ fontSize: 10 }}
              stroke="hsl(var(--muted-foreground))"
              width={50}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(v: number) => [formatBRL(v), "Preço"]}
              labelFormatter={fmtDateLong}
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 11,
              }}
            />
            {typeof insight.lowThreshold === "number" && (
              <ReferenceLine
                y={insight.lowThreshold}
                stroke="hsl(142 71% 45%)"
                strokeDasharray="4 4"
                label={{ value: "Limite baixo", fontSize: 9, fill: "hsl(142 71% 45%)", position: "right" }}
              />
            )}
            {typeof insight.highThreshold === "number" && (
              <ReferenceLine
                y={insight.highThreshold}
                stroke="hsl(0 84% 60%)"
                strokeDasharray="4 4"
                label={{ value: "Limite alto", fontSize: 9, fill: "hsl(0 84% 60%)", position: "right" }}
              />
            )}
            <ReferenceLine
              y={insight.current}
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
              label={{ value: `Atual ${formatBRL(insight.current)}`, fontSize: 10, fill: "hsl(var(--primary))", position: "left" }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#gflightsPriceHistGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
