import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import {
  Search, Send, Paperclip, Smile, Mic, Sparkles, Phone, Video, MoreVertical,
  Plus, Tag, ArrowRight, MessageSquare, Clock, CheckCheck, Check,
  X, Star, AlertTriangle, Plane, DollarSign,
  ShoppingCart, ExternalLink, FileText, ChevronLeft, RefreshCw, Edit3,
  Zap, TrendingUp, MapPin, Users, Crown, Target,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

// ─── TYPES ───
interface Conversation {
  id: string;
  client_id: string | null;
  assigned_to: string | null;
  status: string;
  tags: string[];
  funnel_stage: string;
  last_message_at: string;
  last_message_preview: string | null;
  unread_count: number;
  phone: string | null;
  client_name?: string;
  assigned_name?: string;
  score?: number;
  cluster?: string;
  level?: string;
  totalSpent?: number;
  tripCount?: number;
  avgTicket?: number;
  avgMargin?: number;
  lastPurchase?: string;
  nextTrip?: string;
  favoriteDestination?: string;
  pendencies?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_type: string;
  message_type: string;
  content: string | null;
  read_status: string;
  created_at: string;
}

interface AISuggestion {
  suggestion: string;
  intent: string;
  destination: string | null;
  urgency: string;
  tags: string[];
  funnel_stage: string;
  reasoning: string;
  loading?: boolean;
}

// ─── CONSTANTS ───
const STATUS_MAP: Record<string, { label: string; dotClass: string }> = {
  novo: { label: "Novo", dotClass: "bg-blue-500" },
  em_atendimento: { label: "Em atendimento", dotClass: "bg-emerald-500" },
  aguardando_cliente: { label: "Aguardando", dotClass: "bg-amber-500" },
  resolvido: { label: "Resolvido", dotClass: "bg-muted-foreground/50" },
};

const FUNNEL_MAP: Record<string, { label: string; color: string }> = {
  novo_lead: { label: "Novo Lead", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  qualificacao: { label: "Qualificação", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" },
  orcamento_enviado: { label: "Orçamento", color: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300" },
  negociacao: { label: "Negociação", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  fechado: { label: "Fechado", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  pos_venda: { label: "Pós-venda", color: "bg-muted text-muted-foreground" },
};

const TAG_COLORS: Record<string, string> = {
  VIP: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  Urgente: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  Dubai: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  Europa: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Família: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "Alto Ticket": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "Novo Lead": "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  "Pós-venda": "bg-slate-100 text-slate-700 dark:bg-slate-800/30 dark:text-slate-300",
  Seguro: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  Documento: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
};

function getInitials(name: string) {
  return name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

function formatMessageTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Ontem";
  return format(d, "dd/MM");
}

// ─── MOCK DATA ───
const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "1", client_id: null, assigned_to: null, status: "em_atendimento",
    tags: ["VIP", "Dubai"], funnel_stage: "qualificacao",
    last_message_at: new Date().toISOString(),
    last_message_preview: "Quero saber sobre o pacote para Dubai em março!",
    unread_count: 3, phone: "+55 11 99988-7766",
    client_name: "Ana Carolina Silva", assigned_name: "Mariana",
    score: 92, cluster: "Luxo Frequente", level: "VIP Elite",
    totalSpent: 87500, tripCount: 6, avgTicket: 14583, avgMargin: 22,
    lastPurchase: "12/01/2026", nextTrip: "15/03/2026",
    favoriteDestination: "Dubai", pendencies: "Passaporte vence em 4 meses",
  },
  {
    id: "2", client_id: null, assigned_to: null, status: "em_atendimento",
    tags: ["Europa", "Família"], funnel_stage: "orcamento_enviado",
    last_message_at: new Date(Date.now() - 1800000).toISOString(),
    last_message_preview: "Perfeito! Vou enviar os documentos agora.",
    unread_count: 0, phone: "+55 21 98877-6655",
    client_name: "João Pedro Santos", assigned_name: "Carlos",
    score: 78, cluster: "Família Premium", level: "VIP Premium",
    totalSpent: 42300, tripCount: 4, avgTicket: 10575, avgMargin: 18,
    lastPurchase: "05/11/2025", favoriteDestination: "Paris",
  },
  {
    id: "3", client_id: null, assigned_to: null, status: "aguardando_cliente",
    tags: ["Família"], funnel_stage: "negociacao",
    last_message_at: new Date(Date.now() - 7200000).toISOString(),
    last_message_preview: "Estou aguardando a confirmação do hotel.",
    unread_count: 0, phone: "+55 31 97766-5544",
    client_name: "Maria Fernanda Costa", assigned_name: "Mariana",
    score: 65, cluster: "Recorrente", level: "Estratégico",
    totalSpent: 28900, tripCount: 3, avgTicket: 9633, avgMargin: 15,
  },
  {
    id: "4", client_id: null, assigned_to: null, status: "novo",
    tags: ["Urgente"], funnel_stage: "novo_lead",
    last_message_at: new Date(Date.now() - 300000).toISOString(),
    last_message_preview: "Preciso remarcar meu voo urgente!",
    unread_count: 5, phone: "+55 11 96655-4433",
    client_name: "Rafael Oliveira", assigned_name: undefined,
    score: 45, cluster: "Potencial", level: "Potencial",
    totalSpent: 8500, tripCount: 1, avgTicket: 8500, avgMargin: 12,
    pendencies: "Voo amanhã - remarcar",
  },
  {
    id: "5", client_id: null, assigned_to: null, status: "resolvido",
    tags: ["Pós-venda"], funnel_stage: "pos_venda",
    last_message_at: new Date(Date.now() - 86400000).toISOString(),
    last_message_preview: "Obrigado pelo atendimento! 😊",
    unread_count: 0, phone: "+55 21 95544-3322",
    client_name: "Beatriz Almeida", assigned_name: "Carlos",
    score: 70, cluster: "Recorrente", level: "Recorrente",
    totalSpent: 35600, tripCount: 3, avgTicket: 11866, avgMargin: 16,
  },
  {
    id: "6", client_id: null, assigned_to: null, status: "novo",
    tags: ["Novo Lead", "Alto Ticket"], funnel_stage: "novo_lead",
    last_message_at: new Date(Date.now() - 120000).toISOString(),
    last_message_preview: "Boa tarde! Indicação da Ana Carolina. Quero Maldivas.",
    unread_count: 2, phone: "+55 11 93322-1100",
    client_name: "Luciana Martins", assigned_name: undefined,
    score: 0, cluster: "Novo", level: "Novo Lead",
    totalSpent: 0, tripCount: 0,
  },
];

function generateMockMessages(convId: string): Message[] {
  const now = Date.now();
  if (convId === "1") return [
    { id: "m1", conversation_id: "1", sender_type: "cliente", message_type: "text", content: "Olá! Boa tarde! 😊", read_status: "read", created_at: new Date(now - 3600000).toISOString() },
    { id: "m2", conversation_id: "1", sender_type: "atendente", message_type: "text", content: "Olá Ana! Boa tarde! Seja bem-vinda à NatLeva Turismo ✈️\n\nComo posso ajudá-la hoje?", read_status: "read", created_at: new Date(now - 3500000).toISOString() },
    { id: "m3", conversation_id: "1", sender_type: "cliente", message_type: "text", content: "Quero saber sobre o pacote para Dubai em março! Vi no Instagram de vocês e achei incrível 😍", read_status: "read", created_at: new Date(now - 3400000).toISOString() },
    { id: "m4", conversation_id: "1", sender_type: "atendente", message_type: "text", content: "Que ótimo gosto, Ana! Dubai em março é uma época maravilhosa — clima perfeito, sem o calor extremo do verão.\n\nTemos pacotes exclusivos com hospedagem no Atlantis The Royal ou no JW Marriott Marquis.\n\nQuantas pessoas iriam na viagem?", read_status: "read", created_at: new Date(now - 3300000).toISOString() },
    { id: "m5", conversation_id: "1", sender_type: "cliente", message_type: "text", content: "Somos eu e meu marido! Queremos algo bem especial, estilo lua de mel. Temos 10 dias disponíveis.", read_status: "read", created_at: new Date(now - 600000).toISOString() },
    { id: "m6", conversation_id: "1", sender_type: "cliente", message_type: "text", content: "Vocês fazem pacote com Abu Dhabi também?", read_status: "delivered", created_at: new Date(now - 60000).toISOString() },
  ];
  if (convId === "4") return [
    { id: "m10", conversation_id: "4", sender_type: "cliente", message_type: "text", content: "Preciso remarcar meu voo urgente! O voo é amanhã e tive um imprevisto.", read_status: "delivered", created_at: new Date(now - 300000).toISOString() },
    { id: "m11", conversation_id: "4", sender_type: "cliente", message_type: "text", content: "Alguém pode me ajudar por favor?? É urgente!", read_status: "delivered", created_at: new Date(now - 240000).toISOString() },
  ];
  if (convId === "6") return [
    { id: "m20", conversation_id: "6", sender_type: "cliente", message_type: "text", content: "Boa tarde! A Ana Carolina me indicou vocês. Quero ir para as Maldivas em abril, casal, algo bem premium.", read_status: "delivered", created_at: new Date(now - 120000).toISOString() },
    { id: "m21", conversation_id: "6", sender_type: "cliente", message_type: "text", content: "Orçamento não é problema, quero a melhor experiência possível!", read_status: "delivered", created_at: new Date(now - 60000).toISOString() },
  ];
  return [
    { id: `m-${convId}-1`, conversation_id: convId, sender_type: "cliente", message_type: "text", content: "Olá!", read_status: "read", created_at: new Date(now - 7200000).toISOString() },
    { id: `m-${convId}-2`, conversation_id: convId, sender_type: "atendente", message_type: "text", content: "Olá! Como posso ajudar?", read_status: "read", created_at: new Date(now - 7100000).toISOString() },
  ];
}

// ─── CONVERSATION LIST ───
function ConversationList({
  conversations, selected, onSelect, filter, onFilterChange, search, onSearchChange,
}: {
  conversations: Conversation[];
  selected: string | null;
  onSelect: (id: string) => void;
  filter: string;
  onFilterChange: (f: string) => void;
  search: string;
  onSearchChange: (s: string) => void;
}) {
  const isMobile = useIsMobile();

  const groups = {
    unread: conversations.filter(c => c.unread_count > 0),
    mine: conversations.filter(c => c.assigned_name === "Mariana"),
    vip: conversations.filter(c => c.tags.includes("VIP")),
    all: conversations,
  };

  const filtered = conversations.filter(c => {
    if (search) {
      const q = search.toLowerCase();
      if (!c.client_name?.toLowerCase().includes(q) && !c.phone?.includes(q)) return false;
    }
    if (filter === "nao_lidas") return c.unread_count > 0;
    if (filter === "vip") return c.tags.includes("VIP") || c.level?.includes("VIP");
    if (filter === "urgente") return c.tags.includes("Urgente");
    if (filter === "novo_lead") return c.funnel_stage === "novo_lead";
    if (filter === "negociacao") return ["qualificacao", "orcamento_enviado", "negociacao"].includes(c.funnel_stage);
    return true;
  }).sort((a, b) => {
    if (a.unread_count > 0 && b.unread_count === 0) return -1;
    if (b.unread_count > 0 && a.unread_count === 0) return 1;
    return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
  });

  const filters = [
    { key: "todas", label: "Todas", count: conversations.length },
    { key: "nao_lidas", label: "Não lidas", count: groups.unread.length },
    { key: "vip", label: "VIP", count: groups.vip.length },
    { key: "urgente", label: "Urgente", count: conversations.filter(c => c.tags.includes("Urgente")).length },
    { key: "novo_lead", label: "Novos", count: conversations.filter(c => c.funnel_stage === "novo_lead").length },
    { key: "negociacao", label: "Em negociação", count: conversations.filter(c => ["qualificacao", "orcamento_enviado", "negociacao"].includes(c.funnel_stage)).length },
  ];

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            LiveChat
          </h2>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" onClick={() => window.location.href = "/livechat/integration"} title="Fazer Integração">
              <Zap className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9 h-9 text-sm bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="px-3 py-2 border-b border-border overflow-x-auto">
        <div className="flex gap-1.5">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all",
                filter === f.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              )}
            >
              {f.label}
              {f.count > 0 && (
                <span className={cn("ml-1", filter === f.key ? "opacity-80" : "opacity-60")}>{f.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div>
          {filtered.map(conv => {
            const status = STATUS_MAP[conv.status] || STATUS_MAP.novo;
            const funnel = FUNNEL_MAP[conv.funnel_stage] || FUNNEL_MAP.novo_lead;
            const isUrgent = conv.tags.includes("Urgente");
            const isVIP = conv.tags.includes("VIP") || conv.level?.includes("VIP");

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  "w-full text-left px-3 py-3 transition-all relative border-b border-border/50",
                  selected === conv.id
                    ? "bg-primary/5 border-l-[3px] border-l-primary"
                    : "hover:bg-accent/50 border-l-[3px] border-l-transparent",
                  isUrgent && selected !== conv.id && "bg-red-50/50 dark:bg-red-950/10",
                )}
              >
                <div className="flex gap-2.5">
                  <div className="relative shrink-0">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className={cn(
                        "text-xs font-bold",
                        isVIP ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : "bg-primary/10 text-primary"
                      )}>
                        {getInitials(conv.client_name || "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card", status.dotClass)} />
                    {isVIP && (
                      <Crown className="absolute -top-1 -right-1 w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={cn("text-sm font-semibold truncate", conv.unread_count > 0 ? "text-foreground" : "text-foreground/80")}>
                        {conv.client_name}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                        {formatMessageTime(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className={cn("text-[12px] truncate max-w-[170px]", conv.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>
                        {conv.last_message_preview}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="ml-1.5 shrink-0 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-semibold", funnel.color)}>
                        {funnel.label}
                      </span>
                      {conv.tags.slice(0, 2).map(tag => (
                        <span key={tag} className={cn("px-1.5 py-0.5 rounded text-[9px] font-medium", TAG_COLORS[tag] || "bg-muted text-muted-foreground")}>
                          {tag}
                        </span>
                      ))}
                      {conv.assigned_name && (
                        <span className="text-[9px] text-muted-foreground/60 ml-auto">
                          {conv.assigned_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── CONTEXT BAR ───
function ContextBar({ conversation }: { conversation: Conversation }) {
  const isVIP = conversation.level?.includes("VIP");
  return (
    <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center gap-4 overflow-x-auto text-[11px]">
      {isVIP && (
        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold shrink-0">
          <Crown className="w-3 h-3 fill-current" /> VIP
        </span>
      )}
      {conversation.score !== undefined && (
        <span className="flex items-center gap-1 text-muted-foreground shrink-0">
          <Target className="w-3 h-3" /> Score: <strong className="text-foreground">{conversation.score}</strong>
        </span>
      )}
      {conversation.cluster && (
        <span className="flex items-center gap-1 text-muted-foreground shrink-0">
          <Users className="w-3 h-3" /> {conversation.cluster}
        </span>
      )}
      {conversation.totalSpent !== undefined && conversation.totalSpent > 0 && (
        <span className="flex items-center gap-1 text-muted-foreground shrink-0">
          <DollarSign className="w-3 h-3" /> R$ {conversation.totalSpent.toLocaleString("pt-BR")}
        </span>
      )}
      {conversation.tripCount !== undefined && conversation.tripCount > 0 && (
        <span className="flex items-center gap-1 text-muted-foreground shrink-0">
          <Plane className="w-3 h-3" /> {conversation.tripCount} viagens
        </span>
      )}
      {conversation.avgMargin !== undefined && conversation.avgMargin > 0 && (
        <span className="flex items-center gap-1 text-muted-foreground shrink-0">
          <TrendingUp className="w-3 h-3" /> Margem {conversation.avgMargin}%
        </span>
      )}
      {conversation.nextTrip && (
        <span className="flex items-center gap-1 text-muted-foreground shrink-0">
          <Clock className="w-3 h-3" /> Próx: {conversation.nextTrip}
        </span>
      )}
      {conversation.favoriteDestination && (
        <span className="flex items-center gap-1 text-muted-foreground shrink-0">
          <MapPin className="w-3 h-3" /> {conversation.favoriteDestination}
        </span>
      )}
      {conversation.pendencies && (
        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium shrink-0">
          <AlertTriangle className="w-3 h-3" /> {conversation.pendencies}
        </span>
      )}
    </div>
  );
}

// ─── AI SUGGESTION CARD ───
function AISuggestionCard({
  suggestion, onSend, onEdit, onRegenerate, onDismiss,
}: {
  suggestion: AISuggestion;
  onSend: () => void;
  onEdit: () => void;
  onRegenerate: () => void;
  onDismiss: () => void;
}) {
  if (suggestion.loading) {
    return (
      <div className="mx-3 mb-2 p-3 rounded-xl border border-primary/20 bg-primary/5 animate-pulse">
        <div className="flex items-center gap-2 text-primary text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 animate-spin" />
          NatLeva Intelligence analisando...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-3 mb-2 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-primary/10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-bold text-primary">Sugestão NatLeva Intelligence</span>
        </div>
        <div className="flex items-center gap-1.5">
          {suggestion.intent && (
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
              {suggestion.intent.replace(/_/g, " ")}
            </Badge>
          )}
          {suggestion.urgency === "alta" || suggestion.urgency === "critica" ? (
            <Badge variant="destructive" className="text-[9px] h-4 px-1.5">
              {suggestion.urgency}
            </Badge>
          ) : null}
          <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2">
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{suggestion.suggestion}</p>
        {suggestion.reasoning && (
          <p className="text-[10px] text-muted-foreground mt-2 italic">💡 {suggestion.reasoning}</p>
        )}
        {suggestion.tags.length > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <Tag className="w-3 h-3 text-muted-foreground" />
            {suggestion.tags.map(t => (
              <span key={t} className={cn("px-1.5 py-0.5 rounded text-[9px] font-medium", TAG_COLORS[t] || "bg-muted text-muted-foreground")}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-3 py-2 flex items-center gap-2 border-t border-primary/10 bg-primary/[0.02]">
        <Button size="sm" className="h-7 text-xs gap-1.5" onClick={onSend}>
          <Send className="w-3 h-3" /> Enviar
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={onEdit}>
          <Edit3 className="w-3 h-3" /> Editar
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5" onClick={onRegenerate}>
          <RefreshCw className="w-3 h-3" /> Regerar
        </Button>
      </div>
    </div>
  );
}

// ─── CHAT WINDOW ───
function ChatWindow({
  conversation, messages, onSend, onBack,
  aiSuggestion, onAISuggest, onAISend, onAIEdit, onAIDismiss,
  onSendAttachment,
}: {
  conversation: Conversation | null;
  messages: Message[];
  onSend: (text: string) => void;
  onBack?: () => void;
  aiSuggestion: AISuggestion | null;
  onAISuggest: () => void;
  onAISend: () => void;
  onAIEdit: () => void;
  onAIDismiss: () => void;
  onSendAttachment?: (file: File) => void;
}) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [attachPreview, setAttachPreview] = useState<{ file: File; url: string } | null>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, aiSuggestion]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const lineHeight = 20;
    const maxLines = 8;
    const maxHeight = lineHeight * maxLines;
    ta.style.height = Math.min(ta.scrollHeight, maxHeight) + "px";
    ta.style.overflowY = ta.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [text]);

  // Close emoji on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    if (showEmoji) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmoji]);

  const noConversation = !conversation;

  if (noConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-muted/10 text-muted-foreground gap-4">
        <div className="w-20 h-20 rounded-2xl bg-primary/5 flex items-center justify-center">
          <MessageSquare className="w-10 h-10 text-primary/20" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground/60">LiveChat NatLeva</p>
          <p className="text-sm mt-1">Selecione uma conversa para começar o atendimento</p>
        </div>
      </div>
    );
  }

  const status = STATUS_MAP[conversation.status] || STATUS_MAP.novo;

  const handleSend = () => {
    if (!text.trim() || sending) return;
    setSending(true);
    onSend(text.trim());
    setText("");
    setSending(false);
    textareaRef.current?.focus();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo: 20MB");
      return;
    }
    const url = URL.createObjectURL(file);
    setAttachPreview({ file, url });
    e.target.value = "";
  };

  const handleSendAttachment = () => {
    if (!attachPreview) return;
    onSendAttachment?.(attachPreview.file);
    // Also add as a message locally
    onSend(`📎 ${attachPreview.file.name}`);
    URL.revokeObjectURL(attachPreview.url);
    setAttachPreview(null);
  };

  const handleEmojiSelect = (emoji: any) => {
    const ta = textareaRef.current;
    if (!ta) {
      setText(prev => prev + emoji.native);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newText = text.slice(0, start) + emoji.native + text.slice(end);
    setText(newText);
    // Restore cursor after emoji
    requestAnimationFrame(() => {
      const pos = start + emoji.native.length;
      ta.selectionStart = ta.selectionEnd = pos;
      ta.focus();
    });
  };

  const handleComingSoon = (feature: string) => {
    toast.info(`${feature} — integração em breve!`, { duration: 2000 });
  };

  return (
    <div className="flex-1 flex flex-col bg-background min-w-0">
      {/* Chat Header */}
      <div className="h-14 px-3 flex items-center justify-between border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {isMobile && onBack && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {getInitials(conversation.client_name || "?")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold truncate">{conversation.client_name}</p>
              {conversation.level?.includes("VIP") && <Crown className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
            </div>
            <div className="flex items-center gap-1.5">
              <div className={cn("w-1.5 h-1.5 rounded-full", status.dotClass)} />
              <span className="text-[10px] text-muted-foreground">{status.label}</span>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className={cn("text-[10px] font-medium", FUNNEL_MAP[conversation.funnel_stage]?.color?.split(" ").filter(c => c.startsWith("text-")).join(" "))}>
                {FUNNEL_MAP[conversation.funnel_stage]?.label}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {!isMobile && (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleComingSoon("Chamada de voz")} title="Chamada de voz"><Phone className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleComingSoon("Videochamada")} title="Videochamada"><Video className="w-4 h-4" /></Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem><Tag className="w-4 h-4 mr-2" />Gerenciar tags</DropdownMenuItem>
              <DropdownMenuItem><ArrowRight className="w-4 h-4 mr-2" />Transferir conversa</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem><Check className="w-4 h-4 mr-2" />Marcar resolvido</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Context Bar */}
      {!isMobile && <ContextBar conversation={conversation} />}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.02'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0V12h20V10H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v20.5z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      >
        <div className="flex items-center justify-center mb-2">
          <span className="px-3 py-1 rounded-full bg-muted/80 text-[10px] text-muted-foreground font-medium">Hoje</span>
        </div>
        {messages.map(msg => {
          const isClient = msg.sender_type === "cliente";
          return (
            <div key={msg.id} className={cn("flex", isClient ? "justify-start" : "justify-end")}>
              <div className={cn(
                "max-w-[80%] sm:max-w-[70%] px-3 py-2 rounded-2xl shadow-sm",
                isClient
                  ? "bg-card border border-border rounded-bl-sm"
                  : "bg-primary text-primary-foreground rounded-br-sm"
              )}>
                <p className="text-[13px] whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <div className={cn("flex items-center justify-end gap-1 mt-0.5", isClient ? "text-muted-foreground/60" : "text-primary-foreground/50")}>
                  <span className="text-[9px]">{format(new Date(msg.created_at), "HH:mm")}</span>
                  {!isClient && (
                    msg.read_status === "read"
                      ? <CheckCheck className="w-3 h-3" />
                      : <Check className="w-3 h-3" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Suggestion */}
      {aiSuggestion && (
        <AISuggestionCard
          suggestion={aiSuggestion}
          onSend={onAISend}
          onEdit={() => {
            setText(aiSuggestion.suggestion);
            onAIEdit();
            textareaRef.current?.focus();
          }}
          onRegenerate={onAISuggest}
          onDismiss={onAIDismiss}
        />
      )}

      {/* Attachment Preview */}
      {attachPreview && (
        <div className="mx-3 mb-2 p-3 rounded-xl border border-border bg-card flex items-center gap-3">
          {attachPreview.file.type.startsWith("image/") ? (
            <img src={attachPreview.url} alt="preview" className="w-16 h-16 rounded-lg object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-foreground">{attachPreview.file.name}</p>
            <p className="text-[11px] text-muted-foreground">{(attachPreview.file.size / 1024).toFixed(0)} KB</p>
          </div>
          <Button size="sm" className="h-8 gap-1.5" onClick={handleSendAttachment}>
            <Send className="w-3 h-3" /> Enviar
          </Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => { URL.revokeObjectURL(attachPreview.url); setAttachPreview(null); }}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-2.5 border-t border-border bg-card shrink-0 sticky bottom-0">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
          onChange={handleFileSelect}
        />

        {/* Emoji Picker */}
        {showEmoji && (
          <div ref={emojiRef} className="absolute bottom-16 left-2 z-50 shadow-xl rounded-xl overflow-hidden">
            <EmojiPicker onSelect={handleEmojiSelect} />
          </div>
        )}

        <div className="flex items-end gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-9 w-9 shrink-0 transition-colors", showEmoji ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground")}
            onClick={() => setShowEmoji(!showEmoji)}
            title="Emojis"
          >
            <Smile className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => fileInputRef.current?.click()}
            title="Anexar arquivo"
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              placeholder="Digite uma mensagem..."
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className={cn(
                "w-full resize-none text-sm rounded-xl px-3 py-2.5 leading-5",
                "bg-muted/50 border-0 focus:ring-1 focus:ring-primary/30 focus:outline-none",
                "placeholder:text-muted-foreground",
                "transition-all duration-150"
              )}
              style={{ minHeight: "40px", maxHeight: "160px", overflowY: "hidden" }}
              rows={1}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-primary hover:bg-primary/10"
            onClick={onAISuggest}
            disabled={!conversation || messages.length === 0}
            title="Sugerir resposta com IA"
          >
            <Sparkles className="w-5 h-5" />
          </Button>
          {text.trim() ? (
            <Button
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full shadow-sm"
              onClick={handleSend}
              disabled={sending}
            >
              <Send className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => handleComingSoon("Gravação de áudio")}
              title="Gravar áudio"
            >
              <Mic className="w-5 h-5" />
            </Button>
          )}
        </div>
        <p className="text-[9px] text-muted-foreground/50 mt-1 ml-1">
          Enter envia · Shift+Enter quebra linha
        </p>
      </div>
    </div>
  );
}

// ─── EMOJI PICKER (lightweight) ───
function EmojiPicker({ onSelect }: { onSelect: (emoji: { native: string }) => void }) {
  const emojis = [
    "😊", "😍", "🥰", "😎", "🤩", "👍", "👏", "🙏", "❤️", "🔥",
    "✈️", "🏖️", "🌍", "🗺️", "🏨", "🎉", "💰", "📞", "📧", "📎",
    "✅", "⚠️", "🚀", "💎", "🌟", "🎯", "📋", "🔗", "👋", "😄",
    "🤔", "😢", "🙌", "💪", "🎁", "📱", "💬", "🔔", "⏰", "📍",
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-3 w-[280px]">
      <p className="text-[10px] text-muted-foreground mb-2 font-medium">Emojis Rápidos</p>
      <div className="grid grid-cols-10 gap-1">
        {emojis.map(e => (
          <button
            key={e}
            onClick={() => onSelect({ native: e })}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted transition-colors text-base"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── CLIENT PANEL ───
function ClientPanel({ conversation, onClose }: { conversation: Conversation | null; onClose?: () => void }) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (!conversation) return null;

  const isVIP = conversation.level?.includes("VIP");
  const mockSales = [
    { id: "V-2026-045", dest: "Dubai", date: "15/03/2026", value: "R$ 18.500", status: "Confirmado" },
    { id: "V-2025-198", dest: "Paris", date: "10/07/2025", value: "R$ 12.300", status: "Concluído" },
    { id: "V-2025-089", dest: "Cancún", date: "02/01/2025", value: "R$ 9.200", status: "Concluído" },
  ];

  return (
    <div className={cn(
      "border-l border-border bg-card h-full flex flex-col shrink-0 overflow-hidden",
      isMobile ? "w-full" : "w-[280px]"
    )}>
      {isMobile && onClose && (
        <div className="p-2 border-b border-border flex justify-end">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
      <ScrollArea className="flex-1">
        {/* Profile */}
        <div className="p-4 text-center border-b border-border">
          <Avatar className="h-14 w-14 mx-auto mb-2">
            <AvatarFallback className={cn(
              "text-lg font-bold",
              isVIP ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : "bg-primary/10 text-primary"
            )}>
              {getInitials(conversation.client_name || "?")}
            </AvatarFallback>
          </Avatar>
          <h3 className="font-bold text-foreground text-sm">{conversation.client_name}</h3>
          <p className="text-[11px] text-muted-foreground">{conversation.phone}</p>
          <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
            {isVIP && <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[9px] h-5"><Crown className="w-2.5 h-2.5 mr-0.5" /> VIP</Badge>}
            {conversation.cluster && <Badge variant="secondary" className="text-[9px] h-5">{conversation.cluster}</Badge>}
          </div>
        </div>

        {/* Score + Metrics */}
        <div className="p-3 border-b border-border">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-base font-bold text-foreground">{conversation.score ?? 0}</p>
              <p className="text-[9px] text-muted-foreground">Score</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-base font-bold text-foreground">{conversation.tripCount ?? 0}</p>
              <p className="text-[9px] text-muted-foreground">Viagens</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-base font-bold text-foreground">{conversation.avgMargin ?? 0}%</p>
              <p className="text-[9px] text-muted-foreground">Margem</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="p-2 rounded-lg bg-muted/50">
              <DollarSign className="w-3 h-3 text-muted-foreground mb-0.5" />
              <p className="text-[11px] font-bold text-foreground">R$ {(conversation.totalSpent ?? 0).toLocaleString("pt-BR")}</p>
              <p className="text-[9px] text-muted-foreground">Total gasto</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50">
              <TrendingUp className="w-3 h-3 text-muted-foreground mb-0.5" />
              <p className="text-[11px] font-bold text-foreground">R$ {(conversation.avgTicket ?? 0).toLocaleString("pt-BR")}</p>
              <p className="text-[9px] text-muted-foreground">Ticket médio</p>
            </div>
          </div>
        </div>

        {/* Sales */}
        <div className="p-3 border-b border-border">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Vendas Recentes</h4>
          <div className="space-y-1.5">
            {mockSales.map(s => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                <div>
                  <p className="text-[11px] font-semibold text-foreground">{s.id}</p>
                  <p className="text-[9px] text-muted-foreground">{s.dest} · {s.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-foreground">{s.value}</p>
                  <p className="text-[9px] text-muted-foreground">{s.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pendencias */}
        {conversation.pendencies && (
          <div className="p-3 border-b border-border">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Pendências</h4>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-[11px] text-amber-800 dark:text-amber-300">{conversation.pendencies}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-3 space-y-1.5">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Ações</h4>
          <Button variant="outline" size="sm" className="w-full justify-start text-[11px] h-8" onClick={() => navigate("/sales/new")}>
            <ShoppingCart className="w-3.5 h-3.5 mr-2" />Criar venda
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start text-[11px] h-8">
            <ExternalLink className="w-3.5 h-3.5 mr-2" />Perfil completo
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start text-[11px] h-8">
            <FileText className="w-3.5 h-3.5 mr-2" />Criar tarefa
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── MAIN PAGE ───
export default function LiveChat() {
  const [conversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [filter, setFilter] = useState("todas");
  const [search, setSearch] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat" | "panel">("list");
  const isMobile = useIsMobile();

  const selectedConv = conversations.find(c => c.id === selectedId) || null;

  useEffect(() => {
    if (selectedId) {
      setMessages(generateMockMessages(selectedId));
      setAiSuggestion(null);
    }
  }, [selectedId]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    if (isMobile) setMobileView("chat");
  };

  const handleSend = (text: string) => {
    const newMsg: Message = {
      id: `new-${Date.now()}`,
      conversation_id: selectedId!,
      sender_type: "atendente",
      message_type: "text",
      content: text,
      read_status: "sent",
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newMsg]);
  };

  const handleAISuggest = useCallback(async () => {
    if (!selectedConv || messages.length === 0) return;

    setAiSuggestion({ suggestion: "", intent: "", destination: null, urgency: "normal", tags: [], funnel_stage: "novo_lead", reasoning: "", loading: true });

    try {
      const chatMessages = messages.slice(-8).map(m => ({
        role: m.sender_type === "cliente" ? "user" as const : "assistant" as const,
        content: m.content || "",
      }));

      const { data, error } = await supabase.functions.invoke("livechat-ai", {
        body: {
          messages: chatMessages,
          clientContext: {
            name: selectedConv.client_name,
            score: selectedConv.score,
            cluster: selectedConv.cluster,
            level: selectedConv.level,
            totalSpent: selectedConv.totalSpent,
            tripCount: selectedConv.tripCount,
            avgTicket: selectedConv.avgTicket,
            avgMargin: selectedConv.avgMargin,
            lastPurchase: selectedConv.lastPurchase,
            favoriteDestination: selectedConv.favoriteDestination,
            pendencies: selectedConv.pendencies,
          },
        },
      });

      if (error) throw error;

      setAiSuggestion({
        suggestion: data.suggestion || "Não foi possível gerar sugestão.",
        intent: data.intent || "outro",
        destination: data.destination,
        urgency: data.urgency || "normal",
        tags: data.tags || [],
        funnel_stage: data.funnel_stage || "novo_lead",
        reasoning: data.reasoning || "",
      });
    } catch (err: any) {
      console.error("AI suggest error:", err);
      toast.error("Erro ao gerar sugestão da IA");
      setAiSuggestion(null);
    }
  }, [selectedConv, messages]);

  const handleAISend = () => {
    if (aiSuggestion?.suggestion) {
      handleSend(aiSuggestion.suggestion);
      setAiSuggestion(null);
    }
  };

  const handleAIEdit = () => {
    // Text is set in ChatWindow onEdit callback
    setAiSuggestion(null);
  };

  // Mobile Layout
  if (isMobile) {
    if (mobileView === "list") {
      return (
        <div className="h-[calc(100vh-64px)]">
          <ConversationList
            conversations={conversations}
            selected={selectedId}
            onSelect={handleSelect}
            filter={filter}
            onFilterChange={setFilter}
            search={search}
            onSearchChange={setSearch}
          />
        </div>
      );
    }

    if (mobileView === "panel" && selectedConv) {
      return (
        <div className="h-[calc(100vh-64px)]">
          <ClientPanel conversation={selectedConv} onClose={() => setMobileView("chat")} />
        </div>
      );
    }

    return (
      <div className="h-[calc(100vh-64px)] flex flex-col">
        <ChatWindow
          conversation={selectedConv}
          messages={messages}
          onSend={handleSend}
          onBack={() => setMobileView("list")}
          aiSuggestion={aiSuggestion}
          onAISuggest={handleAISuggest}
          onAISend={handleAISend}
          onAIEdit={handleAIEdit}
          onAIDismiss={() => setAiSuggestion(null)}
          onSendAttachment={(file) => toast.info(`Arquivo "${file.name}" será enviado quando integração estiver ativa.`)}
        />
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      <div className="w-[320px] shrink-0">
        <ConversationList
          conversations={conversations}
          selected={selectedId}
          onSelect={handleSelect}
          filter={filter}
          onFilterChange={setFilter}
          search={search}
          onSearchChange={setSearch}
        />
      </div>
      <ChatWindow
        conversation={selectedConv}
        messages={messages}
        onSend={handleSend}
        aiSuggestion={aiSuggestion}
        onAISuggest={handleAISuggest}
        onAISend={handleAISend}
        onAIEdit={handleAIEdit}
        onAIDismiss={() => setAiSuggestion(null)}
        onSendAttachment={(file) => toast.info(`Arquivo "${file.name}" será enviado quando integração estiver ativa.`)}
      />
      <ClientPanel conversation={selectedConv} />
    </div>
  );
}
