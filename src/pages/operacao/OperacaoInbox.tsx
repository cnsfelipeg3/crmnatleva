import { useState, useRef, useEffect, useCallback, Fragment, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Search, Send, Paperclip, Smile, Sparkles,
  User, Tag, Clock, Star, FileText,
  Plus, X, Check, Eye,
  Image, Mic, Video, File, ArrowLeft, RefreshCw,
  ChevronRight, Bot,
  CheckCheck, Workflow, Brain, Loader2,
  Trash2, WifiOff, Pin, PinOff, Pencil, Wand2,
} from "lucide-react";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { AudioWaveformPlayer } from "@/components/livechat/AudioWaveformPlayer";
import { AISuggestionPanel } from "@/components/livechat/AISuggestionPanel";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { initPersistence, persistConversation, persistMessages, loadPersistedMessages } from "@/hooks/useChatPersistence";
import { ContactProfilePanel } from "@/components/livechat/ContactProfilePanel";
import { ConversationSummaryDialog } from "@/components/livechat/ConversationSummaryDialog";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

// ─── Types ───
type Stage = "novo_lead" | "qualificacao" | "proposta_preparacao" | "proposta_enviada" | "negociacao" | "fechado" | "pos_venda" | "perdido";
type MsgType = "text" | "image" | "audio" | "video" | "document";
type MsgStatus = "sent" | "delivered" | "read";

interface Conversation {
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
  vehicle_interest?: string;
  price_range?: string;
  payment_method?: string;
  lead_id?: string;
  is_pinned?: boolean;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_type: "cliente" | "atendente" | "sistema";
  message_type: MsgType;
  text: string;
  media_url?: string;
  status: MsgStatus;
  created_at: string;
  raw_message?: any;
  quoted_msg?: { text: string; sender_type: "cliente" | "atendente" | "sistema"; message_type: MsgType };
  edited?: boolean;
}

// ─── Constants ───
const STAGES: { key: Stage; label: string; color: string }[] = [
  { key: "novo_lead", label: "Novo Lead", color: "bg-blue-500" },
  { key: "qualificacao", label: "Qualificação", color: "bg-amber-500" },
  { key: "proposta_preparacao", label: "Prep. Proposta", color: "bg-orange-500" },
  { key: "proposta_enviada", label: "Proposta Enviada", color: "bg-purple-500" },
  { key: "negociacao", label: "Negociação", color: "bg-primary" },
  { key: "fechado", label: "Fechado ✓", color: "bg-emerald-500" },
  { key: "pos_venda", label: "Pós-venda", color: "bg-teal-500" },
  { key: "perdido", label: "Perdido", color: "bg-muted-foreground" },
];

const FILTERS = [
  { key: "all", label: "Todas" },
  { key: "unread", label: "Não lidas" },
  { key: "mine", label: "Minhas" },
  { key: "vip", label: "VIP" },
  { key: "qualificacao", label: "Em qualificação" },
  { key: "proposta_enviada", label: "Proposta enviada" },
  { key: "no_reply", label: "Sem resposta" },
];

// ─── Helpers ───
function normalizeTimestamp(dateStr: string): Date {
  if (!dateStr) return new Date(0);
  try {
    const direct = new Date(dateStr);
    if (!isNaN(direct.getTime()) && direct.getTime() > 0) return direct;
    let normalized = dateStr;
    if (normalized.includes(" ") && !normalized.includes("T")) normalized = normalized.replace(" ", "T");
    if (/[+-]\d{2}$/.test(normalized)) normalized += ":00";
    const date = new Date(normalized);
    return isNaN(date.getTime()) ? new Date(0) : date;
  } catch { return new Date(0); }
}

