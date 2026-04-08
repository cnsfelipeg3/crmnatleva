import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Clock, TrendingUp, Users, ArrowUpDown, MessageSquare, Zap } from "lucide-react";
import { AGENTS_V4 } from "@/components/ai-team/agentsV4Data";
import { cn } from "@/lib/utils";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type SortKey = "conversas" | "conversao" | "tempoResposta" | "potencial" | "risco" | "margem";

export default function AITeamPerformance() {
  const [period, setPeriod] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("conversas");
  const [sortAsc, setSortAsc] = useState(false);

  const cutoff = useMemo(() => {
    const now = new Date();
    if (period === "7d") return new Date(now.getTime() - 7 * 86400000).toISOString();
    if (period === "30d") return new Date(now.getTime() - 30 * 86400000).toISOString();
    if (period === "90d") return new Date(now.getTime() - 90 * 86400000).toISOString();
    return null;
  }, [period]);

  // Fetch conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ["perf-conversations", period],
    queryFn: async () => {
      let q = supabase.from("conversations").select("id, assigned_to, status, score_potential, score_risk, estimated_margin, engagement_level, funnel_stage, created_at, last_message_at, last_response_at");
      if (cutoff) q = q.gte("created_at", cutoff);
      const { data } = await q.limit(2000);
      return (data || []) as Array<{
        id: string; assigned_to: string | null; status: string | null;
        score_potential: number | null; score_risk: number | null;
        estimated_margin: number | null; engagement_level: string | null;
        funnel_stage: string | null; created_at: string;
        last_message_at: string | null; last_response_at: string | null;
      }>;
    },
  });

  // Fetch transfers
  const { data: transfers = [] } = useQuery({
    queryKey: ["perf-transfers", period],
    queryFn: async () => {
      let q = supabase.from("conversation_transfers").select("from_user_id, to_user_id, created_at");
      if (cutoff) q = q.gte("created_at", cutoff);
      const { data } = await q.limit(2000);
      return (data || []) as Array<{ from_user_id: string | null; to_user_id: string | null; created_at: string }>;
    },
  });

  // Calculate metrics per agent
  const agentMetrics = useMemo(() => {
    const metrics: Record<string, {
      conversas: number; won: number; potentialSum: number; riskSum: number;
      marginSum: number; transfersIn: number; transfersOut: number;
      engagementDist: Record<string, number>;
    }> = {};

    // Initialize all known agents
    AGENTS_V4.forEach(a => {
      metrics[a.id] = {
        conversas: 0, won: 0, potentialSum: 0, riskSum: 0,
        marginSum: 0, transfersIn: 0, transfersOut: 0,
        engagementDist: {},
      };
    });

    // Conversations
    conversations.forEach(c => {
      const aid = c.assigned_to;
      if (!aid || !metrics[aid]) return;
      metrics[aid].conversas++;
      if (c.status === "won" || c.status === "closed_won" || c.status === "convertido") metrics[aid].won++;
      if (c.score_potential) metrics[aid].potentialSum += c.score_potential;
      if (c.score_risk) metrics[aid].riskSum += c.score_risk;
      if (c.estimated_margin) metrics[aid].marginSum += c.estimated_margin;
      if (c.engagement_level) {
        metrics[aid].engagementDist[c.engagement_level] = (metrics[aid].engagementDist[c.engagement_level] || 0) + 1;
      }
    });

    // Transfers
    transfers.forEach(t => {
      if (t.from_user_id && metrics[t.from_user_id]) metrics[t.from_user_id].transfersOut++;
      if (t.to_user_id && metrics[t.to_user_id]) metrics[t.to_user_id].transfersIn++;
    });

    return AGENTS_V4.map(a => {
      const m = metrics[a.id];
      return {
        id: a.id,
        name: a.name,
        emoji: a.emoji,
        role: a.role,
        squadId: a.squadId,
        conversas: m.conversas,
        conversao: m.conversas > 0 ? Math.round((m.won / m.conversas) * 100) : 0,
        tempoResposta: 0, // placeholder — needs message-level calculation
        potencial: m.conversas > 0 ? Math.round(m.potentialSum / m.conversas) : 0,
        risco: m.conversas > 0 ? Math.round(m.riskSum / m.conversas) : 0,
        margem: m.conversas > 0 ? Math.round(m.marginSum / m.conversas) : 0,
        transfersIn: m.transfersIn,
        transfersOut: m.transfersOut,
        engagementDist: m.engagementDist,
      };
    }).filter(a => a.conversas > 0 || a.transfersIn > 0 || a.transfersOut > 0);
  }, [conversations, transfers]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...agentMetrics];
    arr.sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return sortAsc ? av - bv : bv - av;
    });
    return arr;
  }, [agentMetrics, sortKey, sortAsc]);

  // Global KPIs
  const totalConversas = agentMetrics.reduce((s, a) => s + a.conversas, 0);
  const totalWon = agentMetrics.reduce((s, a) => s + Math.round(a.conversas * a.conversao / 100), 0);
  const globalConversao = totalConversas > 0 ? Math.round((totalWon / totalConversas) * 100) : 0;
  const globalMargem = agentMetrics.length > 0
    ? Math.round(agentMetrics.reduce((s, a) => s + a.margem, 0) / agentMetrics.filter(a => a.margem > 0).length || 0)
    : 0;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">📊 Performance dos Agentes IA</h1>
          <p className="text-sm text-muted-foreground">Ranking comparativo com métricas reais</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="all">Todo período</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: MessageSquare, label: "Total Conversas", value: String(totalConversas), color: "#3B82F6" },
          { icon: TrendingUp, label: "Taxa Conversão", value: `${globalConversao}%`, color: "#10B981" },
          { icon: Clock, label: "Agentes Ativos", value: String(agentMetrics.length), color: "#8B5CF6" },
          { icon: Zap, label: "Margem Média", value: globalMargem > 0 ? fmt(globalMargem) : "—", color: "#F59E0B" },
        ].map(k => (
          <Card key={k.label} className="p-4 glass-card">
            <div className="flex items-center gap-2 mb-2">
              <k.icon className="w-4 h-4" style={{ color: k.color }} />
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Ranking Table */}
      <Card className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-8">#</TableHead>
                <TableHead className="text-xs">Agente</TableHead>
                <TableHead className="text-xs cursor-pointer" onClick={() => handleSort("conversas")}>
                  <span className="flex items-center gap-1">Conversas <ArrowUpDown className="w-3 h-3" /></span>
                </TableHead>
                <TableHead className="text-xs cursor-pointer" onClick={() => handleSort("conversao")}>
                  <span className="flex items-center gap-1">Conversão <ArrowUpDown className="w-3 h-3" /></span>
                </TableHead>
                <TableHead className="text-xs cursor-pointer" onClick={() => handleSort("potencial")}>
                  <span className="flex items-center gap-1">Potencial <ArrowUpDown className="w-3 h-3" /></span>
                </TableHead>
                <TableHead className="text-xs cursor-pointer" onClick={() => handleSort("risco")}>
                  <span className="flex items-center gap-1">Risco <ArrowUpDown className="w-3 h-3" /></span>
                </TableHead>
                <TableHead className="text-xs cursor-pointer" onClick={() => handleSort("margem")}>
                  <span className="flex items-center gap-1">Margem Média <ArrowUpDown className="w-3 h-3" /></span>
                </TableHead>
                <TableHead className="text-xs">Transferências</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-12">
                    Nenhum dado de performance encontrado para este período
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((a, i) => (
                  <TableRow key={a.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs font-mono text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{a.emoji}</span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{a.name}</p>
                          <p className="text-[10px] text-muted-foreground">{a.role}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-bold">{a.conversas}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("text-xs",
                          a.conversao >= 50 ? "text-emerald-400 border-emerald-500/30" :
                          a.conversao >= 20 ? "text-amber-400 border-amber-500/30" :
                          "text-red-400 border-red-500/30"
                        )}
                      >
                        {a.conversao}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-sm", a.potencial >= 70 ? "text-emerald-400" : "text-muted-foreground")}>
                        {a.potencial || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-sm", a.risco >= 70 ? "text-red-400" : "text-muted-foreground")}>
                        {a.risco || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {a.margem > 0 ? fmt(a.margem) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span title="Recebidas">↓{a.transfersIn}</span>
                        <span title="Enviadas">↑{a.transfersOut}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
