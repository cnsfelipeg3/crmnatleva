import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AGENTS_V4, SQUADS, getAgentsBySquad, getCommercialPipeline, type AgentV4, type SquadId } from "@/components/ai-team/agentsV4Data";
import { cn } from "@/lib/utils";
import { Users, ArrowRight, Filter, Eye, GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type ViewMode = "grid" | "pipeline";

const STATUS_COLORS: Record<string, string> = {
  online: "bg-emerald-500",
  busy: "bg-amber-500",
  idle: "bg-muted-foreground/40",
  offline: "bg-red-500",
};

export default function AITeamEquipe() {
  const [view, setView] = useState<ViewMode>("grid");
  const [filterSquad, setFilterSquad] = useState<SquadId | "all">("all");
  const navigate = useNavigate();
  const pipeline = getCommercialPipeline();

  const filteredAgents = filterSquad === "all"
    ? AGENTS_V4
    : getAgentsBySquad(filterSquad);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Users className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold">Equipe · 21 Agentes</h1>
            <p className="text-sm text-muted-foreground">6 squads · Gestão visual dos agentes</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant={view === "grid" ? "default" : "outline"} size="sm" onClick={() => setView("grid")}>
            <Eye className="w-4 h-4 mr-1" /> Grid
          </Button>
          <Button variant={view === "pipeline" ? "default" : "outline"} size="sm" onClick={() => setView("pipeline")}>
            <GitBranch className="w-4 h-4 mr-1" /> Pipeline
          </Button>
        </div>
      </div>

      {view === "pipeline" ? (
        /* Pipeline View */
        <div className="rounded-xl border border-border/50 bg-card p-6">
          <h3 className="text-sm font-bold mb-4">Pipeline Comercial — Funil de 8 Etapas</h3>
          <div className="flex items-center gap-2 overflow-x-auto pb-4">
            {/* Orquestração entry */}
            <PipelineNode agent={AGENTS_V4.find(a => a.id === 'orion')!} isFirst />
            <ArrowRight className="w-5 h-5 text-muted-foreground/30 shrink-0" />
            {pipeline.map((agent, i) => (
              <div key={agent.id} className="flex items-center gap-2">
                <PipelineNode agent={agent} onClick={() => navigate(`/ai-team/agent/${agent.id}`)} />
                {i < pipeline.length - 1 && <ArrowRight className="w-5 h-5 text-muted-foreground/30 shrink-0" />}
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border/30 grid grid-cols-2 md:grid-cols-5 gap-3">
            {SQUADS.filter(s => s.id !== 'comercial' && s.id !== 'orquestracao').map(squad => {
              const agents = getAgentsBySquad(squad.id);
              return (
                <div key={squad.id} className="rounded-lg border border-border/30 p-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    {squad.emoji} {squad.name}
                  </p>
                  {agents.map(a => (
                    <button key={a.id} onClick={() => navigate(`/ai-team/agent/${a.id}`)}
                      className="flex items-center gap-2 py-1 w-full text-left hover:bg-muted/30 rounded px-1 transition-colors">
                      <div className={cn("w-2 h-2 rounded-full", STATUS_COLORS[a.status])} />
                      <span className="text-xs">{a.emoji} {a.name}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Grid View */
        <>
          {/* Squad filter */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilterSquad("all")}
              className={cn("text-xs px-3 py-1.5 rounded-lg font-medium transition-colors",
                filterSquad === "all" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}>Todos ({AGENTS_V4.length})</button>
            {SQUADS.map(s => (
              <button key={s.id} onClick={() => setFilterSquad(s.id)}
                className={cn("text-xs px-3 py-1.5 rounded-lg font-medium transition-colors",
                  filterSquad === s.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                )}>{s.emoji} {s.name} ({getAgentsBySquad(s.id).length})</button>
            ))}
          </div>

          {/* Agent cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredAgents.map(agent => (
              <AgentCard key={agent.id} agent={agent} onClick={() => navigate(`/ai-team/agent/${agent.id}`)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AgentCard({ agent, onClick }: { agent: AgentV4; onClick: () => void }) {
  const squad = SQUADS.find(s => s.id === agent.squadId);
  return (
    <button onClick={onClick}
      className="text-left rounded-xl border border-border/40 p-4 hover:border-primary/30 hover:bg-muted/20 transition-all group">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{agent.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold truncate">{agent.name}</p>
            <div className={cn("w-2 h-2 rounded-full shrink-0", STATUS_COLORS[agent.status])} />
          </div>
          <p className="text-[10px] text-muted-foreground truncate">{agent.role}</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
        <span className={squad?.color}>{squad?.emoji} {squad?.name}</span>
        <span>Lv.{agent.level}</span>
      </div>
      <Progress value={(agent.xp / agent.maxXp) * 100} className="h-1.5 mb-2" />
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">Taxa: {agent.successRate}%</span>
        <span className="text-muted-foreground">{agent.tasksToday} tarefas hoje</span>
      </div>
    </button>
  );
}

function PipelineNode({ agent, isFirst, onClick }: { agent: AgentV4; isFirst?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className="shrink-0 rounded-xl border border-border/40 p-3 w-[130px] text-center hover:border-primary/30 transition-all">
      <span className="text-2xl block">{agent.emoji}</span>
      <p className="text-xs font-bold mt-1">{agent.name}</p>
      <p className="text-[9px] text-muted-foreground leading-tight">{agent.role}</p>
      <div className={cn("w-2 h-2 rounded-full mx-auto mt-2", STATUS_COLORS[agent.status])} />
    </button>
  );
}
