import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { AlertTriangle, FileWarning, ShieldAlert, Lightbulb, TrendingDown, TrendingUp, Users, Globe, DollarSign, Clock, MessageSquare, CheckCircle2, Plane } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { iataToLabel } from "@/lib/iataUtils";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Sale {
  id: string; display_id: string; name: string; status: string;
  margin: number; received_value: number; total_cost: number;
  locators: string[]; is_international: boolean | null;
  hotel_name: string | null; products: string[];
  destination_iata: string | null; created_at: string;
  seller_id: string | null; client_id: string | null;
}

interface Client { id: string; display_name: string; created_at: string; }

interface Props {
  filtered: Sale[];
  sellerNames: Record<string, string>;
  clients: Client[];
}

interface SmartAlert {
  severity: "critical" | "warning" | "attention" | "info";
  icon: any;
  message: string;
  count: number;
  detail?: string;
}

export default function AlertsSection({ filtered, sellerNames, clients }: Props) {
  const navigate = useNavigate();
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);
  const [drillSales, setDrillSales] = useState<{ title: string; sales: Sale[] } | null>(null);

  // ── Smart alert data sources ──
  const { data: pendingConversations = 0 } = useQuery({
    queryKey: ["smart-alert-conversations"],
    queryFn: async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
      const { count } = await supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .lt("last_message_at", twoHoursAgo)
        .not("last_message_at", "is", null)
        .in("status", ["open", "active", "novo"]);
      return count || 0;
    },
    staleTime: 60_000,
  });

  const { data: upcomingCheckins = 0 } = useQuery({
    queryKey: ["smart-alert-checkins"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const in48h = new Date(Date.now() + 48 * 3600000).toISOString();
      const { count } = await supabase
        .from("checkin_tasks")
        .select("*", { count: "exact", head: true })
        .neq("status", "completed")
        .gte("checkin_open_datetime_utc", now)
        .lte("checkin_open_datetime_utc", in48h);
      return count || 0;
    },
    staleTime: 60_000,
  });

  // ── Original risk alerts ──
  const alerts = useMemo(() => {
    const a: { icon: any; msg: string; saleId: string; type: string }[] = [];
    filtered.forEach(s => {
      if ((s.margin || 0) < 0 && s.received_value > 0)
        a.push({ type: "error", icon: AlertTriangle, msg: `${s.display_id} — Prejuízo: margem ${(s.margin || 0).toFixed(1)}%`, saleId: s.id });
      else if ((s.margin || 0) < 10 && s.received_value > 0 && (s.margin || 0) > 0)
        a.push({ type: "warning", icon: AlertTriangle, msg: `${s.display_id} — Margem baixa: ${(s.margin || 0).toFixed(1)}%`, saleId: s.id });
      if (s.status === "Emitido" && (!s.locators || s.locators.length === 0 || s.locators.every(l => !l)))
        a.push({ type: "error", icon: FileWarning, msg: `${s.display_id} — Localizador vazio (Emitido)`, saleId: s.id });
      if (s.is_international && !s.hotel_name && s.products?.includes("Hotel"))
        a.push({ type: "info", icon: ShieldAlert, msg: `${s.display_id} — Internacional sem hotel`, saleId: s.id });
    });
    return a.slice(0, 15);
  }, [filtered]);

  // ── Smart alerts ──
  const smartAlerts = useMemo(() => {
    const sa: SmartAlert[] = [];

    // Margin < 15%
    const lowMarginSales = filtered.filter(s => s.received_value > 0 && (s.margin || 0) < 15 && (s.margin || 0) >= 0);
    if (lowMarginSales.length > 0) {
      sa.push({
        severity: "critical",
        icon: TrendingDown,
        message: `${lowMarginSales.length} venda${lowMarginSales.length > 1 ? "s" : ""} com margem abaixo de 15%`,
        count: lowMarginSales.length,
      });
    }

    // Daily sales below average
    const today = new Date();
    const todaySales = filtered.filter(s => {
      const d = new Date(s.created_at);
      return d.toDateString() === today.toDateString();
    });
    const todayRev = todaySales.reduce((s, v) => s + (v.received_value || 0), 0);
    const last30 = filtered.filter(s => {
      const d = new Date(s.created_at);
      return d.getTime() > Date.now() - 30 * 86400000;
    });
    const avgDaily = last30.length > 0 ? last30.reduce((s, v) => s + (v.received_value || 0), 0) / 30 : 0;
    if (avgDaily > 0 && todayRev < avgDaily * 0.7) {
      const pctBelow = Math.round((1 - todayRev / avgDaily) * 100);
      sa.push({
        severity: "attention",
        icon: DollarSign,
        message: `Vendas de hoje (${fmt(todayRev)}) estão ${pctBelow}% abaixo da média diária (${fmt(avgDaily)})`,
        count: 1,
      });
    }

    // Conversations without response > 2h
    if (pendingConversations > 0) {
      sa.push({
        severity: "critical",
        icon: MessageSquare,
        message: `${pendingConversations} conversa${pendingConversations > 1 ? "s" : ""} aguardando resposta há mais de 2h`,
        count: pendingConversations,
      });
    }

    // Upcoming check-ins
    if (upcomingCheckins > 0) {
      sa.push({
        severity: "warning",
        icon: Plane,
        message: `${upcomingCheckins} check-in${upcomingCheckins > 1 ? "s" : ""} nas próximas 48h ainda não realizado${upcomingCheckins > 1 ? "s" : ""}`,
        count: upcomingCheckins,
      });
    }

    // Sort by severity
    const order: Record<string, number> = { critical: 0, attention: 1, warning: 2, info: 3 };
    sa.sort((a, b) => order[a.severity] - order[b.severity]);

    return sa;
  }, [filtered, pendingConversations, upcomingCheckins]);

  const severityColors: Record<string, { border: string; text: string; bg: string }> = {
    critical: { border: "border-l-red-500", text: "text-red-400", bg: "bg-red-500/5" },
    warning: { border: "border-l-amber-500", text: "text-amber-400", bg: "bg-amber-500/5" },
    attention: { border: "border-l-orange-500", text: "text-orange-400", bg: "bg-orange-500/5" },
    info: { border: "border-l-blue-500", text: "text-blue-400", bg: "bg-blue-500/5" },
  };

  // ── Insights (unchanged) ──
  const insights = useMemo(() => {
    const msgs: { icon: any; msg: string; type: string; sales: Sale[] }[] = [];
    if (filtered.length === 0) return msgs;
    const totalRev = filtered.reduce((s, v) => s + (v.received_value || 0), 0);
    const avgMargin = filtered.reduce((s, v) => s + (v.margin || 0), 0) / filtered.length;

    // Best destination
    const destRevenue: Record<string, { rev: number; sales: Sale[] }> = {};
    filtered.forEach(s => {
      if (s.destination_iata) {
        if (!destRevenue[s.destination_iata]) destRevenue[s.destination_iata] = { rev: 0, sales: [] };
        destRevenue[s.destination_iata].rev += (s.received_value || 0);
        destRevenue[s.destination_iata].sales.push(s);
      }
    });
    const topDestEntry = Object.entries(destRevenue).sort((a, b) => b[1].rev - a[1].rev)[0];
    if (topDestEntry) {
      const pct = ((topDestEntry[1].rev / totalRev) * 100).toFixed(0);
      msgs.push({ icon: Globe, msg: `${iataToLabel(topDestEntry[0])} representa ${pct}% do faturamento.`, type: "info", sales: topDestEntry[1].sales });
    }

    // Best seller by ticket
    const sellerRevenue: Record<string, { name: string; ticket: number; count: number; sales: Sale[] }> = {};
    filtered.forEach(s => {
      const sid = s.seller_id || "sem";
      const name = sellerNames[sid] || "Sem vendedor";
      if (!sellerRevenue[sid]) sellerRevenue[sid] = { name, ticket: 0, count: 0, sales: [] };
      sellerRevenue[sid].ticket += s.received_value || 0;
      sellerRevenue[sid].count++;
      sellerRevenue[sid].sales.push(s);
    });
    const topSeller = Object.values(sellerRevenue)
      .filter(v => v.count > 1)
      .map(v => ({ ...v, avg: v.ticket / v.count }))
      .sort((a, b) => b.avg - a.avg)[0];
    if (topSeller) msgs.push({ icon: TrendingUp, msg: `${topSeller.name} tem o maior ticket médio: ${fmt(topSeller.avg)}.`, type: "success", sales: topSeller.sales });

    // Margin insight
    if (avgMargin < 12) {
      const lowMarginSales = filtered.filter(s => (s.margin || 0) < 12 && s.received_value > 0);
      msgs.push({ icon: TrendingDown, msg: `Margem média geral está em ${avgMargin.toFixed(1)}% — abaixo do ideal.`, type: "warning", sales: lowMarginSales });
    } else {
      msgs.push({ icon: DollarSign, msg: `Margem média saudável: ${avgMargin.toFixed(1)}%.`, type: "success", sales: [] });
    }

    // International
    const intlSales = filtered.filter(s => s.is_international);
    if (intlSales.length > 0)
      msgs.push({ icon: Globe, msg: `${((intlSales.length / filtered.length) * 100).toFixed(0)}% das vendas são internacionais.`, type: "info", sales: intlSales });

    // Inactive clients
    const now = Date.now();
    const clientLastSale: Record<string, { date: number; sales: Sale[] }> = {};
    filtered.forEach(s => {
      if (s.client_id) {
        const d = new Date(s.created_at).getTime();
        if (!clientLastSale[s.client_id]) clientLastSale[s.client_id] = { date: 0, sales: [] };
        if (d > clientLastSale[s.client_id].date) clientLastSale[s.client_id].date = d;
        clientLastSale[s.client_id].sales.push(s);
      }
    });
    const inactiveClients = Object.entries(clientLastSale).filter(([, v]) => (now - v.date) > 90 * 86400000);
    if (inactiveClients.length > 0) {
      const inactiveSales = inactiveClients.flatMap(([, v]) => v.sales);
      msgs.push({ icon: Users, msg: `${inactiveClients.length} cliente(s) sem compra há mais de 90 dias.`, type: "warning", sales: inactiveSales });
    }

    return msgs.slice(0, 6);
  }, [filtered, sellerNames]);

  return (
    <>
      <div className="space-y-4">
        <h2 className="section-title">🧠 Inteligência & Alertas</h2>

        {/* Smart Alerts Row */}
        {smartAlerts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {smartAlerts.map((sa, i) => {
              const sc = severityColors[sa.severity];
              return (
                <Card key={i} className={cn("p-3 border-l-4", sc.border, sc.bg, sa.count === 0 && "opacity-50")}>
                  <div className="flex items-start gap-2">
                    <sa.icon className={cn("w-4 h-4 mt-0.5 shrink-0", sc.text)} />
                    <div>
                      <p className={cn("text-xs font-medium", sc.text)}>{sa.message}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" /> Alertas de Risco
            </h3>
            {alerts.length > 0 ? (
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {alerts.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors text-sm"
                    onClick={() => navigate(`/sales/${a.saleId}`)}
                  >
                    <a.icon className={`w-4 h-4 shrink-0 ${a.type === "error" ? "text-destructive" : a.type === "warning" ? "text-warning" : "text-info"}`} />
                    <span className="text-foreground truncate">{a.msg}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum alerta ativo 🎉</p>
            )}
          </Card>

          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-warning" /> Insights Automáticos
            </h3>
            {insights.length > 0 ? (
              <div className="space-y-2">
                {insights.map((ins, i) => (
                  <div key={i}>
                    <div
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 cursor-pointer transition-colors text-sm"
                      onClick={() => {
                        if (ins.sales.length > 0) {
                          setDrillSales({ title: ins.msg, sales: ins.sales });
                        }
                      }}
                    >
                      <ins.icon className={`w-4 h-4 shrink-0 ${ins.type === "success" ? "text-success" : ins.type === "warning" ? "text-warning" : "text-info"}`} />
                      <span className="text-foreground flex-1">{ins.msg}</span>
                      {ins.sales.length > 0 && (
                        <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">{ins.sales.length} vendas →</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados suficientes</p>
            )}
          </Card>
        </div>
      </div>

      {/* Drill-down dialog for insights */}
      <Dialog open={!!drillSales} onOpenChange={() => setDrillSales(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">{drillSales?.title}</DialogTitle>
          </DialogHeader>
          {drillSales && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">ID</TableHead>
                  <TableHead className="text-xs">Nome</TableHead>
                  <TableHead className="text-xs">Destino</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                  <TableHead className="text-xs text-right">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drillSales.sales.slice(0, 50).map(s => (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/sales/${s.id}`)}>
                    <TableCell className="text-xs font-mono">{s.display_id}</TableCell>
                    <TableCell className="text-xs">{s.name}</TableCell>
                    <TableCell className="text-xs">{iataToLabel(s.destination_iata)}</TableCell>
                    <TableCell className="text-xs text-right">{fmt(s.received_value)}</TableCell>
                    <TableCell className={`text-xs text-right ${(s.margin || 0) >= 15 ? "text-success" : (s.margin || 0) >= 0 ? "text-warning" : "text-destructive"}`}>{(s.margin || 0).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
