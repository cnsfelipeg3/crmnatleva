/**
 * Painel de Saúde dos Agentes
 * Health Score 0-100% por agente com 5 dimensões:
 * Identidade (20pts), Conhecimento (20pts), Skills (20pts), Workflow (20pts), Transferência (20pts)
 */
import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AGENTS_V4, SQUADS, type AgentV4 } from "@/components/ai-team/agentsV4Data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  HeartPulse, ChevronDown, ChevronUp, Wrench, CheckCircle2,
  AlertTriangle, XCircle, Shield, BookOpen, Wand2, GitBranch, MessageSquare,
  Loader2, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

// ═══ Types ═══
interface DimensionScore {
  score: number;
  max: number;
  details: { label: string; ok: boolean; points: number }[];
}

interface AgentHealth {
  agent: AgentV4;
  identity: DimensionScore;
  knowledge: DimensionScore;
  skills: DimensionScore;
  workflow: DimensionScore;
  transfer: DimensionScore;
  totalScore: number;
  totalMax: number;
  percent: number;
}

// ═══ Helpers ═══
const NATH_RULES_KEYWORDS = ["travessão", "tom de voz", "nath", "caloroso", "humano"];
const TRANSFER_VAGUE = ["quando achar adequado", "se necessário", "quando completar", "quando for hora"];
const MIN_TROCAS_AGENTS = ["maya", "atlas", "habibi", "nemo", "dante", "luna", "nero", "iris"];

function getHealthColor(percent: number) {
  if (percent >= 80) return { bg: "bg-emerald-500", text: "text-emerald-400", label: "Operacional", icon: CheckCircle2, border: "border-emerald-500/30" };
  if (percent >= 50) return { bg: "bg-amber-500", text: "text-amber-400", label: "Precisa atenção", icon: AlertTriangle, border: "border-amber-500/30" };
  return { bg: "bg-red-500", text: "text-red-400", label: "Crítico", icon: XCircle, border: "border-red-500/30" };
}

const DIM_META = [
  { key: "identity", label: "Identidade", icon: MessageSquare, color: "bg-purple-500" },
  { key: "knowledge", label: "Conhecimento", icon: BookOpen, color: "bg-blue-500" },
  { key: "skills", label: "Skills", icon: Wand2, color: "bg-emerald-500" },
  { key: "workflow", label: "Workflow", icon: GitBranch, color: "bg-amber-500" },
  { key: "transfer", label: "Transferência", icon: Shield, color: "bg-red-500" },
] as const;

