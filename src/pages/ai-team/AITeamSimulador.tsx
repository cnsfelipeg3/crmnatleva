import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, User, Bot, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AGENTS_V4 } from "@/components/ai-team/agentsV4Data";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const DESTINOS = ["Dubai", "Orlando", "Europa", "Maldivas", "Caribe", "Japão"];

interface ChatMsg {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
}

export default function AITeamSimulador() {
  const [selectedAgent, setSelectedAgent] = useState(AGENTS_V4[2]); // MAYA
  const [selectedDestino, setSelectedDestino] = useState("Dubai");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", content: input.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("agent-chat", {
        body: {
          question: `[Simulação - Cliente interessado em ${selectedDestino}] ${userMsg.content}`,
          agentName: selectedAgent.name,
          agentRole: selectedAgent.persona,
        },
      });

      let text = "";
      if (error) {
        text = "Desculpe, estou com dificuldades no momento. Tente novamente.";
      } else if (typeof data === "string") {
        // Parse SSE stream
        const lines = data.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const parsed = JSON.parse(line.slice(6));
              text += parsed.choices?.[0]?.delta?.content ?? "";
            } catch { /* skip */ }
          }
        }
      } else if (data?.error) {
        text = data.error;
      }

      if (!text) text = "Obrigado pelo contato! Como posso ajudá-lo com sua viagem?";

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "agent",
        content: text,
        timestamp: new Date(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "agent",
        content: "Erro na comunicação. Tente novamente.",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([]);
  };

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><MessageSquare className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold">Simulador</h1>
            <p className="text-sm text-muted-foreground">Converse com qualquer agente como se fosse um cliente</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={resetChat}><RotateCcw className="w-4 h-4 mr-1" /> Nova sessão</Button>
      </div>

      {/* Agent + Destino selection */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex gap-1 overflow-x-auto">
          {AGENTS_V4.filter(a => a.squadId === 'comercial').map(a => (
            <button key={a.id} onClick={() => setSelectedAgent(a)}
              className={cn("shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors",
                selectedAgent.id === a.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}>{a.emoji} {a.name}</button>
          ))}
        </div>
        <div className="flex gap-1">
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
          <div>
            <p className="text-sm font-bold">{selectedAgent.name}</p>
            <p className="text-[10px] text-muted-foreground">{selectedAgent.role} · {selectedDestino}</p>
          </div>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Comece a conversa como se fosse um cliente interessado em {selectedDestino}</p>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "agent" && <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><span className="text-sm">{selectedAgent.emoji}</span></div>}
              <div className={cn(
                "rounded-2xl px-4 py-2.5 max-w-[70%] text-sm",
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
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
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
    </div>
  );
}
