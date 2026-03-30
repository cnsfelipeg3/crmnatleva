import { useMemo, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  Bot, BookOpen, Shield, Wand2, GitBranch, Brain, Settings, FlaskConical,
  Zap, ZapOff, Plus, Pencil, Trash2, CheckCircle, Archive, Upload,
  Target, Layers, Users, FileText, AlertTriangle, Sparkles, Globe,
  ArrowRight, Clock, MapPin, Database, Link2, Package, Info,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

/* ═══ Maps ═══ */
const ACTION_LABEL: Record<string, { label: string; verb: string; color: string }> = {
  create:     { label: "Criação",      verb: "criou",      color: "text-emerald-400" },
  update:     { label: "Edição",       verb: "editou",     color: "text-blue-400" },
  delete:     { label: "Exclusão",     verb: "excluiu",    color: "text-red-400" },
  approve:    { label: "Aprovação",    verb: "aprovou",    color: "text-violet-400" },
  archive:    { label: "Arquivamento", verb: "arquivou",   color: "text-amber-400" },
  import:     { label: "Importação",   verb: "importou",   color: "text-cyan-400" },
  activate:   { label: "Ativação",     verb: "ativou",     color: "text-emerald-400" },
  deactivate: { label: "Desativação",  verb: "desativou",  color: "text-slate-400" },
};

const ENTITY_LABEL: Record<string, { label: string; icon: typeof Bot; area: string }> = {
  improvement: { label: "Melhoria",       icon: Zap,          area: "Sistema de Melhorias" },
  knowledge:   { label: "Conhecimento",   icon: BookOpen,     area: "Base de Conhecimento" },
  rule:        { label: "Regra",          icon: Shield,       area: "Regras Estratégicas" },
  skill:       { label: "Skill",          icon: Wand2,        area: "Skills dos Agentes" },
  agent:       { label: "Agente",         icon: Bot,          area: "Equipe de Agentes" },
  mission:     { label: "Missão",         icon: Brain,        area: "Missões Operacionais" },
  flow:        { label: "Fluxo",          icon: GitBranch,    area: "Automação de Fluxos" },
  prompt:      { label: "Prompt",         icon: Settings,     area: "Configuração de Prompts" },
  lab_result:  { label: "Resultado Lab",  icon: FlaskConical, area: "Laboratório de Testes" },
  config:      { label: "Configuração",   icon: Settings,     area: "Configurações Gerais" },
};

const ENTITY_TABLE_MAP: Record<string, string> = {
  rule: "ai_strategy_knowledge",
  knowledge: "ai_knowledge_base",
  skill: "agent_skills",
  agent: "ai_team_agents",
  flow: "automation_flows",
  improvement: "ai_team_improvements",
  prompt: "ai_team_improvements",
  mission: "ai_team_missions",
  lab_result: "ai_team_lab_results",
  config: "ai_config",
};

/* ═══ Helpers ═══ */
function buildHumanSummary(entry: any): string {
  const action = ACTION_LABEL[entry.action_type] || { verb: "alterou" };
  const entity = ENTITY_LABEL[entry.entity_type] || { label: "item" };
  const name = entry.entity_name || "sem nome";
  const agent = entry.agent_name ? ` via agente ${entry.agent_name}` : "";
  const who = entry.performed_by || "Sistema";

  let summary = `${who} ${action.verb} ${entity.label.toLowerCase()} "${name}"${agent}.`;

  if (entry.description) {
    summary += ` ${entry.description}`;
  }

  return summary;
}

function extractImpactAreas(entry: any): { area: string; detail: string; icon: typeof Bot }[] {
  const areas: { area: string; detail: string; icon: typeof Bot }[] = [];
  const d = entry.details || {};
  const entityMeta = ENTITY_LABEL[entry.entity_type];

  if (entityMeta) {
    areas.push({ area: entityMeta.area, detail: `${ACTION_LABEL[entry.action_type]?.label || "Alteração"} direta`, icon: entityMeta.icon });
  }

  const agents = d.agents_affected || d.agentsAffected || [];
  if (agents.length > 0) {
    areas.push({ area: "Prompts dos Agentes", detail: `Agentes afetados: ${agents.join(", ")}`, icon: Users });
  }

  if (entry.entity_type === "rule" || d.change_type === "prompt_addition") {
    areas.push({ area: "Sistema de Prompts", detail: d.position ? `Posição: ${d.position}` : "Injeção no prompt", icon: FileText });
  }

  if (entry.entity_type === "flow") {
    areas.push({ area: "Pipeline de Automação", detail: "Fluxo de automação alterado", icon: GitBranch });
  }

  if (d.badge) {
    areas.push({ area: "Badges & Categorização", detail: `Badge: ${d.badge}`, icon: Target });
  }

  return areas;
}

function extractKeyValuePairs(details: Record<string, any>): { key: string; value: string }[] {
  if (!details) return [];
  const LABEL_MAP: Record<string, string> = {
    badge: "Badge",
    position: "Posição no Prompt",
    change_type: "Tipo de Mudança",
    agents_affected: "Agentes Afetados",
    agentsAffected: "Agentes Afetados",
    category: "Categoria",
    priority: "Prioridade",
    impact: "Impacto Estimado",
    estimated_impact: "Impacto Estimado",
    function_area: "Área Funcional",
    source: "Origem",
    rule_text: "Texto da Regra",
    old_value: "Valor Anterior",
    new_value: "Novo Valor",
    confidence: "Confiança",
    level: "Nível",
    status: "Status",
  };

  return Object.entries(details)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => ({
      key: LABEL_MAP[k] || k.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
      value: Array.isArray(v) ? v.join(", ") : String(v),
    }));
}