// ═══ Score Calculator ═══
function calculateAgentHealth(
  agent: AgentV4,
  dbAgent: { behavior_prompt: string | null; persona: string | null; skills: string[] } | null,
  kbDocs: { title: string; content_text: string | null; category: string; tags: string[] | null }[],
  agentSkillAssignments: string[],
  skillDetails: { id: string; name: string; prompt_instruction: string | null; description: string | null }[],
  workflows: { id: string; agent_ids: string[]; steps: number }[],
  globalRules: { title: string; rule: string }[],
): AgentHealth {
  const prompt = dbAgent?.behavior_prompt || "";
  const persona = dbAgent?.persona || agent.persona || "";
  const fullPrompt = `${prompt} ${persona}`.toLowerCase();

  // 1. IDENTITY (20 pts)
  const identityDetails: DimensionScore["details"] = [];
  const hasName = !!agent.name && !!agent.role;
  identityDetails.push({ label: "Nome e papel definidos", ok: hasName, points: 5 });
  const hasPrompt = prompt.length > 100;
  identityDetails.push({ label: "Prompt com >100 chars", ok: hasPrompt, points: 10 });
  const hasTone = NATH_RULES_KEYWORDS.some(k => fullPrompt.includes(k));
  identityDetails.push({ label: "Menciona tom de voz", ok: hasTone, points: 5 });
  const identityScore = identityDetails.reduce((s, d) => s + (d.ok ? d.points : 0), 0);

  // 2. KNOWLEDGE (20 pts)
  const agentNameUpper = agent.name.toUpperCase();
  const agentKbDocs = kbDocs.filter(d => {
    const title = (d.title || "").toUpperCase();
    const tags = (d.tags || []).map(t => t.toUpperCase());
    const cat = (d.category || "").toLowerCase();
    return title.includes(agentNameUpper) || tags.includes(agentNameUpper) ||
           cat === "cultura" || cat === "atendimento" || cat === "regras";
  });
  const kbDetails: DimensionScore["details"] = [];
  const hasKb = agentKbDocs.length > 0;
  kbDetails.push({ label: "Pelo menos 1 item KB atribuído", ok: hasKb, points: 10 });
  const hasRealContent = agentKbDocs.some(d => (d.content_text || "").length > 50);
  kbDetails.push({ label: "KB com conteúdo real", ok: hasRealContent, points: 10 });
  const kbScore = kbDetails.reduce((s, d) => s + (d.ok ? d.points : 0), 0);

  // 3. SKILLS (20 pts)
  const activeSkills = skillDetails.filter(s => agentSkillAssignments.includes(s.id));
  const skillsDetails: DimensionScore["details"] = [];
  const hasActiveSkill = activeSkills.length > 0;
  skillsDetails.push({ label: "Pelo menos 1 skill ativa", ok: hasActiveSkill, points: 10 });
  const hasInstructions = activeSkills.some(s => (s.prompt_instruction || "").length > 50);
  skillsDetails.push({ label: "Skills com instruções >50 chars", ok: hasInstructions, points: 5 });
  const hasDescription = activeSkills.some(s => (s.description || "").length > 20);
  skillsDetails.push({ label: "Skills com descrição", ok: hasDescription, points: 5 });
  const skillsScore = skillsDetails.reduce((s, d) => s + (d.ok ? d.points : 0), 0);

  // 4. WORKFLOW (20 pts)
  const agentWorkflows = workflows.filter(w => w.agent_ids.includes(agent.id));
  const workflowDetails: DimensionScore["details"] = [];
  const hasWorkflow = agentWorkflows.length > 0;
  workflowDetails.push({ label: "Workflow definido", ok: hasWorkflow, points: 10 });
  const hasSteps = agentWorkflows.some(w => w.steps >= 3);
  workflowDetails.push({ label: "Workflow com ≥3 steps", ok: hasSteps, points: 5 });
  const hasTransferStep = fullPrompt.includes("transferir") || fullPrompt.includes("[transferir]");
  workflowDetails.push({ label: "Step de transferência com destino", ok: hasTransferStep, points: 5 });
  const workflowScore = workflowDetails.reduce((s, d) => s + (d.ok ? d.points : 0), 0);

  // 5. TRANSFER (20 pts)
  const transferDetails: DimensionScore["details"] = [];
  const hasTransferCondition = fullPrompt.includes("transferir") || fullPrompt.includes("handoff") || fullPrompt.includes("[transferir]");
  transferDetails.push({ label: "Condição de transferência", ok: hasTransferCondition, points: 10 });
  const noVague = !TRANSFER_VAGUE.some(v => fullPrompt.includes(v));
  transferDetails.push({ label: "Sem condições vagas", ok: noVague, points: 5 });
  const hasMinTrocas = fullPrompt.includes("trocas") || fullPrompt.includes("mínimo");
  transferDetails.push({ label: "Regra de mínimo de trocas", ok: hasMinTrocas, points: 5 });
  const transferScore = transferDetails.reduce((s, d) => s + (d.ok ? d.points : 0), 0);

  const totalScore = identityScore + kbScore + skillsScore + workflowScore + transferScore;
  const totalMax = 100;

  return {
    agent,
    identity: { score: identityScore, max: 20, details: identityDetails },
    knowledge: { score: kbScore, max: 20, details: kbDetails },
    skills: { score: skillsScore, max: 20, details: skillsDetails },
    workflow: { score: workflowScore, max: 20, details: workflowDetails },
    transfer: { score: transferScore, max: 20, details: transferDetails },
    totalScore,
    totalMax,
    percent: Math.round((totalScore / totalMax) * 100),
  };
}

