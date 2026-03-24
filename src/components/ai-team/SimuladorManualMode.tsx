import { useState, useRef, useEffect, useCallback } from "react";
import { Send, RotateCcw, Loader2, FileText, Trophy, Plane, MapPin, ChevronDown, Users, X } from "lucide-react";
import NathOpinionButton from "./NathOpinionButton";
import { AGENTS_V4, SQUADS, type AgentV4 } from "@/components/ai-team/agentsV4Data";
import { getAgentTraining, type AgentTrainingConfig } from "@/components/ai-team/agentTrainingStore";
import { useGlobalRules, buildGlobalRulesBlock } from "@/hooks/useGlobalRules";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const DESTINOS = ["🎲 Aleatório", "Dubai", "Orlando", "Europa", "Maldivas", "Caribe", "Japão", "Egito", "Tailândia", "Nova York", "Paris", "Grécia", "Bali", "Cancún", "Lisboa", "Seychelles"];

const DESTINOS_ALEATORIOS = [
  "Butão", "Islândia", "Patagônia", "Fiji", "Tanzânia", "Marrocos", "Sri Lanka",
  "Mongólia", "Noruega", "Croácia", "Nova Zelândia", "Vietnã", "Costa Rica",
  "Jordânia", "Georgia (Cáucaso)", "Madagascar", "Omã", "Eslovênia", "Quirguistão",
  "Namíbia", "Laos", "Bermudas", "Açores", "Zanzibar", "Ruanda", "Belize",
  "Faroe Islands", "Svalbard", "Galápagos", "Reunião", "Tahiti", "Cabo Verde",
  "Uzbequistão", "Lapônia", "Sardenha", "Sicília", "Montenegro", "Albânia",
];

const MIN_TROCAS_MANUAL: Record<string, number> = {
  maya: 5, atlas: 6, habibi: 7, nemo: 7, dante: 7, luna: 5, nero: 5, iris: 4,
};

const AGENT_ROLE_MANUAL: Record<string, string> = {
  maya: `\nSEU PAPEL: voce e o primeiro contato. Nao qualifica — ENCANTA.\nAntes de qualquer dado, crie conexao com a PESSOA.\nPergunte a ocasiao, o que imaginam, o que os animou.\nSo transfira quando o lead estiver animado e curioso pelo que vem.`,
  atlas: `\nSEU PAPEL: qualifica sem parecer interrogatorio.\nDescubra orcamento, datas e grupo no fluxo natural — nao em perguntas diretas.\nIdentifique o perfil (familia, VIP, pechincheiro, lua de mel) e adapte o tom.\nSo transfira com: destino + orcamento + datas + ocasiao confirmados.`,
  habibi: `\nSEU PAPEL: faca o lead SONHAR com a viagem.\nNao apresente roteiro — conte uma historia que ele quer viver.\nInclua ao menos 1 experiencia exclusiva que ele nao ia encontrar pesquisando.\nPergunte o que ele imagina, sonha, quer sentir.\nSo transfira quando demonstrar animacao com algo especifico.`,
  nemo: `\nSEU PAPEL: faca o lead SONHAR com a viagem.\nNao apresente roteiro — conte uma historia que ele quer viver.\nInclua ao menos 1 experiencia exclusiva que ele nao ia encontrar pesquisando.\nPergunte o que ele imagina, sonha, quer sentir.\nSo transfira quando demonstrar animacao com algo especifico.`,
  dante: `\nSEU PAPEL: faca o lead SONHAR com a viagem.\nNao apresente roteiro — conte uma historia que ele quer viver.\nInclua ao menos 1 experiencia exclusiva que ele nao ia encontrar pesquisando.\nPergunte o que ele imagina, sonha, quer sentir.\nSo transfira quando demonstrar animacao com algo especifico.`,
  luna: `\nSEU PAPEL: a proposta e o culminar de tudo que foi conversado.\nCada item deve conectar com algo que o lead disse antes.\nApresente valor como experiencia, nao como custo.\nAbra espaco para o lead reagir antes de avancar.`,
  nero: `\nSEU PAPEL: voce e o mais paciente de todos.\nA ultima objecao e a mais importante — nunca desista nela.\nPergunte o que esta por tras da objecao antes de responder.\nUse argumento de valor ANTES de qualquer desconto.\nSo transfira para IRIS depois de SIM claro e sem ressalvas.`,
  iris: `\nSEU PAPEL: a venda foi feita. Agora crie um fa.\nConfirme detalhes com cuidado e entusiasmo genuino.\nDemonstre que a NatLeva vai cuidar de tudo.\nPlante a semente da proxima viagem e da indicacao.`,
};

