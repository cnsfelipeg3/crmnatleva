import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, Send, User, RotateCcw, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AGENTS_V4, SQUADS } from "@/components/ai-team/agentsV4Data";
import { cn } from "@/lib/utils";
import SimuladorAutoMode from "@/components/ai-team/SimuladorAutoMode";

const DESTINOS = ["Dubai", "Orlando", "Europa", "Maldivas", "Caribe", "Japão", "Egito", "Tailândia"];

type Mode = "manual" | "auto";

interface ChatMsg {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
}

export default function AITeamSimulador() {
  const [mode, setMode] = useState<Mode>("manual");
  const [selectedAgent, setSelectedAgent] = useState(AGENTS_V4[2]); // MAYA
  const [selectedDestino, setSelectedDestino] = useState("Dubai");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSquad, setActiveSquad] = useState<string>("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const filteredAgents = activeSquad === "all"
    ? AGENTS_V4
    : AGENTS_V4.filter(a => a.squadId === activeSquad);

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", content: input.trim(), timestamp: new Date() };
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
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "agent", content: errorData, timestamp: new Date() }]);
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let agentText = "";

      const updateAgent = (text: string) => {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "agent" && last.id.startsWith("stream-")) {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: text } : m);
          }
          return [...prev, { id: "stream-" + crypto.randomUUID(), role: "agent", content: text, timestamp: new Date() }];
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
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "agent", content: "Obrigado pelo contato! Como posso ajudá-lo?", timestamp: new Date() }]);
      }
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "agent", content: "Erro na comunicação. Tente novamente.", timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, selectedAgent, selectedDestino]);

  const resetChat = () => setMessages([]);

  const handleModeSwitch = (newMode: Mode) => {
    if (newMode === mode) return;
    if (mode === "manual" && messages.length > 0) {
      if (!confirm("Trocar de modo vai limpar a conversa atual. Continuar?")) return;
      setMessages([]);
    }
    setMode(newMode);
  };

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><MessageSquare className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold">Simulador</h1>
            <p className="text-sm text-muted-foreground">
              {mode === "manual" ? "Converse com qualquer dos 21 agentes em tempo real" : "Simulação automática com IA juiz e múltiplos perfis"}
            </p>
          </div>
        </div>
        {mode === "manual" && (
          <Button variant="outline" size="sm" onClick={resetChat}><RotateCcw className="w-4 h-4 mr-1" /> Nova sessão</Button>
        )}
      </div>

      {/* Mode selector */}
      <div className="flex gap-2">
        <button
          onClick={() => handleModeSwitch("manual")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
            mode === "manual"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border/50 text-muted-foreground hover:bg-muted"
          )}
        >
          <MessageSquare className="w-4 h-4" /> Conversa Manual
        </button>
        <button
          onClick={() => handleModeSwitch("auto")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
            mode === "auto"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border/50 text-muted-foreground hover:bg-muted"
          )}
        >
          <Zap className="w-4 h-4" /> Simulação Automática
        </button>
      </div>

      {/* Manual mode */}
      {mode === "manual" && (
        <>
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
                  {msg.role === "agent" && <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><span className="text-sm">{selectedAgent.emoji}</span></div>}
                  <div className={cn(
                    "rounded-2xl px-4 py-2.5 max-w-[75%] text-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  )}>
                    {msg.content}
                    <p className={cn("text-[9px] mt-1", msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground/50")}>
                      {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
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
        </>
      )}

      {/* Auto mode */}
      {mode === "auto" && <SimuladorAutoMode />}
    </div>
  );
}
