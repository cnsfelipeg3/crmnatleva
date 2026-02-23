import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Users, Plane, Target, Plus, List, ArrowRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Dashboard() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("sales").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setSales(data || []);
      setLoading(false);
    });
  }, []);

  const totalRevenue = sales.reduce((s, v) => s + (v.received_value || 0), 0);
  const totalCost = sales.reduce((s, v) => s + (v.total_cost || 0), 0);
  const totalProfit = totalRevenue - totalCost;
  const avgMargin = sales.length > 0 ? sales.reduce((s, v) => s + (v.margin || 0), 0) / sales.length : 0;
  const avgTicket = sales.length > 0 ? totalRevenue / sales.length : 0;
  const totalPax = sales.reduce((s, v) => s + (v.adults || 0) + (v.children || 0), 0);

  const kpis = [
    { label: "Receita", value: fmt(totalRevenue), icon: DollarSign, color: "text-success" },
    { label: "Lucro", value: fmt(totalProfit), icon: TrendingUp, color: "text-primary" },
    { label: "Margem", value: `${avgMargin.toFixed(1)}%`, icon: Target, color: "text-accent" },
    { label: "Ticket Médio", value: fmt(avgTicket), icon: DollarSign, color: "text-info" },
    { label: "PAX", value: totalPax.toString(), icon: Users, color: "text-primary" },
    { label: "Vendas", value: sales.length.toString(), icon: Plane, color: "text-success" },
  ];

  // Destinations
  const destCount: Record<string, number> = {};
  sales.forEach(s => { if (s.destination_iata) destCount[s.destination_iata] = (destCount[s.destination_iata] || 0) + 1; });
  const destData = Object.entries(destCount).map(([name, vendas]) => ({ name, vendas })).sort((a, b) => b.vendas - a.vendas).slice(0, 8);

  // Products
  const productCount: Record<string, number> = {};
  sales.forEach(s => (s.products || []).forEach((p: string) => (productCount[p] = (productCount[p] || 0) + 1)));
  const productData = Object.entries(productCount).map(([name, value]) => ({ name, value }));
  const pieColors = ["hsl(152, 38%, 16%)", "hsl(38, 92%, 50%)", "hsl(210, 80%, 52%)", "hsl(152, 60%, 40%)"];

  // Recent sales
  const recentSales = sales.slice(0, 5);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral NatLeva</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => navigate("/sales/new")}>
            <Plus className="w-4 h-4 mr-1" /> Nova Venda
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/passengers")}>
            <Users className="w-4 h-4 mr-1" /> Passageiros
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {kpis.map(k => (
              <Card key={k.label} className="p-4 glass-card hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <k.icon className={`w-4 h-4 ${k.color}`} />
                  <span className="text-xs text-muted-foreground font-medium">{k.label}</span>
                </div>
                <p className="text-lg font-bold text-foreground">{k.value}</p>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Charts */}
            <Card className="p-5 glass-card lg:col-span-1">
              <h3 className="text-sm font-semibold text-foreground mb-4">Top Destinos</h3>
              {destData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={destData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(148, 12%, 89%)" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={50} />
                    <Tooltip />
                    <Bar dataKey="vendas" fill="hsl(152, 38%, 16%)" radius={[0, 4, 4, 0]} name="Vendas" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
            </Card>

            <Card className="p-5 glass-card lg:col-span-1">
              <h3 className="text-sm font-semibold text-foreground mb-4">Mix de Produtos</h3>
              {productData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={productData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {productData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
            </Card>

            {/* Recent Sales */}
            <Card className="p-5 glass-card lg:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">Vendas Recentes</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate("/sales")}>
                  <List className="w-3.5 h-3.5 mr-1" /> Ver todas
                </Button>
              </div>
              {recentSales.length > 0 ? (
                <div className="space-y-2">
                  {recentSales.map(sale => (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => navigate(`/sales/${sale.id}`)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{sale.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{sale.display_id} · {sale.origin_iata || "?"} → {sale.destination_iata || "?"}</p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-xs font-semibold text-success">{fmt(sale.received_value || 0)}</p>
                        <p className="text-[10px] text-muted-foreground">{sale.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-3">Nenhuma venda ainda</p>
                  <Button size="sm" onClick={() => navigate("/sales/new")}>
                    <Plus className="w-4 h-4 mr-1" /> Criar Primeira Venda
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
