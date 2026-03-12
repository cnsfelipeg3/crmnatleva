import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Search, MessageSquare, Clock, User, ChevronRight, Filter, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  contact_name: string | null;
  display_name: string | null;
  phone: string | null;
  status: string;
  funnel_stage: string | null;
  stage: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number | null;
  tags: string[] | null;
  source: string | null;
}

interface Message {
  id: string;
  text: string | null;
  sender_type: string;
  created_at: string;
  message_type: string;
  media_url: string | null;
}

const stageLabels: Record<string, string> = {
  novo_lead: "Novo Lead",
  qualificacao: "Qualificação",
  proposta_preparacao: "Proposta",
  proposta_enviada: "Proposta Enviada",
  negociacao: "Negociação",
  fechado: "Fechado",
  pos_venda: "Pós-Venda",
  perdido: "Perdido",
};

const stageColors: Record<string, string> = {
  novo_lead: "bg-blue-500/20 text-blue-400",
  qualificacao: "bg-amber-500/20 text-amber-400",
  proposta_preparacao: "bg-purple-500/20 text-purple-400",
  proposta_enviada: "bg-indigo-500/20 text-indigo-400",
  negociacao: "bg-orange-500/20 text-orange-400",
  fechado: "bg-emerald-500/20 text-emerald-400",
  pos_venda: "bg-teal-500/20 text-teal-400",
  perdido: "bg-red-500/20 text-red-400",
};

export default function OperacaoInbox() {
  const isMobile = useIsMobile();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("conversations")
      .select("id, contact_name, display_name, phone, status, funnel_stage, stage, last_message_at, last_message_preview, unread_count, tags, source")
      .order("last_message_at", { ascending: false })
      .limit(500);
    setConversations(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const filtered = useMemo(() => {
    let list = conversations;
    if (stageFilter !== "all") list = list.filter(c => (c.funnel_stage || c.stage) === stageFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        (c.contact_name || "").toLowerCase().includes(q) ||
        (c.display_name || "").toLowerCase().includes(q) ||
        (c.phone || "").includes(q)
      );
    }
    return list;
  }, [conversations, search, stageFilter]);

  const loadMessages = async (conv: Conversation) => {
    setSelectedConv(conv);
    setLoadingMsgs(true);
    const { data } = await supabase
      .from("messages")
      .select("id, text, sender_type, created_at, message_type, media_url")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages(data || []);
    setLoadingMsgs(false);
  };

  const getName = (c: Conversation) => c.contact_name || c.display_name || c.phone || "Sem nome";

  // Mobile: show list or chat
  const showList = !isMobile || !selectedConv;
  const showChat = !isMobile || !!selectedConv;

  return (
    <div className="flex h-[calc(100vh-theme(spacing.14))] md:h-[calc(100vh-theme(spacing.12))] overflow-hidden">
      {/* Conversation List */}
      {showList && (
        <div className={cn("flex flex-col border-r border-border bg-card", isMobile ? "w-full" : "w-[380px] shrink-0")}>
          <div className="p-3 border-b border-border space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Inbox
              </h1>
              <Badge variant="secondary" className="text-xs">{filtered.length}</Badge>
              <Button size="icon" variant="ghost" className="ml-auto h-8 w-8" onClick={fetchConversations}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar contato..." className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="h-8 text-xs">
                <Filter className="w-3 h-3 mr-1" />
                <SelectValue placeholder="Etapa do Funil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as etapas</SelectItem>
                {Object.entries(stageLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Nenhuma conversa encontrada</div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => loadMessages(conv)}
                    className={cn(
                      "w-full text-left p-3 hover:bg-accent/50 transition-colors",
                      selectedConv?.id === conv.id && "bg-accent"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm text-foreground truncate">{getName(conv)}</span>
                          {conv.last_message_at && (
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {format(new Date(conv.last_message_at), "dd/MM HH:mm", { locale: ptBR })}
                            </span>
                          )}
                        </div>
                        {conv.last_message_preview && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message_preview}</p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {conv.funnel_stage && (
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", stageColors[conv.funnel_stage] || "bg-muted text-muted-foreground")}>
                              {stageLabels[conv.funnel_stage] || conv.funnel_stage}
                            </span>
                          )}
                          {(conv.unread_count || 0) > 0 && (
                            <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                              {conv.unread_count}
                            </span>
                          )}
                          {conv.source && (
                            <span className="text-[10px] text-muted-foreground">{conv.source}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* Message Area */}
      {showChat && (
        <div className="flex-1 flex flex-col bg-background">
          {selectedConv ? (
            <>
              <div className="flex items-center gap-3 p-3 border-b border-border bg-card">
                {isMobile && (
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSelectedConv(null)}>
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </Button>
                )}
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{getName(selectedConv)}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedConv.phone || "Sem telefone"}</p>
                </div>
                {selectedConv.funnel_stage && (
                  <Badge variant="outline" className="ml-auto text-[10px]">
                    {stageLabels[selectedConv.funnel_stage] || selectedConv.funnel_stage}
                  </Badge>
                )}
              </div>

              <ScrollArea className="flex-1 p-4">
                {loadingMsgs ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Carregando mensagens...</div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Nenhuma mensagem encontrada</div>
                ) : (
                  <div className="space-y-2 max-w-3xl mx-auto">
                    {messages.map(msg => {
                      const isAgent = msg.sender_type === "atendente" || msg.sender_type === "agent";
                      return (
                        <div key={msg.id} className={cn("flex", isAgent ? "justify-end" : "justify-start")}>
                          <div className={cn(
                            "max-w-[80%] px-3 py-2 rounded-xl text-sm",
                            isAgent
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted text-foreground rounded-bl-sm"
                          )}>
                            <p className="whitespace-pre-wrap break-words">{msg.text || (msg.media_url ? `[${msg.message_type}]` : "[mídia]")}</p>
                            <span className={cn("text-[10px] mt-1 block", isAgent ? "text-primary-foreground/60" : "text-muted-foreground")}>
                              {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Selecione uma conversa para visualizar</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
