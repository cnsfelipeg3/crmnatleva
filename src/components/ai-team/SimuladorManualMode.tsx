import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, Send, User, RotateCcw, Loader2, History, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AGENTS_V4, SQUADS } from "@/components/ai-team/agentsV4Data";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DESTINOS = ["Dubai", "Orlando", "Europa", "Maldivas", "Caribe", "Japão", "Egito", "Tailândia"];
const SESSIONS_KEY = "natleva_manual_sessions";

interface ChatMsg {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: string;
  agentId?: string;
  agentName?: string;
}

interface SavedSession {
  id: string;
  agentId: string;
  agentName: string;
  agentEmoji: string;
  destino: string;
  messages: ChatMsg[];
  createdAt: string;
  updatedAt: string;
}

function loadSessions(): SavedSession[] {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]");
  } catch { return []; }
}

function saveSessions(sessions: SavedSession[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, 50)));
}

export default function SimuladorManualMode() {
  const [selectedAgent, setSelectedAgent] = useState(AGENTS_V4[2]);
  const [selectedDestino, setSelectedDestino] = useState("Dubai");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSquad, setActiveSquad] = useState<string>("all");
  const [currentSessionId, setCurrentSessionId] = useState<string>(crypto.randomUUID());
  const [sessions, setSessions] = useState<SavedSession[]>(() => loadSessions());
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [transferNotice, setTransferNotice] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  // Auto-save session when messages change
  useEffect(() => {
    if (messages.length === 0) return;
    const session: SavedSession = {
      id: currentSessionId,
      agentId: selectedAgent.id,
      agentName: selectedAgent.name,
      agentEmoji: selectedAgent.emoji,
      destino: selectedDestino,
      messages,
      createdAt: sessions.find(s => s.id === currentSessionId)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [session, ...sessions.filter(s => s.id !== currentSessionId)];
    setSessions(updated);
    saveSessions(updated);
  }, [messages]);

  const filteredAgents = activeSquad === "all"
    ? AGENTS_V4
    : AGENTS_V4.filter(a => a.squadId === activeSquad);

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", content: input.trim(), timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          question: `[Simulação - Cliente interessado em ${selectedDestino}] ${userMsg.content}`,
          agentName: selectedAgent.name,
          agentRole: selectedAgent.persona,
        }),
      });

      if (!resp.ok || !resp.body) {
        const errorData = resp.status === 429 ? "Rate limit excedido. Aguarde." : resp.status === 402 ? "Créditos insuficientes." : "Erro na comunicação.";
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "agent", content: errorData, timestamp: new Date().toISOString(), agentId: selectedAgent.id, agentName: selectedAgent.name }]);
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let agentText = "";
      const streamId = "stream-" + crypto.randomUUID();

      const updateAgent = (text: string) => {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.id === streamId) {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: text } : m);
          }
          return [...prev, { id: streamId, role: "agent" as const, content: text, timestamp: new Date().toISOString(), agentId: selectedAgent.id, agentName: selectedAgent.name }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) { agentText += content; updateAgent(agentText); }
          } catch { /* partial */ }
        }
      }

      if (!agentText) {
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "agent", content: "Obrigado pelo contato! Como posso ajudá-lo?", timestamp: new Date().toISOString(), agentId: selectedAgent.id, agentName: selectedAgent.name }]);
      }

      // Auto-transfer detection
      if (agentText.includes("[TRANSFERIR]")) {
        const currentIdx = AGENTS_V4.findIndex(a => a.id === selectedAgent.id);
        const sameSquad = AGENTS_V4.filter(a => a.squadId === selectedAgent.squadId && a.id !== selectedAgent.id);
        const nextAgent = sameSquad[0] || AGENTS_V4[(currentIdx + 1) % AGENTS_V4.length];
        
        setTransferNotice(`${selectedAgent.emoji} ${selectedAgent.name} transferiu para ${nextAgent.emoji} ${nextAgent.name}`);
        setSelectedAgent(nextAgent);
        
        setTimeout(() => setTransferNotice(null), 4000);
      }
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "agent", content: "Erro na comunicação. Tente novamente.", timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, selectedAgent, selectedDestino]);

  const resetChat = () => {
    setMessages([]);
    setCurrentSessionId(crypto.randomUUID());
    setTransferNotice(null);
  };

  const loadSession = (session: SavedSession) => {
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    const agent = AGENTS_V4.find(a => a.id === session.agentId);
    if (agent) setSelectedAgent(agent);
    setSelectedDestino(session.destino);
    toast({ title: "Sessão carregada", description: `${session.agentEmoji} ${session.agentName}` });
  };

  const deleteSession = (id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    saveSessions(updated);
    if (id === currentSessionId) resetChat();
  };

  const generateSummary = useCallback(async () => {
    if (messages.length < 2) {
      toast({ title: "Conversa muito curta", description: "Precisa de pelo menos 2 mensagens.", variant: "destructive" });
      return;
    }
    setSummaryOpen(true);
    setSummaryLoading(true);
    setSummaryText("");

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`;
      const chatHistory = messages.map(m => `${m.role === "user" ? "CLIENTE" : `AGENTE (${m.agentName || selectedAgent.name})`}: ${m.content}`).join("\n");
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          question: `Analise esta conversa entre cliente e agente de viagens e gere um resumo executivo com: 1) Destino/interesse do cliente, 2) Perfil do cliente, 3) Próximos passos sugeridos, 4) Pontos de atenção.\n\nCONVERSA:\n${chatHistory}`,
          agentName: "RESUMO",
          agentRole: "Voce e um analista de qualidade de agencia de viagens premium. Gere resumos concisos e acionáveis.",
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("API error");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) { text += c; setSummaryText(text); }
          } catch {}
        }
      }
      if (!text) setSummaryText("Não foi possível gerar o resumo.");
    } catch {
      setSummaryText("Erro ao gerar resumo. Tente novamente.");
    } finally {
      setSummaryLoading(false);
    }
  }, [messages, selectedAgent, toast]);

  return (
    <>
      {/* Header actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={generateSummary} disabled={messages.length < 2}>
          <FileText className="w-4 h-4 mr-1" /> Resumo IA
        </Button>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <History className="w-4 h-4 mr-1" /> Sessões ({sessions.length})
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Sessões Anteriores</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-2 overflow-y-auto max-h-[calc(100vh-120px)]">
              {sessions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma sessão salva</p>
              )}
              {sessions.map(s => (
                <div key={s.id} className={cn(
                  "rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                  s.id === currentSessionId && "border-primary/50 bg-primary/5"
                )} onClick={() => loadSession(s)}>
                  <div className="flex items-center gap-2">
                    <span>{s.agentEmoji}</span>
                    <span className="text-sm font-medium flex-1">{s.agentName}</span>
                    <Badge variant="outline" className="text-[9px]">{s.destino}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">
                    {s.messages[s.messages.length - 1]?.content?.slice(0, 60)}...
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[9px] text-muted-foreground">
                      {new Date(s.updatedAt).toLocaleDateString("pt-BR")} · {s.messages.length} msgs
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                      className="text-[9px] text-destructive hover:underline"
                    >Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
        <Button variant="outline" size="sm" onClick={resetChat}>
          <RotateCcw className="w-4 h-4 mr-1" /> Nova sessão
        </Button>
      </div>

      {/* Transfer notice */}
      {transferNotice && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-600 animate-in slide-in-from-top-2">
          <ArrowRight className="w-4 h-4" />
          {transferNotice}
        </div>
      )}

      {/* Squad filter + Agent selection */}
      <div className="space-y-2">
        <div className="flex gap-1 overflow-x-auto pb-1">
          <button onClick={() => setActiveSquad("all")}
            className={cn("shrink-0 text-[10px] px-2 py-1 rounded-lg font-medium transition-colors",
              activeSquad === "all" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            )}>Todos</button>
          {SQUADS.map(s => (
            <button key={s.id} onClick={() => setActiveSquad(s.id)}
              className={cn("shrink-0 text-[10px] px-2 py-1 rounded-lg font-medium transition-colors",
                activeSquad === s.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}>{s.emoji} {s.name}</button>
          ))}
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {filteredAgents.map(a => (
            <button key={a.id} onClick={() => setSelectedAgent(a)}
              className={cn("shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors",
                selectedAgent.id === a.id ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:bg-muted border border-transparent"
              )}>{a.emoji} {a.name}</button>
          ))}
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {DESTINOS.map(d => (
            <button key={d} onClick={() => setSelectedDestino(d)}
              className={cn("text-xs px-2 py-1 rounded-lg transition-colors",
                selectedDestino === d ? "bg-blue-500/10 text-blue-600" : "text-muted-foreground hover:bg-muted"
              )}>{d}</button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="rounded-xl border border-border/50 bg-card flex flex-col h-[500px]">
        <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
          <span className="text-lg">{selectedAgent.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">{selectedAgent.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{selectedAgent.role} · {selectedDestino}</p>
          </div>
          <Badge variant="outline" className="text-[9px]">Lv.{selectedAgent.level}</Badge>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Comece a conversa como um cliente interessado em {selectedDestino}</p>
              <p className="text-xs text-muted-foreground/50 mt-1">Respostas em streaming via IA</p>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "agent" && (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm">{AGENTS_V4.find(a => a.id === msg.agentId)?.emoji || selectedAgent.emoji}</span>
                </div>
              )}
              <div className={cn(
                "rounded-2xl px-4 py-2.5 max-w-[75%] text-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted rounded-bl-md"
              )}>
                {msg.agentName && msg.role === "agent" && (
                  <p className="text-[9px] font-semibold text-primary mb-0.5">{msg.agentName}</p>
                )}
                {msg.content.replace("[TRANSFERIR]", "").trim()}
                <p className={cn("text-[9px] mt-1", msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground/50")}>
                  {new Date(msg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {msg.role === "user" && <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0"><User className="w-4 h-4 text-muted-foreground" /></div>}
            </div>
          ))}
          {loading && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><span className="text-sm">{selectedAgent.emoji}</span></div>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-border/30 flex gap-2">
          <Input placeholder="Digite como um cliente..." value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()} disabled={loading} />
          <Button onClick={handleSend} disabled={loading || !input.trim()} size="icon"><Send className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Summary dialog */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Resumo da Conversa
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {summaryLoading && !summaryText && (
              <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Gerando resumo...
              </div>
            )}
            {summaryText && (
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
                {summaryText}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
