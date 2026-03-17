import { useMemo, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Users, Star, Clock, MessageSquare, TrendingUp, DollarSign,
  Filter, AlertTriangle, Flame, Snowflake, Eye, Timer,
  Zap, Target, ArrowRight, BarChart3, Activity, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───
type Stage = "novo_lead" | "contato_inicial" | "qualificacao" | "diagnostico" | "proposta_preparacao" | "proposta_enviada" | "proposta_visualizada" | "ajustes" | "negociacao" | "fechamento_andamento" | "fechado" | "pos_venda" | "perdido";

interface PipelineConversation {
  id: string;
  db_id?: string;
  phone: string;
  contact_name: string;
  stage: Stage;
  tags: string[];
  source: string;
  last_message_at: string;
  last_message_preview: string;
  unread_count: number;
  is_vip: boolean;
  assigned_to: string;
  score_potential: number;
  score_risk: number;
  // New pipeline fields
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
}

// ─── Pipeline Columns ───
const PIPELINE_COLUMNS: { key: Stage; label: string; emoji: string; color: string; bg: string }[] = [
  { key: "novo_lead", label: "Novo Lead", emoji: "🆕", color: "border-t-blue-500", bg: "bg-blue-500/10" },
  { key: "contato_inicial", label: "Contato Inicial", emoji: "👋", color: "border-t-sky-500", bg: "bg-sky-500/10" },
  { key: "qualificacao", label: "Qualificação", emoji: "🔍", color: "border-t-amber-500", bg: "bg-amber-500/10" },
  { key: "diagnostico", label: "Diagnóstico", emoji: "🧠", color: "border-t-yellow-500", bg: "bg-yellow-500/10" },
  { key: "proposta_preparacao", label: "Estruturação", emoji: "📋", color: "border-t-orange-500", bg: "bg-orange-500/10" },
  { key: "proposta_enviada", label: "Proposta Enviada", emoji: "📩", color: "border-t-purple-500", bg: "bg-purple-500/10" },
  { key: "proposta_visualizada", label: "Visualizada", emoji: "👀", color: "border-t-violet-500", bg: "bg-violet-500/10" },
  { key: "ajustes", label: "Ajustes", emoji: "🔧", color: "border-t-pink-500", bg: "bg-pink-500/10" },
  { key: "negociacao", label: "Negociação", emoji: "🤝", color: "border-t-primary", bg: "bg-primary/10" },
  { key: "fechamento_andamento", label: "Fechando", emoji: "🔥", color: "border-t-rose-500", bg: "bg-rose-500/10" },
  { key: "fechado", label: "Fechado", emoji: "✅", color: "border-t-emerald-500", bg: "bg-emerald-500/10" },
  { key: "pos_venda", label: "Pós-Venda", emoji: "🎯", color: "border-t-teal-500", bg: "bg-teal-500/10" },
  { key: "perdido", label: "Perdido", emoji: "❌", color: "border-t-destructive", bg: "bg-destructive/10" },
];

// ─── Smart Tags Engine ───
function computeAutoTags(lead: PipelineConversation): string[] {
  const tags: string[] = [];
  const now = Date.now();
  const lastMsg = lead.last_message_at ? new Date(lead.last_message_at).getTime() : 0;
  const hoursSinceLastMsg = lastMsg ? (now - lastMsg) / 3600000 : Infinity;
  const lastResponse = lead.last_response_at ? new Date(lead.last_response_at).getTime() : 0;
  const hoursSinceResponse = lastResponse ? (now - lastResponse) / 3600000 : Infinity;

  // Hot lead: recent interaction + high score
  if (hoursSinceLastMsg < 2 && (lead.close_score || 0) >= 60) tags.push("🔥 Lead quente");
  else if (hoursSinceLastMsg > 24 && hoursSinceLastMsg < 72) tags.push("❄️ Esfriando");

  // Stalled
  if (hoursSinceLastMsg > 48) tags.push("🚫 Parado >48h");

  // High interaction
  if ((lead.interaction_count || 0) > 20) tags.push("💬 Alta interação");

  // Slow to respond
  if (hoursSinceResponse > 24 && lead.unread_count > 0) tags.push("🕐 Demora a responder");

  // Proposal viewed
  if (lead.proposal_viewed_at) tags.push("👀 Proposta vista");

  // High close probability
  if ((lead.close_score || 0) >= 80) tags.push("🎯 Alta prob. fechamento");

  // VIP
  if (lead.is_vip) tags.push("⭐ VIP");

  return tags;
}

function getUrgencyColor(lead: PipelineConversation): string {
  const now = Date.now();
  const lastMsg = lead.last_message_at ? new Date(lead.last_message_at).getTime() : 0;
  const hours = lastMsg ? (now - lastMsg) / 3600000 : Infinity;
  const score = lead.close_score || 0;

  if (score >= 70 && hours < 4) return "border-l-emerald-500"; // Hot
  if (hours > 48) return "border-l-destructive"; // Stalled
  if (hours > 24) return "border-l-amber-500"; // Attention
  return "border-l-transparent";
}

function getScoreColor(score: number): string {
  if (score >= 70) return "text-emerald-600 bg-emerald-500/10";
  if (score >= 40) return "text-amber-600 bg-amber-500/10";
  return "text-muted-foreground bg-muted/50";
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
      return { ...col, leads, count: leads.length, unread, totalValue, weightedValue };
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
    return { total, active, closedCount, conversion, totalValue, weightedValue, totalUnread, avgTicket, hotLeads, stalledLeads };
  }, [filteredConversations, columns]);

  const handleCardClick = useCallback((id: string) => {
    onSelectConversation(id);
    onSwitchToChat();
  }, [onSelectConversation, onSwitchToChat]);

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
      <ScrollArea className="flex-1">
        <div className="flex gap-2 p-3 min-w-max">
          {columns.map(col => (
            <div
              key={col.key}
              className={cn(
                "flex flex-col w-[260px] shrink-0 rounded-xl border border-border/60 border-t-[3px] bg-card/30",
                col.color
              )}
            >
              {/* Column Header */}
              <div className={cn("px-3 py-2 flex items-center justify-between rounded-t-lg", col.bg)}>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{col.emoji}</span>
                  <span className="text-xs font-bold text-foreground">{col.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-[10px] h-5 font-bold px-1.5">
                    {col.count}
                  </Badge>
                  {col.unread > 0 && (
                    <Badge className="text-[10px] h-5 font-bold px-1.5 bg-primary text-primary-foreground">
                      {col.unread}
                    </Badge>
                  )}
                </div>
              </div>
              {/* Column Value */}
              {col.totalValue > 0 && (
                <div className="px-3 py-1 flex items-center justify-between text-[10px] border-b border-border/40">
                  <span className="text-muted-foreground">Valor total</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(col.totalValue)}</span>
                </div>
              )}

              {/* Cards */}
              <div className="flex-1 overflow-y-auto max-h-[calc(100vh-280px)] p-1.5 space-y-1.5">
                {col.leads.length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-8 italic">Nenhum lead</p>
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
            </div>
          ))}
        </div>
      </ScrollArea>
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
  const preview = (lead.last_message_preview || "").replace(/\n/g, " ").slice(0, 50);
  const score = lead.close_score || 0;
  const urgencyClass = getUrgencyColor(lead);
  const allTags = [...autoTags, ...(lead.tags || []).slice(0, 2)];
  const stageTime = lead.stage_entered_at ? timeSince(lead.stage_entered_at) : "";

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-primary/30 group border-l-[3px]",
        urgencyClass,
        hasUnread && "ring-1 ring-primary/20 bg-primary/[0.02]"
      )}
      onClick={onClick}
    >
      <CardContent className="p-2.5 space-y-1.5">
        {/* Row 1: Name + Score */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {lead.is_vip && <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
            <span className={cn(
              "text-xs truncate leading-tight",
              hasUnread ? "font-bold text-foreground" : "font-semibold text-foreground/90"
            )}>
              {isPhone ? formatPhoneShort(contactName) : contactName}
            </span>
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
          <div className="flex items-center gap-2 text-[10px]">
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
            "text-[10px] line-clamp-1 leading-relaxed",
            hasUnread ? "text-foreground/70" : "text-muted-foreground"
          )}>
            {preview}
          </p>
        )}

        {/* Row 4: Meta (time in stage + last interaction) */}
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
          {stageTime && (
            <span className="flex items-center gap-0.5">
              <Timer className="w-2.5 h-2.5" /> {stageTime} na etapa
            </span>
          )}
          <span className="flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" /> {timeSince(lead.last_message_at)}
          </span>
          {lead.source && (
            <span className="text-[8px] px-1 rounded bg-muted/50">{lead.source}</span>
          )}
        </div>

        {/* Row 5: Tags */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-0.5">
            {allTags.slice(0, 4).map((t, i) => (
              <span
                key={`${t}-${i}`}
                className={cn(
                  "text-[8px] px-1.5 py-0.5 rounded-full font-medium",
                  t.includes("quente") || t.includes("🔥") ? "bg-orange-500/15 text-orange-700" :
                  t.includes("Parado") || t.includes("🚫") ? "bg-destructive/10 text-destructive" :
                  t.includes("VIP") || t.includes("⭐") ? "bg-amber-500/15 text-amber-700" :
                  t.includes("fechamento") || t.includes("🎯") ? "bg-emerald-500/15 text-emerald-700" :
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
      </CardContent>
    </Card>
  );
}
