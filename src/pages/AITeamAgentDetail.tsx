import { useParams, useNavigate } from "react-router-dom";
import { updateBehaviorPrompt, setAgentTraining, getAgentTraining } from "@/components/ai-team/agentTrainingStore";
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Send, Zap, Shield, Target, Brain, CheckCircle2, Clock,
  Loader2, Activity, AlertTriangle, Eye, Pause, ChevronDown, ChevronUp,
  Cpu, TrendingUp, TrendingDown, Pencil, Save, X, Plus,
  BookOpen, FileText, Image, Video, Music, Link as LinkIcon,
  Wand2, ToggleLeft, Database, Trash2, Upload, Search,
  GraduationCap, Settings2, MessageSquare, Layers, Sparkles,
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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";

const baseAgents = getAllV4Agents();
const baseTasks = getV4InitialTasks();

const STATUS_MAP: Record<string, { label: string; icon: React.ElementType; badge: string }> = {
  idle:       { label: "Aguardando",         icon: Pause,         badge: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25" },
  analyzing:  { label: "Analisando",         icon: Activity,      badge: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
  suggesting: { label: "Sugerindo",          icon: Brain,         badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
  waiting:    { label: "Aguardando Decisão", icon: Eye,           badge: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
  alert:      { label: "Alerta",             icon: AlertTriangle, badge: "bg-red-500/15 text-red-400 border-red-500/25" },
};

const LEVEL_LABELS: Record<AgentLevel, string> = { basic: "Básico", intermediate: "Intermediário", advanced: "Avançado" };

const PRIORITY_MAP: Record<string, { label: string; class: string; dot: string }> = {
  high:   { label: "Crítica",  class: "text-red-400",    dot: "bg-red-400" },
  medium: { label: "Média",    class: "text-amber-400",  dot: "bg-amber-400" },
  low:    { label: "Baixa",    class: "text-zinc-500",   dot: "bg-zinc-500" },
};

const KANBAN_COLS = [
  { key: "todo",  label: "A Fazer",     icon: Clock,        statuses: ["detected", "suggested", "pending"] as string[], accent: "border-l-amber-500/60" },
  { key: "doing", label: "Em Execução", icon: Loader2,      statuses: ["analyzing", "in_progress"] as string[],        accent: "border-l-blue-500/60" },
  { key: "done",  label: "Concluídas",  icon: CheckCircle2, statuses: ["done"] as string[],                            accent: "border-l-emerald-500/60" },
];

// ═══ Mock data for knowledge/skills/rules per agent ═══

interface KBDoc {
  id: string; title: string; tipo: string; tags: string[]; agente: string;
  resumo: string; chunks: number; updatedAt: string; status: "processado" | "processando" | "erro"; size: string;
}

const ALL_KB_DOCS: KBDoc[] = [
  { id: "1", title: "Catálogo Dubai 2026", tipo: "pdf", tags: ["dubai", "hotéis"], agente: "HABIBI", resumo: "Guia completo de hotéis 5 estrelas e experiências VIP em Dubai.", chunks: 5, updatedAt: "22/03/2026", status: "processado", size: "2.4 MB" },
  { id: "2", title: "Política de Preços Orlando", tipo: "pdf", tags: ["orlando", "preços"], agente: "NEMO", resumo: "Tabela de preços e markups para pacotes Orlando e Disney.", chunks: 3, updatedAt: "20/03/2026", status: "processado", size: "890 KB" },
  { id: "3", title: "Script de Boas-vindas WhatsApp", tipo: "texto", tags: ["script", "boas-vindas"], agente: "MAYA", resumo: "Modelo de primeiro contato via WhatsApp com variações por perfil.", chunks: 2, updatedAt: "21/03/2026", status: "processado", size: "12 KB" },
  { id: "4", title: "Roteiros Europa Premium", tipo: "pdf", tags: ["europa", "itália"], agente: "DANTE", resumo: "Roteiros detalhados para Itália, França e Espanha premium.", chunks: 8, updatedAt: "19/03/2026", status: "processado", size: "5.1 MB" },
  { id: "5", title: "FAQ Objeções de Preço", tipo: "texto", tags: ["objeções", "preço"], agente: "Todos", resumo: "Banco de respostas para as 15 objeções de preço mais frequentes.", chunks: 4, updatedAt: "23/03/2026", status: "processado", size: "28 KB" },
  { id: "6", title: "Guia Maldivas 2026", tipo: "pdf", tags: ["maldivas", "resorts"], agente: "HABIBI", resumo: "Os 10 melhores resorts overwater das Maldivas.", chunks: 6, updatedAt: "17/03/2026", status: "processando", size: "3.8 MB" },
  { id: "7", title: "Tabela de Fornecedores", tipo: "pdf", tags: ["fornecedores"], agente: "OPEX", resumo: "Lista completa de fornecedores homologados.", chunks: 3, updatedAt: "15/03/2026", status: "processado", size: "1.2 MB" },
  { id: "8", title: "Manual de Compliance CADASTUR", tipo: "pdf", tags: ["compliance", "fiscal"], agente: "VIGIL", resumo: "Regras e orientações de compliance para turismo.", chunks: 4, updatedAt: "18/03/2026", status: "processado", size: "1.8 MB" },
  { id: "9", title: "Playbook Negociação Avançada", tipo: "texto", tags: ["negociação", "fechamento"], agente: "NERO", resumo: "Técnicas avançadas de fechamento e superação de objeções.", chunks: 3, updatedAt: "22/03/2026", status: "processado", size: "45 KB" },
  { id: "10", title: "Guia Pós-Venda NatLeva", tipo: "texto", tags: ["pós-venda", "fidelização"], agente: "IRIS", resumo: "Framework de acompanhamento pós-viagem e recompra.", chunks: 2, updatedAt: "21/03/2026", status: "processado", size: "18 KB" },
  { id: "11", title: "Política Financeira 2026", tipo: "pdf", tags: ["financeiro", "cobrança"], agente: "FINX", resumo: "Regras de parcelamento, NF e prazos de pagamento.", chunks: 5, updatedAt: "20/03/2026", status: "processado", size: "2.1 MB" },
  { id: "12", title: "Script de Qualificação BANT", tipo: "texto", tags: ["qualificação", "BANT"], agente: "ATLAS", resumo: "Perguntas estratégicas para qualificação de leads.", chunks: 2, updatedAt: "19/03/2026", status: "processado", size: "15 KB" },
];

interface SkillItem {
  id: string; name: string; category: string; level: string; successRate: number;
  uses: number; active: boolean; agents: string[]; description: string;
}

const ALL_SKILLS: SkillItem[] = [
  { id: "s1", name: "Quebra de objeção de preço", category: "vendas", level: "avançado", successRate: 72, uses: 234, active: true, agents: ["NERO", "LUNA", "ATLAS"], description: "Técnicas para contornar objeções com foco em valor." },
  { id: "s2", name: "Upsell de experiências", category: "upsell", level: "intermediário", successRate: 65, uses: 156, active: true, agents: ["HABIBI", "NEMO", "DANTE"], description: "Ofertar experiências premium no momento certo." },
  { id: "s3", name: "Acolhimento empático", category: "relacionamento", level: "básico", successRate: 91, uses: 412, active: true, agents: ["MAYA", "IRIS"], description: "Primeiro contato com tom humano e personalizado." },
  { id: "s4", name: "Criação de urgência", category: "vendas", level: "avançado", successRate: 58, uses: 89, active: true, agents: ["NERO"], description: "Criar urgência real baseada em disponibilidade." },
  { id: "s5", name: "Follow-up inteligente", category: "relacionamento", level: "intermediário", successRate: 77, uses: 198, active: true, agents: ["ATLAS", "LUNA", "IRIS"], description: "Timing e conteúdo de follow-up por perfil." },
  { id: "s6", name: "Resolução de reclamação", category: "suporte", level: "intermediário", successRate: 83, uses: 67, active: true, agents: ["ATHOS"], description: "Framework de resolução: escutar, resolver, surpreender." },
  { id: "s7", name: "Storytelling por destino", category: "comunicação", level: "avançado", successRate: 69, uses: 145, active: true, agents: ["LUNA", "HABIBI", "DANTE", "NEMO"], description: "Narrar experiências como história envolvente." },
  { id: "s8", name: "Qualificação BANT", category: "vendas", level: "básico", successRate: 88, uses: 302, active: true, agents: ["ATLAS"], description: "Qualificar lead por Budget, Authority, Need, Timeline." },
  { id: "s9", name: "Reativação de lead frio", category: "relacionamento", level: "intermediário", successRate: 42, uses: 78, active: true, agents: ["AEGIS", "NURTURE"], description: "Reaquecer leads inativos com abordagem estratégica." },
  { id: "s10", name: "Análise de margem", category: "financeiro", level: "avançado", successRate: 94, uses: 120, active: true, agents: ["SAGE", "FINX"], description: "Calcular e otimizar margens por produto/destino." },
  { id: "s11", name: "Concierge VIP", category: "atendimento", level: "avançado", successRate: 96, uses: 85, active: true, agents: ["ZARA"], description: "Organização de experiências exclusivas e reservas especiais." },
  { id: "s12", name: "Detecção de churn", category: "retenção", level: "intermediário", successRate: 78, uses: 55, active: true, agents: ["AEGIS"], description: "Identificar sinais de abandono antes que aconteça." },
];

interface RuleItem {
  id: string; name: string; description: string; active: boolean;
  impact: string; scope: string; agents: string[];
}

const ALL_RULES: RuleItem[] = [
  { id: "r1", name: "Sem repetição de ofertas", description: "Não repete a mesma proposta ao cliente num período de 30 dias", active: true, impact: "alta", scope: "all", agents: [] },
  { id: "r2", name: "Rastrear promessas", description: "Registra promessas feitas durante conversas para follow-up", active: true, impact: "alta", scope: "all", agents: [] },
  { id: "r3", name: "Dados sensíveis (LGPD)", description: "Não armazena CPF, dados bancários ou senhas na memória", active: true, impact: "crítica", scope: "all", agents: [] },
  { id: "r4", name: "Limite de desconto 15%", description: "Desconto máximo sem aprovação gerencial é 15%", active: true, impact: "alta", scope: "specific", agents: ["NERO", "LUNA"] },
  { id: "r5", name: "Follow-up obrigatório 48h", description: "Todo lead qualificado deve receber follow-up em até 48h", active: true, impact: "alta", scope: "specific", agents: ["ATLAS", "MAYA"] },
  { id: "r6", name: "Upsell apenas após rapport", description: "Só oferece upgrades após identificar perfil e orçamento", active: true, impact: "média", scope: "specific", agents: ["HABIBI", "NEMO", "DANTE"] },
  { id: "r7", name: "Tom formal em cotações", description: "Propostas devem usar tom formal e profissional", active: true, impact: "média", scope: "specific", agents: ["LUNA"] },
  { id: "r8", name: "Verificar CADASTUR", description: "Validar compliance CADASTUR em toda comunicação oficial", active: true, impact: "crítica", scope: "specific", agents: ["VIGIL"] },
  { id: "r9", name: "NPS obrigatório pós-viagem", description: "Enviar pesquisa NPS entre 3-7 dias após retorno", active: true, impact: "média", scope: "specific", agents: ["IRIS"] },
  { id: "r10", name: "Alerta churn >60 dias", description: "Clientes sem interação >60 dias devem receber alerta", active: true, impact: "alta", scope: "specific", agents: ["AEGIS", "NURTURE"] },
];

const TIPO_ICONS: Record<string, typeof FileText> = {
  pdf: FileText, texto: FileText, imagem: Image, video: Video, link: LinkIcon, audio: Music,
};

const LEVEL_COLORS: Record<string, string> = {
  "básico": "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  "intermediário": "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "avançado": "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

const IMPACT_COLORS: Record<string, string> = {
  "crítica": "text-red-400 bg-red-500/10",
  "alta": "text-amber-400 bg-amber-500/10",
  "média": "text-blue-400 bg-blue-500/10",
  "baixa": "text-zinc-400 bg-zinc-500/10",
};

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

  const agentNameUpper = (v4?.name ?? agent?.name ?? "").toUpperCase();

  // Filter knowledge docs for this agent
  const agentDocs = useMemo(() => ALL_KB_DOCS.filter(d =>
    d.agente === agentNameUpper || d.agente === "Todos"
  ), [agentNameUpper]);

  // Filter skills for this agent
  const agentSkills = useMemo(() => ALL_SKILLS.filter(s =>
    s.agents.some(a => a.toUpperCase() === agentNameUpper)
  ), [agentNameUpper]);

  // Filter rules for this agent
  const agentRules = useMemo(() => ALL_RULES.filter(r =>
    r.scope === "all" || r.agents.some(a => a.toUpperCase() === agentNameUpper)
  ), [agentNameUpper]);

  // Fetch behavior_prompt from database (source of truth)
  const { data: dbAgent } = useQuery({
    queryKey: ["ai_team_agent_db", agentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_team_agents")
        .select("behavior_prompt")
        .eq("id", agentId!)
        .maybeSingle();
      return data;
    },
    enabled: !!agentId,
  });

  const realBehaviorPrompt = dbAgent?.behavior_prompt || agent?.behaviorPrompt || "";

  // Fetch real improvements from Nath for this agent
  const { data: nathImprovements = [] } = useQuery({
    queryKey: ["ai_team_improvements", agentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_team_improvements")
        .select("*")
        .eq("agent_id", agentId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!agentId,
  });

  // Fetch Nath-origin strategy knowledge
  const { data: nathKnowledge = [] } = useQuery({
    queryKey: ["ai_strategy_knowledge_nath"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_strategy_knowledge")
        .select("*")
        .eq("origin_type", "nath_opinion")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const [activeTab, setActiveTab] = useState("overview");

  // Edit state
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
    setActiveTab("behavior");
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
    // Persist behavior prompt to shared training store so simulator can use it
    if (editBehavior.trim()) {
      updateBehaviorPrompt(agent.id, editBehavior.trim());
    }
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

  const TAB_ITEMS = [
    { id: "overview", label: "Visão Geral", icon: Activity, count: agentTasks.length },
    { id: "improvements", label: "Melhorias da Nath", icon: Sparkles, count: nathImprovements.length + nathKnowledge.length },
    { id: "knowledge", label: "Conhecimento", icon: BookOpen, count: agentDocs.length },
    { id: "skills", label: "Skills", icon: Zap, count: agentSkills.length },
    { id: "behavior", label: "Regras & Comportamento", icon: Shield, count: agentRules.length },
    { id: "memory", label: "Memória", icon: Brain, count: 0 },
    { id: "terminal", label: "Terminal", icon: MessageSquare, count: 0 },
  ];

  return (
    <div className="min-h-screen pb-12">
      {/* ═══ HEADER ═══ */}
      <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center gap-3 md:gap-4 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => navigate("/ai-team")} className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">AI Team</span>
            </Button>
            <div className="h-5 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-2xl">{displayEmoji}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                  <h1 className="text-base md:text-lg font-bold tracking-wide">{displayName}</h1>
                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] md:text-xs font-semibold border", st.badge)}>
                    <StatusIcon className="w-3 h-3" />
                    {st.label}
                  </span>
                  {squad && (
                    <Badge variant="outline" className={cn("text-[10px]", squad.color)}>
                      {squad.emoji} {squad.name}
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
                  {v4?.role ?? agent.role}
                  {v4 && <> · Lv.{v4.level} · {v4.successRate}% taxa</>}
                </p>
              </div>
            </div>
            {!editing ? (
              <Button variant="outline" size="sm" onClick={startEditing} className="gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Editar</span>
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={cancelEditing}><X className="w-4 h-4" /></Button>
                <Button size="sm" onClick={saveEditing} disabled={!editName.trim() || !editRole.trim()} className="gap-1.5">
                  <Save className="w-4 h-4" /> Salvar
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6">
        {/* Stats bar */}
        {v4 && (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-3 mb-4">
            <MiniStat label="Nível" value={v4.level} />
            <MiniStat label="XP" value={`${v4.xp.toLocaleString()}/${v4.maxXp.toLocaleString()}`} />
            <MiniStat label="Taxa" value={`${v4.successRate}%`} />
            <MiniStat label="Tarefas" value={v4.tasksToday} />
            <MiniStat label="Missões" value={agentTasks.filter(t => t.status !== "done").length} />
          </div>
        )}

        {/* XP Progress */}
        {v4 && (
          <div className="rounded-xl border border-border/50 bg-card p-3 md:p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] md:text-xs font-bold text-muted-foreground">Progresso para Lv.{v4.level + 1}</span>
              <span className="text-[10px] md:text-xs text-muted-foreground">{Math.round((v4.xp / v4.maxXp) * 100)}%</span>
            </div>
            <Progress value={(v4.xp / v4.maxXp) * 100} className="h-2" />
          </div>
        )}

        {/* ═══ TRAINING CENTER TABS ═══ */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-border/50 mb-4 -mx-4 md:-mx-6 px-4 md:px-6">
            <TabsList className="bg-transparent h-auto p-0 gap-0 w-full overflow-x-auto flex justify-start">
              {TAB_ITEMS.map(tab => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={cn(
                      "rounded-none border-b-2 border-transparent px-3 md:px-4 py-2.5 text-xs md:text-sm font-medium transition-all",
                      "data-[state=active]:border-primary data-[state=active]:text-foreground",
                      "text-muted-foreground hover:text-foreground/70 gap-1.5 shrink-0"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
                    {tab.count > 0 && (
                      <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full">{tab.count}</span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* ═══ TAB: VISÃO GERAL ═══ */}
          <TabsContent value="overview" className="space-y-4 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <SectionCard title="Status Operacional" icon={Activity}>
                  <p className="text-sm md:text-base text-foreground/80 leading-relaxed">
                    {agent.currentThought || v4?.persona || "Aguardando novas demandas."}
                  </p>
                  {agent.lastAction && (
                    <p className="text-xs md:text-sm text-muted-foreground mt-3">
                      Última ação: <span className="text-foreground/60">{agent.lastAction}</span>
                    </p>
                  )}
                </SectionCard>
              </div>
              <SectionCard title="Skills Ativas" icon={Zap}>
                <div className="flex flex-wrap gap-1.5">
                  {(v4?.skills ?? agent.skills).map(s => (
                    <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                  ))}
                </div>
              </SectionCard>
            </div>

            <SectionCard title={`Missões · ${agentTasks.length}`} icon={Target}>
              <MissionBoard tasks={agentTasks} />
            </SectionCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SectionCard title="Log de Atividade" icon={Clock}>
                <ActivityLog events={agentEvents} />
              </SectionCard>
              <SectionCard title="Persona & Descrição" icon={Brain}>
                <p className="text-sm text-foreground/70 leading-relaxed italic">
                  "{v4?.persona ?? agent.role}"
                </p>
              </SectionCard>
            </div>
          </TabsContent>

          {/* ═══ TAB: MELHORIAS DA NATH ═══ */}
          <TabsContent value="improvements" className="space-y-4 mt-0">
            <NathImprovementsTab improvements={nathImprovements} knowledge={nathKnowledge} agentName={displayName} />
          </TabsContent>

          {/* ═══ TAB: KNOWLEDGE BASE ═══ */}
          <TabsContent value="knowledge" className="space-y-4 mt-0">
            <KnowledgeBaseTab docs={agentDocs} agentName={displayName} />
          </TabsContent>

          {/* ═══ TAB: SKILLS ═══ */}
          <TabsContent value="skills" className="space-y-4 mt-0">
            <SkillsTab skills={agentSkills} agentName={displayName} />
          </TabsContent>

          {/* ═══ TAB: BEHAVIOR & RULES ═══ */}
          <TabsContent value="behavior" className="space-y-4 mt-0">
            <BehaviorTab
              rules={agentRules}
              agentName={displayName}
              editing={editing}
              editName={editName} setEditName={setEditName}
              editRole={editRole} setEditRole={setEditRole}
              editSector={editSector} setEditSector={setEditSector}
              editLevel={editLevel} setEditLevel={setEditLevel}
              editSkills={editSkills} setEditSkills={setEditSkills}
              editBehavior={editBehavior} setEditBehavior={setEditBehavior}
              customSkill={customSkill} setCustomSkill={setCustomSkill}
              toggleItem={toggleItem}
              addCustomSkill={addCustomSkill}
              cancelEditing={cancelEditing}
              saveEditing={saveEditing}
              startEditing={startEditing}
              agent={agent}
              agentId={agentId}
            />
          </TabsContent>

          {/* ═══ TAB: MEMORY ═══ */}
          <TabsContent value="memory" className="space-y-4 mt-0">
            {agent.memory && (agent.memory.learnedPatterns.length > 0 || Object.keys(agent.memory.preferences).length > 0 || agent.memory.shortTerm.length > 0) ? (
              <IntelligenceSection memory={agent.memory} />
            ) : (
              <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
                <Brain className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum dado de memória registrado ainda.</p>
                <p className="text-xs text-muted-foreground/50 mt-1">A memória será populada conforme o agente processa tarefas e decisões.</p>
              </div>
            )}
          </TabsContent>

          {/* ═══ TAB: TERMINAL ═══ */}
          <TabsContent value="terminal" className="mt-0">
            <SectionCard title={`Terminal · ${displayName}`} icon={MessageSquare}>
              <CommandTerminal agentName={displayName} agentId={agent.id} agentRole={v4?.persona ?? agent.role} />
            </SectionCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ═══ Nath Improvements Tab ═══ */
function NathImprovementsTab({ improvements, knowledge, agentName }: {
  improvements: any[];
  knowledge: any[];
  agentName: string;
}) {
  const CATEGORY_LABELS: Record<string, { label: string; icon: typeof Zap; color: string }> = {
    skill: { label: "Skill", icon: Zap, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
    knowledge_base: { label: "Conhecimento", icon: BookOpen, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    global_rule: { label: "Regra Global", icon: Shield, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    prompt: { label: "Prompt", icon: Brain, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  };

  const totalItems = improvements.length + knowledge.length;

  if (totalItems === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
        <Sparkles className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Nenhuma melhoria aplicada pela Nath ainda.</p>
        <p className="text-xs text-muted-foreground/50 mt-1">
          Use o Simulador e clique em "Opinião da Nath" → "Converter em Ação" para gerar melhorias.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{totalItems}</span> melhoria{totalItems !== 1 ? "s" : ""} aplicada{totalItems !== 1 ? "s" : ""} pela Nath para <span className="font-semibold text-foreground">{agentName}</span>
        </p>
      </div>

      {/* Agent-specific improvements from ai_team_improvements */}
      {improvements.length > 0 && (
        <SectionCard title={`Melhorias do Agente · ${improvements.length}`} icon={Zap}>
          <div className="space-y-2">
            {improvements.map((imp) => {
              const cat = CATEGORY_LABELS[imp.category] || CATEGORY_LABELS.skill;
              const CatIcon = cat.icon;
              return (
                <div key={imp.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card hover:border-primary/20 transition-all">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border", cat.color)}>
                    <CatIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-foreground">{imp.title}</h4>
                      <Badge className={cn("text-[9px] border", cat.color)}>{cat.label}</Badge>
                      <Badge variant="outline" className={cn("text-[9px]",
                        imp.status === "approved" ? "text-emerald-400 border-emerald-500/30" :
                        imp.status === "pending" ? "text-amber-400 border-amber-500/30" :
                        "text-muted-foreground"
                      )}>{imp.status === "approved" ? "Aprovado" : imp.status === "pending" ? "Pendente" : imp.status}</Badge>
                    </div>
                    {imp.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{imp.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/60">
                      {imp.impact_score && <span>Impacto: {imp.impact_score}%</span>}
                      <span>{new Date(imp.created_at).toLocaleDateString("pt-BR")}</span>
                      {imp.approved_at && <span>· Aprovado em {new Date(imp.approved_at).toLocaleDateString("pt-BR")}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Global knowledge from ai_strategy_knowledge with nath origin */}
      {knowledge.length > 0 && (
        <SectionCard title={`Conhecimento Estratégico da Nath · ${knowledge.length}`} icon={BookOpen}>
          <div className="space-y-2">
            {knowledge.map((kb) => (
              <div key={kb.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card hover:border-primary/20 transition-all">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border text-primary bg-primary/10 border-primary/20">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-foreground">{kb.title}</h4>
                    <Badge className="text-[9px] border text-primary bg-primary/10 border-primary/20">
                      {kb.category === "regra_global" ? "Regra Global" : "Conhecimento"}
                    </Badge>
                    {kb.tags?.map((t: string) => (
                      <Badge key={t} variant="secondary" className="text-[9px]">{t}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{kb.rule}</p>
                  {kb.description && (
                    <p className="text-[10px] text-muted-foreground/60 mt-1 italic">{kb.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/60">
                    <span>Prioridade: {kb.priority}</span>
                    <span>{new Date(kb.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

/* ═══ Knowledge Base Tab ═══ */
function KnowledgeBaseTab({ docs, agentName }: { docs: KBDoc[]; agentName: string }) {
  const [search, setSearch] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<KBDoc | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editResumo, setEditResumo] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editAgente, setEditAgente] = useState("");

  const filtered = docs.filter(d => !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.tags.some(t => t.includes(search.toLowerCase())));

  const openDoc = (doc: KBDoc) => {
    setSelectedDoc(doc);
    setEditMode(false);
    setEditTitle(doc.title);
    setEditResumo(doc.resumo);
    setEditTags(doc.tags.join(", "));
    setEditAgente(doc.agente);
  };

  const startEdit = () => setEditMode(true);

  const saveEdit = () => {
    setEditMode(false);
    if (selectedDoc) {
      setSelectedDoc({ ...selectedDoc, title: editTitle, resumo: editResumo, tags: editTags.split(",").map(t => t.trim()).filter(Boolean), agente: editAgente });
    }
    sonnerToast.success("Documento atualizado!");
  };

  if (selectedDoc) {
    const TipoIcon = TIPO_ICONS[selectedDoc.tipo] || FileText;
    return (
      <div className="space-y-4 animate-fade-in">
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => setSelectedDoc(null)}>
          <ArrowLeft className="w-4 h-4" /> Voltar à lista
        </Button>

        <div className="rounded-xl border border-border/50 bg-card p-5 md:p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <TipoIcon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              {editMode ? (
                <Input value={editTitle} onChange={(e: any) => setEditTitle(e.target.value)} className="text-lg font-bold" />
              ) : (
                <h2 className="text-lg font-bold text-foreground">{selectedDoc.title}</h2>
              )}
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <Badge variant="outline" className={cn("text-[9px]",
                  selectedDoc.status === "processado" ? "text-emerald-400 border-emerald-500/30" :
                  selectedDoc.status === "processando" ? "text-amber-400 border-amber-500/30" :
                  "text-red-400 border-red-500/30"
                )}>{selectedDoc.status}</Badge>
                <span>{selectedDoc.tipo.toUpperCase()}</span>
                <span>·</span>
                <span>{selectedDoc.size}</span>
                <span>·</span>
                <span>{selectedDoc.chunks} chunks</span>
                <span>·</span>
                <span>Atualizado: {selectedDoc.updatedAt}</span>
              </div>
            </div>
            {!editMode ? (
              <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={startEdit}>
                <Pencil className="w-3.5 h-3.5" /> Editar
              </Button>
            ) : (
              <div className="flex gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>Cancelar</Button>
                <Button size="sm" className="gap-1.5" onClick={saveEdit}>
                  <Save className="w-3.5 h-3.5" /> Salvar
                </Button>
              </div>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Resumo / Conteúdo</label>
              {editMode ? (
                <Textarea value={editResumo} onChange={(e: any) => setEditResumo(e.target.value)} rows={4} className="text-sm" />
              ) : (
                <p className="text-sm text-foreground/80 bg-muted/30 rounded-lg p-3 border border-border/30 leading-relaxed">{selectedDoc.resumo}</p>
              )}
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tags</label>
                {editMode ? (
                  <Input value={editTags} onChange={(e: any) => setEditTags(e.target.value)} placeholder="Separar com vírgula" className="text-sm" />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDoc.tags.map(t => (
                      <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Agente Vinculado</label>
                {editMode ? (
                  <Input value={editAgente} onChange={(e: any) => setEditAgente(e.target.value)} className="text-sm" />
                ) : (
                  <Badge variant="outline" className="text-xs">{selectedDoc.agente}</Badge>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Processamento</label>
                <div className="text-sm text-foreground/70 space-y-1">
                  <p><span className="text-muted-foreground">Tipo:</span> {selectedDoc.tipo.toUpperCase()}</p>
                  <p><span className="text-muted-foreground">Chunks gerados:</span> {selectedDoc.chunks}</p>
                  <p><span className="text-muted-foreground">Tamanho:</span> {selectedDoc.size}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/30">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Database className="w-3.5 h-3.5" /> Reprocessar Chunks
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs text-red-400 hover:text-red-300 hover:border-red-500/30">
              <Trash2 className="w-3.5 h-3.5" /> Remover
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar na base de conhecimento..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 text-sm" />
        </div>
        <Button size="sm" className="gap-1.5 shrink-0">
          <Upload className="w-3.5 h-3.5" /> Adicionar
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        {filtered.length} documento{filtered.length !== 1 ? "s" : ""} na base de <span className="font-semibold text-foreground">{agentName}</span>
      </div>

      <div className="grid gap-3">
        {filtered.map(doc => {
          const TipoIcon = TIPO_ICONS[doc.tipo] || FileText;
          return (
            <div key={doc.id} onClick={() => openDoc(doc)} className="rounded-xl border border-border/50 bg-card p-4 hover:border-primary/30 transition-all cursor-pointer group hover:shadow-md">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <TipoIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{doc.title}</h4>
                    <Badge variant="outline" className={cn("text-[9px]",
                      doc.status === "processado" ? "text-emerald-400 border-emerald-500/30" :
                      doc.status === "processando" ? "text-amber-400 border-amber-500/30" :
                      "text-red-400 border-red-500/30"
                    )}>{doc.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.resumo}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/60">
                    <span>{doc.size}</span>
                    <span>·</span>
                    <span>{doc.chunks} chunks</span>
                    <span>·</span>
                    <span>{doc.updatedAt}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {doc.tags.map(t => (
                      <Badge key={t} variant="secondary" className="text-[9px] px-1.5 py-0">{t}</Badge>
                    ))}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground/40 shrink-0 group-hover:text-primary transition-colors rotate-[-90deg]" />
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-8">
            <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum documento encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══ Skills Tab ═══ */
function SkillsTab({ skills, agentName }: { skills: SkillItem[]; agentName: string }) {
  const [skillStates, setSkillStates] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    skills.forEach(s => { map[s.id] = s.active; });
    return map;
  });

  const toggleSkill = (id: string) => {
    setSkillStates(prev => ({ ...prev, [id]: !prev[id] }));
    sonnerToast.success("Skill atualizada");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {skills.length} skill{skills.length !== 1 ? "s" : ""} atribuídas a <span className="font-semibold text-foreground">{agentName}</span>
        </p>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Nova Skill
        </Button>
      </div>

      <div className="grid gap-3">
        {skills.map(skill => {
          const active = skillStates[skill.id] ?? skill.active;
          return (
            <div key={skill.id} className={cn(
              "rounded-xl border bg-card p-4 transition-all",
              active ? "border-border/50" : "border-border/30 opacity-60"
            )}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                    <h4 className="text-sm font-semibold text-foreground">{skill.name}</h4>
                    <Badge className={cn("text-[9px] border", LEVEL_COLORS[skill.level] || "")}>{skill.level}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{skill.description}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${skill.successRate}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{skill.successRate}%</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{skill.uses} usos</span>
                    <span className="text-[10px] text-muted-foreground capitalize">{skill.category}</span>
                  </div>
                </div>
                <Switch checked={active} onCheckedChange={() => toggleSkill(skill.id)} />
              </div>
            </div>
          );
        })}
        {skills.length === 0 && (
          <div className="text-center py-8">
            <Zap className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma skill atribuída a este agente.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══ Behavior & Rules Tab ═══ */
function BehaviorTab({ rules, agentName, editing, editName, setEditName, editRole, setEditRole,
  editSector, setEditSector, editLevel, setEditLevel, editSkills, setEditSkills,
  editBehavior, setEditBehavior, customSkill, setCustomSkill, toggleItem, addCustomSkill,
  cancelEditing, saveEditing, startEditing, agent, agentId,
}: any) {
  const [ruleStates, setRuleStates] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    rules.forEach((r: RuleItem) => { map[r.id] = r.active; });
    return map;
  });

  const [showNewRule, setShowNewRule] = useState(false);
  const [newRule, setNewRule] = useState({ name: "", description: "", impact: "alta", scope: "specific" });
  
  // Load persisted custom rules from training store
  const [extraRules, setExtraRules] = useState<RuleItem[]>(() => {
    const training = getAgentTraining(agentId);
    if (!training?.customRules?.length) return [];
    return training.customRules.map(r => ({
      ...r,
      scope: "specific",
      agents: [agentName.toUpperCase()],
    }));
  });

  const allRules = useMemo(() => [...rules, ...extraRules], [rules, extraRules]);

  const displayName = agentName;

  // Persist custom rules to training store
  const syncRulesToStore = useCallback((rulesArr: RuleItem[]) => {
    setAgentTraining(agentId, {
      customRules: rulesArr.map(r => ({
        id: r.id, name: r.name, description: r.description, active: true, impact: r.impact,
      })),
    });
  }, [agentId]);

  const handleSaveRule = useCallback(() => {
    if (!newRule.name.trim()) { sonnerToast.error("Nome da regra é obrigatório"); return; }
    const rule: RuleItem = {
      id: `r-custom-${Date.now()}`,
      name: newRule.name.trim(),
      description: newRule.description.trim(),
      active: true,
      impact: newRule.impact,
      scope: newRule.scope,
      agents: newRule.scope === "specific" ? [agentName.toUpperCase()] : [],
    };
    const updated = [...extraRules, rule];
    setExtraRules(updated);
    setRuleStates(prev => ({ ...prev, [rule.id]: true }));
    setShowNewRule(false);
    setNewRule({ name: "", description: "", impact: "alta", scope: "specific" });
    syncRulesToStore(updated);
    sonnerToast.success("Regra criada com sucesso!");
  }, [newRule, agentName, extraRules, syncRulesToStore]);

  const toggleRule = (id: string) => {
    setRuleStates((prev: any) => ({ ...prev, [id]: !prev[id] }));
    sonnerToast.success("Regra atualizada");
  };

  return (
    <div className="space-y-6">
      {/* Behavior Prompt */}
      <SectionCard title="Diretiva Comportamental" icon={Settings2}>
        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nome</label>
                <Input value={editName} onChange={(e: any) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Função</label>
                <Input value={editRole} onChange={(e: any) => setEditRole(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Setor</label>
                <Select value={editSector} onValueChange={setEditSector}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sectorOptions.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nível</label>
                <Select value={editLevel} onValueChange={(v: any) => setEditLevel(v as AgentLevel)}>
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
                {defaultSkills.map((s: string) => (
                  <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={editSkills.includes(s)} onCheckedChange={() => toggleItem(editSkills, s, setEditSkills)} />
                    {s}
                  </label>
                ))}
              </div>
              <div className="flex gap-2 max-w-sm">
                <Input placeholder="Nova habilidade..." value={customSkill} onChange={(e: any) => setCustomSkill(e.target.value)}
                  onKeyDown={(e: any) => e.key === "Enter" && (e.preventDefault(), addCustomSkill())} className="text-sm" />
                <Button size="sm" variant="outline" onClick={addCustomSkill} disabled={!customSkill.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Prompt Comportamental</label>
              <Textarea placeholder="Ex: Seja proativo, foque em experiências premium..." value={editBehavior}
                onChange={(e: any) => setEditBehavior(e.target.value)} rows={4} className="font-mono text-xs" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={cancelEditing}>Cancelar</Button>
              <Button size="sm" onClick={saveEditing} disabled={!editName.trim() || !editRole.trim()} className="gap-1.5">
                <Save className="w-4 h-4" /> Salvar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <pre className="text-sm text-foreground/70 leading-relaxed font-mono bg-muted/30 rounded-lg p-4 border border-border/30 whitespace-pre-wrap max-h-96 overflow-y-auto">
              {realBehaviorPrompt || "Nenhuma diretiva configurada. Clique em Editar para definir."}
            </pre>
            <Button variant="outline" size="sm" onClick={startEditing} className="gap-1.5">
              <Pencil className="w-3.5 h-3.5" /> Editar Comportamento
            </Button>
          </div>
        )}
      </SectionCard>

      {/* Rules */}
      <SectionCard title={`Regras Ativas · ${allRules.length}`} icon={Shield}>
        <div className="space-y-2">
          {allRules.map((rule: RuleItem) => {
            const active = ruleStates[rule.id] ?? rule.active;
            return (
              <div key={rule.id} className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                active ? "border-border/50 bg-card" : "border-border/20 bg-muted/20 opacity-60"
              )}>
                <Switch checked={active} onCheckedChange={() => toggleRule(rule.id)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{rule.name}</span>
                    <Badge className={cn("text-[9px]", IMPACT_COLORS[rule.impact] || "")}>{rule.impact}</Badge>
                    {rule.scope === "all" && <Badge variant="outline" className="text-[9px]">Global</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>
                </div>
              </div>
            );
          })}
          <Button variant="outline" size="sm" className="gap-1.5 mt-2" onClick={() => setShowNewRule(true)}>
            <Plus className="w-3.5 h-3.5" /> Nova Regra
          </Button>
        </div>

        {/* New Rule Dialog */}
        {showNewRule && (
          <div className="mt-4 p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3 animate-fade-in">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Nova Regra para {displayName}
            </h4>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nome da Regra *</label>
              <Input
                placeholder="Ex: Limite de desconto 10%"
                value={newRule.name}
                onChange={(e: any) => setNewRule({ ...newRule, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Descrição</label>
              <Textarea
                placeholder="Descreva o que essa regra faz..."
                value={newRule.description}
                onChange={(e: any) => setNewRule({ ...newRule, description: e.target.value })}
                rows={2}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Impacto</label>
                <Select value={newRule.impact} onValueChange={(v) => setNewRule({ ...newRule, impact: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crítica">Crítica</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="média">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Escopo</label>
                <Select value={newRule.scope} onValueChange={(v) => setNewRule({ ...newRule, scope: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="specific">Apenas {displayName}</SelectItem>
                    <SelectItem value="all">Global (todos agentes)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => { setShowNewRule(false); setNewRule({ name: "", description: "", impact: "alta", scope: "specific" }); }}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveRule} disabled={!newRule.name.trim()} className="gap-1.5">
                <Save className="w-3.5 h-3.5" /> Salvar Regra
              </Button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ═══ Sub-components ═══ */

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 md:p-5">
      <div className="flex items-center gap-2 mb-3 md:mb-4">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-xs font-bold tracking-[0.1em] text-muted-foreground uppercase">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-2.5 md:p-3 text-center">
      <p className="text-lg md:text-xl font-bold">{value}</p>
      <p className="text-[9px] md:text-[10px] text-muted-foreground mt-0.5">{label}</p>
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
        const visible = col.tasks.slice(0, 4);
        const overflow = col.tasks.length - 4;
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
          <div key={evt.id} className={cn("flex items-start gap-3 py-2 px-3 rounded-lg font-mono text-xs md:text-sm", i === 0 ? "bg-muted/50" : "hover:bg-muted/20")}>
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
        <div className="space-y-2 max-h-64 overflow-y-auto">
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
