import { FlaskConical, Play, BarChart3 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AGENTS_V4 } from "@/components/ai-team/agentsV4Data";
import { cn } from "@/lib/utils";

const CLIENT_PROFILES = [
  { id: "sonhador", name: "Sonhador", emoji: "🌟", description: "Cliente empolgado, sem budget definido, quer tudo" },
  { id: "indeciso", name: "Indeciso", emoji: "🤔", description: "Não sabe o destino, precisa de orientação" },
  { id: "desconfiado", name: "Desconfiado", emoji: "😒", description: "Questiona tudo, pede referências e garantias" },
  { id: "pechincheiro", name: "Pechincheiro", emoji: "💸", description: "Sempre acha caro, compara com concorrentes" },
  { id: "familia", name: "Família", emoji: "👨‍👩‍👧‍👦", description: "Casal com filhos, prioriza segurança e conforto" },
  { id: "lua-mel", name: "Lua de Mel", emoji: "💑", description: "Casal, experiência romântica, orçamento flexível" },
];

const MOCK_RESULTS = [
  { agentId: "maya", profile: "Sonhador", aderencia: 88, sentimento: 92, clareza: 85, total: 88, messages: 12 },
  { agentId: "nero", profile: "Pechincheiro", aderencia: 72, sentimento: 65, clareza: 90, total: 76, messages: 18 },
  { agentId: "habibi", profile: "Lua de Mel", aderencia: 95, sentimento: 97, clareza: 91, total: 94, messages: 10 },
];

export default function AITeamLaboratorio() {
  const [selectedAgents, setSelectedAgents] = useState<string[]>(["maya", "nero"]);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>(["sonhador", "pechincheiro"]);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(MOCK_RESULTS);

  const toggleAgent = (id: string) => {
    setSelectedAgents(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const toggleProfile = (id: string) => {
    setSelectedProfiles(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><FlaskConical className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold">Laboratório (War Room)</h1>
            <p className="text-sm text-muted-foreground">Stress test automático por perfil de cliente</p>
          </div>
        </div>
        <Button className="gap-1.5" onClick={() => setRunning(!running)}>
          <Play className="w-4 h-4" /> Rodar Teste
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <h3 className="text-sm font-bold mb-3">Selecionar Agentes</h3>
            <div className="flex flex-wrap gap-2">
              {AGENTS_V4.filter(a => a.squadId === 'comercial').map(a => (
                <button key={a.id} onClick={() => toggleAgent(a.id)}
                  className={cn("text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border",
                    selectedAgents.includes(a.id)
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "text-muted-foreground hover:bg-muted border-border/30"
                  )}>{a.emoji} {a.name}</button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-5">
            <h3 className="text-sm font-bold mb-3">Perfis de Cliente</h3>
            <div className="grid grid-cols-2 gap-2">
              {CLIENT_PROFILES.map(p => (
                <button key={p.id} onClick={() => toggleProfile(p.id)}
                  className={cn("text-left rounded-lg border p-3 transition-all",
                    selectedProfiles.includes(p.id)
                      ? "bg-primary/5 border-primary/30"
                      : "border-border/30 hover:bg-muted/30"
                  )}>
                  <span className="text-lg">{p.emoji}</span>
                  <p className="text-xs font-bold mt-1">{p.name}</p>
                  <p className="text-[9px] text-muted-foreground">{p.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <h3 className="text-sm font-bold mb-4">📊 Resultados</h3>
          {results.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Rode um teste para ver os resultados</p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((r, i) => {
                const agent = AGENTS_V4.find(a => a.id === r.agentId);
                return (
                  <div key={i} className="rounded-lg border border-border/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{agent?.emoji}</span>
                        <span className="text-sm font-bold">{agent?.name}</span>
                        <Badge variant="outline" className="text-[9px]">{r.profile}</Badge>
                      </div>
                      <span className={cn("text-lg font-bold",
                        r.total >= 80 ? "text-emerald-500" : r.total >= 60 ? "text-amber-500" : "text-red-500"
                      )}>{r.total}/100</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Aderência", value: r.aderencia },
                        { label: "Sentimento", value: r.sentimento },
                        { label: "Clareza", value: r.clareza },
                      ].map(dim => (
                        <div key={dim.label}>
                          <p className="text-[10px] text-muted-foreground mb-1">{dim.label}</p>
                          <Progress value={dim.value} className="h-1.5" />
                          <p className="text-xs font-medium mt-0.5">{dim.value}%</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">{r.messages} mensagens trocadas</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
