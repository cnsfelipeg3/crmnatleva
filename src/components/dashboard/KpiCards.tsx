import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  DollarSign, TrendingUp, Target, Users, Plane, Globe, Coins, ArrowUpRight, ArrowDownRight,
  CreditCard, CheckCircle, Clock,
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
  emission_status: string | null;
  status: string;
  client_id: string | null;
}

interface Client {
  id: string;
}

interface Props {
  filtered: Sale[];
  previous: Sale[];
  clients: Client[];
}

function pctChange(current: number, prev: number) {
  if (prev === 0) return current > 0 ? 100 : 0;
  return ((current - prev) / Math.abs(prev)) * 100;
}

export default function KpiCards({ filtered, previous, clients }: Props) {
  const totalRevenue = filtered.reduce((s, v) => s + (v.received_value || 0), 0);
  const totalCost = filtered.reduce((s, v) => s + (v.total_cost || 0), 0);
  const totalProfit = totalRevenue - totalCost;
  const avgMargin = filtered.length > 0 ? filtered.reduce((s, v) => s + (v.margin || 0), 0) / filtered.length : 0;
  const avgTicket = filtered.length > 0 ? totalRevenue / filtered.length : 0;
  const activeClients = useMemo(() => new Set(filtered.filter(s => s.client_id).map(s => s.client_id)).size, [filtered]);
  const emitted = filtered.filter(s => s.emission_status === "emitido" || s.status === "Emitido").length;
  const pending = filtered.filter(s => s.status !== "Emitido" && s.status !== "Finalizado" && s.status !== "Cancelado").length;

  const prevRevenue = previous.reduce((s, v) => s + (v.received_value || 0), 0);
  const prevProfit = previous.reduce((s, v) => s + (v.received_value || 0) - (v.total_cost || 0), 0);
  const prevTicket = previous.length > 0 ? prevRevenue / previous.length : 0;
  const prevMargin = previous.length > 0 ? previous.reduce((s, v) => s + (v.margin || 0), 0) / previous.length : 0;

  const kpis = [
    { label: "Faturamento Bruto", value: fmt(totalRevenue), icon: DollarSign, color: "text-success", change: pctChange(totalRevenue, prevRevenue), size: "lg" },
    { label: "Lucro Total", value: fmt(totalProfit), icon: TrendingUp, color: "text-accent", change: pctChange(totalProfit, prevProfit), size: "lg" },
    { label: "Margem Média", value: `${avgMargin.toFixed(1)}%`, icon: Target, color: avgMargin >= 15 ? "text-success" : avgMargin >= 8 ? "text-warning" : "text-destructive", change: pctChange(avgMargin, prevMargin), size: "lg" },
    { label: "Ticket Médio", value: fmt(avgTicket), icon: CreditCard, color: "text-info", change: pctChange(avgTicket, prevTicket), size: "lg" },
    { label: "Total Vendas", value: filtered.length.toString(), icon: Plane, color: "text-info", change: pctChange(filtered.length, previous.length), size: "lg" },
    { label: "Custo Total", value: fmt(totalCost), icon: DollarSign, color: "text-warning", change: null, size: "sm" },
    { label: "Clientes Ativos", value: activeClients.toString(), icon: Users, color: "text-accent", change: null, size: "sm" },
    { label: "Emitidas", value: emitted.toString(), icon: CheckCircle, color: "text-success", change: null, size: "sm" },
    { label: "Em Andamento", value: pending.toString(), icon: Clock, color: "text-warning", change: null, size: "sm" },
    { label: "Internacional", value: `${filtered.length > 0 ? ((filtered.filter(s => s.is_international).length / filtered.length) * 100).toFixed(0) : 0}%`, icon: Globe, color: "text-info", change: null, size: "sm" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
      {kpis.map(k => (
        <Card key={k.label} className="p-3 md:p-4 glass-card group relative overflow-hidden">
          <div className="absolute top-0 left-2 right-2 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--glow-primary) / 0.4), transparent)' }}
          />
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="p-1 rounded-md bg-muted/50">
              <k.icon className={`w-3.5 h-3.5 ${k.color}`} />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate">{k.label}</span>
          </div>
          <p className={`${k.size === 'lg' ? 'text-base md:text-lg' : 'text-sm md:text-base'} font-bold text-foreground leading-tight font-sans truncate`}>{k.value}</p>
          {k.change !== null && (
            <div className={`flex items-center gap-0.5 mt-1 text-[10px] font-medium ${k.change >= 0 ? "text-success" : "text-destructive"}`}>
              {k.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(k.change).toFixed(1)}%
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
