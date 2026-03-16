import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Flame, Snowflake, MailX, TrendingUp, Rocket, Lightbulb,
  RefreshCw, ChevronRight, ArrowUpRight, Clock, Eye, Target,
  AlertTriangle, CheckCircle, Sparkles, Users, BarChart3,
  Zap, Shield, ThumbsUp, ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

type Insight = {
  id: string;
  insight_type: string;
  category: string;
  title: string;
  description: string | null;
  confidence: number;
  probability_score: number | null;
  impact_level: string | null;
  destination: string | null;
  strategy: string | null;
  action_suggested: string | null;
  action_taken: boolean;
  tags: string[];
  metadata: any;
  related_client_id: string | null;
  related_proposal_id: string | null;
  promoted_to_knowledge: boolean;
  created_at: string;
  updated_at: string;
};

function insightIcon(type: string) {
  switch (type) {
    case "hot_client": return <Flame className="w-5 h-5 text-orange-500" />;
    case "cold_client": return <Snowflake className="w-5 h-5 text-blue-400" />;
    case "ignored_proposal": return <MailX className="w-5 h-5 text-red-400" />;
    case "upsell_opportunity": return <Rocket className="w-5 h-5 text-purple-500" />;
    case "strategy_insight": return <Lightbulb className="w-5 h-5 text-amber-500" />;
    default: return <Brain className="w-5 h-5 text-accent" />;
  }
}

