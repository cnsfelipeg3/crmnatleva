import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Send, FileText, CreditCard, Plane, Hotel,
  CheckCircle2, Clock, AlertTriangle, Tag, User, Eye,
  ChevronDown, ChevronUp, ExternalLink, Filter, Calendar,
  DollarSign, Sparkles, Activity, StickyNote, UserPlus,
  ArrowUpRight, Loader2, MessageCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { formatDateBR } from "@/lib/dateFormat";

// ─── Types ───
type EventCategory = "all" | "messages" | "proposals" | "financial" | "trips" | "notes" | "crm";
type TimePeriod = "all" | "7d" | "30d" | "90d";

interface TimelineEvent {
  id: string;
  category: EventCategory;
  icon: typeof MessageSquare;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  timestamp: string;
  responsible?: string;
  metadata?: Record<string, any>;
  expandContent?: React.ReactNode;
  linkTo?: string;
  alert?: boolean;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDt = (d: string) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

const CATEGORY_FILTERS: { key: EventCategory; label: string; icon: typeof MessageSquare }[] = [
  { key: "all", label: "Tudo", icon: Activity },
  { key: "messages", label: "Mensagens", icon: MessageSquare },
  { key: "proposals", label: "Propostas", icon: FileText },
  { key: "financial", label: "Financeiro", icon: DollarSign },
  { key: "trips", label: "Viagens", icon: Plane },
  { key: "notes", label: "Notas", icon: StickyNote },
  { key: "crm", label: "CRM", icon: Tag },
];

const PERIOD_FILTERS: { key: TimePeriod; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "text-muted-foreground" },
  sent: { label: "Enviada", color: "text-blue-500" },
  negotiation: { label: "Negociação", color: "text-amber-500" },
  approved: { label: "Aprovada", color: "text-emerald-500" },
  rejected: { label: "Recusada", color: "text-destructive" },
  expired: { label: "Vencida", color: "text-muted-foreground" },
};

