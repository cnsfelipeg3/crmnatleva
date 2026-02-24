import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, ScatterChart, Scatter, ZAxis,
  AreaChart, Area, ReferenceLine,
} from "recharts";
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Wallet, Target, PiggyBank, Receipt,
  BarChart3, Clock,
} from "lucide-react";
import { fetchAllRows } from "@/lib/fetchAll";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => `${v.toFixed(1)}%`;

const COLORS = [
  "hsl(160, 60%, 45%)", "hsl(200, 70%, 50%)", "hsl(280, 60%, 55%)",
  "hsl(30, 80%, 55%)", "hsl(340, 65%, 50%)", "hsl(60, 70%, 45%)",
  "hsl(120, 50%, 40%)", "hsl(220, 60%, 55%)",
];

export default function FinanceiroIndex() {
  const navigate = useNavigate();
  const [drilldown, setDrilldown] = useState<{ label: string; items: any[] } | null>(null);

  const { data: sales = [] } = useQuery({
    queryKey: ["fin-sales"],
    queryFn: async () => {
      const data = await fetchAllRows("sales", "*", { order: { column: "created_at", ascending: false } });
      return data || [];
    },
  });

  const { data: receivables = [] } = useQuery({
    queryKey: ["fin-receivables"],
    queryFn: async () => {
      const { data } = await supabase.from("accounts_receivable").select("*");
      return data || [];
    },
  });

  const { data: payables = [] } = useQuery({
    queryKey: ["fin-payables"],
    queryFn: async () => {
      const { data } = await supabase.from("accounts_payable").select("*");
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["fin-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name");
      return data || [];
    },
  });

  const sellerNames = useMemo(() => {
    const m: Record<string, string> = {};
    profiles.forEach((p: any) => { m[p.id] = p.full_name || p.id; });
    return m;
  }, [profiles]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthSales = useMemo(() =>
    sales.filter((s: any) => {
      const d = new Date(s.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }), [sales, currentMonth, currentYear]);

  const receitaBruta = useMemo(() => monthSales.reduce((s: number, v: any) => s + (v.received_value || 0), 0), [monthSales]);
  const custoTotal = useMemo(() => monthSales.reduce((s: number, v: any) => s + (v.total_cost || 0), 0), [monthSales]);
  const lucroBruto = receitaBruta - custoTotal;
  const margemMedia = receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : 0;

  const receivablesOpen = useMemo(() =>
    receivables.filter((r: any) => r.status === 'pendente' || r.status === 'parcial' || r.status === 'atrasado'), [receivables]);
  const payablesOpen = useMemo(() =>
    payables.filter((p: any) => p.status === 'pendente' || p.status === 'parcial' || p.status === 'atrasado'), [payables]);

  const totalReceivablesOpen = receivablesOpen.reduce((s: number, r: any) => s + (r.net_value || 0), 0);
  const totalPayablesOpen = payablesOpen.reduce((s: number, p: any) => s + (p.value || 0), 0);
  const saldoCaixa = receitaBruta - custoTotal - totalPayablesOpen + totalReceivablesOpen;

  // Monthly revenue data
  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string; receita: number; custo: number; lucro: number; sales: any[] }> = {};
    sales.forEach((s: any) => {
      const d = new Date(s.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map[key]) map[key] = { month: key, receita: 0, custo: 0, lucro: 0, sales: [] };
      map[key].receita += s.received_value || 0;
      map[key].custo += s.total_cost || 0;
      map[key].lucro += (s.received_value || 0) - (s.total_cost || 0);
      map[key].sales.push(s);
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).slice(-12).map(m => ({
      ...m, monthLabel: m.month.split('-').reverse().join('/'),
      margem: m.receita > 0 ? (m.lucro / m.receita) * 100 : 0,
    }));
  }, [sales]);

  // Revenue by payment method
  const revenueByPayment = useMemo(() => {
    const map: Record<string, { name: string; value: number; sales: any[] }> = {};
    sales.forEach((s: any) => {
      const pm = s.payment_method || "Não informado";
      if (!map[pm]) map[pm] = { name: pm, value: 0, sales: [] };
      map[pm].value += s.received_value || 0;
      map[pm].sales.push(s);
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [sales]);

  // Revenue by product
  const revenueByProduct = useMemo(() => {
    const map: Record<string, { name: string; value: number; sales: any[] }> = {};
    sales.forEach((s: any) => {
      const prods = s.products && s.products.length > 0 ? s.products : ["Não informado"];
      prods.forEach((p: string) => {
        if (!map[p]) map[p] = { name: p, value: 0, sales: [] };
        map[p].value += (s.received_value || 0) / prods.length;
        map[p].sales.push(s);
      });
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [sales]);

  // Top clients
  const topClients = useMemo(() => {
    const map: Record<string, { name: string; receita: number; lucro: number; sales: any[] }> = {};
    sales.forEach((s: any) => {
      const n = s.name || "Sem nome";
      if (!map[n]) map[n] = { name: n, receita: 0, lucro: 0, sales: [] };
      map[n].receita += s.received_value || 0;
      map[n].lucro += (s.received_value || 0) - (s.total_cost || 0);
      map[n].sales.push(s);
    });
    return Object.values(map).sort((a, b) => b.receita - a.receita).slice(0, 10);
  }, [sales]);

  // Top sellers
  const topSellers = useMemo(() => {
    const map: Record<string, { name: string; receita: number; margem: number; totalR: number; totalL: number; sales: any[] }> = {};
    sales.forEach((s: any) => {
      const sid = s.seller_id || "sem";
      const name = sellerNames[sid] || "Sem vendedor";
      if (!map[sid]) map[sid] = { name, receita: 0, margem: 0, totalR: 0, totalL: 0, sales: [] };
      map[sid].totalR += s.received_value || 0;
      map[sid].totalL += (s.received_value || 0) - (s.total_cost || 0);
      map[sid].sales.push(s);
    });
    return Object.values(map).map(v => ({
      ...v, receita: v.totalR, margem: v.totalR > 0 ? (v.totalL / v.totalR) * 100 : 0,
    })).sort((a, b) => b.receita - a.receita).slice(0, 10);
  }, [sales, sellerNames]);

  // Scatter: ticket vs margin
  const scatterData = useMemo(() =>
    sales.filter((s: any) => s.received_value > 0).map((s: any) => ({
      name: s.name,
      ticket: s.received_value || 0,
      margem: s.received_value > 0 ? ((s.received_value - (s.total_cost || 0)) / s.received_value) * 100 : 0,
      display_id: s.display_id,
      id: s.id,
    })).slice(0, 200), [sales]);

  // Cash flow daily (last 30 days + next 30)
  const cashFlowData = useMemo(() => {
    const days: { date: string; entradas: number; saidas: number; saldo: number }[] = [];
    const start = new Date(); start.setDate(start.getDate() - 30);
    let runningBalance = 0;
    for (let i = 0; i < 60; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const entradas = receivables.filter((r: any) => r.due_date === dateStr && r.status === 'recebido').reduce((s: number, r: any) => s + (r.net_value || 0), 0)
        + sales.filter((s: any) => s.created_at?.slice(0, 10) === dateStr).reduce((s: number, v: any) => s + (v.received_value || 0), 0);
      const saidas = payables.filter((p: any) => p.due_date === dateStr && p.status === 'pago').reduce((s: number, p: any) => s + (p.value || 0), 0)
        + sales.filter((s: any) => s.created_at?.slice(0, 10) === dateStr).reduce((s: number, v: any) => s + (v.total_cost || 0), 0);
      runningBalance += entradas - saidas;
      days.push({ date: dateStr.slice(5), entradas, saidas, saldo: runningBalance });
    }
    return days;
  }, [sales, receivables, payables]);

  // Alerts
  const alerts = useMemo(() => {
    const list: { type: string; message: string; count: number; items: any[] }[] = [];
    const today = new Date().toISOString().slice(0, 10);
    const in3days = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    const in7days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    const vencendo3 = receivables.filter((r: any) => r.status === 'pendente' && r.due_date && r.due_date <= in3days && r.due_date >= today);
    if (vencendo3.length > 0) list.push({ type: "warn", message: "Recebíveis vencendo em 3 dias", count: vencendo3.length, items: vencendo3 });

    const atrasadas = receivables.filter((r: any) => r.status === 'pendente' && r.due_date && r.due_date < today);
    if (atrasadas.length > 0) list.push({ type: "error", message: "Recebíveis atrasados", count: atrasadas.length, items: atrasadas });

    const payAtrasadas = payables.filter((p: any) => p.status === 'pendente' && p.due_date && p.due_date < today);
    if (payAtrasadas.length > 0) list.push({ type: "error", message: "Contas a pagar atrasadas", count: payAtrasadas.length, items: payAtrasadas });

    const semCusto = monthSales.filter((s: any) => !s.total_cost || s.total_cost === 0);
    if (semCusto.length > 0) list.push({ type: "warn", message: "Vendas sem custo lançado", count: semCusto.length, items: semCusto });

    const margemBaixa = monthSales.filter((s: any) => {
      const m = s.received_value > 0 ? ((s.received_value - (s.total_cost || 0)) / s.received_value) * 100 : 0;
      return m < 10 && s.received_value > 0;
    });
    if (margemBaixa.length > 0) list.push({ type: "warn", message: "Vendas com margem < 10%", count: margemBaixa.length, items: margemBaixa });

    return list;
  }, [receivables, payables, monthSales]);

  const kpis = [
    { label: "Receita Bruta", value: fmt(receitaBruta), icon: DollarSign, color: "text-emerald-500", items: monthSales, sub: "mês atual" },
    { label: "Custo Total", value: fmt(custoTotal), icon: TrendingDown, color: "text-red-400", items: monthSales, sub: "mês atual" },
    { label: "Lucro Bruto", value: fmt(lucroBruto), icon: TrendingUp, color: lucroBruto >= 0 ? "text-emerald-500" : "text-red-400", items: monthSales, sub: "mês atual" },
    { label: "Margem Média", value: pct(margemMedia), icon: Target, color: "text-blue-400", items: monthSales, sub: "mês atual" },
    { label: "A Receber", value: fmt(totalReceivablesOpen), icon: ArrowUpRight, color: "text-amber-400", items: receivablesOpen, sub: `${receivablesOpen.length} pendentes` },
    { label: "A Pagar", value: fmt(totalPayablesOpen), icon: ArrowDownRight, color: "text-red-400", items: payablesOpen, sub: `${payablesOpen.length} pendentes` },
    { label: "Saldo Caixa", value: fmt(saldoCaixa), icon: Wallet, color: saldoCaixa >= 0 ? "text-emerald-500" : "text-red-500", items: monthSales, sub: "estimado" },
    { label: "Vendas do Mês", value: String(monthSales.length), icon: Receipt, color: "text-purple-400", items: monthSales, sub: "total" },
  ];

  const NoData = () => <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-display">Centro Financeiro</h1>
          <p className="text-sm text-muted-foreground">Visão executiva e operacional</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <Card
            key={kpi.label}
            className="p-4 glass-card cursor-pointer hover:scale-[1.02] transition-transform group"
            onClick={() => setDrilldown({ label: kpi.label, items: kpi.items })}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{kpi.label}</p>
                <p className={`text-xl font-bold mt-1 font-display ${kpi.color}`}>{kpi.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.sub}</p>
              </div>
              <kpi.icon className={`w-5 h-5 ${kpi.color} opacity-50 group-hover:opacity-100 transition-opacity`} />
            </div>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="p-4 glass-card border-amber-500/30">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Alertas Financeiros
          </h3>
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <button
                key={i}
                onClick={() => setDrilldown({ label: a.message, items: a.items })}
                className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${a.type === 'error' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'}`}
              >
                <span>{a.message}</span>
                <span className="font-mono font-bold">{a.count}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold mb-4">Fluxo de Caixa (60 dias)</h3>
          {cashFlowData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} interval={4} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 11 }} />
                <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="saldo" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.15} name="Saldo" />
                <Area type="monotone" dataKey="entradas" stroke="hsl(160,60%,45%)" fill="hsl(160,60%,45%)" fillOpacity={0.1} name="Entradas" />
                <Area type="monotone" dataKey="saidas" stroke="hsl(0,60%,50%)" fill="hsl(0,60%,50%)" fillOpacity={0.1} name="Saídas" />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </Card>

        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold mb-4">Receita × Custo × Lucro (mensal)</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData} onClick={(e: any) => {
                if (e?.activePayload?.[0]?.payload?.sales) setDrilldown({ label: `Mês ${e.activePayload[0].payload.monthLabel}`, items: e.activePayload[0].payload.sales });
              }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="receita" fill="hsl(var(--chart-1))" name="Receita" radius={[4, 4, 0, 0]} cursor="pointer" />
                <Bar dataKey="custo" fill="hsl(var(--chart-2))" name="Custo" radius={[4, 4, 0, 0]} cursor="pointer" />
                <Bar dataKey="lucro" fill="hsl(var(--chart-3))" name="Lucro" radius={[4, 4, 0, 0]} cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold mb-4">Receita por Forma de Pagamento</h3>
          {revenueByPayment.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenueByPayment} onClick={(e: any) => {
                if (e?.activePayload?.[0]?.payload?.sales) setDrilldown({ label: `Pagamento: ${e.activePayload[0].payload.name}`, items: e.activePayload[0].payload.sales });
              }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 11 }} />
                <Bar dataKey="value" fill="hsl(var(--chart-1))" name="Receita" radius={[4, 4, 0, 0]} cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </Card>

        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold mb-4">Composição por Produto</h3>
          {revenueByProduct.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={revenueByProduct} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" nameKey="name"
                  onClick={(entry: any) => { if (entry?.sales) setDrilldown({ label: `Produto: ${entry.name}`, items: entry.sales }); }}
                  cursor="pointer">
                  {revenueByProduct.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </Card>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold mb-4">Top 10 Clientes por Receita</h3>
          {topClients.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topClients} layout="vertical" onClick={(e: any) => {
                if (e?.activePayload?.[0]?.payload?.sales) setDrilldown({ label: `Cliente: ${e.activePayload[0].payload.name}`, items: e.activePayload[0].payload.sales });
              }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis type="number" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} width={120} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 11 }} />
                <Bar dataKey="receita" fill="hsl(var(--chart-1))" name="Receita" radius={[0, 4, 4, 0]} cursor="pointer" />
                <Bar dataKey="lucro" fill="hsl(var(--chart-3))" name="Lucro" radius={[0, 4, 4, 0]} cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </Card>

        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold mb-4">Top 10 Vendedores</h3>
          {topSellers.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topSellers} layout="vertical" onClick={(e: any) => {
                if (e?.activePayload?.[0]?.payload?.sales) setDrilldown({ label: `Vendedor: ${e.activePayload[0].payload.name}`, items: e.activePayload[0].payload.sales });
              }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis type="number" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} width={120} />
                <Tooltip formatter={(v: number, name: string) => name === 'Margem' ? pct(v as number) : fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 11 }} />
                <Bar dataKey="receita" fill="hsl(var(--chart-1))" name="Receita" radius={[0, 4, 4, 0]} cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </Card>
      </div>

      {/* Scatter */}
      <Card className="p-5 glass-card">
        <h3 className="text-sm font-semibold mb-4">Ticket × Margem (Identificar vendas grandes com baixa margem)</h3>
        {scatterData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis dataKey="ticket" type="number" name="Ticket" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis dataKey="margem" type="number" name="Margem %" unit="%" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
              <ZAxis range={[40, 200]} />
              <Tooltip formatter={(v: number, name: string) => name === 'Margem %' ? pct(v) : fmt(v)}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 11 }}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ''} />
              <ReferenceLine y={10} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: "10%", fontSize: 9 }} />
              <Scatter data={scatterData} fill="hsl(var(--chart-1))" cursor="pointer"
                onClick={(entry: any) => { if (entry?.id) navigate(`/sales/${entry.id}`); }} />
            </ScatterChart>
          </ResponsiveContainer>
        ) : <NoData />}
      </Card>

      {/* Drill-down */}
      <Dialog open={!!drilldown} onOpenChange={() => setDrilldown(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{drilldown?.label} — {drilldown?.items.length} itens</DialogTitle>
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
                {drilldown.items.slice(0, 100).map((item: any, i: number) => (
                  <TableRow key={item.id || i} className="cursor-pointer hover:bg-muted/50"
                    onClick={() => { setDrilldown(null); if (item.sale_id) navigate(`/sales/${item.sale_id}`); else if (item.id && item.display_id) navigate(`/sales/${item.id}`); }}>
                    <TableCell className="text-xs font-mono">{item.display_id || item.id?.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs">{item.name || item.description || '-'}</TableCell>
                    <TableCell className="text-xs">{item.status || '-'}</TableCell>
                    <TableCell className="text-xs text-right">{fmt(item.received_value || item.net_value || item.value || 0)}</TableCell>
                    <TableCell className="text-xs text-right">{item.margin != null ? pct(item.margin) : item.received_value > 0 ? pct(((item.received_value - (item.total_cost || 0)) / item.received_value) * 100) : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
