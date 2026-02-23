import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const PIE_COLORS = ["hsl(152, 38%, 16%)", "hsl(38, 92%, 50%)", "hsl(210, 80%, 52%)", "hsl(152, 60%, 40%)", "hsl(280, 60%, 50%)"];

interface CostItem {
  sale_id: string;
  category: string;
  miles_quantity: number | null;
  miles_price_per_thousand: number | null;
  miles_program: string | null;
  cash_value: number | null;
  total_item_cost: number | null;
}

interface Sale {
  id: string;
  miles_program: string | null;
  received_value: number;
  total_cost: number;
  margin: number;
}

interface Props {
  filtered: Sale[];
  costItems: CostItem[];
}

export default function MilesSection({ filtered, costItems }: Props) {
  const saleIds = useMemo(() => new Set(filtered.map(s => (s as any).id)), [filtered]);

  const relevantCosts = useMemo(
    () => costItems.filter(c => saleIds.has(c.sale_id)),
    [costItems, saleIds]
  );

  const totalMiles = relevantCosts.reduce((s, c) => s + (c.miles_quantity || 0), 0);
  const avgMilePrice = (() => {
    const items = relevantCosts.filter(c => c.miles_price_per_thousand && c.miles_price_per_thousand > 0);
    if (items.length === 0) return 0;
    return items.reduce((s, c) => s + (c.miles_price_per_thousand || 0), 0) / items.length;
  })();

  const milesVsCash = useMemo(() => {
    let milesCount = 0, cashCount = 0;
    filtered.forEach(s => { if (s.miles_program) milesCount++; else cashCount++; });
    return [
      { name: "Milhas", value: milesCount },
      { name: "Cash", value: cashCount },
    ].filter(d => d.value > 0);
  }, [filtered]);

  const programData = useMemo(() => {
    const map: Record<string, number> = {};
    relevantCosts.forEach(c => {
      if (c.miles_program) map[c.miles_program] = (map[c.miles_program] || 0) + (c.miles_quantity || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [relevantCosts]);

  const marginByType = useMemo(() => {
    const miles = filtered.filter(s => s.miles_program);
    const cash = filtered.filter(s => !s.miles_program);
    const avgMiles = miles.length > 0 ? miles.reduce((s, v) => s + (v.margin || 0), 0) / miles.length : 0;
    const avgCash = cash.length > 0 ? cash.reduce((s, v) => s + (v.margin || 0), 0) / cash.length : 0;
    return [
      { name: "Milhas", margem: Number(avgMiles.toFixed(1)) },
      { name: "Cash", margem: Number(avgCash.toFixed(1)) },
    ];
  }, [filtered]);

  const NoData = () => <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-serif text-foreground">Milhas</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3.5 glass-card">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Milhas</span>
          <p className="text-lg font-bold text-foreground">{totalMiles.toLocaleString("pt-BR")}</p>
        </Card>
        <Card className="p-3.5 glass-card">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Custo Médio Milheiro</span>
          <p className="text-lg font-bold text-foreground">{fmt(avgMilePrice)}</p>
        </Card>
        <Card className="p-3.5 glass-card">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Vendas c/ Milhas</span>
          <p className="text-lg font-bold text-foreground">{milesVsCash.find(d => d.name === "Milhas")?.value || 0}</p>
        </Card>
        <Card className="p-3.5 glass-card">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Vendas Cash</span>
          <p className="text-lg font-bold text-foreground">{milesVsCash.find(d => d.name === "Cash")?.value || 0}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Milhas vs Cash</h3>
          {milesVsCash.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={milesVsCash} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} label>
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(148, 12%, 89%)" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} name="Milhas" />
              </BarChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </Card>

        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Margem Média: Milhas vs Cash</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={marginByType}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(148, 12%, 89%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="margem" fill="hsl(152, 38%, 16%)" radius={[4, 4, 0, 0]} name="Margem %" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
