import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const PIE_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

interface CostItem {
  sale_id: string; category: string;
  miles_quantity: number | null; miles_price_per_thousand: number | null;
  miles_program: string | null; cash_value: number | null; total_item_cost: number | null;
}

interface Sale {
  id: string; display_id: string; name: string; status: string;
  miles_program: string | null; received_value: number; total_cost: number; margin: number;
}

interface Props { filtered: Sale[]; costItems: CostItem[]; }

export default function MilesSection({ filtered, costItems }: Props) {
  const navigate = useNavigate();
  const [drilldown, setDrilldown] = useState<{ label: string; sales: Sale[] } | null>(null);

  const saleIds = useMemo(() => new Set(filtered.map(s => s.id)), [filtered]);
  const relevantCosts = useMemo(() => costItems.filter(c => saleIds.has(c.sale_id)), [costItems, saleIds]);

  const totalMiles = relevantCosts.reduce((s, c) => s + (c.miles_quantity || 0), 0);
  const avgMilePrice = (() => {
    const items = relevantCosts.filter(c => c.miles_price_per_thousand && c.miles_price_per_thousand > 0);
    if (items.length === 0) return 0;
    return items.reduce((s, c) => s + (c.miles_price_per_thousand || 0), 0) / items.length;
  })();

  const milesSales = useMemo(() => filtered.filter(s => s.miles_program), [filtered]);
  const cashSales = useMemo(() => filtered.filter(s => !s.miles_program), [filtered]);

  const milesVsCash = useMemo(() => [
    { name: "Milhas", value: milesSales.length, sales: milesSales },
    { name: "Cash", value: cashSales.length, sales: cashSales },
  ].filter(d => d.value > 0), [milesSales, cashSales]);

  const programData = useMemo(() => {
    const map: Record<string, number> = {};
    relevantCosts.forEach(c => { if (c.miles_program) map[c.miles_program] = (map[c.miles_program] || 0) + (c.miles_quantity || 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [relevantCosts]);

  const marginByType = useMemo(() => {
    const avgMiles = milesSales.length > 0 ? milesSales.reduce((s, v) => s + (v.margin || 0), 0) / milesSales.length : 0;
    const avgCash = cashSales.length > 0 ? cashSales.reduce((s, v) => s + (v.margin || 0), 0) / cashSales.length : 0;
    return [
      { name: "Milhas", margem: Number(avgMiles.toFixed(1)), sales: milesSales },
      { name: "Cash", margem: Number(avgCash.toFixed(1)), sales: cashSales },
    ];
  }, [milesSales, cashSales]);

  const kpiCards = [
    { label: "Total Milhas", value: totalMiles.toLocaleString("pt-BR"), sales: milesSales },
    { label: "Custo Médio Milheiro", value: fmt(avgMilePrice), sales: milesSales },
    { label: "Vendas c/ Milhas", value: milesSales.length.toString(), sales: milesSales },
    { label: "Vendas Cash", value: cashSales.length.toString(), sales: cashSales },
  ];

  const NoData = () => <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>;

  return (
    <>
      <div className="space-y-4">
        <h2 className="section-title">✈️ Milhas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpiCards.map(k => (
            <Card key={k.label} className="p-3.5 glass-card cursor-pointer hover:ring-1 hover:ring-accent/30 transition-all"
              onClick={() => k.sales.length > 0 && setDrilldown({ label: k.label, sales: k.sales })}>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{k.label}</span>
              <p className="text-lg font-bold text-foreground">{k.value}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">Milhas vs Cash</h3>
            {milesVsCash.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={milesVsCash} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} label
                    onClick={(_, idx) => {
                      const item = milesVsCash[idx];
                      if (item) setDrilldown({ label: `Tipo: ${item.name}`, sales: item.sales });
                    }}
                    className="cursor-pointer"
                  >
                    {milesVsCash.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <NoData />}
          </Card>

          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">Programas Mais Usados</h3>
            {programData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={programData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={80} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} name="Milhas" cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            ) : <NoData />}
          </Card>

          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">Margem Média: Milhas vs Cash</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={marginByType} onClick={(e) => {
                if (e?.activePayload?.[0]?.payload?.sales) {
                  const p = e.activePayload[0].payload;
                  setDrilldown({ label: `Margem: ${p.name}`, sales: p.sales });
                }
              }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} unit="%" />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="margem" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Margem %" cursor="pointer" />
              </BarChart>
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
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
