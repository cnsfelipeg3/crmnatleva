import { useState, lazy, Suspense, useCallback } from "react";
import { Brain, Plus, Building2, LayoutDashboard, Box } from "lucide-react";
import { agents as mockAgents, initialTasks, type Agent } from "@/components/ai-team/mockData";
import { useAgentEngine } from "@/components/ai-team/useAgentEngine";
import AITeamStatusCards from "@/components/ai-team/AITeamStatusCards";
import AITeamAgentCard from "@/components/ai-team/AITeamAgentCard";
import AITeamTaskList from "@/components/ai-team/AITeamTaskList";
import AITeamAgentPanel from "@/components/ai-team/AITeamAgentPanel";
import AITeamCreateAgentDialog from "@/components/ai-team/AITeamCreateAgentDialog";
import OfficeGameView from "@/components/ai-team/office-game/OfficeGameView";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const OfficeGame3DView = lazy(() => import("@/components/ai-team/office-game-3d/OfficeGame3DView"));

type ViewMode = "dashboard" | "office" | "office3d";

export default function AITeam() {
  const { agents, tasks, events, addAgent, removeTask } = useAgentEngine(mockAgents, initialTasks);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("dashboard");
  const { toast } = useToast();

  // Derive selected agent from live engine state so it stays fresh
  const selectedAgent = selectedAgentId ? agents.find(a => a.id === selectedAgentId) ?? null : null;

  const handleApprove = useCallback((id: string) => {
    removeTask(id);
    toast({ title: "Tarefa aprovada", description: "A sugestão foi aceita e será aplicada." });
  }, [removeTask, toast]);

  const handleIgnore = useCallback((id: string) => {
    removeTask(id);
    toast({ title: "Tarefa ignorada", description: "A sugestão foi descartada." });
  }, [removeTask, toast]);

  const handleCreateAgent = useCallback((agent: Agent) => {
    addAgent(agent);
    toast({ title: "Agente criado", description: `${agent.name} foi adicionado ao time.` });
  }, [addAgent, toast]);

  const handleSelectAgent = useCallback((agent: Agent) => {
    setSelectedAgentId(agent.id);
  }, []);

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
          <AITeamStatusCards tasks={tasks} />

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Agentes ({agents.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <AITeamAgentCard
                  key={agent.id}
                  agent={agent}
                  taskCount={tasks.filter((t) => t.sourceAgentId === agent.id).length}
                  onViewDetails={() => handleSelectAgent(agent)}
                />
              ))}
            </div>
          </section>

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
          onSelectAgent={handleSelectAgent}
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
            onSelectAgent={handleSelectAgent}
          />
        </Suspense>
      )}

      {/* Immersive Agent Panel */}
      <AITeamAgentPanel
        agent={selectedAgent}
        tasks={tasks}
        events={events}
        open={!!selectedAgent}
        onOpenChange={(open) => { if (!open) setSelectedAgentId(null); }}
      />

      <AITeamCreateAgentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreateAgent={handleCreateAgent}
      />
    </div>
  );
}
