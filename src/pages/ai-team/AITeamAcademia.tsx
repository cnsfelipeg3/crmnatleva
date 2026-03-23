import { GraduationCap, Trophy, Star, Target, TrendingUp, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AGENTS_V4 } from "@/components/ai-team/agentsV4Data";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

interface Mission {
  id: string;
  domain: string;
  title: string;
  description: string;
  xpReward: number;
  agents: string[];
  progress: number;
  total: number;
  difficulty: "fácil" | "médio" | "difícil" | "épico";
}

const INITIAL_MISSIONS: Mission[] = [
  { id: "m1", domain: "Conversão", title: "Fechar 10 vendas com taxa >80%", description: "Realizar 10 fechamentos de venda onde a taxa de sucesso nas interações seja superior a 80%.", xpReward: 500, agents: ["NERO", "LUNA"], progress: 7, total: 10, difficulty: "difícil" },
  { id: "m2", domain: "Conhecimento", title: "Processar 20 documentos da base", description: "Ingerir e processar 20 novos documentos no sistema RAG para expandir a base de conhecimento.", xpReward: 300, agents: ["HABIBI", "DANTE", "NEMO"], progress: 14, total: 20, difficulty: "médio" },
  { id: "m3", domain: "Personalização", title: "Detectar perfil em <2 msgs", description: "Identificar corretamente o perfil do viajante (família, casal, corporate) em no máximo 2 mensagens.", xpReward: 400, agents: ["MAYA", "ATLAS"], progress: 18, total: 25, difficulty: "difícil" },
  { id: "m4", domain: "Objeções", title: "Superar 50 objeções de preço", description: "Contornar com sucesso objeções de preço usando técnicas de valor agregado.", xpReward: 600, agents: ["NERO"], progress: 38, total: 50, difficulty: "épico" },
  { id: "m5", domain: "Ecossistema", title: "Zero alertas VIGIL em 7 dias", description: "Manter compliance perfeito por 7 dias consecutivos sem nenhum alerta do VIGIL.", xpReward: 350, agents: ["Todos"], progress: 5, total: 7, difficulty: "médio" },
  { id: "m6", domain: "Conversão", title: "Reativar 15 leads frios", description: "Reconquistar 15 leads que estavam inativos há mais de 30 dias.", xpReward: 450, agents: ["AEGIS", "NURTURE", "HUNTER"], progress: 6, total: 15, difficulty: "difícil" },
  { id: "m7", domain: "Conhecimento", title: "Dominar 5 novos destinos", description: "Adicionar conhecimento detalhado sobre 5 destinos ainda não cobertos.", xpReward: 350, agents: ["DANTE", "NEMO", "HABIBI"], progress: 3, total: 5, difficulty: "médio" },
];

const ACHIEVEMENTS = [
  { id: "a1", emoji: "🏆", name: "Primeiro Fechamento", description: "Completou a primeira venda", unlocked: true, date: "10/01/2026" },
  { id: "a2", emoji: "⚡", name: "Velocista", description: "Qualificou lead em menos de 1 minuto", unlocked: true, date: "15/01/2026" },
  { id: "a3", emoji: "🎯", name: "Sniper", description: "5 fechamentos consecutivos sem rejeição", unlocked: true, date: "22/02/2026" },
  { id: "a4", emoji: "🛡️", name: "Compliance Perfeito", description: "30 dias sem alerta VIGIL", unlocked: false, progress: 23, total: 30 },
  { id: "a5", emoji: "💎", name: "Top Agent", description: "Atingir nível 20 com qualquer agente", unlocked: false, progress: 15, total: 20 },
  { id: "a6", emoji: "🌟", name: "Mestre das Skills", description: "Dominar 10 skills com taxa >80%", unlocked: false, progress: 6, total: 10 },
  { id: "a7", emoji: "🔥", name: "Streak Semanal", description: "7 dias consecutivos acima da meta", unlocked: true, date: "15/03/2026" },
  { id: "a8", emoji: "🧠", name: "Enciclopédia", description: "50 docs processados na base de conhecimento", unlocked: false, progress: 32, total: 50 },
  { id: "a9", emoji: "💬", name: "Comunicador Elite", description: "1000 interações com satisfação >90%", unlocked: false, progress: 742, total: 1000 },
];

const DOMAIN_COLORS: Record<string, string> = {
  "Conversão": "text-emerald-600 bg-emerald-500/10",
  "Conhecimento": "text-blue-600 bg-blue-500/10",
  "Personalização": "text-purple-600 bg-purple-500/10",
  "Objeções": "text-red-600 bg-red-500/10",
  "Ecossistema": "text-amber-600 bg-amber-500/10",
};

const DIFF_COLORS: Record<string, string> = {
  "fácil": "text-emerald-500",
  "médio": "text-blue-500",
  "difícil": "text-amber-500",
  "épico": "text-purple-500",
};

