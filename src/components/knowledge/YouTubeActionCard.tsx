import { useState, useEffect } from "react";
import {
  Brain, Target, Shield, Lightbulb, AlertTriangle, Map, MessageSquare,
  BookOpen, FileText, Copy, Check, ChevronDown, ChevronUp, Zap, Users,
  GraduationCap, Sparkles, Pencil,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ─── Types ───
export type ActionItemType = "skill" | "knowledge" | "rule" | "alert" | "tip" | "script";

export interface ActionItem {
  id: string;
  type: ActionItemType;
  title: string;
  body: string;
  suggestedAgent?: string;
  originalSection: string;
}

export interface AgentOption {
  id: string;
  name: string;
  emoji: string;
  role: string;
}

// ─── Type config ───
const TYPE_CONFIG: Record<ActionItemType, {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  badgeBg: string;
  description: string;
}> = {
  skill: {
    label: "Nova Skill",
    icon: Zap,
    color: "text-violet-500",
    bg: "bg-violet-500/8",
    border: "border-violet-500/20",
    badgeBg: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    description: "Habilidade a ser adicionada ao repertório do agente",
  },
  knowledge: {
    label: "Base de Conhecimento",
    icon: BookOpen,
    color: "text-blue-500",
    bg: "bg-blue-500/8",
    border: "border-blue-500/20",
    badgeBg: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    description: "Informação para consulta dos agentes",
  },
  rule: {
    label: "Nova Regra",
    icon: Shield,
    color: "text-emerald-500",
    bg: "bg-emerald-500/8",
    border: "border-emerald-500/20",
    badgeBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    description: "Diretriz estratégica para o comportamento do agente",
  },
  alert: {
    label: "Alerta Operacional",
    icon: AlertTriangle,
    color: "text-amber-500",
    bg: "bg-amber-500/8",
    border: "border-amber-500/20",
    badgeBg: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    description: "Cuidado ou informação crítica que o agente precisa saber",
  },
  tip: {
    label: "Dica de Atendimento",
    icon: Lightbulb,
    color: "text-yellow-500",
    bg: "bg-yellow-500/8",
    border: "border-yellow-500/20",
    badgeBg: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
    description: "Sugestão prática para melhorar o atendimento",
  },
  script: {
    label: "Script de Venda",
    icon: MessageSquare,
    color: "text-indigo-500",
    bg: "bg-indigo-500/8",
    border: "border-indigo-500/20",
    badgeBg: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
    description: "Roteiro ou argumento de venda para o agente usar",
  },
};

// ─── Section → type mapping ───
export function classifySection(title: string): ActionItemType {
  const t = title.toLowerCase();
  if (t.includes("argumento") || t.includes("venda") || t.includes("script")) return "script";
  if (t.includes("alerta") || t.includes("cuidado") || t.includes("evitar")) return "alert";
  if (t.includes("dica") || t.includes("atendimento")) return "tip";
  if (t.includes("roteiro") || t.includes("experiência") || t.includes("logística") || t.includes("transporte")) return "knowledge";
  if (t.includes("regra") || t.includes("compliance") || t.includes("diretriz")) return "rule";
  if (t.includes("skill") || t.includes("habilidade") || t.includes("capacidade")) return "skill";
  if (t.includes("resumo") || t.includes("informaç") || t.includes("dado") || t.includes("essencia")) return "knowledge";
  return "knowledge";
}

// ─── Render markdown-like text with bold ───
function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1.5" />;

        // Parse **bold**
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((part, j) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={j} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
          }
          return <span key={j}>{part}</span>;
        });

        const isBullet = line.trimStart().startsWith("- ") || line.trimStart().startsWith("• ");
        const indent = line.match(/^(\s+)/)?.[1]?.length || 0;

        if (isBullet) {
          return (
            <div key={i} className="flex gap-2" style={{ paddingLeft: Math.max(0, indent - 2) * 4 }}>
              <span className="text-muted-foreground/50 mt-0.5 shrink-0">•</span>
              <span className="text-sm text-foreground/80 leading-relaxed">{rendered}</span>
            </div>
          );
        }

        return (
          <p key={i} className="text-sm text-foreground/80 leading-relaxed">
            {rendered}
          </p>
        );
      })}
    </div>
  );
}

