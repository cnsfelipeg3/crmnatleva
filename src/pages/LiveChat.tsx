import { useState, useRef, useEffect, useCallback, Fragment, useMemo, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Search, Filter, Phone, Send, Paperclip, Smile, Sparkles,
  User, Tag, Clock, ChevronDown, Star, AlertTriangle, FileText, Car,
  CreditCard, Plus, ExternalLink, Settings, Upload, X, Check, Eye,
  Image, Mic, Video, File, MoreVertical, ArrowRight, ArrowLeft, RefreshCw, Play, Pause, Square,
  Target, TrendingUp, Shield, Zap, Hash, Globe, ChevronRight, Bot,
  Circle, CheckCheck, Ban, Link2, Clipboard, Calendar, BarChart3,
  Workflow, Link, Brain, TestTube, ScrollText, Cog, Loader2, StopCircle,
  Trash2, WifiOff, Pin, PinOff, Pencil, Wand2, Download, MapPin,
} from "lucide-react";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import LayerDivider from "@/components/LayerDivider";
import { toast } from "@/hooks/use-toast";
import { AudioWaveformPlayer } from "@/components/livechat/AudioWaveformPlayer";
import { TypingIndicator } from "@/components/livechat/TypingIndicator";
import { AISuggestionPanel } from "@/components/livechat/AISuggestionPanel";
import { BuyingMomentAlert } from "@/components/livechat/BuyingMomentAlert";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { initPersistence, persistConversation, persistMessages, loadPersistedMessages } from "@/hooks/useChatPersistence";
import { usePresenceByPhone } from "@/hooks/usePresenceByPhone";
import { ContactProfilePanel } from "@/components/livechat/ContactProfilePanel";
import { ConversationSummaryDialog } from "@/components/livechat/ConversationSummaryDialog";
import NathOpinionButton from "@/components/ai-team/NathOpinionButton";

// ── Lazy-loaded heavy sub-components ──
const FlowListPage = lazy(() => import("@/components/flowbuilder/FlowListPage").then(m => ({ default: m.FlowListPage })));
const FlowCanvas = lazy(() => import("@/components/flowbuilder/FlowCanvas").then(m => ({ default: m.FlowCanvas })));
const LiveChatIntegrations = lazy(() => import("@/components/livechat/LiveChatIntegrations").then(m => ({ default: m.LiveChatIntegrations })));
const LiveChatSimulator = lazy(() => import("@/components/livechat/LiveChatSimulator").then(m => ({ default: m.LiveChatSimulator })));
const LiveChatLogs = lazy(() => import("@/components/livechat/LiveChatLogs").then(m => ({ default: m.LiveChatLogs })));
import LazyEmojiPicker from "@/components/LazyEmojiPicker";
import { useWhatsAppConnection } from "@/hooks/useWhatsAppConnection";

// ─── Types ───
type Stage = "novo_lead" | "contato_inicial" | "qualificacao" | "diagnostico" | "proposta_preparacao" | "proposta_enviada" | "proposta_visualizada" | "ajustes" | "negociacao" | "fechamento_andamento" | "fechado" | "pos_venda" | "perdido";
type MsgType = "text" | "image" | "audio" | "video" | "document";
type MsgStatus = "sent" | "delivered" | "read";

interface Conversation {
  id: string;
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

interface FlowForEdit {
  id: string;
  name: string;
  status: string;
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

const ALL_TAGS = [
  "Instagram", "WhatsApp", "Indicação", "Site", "Google",
  "Nacional", "Internacional", "Lua de mel", "Família", "Corporativo",
  "Urgente", "VIP", "Alto potencial", "Risco", "Recorrente",
  "All Inclusive", "Milhas", "Econômico", "Premium",
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
    // Try direct parse first (handles ISO 8601 and most formats)
    const direct = new Date(dateStr);
    if (!isNaN(direct.getTime()) && direct.getTime() > 0) return direct;
    
    // Normalize postgres timestamp format: "2026-03-09 16:46:13+00" → ISO
    let normalized = dateStr;
    if (normalized.includes(" ") && !normalized.includes("T")) {
      normalized = normalized.replace(" ", "T");
    }
    // Fix timezone offset: +00 → +00:00
    if (/[+-]\d{2}$/.test(normalized)) {
      normalized += ":00";
    }
    const date = new Date(normalized);
    return isNaN(date.getTime()) ? new Date(0) : date;
  } catch {
    return new Date(0);
  }
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
  if (status === "read") return <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb] transition-colors duration-300" style={{ filter: 'drop-shadow(0 0 1px rgba(83,189,235,0.5))' }} />;
  if (status === "delivered") return <CheckCheck className="h-3 w-3 text-white transition-colors duration-300" />;
  return <Check className="h-3 w-3 text-white transition-colors duration-300" />;
}

function mapZapiStatus(zapiStatus: string | null | undefined, fromMe: boolean): MsgStatus {
  if (!fromMe) return "delivered";
  const s = (zapiStatus || "").toUpperCase();
  if (s === "READ" || s === "PLAYED") return "read";
  if (s === "RECEIVED" || s === "DELIVERED" || s === "DELIVERY_ACK") return "delivered";
  return "sent";
}

