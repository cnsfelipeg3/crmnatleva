import { Rocket, BarChart3, TrendingUp, CheckCircle2, XCircle, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AGENTS_V4 } from "@/components/ai-team/agentsV4Data";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const LOOPS = [
  { id: "conversao", name: "Conversão", emoji: "💰", score: 78, pending: 3, trend: +4, detail: "Melhoria em objection-handling e timing de follow-up" },
  { id: "conhecimento", name: "Conhecimento", emoji: "📚", score: 65, pending: 5, trend: +7, detail: "Novos docs processados e FAQ expandido" },
  { id: "personalizacao", name: "Personalização", emoji: "🎯", score: 72, pending: 2, trend: +3, detail: "Detecção de perfil familiar melhorada" },
  { id: "objecoes", name: "Objeções", emoji: "🛡️", score: 58, pending: 4, trend: +12, detail: "A/B testing otimizando respostas" },
  { id: "ecossistema", name: "Ecossistema", emoji: "🌐", score: 81, pending: 1, trend: +2, detail: "Compliance VIGIL estável" },
];

interface Improvement {
  id: string;
  agent: string;
  loop: string;
  title: string;
  impact: "alta" | "media" | "baixa";
  confidence: number;
  status: "pending" | "approved" | "rejected";
  detail: string;
}

const INITIAL_IMPROVEMENTS: Improvement[] = [
  { id: "m1", agent: "NERO", loop: "Objeções", title: "Resposta mais assertiva para objeção de preço", impact: "alta", confidence: 85, status: "pending", detail: "Substituir desconto direto por argumentação de valor agregado + parcelamento. Teste com 45 interações mostrou +23% de conversão." },
  { id: "m2", agent: "LUNA", loop: "Conversão", title: "Incluir fotos do quarto na proposta inicial", impact: "alta", confidence: 92, status: "pending", detail: "Propostas com foto do quarto converteram 34% mais. Integração automática com media library." },
  { id: "m3", agent: "MAYA", loop: "Personalização", title: "Detectar perfil familiar vs casal no primeiro contato", impact: "media", confidence: 78, status: "pending", detail: "Padrões de linguagem permitem detecção em 2 mensagens. Reduz tempo de qualificação em 40%." },
  { id: "m4", agent: "HABIBI", loop: "Conhecimento", title: "Atualizar catálogo de experiências Dubai 2026", impact: "media", confidence: 88, status: "pending", detail: "12 novos hotéis e 8 experiências VIP adicionadas ao catálogo RAG." },
  { id: "m5", agent: "ATLAS", loop: "Conversão", title: "Qualificar budget antes de direcionar ao especialista", impact: "alta", confidence: 91, status: "approved", detail: "Budget declarado no início evita propostas fora de faixa. Redução de 28% em retrabalho." },
  { id: "m6", agent: "VIGIL", loop: "Ecossistema", title: "Nova regra: detectar promessas de câmbio paralelo", impact: "alta", confidence: 96, status: "pending", detail: "Regex + análise semântica para detectar menções a câmbio não-oficial nas conversas." },
  { id: "m7", agent: "IRIS", loop: "Personalização", title: "NPS contextualizado por tipo de viagem", impact: "media", confidence: 73, status: "pending", detail: "Perguntas de NPS adaptadas ao destino e perfil geram 2x mais respostas." },
];

const AB_TESTS = [
  { id: "ab1", objection: '"Está muito caro"', versionA: { name: "Oferecer desconto direto", conv: 32, samples: 120, desc: "Desconto de 5-10% imediato ao detectar objeção de preço" }, versionB: { name: "Mostrar valor agregado + parcelamento", conv: 58, samples: 115, desc: "Listar benefícios exclusivos e opções de parcelamento sem juros" }, days: 14, winner: "B" },
  { id: "ab2", objection: '"Vou pensar"', versionA: { name: "Aguardar 48h e retornar", conv: 18, samples: 90, desc: "Follow-up passivo após 48h com pergunta aberta" }, versionB: { name: "Criar urgência com disponibilidade", conv: 41, samples: 88, desc: "Informar disponibilidade limitada e vagas restantes em tempo real" }, days: 21, winner: "B" },
  { id: "ab3", objection: '"Vi mais barato"', versionA: { name: "Cobrir preço", conv: 55, samples: 65, desc: "Igualar ou cobrir o preço da concorrência quando comprovado" }, versionB: { name: "Mostrar diferencial premium", conv: 45, samples: 70, desc: "Enfatizar serviço premium, suporte 24h e experiências exclusivas" }, days: 10, winner: "A" },
];

