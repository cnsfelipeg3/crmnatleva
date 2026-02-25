import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3, Users, Clock, TrendingUp, Bot, Target,
  MessageSquare, RefreshCw, ChevronRight, Globe2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  { key: "novo_lead", label: "Novo Lead", color: "hsl(210 80% 55%)" },
  { key: "qualificacao", label: "Qualificação", color: "hsl(45 90% 50%)" },
  { key: "orcamento_preparacao", label: "Orçamento", color: "hsl(32 90% 55%)" },
  { key: "proposta_enviada", label: "Proposta", color: "hsl(280 60% 55%)" },
  { key: "negociacao", label: "Negociação", color: "hsl(200 70% 50%)" },
  { key: "fechado", label: "Fechado", color: "hsl(142 70% 45%)" },
  { key: "perdido", label: "Perdido", color: "hsl(0 70% 50%)" },
];

export function FlowMetrics() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("conversations")
      .select("id, funnel_stage, tags, created_at, last_message_at, status, clients(display_name)")
      .order("created_at", { ascending: false })
      .limit(1000);
    setConversations(data || []);
    setLoading(false);
  };

  const metrics = useMemo(() => {
    const total = conversations.length;
    const byStage: Record<string, number> = {};
    STAGES.forEach((s) => { byStage[s.key] = 0; });
    conversations.forEach((c) => {
      const stage = c.funnel_stage || "novo_lead";
      byStage[stage] = (byStage[stage] || 0) + 1;
    });

    const fechados = byStage["fechado"] || 0;
    const conversionRate = total > 0 ? (fechados / total) * 100 : 0;

    // Tags analysis
    const tagCounts: Record<string, number> = {};
    conversations.forEach((c) => {
      (c.tags || []).forEach((t: string) => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });

    // Destination tags
    const destTags = ["Dubai", "Europa", "EUA", "Caribe", "África", "Oriente Médio", "América do Sul"];
    const byDestination = destTags.map((d) => ({
      name: d,
      count: tagCounts[d] || 0,
      closed: conversations.filter((c) => (c.tags || []).includes(d) && c.funnel_stage === "fechado").length,
    })).filter((d) => d.count > 0).sort((a, b) => b.count - a.count);

    // Ticket tags
    const ticketTags = [
      { tag: "Alto Ticket", label: "Alto Ticket" },
      { tag: "Médio Ticket", label: "Médio Ticket" },
      { tag: "Baixo Ticket", label: "Baixo Ticket" },
    ];
    const byTicket = ticketTags.map((t) => ({
      ...t,
      count: tagCounts[t.tag] || 0,
      closed: conversations.filter((c) => (c.tags || []).includes(t.tag) && c.funnel_stage === "fechado").length,
    }));

    // Time metrics (simplified)
    const avgTimeToClose = "—"; // Would need more data
    const avgTimeToQuote = "—";

    // AI automation rate
    const aiAutoTags = conversations.filter((c) => (c.tags || []).some((t: string) => t.includes("Auto") || t.includes("IA")));
    const aiRate = total > 0 ? ((aiAutoTags.length / total) * 100).toFixed(0) : "0";

    return { total, byStage, fechados, conversionRate, tagCounts, byDestination, byTicket, aiRate, avgTimeToClose, avgTimeToQuote };
  }, [conversations]);

  const maxStageCount = Math.max(...Object.values(metrics.byStage), 1);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <h2 className="font-bold text-lg">📈 Métricas do Fluxo</h2>
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="text-xs h-8" onClick={loadData}>
          <RefreshCw className={cn("w-3 h-3 mr-1", loading && "animate-spin")} /> Atualizar
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Leads", value: metrics.total, icon: Users, color: "text-blue-500" },
              { label: "Qualificados", value: metrics.byStage["qualificacao"] + metrics.byStage["orcamento_preparacao"], icon: Target, color: "text-amber-500" },
              { label: "Fechados", value: metrics.fechados, icon: TrendingUp, color: "text-green-500" },
              { label: "Taxa Conversão", value: `${metrics.conversionRate.toFixed(1)}%`, icon: BarChart3, color: "text-primary" },
            ].map((kpi) => (
              <Card key={kpi.label} className="cursor-pointer hover:border-primary/40 transition-all" onClick={() => setDrillDown(kpi.label)}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <kpi.icon className={cn("w-4 h-4", kpi.color)} />
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">{kpi.label}</span>
                  </div>
                  <span className="text-2xl font-bold">{kpi.value}</span>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Additional KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Tempo médio → Orçamento</span>
                </div>
                <span className="text-lg font-bold">{metrics.avgTimeToQuote}</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Tempo médio → Fechamento</span>
                </div>
                <span className="text-lg font-bold">{metrics.avgTimeToClose}</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Bot className="w-4 h-4 text-purple-500" />
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">IA Automática</span>
                </div>
                <span className="text-lg font-bold">{metrics.aiRate}%</span>
              </CardContent>
            </Card>
          </div>

          {/* Funnel visualization */}
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm">Funil de Conversão</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              {STAGES.map((stage) => {
                const count = metrics.byStage[stage.key] || 0;
                const pct = maxStageCount > 0 ? (count / maxStageCount) * 100 : 0;
                return (
                  <div key={stage.key} className="flex items-center gap-3 cursor-pointer hover:bg-muted/30 rounded-lg p-1 -mx-1 transition-colors" onClick={() => setDrillDown(stage.key)}>
                    <span className="text-xs font-medium w-24 truncate">{stage.label}</span>
                    <div className="flex-1 h-6 bg-muted/50 rounded-lg overflow-hidden relative">
                      <div
                        className="h-full rounded-lg transition-all duration-500"
                        style={{ width: `${pct}%`, background: stage.color }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold mix-blend-difference text-white">
                        {count}
                      </span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* By destination */}
          {metrics.byDestination.length > 0 && (
            <Card>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe2 className="w-4 h-4" /> Conversão por Destino
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                {metrics.byDestination.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs cursor-pointer hover:bg-muted/30 rounded p-1.5 transition-colors">
                    <span className="font-medium">{d.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] h-4">{d.count} leads</Badge>
                      <Badge variant="default" className="text-[9px] h-4 bg-green-600">{d.closed} fechados</Badge>
                      <span className="text-[10px] text-muted-foreground w-10 text-right">
                        {d.count > 0 ? `${((d.closed / d.count) * 100).toFixed(0)}%` : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* By ticket */}
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm">Conversão por Ticket</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              {metrics.byTicket.map((t) => (
                <div key={t.tag} className="flex items-center justify-between text-xs">
                  <span className="font-medium">{t.label}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] h-4">{t.count}</Badge>
                    <Badge variant="default" className="text-[9px] h-4 bg-green-600">{t.closed} fechados</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Drill-down placeholder */}
          {drillDown && (
            <Card className="border-primary/30">
              <CardHeader className="p-3 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">🔍 Detalhe: {drillDown}</CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setDrillDown(null)}>Fechar</Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="space-y-1.5">
                  {conversations
                    .filter((c) => {
                      if (STAGES.find((s) => s.key === drillDown)) return (c.funnel_stage || "novo_lead") === drillDown;
                      return true;
                    })
                    .slice(0, 10)
                    .map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-muted/30">
                        <span className="font-medium truncate">{c.clients?.display_name || "Lead sem nome"}</span>
                        <div className="flex gap-1">
                          {(c.tags || []).slice(0, 2).map((t: string) => (
                            <Badge key={t} variant="outline" className="text-[8px] h-4">{t}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
