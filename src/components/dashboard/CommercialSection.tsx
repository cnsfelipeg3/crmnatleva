import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { iataToLabel, normalizeProducts } from "@/lib/iataUtils";
import { PieChart, Pie, Cell as PieCell } from "recharts";

const PIE_COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(280, 60%, 50%)",
  "hsl(200, 50%, 45%)", "hsl(340, 55%, 50%)",
];

interface Sale {
  destination_iata: string | null;
  products: string[];
  seller_id: string | null;
  received_value: number;
  created_at: string;
}

interface Segment { sale_id: string; origin_iata: string; destination_iata: string; }

interface Props {
  filtered: Sale[];
  segments: Segment[];
  sellerNames: Record<string, string>;
}

export default function CommercialSection({ filtered, segments, sellerNames }: Props) {
  const destData = useMemo(() => {
    const c: Record<string, number> = {};
    filtered.forEach(s => { if (s.destination_iata) c[s.destination_iata] = (c[s.destination_iata] || 0) + 1; });
    return Object.entries(c)
      .map(([iata, vendas]) => ({ name: iataToLabel(iata), vendas }))
      .sort((a, b) => b.vendas - a.vendas)
      .slice(0, 10);
  }, [filtered]);

  // Group small product slices into "Outros"
  const productData = useMemo(() => {
    const c: Record<string, number> = {};
    filtered.forEach(s => normalizeProducts(s.products || []).forEach(p => (c[p] = (c[p] || 0) + 1)));
    const all = Object.entries(c).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const total = all.reduce((s, v) => s + v.value, 0);
    
    // Keep items with >= 3% share, group rest as "Outros"
    const threshold = total * 0.03;
    const major: typeof all = [];
    let othersCount = 0;
    all.forEach(item => {
      if (item.value >= threshold) {
        major.push(item);
      } else {
        othersCount += item.value;
      }
    });
    if (othersCount > 0) major.push({ name: "Outros", value: othersCount });
    return major;
  }, [filtered]);

  const itineraryData = useMemo(() => {
    const saleSegments: Record<string, Segment[]> = {};
    segments.forEach(seg => {
      if (!saleSegments[seg.sale_id]) saleSegments[seg.sale_id] = [];
      saleSegments[seg.sale_id].push(seg);
    });

    let roundTrip = 0, multiCity = 0, oneWay = 0;
    const saleIds = new Set(filtered.map(s => (s as any).id));
    Object.entries(saleSegments).forEach(([saleId, segs]) => {
      if (!saleIds.has(saleId)) return;
      if (segs.length === 1) oneWay++;
      else if (segs.length === 2 && segs[0].origin_iata === segs[1].destination_iata) roundTrip++;
      else multiCity++;
    });

    return [
      { name: "Ida/Volta", value: roundTrip },
      { name: "Multi-City", value: multiCity },
      { name: "Só ida", value: oneWay },
    ].filter(d => d.value > 0);
  }, [filtered, segments]);

  const NoData = () => <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>;

  const renderCustomLabel = ({ name, percent, cx, cy, midAngle, innerRadius, outerRadius }: any) => {
    if (percent < 0.04) return null; // Don't render label for <4%
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
    <div className="space-y-4">
      <h2 className="section-title">Comercial</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 tracking-tight">Top Destinos</h3>
          {destData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={destData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} width={110} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                <Bar dataKey="vendas" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} name="Vendas" />
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
                <Pie data={itineraryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} label={{ fontSize: 10 }}>
                  {itineraryData.map((_, i) => <PieCell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </Card>
      </div>
    </div>
  );
}