// ─── Executive Summary ───
function ExecutiveSummary({ clientId, events, sales }: { clientId: string; events: TimelineEvent[]; sales: any[] }) {
  const navigate = useNavigate();
  const lastInteraction = events.find(e => e.category === "messages");
  const activeProposal = events.find(e => e.category === "proposals" && ["sent", "negotiation"].includes(e.metadata?.status));
  const now = new Date();
  const nextTrip = sales.find(s => s.departure_date && new Date(s.departure_date) >= now);
  const pendingPayments = events.filter(e => e.category === "financial" && e.metadata?.status === "pendente");
  const totalPending = pendingPayments.reduce((s, e) => s + (e.metadata?.value || 0), 0);

  const daysSinceContact = lastInteraction
    ? Math.floor((now.getTime() - new Date(lastInteraction.timestamp).getTime()) / 86400000)
    : null;

  const items = [
    {
      label: "Última Interação",
      value: lastInteraction ? `${daysSinceContact === 0 ? "Hoje" : daysSinceContact === 1 ? "Ontem" : `${daysSinceContact}d atrás`}` : "Sem contato",
      alert: daysSinceContact !== null && daysSinceContact > 7,
      icon: MessageCircle,
    },
    {
      label: "Proposta Ativa",
      value: activeProposal ? activeProposal.title.replace("Proposta: ", "") : "Nenhuma",
      icon: FileText,
      alert: false,
    },
    {
      label: "Em Aberto",
      value: totalPending > 0 ? fmt(totalPending) : "R$ 0",
      alert: totalPending > 0,
      icon: DollarSign,
    },
    {
      label: "Próxima Viagem",
      value: nextTrip ? `${nextTrip.destination_iata || "?"} · ${formatDateBR(nextTrip.departure_date)}` : "Nenhuma",
      icon: Plane,
      alert: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {items.map(item => (
        <div
          key={item.label}
          className={`relative rounded-xl border p-3.5 transition-all duration-200 ${
            item.alert
              ? "border-destructive/30 bg-destructive/[0.04]"
              : "border-border/40 bg-card/50"
          }`}
        >
          {item.alert && (
            <div className="absolute top-2 right-2">
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive/60 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 mb-1.5">
            <item.icon className={`w-3.5 h-3.5 ${item.alert ? "text-destructive" : "text-muted-foreground"}`} />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{item.label}</span>
          </div>
          <p className={`text-sm font-bold truncate ${item.alert ? "text-destructive" : "text-foreground"}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Timeline Item ───
function TimelineItem({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const Icon = event.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="relative flex gap-4"
    >
      {/* Vertical line */}
      <div className="flex flex-col items-center">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${event.iconBg} ${event.alert ? "ring-2 ring-destructive/30 ring-offset-1 ring-offset-background" : ""}`}>
          <Icon className={`w-4 h-4 ${event.iconColor}`} />
        </div>
        {!isLast && <div className="w-px flex-1 min-h-[24px] bg-border/40 mt-1" />}
      </div>

      {/* Content */}
      <div className={`flex-1 pb-6 ${!isLast ? "" : ""}`}>
        <div
          className={`group rounded-xl border p-3.5 transition-all duration-200 hover:shadow-sm cursor-pointer ${
            event.alert
              ? "border-destructive/25 bg-destructive/[0.03] hover:border-destructive/40"
              : "border-border/30 bg-card/40 hover:border-border/60 hover:bg-card/70"
          }`}
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-foreground">{event.title}</h4>
                {event.alert && <Badge variant="destructive" className="text-[9px] h-4 px-1.5">Atenção</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{event.description}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{fmtDt(event.timestamp)}</span>
              {event.expandContent && (
                expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </div>
          </div>

          {event.responsible && (
            <div className="flex items-center gap-1.5 mt-2">
              <User className="w-3 h-3 text-muted-foreground/60" />
              <span className="text-[10px] text-muted-foreground">{event.responsible}</span>
            </div>
          )}

          <AnimatePresence>
            {expanded && event.expandContent && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-border/30 text-xs text-foreground space-y-1.5">
                  {event.expandContent}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {event.linkTo && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 h-6 text-[10px] text-primary gap-1 px-2 hover:bg-primary/5"
              onClick={(e) => { e.stopPropagation(); navigate(event.linkTo!); }}
            >
              Abrir <ExternalLink className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───
interface ClientTimelineProps {
  clientId: string;
  clientPhone?: string | null;
  sales: any[];
}

export default function ClientTimeline({ clientId, clientPhone, sales }: ClientTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<EventCategory>("all");
  const [periodFilter, setPeriodFilter] = useState<TimePeriod>("all");
  const [visibleCount, setVisibleCount] = useState(30);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const allEvents: TimelineEvent[] = [];
    const saleIds = sales.map(s => s.id);

    // ── 1. Messages (from conversations linked to client) ──
    try {
      const { data: convs } = await supabase
        .from("conversations")
        .select("id, contact_name, phone")
        .eq("client_id", clientId);

      if (convs && convs.length > 0) {
        const convIds = convs.map(c => c.id);
        const { data: msgs } = await supabase
          .from("chat_messages")
          .select("id, content, sender_type, message_type, created_at")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false })
          .limit(50);

        (msgs || []).forEach(msg => {
          const isIncoming = msg.sender_type === "cliente";
          allEvents.push({
            id: `msg-${msg.id}`,
            category: "messages",
            icon: isIncoming ? MessageSquare : Send,
            iconColor: isIncoming ? "text-emerald-500" : "text-blue-500",
            iconBg: isIncoming ? "bg-emerald-500/10 border-emerald-500/20" : "bg-blue-500/10 border-blue-500/20",
            title: isIncoming ? "Mensagem recebida" : "Mensagem enviada",
            description: msg.content?.slice(0, 120) || (msg.message_type !== "text" ? `📎 ${msg.message_type}` : ""),
            timestamp: msg.created_at,
          });
        });
      }
    } catch {}

    // ── 2. Proposals ──
    try {
      const { data: proposals } = await supabase
        .from("proposals")
        .select("id, title, status, total_value, destinations, created_at, updated_at, views_count, last_viewed_at, slug")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      (proposals || []).forEach(p => {
        const statusInfo = STATUS_MAP[p.status] || { label: p.status, color: "text-muted-foreground" };
        allEvents.push({
          id: `prop-${p.id}`,
          category: "proposals",
          icon: FileText,
          iconColor: "text-amber-500",
          iconBg: "bg-amber-500/10 border-amber-500/20",
          title: `Proposta: ${p.title}`,
          description: `${(p.destinations || []).join(", ")} · ${statusInfo.label} · ${p.total_value ? fmt(p.total_value) : "—"}`,
          timestamp: p.created_at,
          metadata: { status: p.status, value: p.total_value },
          expandContent: (
            <>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className={`font-bold ${statusInfo.color}`}>{statusInfo.label}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Valor</span><span className="font-bold">{p.total_value ? fmt(p.total_value) : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Destinos</span><span>{(p.destinations || []).join(", ") || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Visualizações</span><span>{p.views_count || 0}</span></div>
              {p.last_viewed_at && <div className="flex justify-between"><span className="text-muted-foreground">Última visualização</span><span>{fmtDt(p.last_viewed_at)}</span></div>}
            </>
          ),
          linkTo: `/proposals/${p.id}`,
        });

        // Add "viewed" event if client viewed
        if (p.last_viewed_at) {
          allEvents.push({
            id: `prop-view-${p.id}`,
            category: "proposals",
            icon: Eye,
            iconColor: "text-purple-500",
            iconBg: "bg-purple-500/10 border-purple-500/20",
            title: `Proposta visualizada pelo cliente`,
            description: `${p.title} · ${p.views_count || 1}x visualizações`,
            timestamp: p.last_viewed_at,
          });
        }
      });
    } catch {}

    // ── 3. Payments ──
    if (saleIds.length > 0) {
      try {
        const { data: payments } = await supabase
          .from("sale_payments")
          .select("id, gross_value, net_value, payment_method, status, due_date, payment_date, created_at, sale_id")
          .in("sale_id", saleIds)
          .order("created_at", { ascending: false });

        (payments || []).forEach(pay => {
          const sale = sales.find(s => s.id === pay.sale_id);
          const isPending = pay.status === "pendente";
          const isOverdue = isPending && pay.due_date && new Date(pay.due_date) < new Date();

          allEvents.push({
            id: `pay-${pay.id}`,
            category: "financial",
            icon: CreditCard,
            iconColor: isOverdue ? "text-destructive" : isPending ? "text-amber-500" : "text-emerald-600",
            iconBg: isOverdue ? "bg-destructive/10 border-destructive/20" : isPending ? "bg-amber-500/10 border-amber-500/20" : "bg-emerald-600/10 border-emerald-600/20",
            title: isOverdue ? "Pagamento vencido" : isPending ? "Pagamento pendente" : "Pagamento recebido",
            description: `${fmt(pay.gross_value)} · ${pay.payment_method} ${sale ? `· ${sale.destination_iata || sale.name}` : ""}`,
            timestamp: pay.payment_date || pay.created_at,
            alert: !!isOverdue,
            metadata: { status: pay.status, value: pay.gross_value },
            expandContent: (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">Valor bruto</span><span className="font-bold">{fmt(pay.gross_value)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Valor líquido</span><span>{fmt(pay.net_value)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Método</span><span>{pay.payment_method}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant={isPending ? "outline" : "secondary"} className="text-[10px]">{pay.status}</Badge></div>
                {pay.due_date && <div className="flex justify-between"><span className="text-muted-foreground">Vencimento</span><span>{fmtDate(pay.due_date)}</span></div>}
              </>
            ),
            linkTo: sale ? `/sales/${sale.id}` : undefined,
          });
        });
      } catch {}
    }

    // ── 4. Sales / Trips ──
    sales.forEach(sale => {
      allEvents.push({
        id: `sale-${sale.id}`,
        category: "trips",
        icon: Plane,
        iconColor: "text-primary",
        iconBg: "bg-primary/10 border-primary/20",
        title: `Viagem: ${sale.destination_iata || sale.name}`,
        description: `${sale.origin_iata || "?"} → ${sale.destination_iata || "?"} · ${sale.status} · ${fmt(sale.received_value || 0)}`,
        timestamp: sale.created_at,
        expandContent: (
          <>
            <div className="flex justify-between"><span className="text-muted-foreground">Rota</span><span className="font-mono">{sale.origin_iata} → {sale.destination_iata}</span></div>
            {sale.departure_date && <div className="flex justify-between"><span className="text-muted-foreground">Embarque</span><span>{fmtDate(sale.departure_date)}</span></div>}
            {sale.return_date && <div className="flex justify-between"><span className="text-muted-foreground">Retorno</span><span>{fmtDate(sale.return_date)}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Recebido</span><span className="font-bold text-emerald-500">{fmt(sale.received_value || 0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant="outline" className="text-[10px]">{sale.status}</Badge></div>
            {sale.hotel_name && <div className="flex justify-between"><span className="text-muted-foreground">Hotel</span><span>{sale.hotel_name}</span></div>}
            {sale.products?.length > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Produtos</span><span>{sale.products.join(", ")}</span></div>}
          </>
        ),
        linkTo: `/sales/${sale.id}`,
      });
    });

    // ── 5. Notes ──
    try {
      const { data: notes } = await supabase
        .from("client_notes")
        .select("id, content, created_at, profiles:author_id(full_name)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      (notes || []).forEach(note => {
        allEvents.push({
          id: `note-${note.id}`,
          category: "notes",
          icon: StickyNote,
          iconColor: "text-slate-400",
          iconBg: "bg-slate-400/10 border-slate-400/20",
          title: "Nota interna",
          description: note.content?.slice(0, 120) || "",
          timestamp: note.created_at,
          responsible: (note as any).profiles?.full_name || undefined,
        });
      });
    } catch {}

    // ── 6. CRM events (audit_log for sales) ──
    if (saleIds.length > 0) {
      try {
        const { data: logs } = await supabase
          .from("audit_log")
          .select("id, action, details, created_at")
          .in("sale_id", saleIds)
          .order("created_at", { ascending: false })
          .limit(30);

        (logs || []).forEach(log => {
          allEvents.push({
            id: `crm-${log.id}`,
            category: "crm",
            icon: Activity,
            iconColor: "text-muted-foreground",
            iconBg: "bg-muted border-border/40",
            title: log.action || "Evento do sistema",
            description: log.details?.slice(0, 100) || "",
            timestamp: log.created_at,
          });
        });
      } catch {}
    }

    // Sort all events by timestamp DESC
    allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setEvents(allEvents);
    setLoading(false);
  }, [clientId, sales]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    let result = events;
    if (categoryFilter !== "all") result = result.filter(e => e.category === categoryFilter);
    if (periodFilter !== "all") {
      const days = periodFilter === "7d" ? 7 : periodFilter === "30d" ? 30 : 90;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      result = result.filter(e => new Date(e.timestamp) >= cutoff);
    }
    return result;
  }, [events, categoryFilter, periodFilter]);

  const visibleEvents = filteredEvents.slice(0, visibleCount);
  const hasMore = filteredEvents.length > visibleCount;

  // Category counts
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: events.length };
    events.forEach(e => { c[e.category] = (c[e.category] || 0) + 1; });
    return c;
  }, [events]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Carregando timeline...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Executive Summary */}
      <ExecutiveSummary clientId={clientId} events={events} sales={sales} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Category */}
        <div className="flex gap-1 flex-wrap">
          {CATEGORY_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => { setCategoryFilter(f.key); setVisibleCount(30); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
                categoryFilter === f.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <f.icon className="w-3 h-3" />
              {f.label}
              {counts[f.key] ? <span className="opacity-70 ml-0.5">({counts[f.key]})</span> : null}
            </button>
          ))}
        </div>

        {/* Period */}
        <div className="flex gap-1 bg-muted/40 rounded-lg p-0.5">
          {PERIOD_FILTERS.map(p => (
            <button
              key={p.key}
              onClick={() => { setPeriodFilter(p.key); setVisibleCount(30); }}
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                periodFilter === p.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-16">
          <Activity className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum evento encontrado</p>
        </div>
      ) : (
        <div className="pl-1">
          {/* Date groups */}
          {(() => {
            let lastDate = "";
            return visibleEvents.map((event, i) => {
              const eventDate = new Date(event.timestamp).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
              const showDate = eventDate !== lastDate;
              lastDate = eventDate;
              return (
                <Fragment key={event.id}>
                  {showDate && (
                    <div className="flex items-center gap-3 py-3">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground/50" />
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{eventDate}</span>
                      <div className="flex-1 h-px bg-border/30" />
                    </div>
                  )}
                  <TimelineItem event={event} isLast={i === visibleEvents.length - 1} />
                </Fragment>
              );
            });
          })()}

          {hasMore && (
            <div className="flex justify-center pt-4 pb-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs rounded-xl"
                onClick={() => setVisibleCount(v => v + 30)}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Carregar mais ({filteredEvents.length - visibleCount} restantes)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
