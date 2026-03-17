import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Agent } from "./mockData";
import { cn } from "@/lib/utils";

const statusConfig: Record<Agent["status"], { label: string; dot: string }> = {
  idle: { label: "Ocioso", dot: "bg-muted-foreground/40" },
  analyzing: { label: "Analisando", dot: "bg-blue-500 animate-pulse" },
  suggesting: { label: "Sugerindo", dot: "bg-emerald-500 animate-pulse" },
};

interface Props {
  agent: Agent;
  taskCount: number;
  onViewDetails: () => void;
}

export default function AITeamAgentCard({ agent, taskCount, onViewDetails }: Props) {
  const st = statusConfig[agent.status];

  return (
    <Card className="p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{agent.emoji}</span>
          <div>
            <h3 className="font-semibold text-sm">{agent.name}</h3>
            <Badge variant="secondary" className="text-[10px] mt-0.5">{agent.sector}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={cn("w-2 h-2 rounded-full shrink-0", st.dot)} />
          {st.label}
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{agent.role}</p>

      <div className="text-xs bg-muted/50 rounded-md p-2 border border-border/50">
        <span className="text-muted-foreground">Última ação:</span>{" "}
        <span className="text-foreground">{agent.lastAction}</span>
      </div>

      <div className="flex items-center justify-between mt-auto pt-1">
        <span className="text-[11px] text-muted-foreground">{taskCount} tarefa{taskCount !== 1 ? "s" : ""}</span>
        <Button size="sm" variant="outline" onClick={onViewDetails} className="text-xs h-7">
          Ver detalhes
        </Button>
      </div>
    </Card>
  );
}