// ─── Card Component ───
interface YouTubeActionCardProps {
  item: ActionItem;
  agents: AgentOption[];
  onUpdate: (item: ActionItem) => void;
  index: number;
}

export default function YouTubeActionCard({ item, agents, onUpdate, index }: YouTubeActionCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editBody, setEditBody] = useState(item.body);
  const [copied, setCopied] = useState(false);

  const config = TYPE_CONFIG[item.type];
  const Icon = config.icon;

  const handleCopy = () => {
    navigator.clipboard.writeText(`${item.title}\n\n${item.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onUpdate({ ...item, title: editTitle, body: editBody });
    setEditing(false);
  };

  const handleTypeChange = (newType: ActionItemType) => {
    onUpdate({ ...item, type: newType });
  };

  const handleAgentChange = (agentId: string) => {
    onUpdate({ ...item, suggestedAgent: agentId });
  };

  const selectedAgent = agents.find(a => a.id === item.suggestedAgent);

  return (
    <div
      className={cn(
        "group rounded-2xl border overflow-hidden transition-all duration-200",
        "hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20",
        config.border,
        expanded ? "shadow-md shadow-black/3" : "shadow-sm"
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* ─── Header ─── */}
      <div
        className={cn("flex items-center gap-3 px-5 py-3.5 cursor-pointer select-none", config.bg)}
        onClick={() => setExpanded(!expanded)}
      >
        <div className={cn("p-2 rounded-xl shadow-sm", config.bg, "border", config.border)}>
          <Icon className={cn("w-4.5 h-4.5", config.color)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <Badge className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-0 rounded-md", config.badgeBg)}>
              {config.label}
            </Badge>
            {selectedAgent && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3" />
                {selectedAgent.emoji} {selectedAgent.name}
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold mt-1 truncate">{item.title}</h3>
        </div>

        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors"
            title="Copiar"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(!editing); }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors"
            title="Editar"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>

        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </div>

      {/* ─── Body ─── */}
      {expanded && (
        <div className="bg-card">
          {/* Config row */}
          <div className="px-5 py-3 border-b border-border/30 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tipo:</span>
              <Select value={item.type} onValueChange={(v) => handleTypeChange(v as ActionItemType)}>
                <SelectTrigger className="h-7 text-xs w-[160px] border-border/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                    const TIcon = cfg.icon;
                    return (
                      <SelectItem key={key} value={key} className="text-xs">
                        <span className="flex items-center gap-2">
                          <TIcon className={cn("w-3.5 h-3.5", cfg.color)} />
                          {cfg.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Agente:</span>
              <Select value={item.suggestedAgent || "all"} onValueChange={(v) => handleAgentChange(v === "all" ? "" : v)}>
                <SelectTrigger className="h-7 text-xs w-[180px] border-border/40">
                  <SelectValue placeholder="Todos os agentes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    <span className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      Todos os agentes
                    </span>
                  </SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id} className="text-xs">
                      <span className="flex items-center gap-2">
                        <span>{agent.emoji}</span>
                        {agent.name}
                        <span className="text-muted-foreground">— {agent.role}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1" />

            <p className="text-[10px] text-muted-foreground italic hidden sm:block">
              {config.description}
            </p>
          </div>

          {/* Content */}
          <div className="px-5 py-4">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Título</label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Conteúdo</label>
                  <Textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={10}
                    className="text-sm font-mono"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setEditing(false); setEditTitle(item.title); setEditBody(item.body); }}
                    className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    className="text-xs font-bold text-primary hover:text-primary/80 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/15 transition-colors"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            ) : (
              <RichText text={item.body} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
