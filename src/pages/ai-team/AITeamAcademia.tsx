import { GraduationCap, Trophy, Star, Target } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AGENTS_V4 } from "@/components/ai-team/agentsV4Data";
import { cn } from "@/lib/utils";

const MISSIONS = [
  { id: "m1", domain: "Conversão", title: "Fechar 10 vendas com taxa >80%", xpReward: 500, agents: ["NERO", "LUNA"], progress: 7, total: 10 },
  { id: "m2", domain: "Conhecimento", title: "Processar 20 documentos da base", xpReward: 300, agents: ["HABIBI", "DANTE", "NEMO"], progress: 14, total: 20 },
  { id: "m3", domain: "Personalização", title: "Detectar perfil em <2 msgs", xpReward: 400, agents: ["MAYA", "ATLAS"], progress: 18, total: 25 },
  { id: "m4", domain: "Objeções", title: "Superar 50 objeções de preço", xpReward: 600, agents: ["NERO"], progress: 38, total: 50 },
  { id: "m5", domain: "Ecossistema", title: "Zero alertas VIGIL em 7 dias", xpReward: 350, agents: ["Todos"], progress: 5, total: 7 },
];

const ACHIEVEMENTS = [
  { id: "a1", emoji: "🏆", name: "Primeiro Fechamento", description: "Completou a primeira venda", unlocked: true },
  { id: "a2", emoji: "⚡", name: "Velocista", description: "Qualificou lead em menos de 1 minuto", unlocked: true },
  { id: "a3", emoji: "🎯", name: "Sniper", description: "5 fechamentos consecutivos", unlocked: true },
  { id: "a4", emoji: "🛡️", name: "Compliance Perfeito", description: "30 dias sem alerta VIGIL", unlocked: false },
  { id: "a5", emoji: "💎", name: "Top Agent", description: "Atingir nível 20", unlocked: false },
  { id: "a6", emoji: "🌟", name: "Mestre das Skills", description: "Dominar 10 skills", unlocked: false },
];

const DOMAIN_COLORS: Record<string, string> = {
  "Conversão": "text-emerald-600 bg-emerald-500/10",
  "Conhecimento": "text-blue-600 bg-blue-500/10",
  "Personalização": "text-purple-600 bg-purple-500/10",
  "Objeções": "text-red-600 bg-red-500/10",
  "Ecossistema": "text-amber-600 bg-amber-500/10",
};

export default function AITeamAcademia() {
  const sortedAgents = [...AGENTS_V4].sort((a, b) => b.xp - a.xp);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><GraduationCap className="w-6 h-6 text-primary" /></div>
        <div>
          <h1 className="text-xl font-bold">Academia</h1>
          <p className="text-sm text-muted-foreground">Gamificação · Missões · XP · Ranking</p>
        </div>
      </div>

      <Tabs defaultValue="missions">
        <TabsList>
          <TabsTrigger value="missions">🎯 Missões</TabsTrigger>
          <TabsTrigger value="ranking">🏆 Ranking</TabsTrigger>
          <TabsTrigger value="achievements">⭐ Conquistas</TabsTrigger>
        </TabsList>

        <TabsContent value="missions" className="mt-4">
          <div className="space-y-4">
            {MISSIONS.map(mission => (
              <div key={mission.id} className="rounded-xl border border-border/40 bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge className={cn("text-[10px]", DOMAIN_COLORS[mission.domain])}>{mission.domain}</Badge>
                  <span className="text-xs text-amber-500 font-bold">+{mission.xpReward} XP</span>
                </div>
                <h3 className="text-sm font-bold mb-1">{mission.title}</h3>
                <div className="flex items-center gap-2 mb-2">
                  <Progress value={(mission.progress / mission.total) * 100} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground shrink-0">{mission.progress}/{mission.total}</span>
                </div>
                <div className="flex gap-1">
                  {mission.agents.map(a => (
                    <span key={a} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{a}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ranking" className="mt-4">
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <div className="space-y-3">
              {sortedAgents.map((agent, i) => (
                <div key={agent.id} className="flex items-center gap-3 py-2">
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
                    </div>
                    <Progress value={(agent.xp / agent.maxXp) * 100} className="h-1.5 mt-1" />
                  </div>
                  <span className="text-sm font-bold text-amber-500">{agent.xp.toLocaleString()} XP</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ACHIEVEMENTS.map(ach => (
              <div key={ach.id} className={cn(
                "rounded-xl border bg-card p-4 text-center",
                ach.unlocked ? "border-amber-500/30" : "border-border/20 opacity-50"
              )}>
                <span className="text-4xl">{ach.emoji}</span>
                <h3 className="text-sm font-bold mt-2">{ach.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{ach.description}</p>
                {ach.unlocked ? (
                  <Badge className="mt-2 bg-amber-500/10 text-amber-600">Desbloqueada</Badge>
                ) : (
                  <Badge variant="outline" className="mt-2 text-muted-foreground">Bloqueada</Badge>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
