import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { fetchAllRows } from "@/lib/fetchAll";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function FluxoCaixa() {
  const [horizon, setHorizon] = useState<number>(30);
  const [scenario, setScenario] = useState<"normal" | "atraso7">("normal");

  const { data: sales = [] } = useQuery({
    queryKey: ["fc-sales"],
    queryFn: async () => {
      const data = await fetchAllRows("sales", "id, received_value, total_cost, created_at, departure_date, return_date");
      return data || [];
    },
  });

  const { data: receivables = [] } = useQuery({
    queryKey: ["fc-receivables"],
    queryFn: async () => {
      const { data } = await supabase.from("accounts_receivable").select("*");
      return data || [];
    },
  });

  const { data: payables = [] } = useQuery({
    queryKey: ["fc-payables"],
    queryFn: async () => {
      const { data } = await supabase.from("accounts_payable").select("*");
      return data || [];
    },
  });

  const cashFlowData = useMemo(() => {
    const days: { date: string; label: string; entradas: number; saidas: number; saldo: number; critical: boolean }[] = [];
    const today = new Date();
    const start = new Date(); start.setDate(start.getDate() - 15);
    let running = 0;
    const delay = scenario === "atraso7" ? 7 : 0;

    for (let i = 0; i < 15 + horizon; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);

      let entradas = 0;
      let saidas = 0;

      // From sales
      sales.forEach((s: any) => {
        if (s.created_at?.slice(0, 10) === dateStr) {
          entradas += s.received_value || 0;
          saidas += s.total_cost || 0;
        }
      });

      // From receivables
      receivables.forEach((r: any) => {
        if (r.status === 'recebido' && r.received_date === dateStr) entradas += r.net_value || 0;
        else if (r.status === 'pendente') {
          const due = delay > 0 && r.due_date ? (() => { const dd = new Date(r.due_date); dd.setDate(dd.getDate() + delay); return dd.toISOString().slice(0, 10); })() : r.due_date;
          if (due === dateStr) entradas += r.net_value || 0;
        }
      });

      // From payables
      payables.forEach((p: any) => {
        if (p.status === 'pago' && p.paid_date === dateStr) saidas += p.value || 0;
        else if (p.status === 'pendente' && p.due_date === dateStr) saidas += p.value || 0;
      });

      running += entradas - saidas;
      days.push({
        date: dateStr,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        entradas,
        saidas,
        saldo: running,
        critical: running < 0,
      });
    }
    return days;
  }, [sales, receivables, payables, horizon, scenario]);

  const criticalDays = cashFlowData.filter(d => d.critical);
  const totalEntradas = cashFlowData.reduce((s, d) => s + d.entradas, 0);
  const totalSaidas = cashFlowData.reduce((s, d) => s + d.saidas, 0);
  const saldoFinal = cashFlowData[cashFlowData.length - 1]?.saldo || 0;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-display">Fluxo de Caixa</h1>
        <p className="text-sm text-muted-foreground">Projetado + realizado</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 glass-card">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Entradas</p>
          <p className="text-xl font-bold text-emerald-500 font-display">{fmt(totalEntradas)}</p>
        </Card>
        <Card className="p-4 glass-card">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Saídas</p>
          <p className="text-xl font-bold text-red-400 font-display">{fmt(totalSaidas)}</p>
        </Card>
        <Card className="p-4 glass-card">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Saldo Final</p>
          <p className={`text-xl font-bold font-display ${saldoFinal >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{fmt(saldoFinal)}</p>
        </Card>
        <Card className="p-4 glass-card">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Dias Críticos</p>
          <p className={`text-xl font-bold font-display ${criticalDays.length > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{criticalDays.length}</p>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex gap-3 flex-wrap items-center">
        <Tabs value={String(horizon)} onValueChange={(v) => setHorizon(Number(v))}>
          <TabsList>
            <TabsTrigger value="7">7 dias</TabsTrigger>
            <TabsTrigger value="30">30 dias</TabsTrigger>
            <TabsTrigger value="60">60 dias</TabsTrigger>
            <TabsTrigger value="90">90 dias</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <Button size="sm" variant={scenario === "normal" ? "default" : "outline"} onClick={() => setScenario("normal")}>
            Cenário Normal
          </Button>
          <Button size="sm" variant={scenario === "atraso7" ? "default" : "outline"} onClick={() => setScenario("atraso7")}>
            +7 Dias Atraso
          </Button>
        </div>
      </div>

      {/* Chart */}
      <Card className="p-5 glass-card">
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={cashFlowData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} interval={Math.floor(cashFlowData.length / 15)} />
            <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 11 }} />
            <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: "Zero", fontSize: 9 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Area type="monotone" dataKey="entradas" stroke="hsl(160,60%,45%)" fill="hsl(160,60%,45%)" fillOpacity={0.1} name="Entradas" />
            <Area type="monotone" dataKey="saidas" stroke="hsl(0,60%,50%)" fill="hsl(0,60%,50%)" fillOpacity={0.1} name="Saídas" />
            <Area type="monotone" dataKey="saldo" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.15} strokeWidth={2.5} name="Saldo" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Critical days alert */}
      {criticalDays.length > 0 && (
        <Card className="p-4 glass-card border-red-500/30">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2 text-red-400">
            <AlertTriangle className="w-4 h-4" /> Dias com Saldo Negativo
          </h3>
          <div className="flex flex-wrap gap-2">
            {criticalDays.map(d => (
              <span key={d.date} className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded font-mono">
                {d.label}: {fmt(d.saldo)}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