// All training data from agent detail → injected here
function buildTrainingBlock(agentId: string): string {
  const training = getAgentTraining(agentId);
  if (!training) return "";

  const parts: string[] = [];

  if (training.behaviorPrompt) {
    parts.push(`\n=== DIRETIVAS COMPORTAMENTAIS (configuradas pela gestão) ===\nVocê DEVE seguir rigorosamente estas instruções:\n${training.behaviorPrompt}`);
  }

  if (training.customRules && training.customRules.length > 0) {
    const activeRules = training.customRules.filter(r => r.active);
    if (activeRules.length > 0) {
      parts.push(`\n=== REGRAS ESPECÍFICAS DO AGENTE ===\n${activeRules.map(r => `- [${r.impact.toUpperCase()}] ${r.name}: ${r.description}`).join("\n")}`);
    }
  }

  if (training.knowledgeSummaries && training.knowledgeSummaries.length > 0) {
    parts.push(`\n=== BASE DE CONHECIMENTO ===\n${training.knowledgeSummaries.join("\n")}`);
  }

  return parts.join("\n");
}

function buildManualAgentPrompt(agent: typeof AGENTS_V4[0], globalRulesBlock: string): string {
  const minTrocas = MIN_TROCAS_MANUAL[agent.id] || 4;
  const roleInstr = AGENT_ROLE_MANUAL[agent.id] || "";
  const trainingBlock = buildTrainingBlock(agent.id);
  
  return `${agent.persona}
Voce conversa como ${agent.name} (${agent.role}) da agencia NatLeva pelo WhatsApp.

FILOSOFIA DE ATENDIMENTO NATLEVA:
Voce esta em uma conversa, nao em um formulario. Seu objetivo NAO e coletar dados e passar adiante. Seu objetivo E fazer este lead querer continuar a conversa.

REGRAS DE OURO:
- Nunca encerre sem pergunta aberta ou elemento que convide resposta
- Antes de qualquer dado, crie conexao. Interesse genuino pela pessoa.
- Se o lead falou algo pessoal (ocasiao, sonho, familia), volte a isso.
- Faca ao menos 1 pergunta que nao era necessaria — so curiosidade.
- Celebre conquistas do lead (aniversario, casamento, viagem dos sonhos).
${roleInstr}
${trainingBlock}
${globalRulesBlock}

SOBRE [TRANSFERIR]:
Use [TRANSFERIR] SOMENTE quando TUDO isso for verdade:
1. Voce teve ao menos ${minTrocas} trocas reais com este lead
2. O lead demonstrou entusiasmo genuino — nao apenas respondeu, se engajou
3. A proxima pergunta natural do lead e algo que so o proximo agente responde melhor
4. A transferencia beneficia o lead, nao e uma saida operacional

Se qualquer condicao faltar: continue a conversa. Aprofunde. Instigue. Surpreenda.
[TRANSFERIR] e resultado de conversa bem feita, nunca atalho.
Ao transferir: apresente o proximo agente com entusiasmo e contexto.

IMPORTANTE: Quando for hora de enviar valores/orçamento, diga que vai enviar o print com os valores.
O agente decide o tamanho certo para cada momento da conversa.`;
}
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
  "Quero uma viagem dos sonhos! ✨",
  "Quanto custa um pacote completo?",
  "Tem promoção para esse mês?",
  "Preciso de ajuda com um problema",
];

const FUNNEL_STAGES = ["Recepção", "Qualificação", "Especialista", "Proposta", "Fechamento", "Pós-venda"];

const getAgentColor = (agent: typeof AGENTS_V4[0]) => {
  const colors: Record<string, string> = {
    orquestracao: "#10B981", comercial: "#F59E0B", atendimento: "#3B82F6",
    financeiro: "#8B5CF6", operacional: "#06B6D4", demanda: "#EF4444", retencao: "#EC4899",
  };
  return colors[agent.squadId] || "#10B981";
};

