import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import {
  DollarSign, TrendingUp, Target, Users, Plane, Globe, ArrowUpRight, ArrowDownRight,
  CreditCard, CheckCircle, Clock, Crown, Heart,
} from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Sale {
  id: string; display_id: string; name: string;
  received_value: number; total_cost: number; profit: number; margin: number;
  adults: number; children: number;
  is_international: boolean | null; miles_program: string | null;
  emission_status: string | null; status: string;
  client_id: string | null; seller_id?: string | null;
}

interface Client { id: string; }

interface Props {
  filtered: Sale[];
  previous: Sale[];
  clients: Client[];
  ceoMode?: boolean;
}

function pctChange(current: number, prev: number) {
  if (prev === 0) return current > 0 ? 100 : 0;
  return ((current - prev) / Math.abs(prev)) * 100;
}

export default function KpiCards({ filtered, previous, clients, ceoMode }: Props) {
  const navigate = useNavigate();
  const [drilldown, setDrilldown] = useState<{ label: string; sales: Sale[] } | null>(null);

  const totalRevenue = filtered.reduce((s, v) => s + (v.received_value || 0), 0);
  const totalCost = filtered.reduce((s, v) => s + (v.total_cost || 0), 0);
  const totalProfit = totalRevenue - totalCost;
  const avgMargin = filtered.length > 0 ? filtered.reduce((s, v) => s + (v.margin || 0), 0) / filtered.length : 0;
  const avgTicket = filtered.length > 0 ? totalRevenue / filtered.length : 0;
  const activeClients = useMemo(() => new Set(filtered.filter(s => s.client_id).map(s => s.client_id)).size, [filtered]);
  const emitted = filtered.filter(s => s.emission_status === "emitido" || s.status === "Emitido");
  const pending = filtered.filter(s => s.status !== "Emitido" && s.status !== "Finalizado" && s.status !== "Cancelado");

  const prevRevenue = previous.reduce((s, v) => s + (v.received_value || 0), 0);
  const prevProfit = previous.reduce((s, v) => s + (v.received_value || 0) - (v.total_cost || 0), 0);
  const prevTicket = previous.length > 0 ? prevRevenue / previous.length : 0;
  const prevMargin = previous.length > 0 ? previous.reduce((s, v) => s + (v.margin || 0), 0) / previous.length : 0;

  // Health score (0-100)
  const healthScore = useMemo(() => {
    let score = 50;
    // Margin health: >15% = good
    if (avgMargin >= 20) score += 15; else if (avgMargin >= 12) score += 8; else if (avgMargin < 5) score -= 15;
    // Growth
    const revGrowth = pctChange(totalRevenue, prevRevenue);
    if (revGrowth > 10) score += 15; else if (revGrowth > 0) score += 5; else if (revGrowth < -10) score -= 10;
    // Pending ratio
    const pendingRatio = filtered.length > 0 ? pending.length / filtered.length : 0;
    if (pendingRatio < 0.3) score += 10; else if (pendingRatio > 0.6) score -= 10;
    // Volume
    if (filtered.length > 20) score += 10; else if (filtered.length < 5) score -= 5;
    return Math.max(0, Math.min(100, score));
  }, [avgMargin, totalRevenue, prevRevenue, filtered.length, pending.length]);

  const healthColor = healthScore >= 70 ? "text-success" : healthScore >= 40 ? "text-warning" : "text-destructive";
  const healthLabel = healthScore >= 70 ? "Saudável" : healthScore >= 40 ? "Atenção" : "Risco";

  const kpis = [
    { label: "Faturamento Bruto", value: fmt(totalRevenue), icon: DollarSign, color: "text-success", change: pctChange(totalRevenue, prevRevenue), size: "lg", sales: filtered },
    { label: "Lucro Total", value: fmt(totalProfit), icon: TrendingUp, color: "text-accent", change: pctChange(totalProfit, prevProfit), size: "lg", sales: filtered.filter(s => (s.received_value || 0) - (s.total_cost || 0) > 0) },
    { label: "Margem Média", value: `${avgMargin.toFixed(1)}%`, icon: Target, color: avgMargin >= 15 ? "text-success" : avgMargin >= 8 ? "text-warning" : "text-destructive", change: pctChange(avgMargin, prevMargin), size: "lg", sales: filtered },
    { label: "Ticket Médio", value: fmt(avgTicket), icon: CreditCard, color: "text-info", change: pctChange(avgTicket, prevTicket), size: "lg", sales: filtered },
    { label: "Total Vendas", value: filtered.length.toString(), icon: Plane, color: "text-info", change: pctChange(filtered.length, previous.length), size: "lg", sales: filtered },
    ...(ceoMode ? [
      { label: "Saúde", value: `${healthScore}`, icon: Heart, color: healthColor, change: null as number | null, size: "lg" as const, sales: filtered, extra: healthLabel },
    ] : []),
    { label: "Custo Total", value: fmt(totalCost), icon: DollarSign, color: "text-warning", change: null, size: "sm", sales: filtered.filter(s => (s.total_cost || 0) > 0) },
    { label: "Clientes Ativos", value: activeClients.toString(), icon: Users, color: "text-accent", change: null, size: "sm", sales: filtered },
    { label: "Emitidas", value: emitted.length.toString(), icon: CheckCircle, color: "text-success", change: null, size: "sm", sales: emitted },
    { label: "Em Andamento", value: pending.length.toString(), icon: Clock, color: "text-warning", change: null, size: "sm", sales: pending },
    { label: "Internacional", value: `${filtered.length > 0 ? ((filtered.filter(s => s.is_international).length / filtered.length) * 100).toFixed(0) : 0}%`, icon: Globe, color: "text-info", change: null, size: "sm", sales: filtered.filter(s => s.is_international) },
  ];

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
        {kpis.map(k => (
          <Card
            key={k.label}
            className="p-3 md:p-4 glass-card group relative overflow-hidden cursor-pointer hover:ring-1 hover:ring-accent/30 transition-all"
            onClick={() => k.sales && setDrilldown({ label: k.label, sales: k.sales })}
          >
            <div className="absolute top-0 left-2 right-2 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--glow-primary) / 0.4), transparent)' }}
            />
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="p-1 rounded-md bg-muted/50">
                <k.icon className={`w-3.5 h-3.5 ${k.color}`} />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate">{k.label}</span>
            </div>
            <p className={`${k.size === 'lg' ? 'text-base md:text-lg' : 'text-sm md:text-base'} font-bold text-foreground leading-tight font-sans truncate`}>
              {k.value}
              {(k as any).extra && <span className={`text-[10px] ml-1 font-normal ${k.color}`}>{(k as any).extra}</span>}
            </p>
            {k.change !== null && (
              <div className={`flex items-center gap-0.5 mt-1 text-[10px] font-medium ${k.change >= 0 ? "text-success" : "text-destructive"}`}>
                {k.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(k.change).toFixed(1)}%
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Drill-down dialog */}
      <Dialog open={!!drilldown} onOpenChange={() => setDrilldown(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{drilldown?.label} — {drilldown?.sales.length} vendas</DialogTitle>
          </DialogHeader>
          {drilldown && (
            <>
              <div className="flex gap-4 text-xs text-muted-foreground mb-3">
                <span>Receita: <strong className="text-foreground">{fmt(drilldown.sales.reduce((s, v) => s + (v.received_value || 0), 0))}</strong></span>
                <span>Lucro: <strong className="text-foreground">{fmt(drilldown.sales.reduce((s, v) => s + (v.received_value || 0) - (v.total_cost || 0), 0))}</strong></span>
              </div>
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
                  {drilldown.sales.slice(0, 100).map(s => (
                    <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setDrilldown(null); navigate(`/sales/${s.id}`); }}>
                      <TableCell className="text-xs font-mono">{s.display_id}</TableCell>
                      <TableCell className="text-xs">{s.name}</TableCell>
                      <TableCell className="text-xs">{s.status}</TableCell>
                      <TableCell className="text-xs text-right">{fmt(s.received_value || 0)}</TableCell>
                      <TableCell className="text-xs text-right">{(s.margin || 0).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
