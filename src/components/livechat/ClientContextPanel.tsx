import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { WhatsAppAvatar } from "@/components/inbox/WhatsAppAvatar";
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
import { ProfilePictureViewer } from "./ProfilePictureViewer";

// ─── Types ───
type Stage = "novo_lead" | "contato_inicial" | "qualificacao" | "diagnostico" | "proposta_preparacao" | "proposta_enviada" | "proposta_visualizada" | "ajustes" | "negociacao" | "fechamento_andamento" | "fechado" | "pos_venda" | "perdido";

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
  { key: "contato_inicial", label: "Contato Inicial", color: "bg-sky-500" },
  { key: "qualificacao", label: "Qualificação", color: "bg-amber-500" },
  { key: "diagnostico", label: "Diagnóstico", color: "bg-yellow-500" },
  { key: "proposta_preparacao", label: "Estruturação", color: "bg-orange-500" },
  { key: "proposta_enviada", label: "Proposta Enviada", color: "bg-purple-500" },
  { key: "proposta_visualizada", label: "Visualizada", color: "bg-violet-500" },
  { key: "ajustes", label: "Ajustes", color: "bg-pink-500" },
  { key: "negociacao", label: "Negociação", color: "bg-primary" },
  { key: "fechamento_andamento", label: "Fechando", color: "bg-rose-500" },
  { key: "fechado", label: "Viagem Confirmada", color: "bg-emerald-500" },
  { key: "pos_venda", label: "Pós-venda", color: "bg-teal-500" },
  { key: "perdido", label: "Perdido", color: "bg-muted-foreground" },
];

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
const fmtDateTime = (d: string) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

