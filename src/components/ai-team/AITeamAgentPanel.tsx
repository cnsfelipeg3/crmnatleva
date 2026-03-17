import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  X, Send, Zap, Shield, Target, Brain, Crosshair, CheckCircle2, Clock,
  Loader2, Activity, AlertTriangle, Eye, Pause, Radio, ChevronRight,
} from "lucide-react";
import type { Agent, Task } from "./mockData";
import type { AgentEvent } from "./agentEngine";
import { simulatedResponses } from "./mockData";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════
   Types & Config
   ═══════════════════════════════════════════════════ */

interface Props {
  agent: Agent | null;
  tasks: Task[];
  events?: AgentEvent[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChatMsg { role: "user" | "agent"; text: string }

const STATUS_MAP: Record<string, { label: string; icon: React.ElementType; class: string; border: string }> = {
  idle:       { label: "AGUARDANDO",         icon: Pause,           class: "text-zinc-400 bg-zinc-400/10", border: "border-zinc-500/20" },
  analyzing:  { label: "ANALISANDO",         icon: Activity,        class: "text-blue-400 bg-blue-400/10", border: "border-blue-500/20" },
  suggesting: { label: "SUGERINDO",          icon: Brain,           class: "text-emerald-400 bg-emerald-400/10", border: "border-emerald-500/20" },
  waiting:    { label: "AGUARDANDO DECISÃO", icon: Eye,             class: "text-amber-400 bg-amber-400/10", border: "border-amber-500/20" },
  alert:      { label: "ALERTA",             icon: AlertTriangle,   class: "text-red-400 bg-red-400/10", border: "border-red-500/20" },
};

const LEVEL_LABELS: Record<string, string> = {
  basic: "NÍVEL 1", intermediate: "NÍVEL 2", advanced: "NÍVEL 3",
};

const PRIORITY_MAP: Record<string, { label: string; class: string }> = {
  high:   { label: "CRÍTICA",      class: "text-red-400" },
  medium: { label: "MÉDIA",        class: "text-amber-400" },
  low:    { label: "BAIXA",        class: "text-zinc-500" },
};

const KANBAN_COLS = [
  { key: "todo",  label: "A FAZER",       icon: Clock,        statuses: ["detected", "suggested", "pending"], accent: "border-amber-500/25" },
  { key: "doing", label: "EM EXECUÇÃO",   icon: Loader2,      statuses: ["analyzing", "in_progress"],         accent: "border-blue-500/25" },
  { key: "done",  label: "CONCLUÍDAS",    icon: CheckCircle2, statuses: ["done"],                             accent: "border-emerald-500/25" },
] as const;

const MAX_CARDS_PER_COL = 3;

/* ═══════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════ */

export default function AITeamAgentPanel({ agent, tasks, events = [], open, onOpenChange }: Props) {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [visible, setVisible] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Animate in/out
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setVisible(true), 30);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [open]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => { onOpenChange(false); setChat([]); }, 250);
  }, [onOpenChange]);

  if (!agent || (!open && !visible)) return null;

  const st = STATUS_MAP[agent.status] ?? STATUS_MAP.idle;
  const StatusIcon = st.icon;
  const agentTasks = tasks.filter(t => t.sourceAgentId === agent.id);
  const agentEvents = events.filter(e => e.agentId === agent.id).slice(0, 8);
  const responses = simulatedResponses[agent.id] ?? ["Processando.", "Analisando."];

  const handleSend = () => {
    if (!input.trim()) return;
    const reply = responses[Math.floor(Math.random() * responses.length)];
    setChat(prev => [...prev, { role: "user", text: input.trim() }, { role: "agent", text: reply }]);
    setInput("");
  };

  return (
    <div className={cn(
      "fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-250",
      visible ? "opacity-100" : "opacity-0 pointer-events-none"
    )}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose} />

      {/* Panel */}
      <div
        className={cn(
          "relative z-10 w-full mx-4 max-h-[90vh] overflow-hidden rounded-2xl transition-transform duration-300",
          visible ? "scale-100" : "scale-95"
        )}
        style={{
          maxWidth: "900px",
          background: "hsl(220 20% 7%)",
          border: "1px solid hsl(220 10% 16%)",
          boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="overflow-y-auto max-h-[90vh]">

          {/* ═══ [1] HEADER TÁTICO ═══ */}
          <div className="px-6 pt-5 pb-4 border-b border-white/[0.06]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: "hsl(220 15% 11%)", border: "1px solid hsl(220 10% 18%)" }}>
                  {agent.emoji}
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-lg font-bold tracking-wide text-white/90 uppercase">
                      {agent.name}
                    </h2>
                    {/* Status badge with icon */}
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-[0.12em] border",
                      st.class, st.border
                    )}>
                      <StatusIcon className="w-3 h-3" />
                      {st.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono tracking-[0.1em] text-white/30 uppercase">
                    <span>Agente: {agent.sector}</span>
                    <span className="text-white/10">·</span>
                    <span>{LEVEL_LABELS[agent.level] ?? agent.level}</span>
                    <span className="text-white/10">·</span>
                    <span>{agent.skills.length} capacidades</span>
                  </div>
                </div>
              </div>
              <button onClick={handleClose}
                className="p-2 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/5 transition-colors shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ═══ [2]+[3] TWO-COLUMN BODY ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px]">

            {/* ── LEFT COLUMN (Principal) ── */}
            <div className="p-6 space-y-6 border-r border-white/[0.04]">

              {/* STATUS OPERACIONAL */}
              <section>
                <SectionHead label="STATUS OPERACIONAL" />
                <div className="rounded-lg p-4" style={{ background: "hsl(220 15% 9%)", border: "1px solid hsl(220 10% 14%)" }}>
                  <p className="text-sm text-white/60 leading-relaxed">
                    {agent.currentThought || "Aguardando novas demandas."}
                  </p>
                  {agent.lastAction && (
                    <p className="text-[11px] text-white/25 mt-2 font-mono">
                      Última ação: {agent.lastAction}
                    </p>
                  )}
                </div>
              </section>

              {/* MISSÕES (Kanban) */}
              <section>
                <SectionHead label={`MISSÕES · ${agentTasks.length}`} />
                <MissionBoard tasks={agentTasks} />
              </section>

              {/* LOG DE ATIVIDADE */}
              <section>
                <SectionHead label="LOG DE ATIVIDADE" />
                <ActivityLog events={agentEvents} />
              </section>

              {/* COMANDO */}
              <section>
                <SectionHead label="COMANDO" />
                {chat.length > 0 && (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto mb-3 scrollbar-thin">
                    {chat.map((m, i) => (
                      <div key={i} className={cn(
                        "text-xs font-mono px-3 py-1.5 rounded-md max-w-[85%]",
                        m.role === "user"
                          ? "ml-auto text-white/50 bg-white/[0.04] border border-white/[0.06]"
                          : "text-blue-300/60 bg-blue-400/[0.04] border border-blue-400/[0.08]"
                      )}>
                        {m.role === "agent" && <span className="text-[9px] text-white/20 block mb-0.5">{agent.name.toUpperCase()} &gt;</span>}
                        {m.text}
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                )}
                <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 transition-colors focus-within:border-white/[0.12]"
                  style={{ background: "hsl(220 15% 9%)", border: "1px solid hsl(220 10% 14%)" }}>
                  <span className="text-xs font-mono text-white/15">$</span>
                  <input
                    type="text"
                    placeholder={`Inserir comando para ${agent.name}...`}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSend()}
                    className="flex-1 bg-transparent text-xs text-white/50 font-mono placeholder:text-white/10 outline-none"
                  />
                  <button onClick={handleSend} disabled={!input.trim()}
                    className="p-1 rounded text-white/20 hover:text-white/50 transition-colors disabled:opacity-20">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </section>
            </div>

            {/* ── RIGHT COLUMN (Suporte) ── */}
            <div className="p-6 space-y-6">

              {/* Capacidades */}
              {agent.skills.length > 0 && (
                <section>
                  <SectionHead label="CAPACIDADES" />
                  <div className="space-y-1">
                    {agent.skills.map(s => (
                      <div key={s} className="flex items-center gap-2 py-1.5 px-2.5 rounded-md text-[11px] text-white/40 font-mono hover:bg-white/[0.02] transition-colors">
                        <Zap className="w-3 h-3 text-white/15 shrink-0" />
                        {s}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Áreas de atuação */}
              {agent.scope.length > 0 && (
                <section>
                  <SectionHead label="ÁREAS DE ATUAÇÃO" />
                  <div className="space-y-1">
                    {agent.scope.map(s => (
                      <div key={s} className="flex items-center gap-2 py-1.5 px-2.5 rounded-md text-[11px] text-white/40 font-mono hover:bg-white/[0.02] transition-colors">
                        <Target className="w-3 h-3 text-white/15 shrink-0" />
                        {s}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Restrições */}
              {agent.restrictions.length > 0 && (
                <section>
                  <SectionHead label="RESTRIÇÕES" />
                  <div className="space-y-1">
                    {agent.restrictions.map(r => (
                      <div key={r} className="flex items-center gap-2 py-1.5 px-2.5 rounded-md text-[11px] text-white/30 font-mono">
                        <Shield className="w-3 h-3 text-white/10 shrink-0" />
                        {r}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Behavior prompt */}
              {agent.behaviorPrompt && (
                <section>
                  <SectionHead label="DIRETIVA" />
                  <div className="rounded-lg p-3" style={{ background: "hsl(220 15% 9%)", border: "1px solid hsl(220 10% 14%)" }}>
                    <p className="text-[11px] text-white/25 font-mono leading-relaxed">
                      {agent.behaviorPrompt}
                    </p>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════ */

/** Section heading — military label style */
function SectionHead({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span className="text-[10px] font-bold tracking-[0.15em] text-white/25 uppercase font-mono">{label}</span>
      <div className="flex-1 h-px bg-white/[0.04]" />
    </div>
  );
}

/** Mission board — compact kanban */
function MissionBoard({ tasks }: { tasks: Task[] }) {
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

  const columns = useMemo(() => KANBAN_COLS.map(col => {
    const colTasks = tasks
      .filter(t => col.statuses.includes(t.status))
      .sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));
    return { ...col, tasks: colTasks };
  }), [tasks]);

  return (
    <div className="grid grid-cols-3 gap-3">
      {columns.map(col => {
        const Icon = col.icon;
        const visibleTasks = col.tasks.slice(0, MAX_CARDS_PER_COL);
        const overflow = col.tasks.length - MAX_CARDS_PER_COL;
        const isDoneCol = col.key === "done";

        return (
          <div key={col.key} className="min-h-[80px]">
            {/* Column header */}
            <div className={cn("flex items-center gap-1.5 pb-2 mb-2 border-b", col.accent)}>
              <Icon className="w-3 h-3 text-white/20" />
              <span className="text-[9px] font-mono font-bold tracking-[0.15em] text-white/30">{col.label}</span>
              <span className="text-[9px] font-mono text-white/15 ml-auto">{col.tasks.length}</span>
            </div>

            {/* Cards */}
            <div className="space-y-1.5">
              {visibleTasks.map(t => {
                const pri = PRIORITY_MAP[t.priority] ?? PRIORITY_MAP.low;
                return (
                  <div key={t.id} className={cn(
                    "rounded-md p-2 transition-colors",
                    isDoneCol ? "opacity-50" : "hover:bg-white/[0.03]"
                  )} style={{ background: "hsl(220 15% 9%)", border: "1px solid hsl(220 10% 14%)" }}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={cn("text-[8px] font-mono font-bold tracking-wider", pri.class)}>{pri.label}</span>
                    </div>
                    <p className={cn(
                      "text-[11px] leading-snug",
                      isDoneCol ? "text-white/25 line-through" : "text-white/55"
                    )}>{t.title}</p>
                  </div>
                );
              })}
              {overflow > 0 && (
                <div className="text-[10px] font-mono text-white/15 text-center py-1">
                  +{overflow} mais
                </div>
              )}
              {col.tasks.length === 0 && (
                <p className="text-[10px] font-mono text-white/10 text-center py-3">—</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Activity log — monospaced, most recent highlighted */
function ActivityLog({ events }: { events: AgentEvent[] }) {
  if (events.length === 0) {
    return <p className="text-[11px] font-mono text-white/15 py-2">Nenhuma atividade recente.</p>;
  }

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: "hsl(220 15% 9%)", border: "1px solid hsl(220 10% 14%)" }}>
      <div className="divide-y divide-white/[0.03]">
        {events.map((evt, i) => {
          const time = new Date(evt.timestamp);
          const hh = String(time.getHours()).padStart(2, "0");
          const mm = String(time.getMinutes()).padStart(2, "0");
          const isFirst = i === 0;
          const severityClass =
            evt.severity === "high" ? "text-red-400/60" :
            evt.severity === "medium" ? "text-amber-400/50" : "text-white/25";

          return (
            <div key={evt.id} className={cn(
              "flex items-start gap-2 px-3 py-2 font-mono text-[11px] transition-colors",
              isFirst ? "bg-white/[0.03]" : ""
            )}>
              <span className="text-white/15 shrink-0">[{hh}:{mm}]</span>
              <span className={cn(
                "leading-relaxed",
                isFirst ? "text-white/55" : "text-white/30"
              )}>
                {evt.message}
              </span>
              {evt.severity !== "low" && (
                <span className={cn("shrink-0 text-[9px] font-bold tracking-wider ml-auto", severityClass)}>
                  {evt.severity === "high" ? "●" : "○"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
