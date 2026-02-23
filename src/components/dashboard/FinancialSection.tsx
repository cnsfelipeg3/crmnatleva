import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Sale {
  received_value: number;
  total_cost: number;
  profit: number;
  margin: number;
  created_at: string;
  destination_iata: string | null;
  seller_id: string | null;
}

interface Props {
  filtered: Sale[];
  sellerNames: Record<string, string>;
}

export default function FinancialSection({ filtered, sellerNames }: Props) {
  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string; receita: number; custo: number; lucro: number; count: number }> = {};
    filtered.forEach(s => {
      const d = new Date(s.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map[key]) map[key] = { month: key, receita: 0, custo: 0, lucro: 0, count: 0 };
      map[key].receita += s.received_value || 0;
      map[key].custo += s.total_cost || 0;
      map[key].lucro += (s.received_value || 0) - (s.total_cost || 0);
      map[key].count++;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).map(m => ({
      ...m, margem: m.receita > 0 ? (m.lucro / m.receita) * 100 : 0,
    }));
  }, [filtered]);

  const sellerProfit = useMemo(() => {
    const map: Record<string, { name: string; lucro: number; ticket: number; count: number }> = {};
    filtered.forEach(s => {
      const sid = s.seller_id || "sem";
      const name = sellerNames[sid] || "Sem vendedor";
      if (!map[sid]) map[sid] = { name, lucro: 0, ticket: 0, count: 0 };
      map[sid].lucro += (s.received_value || 0) - (s.total_cost || 0);
      map[sid].ticket += s.received_value || 0;
      map[sid].count++;
    });
    return Object.values(map).map(v => ({
      ...v, ticket: v.count > 0 ? v.ticket / v.count : 0,
    })).sort((a, b) => b.lucro - a.lucro).slice(0, 8);
  }, [filtered, sellerNames]);

  const destProfit = useMemo(() => {
    const map: Record<string, { name: string; lucro: number }> = {};
    filtered.forEach(s => {
      const d = s.destination_iata || "N/A";
      if (!map[d]) map[d] = { name: d, lucro: 0 };
      map[d].lucro += (s.received_value || 0) - (s.total_cost || 0);
    });
    return Object.values(map).sort((a, b) => b.lucro - a.lucro).slice(0, 8);
  }, [filtered]);

  const NoData = () => <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-serif text-foreground">Financeiro</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Receita × Custo × Lucro (mensal)</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(148, 12%, 89%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="receita" fill="hsl(152, 60%, 40%)" name="Receita" radius={[3, 3, 0, 0]} />
                <Bar dataKey="custo" fill="hsl(38, 92%, 50%)" name="Custo" radius={[3, 3, 0, 0]} />
                <Bar dataKey="lucro" fill="hsl(152, 38%, 16%)" name="Lucro" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </Card>

        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Margem % (mensal)</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(148, 12%, 89%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                <Line type="monotone" dataKey="margem" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 4 }} name="Margem %" />
              </LineChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Lucro por Vendedor</h3>
          {sellerProfit.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sellerProfit} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(148, 12%, 89%)" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="lucro" fill="hsl(152, 38%, 16%)" radius={[0, 4, 4, 0]} name="Lucro" />
              </BarChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </Card>

        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Lucro por Destino (Top 8)</h3>
          {destProfit.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={destProfit} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(148, 12%, 89%)" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={50} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="lucro" fill="hsl(210, 80%, 52%)" radius={[0, 4, 4, 0]} name="Lucro" />
              </BarChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </Card>
      </div>
    </div>
  );
}
