import { useState, useMemo, useCallback, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import {
  Brain, Plus, Building2, LayoutDashboard, AlertTriangle, Clock,
  Activity, CheckCircle2, Loader2, Check, X, Filter, DollarSign, MessageSquare, FileText,
} from "lucide-react";
import { AGENTS_V4, SQUADS, type AgentV4 } from "@/components/ai-team/agentsV4Data";
import { getAllV4Agents, getV4InitialTasks } from "@/components/ai-team/agentV4Bridge";
import { useAgentEngine } from "@/components/ai-team/useAgentEngine";
import type { AgentEvent } from "@/components/ai-team/agentEngine";
import type { Agent } from "@/components/ai-team/mockData";
import AITeamCreateAgentDialog from "@/components/ai-team/AITeamCreateAgentDialog";
import { useAITeamPersistence } from "@/hooks/useAITeamPersistence";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const OfficeGame3DView = lazy(() => import("@/components/ai-team/office-game-3d/OfficeGame3DView"));

type ViewMode = "dashboard" | "office3d";
type FeedFilter = "all" | "alert" | "insight" | "status_change";

const baseAgents = getAllV4Agents();
const baseTasks = getV4InitialTasks();

const STATUS_BADGE: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  idle:       { label: "Idle",        icon: Clock,          cls: "text-muted-foreground bg-muted" },
  analyzing:  { label: "Analisando",  icon: Activity,       cls: "text-blue-600 bg-blue-500/10" },
  suggesting: { label: "Sugerindo",   icon: Brain,          cls: "text-emerald-600 bg-emerald-500/10" },
  waiting:    { label: "Aguardando",  icon: Clock,          cls: "text-amber-600 bg-amber-500/10" },
  alert:      { label: "Alerta",      icon: AlertTriangle,  cls: "text-red-600 bg-red-500/10" },
};

const PRIORITY_DOT: Record<string, string> = { high: "bg-red-500", medium: "bg-amber-500", low: "bg-muted-foreground/40" };

const KANBAN_COLS = [
  { key: "suggested", label: "Sugeridas",   statuses: ["detected", "suggested", "pending"], accent: "border-l-amber-500/60" },
  { key: "exec",      label: "Em Execução", statuses: ["analyzing", "in_progress"],         accent: "border-l-blue-500/60" },
  { key: "done",      label: "Concluídas",  statuses: ["done"],                             accent: "border-l-emerald-500/60" },
];
const MAX_KANBAN = 4;

const FEED_FILTERS: { key: FeedFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "alert", label: "Alertas" },
  { key: "insight", label: "Sugestões" },
  { key: "status_change", label: "Sistema" },
];

