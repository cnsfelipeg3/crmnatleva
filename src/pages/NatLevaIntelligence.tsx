import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Brain, Send, Loader2, RefreshCw, MessageCircle, Lightbulb,
  Plus, Trash2, Upload, FileText, Settings2, Save, BookOpen,
  History, Sparkles, AlertTriangle, Target, DollarSign, Users,
  TrendingUp, Shield, Zap, ChevronRight, Mic, MicOff, Paperclip, X,
  Image, FileSpreadsheet, Link2, Download, ImagePlus, FileDown, Table,
  Volume2, VolumeX, Radio, Cpu, Globe, MapPin, LocateFixed,
} from "lucide-react";
import { toast } from "sonner";
import { exportChatAsPDF, exportChatAsXLSX, exportTableFromContent } from "@/lib/chatExport";

type Msg = { role: "user" | "assistant"; content: string; attachments?: AttachmentInfo[]; images?: GeneratedImage[]; route?: RouteInfo };
type AttachmentInfo = { name: string; type: string; url?: string; content?: string };
type GeneratedImage = { type: string; image_url: { url: string } };
type RouteInfo = { model: string; label: string; reason: string };
type Conversation = {
  id: string;
  conversation_id: string;
  title: string;
  messages: Msg[];
  created_at: string;
  updated_at: string;
};
type KBItem = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_name: string | null;
  file_url: string | null;
  content_text: string | null;
  is_active: boolean;
  created_at: string;
};

