import { Card } from "@/components/ui/card";
import {
  DollarSign, TrendingUp, Target, Users, Plane, Globe, Coins, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Sale {
  received_value: number;
  total_cost: number;
  profit: number;
  margin: number;
  adults: number;
  children: number;
  is_international: boolean | null;
  miles_program: string | null;
}

interface Props {
  filtered: Sale[];
  previous: Sale[];
}

function pctChange(current: number, prev: number) {
  if (prev === 0) return current > 0 ? 100 : 0;
  return ((current - prev) / Math.abs(prev)) * 100;
}

export default function KpiCards({ filtered, previous }: Props) {
  const totalRevenue = filtered.reduce((s, v) => s + (v.received_value || 0), 0);
  const totalCost = filtered.reduce((s, v) => s + (v.total_cost || 0), 0);
  const totalProfit = totalRevenue - totalCost;
  const avgMargin = filtered.length > 0 ? filtered.reduce((s, v) => s + (v.margin || 0), 0) / filtered.length : 0;
  const avgTicket = filtered.length > 0 ? totalRevenue / filtered.length : 0;
  const milesCount = filtered.filter(s => s.miles_program).length;
  const milesPct = filtered.length > 0 ? (milesCount / filtered.length) * 100 : 0;
  const intlCount = filtered.filter(s => s.is_international).length;
  const intlPct = filtered.length > 0 ? (intlCount / filtered.length) * 100 : 0;

  const prevRevenue = previous.reduce((s, v) => s + (v.received_value || 0), 0);
  const prevProfit = previous.reduce((s, v) => s + (v.received_value || 0) - (v.total_cost || 0), 0);

  const kpis = [
    { label: "Receita Total", value: fmt(totalRevenue), icon: DollarSign, color: "text-success", change: pctChange(totalRevenue, prevRevenue) },
    { label: "Custo Total", value: fmt(totalCost), icon: DollarSign, color: "text-warning", change: null },
    { label: "Lucro Total", value: fmt(totalProfit), icon: TrendingUp, color: "text-primary", change: pctChange(totalProfit, prevProfit) },
    { label: "Margem Média", value: `${avgMargin.toFixed(1)}%`, icon: Target, color: "text-accent", change: null },
    { label: "Total Vendas", value: filtered.length.toString(), icon: Plane, color: "text-info", change: pctChange(filtered.length, previous.length) },
    { label: "Ticket Médio", value: fmt(avgTicket), icon: DollarSign, color: "text-primary", change: null },
    { label: "Milhas", value: `${milesPct.toFixed(0)}%`, icon: Coins, color: "text-warning", change: null },
    { label: "Internacional", value: `${intlPct.toFixed(0)}%`, icon: Globe, color: "text-info", change: null },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {kpis.map(k => (
        <Card key={k.label} className="p-3.5 glass-card hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-1.5 mb-1.5">
            <k.icon className={`w-3.5 h-3.5 ${k.color}`} />
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{k.label}</span>
          </div>
          <p className="text-base font-bold text-foreground leading-tight">{k.value}</p>
          {k.change !== null && (
            <div className={`flex items-center gap-0.5 mt-1 text-[10px] font-medium ${k.change >= 0 ? "text-success" : "text-destructive"}`}>
              {k.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(k.change).toFixed(1)}% vs anterior
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
