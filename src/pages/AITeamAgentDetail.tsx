import { useParams, useNavigate } from "react-router-dom";
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import {
  ArrowLeft, Send, Zap, Shield, Target, Brain, CheckCircle2, Clock,
  Loader2, Activity, AlertTriangle, Eye, Pause, ChevronDown, ChevronUp,
  Cpu, TrendingUp, TrendingDown, Pencil, Save, X, Plus,
} from "lucide-react";
import { AGENTS_V4, SQUADS, type AgentV4 } from "@/components/ai-team/agentsV4Data";
import { getAllV4Agents, getV4InitialTasks } from "@/components/ai-team/agentV4Bridge";
import { useAgentEngine } from "@/components/ai-team/useAgentEngine";
import type { AgentEvent } from "@/components/ai-team/agentEngine";
import type { AgentMemory } from "@/components/ai-team/agentMemory";
import type { Task, AgentLevel } from "@/components/ai-team/mockData";
import { defaultSkills, defaultScopes, defaultRestrictions, sectorOptions } from "@/components/ai-team/mockData";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const baseAgents = getAllV4Agents();
const baseTasks = getV4InitialTasks();

const STATUS_MAP: Record<string, { label: string; icon: React.ElementType; badge: string; border: string; text: string }> = {
  idle:       { label: "Aguardando",         icon: Pause,         badge: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",   border: "border-zinc-500/20", text: "text-zinc-400" },
  analyzing:  { label: "Analisando",         icon: Activity,      badge: "bg-blue-500/15 text-blue-400 border-blue-500/25",   border: "border-blue-500/20", text: "text-blue-400" },
  suggesting: { label: "Sugerindo",          icon: Brain,         badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", border: "border-emerald-500/20", text: "text-emerald-400" },
  waiting:    { label: "Aguardando Decisão", icon: Eye,           badge: "bg-amber-500/15 text-amber-400 border-amber-500/25", border: "border-amber-500/20", text: "text-amber-400" },
  alert:      { label: "Alerta",             icon: AlertTriangle, badge: "bg-red-500/15 text-red-400 border-red-500/25",       border: "border-red-500/20", text: "text-red-400" },
};

const LEVEL_LABELS: Record<AgentLevel, string> = { basic: "Básico", intermediate: "Intermediário", advanced: "Avançado" };

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

export default function AITeamAgentDetail() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { agents, tasks, events, updateAgent } = useAgentEngine(baseAgents, baseTasks);

  const agent = useMemo(() => agents.find(a => a.id === agentId), [agents, agentId]);
  const v4 = useMemo(() => AGENTS_V4.find(a => a.id === agentId), [agentId]);
  const squad = useMemo(() => v4 ? SQUADS.find(s => s.id === v4.squadId) : null, [v4]);
  const agentTasks = useMemo(() => tasks.filter(t => t.sourceAgentId === agentId), [tasks, agentId]);
  const agentEvents = useMemo(() => events.filter(e => e.agentId === agentId).slice(0, 15), [events, agentId]);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editSector, setEditSector] = useState("");
  const [editLevel, setEditLevel] = useState<AgentLevel>("basic");
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [editScope, setEditScope] = useState<string[]>([]);
  const [editRestrictions, setEditRestrictions] = useState<string[]>([]);
  const [editBehavior, setEditBehavior] = useState("");
  const [customSkill, setCustomSkill] = useState("");

  const startEditing = useCallback(() => {
    if (!agent) return;
    setEditName(agent.name);
    setEditRole(agent.role);
    setEditSector(agent.sector);
    setEditLevel(agent.level);
    setEditSkills([...agent.skills]);
    setEditScope([...agent.scope]);
    setEditRestrictions([...agent.restrictions]);
    setEditBehavior(agent.behaviorPrompt);
    setEditing(true);
  }, [agent]);

  const cancelEditing = useCallback(() => setEditing(false), []);

  const saveEditing = useCallback(() => {
    if (!agent || !editName.trim() || !editRole.trim()) return;
    updateAgent(agent.id, {
      name: editName.trim(),
      role: editRole.trim(),
      sector: editSector,
      level: editLevel,
      skills: editSkills,
      scope: editScope,
      restrictions: editRestrictions,
      behaviorPrompt: editBehavior.trim(),
    });
    setEditing(false);
    toast({ title: "Agente atualizado", description: `${editName.trim()} editado com sucesso.` });
  }, [agent, editName, editRole, editSector, editLevel, editSkills, editScope, editRestrictions, editBehavior, updateAgent, toast]);

  const toggleItem = (arr: string[], item: string, setter: (v: string[]) => void) => {
    setter(arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]);
  };

  const addCustomSkill = () => {
    const trimmed = customSkill.trim();
    if (trimmed && !editSkills.includes(trimmed)) {
      setEditSkills(prev => [...prev, trimmed]);
      setCustomSkill("");
    }
  };

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
  const displayName = v4?.name ?? agent.name;
  const displayEmoji = v4?.emoji ?? agent.emoji;

  return (
    <div className="min-h-screen pb-12">
      {/* ═══ HEADER ═══ */}
      <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => navigate("/ai-team")} className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" /> AI Team
            </Button>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-2xl">{displayEmoji}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-lg font-bold tracking-wide">{displayName}</h1>
                  <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border", st.badge)}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {st.label}
                  </span>
                  {squad && (
                    <Badge variant="outline" className={cn("text-[10px]", squad.color)}>
                      {squad.emoji} {squad.name}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {v4?.role ?? agent.role}
                  {v4 && <> · Lv.{v4.level} · {v4.successRate}% taxa</>}
                </p>
              </div>
            </div>
            {!editing ? (
              <Button variant="outline" size="sm" onClick={startEditing} className="gap-1.5">
                <Pencil className="w-4 h-4" /> Editar
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={cancelEditing} className="gap-1.5">
                  <X className="w-4 h-4" /> Cancelar
                </Button>
                <Button size="sm" onClick={saveEditing} disabled={!editName.trim() || !editRole.trim()} className="gap-1.5">
                  <Save className="w-4 h-4" /> Salvar
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div className="max-w-7xl mx-auto px-6 pt-6 space-y-6">
        {/* V4 Stats bar */}
        {v4 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MiniStat label="Nível" value={v4.level} />
            <MiniStat label="XP" value={`${v4.xp.toLocaleString()}/${v4.maxXp.toLocaleString()}`} />
            <MiniStat label="Taxa de Sucesso" value={`${v4.successRate}%`} />
            <MiniStat label="Tarefas Hoje" value={v4.tasksToday} />
            <MiniStat label="Missões Ativas" value={agentTasks.filter(t => t.status !== "done").length} />
          </div>
        )}

        {/* XP Progress */}
        {v4 && (
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-muted-foreground">Progresso para Lv.{v4.level + 1}</span>
              <span className="text-xs text-muted-foreground">{Math.round((v4.xp / v4.maxXp) * 100)}%</span>
            </div>
            <Progress value={(v4.xp / v4.maxXp) * 100} className="h-2" />
          </div>
        )}

        {/* Status + Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <SectionCard title="Status Operacional" icon={Activity}>
              <p className="text-base text-foreground/80 leading-relaxed">
                {agent.currentThought || v4?.persona || "Aguardando novas demandas."}
              </p>
              {agent.lastAction && (
                <p className="text-sm text-muted-foreground mt-3">
                  Última ação: <span className="text-foreground/60">{agent.lastAction}</span>
                </p>
              )}
            </SectionCard>
          </div>
          <div>
            <SectionCard title="Skills" icon={Zap}>
              <div className="flex flex-wrap gap-1.5">
                {(v4?.skills ?? agent.skills).map(s => (
                  <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>

        {/* Edit panel */}
        {editing && (
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Pencil className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Editar Agente</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nome</label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Função</label>
                <Input value={editRole} onChange={e => setEditRole(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Setor</label>
                <Select value={editSector} onValueChange={setEditSector}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sectorOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nível</label>
                <Select value={editLevel} onValueChange={v => setEditLevel(v as AgentLevel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(LEVEL_LABELS) as [AgentLevel, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Habilidades</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {defaultSkills.map(s => (
                  <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={editSkills.includes(s)} onCheckedChange={() => toggleItem(editSkills, s, setEditSkills)} />
                    {s}
                  </label>
                ))}
              </div>
              <div className="flex gap-2 max-w-sm">
                <Input placeholder="Nova habilidade..." value={customSkill} onChange={e => setCustomSkill(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCustomSkill())} className="text-sm" />
                <Button size="sm" variant="outline" onClick={addCustomSkill} disabled={!customSkill.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Diretiva Comportamental</label>
              <Textarea placeholder="Ex: Seja crítico, focado em performance." value={editBehavior}
                onChange={e => setEditBehavior(e.target.value)} rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={cancelEditing}>Cancelar</Button>
              <Button size="sm" onClick={saveEditing} disabled={!editName.trim() || !editRole.trim()} className="gap-1.5">
                <Save className="w-4 h-4" /> Salvar
              </Button>
            </div>
          </div>
        )}

        {/* Missions */}
        <SectionCard title={`Missões · ${agentTasks.length}`} icon={Target}>
          <MissionBoard tasks={agentTasks} />
        </SectionCard>

        {/* Log + Terminal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionCard title="Log de Atividade" icon={Clock}>
            <ActivityLog events={agentEvents} />
          </SectionCard>
          <SectionCard title="Terminal de Comando" icon={Send}>
            <CommandTerminal agentName={displayName} agentId={agent.id} agentRole={v4?.persona ?? agent.role} />
          </SectionCard>
        </div>

        {/* Intelligence */}
        {agent.memory && (agent.memory.learnedPatterns.length > 0 || Object.keys(agent.memory.preferences).length > 0 || agent.memory.shortTerm.length > 0) && (
          <IntelligenceSection memory={agent.memory} />
        )}
      </div>
    </div>
  );
}

/* ═══ Sub-components ═══ */

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

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-3 text-center">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function MissionBoard({ tasks }: { tasks: Task[] }) {
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const columns = useMemo(() => KANBAN_COLS.map(col => {
    const colTasks = tasks.filter(t => col.statuses.includes(t.status)).sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));
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
                  <div key={t.id} className={cn("rounded-lg p-3 border border-border/40 bg-muted/30 border-l-2", col.accent, isDone && "opacity-50")}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn("w-1.5 h-1.5 rounded-full", pri.dot)} />
                      <span className={cn("text-[10px] font-bold tracking-wider uppercase", pri.class)}>{pri.label}</span>
                    </div>
                    <p className={cn("text-sm font-medium leading-snug", isDone ? "text-muted-foreground line-through" : "text-foreground/80")}>{t.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                  </div>
                );
              })}
              {overflow > 0 && <p className="text-xs text-muted-foreground/50 text-center py-1">+{overflow} mais</p>}
              {col.tasks.length === 0 && <p className="text-xs text-muted-foreground/30 text-center py-6">Nenhuma missão</p>}
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
  if (events.length === 0) return <p className="text-sm text-muted-foreground/50 py-4">Nenhuma atividade recente.</p>;
  return (
    <div className="space-y-1">
      {visible.map((evt, i) => {
        const time = new Date(evt.timestamp);
        const hh = String(time.getHours()).padStart(2, "0");
        const mm = String(time.getMinutes()).padStart(2, "0");
        return (
          <div key={evt.id} className={cn("flex items-start gap-3 py-2 px-3 rounded-lg font-mono text-sm", i === 0 ? "bg-muted/50" : "hover:bg-muted/20")}>
            <span className="text-muted-foreground/40 shrink-0 text-xs mt-0.5">[{hh}:{mm}]</span>
            <span className={cn("leading-relaxed", i === 0 ? "text-foreground/70" : "text-muted-foreground/60")}>{evt.message}</span>
            {evt.severity === "high" && <span className="text-red-400 text-xs shrink-0 mt-0.5">●</span>}
          </div>
        );
      })}
      {events.length > 5 && (
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground/60 py-2 px-3">
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? "Mostrar menos" : `Ver todos (${events.length})`}
        </button>
      )}
    </div>
  );
}

function CommandTerminal({ agentName, agentId, agentRole }: { agentName: string; agentId: string; agentRole: string }) {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<{ role: "user" | "agent"; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setChat(prev => [...prev, { role: "user", text: userText }]);
    setInput("");
    setLoading(true);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ question: userText, agentName, agentRole }),
      });

      if (!resp.ok || !resp.body) {
        setChat(prev => [...prev, { role: "agent", text: "Erro na comunicação." }]);
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let agentText = "";

      const updateChat = (text: string) => {
        setChat(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "agent") {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, text } : m);
          }
          return [...prev, { role: "agent", text }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) { agentText += content; updateChat(agentText); }
          } catch { /* partial */ }
        }
      }

      if (!agentText) updateChat("Processando. Tente novamente.");
    } catch {
      setChat(prev => [...prev, { role: "agent", text: "Erro de conexão." }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, agentName, agentRole]);

  return (
    <div className="space-y-3">
      {chat.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {chat.map((m, i) => (
            <div key={`chat-${m.role}-${i}`} className={cn("text-sm font-mono px-3 py-2 rounded-lg max-w-[90%]",
              m.role === "user" ? "ml-auto text-foreground/60 bg-muted/50 border border-border/40" : "text-primary/70 bg-primary/5 border border-primary/10"
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
        <input type="text" placeholder={`Comando para ${agentName}...`} value={input}
          onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()}
          className="flex-1 bg-transparent text-sm text-foreground/70 font-mono placeholder:text-muted-foreground/30 outline-none" disabled={loading} />
        {loading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : (
          <button onClick={handleSend} disabled={!input.trim()} className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-20">
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function IntelligenceSection({ memory }: { memory: AgentMemory }) {
  const hasPatterns = memory.learnedPatterns.length > 0;
  const prefs = Object.entries(memory.preferences).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const hasPrefs = prefs.length > 0;
  const recentMemory = memory.shortTerm.filter(m => m.type === "decision").slice(0, 5);
  const hasRecent = recentMemory.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <SectionCard title="Padrões Detectados" icon={Cpu}>
        {hasPatterns ? (
          <div className="space-y-2">
            {memory.learnedPatterns.map((p, i) => (
              <div key={i} className="flex items-start gap-2 py-1.5">
                <Brain className="w-3.5 h-3.5 shrink-0 text-primary/50 mt-0.5" />
                <span className="text-sm text-foreground/70">{p}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground/40 py-4">Nenhum padrão detectado.</p>}
      </SectionCard>

      <SectionCard title="Preferências Inferidas" icon={Target}>
        {hasPrefs ? (
          <div className="space-y-3">
            {prefs.slice(0, 6).map(([key, val]) => {
              const isPositive = val > 0;
              const width = Math.abs(val) * 100;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-foreground/60 capitalize">{key}</span>
                    <div className="flex items-center gap-1">
                      {isPositive ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-red-400" />}
                      <span className={cn("text-xs font-mono", isPositive ? "text-emerald-400" : "text-red-400")}>{isPositive ? "+" : ""}{val.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                    <div className={cn("h-full rounded-full", isPositive ? "bg-emerald-500/60" : "bg-red-500/60")} style={{ width: `${Math.max(4, width)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : <p className="text-sm text-muted-foreground/40 py-4">Sem preferências.</p>}
      </SectionCard>

      <SectionCard title="Memória Recente" icon={Clock}>
        {hasRecent ? (
          <div className="space-y-1">
            {recentMemory.map((m, i) => {
              const time = new Date(m.timestamp);
              const hh = String(time.getHours()).padStart(2, "0");
              const mm = String(time.getMinutes()).padStart(2, "0");
              return (
                <div key={m.id} className={cn("flex items-start gap-2 py-1.5 px-2 rounded font-mono text-xs", i === 0 && "bg-muted/40")}>
                  <span className="text-muted-foreground/40 shrink-0">[{hh}:{mm}]</span>
                  <span className={cn(i === 0 ? "text-foreground/60" : "text-muted-foreground/50")}>{m.content}</span>
                </div>
              );
            })}
          </div>
        ) : <p className="text-sm text-muted-foreground/40 py-4">Nenhuma decisão registrada.</p>}
      </SectionCard>
    </div>
  );
}
