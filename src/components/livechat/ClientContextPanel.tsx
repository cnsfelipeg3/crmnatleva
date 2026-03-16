import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  X, User, Phone, Mail, MapPin, Star, Clock, Plane, CreditCard,
  FileText, MessageSquare, ChevronDown, ChevronUp, DollarSign,
  AlertTriangle, CheckCircle2, Calendar, Tag, ExternalLink,
  StickyNote, Plus, Send, Eye, Loader2, Sparkles, TrendingUp,
  ArrowUpRight, Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { QuoteSummaryCard } from "./QuoteSummaryCard";
import { AIProposalBriefingDialog } from "./AIProposalBriefingDialog";

// ─── Types ───
type Stage = "novo_lead" | "qualificacao" | "proposta_preparacao" | "proposta_enviada" | "negociacao" | "fechado" | "pos_venda" | "perdido";

interface ClientContextPanelProps {
  conversation: {
    id: string;
    db_id?: string;
    phone: string;
    contact_name: string;
    stage: Stage;
    tags: string[];
    source: string;
    is_vip: boolean;
    assigned_to: string;
    score_potential: number;
    score_risk: number;
    last_message_at: string;
  };
  profilePic?: string;
  onClose: () => void;
  onStageChange: (stage: Stage) => void;
}

const STAGES: { key: Stage; label: string; color: string }[] = [
  { key: "novo_lead", label: "Novo Lead", color: "bg-blue-500" },
  { key: "qualificacao", label: "Em qualificação", color: "bg-amber-500" },
  { key: "proposta_preparacao", label: "Prep. Proposta", color: "bg-orange-500" },
  { key: "proposta_enviada", label: "Proposta Enviada", color: "bg-purple-500" },
  { key: "negociacao", label: "Negociação", color: "bg-primary" },
  { key: "fechado", label: "Viagem Confirmada", color: "bg-emerald-500" },
  { key: "pos_venda", label: "Pós-venda", color: "bg-teal-500" },
  { key: "perdido", label: "Perdido", color: "bg-muted-foreground" },
];

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
const fmtDateTime = (d: string) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function formatPhoneDisplay(number: string): string {
  const clean = number.replace(/\D/g, "");
  if (clean.startsWith("55") && clean.length >= 12) {
    const ddd = clean.slice(2, 4);
    const rest = clean.slice(4);
    if (rest.length === 9) return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
  }
  return clean.length >= 10 ? `+${clean}` : number;
}