export default function SimuladorManualMode() {
  const isMobile = useIsMobile();
  const { data: globalRules = [] } = useGlobalRules();
  const globalRulesBlock = buildGlobalRulesBlock(globalRules);
  const [selectedAgent, setSelectedAgent] = useState(AGENTS_V4[2]);
  const [selectedDestino, setSelectedDestinoRaw] = useState("Dubai");
  const setSelectedDestino = (d: string) => {
    if (d === "🎲 Aleatório") {
      const random = DESTINOS_ALEATORIOS[Math.floor(Math.random() * DESTINOS_ALEATORIOS.length)];
      setSelectedDestinoRaw(random);
    } else {
      setSelectedDestinoRaw(d);
    }
  };
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
  const [showPanel, setShowPanel] = useState(false); // mobile bottom sheet
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load behavior_prompt from DB for all agents
  const [agentBehaviors, setAgentBehaviors] = useState<Record<string, string>>({});
  useEffect(() => {
    supabase.from("ai_team_agents").select("id, behavior_prompt").then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((a: any) => { if (a.behavior_prompt) map[a.id] = a.behavior_prompt; });
        setAgentBehaviors(map);
      }
    });
  }, []);

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
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/simulator-ai`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          type: "agent",
          systemPrompt: buildManualAgentPrompt(selectedAgent, globalRulesBlock),
          agentBehaviorPrompt: agentBehaviors[selectedAgent.id] || "",
          history: [{ role: "user", content: `[Simulação - Cliente interessado em ${selectedDestino}] ${text}` }],
          provider: "lovable",
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
          if (last?.id === streamId) return prev.map((m, idx) => idx === prev.length - 1 ? { ...m, content: t } : m);
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

  const resetChat = () => {
    if (messages.length > 0 && !confirm("Tem certeza? Os dados atuais serão perdidos.")) return;
    setMessages([]); setCurrentSessionId(crypto.randomUUID()); setTransferNotice(null); setCurrentStage(0);
  };

  const loadSession = (session: SavedSession) => {
    setMessages(session.messages); setCurrentSessionId(session.id);
    const agent = AGENTS_V4.find(a => a.id === session.agentId);
    if (agent) setSelectedAgent(agent);
    setSelectedDestino(session.destino);
    toast({ title: "Sessão carregada", description: session.agentName });
    setShowPanel(false);
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
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/simulator-ai`;
      const chatHistory = messages.map(m => `${m.role === "user" ? "CLIENTE" : `AGENTE (${m.agentName || selectedAgent.name})`}: ${m.content}`).join("\n");
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          type: "evaluate",
          systemPrompt: "Voce e um analista de qualidade de agencia de viagens premium. Gere resumos concisos e acionáveis.",
          history: [{ role: "user", content: `Analise esta conversa entre cliente e agente de viagens e gere um resumo executivo com: 1) Destino/interesse do cliente, 2) Perfil do cliente, 3) Próximos passos sugeridos, 4) Pontos de atenção.\n\nCONVERSA:\n${chatHistory}` }],
          provider: "lovable",
        }),
      });
      if (!resp.ok) throw new Error("API error");
      const data = await resp.json();
      const text = data.content || "";
      if (text) setSummaryText(text);
      else setSummaryText("Não foi possível gerar o resumo.");
    } catch { setSummaryText("Erro ao gerar resumo. Tente novamente."); } finally { setSummaryLoading(false); }
  }, [messages, selectedAgent, toast]);

  const agentColor = getAgentColor(selectedAgent);

  // ===== MOBILE PANEL (Bottom Sheet) =====
  const MobilePanel = () => (
    <div className={cn(
      "fixed inset-0 z-50 transition-all duration-300",
      showPanel ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
    )}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPanel(false)} />
      <div className={cn(
        "absolute bottom-0 left-0 right-0 rounded-t-3xl transition-transform duration-300 max-h-[85vh] overflow-hidden flex flex-col",
        showPanel ? "translate-y-0" : "translate-y-full"
      )} style={{ background: "#0D1220", border: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Handle */}
        <div className="flex items-center justify-center pt-3 pb-2 shrink-0">
          <div className="w-12 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
        </div>
        {/* Tabs */}
        <div className="px-5 pb-4 flex gap-2.5 shrink-0">
          {["agente", "destino", "sessoes"].map(t => (
            <button key={t} onClick={() => setPanelTab(t as any)}
              className="flex-1 text-[12px] font-bold py-2.5 rounded-xl transition-all"
              style={{
                background: panelTab === t ? `${agentColor}15` : "rgba(255,255,255,0.04)",
                border: `1px solid ${panelTab === t ? `${agentColor}30` : "rgba(255,255,255,0.08)"}`,
                color: panelTab === t ? agentColor : "#64748B",
              }}>
              {t === "agente" ? "🤖 Agente" : t === "destino" ? "✈️ Destino" : "📋 Sessões"}
            </button>
          ))}
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-8">
          {panelTab === "agente" && (
            <div className="space-y-4">
              {/* Squad filter */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button onClick={() => setActiveSquad("all")} className="text-[11px] px-3 py-2 rounded-xl font-semibold shrink-0 transition-all"
                  style={{ background: activeSquad === "all" ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${activeSquad === "all" ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)"}`, color: activeSquad === "all" ? "#34D399" : "#CBD5E1" }}>
                  Todos
                </button>
                {SQUADS.map(s => (
                  <button key={s.id} onClick={() => setActiveSquad(s.id)} className="text-[11px] px-3 py-2 rounded-xl font-semibold shrink-0 transition-all"
                    style={{ background: activeSquad === s.id ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${activeSquad === s.id ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)"}`, color: activeSquad === s.id ? "#34D399" : "#CBD5E1" }}>
                    {s.name}
                  </button>
                ))}
              </div>
              {/* Agent list */}
              <div className="space-y-2">
                {filteredAgents.map(a => {
                  const c = getAgentColor(a);
                  const active = selectedAgent.id === a.id;
                  return (
                    <button key={a.id} onClick={() => { setSelectedAgent(a); setShowPanel(false); }}
                      className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-left transition-all duration-200"
                      style={{
                        background: active ? `${c}0A` : "rgba(255,255,255,0.02)",
                        border: `1px solid ${active ? `${c}25` : "rgba(255,255,255,0.06)"}`,
                      }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0"
                        style={{ background: `${c}12`, color: c }}>{a.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold" style={{ color: active ? c : "#E2E8F0" }}>{a.name}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: "#94A3B8" }}>{a.role} · Lv.{a.level}</p>
                      </div>
                      <span className="text-[11px] font-bold tabular-nums" style={{ color: "#34D399" }}>{a.successRate}%</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {panelTab === "destino" && (
            <div className="grid grid-cols-3 gap-2.5">
              {DESTINOS.map(d => {
                const isRandom = d === "🎲 Aleatório";
                const isActive = isRandom ? !DESTINOS.slice(1).includes(selectedDestino) : selectedDestino === d;
                return (
                  <button key={d} onClick={() => { setSelectedDestino(d); setShowPanel(false); }}
                    className="text-[12px] px-3 py-3.5 rounded-xl font-medium transition-all text-center"
                    style={{
                      background: isActive ? (isRandom ? "rgba(139,92,246,0.12)" : "rgba(245,158,11,0.1)") : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isActive ? (isRandom ? "rgba(139,92,246,0.4)" : "rgba(245,158,11,0.35)") : "rgba(255,255,255,0.08)"}`,
                      color: isActive ? (isRandom ? "#C4B5FD" : "#FCD34D") : "#CBD5E1",
                    }}>{isRandom && isActive ? `🎲 ${selectedDestino}` : d}</button>
                );
              })}
            </div>
          )}
          {panelTab === "sessoes" && (
            <div className="space-y-2.5">
              {sessions.length === 0 && <p className="text-[13px] text-center py-10" style={{ color: "#475569" }}>Nenhuma sessão salva</p>}
              {sessions.slice(0, 15).map(session => (
                <div key={session.id} onClick={() => loadSession(session)}
                  className="rounded-xl p-3.5 cursor-pointer transition-all"
                  style={{
                    background: session.id === currentSessionId ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${session.id === currentSessionId ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)"}`,
                  }}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{session.agentEmoji}</span>
                    <span className="text-[13px] font-bold flex-1 truncate" style={{ color: "#E2E8F0" }}>{session.agentName}</span>
                    <span className="text-[11px] font-medium" style={{ color: "#FCD34D" }}>{session.destino}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 pl-8">
                    <span className="text-[11px]" style={{ color: "#64748B" }}>
                      {new Date(session.updatedAt).toLocaleDateString("pt-BR")} · {session.messages.length} msgs
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                      className="text-[11px] w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-colors" style={{ color: "#EF4444" }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const [panelTab, setPanelTab] = useState<"agente" | "destino" | "sessoes">("agente");

  // ===== RENDER =====
  return (
    <>
      <div className={cn(
        "flex animate-in fade-in slide-in-from-bottom-2 duration-500",
        isMobile ? "flex-col" : "gap-5"
      )} style={{ height: isMobile ? "calc(100vh - 160px)" : "calc(100vh - 220px)", minHeight: isMobile ? 400 : 550 }}>

        {/* ═══════════ CHAT AREA ═══════════ */}
        <div className="flex-1 rounded-2xl flex flex-col overflow-hidden relative" style={{ background: "#0B141A", border: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Ambient glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-24 pointer-events-none" style={{ background: `radial-gradient(ellipse, ${agentColor}08, transparent 70%)` }} />

          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 md:px-5 shrink-0 relative z-10" style={{ height: isMobile ? 60 : 66, background: "linear-gradient(180deg, rgba(31,44,51,0.95), rgba(31,44,51,0.85))", backdropFilter: "blur(12px)" }}>
            <button
              onClick={() => { if (isMobile) { setPanelTab("agente"); setShowPanel(true); } }}
              className="relative shrink-0"
            >
              <div className={cn("rounded-2xl flex items-center justify-center font-bold transition-all duration-300", isMobile ? "w-10 h-10 text-sm" : "w-11 h-11 text-base")}
                style={{ background: `${agentColor}15`, color: agentColor, border: `2px solid ${agentColor}40`, boxShadow: `0 0 20px ${agentColor}15` }}>
                {selectedAgent.emoji}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full" style={{ background: "#25D366", border: "2px solid #1F2C33" }}>
                <span className="absolute inset-0 rounded-full animate-ping" style={{ background: "#25D366", opacity: 0.4 }} />
              </span>
            </button>
            <div className="flex-1 min-w-0" onClick={() => { if (isMobile) { setPanelTab("agente"); setShowPanel(true); } }}>
              <div className="flex items-center gap-2">
                <p className={cn("font-bold truncate", isMobile ? "text-[14px]" : "text-[15px]")} style={{ color: "#F1F5F9" }}>{selectedAgent.name}</p>
                {isMobile && <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: "#94A3B8" }} />}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3 h-3 shrink-0" style={{ color: "#F59E0B" }} />
                <p className={cn("truncate", isMobile ? "text-[11px]" : "text-[12px]")} style={{ color: "#94A3B8" }}>
                  {isMobile ? `${selectedDestino} · Lv.${selectedAgent.level}` : `Especialista ${selectedDestino} · Lv.${selectedAgent.level} · ${selectedAgent.role}`}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {isMobile ? (
                <>
                  <button onClick={generateSummary} disabled={messages.length < 2}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                    style={{ background: "rgba(255,255,255,0.06)", opacity: messages.length < 2 ? 0.3 : 1 }}>
                    <FileText className="w-4 h-4" style={{ color: "#CBD5E1" }} />
                  </button>
                  <button onClick={resetChat}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                    style={{ background: `${agentColor}10` }}>
                    <RotateCcw className="w-4 h-4" style={{ color: agentColor }} />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: "rgba(0,0,0,0.25)" }}>
                  {FUNNEL_STAGES.map((stage, i) => (
                    <div key={i} className="flex items-center gap-1" title={stage}>
                      <div className="w-2.5 h-2.5 rounded-full transition-all duration-500 relative" style={{
                        background: i < currentStage ? "#10B981" : i === currentStage ? agentColor : "rgba(255,255,255,0.1)",
                        boxShadow: i === currentStage ? `0 0 8px ${agentColor}80` : "none",
                      }}>
                        {i === currentStage && <div className="absolute inset-0 rounded-full animate-ping" style={{ background: agentColor, opacity: 0.3 }} />}
                      </div>
                      {i < FUNNEL_STAGES.length - 1 && <div className="w-4 h-px" style={{ background: i < currentStage ? "#10B98160" : "rgba(255,255,255,0.06)" }} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Transfer notice */}
          {transferNotice && (
            <div className="flex items-center justify-center py-2.5 animate-in fade-in zoom-in-95 duration-300" style={{ background: "rgba(6,182,212,0.06)" }}>
              <div className="flex items-center gap-2 text-[12px] font-medium px-4 py-1.5 rounded-full" style={{ background: "rgba(6,182,212,0.08)", color: "#22D3EE", border: "1px solid rgba(6,182,212,0.15)" }}>
                <Plane className="w-3.5 h-3.5" /> {transferNotice}
              </div>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className={cn("flex-1 overflow-y-auto", isMobile ? "p-3 space-y-2.5" : "p-5 space-y-3")} style={{ background: "#0B141A" }}>
            {messages.length === 0 && (
              <div className={cn("text-center animate-in fade-in zoom-in-95 duration-700", isMobile ? "py-12 space-y-5" : "py-20 space-y-6")}>
                <div className={cn("relative mx-auto", isMobile ? "w-18 h-18" : "w-24 h-24")}>
                  <div className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, ${agentColor}12, transparent)` }} />
                  <div className={cn("absolute rounded-full flex items-center justify-center", isMobile ? "inset-2" : "inset-3")} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className={isMobile ? "text-3xl" : "text-4xl"}>{selectedAgent.emoji}</span>
                  </div>
                </div>
                <div>
                  <p className={cn("font-semibold", isMobile ? "text-[15px]" : "text-[17px]")} style={{ color: "#E9EDEF" }}>
                    Converse com {selectedAgent.name}
                  </p>
                  <p className={cn("mt-1.5", isMobile ? "text-[12px]" : "text-[13px]")} style={{ color: "#94A3B8" }}>
                    Simule um cliente interessado em {selectedDestino}
                  </p>
                </div>
                <div className={cn("flex flex-wrap gap-2.5 justify-center mx-auto", isMobile ? "max-w-[340px]" : "max-w-lg")}>
                  {SUGGESTION_CHIPS.map(chip => (
                    <button key={chip} onClick={() => handleSend(chip)}
                      className={cn("rounded-xl transition-all duration-300 hover:scale-[1.03]", isMobile ? "text-[12px] px-3.5 py-2.5" : "text-[13px] px-4 py-2.5")}
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#CBD5E1" }}>
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
                  className={cn("flex animate-in duration-300", isAgent ? "justify-start slide-in-from-left-3" : "justify-end slide-in-from-right-3")}>
                  <div className="relative" style={{
                    background: isAgent ? "rgba(31,44,51,0.9)" : "linear-gradient(135deg, #005C4B, #00694D)",
                    color: "#E9EDEF",
                    borderRadius: isAgent ? "4px 18px 18px 18px" : "18px 4px 18px 18px",
                    maxWidth: isMobile ? "82%" : "68%", padding: isMobile ? "10px 14px" : "12px 16px",
                    boxShadow: isAgent ? "0 2px 8px rgba(0,0,0,0.15)" : "0 2px 12px rgba(0,92,75,0.25)",
                  }}>
                    {showName && msg.agentName && (
                      <p className="text-[12px] font-bold mb-1.5" style={{ color: agentColor }}>{msg.agentName}</p>
                    )}
                    <p className={cn("leading-[1.65]", isMobile ? "text-[13px]" : "text-[14px]")}>{msg.content.replace("[TRANSFERIR]", "").trim()}</p>
                    <div className="flex items-center justify-end gap-1.5 mt-1.5">
                      <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {new Date(msg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {!isAgent && <span className="text-[10px]" style={{ color: "#34B7F1" }}>✓✓</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex animate-in slide-in-from-left-3 duration-300">
                <div className="px-5 py-3.5 rounded-2xl" style={{ background: "rgba(31,44,51,0.9)" }}>
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: agentColor, animationDelay: `${i * 200}ms`, opacity: 0.7 }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className={cn("flex items-center gap-3 shrink-0", isMobile ? "px-3 py-3" : "px-5 py-3.5")} style={{ background: "rgba(31,44,51,0.6)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <input
              placeholder="Digite como um cliente..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              disabled={loading}
              className={cn("flex-1 rounded-xl outline-none transition-all focus:ring-1", isMobile ? "text-[14px] px-4 py-3" : "text-[14px] px-4 py-3")}
              style={{ background: "rgba(255,255,255,0.06)", color: "#E9EDEF", border: "1px solid rgba(255,255,255,0.08)" }}
            />
            <button onClick={() => handleSend()} disabled={loading || !input.trim()}
              className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0"
              style={{
                background: input.trim() ? `linear-gradient(135deg, ${agentColor}, ${agentColor}CC)` : "rgba(255,255,255,0.06)",
                boxShadow: input.trim() ? `0 4px 16px ${agentColor}40` : "none",
                transform: input.trim() ? "scale(1)" : "scale(0.95)",
              }}>
              <Send className="w-4.5 h-4.5" style={{ color: input.trim() ? "#fff" : "#64748B" }} />
            </button>
          </div>
        </div>

        {/* ═══════════ RIGHT PANEL — Desktop only ═══════════ */}
        {!isMobile && (
          <div className="w-[320px] shrink-0 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">
            {/* Quick actions */}
            <div className="space-y-2.5">
              <NathOpinionButton
                messages={messages.map(m => ({ role: m.role === "user" ? "user" : "agent", content: m.content, agentName: m.agentName, timestamp: m.timestamp }))}
                context={`Destino: ${selectedDestino} · Agente: ${selectedAgent.name} (${selectedAgent.role})`}
                variant="floating"
              />
              <div className="flex gap-2">
                <button onClick={generateSummary} disabled={messages.length < 2}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: messages.length < 2 ? "#475569" : "#CBD5E1" }}>
                  <FileText className="w-4 h-4" /> Resumo IA
                </button>
                <button onClick={resetChat}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all"
                  style={{ background: `${agentColor}08`, border: `1px solid ${agentColor}20`, color: agentColor }}>
                  <RotateCcw className="w-4 h-4" /> Nova
                </button>
              </div>
            </div>

            {/* Agent profile card */}
            <div className="rounded-2xl relative" style={{ background: "linear-gradient(145deg, rgba(15,20,35,0.95), rgba(15,20,35,0.75))", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl" style={{ background: `linear-gradient(90deg, transparent, ${agentColor}, transparent)` }} />
              <div className="p-4 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ background: `${agentColor}15`, border: `1.5px solid ${agentColor}30` }}>
                    {selectedAgent.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold tracking-wide truncate" style={{ color: "#F1F5F9" }}>{selectedAgent.name}</p>
                    <p className="text-[11px] mt-0.5 truncate" style={{ color: "#94A3B8" }}>{selectedAgent.role}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-px mx-4 mb-3 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="text-center py-2.5" style={{ background: "rgba(15,20,35,0.9)" }}>
                  <p className="text-[14px] font-extrabold tabular-nums" style={{ color: "#10B981" }}>{selectedAgent.successRate}%</p>
                  <p className="text-[8px] uppercase tracking-wider mt-0.5 font-semibold" style={{ color: "#64748B" }}>Sucesso</p>
                </div>
                <div className="text-center py-2.5" style={{ background: "rgba(15,20,35,0.9)" }}>
                  <p className="text-[14px] font-extrabold tabular-nums" style={{ color: "#F1F5F9" }}>{selectedAgent.tasksToday}</p>
                  <p className="text-[8px] uppercase tracking-wider mt-0.5 font-semibold" style={{ color: "#64748B" }}>Tarefas</p>
                </div>
                <div className="text-center py-2.5" style={{ background: "rgba(15,20,35,0.9)" }}>
                  <p className="text-[14px] font-extrabold tabular-nums" style={{ color: agentColor }}>Lv.{selectedAgent.level}</p>
                  <p className="text-[8px] uppercase tracking-wider mt-0.5 font-semibold" style={{ color: "#64748B" }}>Nível</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 px-4 pb-4">
                {selectedAgent.skills.slice(0, 4).map(s => (
                  <span key={s} className="text-[9px] px-2 py-0.5 rounded-md font-medium" style={{ background: "rgba(255,255,255,0.04)", color: "#94A3B8", border: "1px solid rgba(255,255,255,0.06)" }}>{s}</span>
                ))}
              </div>
            </div>

            {/* Squad filter + agents */}
            <div className="rounded-2xl p-5" style={{ background: "rgba(15,20,35,0.75)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-[10px] uppercase tracking-[0.14em] font-bold mb-3" style={{ color: "#64748B" }}>Agentes</p>
              <div className="flex gap-1.5 flex-wrap mb-4">
                <button onClick={() => setActiveSquad("all")} className="text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all"
                  style={{ background: activeSquad === "all" ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${activeSquad === "all" ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)"}`, color: activeSquad === "all" ? "#34D399" : "#CBD5E1" }}>
                  Todos
                </button>
                {SQUADS.map(s => (
                  <button key={s.id} onClick={() => setActiveSquad(s.id)} className="text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all"
                    style={{ background: activeSquad === s.id ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${activeSquad === s.id ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)"}`, color: activeSquad === s.id ? "#34D399" : "#CBD5E1" }}>
                    {s.emoji} {s.name.replace("Squad ", "")}
                  </button>
                ))}
              </div>
              <div className="space-y-1 max-h-[240px] overflow-y-auto custom-scrollbar">
                {filteredAgents.map(a => {
                  const c = getAgentColor(a);
                  const active = selectedAgent.id === a.id;
                  return (
                    <button key={a.id} onClick={() => setSelectedAgent(a)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200"
                      style={{
                        background: active ? `${c}0A` : "transparent",
                        border: `1px solid ${active ? `${c}25` : "transparent"}`,
                      }}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
                        style={{ background: `${c}12`, color: c }}>{a.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold" style={{ color: active ? c : "#E2E8F0" }}>{a.name}</p>
                        <p className="text-[10px]" style={{ color: "#94A3B8" }}>{a.role}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Destinos */}
            <div className="rounded-2xl p-5" style={{ background: "rgba(15,20,35,0.75)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-[10px] uppercase tracking-[0.14em] font-bold mb-3" style={{ color: "#64748B" }}>Destino</p>
              <div className="flex flex-wrap gap-2">
                {DESTINOS.map(d => {
                  const isRandom = d === "🎲 Aleatório";
                  const isActive = isRandom ? !DESTINOS.slice(1).includes(selectedDestino) : selectedDestino === d;
                  return (
                    <button key={d} onClick={() => setSelectedDestino(d)}
                      className="text-[11px] px-3 py-2 rounded-xl font-medium transition-all"
                      style={{
                        background: isActive ? (isRandom ? "rgba(139,92,246,0.12)" : "rgba(245,158,11,0.1)") : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isActive ? (isRandom ? "rgba(139,92,246,0.4)" : "rgba(245,158,11,0.35)") : "rgba(255,255,255,0.08)"}`,
                        color: isActive ? (isRandom ? "#C4B5FD" : "#FCD34D") : "#CBD5E1",
                      }}>{isRandom && isActive ? `🎲 ${selectedDestino}` : d}</button>
                  );
                })}
              </div>
            </div>

            {/* Sessions */}
            <div className="rounded-2xl p-5" style={{ background: "rgba(15,20,35,0.75)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase tracking-[0.14em] font-bold" style={{ color: "#64748B" }}>Sessões</p>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", color: "#94A3B8" }}>{sessions.length}</span>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                {sessions.length === 0 && <p className="text-[12px] text-center py-8" style={{ color: "#475569" }}>Nenhuma sessão salva</p>}
                {sessions.slice(0, 10).map(s => (
                  <div key={s.id} onClick={() => loadSession(s)}
                    className="rounded-xl p-3 cursor-pointer transition-all duration-200"
                    style={{
                      background: s.id === currentSessionId ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${s.id === currentSessionId ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.05)"}`,
                    }}>
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{s.agentEmoji}</span>
                      <span className="text-[12px] font-semibold flex-1" style={{ color: "#E2E8F0" }}>{s.agentName}</span>
                      <span className="text-[10px] font-medium" style={{ color: "#FCD34D" }}>{s.destino}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 pl-7">
                      <span className="text-[10px]" style={{ color: "#64748B" }}>
                        {new Date(s.updatedAt).toLocaleDateString("pt-BR")} · {s.messages.length} msgs
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                        className="text-[10px] w-6 h-6 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-colors" style={{ color: "#EF4444" }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile bottom sheet */}
      {isMobile && <MobilePanel />}

      {/* Summary dialog */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className={cn("border-0", isMobile ? "max-w-[95vw] rounded-2xl" : "max-w-lg")} style={{ background: "linear-gradient(145deg, #0F1423, #111827)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-[16px]" style={{ color: "#F1F5F9" }}>
              <FileText className="w-5 h-5" style={{ color: "#10B981" }} /> Resumo da Conversa
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {summaryLoading && !summaryText && (
              <div className="flex items-center gap-2.5 py-10 justify-center" style={{ color: "#94A3B8" }}>
                <Loader2 className="w-5 h-5 animate-spin" /> Gerando resumo...
              </div>
            )}
            {summaryText && (
              <div className="whitespace-pre-wrap text-[14px] leading-relaxed" style={{ color: "#E9EDEF" }}>{summaryText}</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
