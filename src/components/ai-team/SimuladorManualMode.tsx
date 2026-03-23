import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, Send, User, RotateCcw, Loader2, History, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AGENTS_V4, SQUADS } from "@/components/ai-team/agentsV4Data";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
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
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]"); } catch { return []; }
}
function saveSessions(sessions: SavedSession[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, 50)));
}

const SUGGESTION_CHIPS = [
  "Quero uma viagem dos sonhos!",
  "Quanto custa um pacote completo?",
  "Tem promoção para esse mês?",
  "Preciso de ajuda com um problema",
];

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

  useEffect(() => {
    if (messages.length === 0) return;
    const session: SavedSession = {
      id: currentSessionId, agentId: selectedAgent.id, agentName: selectedAgent.name,
      agentEmoji: selectedAgent.emoji, destino: selectedDestino, messages,
      createdAt: sessions.find(s => s.id === currentSessionId)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [session, ...sessions.filter(s => s.id !== currentSessionId)];
    setSessions(updated);
    saveSessions(updated);
  }, [messages]);

  const filteredAgents = activeSquad === "all" ? AGENTS_V4 : AGENTS_V4.filter(a => a.squadId === activeSquad);

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = overrideText || input.trim();
    if (!text || loading) return;
    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          question: `[Simulação - Cliente interessado em ${selectedDestino}] ${text}`,
          agentName: selectedAgent.name, agentRole: selectedAgent.persona,
        }),
      });

      if (!resp.ok || !resp.body) {
        const errorData = resp.status === 429 ? "Rate limit excedido. Aguarde." : resp.status === 402 ? "Créditos insuficientes." : "Erro na comunicação.";
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "agent", content: errorData, timestamp: new Date().toISOString(), agentId: selectedAgent.id, agentName: selectedAgent.name }]);
        setLoading(false); return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "", agentText = "";
      const streamId = "stream-" + crypto.randomUUID();
      const updateAgent = (t: string) => {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.id === streamId) return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: t } : m);
          return [...prev, { id: streamId, role: "agent" as const, content: t, timestamp: new Date().toISOString(), agentId: selectedAgent.id, agentName: selectedAgent.name }];
        });
      };

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
          try { const p = JSON.parse(json); const c = p.choices?.[0]?.delta?.content; if (c) { agentText += c; updateAgent(agentText); } } catch {}
        }
      }

      if (!agentText) {
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "agent", content: "Obrigado pelo contato! Como posso ajudá-lo?", timestamp: new Date().toISOString(), agentId: selectedAgent.id, agentName: selectedAgent.name }]);
      }

      if (agentText.includes("[TRANSFERIR]")) {
        const currentIdx = AGENTS_V4.findIndex(a => a.id === selectedAgent.id);
        const sameSquad = AGENTS_V4.filter(a => a.squadId === selectedAgent.squadId && a.id !== selectedAgent.id);
        const nextAgent = sameSquad[0] || AGENTS_V4[(currentIdx + 1) % AGENTS_V4.length];
        setTransferNotice(`${selectedAgent.name} transferiu para ${nextAgent.name}`);
        setSelectedAgent(nextAgent);
        setTimeout(() => setTransferNotice(null), 4000);
      }
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "agent", content: "Erro na comunicação. Tente novamente.", timestamp: new Date().toISOString() }]);
    } finally { setLoading(false); }
  }, [input, loading, selectedAgent, selectedDestino]);

  const resetChat = () => { setMessages([]); setCurrentSessionId(crypto.randomUUID()); setTransferNotice(null); };

  const loadSession = (session: SavedSession) => {
    setMessages(session.messages); setCurrentSessionId(session.id);
    const agent = AGENTS_V4.find(a => a.id === session.agentId);
    if (agent) setSelectedAgent(agent);
    setSelectedDestino(session.destino);
    toast({ title: "Sessão carregada", description: `${session.agentName}` });
  };

  const deleteSession = (id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated); saveSessions(updated);
    if (id === currentSessionId) resetChat();
  };

  const generateSummary = useCallback(async () => {
    if (messages.length < 2) { toast({ title: "Conversa muito curta", variant: "destructive" }); return; }
    setSummaryOpen(true); setSummaryLoading(true); setSummaryText("");
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`;
      const chatHistory = messages.map(m => `${m.role === "user" ? "CLIENTE" : `AGENTE (${m.agentName || selectedAgent.name})`}: ${m.content}`).join("\n");
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          question: `Analise esta conversa entre cliente e agente de viagens e gere um resumo executivo com: 1) Destino/interesse do cliente, 2) Perfil do cliente, 3) Próximos passos sugeridos, 4) Pontos de atenção.\n\nCONVERSA:\n${chatHistory}`,
          agentName: "RESUMO", agentRole: "Voce e um analista de qualidade de agencia de viagens premium. Gere resumos concisos e acionáveis.",
        }),
      });
      if (!resp.ok || !resp.body) throw new Error("API error");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "", text = "";
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
          try { const p = JSON.parse(json); const c = p.choices?.[0]?.delta?.content; if (c) { text += c; setSummaryText(text); } } catch {}
        }
      }
      if (!text) setSummaryText("Não foi possível gerar o resumo.");
    } catch { setSummaryText("Erro ao gerar resumo. Tente novamente."); } finally { setSummaryLoading(false); }
  }, [messages, selectedAgent, toast]);

  // Get agent color
  const getAgentColor = (agent: typeof AGENTS_V4[0]) => {
    const squad = SQUADS.find(s => s.id === agent.squadId);
    const colors: Record<string, string> = {
      orquestracao: "#10B981", comercial: "#F59E0B", atendimento: "#3B82F6",
      financeiro: "#8B5CF6", operacional: "#06B6D4", demanda: "#EF4444", retencao: "#EC4899",
    };
    return colors[agent.squadId] || "#10B981";
  };

  return (
    <>
      {/* Header actions */}
      <div className="flex items-center gap-2 flex-wrap animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: "50ms" }}>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold tracking-tight" style={{ color: "#F1F5F9" }}>
            Chat
          </h2>
          {messages.length > 0 && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#10B981" }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#10B981" }} />
            </span>
          )}
          {messages.length > 0 && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: "#10B98120", color: "#10B981" }}>LIVE</span>
          )}
        </div>
        <div className="flex-1" />
        <button onClick={generateSummary}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 hover:translate-y-[-1px]"
          style={{ background: "transparent", border: "1px solid #1E293B", color: messages.length < 2 ? "#334155" : "#64748B" }}
          disabled={messages.length < 2}>
          <FileText className="w-3.5 h-3.5" /> Resumo IA
        </button>
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 hover:translate-y-[-1px]"
              style={{ background: "transparent", border: "1px solid #1E293B", color: "#64748B" }}>
              <History className="w-3.5 h-3.5" /> Sessões ({sessions.length})
            </button>
          </SheetTrigger>
          <SheetContent style={{ background: "#0D1220", borderLeft: "1px solid #1E293B" }}>
            <SheetHeader>
              <SheetTitle style={{ color: "#F1F5F9" }}>Sessões Anteriores</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-2 overflow-y-auto max-h-[calc(100vh-120px)]">
              {sessions.length === 0 && <p className="text-center py-8" style={{ color: "#64748B", fontSize: "13px" }}>Nenhuma sessão salva</p>}
              {sessions.map(s => (
                <div key={s.id} onClick={() => loadSession(s)}
                  className="rounded-lg p-3 cursor-pointer transition-all duration-200 hover:translate-y-[-1px]"
                  style={{
                    background: s.id === currentSessionId ? "#10B98108" : "#111827",
                    border: `1px solid ${s.id === currentSessionId ? "#10B98140" : "#1E293B"}`,
                  }}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: "#10B98120", color: "#10B981" }}>
                      {s.agentName[0]}
                    </div>
                    <span className="text-xs font-semibold flex-1" style={{ color: "#F1F5F9" }}>{s.agentName}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "#F59E0B15", color: "#F59E0B", border: "1px solid #F59E0B30" }}>{s.destino}</span>
                  </div>
                  <p className="text-[10px] mt-1 truncate" style={{ color: "#64748B" }}>
                    {s.messages[s.messages.length - 1]?.content?.slice(0, 60)}...
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[9px]" style={{ color: "#64748B" }}>
                      {new Date(s.updatedAt).toLocaleDateString("pt-BR")} · {s.messages.length} msgs
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                      className="text-[9px] hover:underline" style={{ color: "#EF4444" }}>Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
        <button onClick={resetChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200"
          style={{ background: "transparent", border: "1px solid #10B98130", color: "#10B981" }}>
          <RotateCcw className="w-3.5 h-3.5" /> Nova sessão
        </button>
      </div>

      {/* Transfer notice */}
      {transferNotice && (
        <div className="flex items-center justify-center gap-3 py-2 animate-in slide-in-from-top-2 duration-200">
          <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, transparent, #3B82F640, transparent)" }} />
          <span className="text-[10px] font-bold px-3 py-1 rounded-full" style={{ background: "linear-gradient(135deg, #10B98120, #3B82F620)", border: "1px solid #1E293B", color: "#F1F5F9" }}>
            <ArrowRight className="w-3 h-3 inline mr-1" />{transferNotice}
          </span>
          <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, transparent, #3B82F640, transparent)" }} />
        </div>
      )}

      {/* Squad filter chips */}
      <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: "100ms" }}>
        <p className="text-[11px] uppercase tracking-[0.08em] font-bold" style={{ color: "#64748B" }}>Squad</p>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setActiveSquad("all")}
            className="shrink-0 px-3.5 rounded-md text-[11px] font-medium transition-all duration-200"
            style={{
              height: 28,
              background: activeSquad === "all" ? "#10B98110" : "#0D1220",
              border: `1px solid ${activeSquad === "all" ? "#10B981" : "#1E293B"}`,
              color: activeSquad === "all" ? "#10B981" : "#64748B",
            }}>Todos</button>
          {SQUADS.map(s => (
            <button key={s.id} onClick={() => setActiveSquad(s.id)}
              className="shrink-0 px-3.5 rounded-md text-[11px] font-medium transition-all duration-200"
              style={{
                height: 28,
                background: activeSquad === s.id ? "#10B98110" : "#0D1220",
                border: `1px solid ${activeSquad === s.id ? "#10B981" : "#1E293B"}`,
                color: activeSquad === s.id ? "#10B981" : "#64748B",
              }}>{s.name}</button>
          ))}
        </div>

        {/* Agent mini-cards */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {filteredAgents.map(a => {
            const color = getAgentColor(a);
            const active = selectedAgent.id === a.id;
            return (
              <button key={a.id} onClick={() => setSelectedAgent(a)}
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200"
                style={{
                  background: active ? `${color}12` : "#0D1220",
                  border: `1px solid ${active ? color : "#1E293B"}`,
                  color: active ? color : "#64748B",
                  transform: active ? "translateY(-1px)" : undefined,
                  boxShadow: active ? `0 4px 12px ${color}20` : undefined,
                }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: `${color}20`, color }}>
                  {a.name[0]}
                </div>
                {a.name}
                <span className="text-[8px] font-bold px-1 rounded" style={{ background: `${color}15`, color }}>Lv.{a.level}</span>
              </button>
            );
          })}
        </div>

        {/* Destinos */}
        <p className="text-[11px] uppercase tracking-[0.08em] font-bold" style={{ color: "#64748B" }}>Destino</p>
        <div className="flex gap-1.5 overflow-x-auto">
          {DESTINOS.map(d => (
            <button key={d} onClick={() => setSelectedDestino(d)}
              className="text-[10px] px-3 rounded-md font-medium transition-all duration-200"
              style={{
                height: 24,
                background: selectedDestino === d ? "#F59E0B15" : "transparent",
                border: `1px solid ${selectedDestino === d ? "#F59E0B" : "#1E293B"}`,
                color: selectedDestino === d ? "#F59E0B" : "#64748B",
              }}>{d}</button>
          ))}
        </div>
      </div>

      {/* Chat area — WhatsApp premium dark */}
      <div className="rounded-xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300"
        style={{ height: 520, background: "#0B141A", border: "1px solid #1E293B", animationDelay: "150ms" }}>
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4" style={{ height: 56, background: "#1F2C33", borderBottom: "1px solid #1E293B" }}>
          <div className="relative">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: `${getAgentColor(selectedAgent)}20`, color: getAgentColor(selectedAgent), border: `2px solid ${getAgentColor(selectedAgent)}` }}>
              {selectedAgent.name[0]}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2" style={{ background: "#10B981", borderColor: "#1F2C33" }}>
              <span className="absolute inset-0 rounded-full animate-ping" style={{ background: "#10B981", opacity: 0.4 }} />
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold" style={{ color: "#E9EDEF" }}>{selectedAgent.name}</p>
            <p className="text-[10px]" style={{ color: "#8696A0" }}>{selectedAgent.role} · {selectedDestino}</p>
          </div>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${getAgentColor(selectedAgent)}15`, color: getAgentColor(selectedAgent), border: `1px solid ${getAgentColor(selectedAgent)}30` }}>
            Lv.{selectedAgent.level}
          </span>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h60v60H0z' fill='none'/%3E%3Cpath d='M30 30h30v30H30zM0 0h30v30H0z' fill='%23ffffff' fill-opacity='0.015'/%3E%3C/svg%3E\")" }}>
          {messages.length === 0 && (
            <div className="text-center py-16 space-y-4 animate-in fade-in duration-500">
              <svg className="w-16 h-16 mx-auto opacity-20" viewBox="0 0 24 24" fill="none" stroke="#8696A0" strokeWidth="1">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p className="text-[13px] font-medium" style={{ color: "#8696A0" }}>
                Comece a conversa como um cliente interessado em {selectedDestino}
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
                {SUGGESTION_CHIPS.map(chip => (
                  <button key={chip} onClick={() => handleSend(chip)}
                    className="text-[11px] px-3 py-1.5 rounded-full transition-all duration-200 hover:translate-y-[-1px]"
                    style={{ background: "#1F2C33", border: "1px solid #2A3942", color: "#8696A0" }}>
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => {
            const isAgent = msg.role === "agent";
            const showName = isAgent && (i === 0 || messages[i - 1]?.role !== "agent" || messages[i - 1]?.agentId !== msg.agentId);
            return (
              <div key={msg.id}
                className={cn("flex gap-2 animate-in duration-200", isAgent ? "justify-start slide-in-from-left-2" : "justify-end slide-in-from-right-2")}>
                {isAgent && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-auto"
                    style={{ background: `${getAgentColor(selectedAgent)}20`, color: getAgentColor(selectedAgent) }}>
                    {(AGENTS_V4.find(a => a.id === msg.agentId) || selectedAgent).name[0]}
                  </div>
                )}
                <div style={{
                  background: isAgent ? "#1F2C33" : "#005C4B",
                  color: "#E9EDEF",
                  borderRadius: isAgent ? "0 12px 12px 12px" : "12px 0 12px 12px",
                  maxWidth: "75%",
                  padding: "8px 12px",
                }}>
                  {showName && msg.agentName && (
                    <p className="text-[10px] font-semibold mb-0.5" style={{ color: "#53BDEB" }}>{msg.agentName}</p>
                  )}
                  <p className="text-[13px] leading-relaxed">{msg.content.replace("[TRANSFERIR]", "").trim()}</p>
                  <p className="text-[10px] text-right mt-0.5" style={{ color: "#8696A0" }}>
                    {new Date(msg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {!isAgent && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-auto" style={{ background: "#2A3942" }}>
                    <User className="w-3.5 h-3.5" style={{ color: "#8696A0" }} />
                  </div>
                )}
              </div>
            );
          })}
          {loading && (
            <div className="flex gap-2 animate-in slide-in-from-left-2 duration-200">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-auto text-[10px] font-bold"
                style={{ background: `${getAgentColor(selectedAgent)}20`, color: getAgentColor(selectedAgent) }}>
                {selectedAgent.name[0]}
              </div>
              <div className="rounded-xl px-4 py-3" style={{ background: "#1F2C33", borderRadius: "0 12px 12px 12px" }}>
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#8696A0", animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: "#1F2C33", borderTop: "1px solid #1E293B" }}>
          <input
            placeholder="Digite como um cliente..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            disabled={loading}
            className="flex-1 text-[13px] px-4 py-2 rounded-lg outline-none"
            style={{ background: "#2A3942", color: "#E9EDEF", border: "none" }}
          />
          <button onClick={() => handleSend()} disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              background: input.trim() ? "#10B981" : "#2A3942",
              cursor: input.trim() ? "pointer" : "default",
            }}>
            <Send className="w-4 h-4" style={{ color: input.trim() ? "#000" : "#8696A0" }} />
          </button>
        </div>
      </div>

      {/* Summary dialog */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="max-w-lg" style={{ background: "#0D1220", border: "1px solid #1E293B" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: "#F1F5F9" }}>
              <FileText className="w-5 h-5" style={{ color: "#10B981" }} /> Resumo da Conversa
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {summaryLoading && !summaryText && (
              <div className="flex items-center gap-2 py-8 justify-center" style={{ color: "#64748B" }}>
                <Loader2 className="w-4 h-4 animate-spin" /> Gerando resumo...
              </div>
            )}
            {summaryText && (
              <div className="whitespace-pre-wrap text-[13px] leading-relaxed" style={{ color: "#E9EDEF" }}>
                {summaryText}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
