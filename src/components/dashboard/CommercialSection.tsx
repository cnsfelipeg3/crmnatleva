import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { iataToLabel, normalizeProducts } from "@/lib/iataUtils";
import { PieChart, Pie, Cell as PieCell } from "recharts";

const PIE_COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(280, 60%, 50%)",
  "hsl(200, 50%, 45%)", "hsl(340, 55%, 50%)",
];

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Sale {
  id: string; display_id: string; name: string;
  destination_iata: string | null;
  products: string[];
  seller_id: string | null;
  received_value: number;
  total_cost: number; margin: number;
  created_at: string; close_date: string | null;
}

interface Segment { sale_id: string; origin_iata: string; destination_iata: string; }

interface Props {
  filtered: Sale[];
  segments: Segment[];
  sellerNames: Record<string, string>;
}

export default function CommercialSection({ filtered, segments, sellerNames }: Props) {
  const navigate = useNavigate();
  const [drilldown, setDrilldown] = useState<{ label: string; sales: Sale[] } | null>(null);

  const destData = useMemo(() => {
    const c: Record<string, { sales: Sale[] }> = {};
    filtered.forEach(s => {
      if (s.destination_iata) {
        if (!c[s.destination_iata]) c[s.destination_iata] = { sales: [] };
        c[s.destination_iata].sales.push(s);
      }
    });
    return Object.entries(c)
      .map(([iata, d]) => ({ name: iataToLabel(iata), vendas: d.sales.length, sales: d.sales }))
      .sort((a, b) => b.vendas - a.vendas)
      .slice(0, 10);
  }, [filtered]);

  const productData = useMemo(() => {
    const c: Record<string, Sale[]> = {};
    filtered.forEach(s => normalizeProducts(s.products || []).forEach(p => {
      if (!c[p]) c[p] = [];
      c[p].push(s);
    }));
    const all = Object.entries(c).map(([name, sales]) => ({ name, value: sales.length, sales })).sort((a, b) => b.value - a.value);
    const total = all.reduce((s, v) => s + v.value, 0);
    const threshold = total * 0.03;
    const major: typeof all = [];
    let othersSales: Sale[] = [];
    all.forEach(item => {
      if (item.value >= threshold) major.push(item);
      else othersSales = othersSales.concat(item.sales);
    });
    if (othersSales.length > 0) major.push({ name: "Outros", value: othersSales.length, sales: othersSales });
    return major;
  }, [filtered]);

  const itineraryData = useMemo(() => {
    const saleSegments: Record<string, Segment[]> = {};
    segments.forEach(seg => {
      if (!saleSegments[seg.sale_id]) saleSegments[seg.sale_id] = [];
      saleSegments[seg.sale_id].push(seg);
    });
    const saleMap = new Map(filtered.map(s => [s.id, s]));
    const groups: Record<string, Sale[]> = { "Ida/Volta": [], "Multi-City": [], "Só ida": [] };
    Object.entries(saleSegments).forEach(([saleId, segs]) => {
      const sale = saleMap.get(saleId);
      if (!sale) return;
      if (segs.length === 1) groups["Só ida"].push(sale);
      else if (segs.length === 2 && segs[0].origin_iata === segs[1].destination_iata) groups["Ida/Volta"].push(sale);
      else groups["Multi-City"].push(sale);
    });
    return Object.entries(groups).filter(([, s]) => s.length > 0).map(([name, sales]) => ({ name, value: sales.length, sales }));
  }, [filtered, segments]);

  const NoData = () => <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>;

  const renderCustomLabel = ({ name, percent, cx, cy, midAngle, outerRadius }: any) => {
    if (percent < 0.04) return null;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 20;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="hsl(var(--muted-foreground))" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={10}>
        {name} {(percent * 100).toFixed(0)}%
      </text>
    );
  };

  return (
    <>
      <div className="space-y-4">
        <h2 className="section-title">Comercial</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 tracking-tight">Top Destinos</h3>
            {destData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={destData} layout="vertical" onClick={(e) => {
                  if (e?.activePayload?.[0]?.payload?.sales) {
                    const p = e.activePayload[0].payload;
                    setDrilldown({ label: `Destino: ${p.name}`, sales: p.sales });
                  }
                }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} width={110} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                  <Bar dataKey="vendas" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} name="Vendas" cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            ) : <NoData />}
          </Card>

          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 tracking-tight">Mix de Produtos</h3>
            {productData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={productData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={75}
                    label={renderCustomLabel}
                    labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 0.5 }}
                    onClick={(_, idx) => {
                      const item = productData[idx];
                      if (item) setDrilldown({ label: `Produto: ${item.name}`, sales: item.sales });
                    }}
                    className="cursor-pointer"
                  >
                    {productData.map((_, i) => <PieCell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value} vendas`, name]}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : <NoData />}
          </Card>

          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 tracking-tight">Tipo de Itinerário</h3>
            {itineraryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={itineraryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    label={{ fontSize: 10 }}
                    onClick={(_, idx) => {
                      const item = itineraryData[idx];
                      if (item) setDrilldown({ label: `Itinerário: ${item.name}`, sales: item.sales });
                    }}
                    className="cursor-pointer"
                  >
                    {itineraryData.map((_, i) => <PieCell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                </PieChart>
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
                    <TableHead className="text-xs">Destino</TableHead>
                    <TableHead className="text-xs text-right">Valor</TableHead>
                    <TableHead className="text-xs text-right">Margem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drilldown.sales.slice(0, 80).map(s => (
                    <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setDrilldown(null); navigate(`/sales/${s.id}`); }}>
                      <TableCell className="text-xs font-mono">{s.display_id}</TableCell>
                      <TableCell className="text-xs">{s.name}</TableCell>
                      <TableCell className="text-xs">{iataToLabel(s.destination_iata)}</TableCell>
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