// ═══ Component ═══
export default function AITeamSaude() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [autoFixOpen, setAutoFixOpen] = useState(false);
  const [fixing, setFixing] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all agent data from DB
  const { data: dbAgents = [] } = useQuery({
    queryKey: ["health_agents"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_team_agents").select("id, behavior_prompt, persona, skills");
      return data || [];
    },
  });

  // Fetch all KB docs
  const { data: kbDocs = [] } = useQuery({
    queryKey: ["health_kb"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_knowledge_base").select("title, content_text, category, tags").eq("is_active", true);
      return data || [];
    },
  });

  // Fetch all skill assignments
  const { data: skillAssignments = [] } = useQuery({
    queryKey: ["health_skill_assignments"],
    queryFn: async () => {
      const { data } = await supabase.from("agent_skill_assignments").select("agent_id, skill_id").eq("is_active", true);
      return data || [];
    },
  });

  // Fetch all skills
  const { data: allSkills = [] } = useQuery({
    queryKey: ["health_skills"],
    queryFn: async () => {
      const { data } = await supabase.from("agent_skills").select("id, name, prompt_instruction, description").eq("is_active", true);
      return data || [];
    },
  });

  // Fetch workflows (automation_flows with nodes)
  const { data: workflows = [] } = useQuery({
    queryKey: ["health_workflows"],
    queryFn: async () => {
      const { data: flows } = await supabase.from("automation_flows").select("id, status").eq("status", "active");
      if (!flows || flows.length === 0) return [];
      const flowIds = flows.map(f => f.id);
      const { data: nodes } = await supabase.from("automation_nodes").select("id, flow_id, type, config").in("flow_id", flowIds);
      return flows.map(f => {
        const fNodes = (nodes || []).filter(n => n.flow_id === f.id);
        const agentIds = fNodes.filter((n: any) => n.type === "ai_agent").map((n: any) => (n.config as any)?.agentId).filter(Boolean);
        return { id: f.id, agent_ids: agentIds as string[], steps: fNodes.length };
      });
    },
  });

  // Calculate health for all agents
  const healthData: AgentHealth[] = useMemo(() => {
    return AGENTS_V4.map(agent => {
      const dbAgent = dbAgents.find((a: any) => a.id === agent.id) || null;
      const agentAssignments = skillAssignments.filter((a: any) => a.agent_id === agent.id).map((a: any) => a.skill_id);
      return calculateAgentHealth(agent, dbAgent, kbDocs, agentAssignments, allSkills, workflows, []);
    });
  }, [dbAgents, kbDocs, skillAssignments, allSkills, workflows]);

  const globalScore = useMemo(() => {
    if (healthData.length === 0) return 0;
    return Math.round(healthData.reduce((s, h) => s + h.percent, 0) / healthData.length);
  }, [healthData]);

  const counts = useMemo(() => {
    const green = healthData.filter(h => h.percent >= 80).length;
    const yellow = healthData.filter(h => h.percent >= 50 && h.percent < 80).length;
    const red = healthData.filter(h => h.percent < 50).length;
    return { green, yellow, red };
  }, [healthData]);

  // Auto-fix: adds missing Nath rules + min trocas to agents that need it
  const autoFixPreview = useMemo(() => {
    const fixes: { agentId: string; agentName: string; fix: string }[] = [];
    for (const h of healthData) {
      const dbA = dbAgents.find((a: any) => a.id === h.agent.id);
      const prompt = (dbA?.behavior_prompt || "").toLowerCase();
      
      if (!NATH_RULES_KEYWORDS.some(k => prompt.includes(k))) {
        fixes.push({ agentId: h.agent.id, agentName: h.agent.name, fix: "Adicionar regras de tom de voz da Nath" });
      }
      if (MIN_TROCAS_AGENTS.includes(h.agent.id) && !prompt.includes("trocas")) {
        fixes.push({ agentId: h.agent.id, agentName: h.agent.name, fix: "Adicionar regra de mínimo de trocas" });
      }
      if (!prompt.includes("travessão") && !prompt.includes("tracess")) {
        fixes.push({ agentId: h.agent.id, agentName: h.agent.name, fix: "Adicionar regra anti-travessão" });
      }
    }
    return fixes;
  }, [healthData, dbAgents]);

  const handleAutoFix = useCallback(async () => {
    setFixing(true);
    let fixedCount = 0;
    
    const NATH_TONE_BLOCK = `\n\n--- REGRAS UNIVERSAIS DE COMUNICAÇÃO (NATH) ---
Fale como a Nath: caloroso, humano, próximo, genuíno.
NUNCA use travessão (—) em nenhuma mensagem.
Mensagens devem ser coerentes com o momento da conversa.
Não seja robótico. Não use frases genéricas de chatbot.
Use o nome do cliente quando souber.
Seja breve quando o momento pedir brevidade, e detalhado quando pedir detalhe.`;

    const MIN_TROCAS_BLOCK = `\n\nREGRA DE CONEXÃO: Você DEVE ter no mínimo 5 trocas reais de mensagem com o lead antes de considerar transferir. Conexão antes de dados. Acolhimento antes de qualificação.`;

    for (const h of healthData) {
      const dbA = dbAgents.find((a: any) => a.id === h.agent.id);
      const currentPrompt = dbA?.behavior_prompt || "";
      const lower = currentPrompt.toLowerCase();
      let additions = "";

      if (!NATH_RULES_KEYWORDS.some(k => lower.includes(k))) {
        additions += NATH_TONE_BLOCK;
      }
      if (!lower.includes("travessão") && !lower.includes("tracess")) {
        if (!additions.includes("travessão")) {
          additions += "\nNUNCA use travessão (—) em nenhuma mensagem.";
        }
      }
      if (MIN_TROCAS_AGENTS.includes(h.agent.id) && !lower.includes("trocas")) {
        additions += MIN_TROCAS_BLOCK;
      }

      if (additions) {
        const newPrompt = currentPrompt + additions;
        await supabase.from("ai_team_agents").update({ behavior_prompt: newPrompt, updated_at: new Date().toISOString() }).eq("id", h.agent.id);
        fixedCount++;
      }
    }

    setFixing(false);
    setAutoFixOpen(false);
    queryClient.invalidateQueries({ queryKey: ["health_agents"] });
    toast.success(`Auditoria concluída. ${fixedCount} agentes melhorados. Nenhum código existente foi alterado.`);
  }, [healthData, dbAgents, queryClient]);

  const globalColor = getHealthColor(globalScore);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-primary" />
            Saúde dos Agentes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Auditoria em tempo real de todos os 21 agentes do ecossistema
          </p>
        </div>
        <Button size="sm" onClick={() => setAutoFixOpen(true)} className="gap-1.5">
          <Wrench className="w-4 h-4" />
          Auto-Fix Suave
        </Button>
      </div>

      {/* Global Score */}
      <Card className={cn("border", globalColor.border)}>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className={cn("w-4 h-4 rounded-full", globalColor.bg)} />
              <div>
                <p className="text-sm text-muted-foreground">Saúde do ecossistema</p>
                <p className="text-3xl font-bold text-foreground">{globalScore}%</p>
              </div>
            </div>
            <div className="flex-1">
              <Progress value={globalScore} className="h-3" />
            </div>
          </div>
          <div className="flex gap-6 mt-4 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              {counts.green} operacionais
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              {counts.yellow} precisam atenção
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              {counts.red} críticos
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Agent Cards Grid */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {healthData
          .sort((a, b) => a.percent - b.percent) // worst first
          .map(h => {
            const color = getHealthColor(h.percent);
            const isExpanded = expanded === h.agent.id;
            const squad = SQUADS.find(s => s.id === h.agent.squadId);
            return (
              <Card
                key={h.agent.id}
                className={cn("cursor-pointer transition-all hover:shadow-md", isExpanded && "ring-1 ring-primary/30")}
                onClick={() => setExpanded(isExpanded ? null : h.agent.id)}
              >
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl">{h.agent.emoji}</span>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{h.agent.name}</h3>
                        <p className="text-[10px] text-muted-foreground truncate">{h.agent.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={cn("text-[10px]", color.text, color.border)}>
                        {h.percent}% · {color.label}
                      </Badge>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* 5-segment bar */}
                  <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                    {DIM_META.map(dim => {
                      const dimData = h[dim.key as keyof Pick<AgentHealth, "identity" | "knowledge" | "skills" | "workflow" | "transfer">];
                      const dimPercent = (dimData.score / dimData.max) * 100;
                      return (
                        <div
                          key={dim.key}
                          className={cn("flex-1 rounded-sm transition-colors", dimPercent >= 75 ? dim.color : dimPercent > 0 ? "bg-muted-foreground/20" : "bg-muted/40")}
                          title={`${dim.label}: ${dimData.score}/${dimData.max}`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1">
                    {DIM_META.map(dim => {
                      const dimData = h[dim.key as keyof Pick<AgentHealth, "identity" | "knowledge" | "skills" | "workflow" | "transfer">];
                      return (
                        <span key={dim.key} className="text-[9px] text-muted-foreground">
                          {dimData.score}/{dimData.max}
                        </span>
                      );
                    })}
                  </div>

                  {/* Squad badge */}
                  {squad && (
                    <div className="mt-2">
                      <Badge variant="secondary" className="text-[9px]">{squad.emoji} {squad.name}</Badge>
                    </div>
                  )}

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-4 space-y-3 border-t border-border/50 pt-3">
                      {DIM_META.map(dim => {
                        const dimData = h[dim.key as keyof Pick<AgentHealth, "identity" | "knowledge" | "skills" | "workflow" | "transfer">];
                        const DimIcon = dim.icon;
                        return (
                          <div key={dim.key}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <DimIcon className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs font-medium">{dim.label}</span>
                              <span className="text-[10px] text-muted-foreground ml-auto">{dimData.score}/{dimData.max}</span>
                            </div>
                            <div className="space-y-0.5 pl-5">
                              {dimData.details.map((d, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-[11px]">
                                  {d.ok ? (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                  ) : (
                                    <XCircle className="w-3 h-3 text-red-400 shrink-0" />
                                  )}
                                  <span className={d.ok ? "text-muted-foreground" : "text-red-400"}>
                                    {d.label} ({d.points}pts)
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Auto-Fix Dialog */}
      <Dialog open={autoFixOpen} onOpenChange={setAutoFixOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Auto-Fix Suave
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Serão adicionadas <strong>{autoFixPreview.length}</strong> melhorias em{" "}
              <strong>{new Set(autoFixPreview.map(f => f.agentId)).size}</strong> agentes.
              Nenhum código existente será alterado ou removido.
            </p>
            <div className="max-h-60 overflow-y-auto space-y-1.5">
              {autoFixPreview.map((fix, i) => (
                <div key={i} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/30">
                  <Wrench className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="font-medium">{fix.agentName}:</span>
                  <span className="text-muted-foreground">{fix.fix}</span>
                </div>
              ))}
              {autoFixPreview.length === 0 && (
                <p className="text-sm text-emerald-400 text-center py-4">
                  ✅ Todos os agentes já possuem as regras universais!
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAutoFixOpen(false)}>Cancelar</Button>
            <Button onClick={handleAutoFix} disabled={fixing || autoFixPreview.length === 0}>
              {fixing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Wrench className="w-4 h-4 mr-1" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
