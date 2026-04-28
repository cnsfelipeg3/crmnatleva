import { useMemo } from "react";
import { TrendingUp, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
} from "recharts";
import { formatBRL, type GPriceGraphPoint } from "./gflightsTypes";

interface Props {
  points: GPriceGraphPoint[];
  isLoading: boolean;
  selectedDate?: string | null;
  onSelectDate?: (date: string) => void;
}

export function GFlightPriceTrendChart({ points, isLoading, selectedDate, onSelectDate }: Props) {
  const data = useMemo(() => {
    return points
      .filter((p) => typeof p.price === "number")
      .map((p) => {
        const d = new Date(p.date);
        return {
          date: p.date,
          label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          price: p.price as number,
        };
      });
  }, [points]);

  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const prices = data.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((s, n) => s + n, 0) / prices.length;
    const minPoint = data.find((d) => d.price === min);
    const maxPoint = data.find((d) => d.price === max);
    return { min, max, avg, minPoint, maxPoint };
  }, [data]);

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Tendência de preços</h3>
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-auto" />
        </div>
        <Skeleton className="h-48 w-full rounded" />
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground">Tendência de preços</h3>
        </div>
        <p className="text-xs text-muted-foreground">Sem dados de tendência para essa rota.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Tendência de preços</h3>
        </div>
        {stats && (
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-emerald-600 dark:text-emerald-400">
              Mín: <strong>{formatBRL(stats.min)}</strong>
            </span>
            <span className="text-muted-foreground">
              Média: <strong>{formatBRL(stats.avg)}</strong>
            </span>
            <span className="text-rose-600 dark:text-rose-400">
              Máx: <strong>{formatBRL(stats.max)}</strong>
            </span>
          </div>
        )}
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 8, left: -8, bottom: 0 }}
            onClick={(e: any) => {
              const d = e?.activePayload?.[0]?.payload?.date;
              if (d) onSelectDate?.(d);
            }}
          >
            <defs>
              <linearGradient id="gflightPriceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis
              dataKey="label"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `R$ ${Math.round(v / 1000)}k`}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
              formatter={(value: number) => [formatBRL(value), "Preço"]}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#gflightPriceGrad)"
            />
            {stats?.minPoint && (
              <ReferenceDot
                x={stats.minPoint.label}
                y={stats.minPoint.price}
                r={5}
                fill="hsl(142 71% 45%)"
                stroke="white"
                strokeWidth={2}
              />
            )}
            {selectedDate && (() => {
              const sel = data.find((d) => d.date === selectedDate);
              if (!sel) return null;
              return (
                <ReferenceDot
                  x={sel.label}
                  y={sel.price}
                  r={5}
                  fill="hsl(var(--primary))"
                  stroke="white"
                  strokeWidth={2}
                />
              );
            })()}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-muted-foreground text-center">
        Clique em uma data do gráfico para buscar voos naquele dia.
      </p>
    </Card>
  );
}
