import { MOCK_SALES, MOCK_SELLERS } from "@/data/mockData";
import { Card } from "@/components/ui/card";
import {
  DollarSign,
  TrendingUp,
  Users,
  Plane,
  AlertTriangle,
  Target,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Dashboard() {
  const totalRevenue = MOCK_SALES.reduce((s, v) => s + v.receivedValue, 0);
  const totalCost = MOCK_SALES.reduce((s, v) => s + v.totalCost, 0);
  const totalProfit = totalRevenue - totalCost;
  const avgMargin = MOCK_SALES.reduce((s, v) => s + v.margin, 0) / MOCK_SALES.length;
  const avgTicket = totalRevenue / MOCK_SALES.length;
  const totalPax = MOCK_SALES.reduce((s, v) => s + v.pax.adults + v.pax.children, 0);
  const totalAlerts = MOCK_SALES.reduce((s, v) => s + v.alerts.length, 0);

  const kpis = [
    { label: "Receita Total", value: fmt(totalRevenue), icon: DollarSign, color: "text-success" },
    { label: "Lucro Total", value: fmt(totalProfit), icon: TrendingUp, color: "text-primary" },
    { label: "Margem Média", value: `${avgMargin.toFixed(1)}%`, icon: Target, color: "text-accent" },
    { label: "Ticket Médio", value: fmt(avgTicket), icon: DollarSign, color: "text-info" },
    { label: "Total PAX", value: totalPax.toString(), icon: Users, color: "text-primary" },
    { label: "Vendas", value: MOCK_SALES.length.toString(), icon: Plane, color: "text-success" },
    { label: "Alertas", value: totalAlerts.toString(), icon: AlertTriangle, color: "text-warning" },
  ];

  // Seller performance
  const sellerData = MOCK_SELLERS.map((s) => {
    const sales = MOCK_SALES.filter((v) => v.seller.id === s.id);
    return {
      name: s.name.split(" ")[0],
      vendas: sales.length,
      receita: sales.reduce((a, v) => a + v.receivedValue, 0),
      lucro: sales.reduce((a, v) => a + v.profit, 0),
    };
  });

  // Products mix
  const productCount: Record<string, number> = {};
  MOCK_SALES.forEach((s) =>
    s.products.forEach((p) => (productCount[p] = (productCount[p] || 0) + 1))
  );
  const productData = Object.entries(productCount).map(([name, value]) => ({ name, value }));
  const pieColors = ["hsl(152, 38%, 16%)", "hsl(38, 92%, 50%)", "hsl(210, 80%, 52%)", "hsl(152, 60%, 40%)"];

  // Destinations
  const destCount: Record<string, number> = {};
  MOCK_SALES.forEach((s) => (destCount[s.destination.city] = (destCount[s.destination.city] || 0) + 1));
  const destData = Object.entries(destCount)
    .map(([name, vendas]) => ({ name, vendas }))
    .sort((a, b) => b.vendas - a.vendas);

  // Monthly trend (simplified mock)
  const trendData = [
    { month: "Jan", receita: 15000, custo: 11000, lucro: 4000 },
    { month: "Fev", receita: 64600, custo: 48650, lucro: 15950 },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-serif text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do desempenho NatLeva</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4 glass-card">
            <div className="flex items-center gap-2 mb-2">
              <k.icon className={`w-4 h-4 ${k.color}`} />
              <span className="text-xs text-muted-foreground font-medium">{k.label}</span>
            </div>
            <p className="text-lg font-bold text-foreground">{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue trend */}
        <Card className="p-5 col-span-2 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Receita, Custo e Lucro</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(148, 12%, 89%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Line type="monotone" dataKey="receita" stroke="hsl(152, 38%, 16%)" strokeWidth={2} name="Receita" />
              <Line type="monotone" dataKey="custo" stroke="hsl(38, 92%, 50%)" strokeWidth={2} name="Custo" />
              <Line type="monotone" dataKey="lucro" stroke="hsl(152, 60%, 40%)" strokeWidth={2} name="Lucro" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Product mix */}
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Mix de Produtos</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={productData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {productData.map((_, i) => (
                  <Cell key={i} fill={pieColors[i % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Seller performance */}
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Performance por Vendedor</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sellerData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(148, 12%, 89%)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="receita" fill="hsl(152, 38%, 16%)" radius={[4, 4, 0, 0]} name="Receita" />
              <Bar dataKey="lucro" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} name="Lucro" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Top destinations */}
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Top Destinos</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={destData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(148, 12%, 89%)" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
              <Tooltip />
              <Bar dataKey="vendas" fill="hsl(210, 80%, 52%)" radius={[0, 4, 4, 0]} name="Vendas" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Alerts */}
      {totalAlerts > 0 && (
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Alertas Ativos
          </h3>
          <div className="space-y-2">
            {MOCK_SALES.filter((s) => s.alerts.length > 0).map((s) =>
              s.alerts.map((a, i) => (
                <div
                  key={`${s.id}-${i}`}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                    a.type === "danger"
                      ? "bg-destructive/10 text-destructive"
                      : a.type === "warning"
                      ? "bg-warning/10 text-warning-foreground"
                      : "bg-info/10 text-info"
                  }`}
                >
                  <span>{a.message}</span>
                  <span className="text-xs text-muted-foreground">{s.name}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
