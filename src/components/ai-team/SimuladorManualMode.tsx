import { useState, useRef, useEffect, useCallback } from "react";
import { Send, User, RotateCcw, Loader2, History, FileText, ArrowRight, Info, Trophy } from "lucide-react";
import { AGENTS_V4, SQUADS } from "@/components/ai-team/agentsV4Data";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const DESTINOS = ["Dubai", "Orlando", "Europa", "Maldivas", "Caribe", "Japão", "Egito", "Tailândia", "Nova York", "Paris", "Grécia", "Bali", "Cancún", "Lisboa", "Seychelles"];
const SESSIONS_KEY = "natleva_manual_sessions";

interface ChatMsg {
  id: string; role: "user" | "agent"; content: string; timestamp: string; agentId?: string; agentName?: string;
}
interface SavedSession {
  id: string; agentId: string; agentName: string; agentEmoji: string; destino: string;
  messages: ChatMsg[]; createdAt: string; updatedAt: string;
}

function loadSessions(): SavedSession[] { try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]"); } catch { return []; } }
function saveSessions(sessions: SavedSession[]) { localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, 50))); }

const SUGGESTION_CHIPS = [
  "Quero uma viagem dos sonhos!",
  "Quanto custa um pacote completo?",
  "Tem promoção para esse mês?",
  "Preciso de ajuda com um problema",
];

const FUNNEL_STAGES = ["Recepção", "Qualificação", "Especialista", "Proposta", "Fechamento", "Pós-venda"];