export default function AITeamEvolution() {
  const [improvements, setImprovements] = useState<Improvement[]>(INITIAL_IMPROVEMENTS);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pendingCount = improvements.filter(m => m.status === "pending").length;
  const approvedCount = improvements.filter(m => m.status === "approved").length;

  const handleAction = (id: string, action: "approved" | "rejected") => {
    setImprovements(prev => prev.map(m => m.id === id ? { ...m, status: action } : m));
    toast.success(action === "approved" ? "✅ Melhoria aprovada e aplicada" : "❌ Melhoria rejeitada");
  };

  const projectedRevenue = approvedCount * 6 + pendingCount * 4;
  const projectedConversion = approvedCount * 3 + pendingCount * 2;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><Rocket className="w-6 h-6 text-primary" /></div>
        <div>
          <h1 className="text-xl font-bold">Evolution Engine</h1>
          <p className="text-sm text-muted-foreground">5 loops de auto-evolução · {pendingCount} melhorias pendentes · {approvedCount} aprovadas</p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="pending">Pendentes ({pendingCount})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="objections">A/B Objeções</TabsTrigger>
          <TabsTrigger value="projection">Projeção</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            {LOOPS.map(loop => (
              <div key={loop.id} className="rounded-xl border border-border/40 bg-card p-4 hover:border-primary/20 transition-all">
                <div className="text-center mb-2">
                  <span className="text-2xl">{loop.emoji}</span>
                  <p className="text-sm font-bold mt-1">{loop.name}</p>
                </div>
                <div className="text-center mb-2">
                  <span className="text-3xl font-bold">{loop.score}</span>
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
                <Progress value={loop.score} className="h-2 mb-2" />
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">{loop.pending} pendente{loop.pending !== 1 ? "s" : ""}</span>
                  <span className="text-emerald-500 font-bold flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" />+{loop.trend}%
                  </span>
                </div>
                <p className="text-[9px] text-muted-foreground mt-1 line-clamp-2">{loop.detail}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-5">
            <h3 className="text-sm font-bold mb-4">🏆 Ranking de Agentes por Score</h3>
            <div className="space-y-2">
              {[...AGENTS_V4].sort((a, b) => b.successRate - a.successRate).slice(0, 10).map((agent, i) => (
                <div key={agent.id} className="flex items-center gap-3 py-1.5">
                  <span className={cn("text-sm font-bold w-6 text-right",
                    i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-700" : "text-muted-foreground"
                  )}>
                    {i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`}
                  </span>
                  <span className="text-lg">{agent.emoji}</span>
                  <span className="text-sm font-medium flex-1">{agent.name}</span>
                  <span className="text-xs text-muted-foreground">Lv.{agent.level}</span>
                  <Badge variant="outline" className="text-xs">{agent.successRate}%</Badge>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <div className="space-y-3">
            {improvements.filter(m => m.status === "pending").length === 0 && (
              <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500/30 mx-auto mb-3" />
                <p className="text-sm font-bold">Todas as melhorias foram processadas!</p>
                <p className="text-xs text-muted-foreground">Novas sugestões aparecerão conforme os agentes aprendem.</p>
              </div>
            )}
            {improvements.filter(m => m.status === "pending").map(m => (
              <div key={m.id} className="rounded-xl border border-border/40 bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{m.agent}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{m.loop}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Confiança: {m.confidence}%</span>
                    <Badge className={cn(
                      m.impact === "alta" ? "bg-red-500/10 text-red-600" :
                      m.impact === "media" ? "bg-amber-500/10 text-amber-600" :
                      "bg-blue-500/10 text-blue-600"
                    )}>{m.impact}</Badge>
                  </div>
                </div>
                <p className="text-sm font-medium">{m.title}</p>
                
                {expandedId === m.id && (
                  <div className="mt-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                    {m.detail}
                  </div>
                )}
                
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="ghost" className="text-xs h-7 gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                    onClick={() => handleAction(m.id, "approved")}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs h-7 gap-1"
                    onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}>
                    <Eye className="w-3.5 h-3.5" /> {expandedId === m.id ? "Fechar" : "Analisar"}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs h-7 gap-1 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    onClick={() => handleAction(m.id, "rejected")}>
                    <XCircle className="w-3.5 h-3.5" /> Rejeitar
                  </Button>
                </div>
              </div>
            ))}

            {improvements.filter(m => m.status !== "pending").length > 0 && (
              <div className="mt-6">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Processadas</h4>
                {improvements.filter(m => m.status !== "pending").map(m => (
                  <div key={m.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/30 mb-1.5">
                    {m.status === "approved" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-400" />}
                    <span className="text-xs flex-1">{m.title}</span>
                    <Badge variant="outline" className="text-[9px]">{m.agent}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <div className="space-y-4">
              {[
                { date: "23/03 14:30", agent: "NERO", emoji: "🎯", text: "Aprovada melhoria de resposta para objeção 'vou pensar'", loop: "Objeções", type: "approved" },
                { date: "23/03 11:15", agent: "LUNA", emoji: "🌙", text: "Nova skill de storytelling por destino detectada", loop: "Personalização", type: "detected" },
                { date: "22/03 16:45", agent: "ATLAS", emoji: "🗺️", text: "Calibragem de scoring de leads atualizada", loop: "Conversão", type: "approved" },
                { date: "22/03 09:00", agent: "FINX", emoji: "📊", text: "Template de cobrança amigável aprovado", loop: "Ecossistema", type: "approved" },
                { date: "21/03 15:20", agent: "HABIBI", emoji: "🏜️", text: "Base de conhecimento Dubai atualizada com 12 novos hotéis", loop: "Conhecimento", type: "update" },
                { date: "21/03 10:00", agent: "VIGIL", emoji: "👁️", text: "Nova regra de compliance adicionada: câmbio paralelo", loop: "Ecossistema", type: "approved" },
                { date: "20/03 14:10", agent: "MAYA", emoji: "🌸", text: "Detecção de perfil familiar otimizada: 2 msgs vs 5", loop: "Personalização", type: "approved" },
                { date: "20/03 08:30", agent: "HUNTER", emoji: "🏹", text: "Campanha de reativação Q1 converteu 12% dos leads", loop: "Conversão", type: "result" },
              ].map((evt, i, arr) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={cn("w-3 h-3 rounded-full border-2",
                      evt.type === "approved" ? "bg-emerald-500/40 border-emerald-500" :
                      evt.type === "detected" ? "bg-blue-500/40 border-blue-500" :
                      evt.type === "result" ? "bg-amber-500/40 border-amber-500" :
                      "bg-primary/40 border-primary"
                    )} />
                    {i < arr.length - 1 && <div className="w-px flex-1 bg-border/50 mt-1" />}
                  </div>
                  <div className="pb-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{evt.date}</span>
                      <span>{evt.emoji} {evt.agent}</span>
                      <Badge variant="secondary" className="text-[9px]">{evt.loop}</Badge>
                    </div>
                    <p className="text-sm mt-0.5">{evt.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="objections" className="mt-4">
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <h3 className="text-sm font-bold mb-4">🧪 A/B Testing de Objeções</h3>
            <div className="space-y-4">
              {AB_TESTS.map(test => (
                <div key={test.id} className="rounded-lg border border-border/30 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold">Objeção: {test.objection}</p>
                    <Badge variant="outline" className="text-[10px]">{test.days} dias de teste</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className={cn("rounded-lg p-3",
                      test.winner === "A" ? "border-2 border-emerald-500/50 bg-emerald-500/5" : "border border-border/30"
                    )}>
                      <p className="text-xs font-medium mb-1">Versão A {test.winner === "A" && "🏆"}</p>
                      <p className="text-xs font-bold mb-1">{test.versionA.name}</p>
                      <p className="text-[10px] text-muted-foreground mb-2">{test.versionA.desc}</p>
                      <div className="flex items-end justify-between">
                        <p className="text-2xl font-bold">{test.versionA.conv}%</p>
                        <span className="text-[10px] text-muted-foreground">{test.versionA.samples} amostras</span>
                      </div>
                      <Progress value={test.versionA.conv} className="h-1.5 mt-1" />
                    </div>
                    <div className={cn("rounded-lg p-3",
                      test.winner === "B" ? "border-2 border-emerald-500/50 bg-emerald-500/5" : "border border-border/30"
                    )}>
                      <p className="text-xs font-medium mb-1">Versão B {test.winner === "B" && "🏆"}</p>
                      <p className="text-xs font-bold mb-1">{test.versionB.name}</p>
                      <p className="text-[10px] text-muted-foreground mb-2">{test.versionB.desc}</p>
                      <div className="flex items-end justify-between">
                        <p className="text-2xl font-bold">{test.versionB.conv}%</p>
                        <span className="text-[10px] text-muted-foreground">{test.versionB.samples} amostras</span>
                      </div>
                      <Progress value={test.versionB.conv} className="h-1.5 mt-1" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="projection" className="mt-4">
          <div className="rounded-xl border border-border/50 bg-card p-6">
            <h3 className="text-sm font-bold mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" /> Projeção de Impacto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <p className="text-3xl font-bold text-emerald-500">+{projectedRevenue}%</p>
                <p className="text-xs text-muted-foreground mt-1">Projeção de Receita</p>
                <p className="text-[10px] text-muted-foreground">Baseado em {approvedCount} aprovadas + {pendingCount} pendentes</p>
              </div>
              <div className="text-center p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
                <p className="text-3xl font-bold text-blue-500">+{projectedConversion}%</p>
                <p className="text-xs text-muted-foreground mt-1">Taxa de Conversão</p>
                <p className="text-[10px] text-muted-foreground">Melhoria cumulativa dos loops</p>
              </div>
              <div className="text-center p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <p className="text-3xl font-bold text-amber-500">-35%</p>
                <p className="text-xs text-muted-foreground mt-1">Tempo de Resposta</p>
                <p className="text-[10px] text-muted-foreground">Automação e qualificação mais rápida</p>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Impacto por Loop</h4>
              {LOOPS.map(loop => (
                <div key={loop.id} className="flex items-center gap-3">
                  <span className="text-lg">{loop.emoji}</span>
                  <span className="text-sm font-medium w-28">{loop.name}</span>
                  <Progress value={loop.score} className="h-2 flex-1" />
                  <span className="text-xs font-bold w-12 text-right">{loop.score}%</span>
                  <span className="text-xs text-emerald-500 w-10 text-right">→ {Math.min(100, loop.score + loop.trend)}%</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
