import { useState, useRef, useEffect, useCallback, Fragment, useMemo } from "react";
import { InboxPipelineView } from "@/components/inbox/InboxPipelineView";
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
  AlertTriangle, Link2, LayoutGrid, List,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { fetchAllRows } from "@/lib/fetchAll";
import { ContactProfilePanel } from "@/components/livechat/ContactProfilePanel";
import { ClientContextPanel } from "@/components/livechat/ClientContextPanel";
import { ConversationSummaryDialog } from "@/components/livechat/ConversationSummaryDialog";
import { LinkClientDialog } from "@/components/livechat/LinkClientDialog";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

// ─── Extracted shared modules ───
import type { Stage, MsgType, MsgStatus, Conversation, Message } from "@/components/inbox/types";
import { STAGES, FILTERS } from "@/components/inbox/types";
import {
  normalizeTimestamp, toIsoTimestamp, getMessageTimestamp, compareMessagesChronologically,
  getMessageStableKey, dedupeUiMessages, formatTimestamp, formatMsgTime, formatDateSeparator,
  shouldShowDateSeparator, stripQuotes, formatPhoneDisplay, getStageInfo, mapZapiStatus,
  normalizeDbMessageType, normalizeDbStatus,
} from "@/components/inbox/helpers";
import { VirtualConversationList } from "@/components/inbox/VirtualConversationList";
import { MessageBubble } from "@/components/inbox/MessageBubble";

const FILTERS = [
  { key: "all", label: "Todas" },
  { key: "unread", label: "Não lidas" },
  { key: "mine", label: "Minhas" },
  { key: "vip", label: "VIP" },
  { key: "qualificacao", label: "Qualificação" },
  { key: "proposta_enviada", label: "Proposta" },
  { key: "fechado", label: "Clientes" },
  { key: "pos_venda", label: "Pós-venda" },
  { key: "no_reply", label: "Sem resposta" },
  { key: "urgent", label: "Urgentes" },
];

// ─── Helpers ───
function normalizeTimestamp(dateStr: string | number): Date {
  if (!dateStr && dateStr !== 0) return new Date(0);
  try {
    // Handle epoch numbers (seconds or milliseconds)
    const num = typeof dateStr === "number" ? dateStr : Number(dateStr);
    if (Number.isFinite(num) && num > 1_000_000_000) {
      const ms = num > 1_000_000_000_000 ? num : num * 1000;
      const d = new Date(ms);
      if (!isNaN(d.getTime()) && d.getTime() > 0) return d;
    }
    const str = String(dateStr);
    const direct = new Date(str);
    if (!isNaN(direct.getTime()) && direct.getTime() > 0) return direct;
    let normalized = str;
    if (normalized.includes(" ") && !normalized.includes("T")) normalized = normalized.replace(" ", "T");
    if (/[+-]\d{2}$/.test(normalized)) normalized += ":00";
    const date = new Date(normalized);
    return isNaN(date.getTime()) ? new Date(0) : date;
  } catch { return new Date(0); }
}

/** Convert any timestamp value (epoch int, epoch string, ISO string) to a valid ISO string */
function toIsoTimestamp(value: any): string {
  if (!value && value !== 0) return new Date(0).toISOString();
  const num = Number(value);
  if (Number.isFinite(num) && num > 1_000_000_000) {
    const ms = num > 1_000_000_000_000 ? num : num * 1000;
    return new Date(ms).toISOString();
  }
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}

function getMessageTimestamp(message: Pick<Message, "created_at" | "external_message_id"> & { timestamp?: string | null } | any): string {
  return toIsoTimestamp(message?.timestamp ?? message?.created_at);
}

function compareMessagesChronologically(a: Pick<Message, "created_at"> & { timestamp?: string | null }, b: Pick<Message, "created_at"> & { timestamp?: string | null }): number {
  return new Date(getMessageTimestamp(a)).getTime() - new Date(getMessageTimestamp(b)).getTime();
}

function getMessageStableKey(message: Pick<Message, "id" | "external_message_id" | "created_at" | "message_type" | "sender_type" | "text"> & { timestamp?: string | null }): string {
  return message.external_message_id || message.id || `${getMessageTimestamp(message)}_${message.sender_type}_${message.message_type}_${message.text}`;
}

