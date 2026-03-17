import { useState, useEffect, useRef } from "react";
import { X, Send, Zap, Shield, Target, Brain, Radio, ChevronRight } from "lucide-react";
import type { Agent, Task } from "./mockData";
import { simulatedResponses } from "./mockData";
import { cn } from "@/lib/utils";

interface Props {
  agent: Agent | null;
  tasks: Task[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChatMsg {
  role: "user" | "agent";
  text: string;
}

const levelLabels: Record<string, string> = {
  basic: "BÁSICO",
  intermediate: "INTERMEDIÁRIO",
  advanced: "AVANÇADO",
};

const statusColors: Record<string, string> = {
  idle: "rgba(120,120,140,0.7)",
  analyzing: "rgba(60,180,255,0.7)",
  suggesting: "rgba(16,185,129,0.7)",
};

const statusLabels: Record<string, string> = {
  idle: "STANDBY",
  analyzing: "ANALISANDO",
  suggesting: "SUGERINDO",
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  high: { label: "ALTA", color: "text-red-400" },
  medium: { label: "MÉDIA", color: "text-yellow-400" },
  low: { label: "BAIXA", color: "text-emerald-400" },
};

export default function AITeamAgentPanel({ agent, tasks, open, onOpenChange }: Props) {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [typingText, setTypingText] = useState("");
  const [visible, setVisible] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Typing animation for current thought
  useEffect(() => {
    if (!agent || !open) return;
    setTypingText("");
    const text = agent.currentThought;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTypingText(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 18);
    return () => clearInterval(interval);
  }, [agent?.id, open]);

  // Enter/exit animation
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  if (!agent) return null;
  if (!open && !visible) return null;

  const agentTasks = tasks.filter((t) => t.sourceAgentId === agent.id);
  const responses = simulatedResponses[agent.id] ?? [
    "Processando informação.",
    "Analisando com base no meu escopo.",
  ];
  const statusColor = statusColors[agent.status] ?? statusColors.idle;

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: ChatMsg = { role: "user", text: input.trim() };
    const reply = responses[Math.floor(Math.random() * responses.length)];
    setChat((prev) => [...prev, userMsg, { role: "agent", text: reply }]);
    setInput("");
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      onOpenChange(false);
      setChat([]);
    }, 300);
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center transition-all duration-300",
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        onClick={handleClose}
      >
        {/* Animated grid lines */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(16,185,129,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }} />
        {/* Scan line */}
        <div className="absolute left-0 right-0 h-px animate-scan-line" style={{
          background: `linear-gradient(90deg, transparent, ${statusColor}, transparent)`,
        }} />
      </div>

      {/* Panel */}
      <div
        className={cn(
          "relative w-full max-w-2xl max-h-[85vh] mx-4 rounded-2xl overflow-hidden transition-all duration-300",
          visible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        )}
        style={{
          background: "linear-gradient(160deg, rgba(10,12,18,0.97) 0%, rgba(6,8,14,0.99) 100%)",
          border: `1px solid rgba(16,185,129,0.15)`,
          boxShadow: `0 0 80px rgba(16,185,129,0.08), inset 0 1px 0 rgba(255,255,255,0.03)`,
        }}
      >
        {/* Top glow line */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{
          background: `linear-gradient(90deg, transparent, ${statusColor}, transparent)`,
        }} />