// Helper: format Brazilian phone number for display
function formatPhoneDisplay(number?: string | null): string {
  const raw = typeof number === "string" ? number : "";
  const clean = raw.replace(/\D/g, "");
  if (clean.startsWith("55") && clean.length >= 12) {
    const ddd = clean.slice(2, 4);
    const rest = clean.slice(4);
    if (rest.length === 9) return `+55 (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
    if (rest.length === 8) return `+55 (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  if (clean.length >= 10) return `+${clean}`;
  return raw || "Sem telefone";
}

function getSafeContactName(contactName?: string | null, phone?: string | null): string {
  const trimmedName = (contactName || "").trim();
  const lower = trimmedName.toLowerCase();
  // Bloqueia nome da agência ou genéricos sendo exibidos como contato
  const isBadName =
    !trimmedName ||
    lower === "natleva" ||
    lower === "natleva viagens" ||
    lower === "natleva wings" ||
    lower === "atendente" ||
    lower === "operador" ||
    lower === "agencia" ||
    lower === "agência" ||
    lower === "novo contato" ||
    lower === "desconhecido";
  if (!isBadName) return trimmedName;
  const trimmedPhone = (phone || "").trim();
  if (trimmedPhone) return formatPhoneDisplay(trimmedPhone);
  return "Contato sem nome";
}

function getContactInitials(contactName?: string | null, phone?: string | null): string {
  const safeName = getSafeContactName(contactName, phone);
  const initials = safeName
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "CN";
}

// Z-API helper
async function callZapiProxy(action: string, payload?: any) {
  const { data, error } = await supabase.functions.invoke("zapi-proxy", {
    body: { action, payload },
  });
  if (error) throw new Error(error.message || "Erro na chamada Z-API");
  return data;
}

// ─── Submenu items ───
const SUBMENU_ITEMS = [
  { key: "inbox", label: "WhatsApp", icon: MessageSquare },
  { key: "flowbuilder", label: "Flow Builder", icon: Workflow },
  { key: "integrations", label: "Integrações", icon: Link },
  { key: "ai_agents", label: "Agentes IA", icon: Brain },
  { key: "tags_pipeline", label: "Tags & Pipeline", icon: Tag },
  { key: "simulator", label: "Simulador", icon: TestTube },
  { key: "logs", label: "Logs & Auditoria", icon: ScrollText },
  { key: "settings", label: "Configurações", icon: Cog },
];

// ════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════
export default function LiveChat() {
  const isMobile = useIsMobile();
  
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState("inbox");
  
  // Sync tab from URL query param
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && SUBMENU_ITEMS.some(item => item.key === tab)) {
      setActiveSection(tab);
    }
  }, [searchParams]);
  const [editingFlow, setEditingFlow] = useState<FlowForEdit | null>(null);

  // Inbox state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [showSettings, setShowSettings] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [flowRunning, setFlowRunning] = useState(false);
  const [botActive, setBotActive] = useState(true);
  const [clientSimText, setClientSimText] = useState("");
  const [activeFlowName, setActiveFlowName] = useState<string | null>(null);
  const flowNameCacheRef = useRef<Record<string, string | null>>({});
  const [waConnected, setWaConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isUserScrolledUpRef = useRef(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [unreadDuringScroll, setUnreadDuringScroll] = useState(0);

  // ─── Presence (digitando/gravando) via hook compartilhado ───
  const presenceByPhone = usePresenceByPhone();

  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [locationInput, setLocationInput] = useState({ name: "", address: "", lat: "", lng: "" });

  const selected = conversations.find(c => c.id === selectedId);
  const waConnection = useWhatsAppConnection();
  const selectedDisplayName = selected ? getSafeContactName(selected.contact_name, selected.phone) : "Contato sem nome";
  const selectedInitials = selected ? getContactInitials(selected.contact_name, selected.phone) : "CN";
  const currentMessages = selectedId ? (messages[selectedId] || []) : [];

  // Helper · label de presença ativa (válida apenas se < 30s atrás)
  const activePresenceStatus = useMemo<"composing" | "recording" | null>(() => {
    const phone = selected?.phone;
    if (!phone) return null;
    const cleanPhone = String(phone).replace(/\D/g, "");
    const entry = presenceByPhone[cleanPhone];
    if (!entry) return null;
    const age = Date.now() - new Date(entry.updated_at).getTime();
    if (age > 30_000) return null;
    if (entry.status === "composing") return "composing";
    if (entry.status === "recording") return "recording";
    return null;
  }, [selected?.phone, presenceByPhone]);

  const presenceLabel = useMemo(() => {
    if (activePresenceStatus === "composing") return "digitando…";
    if (activePresenceStatus === "recording") return "gravando áudio…";
    return null;
  }, [activePresenceStatus]);

  // Handler · enviar localização via Z-API
  const handleSendLocation = useCallback(async () => {
    if (!selected?.phone) return;
    const lat = parseFloat(locationInput.lat);
    const lng = parseFloat(locationInput.lng);
    if (isNaN(lat) || isNaN(lng)) {
      toast({ title: "Coordenadas inválidas", variant: "destructive" });
      return;
    }
    try {
      await callZapiProxy("send-message-location", {
        phone: selected.phone,
        title: locationInput.name || "Localização",
        address: locationInput.address || "",
        latitude: lat,
        longitude: lng,
      });
      toast({ title: "Localização enviada" });
      setShowLocationDialog(false);
      setLocationInput({ name: "", address: "", lat: "", lng: "" });
    } catch (err: any) {
      console.error("Erro ao enviar localização:", err);
      toast({ title: "Erro ao enviar localização", variant: "destructive" });
    }
  }, [selected?.phone, locationInput]);


  // Load active flow name for selected conversation
  useEffect(() => {
    if (!selectedId) { setActiveFlowName(null); return; }
    // If we already have a cached value for this conversation, use it immediately
    if (flowNameCacheRef.current[selectedId] !== undefined) {
      setActiveFlowName(flowNameCacheRef.current[selectedId]);
      return;
    }
    // Don't clear activeFlowName during loading — keep previous value to avoid flicker
    let cancelled = false;
    (async () => {
      let logs: any[] | null = null;
      const { data: directLogs } = await supabase
        .from("flow_execution_logs")
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
            .from("flow_execution_logs")
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

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    requestAnimationFrame(() => {
      const viewport = scrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]");
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior });
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior });
      }
    });
  }, []);

  const previousSelectedIdRef = useRef<string | null>(null);
  const lastMessageId = currentMessages[currentMessages.length - 1]?.id;
  useEffect(() => {
    if (!selectedId) return;
    // Conversa mudou: reseta estado de scroll e vai instantaneamente pro fim
    if (previousSelectedIdRef.current !== selectedId) {
      isUserScrolledUpRef.current = false;
      setIsScrolledUp(false);
      setUnreadDuringScroll(0);
      previousSelectedIdRef.current = selectedId;
      scrollToBottom("auto" as ScrollBehavior);
      return;
    }
    // Mesma conversa, nova mensagem: só rola suavemente se o usuário não subiu
    if (!isUserScrolledUpRef.current) {
      scrollToBottom("smooth");
    } else {
      setUnreadDuringScroll(c => c + 1);
    }
  }, [selectedId, currentMessages.length, lastMessageId, scrollToBottom]);

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]");
    if (!viewport) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      const next = scrollHeight - scrollTop - clientHeight > 100;
      if (isUserScrolledUpRef.current !== next) {
        isUserScrolledUpRef.current = next;
        setIsScrolledUp(next);
        if (!next) setUnreadDuringScroll(0);
      }
    };
    viewport.addEventListener("scroll", handleScroll);
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [selectedId]);

  // Reset textarea height when input is cleared
  useEffect(() => {
    if (!inputText && textareaRef.current) {
      textareaRef.current.style.height = "40px";
    }
  }, [inputText]);

  // iOS keyboard fix: keep container fixed and resize with visualViewport
  const livechatContainerRef = useRef<HTMLDivElement>(null);
  const [mobileHeight, setMobileHeight] = useState<string>("100dvh");
  
  useEffect(() => {
    if (!isMobile) return;
    
    // On mobile, lock body to prevent any scroll behind
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.body.style.top = "0";
    
    const vv = window.visualViewport;
    const lockScroll = () => window.scrollTo(0, 0);

    const syncHeight = () => {
      setMobileHeight(vv ? `${vv.height}px` : "100dvh");
      // Prevent iOS from scrolling the fixed body
      lockScroll();
      // After resize, scroll messages to bottom
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      });
    };

    // Set initial height
    syncHeight();

    if (vv) {
      vv.addEventListener("resize", syncHeight);
      vv.addEventListener("scroll", lockScroll);
    }
    
    return () => {
      if (vv) {
        vv.removeEventListener("resize", syncHeight);
        vv.removeEventListener("scroll", lockScroll);
      }
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

  // Load DB conversations on mount — map to wa_<phone> IDs to avoid duplicates
  useEffect(() => {
    const loadDbConversations = async () => {
      await initPersistence();
      const { data } = await supabase.from("conversations").select("*").is("excluded_at", null).order("last_message_at", { ascending: false }).limit(200);
      if (data && data.length > 0) {
        // For conversations with empty last_message_preview, fetch the latest message
        const convIdsNeedingPreview = data.filter(c => !c.last_message_preview).map(c => c.id);
        const previewMap = new Map<string, { text: string; message_type: string; created_at: string }>();
        if (convIdsNeedingPreview.length > 0) {
          // Fetch latest message per conversation using a query
          for (const convId of convIdsNeedingPreview) {
            const { data: lastMsg } = await supabase
              .from("messages")
              .select("text, message_type, created_at")
              .eq("conversation_id", convId)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();
            if (lastMsg) {
              previewMap.set(convId, lastMsg);
              // Also update the DB so future loads are fast
              supabase.from("conversations").update({
                last_message_preview: lastMsg.text || `📎 ${lastMsg.message_type}`,
                last_message_at: lastMsg.created_at,
              }).eq("id", convId).then(() => {});
            }
          }
        }
        const dbConvs: Conversation[] = data.map(c => {
          const rawPhone = (c.phone || "").toString();
          const cleanPhone = rawPhone.replace(/\D/g, "");
          const canonicalId = cleanPhone ? `wa_${cleanPhone}` : c.id;
          const fallback = previewMap.get(c.id);
          const preview = c.last_message_preview || (fallback ? (fallback.text || `📎 ${fallback.message_type}`) : "");
          const msgAt = c.last_message_at || (fallback ? fallback.created_at : c.last_message_at);
          const safeName = getSafeContactName(c.contact_name, rawPhone);

          // ─── Hydrate cached profile picture from DB (instant, zero API calls) ───
          const cachedPic = (c as any).profile_picture_url;
          if (cachedPic && typeof cachedPic === "string" && cachedPic.startsWith("http")) {
            profilePicsRef.current.set(canonicalId, cachedPic);
            if (cleanPhone) profilePicsRef.current.set(`wa_${cleanPhone}`, cachedPic);
          }

          return {
            id: canonicalId,
            phone: cleanPhone || rawPhone,
            contact_name: safeName,
            stage: (c.stage as Stage) || "novo_lead",
            tags: c.tags || [],
            source: c.source || "whatsapp",
            last_message_at: msgAt || new Date().toISOString(),
            last_message_preview: preview,
            unread_count: c.unread_count || 0,
            is_vip: c.is_vip || false,
            assigned_to: c.assigned_to || "",
            score_potential: c.score_potential || 0,
            score_risk: c.score_risk || 0,
            vehicle_interest: c.vehicle_interest || undefined,
            price_range: c.price_range || undefined,
            payment_method: c.payment_method || undefined,
            is_pinned: (c as any).is_pinned || false,
          };
        });
        setConversations(prev => {
          // Merge: if wa_<phone> already exists, update metadata; otherwise add
          const byId = new Map(prev.map(c => [c.id, c]));
          for (const dc of dbConvs) {
            const existing = byId.get(dc.id);
            if (existing) {
              // Merge DB metadata into existing, keep most recent timestamp
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

  // Extract media URL from zapi_messages raw_data
  const extractMediaFromRawData = useCallback((rawData: any, type: string): { mediaUrl?: string; caption?: string } => {
    if (!rawData) return {};
    try {
      const rd = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
      if (type === "audio") {
        const audioUrl = rd.audio?.audioUrl || rd.audioUrl || rd.mediaUrl;
        return { mediaUrl: audioUrl || undefined };
      }
      if (type === "image") {
        const imageUrl = rd.image?.imageUrl || rd.image?.thumbnailUrl || rd.imageUrl || rd.mediaUrl;
        const caption = rd.image?.caption || rd.caption || undefined;
        return { mediaUrl: imageUrl || undefined, caption };
      }
      if (type === "video") {
        const videoUrl = rd.video?.videoUrl || rd.videoUrl || rd.mediaUrl;
        const caption = rd.video?.caption || rd.caption || undefined;
        return { mediaUrl: videoUrl || undefined, caption };
      }
      if (type === "document") {
        const docUrl = rd.document?.documentUrl || rd.documentUrl || rd.mediaUrl;
        return { mediaUrl: docUrl || undefined, caption: rd.document?.fileName || rd.fileName };
      }
      if (type === "sticker") {
        const stickerUrl = rd.sticker?.stickerUrl || rd.stickerUrl || rd.mediaUrl;
        return { mediaUrl: stickerUrl || undefined };
      }
      return {};
    } catch { return {}; }
  }, []);

  // Parse Z-API message to our Message format
  const parseZapiMessage = useCallback((msg: any, convId: string): Message | null => {
    const msgId = msg.messageId || msg.id || `${Date.now()}_${Math.random()}`;
    const fromMe = msg.fromMe || false;
    let text = "";
    let msgType: MsgType = "text";
    let mediaUrl: string | undefined;

    if (msg.text?.message) {
      text = msg.text.message;
    } else if (typeof msg.text === "string") {
      text = msg.text;
    } else if (msg.body) {
      text = msg.body;
    }

    if (msg.image) {
      msgType = "image";
      mediaUrl = msg.image.imageUrl || msg.image.thumbnailUrl || msg.image;
      text = msg.image.caption || msg.caption || text;
    } else if (msg.audio) {
      msgType = "audio";
      mediaUrl = msg.audio.audioUrl || msg.audio;
    } else if (msg.video) {
      msgType = "video";
      mediaUrl = msg.video.videoUrl || msg.video;
      text = msg.video.caption || msg.caption || text;
    } else if (msg.document) {
      msgType = "document";
      text = `📄 ${msg.document.fileName || "Documento"}`;
      mediaUrl = msg.document.documentUrl || msg.document;
    } else if (msg.sticker) {
      msgType = "image";
      mediaUrl = msg.sticker.stickerUrl || msg.sticker;
    }

    // Handle type field from Z-API
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

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;

    const normalizeDbMessageType = (value: string | null | undefined): MsgType => {
      const raw = (value || "text").toLowerCase();
      if (raw === "ptt") return "audio";
      if (raw === "sticker") return "image";
      if (raw === "image" || raw === "audio" || raw === "video" || raw === "document") return raw;
      return "text";
    };

    const normalizeDbStatus = (value: string | null | undefined): MsgStatus => {
      const raw = (value || "sent").toLowerCase();
      if (["read", "lido", "seen", "played"].includes(raw)) return "read";
      if (["delivered", "entregue", "received", "delivery_ack"].includes(raw)) return "delivered";
      return "sent";
    };

    const mapDbMessages = (rows: any[], conversationKey: string): Message[] => (
      (rows || []).map((m: any) => {
        const rawText = m.text ?? m.content ?? "";
        const msgType = normalizeDbMessageType(m.message_type);
        // Clean up [MÍDIA: xxx] placeholders
        const cleanText = /^\[MÍDIA:\s*\w+\]$/.test(rawText) ? "" : rawText;
        return {
          id: m.id,
          conversation_id: conversationKey,
          sender_type: m.sender_type as "cliente" | "atendente" | "sistema",
          message_type: msgType,
          text: cleanText,
          media_url: m.media_url || undefined,
          status: normalizeDbStatus(m.status ?? m.read_status),
          created_at: String(m.created_at),
        };
      })
    );

    const loadMessages = async () => {
      try {
        if (selectedId.startsWith("wa_")) {
          const phone = selectedId.replace("wa_", "").trim();
          const phoneCandidates = Array.from(new Set([phone, `${phone}-group`, `${phone}@g.us`]));
          const dbPhoneCandidates = Array.from(new Set([phone, `+${phone}`, `${phone}@c.us`, `${phone}@g.us`, `${phone}-group`]));

          const [zapiResp, byPhoneResp, byExternalResp] = await Promise.all([
            supabase
              .from("zapi_messages" as any)
              .select("*")
              .in("phone", phoneCandidates)
              .order("timestamp", { ascending: false })
              .limit(1000),
            supabase.from("conversations").select("id, updated_at").in("phone", dbPhoneCandidates).order("updated_at", { ascending: false }),
            supabase.from("conversations").select("id, updated_at").eq("external_conversation_id", selectedId).order("updated_at", { ascending: false }),
          ]);

          if (cancelled) return;

          const zapiMsgs: Message[] = (zapiResp.data || [])
            .map((m: any) => {
              const mediaInfo = extractMediaFromRawData(m.raw_data, m.type || "text");
              return {
                id: m.message_id || m.id,
                conversation_id: selectedId,
                sender_type: (m.from_me ? "atendente" : "cliente") as "cliente" | "atendente",
                message_type: (m.type || "text") as MsgType,
                text: m.text || mediaInfo.caption || "",
                media_url: mediaInfo.mediaUrl,
                status: mapZapiStatus(m.status, m.from_me),
                created_at: String(m.timestamp || m.created_at),
              };
            })
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

          const candidateConversations = [...(byPhoneResp.data || []), ...(byExternalResp.data || [])]
            .filter(c => !!c.id)
            .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());

          const candidateIds = Array.from(new Set(candidateConversations.map(c => c.id)));
          let fallbackConversationId: string | null = candidateIds[0] || null;

          if (candidateIds.length > 0) {
            const [{ data: latestLegacyMsg }, { data: latestModernMsg }] = await Promise.all([
              supabase
                .from("messages")
                .select("conversation_id, created_at")
                .in("conversation_id", candidateIds)
                .order("created_at", { ascending: false })
                .limit(1),
              supabase
                .from("chat_messages")
                .select("conversation_id, created_at")
                .in("conversation_id", candidateIds)
                .order("created_at", { ascending: false })
                .limit(1),
            ]);

            fallbackConversationId = latestLegacyMsg?.[0]?.conversation_id || latestModernMsg?.[0]?.conversation_id || fallbackConversationId;
          }

          let dbMsgs: Message[] = [];
          if (fallbackConversationId) {
            const [legacyResp, modernResp] = await Promise.all([
              supabase
                .from("messages")
                .select("*")
                .eq("conversation_id", fallbackConversationId)
                .order("created_at", { ascending: true })
                .limit(1000),
              supabase
                .from("chat_messages")
                .select("*")
                .eq("conversation_id", fallbackConversationId)
                .order("created_at", { ascending: true })
                .limit(1000),
            ]);

            const mergedRows = [...(legacyResp.data || []), ...(modernResp.data || [])];
            const dedupedRows = Array.from(
              new Map(
                mergedRows.map((row: any) => [row.id || `${row.created_at}_${row.sender_type}_${row.text || row.content || ""}`, row]),
              ).values(),
            ).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            dbMsgs = mapDbMessages(dedupedRows, selectedId);
          }

          const mergedMap = new Map<string, Message>();
          for (const msg of [...dbMsgs, ...zapiMsgs]) {
            const key = msg.id || `${msg.created_at}_${msg.sender_type}_${msg.message_type}_${msg.text || ""}`;
            const existing = mergedMap.get(key);
            if (!existing) {
              mergedMap.set(key, msg);
              continue;
            }
            mergedMap.set(key, {
              ...existing,
              ...msg,
              text: msg.text || existing.text,
              media_url: msg.media_url || existing.media_url,
            });
          }

          const mergedMsgs = Array.from(mergedMap.values()).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
          );

          for (const m of mergedMsgs) {
            if (m.id) lastMsgIdsRef.current.add(m.id);
          }

          if (!cancelled) {
            setMessages(prev => ({ ...prev, [selectedId]: mergedMsgs }));
          }
          return;
        }

        if (selectedId.length > 10) {
          const [legacyResp, modernResp] = await Promise.all([
            supabase.from("messages").select("*").eq("conversation_id", selectedId).order("created_at", { ascending: true }),
            supabase.from("chat_messages").select("*").eq("conversation_id", selectedId).order("created_at", { ascending: true }),
          ]);

          if (!cancelled) {
            const mergedRows = [...(legacyResp.data || []), ...(modernResp.data || [])];
            const dedupedRows = Array.from(
              new Map(mergedRows.map((row: any) => [row.id || `${row.created_at}_${row.sender_type}_${row.text || row.content || ""}`, row])).values(),
            ).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            setMessages(prev => ({ ...prev, [selectedId]: mapDbMessages(dedupedRows, selectedId) }));
          }
        }
      } catch (error) {
        console.error("Erro ao carregar histórico da conversa:", error);
      }
    };

    void loadMessages();
    return () => {
      cancelled = true;
    };
  }, [selectedId, extractMediaFromRawData]);

  // Realtime subscription for new messages and conversations
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
          id: msgId,
          conversation_id: waKey,
          sender_type: (n.from_me ? "atendente" : "cliente") as "cliente" | "atendente",
          message_type: (n.type || "text") as MsgType,
          text: n.text || mediaInfo2.caption || "",
          media_url: mediaInfo2.mediaUrl,
          status: mapZapiStatus(n.status, n.from_me),
          created_at: n.timestamp || n.created_at,
        };
        setMessages(prev => {
          const existing = prev[waKey] || [];
          // Check for duplicates by ID
          if (existing.find(m => m.id === msg.id)) return prev;
          // If from_me, replace any temp_ message with same text (sent from this client)
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
        // Update conversation preview
        if (!n.from_me) {
          setConversations(prev => prev.map(c => {
            if (c.id !== waKey) return c;
            // If this conversation is currently open, don't increment unread
            const isOpen = waKey === selectedIdRef.current;
            return {
              ...c,
              last_message_preview: n.text || `📎 ${n.type || "media"}`,
              last_message_at: n.timestamp || n.created_at || new Date().toISOString(),
              unread_count: isOpen ? 0 : c.unread_count + 1,
            };
          }));
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'zapi_messages' }, (payload) => {
        // Handle status updates (delivery receipts, read receipts)
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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversation_messages' }, (payload) => {
        // Status updates (delivery / read receipts) vindos do canal oficial
        const n = payload.new as any;
        if (!n?.id) return;
        const newStatus = (n.status || "sent") as MsgStatus;
        const extId = n.external_message_id || null;
        setMessages(prev => {
          let mutated = false;
          const next: typeof prev = {};
          for (const [convKey, list] of Object.entries(prev)) {
            const idx = list.findIndex(m => m.id === n.id || (extId && m.id === extId) || (extId && (m as any).external_message_id === extId));
            if (idx < 0) { next[convKey] = list; continue; }
            if (list[idx].status === newStatus) { next[convKey] = list; continue; }
            const copy = [...list];
            copy[idx] = { ...copy[idx], status: newStatus };
            next[convKey] = copy;
            mutated = true;
          }
          return mutated ? next : prev;
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, (payload) => {
        // Handle DELETE events — remove conversation from local state completely
        if (payload.eventType === 'DELETE') {
          const old = payload.old as any;
          if (!old?.id) return;
          const cleanPhone = old.phone ? String(old.phone).replace(/\D/g, "") : "";
          const waKey = cleanPhone ? `wa_${cleanPhone}` : old.id;
          const externalId = old.external_conversation_id || "";
          // Remove from conversations list
          setConversations(prev => prev.filter(c => c.id !== waKey && c.id !== old.id && c.id !== externalId));
          // Clear messages for this conversation
          setMessages(prev => {
            const next = { ...prev };
            delete next[waKey];
            delete next[old.id];
            if (externalId) delete next[externalId];
            return next;
          });
          // If this was the selected conversation, deselect it
          if (selectedIdRef.current === waKey || selectedIdRef.current === old.id || selectedIdRef.current === externalId) {
            setSelectedId(null);
          }
          return;
        }
        const u = payload.new as any;
        if (!u?.id || !u?.phone) return;
        const cleanPhone = String(u.phone).replace(/\D/g, "");
        const waKey = cleanPhone ? `wa_${cleanPhone}` : u.id;

        // ── Handle exclusion marker from webhook ──
        if (u.last_message_preview === "__CONTACT_EXCLUDED__" || u.unread_count === -1) {
          // contact excluded — silent in production
          setConversations(prev => prev.filter(c => c.id !== waKey && c.id !== u.id));
          setMessages(prev => {
            const next = { ...prev };
            delete next[waKey];
            delete next[u.id];
            return next;
          });
          if (selectedIdRef.current === waKey || selectedIdRef.current === u.id) {
            setSelectedId(null);
          }
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
              last_message_preview: bestPreview,
              last_message_at: bestTime,
              unread_count: isOpen ? 0 : Math.max(c.unread_count, u.unread_count ?? 0),
              stage: (u.stage as Stage) || c.stage, tags: u.tags || c.tags,
              contact_name: getSafeContactName(c.contact_name, c.phone) || getSafeContactName(u.contact_name, cleanPhone || u.phone),
              source: u.source || c.source,
            } : c).filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i);
            return updated.sort((a, b) => {
              if (a.is_pinned && !b.is_pinned) return -1;
              if (!a.is_pinned && b.is_pinned) return 1;
              return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
            });
          }
          return [{ id: waKey, phone: cleanPhone || String(u.phone), contact_name: getSafeContactName(u.contact_name, cleanPhone || u.phone),
            stage: (u.stage as Stage) || "novo_lead", tags: u.tags || [], source: u.source || "whatsapp",
            last_message_at: u.last_message_at || new Date().toISOString(), last_message_preview: u.last_message_preview || "",
            unread_count: u.unread_count || 0, is_vip: u.is_vip || false,
            assigned_to: u.assigned_to || "", score_potential: u.score_potential || 0, score_risk: u.score_risk || 0,
          }, ...prev];
        });
      })
      .subscribe();
    return () => {
      channel.unsubscribe().finally(() => {
        supabase.removeChannel(channel);
      });
    };
  }, []);

  // Z-API WhatsApp polling
  useEffect(() => {
    const POLL_MS = 5000;

    async function loadChats() {
      try {
        const data = await callZapiProxy("get-chats");
        const chats = Array.isArray(data) ? data : [];
        // Only show chats that have a conversation in our DB
        const phoneList = chats
          .map((c: any) => (c.phone || c.id || "").replace(/\D/g, ""))
          .filter(Boolean);
        
        // Fetch which phones already have conversations in DB
        const knownPhones = new Set<string>();
        if (phoneList.length > 0) {
          const { data: dbConvs } = await supabase
            .from("conversations")
            .select("phone")
            .in("phone", phoneList);
          for (const c of dbConvs || []) {
            knownPhones.add(c.phone);
          }
        }

        const newConvs: Conversation[] = [];

        // Populate LID→phone mappings from get-chats data (batch upsert)
        const lidMappings: Array<{ phone: string; lid: string; name: string | null }> = [];
        for (const chat of chats) {
          const chatPhone = (chat.phone || "").replace(/\D/g, "");
          const chatLid = (chat.lid || "").replace("@lid", "");
          if (chatPhone && chatLid) {
            lidMappings.push({ phone: chatPhone, lid: chatLid, name: chat.name || chat.chatName || null });
          }
        }
        if (lidMappings.length > 0) {
          supabase.from("zapi_contacts").upsert(
            lidMappings.map(m => ({ phone: m.phone, lid: m.lid, name: m.name, updated_at: new Date().toISOString() })),
            { onConflict: "phone", ignoreDuplicates: true }
          ).then(({ error }) => { if (error) console.error("LID mapping upsert error:", error); });
        }

        for (const chat of chats) {
          const phone = chat.phone || chat.id || "";
          if (!phone || phone.includes("@g.us") || phone === "status@broadcast") continue;

          // Clean phone number
          const cleanPhone = phone.replace(/\D/g, "");
          if (!cleanPhone) continue;

          // Only include chats that exist in our DB
          if (!knownPhones.has(cleanPhone)) continue;

          const convId = `wa_${cleanPhone}`;
          const contactName = chat.name || chat.chatName || chat.contact?.name || formatPhoneDisplay(cleanPhone);
          let lastMsgTime: string | null = null;
          try {
            if (chat.lastMessageTimestamp && Number(chat.lastMessageTimestamp) > 0) {
              lastMsgTime = new Date(Number(chat.lastMessageTimestamp) * 1000).toISOString();
            } else if (chat.lastMessageTime && Number(chat.lastMessageTime) > 0) {
              lastMsgTime = new Date(Number(chat.lastMessageTime)).toISOString();
            }
          } catch { lastMsgTime = null; }

          const chatPhoto = chat.imgUrl || chat.image || chat.photo || "";
          newConvs.push({
            id: convId, phone: cleanPhone, contact_name: contactName,
            stage: "novo_lead" as Stage, tags: [], source: "whatsapp",
            last_message_at: lastMsgTime || new Date().toISOString(),
            last_message_preview: chat.lastMessage || chat.lastMessageText || "",
            unread_count: chat.unreadMessages || chat.unread || 0,
            is_vip: false, assigned_to: "",
            score_potential: 0, score_risk: 0,
          });
          // Store photo from Z-API chat data immediately
          if (chatPhoto && typeof chatPhoto === "string" && chatPhoto.startsWith("http")) {
            profilePicsRef.current.set(convId, chatPhoto);
            profilePicsRef.current.set(`wa_${cleanPhone}`, chatPhoto);
          }
        }

        if (newConvs.length > 0) {
          // Deduplicate
          const deduped = new Map<string, Conversation>();
          for (const conv of newConvs) {
            const existing = deduped.get(conv.id);
            if (!existing || new Date(conv.last_message_at).getTime() > new Date(existing.last_message_at).getTime()) {
              deduped.set(conv.id, conv);
            }
          }
          const dedupedConvs = Array.from(deduped.values())
            .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

          setConversations(prev => {
            const prevMap = new Map(prev.map(c => [c.id, c]));
            const merged = dedupedConvs.map(c => {
              const existing = prevMap.get(c.id);
              if (existing) {
                const isOpen = c.id === selectedIdRef.current;
                // Preserve local data; use the most recent timestamp
                const existingTime = new Date(existing.last_message_at).getTime();
                const freshTime = new Date(c.last_message_at).getTime();
                const bestTime = freshTime > existingTime ? c.last_message_at : existing.last_message_at;
                const bestPreview = (freshTime > existingTime && c.last_message_preview) ? c.last_message_preview : (existing.last_message_preview || c.last_message_preview);
                return {
                  ...c,
                  contact_name: existing.contact_name || c.contact_name,
                  last_message_at: bestTime,
                  last_message_preview: bestPreview || c.last_message_preview,
                  unread_count: isOpen ? 0 : existing.unread_count,
                  stage: existing.stage || c.stage,
                  tags: existing.tags.length > 0 ? existing.tags : c.tags,
                  is_vip: existing.is_vip || c.is_vip,
                  assigned_to: existing.assigned_to || c.assigned_to,
                  score_potential: existing.score_potential || c.score_potential,
                  score_risk: existing.score_risk || c.score_risk,
                  vehicle_interest: existing.vehicle_interest || c.vehicle_interest,
                  is_pinned: existing.is_pinned || c.is_pinned,
                };
              }
              return c;
            });
            // Keep conversations not in fresh batch
            const freshIds = new Set(dedupedConvs.map(c => c.id));
            const kept = prev.filter(c => !freshIds.has(c.id));
            return [...kept, ...merged].sort((a, b) => {
              if (a.is_pinned && !b.is_pinned) return -1;
              if (!a.is_pinned && b.is_pinned) return 1;
              return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
            });
          });

          // Persist conversations
          for (const conv of dedupedConvs) {
            persistConversation(conv).catch(() => {});
          }

          // Extract profile pictures from raw_data first (fast, no API call)
          for (const conv of dedupedConvs) {
            if (!profilePicsRef.current.has(conv.id) && (conv as any).photo) {
              const pic = (conv as any).photo;
              if (pic && typeof pic === "string" && pic.startsWith("http")) {
                profilePicsRef.current.set(conv.id, pic);
                profilePicsRef.current.set(`wa_${conv.phone}`, pic);
              }
            }
          }
          // Fetch profile pictures via API for those still missing — process all, in parallel chunks
          const missing = dedupedConvs.filter(conv => !profilePicsRef.current.has(conv.id));
          (async () => {
            const chunkSize = 6;
            for (let i = 0; i < missing.length; i += chunkSize) {
              const chunk = missing.slice(i, i + chunkSize);
              await Promise.all(chunk.map(async (conv) => {
                try {
                  const data = await callZapiProxy("get-profile-picture", { phone: conv.phone });
                  const picUrl = data?.link || data?.profilePictureUrl || "";
                  if (picUrl && typeof picUrl === "string" && picUrl.startsWith("http")) {
                    profilePicsRef.current.set(conv.id, picUrl);
                    profilePicsRef.current.set(`wa_${conv.phone}`, picUrl);
                    setProfilePicsVersion(v => v + 1);
                    // Persist to DB so next load is instant
                    supabase.from("conversations").update({
                      profile_picture_url: picUrl,
                      profile_picture_fetched_at: new Date().toISOString(),
                    } as any).eq("phone", conv.phone).is("profile_picture_url", null).then(() => {});
                  }
                } catch { /* ignore individual failures */ }
              }));
              // Tiny breather between chunks to be nice to Z-API
              await new Promise(r => setTimeout(r, 80));
            }
          })();
        }
        chatsLoadedRef.current = true;
      } catch (err) {
        console.error("Error loading chats:", err);
      }
    }

    async function pollWhatsAppMessages() {
      if (!selectedId?.startsWith("wa_")) return;
      try {
        const phone = selectedId.replace("wa_", "");
        const { data: zapiData } = await supabase.from("zapi_messages").select("*").eq("phone", phone).order("timestamp", { ascending: true }).limit(200);
        const rawMsgs = zapiData || [];

        const newMsgs: Message[] = [];
        for (const m of rawMsgs) {
          const msgId = m.message_id || m.id;
          if (lastMsgIdsRef.current.has(msgId)) continue;
          lastMsgIdsRef.current.add(msgId);
          const mediaInfo3 = extractMediaFromRawData(m.raw_data, m.type || "text");
          newMsgs.push({
            id: msgId,
            conversation_id: selectedId,
            sender_type: (m.from_me ? "atendente" : "cliente") as "cliente" | "atendente",
            message_type: (m.type || "text") as MsgType,
            text: m.text || mediaInfo3.caption || "",
            media_url: mediaInfo3.mediaUrl,
            status: mapZapiStatus(m.status, m.from_me),
            created_at: String(m.timestamp || m.created_at),
          });
        }

        if (newMsgs.length > 0) {
          setMessages(prev => {
            const existing = prev[selectedId] || [];
            const existingIds = new Set(existing.map(m => m.id));
            // Filter out already-existing and replace temp_ messages
            let updated = [...existing];
            for (const nm of newMsgs) {
              if (existingIds.has(nm.id)) continue;
              // Replace temp_ with same text from same sender
              if (nm.sender_type === "atendente") {
                const tempIdx = updated.findIndex(m => m.id.startsWith("temp_") && m.text === nm.text);
                if (tempIdx >= 0) {
                  updated[tempIdx] = { ...updated[tempIdx], id: nm.id, media_url: nm.media_url || updated[tempIdx].media_url };
                  continue;
                }
              }
              updated.push(nm);
            }
            updated.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            return { ...prev, [selectedId]: updated };
          });

          const lastMsg = newMsgs[newMsgs.length - 1];
          setConversations(prev => prev.map(c => {
            if (c.id !== selectedId) return c;
            // Only update if the polled message is actually newer than what we have
            const existingTime = new Date(c.last_message_at).getTime();
            const newTime = new Date(lastMsg.created_at).getTime();
            if (newTime <= existingTime) return c;
            return {
              ...c,
              last_message_preview: lastMsg.text,
              last_message_at: lastMsg.created_at,
            };
          }));
        }
      } catch (err) {
        console.error("WhatsApp polling error:", err);
      }
    }

    async function checkAndStartPolling() {
      try {
        const data = await callZapiProxy("check-status");
        if (data?.connected) {
          setWaConnected(true);
          await loadChats();
          pollWhatsAppMessages();
          whatsappPollRef.current = setInterval(pollWhatsAppMessages, POLL_MS);
        } else {
          setWaConnected(false);
        }
      } catch {
        setWaConnected(false);
      }
    }

    checkAndStartPolling();
    return () => { if (whatsappPollRef.current) clearInterval(whatsappPollRef.current); };
  }, [selectedId, parseZapiMessage]);

  const filteredConversations = (() => {
    const filtered = conversations.filter(c => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const safeName = getSafeContactName(c.contact_name, c.phone).toLowerCase();
        const safePhone = (c.phone || "").toLowerCase();
        if (!safeName.includes(q) && !safePhone.includes(q) &&
            !(c.vehicle_interest || "").toLowerCase().includes(q))
          return false;
      }
      if (activeFilter === "unread") return c.unread_count > 0;
      if (activeFilter === "vip") return c.is_vip;
      if (activeFilter === "qualificacao") return c.stage === "qualificacao";
      if (activeFilter === "proposta_enviada") return c.stage === "proposta_enviada";
      if (activeFilter === "no_reply") return c.unread_count > 0 && c.assigned_to === "";
      return true;
    }).sort((a, b) => {
      // Pinned conversations always first
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });

    // Deduplicate by normalized phone - keep most recent (first after sort)
    const seen = new Set<string>();
    return filtered.filter(c => {
      const norm = (c.phone || "").replace(/\D/g, "");
      if (!norm) return true;
      if (seen.has(norm)) return false;
      seen.add(norm);
      return true;
    });
  })();

  // Execute flow engine for a conversation
  const executeFlow = useCallback(async (conversationId: string, messageText: string) => {
    if (!botActive) return;
    setFlowRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("execute-flow", {
        body: {
          conversation_id: conversationId,
          trigger_type: "new_message",
          trigger_data: { message_text: messageText, message_type: "text" },
        },
      });
      if (error) { console.error("Flow execution error:", error); return; }
      if (data?.status === "no_active_flow") return;

      if (conversationId.length > 10) {
        const { data: newMsgs } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at");
        if (newMsgs) {
          setMessages(prev => ({
            ...prev,
            [conversationId]: newMsgs.map(m => ({
              id: m.id, conversation_id: m.conversation_id,
              sender_type: m.sender_type as "cliente" | "atendente" | "sistema",
              message_type: m.message_type as MsgType,
              text: m.text || "", media_url: m.media_url || undefined,
              status: m.status as MsgStatus, created_at: m.created_at,
            })),
          }));
        }
        const { data: updatedConv } = await supabase.from("conversations").select("*").eq("id", conversationId).single();
        if (updatedConv) {
          setConversations(prev => prev.map(c => c.id === conversationId ? {
            ...c, tags: updatedConv.tags || [], stage: updatedConv.stage as Stage,
            last_message_preview: updatedConv.last_message_preview || c.last_message_preview,
            last_message_at: updatedConv.last_message_at, assigned_to: updatedConv.assigned_to || c.assigned_to,
          } : c));
        }
      }
      if (data?.actions_applied?.length > 0) {
        toast({ title: "🤖 Flow executado", description: `${data.steps} blocos · ${data.actions_applied.length} ações aplicadas` });
      }
    } catch (err) {
      console.error("Flow invoke error:", err);
    } finally {
      setFlowRunning(false);
    }
  }, [botActive]);

  // Simulate client message
  const handleSimulateClient = useCallback(async () => {
    if (!clientSimText.trim() || !selectedId) return;
    const text = clientSimText.trim();
    setClientSimText("");
    if (selectedId.length > 10) {
      await supabase.from("messages").insert({ conversation_id: selectedId, sender_type: "cliente", message_type: "text", text, status: "delivered" });
      await supabase.from("conversations").update({ last_message_preview: text, last_message_at: new Date().toISOString(), unread_count: (selected?.unread_count || 0) + 1 }).eq("id", selectedId);
      const { data: newMsgs } = await supabase.from("messages").select("*").eq("conversation_id", selectedId).order("created_at");
      if (newMsgs) {
        setMessages(prev => ({
          ...prev,
          [selectedId]: newMsgs.map(m => ({
            id: m.id, conversation_id: m.conversation_id,
            sender_type: m.sender_type as "cliente" | "atendente" | "sistema",
            message_type: m.message_type as MsgType,
            text: m.text || "", status: m.status as MsgStatus, created_at: m.created_at,
          })),
        }));
      }
      await executeFlow(selectedId, text);
    }
  }, [clientSimText, selectedId, selected, executeFlow]);

  // Correct message text via AI before sending
  const correctMessage = useCallback(async (rawText: string): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke("correct-message", {
        body: { text: rawText },
      });
      if (error || !data?.corrected) return rawText;
      return data.corrected;
    } catch {
      return rawText;
    }
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

  // Send message (or save edit)
  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !selectedId || isSending) return;
    setIsSending(true);
    const text = inputText.trim();

    // --- EDIT MODE ---
    if (editingMsg) {
      const msgToEdit = editingMsg;
      setInputText("");
      setEditingMsg(null);
      textareaRef.current?.focus();

      // Update locally immediately
      setMessages(prev => ({
        ...prev,
        [selectedId]: (prev[selectedId] || []).map(m =>
          m.id === msgToEdit.id ? { ...m, text, edited: true } : m
        ),
      }));

      // Send edit to Z-API
      if (selectedId.startsWith("wa_") && msgToEdit.id && !msgToEdit.id.startsWith("temp_")) {
        try {
          const phone = selectedId.replace("wa_", "");
          await callZapiProxy("edit-message", { phone, messageId: msgToEdit.id, text });
        } catch (err) {
          console.error("Error editing via Z-API:", err);
          toast({ title: "Erro ao editar", description: "Não foi possível editar no WhatsApp", variant: "destructive" });
        }
      }

      setIsSending(false);
      return;
    }

    // --- NORMAL SEND ---
    const replyRef = replyingTo;
    setInputText("");
    setShowAIPanel(false);
    setReplyingTo(null);
    textareaRef.current?.focus();

    if (selectedId.startsWith("wa_")) {
      const phone = selectedId.replace("wa_", "");
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const newMsg: Message = {
        id: tempId, conversation_id: selectedId,
        sender_type: "atendente", message_type: "text",
        text, status: "sent", created_at: new Date().toISOString(),
        quoted_msg: replyRef ? { text: replyRef.text || "📎 Mídia", sender_type: replyRef.sender_type, message_type: replyRef.message_type } : undefined,
      };
      setMessages(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] || []), newMsg] }));
      lastMsgIdsRef.current.add(tempId);

      try {
        const sendPayload: any = { phone, message: text };
        if (replyRef?.id && !replyRef.id.startsWith("temp_")) {
          sendPayload.messageId = replyRef.id;
        }
        const sendResult = await callZapiProxy("send-text", sendPayload);
        const realId = sendResult?.messageId || sendResult?.id;
        if (realId) {
          lastMsgIdsRef.current.add(realId);
          setMessages(prev => {
            const convMsgs = prev[selectedId] || [];
            return { ...prev, [selectedId]: convMsgs.map(m => m.id === tempId ? { ...m, id: realId } : m) };
          });
        }
      } catch (err) {
        console.error("Error sending via Z-API:", err);
        toast({ title: "Erro ao enviar", description: "Falha na comunicação com WhatsApp", variant: "destructive" });
      }
    } else if (selectedId.length > 10) {
      await supabase.from("messages").insert({ conversation_id: selectedId, sender_type: "atendente", message_type: "text", text, status: "sent" });
      await supabase.from("conversations").update({ last_message_preview: text, last_message_at: new Date().toISOString(), unread_count: 0 }).eq("id", selectedId);

      if (selected?.source === "whatsapp" && selected?.phone) {
        try {
          const { data: connData } = await supabase
            .from("whatsapp_connections" as any)
            .select("id")
            .eq("status", "active")
            .limit(1)
            .maybeSingle();
          if (connData) {
            await supabase.functions.invoke("send-whatsapp-official", {
              body: { to: selected.phone, message: text, connection_id: (connData as any).id },
            });
          }
        } catch (err) {
          console.error("Error sending via official API:", err);
        }
      }

      const { data } = await supabase.from("messages").select("*").eq("conversation_id", selectedId).order("created_at");
      if (data) {
        setMessages(prev => ({
          ...prev,
          [selectedId]: data.map(m => ({
            id: m.id, conversation_id: m.conversation_id,
            sender_type: m.sender_type as "cliente" | "atendente" | "sistema",
            message_type: m.message_type as MsgType,
            text: m.text || "", status: m.status as MsgStatus, created_at: m.created_at,
          })),
        }));
      }
    }

    setConversations(prev => {
      const updated = prev.map(c =>
        c.id === selectedId ? { ...c, last_message_preview: text, last_message_at: new Date().toISOString(), unread_count: 0 } : c
      );
      return updated.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });
    });
    setIsSending(false);
    isUserScrolledUpRef.current = false;
    scrollToBottom();
  }, [inputText, selectedId, selected, replyingTo, editingMsg, isSending, scrollToBottom]);

  const handleStartEdit = useCallback((msg: Message) => {
    if (msg.sender_type !== "atendente" || msg.message_type !== "text") return;
    setEditingMsg(msg);
    setInputText(msg.text || "");
    setReplyingTo(null);
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Helper: upload file to Supabase Storage and return public URL
  const uploadToStorage = useCallback(async (blob: Blob | File, folder: string, fileName: string): Promise<string> => {
    const { error } = await supabase.storage.from("media").upload(`${folder}/${fileName}`, blob, {
      contentType: blob.type || "application/octet-stream",
      upsert: true,
    });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    const { data: urlData } = supabase.storage.from("media").getPublicUrl(`${folder}/${fileName}`);
    return urlData.publicUrl;
  }, []);

  // Audio recording refs for waveform
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>(new Array(25).fill(4));
  const waveformIntervalRef = useRef<ReturnType<typeof setInterval>>();

  // Audio recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Setup Web Audio API analyser for waveform
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
        const actualMime = mimeType || 'audio/webm';
        const rawBlob = new Blob(audioChunksRef.current, { type: actualMime });
        if (rawBlob.size < 100) return; // cancelled
        if (!selectedId) return;
        const phone = selectedId.replace("wa_", "");
        try {
          // Convert WebM to WAV for WhatsApp compatibility
          // Converting WebM to WAV for WhatsApp compatibility
          
          const arrayBuffer = await rawBlob.arrayBuffer();
          const offlineCtx = new AudioContext();
          const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);
          await offlineCtx.close();
          
          const sampleRate = 16000;
          const offlineRender = new OfflineAudioContext(1, audioBuffer.duration * sampleRate, sampleRate);
          const source = offlineRender.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(offlineRender.destination);
          source.start(0);
          const renderedBuffer = await offlineRender.startRendering();
          const samples = renderedBuffer.getChannelData(0);
          
          // Build WAV file
          const wavBuffer = new ArrayBuffer(44 + samples.length * 2);
          const view = new DataView(wavBuffer);
          const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
          writeStr(0, 'RIFF');
          view.setUint32(4, 36 + samples.length * 2, true);
          writeStr(8, 'WAVE');
          writeStr(12, 'fmt ');
          view.setUint32(16, 16, true);
          view.setUint16(20, 1, true);
          view.setUint16(22, 1, true);
          view.setUint32(24, sampleRate, true);
          view.setUint32(28, sampleRate * 2, true);
          view.setUint16(32, 2, true);
          view.setUint16(34, 16, true);
          writeStr(36, 'data');
          view.setUint32(40, samples.length * 2, true);
          for (let i = 0; i < samples.length; i++) {
            const s = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
          }
          const blob = new Blob([wavBuffer], { type: 'audio/wav' });

          const fileName = `audio_${Date.now()}.wav`;
          // WAV ready for upload

          const { error: uploadError } = await supabase.storage
            .from('audios')
            .upload(fileName, blob, { contentType: 'audio/wav', upsert: true });

          if (uploadError) {
            console.error("Erro upload áudio:", uploadError);
            throw new Error(`Upload failed: ${uploadError.message}`);
          }

          const { data: urlData } = supabase.storage.from('audios').getPublicUrl(fileName);
          const audioUrl = urlData.publicUrl;
          // Audio uploaded, sending to WhatsApp

          const localUrl = URL.createObjectURL(blob);
          // Send URL to Z-API (WhatsApp handles URL-based audio better)
          await callZapiProxy("send-audio", { phone, audio: audioUrl });
          const tempId = `temp_audio_${Date.now()}`;
          lastMsgIdsRef.current.add(tempId);
          setMessages(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] || []), {
            id: tempId, conversation_id: selectedId, sender_type: "atendente" as const,
            message_type: "audio" as MsgType, text: "", status: "sent" as MsgStatus, created_at: new Date().toISOString(),
            media_url: localUrl,
          }] }));
        } catch (err) {
          toast({ title: "Erro ao enviar áudio", description: String(err), variant: "destructive" });
        }
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(t => {
          if (t >= 119) { // 2 min limit
            stopRecording();
            return t;
          }
          return t + 1;
        });
      }, 1000);
    } catch {
      toast({ title: "Erro", description: "Não foi possível acessar o microfone", variant: "destructive" });
    }
  }, [selectedId, uploadToStorage]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setRecordingTime(0);
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      audioChunksRef.current = []; // clear chunks so onstop won't send
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    if (waveformIntervalRef.current) clearInterval(waveformIntervalRef.current);
    setWaveformData(new Array(25).fill(4));
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setRecordingTime(0);
  }, []);

  // Handle paste (Ctrl+V) with files/images
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || !selectedId) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");

        if (isImage) {
          const previewUrl = URL.createObjectURL(file);
          setMediaPendingFile({ file, previewUrl, mediaType: "image" });
        } else if (isVideo) {
          setIsSending(true);
          try {
            const ext = file.name.split('.').pop() || "mp4";
            const fileName = `video_${Date.now()}.${ext}`;
            const publicUrl = await uploadToStorage(file, "videos", fileName);
            await callZapiProxy("send-video", { phone: conversations.find(c => c.id === selectedId)?.phone, video: publicUrl, caption: "" });
            const tempId = `temp_paste_${Date.now()}`;
            lastMsgIdsRef.current.add(tempId);
            setMessages(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] || []), {
              id: tempId, conversation_id: selectedId, sender_type: "atendente" as const,
              message_type: "video" as MsgType, text: "🎬 Vídeo", status: "sent" as MsgStatus,
              created_at: new Date().toISOString(), media_url: publicUrl,
            }] }));
          } catch (err) { console.error("Paste video error:", err); }
          setIsSending(false);
        } else {
          // Document
          setIsSending(true);
          try {
            const ext = file.name.split('.').pop() || "bin";
            const fileName = `doc_${Date.now()}.${ext}`;
            const publicUrl = await uploadToStorage(file, "documents", fileName);
            await callZapiProxy("send-document", { phone: conversations.find(c => c.id === selectedId)?.phone, document: publicUrl, fileName: file.name, extension: ext });
            const tempId = `temp_paste_${Date.now()}`;
            lastMsgIdsRef.current.add(tempId);
            setMessages(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] || []), {
              id: tempId, conversation_id: selectedId, sender_type: "atendente" as const,
              message_type: "document" as MsgType, text: `📄 ${file.name}`, status: "sent" as MsgStatus,
              created_at: new Date().toISOString(), media_url: publicUrl,
            }] }));
          } catch (err) { console.error("Paste doc error:", err); }
          setIsSending(false);
        }
        return; // Handle only the first file
      }
    }
  }, [selectedId, conversations, uploadToStorage]);

  // File/media upload — now uploads to Storage first
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;

    if (fileInputMediaType === "image") {
      const previewUrl = URL.createObjectURL(file);
      setMediaPendingFile({ file, previewUrl, mediaType: "image" });
      setMediaCaption("");
      e.target.value = "";
      setShowMediaMenu(false);
      return;
    }

    const phone = selectedId.replace("wa_", "");
    try {
      const ext = file.name.split('.').pop() || "bin";
      const folder = fileInputMediaType === "video" ? "videos" : "documents";
      const fileName = `${fileInputMediaType}_${Date.now()}.${ext}`;
      const publicUrl = await uploadToStorage(file, folder, fileName);

      if (fileInputMediaType === "video") {
        await callZapiProxy("send-video", { phone, video: publicUrl, caption: "" });
      } else {
        await callZapiProxy("send-document", { phone, document: publicUrl, fileName: file.name, extension: ext });
      }
      const label = fileInputMediaType === "video" ? "🎬 Vídeo" : `📄 ${file.name}`;
      const tempId = `temp_media_${Date.now()}`;
      lastMsgIdsRef.current.add(tempId);
      setMessages(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] || []), {
        id: tempId, conversation_id: selectedId, sender_type: "atendente" as const,
        message_type: fileInputMediaType as MsgType, text: label, status: "sent" as MsgStatus, created_at: new Date().toISOString(),
        media_url: publicUrl,
      }] }));
    } catch (err) {
      toast({ title: "Erro ao enviar mídia", description: String(err), variant: "destructive" });
    }
    e.target.value = "";
    setShowMediaMenu(false);
  }, [selectedId, fileInputMediaType, uploadToStorage]);

  // Send pending image with caption — upload to Storage first
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
        message_type: "image" as MsgType, text: caption || "📷 Imagem", status: "sent" as MsgStatus, created_at: new Date().toISOString(),
        media_url: previewUrl,
      }] }));
    } catch (err) {
      toast({ title: "Erro ao enviar mídia", description: String(err), variant: "destructive" });
    }
    setMediaPendingFile(null);
    setMediaCaption("");
    setIsSending(false);
  }, [mediaPendingFile, mediaCaption, selectedId, uploadToStorage, isSending]);

  const handleTogglePin = useCallback(async (convId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    const newPinned = !conv.is_pinned;
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, is_pinned: newPinned } : c));
    const cleanPhone = (conv.phone || "").replace(/\D/g, "");
    if (cleanPhone) {
      await supabase.from("conversations").update({ is_pinned: newPinned } as any).eq("phone", cleanPhone);
    }
  }, [conversations]);

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    setShowAIPanel(false);
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unread_count: 0 } : c));
    // Persist read status to DB so realtime sync doesn't revert it
    if (id.length > 10) {
      supabase.from("conversations").update({ unread_count: 0 }).eq("id", id).then(() => {});
    }
  };

  const handleClearConversations = useCallback(() => {
    setConversations([]);
    setMessages({});
    setSelectedId(null);
    lastMsgIdsRef.current.clear();
    chatsLoadedRef.current = true;
    clearedAtRef.current = Math.floor(Date.now() / 1000);
    toast({ title: "Conversas limpas", description: "Todas as conversas foram removidas do dashboard." });
    setShowClearConfirm(false);
  }, []);

  const handleEmojiSelect = useCallback((emoji: any) => {
    const sym = emoji.native || emoji.shortcodes || "";
    setInputText(prev => prev + sym);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  }, []);

  const handleStageChange = (convId: string, newStage: Stage) => {
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, stage: newStage } : c));
    toast({ title: "Etapa atualizada", description: `Conversa movida para ${getStageInfo(newStage).label}` });
  };

  const handleExportConversation = useCallback(() => {
    if (!selectedId || !selected) return;
    const msgs = currentMessages;
    if (msgs.length === 0) {
      toast({ title: "Sem mensagens", description: "Esta conversa não possui mensagens para exportar." });
      return;
    }

    const contactName = selectedDisplayName;
    const phone = selected.phone || "";
    const now = new Date();

    let txt = "════════════════════════════════════════\n";
    txt += `EXPORTAÇÃO DE CONVERSA — CRM NATLEVA\n`;
    txt += `════════════════════════════════════════\n`;
    txt += `Contato: ${contactName}\n`;
    txt += `Telefone: ${phone}\n`;
    txt += `Total de mensagens: ${msgs.length}\n`;
    txt += `Período: ${new Date(msgs[0].created_at).toLocaleString("pt-BR")} — ${new Date(msgs[msgs.length - 1].created_at).toLocaleString("pt-BR")}\n`;
    txt += `Exportado em: ${now.toLocaleString("pt-BR")}\n`;
    txt += `════════════════════════════════════════\n\n`;

    let lastDate = "";
    for (const msg of msgs) {
      const msgDate = new Date(msg.created_at);
      const dateStr = msgDate.toLocaleDateString("pt-BR");
      if (dateStr !== lastDate) {
        lastDate = dateStr;
        txt += `\n── ${dateStr} ${"─".repeat(30)}\n\n`;
      }

      const time = msgDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const sender = msg.sender_type === "cliente" ? `📩 ${contactName}` : msg.sender_type === "sistema" ? "🤖 Sistema" : "📤 Consultor";
      const typeLabel = msg.message_type !== "text" ? ` [${msg.message_type}]` : "";
      const mediaNote = msg.media_url ? ` 📎 ${msg.media_url}` : "";

      txt += `[${time}] ${sender}${typeLabel}\n`;
      txt += `${msg.text || "(sem texto)"}${mediaNote}\n\n`;
    }

    txt += `\n════════════════════════════════════════\n`;
    txt += `FIM DA EXPORTAÇÃO\n`;
    txt += `════════════════════════════════════════\n`;

    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = contactName.replace(/[^a-zA-Z0-9À-ÿ\s-]/g, "").replace(/\s+/g, "-").toLowerCase();
    a.download = `conversa-${safeName}-${now.toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Conversa exportada!", description: `${msgs.length} mensagens exportadas com sucesso.` });
  }, [selectedId, selected, currentMessages, selectedDisplayName]);

  const handleAISuggest = () => {
    if (!selectedId) return;
    setShowAIPanel(prev => !prev);
  };

  const handleUseSuggestion = (text: string) => {
    setInputText(text);
    setShowAIPanel(false);
    textareaRef.current?.focus();
  };

  // Load available flows for flow trigger menu
  const loadFlows = useCallback(async () => {
    const { data } = await supabase.from("flows").select("id, name, status").in("status", ["ativo", "publicado", "rascunho"]).order("name");
    setAvailableFlows(data || []);
  }, []);

  const handleTriggerFlow = useCallback(async (flowId: string, flowName: string) => {
    if (!selectedId || !selected) return;
    setShowFlowMenu(false);
    
    // Resolve conversation UUID
    const phone = selectedId.startsWith("wa_") ? selectedId.replace("wa_", "") : selected.phone;
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .or(`phone.eq.${phone},external_conversation_id.eq.wa_${phone}`)
      .maybeSingle();
    
    if (!conv?.id) {
      toast({ title: "Erro", description: "Conversa não encontrada no banco de dados.", variant: "destructive" });
      return;
    }

    try {
      const { data: result, error } = await supabase.functions.invoke("execute-flow", {
        body: {
          conversation_id: conv.id,
          flow_id: flowId,
          trigger_type: "manual",
          trigger_data: { message_text: "manual_trigger", triggered_by: "atendente" },
        },
      });
      if (error) throw error;
      setActiveFlowName(flowName);
      toast({ title: "Fluxo iniciado", description: `"${flowName}" foi ativado para esta conversa.` });
    } catch (err: any) {
      toast({ title: "Erro ao iniciar fluxo", description: err.message, variant: "destructive" });
    }
  }, [selectedId, selected]);

  const totalUnread = conversations.reduce((s, c) => s + c.unread_count, 0);

  // If editing a flow, show full-screen canvas
  if (editingFlow) {
    return (
      <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}>
      <div className="h-full min-h-0">
        <FlowCanvas
          flowId={editingFlow.id}
          flowName={editingFlow.name}
          flowStatus={editingFlow.status}
          onBack={() => setEditingFlow(null)}
          onSimulate={() => { setEditingFlow(null); setActiveSection("simulator"); }}
        />
      </div>
      </Suspense>
    );
  }

  return (
    <div
      ref={livechatContainerRef}
      className={`flex min-h-0 flex-col overflow-hidden bg-background ${isMobile ? "fixed inset-0 z-50" : "h-full"}`}
      style={isMobile ? { height: mobileHeight } : undefined}
    >
      {/* Header - compact, no submenu tabs (now in sidebar) */}
      {isMobile && !(selectedId && activeSection === "inbox") && (
        <div className="border-b border-border bg-card/50 backdrop-blur-sm shrink-0 px-4 py-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => window.history.back()}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-emerald-500" />
            </div>
            <h1 className="text-base font-extrabold tracking-tight">LiveChat</h1>
            {totalUnread > 0 && (
              <Badge className="bg-primary text-primary-foreground font-mono text-xs">{totalUnread}</Badge>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {activeSection === "inbox" && (
          <div className="flex h-full min-h-0">
            {/* ─── Column 1: Conversations List ─── */}
            <div className={`w-full md:w-[320px] lg:w-[360px] border-r border-border flex flex-col bg-card/30 md:shrink-0 ${isMobile && selectedId ? "hidden" : ""}`}>
              <div className="p-3 space-y-2 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar nome ou telefone..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-9 pr-8 h-9 text-sm bg-background"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
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
                        <AlertDialogDescription>
                          Tem certeza que deseja limpar todas as conversas do dashboard? As conversas no WhatsApp não serão apagadas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearConversations} className="bg-destructive text-destructive-foreground">
                          Limpar tudo
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <ScrollArea className="w-full">
                  <div className="flex gap-1">
                    {FILTERS.map(f => (
                      <button
                        key={f.key}
                        onClick={() => setActiveFilter(f.key)}
                        className={`px-2.5 py-1 text-[10px] rounded-full whitespace-nowrap font-medium transition-all ${
                          activeFilter === f.key
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        }`}
                      >
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
                    const displayName = getSafeContactName(conv.contact_name, conv.phone);
                    const contactInitials = getContactInitials(conv.contact_name, conv.phone);
                    const _previewRaw = (conv.last_message_preview || "").replace(/\n/g, " ").trim();
                    const _previewTruncated = _previewRaw.length > 35 ? _previewRaw.slice(0, 35) + "…" : _previewRaw;
                    return (
                      <motion.div
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv.id)}
                        className={`group p-3 rounded-lg cursor-pointer mb-1 transition-all border ${
                          isSelected
                            ? "bg-primary/5 border-primary/20"
                            : "border-transparent hover:bg-secondary/50"
                        }`}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative shrink-0">
                            {profilePicsRef.current.get(conv.id) ? (
                              <img
                                src={profilePicsRef.current.get(conv.id)}
                                alt=""
                                className="h-10 w-10 rounded-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                              />
                            ) : null}
                            <div className={`h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-foreground ${profilePicsRef.current.get(conv.id) ? 'hidden' : ''}`}>
                              {contactInitials}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 pr-1">
                            {/* Row 1: Name + Time — WhatsApp style using CSS Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '4px' }}>
                              <span className={`text-sm truncate ${conv.unread_count > 0 ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
                                {displayName}
                              </span>
                              <span className="text-[11px] text-foreground whitespace-nowrap">
                                {(() => {
                                  try {
                                    const raw = conv.last_message_at;
                                    if (!raw) return "–";
                                    let iso = String(raw);
                                    if (iso.includes(" ") && !iso.includes("T")) iso = iso.replace(" ", "T");
                                    if (/[+-]\d{2}$/.test(iso)) iso += ":00";
                                    const d = new Date(iso);
                                    if (isNaN(d.getTime()) || d.getFullYear() < 2000) return "–";
                                    const now = new Date();
                                    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                    const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                                    const diffDays = Math.round((todayStart.getTime() - msgDay.getTime()) / 86400000);
                                    if (diffDays === 0) return d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
                                    if (diffDays === 1) return "Ontem";
                                    if (diffDays < 7) return ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][d.getDay()];
                                    return d.getDate().toString().padStart(2, "0") + "/" + (d.getMonth() + 1).toString().padStart(2, "0");
                                  } catch { return "–"; }
                                })()}
                              </span>
                            </div>
                            {/* Row 2: Preview + badges */}
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className={`text-xs truncate flex-1 min-w-0 ${conv.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                                {(() => {
                                  if (!_previewRaw) return <span className="text-muted-foreground/50 italic">Sem mensagens</span>;
                                  const isAudio = _previewRaw === "📎 audio" || _previewRaw.toLowerCase().includes("mensagem de voz") || _previewRaw.toLowerCase() === "audio" || _previewRaw === "🎤 Áudio";
                                  const isImage = _previewRaw === "📎 image" || _previewRaw.toLowerCase().includes("📷");
                                  const isVideo = _previewRaw === "📎 video";
                                  const isDocument = _previewRaw === "📎 document";
                                  if (isAudio) return <><Mic className="h-3 w-3 text-[#25D366] shrink-0" /> <span>Mensagem de voz</span></>;
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
                            {/* Row 3: Stage info */}
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <div className={`h-1.5 w-1.5 rounded-full ${stageInfo.color}`} />
                              <span className="text-[9px] text-muted-foreground">{stageInfo.label}</span>
                              {conv.vehicle_interest && (
                                <>
                                  <span className="text-[9px] text-muted-foreground/40">·</span>
                                  <span className="text-[9px] text-primary font-medium truncate">{conv.vehicle_interest}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  {filteredConversations.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                      <MessageSquare className="h-10 w-10 text-muted-foreground/20 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {searchQuery ? "Tente buscar por outro termo" : "As mensagens recebidas aparecerão aqui"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ─── Column 2: Chat ─── */}
            <div className={`flex-1 min-h-0 flex flex-col min-w-0 relative overflow-hidden ${isMobile && !selectedId ? "hidden" : ""}`}>
              {selected ? (
                <>
                  {/* Chat header */}
                  <div className="flex items-center justify-between px-2 md:px-4 py-2 md:py-2.5 border-b border-border bg-card/50 shrink-0">
                    <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                      {/* Back button (mobile) */}
                      {isMobile && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => setSelectedId(null)}
                        >
                          <ArrowLeft className="h-5 w-5" />
                        </Button>
                      )}
                      <div
                        className="flex items-center gap-2 md:gap-3 cursor-pointer hover:opacity-80 transition-opacity min-w-0 flex-1"
                        onClick={() => setShowContactProfile(prev => !prev)}
                      >
                        {profilePicsRef.current.get(selected.id) ? (
                          <img
                            src={profilePicsRef.current.get(selected.id)}
                            alt=""
                            className="h-8 w-8 md:h-9 md:w-9 rounded-full object-cover shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                          />
                        ) : null}
                        <div className={`h-8 w-8 md:h-9 md:w-9 rounded-full bg-secondary flex items-center justify-center text-xs md:text-sm font-bold shrink-0 ${profilePicsRef.current.get(selected.id) ? 'hidden' : ''}`}>
                          {selectedInitials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold truncate">{selectedDisplayName}</span>
                            {selected.is_vip && <Badge className="bg-amber-500/10 text-amber-500 text-[8px] px-1.5 py-0 shrink-0">VIP</Badge>}
                          </div>
                          {presenceLabel ? (
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 italic truncate animate-pulse">
                              {presenceLabel}
                            </p>
                          ) : (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {formatPhoneDisplay(selected.phone)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                      {activeFlowName && !isMobile && (
                        <div className="flex items-center gap-1.5 mr-2">
                          <Badge variant="outline" className="text-[9px] font-bold gap-1 border-primary/30 text-primary">
                            <Workflow className="h-3 w-3" />
                            {activeFlowName}
                          </Badge>
                        </div>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleExportConversation()}>
                            <Download className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Exportar conversa (.txt)</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSummaryDialog(true)}>
                            <Brain className="h-4 w-4 text-primary" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Resumir conversa com IA</TooltipContent>
                      </Tooltip>
                       <NathOpinionButton
                        messages={currentMessages.map(m => ({
                          role: m.sender_type === "atendente" ? "agent" : "user",
                          content: m.text || "",
                          agentName: m.sender_type === "atendente" ? "Atendente" : selected?.contact_name || "Lead",
                          timestamp: m.created_at,
                          mediaUrl: m.media_url,
                          messageType: m.message_type,
                        }))}
                        context={`Conversa real WhatsApp · Cliente: ${selected?.contact_name || "Desconhecido"} · Telefone: ${selected?.phone} · Etapa: ${selected?.stage} · Tags: ${selected?.tags?.join(", ") || "nenhuma"}`}
                        variant="inline"
                      />
                      <Select value={selected.stage} onValueChange={s => handleStageChange(selected.id, s as Stage)}>
                        <SelectTrigger className="h-7 text-[10px] w-[100px] md:w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGES.map(s => (
                            <SelectItem key={s.key} value={s.key} className="text-xs">
                              <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${s.color}`} />
                                {s.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Z-API offline gap warning */}
                  {!waConnection.isConnected && waConnection.lastEvent === "disconnected" && (
                    <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>WhatsApp offline · mensagens novas podem não estar aparecendo aqui. Cheque no celular pra confirmar.</span>
                    </div>
                  )}

                  {/* Messages */}
                  <div className="relative flex-1 min-h-0">
                  <ScrollArea ref={scrollAreaRef} className="h-full overflow-hidden px-4">
                    <div className="py-4 space-y-3">
                      {currentMessages.map((msg, idx) => (
                        <Fragment key={msg.id}>
                          {shouldShowDateSeparator(currentMessages, idx) && (
                            <div className="flex justify-center my-4">
                              <span className="bg-secondary/80 text-muted-foreground text-[10px] font-medium px-3 py-1.5 rounded-full">
                                {formatDateSeparator(msg.created_at)}
                              </span>
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
                              <span className="text-[9px] text-muted-foreground">
                                {formatMsgTime(msg.created_at)}
                              </span>
                            </div>
                          ) : (
                            <div className="group relative max-w-[86%] sm:max-w-[80%] xl:max-w-[70%]">
                              <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 z-10 ${
                                msg.sender_type === "atendente" ? "-left-[72px]" : "-right-[72px]"
                              }`}>
                                <button
                                  onClick={() => setReplyingTo(msg)}
                                  className="h-7 w-7 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center"
                                  title="Responder"
                                >
                                  <ArrowRight className={`h-3.5 w-3.5 text-muted-foreground ${msg.sender_type === "atendente" ? "rotate-180" : ""}`} />
                                </button>
                                {msg.sender_type === "atendente" && msg.message_type === "text" && (() => {
                                  const msgTime = new Date(msg.created_at).getTime();
                                  const oneHourAgo = Date.now() - 60 * 60 * 1000;
                                  return msgTime > oneHourAgo;
                                })() && (
                                  <button
                                    onClick={() => handleStartEdit(msg)}
                                    className="h-7 w-7 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center"
                                    title="Editar"
                                  >
                                    <Pencil className="h-3 w-3 text-muted-foreground" />
                                  </button>
                                )}
                              </div>
                              <div className={`rounded-2xl px-4 py-2.5 ${
                                msg.sender_type === "atendente"
                                  ? "bg-primary text-primary-foreground rounded-br-md"
                                  : "bg-secondary text-secondary-foreground rounded-bl-md"
                              }`}>
                              {/* Quoted message preview */}
                              {msg.quoted_msg && (
                                <div className={`rounded-lg px-3 py-1.5 mb-2 border-l-2 ${
                                  msg.sender_type === "atendente"
                                    ? "bg-primary-foreground/10 border-primary-foreground/40"
                                    : "bg-foreground/5 border-primary/40"
                                }`}>
                                  <p className={`text-[10px] font-bold ${msg.sender_type === "atendente" ? "text-primary-foreground/70" : "text-primary"}`}>
                                    {msg.quoted_msg.sender_type === "atendente" ? "Você" : selected?.contact_name || "Lead"}
                                  </p>
                                  <p className={`text-xs truncate ${msg.sender_type === "atendente" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                    {msg.quoted_msg.text}
                                  </p>
                                </div>
                              )}
                              {/* Audio message */}
                              {msg.message_type === "audio" && (
                                <div className="min-w-[220px]">
                                  {msg.media_url ? (
                                    <>
                                      <AudioWaveformPlayer
                                        src={msg.media_url}
                                        isOutgoing={msg.sender_type === "atendente"}
                                        msgId={msg.id}
                                      />
                                      <div className="flex items-center gap-1 mt-1">
                                        <a
                                          href={msg.media_url}
                                          download={`audio_${msg.id}.ogg`}
                                          className="text-[9px] opacity-60 hover:opacity-100 flex items-center gap-0.5"
                                          onClick={e => e.stopPropagation()}
                                        >
                                          <File className="h-2.5 w-2.5" /> Baixar
                                        </a>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex items-center gap-2 text-xs opacity-60 py-2">
                                      <Mic className="h-4 w-4" />
                                      <span>🎵 Áudio indisponível</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              {/* Image message */}
                              {msg.message_type === "image" && (() => {
                                const imgSrc = msg.media_url || (msg.text && msg.text.startsWith("/9j/") ? `data:image/jpeg;base64,${msg.text}` : null);
                                return (
                                  <div>
                                    {imgSrc ? (
                                      <>
                                        <img
                                          src={imgSrc}
                                          alt="Imagem"
                                          className="rounded-lg w-full max-w-[220px] sm:max-w-[280px] lg:max-w-[340px] max-h-[320px] object-cover cursor-pointer mb-1"
                                          onClick={() => setLightboxUrl(imgSrc)}
                                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                        {msg.media_url && (
                                          <div className="flex items-center gap-2 mt-1">
                                            <a
                                              href={msg.media_url}
                                              download={`imagem_${msg.id}.jpg`}
                                              className="text-[9px] opacity-60 hover:opacity-100 flex items-center gap-0.5"
                                              onClick={e => e.stopPropagation()}
                                            >
                                              <File className="h-2.5 w-2.5" /> Baixar
                                            </a>
                                          </div>
                                        )}
                                        {!msg.media_url && <p className="text-[9px] opacity-40 mt-0.5">miniatura</p>}
                                      </>
                                    ) : (
                                      <div className="flex items-center gap-2 text-xs opacity-60 py-4 px-2">
                                        <Image className="h-4 w-4" />
                                        <span>📷 Imagem</span>
                                      </div>
                                    )}
                                    {msg.text && !msg.text.startsWith("/9j/") && <p className="text-sm leading-relaxed mt-1">{msg.text}</p>}
                                  </div>
                                );
                              })()}
                              {/* Video message */}
                              {msg.message_type === "video" && (
                                <div>
                                  {msg.media_url ? (
                                    <>
                                      <video controls className="rounded-lg w-full max-w-[220px] sm:max-w-[280px] lg:max-w-[340px] max-h-[320px] mb-1">
                                        <source src={msg.media_url} />
                                      </video>
                                      <div className="flex items-center gap-2 mt-1">
                                        <a
                                          href={msg.media_url}
                                          download={`video_${msg.id}.mp4`}
                                          className="text-[9px] opacity-60 hover:opacity-100 flex items-center gap-0.5"
                                          onClick={e => e.stopPropagation()}
                                        >
                                          <File className="h-2.5 w-2.5" /> Baixar
                                        </a>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex items-center gap-2 text-xs opacity-60 py-4 px-2">
                                      <Video className="h-4 w-4" />
                                      <span>🎬 Vídeo indisponível</span>
                                    </div>
                                  )}
                                  {msg.text && <p className="text-sm leading-relaxed mt-1">{msg.text}</p>}
                                </div>
                              )}
                              {/* Document message */}
                              {msg.message_type === "document" && (
                                <div className="flex items-center gap-2 py-1 min-w-[180px]">
                                  <FileText className="h-5 w-5 shrink-0" />
                                  {msg.media_url ? (
                                    <div className="flex flex-col gap-1">
                                      <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="text-sm underline hover:opacity-80">
                                        {msg.text?.replace(/^📄\s*/, '') || "Documento"}
                                      </a>
                                      <a
                                        href={msg.media_url}
                                        download
                                        className="text-[9px] opacity-60 hover:opacity-100 flex items-center gap-0.5"
                                        onClick={e => e.stopPropagation()}
                                      >
                                        <File className="h-2.5 w-2.5" /> Baixar
                                      </a>
                                    </div>
                                  ) : (
                                    <span className="text-sm opacity-70">{msg.text?.replace(/^\[MÍDIA: document\]$/, '📄 Documento') || "📄 Documento"}</span>
                                  )}
                                </div>
                              )}
                              {/* Text message */}
                              {msg.message_type === "text" && (
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                              )}
                              <div className="flex items-center justify-end gap-1 mt-1">
                                {(msg as any).edited && (
                                  <span className="text-[8px] opacity-50 italic">editada</span>
                                )}
                                <span className="text-[9px] opacity-60">
                                  {formatMsgTime(msg.created_at)}
                                </span>
                                {msg.sender_type === "atendente" && getStatusIcon(msg.status)}
                              </div>
                              </div>
                            </div>
                          )}
                          </div>
                        </Fragment>
                      ))}
                      {/* AI Thinking indicator */}
                      {flowRunning && (
                        <div className="flex justify-center">
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2.5 bg-muted/50 border border-border rounded-xl px-4 py-2.5"
                          >
                            <div className="flex items-center gap-1">
                              <Bot className="h-3.5 w-3.5 text-primary" />
                              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">IA</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <motion.div
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                                className="h-1.5 w-1.5 rounded-full bg-primary"
                              />
                              <motion.div
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                                className="h-1.5 w-1.5 rounded-full bg-primary"
                              />
                              <motion.div
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                                className="h-1.5 w-1.5 rounded-full bg-primary"
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground">Pensando...</span>
                          </motion.div>
                        </div>
                      )}
                      {activePresenceStatus && (
                        <TypingIndicator status={activePresenceStatus} />
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Botão flutuante: scroll para o fim */}
                  {isScrolledUp && (
                    <button
                      type="button"
                      onClick={() => {
                        setUnreadDuringScroll(0);
                        scrollToBottom("smooth");
                      }}
                      className="absolute bottom-4 right-4 z-20 h-10 w-10 rounded-full bg-card border border-border shadow-lg hover:bg-accent flex items-center justify-center transition-all animate-fade-in"
                      aria-label="Ir para o final da conversa"
                    >
                      <ChevronDown className="h-5 w-5 text-foreground" />
                      {unreadDuringScroll > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                          {unreadDuringScroll > 99 ? "99+" : unreadDuringScroll}
                        </span>
                      )}
                    </button>
                  )}
                  </div>

                  {/* Media pending preview */}
                  {mediaPendingFile && (
                    <div className="px-4 py-3 border-t border-border bg-card/50 space-y-2">
                      <div className="flex items-center gap-3">
                        <img loading="lazy" decoding="async" src={mediaPendingFile.previewUrl} alt="Preview" className="h-16 w-16 rounded-lg object-cover" />
                        <div className="flex-1">
                          <Input
                            placeholder="Legenda (opcional)..."
                            value={mediaCaption}
                            onChange={e => setMediaCaption(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <Button size="sm" onClick={handleSendPendingMedia} disabled={isSending} className="text-xs gap-1">
                          {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Enviar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setMediaPendingFile(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Reply preview */}
                  {replyingTo && (
                    <div className="px-4 py-2 border-t border-border bg-card/50 flex items-center gap-3">
                      <div className="flex-1 border-l-2 border-primary pl-3">
                        <p className="text-[10px] font-bold text-primary">
                          {replyingTo.sender_type === "atendente" ? "Você" : selected?.contact_name || "Lead"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{replyingTo.text || "📎 Mídia"}</p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setReplyingTo(null)}>
                        <X className="h-3 w-3" />
                      </Button>
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
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingMsg(null); setInputText(""); }}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {/* AI suggestion panel */}
                  <AnimatePresence>
                    {showAIPanel && selectedId && (
                      <AISuggestionPanel
                        open={showAIPanel}
                        onClose={() => setShowAIPanel(false)}
                        onUseSuggestion={handleUseSuggestion}
                        conversationHistory={(messages[selectedId] || []).map(m => ({ text: m.text || "", sender_type: m.sender_type, message_type: m.message_type }))}
                        contactName={selected?.contact_name || "Cliente"}
                        stage={selected?.stage || "novo_lead"}
                      />
                    )}
                  </AnimatePresence>

                  {/* AI Summary Dialog */}
                  {selectedId && selected && (
                    <ConversationSummaryDialog
                      open={showSummaryDialog}
                      onClose={() => setShowSummaryDialog(false)}
                      conversationHistory={(messages[selectedId] || []).map(m => ({ text: m.text || "", sender_type: m.sender_type, message_type: m.message_type }))}
                      contactName={selected.contact_name || "Cliente"}
                      stage={selected.stage || "novo_lead"}
                    />
                  )}

                  {/* Buying Moment Alert */}
                  {selectedId && selected && (
                    <BuyingMomentAlert
                      messages={(messages[selectedId] || []).map(m => ({ text: m.text || "", sender_type: m.sender_type, created_at: m.created_at }))}
                      onGenerateProposal={() => setShowContactProfile(true)}
                      onDismiss={() => {}}
                    />
                  )}

                  {/* Send Location Dialog */}
                  <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-rose-500" />
                          Enviar localização
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Nome do local</label>
                          <Input
                            value={locationInput.name}
                            onChange={(e) => setLocationInput(p => ({ ...p, name: e.target.value }))}
                            placeholder="Ex: Hotel Copacabana Palace"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Endereço (opcional)</label>
                          <Input
                            value={locationInput.address}
                            onChange={(e) => setLocationInput(p => ({ ...p, address: e.target.value }))}
                            placeholder="Av. Atlântica, 1702"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Latitude</label>
                            <Input
                              value={locationInput.lat}
                              onChange={(e) => setLocationInput(p => ({ ...p, lat: e.target.value }))}
                              placeholder="-22.9714"
                              inputMode="decimal"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Longitude</label>
                            <Input
                              value={locationInput.lng}
                              onChange={(e) => setLocationInput(p => ({ ...p, lng: e.target.value }))}
                              placeholder="-43.1825"
                              inputMode="decimal"
                            />
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Dica · pegue lat/lng no Google Maps · clique direito no local · "Copiar coordenadas".
                        </p>
                        <div className="flex justify-end gap-2 pt-2">
                          <Button variant="ghost" size="sm" onClick={() => setShowLocationDialog(false)}>Cancelar</Button>
                          <Button size="sm" onClick={handleSendLocation} className="bg-rose-500 hover:bg-rose-600 text-white">
                            <Send className="h-3.5 w-3.5 mr-1.5" /> Enviar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

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
                      /* ── Recording bar ── */
                      <div className="flex items-center gap-3">
                        {/* Cancel */}
                        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-destructive hover:text-destructive" onClick={cancelRecording}>
                          <Trash2 className="h-5 w-5" />
                        </Button>

                        {/* Red dot + timer */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
                          <span className="text-xs text-destructive font-mono font-bold min-w-[32px]">
                            {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")}
                          </span>
                        </div>

                        {/* Waveform bars */}
                        <div className="flex-1 flex items-center justify-center gap-[2px] h-[32px]">
                          {waveformData.map((h, i) => (
                            <div
                              key={i}
                              className="rounded-full"
                              style={{
                                width: 3,
                                height: h,
                                backgroundColor: "#25D366",
                                transition: "height 0.1s ease",
                              }}
                            />
                          ))}
                        </div>

                        {/* Progress bar */}
                        <div className="w-16 h-1 bg-secondary rounded-full overflow-hidden shrink-0">
                          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, (recordingTime / 120) * 100)}%` }} />
                        </div>

                        {/* Send */}
                        <Button size="icon" className="h-9 w-9 shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white" onClick={stopRecording}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      /* ── Normal input bar ── */
                      <div className="flex items-end gap-1 md:gap-2">
                        {/* Emoji - hidden on mobile to save space */}
                        {!isMobile && (
                          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                                <Smile className="h-5 w-5 text-muted-foreground" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" side="top" align="start">
                              <LazyEmojiPicker onEmojiSelect={handleEmojiSelect} theme="dark" locale="pt" previewPosition="none" skinTonePosition="none" />
                            </PopoverContent>
                          </Popover>
                        )}

                        {/* Mobile: Plus menu with all options */}
                        {isMobile ? (
                          <Popover open={showMobilePlusMenu} onOpenChange={setShowMobilePlusMenu}>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                                <Plus className="h-5 w-5 text-muted-foreground" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-1" side="top" align="start">
                              <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Anexos</p>
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md hover:bg-secondary transition-colors"
                                onClick={() => { setFileInputAccept("image/*"); setFileInputMediaType("image"); fileInputRef.current?.click(); setShowMobilePlusMenu(false); }}
                              >
                                <Image className="h-4 w-4 text-blue-400" /> Imagem
                              </button>
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md hover:bg-secondary transition-colors"
                                onClick={() => { setFileInputAccept("video/*"); setFileInputMediaType("video"); fileInputRef.current?.click(); setShowMobilePlusMenu(false); }}
                              >
                                <Video className="h-4 w-4 text-purple-400" /> Vídeo
                              </button>
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md hover:bg-secondary transition-colors"
                                onClick={() => { setFileInputAccept("*/*"); setFileInputMediaType("document"); fileInputRef.current?.click(); setShowMobilePlusMenu(false); }}
                              >
                                <File className="h-4 w-4 text-amber-400" /> Documento
                              </button>
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md hover:bg-secondary transition-colors"
                                onClick={() => { setShowLocationDialog(true); setShowMobilePlusMenu(false); }}
                              >
                                <MapPin className="h-4 w-4 text-rose-400" /> Localização
                              </button>
                              <Separator className="my-1" />
                              <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ferramentas</p>
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md hover:bg-secondary transition-colors"
                                onClick={() => { handleAISuggest(); setShowMobilePlusMenu(false); }}
                              >
                                <Sparkles className="h-4 w-4 text-primary" /> Sugestão IA
                              </button>
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md hover:bg-secondary transition-colors"
                                onClick={() => { loadFlows(); setShowFlowMenu(true); setShowMobilePlusMenu(false); }}
                              >
                                <Workflow className="h-4 w-4 text-muted-foreground" /> Iniciar Fluxo
                              </button>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          /* Desktop: Media menu */
                          <Popover open={showMediaMenu} onOpenChange={setShowMediaMenu}>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                                <Paperclip className="h-5 w-5 text-muted-foreground" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-40 p-1" side="top" align="start">
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md hover:bg-secondary transition-colors"
                                onClick={() => { setFileInputAccept("image/*"); setFileInputMediaType("image"); fileInputRef.current?.click(); }}
                              >
                                <Image className="h-4 w-4 text-blue-400" /> Imagem
                              </button>
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md hover:bg-secondary transition-colors"
                                onClick={() => { setFileInputAccept("video/*"); setFileInputMediaType("video"); fileInputRef.current?.click(); }}
                              >
                                <Video className="h-4 w-4 text-purple-400" /> Vídeo
                              </button>
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md hover:bg-secondary transition-colors"
                                onClick={() => { setFileInputAccept("*/*"); setFileInputMediaType("document"); fileInputRef.current?.click(); }}
                              >
                                <File className="h-4 w-4 text-amber-400" /> Documento
                              </button>
                              <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md hover:bg-secondary transition-colors"
                                onClick={() => { setShowLocationDialog(true); setShowMediaMenu(false); }}
                              >
                                <MapPin className="h-4 w-4 text-rose-400" /> Localização
                              </button>
                            </PopoverContent>
                          </Popover>
                        )}
                        <input ref={fileInputRef} type="file" accept={fileInputAccept} onChange={handleFileSelect} className="hidden" />

                        {/* Flow trigger menu - hidden on mobile */}
                        {!isMobile && (
                          <Popover open={showFlowMenu} onOpenChange={(open) => { setShowFlowMenu(open); if (open) loadFlows(); }}>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                                <Workflow className="h-5 w-5 text-muted-foreground" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-52 p-1" side="top" align="start">
                              <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Iniciar Fluxo</p>
                              {availableFlows.length === 0 ? (
                                <p className="px-3 py-2 text-xs text-muted-foreground">Nenhum fluxo publicado</p>
                              ) : (
                                availableFlows.map(f => (
                                  <button
                                    key={f.id}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md hover:bg-secondary transition-colors"
                                    onClick={() => handleTriggerFlow(f.id, f.name)}
                                  >
                                    <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
                                    <span className="truncate">{f.name}</span>
                                  </button>
                                ))
                              )}
                            </PopoverContent>
                          </Popover>
                        )}

                        {/* Text input */}
                        <div className="flex-1">
                          <Textarea
                            ref={textareaRef}
                            value={inputText}
                            onChange={e => {
                              setInputText(e.target.value);
                              // Auto-grow textarea up to 5 lines
                              const ta = e.target;
                              ta.style.height = "auto";
                              const lineHeight = 24; // ~1.5rem per line
                              const maxHeight = lineHeight * 5; // 5 lines
                              ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`;
                            }}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            placeholder="Digite sua mensagem..."
                            className="min-h-[40px] max-h-[120px] resize-none text-base overflow-y-auto"
                            style={{ height: "40px" }}
                            rows={1}
                          />
                        </div>

                        {/* AI Suggest - hidden on mobile */}
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

                        {/* AI Corrector - shows on all devices when text is typed */}
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={startRecording}
                          >
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
                    contact={{
                      ...selected,
                      created_at: selected.last_message_at,
                    }}
                    profilePic={profilePicsRef.current.get(selected.id)}
                    onClose={() => setShowContactProfile(false)}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}>
        {activeSection === "flowbuilder" && (
          <FlowListPage onOpenFlow={(flow) => setEditingFlow(flow)} />
        )}

        {activeSection === "integrations" && <LiveChatIntegrations />}
        {activeSection === "simulator" && <LiveChatSimulator />}
        {activeSection === "logs" && <LiveChatLogs />}
        </Suspense>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
          <DialogContent className="max-w-3xl p-2">
            <DialogTitle className="sr-only">Visualizar imagem em tamanho ampliado</DialogTitle>
            <img loading="lazy" decoding="async" src={lightboxUrl} alt="Imagem" className="w-full rounded-lg" />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