// ─── Collapsible Section ───
function Section({ title, icon: Icon, defaultOpen = true, badge, children }: {
  title: string; icon: any; defaultOpen?: boolean; badge?: React.ReactNode; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/30 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
          {badge}
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Timeline Event ───
function TimelineItem({ icon: Icon, iconColor, title, description, time, alert }: {
  icon: any; iconColor: string; title: string; description?: string; time: string; alert?: boolean;
}) {
  return (
    <div className="flex gap-2.5 py-1.5">
      <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${alert ? 'bg-destructive/10' : 'bg-secondary/60'}`}>
        <Icon className={`h-3 w-3 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs leading-tight ${alert ? 'text-destructive font-medium' : 'text-foreground'}`}>{title}</p>
        {description && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{description}</p>}
        <p className="text-[9px] text-muted-foreground/60 mt-0.5">{time}</p>
      </div>
    </div>
  );
}

export function ClientContextPanel({ conversation, profilePic, onClose, onStageChange }: ClientContextPanelProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [receivables, setReceivables] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [showBriefingDialog, setShowBriefingDialog] = useState(false);

  const initials = conversation.contact_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  // Resolve client from conversation
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Find conversation in DB
        const phone = conversation.phone?.replace(/\D/g, "") || "";
        const phoneCandidates = [phone, `+${phone}`, `${phone}@c.us`, `${phone}@s.whatsapp.net`].filter(Boolean);

        const { data: convRows } = await supabase
          .from("conversations")
          .select("id, client_id, assigned_to, funnel_stage")
          .or(phoneCandidates.map(p => `phone.eq.${p}`).join(","))
          .order("updated_at", { ascending: false })
          .limit(1);

        const dbConv = convRows?.[0];
        const clientId = dbConv?.client_id;

        if (clientId) {
          const [clientRes, salesRes, notesRes, receivablesRes] = await Promise.all([
            supabase.from("clients").select("*").eq("id", clientId).single(),
            supabase.from("sales").select("*").eq("client_id", clientId).order("created_at", { ascending: false }).limit(20),
            supabase.from("client_notes").select("*").eq("client_id", clientId).order("created_at", { ascending: false }).limit(20),
            supabase.from("accounts_receivable").select("*").eq("client_id", clientId).order("due_date", { ascending: true }).limit(50),
          ]);

          if (!cancelled) {
            setClientData(clientRes.data);
            setSales(salesRes.data || []);
            setNotes(notesRes.data || []);
            setReceivables(receivablesRes.data || []);
          }
        } else {
          // Try matching by name
          const { data: clientByName } = await supabase
            .from("clients")
            .select("*")
            .ilike("display_name", `%${conversation.contact_name}%`)
            .limit(1);
          if (!cancelled && clientByName?.[0]) {
            setClientData(clientByName[0]);
            const cid = clientByName[0].id;
            const [salesRes, notesRes, receivablesRes] = await Promise.all([
              supabase.from("sales").select("*").eq("client_id", cid).order("created_at", { ascending: false }).limit(20),
              supabase.from("client_notes").select("*").eq("client_id", cid).order("created_at", { ascending: false }).limit(20),
              supabase.from("accounts_receivable").select("*").eq("client_id", cid).order("due_date", { ascending: true }).limit(50),
            ]);
            setSales(salesRes.data || []);
            setNotes(notesRes.data || []);
            setReceivables(receivablesRes.data || []);
          }
        }

        // Load profiles for assigned_to
        const { data: profs } = await supabase.from("profiles").select("id, full_name");
        if (!cancelled && profs) {
          const map: Record<string, string> = {};
          profs.forEach((p: any) => { map[p.id] = p.full_name; });
          setProfiles(map);
        }
      } catch (err) {
        console.error("ClientContextPanel load error:", err);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [conversation.id, conversation.phone, conversation.contact_name]);

  // Build timeline events
  const timeline = useMemo(() => {
    const events: any[] = [];

    sales.forEach(s => {
      events.push({
        icon: Plane,
        iconColor: "text-blue-500",
        title: `Viagem ${s.destination_iata || ""} — ${s.name || ""}`,
        description: s.received_value ? fmt(s.received_value) : undefined,
        time: fmtDate(s.created_at),
        ts: new Date(s.created_at).getTime(),
      });
    });

    receivables.forEach(r => {
      const isPending = r.status === "pendente";
      const isOverdue = isPending && r.due_date && new Date(r.due_date) < new Date();
      events.push({
        icon: CreditCard,
        iconColor: isOverdue ? "text-destructive" : isPending ? "text-amber-500" : "text-emerald-500",
        title: `${isPending ? "Pagamento pendente" : "Pagamento recebido"} — ${fmt(r.gross_value || r.net_value)}`,
        description: r.description || (r.payment_method || ""),
        time: r.due_date ? fmtDate(r.due_date) : fmtDate(r.created_at),
        ts: new Date(r.due_date || r.created_at).getTime(),
        alert: isOverdue,
      });
    });

    notes.forEach(n => {
      events.push({
        icon: StickyNote,
        iconColor: "text-muted-foreground",
        title: n.content.slice(0, 80),
        time: fmtDateTime(n.created_at),
        ts: new Date(n.created_at).getTime(),
      });
    });

    events.sort((a, b) => b.ts - a.ts);
    return events.slice(0, 30);
  }, [sales, receivables, notes]);

  // Computed metrics
  const totalRevenue = useMemo(() => sales.reduce((s, sale) => s + (sale.received_value || 0), 0), [sales]);
  const totalTrips = sales.length;
  const avgTicket = totalTrips > 0 ? totalRevenue / totalTrips : 0;
  const pendingReceivables = useMemo(() => receivables.filter(r => r.status === "pendente"), [receivables]);
  const totalPending = useMemo(() => pendingReceivables.reduce((s, r) => s + (r.gross_value || r.net_value || 0), 0), [pendingReceivables]);
  const overdueCount = useMemo(() => pendingReceivables.filter(r => r.due_date && new Date(r.due_date) < new Date()).length, [pendingReceivables]);

  const now = new Date();
  const futureSales = useMemo(() => sales.filter(s => s.departure_date && new Date(s.departure_date) >= now), [sales]);
  const pastSales = useMemo(() => sales.filter(s => !s.departure_date || new Date(s.departure_date) < now), [sales]);

  const assignedName = conversation.assigned_to ? (profiles[conversation.assigned_to] || "—") : "Sem responsável";

  // Next best action
  const nextActions = useMemo(() => {
    const actions: { text: string; alert: boolean }[] = [];
    const lastMsgDate = new Date(conversation.last_message_at);
    const hoursSince = (Date.now() - lastMsgDate.getTime()) / 3600000;

    if (hoursSince > 48) actions.push({ text: `Sem resposta há ${Math.floor(hoursSince / 24)} dias`, alert: true });
    if (overdueCount > 0) actions.push({ text: `${overdueCount} pagamento(s) vencido(s)`, alert: true });
    if (futureSales.length > 0) {
      const next = futureSales[0];
      const daysUntil = Math.ceil((new Date(next.departure_date).getTime() - Date.now()) / 86400000);
      if (daysUntil <= 30) actions.push({ text: `Viagem em ${daysUntil} dias — enviar checklist`, alert: daysUntil <= 7 });
    }
    if (conversation.is_vip && hoursSince > 24) actions.push({ text: "Cliente VIP aguardando resposta", alert: true });
    if (totalPending > 0 && !overdueCount) actions.push({ text: `${fmt(totalPending)} em parcelas futuras`, alert: false });
    if (actions.length === 0) actions.push({ text: "Tudo em dia ✓", alert: false });
    return actions;
  }, [conversation, overdueCount, futureSales, totalPending]);

  const handleAddNote = useCallback(async () => {
    if (!newNote.trim() || !clientData?.id) return;
    setAddingNote(true);
    const { error } = await supabase.from("client_notes").insert({
      client_id: clientData.id,
      content: newNote.trim(),
    });
    if (!error) {
      setNotes(prev => [{ id: `temp_${Date.now()}`, content: newNote.trim(), created_at: new Date().toISOString(), client_id: clientData.id }, ...prev]);
      setNewNote("");
      toast({ title: "Nota adicionada" });
    }
    setAddingNote(false);
  }, [newNote, clientData]);

  const stageInfo = STAGES.find(s => s.key === conversation.stage) || STAGES[0];

  return (
    <div className="w-[340px] border-l border-border flex flex-col h-full bg-card/50 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contexto do Cliente</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ScrollArea className="flex-1">
          {/* ─── Client Card ─── */}
          <div className="px-4 py-4 border-b border-border/30">
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                {profilePic ? (
                  <img src={profilePic} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-border/30" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-bold text-primary ring-2 ring-border/30">
                    {initials}
                  </div>
                )}
                {conversation.is_vip && (
                  <div className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center ring-2 ring-card">
                    <Star className="h-2.5 w-2.5 text-white fill-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground truncate">{clientData?.display_name || conversation.contact_name}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">{formatPhoneDisplay(conversation.phone)}</span>
                </div>
                {clientData?.email && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground truncate">{clientData.email}</span>
                  </div>
                )}
                {(clientData?.city || clientData?.state) && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">{[clientData.city, clientData.state].filter(Boolean).join(", ")}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mt-3">
              {conversation.is_vip && (
                <Badge className="bg-amber-500/10 text-amber-500 text-[9px] gap-0.5 px-1.5 py-0">
                  <Star className="h-2.5 w-2.5 fill-current" /> VIP
                </Badge>
              )}
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 capitalize">{conversation.source?.replace("_", " ") || "WhatsApp"}</Badge>
              {conversation.tags?.slice(0, 2).map(tag => (
                <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 py-0">{tag}</Badge>
              ))}
            </div>

            {/* Assigned */}
            <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-muted-foreground">
              <User className="h-3 w-3" />
              <span>Responsável:</span>
              <span className="font-medium text-foreground">{assignedName}</span>
            </div>
          </div>

          {/* ─── AI Quote Summary ─── */}
          <QuoteSummaryCard conversationDbId={conversation.db_id || conversation.id} />

          {/* ─── Stage ─── */}
          <Section title="Etapa do Funil" icon={Tag} defaultOpen={true}>
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${stageInfo.color}`} />
              <Select value={conversation.stage} onValueChange={s => onStageChange(s as Stage)}>
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map(s => (
                    <SelectItem key={s.key} value={s.key} className="text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${s.color}`} />{s.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Visual pipeline */}
            <div className="flex gap-0.5 mt-2">
              {STAGES.filter(s => s.key !== "perdido").map((s, i) => {
                const currentIdx = STAGES.findIndex(st => st.key === conversation.stage);
                const isActive = i <= currentIdx;
                return (
                  <div
                    key={s.key}
                    className={`h-1 flex-1 rounded-full transition-colors ${isActive ? s.color : 'bg-secondary/50'}`}
                  />
                );
              })}
            </div>
          </Section>

          {/* ─── Next Best Action ─── */}
          <Section title="Próxima Ação" icon={Sparkles} defaultOpen={true}>
            <div className="space-y-1.5">
              {nextActions.map((action, i) => (
                <div key={i} className={`flex items-start gap-2 text-xs rounded-lg px-2.5 py-1.5 ${action.alert ? 'bg-destructive/5 text-destructive' : 'bg-secondary/30 text-foreground'}`}>
                  {action.alert ? <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> : <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0 text-emerald-500" />}
                  <span>{action.text}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* ─── Commercial Summary ─── */}
          <Section title="Resumo Comercial" icon={TrendingUp} defaultOpen={true}>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-secondary/30 p-2.5 text-center">
                <p className="text-base font-bold text-foreground">{totalTrips}</p>
                <p className="text-[9px] text-muted-foreground">Viagens</p>
              </div>
              <div className="rounded-lg bg-secondary/30 p-2.5 text-center">
                <p className="text-base font-bold text-emerald-500">{fmt(totalRevenue)}</p>
                <p className="text-[9px] text-muted-foreground">Total vendido</p>
              </div>
              <div className="rounded-lg bg-secondary/30 p-2.5 text-center">
                <p className="text-sm font-bold text-foreground">{fmt(avgTicket)}</p>
                <p className="text-[9px] text-muted-foreground">Ticket médio</p>
              </div>
              <div className="rounded-lg bg-secondary/30 p-2.5 text-center">
                <p className={`text-sm font-bold ${totalPending > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>{fmt(totalPending)}</p>
                <p className="text-[9px] text-muted-foreground">Em aberto</p>
              </div>
            </div>
          </Section>

          {/* ─── Trips ─── */}
          {sales.length > 0 && (
            <Section
              title="Viagens"
              icon={Plane}
              defaultOpen={futureSales.length > 0}
              badge={futureSales.length > 0 ? <Badge className="bg-blue-500/10 text-blue-500 text-[8px] px-1 py-0 h-3.5">{futureSales.length} próxima{futureSales.length > 1 ? 's' : ''}</Badge> : undefined}
            >
              <div className="space-y-2">
                {sales.slice(0, 5).map(sale => {
                  const isFuture = sale.departure_date && new Date(sale.departure_date) >= now;
                  const daysUntil = sale.departure_date ? Math.ceil((new Date(sale.departure_date).getTime() - Date.now()) / 86400000) : null;
                  return (
                    <button
                      key={sale.id}
                      onClick={() => navigate(`/sales/${sale.id}`)}
                      className={`w-full text-left rounded-lg p-2.5 transition-colors hover:bg-secondary/50 ${isFuture ? 'bg-blue-500/5 border border-blue-500/10' : 'bg-secondary/20'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground truncate">
                          {sale.destination_iata || sale.name || "Viagem"}
                        </span>
                        {isFuture && daysUntil !== null && (
                          <Badge className={`text-[8px] px-1 py-0 h-3.5 ${daysUntil <= 7 ? 'bg-destructive/10 text-destructive' : 'bg-blue-500/10 text-blue-500'}`}>
                            {daysUntil}d
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {sale.departure_date && (
                          <span className="text-[10px] text-muted-foreground">{fmtDate(sale.departure_date)}</span>
                        )}
                        {sale.received_value > 0 && (
                          <span className="text-[10px] text-emerald-500 font-medium">{fmt(sale.received_value)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <div className={`h-1.5 w-1.5 rounded-full ${sale.status === "Cancelado" ? "bg-destructive" : isFuture ? "bg-blue-500" : "bg-emerald-500"}`} />
                        <span className="text-[9px] text-muted-foreground">{sale.status || (isFuture ? "Confirmada" : "Concluída")}</span>
                      </div>
                    </button>
                  );
                })}
                {sales.length > 5 && (
                  <button onClick={() => clientData?.id && navigate(`/clients/${clientData.id}`)} className="w-full text-center text-[10px] text-primary hover:underline py-1">
                    Ver todas ({sales.length})
                  </button>
                )}
              </div>
            </Section>
          )}

          {/* ─── Financial ─── */}
          {(pendingReceivables.length > 0 || receivables.length > 0) && (
            <Section
              title="Financeiro"
              icon={DollarSign}
              defaultOpen={overdueCount > 0}
              badge={overdueCount > 0 ? <Badge className="bg-destructive/10 text-destructive text-[8px] px-1 py-0 h-3.5">{overdueCount} vencido{overdueCount > 1 ? 's' : ''}</Badge> : undefined}
            >
              <div className="space-y-1.5">
                {pendingReceivables.slice(0, 5).map(r => {
                  const isOverdue = r.due_date && new Date(r.due_date) < new Date();
                  return (
                    <div key={r.id} className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs ${isOverdue ? 'bg-destructive/5' : 'bg-secondary/20'}`}>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <CreditCard className={`h-3 w-3 shrink-0 ${isOverdue ? 'text-destructive' : 'text-amber-500'}`} />
                        <span className="truncate text-foreground">{r.description || "Parcela"}</span>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className={`font-medium ${isOverdue ? 'text-destructive' : 'text-foreground'}`}>{fmt(r.gross_value || r.net_value)}</p>
                        {r.due_date && <p className="text-[9px] text-muted-foreground">{fmtDate(r.due_date)}</p>}
                      </div>
                    </div>
                  );
                })}
                {receivables.filter(r => r.status === "recebido").length > 0 && (
                  <p className="text-[10px] text-emerald-500 flex items-center gap-1 px-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {receivables.filter(r => r.status === "recebido").length} pagamento(s) recebido(s)
                  </p>
                )}
              </div>
            </Section>
          )}

          {/* ─── Timeline ─── */}
          <Section title="Timeline" icon={Activity} defaultOpen={false}>
            {timeline.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Nenhum evento registrado.</p>
            ) : (
              <div className="space-y-0.5">
                {timeline.slice(0, 15).map((ev, i) => (
                  <TimelineItem key={i} {...ev} />
                ))}
                {timeline.length > 15 && clientData?.id && (
                  <button onClick={() => navigate(`/clients/${clientData.id}`)} className="w-full text-center text-[10px] text-primary hover:underline py-1">
                    Ver timeline completa
                  </button>
                )}
              </div>
            )}
          </Section>

          {/* ─── Notes ─── */}
          <Section title="Observações" icon={StickyNote} defaultOpen={false}>
            <div className="space-y-2">
              <div className="flex gap-1.5">
                <Textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Adicionar nota interna..."
                  className="min-h-[60px] text-xs resize-none"
                  rows={2}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 mt-auto"
                  disabled={!newNote.trim() || addingNote}
                  onClick={handleAddNote}
                >
                  {addingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </Button>
              </div>
              {notes.slice(0, 10).map(note => (
                <div key={note.id} className="bg-secondary/20 rounded-lg px-2.5 py-2">
                  <p className="text-xs text-foreground leading-relaxed">{note.content}</p>
                  <p className="text-[9px] text-muted-foreground mt-1">{fmtDateTime(note.created_at)}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Bottom link to full profile */}
          {clientData?.id && (
            <div className="px-4 py-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs gap-1.5"
                onClick={() => navigate(`/clients/${clientData.id}`)}
              >
                <ExternalLink className="h-3 w-3" />
                Abrir perfil completo
              </Button>
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  );
}
