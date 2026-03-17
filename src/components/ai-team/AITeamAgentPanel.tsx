import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { X, Send, Zap, Shield, Target, Brain, Radio, Crosshair, Activity, Wifi, CheckCircle2, Clock, Loader2, History } from "lucide-react";
import type { Agent, Task } from "./mockData";
import type { AgentEvent } from "./agentEngine";
import { simulatedResponses } from "./mockData";
import { cn } from "@/lib/utils";

interface Props {
  agent: Agent | null;
  tasks: Task[];
  events?: AgentEvent[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChatMsg {
  role: "user" | "agent";
  text: string;
}

const levelLabels: Record<string, string> = {
  basic: "LVL-1 BÁSICO",
  intermediate: "LVL-2 INTERMEDIÁRIO",
  advanced: "LVL-3 AVANÇADO",
};

const statusConfig: Record<string, { color: string; rgb: string; label: string }> = {
  idle: { color: "rgba(120,120,140,0.8)", rgb: "120,120,140", label: "AGUARDANDO" },
  analyzing: { color: "rgba(60,180,255,0.8)", rgb: "60,180,255", label: "ANALISANDO" },
  suggesting: { color: "rgba(16,185,129,0.8)", rgb: "16,185,129", label: "SUGERINDO" },
  waiting: { color: "rgba(245,158,11,0.8)", rgb: "245,158,11", label: "AGUARDANDO DECISÃO" },
  alert: { color: "rgba(239,68,68,0.8)", rgb: "239,68,68", label: "ALERTA" },
};

const priorityConfig: Record<string, { label: string; dot: string; glow: string }> = {
  high: { label: "CRÍTICA", dot: "bg-red-500", glow: "shadow-[0_0_8px_rgba(239,68,68,0.4)]" },
  medium: { label: "ATIVA", dot: "bg-amber-400", glow: "shadow-[0_0_8px_rgba(251,191,36,0.3)]" },
  low: { label: "RECOMENDADA", dot: "bg-emerald-400", glow: "shadow-[0_0_8px_rgba(52,211,153,0.3)]" },
};

/* ── Multi-line "neural processing" typing ── */
function useNeuralTyping(agent: Agent | null, open: boolean) {
  const [lines, setLines] = useState<string[]>([]);
  const [cursorLine, setCursorLine] = useState(0);
  const [cursorChar, setCursorChar] = useState(0);

  useEffect(() => {
    if (!agent || !open) { setLines([]); setCursorLine(0); setCursorChar(0); return; }

    const rawLines = [
      `Inicializando módulo ${agent.sector.toLowerCase()}...`,
      agent.currentThought,
      `Confiança: █████████░ 92%`,
    ];
    setLines([]);
    setCursorLine(0);
    setCursorChar(0);

    let lineIdx = 0;
    let charIdx = 0;
    let buffer = ["", "", ""];

    const interval = setInterval(() => {
      if (lineIdx >= rawLines.length) { clearInterval(interval); return; }
      charIdx++;
      buffer[lineIdx] = rawLines[lineIdx].slice(0, charIdx);
      setLines([...buffer]);
      setCursorLine(lineIdx);
      setCursorChar(charIdx);
      if (charIdx >= rawLines[lineIdx].length) {
        lineIdx++;
        charIdx = 0;
      }
    }, 14);

    return () => clearInterval(interval);
  }, [agent?.id, open]);

  return { lines, cursorLine, cursorChar, totalLines: 3 };
}

export default function AITeamAgentPanel({ agent, tasks, events = [], open, onOpenChange }: Props) {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [phase, setPhase] = useState<"closed" | "connecting" | "open">("closed");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const neural = useNeuralTyping(agent, phase === "open");

  // Boot sequence: closed → connecting → open
  useEffect(() => {
    if (open && phase === "closed") {
      setPhase("connecting");
      const t = setTimeout(() => setPhase("open"), 450);
      return () => clearTimeout(t);
    }
    if (!open && phase !== "closed") {
      setPhase("closed");
    }
  }, [open]);

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const handleClose = useCallback(() => {
    setPhase("closed");
    setTimeout(() => { onOpenChange(false); setChat([]); }, 300);
  }, [onOpenChange]);

  if (!agent) return null;
  if (!open && phase === "closed") return null;

  const agentTasks = tasks.filter((t) => t.sourceAgentId === agent.id);
  const agentEvents = events.filter((e) => e.agentId === agent.id).slice(0, 5);
  const responses = simulatedResponses[agent.id] ?? ["Processando.", "Analisando."];
  const sc = statusConfig[agent.status] ?? statusConfig.idle;

  const handleSend = () => {
    if (!input.trim()) return;
    const reply = responses[Math.floor(Math.random() * responses.length)];
    setChat((prev) => [...prev, { role: "user", text: input.trim() }, { role: "agent", text: reply }]);
    setInput("");
  };

  const isVisible = phase === "open";
  const isConnecting = phase === "connecting";

  return (
    <div className={cn(
      "fixed inset-0 z-[100] flex items-center justify-center",
      "transition-all duration-500",
      phase === "closed" ? "opacity-0 pointer-events-none" : "opacity-100"
    )}>
      {/* ══ BACKDROP ══ */}
      <div className="absolute inset-0" onClick={handleClose}>
        {/* Dark overlay */}
        <div className={cn(
          "absolute inset-0 transition-all duration-500",
          isVisible ? "bg-black/85 backdrop-blur-2xl" : "bg-black/60 backdrop-blur-md"
        )} />

        {/* Animated grid */}
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: `linear-gradient(rgba(${sc.rgb},0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(${sc.rgb},0.4) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }} />

        {/* Horizontal scan line */}
        <div className="absolute left-0 right-0 h-[2px] neural-scan-line" style={{
          background: `linear-gradient(90deg, transparent 10%, rgba(${sc.rgb},0.6) 50%, transparent 90%)`,
        }} />

        {/* Corner markers */}
        {isVisible && (
          <>
            <div className="absolute top-6 left-6 w-8 h-8 border-l-2 border-t-2 opacity-20" style={{ borderColor: sc.color }} />
            <div className="absolute top-6 right-6 w-8 h-8 border-r-2 border-t-2 opacity-20" style={{ borderColor: sc.color }} />
            <div className="absolute bottom-6 left-6 w-8 h-8 border-l-2 border-b-2 opacity-20" style={{ borderColor: sc.color }} />
            <div className="absolute bottom-6 right-6 w-8 h-8 border-r-2 border-b-2 opacity-20" style={{ borderColor: sc.color }} />
          </>
        )}
      </div>

      {/* ══ CONNECTING STATE ══ */}
      {isConnecting && (
        <div className="relative z-10 flex flex-col items-center gap-4 animate-pulse">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
            style={{
              background: `radial-gradient(circle, rgba(${sc.rgb},0.2), transparent)`,
              boxShadow: `0 0 60px rgba(${sc.rgb},0.3)`,
            }}
          >
            {agent.emoji}
          </div>
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 animate-pulse" style={{ color: sc.color }} />
            <span className="text-xs font-mono tracking-[0.3em] uppercase" style={{ color: sc.color }}>
              Estabelecendo conexão neural...
            </span>
          </div>
        </div>
      )}

      {/* ══ MAIN PANEL ══ */}
      <div
        className={cn(
          "relative z-10 w-full max-h-[88vh] mx-4 overflow-hidden transition-all duration-500",
          isVisible ? "scale-100 opacity-100" : "scale-90 opacity-0 pointer-events-none"
        )}
        style={{
          maxWidth: "820px",
          background: "linear-gradient(165deg, rgba(8,10,16,0.96) 0%, rgba(4,6,10,0.98) 50%, rgba(6,10,14,0.97) 100%)",
          border: `1px solid rgba(${sc.rgb},0.12)`,
          borderRadius: "20px",
          boxShadow: `0 0 100px rgba(${sc.rgb},0.06), 0 40px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[20px] overflow-hidden">
          <div className="h-full neural-glow-bar" style={{
            background: `linear-gradient(90deg, transparent 0%, rgba(${sc.rgb},0.5) 30%, rgba(${sc.rgb},0.8) 50%, rgba(${sc.rgb},0.5) 70%, transparent 100%)`,
          }} />
        </div>

        {/* Inner glow overlay */}
        <div className="absolute inset-0 pointer-events-none rounded-[20px]" style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 0%, rgba(${sc.rgb},0.04), transparent)`,
        }} />

        <div className="overflow-y-auto max-h-[88vh] custom-scrollbar relative">

          {/* ═══ HEADER ═══ */}
          <div className="relative px-8 pt-7 pb-5">
            {/* Close */}
            <button onClick={handleClose}
              className="absolute top-5 right-5 p-2.5 rounded-xl text-white/25 hover:text-white/60 hover:bg-white/5 transition-all z-10 group">
              <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            </button>

            {/* Agent identity */}
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className="relative">
                <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-[32px] neural-avatar-breathe"
                  style={{
                    background: `linear-gradient(135deg, rgba(${sc.rgb},0.12) 0%, rgba(${sc.rgb},0.04) 100%)`,
                    border: `1px solid rgba(${sc.rgb},0.2)`,
                    boxShadow: `0 0 40px rgba(${sc.rgb},0.12), inset 0 0 20px rgba(${sc.rgb},0.05)`,
                  }}>
                  {agent.emoji}
                </div>
                {/* Status ring */}
                <div className="absolute -bottom-1.5 -right-1.5 flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full animate-pulse" style={{
                    background: sc.color,
                    boxShadow: `0 0 12px rgba(${sc.rgb},0.6)`,
                    border: "2px solid rgba(8,10,16,0.9)",
                  }} />
                </div>
                {/* Outer ring animation */}
                <div className="absolute -inset-1 rounded-2xl neural-ring-pulse" style={{
                  border: `1px solid rgba(${sc.rgb},0.15)`,
                }} />
              </div>

              <div className="flex-1 min-w-0">
                {/* Name + status */}
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-bold text-white tracking-[0.08em]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {agent.name.toUpperCase()}
                  </h2>
                  <span className="text-[9px] font-mono font-bold tracking-[0.25em] px-2.5 py-1 rounded-md flex items-center gap-1.5"
                    style={{
                      color: sc.color,
                      background: `rgba(${sc.rgb},0.08)`,
                      border: `1px solid rgba(${sc.rgb},0.2)`,
                      boxShadow: `0 0 12px rgba(${sc.rgb},0.08)`,
                    }}>
                    <Activity className="w-3 h-3" />
                    {sc.label}
                  </span>
                </div>

                {/* Sub info */}
                <p className="text-[11px] text-white/30 font-mono tracking-[0.15em] mt-1.5">
                  AGENTE: {agent.sector.toUpperCase()} · {levelLabels[agent.level]}
                </p>
                <p className="text-sm text-white/45 mt-2 leading-relaxed max-w-md">{agent.role}</p>
              </div>
            </div>

            {/* Separator */}
            <div className="mt-5 h-px neural-divider" style={{
              background: `linear-gradient(90deg, transparent, rgba(${sc.rgb},0.2) 20%, rgba(${sc.rgb},0.3) 50%, rgba(${sc.rgb},0.2) 80%, transparent)`,
            }} />
          </div>

          {/* ═══ TWO-COLUMN LAYOUT ═══ */}
          <div className="px-8 pb-6 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">

            {/* LEFT COLUMN */}
            <div className="space-y-5">

              {/* ── NEURAL PROCESSING ── */}
              <div>
                <SectionLabel icon={Radio} label="NEURAL PROCESSING" color={sc.rgb} pulse />
                <div className="rounded-xl p-4 relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, rgba(${sc.rgb},0.05), rgba(${sc.rgb},0.015))`,
                    border: `1px solid rgba(${sc.rgb},0.1)`,
                    boxShadow: `inset 0 0 40px rgba(${sc.rgb},0.02)`,
                  }}>
                  {/* Scan overlay */}
                  <div className="absolute inset-0 neural-block-scan pointer-events-none" style={{
                    background: `linear-gradient(180deg, transparent 45%, rgba(${sc.rgb},0.04) 50%, transparent 55%)`,
                  }} />

