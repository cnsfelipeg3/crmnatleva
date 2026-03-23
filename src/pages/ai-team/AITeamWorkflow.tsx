import { GitBranch, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { AGENTS_V4, SQUADS, getCommercialPipeline } from "@/components/ai-team/agentsV4Data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATUS_DOT: Record<string, string> = {
  online: "bg-emerald-500",
  busy: "bg-amber-500",
  idle: "bg-muted-foreground/40",
  offline: "bg-red-500",
};

export default function AITeamWorkflow() {
  const pipeline = getCommercialPipeline();
  const orquestracao = AGENTS_V4.filter(a => a.squadId === 'orquestracao');

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><GitBranch className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold">Workflow Visual</h1>
            <p className="text-sm text-muted-foreground">Canvas com todos os 21 agentes conectados</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="w-8 h-8"><ZoomIn className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" className="w-8 h-8"><ZoomOut className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" className="w-8 h-8"><Maximize className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Master View Canvas */}
      <div className="rounded-xl border border-border/50 bg-card p-8 min-h-[500px] overflow-x-auto">
        {/* Orquestração */}
        <div className="text-center mb-8">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">🎯 Orquestração</p>
          <div className="flex justify-center gap-4">
            {orquestracao.map(a => (
              <WorkflowNode key={a.id} emoji={a.emoji} name={a.name} role={a.role} status={a.status} />
            ))}
          </div>
          <div className="w-px h-8 bg-border/50 mx-auto" />
          <div className="w-3 h-3 rounded-full bg-primary/30 border-2 border-primary mx-auto" />
          <div className="w-px h-8 bg-border/50 mx-auto" />
        </div>

        {/* Pipeline Comercial */}
        <div className="mb-8">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3 text-center">💼 Pipeline Comercial</p>
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
            {pipeline.map((a, i) => (
              <div key={a.id} className="flex items-center gap-2">
                <WorkflowNode emoji={a.emoji} name={a.name} role={a.role} status={a.status} step={i + 1} />
                {i < pipeline.length - 1 && (
                  <div className="flex items-center">
                    <div className="w-8 h-px bg-border/50" />
                    <div className="w-2 h-2 rotate-45 border-r-2 border-t-2 border-border/50 -ml-1" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Support squads */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
          {SQUADS.filter(s => !['comercial', 'orquestracao'].includes(s.id)).map(squad => {
            const agents = AGENTS_V4.filter(a => a.squadId === squad.id);
            return (
              <div key={squad.id} className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">{squad.emoji} {squad.name}</p>
                <div className="flex flex-col items-center gap-2">
                  {agents.map(a => (
                    <WorkflowNode key={a.id} emoji={a.emoji} name={a.name} role={a.role} status={a.status} compact />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WorkflowNode({ emoji, name, role, status, step, compact }: {
  emoji: string; name: string; role: string; status: string; step?: number; compact?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-xl border border-border/40 bg-card hover:border-primary/30 transition-all cursor-pointer text-center relative",
      compact ? "p-2 w-[100px]" : "p-3 w-[120px]"
    )}>
      {step && (
        <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
          {step}
        </span>
      )}
      <span className={compact ? "text-lg" : "text-2xl"}>{emoji}</span>
      <p className={cn("font-bold mt-1", compact ? "text-[10px]" : "text-xs")}>{name}</p>
      <p className={cn("text-muted-foreground leading-tight", compact ? "text-[8px]" : "text-[9px]")}>{role}</p>
      <div className={cn("w-2 h-2 rounded-full mx-auto mt-1.5", STATUS_DOT[status])} />
    </div>
  );
}
