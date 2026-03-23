import { Rocket, BarChart3, GitCompare, Clock, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AGENTS_V4 } from "@/components/ai-team/agentsV4Data";

const LOOPS = [
  { id: "conversao", name: "Conversão", emoji: "💰", score: 78, pending: 3 },
  { id: "conhecimento", name: "Conhecimento", emoji: "📚", score: 65, pending: 5 },
  { id: "personalizacao", name: "Personalização", emoji: "🎯", score: 72, pending: 2 },
  { id: "objecoes", name: "Objeções", emoji: "🛡️", score: 58, pending: 4 },
  { id: "ecossistema", name: "Ecossistema", emoji: "🌐", score: 81, pending: 1 },
];

const PENDING_IMPROVEMENTS = [
  { id: "m1", agent: "NERO", loop: "Objeções", title: "Resposta mais assertiva para objeção de preço", impact: "alta", confidence: 85, status: "pending" },
  { id: "m2", agent: "LUNA", loop: "Conversão", title: "Incluir fotos do quarto na proposta inicial", impact: "alta", confidence: 92, status: "pending" },
  { id: "m3", agent: "MAYA", loop: "Personalização", title: "Detectar perfil familiar vs casal no primeiro contato", impact: "media", confidence: 78, status: "pending" },
  { id: "m4", agent: "HABIBI", loop: "Conhecimento", title: "Atualizar catálogo de experiências Dubai 2026", impact: "media", confidence: 88, status: "pending" },
  { id: "m5", agent: "ATLAS", loop: "Conversão", title: "Qualificar budget antes de direcionar ao especialista", impact: "alta", confidence: 91, status: "approved" },
];

export default function AITeamEvolution() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><Rocket className="w-6 h-6 text-primary" /></div>
        <div>
          <h1 className="text-xl font-bold">Evolution Engine</h1>
          <p className="text-sm text-muted-foreground">5 loops de auto-evolução · Melhorias pendentes · A/B testing</p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="pending">Pendentes ({PENDING_IMPROVEMENTS.filter(m => m.status === "pending").length})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="objections">A/B Objeções</TabsTrigger>
          <TabsTrigger value="projection">Projeção</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            {LOOPS.map(loop => (
              <div key={loop.id} className="rounded-xl border border-border/40 bg-card p-4">
                <div className="text-center mb-2">
                  <span className="text-2xl">{loop.emoji}</span>
                  <p className="text-sm font-bold mt-1">{loop.name}</p>
                </div>
                <div className="text-center mb-2">
                  <span className="text-3xl font-bold">{loop.score}</span>
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
                <Progress value={loop.score} className="h-2 mb-2" />
                <p className="text-[10px] text-muted-foreground text-center">
                  {loop.pending} melhoria{loop.pending !== 1 ? "s" : ""} pendente{loop.pending !== 1 ? "s" : ""}
                </p>
              </div>
            ))}
          </div>

          {/* Agent ranking */}
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <h3 className="text-sm font-bold mb-4">🏆 Ranking de Agentes por Score</h3>
            <div className="space-y-2">
              {[...AGENTS_V4].sort((a, b) => b.successRate - a.successRate).slice(0, 10).map((agent, i) => (
                <div key={agent.id} className="flex items-center gap-3 py-1.5">
                  <span className="text-xs text-muted-foreground w-6 text-right font-mono">#{i + 1}</span>
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
            {PENDING_IMPROVEMENTS.filter(m => m.status === "pending").map(m => (
              <div key={m.id} className="rounded-xl border border-border/40 bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{m.agent}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{m.loop}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Confiança: {m.confidence}%</span>
                    <Badge className={m.impact === "alta" ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"}>
                      {m.impact}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm font-medium">{m.title}</p>
                <div className="flex gap-2 mt-3">
                  <button className="text-xs px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors">
                    ✅ Aprovar
                  </button>
                  <button className="text-xs px-3 py-1 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
                    🔍 Analisar
                  </button>
                  <button className="text-xs px-3 py-1 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                    ❌ Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <div className="space-y-4">
              {[
                { date: "23/03 14:30", agent: "NERO", text: "Aprovada melhoria de resposta para objeção 'vou pensar'", loop: "Objeções" },
                { date: "23/03 11:15", agent: "LUNA", text: "Nova skill de storytelling por destino detectada", loop: "Personalização" },
                { date: "22/03 16:45", agent: "ATLAS", text: "Calibragem de scoring de leads atualizada", loop: "Conversão" },
                { date: "22/03 09:00", agent: "FINX", text: "Template de cobrança amigável aprovado", loop: "Ecossistema" },
                { date: "21/03 15:20", agent: "HABIBI", text: "Base de conhecimento Dubai atualizada com 12 novos hotéis", loop: "Conhecimento" },
              ].map((evt, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-primary/40 border-2 border-primary" />
                    {i < 4 && <div className="w-px flex-1 bg-border/50 mt-1" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-xs text-muted-foreground">{evt.date} · {evt.agent} · <Badge variant="secondary" className="text-[9px]">{evt.loop}</Badge></p>
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
              {[
                { objection: '"Está muito caro"', versionA: "Oferecer desconto direto", versionB: "Mostrar valor agregado + parcelamento", winnerB: true, convA: 32, convB: 58 },
                { objection: '"Vou pensar"', versionA: "Aguardar 48h e retornar", versionB: "Criar urgência com disponibilidade", winnerB: true, convA: 18, convB: 41 },
                { objection: '"Vi mais barato"', versionA: "Cobrir preço", versionB: "Mostrar diferencial do serviço premium", winnerB: false, convA: 55, convB: 45 },
              ].map((test, i) => (
                <div key={i} className="rounded-lg border border-border/30 p-4">
                  <p className="text-sm font-bold mb-3">Objeção: {test.objection}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`rounded-lg p-3 ${!test.winnerB ? 'border-2 border-emerald-500/50 bg-emerald-500/5' : 'border border-border/30'}`}>
                      <p className="text-xs font-medium mb-1">Versão A {!test.winnerB && '🏆'}</p>
                      <p className="text-xs text-muted-foreground mb-2">{test.versionA}</p>
                      <p className="text-lg font-bold">{test.convA}%</p>
                    </div>
                    <div className={`rounded-lg p-3 ${test.winnerB ? 'border-2 border-emerald-500/50 bg-emerald-500/5' : 'border border-border/30'}`}>
                      <p className="text-xs font-medium mb-1">Versão B {test.winnerB && '🏆'}</p>
                      <p className="text-xs text-muted-foreground mb-2">{test.versionB}</p>
                      <p className="text-lg font-bold">{test.convB}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="projection" className="mt-4">
          <div className="rounded-xl border border-border/50 bg-card p-5 text-center py-12">
            <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">Projeção de Receita</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Com base nas melhorias pendentes, a projeção indica aumento de <span className="text-emerald-500 font-bold">+18%</span> na receita
              e <span className="text-emerald-500 font-bold">+12%</span> na taxa de conversão ao aprovar todas as evoluções sugeridas.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