import { formatPhoneDisplay } from "@/lib/phone";


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
  const [lastAgentMsgAt, setLastAgentMsgAt] = useState<string | null>(null);
  const [lastClientMsgAt, setLastClientMsgAt] = useState<string | null>(null);
  const [agentHasReplied, setAgentHasReplied] = useState(false);
  const [msgStats, setMsgStats] = useState<{ totalClient: number; totalAgent: number; avgResponseHours: number | null }>({ totalClient: 0, totalAgent: 0, avgResponseHours: null });
  const [showProfileViewer, setShowProfileViewer] = useState(false);

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
        const convId = dbConv?.id;
        const clientId = dbConv?.client_id;

        // Fetch last agent/client messages + stats for smart actions
        if (convId) {
          const [agentMsg, clientMsg, agentCount, clientCount] = await Promise.all([
            supabase.from("conversation_messages").select("created_at").eq("conversation_id", convId).eq("sender_type", "atendente").eq("direction", "outgoing").order("created_at", { ascending: false }).limit(1),
            supabase.from("conversation_messages").select("created_at").eq("conversation_id", convId).eq("sender_type", "cliente").eq("direction", "incoming").order("created_at", { ascending: false }).limit(1),
            supabase.from("conversation_messages").select("id", { count: "exact", head: true }).eq("conversation_id", convId).eq("sender_type", "atendente"),
            supabase.from("conversation_messages").select("id", { count: "exact", head: true }).eq("conversation_id", convId).eq("sender_type", "cliente"),
          ]);
          if (!cancelled) {
            const agentAt = agentMsg.data?.[0]?.created_at || null;
            const clientAt = clientMsg.data?.[0]?.created_at || null;
            setLastAgentMsgAt(agentAt);
            setLastClientMsgAt(clientAt);
            setAgentHasReplied(!!(agentAt && (!clientAt || new Date(agentAt) >= new Date(clientAt))));
            setMsgStats({
              totalClient: clientCount.count || 0,
              totalAgent: agentCount.count || 0,
              avgResponseHours: null,
            });
          }
        }

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

  // ─── Conversation-level timeline data ───
  const [convTimelineData, setConvTimelineData] = useState<{
    firstClientMsg: { content: string; created_at: string } | null;
    firstAgentReply: { created_at: string } | null;
    lastMsgAt: string | null;
    totalMessages: number;
    mediaCount: number;
    audioCount: number;
    docCount: number;
    proposals: any[];
    aiSuggestions: any[];
    keyMilestones: { content: string; created_at: string; direction: string; message_type: string }[];
    inactivityGaps: { from: string; to: string; hours: number }[];
    conversationCreatedAt: string | null;
  }>({
    firstClientMsg: null, firstAgentReply: null, lastMsgAt: null,
    totalMessages: 0, mediaCount: 0, audioCount: 0, docCount: 0,
    proposals: [], aiSuggestions: [], keyMilestones: [], inactivityGaps: [],
    conversationCreatedAt: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const phone = conversation.phone?.replace(/\D/g, "") || "";
      const phoneCandidates = [phone, `+${phone}`, `${phone}@c.us`, `${phone}@s.whatsapp.net`].filter(Boolean);

      const { data: convRows } = await supabase
        .from("conversations")
        .select("id, created_at")
        .or(phoneCandidates.map(p => `phone.eq.${p}`).join(","));

      const convIds = (convRows || []).map(c => c.id);
      if (convIds.length === 0 || cancelled) return;

      const convCreated = convRows?.[0]?.created_at || null;

      // Parallel fetch: first client msg, first agent reply, counts, proposals, AI suggestions, recent key messages
      const [
        firstClientRes, firstAgentRes, countRes, mediaCountRes, audioCountRes, docCountRes,
        lastMsgRes, proposalsRes, aiSuggestionsRes, recentMsgsRes,
      ] = await Promise.all([
        // First inbound client message (what they wanted)
        supabase.from("conversation_messages" as any)
          .select("content, created_at")
          .in("conversation_id", convIds).eq("direction", "incoming")
          .order("created_at", { ascending: true }).limit(1),
        // First agent reply
        supabase.from("conversation_messages" as any)
          .select("created_at")
          .in("conversation_id", convIds).eq("direction", "outgoing")
          .order("created_at", { ascending: true }).limit(1),
        // Total count
        supabase.from("conversation_messages" as any)
          .select("id", { count: "exact", head: true }).in("conversation_id", convIds),
        // Media count (images/videos)
        supabase.from("conversation_messages" as any)
          .select("id", { count: "exact", head: true }).in("conversation_id", convIds)
          .in("message_type", ["image", "video"]),
        // Audio count
        supabase.from("conversation_messages" as any)
          .select("id", { count: "exact", head: true }).in("conversation_id", convIds)
          .eq("message_type", "audio"),
        // Document count
        supabase.from("conversation_messages" as any)
          .select("id", { count: "exact", head: true }).in("conversation_id", convIds)
          .eq("message_type", "document"),
        // Last message
        supabase.from("conversation_messages" as any)
          .select("created_at")
          .in("conversation_id", convIds).order("created_at", { ascending: false }).limit(1),
        // Proposals
        supabase.from("proposals")
          .select("id, title, status, created_at, total_value")
          .or(convIds.map(id => `conversation_id.eq.${id}`).join(","))
          .order("created_at", { ascending: false }).limit(10),
        // AI suggestions used
        supabase.from("ai_chat_suggestions")
          .select("suggestion_text, action_taken, intent_detected, destination_detected, created_at")
          .in("conversation_id", convIds)
          .not("action_taken", "is", null)
          .order("created_at", { ascending: false }).limit(5),
        // Sample of messages to detect inactivity gaps (timestamps only, last 200)
        supabase.from("conversation_messages" as any)
          .select("created_at, direction, message_type, content")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: true }).limit(200),
      ]);

      if (cancelled) return;

      // Detect inactivity gaps > 48h
      const allMsgTimestamps = ((recentMsgsRes.data || []) as any[]);
      const gaps: { from: string; to: string; hours: number }[] = [];
      for (let i = 1; i < allMsgTimestamps.length; i++) {
        const prev = new Date(allMsgTimestamps[i - 1].created_at).getTime();
        const curr = new Date(allMsgTimestamps[i].created_at).getTime();
        const diffH = (curr - prev) / 3600000;
        if (diffH > 48) {
          gaps.push({ from: allMsgTimestamps[i - 1].created_at, to: allMsgTimestamps[i].created_at, hours: Math.round(diffH) });
        }
      }

      // Extract key milestones: first image sent by client, first doc, etc
      const milestones: any[] = [];
      const seenTypes = new Set<string>();
      for (const m of allMsgTimestamps) {
        const key = `${m.direction}_${m.message_type}`;
        if (!seenTypes.has(key) && m.message_type !== "text") {
          seenTypes.add(key);
          milestones.push(m);
        }
      }

      const firstClient = (firstClientRes.data as any)?.[0] || null;

      setConvTimelineData({
        firstClientMsg: firstClient ? { content: firstClient.content || "", created_at: firstClient.created_at } : null,
        firstAgentReply: (firstAgentRes.data as any)?.[0] || null,
        lastMsgAt: (lastMsgRes.data as any)?.[0]?.created_at || null,
        totalMessages: countRes.count || 0,
        mediaCount: mediaCountRes.count || 0,
        audioCount: audioCountRes.count || 0,
        docCount: docCountRes.count || 0,
        proposals: proposalsRes.data || [],
        aiSuggestions: (aiSuggestionsRes.data || []) as any[],
        keyMilestones: milestones,
        inactivityGaps: gaps.slice(0, 5),
        conversationCreatedAt: convCreated,
      });
    })();
    return () => { cancelled = true; };
  }, [conversation.id, conversation.phone]);

  // Build timeline events
  const timeline = useMemo(() => {
    const events: any[] = [];
    const td = convTimelineData;

    // ─── Conversation created ───
    if (td.conversationCreatedAt) {
      events.push({
        icon: MessageSquare, iconColor: "text-primary",
        title: "Conversa iniciada",
        description: `${td.totalMessages} mensagens no total`,
        time: fmtDateTime(td.conversationCreatedAt),
        ts: new Date(td.conversationCreatedAt).getTime(),
      });
    }

    // ─── First client message with context ───
    if (td.firstClientMsg) {
      const preview = td.firstClientMsg.content?.slice(0, 100) || "";
      events.push({
        icon: MessageSquare, iconColor: "text-primary",
        title: "Primeiro contato do cliente",
        description: preview ? `"${preview}${preview.length >= 100 ? "…" : ""}"` : undefined,
        time: fmtDateTime(td.firstClientMsg.created_at),
        ts: new Date(td.firstClientMsg.created_at).getTime(),
      });
    }

    // ─── First agent reply ───
    if (td.firstAgentReply) {
      const responseTime = td.firstClientMsg
        ? Math.round((new Date(td.firstAgentReply.created_at).getTime() - new Date(td.firstClientMsg.created_at).getTime()) / 60000)
        : null;
      events.push({
        icon: Send, iconColor: "text-emerald-500",
        title: "Primeira resposta do agente",
        description: responseTime !== null
          ? responseTime < 60 ? `Tempo de resposta: ${responseTime}min` : `Tempo de resposta: ${Math.round(responseTime / 60)}h`
          : undefined,
        time: fmtDateTime(td.firstAgentReply.created_at),
        ts: new Date(td.firstAgentReply.created_at).getTime(),
      });
    }

    // ─── Media milestones ───
    if (td.mediaCount > 0) {
      const firstMedia = td.keyMilestones.find(m => m.message_type === "image" || m.message_type === "video");
      if (firstMedia) {
        events.push({
          icon: Eye, iconColor: "text-blue-500",
          title: `${td.mediaCount} foto${td.mediaCount > 1 ? "s" : ""}/vídeo${td.mediaCount > 1 ? "s" : ""} trocado${td.mediaCount > 1 ? "s" : ""}`,
          description: firstMedia.direction === "incoming" ? "Cliente enviou mídia" : "Agente enviou mídia",
          time: fmtDateTime(firstMedia.created_at),
          ts: new Date(firstMedia.created_at).getTime(),
        });
      }
    }

    if (td.audioCount > 0) {
      const firstAudio = td.keyMilestones.find(m => m.message_type === "audio");
      if (firstAudio) {
        events.push({
          icon: MessageSquare, iconColor: "text-violet-500",
          title: `${td.audioCount} áudio${td.audioCount > 1 ? "s" : ""} na conversa`,
          time: fmtDateTime(firstAudio.created_at),
          ts: new Date(firstAudio.created_at).getTime(),
        });
      }
    }

    if (td.docCount > 0) {
      const firstDoc = td.keyMilestones.find(m => m.message_type === "document");
      if (firstDoc) {
        events.push({
          icon: FileText, iconColor: "text-orange-500",
          title: `${td.docCount} documento${td.docCount > 1 ? "s" : ""} compartilhado${td.docCount > 1 ? "s" : ""}`,
          time: fmtDateTime(firstDoc.created_at),
          ts: new Date(firstDoc.created_at).getTime(),
        });
      }
    }

    // ─── Proposals ───
    td.proposals.forEach(p => {
      const statusLabel = p.status === "sent" ? "Enviada" : p.status === "viewed" ? "Visualizada" : p.status === "accepted" ? "Aceita" : p.status === "rejected" ? "Recusada" : p.status || "Rascunho";
      events.push({
        icon: FileText,
        iconColor: p.status === "accepted" ? "text-emerald-500" : p.status === "rejected" ? "text-destructive" : "text-amber-500",
        title: `Proposta: ${p.title || "Sem título"} — ${statusLabel}`,
        description: p.total_value ? fmt(p.total_value) : undefined,
        time: fmtDate(p.created_at),
        ts: new Date(p.created_at).getTime(),
      });
    });

    // ─── AI suggestions used ───
    td.aiSuggestions.forEach(s => {
      const parts = [s.intent_detected, s.destination_detected].filter(Boolean);
      events.push({
        icon: Sparkles, iconColor: "text-primary",
        title: `IA detectou: ${parts.join(", ") || s.suggestion_text?.slice(0, 60) || "sugestão"}`,
        description: s.action_taken ? `Ação: ${s.action_taken}` : undefined,
        time: fmtDateTime(s.created_at),
        ts: new Date(s.created_at).getTime(),
      });
    });

    // ─── Inactivity gaps ───
    td.inactivityGaps.forEach(gap => {
      const days = Math.round(gap.hours / 24);
      events.push({
        icon: Clock, iconColor: "text-amber-500",
        title: `${days > 1 ? `${days} dias` : `${gap.hours}h`} sem interação`,
        description: "Período de inatividade na conversa",
        time: fmtDate(gap.to),
        ts: new Date(gap.to).getTime(),
        alert: gap.hours > 168, // > 1 week
      });
    });

    // ─── Current stage ───
    const stage = conversation.stage;
    if (stage && stage !== "novo_lead") {
      const stageLabels: Record<string, string> = {
        contato_inicial: "Contato Inicial", qualificacao: "Qualificação", diagnostico: "Diagnóstico",
        proposta_preparacao: "Preparando Proposta", proposta_enviada: "Proposta Enviada",
        proposta_visualizada: "Proposta Visualizada", ajustes: "Ajustes", negociacao: "Negociação",
        fechamento_andamento: "Fechamento em Andamento", fechado: "Fechado", pos_venda: "Pós-Venda", perdido: "Perdido",
      };
      events.push({
        icon: Tag,
        iconColor: stage === "fechado" ? "text-emerald-500" : stage === "perdido" ? "text-destructive" : "text-primary",
        title: `Etapa atual: ${stageLabels[stage] || stage}`,
        time: "Agora",
        ts: Date.now(),
      });
    }

    // ─── Last message ───
    if (td.lastMsgAt) {
      const hoursSince = (Date.now() - new Date(td.lastMsgAt).getTime()) / 3600000;
      events.push({
        icon: MessageSquare, iconColor: hoursSince > 48 ? "text-amber-500" : "text-muted-foreground",
        title: hoursSince > 48 ? `Última mensagem (há ${Math.round(hoursSince / 24)}d)` : "Última mensagem",
        time: fmtDateTime(td.lastMsgAt),
        ts: new Date(td.lastMsgAt).getTime(),
      });
    }

    // ─── Client-level events (when linked) ───
    sales.forEach(s => {
      events.push({
        icon: Plane, iconColor: "text-blue-500",
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
        icon: StickyNote, iconColor: "text-muted-foreground",
        title: n.content.slice(0, 80),
        time: fmtDateTime(n.created_at),
        ts: new Date(n.created_at).getTime(),
      });
    });

    events.sort((a, b) => b.ts - a.ts);
    return events.slice(0, 30);
  }, [sales, receivables, notes, convTimelineData, conversation.stage]);

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

  // Next best action — stage-aware + reply-aware + engagement-aware
  const nextActions = useMemo(() => {
    const actions: { text: string; alert: boolean; priority: number }[] = [];
    const stage = conversation.stage || "novo_lead";

    // ─── Time calculations ───
    const hoursSinceClient = lastClientMsgAt ? (Date.now() - new Date(lastClientMsgAt).getTime()) / 3600000 : Infinity;
    const hoursSinceAgent = lastAgentMsgAt ? (Date.now() - new Date(lastAgentMsgAt).getTime()) / 3600000 : Infinity;
    const clientWaiting = !agentHasReplied && lastClientMsgAt;
    const neverReplied = msgStats.totalAgent === 0 && msgStats.totalClient > 0;
    const isOneWay = msgStats.totalAgent === 0; // agent never sent anything
    const engagementRatio = msgStats.totalClient > 0 ? msgStats.totalAgent / msgStats.totalClient : 0;
    const lowEngagement = engagementRatio < 0.3 && msgStats.totalClient > 5;

    // ─── CRITICAL: Client waiting for reply ───
    if (clientWaiting) {
      if (neverReplied) {
        actions.push({ text: `Lead com ${msgStats.totalClient} msg sem nenhuma resposta!`, alert: true, priority: 100 });
      } else if (hoursSinceClient > 72) {
        actions.push({ text: `Cliente esperando há ${Math.floor(hoursSinceClient / 24)} dias!`, alert: true, priority: 95 });
      } else if (hoursSinceClient > 24) {
        actions.push({ text: `Sem resposta há ${Math.round(hoursSinceClient)}h — responda agora`, alert: true, priority: 90 });
      } else if (hoursSinceClient > 4) {
        actions.push({ text: `Cliente esperando há ${Math.round(hoursSinceClient)}h`, alert: true, priority: 80 });
      } else if (hoursSinceClient > 0.5) {
        actions.push({ text: "Cliente aguardando resposta", alert: true, priority: 70 });
      }
    }

    // ─── VIP priority ───
    if (conversation.is_vip && clientWaiting) {
      actions.push({ text: "⭐ Cliente VIP aguardando — prioridade máxima!", alert: true, priority: 99 });
    }

    // ─── Overdue payments ───
    if (overdueCount > 0) {
      actions.push({ text: `${overdueCount} pagamento(s) vencido(s)!`, alert: true, priority: 85 });
    }

    // ─── Upcoming trips ───
    if (futureSales.length > 0) {
      const next = futureSales[0];
      const daysUntil = Math.ceil((new Date(next.departure_date).getTime() - Date.now()) / 86400000);
      if (daysUntil <= 3) actions.push({ text: `Viagem em ${daysUntil} dias — preparar documentos!`, alert: true, priority: 92 });
      else if (daysUntil <= 7) actions.push({ text: `Viagem em ${daysUntil} dias — confirmar tudo`, alert: true, priority: 75 });
      else if (daysUntil <= 14) actions.push({ text: `Viagem em ${daysUntil} dias — enviar checklist`, alert: false, priority: 50 });
      else if (daysUntil <= 30) actions.push({ text: `Viagem em ${daysUntil} dias`, alert: false, priority: 30 });
    }

    // ─── Stage-specific guidance (only when not urgently waiting) ───
    if (stage === "novo_lead") {
      if (agentHasReplied) {
        actions.push({ text: "Já respondido — avance para Contato Inicial", alert: false, priority: 40 });
      } else if (!clientWaiting) {
        actions.push({ text: "Apresente-se e entenda a demanda", alert: false, priority: 35 });
      }
    }
    if (stage === "contato_inicial") {
      if (!clientWaiting) actions.push({ text: "Colete destino, datas e nº de passageiros", alert: false, priority: 35 });
    }
    if (stage === "qualificacao") {
      if (!clientData) actions.push({ text: "Vincule ao CRM para acompanhar melhor", alert: true, priority: 60 });
      if (!clientWaiting) actions.push({ text: "Confirme orçamento e preferências", alert: false, priority: 35 });
    }
    if (stage === "diagnostico") {
      if (!clientWaiting) actions.push({ text: "Mapeie estilo de viagem e experiências", alert: false, priority: 35 });
    }
    if (stage === "proposta_preparacao") {
      if (hoursSinceAgent > 48) actions.push({ text: "Roteiro parado — finalize e envie", alert: true, priority: 65 });
      else if (hoursSinceAgent > 24) actions.push({ text: "Envie atualização ao cliente sobre o roteiro", alert: false, priority: 45 });
      else actions.push({ text: "Monte o roteiro e envie a proposta", alert: false, priority: 35 });
    }
    if (stage === "proposta_enviada") {
      if (clientWaiting) actions.push({ text: "Cliente respondeu à proposta — responda!", alert: true, priority: 88 });
      else if (hoursSinceAgent > 72) actions.push({ text: "Follow-up urgente — sem retorno há 3+ dias", alert: true, priority: 70 });
      else if (hoursSinceAgent > 48) actions.push({ text: "Follow-up — sem retorno há 2 dias", alert: true, priority: 55 });
      else if (hoursSinceAgent > 24) actions.push({ text: "Considere follow-up da proposta", alert: false, priority: 40 });
      else actions.push({ text: "Aguardando retorno sobre a proposta", alert: false, priority: 20 });
    }
    if (stage === "proposta_visualizada") {
      actions.push({ text: "Proposta visualizada — contate agora!", alert: true, priority: 82 });
    }
    if (stage === "ajustes") {
      if (clientWaiting) actions.push({ text: "Cliente pediu ajustes — ação imediata!", alert: true, priority: 85 });
      else actions.push({ text: "Aplique ajustes e reenvie a proposta", alert: hoursSinceAgent > 12, priority: hoursSinceAgent > 12 ? 60 : 35 });
    }
    if (stage === "negociacao") {
      if (!clientWaiting) actions.push({ text: "Negocie condições e busque o fechamento", alert: false, priority: 40 });
    }
    if (stage === "fechamento_andamento") {
      actions.push({ text: "Finalize contrato e confirme pagamento", alert: true, priority: 75 });
    }
    if (stage === "fechado") {
      actions.push({ text: "Envie boas-vindas e docs da viagem", alert: false, priority: 30 });
    }
    if (stage === "pos_venda") {
      if (hoursSinceAgent > 168) actions.push({ text: "Sem contato há 7+ dias — peça feedback", alert: false, priority: 40 });
      else actions.push({ text: "Peça feedback e ofereça próxima viagem", alert: false, priority: 25 });
    }
    if (stage === "perdido") {
      actions.push({ text: "Registre o motivo da perda", alert: false, priority: 20 });
    }

    // ─── Engagement alerts ───
    if (lowEngagement && !isOneWay) {
      actions.push({ text: "Engajamento baixo — mais respostas necessárias", alert: true, priority: 55 });
    }

    if ((conversation as any).unread_count > 5) {
      actions.push({ text: `${(conversation as any).unread_count} mensagens não lidas!`, alert: true, priority: 65 });
    }

    if (totalPending > 0 && !overdueCount) {
      actions.push({ text: `${fmt(totalPending)} em parcelas futuras`, alert: false, priority: 15 });
    }

    if (actions.length === 0) actions.push({ text: "Tudo em dia ✓", alert: false, priority: 0 });

    // Sort by priority, deduplicate
    actions.sort((a, b) => b.priority - a.priority);
    const seen = new Set<string>();
    return actions.filter(a => { if (seen.has(a.text)) return false; seen.add(a.text); return true; }).slice(0, 5);
  }, [conversation, overdueCount, futureSales, totalPending, clientData, agentHasReplied, lastClientMsgAt, lastAgentMsgAt, msgStats]);

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
              <button
                type="button"
                onClick={() => setShowProfileViewer(true)}
                className="relative shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 transition-transform hover:scale-105"
                aria-label="Ver foto de perfil"
              >
                <WhatsAppAvatar
                  src={profilePic}
                  name={clientData?.display_name || conversation.contact_name || ""}
                  phone={conversation.phone}
                  className="h-12 w-12 ring-2 ring-border/30"
                  textClassName="text-sm"
                />
                {conversation.is_vip && (
                  <div className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center ring-2 ring-card">
                    <Star className="h-2.5 w-2.5 text-white fill-white" />
                  </div>
                )}
              </button>
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

          {/* ─── AI Proposal Button ─── */}
          <div className="px-4 pb-2">
            <Button
              onClick={() => setShowBriefingDialog(true)}
              className="w-full gap-2 h-9 text-xs font-semibold"
              variant="default"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Criar proposta com IA
            </Button>
          </div>

          <AIProposalBriefingDialog
            open={showBriefingDialog}
            onOpenChange={setShowBriefingDialog}
            conversationDbId={conversation.db_id || conversation.id}
            contactName={conversation.contact_name}
          />
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

      <ProfilePictureViewer
        open={showProfileViewer}
        onClose={() => setShowProfileViewer(false)}
        name={clientData?.display_name || conversation.contact_name || formatPhoneDisplay(conversation.phone)}
        phone={conversation.phone}
        phoneDisplay={formatPhoneDisplay(conversation.phone)}
        email={clientData?.email}
        city={clientData?.city}
        state={clientData?.state}
        pictureUrl={profilePic}
        initials={initials}
        isVip={conversation.is_vip}
        source={conversation.source}
        tags={conversation.tags}
      />
    </div>
  );
}