/* ═══ Hook: fetch related entity data ═══ */
interface RelatedData {
  entity: any | null;
  skills: any[];
  rules: any[];
  knowledge: any[];
  skillAssignments: any[];
  loading: boolean;
}

function useRelatedData(entry: any): RelatedData {
  const [state, setState] = useState<RelatedData>({
    entity: null, skills: [], rules: [], knowledge: [], skillAssignments: [], loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setState(s => ({ ...s, loading: true }));
      const result: RelatedData = { entity: null, skills: [], rules: [], knowledge: [], skillAssignments: [], loading: false };

      try {
        const table = ENTITY_TABLE_MAP[entry.entity_type];
        const entityId = entry.entity_id;

        // 1. Fetch the entity itself if it still exists
        if (table && entityId) {
          const { data } = await (supabase.from(table as any) as any).select("*").eq("id", entityId).maybeSingle();
          result.entity = data;
        }

        // 2. If it's a skill, fetch agent assignments
        if (entry.entity_type === "skill" && entityId) {
          const { data } = await (supabase.from("agent_skill_assignments") as any)
            .select("*, agent:ai_team_agents(id, name, emoji)")
            .eq("skill_id", entityId);
          result.skillAssignments = data || [];
        }

        // 3. If it's an agent, fetch its skills, rules & knowledge stats
        if (entry.entity_type === "agent" && entityId) {
          const [skillsRes, assignmentsRes] = await Promise.all([
            (supabase.from("agent_skill_assignments") as any).select("*, skill:agent_skills(id, name, category, level)").eq("agent_id", entityId),
            (supabase.from("ai_team_improvements") as any).select("id, title, category, status").eq("agent_id", entityId).limit(10),
          ]);
          result.skills = skillsRes.data || [];
          result.skillAssignments = assignmentsRes.data || [];
        }

        // 4. If it's a rule, check related rules
        if (entry.entity_type === "rule" && result.entity?.related_rule_ids?.length) {
          const { data } = await (supabase.from("ai_strategy_knowledge") as any)
            .select("id, title, category, is_active")
            .in("id", result.entity.related_rule_ids);
          result.rules = data || [];
        }

        // 5. For any entry with agent_id, fetch that agent
        if (entry.agent_id && entry.entity_type !== "agent") {
          const { data } = await (supabase.from("ai_team_agents") as any)
            .select("id, name, emoji, role, status, skills")
            .eq("id", entry.agent_id)
            .maybeSingle();
          if (data && !result.entity?.agent) {
            result.entity = { ...result.entity, _linkedAgent: data };
          }
        }

      } catch (err) {
        console.warn("[AuditDetail] fetch error:", err);
      }

      if (!cancelled) setState(result);
    }
    load();
    return () => { cancelled = true; };
  }, [entry.id]);

  return state;
}

