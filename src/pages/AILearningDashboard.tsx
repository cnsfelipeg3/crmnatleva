import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Brain, ChevronLeft, Loader2, RefreshCw, TrendingUp,
  Target, Lightbulb, ArrowUpRight, CheckCircle2, XCircle,
  BarChart3, Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LearnedPattern {
  id: string;
  category: string;
  title: string;
  description: string | null;
  detected_rule: string;
  confidence: number;
  sample_size: number;
  estimated_impact: string | null;
  is_active: boolean;
  is_promoted: boolean;
  promoted_to_rule_id: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  estrategia_comercial: "Estratégia Comercial",
  estrategia_por_destino: "Estratégia por Destino",
  estrategia_por_perfil: "Estratégia por Perfil",
  timing_comercial: "Timing Comercial",
  analise_perdas: "Análise de Perdas",
  geral: "Geral",
};

const IMPACT_COLORS: Record<string, string> = {
  alto: "bg-green-500/10 text-green-700 border-green-200",
  "médio": "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  baixo: "bg-muted text-muted-foreground",
};

export default function AILearningDashboard() {
  const navigate = useNavigate();
  const [patterns, setPatterns] = useState<LearnedPattern[]>([]);
  const [eventsCount, setEventsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [pRes, eRes] = await Promise.all([
      supabase.from("ai_learned_patterns" as any).select("*").order("confidence", { ascending: false }),
      supabase.from("ai_learning_events" as any).select("id", { count: "exact", head: true }),
    ]);
    if (!pRes.error) setPatterns((pRes.data as any[]) || []);
    setEventsCount(eRes.count || 0);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-learn-patterns");
      if (error) throw error;
      toast.success(`Análise concluída: ${data.patterns_generated} padrões detectados (${data.created} novos, ${data.updated} atualizados)`);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Erro na análise");
    }
    setAnalyzing(false);
  };

  const toggleActive = async (p: LearnedPattern) => {
    await supabase.from("ai_learned_patterns" as any).update({ is_active: !p.is_active, updated_at: new Date().toISOString() } as any).eq("id", p.id);
    fetchData();
  };

  const promoteToRule = async (p: LearnedPattern) => {
    const { data, error } = await supabase.from("ai_strategy_knowledge").insert({
      category: p.category,
      title: `[Aprendido] ${p.title}`,
      description: p.description,
      rule: p.detected_rule,
      example: `Confiança: ${p.confidence}% | Amostra: ${p.sample_size} | Impacto: ${p.estimated_impact}`,
      priority: Math.round(p.confidence / 10),
      is_active: true,
    } as any).select("id").single();

    if (error) {
      toast.error("Erro ao promover regra");
      return;
    }
    await supabase.from("ai_learned_patterns" as any).update({
      is_promoted: true,
      promoted_to_rule_id: data.id,
      updated_at: new Date().toISOString(),
    } as any).eq("id", p.id);
    toast.success("Padrão promovido para base de conhecimento!");
    fetchData();
  };

  const activePatterns = patterns.filter(p => p.is_active && !p.is_promoted);
  const promotedPatterns = patterns.filter(p => p.is_promoted);
  const avgConfidence = patterns.length > 0
    ? Math.round(patterns.reduce((s, p) => s + p.confidence, 0) / patterns.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Aprendizados da IA
          </h1>
          <p className="text-sm text-muted-foreground">
            Padrões descobertos automaticamente pela operação comercial
          </p>
        </div>
        <div className="ml-auto">
          <Button onClick={runAnalysis} disabled={analyzing}>
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Analisar Agora
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4 text-center">
          <BarChart3 className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold text-foreground">{eventsCount}</p>
          <p className="text-xs text-muted-foreground">Eventos registrados</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Lightbulb className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
          <p className="text-2xl font-bold text-foreground">{patterns.length}</p>
          <p className="text-xs text-muted-foreground">Padrões detectados</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Target className="h-5 w-5 mx-auto mb-1 text-green-500" />
          <p className="text-2xl font-bold text-foreground">{activePatterns.length}</p>
          <p className="text-xs text-muted-foreground">Ativos</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <ArrowUpRight className="h-5 w-5 mx-auto mb-1 text-blue-500" />
          <p className="text-2xl font-bold text-foreground">{promotedPatterns.length}</p>
          <p className="text-xs text-muted-foreground">Promovidos</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold text-foreground">{avgConfidence}%</p>
          <p className="text-xs text-muted-foreground">Confiança média</p>
        </CardContent></Card>
      </div>

      {/* Patterns List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : patterns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum padrão detectado ainda</p>
            <p className="text-sm mt-1">
              Registre eventos de propostas e clique em "Analisar Agora" para a IA começar a aprender.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-380px)]">
          <div className="space-y-3">
            {patterns.map((p) => (
              <Card key={p.id} className={`transition-opacity ${!p.is_active ? "opacity-50" : ""} ${p.is_promoted ? "border-primary/30 bg-primary/5" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${p.is_promoted ? "bg-primary/20" : "bg-muted"}`}>
                      {p.is_promoted ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <Lightbulb className="h-4 w-4 text-yellow-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-foreground text-sm">{p.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {CATEGORY_LABELS[p.category] || p.category}
                        </Badge>
                        {p.estimated_impact && (
                          <Badge className={`text-xs border ${IMPACT_COLORS[p.estimated_impact] || IMPACT_COLORS.baixo}`}>
                            Impacto {p.estimated_impact}
                          </Badge>
                        )}
                        {p.is_promoted && (
                          <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                            Promovido ✓
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{p.detected_rule}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Confiança:</span>
                          <Progress value={p.confidence} className="w-20 h-1.5" />
                          <span className="text-xs font-medium text-foreground">{p.confidence}%</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Amostra: {p.sample_size}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(p.updated_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
                      {!p.is_promoted && p.confidence >= 60 && (
                        <Button variant="outline" size="sm" onClick={() => promoteToRule(p)} className="text-xs">
                          <ArrowUpRight className="h-3 w-3 mr-1" /> Promover
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
