import { useState, lazy, Suspense } from "react";
import { Brain, Plus, Building2, LayoutDashboard, Box } from "lucide-react";
import { agents as mockAgents, initialTasks, type Agent, type Task } from "@/components/ai-team/mockData";
import AITeamStatusCards from "@/components/ai-team/AITeamStatusCards";
import AITeamAgentCard from "@/components/ai-team/AITeamAgentCard";
import AITeamTaskList from "@/components/ai-team/AITeamTaskList";
import AITeamAgentDrawer from "@/components/ai-team/AITeamAgentDrawer";
import AITeamCreateAgentDialog from "@/components/ai-team/AITeamCreateAgentDialog";
import OfficeGameView from "@/components/ai-team/office-game/OfficeGameView";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Lazy load 3D view — Three.js only loads when user chooses 3D mode
const OfficeGame3DView = lazy(() => import("@/components/ai-team/office-game-3d/OfficeGame3DView"));

type ViewMode = "dashboard" | "office" | "office3d";

export default function AITeam() {
  const [agents, setAgents] = useState<Agent[]>(mockAgents);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("dashboard");
  const { toast } = useToast();

  const handleApprove = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "Tarefa aprovada", description: "A sugestão foi aceita e será aplicada." });
  };

  const handleIgnore = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "Tarefa ignorada", description: "A sugestão foi descartada." });
  };

  const handleCreateAgent = (agent: Agent) => {
    setAgents((prev) => [...prev, agent]);
    toast({ title: "Agente criado", description: `${agent.name} foi adicionado ao time.` });
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">AI Team</h1>
            <p className="text-sm text-muted-foreground">Central de agentes inteligentes do sistema</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {view !== "dashboard" && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setView("dashboard")}>
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Button>
          )}
          {view !== "office" && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setView("office")}>
              <Building2 className="w-4 h-4" /> Escritório 2D
            </Button>
          )}
          {view !== "office3d" && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setView("office3d")}>
              <Box className="w-4 h-4" /> Escritório 3D
            </Button>
          )}
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> Novo agente
          </Button>
        </div>
      </div>

      {view === "dashboard" ? (
        <>
          {/* Status */}
          <AITeamStatusCards tasks={tasks} />

          {/* Agents */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Agentes ({agents.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <AITeamAgentCard
                  key={agent.id}
                  agent={agent}
                  taskCount={tasks.filter((t) => t.sourceAgentId === agent.id).length}
                  onViewDetails={() => setSelectedAgent(agent)}
                />
              ))}
            </div>
          </section>

          {/* Tasks */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Tarefas ({tasks.length})
            </h2>
            <AITeamTaskList
              tasks={tasks}
              agents={agents}
              onApprove={handleApprove}
              onIgnore={handleIgnore}
            />
          </section>
        </>
      ) : view === "office" ? (
        <OfficeGameView
          agents={agents}
          tasks={tasks}
          onBack={() => setView("dashboard")}
          onSelectAgent={setSelectedAgent}
        />
      ) : (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: '#e8e4dc' }}>
            <div className="text-sm text-muted-foreground">Carregando escritório 3D...</div>
          </div>
        }>
          <OfficeGame3DView
            agents={agents}
            tasks={tasks}
            onBack={() => setView("dashboard")}
            onSelectAgent={setSelectedAgent}
          />
        </Suspense>
      )}

      {/* Drawer */}
      <AITeamAgentDrawer
        agent={selectedAgent}
        tasks={tasks}
        open={!!selectedAgent}
        onOpenChange={(open) => { if (!open) setSelectedAgent(null); }}
      />

      {/* Create dialog */}
      <AITeamCreateAgentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreateAgent={handleCreateAgent}
      />
    </div>
  );
}
