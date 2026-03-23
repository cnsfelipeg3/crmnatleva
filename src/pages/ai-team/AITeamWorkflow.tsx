import { GitBranch, ZoomIn, ZoomOut, Maximize, ArrowRight } from "lucide-react";
import { AGENTS_V4, SQUADS, getCommercialPipeline, type AgentV4 } from "@/components/ai-team/agentsV4Data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";

const STATUS_DOT: Record<string, string> = {
  online: "bg-emerald-500",
  busy: "bg-amber-500",
  idle: "bg-muted-foreground/40",
  offline: "bg-red-500",
};

const HANDOFF_RULES = [
  { from: "MAYA", to: "ATLAS", trigger: "Lead qualificado para SDR", color: "text-emerald-500" },
  { from: "ATLAS", to: "Especialista*", trigger: "Perfil + budget mapeado → destino detectado", color: "text-blue-500" },
  { from: "Especialista", to: "LUNA", trigger: "Roteiro definido → montar proposta", color: "text-purple-500" },
  { from: "LUNA", to: "NERO", trigger: "Proposta enviada → aguardando fechamento", color: "text-amber-500" },
  { from: "NERO", to: "IRIS", trigger: "Venda fechada → pós-venda", color: "text-pink-500" },
  { from: "VIGIL", to: "Qualquer", trigger: "Bloqueio → mensagem fora de compliance", color: "text-red-500" },
];

export default function AITeamWorkflow() {
  const pipeline = getCommercialPipeline();
  const orquestracao = AGENTS_V4.filter(a => a.squadId === "orquestracao");
  const [selectedAgent, setSelectedAgent] = useState<AgentV4 | null>(null);
  const [zoom, setZoom] = useState(1);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><GitBranch className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold">Workflow Visual</h1>
            <p className="text-sm text-muted-foreground">21 agentes · 6 squads · Regras de handoff</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}><ZoomIn className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => setZoom(z => Math.max(0.6, z - 0.1))}><ZoomOut className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => setZoom(1)}><Maximize className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas */}
        <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card p-6 min-h-[550px] overflow-auto"
          style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
          {/* Orquestração */}
          <div className="text-center mb-6">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">🎯 Orquestração</p>
            <div className="flex justify-center gap-4">
              {orquestracao.map(a => (
                <WorkflowNode key={a.id} agent={a} selected={selectedAgent?.id === a.id} onClick={() => setSelectedAgent(a)} />
              ))}
            </div>
            <div className="w-px h-6 bg-border/50 mx-auto" />
            <div className="w-3 h-3 rounded-full bg-primary/30 border-2 border-primary mx-auto" />
            <div className="flex justify-center gap-16 mt-1">
              <div className="w-px h-6 bg-border/50" />
              <div className="w-px h-6 bg-border/50" />
              <div className="w-px h-6 bg-border/50" />
            </div>
          </div>

          {/* Pipeline Comercial */}
          <div className="mb-8">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3 text-center">💼 Pipeline Comercial</p>
            <div className="flex items-center justify-center gap-1 overflow-x-auto pb-2">
              {pipeline.map((a, i) => (
                <div key={a.id} className="flex items-center gap-1">
                  <WorkflowNode agent={a} step={i + 1} selected={selectedAgent?.id === a.id} onClick={() => setSelectedAgent(a)} />
                  {i < pipeline.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-border/60 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Support squads */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
            {SQUADS.filter(s => !["comercial", "orquestracao"].includes(s.id)).map(squad => {
              const agents = AGENTS_V4.filter(a => a.squadId === squad.id);
              return (
                <div key={squad.id} className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">{squad.emoji} {squad.name.replace("Squad ", "")}</p>
                  <div className="flex flex-col items-center gap-2">
                    {agents.map(a => (
                      <WorkflowNode key={a.id} agent={a} compact selected={selectedAgent?.id === a.id} onClick={() => setSelectedAgent(a)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Agent detail */}
          {selectedAgent ? (
            <div className="rounded-xl border border-primary/20 bg-card p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{selectedAgent.emoji}</span>
                <div>
                  <p className="text-sm font-bold">{selectedAgent.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedAgent.role}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground">Nível</p>
                  <p className="font-bold">Lv.{selectedAgent.level}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground">Taxa</p>
                  <p className="font-bold">{selectedAgent.successRate}%</p>
                </div>
              </div>
              <div className="mb-3">
                <p className="text-[10px] text-muted-foreground mb-1">Skills</p>
                <div className="flex flex-wrap gap-1">
                  {selectedAgent.skills.map(s => (
                    <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/5 text-primary">{s}</span>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground italic">"{selectedAgent.persona}"</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground">Clique em um agente para ver detalhes</p>
            </div>
          )}

          {/* Handoff Rules */}
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <h3 className="text-xs font-bold mb-3">🔄 Regras de Handoff</h3>
            <div className="space-y-2">
              {HANDOFF_RULES.map((rule, i) => (
                <div key={i} className="text-[10px] p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-1 font-bold mb-0.5">
                    <span>{rule.from}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span>{rule.to}</span>
                  </div>
                  <p className="text-muted-foreground">{rule.trigger}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <h3 className="text-xs font-bold mb-2">Legenda</h3>
            <div className="space-y-1.5 text-[10px]">
              {[
                { color: "bg-emerald-500", label: "Online" },
                { color: "bg-amber-500", label: "Ocupado" },
                { color: "bg-muted-foreground/40", label: "Idle" },
                { color: "bg-red-500", label: "Offline" },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", l.color)} />
                  <span className="text-muted-foreground">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowNode({ agent, step, compact, selected, onClick }: {
  agent: AgentV4; step?: number; compact?: boolean; selected?: boolean; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} className={cn(
      "rounded-xl border bg-card hover:border-primary/30 transition-all cursor-pointer text-center relative",
      compact ? "p-2 w-[90px]" : "p-3 w-[110px]",
      selected ? "border-primary ring-1 ring-primary/20" : "border-border/40"
    )}>
      {step && (
        <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
          {step}
        </span>
      )}
      <span className={compact ? "text-lg" : "text-xl"}>{agent.emoji}</span>
      <p className={cn("font-bold mt-0.5", compact ? "text-[9px]" : "text-[10px]")}>{agent.name}</p>
      <p className={cn("text-muted-foreground leading-tight", compact ? "text-[7px]" : "text-[8px]")}>{agent.role}</p>
      <div className={cn("w-2 h-2 rounded-full mx-auto mt-1", STATUS_DOT[agent.status])} />
    </div>
  );
}
