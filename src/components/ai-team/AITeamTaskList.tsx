import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, X } from "lucide-react";
import type { Task, Agent } from "./mockData";
import { cn } from "@/lib/utils";

const priorityConfig: Record<Task["priority"], { label: string; className: string }> = {
  high: { label: "Alta", className: "bg-red-500/10 text-red-600 border-red-500/20" },
  medium: { label: "Média", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  low: { label: "Baixa", className: "bg-muted text-muted-foreground border-border" },
};

const statusConfig: Record<Task["status"], { label: string; className: string }> = {
  detected: { label: "Detectado", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  analyzing: { label: "Em análise", className: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
  suggested: { label: "Sugerido", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  pending: { label: "Aguardando decisão", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  in_progress: { label: "Em execução", className: "bg-sky-500/10 text-sky-600 border-sky-500/20" },
  done: { label: "Concluído", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
};

interface Props {
  tasks: Task[];
  agents: Agent[];
  onApprove: (id: string) => void;
  onIgnore: (id: string) => void;
}

export default function AITeamTaskList({ tasks, agents, onApprove, onIgnore }: Props) {
  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a]));

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const agent = agentMap[task.sourceAgentId];
        const pr = priorityConfig[task.priority];
        const st = statusConfig[task.status];

        return (
          <Card key={task.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-medium text-sm">{task.title}</h4>
                  <Badge variant="outline" className={cn("text-[10px]", pr.className)}>
                    {pr.label}
                  </Badge>
                  <Badge variant="outline" className={cn("text-[10px]", st.className)}>
                    {st.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{task.description}</p>
                {agent && (
                  <p className="text-[11px] text-muted-foreground">
                    {agent.emoji} {agent.name} · {agent.sector}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 text-emerald-600 hover:bg-emerald-500/10"
                  onClick={() => onApprove(task.id)}
                >
                  <Check className="w-3.5 h-3.5" /> Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1 text-muted-foreground"
                  onClick={() => onIgnore(task.id)}
                >
                  <X className="w-3.5 h-3.5" /> Ignorar
                </Button>
              </div>
            </div>
          </Card>
        );
      })}

      {tasks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nenhuma tarefa pendente. Os agentes estão trabalhando! 🧠
        </div>
      )}
    </div>
  );
}