function dedupeUiMessages(messages: Message[]): Message[] {
  const deduped = new Map<string, Message>();

  for (const message of messages) {
    const key = getMessageStableKey(message);
    const existing = deduped.get(key);

    if (!existing) {
      deduped.set(key, message);
      continue;
    }

    const existingHasDbId = !existing.id.startsWith("temp_");
    const nextHasDbId = !message.id.startsWith("temp_");

    if (nextHasDbId && !existingHasDbId) {
      deduped.set(key, message);
      continue;
    }

    if (compareMessagesChronologically(message, existing) >= 0) {
      deduped.set(key, message);
    }
  }

  return Array.from(deduped.values()).sort(compareMessagesChronologically);
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

function stripQuotes(text: string): string {
  if (!text) return text;
  const trimmed = text.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
function Linkify({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(URL_REGEX);
  return (
    <>
      {parts.map((part, i) =>
        URL_REGEX.test(part) ? (
          <a key={i} href={part.startsWith("http") ? part : `https://${part}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline hover:text-blue-600 break-all">{part}</a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
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
  const [showLinkClient, setShowLinkClient] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [chatSyncVersion, setChatSyncVersion] = useState(0);
  const [reloadingMessages, setReloadingMessages] = useState(false);
  const [rebuildingHistoryAll, setRebuildingHistoryAll] = useState(false);
  const [flowRunning, setFlowRunning] = useState(false);
  const [botActive, setBotActive] = useState(true);
  const [activeFlowName, setActiveFlowName] = useState<string | null>(null);
  const flowNameCacheRef = useRef<Record<string, string | null>>({});
  const [waConnected, setWaConnected] = useState(false);
  const [viewMode, setViewMode] = useState<"chat" | "pipeline">("chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isUserScrolledUpRef = useRef(false);
  const lastAutoReconcileRef = useRef(0);

  const selected = conversations.find(c => c.id === selectedId);
  const currentMessages = selectedId ? (messages[selectedId] || []) : [];

  const getZapiPhoneCandidates = useCallback((conversationId: string) => {
    const phone = conversationId.replace("wa_", "").replace(/\D/g, "").trim();
    if (!phone) return [] as string[];
    return Array.from(new Set([
      phone,
      `+${phone}`,
      `${phone}@c.us`,
      `${phone}@s.whatsapp.net`,
      `${phone}-group`,
      `${phone}@g.us`,
    ]));
  }, []);

  const resolveDbConversationId = useCallback(async (conversationId: string): Promise<string | null> => {
    if (!conversationId) return null;
    if (!conversationId.startsWith("wa_")) return conversationId.length > 10 ? conversationId : null;

    const fromState = conversations.find(c => c.id === conversationId)?.db_id;
    if (fromState) return fromState;

    const phone = conversationId.replace("wa_", "").replace(/\D/g, "");
    if (!phone) return null;

    const phoneCandidates = Array.from(new Set([
      phone,
      `+${phone}`,
      `${phone}@c.us`,
      `${phone}@s.whatsapp.net`,
      `${phone}-group`,
      `${phone}@g.us`,
    ]));

    const [byPhoneResp, byExternalResp] = await Promise.all([
      supabase.from("conversations").select("id, updated_at").in("phone", phoneCandidates).order("updated_at", { ascending: false }).limit(1),
      supabase.from("conversations").select("id, updated_at").eq("external_conversation_id", `wa_${phone}`).order("updated_at", { ascending: false }).limit(1),
    ]);

    const convId = byPhoneResp.data?.[0]?.id || byExternalResp.data?.[0]?.id || null;
    if (convId) {
      setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, db_id: c.db_id || convId } : c));
    }
    return convId;
  }, [conversations]);

  const persistOutgoingMessage = useCallback(async (payload: {
    conversationId: string;
    messageType: MsgType;
    text: string;
    mediaUrl?: string;
    externalMessageId?: string;
    createdAt?: string;
  }): Promise<string | null> => {
    const dbConvId = await resolveDbConversationId(payload.conversationId);
    if (!dbConvId) {
      console.error("[PERSIST] could not resolve DB conversation ID for", payload.conversationId);
      throw new Error("Não foi possível identificar a conversa no banco de dados.");
    }

    const createdAt = payload.createdAt || new Date().toISOString();
    const externalId = payload.externalMessageId || `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    let persistedId: string | null = null;
    let persistedTable: string | null = null;

    // ── PRIMARY: conversation_messages (unified table) ──
    try {
      const unifiedRow = {
        conversation_id: dbConvId,
        external_message_id: externalId,
        direction: "outgoing",
        sender_type: "atendente",
        content: payload.text || "",
        message_type: payload.messageType,
        media_url: payload.mediaUrl || null,
        status: "sent",
        timestamp: createdAt,
        created_at: createdAt,
      };

      const { data: inserted, error } = await (supabase
        .from("conversation_messages" as any)
        .insert(unifiedRow)
        .select("id")
        .single() as any);

      if (!error && inserted?.id) {
        persistedId = inserted.id;
        persistedTable = "conversation_messages";
        console.log(`[PERSIST✓] Mensagem gravada em conversation_messages: ${persistedId}`);
      } else {
        console.warn(`[PERSIST] conversation_messages falhou: ${error?.message}. Tentando fallback...`);
      }
    } catch (err: any) {
      console.warn(`[PERSIST] conversation_messages exception: ${err.message}. Tentando fallback...`);
    }

    // ── FALLBACK: chat_messages (legacy, funcional) ──
    if (!persistedId) {
      try {
        const legacyRow = {
          conversation_id: dbConvId,
          external_message_id: externalId,
          sender_type: "atendente",
          message_type: payload.messageType,
          content: payload.text || "",
          media_url: payload.mediaUrl || null,
          read_status: "sent",
        };
        const { data: legacyInserted, error: legacyErr } = await supabase
          .from("chat_messages")
          .insert(legacyRow)
          .select("id")
          .single();

        if (!legacyErr && legacyInserted?.id) {
          persistedId = legacyInserted.id;
          persistedTable = "chat_messages";
          console.warn(`[PERSIST⚠] Mensagem gravada via FALLBACK em chat_messages: ${persistedId}`);
        } else {
          console.error(`[PERSIST✗] chat_messages fallback also failed: ${legacyErr?.message}`);
        }
      } catch (err: any) {
        console.error(`[PERSIST✗] chat_messages fallback exception: ${err.message}`);
      }
    }

    // ── If both failed, throw to block UI ──
    if (!persistedId) {
      const errorMsg = "FALHA CRÍTICA: Mensagem NÃO foi salva em nenhuma tabela. A mensagem será removida do chat.";
      console.error(`[PERSIST✗✗] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // ── Update conversation metadata ──
    await supabase.from("conversations").update({
      last_message_preview: payload.text || `📎 ${payload.messageType}`,
      last_message_at: createdAt,
      unread_count: 0,
    }).eq("id", dbConvId).then(() => {});

    return persistedId;
  }, [resolveDbConversationId]);
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
      let conversationUuid: string | null = null;

      if (selectedId.startsWith("wa_")) {
        const phone = selectedId.replace("wa_", "");
        const { data: convCandidates } = await supabase
          .from("conversations")
          .select("id, updated_at")
          .or(`phone.eq.${phone},external_conversation_id.eq.${selectedId}`)
          .order("updated_at", { ascending: false })
          .limit(5);
        conversationUuid = convCandidates?.[0]?.id || selected?.db_id || null;
      } else {
        conversationUuid = selectedId;
      }

      if (conversationUuid) {
        const { data: directLogs } = await supabase
          .from("flow_execution_logs" as any)
          .select("flow_id, flows!flow_execution_logs_flow_id_fkey(name)")
          .eq("conversation_id", conversationUuid)
          .order("started_at", { ascending: false })
          .limit(1);
        logs = directLogs;
      }
    
      if (cancelled) return;
      const name = (logs && logs.length > 0) ? ((logs[0] as any).flows?.name || null) : null;
      flowNameCacheRef.current[selectedId] = name;
      setActiveFlowName(name);
    })();
    return () => { cancelled = true; };
  }, [selectedId, selected?.db_id]);

  const getMessagesViewport = useCallback((): HTMLElement | null => {
    if (!scrollAreaRef.current) return null;
    const radixViewport = scrollAreaRef.current.querySelector<HTMLElement>("[data-radix-scroll-area-viewport]");
    return radixViewport || scrollAreaRef.current;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    requestAnimationFrame(() => {
      const viewport = getMessagesViewport();
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior });
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior });
      }
    });
  }, [getMessagesViewport]);

  // Auto-scroll when messages change (only if user hasn't scrolled up)
  useEffect(() => {
    if (!isUserScrolledUpRef.current) {
      scrollToBottom();
    }
  }, [currentMessages.length, currentMessages[currentMessages.length - 1]?.id, scrollToBottom]);

  // Scroll to bottom when selecting a conversation
  useEffect(() => {
    if (selectedId) {
      isUserScrolledUpRef.current = false;
      scrollToBottom("instant" as ScrollBehavior);
    }
  }, [selectedId, scrollToBottom]);

  // Track user scroll position
  useEffect(() => {
    const viewport = getMessagesViewport();
    if (!viewport) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      isUserScrolledUpRef.current = scrollHeight - scrollTop - clientHeight > 100;
    };

    viewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [selectedId, getMessagesViewport]);

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
  const profilePicsSaveTimer = useRef<ReturnType<typeof setTimeout>>();
  const profilePicsCacheLoaded = useRef(false);

  // Load profile pics cache from localStorage on mount
  useEffect(() => {
    if (profilePicsCacheLoaded.current) return;
    profilePicsCacheLoaded.current = true;
    try {
      const cached = localStorage.getItem("natleva_profile_pics");
      if (cached) {
        const parsed = JSON.parse(cached) as [string, string][];
        for (const [k, v] of parsed) profilePicsRef.current.set(k, v);
        if (parsed.length > 0) setProfilePicsVersion(v => v + 1);
      }
    } catch {}
  }, []);

  const saveProfilePicsCache = useCallback(() => {
    clearTimeout(profilePicsSaveTimer.current);
    profilePicsSaveTimer.current = setTimeout(() => {
      try {
        const entries = Array.from(profilePicsRef.current.entries()).slice(-100);
        localStorage.setItem("natleva_profile_pics", JSON.stringify(entries));
      } catch {}
    }, 2000);
  }, []);
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
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showContactProfile, setShowContactProfile] = useState(false);
  const [showClientContext, setShowClientContext] = useState(true);
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
      message_type: msgType, text: stripQuotes(text),
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
      const data = await fetchAllRows("conversations", "*", {
        order: { column: "last_message_at", ascending: false },
        cacheMs: 0,
        bypassCache: true,
      });

      if (data && data.length > 0) {
        // Render conversations IMMEDIATELY without waiting for preview backfill
        const mapConv = (c: any, fallbackPreview?: string) => {
          const cleanPhone = (c.phone || "").replace(/\D/g, "");
          const canonicalId = cleanPhone ? `wa_${cleanPhone}` : c.id;
          return {
            id: canonicalId,
            db_id: c.id,
            phone: cleanPhone || c.phone || "",
            contact_name: c.contact_name || c.display_name || c.phone || "Sem nome",
            stage: (c.stage || c.funnel_stage || "novo_lead") as Stage,
            tags: c.tags || [],
            source: c.source || "",
            last_message_at: c.last_message_at || "",
            last_message_preview: c.last_message_preview || fallbackPreview || "",
            unread_count: c.unread_count || 0,
            is_vip: c.is_vip || false,
            assigned_to: c.assigned_to || "",
            score_potential: c.score_potential || 0,
            score_risk: c.score_risk || 0,
            is_pinned: (c as any).is_pinned || false,
          };
        };

        const dbConvs: Conversation[] = data.map(c => mapConv(c));
        setConversations(prev => {
          const byId = new Map(prev.map(c => [c.id, c]));
          for (const dc of dbConvs) {
            const existing = byId.get(dc.id);
            if (existing) {
              const dcTime = new Date(dc.last_message_at || 0).getTime();
              const existingTime = new Date(existing.last_message_at || 0).getTime();
              const incomingIsFresher = dcTime >= existingTime;

              byId.set(dc.id, {
                ...existing,
                db_id: incomingIsFresher ? (dc.db_id || existing.db_id) : existing.db_id,
                stage: incomingIsFresher && dc.stage !== "novo_lead" ? dc.stage : existing.stage,
                tags: incomingIsFresher && dc.tags.length > 0 ? dc.tags : existing.tags,
                contact_name: incomingIsFresher && dc.contact_name !== "Novo Contato" ? dc.contact_name : existing.contact_name,
                unread_count: Math.max(dc.unread_count, existing.unread_count),
                last_message_at: incomingIsFresher ? dc.last_message_at : existing.last_message_at,
                last_message_preview: incomingIsFresher ? (dc.last_message_preview || existing.last_message_preview) : existing.last_message_preview,
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

  // Load messages for selected conversation — UNIFIED from conversation_messages
  const [oldestLoadedTimestamp, setOldestLoadedTimestamp] = useState<Record<string, string | null>>({});
  const [hasOlderMessages, setHasOlderMessages] = useState<Record<string, boolean>>({});
  const MESSAGE_PAGE_SIZE = 80;

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;

    const normalizeDbMessageType = (value: string | null | undefined): MsgType => {
      const raw = (value || "text").toLowerCase();
      if (raw === "ptt") return "audio";
      if (raw === "image" || raw === "audio" || raw === "video" || raw === "document") return raw;
      return "text";
    };

    const normalizeDbStatus = (value: string | null | undefined): MsgStatus => {
      const raw = (value || "sent").toLowerCase();
      if (["read", "lido", "seen", "played"].includes(raw)) return "read";
      if (["delivered", "entregue", "received", "delivery_ack"].includes(raw)) return "delivered";
      return "sent";
    };

    const mapUnifiedMessages = (rows: any[], conversationKey: string): Message[] => (
      (rows || []).map((m: any) => ({
        id: m.id,
        conversation_id: conversationKey,
        sender_type: (m.sender_type || (m.direction === "outgoing" ? "atendente" : m.direction === "system" ? "sistema" : "cliente")) as "cliente" | "atendente" | "sistema",
        message_type: normalizeDbMessageType(m.message_type),
        text: stripQuotes(m.content ?? m.text ?? ""),
        media_url: m.media_url || undefined,
        status: normalizeDbStatus(m.status ?? m.read_status),
        created_at: toIsoTimestamp(m.timestamp || m.created_at),
        external_message_id: m.external_message_id || undefined,
      }))
    );

    const hasCached = (messages[selectedId] || []).length > 0;
    if (!hasCached) setLoadingMessages(true);

    const loadMessages = async () => {
      try {
        let allConversationIds: string[] = [];

        if (selectedId.startsWith("wa_")) {
          const phone = selectedId.replace("wa_", "").trim();
          const dbPhoneCandidates = Array.from(new Set([phone, `+${phone}`, `${phone}@c.us`, `${phone}@g.us`, `${phone}-group`]));

          const [byPhoneResp, byExternalResp] = await Promise.all([
            supabase.from("conversations").select("id, updated_at").in("phone", dbPhoneCandidates).order("updated_at", { ascending: false }),
            supabase.from("conversations").select("id, updated_at").eq("external_conversation_id", selectedId).order("updated_at", { ascending: false }),
          ]);

          if (cancelled) return;

          const candidates = [...(byPhoneResp.data || []), ...(byExternalResp.data || [])]
            .filter(c => !!c.id);
          allConversationIds = Array.from(new Set([
            ...(selected?.db_id ? [selected.db_id] : []),
            ...candidates.map(c => c.id),
          ]));
        } else if (selectedId.length > 10) {
          allConversationIds = [selectedId];
        }

        if (allConversationIds.length === 0) {
          if (!cancelled) setMessages(prev => ({ ...prev, [selectedId]: [] }));
          return;
        }

        const { data: unifiedRows, error: unifiedErr } = await (supabase
          .from("conversation_messages" as any)
          .select("*")
          .in("conversation_id", allConversationIds)
          .order("timestamp", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(MESSAGE_PAGE_SIZE) as any);

        let allMsgs: Message[] = [];

        if (!unifiedErr && unifiedRows) {
          allMsgs = dedupeUiMessages(mapUnifiedMessages(unifiedRows, selectedId));
          if (!cancelled) {
            setHasOlderMessages(prev => ({ ...prev, [selectedId]: unifiedRows.length >= MESSAGE_PAGE_SIZE }));
            const oldestRow = unifiedRows[unifiedRows.length - 1];
            setOldestLoadedTimestamp(prev => ({ ...prev, [selectedId]: toIsoTimestamp(oldestRow?.timestamp || oldestRow?.created_at || null) }));
          }
        }

        for (const m of allMsgs) {
          if (m.id) lastMsgIdsRef.current.add(m.id);
          if (m.external_message_id) lastMsgIdsRef.current.add(m.external_message_id);
        }

        if (!cancelled) {
          setMessages(prev => ({ ...prev, [selectedId]: dedupeUiMessages(allMsgs) }));
          if (allMsgs.length > 0) {
            const lastMsg = allMsgs[allMsgs.length - 1];
            const lastPreview = lastMsg.text || `📎 ${lastMsg.message_type}`;
            setConversations(prev => prev.map(c => {
              if (c.id !== selectedId) return c;
              const currentTime = new Date(c.last_message_at || 0).getTime();
              const msgTime = new Date(getMessageTimestamp(lastMsg)).getTime();
              if (!c.last_message_preview || msgTime >= currentTime) {
                return { ...c, last_message_preview: lastPreview, last_message_at: getMessageTimestamp(lastMsg) };
              }
              return c;
            }));
          }
        }
      } catch (error) {
        console.error("Erro ao carregar histórico da conversa:", error);
      } finally {
        if (!cancelled) {
          setLoadingMessages(false);
          setReloadingMessages(false);
        }
      }
    };

    loadMessages();
    return () => { cancelled = true; };
  }, [selectedId, selected?.db_id, extractMediaFromRawData, getZapiPhoneCandidates, reloadVersion]);

  // Load older messages (cursor-based pagination)
  const loadOlderMessages = useCallback(async () => {
    if (!selectedId || !hasOlderMessages[selectedId]) return;
    const cursor = oldestLoadedTimestamp[selectedId];
    if (!cursor) return;

    const allConversationIds: string[] = [];
    if (selectedId.startsWith("wa_")) {
      const phone = selectedId.replace("wa_", "").trim();
      const candidates = [phone, `+${phone}`];
      const { data: convs } = await supabase.from("conversations").select("id").in("phone", candidates);
      if (convs) allConversationIds.push(...convs.map(c => c.id));
      if (selected?.db_id && !allConversationIds.includes(selected.db_id)) allConversationIds.push(selected.db_id);
    } else {
      allConversationIds.push(selectedId);
    }

    if (allConversationIds.length === 0) return;

    const { data: olderRows } = await (supabase
      .from("conversation_messages" as any)
      .select("*")
      .in("conversation_id", allConversationIds)
      .lt("timestamp", cursor)
      .order("timestamp", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(MESSAGE_PAGE_SIZE) as any);

    if (!olderRows || olderRows.length === 0) {
      setHasOlderMessages(prev => ({ ...prev, [selectedId]: false }));
      return;
    }

    const normalizeDbMessageType = (value: string | null | undefined): MsgType => {
      const raw = (value || "text").toLowerCase();
      if (raw === "ptt") return "audio";
      if (["image", "audio", "video", "document"].includes(raw)) return raw as MsgType;
      return "text";
    };

    const normalizeDbStatus = (value: string | null | undefined): MsgStatus => {
      const raw = (value || "sent").toLowerCase();
      if (["read", "lido", "seen", "played"].includes(raw)) return "read";
      if (["delivered", "entregue", "received", "delivery_ack"].includes(raw)) return "delivered";
      return "sent";
    };

    const olderMsgs: Message[] = dedupeUiMessages(olderRows.map((m: any) => ({
      id: m.id,
      conversation_id: selectedId,
      sender_type: (m.sender_type || "cliente") as "cliente" | "atendente" | "sistema",
      message_type: normalizeDbMessageType(m.message_type),
      text: stripQuotes(m.content ?? ""),
      media_url: m.media_url || undefined,
      status: normalizeDbStatus(m.status),
      created_at: toIsoTimestamp(m.timestamp || m.created_at),
      external_message_id: m.external_message_id || undefined,
    })));

    setMessages(prev => ({
      ...prev,
      [selectedId]: dedupeUiMessages([...olderMsgs, ...(prev[selectedId] || [])]),
    }));

    const oldestRow = olderRows[olderRows.length - 1];
    setOldestLoadedTimestamp(prev => ({
      ...prev,
      [selectedId]: toIsoTimestamp(oldestRow?.timestamp || oldestRow?.created_at || cursor),
    }));

    setHasOlderMessages(prev => ({
      ...prev,
      [selectedId]: olderRows.length >= MESSAGE_PAGE_SIZE,
    }));
  }, [selectedId, hasOlderMessages, oldestLoadedTimestamp, selected?.db_id]);

  // Realtime subscription — stable ref to avoid re-creating channel on every conversation update
  const conversationsRef = useRef(conversations);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  useEffect(() => {
    const channel = supabase
      .channel('livechat-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_messages' }, (payload) => {
        const n = payload.new as any;
        if (!n.conversation_id) return;

        const conv = conversationsRef.current.find(c => c.db_id === n.conversation_id || c.id === n.conversation_id);
        const waKey = conv?.id || n.conversation_id;
        const msgId = n.id;

        if (lastMsgIdsRef.current.has(msgId)) return;
        if (n.external_message_id && lastMsgIdsRef.current.has(n.external_message_id)) return;
        lastMsgIdsRef.current.add(msgId);
        if (n.external_message_id) lastMsgIdsRef.current.add(n.external_message_id);

        const msg: Message = {
          id: msgId,
          conversation_id: waKey,
          sender_type: (n.sender_type || (n.direction === "outgoing" ? "atendente" : "cliente")) as "cliente" | "atendente" | "sistema",
          message_type: (n.message_type || "text") as MsgType,
          text: stripQuotes(n.content || ""),
          media_url: n.media_url || undefined,
          status: (n.status || "sent") as MsgStatus,
          created_at: toIsoTimestamp(n.timestamp || n.created_at),
          external_message_id: n.external_message_id || undefined,
        };

        setMessages(prev => {
          const existing = prev[waKey] || [];
          if (existing.find(m => m.id === msgId)) return prev;
          // Replace temp message if matching
          if (n.direction === "outgoing" && n.external_message_id) {
            const tempIdx = existing.findIndex(m => m.id.startsWith("temp_") && m.text === msg.text && m.sender_type === "atendente");
            if (tempIdx >= 0) {
              const updated = [...existing];
              updated[tempIdx] = { ...updated[tempIdx], id: msgId, media_url: msg.media_url || updated[tempIdx].media_url };
              return { ...prev, [waKey]: updated };
            }
          }
          return { ...prev, [waKey]: dedupeUiMessages([...existing, msg]) };
        });

        if (n.direction === "incoming") {
          setConversations(prev => prev.map(c => {
            if (c.id !== waKey && c.db_id !== n.conversation_id) return c;
            const isOpen = waKey === selectedIdRef.current;
            return {
              ...c,
              last_message_preview: n.content || `📎 ${n.message_type || "media"}`,
              last_message_at: toIsoTimestamp(n.timestamp || n.created_at),
              unread_count: isOpen ? 0 : c.unread_count + 1,
            };
          }));
        }
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
              ...c,
              id: waKey,
              db_id: c.db_id || u.id,
              phone: cleanPhone || c.phone,
              last_message_preview: bestPreview,
              last_message_at: bestTime,
              unread_count: isOpen ? 0 : Math.max(c.unread_count, u.unread_count ?? 0),
              stage: (u.stage as Stage) || c.stage,
              tags: u.tags || c.tags,
              contact_name: c.contact_name || u.contact_name,
              source: u.source || c.source,
            } : c).filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i);
            return updated.sort((a, b) => {
              if (a.is_pinned && !b.is_pinned) return -1;
              if (!a.is_pinned && b.is_pinned) return 1;
              return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
            });
          }
          return [{
            id: waKey,
            db_id: u.id,
            phone: cleanPhone || u.phone,
            contact_name: u.contact_name || u.display_name || u.phone || "Sem nome",
            stage: (u.stage || u.funnel_stage || "novo_lead") as Stage,
            tags: u.tags || [],
            source: u.source || "",
            last_message_at: u.last_message_at || "",
            last_message_preview: u.last_message_preview || "",
            unread_count: u.unread_count || 0,
            is_vip: u.is_vip || false,
            assigned_to: u.assigned_to || "",
            score_potential: u.score_potential || 0,
            score_risk: u.score_risk || 0,
          }, ...prev];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Z-API WhatsApp polling
  useEffect(() => {
    const POLL_MS = 5000;

    async function loadChats() {
      try {
        const data = await callZapiProxy("get-chats");
        const chats = Array.isArray(data) ? data : [];
        const newConvs: Conversation[] = [];
        for (const chat of chats) {
          const phone = chat.phone || chat.id || "";
          if (!phone || phone.includes("@g.us") || phone === "status@broadcast") continue;
          const cleanPhone = phone.replace(/\D/g, "");
          if (!cleanPhone) continue;
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
        // Save any inline chat photos to cache
        if (newConvs.length > 0) saveProfilePicsCache();
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
                return { ...c, db_id: existing.db_id || c.db_id, contact_name: existing.contact_name || c.contact_name, last_message_at: freshTime > existingTime ? c.last_message_at : existing.last_message_at, last_message_preview: (freshTime > existingTime && c.last_message_preview) ? c.last_message_preview : (existing.last_message_preview || c.last_message_preview), unread_count: isOpen ? 0 : existing.unread_count, stage: existing.stage || c.stage, tags: existing.tags.length > 0 ? existing.tags : c.tags, is_vip: existing.is_vip || c.is_vip, assigned_to: existing.assigned_to || c.assigned_to, is_pinned: existing.is_pinned || c.is_pinned };
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
          // Fetch profile pictures in parallel batches
          const needsPic = dedupedConvs.filter(c => !profilePicsRef.current.has(c.id)).slice(0, 20);
          if (needsPic.length > 0) {
            const BATCH = 5;
            for (let i = 0; i < needsPic.length; i += BATCH) {
              const batch = needsPic.slice(i, i + BATCH);
              await Promise.allSettled(batch.map(conv =>
                callZapiProxy("get-profile-picture", { phone: conv.phone }).then(data => {
                  const picUrl = data?.link || data?.profilePictureUrl || "";
                  if (picUrl && typeof picUrl === "string" && picUrl.startsWith("http")) {
                    profilePicsRef.current.set(conv.id, picUrl);
                  }
                }).catch(() => {})
              ));
            }
            setProfilePicsVersion(v => v + 1);
            saveProfilePicsCache();
          }
        }
        chatsLoadedRef.current = true;
      } catch (err) { console.error("Error loading chats:", err); }
    }

    async function checkAndStartPolling() {
      try {
        const data = await callZapiProxy("check-status");
        if (data?.connected) {
          setWaConnected(true);
          await loadChats();
        } else { setWaConnected(false); }
      } catch { setWaConnected(false); }
    }

    checkAndStartPolling();
  }, [chatSyncVersion]);

  const filteredConversations = useMemo(() => {
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
      if (activeFilter === "proposta_enviada") return c.stage === "proposta_enviada" || c.stage === "proposta_preparacao" || c.stage === "negociacao";
      if (activeFilter === "fechado") return c.stage === "fechado";
      if (activeFilter === "pos_venda") return c.stage === "pos_venda";
      if (activeFilter === "no_reply") return c.unread_count > 0;
      if (activeFilter === "urgent") {
        const lastMsgTime = new Date(c.last_message_at).getTime();
        const hoursAgo = (Date.now() - lastMsgTime) / 3600000;
        return c.unread_count > 3 || (c.unread_count > 0 && hoursAgo > 24);
      }
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
  }, [conversations, searchQuery, activeFilter]);

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

  const ensureWhatsAppWebhookSync = useCallback(async () => {
    const status = await callZapiProxy("check-status");
    if (!status?.connected) {
      setWaConnected(false);
      throw new Error("WhatsApp desconectado. Reconecte para sincronizar o histórico.");
    }

    setWaConnected(true);
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) return;

    const webhookUrl = `${supabaseUrl}/functions/v1/zapi-webhook`;
    await Promise.allSettled([
      callZapiProxy("set-webhook", { webhookUrl }),
      callZapiProxy("set-webhook-sent", { webhookUrl }),
      callZapiProxy("set-notify-sent-by-me"),
    ]);
  }, []);

  const handleReloadMessages = useCallback(async () => {
    if (!selectedId || reloadingMessages) return;

    setReloadingMessages(true);
    try {
      if (selectedId.startsWith("wa_")) {
        await ensureWhatsAppWebhookSync();
        await callZapiProxy("get-chats");
      }

      lastMsgIdsRef.current.clear();
      setMessages(prev => ({ ...prev, [selectedId]: [] }));
      setReloadVersion(v => v + 1);
      setChatSyncVersion(v => v + 1);
      toast({ title: "Recarregando mensagens…", description: "Resincronizando histórico completo da conversa." });
    } catch (err: any) {
      toast({ title: "Falha ao recarregar", description: err?.message || "Não foi possível resincronizar as mensagens.", variant: "destructive" });
    } finally {
      setReloadingMessages(false);
    }
  }, [selectedId, reloadingMessages, ensureWhatsAppWebhookSync]);

  const handleRebuildAllHistory = useCallback(async () => {
    if (rebuildingHistoryAll) return;

    setRebuildingHistoryAll(true);
    try {
      await ensureWhatsAppWebhookSync();
      const result = await callZapiProxy("rebuild-history", {});

      lastMsgIdsRef.current.clear();
      setMessages({});
      setReloadVersion(v => v + 1);
      setChatSyncVersion(v => v + 1);

      toast({
        title: "Reconstrução concluída",
        description: `${result?.messagesInserted || 0} mensagens reimportadas em ${result?.chatsProcessed || 0} conversas.`,
      });
    } catch (err: any) {
      toast({
        title: "Falha na reconstrução",
        description: err?.message || "Não foi possível reconstruir o histórico completo.",
        variant: "destructive",
      });
    } finally {
      setRebuildingHistoryAll(false);
    }
  }, [rebuildingHistoryAll, ensureWhatsAppWebhookSync]);

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
      const msgCreatedAt = new Date().toISOString();
      const newMsg: Message = {
        id: tempId, conversation_id: selectedId, sender_type: "atendente", message_type: "text",
        text, status: "sent", created_at: msgCreatedAt,
        quoted_msg: replyRef ? { text: replyRef.text || "📎 Mídia", sender_type: replyRef.sender_type, message_type: replyRef.message_type } : undefined,
      };
      setMessages(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] || []), newMsg] }));
      lastMsgIdsRef.current.add(tempId);
      isUserScrolledUpRef.current = false;
      scrollToBottom();

      let sendSuccess = false;
      let persistedExternalId = tempId;

      try {
        // 1. Send via WhatsApp
        const sendPayload: any = { phone, message: text };
        if (replyRef?.id && !replyRef.id.startsWith("temp_")) sendPayload.messageId = replyRef.id;
        const sendResult = await callZapiProxy("send-text", sendPayload);
        const realId = sendResult?.messageId || sendResult?.id;
        persistedExternalId = realId || tempId;
        sendSuccess = true;

        if (realId) {
          lastMsgIdsRef.current.add(realId);
          setMessages(prev => ({
            ...prev,
            [selectedId]: dedupeUiMessages((prev[selectedId] || []).map(m =>
              m.id === tempId ? { ...m, id: realId, external_message_id: realId } : m
            )),
          }));
        }
      } catch (err: any) {
        // Send failed - remove temp message
        setMessages(prev => ({ ...prev, [selectedId]: (prev[selectedId] || []).filter(m => m.id !== tempId) }));
        toast({ title: "Erro ao enviar", description: err?.message || "Falha na comunicação com WhatsApp", variant: "destructive" });
        setIsSending(false);
        return;
      }

      // 2. MANDATORY persistence - if this fails, mark message as failed
      try {
        await persistOutgoingMessage({
          conversationId: selectedId,
          messageType: "text",
          text,
          externalMessageId: persistedExternalId,
          createdAt: msgCreatedAt,
        });
      } catch (persistErr: any) {
        console.error("[SEND] Mensagem enviada mas NÃO persistida:", persistErr);
        // Mark message in UI as failed (don't remove - it was sent via WhatsApp)
        setMessages(prev => ({
          ...prev,
          [selectedId]: (prev[selectedId] || []).map(m =>
            m.id === persistedExternalId || m.id === tempId
              ? { ...m, status: "sent" as MsgStatus, text: `⚠️ ${text}` }
              : m
          ),
        }));
        toast({
          title: "⚠️ Mensagem enviada mas NÃO salva",
          description: "A mensagem foi entregue ao WhatsApp mas falhou ao salvar no banco. Ela pode não aparecer no histórico.",
          variant: "destructive",
        });
      }
    } else if (selectedId.length > 10) {
      const nowIso = new Date().toISOString();
      // Dual-write: conversation_messages (primary) + chat_messages (legacy)
      const unifiedRow = {
        conversation_id: selectedId,
        external_message_id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        direction: "outgoing",
        sender_type: "atendente",
        content: text,
        message_type: "text",
        status: "sent",
        timestamp: nowIso,
        created_at: nowIso,
      };
      await (supabase.from("conversation_messages" as any).insert(unifiedRow) as any);
      await supabase.from("chat_messages").insert({ conversation_id: selectedId, sender_type: "atendente", message_type: "text", content: text, read_status: "sent" });
      await supabase.from("conversations").update({ last_message_preview: text, last_message_at: nowIso, unread_count: 0 }).eq("id", selectedId);

      if (selected?.source === "whatsapp" && selected?.phone) {
        try {
          const { data: connData } = await supabase.from("whatsapp_connections" as any).select("id").eq("status", "active").limit(1).maybeSingle();
          if (connData) {
            await supabase.functions.invoke("send-whatsapp-official", { body: { to: selected.phone, message: text, connection_id: (connData as any).id } });
          }
        } catch (err) { console.error("Error sending via official API:", err); }
      }

      // Reload from unified table
      const { data } = await (supabase.from("conversation_messages" as any).select("*").eq("conversation_id", selectedId).order("created_at") as any);
      if (data && (data as any[]).length > 0) {
        setMessages(prev => ({ ...prev, [selectedId]: (data as any[]).map((m: any) => {
          const rawType = (m.message_type || "text").toLowerCase();
          const mType: MsgType = rawType === "ptt" ? "audio" : (["image","audio","video","document"].includes(rawType) ? rawType as MsgType : "text");
          const rawStatus = (m.status || "sent").toLowerCase();
          const mStatus: MsgStatus = ["read","lido","seen","played"].includes(rawStatus) ? "read" : ["delivered","entregue","received","delivery_ack"].includes(rawStatus) ? "delivered" : "sent";
          return {
            id: m.id, conversation_id: m.conversation_id,
            sender_type: (m.sender_type || "cliente") as "cliente" | "atendente" | "sistema",
            message_type: mType,
            text: stripQuotes(m.content || ""), status: mStatus, created_at: toIsoTimestamp(m.created_at),
          };
        }) }));
        isUserScrolledUpRef.current = false;
        scrollToBottom();
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
    isUserScrolledUpRef.current = false;
    scrollToBottom();
    setIsSending(false);
  }, [inputText, selectedId, selected, replyingTo, editingMsg, isSending, scrollToBottom, persistOutgoingMessage]);

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
          const sendResult = await callZapiProxy("send-audio", { phone, audio: audioUrl });
          const realId = sendResult?.messageId || sendResult?.id || `temp_audio_${Date.now()}`;
          lastMsgIdsRef.current.add(realId);
          setMessages(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] || []), {
            id: realId, conversation_id: selectedId, sender_type: "atendente" as const,
            message_type: "audio" as MsgType, text: "", status: "sent" as MsgStatus, created_at: new Date().toISOString(), media_url: localUrl,
          }] }));

          await persistOutgoingMessage({
            conversationId: selectedId,
            messageType: "audio",
            text: "",
            mediaUrl: audioUrl,
            externalMessageId: realId,
            createdAt: new Date().toISOString(),
          });
        } catch (err) { toast({ title: "Erro ao enviar áudio", description: String(err), variant: "destructive" }); }
      };
      mediaRecorder.start();
      setIsRecording(true); setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => { setRecordingTime(t => { if (t >= 119) { stopRecording(); return t; } return t + 1; }); }, 1000);
    } catch { toast({ title: "Erro", description: "Não foi possível acessar o microfone", variant: "destructive" }); }
  }, [selectedId, uploadToStorage, persistOutgoingMessage]);

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
      let sendResult: any;
      if (fileInputMediaType === "video") sendResult = await callZapiProxy("send-video", { phone, video: publicUrl, caption: "" });
      else sendResult = await callZapiProxy("send-document", { phone, document: publicUrl, fileName: file.name, extension: ext });
      const realId = sendResult?.messageId || sendResult?.id || `temp_media_${Date.now()}`;
      const label = fileInputMediaType === "video" ? "Vídeo" : `${file.name}`;
      lastMsgIdsRef.current.add(realId);
      setMessages(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] || []), {
        id: realId, conversation_id: selectedId, sender_type: "atendente" as const,
        message_type: fileInputMediaType as MsgType, text: label, status: "sent" as MsgStatus, created_at: new Date().toISOString(), media_url: publicUrl,
      }] }));

      await persistOutgoingMessage({
        conversationId: selectedId,
        messageType: fileInputMediaType as MsgType,
        text: label,
        mediaUrl: publicUrl,
        externalMessageId: realId,
        createdAt: new Date().toISOString(),
      });
    } catch (err) { toast({ title: "Erro ao enviar mídia", description: String(err), variant: "destructive" }); }
    e.target.value = ""; setShowMediaMenu(false);
  }, [selectedId, fileInputMediaType, uploadToStorage, persistOutgoingMessage]);

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
      const sendResult = await callZapiProxy("send-image", { phone, image: publicUrl, caption });
      const realId = sendResult?.messageId || sendResult?.id || `temp_media_${Date.now()}`;
      lastMsgIdsRef.current.add(realId);
      setMessages(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] || []), {
        id: realId, conversation_id: selectedId, sender_type: "atendente" as const,
        message_type: "image" as MsgType, text: caption || "📷 Imagem", status: "sent" as MsgStatus, created_at: new Date().toISOString(), media_url: previewUrl,
      }] }));

      await persistOutgoingMessage({
        conversationId: selectedId,
        messageType: "image",
        text: caption || "📷 Imagem",
        mediaUrl: publicUrl,
        externalMessageId: realId,
        createdAt: new Date().toISOString(),
      });
    } catch (err) { toast({ title: "Erro ao enviar mídia", description: String(err), variant: "destructive" }); }
    setMediaPendingFile(null); setMediaCaption("" ); setIsSending(false);
  }, [mediaPendingFile, mediaCaption, selectedId, uploadToStorage, isSending, persistOutgoingMessage]);

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
    const target = conversations.find(c => c.id === id);
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unread_count: 0 } : c));
    if (target?.db_id) {
      supabase.from("conversations").update({ unread_count: 0 }).eq("id", target.db_id).then(() => {});
    } else if (id.length > 10) {
      supabase.from("conversations").update({ unread_count: 0 }).eq("id", id).then(() => {});
    }
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
      className={`flex flex-col bg-background overflow-hidden overscroll-none ${isMobile ? "fixed inset-0 z-50 min-h-0 w-full" : "h-full min-h-0"}`}
      style={isMobile ? { height: mobileHeight } : { height: "100%" }}
    >
      {/* Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {viewMode === "pipeline" ? (
          <div className="flex flex-col h-full w-full min-h-0">
            {/* Pipeline header with back toggle */}
            <div className="px-3 py-2 border-b border-border bg-card/50 flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <LayoutGrid className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm font-bold text-foreground">Pipeline de Atendimento</span>
              </div>
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => setViewMode("chat")}
              >
                <List className="h-3.5 w-3.5" />
                Voltar ao Chat
              </Button>
            </div>
            <InboxPipelineView
              conversations={conversations}
              onSelectConversation={(id) => {
                setSelectedId(id);
              }}
              onSwitchToChat={() => setViewMode("chat")}
            />
          </div>
        ) : (
        <div className="flex h-full w-full min-h-0">
          {/* ─── Column 1: Conversations List ─── */}
          <div className={`md:w-[360px] w-full border-r border-border flex flex-col h-full overflow-hidden bg-card/20 md:shrink-0 ${isMobile && selectedId ? "hidden" : ""}`}>
            {/* Sidebar Header */}
            <div className="px-3 pt-3 pb-2 space-y-2.5 shrink-0 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <span className="text-sm font-bold tracking-tight text-foreground">Inbox</span>
                    {waConnected && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                  </div>
                  {totalUnread > 0 && <Badge className="bg-primary text-primary-foreground font-mono text-[10px] px-1.5 py-0 h-4">{totalUnread}</Badge>}
                </div>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={() => setViewMode("pipeline")}
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-xs">Visão Pipeline</p></TooltipContent>
                  </Tooltip>
                  <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
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
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Buscar por nome, telefone..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 pr-8 h-8 text-xs bg-background/50 border-border/50" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <ScrollArea className="w-full">
                <div className="flex gap-1 pb-0.5">
                  {FILTERS.map(f => {
                    const count = f.key === "unread" ? conversations.filter(c => c.unread_count > 0).length
                      : f.key === "vip" ? conversations.filter(c => c.is_vip).length
                      : 0;
                    return (
                      <button key={f.key} onClick={() => setActiveFilter(f.key)} className={`px-2.5 py-1 text-[10px] rounded-full whitespace-nowrap font-medium transition-all flex items-center gap-1 ${activeFilter === f.key ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                        {f.label}
                        {count > 0 && <span className={`text-[9px] ${activeFilter === f.key ? "opacity-80" : "opacity-50"}`}>({count})</span>}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              <div className="py-1">
                {filteredConversations.map(conv => {
                  const stageInfo = getStageInfo(conv.stage);
                  const isSelected = conv.id === selectedId;
                  const _previewRaw = stripQuotes((conv.last_message_preview || "").replace(/\n/g, " "));
                  const _contactName = conv.contact_name || "Sem nome";
                  const lastMsgTime = new Date(conv.last_message_at).getTime();
                  const hoursAgo = (Date.now() - lastMsgTime) / 3600000;
                  const isUrgent = conv.unread_count > 3 || (conv.unread_count > 0 && hoursAgo > 24);
                  const hasUnread = conv.unread_count > 0;

                  // Build preview text with media type detection
                  const previewContent = (() => {
                    if (!_previewRaw) return { icon: null, text: "Sem mensagens", italic: true };
                    const lower = _previewRaw.toLowerCase();
                    if (lower === "📎 audio" || lower.includes("mensagem de voz") || lower === "audio" || lower === "🎤 áudio")
                      return { icon: <Mic className="h-3 w-3 text-primary shrink-0" />, text: "Mensagem de voz", italic: false };
                    if (lower === "📎 image" || lower.includes("📷"))
                      return { icon: <Image className="h-3 w-3 shrink-0 text-muted-foreground" />, text: "Foto", italic: false };
                    if (lower === "📎 video")
                      return { icon: <Video className="h-3 w-3 shrink-0 text-muted-foreground" />, text: "Vídeo", italic: false };
                    if (lower === "📎 document")
                      return { icon: <File className="h-3 w-3 shrink-0 text-muted-foreground" />, text: "Documento", italic: false };
                    const displayText = _previewRaw.length > 50 ? _previewRaw.slice(0, 50) + "…" : _previewRaw;
                    return { icon: null, text: displayText, italic: false };
                  })();

                  return (
                    <motion.div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`group px-3 py-2.5 cursor-pointer transition-all border-l-2 ${
                        isSelected
                          ? "bg-primary/5 border-l-primary"
                          : isUrgent
                            ? "border-l-destructive/60 hover:bg-destructive/5"
                            : "border-l-transparent hover:bg-secondary/40"
                      }`}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-start gap-2.5">
                        {/* Avatar */}
                        <div className="relative shrink-0 mt-0.5">
                          {profilePicsRef.current.get(conv.id) ? (
                            <img src={profilePicsRef.current.get(conv.id)} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-border/30" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }} />
                          ) : null}
                          <div className={`h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xs font-bold text-primary ring-1 ring-border/30 ${profilePicsRef.current.get(conv.id) ? 'hidden' : ''}`}>
                            {_contactName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          {conv.is_vip && (
                            <div className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center ring-2 ring-card">
                              <Star className="h-2.5 w-2.5 text-white fill-white" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Row 1: Name + Time */}
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[13px] truncate leading-tight ${hasUnread ? "font-bold text-foreground" : "font-semibold text-foreground/90"}`}>
                              {/^\d{10,}$/.test(_contactName) ? formatPhoneDisplay(_contactName) : _contactName}
                            </span>
                            <span className={`text-[10px] shrink-0 tabular-nums ${hasUnread ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                              {formatTimestamp(conv.last_message_at)}
                            </span>
                          </div>

                          {/* Row 2: Preview + Unread */}
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className={`flex items-center gap-1 flex-1 min-w-0 text-xs leading-tight ${hasUnread ? "text-foreground/80 font-medium" : "text-muted-foreground"}`}>
                              {previewContent.icon}
                              <span className={`truncate ${previewContent.italic ? "italic text-muted-foreground/40" : ""}`}>
                                {previewContent.text}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {conv.is_pinned && <Pin className="h-3 w-3 text-muted-foreground/50 rotate-45" />}
                              {hasUnread && (
                                <span className="h-[18px] min-w-[18px] rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground px-1">
                                  {conv.unread_count > 99 ? "99+" : conv.unread_count}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Row 3: Metadata - Stage + Tags + Assigned */}
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${stageInfo.color}/10`}>
                              <div className={`h-1.5 w-1.5 rounded-full ${stageInfo.color}`} />
                              <span className="text-muted-foreground">{stageInfo.label}</span>
                            </div>
                            {conv.tags?.slice(0, 1).map(tag => (
                              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/60 text-muted-foreground/70">{tag}</span>
                            ))}
                            {isUrgent && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium flex items-center gap-0.5">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                Atenção
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                {filteredConversations.length === 0 && (
                  <div className="flex flex-col items-center justify-center min-h-[300px] h-full text-center px-4">
                    {!chatsLoadedRef.current ? (
                      <>
                        <Loader2 className="h-8 w-8 text-muted-foreground/30 mb-3 animate-spin" />
                        <p className="text-sm text-muted-foreground">Carregando conversas...</p>
                      </>
                    ) : (
                      <>
                        <div className="h-14 w-14 rounded-2xl bg-secondary/50 flex items-center justify-center mb-3">
                          <MessageSquare className="h-6 w-6 text-muted-foreground/30" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">{searchQuery ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">{searchQuery ? "Tente buscar por outro termo" : "As mensagens recebidas aparecerão aqui"}</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── Column 2: Chat ─── */}
          <div className={`flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden relative ${isMobile && !selectedId ? "hidden" : ""}`} style={{ maxHeight: '100%' }}>
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
                    <div className="flex items-center gap-2 md:gap-3 cursor-pointer hover:opacity-80 transition-opacity min-w-0 flex-1" onClick={() => { if (!isMobile) setShowClientContext(prev => !prev); else setShowContactProfile(prev => !prev); }}>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 text-[10px] px-2"
                          disabled={rebuildingHistoryAll}
                          onClick={handleRebuildAllHistory}
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${rebuildingHistoryAll ? "animate-spin" : ""}`} />
                          {!isMobile && "Reconstruir Histórico"}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Reimportar todo o histórico do WhatsApp</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 text-[10px] px-2"
                          disabled={reloadingMessages || rebuildingHistoryAll}
                          onClick={handleReloadMessages}
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${reloadingMessages ? "animate-spin" : ""}`} />
                          {!isMobile && "Recarregar Mensagens"}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Recarregar todas as mensagens</TooltipContent>
                    </Tooltip>
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
                    {!isMobile && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-[10px] px-2" onClick={() => setShowLinkClient(true)}>
                            <Link2 className="h-3.5 w-3.5" />
                            Vincular Cliente
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p className="text-xs">Vincular conversa a um cliente cadastrado</p></TooltipContent>
                      </Tooltip>
                    )}
                    {!isMobile && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className={`h-8 w-8 ${showClientContext ? 'bg-primary/10' : ''}`} onClick={() => setShowClientContext(prev => !prev)}>
                            <User className="h-4 w-4 text-primary" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p className="text-xs">Painel do cliente</p></TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div ref={scrollAreaRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 md:px-4">
                  <div className="py-4 space-y-3">
                    {/* Load older messages button */}
                    {hasOlderMessages[selectedId!] && (
                      <div className="flex justify-center mb-4">
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1.5" onClick={loadOlderMessages}>
                          <Clock className="h-3 w-3" /> Carregar mensagens anteriores
                        </Button>
                      </div>
                    )}
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
                              <p className="text-sm leading-relaxed text-foreground"><Linkify text={stripQuotes(msg.text)} /></p>
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
                                    <p className={`text-xs truncate ${msg.sender_type === "atendente" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{stripQuotes(msg.quoted_msg.text)}</p>
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
                                    {msg.text && <p className="text-sm leading-relaxed mt-1"><Linkify text={stripQuotes(msg.text)} /></p>}
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
                                    {msg.text && <p className="text-sm leading-relaxed mt-1"><Linkify text={stripQuotes(msg.text)} /></p>}
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
                                {msg.message_type === "text" && <p className="text-sm leading-relaxed whitespace-pre-wrap"><Linkify text={stripQuotes(msg.text)} /></p>}
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
                    {currentMessages.length === 0 && !flowRunning && (
                      <div className="flex flex-col items-center justify-center py-14 gap-2">
                        {loadingMessages ? (
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
                        ) : (
                          <p className="text-sm text-muted-foreground">Sem mensagens nesta conversa.</p>
                        )}
                      </div>
                    )}
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
                </div>

                {/* Media pending preview */}
                {mediaPendingFile && (
                  <div className="px-4 py-3 border-t border-border bg-card/50 space-y-2 shrink-0">
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
                      <p className="text-xs text-muted-foreground truncate">{stripQuotes(replyingTo.text) || "📎 Mídia"}</p>
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
                      <p className="text-xs text-muted-foreground truncate">{stripQuotes(editingMsg.text)}</p>
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
                <div
                  className="border-t border-border px-2 md:px-4 py-2 md:py-3 bg-card shrink-0 z-20"
                  style={isMobile ? { paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" } : undefined}
                >
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
              <div className="flex-1 h-full flex items-center justify-center">
                <div className="text-center space-y-3 flex flex-col items-center justify-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">Selecione uma conversa</p>
                </div>
              </div>
            )}

            {/* Contact Profile Panel (mobile) */}
            <AnimatePresence>
              {showContactProfile && selected && isMobile && (
                <ContactProfilePanel
                  contact={{ ...selected, created_at: selected.last_message_at }}
                  profilePic={profilePicsRef.current.get(selected.id)}
                  onClose={() => setShowContactProfile(false)}
                />
              )}
            </AnimatePresence>
          </div>

          {/* ─── Column 3: Client Context Panel ─── */}
          {!isMobile && showClientContext && selected && (
            <ClientContextPanel
              conversation={selected}
              profilePic={profilePicsRef.current.get(selected.id)}
              onClose={() => setShowClientContext(false)}
              onStageChange={(stage) => handleStageChange(selected.id, stage)}
            />
          )}
        </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
          <DialogContent className="max-w-3xl p-2">
            <img src={lightboxUrl} alt="Imagem" className="w-full rounded-lg" />
          </DialogContent>
        </Dialog>
      )}

      {/* Link Client Dialog */}
      {selected && (
        <LinkClientDialog
          open={showLinkClient}
          onOpenChange={setShowLinkClient}
          conversationId={selected.db_id || selected.id}
          conversationPhone={selected.phone}
          conversationName={selected.contact_name || selected.phone}
          currentClientId={null}
          onLinked={(clientId, clientName) => {
            toast({ title: "Cliente vinculado!", description: `${selected.contact_name} → ${clientName}` });
            setShowLinkClient(false);
          }}
          onUnlinked={() => {
            toast({ title: "Vínculo removido" });
          }}
        />
      )}
    </div>
  );
}

export default function OperacaoInbox() {
  return <OperacaoInboxInner />;
}
