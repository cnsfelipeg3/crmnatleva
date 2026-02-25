import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import ReactMarkdown from "react-markdown";
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
import {
  Brain, Send, Loader2, RefreshCw, MessageCircle, Lightbulb,
  Plus, Trash2, Upload, FileText, Settings2, Save, BookOpen,
  History, Sparkles, AlertTriangle, Target, DollarSign, Users,
  TrendingUp, Shield, Zap, ChevronRight, Mic, MicOff, Paperclip, X,
  Image, FileSpreadsheet, Link2,
} from "lucide-react";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string; attachments?: AttachmentInfo[] };
type AttachmentInfo = { name: string; type: string; url?: string; content?: string };
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
  { icon: Sparkles, text: "Crie um programa de fidelidade com níveis e presentes por LTV" },
  { icon: Zap, text: "Quais gargalos operacionais devo resolver primeiro?" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = [
  "image/png", "image/jpeg", "image/webp", "image/gif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "text/plain",
];

export default function NatLevaIntelligence() {
  const { user } = useAuth();
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
        const base = prev.replace(/\s*🎙️.*$/, ""); // remove interim marker
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
      // Clean up interim markers
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
        // For images, convert to base64 for Gemini multimodal
        if (file.type.startsWith("image/")) {
          const base64 = await fileToBase64(file);
          newAttachments.push({
            name: file.name,
            type: file.type,
            content: base64,
          });
        } else if (file.type === "text/csv" || file.type === "text/plain") {
          // Read text files directly
          const text = await file.text();
          newAttachments.push({
            name: file.name,
            type: file.type,
            content: text.slice(0, 50000), // limit to 50k chars
          });
        } else {
          // PDFs and spreadsheets: upload to storage and let backend handle
          const filePath = `chat-uploads/${user?.id}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from("ai-knowledge-base")
            .upload(filePath, file);

          if (uploadError) {
            toast.error(`Erro ao enviar ${file.name}`);
            console.error(uploadError);
            continue;
          }

          const { data: urlData } = supabase.storage
            .from("ai-knowledge-base")
            .getPublicUrl(filePath);

          newAttachments.push({
            name: file.name,
            type: file.type,
            url: urlData.publicUrl,
          });
        }
      } catch (err) {
        console.error("File upload error:", err);
        toast.error(`Erro ao processar ${file.name}`);
      }
    }

    setPendingAttachments(prev => [...prev, ...newAttachments]);
    setUploadingFiles(false);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [user]);

  const removeAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
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
        user_id: user.id,
        conversation_id: newId,
        title,
        messages: msgs as any,
      });
    }
    const { data } = await supabase.from("ai_chat_history")
      .select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(50);
    if (data) setConversations(data as any);
  }, [user]);

  const sendMessage = useCallback(async (text: string) => {
    if ((!text.trim() && pendingAttachments.length === 0) || loading) return;

    // Stop recording if active
    if (isRecording) stopRecording();

    const cleanText = text.replace(/\s*🎙️.*$/, "").trim();
    const attachments = pendingAttachments.length > 0 ? [...pendingAttachments] : undefined;

    // Build display content
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
            role: m.role,
            content: m.content,
            attachments: m.attachments,
          })),
        }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        if (resp.status === 429) toast.error("Rate limit atingido. Aguarde alguns segundos.");
        else if (resp.status === 402) toast.error("Créditos insuficientes. Adicione créditos nas configurações.");
        else toast.error(err.error || "Erro ao conectar com IA");
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

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

      const finalMessages = [...newMessages, { role: "assistant" as const, content: assistantContent }];
      setMessages(finalMessages);
      await saveConversation(finalMessages, currentConvId || undefined);
    } catch (e) {
      console.error(e);
      toast.error("Erro de conexão com a IA");
    }
    setLoading(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [messages, loading, currentConvId, saveConversation, pendingAttachments, isRecording, stopRecording]);

  const newConversation = () => {
    setMessages([]);
    setCurrentConvId(null);
    setPendingAttachments([]);
  };

  const loadConversation = (conv: Conversation) => {
    setMessages((conv.messages as any) || []);
    setCurrentConvId(conv.conversation_id);
    setActiveTab("chat");
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
              <p className="text-[10px] text-muted-foreground">Motor Cognitivo</p>
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
            {/* Chat header */}
            <div className="p-3 border-b border-border/40 flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Brain className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">NatLeva Intelligence</h3>
                <p className="text-[10px] text-muted-foreground">Acesso total • Voz • Arquivos • Links • Aprendizado contínuo</p>
              </div>
              <div className="flex items-center gap-1">
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
                  <h4 className="text-lg font-bold text-foreground mb-1">NatLeva Intelligence</h4>
                  <p className="text-sm text-muted-foreground max-w-lg mb-2">
                    Seu motor cognitivo com acesso completo a todos os dados do sistema.
                  </p>
                  <p className="text-xs text-muted-foreground/60 max-w-lg mb-2">
                    🎙️ Use o microfone para falar • 📎 Anexe imagens, PDFs e planilhas • 🔗 Cole links para análise
                  </p>
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
                      <div className="prose prose-sm dark:prose-invert max-w-none
                        prose-headings:text-foreground prose-h1:text-lg prose-h1:font-bold prose-h1:mt-4 prose-h1:mb-2
                        prose-h2:text-base prose-h2:font-bold prose-h2:mt-5 prose-h2:mb-2 prose-h2:border-b prose-h2:border-border/30 prose-h2:pb-1
                        prose-h3:text-sm prose-h3:font-semibold prose-h3:mt-3 prose-h3:mb-1
                        prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:text-sm
                        prose-li:text-muted-foreground prose-li:leading-relaxed prose-li:text-sm
                        prose-strong:text-foreground prose-table:text-xs
                        prose-ul:my-1 prose-ol:my-1">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
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
                      <Loader2 className="w-4 h-4 animate-spin" /> Consultando dados e analisando...
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
                {/* File upload */}
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

                {/* Text input */}
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pergunte, cole links, ou use o microfone..."
                  disabled={loading}
                  className="flex-1"
                />

                {/* Mic button */}
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

                {/* Send */}
                <Button type="submit" disabled={loading || (!input.trim() && pendingAttachments.length === 0)} size="icon"
                  className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 shrink-0 h-10 w-10">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </form>
              <p className="text-[10px] text-muted-foreground/50 mt-1.5 text-center">
                🎙️ Microfone • 📎 Imagens, PDFs, planilhas • 🔗 Links são interpretados automaticamente
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

            <Card className="p-4 bg-muted/30 border-primary/20">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-warning" /> Como a IA usa essas configurações
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• As configurações são injetadas no prompt de sistema da IA em tempo real</li>
                <li>• Mudanças são aplicadas imediatamente na próxima conversa</li>
                <li>• Use "Instruções Customizadas" para regras específicas do negócio</li>
                <li>• A Base de Conhecimento complementa com contexto detalhado</li>
              </ul>
            </Card>
          </div>
        )}
      </div>
    </div>
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
