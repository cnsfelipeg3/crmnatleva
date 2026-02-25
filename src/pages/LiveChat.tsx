import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Search, Send, Paperclip, Smile, Mic, Sparkles, Phone, Video, MoreVertical,
  User, Plus, Tag, ArrowRight, MessageSquare, Clock, CheckCheck, Check,
  Filter, X, ChevronRight, Star, AlertTriangle, Plane, DollarSign,
  Settings, Image, FileText, Play, Circle, ShoppingCart, ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";

// Types
interface Conversation {
  id: string;
  client_id: string | null;
  assigned_to: string | null;
  status: string;
  tags: string[];
  last_message_at: string;
  last_message_preview: string | null;
  unread_count: number;
  phone: string | null;
  client_name?: string;
  assigned_name?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_id: string | null;
  message_type: string;
  content: string | null;
  media_url: string | null;
  read_status: string;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  novo: { label: "Novo", color: "bg-blue-500" },
  em_atendimento: { label: "Em atendimento", color: "bg-emerald-500" },
  aguardando_cliente: { label: "Aguardando", color: "bg-amber-500" },
  resolvido: { label: "Resolvido", color: "bg-muted-foreground/50" },
};

const TAG_COLORS: Record<string, string> = {
  VIP: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  Urgente: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  Dubai: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  Europa: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Família: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function formatMessageTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Ontem";
  return format(d, "dd/MM");
}

// ─── MOCK DATA ───
const MOCK_CONVERSATIONS: Conversation[] = [
  { id: "1", client_id: null, assigned_to: null, status: "novo", tags: ["VIP", "Dubai"], last_message_at: new Date().toISOString(), last_message_preview: "Oi, quero saber sobre o pacote para Dubai em março!", unread_count: 3, phone: "+5511999887766", client_name: "Ana Carolina Silva", assigned_name: "Mariana" },
  { id: "2", client_id: null, assigned_to: null, status: "em_atendimento", tags: ["Europa"], last_message_at: new Date(Date.now() - 1800000).toISOString(), last_message_preview: "Perfeito! Vou enviar os documentos agora.", unread_count: 0, phone: "+5521988776655", client_name: "João Pedro Santos", assigned_name: "Carlos" },
  { id: "3", client_id: null, assigned_to: null, status: "aguardando_cliente", tags: ["Família"], last_message_at: new Date(Date.now() - 7200000).toISOString(), last_message_preview: "Estou aguardando a confirmação do hotel.", unread_count: 0, phone: "+5531977665544", client_name: "Maria Fernanda Costa", assigned_name: "Mariana" },
  { id: "4", client_id: null, assigned_to: null, status: "novo", tags: ["Urgente"], last_message_at: new Date(Date.now() - 300000).toISOString(), last_message_preview: "Preciso remarcar meu voo urgente!", unread_count: 5, phone: "+5511966554433", client_name: "Rafael Oliveira", assigned_name: undefined },
  { id: "5", client_id: null, assigned_to: null, status: "resolvido", tags: [], last_message_at: new Date(Date.now() - 86400000).toISOString(), last_message_preview: "Obrigado pelo atendimento! 😊", unread_count: 0, phone: "+5521955443322", client_name: "Beatriz Almeida", assigned_name: "Carlos" },
];

function generateMockMessages(convId: string): Message[] {
  const now = Date.now();
  if (convId === "1") return [
    { id: "m1", conversation_id: "1", sender_type: "cliente", sender_id: null, message_type: "text", content: "Olá! Boa tarde! 😊", media_url: null, read_status: "read", created_at: new Date(now - 3600000).toISOString() },
    { id: "m2", conversation_id: "1", sender_type: "atendente", sender_id: null, message_type: "text", content: "Olá Ana! Boa tarde! Seja bem-vinda à NatLeva Turismo. Como posso ajudá-la hoje?", media_url: null, read_status: "read", created_at: new Date(now - 3500000).toISOString() },
    { id: "m3", conversation_id: "1", sender_type: "cliente", sender_id: null, message_type: "text", content: "Quero saber sobre o pacote para Dubai em março! Vi no Instagram de vocês e achei incrível.", media_url: null, read_status: "read", created_at: new Date(now - 3400000).toISOString() },
    { id: "m4", conversation_id: "1", sender_type: "atendente", sender_id: null, message_type: "text", content: "Que ótimo gosto! Dubai em março é maravilhoso. Temos pacotes a partir de 7 dias com hospedagem no Atlantis ou JW Marriott. Quantas pessoas iriam?", media_url: null, read_status: "read", created_at: new Date(now - 3300000).toISOString() },
    { id: "m5", conversation_id: "1", sender_type: "cliente", sender_id: null, message_type: "text", content: "Oi, quero saber sobre o pacote para Dubai em março!", media_url: null, read_status: "delivered", created_at: new Date(now - 60000).toISOString() },
  ];
  if (convId === "4") return [
    { id: "m10", conversation_id: "4", sender_type: "cliente", sender_id: null, message_type: "text", content: "Preciso remarcar meu voo urgente! O voo é amanhã e tive um imprevisto.", media_url: null, read_status: "delivered", created_at: new Date(now - 300000).toISOString() },
    { id: "m11", conversation_id: "4", sender_type: "cliente", sender_id: null, message_type: "text", content: "Alguém pode me ajudar por favor??", media_url: null, read_status: "delivered", created_at: new Date(now - 240000).toISOString() },
  ];
  return [
    { id: `m-${convId}-1`, conversation_id: convId, sender_type: "cliente", sender_id: null, message_type: "text", content: "Olá!", media_url: null, read_status: "read", created_at: new Date(now - 7200000).toISOString() },
    { id: `m-${convId}-2`, conversation_id: convId, sender_type: "atendente", sender_id: null, message_type: "text", content: "Olá! Como posso ajudar?", media_url: null, read_status: "read", created_at: new Date(now - 7100000).toISOString() },
  ];
}

