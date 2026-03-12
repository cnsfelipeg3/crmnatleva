import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend, LineChart, Line, ReferenceLine,
} from "recharts";
import { iataToLabel } from "@/lib/iataUtils";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Sale {
  id: string; display_id: string; name: string; status: string;
  received_value: number; total_cost: number; profit: number; margin: number;
  created_at: string; destination_iata: string | null; seller_id: string | null;
}

interface Props { filtered: Sale[]; sellerNames: Record<string, string>; }

export default function FinancialSection({ filtered, sellerNames }: Props) {
  const navigate = useNavigate();
  const [drilldown, setDrilldown] = useState<{ label: string; sales: Sale[] } | null>(null);

  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string; receita: number; custo: number; lucro: number; count: number; sales: Sale[] }> = {};
    filtered.forEach(s => {
      const d = new Date(s.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map[key]) map[key] = { month: key, receita: 0, custo: 0, lucro: 0, count: 0, sales: [] };
      map[key].receita += s.received_value || 0;
      map[key].custo += s.total_cost || 0;
      map[key].lucro += (s.received_value || 0) - (s.total_cost || 0);
      map[key].count++;
      map[key].sales.push(s);
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).map(m => ({
      ...m,
      margem: m.receita > 0 ? (m.lucro / m.receita) * 100 : 0,
      monthLabel: m.month.split('-').reverse().join('/'),
    }));
  }, [filtered]);

  const avgMargin = useMemo(() => {
    if (monthlyData.length === 0) return 0;
    return monthlyData.reduce((s, m) => s + m.margem, 0) / monthlyData.length;
  }, [monthlyData]);

  const sellerProfit = useMemo(() => {
    const map: Record<string, { name: string; lucro: number; ticket: number; count: number; sales: Sale[] }> = {};
    filtered.forEach(s => {
      const sid = s.seller_id || "sem";
      const name = sellerNames[sid] || "Sem vendedor";
      if (!map[sid]) map[sid] = { name, lucro: 0, ticket: 0, count: 0, sales: [] };
      map[sid].lucro += (s.received_value || 0) - (s.total_cost || 0);
      map[sid].ticket += s.received_value || 0;
      map[sid].count++;
      map[sid].sales.push(s);
    });
    return Object.values(map).map(v => ({
      ...v, ticket: v.count > 0 ? v.ticket / v.count : 0,
    })).sort((a, b) => b.lucro - a.lucro).slice(0, 8);
  }, [filtered, sellerNames]);

  const destProfit = useMemo(() => {
    const map: Record<string, { iata: string; name: string; lucro: number; sales: Sale[] }> = {};
    filtered.forEach(s => {
      const d = s.destination_iata || "N/A";
      if (d === "N/A") return;
      if (!map[d]) map[d] = { iata: d, name: iataToLabel(d), lucro: 0, sales: [] };
      map[d].lucro += (s.received_value || 0) - (s.total_cost || 0);
      map[d].sales.push(s);
    });
    return Object.values(map).sort((a, b) => b.lucro - a.lucro).slice(0, 8);
  }, [filtered]);

  const NoData = () => <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>;

  const handleBarClick = (data: any, chart: string) => {
    if (!data?.activePayload?.[0]?.payload) return;
    const payload = data.activePayload[0].payload;
    if (payload.sales) setDrilldown({ label: `${chart} — ${payload.month || payload.name || ''}`, sales: payload.sales });
  };

  return (
    <>
      <div className="space-y-4">
        <h2 className="section-title">Financeiro</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 tracking-tight">Receita × Custo × Lucro (mensal)</h3>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyData} onClick={(e) => handleBarClick(e, "Mensal")}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="receita" fill="hsl(var(--chart-1))" name="Receita" radius={[4, 4, 0, 0]} cursor="pointer" />
                  <Bar dataKey="custo" fill="hsl(var(--chart-2))" name="Custo" radius={[4, 4, 0, 0]} cursor="pointer" />
                  <Bar dataKey="lucro" fill="hsl(var(--chart-3))" name="Lucro" radius={[4, 4, 0, 0]} cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            ) : <NoData />}
          </Card>

          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 tracking-tight">Margem % Mensal</h3>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={monthlyData} onClick={(e) => handleBarClick(e, "Margem")}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} unit="%" domain={['auto', 'auto']} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                  <ReferenceLine y={avgMargin} stroke="hsl(var(--accent))" strokeDasharray="6 4" label={{ value: `Média: ${avgMargin.toFixed(1)}%`, position: "right", fontSize: 9, fill: "hsl(var(--accent))" }} />
                  <Line
                    type="monotone"
                    dataKey="margem"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2.5}
                    dot={{ r: 5, fill: 'hsl(var(--card))', strokeWidth: 2.5, stroke: 'hsl(var(--chart-1))' }}
                    activeDot={{ r: 7, fill: 'hsl(var(--chart-1))' }}
                    name="Margem %"
                    cursor="pointer"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : <NoData />}
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 tracking-tight">Lucro por Vendedor</h3>
            {sellerProfit.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sellerProfit} layout="vertical" onClick={(e) => handleBarClick(e, "Vendedor")}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={100} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                  <Bar dataKey="lucro" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} name="Lucro" cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            ) : <NoData />}
          </Card>

          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 tracking-tight">Lucro por Destino (Top 8)</h3>
            {destProfit.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={destProfit} layout="vertical" onClick={(e) => handleBarClick(e, "Destino")}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={130} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                  <Bar dataKey="lucro" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} name="Lucro" cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            ) : <NoData />}
          </Card>
        </div>
      </div>

      {/* Drill-down dialog */}
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