        <div className="overflow-y-auto max-h-[85vh] custom-scrollbar">
          {/* ── HEADER ── */}
          <div className="relative px-6 pt-6 pb-4">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
              {/* Avatar with glow */}
              <div className="relative shrink-0">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl animate-pulse-slow"
                  style={{
                    background: `linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))`,
                    boxShadow: `0 0 30px ${statusColor}, inset 0 0 20px rgba(16,185,129,0.1)`,
                    border: `1px solid rgba(16,185,129,0.25)`,
                  }}
                >
                  {agent.emoji}
                </div>
                {/* Status dot */}
                <div
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0a0c12] animate-pulse"
                  style={{ background: statusColor }}
                />
              </div>

              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-lg font-bold text-white tracking-wide">
                    {agent.name.toUpperCase()}
                  </h2>
                  <span
                    className="text-[10px] font-mono font-bold tracking-[0.2em] px-2 py-0.5 rounded"
                    style={{
                      color: statusColor,
                      background: `${statusColor}15`,
                      border: `1px solid ${statusColor}30`,
                    }}
                  >
                    {statusLabels[agent.status] ?? "STANDBY"}
                  </span>
                </div>
                <p className="text-xs text-white/40 font-mono tracking-wider mt-1">
                  {agent.sector.toUpperCase()} · {levelLabels[agent.level] ?? agent.level}
                </p>
                <p className="text-sm text-white/50 mt-1.5 leading-relaxed">{agent.role}</p>
              </div>
            </div>

            {/* Separator scan line */}
            <div className="mt-4 h-px w-full" style={{
              background: `linear-gradient(90deg, transparent, rgba(16,185,129,0.2), transparent)`,
            }} />
          </div>

          {/* ── CURRENT THOUGHT ── */}
          <div className="px-6 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-emerald-400/70 tracking-[0.2em]">
                PROCESSAMENTO ATUAL
              </span>
            </div>
            <div
              className="rounded-xl p-4"
              style={{
                background: "linear-gradient(135deg, rgba(16,185,129,0.06), rgba(16,185,129,0.02))",
                border: "1px solid rgba(16,185,129,0.1)",
                boxShadow: "inset 0 0 30px rgba(16,185,129,0.03)",
              }}
            >
              <p className="text-sm text-white/70 leading-relaxed font-light">
                {typingText}
                <span className="inline-block w-0.5 h-4 bg-emerald-400/60 ml-0.5 animate-blink align-middle" />
              </p>
            </div>
          </div>

          {/* ── SKILLS ── */}
          {agent.skills.length > 0 && (
            <div className="px-6 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-3.5 h-3.5 text-white/30" />
                <span className="text-[10px] font-mono font-bold text-white/30 tracking-[0.2em]">HABILIDADES</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {agent.skills.map((s) => (
                  <span
                    key={s}
                    className="text-xs font-mono text-emerald-300/70 px-2.5 py-1 rounded-lg transition-all hover:text-emerald-300 hover:shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                    style={{
                      background: "rgba(16,185,129,0.06)",
                      border: "1px solid rgba(16,185,129,0.12)",
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── SCOPE ── */}
          {agent.scope.length > 0 && (
            <div className="px-6 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-3.5 h-3.5 text-white/30" />
                <span className="text-[10px] font-mono font-bold text-white/30 tracking-[0.2em]">ESCOPO DE ATUAÇÃO</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {agent.scope.map((s) => (
                  <span
                    key={s}
                    className="text-xs font-mono text-sky-300/70 px-2.5 py-1 rounded-lg transition-all hover:text-sky-300"
                    style={{
                      background: "rgba(56,189,248,0.06)",
                      border: "1px solid rgba(56,189,248,0.12)",
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── RESTRICTIONS ── */}
          {agent.restrictions.length > 0 && (
            <div className="px-6 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-3.5 h-3.5 text-white/30" />
                <span className="text-[10px] font-mono font-bold text-white/30 tracking-[0.2em]">RESTRIÇÕES</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {agent.restrictions.map((r) => (
                  <span
                    key={r}
                    className="text-xs font-mono text-white/35 px-2.5 py-1 rounded-lg"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── BEHAVIOR PROTOCOL ── */}
          {agent.behaviorPrompt && (
            <div className="px-6 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-3.5 h-3.5 text-white/30" />
                <span className="text-[10px] font-mono font-bold text-white/30 tracking-[0.2em]">PROTOCOLO</span>
              </div>
              <div
                className="rounded-xl p-4"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <p className="text-xs font-mono text-white/40 leading-relaxed tracking-wide">
                  &gt; {agent.behaviorPrompt}
                </p>
              </div>
            </div>
          )}

          {/* ── MISSIONS (TASKS) ── */}
          <div className="px-6 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <ChevronRight className="w-3.5 h-3.5 text-white/30" />
              <span className="text-[10px] font-mono font-bold text-white/30 tracking-[0.2em]">
                MISSÕES ATIVAS ({agentTasks.length})
              </span>
            </div>
            {agentTasks.length === 0 ? (
              <p className="text-xs font-mono text-white/20">Nenhuma missão atribuída.</p>
            ) : (
              <div className="space-y-2">
                {agentTasks.map((t) => {
                  const pri = priorityConfig[t.priority] ?? priorityConfig.low;
                  return (
                    <div
                      key={t.id}
                      className="rounded-xl p-3 transition-all hover:translate-x-1 group cursor-default"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-white/70 font-medium group-hover:text-white/90 transition-colors">
                          {t.title}
                        </p>
                        <span className={cn("text-[9px] font-mono font-bold tracking-wider shrink-0", pri.color)}>
                          {pri.label}
                        </span>
                      </div>
                      <p className="text-xs text-white/30 mt-1 leading-relaxed">{t.description}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="mx-6 h-px" style={{
            background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.15), transparent)",
          }} />

          {/* ── CHAT / CONSOLE ── */}
          <div className="px-6 py-4">
            {chat.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto mb-3 custom-scrollbar">
                {chat.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      "text-xs rounded-lg px-3 py-2 max-w-[85%] font-mono",
                      m.role === "user"
                        ? "ml-auto text-white/80"
                        : "text-emerald-300/70"
                    )}
                    style={{
                      background: m.role === "user"
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(16,185,129,0.08)",
                      border: `1px solid ${m.role === "user" ? "rgba(255,255,255,0.08)" : "rgba(16,185,129,0.12)"}`,
                    }}
                  >
                    {m.role === "agent" && (
                      <span className="text-[9px] text-emerald-400/40 block mb-0.5">{agent.name.toUpperCase()} &gt;</span>
                    )}
                    {m.text}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}

            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2 transition-all focus-within:shadow-[0_0_20px_rgba(16,185,129,0.1)]"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span className="text-emerald-400/40 text-xs font-mono">&gt;</span>
              <input
                type="text"
                placeholder={`Comando para ${agent.name}...`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="flex-1 bg-transparent text-sm text-white/70 font-mono placeholder:text-white/15 outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="p-1.5 rounded-lg text-emerald-400/50 hover:text-emerald-400 hover:bg-emerald-400/10 transition-all disabled:opacity-20 disabled:hover:bg-transparent"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
