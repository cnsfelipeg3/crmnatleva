import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Target, TrendingUp } from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Sale { received_value: number; created_at: string; }
interface Props { filtered: Sale[]; allSales: Sale[]; }

export default function GoalProjectionSection({ filtered, allSales }: Props) {
  const projection = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentDay = now.getDate();

    // Daily revenue this month
    const dailyMap: Record<number, number> = {};
    filtered.forEach(s => {
      const d = new Date(s.created_at);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        const day = d.getDate();
        dailyMap[day] = (dailyMap[day] || 0) + (s.received_value || 0);
      }
    });

    // Cumulative data
    let cumulative = 0;
    const data: { day: number; real: number | null; projecao: number | null }[] = [];
    
    for (let d = 1; d <= daysInMonth; d++) {
      if (d <= currentDay) {
        cumulative += dailyMap[d] || 0;
        data.push({ day: d, real: cumulative, projecao: null });
      } else {
        data.push({ day: d, real: null, projecao: null });
      }
    }

    // Calculate average daily revenue for projection
    const avgDaily = currentDay > 0 ? cumulative / currentDay : 0;
    let projected = cumulative;
    for (let d = currentDay + 1; d <= daysInMonth; d++) {
      projected += avgDaily;
      const idx = data.findIndex(x => x.day === d);
      if (idx >= 0) data[idx].projecao = projected;
    }
    // Connect projection to current
    if (currentDay < daysInMonth) {
      const connIdx = data.findIndex(x => x.day === currentDay);
      if (connIdx >= 0) data[connIdx].projecao = cumulative;
    }

    // Last 3 months average for goal estimation
    const monthlyRevenues: number[] = [];
    for (let m = 1; m <= 3; m++) {
      const targetMonth = (currentMonth - m + 12) % 12;
      const targetYear = currentMonth - m < 0 ? currentYear - 1 : currentYear;
      let monthRev = 0;
      allSales.forEach(s => {
        const d = new Date(s.created_at);
        if (d.getMonth() === targetMonth && d.getFullYear() === targetYear) {
          monthRev += s.received_value || 0;
        }
      });
      if (monthRev > 0) monthlyRevenues.push(monthRev);
    }
    
    const suggestedGoal = monthlyRevenues.length > 0
      ? monthlyRevenues.reduce((a, b) => a + b, 0) / monthlyRevenues.length * 1.1 // 10% growth
      : projected;

    return {
      data,
      currentRevenue: cumulative,
      projectedEnd: projected,
      suggestedGoal,
      avgDaily,
      daysLeft: daysInMonth - currentDay,
      pctComplete: suggestedGoal > 0 ? (cumulative / suggestedGoal) * 100 : 0,
    };
  }, [filtered, allSales]);

  const goalPct = Math.min(projection.pctComplete, 100);

  return (
    <div className="space-y-4">
      <h2 className="section-title">🎯 Projeção de Meta</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 glass-card lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4 tracking-tight">Receita Acumulada do Mês (Real vs Projeção)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={projection.data}>
              <defs>
                <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-5))" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(var(--chart-5))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} label={{ value: "Dia", position: "insideBottomRight", offset: -5, fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
              <ReferenceLine y={projection.suggestedGoal} stroke="hsl(var(--accent))" strokeDasharray="6 4" strokeWidth={1.5} label={{ value: `Meta: ${fmt(projection.suggestedGoal)}`, position: "right", fontSize: 9, fill: "hsl(var(--accent))" }} />
              <Area type="monotone" dataKey="real" stroke="hsl(var(--chart-1))" fill="url(#realGrad)" strokeWidth={2.5} connectNulls={false} name="Real" dot={{ r: 2 }} />
              <Area type="monotone" dataKey="projecao" stroke="hsl(var(--chart-5))" fill="url(#projGrad)" strokeWidth={2} strokeDasharray="6 3" connectNulls={false} name="Projeção" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 glass-card flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-accent" />
              <h3 className="text-sm font-semibold text-foreground tracking-tight">Status da Meta</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Realizado</p>
                <p className="text-lg font-bold text-foreground">{fmt(projection.currentRevenue)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Projeção Fim do Mês</p>
                <p className="text-lg font-bold text-chart-5">{fmt(projection.projectedEnd)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Meta Sugerida (+10%)</p>
                <p className="text-lg font-bold text-accent">{fmt(projection.suggestedGoal)}</p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
              <span>{goalPct.toFixed(0)}% da meta</span>
              <span>{projection.daysLeft} dias restantes</span>
            </div>
            <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${goalPct}%`,
                  background: goalPct >= 80
                    ? 'hsl(var(--success))'
                    : goalPct >= 50
                      ? 'hsl(var(--chart-1))'
                      : 'hsl(var(--warning))',
                }}
              />
            </div>
            <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Média diária: {fmt(projection.avgDaily)}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
