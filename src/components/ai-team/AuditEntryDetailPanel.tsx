import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Bot, BookOpen, Shield, Wand2, GitBranch, Brain, Settings, FlaskConical,
  Zap, ZapOff, Plus, Pencil, Trash2, CheckCircle, Archive, Upload,
  Target, Layers, Users, FileText, AlertTriangle, Sparkles, Globe,
  ArrowRight, Clock, MapPin,
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

  // Primary area
  if (entityMeta) {
    areas.push({ area: entityMeta.area, detail: `${ACTION_LABEL[entry.action_type]?.label || "Alteração"} direta`, icon: entityMeta.icon });
  }

  // Affected agents
  const agents = d.agents_affected || d.agentsAffected || [];
  if (agents.length > 0) {
    areas.push({ area: "Prompts dos Agentes", detail: `Agentes afetados: ${agents.join(", ")}`, icon: Users });
  }

  // If it's a rule change
  if (entry.entity_type === "rule" || d.change_type === "prompt_addition") {
    areas.push({ area: "Sistema de Prompts", detail: d.position ? `Posição: ${d.position}` : "Injeção no prompt", icon: FileText });
  }

  // If it's a flow
  if (entry.entity_type === "flow") {
    areas.push({ area: "Pipeline de Automação", detail: "Fluxo de automação alterado", icon: GitBranch });
  }

  // If badge info
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

/* ═══ Sub-components ═══ */
function SummaryCard({ entry }: { entry: any }) {
  const summary = buildHumanSummary(entry);
  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Resumo da Mudança</h4>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed">{summary}</p>
    </div>
  );
}

function ImpactCard({ areas }: { areas: { area: string; detail: string; icon: typeof Bot }[] }) {
  if (areas.length === 0) return null;
  return (
    <div className="rounded-2xl bg-card/60 border border-border/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
          <Target className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Áreas Impactadas</h4>
        <Badge variant="secondary" className="text-[10px] ml-auto">{areas.length}</Badge>
      </div>
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
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-cyan-500/15 flex items-center justify-center">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Detalhes da Operação</h4>
      </div>
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

        {/* Impact areas */}
        <ImpactCard areas={impactAreas} />

        {/* Structured details grid */}
        {hasDetails && <DetailsGrid details={entry.details} />}

        {/* Metadata footer */}
        <MetadataFooter entry={entry} />
      </div>
    </motion.div>
  );
}
