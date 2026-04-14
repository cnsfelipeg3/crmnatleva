import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Sale { id: string; display_id: string; name: string; received_value: number; total_cost: number; margin: number; created_at: string; close_date: string | null; status: string; }
interface Props { filtered: Sale[]; allSales: Sale[]; }

export default function SeasonalitySection({ filtered, allSales }: Props) {
  const [view, setView] = useState<"monthly" | "weekly">("monthly");
  const [drilldown, setDrilldown] = useState<{ label: string; sales: Sale[] } | null>(null);
  const navigate = useNavigate();

  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string; receita: number; lucro: number; vendas: number; sales: Sale[] }> = {};
    filtered.forEach(s => {
      const d = new Date(s.close_date || s.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map[key]) map[key] = { month: key, receita: 0, lucro: 0, vendas: 0, sales: [] };
      map[key].receita += s.received_value || 0;
      map[key].lucro += (s.received_value || 0) - (s.total_cost || 0);
      map[key].vendas++;
      map[key].sales.push(s);
    });
    const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).map(m => {
      const [yr, mo] = m.month.split('-');
      return { ...m, monthLabel: `${monthNames[parseInt(mo, 10) - 1]} ${yr}` };
    });
  }, [filtered]);

  const weeklyData = useMemo(() => {
    const map: Record<string, { week: string; receita: number; vendas: number; sales: Sale[] }> = {};
    filtered.forEach(s => {
      const d = new Date(s.close_date || s.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      if (!map[key]) map[key] = { week: key, receita: 0, vendas: 0, sales: [] };
      map[key].receita += s.received_value || 0;
      map[key].vendas++;
      map[key].sales.push(s);
    });
    return Object.values(map).sort((a, b) => a.week.localeCompare(b.week)).slice(-26);
  }, [filtered]);

  const yoyData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: Record<number, Record<number, number>> = {};
    allSales.forEach(s => {
      const d = new Date(s.close_date || s.created_at);
      const y = d.getFullYear();
      const m = d.getMonth();
      if (!years[y]) years[y] = {};
      years[y][m] = (years[y][m] || 0) + (s.received_value || 0);
    });
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return months.map((name, i) => {
      const entry: any = { name };
      Object.keys(years).sort().forEach(y => { entry[y] = years[Number(y)]?.[i] || 0; });
      return entry;
    });
  }, [allSales]);

  const availableYears = useMemo(() => {
    const ys = new Set<number>();
    allSales.forEach(s => ys.add(new Date(s.close_date || s.created_at).getFullYear()));
    return Array.from(ys).sort();
  }, [allSales]);

  const chartColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-5))"];

  const handleChartClick = (e: any, dataSource: any[]) => {
    if (e?.activePayload?.[0]?.payload?.sales) {
      const p = e.activePayload[0].payload;
      setDrilldown({ label: `Período: ${p.monthLabel || p.month || p.week}`, sales: p.sales });
    }
  };

  return (
    <>
      <div className="space-y-4">
        <h2 className="section-title">📈 Sazonalidade</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5 glass-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground tracking-tight">Receita por Período</h3>
              <div className="flex gap-1">
                <Button variant={view === "monthly" ? "default" : "ghost"} size="sm" className="h-6 text-[10px] px-2" onClick={() => setView("monthly")}>Mensal</Button>
                <Button variant={view === "weekly" ? "default" : "ghost"} size="sm" className="h-6 text-[10px] px-2" onClick={() => setView("weekly")}>Semanal</Button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              {view === "monthly" ? (
                <AreaChart data={monthlyData} onClick={(e) => handleChartClick(e, monthlyData)}>
                  <defs>
                    <linearGradient id="receitaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                  <Area type="monotone" dataKey="receita" stroke="hsl(var(--chart-1))" fill="url(#receitaGrad)" strokeWidth={2} name="Receita" cursor="pointer" />
                  <Area type="monotone" dataKey="lucro" stroke="hsl(var(--accent))" fill="none" strokeWidth={2} strokeDasharray="5 5" name="Lucro" />
                </AreaChart>
              ) : (
                <AreaChart data={weeklyData} onClick={(e) => handleChartClick(e, weeklyData)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="week" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                  <Area type="monotone" dataKey="receita" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.15} strokeWidth={2} name="Receita" cursor="pointer" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </Card>

          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 tracking-tight">Comparativo Anual</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={yoyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {availableYears.map((y, i) => (
                  <Line key={y} type="monotone" dataKey={y.toString()} stroke={chartColors[i % chartColors.length]} strokeWidth={2} dot={{ r: 3 }} name={y.toString()} cursor="pointer" />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>

      <Dialog open={!!drilldown} onOpenChange={() => setDrilldown(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{drilldown?.label} — {drilldown?.sales.length} vendas</DialogTitle>
          </DialogHeader>
          {drilldown && (
            <>
              <div className="flex gap-4 text-xs text-muted-foreground mb-2">
                <span>Receita: <strong className="text-foreground">{fmt(drilldown.sales.reduce((s, v) => s + (v.received_value || 0), 0))}</strong></span>
                <span>Lucro: <strong className="text-foreground">{fmt(drilldown.sales.reduce((s, v) => s + (v.received_value || 0) - (v.total_cost || 0), 0))}</strong></span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">ID</TableHead>
                    <TableHead className="text-xs">Nome</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Valor</TableHead>
                    <TableHead className="text-xs text-right">Margem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drilldown.sales.slice(0, 80).map(s => (
                    <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setDrilldown(null); navigate(`/sales/${s.id}`); }}>
                      <TableCell className="text-xs font-mono">{s.display_id}</TableCell>
                      <TableCell className="text-xs">{s.name}</TableCell>
                      <TableCell className="text-xs">{s.status}</TableCell>
                      <TableCell className="text-xs text-right">{fmt(s.received_value || 0)}</TableCell>
                      <TableCell className="text-xs text-right">{(s.margin || 0).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
