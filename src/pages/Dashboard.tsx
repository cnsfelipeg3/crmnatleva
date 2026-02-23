import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DollarSign, TrendingUp, Users, Plane, Target, Plus, List,
  AlertTriangle, FileWarning, ShieldAlert, Clock,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

const RoutesMap = lazy(() => import("@/components/RoutesMap"));
const ClientDistributionMap = lazy(() => import("@/components/ClientDistributionMap"));

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Sale {
  id: string; name: string; display_id: string; status: string;
  origin_iata: string | null; destination_iata: string | null;
  departure_date: string | null; return_date: string | null;
  adults: number; children: number; products: string[];
  received_value: number; total_cost: number; profit: number; margin: number;
  airline: string | null; locators: string[];
  created_at: string; close_date: string | null;
  emission_status: string | null; hotel_name: string | null;
  is_international: boolean | null; miles_program: string | null;
  seller_id: string | null;
}

export default function Dashboard() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("sales").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setSales((data || []) as Sale[]);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    if (period === "all") return sales;
    const now = new Date();
    const months = period === "30d" ? 1 : period === "90d" ? 3 : period === "12m" ? 12 : 0;
    const cutoff = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
    return sales.filter(s => new Date(s.created_at) >= cutoff);
  }, [sales, period]);

  const totalRevenue = filtered.reduce((s, v) => s + (v.received_value || 0), 0);
  const totalCost = filtered.reduce((s, v) => s + (v.total_cost || 0), 0);
  const totalProfit = totalRevenue - totalCost;
  const avgMargin = filtered.length > 0 ? filtered.reduce((s, v) => s + (v.margin || 0), 0) / filtered.length : 0;
  const avgTicket = filtered.length > 0 ? totalRevenue / filtered.length : 0;
  const totalPax = filtered.reduce((s, v) => s + (v.adults || 0) + (v.children || 0), 0);

  const kpis = [
    { label: "Receita", value: fmt(totalRevenue), icon: DollarSign, color: "text-success" },
    { label: "Lucro", value: fmt(totalProfit), icon: TrendingUp, color: "text-primary" },
    { label: "Margem", value: `${avgMargin.toFixed(1)}%`, icon: Target, color: "text-accent" },
    { label: "Ticket Médio", value: fmt(avgTicket), icon: DollarSign, color: "text-info" },
    { label: "PAX", value: totalPax.toString(), icon: Users, color: "text-primary" },
    { label: "Vendas", value: filtered.length.toString(), icon: Plane, color: "text-success" },
  ];

  // Monthly revenue/cost/profit
  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string; receita: number; custo: number; lucro: number; margem: number; count: number }> = {};
    filtered.forEach(s => {
      const d = new Date(s.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map[key]) map[key] = { month: key, receita: 0, custo: 0, lucro: 0, margem: 0, count: 0 };
      map[key].receita += s.received_value || 0;
      map[key].custo += s.total_cost || 0;
      map[key].lucro += (s.received_value || 0) - (s.total_cost || 0);
      map[key].count++;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).map(m => ({
      ...m, margem: m.receita > 0 ? (m.lucro / m.receita) * 100 : 0,
    }));
  }, [filtered]);

  // Destinations
  const destData = useMemo(() => {
    const c: Record<string, number> = {};
    filtered.forEach(s => { if (s.destination_iata) c[s.destination_iata] = (c[s.destination_iata] || 0) + 1; });
    return Object.entries(c).map(([name, vendas]) => ({ name, vendas })).sort((a, b) => b.vendas - a.vendas).slice(0, 8);
  }, [filtered]);

  // Products
  const productData = useMemo(() => {
    const c: Record<string, number> = {};
    filtered.forEach(s => (s.products || []).forEach(p => (c[p] = (c[p] || 0) + 1)));
    return Object.entries(c).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // Miles vs Cash
  const milesVsCash = useMemo(() => {
    let milesCount = 0, cashCount = 0;
    filtered.forEach(s => {
      if (s.miles_program) milesCount++; else cashCount++;
    });
    return [
      { name: "Milhas", value: milesCount },
      { name: "R$ (Cash)", value: cashCount },
    ].filter(d => d.value > 0);
  }, [filtered]);

  // Routes for map
  const routes = useMemo(() => {
    const c: Record<string, { count: number; revenue: number }> = {};
    filtered.forEach(s => {
      if (s.origin_iata && s.destination_iata) {
        const k = `${s.origin_iata}-${s.destination_iata}`;
        if (!c[k]) c[k] = { count: 0, revenue: 0 };
        c[k].count++;
        c[k].revenue += s.received_value || 0;
      }
    });
    return Object.entries(c).map(([k, v]) => {
      const [origin, destination] = k.split("-");
      return { origin, destination, ...v };
    }).sort((a, b) => b.count - a.count);
  }, [filtered]);

  // Alerts
  const alerts = useMemo(() => {
    const a: { type: string; icon: any; msg: string; saleId: string }[] = [];
    filtered.forEach(s => {
      if ((s.margin || 0) < 10 && s.received_value > 0) a.push({ type: "warning", icon: AlertTriangle, msg: `${s.display_id} — Margem baixa: ${(s.margin || 0).toFixed(1)}%`, saleId: s.id });
      if (s.status === "Emitido" && (!s.locators || s.locators.length === 0 || s.locators.every(l => !l))) a.push({ type: "error", icon: FileWarning, msg: `${s.display_id} — Localizador vazio (status Emitido)`, saleId: s.id });
      if (s.is_international && !s.hotel_name && s.products?.includes("Hotel")) a.push({ type: "info", icon: ShieldAlert, msg: `${s.display_id} — Internacional sem hotel`, saleId: s.id });
    });
    return a.slice(0, 10);
  }, [filtered]);

  const pieColors = ["hsl(152, 38%, 16%)", "hsl(38, 92%, 50%)", "hsl(210, 80%, 52%)", "hsl(152, 60%, 40%)", "hsl(0, 72%, 51%)"];

  const recentSales = filtered.slice(0, 5);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral NatLeva</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo período</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="12m">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => navigate("/sales/new")}>
            <Plus className="w-4 h-4 mr-1" /> Nova Venda
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : (
        <>
          {/* KPIs */}
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

          {/* Map */}
          {routes.length > 0 && (
            <Card className="p-5 glass-card">
              <h3 className="text-sm font-semibold text-foreground mb-3">Mapa de Rotas</h3>
              <Suspense fallback={<div className="h-[360px] flex items-center justify-center text-muted-foreground">Carregando mapa...</div>}>
                <RoutesMap routes={routes} />
              </Suspense>
              {/* Top routes */}
              <div className="mt-3 flex flex-wrap gap-2">
                {routes.slice(0, 5).map((r, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-mono">
                    {r.origin} → {r.destination} ({r.count})
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Client Distribution Map */}
          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-3">Distribuição de Clientes por Região</h3>
            <Suspense fallback={<div className="h-[320px] flex items-center justify-center text-muted-foreground">Carregando mapa...</div>}>
              <ClientDistributionMap />
            </Suspense>
          </Card>

          {/* Charts row 1: Monthly + Margin */}
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
              ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
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
              ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
            </Card>
          </div>

          {/* Charts row 2: Destinations + Products + Miles */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-5 glass-card">
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

            <Card className="p-5 glass-card">
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

            <Card className="p-5 glass-card">
              <h3 className="text-sm font-semibold text-foreground mb-4">Milhas vs Cash</h3>
              {milesVsCash.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={milesVsCash} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} label>
                      {milesVsCash.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
            </Card>
          </div>

          {/* Bottom row: Recent Sales + Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5 glass-card">
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

            <Card className="p-5 glass-card">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" /> Alertas de Qualidade
              </h3>
              {alerts.length > 0 ? (
                <div className="space-y-2">
                  {alerts.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors text-sm"
                      onClick={() => navigate(`/sales/${a.saleId}`)}
                    >
                      <a.icon className="w-4 h-4 text-warning shrink-0" />
                      <span className="text-foreground truncate">{a.msg}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum alerta ativo 🎉</p>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