                  <div className="space-y-1 font-mono text-[13px] leading-relaxed relative z-10">
                    {neural.lines.map((line, i) => (
                      <p key={i} className={cn(
                        "transition-colors duration-300",
                        i === 0 ? "text-white/30" : i === 2 ? "text-white/25" : "text-white/65"
                      )}>
                        <span className="text-white/15 mr-2">{String(i + 1).padStart(2, "0")}</span>
                        {line}
                        {i === neural.cursorLine && (
                          <span className="inline-block w-[2px] h-[14px] ml-0.5 animate-blink align-middle" style={{ background: sc.color }} />
                        )}
                      </p>
                    ))}
                    {neural.lines.length === 0 && (
                      <p className="text-white/20">
                        <span className="text-white/15 mr-2">01</span>
                        Aguardando inicialização...
                        <span className="inline-block w-[2px] h-[14px] ml-0.5 animate-blink align-middle" style={{ background: sc.color }} />
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ── CORE DIRECTIVE ── */}
              {agent.behaviorPrompt && (
                <div>
                  <SectionLabel icon={Brain} label="CORE DIRECTIVE" color={sc.rgb} />
                  <div className="rounded-xl p-4" style={{
                    background: "rgba(255,255,255,0.015)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}>
                    {agent.behaviorPrompt.split('. ').filter(Boolean).map((line, i) => (
                      <p key={i} className="text-xs font-mono text-white/35 leading-relaxed tracking-wide">
                        <span className="text-white/15 mr-2">&gt;</span>{line.trim()}{!line.endsWith('.') && '.'}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* ── MISSION KANBAN ── */}
              <MissionKanban tasks={agentTasks} statusColor={sc} />

              {/* ── CONSOLE ── */}
              <div>
                <SectionLabel icon={Send} label="COMMAND INTERFACE" color={sc.rgb} />

                {chat.length > 0 && (
                  <div className="space-y-2 max-h-36 overflow-y-auto mb-3 custom-scrollbar">
                    {chat.map((m, i) => (
                      <div key={i} className={cn(
                        "text-[12px] rounded-lg px-3 py-2 max-w-[85%] font-mono",
                        m.role === "user" ? "ml-auto text-white/70" : ""
                      )} style={{
                        background: m.role === "user" ? "rgba(255,255,255,0.05)" : `rgba(${sc.rgb},0.06)`,
                        border: `1px solid ${m.role === "user" ? "rgba(255,255,255,0.06)" : `rgba(${sc.rgb},0.1)`}`,
                        color: m.role === "agent" ? sc.color : undefined,
                        opacity: m.role === "agent" ? 0.7 : undefined,
                      }}>
                        {m.role === "agent" && (
                          <span className="text-[9px] block mb-0.5 opacity-40">{agent.name.toUpperCase()} &gt;</span>
                        )}
                        {m.text}
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                )}

                <div className="flex items-center gap-2 rounded-xl px-4 py-3 transition-all duration-300 focus-within:border-opacity-30"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: `1px solid rgba(${sc.rgb},0.08)`,
                  }}>
                  <span className="text-xs font-mono opacity-30" style={{ color: sc.color }}>&gt;</span>
                  <input type="text"
                    placeholder={`Comando para ${agent.name}...`}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    className="flex-1 bg-transparent text-[13px] text-white/60 font-mono placeholder:text-white/10 outline-none"
                  />
                  <button onClick={handleSend} disabled={!input.trim()}
                    className="p-1.5 rounded-lg transition-all disabled:opacity-10"
                    style={{ color: sc.color }}>
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN — Capabilities */}
            <div className="space-y-5">

              {/* Skills */}
              {agent.skills.length > 0 && (
                <div>
                  <SectionLabel icon={Zap} label="CAPACIDADES" color={sc.rgb} />
                  <div className="space-y-1.5">
                    {agent.skills.map((s) => (
                      <div key={s}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 group cursor-default hover:translate-x-0.5"
                        style={{
                          background: `rgba(${sc.rgb},0.04)`,
                          border: `1px solid rgba(${sc.rgb},0.08)`,
                        }}>
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: `rgba(${sc.rgb},0.5)` }} />
                        <span className="text-[12px] font-mono tracking-wide" style={{ color: `rgba(${sc.rgb},0.6)` }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scope */}
              {agent.scope.length > 0 && (
                <div>
                  <SectionLabel icon={Target} label="ZONAS DE OPERAÇÃO" color={sc.rgb} />
                  <div className="space-y-1.5">
                    {agent.scope.map((s) => (
                      <div key={s}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 cursor-default hover:translate-x-0.5"
                        style={{
                          background: "rgba(56,189,248,0.03)",
                          border: "1px solid rgba(56,189,248,0.08)",
                        }}>
                        <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-sky-400/50" />
                        <span className="text-[12px] font-mono text-sky-300/50 tracking-wide">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Restrictions */}
              {agent.restrictions.length > 0 && (
                <div>
                  <SectionLabel icon={Shield} label="RESTRIÇÕES" color={sc.rgb} />
                  <div className="space-y-1.5">
                    {agent.restrictions.map((r) => (
                      <div key={r}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-default"
                        style={{
                          background: "rgba(255,255,255,0.015)",
                          border: "1px solid rgba(255,255,255,0.04)",
                        }}>
                        <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-white/15" />
                        <span className="text-[11px] font-mono text-white/25 tracking-wide">{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Kanban columns config ── */
type KanbanColumn = { key: string; label: string; icon: React.ElementType; statuses: string[]; dotColor: string; glowColor: string };

const kanbanColumns: KanbanColumn[] = [
  { key: "todo", label: "A FAZER", icon: Clock, statuses: ["detected", "suggested", "pending"], dotColor: "bg-amber-400", glowColor: "251,191,36" },
  { key: "doing", label: "EM PROGRESSO", icon: Loader2, statuses: ["analyzing", "in_progress"], dotColor: "bg-sky-400", glowColor: "56,189,248" },
  { key: "done", label: "CONCLUÍDAS", icon: CheckCircle2, statuses: ["done"], dotColor: "bg-emerald-400", glowColor: "52,211,153" },
];

const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

function MissionKanban({ tasks, statusColor }: { tasks: Task[]; statusColor: { color: string; rgb: string; label: string } }) {
  const columns = useMemo(() => kanbanColumns.map((col) => ({
    ...col,
    tasks: tasks
      .filter((t) => col.statuses.includes(t.status))
      .sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9)),
  })), [tasks]);

  const total = tasks.length;

  return (
    <div>
      <SectionLabel icon={Crosshair} label={`MISSÕES · ${total}`} color={statusColor.rgb} />
      <div className="grid grid-cols-3 gap-3">
        {columns.map((col) => (
          <div key={col.key} className="min-h-[120px]">
            {/* Column header */}
            <div className="flex items-center gap-2 mb-2.5 pb-2" style={{
              borderBottom: `1px solid rgba(${col.glowColor},0.12)`,
            }}>
              <col.icon className="w-3.5 h-3.5" style={{ color: `rgba(${col.glowColor},0.6)` }} />
              <span className="text-[9px] font-mono font-bold tracking-[0.2em]" style={{ color: `rgba(${col.glowColor},0.5)` }}>
                {col.label}
              </span>
              <span className="text-[9px] font-mono ml-auto" style={{ color: `rgba(${col.glowColor},0.3)` }}>
                {col.tasks.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2">
              {col.tasks.map((t) => {
                const pri = priorityConfig[t.priority] ?? priorityConfig.low;
                const isDone = col.key === "done";
                return (
                  <div key={t.id}
                    className={cn(
                      "rounded-lg p-2.5 transition-all duration-200 group cursor-default",
                      isDone ? "opacity-60" : "hover:translate-y-[-1px]"
                    )}
                    style={{
                      background: `rgba(${col.glowColor},0.03)`,
                      border: `1px solid rgba(${col.glowColor},0.07)`,
                    }}>
                    {/* Priority + label */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", pri.dot)} />
                      <span className={cn("text-[8px] font-mono font-bold tracking-[0.15em]", pri.glow ? "text-white/30" : "text-white/20")}>
                        {pri.label}
                      </span>
                    </div>
                    <p className={cn(
                      "text-[11px] font-medium leading-snug transition-colors",
                      isDone ? "text-white/35 line-through" : "text-white/60 group-hover:text-white/80"
                    )}>
                      {t.title}
                    </p>
                    <p className="text-[10px] text-white/20 mt-1 leading-relaxed line-clamp-2">{t.description}</p>
                  </div>
                );
              })}
              {col.tasks.length === 0 && (
                <p className="text-[10px] font-mono text-white/10 text-center py-4">—</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Reusable section label ── */
function SectionLabel({ icon: Icon, label, color, pulse }: { icon: React.ElementType; label: string; color: string; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <Icon className={cn("w-3.5 h-3.5", pulse && "animate-pulse")} style={{ color: `rgba(${color},0.5)` }} />
      <span className="text-[10px] font-mono font-bold tracking-[0.2em]" style={{ color: `rgba(${color},0.4)` }}>
        {label}
      </span>
    </div>
  );
}
