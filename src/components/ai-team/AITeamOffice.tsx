import type { Agent, Task } from "./mockData";
import AgentDesk from "./AgentDesk";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface Props {
  agents: Agent[];
  tasks: Task[];
  onBack: () => void;
  onSelectAgent: (agent: Agent) => void;
}

export default function AITeamOffice({ agents, tasks, onBack, onSelectAgent }: Props) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Voltar ao dashboard
        </Button>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Escritório Virtual</h2>
      </div>

      {/* Office floor */}
      <div
        className="relative rounded-2xl border border-border/40 bg-muted/20 p-10 overflow-hidden"
        style={{
          backgroundImage:
            "radial-gradient(circle, hsl(var(--border)/0.3) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        {/* Perspective wrapper */}
        <div
          className="max-w-5xl mx-auto"
          style={{
            perspective: "1100px",
          }}
        >
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 transition-transform duration-200 ease-out"
            style={{
              transform: "rotateX(10deg)",
              transformOrigin: "center bottom",
            }}
          >
            {agents.map((agent) => (
              <AgentDesk
                key={agent.id}
                agent={agent}
                taskCount={tasks.filter((t) => t.sourceAgentId === agent.id).length}
                onSelect={() => onSelectAgent(agent)}
              />
            ))}
          </div>
        </div>

        {/* Ambient label */}
        <p className="text-center text-[11px] text-muted-foreground/50 mt-8">
          Clique em um agente para ver detalhes e interagir
        </p>
      </div>
    </div>
  );
}
