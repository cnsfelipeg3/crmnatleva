import { useState } from "react";
import { Brain } from "lucide-react";
import { agents as mockAgents, initialTasks, type Agent, type Task } from "@/components/ai-team/mockData";
import AITeamStatusCards from "@/components/ai-team/AITeamStatusCards";
import AITeamAgentCard from "@/components/ai-team/AITeamAgentCard";
import AITeamTaskList from "@/components/ai-team/AITeamTaskList";
import AITeamAgentDrawer from "@/components/ai-team/AITeamAgentDrawer";
import { useToast } from "@/hooks/use-toast";

export default function AITeam() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const { toast } = useToast();

  const handleApprove = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "Tarefa aprovada", description: "A sugestão foi aceita e será aplicada." });
  };

  const handleIgnore = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "Tarefa ignorada", description: "A sugestão foi descartada." });
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Brain className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">AI Team</h1>
          <p className="text-sm text-muted-foreground">Central de agentes inteligentes do sistema</p>
        </div>
      </div>

      {/* Section 1 — Status */}
      <AITeamStatusCards tasks={tasks} />

      {/* Section 2 — Agents */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Agentes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mockAgents.map((agent) => (
            <AITeamAgentCard
              key={agent.id}
              agent={agent}
              taskCount={tasks.filter((t) => t.sourceAgentId === agent.id).length}
              onViewDetails={() => setSelectedAgent(agent)}
            />
          ))}
        </div>
      </section>

      {/* Section 3 — Tasks */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Tarefas ({tasks.length})
        </h2>
        <AITeamTaskList
          tasks={tasks}
          agents={mockAgents}
          onApprove={handleApprove}
          onIgnore={handleIgnore}
        />
      </section>

      {/* Agent Drawer */}
      <AITeamAgentDrawer
        agent={selectedAgent}
        tasks={tasks}
        open={!!selectedAgent}
        onOpenChange={(open) => { if (!open) setSelectedAgent(null); }}
      />
    </div>
  );
}