export default function AITeamAcademia() {
  const sortedAgents = [...AGENTS_V4].sort((a, b) => b.xp - a.xp);
  const totalXP = AGENTS_V4.reduce((acc, a) => acc + a.xp, 0);
  const avgLevel = Math.round(AGENTS_V4.reduce((acc, a) => acc + a.level, 0) / AGENTS_V4.length);
  const unlockedCount = ACHIEVEMENTS.filter(a => a.unlocked).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><GraduationCap className="w-6 h-6 text-primary" /></div>
        <div>
          <h1 className="text-xl font-bold">Academia</h1>
          <p className="text-sm text-muted-foreground">{totalXP.toLocaleString()} XP total · Nível médio {avgLevel} · {unlockedCount}/{ACHIEVEMENTS.length} conquistas</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "XP Total", value: totalXP.toLocaleString(), icon: Zap, color: "text-amber-500" },
          { label: "Nível Médio", value: avgLevel, icon: TrendingUp, color: "text-blue-500" },
          { label: "Missões Ativas", value: INITIAL_MISSIONS.length, icon: Target, color: "text-emerald-500" },
          { label: "Conquistas", value: `${unlockedCount}/${ACHIEVEMENTS.length}`, icon: Trophy, color: "text-purple-500" },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border border-border/40 bg-card p-3 text-center">
            <stat.icon className={cn("w-5 h-5 mx-auto mb-1", stat.color)} />
            <p className="text-lg font-bold">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="missions">
        <TabsList>
          <TabsTrigger value="missions">🎯 Missões ({INITIAL_MISSIONS.length})</TabsTrigger>
          <TabsTrigger value="ranking">🏆 Ranking</TabsTrigger>
          <TabsTrigger value="achievements">⭐ Conquistas ({unlockedCount}/{ACHIEVEMENTS.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="missions" className="mt-4">
          <div className="space-y-4">
            {INITIAL_MISSIONS.map(mission => {
              const pct = Math.round((mission.progress / mission.total) * 100);
              return (
                <div key={mission.id} className="rounded-xl border border-border/40 bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-[10px]", DOMAIN_COLORS[mission.domain])}>{mission.domain}</Badge>
                      <Badge variant="outline" className={cn("text-[9px]", DIFF_COLORS[mission.difficulty])}>{mission.difficulty}</Badge>
                    </div>
                    <span className="text-xs text-amber-500 font-bold">+{mission.xpReward} XP</span>
                  </div>
                  <h3 className="text-sm font-bold mb-0.5">{mission.title}</h3>
                  <p className="text-xs text-muted-foreground mb-2">{mission.description}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <Progress value={pct} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground shrink-0">{mission.progress}/{mission.total} ({pct}%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {mission.agents.map(a => (
                        <span key={a} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{a}</span>
                      ))}
                    </div>
                    {pct >= 100 && <Badge className="bg-emerald-500/10 text-emerald-600 text-[9px]">Completa!</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="ranking" className="mt-4">
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <div className="space-y-3">
              {sortedAgents.map((agent, i) => (
                <div key={agent.id} className={cn(
                  "flex items-center gap-3 py-2 px-2 rounded-lg transition-colors",
                  i < 3 ? "bg-muted/30" : ""
                )}>
                  <span className={cn("text-lg font-bold w-8 text-right",
                    i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-700" : "text-muted-foreground"
                  )}>
                    {i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`}
                  </span>
                  <span className="text-xl">{agent.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold">{agent.name}</p>
                      <Badge variant="outline" className="text-[9px]">Lv.{agent.level}</Badge>
                      <span className="text-[9px] text-muted-foreground">{agent.role}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={(agent.xp / agent.maxXp) * 100} className="h-1.5 flex-1" />
                      <span className="text-[9px] text-muted-foreground">{agent.xp}/{agent.maxXp}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-amber-500">{agent.xp.toLocaleString()}</span>
                    <p className="text-[9px] text-muted-foreground">XP</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ACHIEVEMENTS.map(ach => (
              <div key={ach.id} className={cn(
                "rounded-xl border bg-card p-4 text-center transition-all",
                ach.unlocked ? "border-amber-500/30 hover:border-amber-500/50" : "border-border/20 opacity-60"
              )}>
                <span className="text-4xl">{ach.emoji}</span>
                <h3 className="text-sm font-bold mt-2">{ach.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{ach.description}</p>
                {ach.unlocked ? (
                  <div className="mt-2">
                    <Badge className="bg-amber-500/10 text-amber-600">✓ Desbloqueada</Badge>
                    {"date" in ach && <p className="text-[9px] text-muted-foreground mt-1">{(ach as any).date}</p>}
                  </div>
                ) : (
                  <div className="mt-2">
                    {"progress" in ach && (
                      <div className="flex items-center gap-2 justify-center mb-1">
                        <Progress value={((ach as any).progress / (ach as any).total) * 100} className="h-1.5 w-24" />
                        <span className="text-[9px] text-muted-foreground">{(ach as any).progress}/{(ach as any).total}</span>
                      </div>
                    )}
                    <Badge variant="outline" className="text-muted-foreground">🔒 Bloqueada</Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