/* ═══ Sub-components ═══ */

function SectionHeader({ icon: Icon, title, count, colorClass }: { icon: typeof Bot; title: string; count?: number; colorClass: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", colorClass)}>
        <Icon className="w-3.5 h-3.5 text-inherit" />
      </div>
      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">{title}</h4>
      {count !== undefined && <Badge variant="secondary" className="text-[10px] ml-auto">{count}</Badge>}
    </div>
  );
}

function SummaryCard({ entry }: { entry: any }) {
  const summary = buildHumanSummary(entry);
  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 p-4 space-y-2">
      <SectionHeader icon={Sparkles} title="Resumo da Mudança" colorClass="bg-primary/15 text-primary" />
      <p className="text-sm text-foreground/80 leading-relaxed">{summary}</p>
    </div>
  );
}

function EntitySnapshotCard({ entity, entityType }: { entity: any; entityType: string }) {
  if (!entity) return null;

  const fields: { label: string; value: string | null }[] = [];

  if (entityType === "rule") {
    fields.push(
      { label: "Regra Completa", value: entity.rule },
      { label: "Categoria", value: entity.category },
      { label: "Subcategoria", value: entity.subcategory },
      { label: "Área Funcional", value: entity.function_area },
      { label: "Prioridade", value: entity.priority?.toString() },
      { label: "Impacto Estimado", value: entity.estimated_impact },
      { label: "Origem", value: entity.origin_type },
      { label: "Contexto", value: entity.context },
      { label: "Exemplo de Uso", value: entity.example },
      { label: "Ativa", value: entity.is_active ? "✅ Sim" : "❌ Não" },
    );
  } else if (entityType === "skill") {
    fields.push(
      { label: "Instrução do Prompt", value: entity.prompt_instruction },
      { label: "Categoria", value: entity.category },
      { label: "Nível", value: entity.level },
      { label: "Descrição", value: entity.description },
      { label: "Origem", value: entity.source },
      { label: "Ativa", value: entity.is_active ? "✅ Sim" : "❌ Não" },
    );
  } else if (entityType === "knowledge") {
    fields.push(
      { label: "Conteúdo Texto", value: entity.content_text?.slice(0, 500) },
      { label: "Categoria", value: entity.category },
      { label: "Descrição", value: entity.description },
      { label: "Tags", value: entity.tags?.join(", ") },
      { label: "Confiança", value: entity.confidence?.toString() },
      { label: "Tipo de Arquivo", value: entity.file_type },
      { label: "Ativa", value: entity.is_active ? "✅ Sim" : "❌ Não" },
    );
  } else if (entityType === "agent") {
    fields.push(
      { label: "Persona", value: entity.persona },
      { label: "Role", value: entity.role },
      { label: "Squad", value: entity.squad_id },
      { label: "Status", value: entity.status },
      { label: "Skills Nativas", value: entity.skills?.join(", ") },
      { label: "Behavior Prompt", value: entity.behavior_prompt?.slice(0, 400) },
      { label: "Nível / XP", value: `Nível ${entity.level} (${entity.xp}/${entity.max_xp} XP)` },
      { label: "Ativo", value: entity.is_active ? "✅ Sim" : "❌ Não" },
    );
  } else if (entityType === "flow") {
    fields.push(
      { label: "Descrição", value: entity.description },
      { label: "Status", value: entity.status },
      { label: "Versão", value: entity.version?.toString() },
      { label: "Template", value: entity.is_template ? "Sim" : "Não" },
    );
  } else if (entityType === "improvement" || entityType === "prompt") {
    fields.push(
      { label: "Descrição", value: entity.description },
      { label: "Categoria", value: entity.category },
      { label: "Status", value: entity.status },
      { label: "Score de Impacto", value: entity.impact_score?.toString() },
    );
  } else if (entityType === "mission") {
    fields.push(
      { label: "Descrição", value: entity.description },
      { label: "Prioridade", value: entity.priority },
      { label: "Status", value: entity.status },
      { label: "XP de Recompensa", value: entity.xp_reward?.toString() },
      { label: "Contexto", value: entity.context },
    );
  }

  const validFields = fields.filter(f => f.value && f.value !== "null" && f.value !== "undefined");
  if (validFields.length === 0) return null;

  const entityMeta = ENTITY_LABEL[entityType];

  return (
    <div className="rounded-2xl bg-gradient-to-br from-violet-500/5 to-cyan-500/5 border border-violet-500/10 p-4 space-y-3">
      <SectionHeader
        icon={entityMeta?.icon || Database}
        title={`Conteúdo Completo: ${entityMeta?.label || entityType}`}
        colorClass="bg-violet-500/15 text-violet-400"
      />
      <div className="space-y-2">
        {validFields.map((f, i) => (
          <div key={i} className="rounded-xl bg-card/40 border border-border/10 px-3 py-2.5">
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold">{f.label}</p>
            <p className="text-xs text-foreground mt-0.5 break-words leading-relaxed whitespace-pre-wrap">{f.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkillAssignmentsCard({ assignments }: { assignments: any[] }) {
  if (!assignments || assignments.length === 0) return null;
  return (
    <div className="rounded-2xl bg-card/60 border border-border/20 p-4 space-y-3">
      <SectionHeader icon={Link2} title="Agentes com esta Skill" count={assignments.length} colorClass="bg-violet-500/15 text-violet-400" />
      <div className="flex flex-wrap gap-2">
        {assignments.map((a: any, i: number) => {
          const agent = a.agent || a;
          return (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-muted/10 border border-border/10 px-3 py-2">
              <span className="text-base">{agent.emoji || "🤖"}</span>
              <span className="text-xs font-medium text-foreground">{agent.name || agent.agent_id}</span>
              <Badge variant={a.is_active ? "default" : "secondary"} className="text-[9px]">
                {a.is_active ? "Ativa" : "Inativa"}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgentSkillsCard({ skills }: { skills: any[] }) {
  if (!skills || skills.length === 0) return null;
  return (
    <div className="rounded-2xl bg-card/60 border border-border/20 p-4 space-y-3">
      <SectionHeader icon={Wand2} title="Skills deste Agente" count={skills.length} colorClass="bg-emerald-500/15 text-emerald-400" />
      <div className="flex flex-wrap gap-2">
        {skills.map((s: any, i: number) => {
          const skill = s.skill || s;
          return (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-muted/10 border border-border/10 px-3 py-2">
              <Wand2 className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-xs font-medium text-foreground">{skill.name || skill.id}</span>
              {skill.category && <Badge variant="secondary" className="text-[9px]">{skill.category}</Badge>}
              {skill.level && <Badge variant="outline" className="text-[9px]">{skill.level}</Badge>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RelatedRulesCard({ rules }: { rules: any[] }) {
  if (!rules || rules.length === 0) return null;
  return (
    <div className="rounded-2xl bg-card/60 border border-border/20 p-4 space-y-3">
      <SectionHeader icon={Shield} title="Regras Relacionadas" count={rules.length} colorClass="bg-rose-500/15 text-rose-400" />
      <div className="space-y-2">
        {rules.map((r: any, i: number) => (
          <div key={i} className="flex items-center gap-3 rounded-xl bg-muted/10 border border-border/10 px-3 py-2.5">
            <Shield className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">{r.title}</p>
              <p className="text-[10px] text-muted-foreground">{r.category} · {r.is_active ? "Ativa" : "Inativa"}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LinkedAgentCard({ agent }: { agent: any }) {
  if (!agent) return null;
  return (
    <div className="rounded-2xl bg-card/60 border border-border/20 p-4 space-y-3">
      <SectionHeader icon={Bot} title="Agente Vinculado" colorClass="bg-emerald-500/15 text-emerald-400" />
      <div className="flex items-center gap-3 rounded-xl bg-muted/10 border border-border/10 px-3 py-3">
        <span className="text-2xl">{agent.emoji || "🤖"}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{agent.name}</p>
          <p className="text-[11px] text-muted-foreground">{agent.role} · {agent.status}</p>
          {agent.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {agent.skills.slice(0, 6).map((s: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-[9px]">{s}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EntityNotFoundCard({ entityType, entityId, actionType }: { entityType: string; entityId?: string; actionType: string }) {
  const meta = ENTITY_LABEL[entityType];
  const isDelete = actionType === "delete";
  return (
    <div className="rounded-2xl bg-red-500/5 border border-red-500/10 p-4 space-y-2">
      <SectionHeader icon={isDelete ? Trash2 : AlertTriangle} title={isDelete ? "Registro Excluído" : "Registro Não Encontrado"} colorClass="bg-red-500/15 text-red-400" />
      <p className="text-xs text-muted-foreground leading-relaxed">
        {isDelete
          ? `Este(a) ${meta?.label.toLowerCase() || "item"} foi excluído(a) do sistema. Os dados originais não estão mais disponíveis no banco.`
          : `O registro de ${meta?.label.toLowerCase() || "item"} (${entityId?.slice(0, 8) || "?"}) não foi encontrado. Pode ter sido removido ou alterado.`}
      </p>
    </div>
  );
}

function UndoImpactCard({ entry, entity }: { entry: any; entity: any }) {
  const items: { label: string; detail: string; icon: typeof Bot; severity: "safe" | "warn" | "danger" }[] = [];

  if (entry.action_type === "create") {
    const meta = ENTITY_LABEL[entry.entity_type];
    items.push({
      label: `${meta?.label || "Item"} será excluído(a)`,
      detail: `"${entry.entity_name}" será removido(a) de "${meta?.area || "sistema"}"`,
      icon: Trash2,
      severity: "danger",
    });

    if (entry.entity_type === "skill" && entity) {
      items.push({
        label: "Atribuições de agentes removidas",
        detail: "Todas as atribuições desta skill a agentes serão desvinculadas",
        icon: Link2,
        severity: "warn",
      });
    }

    if (entry.entity_type === "rule") {
      const agents = entry.details?.agents_affected || entry.details?.agentsAffected || [];
      if (agents.length > 0) {
        items.push({
          label: "Regra removida dos prompts",
          detail: `Agentes afetados: ${agents.join(", ")}`,
          icon: Users,
          severity: "warn",
        });
      }
    }

    if (entry.entity_type === "flow") {
      items.push({
        label: "Nós e arestas do fluxo removidos",
        detail: "Todos os componentes do fluxo e histórico de execuções serão limpos",
        icon: GitBranch,
        severity: "danger",
      });
    }
  } else if (entry.action_type === "activate") {
    items.push({ label: "Será desativado", detail: `"${entry.entity_name}" voltará ao estado inativo`, icon: ZapOff, severity: "warn" });
  } else if (entry.action_type === "deactivate") {
    items.push({ label: "Será reativado", detail: `"${entry.entity_name}" voltará ao estado ativo`, icon: Zap, severity: "safe" });
  } else if (entry.action_type === "update") {
    items.push({
      label: "Reversão de edição",
      detail: entry.details?.old_value ? "O valor anterior será restaurado" : "Reversão parcial — o valor anterior pode não estar 100% armazenado no log",
      icon: Info,
      severity: entry.details?.old_value ? "safe" : "warn",
    });
  }

  if (items.length === 0) return null;

  const severityBg = { safe: "bg-emerald-500/10 border-emerald-500/10", warn: "bg-amber-500/10 border-amber-500/10", danger: "bg-red-500/10 border-red-500/10" };
  const severityText = { safe: "text-emerald-400", warn: "text-amber-400", danger: "text-red-400" };

  return (
    <div className="rounded-2xl bg-card/60 border border-border/20 p-4 space-y-3">
      <SectionHeader icon={AlertTriangle} title="Impacto ao Desfazer" count={items.length} colorClass="bg-amber-500/15 text-amber-400" />
      <div className="space-y-2">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className={cn("flex items-start gap-3 rounded-xl border p-3", severityBg[item.severity])}>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", `bg-${item.severity === "danger" ? "red" : item.severity === "warn" ? "amber" : "emerald"}-500/15`)}>
                <Icon className={cn("w-4 h-4", severityText[item.severity])} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">{item.label}</p>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{item.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ImpactCard({ areas }: { areas: { area: string; detail: string; icon: typeof Bot }[] }) {
  if (areas.length === 0) return null;
  return (
    <div className="rounded-2xl bg-card/60 border border-border/20 p-4 space-y-3">
      <SectionHeader icon={Target} title="Áreas Impactadas" count={areas.length} colorClass="bg-amber-500/15 text-amber-400" />
      <div className="space-y-2">
        {areas.map((a, i) => {
          const Icon = a.icon;
          return (
            <div key={i} className="flex items-start gap-3 rounded-xl bg-muted/15 border border-border/10 p-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/10 to-cyan-500/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-violet-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">{a.area}</p>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{a.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailsGrid({ details }: { details: Record<string, any> }) {
  const pairs = extractKeyValuePairs(details);
  if (pairs.length === 0) return null;
  return (
    <div className="rounded-2xl bg-card/60 border border-border/20 p-4 space-y-3">
      <SectionHeader icon={Layers} title="Detalhes da Operação" colorClass="bg-cyan-500/15 text-cyan-400" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {pairs.map((p, i) => (
          <div key={i} className="rounded-xl bg-muted/10 border border-border/10 px-3 py-2.5">
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold">{p.key}</p>
            <p className="text-xs text-foreground mt-0.5 break-words leading-relaxed">{p.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetadataFooter({ entry }: { entry: any }) {
  return (
    <div className="rounded-2xl bg-muted/10 border border-border/10 p-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground/50">
      <span className="flex items-center gap-1.5 font-mono">
        <Clock className="w-3 h-3" />
        {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
      </span>
      {entry.performed_by && (
        <span className="flex items-center gap-1.5">
          <Users className="w-3 h-3" />
          {entry.performed_by}
        </span>
      )}
      {entry.agent_name && (
        <span className="flex items-center gap-1.5 text-emerald-400/70">
          <Bot className="w-3 h-3" />
          {entry.agent_name}
        </span>
      )}
      {entry.approved_by && (
        <span className="flex items-center gap-1.5 text-violet-400/70">
          <CheckCircle className="w-3 h-3" />
          Aprovado por {entry.approved_by}
        </span>
      )}
      {entry.entity_id && (
        <span className="flex items-center gap-1.5 font-mono text-[10px] opacity-40">
          ID: {entry.entity_id.slice(0, 8)}…
        </span>
      )}
    </div>
  );
}

/* ═══ Main Panel ═══ */
export default function AuditEntryDetailPanel({ entry }: { entry: any }) {
  const impactAreas = useMemo(() => extractImpactAreas(entry), [entry]);
  const hasDetails = entry.details && Object.keys(entry.details).length > 0;
  const related = useRelatedData(entry);

  const linkedAgent = related.entity?._linkedAgent || null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
    >
      <div className="px-4 pb-4 pt-1 space-y-3">
        {/* Human-readable summary */}
        <SummaryCard entry={entry} />

        {/* Loading indicator */}
        {related.loading && (
          <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
            <Database className="w-3.5 h-3.5 animate-pulse" />
            Carregando dados completos do banco...
          </div>
        )}

        {/* Entity full snapshot (rule text, skill instruction, etc.) */}
        {!related.loading && related.entity && (
          <EntitySnapshotCard entity={related.entity} entityType={entry.entity_type} />
        )}

        {/* Entity not found */}
        {!related.loading && !related.entity && entry.entity_id && (
          <EntityNotFoundCard entityType={entry.entity_type} entityId={entry.entity_id} actionType={entry.action_type} />
        )}

        {/* Linked agent */}
        {!related.loading && linkedAgent && <LinkedAgentCard agent={linkedAgent} />}

        {/* Skill assignments */}
        {!related.loading && entry.entity_type === "skill" && (
          <SkillAssignmentsCard assignments={related.skillAssignments} />
        )}

        {/* Agent's skills */}
        {!related.loading && entry.entity_type === "agent" && (
          <AgentSkillsCard skills={related.skills} />
        )}

        {/* Related rules */}
        {!related.loading && related.rules.length > 0 && (
          <RelatedRulesCard rules={related.rules} />
        )}

        {/* Impact areas */}
        <ImpactCard areas={impactAreas} />

        {/* Undo impact preview */}
        {!related.loading && (
          <UndoImpactCard entry={entry} entity={related.entity} />
        )}

        {/* Structured details grid */}
        {hasDetails && <DetailsGrid details={entry.details} />}

        {/* Metadata footer */}
        <MetadataFooter entry={entry} />
      </div>
    </motion.div>
  );
}