function impactColor(level: string | null) {
  switch (level) {
    case "critical": return "bg-red-500/10 text-red-400 border-red-500/20";
    case "high": return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "medium": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

function probabilityColor(score: number) {
  if (score >= 70) return "text-emerald-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

export default function CerebroNatLeva() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [tab, setTab] = useState("overview");
  const { toast } = useToast();

  const loadInsights = useCallback(async () => {
    const { data } = await supabase
      .from("natleva_brain_insights" as any)
      .select("*")
      .eq("is_active", true)
      .order("confidence", { ascending: false })
      .limit(100);
    setInsights((data as any[]) || []);
  }, []);

  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("natleva-brain", {
        body: { action: "full_analysis" },
      });
      if (error) throw error;
      setMetrics(data?.metrics || null);
      await loadInsights();
      toast({ title: "Análise concluída", description: "Insights atualizados com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro na análise", description: err.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  }, [loadInsights, toast]);

  useEffect(() => {
    loadInsights().then(() => setLoading(false));
  }, [loadInsights]);

  const hotClients = insights.filter((i) => i.insight_type === "hot_client").sort((a, b) => (b.probability_score || 0) - (a.probability_score || 0));
  const coldClients = insights.filter((i) => i.insight_type === "cold_client");
  const ignoredProposals = insights.filter((i) => i.insight_type === "ignored_proposal");
  const upsellOpps = insights.filter((i) => i.insight_type === "upsell_opportunity");
  const strategyInsights = insights.filter((i) => i.insight_type === "strategy_insight");

  const promoteToKnowledge = async (insight: Insight) => {
    await supabase.from("ai_strategy_knowledge").insert({
      title: insight.title.replace(/^[🧠⚠️📭🚀] /, ""),
      rule: insight.description || insight.title,
      category: insight.category,
      function_area: insight.insight_type,
      confidence: insight.confidence,
      estimated_impact: insight.impact_level,
      tags: insight.tags,
      origin_type: "learned",
      status: "validated",
      is_active: true,
    });
    await supabase.from("natleva_brain_insights" as any).update({
      promoted_to_knowledge: true,
      promoted_at: new Date().toISOString(),
    }).eq("id", insight.id);
    toast({ title: "Promovido!", description: "Insight adicionado à Base de Conhecimento Estratégica." });
    loadInsights();
  };

  const markActionTaken = async (id: string) => {
    await supabase.from("natleva_brain_insights" as any).update({
      action_taken: true,
      action_taken_at: new Date().toISOString(),
    }).eq("id", id);
    loadInsights();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2 }} className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center shadow-lg shadow-accent/20">
            <Brain className="w-6 h-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Cérebro NatLeva</h1>
            <p className="text-sm text-muted-foreground">Inteligência comercial em tempo real</p>
          </div>
        </div>
        <Button onClick={runAnalysis} disabled={analyzing} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${analyzing ? "animate-spin" : ""}`} />
          {analyzing ? "Analisando..." : "Executar Análise"}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KPICard icon={<Users className="w-4 h-4" />} label="Clientes Quentes" value={hotClients.length} accent="text-orange-500" />
        <KPICard icon={<Snowflake className="w-4 h-4" />} label="Esfriando" value={coldClients.length} accent="text-blue-400" />
        <KPICard icon={<MailX className="w-4 h-4" />} label="Propostas Ignoradas" value={ignoredProposals.length} accent="text-red-400" />
        <KPICard icon={<Rocket className="w-4 h-4" />} label="Oport. Upsell" value={upsellOpps.length} accent="text-purple-500" />
        <KPICard icon={<Lightbulb className="w-4 h-4" />} label="Insights IA" value={strategyInsights.length} accent="text-amber-500" />
        <KPICard
          icon={<Target className="w-4 h-4" />}
          label="Taxa Abertura"
          value={metrics?.open_rate ? `${metrics.open_rate}%` : "—"}
          accent="text-emerald-500"
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="overview" className="gap-1.5 text-xs"><Zap className="w-3.5 h-3.5" /> Visão Geral</TabsTrigger>
          <TabsTrigger value="hot" className="gap-1.5 text-xs"><Flame className="w-3.5 h-3.5" /> Quentes</TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5 text-xs"><AlertTriangle className="w-3.5 h-3.5" /> Alertas</TabsTrigger>
          <TabsTrigger value="insights" className="gap-1.5 text-xs"><Lightbulb className="w-3.5 h-3.5" /> Insights</TabsTrigger>
          <TabsTrigger value="metrics" className="gap-1.5 text-xs"><BarChart3 className="w-3.5 h-3.5" /> Métricas</TabsTrigger>
        </TabsList>

        {/* ─── OVERVIEW ─── */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Top 5 Opportunities */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-accent" /> Top Oportunidades de Venda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {hotClients.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">Execute a análise para detectar oportunidades.</p>
              )}
              {hotClients.slice(0, 7).map((hc, idx) => (
                <motion.div
                  key={hc.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:bg-accent/5 transition-colors"
                >
                  <span className="text-lg font-bold text-muted-foreground/30 w-6 text-center">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-foreground truncate">{hc.title}</p>
                      {hc.metadata?.whatsapp_clicked && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-500">WhatsApp ✓</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{hc.action_suggested}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${probabilityColor(hc.probability_score || 0)}`}>
                      {hc.probability_score || 0}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">prob.</p>
                  </div>
                  {!hc.action_taken && (
                    <Button size="sm" variant="ghost" className="shrink-0" onClick={() => markActionTaken(hc.id)}>
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                  )}
                </motion.div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Alerts Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Snowflake className="w-4 h-4 text-blue-400" /> Clientes Esfriando
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {coldClients.length === 0 && <p className="text-sm text-muted-foreground text-center py-3">Nenhum alerta</p>}
                {coldClients.slice(0, 5).map((cc) => (
                  <div key={cc.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-border/40">
                    <Snowflake className="w-4 h-4 text-blue-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{cc.title}</p>
                      <p className="text-[10px] text-muted-foreground">{cc.action_suggested}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${impactColor(cc.impact_level)}`}>
                      {cc.impact_level}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MailX className="w-4 h-4 text-red-400" /> Propostas Ignoradas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {ignoredProposals.length === 0 && <p className="text-sm text-muted-foreground text-center py-3">Nenhuma proposta ignorada</p>}
                {ignoredProposals.slice(0, 5).map((ip) => (
                  <div key={ip.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-border/40">
                    <MailX className="w-4 h-4 text-red-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{ip.title}</p>
                      <p className="text-[10px] text-muted-foreground">{ip.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── HOT CLIENTS ─── */}
        <TabsContent value="hot" className="space-y-3 mt-4">
          {hotClients.length === 0 && (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Execute a análise para detectar clientes quentes.</CardContent></Card>
          )}
          {hotClients.map((hc, idx) => (
            <motion.div key={hc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Score ring */}
                    <div className="relative w-16 h-16 shrink-0">
                      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-border" />
                        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none"
                          className={probabilityColor(hc.probability_score || 0)}
                          strokeDasharray={`${((hc.probability_score || 0) / 100) * 176} 176`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${probabilityColor(hc.probability_score || 0)}`}>
                        {hc.probability_score || 0}%
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{hc.title}</h3>
                        {hc.metadata?.whatsapp_clicked && <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">WhatsApp ✓</Badge>}
                        {hc.metadata?.cta_clicked && <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px]">CTA ✓</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{hc.description}</p>
                      <div className="flex flex-wrap gap-2 text-[10px]">
                        {hc.metadata?.views && <span className="flex items-center gap-1 text-muted-foreground"><Eye className="w-3 h-3" /> {hc.metadata.views} views</span>}
                        {hc.metadata?.scroll_depth > 0 && <span className="flex items-center gap-1 text-muted-foreground"><ArrowUpRight className="w-3 h-3" /> {hc.metadata.scroll_depth}% scroll</span>}
                        {hc.metadata?.sections_viewed?.length > 0 && <span className="flex items-center gap-1 text-muted-foreground"><BarChart3 className="w-3 h-3" /> {hc.metadata.sections_viewed.length} seções</span>}
                        {hc.metadata?.total_value && <span className="flex items-center gap-1 text-accent font-medium">R$ {Number(hc.metadata.total_value).toLocaleString("pt-BR")}</span>}
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        {hc.tags?.map((t: string) => <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">{t}</Badge>)}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                      {hc.action_suggested && (
                        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => markActionTaken(hc.id)}>
                          <CheckCircle className="w-3 h-3" /> Ação feita
                        </Button>
                      )}
                      {!hc.promoted_to_knowledge && (
                        <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => promoteToKnowledge(hc)}>
                          <Shield className="w-3 h-3" /> Promover
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </TabsContent>

        {/* ─── ALERTS ─── */}
        <TabsContent value="alerts" className="space-y-3 mt-4">
          {[...coldClients, ...ignoredProposals, ...upsellOpps].length === 0 && (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum alerta ativo.</CardContent></Card>
          )}
          {[...coldClients, ...ignoredProposals, ...upsellOpps].map((alert, idx) => (
            <motion.div key={alert.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  {insightIcon(alert.insight_type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-medium text-sm">{alert.title}</h3>
                      <Badge variant="outline" className={`text-[10px] ${impactColor(alert.impact_level)}`}>
                        {alert.impact_level || "medium"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1.5">{alert.description}</p>
                    {alert.action_suggested && (
                      <p className="text-xs text-accent flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> {alert.action_suggested}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => markActionTaken(alert.id)}>
                      <CheckCircle className="w-3.5 h-3.5" />
                    </Button>
                    {!alert.promoted_to_knowledge && (
                      <Button size="sm" variant="ghost" className="text-xs" onClick={() => promoteToKnowledge(alert)}>
                        <Shield className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </TabsContent>

        {/* ─── INSIGHTS ─── */}
        <TabsContent value="insights" className="space-y-3 mt-4">
          {strategyInsights.length === 0 && (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Execute a análise com IA para gerar insights estratégicos.</CardContent></Card>
          )}
          {strategyInsights.map((ins, idx) => (
            <motion.div key={ins.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
              <Card className="border-amber-500/10">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">{ins.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{ins.description}</p>
                      {ins.action_suggested && (
                        <div className="flex items-center gap-1.5 text-sm text-accent mb-2">
                          <Sparkles className="w-3.5 h-3.5" /> <span className="font-medium">Ação sugerida:</span> {ins.action_suggested}
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {ins.confidence}% confiança</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(ins.created_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        {ins.tags?.map((t: string) => <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">{t}</Badge>)}
                      </div>
                    </div>
                    {!ins.promoted_to_knowledge && (
                      <Button size="sm" variant="outline" className="text-xs gap-1 shrink-0" onClick={() => promoteToKnowledge(ins)}>
                        <ThumbsUp className="w-3 h-3" /> Institucionalizar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </TabsContent>

        {/* ─── METRICS ─── */}
        <TabsContent value="metrics" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Métricas de Propostas</CardTitle>
            </CardHeader>
            <CardContent>
              {!metrics ? (
                <p className="text-sm text-muted-foreground text-center py-6">Execute a análise para carregar métricas.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricBox label="Total de Propostas" value={metrics.total_proposals} />
                  <MetricBox label="Taxa de Abertura" value={`${metrics.open_rate}%`} accent={metrics.open_rate >= 50} />
                  <MetricBox label="Taxa de Fechamento" value={`${metrics.close_rate}%`} accent={metrics.close_rate >= 20} />
                  <MetricBox label="Propostas Ativas" value={metrics.total_active} />
                  <MetricBox label="Ganhas" value={metrics.total_won} accent />
                  <MetricBox label="Perdidas" value={metrics.total_lost} />
                  <MetricBox label="Taxa de Perda" value={`${metrics.loss_rate}%`} />
                </div>
              )}
            </CardContent>
          </Card>

          {metrics?.strategy_breakdown && Object.keys(metrics.strategy_breakdown).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance por Estratégia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(metrics.strategy_breakdown).map(([strat, data]: [string, any]) => (
                    <div key={strat} className="flex items-center gap-3 p-3 rounded-lg border border-border/40">
                      <div className="flex-1">
                        <p className="font-medium text-sm capitalize">{strat.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">{data.total} propostas</p>
                      </div>
                      <div className="text-right text-xs space-y-0.5">
                        <p className={data.close_rate >= 30 ? "text-emerald-500 font-medium" : "text-muted-foreground"}>
                          {data.close_rate}% fechamento
                        </p>
                        <p className="text-muted-foreground">{data.open_rate}% abertura</p>
                      </div>
                      {/* Mini bar */}
                      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${data.close_rate}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPICard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number | string; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-col items-center text-center">
        <div className={`mb-1.5 ${accent || "text-muted-foreground"}`}>{icon}</div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-[10px] text-muted-foreground tracking-wide">{label}</p>
      </CardContent>
    </Card>
  );
}

function MetricBox({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border/40 p-4 text-center">
      <p className={`text-2xl font-bold ${accent ? "text-accent" : "text-foreground"}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