// Shared color helper
const getAgentColor = (agent: typeof AGENTS_V4[0]) => {
  const colors: Record<string, string> = {
    orquestracao: "#10B981", comercial: "#F59E0B", atendimento: "#3B82F6",
    financeiro: "#8B5CF6", operacional: "#06B6D4", demanda: "#EF4444", retencao: "#EC4899",
  };
  return colors[agent.squadId] || "#10B981";
};

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
  const [currentStage, setCurrentStage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages]);

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
    // Advance funnel stage based on message count
    setCurrentStage(Math.min(5, Math.floor(messages.length / 4)));
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
        setTransferNotice(`${selectedAgent.name} → ${nextAgent.name}`);
        setSelectedAgent(nextAgent);
        setTimeout(() => setTransferNotice(null), 4000);
      }
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "agent", content: "Erro na comunicação. Tente novamente.", timestamp: new Date().toISOString() }]);
    } finally { setLoading(false); }
  }, [input, loading, selectedAgent, selectedDestino]);

  const resetChat = () => { setMessages([]); setCurrentSessionId(crypto.randomUUID()); setTransferNotice(null); setCurrentStage(0); };

  const loadSession = (session: SavedSession) => {
    setMessages(session.messages); setCurrentSessionId(session.id);
    const agent = AGENTS_V4.find(a => a.id === session.agentId);
    if (agent) setSelectedAgent(agent);
    setSelectedDestino(session.destino);
    toast({ title: "Sessão carregada", description: session.agentName });
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
      const reader = resp.body.getReader(); const decoder = new TextDecoder();
      let buf = "", text = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += decoder.decode(value, { stream: true }); let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim(); if (json === "[DONE]") break;
          try { const p = JSON.parse(json); const c = p.choices?.[0]?.delta?.content; if (c) { text += c; setSummaryText(text); } } catch {}
        }
      }
      if (!text) setSummaryText("Não foi possível gerar o resumo.");
    } catch { setSummaryText("Erro ao gerar resumo. Tente novamente."); } finally { setSummaryLoading(false); }
  }, [messages, selectedAgent, toast]);

  const agentColor = getAgentColor(selectedAgent);

  return (
    <>
      <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ height: "calc(100vh - 200px)", minHeight: 550 }}>
        {/* CENTER — Chat WhatsApp */}
        <div className="flex-1 rounded-[14px] flex flex-col overflow-hidden" style={{ background: "#111B21", border: "1px solid #2A3942" }}>
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 shrink-0" style={{ height: 56, background: "#1F2C33" }}>
            <div className="relative">
              <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: `${agentColor}20`, color: agentColor, border: `2px solid ${agentColor}` }}>
                {selectedAgent.name[0]}
              </div>
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full" style={{ background: "#25D366", border: "2px solid #1F2C33" }}>
                <span className="absolute inset-0 rounded-full animate-ping" style={{ background: "#25D366", opacity: 0.4 }} />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold" style={{ color: "#E9EDEF" }}>{selectedAgent.name}</p>
              <p className="text-[11px]" style={{ color: "#8696A0" }}>Especialista {selectedDestino} · Lv.{selectedAgent.level}</p>
            </div>
            {/* Funnel stage bar */}
            <div className="flex items-center gap-1">
              {FUNNEL_STAGES.map((_, i) => (
                <div key={i} className="flex items-center">
                  <div className="w-2 h-2 rounded-full transition-all duration-300" style={{
                    background: i < currentStage ? "#10B981" : i === currentStage ? agentColor : "#2A3942",
                    boxShadow: i === currentStage ? `0 0 6px ${agentColor}` : "none",
                  }}>
                    {i === currentStage && <div className="w-2 h-2 rounded-full animate-ping" style={{ background: agentColor, opacity: 0.5 }} />}
                  </div>
                  {i < FUNNEL_STAGES.length - 1 && <div className="w-2 h-px" style={{ background: i < currentStage ? "#10B981" : "#2A3942" }} />}
                </div>
              ))}
            </div>
          </div>

          {/* Transfer notice inline */}
          {transferNotice && (
            <div className="flex items-center justify-center py-1.5 animate-in fade-in duration-200" style={{ background: "#1F2C3380" }}>
              <span className="text-[11px] px-3 py-0.5 rounded-full" style={{ background: "#1F2C33", color: "#8696A0" }}>
                {transferNotice}
              </span>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1.5" style={{
            background: "#0B141A",
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h60v60H0z' fill='none'/%3E%3Cpath d='M30 30h30v30H30zM0 0h30v30H0z' fill='%23ffffff' fill-opacity='0.015'/%3E%3C/svg%3E\")",
          }}>
            {messages.length === 0 && (
              <div className="text-center py-20 space-y-4 animate-in fade-in duration-500">
                <svg className="w-16 h-16 mx-auto opacity-15" viewBox="0 0 24 24" fill="none" stroke="#8696A0" strokeWidth="1">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <p className="text-[13px]" style={{ color: "#8696A0" }}>
                  Comece a conversa como cliente interessado em {selectedDestino}
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-sm mx-auto">
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
                  <div style={{
                    background: isAgent ? "#1F2C33" : "#005C4B",
                    color: "#E9EDEF",
                    borderRadius: isAgent ? "0 12px 12px 12px" : "12px 0 12px 12px",
                    maxWidth: "70%", padding: "8px 12px",
                    boxShadow: "0 1px 1px rgba(0,0,0,0.13)",
                  }}>
                    {showName && msg.agentName && (
                      <p className="text-[11px] font-semibold mb-0.5" style={{ color: "#53BDEB" }}>{msg.agentName}</p>
                    )}
                    <p className="text-[13px] leading-[1.5]">{msg.content.replace("[TRANSFERIR]", "").trim()}</p>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <span className="text-[10px]" style={{ color: "#667781" }}>
                        {new Date(msg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {!isAgent && <span className="text-[10px]" style={{ color: "#34B7F1" }}>✓✓</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex gap-2 animate-in slide-in-from-left-2 duration-200">
                <div className="px-4 py-3" style={{ background: "#1F2C33", borderRadius: "0 12px 12px 12px" }}>
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-[6px] h-[6px] rounded-full animate-bounce" style={{ background: "#8696A0", animationDelay: `${i * 300}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-2.5 shrink-0" style={{ background: "#1F2C33" }}>
            <input
              placeholder="Digite como um cliente..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              disabled={loading}
              className="flex-1 text-[13px] px-[14px] py-[10px] rounded-lg outline-none"
              style={{ background: "#2A3942", color: "#E9EDEF", border: "none" }}
            />
            <button onClick={() => handleSend()} disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 shrink-0"
              style={{ background: input.trim() ? "#10B981" : "#2A3942" }}>
              <Send className="w-4 h-4" style={{ color: input.trim() ? "#fff" : "#8696A0" }} />
            </button>
          </div>
        </div>

        {/* RIGHT PANEL — Agent/Destino/Sessions */}
        <div className="w-[280px] shrink-0 flex flex-col gap-3 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          {/* Header actions */}
          <div className="flex gap-1.5">
            <button onClick={generateSummary} disabled={messages.length < 2}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all"
              style={{ background: "transparent", border: "1px solid #1E293B", color: messages.length < 2 ? "#334155" : "#64748B" }}>
              <FileText className="w-3 h-3" /> Resumo IA
            </button>
            <button onClick={resetChat}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all"
              style={{ border: "1px solid #10B98130", color: "#10B981" }}>
              <RotateCcw className="w-3 h-3" /> Nova
            </button>
          </div>

          {/* Agent info card */}
          <div className="rounded-xl p-3" style={{ background: "#0D1220", border: "1px solid #1E293B" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: `${agentColor}20`, color: agentColor, border: `2px solid ${agentColor}` }}>
                {selectedAgent.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold" style={{ color: agentColor }}>{selectedAgent.name}</p>
                <p className="text-[10px]" style={{ color: "#64748B" }}>{selectedAgent.role}</p>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${agentColor}15`, color: agentColor }}>Lv.{selectedAgent.level}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-1.5 rounded" style={{ background: "#111827" }}>
                <p className="text-[11px] font-bold" style={{ color: "#10B981" }}>{selectedAgent.successRate}%</p>
                <p className="text-[8px]" style={{ color: "#64748B" }}>Sucesso</p>
              </div>
              <div className="text-center p-1.5 rounded" style={{ background: "#111827" }}>
                <p className="text-[11px] font-bold" style={{ color: "#F1F5F9" }}>{selectedAgent.tasksToday}</p>
                <p className="text-[8px]" style={{ color: "#64748B" }}>Tarefas hoje</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedAgent.skills.slice(0, 3).map(s => (
                <span key={s} className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: "#1E293B", color: "#64748B" }}>{s}</span>
              ))}
            </div>
          </div>

          {/* Squad filter + agents */}
          <div className="rounded-xl p-3" style={{ background: "#0D1220", border: "1px solid #1E293B" }}>
            <p className="text-[11px] uppercase tracking-[0.08em] font-bold mb-2" style={{ color: "#64748B" }}>Agentes</p>
            <div className="flex gap-1 flex-wrap mb-2">
              <button onClick={() => setActiveSquad("all")} className="text-[9px] px-2 py-0.5 rounded font-medium"
                style={{ background: activeSquad === "all" ? "#10B98110" : "transparent", border: `1px solid ${activeSquad === "all" ? "#10B981" : "#1E293B"}`, color: activeSquad === "all" ? "#10B981" : "#64748B" }}>
                Todos
              </button>
              {SQUADS.map(s => (
                <button key={s.id} onClick={() => setActiveSquad(s.id)} className="text-[9px] px-2 py-0.5 rounded font-medium"
                  style={{ background: activeSquad === s.id ? "#10B98110" : "transparent", border: `1px solid ${activeSquad === s.id ? "#10B981" : "#1E293B"}`, color: activeSquad === s.id ? "#10B981" : "#64748B" }}>
                  {s.name}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1 max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              {filteredAgents.map(a => {
                const c = getAgentColor(a);
                const active = selectedAgent.id === a.id;
                return (
                  <button key={a.id} onClick={() => setSelectedAgent(a)}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left transition-all duration-200"
                    style={{
                      background: active ? `${c}12` : "transparent",
                      border: `1px solid ${active ? c : "#1E293B"}`,
                    }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                      style={{ background: `${c}20`, color: c }}>{a.name[0]}</div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold truncate" style={{ color: active ? c : "#F1F5F9" }}>{a.name}</p>
                      <p className="text-[8px] truncate" style={{ color: "#64748B" }}>Lv.{a.level}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Destinos */}
          <div className="rounded-xl p-3" style={{ background: "#0D1220", border: "1px solid #1E293B" }}>
            <p className="text-[11px] uppercase tracking-[0.08em] font-bold mb-2" style={{ color: "#64748B" }}>Destino</p>
            <div className="flex flex-wrap gap-1">
              {DESTINOS.map(d => (
                <button key={d} onClick={() => setSelectedDestino(d)}
                  className="text-[10px] px-2.5 py-1 rounded font-medium transition-all"
                  style={{
                    background: selectedDestino === d ? "#F59E0B10" : "transparent",
                    border: `1px solid ${selectedDestino === d ? "#F59E0B" : "#1E293B"}`,
                    color: selectedDestino === d ? "#F59E0B" : "#64748B",
                  }}>{d}</button>
              ))}
            </div>
          </div>

          {/* Sessions */}
          <div className="rounded-xl p-3" style={{ background: "#0D1220", border: "1px solid #1E293B" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-[0.08em] font-bold" style={{ color: "#64748B" }}>Sessões</p>
              <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "#1E293B", color: "#64748B" }}>{sessions.length}</span>
            </div>
            <div className="space-y-1 max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              {sessions.length === 0 && <p className="text-[10px] text-center py-4" style={{ color: "#334155" }}>Nenhuma sessão</p>}
              {sessions.slice(0, 10).map(s => (
                <div key={s.id} onClick={() => loadSession(s)}
                  className="rounded-lg p-2 cursor-pointer transition-all duration-200"
                  style={{
                    background: s.id === currentSessionId ? "#10B98108" : "transparent",
                    border: `1px solid ${s.id === currentSessionId ? "#10B98130" : "transparent"}`,
                  }}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                      style={{ background: "#10B98120", color: "#10B981" }}>{s.agentName[0]}</div>
                    <span className="text-[10px] font-semibold flex-1 truncate" style={{ color: "#F1F5F9" }}>{s.agentName}</span>
                    <span className="text-[8px]" style={{ color: "#F59E0B" }}>{s.destino}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5 pl-6">
                    <span className="text-[8px]" style={{ color: "#64748B" }}>
                      {new Date(s.updatedAt).toLocaleDateString("pt-BR")} · {s.messages.length} msgs
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                      className="text-[8px]" style={{ color: "#EF4444" }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
              <div className="whitespace-pre-wrap text-[13px] leading-relaxed" style={{ color: "#E9EDEF" }}>{summaryText}</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