export default function AITeam() {
  const { agents, tasks, events, addAgent, removeTask } = useAgentEngine(baseAgents, baseTasks);
  const [createOpen, setCreateOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("dashboard");
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("all");
  const [workLogAgent, setWorkLogAgent] = useState<string>(baseAgents[0]?.id ?? "");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { seedAgents, fetchRealMetrics } = useAITeamPersistence();

  // Real business metrics
  const [realMetrics, setRealMetrics] = useState<{
    totalSales: number; totalRevenue: number; totalProfit: number;
    activeConversations: number; totalConversations: number;
    openProposals: number; totalProposals: number; salesToday: number;
  } | null>(null);

  useEffect(() => {
    seedAgents();
    fetchRealMetrics().then(setRealMetrics).catch(console.error);
  }, []);

  const handleApprove = useCallback((id: string) => {
    removeTask(id, "approve");
    toast({ title: "Tarefa aprovada", description: "Sugestão aceita." });
  }, [removeTask, toast]);

  const handleIgnore = useCallback((id: string) => {
    removeTask(id, "ignore");
    toast({ title: "Tarefa ignorada", description: "Sugestão descartada." });
  }, [removeTask, toast]);

  const handleCreateAgent = useCallback((agent: Agent) => {
    addAgent(agent);
    toast({ title: "Agente criado", description: `${agent.name} adicionado.` });
  }, [addAgent, toast]);

  const handleSelectAgent = useCallback((agent: Agent) => {
    navigate(`/ai-team/agent/${agent.id}`);
  }, [navigate]);

  // KPIs
  const kpis = useMemo(() => {
    const active = agents.filter(a => a.status !== "idle").length;
    const executing = tasks.filter(t => ["analyzing", "in_progress"].includes(t.status)).length;
    const alerts = events.filter(e => e.severity === "high").length;
    const pending = tasks.filter(t => ["suggested", "detected", "pending"].includes(t.status)).length;
    return { active, executing, alerts, pending };
  }, [agents, tasks, events]);

  // Filtered feed
  const filteredEvents = useMemo(() => {
    const evts = feedFilter === "all" ? events : events.filter(e => e.type === feedFilter);
    return evts.slice(0, 25);
  }, [events, feedFilter]);

  // Work log
  const workLogEvents = useMemo(() => {
    return events.filter(e => e.agentId === workLogAgent).slice(0, 15);
  }, [events, workLogAgent]);

  // Group agents by squad for display
  const agentsBySquad = useMemo(() => {
    const map = new Map<string, typeof agents>();
    for (const a of agents) {
      const squad = a.sector; // sector = squadId from bridge
      if (!map.has(squad)) map.set(squad, []);
      map.get(squad)!.push(a);
    }
    return map;
  }, [agents]);

  if (view === "office3d") {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
        <OfficeGame3DView agents={agents} tasks={tasks} onBack={() => setView("dashboard")} onSelectAgent={handleSelectAgent} />
      </Suspense>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Brain className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold">AI Team · Mission Control</h1>
            <p className="text-sm text-muted-foreground">{agents.length} agentes · {SQUADS.length} squads · {tasks.length} tarefas</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant={view === "dashboard" ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => setView("dashboard")}>
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setView("office3d")}>
            <Building2 className="w-4 h-4" /> Escritório 3D
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> Novo agente
          </Button>
        </div>
      </div>

      {/* ═══ [1] KPI CARDS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Agentes Ativos" value={kpis.active} total={agents.length} color="text-primary" icon={Activity} />
        <KpiCard label="Em Execução" value={kpis.executing} color="text-blue-600" icon={Loader2} />
        <KpiCard label="Alertas" value={kpis.alerts} color="text-red-600" icon={AlertTriangle} />
        <KpiCard label="Pendentes" value={kpis.pending} color="text-amber-600" icon={Clock} />
      </div>

      {/* ═══ [2] FEED + [3] KANBAN ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Feed */}
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold tracking-[0.1em] text-muted-foreground uppercase flex items-center gap-2">
              <Activity className="w-4 h-4" /> Feed ao Vivo
            </h3>
            <div className="flex gap-1">
              {FEED_FILTERS.map(f => (
                <button key={f.key} onClick={() => setFeedFilter(f.key)}
                  className={cn("text-[10px] px-2 py-1 rounded-md font-medium transition-colors",
                    feedFilter === f.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                  )}>{f.label}</button>
              ))}
            </div>
          </div>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {filteredEvents.length === 0 && <p className="text-sm text-muted-foreground/40 py-4 text-center">Nenhum evento.</p>}
            {filteredEvents.map((evt, i) => {
              const agent = agents.find(a => a.id === evt.agentId);
              const v4 = AGENTS_V4.find(a => a.id === evt.agentId);
              const time = new Date(evt.timestamp);
              const hh = String(time.getHours()).padStart(2, "0");
              const mm = String(time.getMinutes()).padStart(2, "0");
              return (
                <div key={evt.id} className={cn("flex items-start gap-2 py-1.5 px-2 rounded text-sm", i === 0 && "bg-muted/40")}>
                  <span className="text-muted-foreground/40 text-xs font-mono shrink-0 mt-0.5">[{hh}:{mm}]</span>
                  <span className="shrink-0">{v4?.emoji ?? agent?.emoji}</span>
                  <span className={cn("leading-snug", i === 0 ? "text-foreground/70" : "text-muted-foreground/60")}>
                    <span className="font-medium">{v4?.name ?? agent?.name}</span> · {evt.message}
                  </span>
                  {evt.severity === "high" && <span className="text-red-500 text-xs shrink-0 mt-0.5">●</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Kanban */}
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <h3 className="text-xs font-bold tracking-[0.1em] text-muted-foreground uppercase flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4" /> Missões · {tasks.length}
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {KANBAN_COLS.map(col => {
              const colTasks = tasks.filter(t => col.statuses.includes(t.status));
              const visible = colTasks.slice(0, MAX_KANBAN);
              const overflow = colTasks.length - MAX_KANBAN;
              return (
                <div key={col.key}>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pb-2 mb-2 border-b border-border/30">
                    {col.label} <span className="text-muted-foreground/40">({colTasks.length})</span>
                  </div>
                  <div className="space-y-2">
                    {visible.map(t => {
                      const v4 = AGENTS_V4.find(a => a.id === t.sourceAgentId);
                      return (
                        <div key={t.id} className={cn("rounded-lg p-2.5 border border-border/40 bg-muted/20 border-l-2", col.accent)}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className={cn("w-1.5 h-1.5 rounded-full", PRIORITY_DOT[t.priority])} />
                            <span className="text-[10px] text-muted-foreground">{v4?.emoji} {v4?.name ?? t.sourceAgentId}</span>
                          </div>
                          <p className="text-xs font-medium text-foreground/80 leading-snug">{t.title}</p>
                          {col.key === "suggested" && (
                            <div className="flex gap-1 mt-2">
                              <button onClick={() => handleApprove(t.id)} className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Aprovar
                              </button>
                              <button onClick={() => handleIgnore(t.id)} className="text-[10px] px-2 py-0.5 rounded text-muted-foreground hover:bg-muted transition-colors flex items-center gap-0.5">
                                <X className="w-3 h-3" /> Ignorar
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {overflow > 0 && <p className="text-[10px] text-muted-foreground/40 text-center py-1">+{overflow} mais</p>}
                    {colTasks.length === 0 && <p className="text-[10px] text-muted-foreground/30 text-center py-4">—</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ [4] AGENT GRID BY SQUAD ═══ */}
      <div className="rounded-xl border border-border/50 bg-card p-5">
        <h3 className="text-xs font-bold tracking-[0.1em] text-muted-foreground uppercase flex items-center gap-2 mb-4">
          <Brain className="w-4 h-4" /> Agentes ({agents.length}) · {SQUADS.length} Squads
        </h3>
        <div className="space-y-6">
          {SQUADS.map(squad => {
            const squadAgents = agents.filter(a => a.sector === squad.id);
            if (squadAgents.length === 0) return null;
            return (
              <div key={squad.id}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm">{squad.emoji}</span>
                  <span className={cn("text-xs font-bold uppercase tracking-wider", squad.color)}>{squad.name}</span>
                  <span className="text-[10px] text-muted-foreground">({squadAgents.length})</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {squadAgents.map(agent => {
                    const v4 = AGENTS_V4.find(a => a.id === agent.id);
                    const st = STATUS_BADGE[agent.status] ?? STATUS_BADGE.idle;
                    const StIcon = st.icon;
                    return (
                      <button key={agent.id} onClick={() => handleSelectAgent(agent)}
                        className="text-left rounded-xl border border-border/40 p-3 hover:border-primary/30 hover:bg-muted/30 transition-all group">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-lg">{v4?.emoji ?? agent.emoji}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold truncate">{v4?.name ?? agent.name}</p>
                          </div>
                        </div>
                        <div className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium", st.cls)}>
                          <StIcon className="w-2.5 h-2.5" /> {st.label}
                        </div>
                        {v4 && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <Progress value={(v4.xp / v4.maxXp) * 100} className="h-1 flex-1" />
                            <span className="text-[8px] text-muted-foreground">Lv.{v4.level}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ [5] WORK LOG POR AGENTE ═══ */}
      <div className="rounded-xl border border-border/50 bg-card p-5">
        <h3 className="text-xs font-bold tracking-[0.1em] text-muted-foreground uppercase flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4" /> Work Log por Agente
        </h3>
        <div className="flex gap-1.5 overflow-x-auto pb-3 mb-3 border-b border-border/30 scrollbar-hide">
          {agents.slice(0, 15).map(a => {
            const v4 = AGENTS_V4.find(v => v.id === a.id);
            return (
              <button key={a.id} onClick={() => setWorkLogAgent(a.id)}
                className={cn("shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap",
                  workLogAgent === a.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                )}>
                {v4?.emoji ?? a.emoji} {v4?.name ?? a.name}
              </button>
            );
          })}
        </div>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {workLogEvents.length === 0 && <p className="text-sm text-muted-foreground/40 py-4 text-center">Nenhuma atividade registrada.</p>}
          {workLogEvents.map((evt, i) => {
            const time = new Date(evt.timestamp);
            const hh = String(time.getHours()).padStart(2, "0");
            const mm = String(time.getMinutes()).padStart(2, "0");
            const typeLabel = evt.type === "alert" ? "ALERTA" : evt.type === "insight" ? "INSIGHT" : "AÇÃO";
            return (
              <div key={evt.id} className={cn("flex items-start gap-3 py-1.5 px-2 rounded font-mono text-xs", i === 0 && "bg-muted/40")}>
                <span className="text-muted-foreground/40 shrink-0">[{hh}:{mm}]</span>
                <Badge variant="outline" className={cn("text-[9px] shrink-0 py-0",
                  evt.type === "alert" ? "text-red-500 border-red-500/20" :
                  evt.type === "insight" ? "text-emerald-500 border-emerald-500/20" :
                  "text-muted-foreground border-border"
                )}>{typeLabel}</Badge>
                <span className={cn(i === 0 ? "text-foreground/60" : "text-muted-foreground/50")}>{evt.message}</span>
              </div>
            );
          })}
        </div>
      </div>

      <AITeamCreateAgentDialog open={createOpen} onOpenChange={setCreateOpen} onCreateAgent={handleCreateAgent} />
    </div>
  );
}

/* ═══ Sub-components ═══ */

function KpiCard({ label, value, total, color, icon: Icon }: { label: string; value: number; total?: number; color: string; icon: React.ElementType }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 flex items-center gap-3">
      <div className={cn("p-2 rounded-lg bg-muted", color)}><Icon className="w-5 h-5" /></div>
      <div>
        <p className="text-2xl font-bold">{value}{total != null && <span className="text-sm text-muted-foreground font-normal">/{total}</span>}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
