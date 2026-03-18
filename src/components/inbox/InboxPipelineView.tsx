import { useMemo, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import {
  Users, Star, Clock, MessageSquare, TrendingUp, DollarSign,
  Filter, AlertTriangle, Flame, Snowflake, Eye, Timer,
  Zap, Target, ArrowRight, BarChart3, Activity, Search,
  ChevronDown, ChevronUp, Phone, MapPin, Plane, Info,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// ─── Stage Descriptions ───
const STAGE_DESCRIPTIONS: Record<Stage, { title: string; desc: string; tip: string }> = {
  novo_lead: { title: "Novo Lead", desc: "Contato acabou de chegar. Ainda não houve nenhuma interação da equipe.", tip: "💡 Responda em até 5 min para maximizar conversão." },
  contato_inicial: { title: "Contato Inicial", desc: "Primeiro contato foi feito. Estamos entendendo o que o cliente precisa.", tip: "💡 Faça perguntas abertas para mapear o perfil." },
  qualificacao: { title: "Qualificação", desc: "Avaliando se o lead tem perfil, orçamento e timing para fechar.", tip: "💡 Confirme destino, datas, número de passageiros e faixa de investimento." },
  diagnostico: { title: "Diagnóstico", desc: "Entendendo em profundidade as preferências e necessidades do viajante.", tip: "💡 Descubra motivações, estilo de viagem e experiências anteriores." },
  proposta_preparacao: { title: "Estruturação", desc: "Montando o roteiro, cotando voos, hotéis e experiências.", tip: "💡 O cliente está em espera — envie atualizações de progresso." },
  proposta_enviada: { title: "Proposta Enviada", desc: "A proposta foi enviada e aguardamos o retorno do cliente.", tip: "💡 Faça follow-up em 24-48h se não houver resposta." },
  proposta_visualizada: { title: "Visualizada", desc: "O cliente abriu e visualizou a proposta. Momento crítico!", tip: "💡 Entre em contato agora — o interesse está fresco." },
  ajustes: { title: "Ajustes", desc: "O cliente pediu alterações no roteiro ou valores.", tip: "💡 Seja ágil nas alterações para não perder o momentum." },
  negociacao: { title: "Negociação", desc: "Discutindo valores, condições de pagamento e detalhes finais.", tip: "💡 Ofereça opções e mostre o valor agregado." },
  fechamento_andamento: { title: "Fechando", desc: "Cliente confirmou! Finalizando contrato e pagamento.", tip: "💡 Confirme todos os dados antes de emitir." },
  fechado: { title: "Fechado ✓", desc: "Venda concluída com sucesso. Parabéns! 🎉", tip: "💡 Envie boas-vindas e inicie o pós-venda." },
  pos_venda: { title: "Pós-Venda", desc: "Acompanhamento pós-viagem: feedback, fidelização e indicações.", tip: "💡 Peça avaliação e ofereça a próxima viagem." },
  perdido: { title: "Perdido", desc: "Lead não converteu. Registre o motivo para aprendizado.", tip: "💡 Revise periodicamente — leads perdidos podem voltar." },
};
import { cn } from "@/lib/utils";

// ─── Types ───
type Stage = "novo_lead" | "contato_inicial" | "qualificacao" | "diagnostico" | "proposta_preparacao" | "proposta_enviada" | "proposta_visualizada" | "ajustes" | "negociacao" | "fechamento_andamento" | "fechado" | "pos_venda" | "perdido";

interface PipelineConversation {
  id: string;
  db_id?: string;
  phone: string;
  contact_name: string;
  stage: string;
  tags: string[];
  source?: string;
  last_message_at: string;
  last_message_preview: string;
  unread_count: number;
  is_vip: boolean;
  assigned_to: string;
  score_potential?: number;
  score_risk?: number;
  stage_entered_at?: string;
  engagement_level?: string;
  close_score?: number;
  proposal_value?: number;
  estimated_margin?: number;
  last_response_at?: string;
  interaction_count?: number;
  auto_tags?: string[];
  proposal_viewed_at?: string;
  created_at?: string;
  [key: string]: any;
}

// ─── Pipeline Columns ───
const PIPELINE_COLUMNS: { key: Stage; label: string; emoji: string; color: string; bg: string; gradient: string }[] = [
  { key: "novo_lead", label: "Novo Lead", emoji: "🆕", color: "border-t-blue-500", bg: "bg-blue-500/10", gradient: "from-blue-500/20 to-blue-500/5" },
  { key: "contato_inicial", label: "Contato Inicial", emoji: "👋", color: "border-t-sky-500", bg: "bg-sky-500/10", gradient: "from-sky-500/20 to-sky-500/5" },
  { key: "qualificacao", label: "Qualificação", emoji: "🔍", color: "border-t-amber-500", bg: "bg-amber-500/10", gradient: "from-amber-500/20 to-amber-500/5" },
  { key: "diagnostico", label: "Diagnóstico", emoji: "🧠", color: "border-t-yellow-500", bg: "bg-yellow-500/10", gradient: "from-yellow-500/20 to-yellow-500/5" },
  { key: "proposta_preparacao", label: "Estruturação", emoji: "📋", color: "border-t-orange-500", bg: "bg-orange-500/10", gradient: "from-orange-500/20 to-orange-500/5" },
  { key: "proposta_enviada", label: "Proposta Enviada", emoji: "📩", color: "border-t-purple-500", bg: "bg-purple-500/10", gradient: "from-purple-500/20 to-purple-500/5" },
  { key: "proposta_visualizada", label: "Visualizada", emoji: "👀", color: "border-t-violet-500", bg: "bg-violet-500/10", gradient: "from-violet-500/20 to-violet-500/5" },
  { key: "ajustes", label: "Ajustes", emoji: "🔧", color: "border-t-pink-500", bg: "bg-pink-500/10", gradient: "from-pink-500/20 to-pink-500/5" },
  { key: "negociacao", label: "Negociação", emoji: "🤝", color: "border-t-primary", bg: "bg-primary/10", gradient: "from-primary/20 to-primary/5" },
  { key: "fechamento_andamento", label: "Fechando", emoji: "🔥", color: "border-t-rose-500", bg: "bg-rose-500/10", gradient: "from-rose-500/20 to-rose-500/5" },
  { key: "fechado", label: "Fechado", emoji: "✅", color: "border-t-emerald-500", bg: "bg-emerald-500/10", gradient: "from-emerald-500/20 to-emerald-500/5" },
  { key: "pos_venda", label: "Pós-Venda", emoji: "🎯", color: "border-t-teal-500", bg: "bg-teal-500/10", gradient: "from-teal-500/20 to-teal-500/5" },
  { key: "perdido", label: "Perdido", emoji: "❌", color: "border-t-destructive", bg: "bg-destructive/10", gradient: "from-destructive/20 to-destructive/5" },
];

// ─── Smart Tags Engine ───
function computeAutoTags(lead: PipelineConversation): string[] {
  const tags: string[] = [];
  const now = Date.now();
  const lastMsg = lead.last_message_at ? new Date(lead.last_message_at).getTime() : 0;
  const hoursSinceLastMsg = lastMsg ? (now - lastMsg) / 3600000 : Infinity;
  const lastResponse = lead.last_response_at ? new Date(lead.last_response_at).getTime() : 0;
  const hoursSinceResponse = lastResponse ? (now - lastResponse) / 3600000 : Infinity;

  if (hoursSinceLastMsg < 2 && (lead.close_score || 0) >= 60) tags.push("🔥 Lead quente");
  else if (hoursSinceLastMsg > 24 && hoursSinceLastMsg < 72) tags.push("❄️ Esfriando");
  if (hoursSinceLastMsg > 48) tags.push("🚫 Parado >48h");
  if ((lead.interaction_count || 0) > 20) tags.push("💬 Alta interação");
  if (hoursSinceResponse > 24 && lead.unread_count > 0) tags.push("🕐 Demora a responder");
  if (lead.proposal_viewed_at) tags.push("👀 Proposta vista");
  if ((lead.close_score || 0) >= 80) tags.push("🎯 Alta prob. fechamento");
  if (lead.is_vip) tags.push("⭐ VIP");
  return tags;
}

function getUrgencyColor(lead: PipelineConversation): string {
  const now = Date.now();
  const lastMsg = lead.last_message_at ? new Date(lead.last_message_at).getTime() : 0;
  const hours = lastMsg ? (now - lastMsg) / 3600000 : Infinity;
  const score = lead.close_score || 0;
  if (score >= 70 && hours < 4) return "border-l-emerald-500";
  if (hours > 48) return "border-l-destructive";
  if (hours > 24) return "border-l-amber-500";
  return "border-l-transparent";
}

function getScoreColor(score: number): string {
  if (score >= 70) return "text-emerald-600 bg-emerald-500/10";
  if (score >= 40) return "text-amber-600 bg-amber-500/10";
  return "text-muted-foreground bg-muted/50";
}

function getScoreBarColor(score: number): string {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-muted-foreground/30";
}

function timeSince(dateStr: string): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Agora";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}sem`;
}

function formatCurrency(value: number): string {
  if (!value) return "";
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return `R$ ${value.toFixed(0)}`;
}

function formatPhoneShort(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  if (clean.startsWith("55") && clean.length >= 12) {
    const ddd = clean.slice(2, 4);
    const rest = clean.slice(4);
    return `(${ddd}) ${rest.slice(-4)}`;
  }
  return phone.slice(-8);
}

function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-500/15 text-blue-700",
  "bg-purple-500/15 text-purple-700",
  "bg-emerald-500/15 text-emerald-700",
  "bg-amber-500/15 text-amber-700",
  "bg-rose-500/15 text-rose-700",
  "bg-teal-500/15 text-teal-700",
  "bg-indigo-500/15 text-indigo-700",
  "bg-orange-500/15 text-orange-700",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Props ───
interface InboxPipelineViewProps {
  conversations: PipelineConversation[];
  onSelectConversation: (id: string) => void;
  onSwitchToChat: () => void;
}

export function InboxPipelineView({ conversations, onSelectConversation, onSwitchToChat }: InboxPipelineViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [filterScore, setFilterScore] = useState<string>("all");
  const [collapsedCols, setCollapsedCols] = useState<Set<string>>(new Set());

  const toggleCollapse = useCallback((key: string) => {
    setCollapsedCols(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  // Enrich conversations with auto tags
  const enrichedConversations = useMemo(() => {
    return conversations.map(c => ({
      ...c,
      _autoTags: computeAutoTags(c),
      _allTags: [...(c.auto_tags || []), ...(c.tags || [])],
    }));
  }, [conversations]);

  // Filter
  const filteredConversations = useMemo(() => {
    return enrichedConversations.filter(c => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const name = (c.contact_name || "").toLowerCase();
        const phone = c.phone || "";
        if (!name.includes(q) && !phone.includes(q)) return false;
      }
      if (filterTag !== "all") {
        const allTags = [...c._autoTags, ...c._allTags, ...(c.tags || [])];
        if (filterTag === "hot" && !allTags.some(t => t.includes("quente"))) return false;
        if (filterTag === "stalled" && !allTags.some(t => t.includes("Parado"))) return false;
        if (filterTag === "vip" && !c.is_vip) return false;
        if (filterTag === "viewed" && !c.proposal_viewed_at) return false;
      }
      if (filterScore !== "all") {
        const score = c.close_score || 0;
        if (filterScore === "high" && score < 70) return false;
        if (filterScore === "medium" && (score < 40 || score >= 70)) return false;
        if (filterScore === "low" && score >= 40) return false;
      }
      return true;
    });
  }, [enrichedConversations, searchQuery, filterTag, filterScore]);

  // Column data
  const columns = useMemo(() => {
    return PIPELINE_COLUMNS.map(col => {
      const leads = filteredConversations.filter(c => (c.stage || "novo_lead") === col.key);
      const unread = leads.reduce((s, l) => s + l.unread_count, 0);
      const totalValue = leads.reduce((s, l) => s + (l.proposal_value || 0), 0);
      const weightedValue = leads.reduce((s, l) => s + (l.proposal_value || 0) * ((l.close_score || 0) / 100), 0);
      const avgScore = leads.length > 0 ? Math.round(leads.reduce((s, l) => s + (l.close_score || 0), 0) / leads.length) : 0;
      return { ...col, leads, count: leads.length, unread, totalValue, weightedValue, avgScore };
    });
  }, [filteredConversations]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filteredConversations.length;
    const closedCount = columns.find(c => c.key === "fechado")?.count || 0;
    const lostCount = columns.find(c => c.key === "perdido")?.count || 0;
    const active = total - closedCount - lostCount;
    const conversion = total > 0 ? ((closedCount / total) * 100).toFixed(1) : "0";
    const totalValue = filteredConversations.reduce((s, c) => s + (c.proposal_value || 0), 0);
    const weightedValue = filteredConversations.reduce((s, c) => s + (c.proposal_value || 0) * ((c.close_score || 0) / 100), 0);
    const totalUnread = filteredConversations.reduce((s, c) => s + c.unread_count, 0);
    const avgTicket = closedCount > 0 ? totalValue / closedCount : 0;
    const hotLeads = filteredConversations.filter(c => (c.close_score || 0) >= 70).length;
    const stalledLeads = filteredConversations.filter(c => {
      const h = c.last_message_at ? (Date.now() - new Date(c.last_message_at).getTime()) / 3600000 : Infinity;
      return h > 48 && c.stage !== "fechado" && c.stage !== "perdido" && c.stage !== "pos_venda";
    }).length;
    return { total, active, closedCount, lostCount, conversion, totalValue, weightedValue, totalUnread, avgTicket, hotLeads, stalledLeads };
  }, [filteredConversations, columns]);

  const handleCardClick = useCallback((id: string) => {
    onSelectConversation(id);
    onSwitchToChat();
  }, [onSelectConversation, onSwitchToChat]);

  // Funnel percentages for mini-funnel bar
  const maxCount = Math.max(...columns.map(c => c.count), 1);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ═══ DASHBOARD HEADER ═══ */}
      <div className="px-4 py-3 border-b border-border bg-card/50 shrink-0 space-y-3">
        {/* KPIs Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <KpiChip icon={<Users className="w-3.5 h-3.5 text-primary" />} value={kpis.total} label="leads" />
          <KpiChip icon={<Activity className="w-3.5 h-3.5 text-blue-500" />} value={kpis.active} label="ativos" />
          <KpiChip icon={<TrendingUp className="w-3.5 h-3.5 text-emerald-500" />} value={`${kpis.conversion}%`} label="conversão" />
          <KpiChip icon={<DollarSign className="w-3.5 h-3.5 text-emerald-600" />} value={formatCurrency(kpis.totalValue)} label="pipeline" accent />
          <KpiChip icon={<Target className="w-3.5 h-3.5 text-violet-500" />} value={formatCurrency(kpis.weightedValue)} label="ponderado" />
          <KpiChip icon={<Flame className="w-3.5 h-3.5 text-orange-500" />} value={kpis.hotLeads} label="quentes" />
          {kpis.stalledLeads > 0 && (
            <KpiChip icon={<AlertTriangle className="w-3.5 h-3.5 text-destructive" />} value={kpis.stalledLeads} label="parados" danger />
          )}
          {kpis.totalUnread > 0 && (
            <KpiChip icon={<MessageSquare className="w-3.5 h-3.5 text-primary" />} value={kpis.totalUnread} label="não lidas" />
          )}
        </div>

        {/* Mini Funnel Bar */}
        <div className="flex items-end gap-[2px] h-5">
          {columns.map(col => {
            const pct = maxCount > 0 ? Math.max((col.count / maxCount) * 100, 4) : 4;
            return (
              <Tooltip key={col.key}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "flex-1 rounded-t-sm transition-all cursor-pointer hover:opacity-80",
                      col.count > 0 ? col.bg : "bg-muted/20"
                    )}
                    style={{ height: `${pct}%`, minHeight: 2 }}
                  />
                </TooltipTrigger>
                <TooltipContent className="text-[10px]">
                  {col.emoji} {col.label}: {col.count} leads
                  {col.totalValue > 0 && ` • ${formatCurrency(col.totalValue)}`}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 max-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar lead..."
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as tags</SelectItem>
              <SelectItem value="hot">🔥 Quentes</SelectItem>
              <SelectItem value="stalled">🚫 Parados</SelectItem>
              <SelectItem value="vip">⭐ VIP</SelectItem>
              <SelectItem value="viewed">👀 Visualizou</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterScore} onValueChange={setFilterScore}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <BarChart3 className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Score" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os scores</SelectItem>
              <SelectItem value="high">🟢 Alto (70+)</SelectItem>
              <SelectItem value="medium">🟡 Médio (40-69)</SelectItem>
              <SelectItem value="low">🔴 Baixo (&lt;40)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ═══ PIPELINE KANBAN ═══ */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="flex gap-2.5 p-3 min-w-max h-full">
          {columns.map(col => {
            const isCollapsed = collapsedCols.has(col.key);

            return (
              <div
                key={col.key}
                className={cn(
                  "flex flex-col shrink-0 rounded-xl border border-border/50 border-t-[3px] transition-all",
                  col.color,
                  isCollapsed ? "w-[48px]" : "w-[270px]"
                )}
              >
                {/* Column Header */}
                <div
                  className={cn(
                    "px-3 py-2.5 flex items-center rounded-t-lg bg-gradient-to-b cursor-pointer select-none",
                    col.gradient,
                    isCollapsed && "flex-col gap-2 py-3 px-1"
                  )}
                  onClick={() => toggleCollapse(col.key)}
                >
                  {isCollapsed ? (
                    <>
                      <span className="text-sm">{col.emoji}</span>
                      <Badge variant="secondary" className="text-[10px] h-5 font-bold px-1.5">{col.count}</Badge>
                      <span className="text-[8px] font-bold text-muted-foreground [writing-mode:vertical-lr] rotate-180 mt-1">{col.label}</span>
                      {col.unread > 0 && (
                        <Badge className="text-[9px] h-4 font-bold px-1 bg-primary text-primary-foreground mt-1">{col.unread}</Badge>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="text-sm">{col.emoji}</span>
                        <span className="text-xs font-bold text-foreground truncate">{col.label}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="secondary" className="text-[10px] h-5 font-bold px-1.5">
                          {col.count}
                        </Badge>
                        {col.unread > 0 && (
                          <Badge className="text-[10px] h-5 font-bold px-1.5 bg-primary text-primary-foreground">
                            {col.unread}
                          </Badge>
                        )}
                        <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
                      </div>
                    </>
                  )}
                </div>

                {!isCollapsed && (
                  <>
                    {/* Column Stats Row */}
                    <div className="px-3 py-1.5 flex items-center gap-2 text-[10px] border-b border-border/30 bg-muted/20">
                      {col.totalValue > 0 ? (
                        <>
                          <DollarSign className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="font-bold text-emerald-600">{formatCurrency(col.totalValue)}</span>
                          <span className="text-muted-foreground">•</span>
                        </>
                      ) : null}
                      {col.avgScore > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 flex-1">
                              <span className="text-muted-foreground">Score médio</span>
                              <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden max-w-[50px]">
                                <div className={cn("h-full rounded-full transition-all", getScoreBarColor(col.avgScore))} style={{ width: `${col.avgScore}%` }} />
                              </div>
                              <span className="font-bold text-foreground/70">{col.avgScore}%</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="text-[10px]">Score médio de fechamento da coluna</TooltipContent>
                        </Tooltip>
                      )}
                      {col.totalValue === 0 && col.avgScore === 0 && (
                        <span className="text-muted-foreground italic">—</span>
                      )}
                    </div>

                    {/* Cards */}
                    <div className="flex-1 overflow-y-auto max-h-[calc(100vh-320px)] p-1.5 space-y-1.5 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                      {col.leads.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 gap-2 opacity-40">
                          <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                            <MessageSquare className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <p className="text-[10px] text-muted-foreground italic">Nenhum lead</p>
                        </div>
                      )}
                      {col.leads.map(lead => (
                        <PipelineCard
                          key={lead.id}
                          lead={lead}
                          autoTags={(lead as any)._autoTags || []}
                          onClick={() => handleCardClick(lead.id)}
                        />
                      ))}
                    </div>

                    {/* Column Footer */}
                    {col.leads.length > 0 && (
                      <div className="px-3 py-1.5 border-t border-border/30 text-[9px] text-muted-foreground text-center bg-muted/10 rounded-b-xl">
                        {col.leads.length} lead{col.leads.length !== 1 ? "s" : ""}
                        {col.weightedValue > 0 && ` • ${formatCurrency(col.weightedValue)} ponderado`}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── KPI Chip ───
function KpiChip({ icon, value, label, accent, danger }: {
  icon: React.ReactNode; value: string | number; label: string; accent?: boolean; danger?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs",
      danger ? "bg-destructive/10" : accent ? "bg-emerald-500/10" : "bg-muted/50"
    )}>
      {icon}
      <span className={cn("font-bold", danger ? "text-destructive" : "text-foreground")}>{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

// ─── Pipeline Card ───
function PipelineCard({ lead, autoTags, onClick }: {
  lead: PipelineConversation; autoTags: string[]; onClick: () => void;
}) {
  const hasUnread = lead.unread_count > 0;
  const contactName = lead.contact_name || "Sem nome";
  const isPhone = /^\d{10,}$/.test(contactName);
  const displayName = isPhone ? formatPhoneShort(contactName) : contactName;
  const preview = (lead.last_message_preview || "").replace(/\n/g, " ").slice(0, 60);
  const score = lead.close_score || 0;
  const urgencyClass = getUrgencyColor(lead);
  const allTags = [...autoTags, ...(lead.tags || []).slice(0, 2)];
  const stageTime = lead.stage_entered_at ? timeSince(lead.stage_entered_at) : "";
  const interactions = lead.interaction_count || 0;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-primary/30 group border-l-[3px] overflow-hidden",
        urgencyClass,
        hasUnread && "ring-1 ring-primary/20 bg-primary/[0.02]"
      )}
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Score progress bar at top */}
        {score > 0 && (
          <div className="h-[3px] w-full bg-muted/30">
            <div className={cn("h-full transition-all rounded-r-full", getScoreBarColor(score))} style={{ width: `${score}%` }} />
          </div>
        )}

        <div className="p-2.5 space-y-1.5">
          {/* Row 1: Avatar + Name + Score */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ring-1 ring-border/30",
              avatarColor(contactName)
            )}>
              {isPhone ? <Phone className="w-3 h-3" /> : getInitials(displayName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                {lead.is_vip && <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
                <span className={cn(
                  "text-xs truncate leading-tight",
                  hasUnread ? "font-bold text-foreground" : "font-semibold text-foreground/90"
                )}>
                  {displayName}
                </span>
              </div>
              {lead.phone && !isPhone && (
                <span className="text-[9px] text-muted-foreground">{formatPhoneShort(lead.phone)}</span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {score > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", getScoreColor(score))}>
                      {score}%
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs">
                    Probabilidade de fechamento: {score}%
                  </TooltipContent>
                </Tooltip>
              )}
              {hasUnread && (
                <span className="h-4 min-w-4 rounded-full bg-primary flex items-center justify-center text-[8px] font-bold text-primary-foreground px-1">
                  {lead.unread_count}
                </span>
              )}
            </div>
          </div>

          {/* Row 2: Financial */}
          {(lead.proposal_value || 0) > 0 && (
            <div className="flex items-center gap-2 text-[10px] ml-10">
              <DollarSign className="w-3 h-3 text-emerald-600 shrink-0" />
              <span className="font-bold text-emerald-600">{formatCurrency(lead.proposal_value || 0)}</span>
              {score > 0 && (
                <span className="text-muted-foreground">
                  → {formatCurrency((lead.proposal_value || 0) * score / 100)} esperado
                </span>
              )}
            </div>
          )}

          {/* Row 3: Preview */}
          {preview && (
            <p className={cn(
              "text-[10px] line-clamp-2 leading-relaxed ml-10",
              hasUnread ? "text-foreground/70" : "text-muted-foreground"
            )}>
              {preview}
            </p>
          )}

          {/* Row 4: Meta */}
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground ml-10 flex-wrap">
            {stageTime && (
              <span className="flex items-center gap-0.5">
                <Timer className="w-2.5 h-2.5" /> {stageTime}
              </span>
            )}
            <span className="flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" /> {timeSince(lead.last_message_at)}
            </span>
            {interactions > 0 && (
              <span className="flex items-center gap-0.5">
                <MessageSquare className="w-2.5 h-2.5" /> {interactions}
              </span>
            )}
            {lead.source && (
              <span className="text-[8px] px-1 rounded bg-muted/50">{lead.source}</span>
            )}
          </div>

          {/* Row 5: Tags */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-0.5 ml-10">
              {allTags.slice(0, 4).map((t, i) => (
                <span
                  key={`${t}-${i}`}
                  className={cn(
                    "text-[8px] px-1.5 py-0.5 rounded-full font-medium",
                    t.includes("quente") || t.includes("🔥") ? "bg-orange-500/15 text-orange-700" :
                    t.includes("Parado") || t.includes("🚫") ? "bg-destructive/10 text-destructive" :
                    t.includes("VIP") || t.includes("⭐") ? "bg-amber-500/15 text-amber-700" :
                    t.includes("fechamento") || t.includes("🎯") ? "bg-emerald-500/15 text-emerald-700" :
                    t.includes("vista") || t.includes("👀") ? "bg-violet-500/15 text-violet-700" :
                    t.includes("Esfriando") || t.includes("❄️") ? "bg-sky-500/15 text-sky-700" :
                    t.includes("interação") || t.includes("💬") ? "bg-blue-500/15 text-blue-700" :
                    "bg-secondary text-muted-foreground"
                  )}
                >
                  {t}
                </span>
              ))}
              {allTags.length > 4 && (
                <span className="text-[8px] px-1 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  +{allTags.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