// ─── COMPONENTS ───

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
  const filtered = conversations.filter(c => {
    if (search) {
      const q = search.toLowerCase();
      if (!c.client_name?.toLowerCase().includes(q) && !c.phone?.includes(q)) return false;
    }
    if (filter === "nao_lidas") return c.unread_count > 0;
    if (filter === "vip") return c.tags.includes("VIP");
    if (filter === "novo") return c.status === "novo";
    return true;
  });

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            LiveChat
          </h2>
          <Button size="icon" variant="ghost" className="h-8 w-8">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="px-3 py-2 border-b border-border">
        <ScrollArea className="w-full" style={{ overflowX: "auto" }}>
          <div className="flex gap-1.5 pb-1">
            {[
              { key: "todas", label: "Todas" },
              { key: "nao_lidas", label: "Não lidas" },
              { key: "vip", label: "VIP" },
              { key: "novo", label: "Novos" },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => onFilterChange(f.key)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                  filter === f.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {filtered.map(conv => {
            const status = STATUS_MAP[conv.status] || STATUS_MAP.novo;
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  "w-full text-left p-3 hover:bg-accent/50 transition-colors relative",
                  selected === conv.id && "bg-accent"
                )}
              >
                <div className="flex gap-3">
                  <div className="relative">
                    <Avatar className="h-11 w-11">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {getInitials(conv.client_name || "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card", status.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={cn("text-sm font-semibold truncate", conv.unread_count > 0 && "text-foreground")}>
                        {conv.client_name}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                        {formatMessageTime(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className={cn("text-xs truncate max-w-[180px]", conv.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>
                        {conv.last_message_preview}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="ml-2 shrink-0 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    {conv.tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {conv.tags.slice(0, 3).map(tag => (
                          <span key={tag} className={cn("px-1.5 py-0.5 rounded text-[9px] font-semibold", TAG_COLORS[tag] || "bg-muted text-muted-foreground")}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Nenhuma conversa encontrada
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function ChatWindow({
  conversation, messages, onSend, onAISuggest,
}: {
  conversation: Conversation | null;
  messages: Message[];
  onSend: (text: string) => void;
  onAISuggest: () => void;
}) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-muted/20 text-muted-foreground gap-3">
        <MessageSquare className="w-16 h-16 opacity-20" />
        <p className="text-lg font-medium">Selecione uma conversa</p>
        <p className="text-sm">Escolha uma conversa ao lado para começar</p>
      </div>
    );
  }

  const status = STATUS_MAP[conversation.status] || STATUS_MAP.novo;

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <div className="flex-1 flex flex-col bg-background min-w-0">
      {/* Chat Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {getInitials(conversation.client_name || "?")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{conversation.client_name}</p>
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", status.color)} />
              <span className="text-[11px] text-muted-foreground">{status.label}</span>
              {conversation.phone && <span className="text-[11px] text-muted-foreground">· {conversation.phone}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8"><Phone className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8"><Video className="w-4 h-4" /></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem><Tag className="w-4 h-4 mr-2" />Gerenciar tags</DropdownMenuItem>
              <DropdownMenuItem><ArrowRight className="w-4 h-4 mr-2" />Transferir conversa</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem><Check className="w-4 h-4 mr-2" />Marcar como resolvido</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}>
        {messages.map(msg => {
          const isClient = msg.sender_type === "cliente";
          return (
            <div key={msg.id} className={cn("flex", isClient ? "justify-start" : "justify-end")}>
              <div className={cn(
                "max-w-[75%] px-3.5 py-2 rounded-2xl shadow-sm",
                isClient
                  ? "bg-card border border-border rounded-bl-md"
                  : "bg-primary text-primary-foreground rounded-br-md"
              )}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <div className={cn("flex items-center justify-end gap-1 mt-1", isClient ? "text-muted-foreground" : "text-primary-foreground/60")}>
                  <span className="text-[10px]">{format(new Date(msg.created_at), "HH:mm")}</span>
                  {!isClient && (
                    msg.read_status === "read"
                      ? <CheckCheck className="w-3.5 h-3.5" />
                      : <Check className="w-3.5 h-3.5" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-card shrink-0">
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0"><Smile className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0"><Paperclip className="w-5 h-5" /></Button>
          <div className="flex-1 relative">
            <Textarea
              placeholder="Digite uma mensagem..."
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              className="min-h-[40px] max-h-[120px] resize-none pr-10 text-sm"
              rows={1}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-primary hover:text-primary"
            onClick={onAISuggest}
            title="Sugerir resposta com IA"
          >
            <Sparkles className="w-5 h-5" />
          </Button>
          {text.trim() ? (
            <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSend}>
              <Send className="w-4 h-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0"><Mic className="w-5 h-5" /></Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ClientPanel({ conversation }: { conversation: Conversation | null }) {
  const navigate = useNavigate();

  if (!conversation) return null;

  const mockSales = [
    { id: "V-2026-045", dest: "Dubai", date: "15/03/2026", value: "R$ 18.500" },
    { id: "V-2025-198", dest: "Paris", date: "10/07/2025", value: "R$ 12.300" },
  ];

  return (
    <div className="w-[300px] border-l border-border bg-card h-full flex flex-col shrink-0 overflow-hidden">
      <ScrollArea className="flex-1">
        {/* Profile Header */}
        <div className="p-4 text-center border-b border-border">
          <Avatar className="h-16 w-16 mx-auto mb-3">
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
              {getInitials(conversation.client_name || "?")}
            </AvatarFallback>
          </Avatar>
          <h3 className="font-bold text-foreground">{conversation.client_name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{conversation.phone}</p>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {conversation.tags.map(tag => (
              <Badge key={tag} variant="secondary" className={cn("text-[10px]", TAG_COLORS[tag])}>
                {tag}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">85</p>
              <p className="text-[10px] text-muted-foreground">Score</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">A</p>
              <p className="text-[10px] text-muted-foreground">Cluster</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-lg font-bold text-primary">VIP</p>
              <p className="text-[10px] text-muted-foreground">Nível</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="p-4 space-y-3 border-b border-border">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resumo</h4>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Total gasto", value: "R$ 45.800", icon: DollarSign },
              { label: "Viagens", value: "4", icon: Plane },
              { label: "Próxima", value: "15/03", icon: Clock },
              { label: "Margem média", value: "18%", icon: Star },
            ].map(s => (
              <div key={s.label} className="bg-muted/50 rounded-lg p-2.5">
                <s.icon className="w-3.5 h-3.5 text-muted-foreground mb-1" />
                <p className="text-xs font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sales */}
        <div className="p-4 space-y-2 border-b border-border">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Últimas Vendas</h4>
          {mockSales.map(s => (
            <div key={s.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
              <div>
                <p className="text-xs font-semibold text-foreground">{s.id}</p>
                <p className="text-[10px] text-muted-foreground">{s.dest} · {s.date}</p>
              </div>
              <span className="text-xs font-bold text-foreground">{s.value}</span>
            </div>
          ))}
        </div>

        {/* Pendencias */}
        <div className="p-4 space-y-2 border-b border-border">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pendências</h4>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/10">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs text-amber-800 dark:text-amber-300">Passaporte vence em 4 meses</span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Ações Rápidas</h4>
          <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8" onClick={() => navigate("/sales/new")}>
            <ShoppingCart className="w-3.5 h-3.5 mr-2" />Criar venda
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8">
            <ExternalLink className="w-3.5 h-3.5 mr-2" />Abrir perfil completo
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8">
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
  const [showPanel, setShowPanel] = useState(true);

  const selectedConv = conversations.find(c => c.id === selectedId) || null;

  useEffect(() => {
    if (selectedId) {
      setMessages(generateMockMessages(selectedId));
    }
  }, [selectedId]);

  const handleSend = (text: string) => {
    const newMsg: Message = {
      id: `new-${Date.now()}`,
      conversation_id: selectedId!,
      sender_type: "atendente",
      sender_id: null,
      message_type: "text",
      content: text,
      media_url: null,
      read_status: "sent",
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newMsg]);
  };

  const handleAISuggest = () => {
    toast.info("IA analisando contexto da conversa...", { duration: 2000 });
    setTimeout(() => {
      toast.success("Sugestão gerada! Verifique o campo de texto.", { duration: 3000 });
    }, 2000);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Column 1: Conversations */}
      <div className="w-[320px] shrink-0">
        <ConversationList
          conversations={conversations}
          selected={selectedId}
          onSelect={setSelectedId}
          filter={filter}
          onFilterChange={setFilter}
          search={search}
          onSearchChange={setSearch}
        />
      </div>

      {/* Column 2: Chat */}
      <ChatWindow
        conversation={selectedConv}
        messages={messages}
        onSend={handleSend}
        onAISuggest={handleAISuggest}
      />

      {/* Column 3: Client Panel */}
      {showPanel && <ClientPanel conversation={selectedConv} />}
    </div>
  );
}