function formatTimestamp(dateStr: string): string {
  if (!dateStr) return "";
  const date = normalizeTimestamp(dateStr);
  if (date.getTime() === 0) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][date.getDay()];
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`;
}

function formatMsgTime(dateStr: string): string {
  const date = normalizeTimestamp(dateStr);
  if (date.getTime() === 0) return "";
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateSeparator(dateStr: string): string {
  const date = normalizeTimestamp(dateStr);
  if (date.getTime() === 0) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / 86400000);
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

function shouldShowDateSeparator(msgs: Message[], index: number): boolean {
  if (index === 0) return true;
  const prev = normalizeTimestamp(msgs[index - 1].created_at);
  const curr = normalizeTimestamp(msgs[index].created_at);
  return prev.getDate() !== curr.getDate() || prev.getMonth() !== curr.getMonth() || prev.getFullYear() !== curr.getFullYear();
}

function getStageInfo(stage: Stage) {
  return STAGES.find(s => s.key === stage) || STAGES[0];
}

function getStatusIcon(status: MsgStatus) {
  if (status === "read") return <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" style={{ filter: 'drop-shadow(0 0 1px rgba(83,189,235,0.5))' }} />;
  if (status === "delivered") return <CheckCheck className="h-3 w-3 text-white" />;
  return <Check className="h-3 w-3 text-white" />;
}

function mapZapiStatus(zapiStatus: string | null | undefined, fromMe: boolean): MsgStatus {
  if (!fromMe) return "delivered";
  const s = (zapiStatus || "").toUpperCase();
  if (s === "READ" || s === "PLAYED") return "read";
  if (s === "RECEIVED" || s === "DELIVERED" || s === "DELIVERY_ACK") return "delivered";
  return "sent";
}

function formatPhoneDisplay(number: string): string {
  const clean = number.replace(/\D/g, "");
  if (clean.startsWith("55") && clean.length >= 12) {
    const ddd = clean.slice(2, 4);
    const rest = clean.slice(4);
    if (rest.length === 9) return `+55 (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
    if (rest.length === 8) return `+55 (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  if (clean.length >= 10) return `+${clean}`;
  return number;
}

// Z-API helper
async function callZapiProxy(action: string, payload?: any) {
  const { data, error } = await supabase.functions.invoke("zapi-proxy", {
    body: { action, payload },
  });
  if (error) throw new Error(error.message || "Erro na chamada Z-API");
  return data;
}

// ════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════
function OperacaoInboxInner() {
  const isMobile = useIsMobile();
  const { toggleSidebar } = useSidebar();

  // Inbox state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [flowRunning, setFlowRunning] = useState(false);
  const [botActive, setBotActive] = useState(true);
  const [activeFlowName, setActiveFlowName] = useState<string | null>(null);
  const flowNameCacheRef = useRef<Record<string, string | null>>({});
  const [waConnected, setWaConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selected = conversations.find(c => c.id === selectedId);
  const currentMessages = selectedId ? (messages[selectedId] || []) : [];

  const getZapiPhoneCandidates = useCallback((conversationId: string) => {
    const phone = conversationId.replace("wa_", "").trim();
    if (!phone) return [] as string[];
    return Array.from(new Set([phone, `${phone}-group`, `${phone}@g.us`]));
  }, []);

  // Load active flow name for selected conversation
  useEffect(() => {
    if (!selectedId) { setActiveFlowName(null); return; }
    if (flowNameCacheRef.current[selectedId] !== undefined) {
      setActiveFlowName(flowNameCacheRef.current[selectedId]);
      return;
    }
    let cancelled = false;
    (async () => {
      let logs: any[] | null = null;
      const { data: directLogs } = await supabase
        .from("flow_execution_logs" as any)
        .select("flow_id, flows!flow_execution_logs_flow_id_fkey(name)")
        .eq("conversation_id", selectedId)
        .order("started_at", { ascending: false })
        .limit(1);
      logs = directLogs;

      if ((!logs || logs.length === 0) && selectedId.startsWith("wa_")) {
        const phone = selectedId.replace("wa_", "");
        const { data: conv } = await supabase
          .from("conversations")
          .select("id")
          .or(`phone.eq.${phone},external_conversation_id.eq.${selectedId}`)
          .maybeSingle();
        if (conv?.id) {
          const { data: uuidLogs } = await supabase
            .from("flow_execution_logs" as any)
            .select("flow_id, flows!flow_execution_logs_flow_id_fkey(name)")
            .eq("conversation_id", conv.id)
            .order("started_at", { ascending: false })
            .limit(1);
          logs = uuidLogs;
        }
      }

      if (cancelled) return;
      const name = (logs && logs.length > 0) ? ((logs[0] as any).flows?.name || null) : null;
      flowNameCacheRef.current[selectedId] = name;
      setActiveFlowName(name);
    })();
    return () => { cancelled = true; };
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages.length]);

  useEffect(() => {
    if (!inputText && textareaRef.current) textareaRef.current.style.height = "40px";
  }, [inputText]);

  // iOS keyboard fix
  const livechatContainerRef = useRef<HTMLDivElement>(null);
  const [mobileHeight, setMobileHeight] = useState<string>("100dvh");
  
  useEffect(() => {
    if (!isMobile) return;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.body.style.top = "0";
    const vv = window.visualViewport;
    if (!vv) return;
    const syncHeight = () => {
      setMobileHeight(`${vv.height}px`);
      window.scrollTo(0, 0);
      requestAnimationFrame(() => { messagesEndRef.current?.scrollIntoView({ behavior: "auto" }); });
    };
    syncHeight();
    vv.addEventListener("resize", syncHeight);
    vv.addEventListener("scroll", () => window.scrollTo(0, 0));
    return () => {
      vv.removeEventListener("resize", syncHeight);
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.height = "";
      document.body.style.top = "";
    };
  }, [isMobile]);

  // WhatsApp state
  const whatsappPollRef = useRef<ReturnType<typeof setInterval>>();
  const lastMsgIdsRef = useRef<Set<string>>(new Set());
  const chatsLoadedRef = useRef(false);
  const clearedAtRef = useRef<number | null>(null);
  const profilePicsRef = useRef<Map<string, string>>(new Map());
  const [profilePicsVersion, setProfilePicsVersion] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [mediaPendingFile, setMediaPendingFile] = useState<{ file: File; previewUrl: string; mediaType: string } | null>(null);
  const [mediaCaption, setMediaCaption] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval>>();
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileInputAccept, setFileInputAccept] = useState("*/*");
  const [fileInputMediaType, setFileInputMediaType] = useState("document");
  const [isSending, setIsSending] = useState(false);
  const [showContactProfile, setShowContactProfile] = useState(false);
  const [showFlowMenu, setShowFlowMenu] = useState(false);
  const [showMobilePlusMenu, setShowMobilePlusMenu] = useState(false);
  const [availableFlows, setAvailableFlows] = useState<{ id: string; name: string; status: string }[]>([]);

  // Extract media URL from zapi_messages raw_data
  const extractMediaFromRawData = useCallback((rawData: any, type: string): { mediaUrl?: string; caption?: string } => {
    if (!rawData) return {};
    try {
      const rd = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
      if (type === "audio") return { mediaUrl: rd.audio?.audioUrl || rd.audioUrl || rd.mediaUrl || undefined };
      if (type === "image") return { mediaUrl: rd.image?.imageUrl || rd.image?.thumbnailUrl || rd.imageUrl || rd.mediaUrl || undefined, caption: rd.image?.caption || rd.caption || undefined };
      if (type === "video") return { mediaUrl: rd.video?.videoUrl || rd.videoUrl || rd.mediaUrl || undefined, caption: rd.video?.caption || rd.caption || undefined };
      if (type === "document") return { mediaUrl: rd.document?.documentUrl || rd.documentUrl || rd.mediaUrl || undefined, caption: rd.document?.fileName || rd.fileName };
      if (type === "sticker") return { mediaUrl: rd.sticker?.stickerUrl || rd.stickerUrl || rd.mediaUrl || undefined };
      return {};
    } catch { return {}; }
  }, []);

  // Parse Z-API message
  const parseZapiMessage = useCallback((msg: any, convId: string): Message | null => {
    const msgId = msg.messageId || msg.id || `${Date.now()}_${Math.random()}`;
    const fromMe = msg.fromMe || false;
    let text = "";
    let msgType: MsgType = "text";
    let mediaUrl: string | undefined;

    if (msg.text?.message) text = msg.text.message;
    else if (typeof msg.text === "string") text = msg.text;
    else if (msg.body) text = msg.body;

    if (msg.image) { msgType = "image"; mediaUrl = msg.image.imageUrl || msg.image.thumbnailUrl || msg.image; text = msg.image.caption || msg.caption || text; }
    else if (msg.audio) { msgType = "audio"; mediaUrl = msg.audio.audioUrl || msg.audio; }
    else if (msg.video) { msgType = "video"; mediaUrl = msg.video.videoUrl || msg.video; text = msg.video.caption || msg.caption || text; }
    else if (msg.document) { msgType = "document"; text = `${msg.document.fileName || "Documento"}`; mediaUrl = msg.document.documentUrl || msg.document; }
    else if (msg.sticker) { msgType = "image"; mediaUrl = msg.sticker.stickerUrl || msg.sticker; }

    if (msg.type === "image" && !mediaUrl) msgType = "image";
    if (msg.type === "audio" && !mediaUrl) msgType = "audio";
    if (msg.type === "video" && !mediaUrl) msgType = "video";
    if (msg.type === "document" && !mediaUrl) msgType = "document";

    if (!text && !mediaUrl && msgType === "text") return null;

    const timestamp = msg.momment
      ? new Date(msg.momment * 1000).toISOString()
      : msg.timestamp
        ? new Date(typeof msg.timestamp === "number" ? msg.timestamp * 1000 : msg.timestamp).toISOString()
        : new Date().toISOString();

    return {
      id: msgId, conversation_id: convId,
      sender_type: fromMe ? "atendente" : "cliente",
      message_type: msgType, text,
      media_url: mediaUrl,
      status: fromMe ? "sent" : "delivered",
      created_at: timestamp,
      raw_message: msg,
    };
  }, []);

  // Load DB conversations on mount
  useEffect(() => {
    const loadDbConversations = async () => {
      await initPersistence();
      const { data } = await supabase.from("conversations").select("*").order("last_message_at", { ascending: false }).limit(50);
      if (data && data.length > 0) {
        const convIdsNeedingPreview = data.filter(c => !c.last_message_preview).map(c => c.id);
        const previewMap = new Map<string, { text: string; message_type: string; created_at: string }>();
        if (convIdsNeedingPreview.length > 0) {
          for (const convId of convIdsNeedingPreview) {
            const { data: lastMsg } = await supabase.from("chat_messages").select("content, message_type, created_at").eq("conversation_id", convId).order("created_at", { ascending: false }).limit(1).maybeSingle();
            if (lastMsg) {
              const previewEntry = { text: lastMsg.content || "", message_type: lastMsg.message_type, created_at: lastMsg.created_at };
              previewMap.set(convId, previewEntry);
              supabase.from("conversations").update({ last_message_preview: previewEntry.text || `📎 ${previewEntry.message_type}`, last_message_at: previewEntry.created_at }).eq("id", convId).then(() => {});
            }
          }
        }
        const dbConvs: Conversation[] = data.map(c => {
          const cleanPhone = (c.phone || "").replace(/\D/g, "");
          const canonicalId = cleanPhone ? `wa_${cleanPhone}` : c.id;
          const fallback = previewMap.get(c.id);
          const preview = c.last_message_preview || (fallback ? (fallback.text || `📎 ${fallback.message_type}`) : "");
          const msgAt = c.last_message_at || (fallback ? fallback.created_at : c.last_message_at);
          return {
            id: canonicalId, phone: cleanPhone || c.phone || "", contact_name: c.contact_name || c.display_name || c.phone || "Sem nome",
            stage: (c.stage || c.funnel_stage || "novo_lead") as Stage, tags: c.tags || [], source: c.source || "",
            last_message_at: msgAt || "", last_message_preview: preview,
            unread_count: c.unread_count || 0, is_vip: c.is_vip || false,
            assigned_to: c.assigned_to || "", score_potential: c.score_potential || 0,
            score_risk: c.score_risk || 0,
            is_pinned: (c as any).is_pinned || false,
          };
        });
        setConversations(prev => {
          const byId = new Map(prev.map(c => [c.id, c]));
          for (const dc of dbConvs) {
            const existing = byId.get(dc.id);
            if (existing) {
              byId.set(dc.id, {
                ...existing,
                stage: dc.stage !== "novo_lead" ? dc.stage : existing.stage,
                tags: dc.tags.length > 0 ? dc.tags : existing.tags,
                contact_name: dc.contact_name !== "Novo Contato" ? dc.contact_name : existing.contact_name,
                unread_count: Math.max(dc.unread_count, existing.unread_count),
                last_message_at: new Date(dc.last_message_at) > new Date(existing.last_message_at) ? dc.last_message_at : existing.last_message_at,
                last_message_preview: new Date(dc.last_message_at) > new Date(existing.last_message_at) ? (dc.last_message_preview || existing.last_message_preview) : existing.last_message_preview,
              });
            } else {
              byId.set(dc.id, dc);
            }
          }
          return Array.from(byId.values()).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
        });
      }
    };
    loadDbConversations();
  }, []);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedId) return;
    if (selectedId.startsWith("wa_")) {
      const phoneCandidates = getZapiPhoneCandidates(selectedId);
      if (phoneCandidates.length === 0) return;
      supabase.from("zapi_messages" as any).select("*").in("phone", phoneCandidates).order("timestamp", { ascending: true }).limit(200).then(({ data: zapiData, error: zapiErr }) => {
        if (zapiErr) { console.error("Error fetching zapi_messages:", zapiErr); return; }
        const rawMsgs = zapiData || [];
        const parsed: Message[] = rawMsgs.map((m: any) => {
          const mediaInfo = extractMediaFromRawData(m.raw_data, m.type || "text");
          return {
            id: m.message_id || m.id,
            conversation_id: selectedId,
            sender_type: (m.from_me ? "atendente" : "cliente") as "cliente" | "atendente",
            message_type: (m.type || "text") as MsgType,
            text: m.text || mediaInfo.caption || "",
            media_url: mediaInfo.mediaUrl,
            status: mapZapiStatus(m.status, m.from_me),
            created_at: m.timestamp || m.created_at,
          };
        });
        for (const p of parsed) lastMsgIdsRef.current.add(p.id);
        if (parsed.length > 0) {
          setMessages(prev => {
            const existing = prev[selectedId] || [];
            const existingMediaMap = new Map<string, string>();
            for (const m of existing) { if (m.media_url) existingMediaMap.set(m.id, m.media_url); }
            const merged = parsed.map(m => ({ ...m, media_url: m.media_url || existingMediaMap.get(m.id) }));
            return { ...prev, [selectedId]: merged };
          });
        }
      });
    } else if (selectedId.length > 10) {
      supabase.from("chat_messages").select("*").eq("conversation_id", selectedId).order("created_at").then(({ data }) => {
        if (data && data.length > 0) {
          const dbMsgs: Message[] = data.map(m => ({
            id: m.id, conversation_id: m.conversation_id,
            sender_type: m.sender_type as "cliente" | "atendente" | "sistema",
            message_type: m.message_type as MsgType,
            text: m.content || "", media_url: m.media_url || undefined,
            status: (m.read_status || "sent") as MsgStatus, created_at: m.created_at,
          }));
          setMessages(prev => ({ ...prev, [selectedId]: dbMsgs }));
        }
      });
    }
  }, [selectedId, extractMediaFromRawData, getZapiPhoneCandidates]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('livechat-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'zapi_messages' }, (payload) => {
        const n = payload.new as any;
        if (!n.phone) return;
        const cleanPhone = String(n.phone).replace(/\D/g, "");
        const waKey = `wa_${cleanPhone}`;
        const msgId = n.message_id || n.id;
        if (lastMsgIdsRef.current.has(msgId)) return;
        lastMsgIdsRef.current.add(msgId);
        const mediaInfo2 = extractMediaFromRawData(n.raw_data, n.type || "text");
        const msg: Message = {
          id: msgId, conversation_id: waKey,
          sender_type: (n.from_me ? "atendente" : "cliente") as "cliente" | "atendente",
          message_type: (n.type || "text") as MsgType,
          text: n.text || mediaInfo2.caption || "",
          media_url: mediaInfo2.mediaUrl,
          status: mapZapiStatus(n.status, n.from_me),
          created_at: n.timestamp || n.created_at,
        };
        setMessages(prev => {
          const existing = prev[waKey] || [];
          if (existing.find(m => m.id === msg.id)) return prev;
          if (n.from_me) {
            const tempIdx = existing.findIndex(m => m.id.startsWith("temp_") && m.text === msg.text && m.sender_type === "atendente");
            if (tempIdx >= 0) {
              const updated = [...existing];
              updated[tempIdx] = { ...updated[tempIdx], id: msg.id, media_url: msg.media_url || updated[tempIdx].media_url };
              return { ...prev, [waKey]: updated };
            }
          }
          return { ...prev, [waKey]: [...existing, msg].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) };
        });
        if (!n.from_me) {
          setConversations(prev => prev.map(c => {
            if (c.id !== waKey) return c;
            const isOpen = waKey === selectedIdRef.current;
            return { ...c, last_message_preview: n.text || `📎 ${n.type || "media"}`, last_message_at: n.timestamp || n.created_at || new Date().toISOString(), unread_count: isOpen ? 0 : c.unread_count + 1 };
          }));
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'zapi_messages' }, (payload) => {
        const n = payload.new as any;
        if (!n.phone || !n.message_id) return;
        const cleanPhone = String(n.phone).replace(/\D/g, "");
        const waKey = `wa_${cleanPhone}`;
        const newStatus = mapZapiStatus(n.status, n.from_me);
        setMessages(prev => {
          const existing = prev[waKey];
          if (!existing) return prev;
          const idx = existing.findIndex(m => m.id === n.message_id);
          if (idx < 0) return prev;
          if (existing[idx].status === newStatus) return prev;
          const updated = [...existing];
          updated[idx] = { ...updated[idx], status: newStatus };
          return { ...prev, [waKey]: updated };
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const old = payload.old as any;
          if (!old?.id) return;
          const cleanPhone = old.phone ? String(old.phone).replace(/\D/g, "") : "";
          const waKey = cleanPhone ? `wa_${cleanPhone}` : old.id;
          setConversations(prev => prev.filter(c => c.id !== waKey && c.id !== old.id));
          setMessages(prev => { const next = { ...prev }; delete next[waKey]; delete next[old.id]; return next; });
          if (selectedIdRef.current === waKey || selectedIdRef.current === old.id) setSelectedId(null);
          return;
        }
        const u = payload.new as any;
        if (!u?.id || !u?.phone) return;
        const cleanPhone = String(u.phone).replace(/\D/g, "");
        const waKey = cleanPhone ? `wa_${cleanPhone}` : u.id;

        if (u.last_message_preview === "__CONTACT_EXCLUDED__" || u.unread_count === -1) {
          setConversations(prev => prev.filter(c => c.id !== waKey && c.id !== u.id));
          setMessages(prev => { const next = { ...prev }; delete next[waKey]; delete next[u.id]; return next; });
          if (selectedIdRef.current === waKey || selectedIdRef.current === u.id) setSelectedId(null);
          return;
        }

        setConversations(prev => {
          const existsWa = prev.find(c => c.id === waKey);
          const existsUuid = prev.find(c => c.id === u.id);
          const target = existsWa || existsUuid;
          if (target) {
            const isOpen = target.id === selectedIdRef.current || waKey === selectedIdRef.current;
            const existingTime = new Date(target.last_message_at).getTime();
            const incomingTime = new Date(u.last_message_at || 0).getTime();
            const bestTime = incomingTime > existingTime ? u.last_message_at : target.last_message_at;
            const bestPreview = (incomingTime > existingTime && u.last_message_preview) ? u.last_message_preview : (target.last_message_preview || u.last_message_preview);
            const updated = prev.map(c => (c.id === target.id) ? {
              ...c, id: waKey, phone: cleanPhone || c.phone,
              last_message_preview: bestPreview, last_message_at: bestTime,
              unread_count: isOpen ? 0 : Math.max(c.unread_count, u.unread_count ?? 0),
              stage: (u.stage as Stage) || c.stage, tags: u.tags || c.tags,
              contact_name: c.contact_name || u.contact_name, source: u.source || c.source,
            } : c).filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i);
            return updated.sort((a, b) => {
              if (a.is_pinned && !b.is_pinned) return -1;
              if (!a.is_pinned && b.is_pinned) return 1;
              return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
            });
          }
          return [{ id: waKey, phone: cleanPhone || u.phone, contact_name: u.contact_name || u.display_name || u.phone || "Sem nome",
            stage: (u.stage || u.funnel_stage || "novo_lead") as Stage, tags: u.tags || [], source: u.source || "",
            last_message_at: u.last_message_at || "", last_message_preview: u.last_message_preview || "",
            unread_count: u.unread_count || 0, is_vip: u.is_vip || false,
            assigned_to: u.assigned_to || "", score_potential: u.score_potential || 0, score_risk: u.score_risk || 0,
          }, ...prev];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [extractMediaFromRawData]);

  // Z-API WhatsApp polling
  useEffect(() => {
    const POLL_MS = 5000;

    async function loadChats() {
      try {
        const data = await callZapiProxy("get-chats");
        const chats = Array.isArray(data) ? data : [];
        const phoneList = chats.map((c: any) => (c.phone || c.id || "").replace(/\D/g, "")).filter(Boolean);
        const knownPhones = new Set<string>();
        if (phoneList.length > 0) {
          const { data: dbConvs } = await supabase.from("conversations").select("phone").in("phone", phoneList);
          for (const c of dbConvs || []) knownPhones.add(c.phone || "");
        }
        const newConvs: Conversation[] = [];
        for (const chat of chats) {
          const phone = chat.phone || chat.id || "";
          if (!phone || phone.includes("@g.us") || phone === "status@broadcast") continue;
          const cleanPhone = phone.replace(/\D/g, "");
          if (!cleanPhone) continue;
          if (!knownPhones.has(cleanPhone)) continue;
          const convId = `wa_${cleanPhone}`;
          const contactName = chat.name || chat.chatName || chat.contact?.name || formatPhoneDisplay(cleanPhone);
          let lastMsgTime: string | null = null;
          try {
            if (chat.lastMessageTimestamp && Number(chat.lastMessageTimestamp) > 0) lastMsgTime = new Date(Number(chat.lastMessageTimestamp) * 1000).toISOString();
            else if (chat.lastMessageTime && Number(chat.lastMessageTime) > 0) lastMsgTime = new Date(Number(chat.lastMessageTime)).toISOString();
          } catch { lastMsgTime = null; }
          const chatPhoto = chat.imgUrl || chat.image || chat.photo || "";
          newConvs.push({
            id: convId, phone: cleanPhone, contact_name: contactName,
            stage: "novo_lead" as Stage, tags: [], source: "whatsapp",
            last_message_at: lastMsgTime || new Date().toISOString(),
            last_message_preview: chat.lastMessage || chat.lastMessageText || "",
            unread_count: chat.unreadMessages || chat.unread || 0,
            is_vip: false, assigned_to: "", score_potential: 0, score_risk: 0,
          });
          if (chatPhoto && typeof chatPhoto === "string" && chatPhoto.startsWith("http")) {
            profilePicsRef.current.set(convId, chatPhoto);
          }
        }
        if (newConvs.length > 0) {
          const deduped = new Map<string, Conversation>();
          for (const conv of newConvs) {
            const existing = deduped.get(conv.id);
            if (!existing || new Date(conv.last_message_at).getTime() > new Date(existing.last_message_at).getTime()) deduped.set(conv.id, conv);
          }
          const dedupedConvs = Array.from(deduped.values()).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
          setConversations(prev => {
            const prevMap = new Map(prev.map(c => [c.id, c]));
            const merged = dedupedConvs.map(c => {
              const existing = prevMap.get(c.id);
              if (existing) {
                const isOpen = c.id === selectedIdRef.current;
                const existingTime = new Date(existing.last_message_at).getTime();
                const freshTime = new Date(c.last_message_at).getTime();
                return { ...c, contact_name: existing.contact_name || c.contact_name, last_message_at: freshTime > existingTime ? c.last_message_at : existing.last_message_at, last_message_preview: (freshTime > existingTime && c.last_message_preview) ? c.last_message_preview : (existing.last_message_preview || c.last_message_preview), unread_count: isOpen ? 0 : existing.unread_count, stage: existing.stage || c.stage, tags: existing.tags.length > 0 ? existing.tags : c.tags, is_vip: existing.is_vip || c.is_vip, assigned_to: existing.assigned_to || c.assigned_to, is_pinned: existing.is_pinned || c.is_pinned };
              }
              return c;
            });
            const freshIds = new Set(dedupedConvs.map(c => c.id));
            const kept = prev.filter(c => !freshIds.has(c.id));
            return [...kept, ...merged].sort((a, b) => {
              if (a.is_pinned && !b.is_pinned) return -1;
              if (!a.is_pinned && b.is_pinned) return 1;
              return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
            });
          });
          for (const conv of dedupedConvs) persistConversation(conv).catch(() => {});
          // Fetch profile pictures
          for (const conv of dedupedConvs.slice(0, 30)) {
            if (!profilePicsRef.current.has(conv.id)) {
              callZapiProxy("get-profile-picture", { phone: conv.phone }).then(data => {
                const picUrl = data?.link || data?.profilePictureUrl || "";
                if (picUrl && typeof picUrl === "string" && picUrl.startsWith("http")) {
                  profilePicsRef.current.set(conv.id, picUrl);
                  setProfilePicsVersion(v => v + 1);
                }
              }).catch(() => {});
            }
          }
        }
        chatsLoadedRef.current = true;
      } catch (err) { console.error("Error loading chats:", err); }
    }

    async function pollWhatsAppMessages() {
      if (!selectedId?.startsWith("wa_")) return;
      try {
        const phoneCandidates = getZapiPhoneCandidates(selectedId);
        if (phoneCandidates.length === 0) return;
        const { data: zapiData } = await supabase.from("zapi_messages" as any).select("*").in("phone", phoneCandidates).order("timestamp", { ascending: true }).limit(200);
        const rawMsgs = zapiData || [];
        const newMsgs: Message[] = [];
        for (const m of rawMsgs) {
          const msgId = (m as any).message_id || (m as any).id;
          if (lastMsgIdsRef.current.has(msgId)) continue;
          lastMsgIdsRef.current.add(msgId);
          const mediaInfo3 = extractMediaFromRawData((m as any).raw_data, (m as any).type || "text");
          newMsgs.push({
            id: msgId, conversation_id: selectedId,
            sender_type: ((m as any).from_me ? "atendente" : "cliente") as "cliente" | "atendente",
            message_type: ((m as any).type || "text") as MsgType,
            text: (m as any).text || mediaInfo3.caption || "",
            media_url: mediaInfo3.mediaUrl,
            status: mapZapiStatus((m as any).status, (m as any).from_me),
            created_at: (m as any).timestamp || (m as any).created_at,
          });
        }
        if (newMsgs.length > 0) {
          setMessages(prev => {
            const existing = prev[selectedId] || [];
            const existingIds = new Set(existing.map(m => m.id));
            let updated = [...existing];
            for (const nm of newMsgs) {
              if (existingIds.has(nm.id)) continue;
              if (nm.sender_type === "atendente") {
                const tempIdx = updated.findIndex(m => m.id.startsWith("temp_") && m.text === nm.text);
                if (tempIdx >= 0) { updated[tempIdx] = { ...updated[tempIdx], id: nm.id, media_url: nm.media_url || updated[tempIdx].media_url }; continue; }
              }
              updated.push(nm);
            }
            updated.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            return { ...prev, [selectedId]: updated };
          });
        }
      } catch (err) { console.error("WhatsApp polling error:", err); }
    }

    async function checkAndStartPolling() {
      try {
        const data = await callZapiProxy("check-status");
        if (data?.connected) {
          setWaConnected(true);
          await loadChats();
          pollWhatsAppMessages();
          whatsappPollRef.current = setInterval(pollWhatsAppMessages, POLL_MS);
        } else { setWaConnected(false); }
      } catch { setWaConnected(false); }
    }

    checkAndStartPolling();
    return () => { if (whatsappPollRef.current) clearInterval(whatsappPollRef.current); };
  }, [selectedId, extractMediaFromRawData, getZapiPhoneCandidates]);

  const filteredConversations = (() => {
    const filtered = conversations.filter(c => {
      const contactName = c.contact_name || "";
      const phone = c.phone || "";
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!contactName.toLowerCase().includes(q) && !phone.includes(q)) return false;
      }
      if (activeFilter === "unread") return c.unread_count > 0;
      if (activeFilter === "vip") return c.is_vip;
      if (activeFilter === "qualificacao") return c.stage === "qualificacao";
      if (activeFilter === "proposta_enviada") return c.stage === "proposta_enviada";
      if (activeFilter === "no_reply") return c.unread_count > 0 && c.assigned_to === "";
      return true;
    }).sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });
    const seen = new Set<string>();
    return filtered.filter(c => {
      const norm = (c.phone || "").replace(/\D/g, "");
      if (!norm) return true;
      if (seen.has(norm)) return false;
      seen.add(norm);
      return true;
    });
  })();

  // Execute flow engine
  const executeFlow = useCallback(async (conversationId: string, messageText: string) => {
    if (!botActive) return;
    setFlowRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("execute-flow", {
        body: { conversation_id: conversationId, trigger_type: "new_message", trigger_data: { message_text: messageText, message_type: "text" } },
      });
      if (error) { console.error("Flow execution error:", error); return; }
      if (data?.status === "no_active_flow") return;
      if (data?.actions_applied?.length > 0) {
        toast({ title: "Flow executado", description: `${data.steps} blocos · ${data.actions_applied.length} ações aplicadas` });
      }
    } catch (err) { console.error("Flow invoke error:", err); }
    finally { setFlowRunning(false); }
  }, [botActive]);

  // Correct message via AI
  const correctMessage = useCallback(async (rawText: string): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke("correct-message", { body: { text: rawText } });
      if (error || !data?.corrected) return rawText;
      return data.corrected;
    } catch { return rawText; }
  }, []);

  const [isCorrecting, setIsCorrecting] = useState(false);
  const handleCorrectText = useCallback(async () => {
    if (!inputText.trim() || isCorrecting) return;
    setIsCorrecting(true);
    const corrected = await correctMessage(inputText.trim());
    setInputText(corrected);
    setIsCorrecting(false);
    textareaRef.current?.focus();
  }, [inputText, isCorrecting, correctMessage]);

  // Send message
  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !selectedId || isSending) return;
    setIsSending(true);
    const text = inputText.trim();

    if (editingMsg) {
      const msgToEdit = editingMsg;
      setInputText(""); setEditingMsg(null);
      textareaRef.current?.focus();
      setMessages(prev => ({ ...prev, [selectedId]: (prev[selectedId] || []).map(m => m.id === msgToEdit.id ? { ...m, text, edited: true } : m) }));
      if (selectedId.startsWith("wa_") && msgToEdit.id && !msgToEdit.id.startsWith("temp_")) {
        try {
          const phone = selectedId.replace("wa_", "");
          await callZapiProxy("edit-message", { phone, messageId: msgToEdit.id, text });
        } catch (err) { toast({ title: "Erro ao editar", description: "Não foi possível editar no WhatsApp", variant: "destructive" }); }
      }
      setIsSending(false);
      return;
    }

    const replyRef = replyingTo;
    setInputText(""); setShowAIPanel(false); setReplyingTo(null);
    textareaRef.current?.focus();

    if (selectedId.startsWith("wa_")) {
      const phone = selectedId.replace("wa_", "");
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const newMsg: Message = {
        id: tempId, conversation_id: selectedId, sender_type: "atendente", message_type: "text",
        text, status: "sent", created_at: new Date().toISOString(),
        quoted_msg: replyRef ? { text: replyRef.text || "📎 Mídia", sender_type: replyRef.sender_type, message_type: replyRef.message_type } : undefined,
      };
      setMessages(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] || []), newMsg] }));
      lastMsgIdsRef.current.add(tempId);
      try {
        const sendPayload: any = { phone, message: text };
        if (replyRef?.id && !replyRef.id.startsWith("temp_")) sendPayload.messageId = replyRef.id;
        const sendResult = await callZapiProxy("send-text", sendPayload);
        const realId = sendResult?.messageId || sendResult?.id;
        if (realId) {
          lastMsgIdsRef.current.add(realId);
          setMessages(prev => ({ ...prev, [selectedId]: (prev[selectedId] || []).map(m => m.id === tempId ? { ...m, id: realId } : m) }));
        }
      } catch (err) { toast({ title: "Erro ao enviar", description: "Falha na comunicação com WhatsApp", variant: "destructive" }); }
    } else if (selectedId.length > 10) {
      await supabase.from("chat_messages").insert({ conversation_id: selectedId, sender_type: "atendente", message_type: "text", content: text, read_status: "sent" });
      await supabase.from("conversations").update({ last_message_preview: text, last_message_at: new Date().toISOString(), unread_count: 0 }).eq("id", selectedId);

      if (selected?.source === "whatsapp" && selected?.phone) {
        try {
          const { data: connData } = await supabase.from("whatsapp_connections" as any).select("id").eq("status", "active").limit(1).maybeSingle();
          if (connData) {
            await supabase.functions.invoke("send-whatsapp-official", { body: { to: selected.phone, message: text, connection_id: (connData as any).id } });
          }
        } catch (err) { console.error("Error sending via official API:", err); }
      }

      const { data } = await supabase.from("chat_messages").select("*").eq("conversation_id", selectedId).order("created_at");
      if (data) {
        setMessages(prev => ({ ...prev, [selectedId]: data.map(m => ({
          id: m.id, conversation_id: m.conversation_id,
          sender_type: m.sender_type as "cliente" | "atendente" | "sistema",
          message_type: m.message_type as MsgType,
          text: m.content || "", status: (m.read_status || "sent") as MsgStatus, created_at: m.created_at,
        })) }));
      }
    }

    setConversations(prev => {
      const updated = prev.map(c => c.id === selectedId ? { ...c, last_message_preview: text, last_message_at: new Date().toISOString(), unread_count: 0 } : c);
      return updated.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });
    });
    setIsSending(false);
  }, [inputText, selectedId, selected, replyingTo, editingMsg, isSending]);

  const handleStartEdit = useCallback((msg: Message) => {
    if (msg.sender_type !== "atendente" || msg.message_type !== "text") return;
    setEditingMsg(msg); setInputText(msg.text || ""); setReplyingTo(null);
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Upload to storage
  const uploadToStorage = useCallback(async (blob: Blob | File, folder: string, fileName: string): Promise<string> => {
    const { error } = await supabase.storage.from("media").upload(`${folder}/${fileName}`, blob, { contentType: blob.type || "application/octet-stream", upsert: true });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    const { data: urlData } = supabase.storage.from("media").getPublicUrl(`${folder}/${fileName}`);
    return urlData.publicUrl;
  }, []);

  // Audio recording
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>(new Array(25).fill(4));
  const waveformIntervalRef = useRef<ReturnType<typeof setInterval>>();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      waveformIntervalRef.current = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const bars: number[] = [];
        for (let i = 0; i < 25; i++) {
          const idx = Math.floor((i / 25) * dataArray.length);
          bars.push(Math.max(4, Math.round((dataArray[idx] / 255) * 28)));
        }
        setWaveformData(bars);
      }, 100);

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
        if (waveformIntervalRef.current) clearInterval(waveformIntervalRef.current);
        setWaveformData(new Array(25).fill(4));
        const rawBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        if (rawBlob.size < 100) return;
        if (!selectedId) return;
        const phone = selectedId.replace("wa_", "");
        try {
          const arrayBuffer = await rawBlob.arrayBuffer();
          const offlineCtx = new AudioContext();
          const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);
          await offlineCtx.close();
          const sampleRate = 16000;
          const offlineRender = new OfflineAudioContext(1, audioBuffer.duration * sampleRate, sampleRate);
          const src = offlineRender.createBufferSource();
          src.buffer = audioBuffer;
          src.connect(offlineRender.destination);
          src.start(0);
          const renderedBuffer = await offlineRender.startRendering();
          const samples = renderedBuffer.getChannelData(0);
          const wavBuffer = new ArrayBuffer(44 + samples.length * 2);
          const view = new DataView(wavBuffer);
          const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
          writeStr(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); writeStr(8, 'WAVE'); writeStr(12, 'fmt ');
          view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
          view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
          view.setUint16(32, 2, true); view.setUint16(34, 16, true);
          writeStr(36, 'data'); view.setUint32(40, samples.length * 2, true);
          for (let i = 0; i < samples.length; i++) {
            const s = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
          }
          const blob = new Blob([wavBuffer], { type: 'audio/wav' });
          const fileName = `audio_${Date.now()}.wav`;
          const { error: uploadError } = await supabase.storage.from('audios').upload(fileName, blob, { contentType: 'audio/wav', upsert: true });
          if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
          const { data: urlData } = supabase.storage.from('audios').getPublicUrl(fileName);
          const audioUrl = urlData.publicUrl;
          const localUrl = URL.createObjectURL(blob);
          await callZapiProxy("send-audio", { phone, audio: audioUrl });
          const tempId = `temp_audio_${Date.now()}`;
          lastMsgIdsRef.current.add(tempId);
          setMessages(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] || []), {
            id: tempId, conversation_id: selectedId, sender_type: "atendente" as const,
            message_type: "audio" as MsgType, text: "", status: "sent" as MsgStatus, created_at: new Date().toISOString(), media_url: localUrl,
          }] }));
        } catch (err) { toast({ title: "Erro ao enviar áudio", description: String(err), variant: "destructive" }); }
      };
      mediaRecorder.start();
      setIsRecording(true); setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => { setRecordingTime(t => { if (t >= 119) { stopRecording(); return t; } return t + 1; }); }, 1000);
    } catch { toast({ title: "Erro", description: "Não foi possível acessar o microfone", variant: "destructive" }); }
  }, [selectedId, uploadToStorage]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setRecordingTime(0);
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") { audioChunksRef.current = []; mediaRecorderRef.current.stop(); }
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    if (waveformIntervalRef.current) clearInterval(waveformIntervalRef.current);
    setWaveformData(new Array(25).fill(4));
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setRecordingTime(0);
  }, []);

  // Paste handler
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || !selectedId) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        if (file.type.startsWith("image/")) {
          setMediaPendingFile({ file, previewUrl: URL.createObjectURL(file), mediaType: "image" });
        }
        return;
      }
    }
  }, [selectedId]);

  // File upload
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    if (fileInputMediaType === "image") {
      setMediaPendingFile({ file, previewUrl: URL.createObjectURL(file), mediaType: "image" });
      setMediaCaption(""); e.target.value = ""; setShowMediaMenu(false); return;
    }
    const phone = selectedId.replace("wa_", "");
    try {
      const ext = file.name.split('.').pop() || "bin";
      const folder = fileInputMediaType === "video" ? "videos" : "documents";
      const fileName = `${fileInputMediaType}_${Date.now()}.${ext}`;
      const publicUrl = await uploadToStorage(file, folder, fileName);
      if (fileInputMediaType === "video") await callZapiProxy("send-video", { phone, video: publicUrl, caption: "" });
      else await callZapiProxy("send-document", { phone, document: publicUrl, fileName: file.name, extension: ext });
      const label = fileInputMediaType === "video" ? "Vídeo" : `${file.name}`;
      const tempId = `temp_media_${Date.now()}`;
      lastMsgIdsRef.current.add(tempId);
      setMessages(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] || []), {
        id: tempId, conversation_id: selectedId, sender_type: "atendente" as const,
        message_type: fileInputMediaType as MsgType, text: label, status: "sent" as MsgStatus, created_at: new Date().toISOString(), media_url: publicUrl,
      }] }));
    } catch (err) { toast({ title: "Erro ao enviar mídia", description: String(err), variant: "destructive" }); }
    e.target.value = ""; setShowMediaMenu(false);
  }, [selectedId, fileInputMediaType, uploadToStorage]);

  // Send pending image with caption
  const handleSendPendingMedia = useCallback(async () => {
    if (!mediaPendingFile || !selectedId || isSending) return;
    setIsSending(true);
    const { file, previewUrl } = mediaPendingFile;
    const caption = mediaCaption.trim();
    const phone = selectedId.replace("wa_", "");
    try {
      const ext = file.name.split('.').pop() || "jpg";
      const fileName = `image_${Date.now()}.${ext}`;
      const publicUrl = await uploadToStorage(file, "images", fileName);
      await callZapiProxy("send-image", { phone, image: publicUrl, caption });
      const tempId = `temp_media_${Date.now()}`;
      lastMsgIdsRef.current.add(tempId);
      setMessages(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] || []), {
        id: tempId, conversation_id: selectedId, sender_type: "atendente" as const,
        message_type: "image" as MsgType, text: caption || "📷 Imagem", status: "sent" as MsgStatus, created_at: new Date().toISOString(), media_url: previewUrl,
      }] }));
    } catch (err) { toast({ title: "Erro ao enviar mídia", description: String(err), variant: "destructive" }); }
    setMediaPendingFile(null); setMediaCaption(""); setIsSending(false);
  }, [mediaPendingFile, mediaCaption, selectedId, uploadToStorage, isSending]);

  const handleTogglePin = useCallback(async (convId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    const newPinned = !conv.is_pinned;
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, is_pinned: newPinned } : c));
    const cleanPhone = (conv.phone || "").replace(/\D/g, "");
    if (cleanPhone) await supabase.from("conversations").update({ is_pinned: newPinned } as any).eq("phone", cleanPhone);
  }, [conversations]);

  const handleSelectConversation = (id: string) => {
    setSelectedId(id); setShowAIPanel(false);
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unread_count: 0 } : c));
    if (id.length > 10) supabase.from("conversations").update({ unread_count: 0 }).eq("id", id).then(() => {});
  };

  const handleClearConversations = useCallback(() => {
    setConversations([]); setMessages({}); setSelectedId(null);
    lastMsgIdsRef.current.clear(); chatsLoadedRef.current = true;
    clearedAtRef.current = Math.floor(Date.now() / 1000);
    toast({ title: "Conversas limpas", description: "Todas as conversas foram removidas do dashboard." });
    setShowClearConfirm(false);
  }, []);

  const handleEmojiSelect = useCallback((emoji: any) => {
    setInputText(prev => prev + (emoji.native || emoji.shortcodes || ""));
    setShowEmojiPicker(false); textareaRef.current?.focus();
  }, []);

  const handleStageChange = (convId: string, newStage: Stage) => {
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, stage: newStage } : c));
    toast({ title: "Etapa atualizada", description: `Conversa movida para ${getStageInfo(newStage).label}` });
  };

  const handleAISuggest = () => { if (!selectedId) return; setShowAIPanel(prev => !prev); };
  const handleUseSuggestion = (text: string) => { setInputText(text); setShowAIPanel(false); textareaRef.current?.focus(); };

  const loadFlows = useCallback(async () => {
    const { data } = await supabase.from("flows" as any).select("id, name, status").in("status", ["ativo", "publicado", "rascunho"]).order("name");
    setAvailableFlows((data as any[] || []) as { id: string; name: string; status: string }[]);
  }, []);

  const handleTriggerFlow = useCallback(async (flowId: string, flowName: string) => {
    if (!selectedId || !selected) return;
    setShowFlowMenu(false);
    const phone = selectedId.startsWith("wa_") ? selectedId.replace("wa_", "") : selected.phone;
    const { data: conv } = await supabase.from("conversations").select("id").or(`phone.eq.${phone},external_conversation_id.eq.wa_${phone}`).maybeSingle();
    if (!conv?.id) { toast({ title: "Erro", description: "Conversa não encontrada no banco de dados.", variant: "destructive" }); return; }
    try {
      const { data: result, error } = await supabase.functions.invoke("execute-flow", {
        body: { conversation_id: conv.id, flow_id: flowId, trigger_type: "manual", trigger_data: { message_text: "manual_trigger", triggered_by: "atendente" } },
      });
      if (error) throw error;
      setActiveFlowName(flowName);
      toast({ title: "Fluxo iniciado", description: `"${flowName}" foi ativado para esta conversa.` });
    } catch (err: any) { toast({ title: "Erro ao iniciar fluxo", description: err.message, variant: "destructive" }); }
  }, [selectedId, selected]);

  const totalUnread = conversations.reduce((s, c) => s + c.unread_count, 0);

  return (
    <div
      ref={livechatContainerRef}
      className={`flex flex-col overflow-hidden bg-background ${isMobile ? "fixed inset-0 z-50" : "h-full"}`}
      style={isMobile ? { height: mobileHeight } : undefined}
    >
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* ─── Column 1: Conversations List ─── */}
          <div className={`md:w-[340px] w-full border-r border-border flex flex-col bg-card/30 md:shrink-0 ${isMobile && selectedId ? "hidden" : ""}`}>
            <div className="p-3 space-y-2 shrink-0">
              {/* ChatLive title row */}
              <div className="flex items-center gap-2 pb-1">
                {isMobile && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={toggleSidebar}>
                    <Menu className="h-4 w-4" />
                  </Button>
                )}
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-bold tracking-tight text-foreground">ChatLive</span>
                {totalUnread > 0 && <Badge className="bg-primary text-primary-foreground font-mono text-[10px] px-1.5 py-0 h-4">{totalUnread}</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar nome ou telefone..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 pr-8 h-9 text-sm bg-background" />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Limpar conversas</AlertDialogTitle>
                      <AlertDialogDescription>Tem certeza que deseja limpar todas as conversas do dashboard? As conversas no WhatsApp não serão apagadas.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearConversations} className="bg-destructive text-destructive-foreground">Limpar tudo</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <ScrollArea className="w-full">
                <div className="flex gap-1">
                  {FILTERS.map(f => (
                    <button key={f.key} onClick={() => setActiveFilter(f.key)} className={`px-2.5 py-1 text-[10px] rounded-full whitespace-nowrap font-medium transition-all ${activeFilter === f.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              <div className="px-2 pb-2">
                {filteredConversations.map(conv => {
                  const stageInfo = getStageInfo(conv.stage);
                  const isSelected = conv.id === selectedId;
                  const _previewRaw = (conv.last_message_preview || "").replace(/\n/g, " ").trim();
                  const _previewTruncated = _previewRaw.length > 35 ? _previewRaw.slice(0, 35) + "…" : _previewRaw;
                  const _contactName = conv.contact_name || "Sem nome";
                  return (
                    <motion.div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`group p-3 rounded-lg cursor-pointer mb-1 transition-all border ${isSelected ? "bg-primary/5 border-primary/20" : "border-transparent hover:bg-secondary/50"}`}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          {profilePicsRef.current.get(conv.id) ? (
                            <img src={profilePicsRef.current.get(conv.id)} alt="" className="h-10 w-10 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }} />
                          ) : null}
                          <div className={`h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-foreground ${profilePicsRef.current.get(conv.id) ? 'hidden' : ''}`}>
                            {_contactName.split(" ").map(w => w[0]).join("").slice(0, 2)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 pr-1">
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '4px' }}>
                            <span className={`text-sm truncate ${conv.unread_count > 0 ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
                              {/^\d{10,}$/.test(_contactName) ? formatPhoneDisplay(_contactName) : _contactName}
                            </span>
                            <span className="text-[11px] text-foreground whitespace-nowrap">
                              {formatTimestamp(conv.last_message_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className={`text-xs truncate flex-1 min-w-0 ${conv.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                              {(() => {
                                if (!_previewRaw) return <span className="text-muted-foreground/50 italic">Sem mensagens</span>;
                                const isAudio = _previewRaw === "📎 audio" || _previewRaw.toLowerCase().includes("mensagem de voz") || _previewRaw.toLowerCase() === "audio" || _previewRaw === "🎤 Áudio";
                                const isImage = _previewRaw === "📎 image" || _previewRaw.toLowerCase().includes("📷");
                                const isVideo = _previewRaw === "📎 video";
                                const isDocument = _previewRaw === "📎 document";
                                if (isAudio) return <><Mic className="h-3 w-3 text-primary shrink-0" /> <span>Mensagem de voz</span></>;
                                if (isImage) return <><Image className="h-3 w-3 shrink-0" /> <span>Foto</span></>;
                                if (isVideo) return <><Video className="h-3 w-3 shrink-0" /> <span>Vídeo</span></>;
                                if (isDocument) return <><File className="h-3 w-3 shrink-0" /> <span>Documento</span></>;
                                return _previewTruncated;
                              })()}
                            </p>
                            <div className="flex items-center gap-1 shrink-0">
                              {conv.is_pinned && <Pin className="h-3 w-3 text-muted-foreground rotate-45" />}
                              {conv.unread_count > 0 && (
                                <span className="h-5 min-w-[20px] rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground px-1.5">
                                  {conv.unread_count > 99 ? "99+" : conv.unread_count}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <div className={`h-1.5 w-1.5 rounded-full ${stageInfo.color}`} />
                            <span className="text-[9px] text-muted-foreground">{stageInfo.label}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                {filteredConversations.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <MessageSquare className="h-10 w-10 text-muted-foreground/20 mb-3" />
                    <p className="text-sm text-muted-foreground">{searchQuery ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{searchQuery ? "Tente buscar por outro termo" : "As mensagens recebidas aparecerão aqui"}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── Column 2: Chat ─── */}
          <div className={`flex-1 flex flex-col min-w-0 relative overflow-hidden ${isMobile && !selectedId ? "hidden" : ""}`}>
            {selected ? (
              <>
                {/* Chat header */}
                <div className="flex items-center justify-between px-2 md:px-4 py-2 md:py-2.5 border-b border-border bg-card/50 shrink-0">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                    {isMobile && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSelectedId(null)}>
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                    )}
                    <div className="flex items-center gap-2 md:gap-3 cursor-pointer hover:opacity-80 transition-opacity min-w-0 flex-1" onClick={() => setShowContactProfile(prev => !prev)}>
                      {profilePicsRef.current.get(selected.id) ? (
                        <img src={profilePicsRef.current.get(selected.id)} alt="" className="h-8 w-8 md:h-9 md:w-9 rounded-full object-cover shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }} />
                      ) : null}
                      <div className={`h-8 w-8 md:h-9 md:w-9 rounded-full bg-secondary flex items-center justify-center text-xs md:text-sm font-bold shrink-0 ${profilePicsRef.current.get(selected.id) ? 'hidden' : ''}`}>
                        {(selected.contact_name || "Sem nome").split(" ").map(w => w[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold truncate">{/^\d{10,}$/.test(selected.contact_name || "") ? formatPhoneDisplay(selected.contact_name || "") : (selected.contact_name || "Sem nome")}</span>
                          {selected.is_vip && <Badge className="bg-amber-500/10 text-amber-500 text-[8px] px-1.5 py-0 shrink-0">VIP</Badge>}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{formatPhoneDisplay(selected.phone || "")}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                    {activeFlowName && !isMobile && (
                      <Badge variant="outline" className="text-[9px] font-bold gap-1 border-primary/30 text-primary mr-2">
                        <Workflow className="h-3 w-3" />{activeFlowName}
                      </Badge>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSummaryDialog(true)}>
                          <Brain className="h-4 w-4 text-primary" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Resumir conversa com IA</TooltipContent>
                    </Tooltip>
                    <Select value={selected.stage} onValueChange={s => handleStageChange(selected.id, s as Stage)}>
                      <SelectTrigger className="h-7 text-[10px] w-[100px] md:w-[130px]">
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
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 px-4">
                  <div className="py-4 space-y-3">
                    {currentMessages.map((msg, idx) => (
                      <Fragment key={msg.id}>
                        {shouldShowDateSeparator(currentMessages, idx) && (
                          <div className="flex justify-center my-4">
                            <span className="bg-secondary/80 text-muted-foreground text-[10px] font-medium px-3 py-1.5 rounded-full">{formatDateSeparator(msg.created_at)}</span>
                          </div>
                        )}
                        <div className={`flex ${msg.sender_type === "atendente" ? "justify-end" : msg.sender_type === "sistema" ? "justify-center" : "justify-start"}`}>
                          {msg.sender_type === "sistema" ? (
                            <div className="max-w-[85%] rounded-xl px-4 py-2.5 bg-muted/50 border border-border">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Bot className="h-3 w-3 text-primary" />
                                <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Sistema / Bot</span>
                              </div>
                              <p className="text-sm leading-relaxed text-foreground">{msg.text}</p>
                              <span className="text-[9px] text-muted-foreground">{formatMsgTime(msg.created_at)}</span>
                            </div>
                          ) : (
                            <div className="group relative max-w-[70%]">
                              <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 z-10 ${msg.sender_type === "atendente" ? "-left-[72px]" : "-right-[72px]"}`}>
                                <button onClick={() => setReplyingTo(msg)} className="h-7 w-7 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center" title="Responder">
                                  <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground ${msg.sender_type === "atendente" ? "rotate-180" : ""}`} />
                                </button>
                                {msg.sender_type === "atendente" && msg.message_type === "text" && new Date(msg.created_at).getTime() > Date.now() - 3600000 && (
                                  <button onClick={() => handleStartEdit(msg)} className="h-7 w-7 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center" title="Editar">
                                    <Pencil className="h-3 w-3 text-muted-foreground" />
                                  </button>
                                )}
                              </div>
                              <div className={`rounded-2xl px-4 py-2.5 ${msg.sender_type === "atendente" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-secondary-foreground rounded-bl-md"}`}>
                                {msg.quoted_msg && (
                                  <div className={`rounded-lg px-3 py-1.5 mb-2 border-l-2 ${msg.sender_type === "atendente" ? "bg-primary-foreground/10 border-primary-foreground/40" : "bg-foreground/5 border-primary/40"}`}>
                                    <p className={`text-[10px] font-bold ${msg.sender_type === "atendente" ? "text-primary-foreground/70" : "text-primary"}`}>
                                      {msg.quoted_msg.sender_type === "atendente" ? "Você" : selected?.contact_name || "Lead"}
                                    </p>
                                    <p className={`text-xs truncate ${msg.sender_type === "atendente" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{msg.quoted_msg.text}</p>
                                  </div>
                                )}
                                {/* Audio */}
                                {msg.message_type === "audio" && (
                                  <div className="min-w-[220px]">
                                    {msg.media_url ? (
                                      <>
                                        <AudioWaveformPlayer src={msg.media_url} isOutgoing={msg.sender_type === "atendente"} msgId={msg.id} />
                                        <div className="flex items-center gap-1 mt-1">
                                          <a href={msg.media_url} download={`audio_${msg.id}.ogg`} className="text-[9px] opacity-60 hover:opacity-100 flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                                            <File className="h-2.5 w-2.5" /> Baixar
                                          </a>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="flex items-center gap-2 text-xs opacity-60 py-2"><Mic className="h-4 w-4" /><span>🎵 Áudio indisponível</span></div>
                                    )}
                                  </div>
                                )}
                                {/* Image */}
                                {msg.message_type === "image" && (
                                  <div>
                                    {msg.media_url ? (
                                      <>
                                        <img src={msg.media_url} alt="Imagem" className="rounded-lg max-w-[250px] max-h-[300px] object-cover cursor-pointer mb-1" onClick={() => setLightboxUrl(msg.media_url!)} />
                                        <div className="flex items-center gap-2 mt-1">
                                          <a href={msg.media_url} download={`imagem_${msg.id}.jpg`} className="text-[9px] opacity-60 hover:opacity-100 flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                                            <File className="h-2.5 w-2.5" /> Baixar
                                          </a>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="flex items-center gap-2 text-xs opacity-60 py-4 px-2"><Image className="h-4 w-4" /><span>📷 Imagem indisponível</span></div>
                                    )}
                                    {msg.text && <p className="text-sm leading-relaxed mt-1">{msg.text}</p>}
                                  </div>
                                )}
                                {/* Video */}
                                {msg.message_type === "video" && (
                                  <div>
                                    {msg.media_url ? (
                                      <><video controls className="rounded-lg max-w-[250px] max-h-[300px] mb-1"><source src={msg.media_url} /></video></>
                                    ) : (
                                      <div className="flex items-center gap-2 text-xs opacity-60 py-4 px-2"><Video className="h-4 w-4" /><span>🎬 Vídeo indisponível</span></div>
                                    )}
                                    {msg.text && <p className="text-sm leading-relaxed mt-1">{msg.text}</p>}
                                  </div>
                                )}
                                {/* Document */}
                                {msg.message_type === "document" && (
                                  <div className="flex items-center gap-2 py-1">
                                    <FileText className="h-5 w-5 shrink-0" />
                                    {msg.media_url ? (
                                      <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="text-sm underline hover:opacity-80">{msg.text || "Documento"}</a>
                                    ) : (
                                      <span className="text-sm">{msg.text || "Documento"}</span>
                                    )}
                                  </div>
                                )}
                                {/* Text */}
                                {msg.message_type === "text" && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                                <div className="flex items-center justify-end gap-1 mt-1">
                                  {msg.edited && <span className="text-[8px] opacity-50 italic">editada</span>}
                                  <span className="text-[9px] opacity-60">{formatMsgTime(msg.created_at)}</span>
                                  {msg.sender_type === "atendente" && getStatusIcon(msg.status)}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </Fragment>
                    ))}
                    {flowRunning && (
                      <div className="flex justify-center">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2.5 bg-muted/50 border border-border rounded-xl px-4 py-2.5">
                          <div className="flex items-center gap-1"><Bot className="h-3.5 w-3.5 text-primary" /><span className="text-[10px] font-bold text-primary uppercase tracking-wider">IA</span></div>
                          <div className="flex items-center gap-1">
                            <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="h-1.5 w-1.5 rounded-full bg-primary" />
                            <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="h-1.5 w-1.5 rounded-full bg-primary" />
                            <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="h-1.5 w-1.5 rounded-full bg-primary" />
                          </div>
                          <span className="text-[10px] text-muted-foreground">Pensando...</span>
                        </motion.div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Media pending preview */}
                {mediaPendingFile && (
                  <div className="px-4 py-3 border-t border-border bg-card/50 space-y-2">
                    <div className="flex items-center gap-3">
                      <img src={mediaPendingFile.previewUrl} alt="Preview" className="h-16 w-16 rounded-lg object-cover" />
                      <div className="flex-1"><Input placeholder="Legenda (opcional)..." value={mediaCaption} onChange={e => setMediaCaption(e.target.value)} className="h-8 text-xs" /></div>
                      <Button size="sm" onClick={handleSendPendingMedia} disabled={isSending} className="text-xs gap-1">
                        {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Enviar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setMediaPendingFile(null)}><X className="h-3 w-3" /></Button>
                    </div>
                  </div>
                )}

                {/* Reply preview */}
                {replyingTo && (
                  <div className="px-4 py-2 border-t border-border bg-card/50 flex items-center gap-3">
                    <div className="flex-1 border-l-2 border-primary pl-3">
                      <p className="text-[10px] font-bold text-primary">{replyingTo.sender_type === "atendente" ? "Você" : selected?.contact_name || "Lead"}</p>
                      <p className="text-xs text-muted-foreground truncate">{replyingTo.text || "📎 Mídia"}</p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setReplyingTo(null)}><X className="h-3 w-3" /></Button>
                  </div>
                )}

                {/* Editing preview */}
                {editingMsg && (
                  <div className="px-4 py-2 border-t border-amber-500/30 bg-amber-500/5 flex items-center gap-3">
                    <Pencil className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <div className="flex-1 border-l-2 border-amber-500 pl-3">
                      <p className="text-[10px] font-bold text-amber-500">Editando mensagem</p>
                      <p className="text-xs text-muted-foreground truncate">{editingMsg.text}</p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingMsg(null); setInputText(""); }}><X className="h-3 w-3" /></Button>
                  </div>
                )}

                {/* AI suggestion panel */}
                <AnimatePresence>
                  {showAIPanel && selectedId && (
                    <AISuggestionPanel
                      open={showAIPanel} onClose={() => setShowAIPanel(false)} onUseSuggestion={handleUseSuggestion}
                      conversationHistory={(messages[selectedId] || []).map(m => ({ text: m.text || "", sender_type: m.sender_type, message_type: m.message_type }))}
                      contactName={selected?.contact_name || "Cliente"} stage={selected?.stage || "novo_lead"}
                    />
                  )}
                </AnimatePresence>

                {/* AI Summary Dialog */}
                {selectedId && selected && (
                  <ConversationSummaryDialog
                    open={showSummaryDialog} onClose={() => setShowSummaryDialog(false)}
                    conversationHistory={(messages[selectedId] || []).map(m => ({ text: m.text || "", sender_type: m.sender_type, message_type: m.message_type }))}
                    contactName={selected.contact_name || "Cliente"} stage={selected.stage || "novo_lead"}
                  />
                )}

                {/* Disconnected warning */}
                {!waConnected && selectedId?.startsWith("wa_") && (
                  <div className="px-4 py-2 border-t border-destructive/20 bg-destructive/5 flex items-center gap-2">
                    <WifiOff className="h-4 w-4 text-destructive shrink-0" />
                    <p className="text-xs text-destructive">WhatsApp desconectado. Conecte na aba Integrações.</p>
                  </div>
                )}

                {/* Input area */}
                <div className="border-t border-border px-2 md:px-4 py-2 md:py-3 bg-card/50 shrink-0">
                  {isRecording ? (
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-destructive hover:text-destructive" onClick={cancelRecording}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
                        <span className="text-xs text-destructive font-mono font-bold min-w-[32px]">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")}</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center gap-[2px] h-[32px]">
                        {waveformData.map((h, i) => (
                          <div key={i} className="rounded-full" style={{ width: 3, height: h, backgroundColor: "hsl(var(--primary))", transition: "height 0.1s ease" }} />
                        ))}
                      </div>
                      <div className="w-16 h-1 bg-secondary rounded-full overflow-hidden shrink-0">
                        <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, (recordingTime / 120) * 100)}%` }} />
                      </div>
                      <Button size="icon" className="h-9 w-9 shrink-0" onClick={stopRecording}><Send className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <div className="flex items-end gap-1 md:gap-2">
                      {!isMobile && (
                        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0"><Smile className="h-5 w-5 text-muted-foreground" /></Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" side="top" align="start">
                            <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="dark" locale="pt" previewPosition="none" skinTonePosition="none" />
                          </PopoverContent>
                        </Popover>
                      )}

                      {isMobile ? (
                        <Popover open={showMobilePlusMenu} onOpenChange={setShowMobilePlusMenu}>
                          <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 shrink-0"><Plus className="h-5 w-5 text-muted-foreground" /></Button></PopoverTrigger>
                          <PopoverContent className="w-48 p-1" side="top" align="start">
                            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Anexos</p>
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md hover:bg-secondary transition-colors" onClick={() => { setFileInputAccept("image/*"); setFileInputMediaType("image"); fileInputRef.current?.click(); setShowMobilePlusMenu(false); }}>
                              <Image className="h-4 w-4 text-blue-400" /> Imagem
                            </button>
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md hover:bg-secondary transition-colors" onClick={() => { setFileInputAccept("video/*"); setFileInputMediaType("video"); fileInputRef.current?.click(); setShowMobilePlusMenu(false); }}>
                              <Video className="h-4 w-4 text-purple-400" /> Vídeo
                            </button>
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md hover:bg-secondary transition-colors" onClick={() => { setFileInputAccept("*/*"); setFileInputMediaType("document"); fileInputRef.current?.click(); setShowMobilePlusMenu(false); }}>
                              <File className="h-4 w-4 text-amber-400" /> Documento
                            </button>
                            <Separator className="my-1" />
                            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ferramentas</p>
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md hover:bg-secondary transition-colors" onClick={() => { handleAISuggest(); setShowMobilePlusMenu(false); }}>
                              <Sparkles className="h-4 w-4 text-primary" /> Sugestão IA
                            </button>
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md hover:bg-secondary transition-colors" onClick={() => { loadFlows(); setShowFlowMenu(true); setShowMobilePlusMenu(false); }}>
                              <Workflow className="h-4 w-4 text-muted-foreground" /> Iniciar Fluxo
                            </button>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <Popover open={showMediaMenu} onOpenChange={setShowMediaMenu}>
                          <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 shrink-0"><Paperclip className="h-5 w-5 text-muted-foreground" /></Button></PopoverTrigger>
                          <PopoverContent className="w-40 p-1" side="top" align="start">
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md hover:bg-secondary transition-colors" onClick={() => { setFileInputAccept("image/*"); setFileInputMediaType("image"); fileInputRef.current?.click(); }}>
                              <Image className="h-4 w-4 text-blue-400" /> Imagem
                            </button>
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md hover:bg-secondary transition-colors" onClick={() => { setFileInputAccept("video/*"); setFileInputMediaType("video"); fileInputRef.current?.click(); }}>
                              <Video className="h-4 w-4 text-purple-400" /> Vídeo
                            </button>
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md hover:bg-secondary transition-colors" onClick={() => { setFileInputAccept("*/*"); setFileInputMediaType("document"); fileInputRef.current?.click(); }}>
                              <File className="h-4 w-4 text-amber-400" /> Documento
                            </button>
                          </PopoverContent>
                        </Popover>
                      )}
                      <input ref={fileInputRef} type="file" accept={fileInputAccept} onChange={handleFileSelect} className="hidden" />

                      {!isMobile && (
                        <Popover open={showFlowMenu} onOpenChange={(open) => { setShowFlowMenu(open); if (open) loadFlows(); }}>
                          <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 shrink-0"><Workflow className="h-5 w-5 text-muted-foreground" /></Button></PopoverTrigger>
                          <PopoverContent className="w-52 p-1" side="top" align="start">
                            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Iniciar Fluxo</p>
                            {availableFlows.length === 0 ? (
                              <p className="px-3 py-2 text-xs text-muted-foreground">Nenhum fluxo publicado</p>
                            ) : (
                              availableFlows.map(f => (
                                <button key={f.id} className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md hover:bg-secondary transition-colors" onClick={() => handleTriggerFlow(f.id, f.name)}>
                                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" /><span className="truncate">{f.name}</span>
                                </button>
                              ))
                            )}
                          </PopoverContent>
                        </Popover>
                      )}

                      <div className="flex-1">
                        <Textarea
                          ref={textareaRef} value={inputText}
                          onChange={e => { setInputText(e.target.value); const ta = e.target; ta.style.height = "auto"; ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`; }}
                          onKeyDown={handleKeyDown} onPaste={handlePaste}
                          placeholder="Digite sua mensagem..."
                          className="min-h-[40px] max-h-[120px] resize-none text-base overflow-y-auto"
                          style={{ height: "40px" }} rows={1}
                        />
                      </div>

                      {!isMobile && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className={`h-9 w-9 shrink-0 ${showAIPanel ? 'bg-primary/10' : ''}`} onClick={handleAISuggest}>
                              <Sparkles className="h-5 w-5 text-primary" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p className="text-xs">Sugestão IA</p></TooltipContent>
                        </Tooltip>
                      )}

                      {inputText.trim() && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={handleCorrectText} disabled={isCorrecting}>
                              {isCorrecting ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Wand2 className="h-5 w-5 text-primary" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p className="text-xs">Corretor automático</p></TooltipContent>
                        </Tooltip>
                      )}

                      {inputText.trim() ? (
                        <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSend} disabled={isSending}>
                          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={startRecording}>
                          <Mic className="h-5 w-5 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">Selecione uma conversa</p>
                </div>
              </div>
            )}

            {/* Contact Profile Panel */}
            <AnimatePresence>
              {showContactProfile && selected && (
                <ContactProfilePanel
                  contact={{ ...selected, created_at: selected.last_message_at }}
                  profilePic={profilePicsRef.current.get(selected.id)}
                  onClose={() => setShowContactProfile(false)}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
          <DialogContent className="max-w-3xl p-2">
            <img src={lightboxUrl} alt="Imagem" className="w-full rounded-lg" />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function OperacaoInbox() {
  return (
    <SidebarProvider>
      <OperacaoInboxInner />
    </SidebarProvider>
  );
}