const SUGGESTIONS = [
  { icon: Target, text: "Monte um plano estratégico de 90 dias para crescimento" },
  { icon: AlertTriangle, text: "Qual é meu maior risco operacional e financeiro hoje?" },
  { icon: DollarSign, text: "Onde estou perdendo margem e como recuperar?" },
  { icon: Users, text: "Crie um plano de desenvolvimento para cada membro da equipe" },
  { icon: TrendingUp, text: "Analise meu fluxo de caixa e sugira otimizações" },
  { icon: Shield, text: "Quais clientes VIP estão em risco de churn e o que fazer?" },
  { icon: Sparkles, text: "Gere uma imagem de um banner promocional da NatLeva para Instagram" },
  { icon: Globe, text: "Pesquise tendências de turismo e notícias do setor aéreo hoje" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = [
  "image/png", "image/jpeg", "image/webp", "image/gif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "text/plain",
];

// ── TTS Engine ──
function speakText(text: string, onEnd?: () => void) {
  if (!("speechSynthesis" in window)) {
    toast.error("Seu navegador não suporta síntese de voz.");
    return;
  }
  window.speechSynthesis.cancel();
  // Strip markdown
  const clean = text
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, m => m.replace(/`/g, ""))
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-*]\s/gm, "")
    .replace(/\|[^|]*\|/g, "")
    .replace(/═+/g, "")
    .slice(0, 3000);

  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = "pt-BR";
  utterance.rate = 1.05;
  utterance.pitch = 1;
  // Try to find a good Portuguese voice
  const voices = window.speechSynthesis.getVoices();
  const ptVoice = voices.find(v => v.lang.startsWith("pt") && v.name.includes("Google")) ||
    voices.find(v => v.lang.startsWith("pt"));
  if (ptVoice) utterance.voice = ptVoice;
  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

export default function NatLevaIntelligence() {
  const { user } = useAuth();
  const navigateTo = useNavigate();
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [knowledgeBase, setKnowledgeBase] = useState<KBItem[]>([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [configSaving, setConfigSaving] = useState(false);
  const [showNewKB, setShowNewKB] = useState(false);
  const [newKB, setNewKB] = useState({ title: "", description: "", category: "geral", content_text: "" });
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // File attachments state
  const [pendingAttachments, setPendingAttachments] = useState<AttachmentInfo[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // TTS state
  const [voiceMode, setVoiceMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Orchestrator state
  const [currentRoute, setCurrentRoute] = useState<RouteInfo | null>(null);

  // Geolocation state
  const [userLocation, setUserLocation] = useState<{ city: string; state?: string; lat: number; lon: number } | null>(null);
  const [geoConsent, setGeoConsent] = useState<"pending" | "granted" | "denied" | "dismissed">(
    () => (localStorage.getItem("natleva_geo_consent") as any) || "pending"
  );
  const [showGeoDialog, setShowGeoDialog] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    supabase.from("ai_chat_history")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50)
      .then(({ data }) => { if (data) setConversations(data as any); });
  }, [user]);

  // Load knowledge base
  useEffect(() => {
    supabase.from("ai_knowledge_base")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setKnowledgeBase(data as any); });
  }, []);

  // Load config
  useEffect(() => {
    supabase.from("ai_config")
      .select("config_key, config_value")
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((d: any) => { map[d.config_key] = d.config_value; });
          setConfigValues(map);
        }
      });
  }, []);

  // Load voices
  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  // Show geo consent dialog on first visit (after a brief delay)
  useEffect(() => {
    if (geoConsent === "pending" && messages.length === 0) {
      const timer = setTimeout(() => setShowGeoDialog(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [geoConsent, messages.length]);

  // If consent was previously granted, fetch location on mount
  useEffect(() => {
    if (geoConsent === "granted" && !userLocation) {
      fetchGeolocation();
    }
  }, [geoConsent]);

  const fetchGeolocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada neste navegador.");
      return;
    }
    setGeoLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: false });
      });
      const { latitude, longitude } = position.coords;
      // Reverse geocode using free Nominatim API
      const geoResp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=pt-BR`,
        { headers: { "User-Agent": "NatLeva-CRM/1.0" } }
      );
      if (geoResp.ok) {
        const geoData = await geoResp.json();
        const city = geoData.address?.city || geoData.address?.town || geoData.address?.municipality || geoData.address?.village || "Desconhecida";
        const state = geoData.address?.state || undefined;
        setUserLocation({ city, state, lat: latitude, lon: longitude });
        toast.success(`📍 Localização detectada: ${city}${state ? `, ${state}` : ""}`);

        // Save to database
        if (user) {
          supabase.from("user_locations").upsert({
            user_id: user.id,
            city,
            state: state || null,
            country: geoData.address?.country || "Brasil",
            lat: latitude,
            lon: longitude,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" }).then(({ error }) => {
            if (error) console.error("Error saving location:", error);
          });
        }
      } else {
        setUserLocation({ city: "Desconhecida", lat: latitude, lon: longitude });
      }
    } catch (err: any) {
      console.error("Geolocation error:", err);
      if (err?.code === 1) {
        toast.error("Permissão de localização negada no navegador.");
        setGeoConsent("denied");
        localStorage.setItem("natleva_geo_consent", "denied");
      } else {
        toast.error("Não foi possível obter sua localização.");
      }
    }
    setGeoLoading(false);
  }, []);

  const handleGeoConsent = (choice: "granted" | "denied" | "dismissed") => {
    setShowGeoDialog(false);
    if (choice === "dismissed") return; // ask later
    setGeoConsent(choice);
    localStorage.setItem("natleva_geo_consent", choice);
    if (choice === "granted") fetchGeolocation();
  };

  // ── Speech Recognition ──
  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = "";
    let interimTranscript = "";

    recognition.onresult = (event: any) => {
      finalTranscript = "";
      interimTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setInput(prev => {
        const base = prev.replace(/\s*🎙️.*$/, "");
        const prefix = base ? base + " " : "";
        if (interimTranscript) {
          return prefix + finalTranscript + " 🎙️" + interimTranscript;
        }
        return prefix + finalTranscript;
      });
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        toast.error("Permissão de microfone negada. Permita o acesso ao microfone.");
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInput(prev => prev.replace(/\s*🎙️.*$/, ""));
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    toast.info("🎙️ Gravando... Fale agora!");
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  // ── File Upload ──
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingFiles(true);
    const newAttachments: AttachmentInfo[] = [];

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} excede 10MB`);
        continue;
      }

      try {
        if (file.type.startsWith("image/")) {
          const base64 = await fileToBase64(file);
          newAttachments.push({ name: file.name, type: file.type, content: base64 });
        } else if (file.type === "text/csv" || file.type === "text/plain") {
          const text = await file.text();
          newAttachments.push({ name: file.name, type: file.type, content: text.slice(0, 50000) });
        } else {
          const filePath = `chat-uploads/${user?.id}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage.from("ai-knowledge-base").upload(filePath, file);
          if (uploadError) { toast.error(`Erro ao enviar ${file.name}`); continue; }
          const { data: urlData } = supabase.storage.from("ai-knowledge-base").getPublicUrl(filePath);
          newAttachments.push({ name: file.name, type: file.type, url: urlData.publicUrl });
        }
      } catch (err) {
        console.error("File upload error:", err);
        toast.error(`Erro ao processar ${file.name}`);
      }
    }

    setPendingAttachments(prev => [...prev, ...newAttachments]);
    setUploadingFiles(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [user]);

  const removeAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // ── Download generated image ──
  const downloadImage = (dataUrl: string, name?: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = name || `natleva-imagem-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const saveConversation = useCallback(async (msgs: Msg[], convId?: string) => {
    if (!user) return;
    const title = msgs.find(m => m.role === "user")?.content.slice(0, 80) || "Nova conversa";
    if (convId) {
      await supabase.from("ai_chat_history")
        .update({ messages: msgs as any, title, updated_at: new Date().toISOString() })
        .eq("conversation_id", convId);
    } else {
      const newId = crypto.randomUUID();
      setCurrentConvId(newId);
      await supabase.from("ai_chat_history").insert({
        user_id: user.id, conversation_id: newId, title, messages: msgs as any,
      });
    }
    const { data } = await supabase.from("ai_chat_history")
      .select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(50);
    if (data) setConversations(data as any);
  }, [user]);

  const sendMessage = useCallback(async (text: string) => {
    if ((!text.trim() && pendingAttachments.length === 0) || loading) return;

    if (isRecording) stopRecording();
    stopSpeaking();
    setCurrentRoute(null);

    const cleanText = text.replace(/\s*🎙️.*$/, "").trim();
    const attachments = pendingAttachments.length > 0 ? [...pendingAttachments] : undefined;

    let displayContent = cleanText;
    if (attachments) {
      const fileNames = attachments.map(a => `📎 ${a.name}`).join("\n");
      displayContent = displayContent ? `${displayContent}\n\n${fileNames}` : fileNames;
    }

    const userMsg: Msg = { role: "user", content: displayContent, attachments };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setPendingAttachments([]);
    setLoading(true);

    let assistantContent = "";

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/natleva-intelligence`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role, content: m.content, attachments: m.attachments,
          })),
          userLocation: userLocation ? { city: userLocation.city, state: userLocation.state } : undefined,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        
        // Check if it's an image response (non-streaming JSON)
        if (err.type === "image" && err.images?.length > 0) {
          const route = err.route as RouteInfo;
          setCurrentRoute(route);
          const imgMsg: Msg = {
            role: "assistant",
            content: err.text || "✅ Imagem gerada com sucesso!",
            images: err.images,
            route,
          };
          const finalMessages = [...newMessages, imgMsg];
          setMessages(finalMessages);
          await saveConversation(finalMessages, currentConvId || undefined);
          setLoading(false);
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
          return;
        }
        
        if (resp.status === 429) toast.error("Rate limit atingido. Aguarde alguns segundos.");
        else if (resp.status === 402) toast.error("Créditos insuficientes. Adicione créditos nas configurações.");
        else toast.error(err.error || "Erro ao conectar com IA");
        setLoading(false);
        return;
      }

      // Check content-type for image responses (non-streaming JSON)
      const contentType = resp.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await resp.json();
        if (data.type === "image" && data.images?.length > 0) {
          const route = data.route as RouteInfo;
          setCurrentRoute(route);
          const imgMsg: Msg = {
            role: "assistant",
            content: data.text || "✅ Imagem gerada com sucesso!",
            images: data.images,
            route,
          };
          const finalMessages = [...newMessages, imgMsg];
          setMessages(finalMessages);
          await saveConversation(finalMessages, currentConvId || undefined);
          setLoading(false);
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
          return;
        }
      }

      if (!resp.body) {
        toast.error("Erro: sem resposta da IA");
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let routeDetected = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            // Check for route metadata
            if (parsed.route && !routeDetected) {
              setCurrentRoute(parsed.route);
              routeDetected = true;
              continue;
            }
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent, route: currentRoute || undefined } : m);
                }
                return [...prev, { role: "assistant", content: assistantContent, route: currentRoute || undefined }];
              });
            }
          } catch { /* partial */ }
        }
      }

      // Flush remaining buffer
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw || raw.startsWith(":") || raw.trim() === "" || !raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.route && !routeDetected) { setCurrentRoute(parsed.route); routeDetected = true; continue; }
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch { /* ignore */ }
        }
      }

      const finalRoute = currentRoute || undefined;
      const finalMessages = [...newMessages, { role: "assistant" as const, content: assistantContent, route: finalRoute }];
      setMessages(finalMessages);
      await saveConversation(finalMessages, currentConvId || undefined);

      // TTS: speak response if voice mode is on
      if (voiceMode && assistantContent) {
        setIsSpeaking(true);
        speakText(assistantContent, () => setIsSpeaking(false));
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro de conexão com a IA");
    }
    setLoading(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [messages, loading, currentConvId, saveConversation, pendingAttachments, isRecording, stopRecording, voiceMode, currentRoute]);

  const newConversation = () => {
    setMessages([]);
    setCurrentConvId(null);
    setPendingAttachments([]);
    setCurrentRoute(null);
    stopSpeaking();
  };

  const loadConversation = (conv: Conversation) => {
    setMessages((conv.messages as any) || []);
    setCurrentConvId(conv.conversation_id);
    setActiveTab("chat");
    setCurrentRoute(null);
  };

  const deleteConversation = async (convId: string) => {
    await supabase.from("ai_chat_history").delete().eq("conversation_id", convId);
    setConversations(prev => prev.filter(c => c.conversation_id !== convId));
    if (currentConvId === convId) newConversation();
  };

  // Knowledge Base CRUD
  const addKBItem = async () => {
    if (!newKB.title.trim()) { toast.error("Título obrigatório"); return; }
    setKbLoading(true);
    const { error } = await supabase.from("ai_knowledge_base").insert({
      title: newKB.title, description: newKB.description, category: newKB.category,
      content_text: newKB.content_text, uploaded_by: user?.id,
    });
    if (error) toast.error("Erro ao salvar");
    else {
      toast.success("Conhecimento adicionado!");
      setShowNewKB(false);
      setNewKB({ title: "", description: "", category: "geral", content_text: "" });
      const { data } = await supabase.from("ai_knowledge_base").select("*").order("created_at", { ascending: false });
      if (data) setKnowledgeBase(data as any);
    }
    setKbLoading(false);
  };

  const deleteKBItem = async (id: string) => {
    await supabase.from("ai_knowledge_base").delete().eq("id", id);
    setKnowledgeBase(prev => prev.filter(k => k.id !== id));
    toast.success("Item removido");
  };

  // Config save
  const saveConfig = async () => {
    setConfigSaving(true);
    const promises = Object.entries(configValues).map(([key, value]) =>
      supabase.from("ai_config").update({ config_value: value, updated_by: user?.id, updated_at: new Date().toISOString() }).eq("config_key", key)
    );
    await Promise.all(promises);
    toast.success("Configurações salvas! A IA já usará as novas diretrizes.");
    setConfigSaving(false);
  };

  const CONFIG_FIELDS = [
    { key: "tom_comunicacao", label: "🎙️ Tom de Comunicação", placeholder: "Ex: Profissional, direto, estratégico...", rows: 2 },
    { key: "nivel_formalidade", label: "📐 Nível de Formalidade", placeholder: "Ex: Alto, médio, informal...", rows: 1 },
    { key: "prioridade_estrategica", label: "🎯 Prioridade Estratégica", placeholder: "Ex: Margem acima de volume, crescimento acelerado...", rows: 2 },
    { key: "cultura_organizacional", label: "🏢 Cultura Organizacional", placeholder: "Descreva a cultura e valores da NatLeva...", rows: 3 },
    { key: "diretrizes_internas", label: "📋 Diretrizes Internas", placeholder: "Regras e diretrizes que a IA deve seguir...", rows: 3 },
    { key: "nivel_detalhamento", label: "🔍 Nível de Detalhamento", placeholder: "Ex: Detalhado com planos práticos e prazos...", rows: 2 },
    { key: "perfil_usuario", label: "👤 Perfil do Usuário", placeholder: "Ex: CEO, Gestor, Operacional...", rows: 1 },
    { key: "instrucoes_customizadas", label: "✍️ Instruções Customizadas", placeholder: "Qualquer instrução extra que a IA deve seguir...", rows: 4 },
  ];

  const KB_CATEGORIES = ["geral", "cultura", "processos", "vendas", "treinamento", "politicas", "metas", "playbook", "manual"];

  const getAttachmentIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="w-3.5 h-3.5" />;
    if (type.includes("spreadsheet") || type.includes("excel") || type === "text/csv") return <FileSpreadsheet className="w-3.5 h-3.5" />;
    return <FileText className="w-3.5 h-3.5" />;
  };

  return (
    <>
    {/* Geolocation Consent Dialog */}
    <Dialog open={showGeoDialog} onOpenChange={(open) => { if (!open) handleGeoConsent("dismissed"); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-5 h-5 text-primary" />
            Localização para Personalização
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Para oferecer um atendimento mais personalizado, a NatLeva gostaria de saber sua localização (cidade).
          </p>
          <p className="text-xs text-muted-foreground/70">
            Seus dados serão usados apenas para melhorar sua experiência — como recomendar voos e pacotes de saída da sua cidade.
          </p>
          <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1.5">
            <p className="font-medium text-foreground/80">✨ Benefícios:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Recomendações de voos saindo da sua cidade</li>
              <li>Pacotes e destinos relevantes para sua região</li>
              <li>Alertas contextuais sobre sua localidade</li>
              <li>Atendimento mais ágil e proativo</li>
            </ul>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Button onClick={() => handleGeoConsent("granted")} className="flex-1 gap-2" disabled={geoLoading}>
              {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
              Permitir
            </Button>
            <Button variant="outline" onClick={() => handleGeoConsent("denied")} className="flex-1">
              Negar
            </Button>
            <Button variant="ghost" onClick={() => handleGeoConsent("dismissed")} className="text-xs text-muted-foreground">
              Perguntar depois
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/50 text-center">
            Em conformidade com a LGPD. Você pode revogar a qualquer momento.
          </p>
        </div>
      </DialogContent>
    </Dialog>

    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r border-border/40 flex flex-col bg-muted/20 shrink-0 hidden lg:flex">
        <div className="p-4 border-b border-border/40">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">NatLeva Intelligence</h2>
              <p className="text-[10px] text-muted-foreground">Orquestrador Multi-IA 2.0</p>
            </div>
          </div>
          <Button onClick={newConversation} variant="outline" size="sm" className="w-full gap-2">
            <Plus className="w-3.5 h-3.5" /> Nova Conversa
          </Button>
        </div>

        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            {conversations.map(conv => (
              <div key={conv.conversation_id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                  currentConvId === conv.conversation_id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"
                }`}
                onClick={() => loadConversation(conv)}>
                <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate flex-1">{conv.title}</span>
                <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.conversation_id); }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-opacity">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-2 border-t border-border/40 space-y-1">
          <button onClick={() => setActiveTab("knowledge")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs w-full transition-colors ${activeTab === "knowledge" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>
            <BookOpen className="w-3.5 h-3.5" /> Base de Conhecimento
          </button>
          <button onClick={() => setActiveTab("config")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs w-full transition-colors ${activeTab === "config" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>
            <Settings2 className="w-3.5 h-3.5" /> Configurações da IA
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile tabs */}
        <div className="lg:hidden border-b border-border/40 p-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="chat" className="flex-1 text-xs gap-1"><Brain className="w-3 h-3" /> Chat</TabsTrigger>
              <TabsTrigger value="history" className="flex-1 text-xs gap-1"><History className="w-3 h-3" /> Histórico</TabsTrigger>
              <TabsTrigger value="knowledge" className="flex-1 text-xs gap-1"><BookOpen className="w-3 h-3" /> Base</TabsTrigger>
              <TabsTrigger value="config" className="flex-1 text-xs gap-1"><Settings2 className="w-3 h-3" /> Config</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Chat view */}
        {(activeTab === "chat" || activeTab === "history") && activeTab === "chat" && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Chat header with orchestrator status */}
            <div className="p-3 border-b border-border/40 flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Brain className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  NatLeva Intelligence 2.0
                  {currentRoute && (
                    <Badge variant="outline" className="text-[9px] font-normal gap-1 animate-in fade-in">
                      <Cpu className="w-2.5 h-2.5" />
                      {currentRoute.label}
                    </Badge>
                  )}
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  Orquestrador Multi-IA • Voz • Arquivos • Links • Imagens • Aprendizado contínuo
                  {userLocation && <span className="ml-1">• 📍 {userLocation.city}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Voice mode toggle */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (isSpeaking) { stopSpeaking(); setIsSpeaking(false); }
                      setVoiceMode(!voiceMode);
                    }}
                    className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-all ${
                      voiceMode
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/80"
                    }`}
                    title={voiceMode ? "Desativar resposta por voz" : "Ativar resposta por voz"}
                  >
                    {voiceMode ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                    {voiceMode ? "Voz ON" : "Voz"}
                  </button>
                </div>
                <Button variant="ghost" size="sm" onClick={newConversation} className="text-xs gap-1">
                  <RefreshCw className="w-3 h-3" /> Nova
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-5">
                    <Brain className="w-10 h-10 text-primary" />
                  </div>
                  <h4 className="text-lg font-bold text-foreground mb-1">NatLeva Intelligence 2.0</h4>
                  <p className="text-sm text-muted-foreground max-w-lg mb-2">
                    Orquestrador multi-IA com roteamento inteligente de modelos.
                  </p>

                  {/* Orchestrator capabilities */}
                  <div className="flex flex-wrap justify-center gap-1.5 mb-4 max-w-lg">
                    <Badge variant="outline" className="text-[9px] gap-1"><Cpu className="w-2.5 h-2.5" /> Multi-Modelo</Badge>
                    <Badge variant="outline" className="text-[9px] gap-1"><Sparkles className="w-2.5 h-2.5" /> ⚡ Flash</Badge>
                    <Badge variant="outline" className="text-[9px] gap-1"><Brain className="w-2.5 h-2.5" /> 🧠 Pro</Badge>
                    <Badge variant="outline" className="text-[9px] gap-1"><Image className="w-2.5 h-2.5" /> 🎨 Imagem</Badge>
                    <Badge variant="outline" className="text-[9px] gap-1"><Mic className="w-2.5 h-2.5" /> STT</Badge>
                    <Badge variant="outline" className="text-[9px] gap-1"><Volume2 className="w-2.5 h-2.5" /> TTS</Badge>
                    <Badge variant="outline" className="text-[9px] gap-1 text-emerald-600 border-emerald-200">🌐 Busca Web</Badge>
                  </div>

                  <p className="text-xs text-muted-foreground/60 max-w-lg mb-2">
                    🧠 O orquestrador seleciona automaticamente o melhor motor de IA para cada solicitação
                  </p>
                  <p className="text-xs text-muted-foreground/60 max-w-lg mb-2">
                    🎙️ Microfone • 📎 Arquivos • 🔗 Links • 🎨 Imagens • 🗣️ Resposta por voz • 📄 PDF • 📊 Planilhas
                  </p>
                  <p className="text-xs text-muted-foreground/60 max-w-lg mb-1">
                    🌐 Busca em tempo real: DuckDuckGo • Wikipedia • Google News — <span className="text-emerald-600 font-medium">100% gratuito, sem API key</span>
                  </p>
                  {userLocation && (
                    <p className="text-xs text-muted-foreground/60 max-w-lg mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-primary/60" />
                      📍 Sua localização: <span className="font-medium text-foreground/70">{userLocation.city}{userLocation.state ? `, ${userLocation.state}` : ""}</span>
                    </p>
                  )}
                  {geoConsent !== "granted" && (
                    <button
                      onClick={() => setShowGeoDialog(true)}
                      className="text-xs text-primary/70 hover:text-primary flex items-center gap-1 mb-1 transition-colors"
                    >
                      <LocateFixed className="w-3 h-3" /> Ativar localização para recomendações personalizadas
                    </button>
                  )}
                  <p className="text-xs text-muted-foreground/60 max-w-lg mb-6">
                    Vendas • Financeiro • RH • Clientes • Metas • Performance • Fornecedores • Check-in • Hospedagens
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl w-full">
                    {SUGGESTIONS.map((s, i) => (
                      <button key={i} onClick={() => sendMessage(s.text)}
                        className="flex items-start gap-2 text-left text-xs p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground group">
                        <s.icon className="w-4 h-4 shrink-0 mt-0.5 text-primary/60 group-hover:text-primary transition-colors" />
                        <span>{s.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0 mt-1">
                      <Brain className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted/50 border border-border/30 rounded-bl-md"
                  }`}>
                    {msg.role === "assistant" ? (
                      <>
                        {/* Route indicator */}
                        {msg.route && (
                          <div className="flex items-center gap-1.5 mb-2 text-[9px] text-muted-foreground/70">
                            <Cpu className="w-2.5 h-2.5" />
                            <span>{msg.route.label}</span>
                            <span className="text-muted-foreground/40">•</span>
                            <span className="text-muted-foreground/50">{msg.route.reason}</span>
                          </div>
                        )}

                        <div className="prose prose-sm dark:prose-invert max-w-none
                          prose-headings:text-foreground prose-h1:text-lg prose-h1:font-bold prose-h1:mt-4 prose-h1:mb-2
                          prose-h2:text-base prose-h2:font-bold prose-h2:mt-5 prose-h2:mb-2 prose-h2:border-b prose-h2:border-border/30 prose-h2:pb-1
                          prose-h3:text-sm prose-h3:font-semibold prose-h3:mt-3 prose-h3:mb-1
                          prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:text-sm
                          prose-li:text-muted-foreground prose-li:leading-relaxed prose-li:text-sm
                          prose-strong:text-foreground prose-table:text-xs
                          prose-ul:my-1 prose-ol:my-1">
                          <ReactMarkdown
                            components={{
                              a: ({ href, children, ...props }) => {
                                const isInternal = href && (
                                  href.startsWith("/") ||
                                  href.includes("crmnatleva.lovable.app") ||
                                  href.includes("preview--")
                                );
                                if (isInternal) {
                                  const path = href.startsWith("/") ? href : new URL(href).pathname;
                                  return (
                                    <button
                                      onClick={() => navigateTo(path)}
                                      className="text-primary underline underline-offset-2 hover:text-primary/80 font-medium cursor-pointer transition-colors"
                                      {...(props as any)}
                                    >
                                      {children}
                                    </button>
                                  );
                                }
                                return (
                                  <a href={href} target="_blank" rel="noopener noreferrer"
                                    className="text-primary underline underline-offset-2 hover:text-primary/80"
                                    {...props}>
                                    {children}
                                  </a>
                                );
                              },
                            }}
                          >{msg.content}</ReactMarkdown>
                        </div>

                        {/* Generated images */}
                        {msg.images && msg.images.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {msg.images.map((img, idx) => (
                              <div key={idx} className="relative group">
                                <img
                                  src={img.image_url.url}
                                  alt="Imagem gerada pela IA"
                                  className="rounded-xl max-w-full border border-border/30 shadow-sm"
                                />
                                <button
                                  onClick={() => downloadImage(img.image_url.url)}
                                  className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm border border-border/50 rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                                  title="Baixar imagem"
                                >
                                  <Download className="w-4 h-4 text-foreground" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Action buttons */}
                        {msg.content.length > 100 && !loading && (
                          <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-border/20">
                            <button
                              onClick={() => exportChatAsPDF(messages, "NatLeva Intelligence")}
                              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/80 px-2 py-1 rounded-md transition-colors"
                              title="Exportar conversa como PDF"
                            >
                              <FileDown className="w-3 h-3" /> PDF
                            </button>
                            <button
                              onClick={() => exportChatAsXLSX(messages, "NatLeva Intelligence")}
                              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/80 px-2 py-1 rounded-md transition-colors"
                              title="Exportar conversa como planilha"
                            >
                              <FileSpreadsheet className="w-3 h-3" /> Planilha
                            </button>
                            {msg.content.includes("|") && msg.content.includes("---") && (
                              <button
                                onClick={() => exportTableFromContent(msg.content)}
                                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/80 px-2 py-1 rounded-md transition-colors"
                                title="Exportar tabela como planilha"
                              >
                                <Table className="w-3 h-3" /> Exportar Tabela
                              </button>
                            )}
                            {/* TTS per-message */}
                            <button
                              onClick={() => {
                                if (isSpeaking) {
                                  stopSpeaking();
                                  setIsSpeaking(false);
                                } else {
                                  setIsSpeaking(true);
                                  speakText(msg.content, () => setIsSpeaking(false));
                                }
                              }}
                              className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors ${
                                isSpeaking
                                  ? "text-primary bg-primary/10 hover:bg-primary/20"
                                  : "text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/80"
                              }`}
                              title={isSpeaking ? "Parar narração" : "Ouvir resposta"}
                            >
                              {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                              {isSpeaking ? "Parar" : "Ouvir"}
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </div>
              ))}

              {loading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                    <Brain className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted/50 border border-border/30 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {currentRoute
                          ? `${currentRoute.label} processando...`
                          : "🧠 Orquestrador selecionando motor e analisando..."
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Pending attachments preview */}
            {pendingAttachments.length > 0 && (
              <div className="px-4 pt-2 flex flex-wrap gap-2">
                {pendingAttachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-muted/60 border border-border/40 rounded-lg px-2.5 py-1.5 text-xs text-foreground">
                    {getAttachmentIcon(att.type)}
                    <span className="truncate max-w-[120px]">{att.name}</span>
                    <button onClick={() => removeAttachment(i)} className="p-0.5 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input area */}
            <div className="p-4 border-t border-border/40 shrink-0">
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ACCEPTED_TYPES.join(",")}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={loading || uploadingFiles}
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 text-muted-foreground hover:text-foreground h-10 w-10"
                  title="Anexar arquivo (imagem, PDF, planilha)"
                >
                  {uploadingFiles ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                </Button>

                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={voiceMode ? "Fale ou digite... 🗣️" : "Pergunte, cole links, ou use o microfone..."}
                  disabled={loading}
                  className="flex-1"
                />

                <Button
                  type="button"
                  variant={isRecording ? "destructive" : "ghost"}
                  size="icon"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={loading}
                  className={`shrink-0 h-10 w-10 ${isRecording ? "animate-pulse" : "text-muted-foreground hover:text-foreground"}`}
                  title={isRecording ? "Parar gravação" : "Gravar áudio"}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>

                <Button type="submit" disabled={loading || (!input.trim() && pendingAttachments.length === 0)} size="icon"
                  className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 shrink-0 h-10 w-10">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </form>
              <p className="text-[10px] text-muted-foreground/50 mt-1.5 text-center">
                🧠 Multi-IA • 🎙️ Microfone • 📎 Arquivos • 🔗 Links • 🎨 "Gere uma imagem de..." • 🗣️ Voz • 📄 PDF/Planilha
              </p>
            </div>
          </div>
        )}

        {/* Mobile history */}
        {activeTab === "history" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <Button onClick={newConversation} variant="outline" className="w-full gap-2 mb-3">
              <Plus className="w-4 h-4" /> Nova Conversa
            </Button>
            {conversations.map(conv => (
              <Card key={conv.conversation_id}
                className="p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => { loadConversation(conv); setActiveTab("chat"); }}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{conv.title}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(conv.updated_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Knowledge Base */}
        {activeTab === "knowledge" && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" /> Base de Conhecimento NatLeva
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Adicione conteúdos que a IA usará como referência prioritária nas respostas
                </p>
              </div>
              <Button onClick={() => setShowNewKB(true)} size="sm" className="gap-2">
                <Plus className="w-4 h-4" /> Adicionar
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {knowledgeBase.map(item => (
                <Card key={item.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <h4 className="text-sm font-semibold text-foreground line-clamp-1">{item.title}</h4>
                    </div>
                    <button onClick={() => deleteKBItem(item.id)} className="text-muted-foreground hover:text-destructive p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <Badge variant="outline" className="text-[9px]">{item.category}</Badge>
                  {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
                  {item.content_text && <p className="text-[10px] text-muted-foreground/60 line-clamp-3 font-mono">{item.content_text}</p>}
                  <p className="text-[9px] text-muted-foreground/40">{new Date(item.created_at).toLocaleDateString("pt-BR")}</p>
                </Card>
              ))}
              {knowledgeBase.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum conhecimento adicionado ainda</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Adicione PDFs, scripts, processos, cultura e a IA usará como referência</p>
                </div>
              )}
            </div>

            <Dialog open={showNewKB} onOpenChange={setShowNewKB}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" /> Adicionar Conhecimento
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Título *</label>
                    <Input value={newKB.title} onChange={(e) => setNewKB(p => ({ ...p, title: e.target.value }))}
                      placeholder="Ex: Script de venda para viagens de luxo" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Categoria</label>
                    <Select value={newKB.category} onValueChange={v => setNewKB(p => ({ ...p, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KB_CATEGORIES.map(c => (
                          <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Descrição</label>
                    <Input value={newKB.description} onChange={(e) => setNewKB(p => ({ ...p, description: e.target.value }))}
                      placeholder="Breve descrição do conteúdo" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Conteúdo (texto completo)</label>
                    <Textarea value={newKB.content_text} onChange={(e) => setNewKB(p => ({ ...p, content_text: e.target.value }))}
                      placeholder="Cole aqui o conteúdo completo: processos, scripts, políticas, treinamentos..."
                      rows={8} />
                  </div>
                  <Button onClick={addKBItem} disabled={kbLoading} className="w-full gap-2">
                    {kbLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar na Base de Conhecimento
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Config */}
        {activeTab === "config" && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-primary" /> Configurações Estratégicas da IA
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Defina a personalidade, tom e diretrizes que a IA deve seguir
                </p>
              </div>
              <Button onClick={saveConfig} disabled={configSaving} size="sm" className="gap-2">
                {configSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Configurações
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {CONFIG_FIELDS.map(field => (
                <Card key={field.key} className="p-4 space-y-2">
                  <label className="text-sm font-semibold text-foreground">{field.label}</label>
                  <Textarea
                    value={configValues[field.key] || ""}
                    onChange={(e) => setConfigValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    rows={field.rows}
                    className="text-sm"
                  />
                </Card>
              ))}
            </div>

            {/* Orchestrator info card */}
            <Card className="p-4 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Cpu className="w-4 h-4 text-primary" /> Arquitetura do Orquestrador Multi-IA
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="font-medium text-foreground">⚡ Motor Rápido (Flash)</span>
                  </div>
                  <p className="text-muted-foreground pl-4">Consultas gerais, resumos, dúvidas rápidas</p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="font-medium text-foreground">🧠 Motor Estratégico (Pro)</span>
                  </div>
                  <p className="text-muted-foreground pl-4">Planos, análises complexas, cálculos avançados</p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="font-medium text-foreground">🎨 Gerador de Imagens</span>
                  </div>
                  <p className="text-muted-foreground pl-4">Banners, artes, logos, posts, cards</p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="font-medium text-foreground">👁️ Visão Computacional</span>
                  </div>
                  <p className="text-muted-foreground pl-4">OCR, análise de prints e documentos</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-muted/30 border-primary/20">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-warning" /> Como a IA usa essas configurações
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• As configurações são injetadas no prompt de sistema da IA em tempo real</li>
                <li>• Mudanças são aplicadas imediatamente na próxima conversa</li>
                <li>• O orquestrador seleciona o modelo ideal automaticamente</li>
                <li>• Use "Instruções Customizadas" para regras específicas do negócio</li>
                <li>• A Base de Conhecimento complementa com contexto detalhado (RAG simples)</li>
                <li>• Ative "Voz ON" no chat para ouvir as respostas narradas</li>
              </ul>
            </Card>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
