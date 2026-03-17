import { useParams, useNavigate } from "react-router-dom";
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import {
  ArrowLeft, Send, Zap, Shield, Target, Brain, CheckCircle2, Clock,
  Loader2, Activity, AlertTriangle, Eye, Pause, ChevronDown, ChevronUp,
  Cpu, TrendingUp, TrendingDown,
} from "lucide-react";
import { agents as mockAgents, initialTasks, simulatedResponses, type Task } from "@/components/ai-team/mockData";
import { useAgentEngine } from "@/components/ai-team/useAgentEngine";
import type { AgentEvent } from "@/components/ai-team/agentEngine";
import type { AgentMemory } from "@/components/ai-team/agentMemory";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/* ═══════════════════════════════════════════
   Config
   ═══════════════════════════════════════════ */

const STATUS_MAP: Record<string, { label: string; icon: React.ElementType; badge: string; border: string; text: string }> = {
  idle:       { label: "Aguardando",         icon: Pause,         badge: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",   border: "border-zinc-500/20", text: "text-zinc-400" },
  analyzing:  { label: "Analisando",         icon: Activity,      badge: "bg-blue-500/15 text-blue-400 border-blue-500/25",   border: "border-blue-500/20", text: "text-blue-400" },
  suggesting: { label: "Sugerindo",          icon: Brain,         badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", border: "border-emerald-500/20", text: "text-emerald-400" },
  waiting:    { label: "Aguardando Decisão", icon: Eye,           badge: "bg-amber-500/15 text-amber-400 border-amber-500/25", border: "border-amber-500/20", text: "text-amber-400" },
  alert:      { label: "Alerta",             icon: AlertTriangle, badge: "bg-red-500/15 text-red-400 border-red-500/25",       border: "border-red-500/20", text: "text-red-400" },
};

const LEVEL_MAP: Record<string, string> = { basic: "Nível 1", intermediate: "Nível 2", advanced: "Nível 3" };

const PRIORITY_MAP: Record<string, { label: string; class: string; dot: string }> = {
  high:   { label: "Crítica",  class: "text-red-400",    dot: "bg-red-400" },
  medium: { label: "Média",    class: "text-amber-400",  dot: "bg-amber-400" },
  low:    { label: "Baixa",    class: "text-zinc-500",   dot: "bg-zinc-500" },
};

const KANBAN_COLS = [
  { key: "todo",  label: "A Fazer",      icon: Clock,        statuses: ["detected", "suggested", "pending"] as string[], accent: "border-l-amber-500/60" },
  { key: "doing", label: "Em Execução",  icon: Loader2,      statuses: ["analyzing", "in_progress"] as string[],        accent: "border-l-blue-500/60" },
  { key: "done",  label: "Concluídas",   icon: CheckCircle2, statuses: ["done"] as string[],                            accent: "border-l-emerald-500/60" },
];

const MAX_VISIBLE = 4;

/* ═══════════════════════════════════════════
   Page
   ═══════════════════════════════════════════ */

export default function AITeamAgentDetail() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { agents, tasks, events } = useAgentEngine(mockAgents, initialTasks);

  const agent = useMemo(() => agents.find(a => a.id === agentId), [agents, agentId]);
  const agentTasks = useMemo(() => tasks.filter(t => t.sourceAgentId === agentId), [tasks, agentId]);
  const agentEvents = useMemo(() => events.filter(e => e.agentId === agentId).slice(0, 15), [events, agentId]);

  if (!agent) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">Agente não encontrado.</p>
          <Button variant="outline" onClick={() => navigate("/ai-team")}>Voltar ao AI Team</Button>
        </div>
      </div>
    );
  }

  const st = STATUS_MAP[agent.status] ?? STATUS_MAP.idle;
  const StatusIcon = st.icon;

  return (
    <div className="min-h-screen pb-12">
      {/* ═══ HEADER ═══ */}
      <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/ai-team")} className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" /> AI Team
            </Button>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-2xl">{agent.emoji}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-lg font-bold tracking-wide">{agent.name}</h1>
                  <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border", st.badge)}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {st.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {agent.sector} · {LEVEL_MAP[agent.level] ?? agent.level} · {agent.skills.length} capacidades
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div className="max-w-7xl mx-auto px-6 pt-6 space-y-6">

        {/* Row 1: Status + Info cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Status Operacional */}
          <div className="lg:col-span-2">
            <SectionCard title="Status Operacional" icon={Activity}>
              <p className="text-base text-foreground/80 leading-relaxed">
                {agent.currentThought || "Aguardando novas demandas."}
              </p>
              {agent.lastAction && (
                <p className="text-sm text-muted-foreground mt-3">
                  Última ação: <span className="text-foreground/60">{agent.lastAction}</span>
                </p>
              )}
              {agent.role && (
                <p className="text-sm text-muted-foreground mt-2 pt-2 border-t border-border/30">
                  {agent.role}
                </p>
              )}
            </SectionCard>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
            <MiniStat label="Missões ativas" value={agentTasks.filter(t => t.status !== "done").length} />
            <MiniStat label="Concluídas" value={agentTasks.filter(t => t.status === "done").length} />
          </div>
        </div>

        {/* Row 2: Missões (kanban) */}
        <SectionCard title={`Missões · ${agentTasks.length}`} icon={Target}>
          <MissionBoard tasks={agentTasks} />
        </SectionCard>

        {/* Row 3: Log + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Log */}
          <div className="lg:col-span-2">
            <SectionCard title="Log de Atividade" icon={Clock}>
              <ActivityLog events={agentEvents} />
            </SectionCard>
          </div>

          {/* Right: Capacidades, Áreas, Restrições */}
          <div className="space-y-4">
            {agent.skills.length > 0 && (
              <SectionCard title="Capacidades" icon={Zap}>
                <SimpleList items={agent.skills} icon={Zap} />
              </SectionCard>
            )}
            {agent.scope.length > 0 && (
              <SectionCard title="Áreas de Atuação" icon={Target}>
                <SimpleList items={agent.scope} icon={Target} />
              </SectionCard>
            )}
            {agent.restrictions.length > 0 && (
              <SectionCard title="Restrições" icon={Shield}>
                <SimpleList items={agent.restrictions} icon={Shield} muted />
              </SectionCard>
            )}
          </div>
        </div>

        {/* Row 4: Diretiva + Comando */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {agent.behaviorPrompt && (
            <SectionCard title="Diretiva Comportamental" icon={Brain}>
              <p className="text-sm text-muted-foreground leading-relaxed">{agent.behaviorPrompt}</p>
            </SectionCard>
          )}
          <SectionCard title="Terminal de Comando" icon={Send}>
            <CommandTerminal agentName={agent.name} agentId={agent.id} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════ */

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-xs font-bold tracking-[0.1em] text-muted-foreground uppercase">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 flex flex-col justify-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function SimpleList({ items, icon: Icon, muted }: { items: string[]; icon: React.ElementType; muted?: boolean }) {
  return (
    <div className="space-y-1.5">
      {items.map(item => (
        <div key={item} className="flex items-center gap-2.5 py-1.5">
          <Icon className={cn("w-3.5 h-3.5 shrink-0", muted ? "text-muted-foreground/30" : "text-muted-foreground/50")} />
          <span className={cn("text-sm", muted ? "text-muted-foreground/60" : "text-foreground/70")}>{item}</span>
        </div>
      ))}
    </div>
  );
}

function MissionBoard({ tasks }: { tasks: Task[] }) {
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

  const columns = useMemo(() => KANBAN_COLS.map(col => {
    const colTasks = tasks
      .filter(t => col.statuses.includes(t.status))
      .sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));
    return { ...col, tasks: colTasks };
  }), [tasks]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {columns.map(col => {
        const Icon = col.icon;
        const visible = col.tasks.slice(0, MAX_VISIBLE);
        const overflow = col.tasks.length - MAX_VISIBLE;
        const isDone = col.key === "done";

        return (
          <div key={col.key}>
            <div className="flex items-center gap-2 pb-2 mb-3 border-b border-border/40">
              <Icon className="w-4 h-4 text-muted-foreground/60" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{col.label}</span>
              <span className="text-xs text-muted-foreground/50 ml-auto">{col.tasks.length}</span>
            </div>
            <div className="space-y-2">
              {visible.map(t => {
                const pri = PRIORITY_MAP[t.priority] ?? PRIORITY_MAP.low;
                return (
                  <div key={t.id} className={cn(
                    "rounded-lg p-3 border border-border/40 bg-muted/30 transition-colors hover:bg-muted/50",
                    col.accent, "border-l-2",
                    isDone && "opacity-50"
                  )}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn("w-1.5 h-1.5 rounded-full", pri.dot)} />
                      <span className={cn("text-[10px] font-bold tracking-wider uppercase", pri.class)}>{pri.label}</span>
                    </div>
                    <p className={cn("text-sm font-medium leading-snug", isDone ? "text-muted-foreground line-through" : "text-foreground/80")}>
                      {t.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                  </div>
                );
              })}
              {overflow > 0 && (
                <p className="text-xs text-muted-foreground/50 text-center py-1">+{overflow} mais</p>
              )}
              {col.tasks.length === 0 && (
                <p className="text-xs text-muted-foreground/30 text-center py-6">Nenhuma missão</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActivityLog({ events }: { events: AgentEvent[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? events : events.slice(0, 5);

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground/50 py-4">Nenhuma atividade recente.</p>;
  }

  return (
    <div className="space-y-1">
      {visible.map((evt, i) => {
        const time = new Date(evt.timestamp);
        const hh = String(time.getHours()).padStart(2, "0");
        const mm = String(time.getMinutes()).padStart(2, "0");
        const isFirst = i === 0;

        return (
          <div key={evt.id} className={cn(
            "flex items-start gap-3 py-2 px-3 rounded-lg transition-colors font-mono text-sm",
            isFirst ? "bg-muted/50" : "hover:bg-muted/20"
          )}>
            <span className="text-muted-foreground/40 shrink-0 text-xs mt-0.5">[{hh}:{mm}]</span>
            <span className={cn("leading-relaxed", isFirst ? "text-foreground/70" : "text-muted-foreground/60")}>
              {evt.message}
            </span>
            {evt.severity === "high" && <span className="text-red-400 text-xs shrink-0 mt-0.5">●</span>}
            {evt.severity === "medium" && <span className="text-amber-400 text-xs shrink-0 mt-0.5">○</span>}
          </div>
        );
      })}
      {events.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground/60 transition-colors py-2 px-3"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? "Mostrar menos" : `Ver todos (${events.length})`}
        </button>
      )}
    </div>
  );
}

function CommandTerminal({ agentName, agentId }: { agentName: string; agentId: string }) {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<{ role: "user" | "agent"; text: string }[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const responses = simulatedResponses[agentId] ?? ["Processando.", "Analisando."];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    const reply = responses[Math.floor(Math.random() * responses.length)];
    setChat(prev => [...prev, { role: "user", text: input.trim() }, { role: "agent", text: reply }]);
    setInput("");
  }, [input, responses]);

  return (
    <div className="space-y-3">
      {chat.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {chat.map((m, i) => (
            <div key={i} className={cn(
              "text-sm font-mono px-3 py-2 rounded-lg max-w-[90%]",
              m.role === "user"
                ? "ml-auto text-foreground/60 bg-muted/50 border border-border/40"
                : "text-primary/70 bg-primary/5 border border-primary/10"
            )}>
              {m.role === "agent" && <span className="text-[10px] text-muted-foreground block mb-0.5">{agentName} &gt;</span>}
              {m.text}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}
      <div className="flex items-center gap-2 rounded-lg px-4 py-3 bg-muted/30 border border-border/40 focus-within:border-border transition-colors">
        <span className="text-sm font-mono text-muted-foreground/40">$</span>
        <input
          type="text"
          placeholder={`Inserir comando para ${agentName}...`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          className="flex-1 bg-transparent text-sm text-foreground/70 font-mono placeholder:text-muted-foreground/30 outline-none"
        />
        <button onClick={handleSend} disabled={!input.trim()} className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-20">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
