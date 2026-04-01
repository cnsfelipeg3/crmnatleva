/**
 * SimuladorChameleonMode — Chameleon AI Lead Simulator
 * NatLeva v4.3 — 100% isolated, does NOT modify existing files
 * 
 * Claude vs Claude: Chameleon (lead AI) ↔ Agents (NatLeva AI)
 */

import { useState, useRef, useCallback, useEffect, lazy, Suspense } from "react";
import { Pause, SkipForward, RotateCcw, User, Bot, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { createMonitorBriefing, revealMonitorFields, completeMonitorBriefing, fillAnalysisFields } from "@/lib/quotationMonitor";
import { AGENTS_V4 } from "@/components/ai-team/agentsV4Data";
import { callSimulatorAI } from "@/components/ai-team/simuladorAutoUtils";
import { useGlobalRules, buildGlobalRulesBlock } from "@/hooks/useGlobalRules";
import ChameleonConfig, { type SessionType } from "./ChameleonConfig";
import {
  type ChameleonProfile,
  type ChameleonMessage,
  type ChameleonDebriefData,
  buildChameleonSystemPrompt,
  buildDebriefPrompt,
  buildFirstChameleonMessage,
  buildAgentPromptForChameleon,
  detectSentiment,
  CHALLENGE_PROFILES,
} from "./chameleonUtils";

const ChameleonDebrief = lazy(() => import("./ChameleonDebrief"));

type Phase = "config" | "running" | "paused" | "debrief";

// Pipeline order for commercial agents
const PIPELINE_ORDER = ["maya", "atlas", "habibi", "nemo", "dante", "luna", "nero", "iris"];

function getNextAgentInPipeline(currentAgentId: string, selectedAgents: string[]): string | null {
  const currentIdx = PIPELINE_ORDER.indexOf(currentAgentId);
  for (let i = currentIdx + 1; i < PIPELINE_ORDER.length; i++) {
    if (selectedAgents.includes(PIPELINE_ORDER[i])) {
      return PIPELINE_ORDER[i];
    }
  }
  return null;
}

export default function SimuladorChameleonMode() {
  const isMobile = useIsMobile();
  const [phase, setPhase] = useState<Phase>("config");
  const [profile, setProfile] = useState<ChameleonProfile | null>(null);
  const [messages, setMessages] = useState<ChameleonMessage[]>([]);
  const [currentAgentId, setCurrentAgentId] = useState("maya");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [maxExchanges, setMaxExchanges] = useState(20);
  const [sessionType, setSessionType] = useState<SessionType>("random");
  const [challengeId, setChallengeId] = useState<string | undefined>();
  const [exchangeCount, setExchangeCount] = useState(0);
  const [debrief, setDebrief] = useState<ChameleonDebriefData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [startLoading, setStartLoading] = useState(false);
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);
  const monitorBriefingIdRef = useRef<string | null>(null);
  const { data: globalRules = [] } = useGlobalRules();
  const globalRulesBlock = buildGlobalRulesBlock(globalRules);

  // Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sentiment = detectSentiment(messages);

  // ─── Start session ───
  const handleStart = useCallback(async (
    p: ChameleonProfile,
    agents: string[],
    maxEx: number,
    sType: SessionType,
    chId?: string,
  ) => {
    setStartLoading(true);
    setProfile(p);
    setSelectedAgents(agents);
    setMaxExchanges(maxEx);
    setSessionType(sType);
    setChallengeId(chId);
    setMessages([]);
    setExchangeCount(0);
    setDebrief(null);
    abortRef.current = false;

    // First agent is the first in pipeline order that is selected
    const firstAgent = PIPELINE_ORDER.find(a => agents.includes(a)) || agents[0];
    setCurrentAgentId(firstAgent);

    // Generate first message from Chameleon
    const firstMsg = buildFirstChameleonMessage(p);
    const msg: ChameleonMessage = {
      role: "lead",
      content: firstMsg,
      timestamp: Date.now(),
      sentiment: "😐",
    };

    setMessages([msg]);
    setPhase("running");
    setStartLoading(false);

    // Create monitor briefing for real-time tracking
    createMonitorBriefing({ nome: p.nome, destino: p.destino, orcamento: p.orcamentoLabel, paxLabel: p.composicaoLabel, motivacao: p.motivacao, origem: "Camaleão" }).then(bId => {
      monitorBriefingIdRef.current = bId;
      if (bId) revealMonitorFields(bId, 0, p).catch(() => {});
    });

    // Kick off the conversation loop
    setTimeout(() => runConversationStep(p, [msg], firstAgent, agents, maxEx, 0, sType, chId), 1500);
  }, [globalRulesBlock]);

  // ─── Conversation step (agent responds, then chameleon responds) ───
  const runConversationStep = useCallback(async (
    p: ChameleonProfile,
    currentMessages: ChameleonMessage[],
    agentId: string,
    agents: string[],
    maxEx: number,
    currentExchanges: number,
    sType: SessionType,
    chId?: string,
  ) => {
    if (abortRef.current || currentExchanges >= maxEx) {
      // End session
      runDebrief(p, currentMessages, sType, chId);
      return;
    }

    setIsProcessing(true);
    const agent = AGENTS_V4.find(a => a.id === agentId);
    if (!agent) return;

    // ── Step 1: Agent responds ──
    setStatusText(`${agent.emoji} ${agent.name} está respondendo...`);

    try {
      // Fetch DB overrides for agent
      let dbData: { behavior_prompt?: string | null; persona?: string | null; skills?: string[] } | undefined;
      try {
        const { data } = await supabase
          .from("ai_team_agents")
          .select("behavior_prompt, persona, skills")
          .eq("id", agentId)
          .maybeSingle();
        if (data) dbData = data;
      } catch { /* fallback to static */ }

      const agentPrompt = buildAgentPromptForChameleon(agentId, globalRulesBlock, dbData);

      // Build history in OpenAI format
      const history = currentMessages.map(m => ({
        role: m.role === "lead" ? "user" : "assistant",
        content: m.content,
      }));

      const agentResponse = await callSimulatorAI(agentPrompt, history, "agent");

      if (abortRef.current) return;

      // Check for transfer
      const isTransfer = agentResponse.includes("[TRANSFERIR]");
      const cleanResponse = agentResponse.replace(/\[TRANSFERIR\]/g, "").trim();

      const agentMsg: ChameleonMessage = {
        role: "agent",
        content: cleanResponse,
        agentId,
        agentName: agent.name,
        timestamp: Date.now(),
      };

      const updatedMessages = [...currentMessages, agentMsg];
      setMessages(updatedMessages);

      // Handle transfer
      let nextAgentId = agentId;
      if (isTransfer) {
        const next = getNextAgentInPipeline(agentId, agents);
        if (next) {
          nextAgentId = next;
          setCurrentAgentId(next);
        }
      }

      if (abortRef.current) return;

      // ── Step 2: Chameleon responds ──
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
      if (abortRef.current) return;

      setStatusText(`🦎 ${p.nome} está digitando...`);

      const challengeOverride = chId
        ? CHALLENGE_PROFILES.find(c => c.id === chId)?.promptOverride
        : undefined;

      const chameleonSysPrompt = buildChameleonSystemPrompt(p, challengeOverride);

      // Build conversation from Chameleon's perspective
      const chameleonHistory = updatedMessages.map(m => ({
        role: m.role === "lead" ? "assistant" : "user",
        content: m.role === "agent" ? `Nath (agente): ${m.content}` : m.content,
      }));

      const chameleonResponse = await callSimulatorAI(
        chameleonSysPrompt,
        chameleonHistory,
        "lead",
      );

      if (abortRef.current) return;

      const leadMsg: ChameleonMessage = {
        role: "lead",
        content: chameleonResponse,
        timestamp: Date.now(),
        sentiment: detectSentiment([...updatedMessages, { role: "lead", content: chameleonResponse, timestamp: Date.now() }]),
      };

      const finalMessages = [...updatedMessages, leadMsg];
      setMessages(finalMessages);
      const newExchanges = currentExchanges + 1;
      setExchangeCount(newExchanges);
      setIsProcessing(false);

      // Progressive monitor field reveal
      const mBid = monitorBriefingIdRef.current;
      if (mBid) revealMonitorFields(mBid, newExchanges, p).catch(() => {});

      // Continue loop
      if (!abortRef.current && newExchanges < maxEx) {
        setTimeout(() => runConversationStep(p, finalMessages, nextAgentId, agents, maxEx, newExchanges, sType, chId), 2000);
      } else {
        runDebrief(p, finalMessages, sType, chId);
      }
    } catch (err) {
      console.error("Chameleon conversation error:", err);
      setIsProcessing(false);
      setStatusText("Erro na conversa. Gerando análise...");
      setTimeout(() => runDebrief(p, currentMessages, sType, chId), 1000);
    }
  }, [globalRulesBlock]);

  // ─── Debrief ───
  const runDebrief = useCallback(async (
    p: ChameleonProfile,
    msgs: ChameleonMessage[],
    sType: SessionType,
    chId?: string,
  ) => {
    setIsProcessing(true);
    setStatusText("🔍 Camaleão está analisando a conversa...");

    try {
      const debriefPrompt = buildDebriefPrompt(p, msgs);
      const debriefResponse = await callSimulatorAI(
        "Voce e um especialista em atendimento ao cliente e avaliacao de qualidade. Responda apenas em JSON valido.",
        [{ role: "user", content: debriefPrompt }],
        "debrief",
      );

      let parsed: ChameleonDebriefData;
      try {
        // Try to extract JSON from response
        const jsonMatch = debriefResponse.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch?.[0] || debriefResponse);
      } catch {
        // Fallback debrief
        parsed = {
          scores: {
            escutaAtiva: 6,
            memoria: 5,
            naturalidade: 6,
            valorAgregado: 5,
            inteligenciaEmocional: 6,
            eficiencia: 5,
          },
          scoreGeral: 5.5,
          momentosPositivos: [{ frase: "Análise não disponível", motivo: "Erro ao processar resposta da IA" }],
          errosCriticos: [],
          veredicto: "Não foi possível gerar uma análise detalhada. Revise a transcrição manualmente.",
          sugestoes: [],
        };
      }

      setDebrief(parsed);
      setPhase("debrief");

      // Complete monitor briefing
      const mBid = monitorBriefingIdRef.current;
      if (mBid) {
        fillAnalysisFields(mBid, p.nome, p.destino, parsed.veredicto).catch(() => {});
        completeMonitorBriefing(mBid).catch(() => {});
      }

      // Save to DB
      try {
        await supabase.from("chameleon_sessions").insert({
          profile_data: p as any,
          transcript: msgs as any,
          debrief: parsed as any,
          agents_tested: [...new Set(msgs.filter(m => m.agentId).map(m => m.agentId!))],
          score_final: parsed.scoreGeral,
          max_exchanges: msgs.filter(m => m.role === "lead").length,
          status: "completed",
          session_type: sType,
        });
      } catch (err) {
        console.error("Error saving chameleon session:", err);
      }
    } catch (err) {
      console.error("Debrief error:", err);
    } finally {
      setIsProcessing(false);
      setStatusText("");
    }
  }, []);

  // ─── Controls ───
  const handlePause = () => {
    abortRef.current = true;
    setPhase("paused");
    setStatusText("Sessão pausada");
  };

  const handleResume = () => {
    if (!profile) return;
    abortRef.current = false;
    setPhase("running");
    setStatusText("");
    runConversationStep(profile, messages, currentAgentId, selectedAgents, maxExchanges, exchangeCount, sessionType, challengeId);
  };

  const handleSkipToDebrief = () => {
    abortRef.current = true;
    if (profile) {
      runDebrief(profile, messages, sessionType, challengeId);
    }
  };

  const handleReset = () => {
    abortRef.current = true;
    setPhase("config");
    setProfile(null);
    setMessages([]);
    setDebrief(null);
    setExchangeCount(0);
    setStatusText("");
  };

  const currentAgent = AGENTS_V4.find(a => a.id === currentAgentId);
  const isMobile = useIsMobile();
  const [showMobilePanel, setShowMobilePanel] = useState(false);

  // ─── CONFIG PHASE ───
  if (phase === "config") {
    return <ChameleonConfig onStart={handleStart} loading={startLoading} />;
  }

  // ─── Mobile sidebar content (reused) ───
  const sidebarContent = (
    <>
      {/* Profile card */}
      {profile && (
        <div className="rounded-xl p-3 md:p-4" style={{
          background: "rgba(15,23,42,0.7)",
          border: "1px solid rgba(139,92,246,0.15)",
        }}>
          <div className="flex items-center gap-2 mb-2 md:mb-3">
            <span className="text-lg md:text-xl">🦎</span>
            <div>
              <p className="text-xs md:text-sm font-bold" style={{ color: "#E2E8F0" }}>{profile.nome}</p>
              <p className="text-[10px]" style={{ color: "#64748B" }}>{profile.idade} anos • {profile.profissao}</p>
            </div>
          </div>
          <div className={cn("text-[11px] space-y-1", isMobile ? "grid grid-cols-2 gap-x-3 gap-y-1 space-y-0" : "space-y-1.5")} style={{ color: "#94A3B8" }}>
            <p>📍 {profile.cidade}</p>
            <p>✈️ {profile.destino}</p>
            <p>💰 {profile.orcamentoLabel}</p>
            <p>👥 {profile.composicaoLabel}</p>
            <p>📅 {profile.periodo}</p>
            <p>💡 {profile.motivacao}</p>
            {!isMobile && <p>🧠 {profile.personalidade.join(", ")}</p>}
          </div>
        </div>
      )}

      {/* Status */}
      <div className="rounded-xl p-3 md:p-4" style={{
        background: "rgba(15,23,42,0.7)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div className={cn("gap-3", isMobile ? "flex items-center justify-between" : "space-y-3")}>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium" style={{ color: "#94A3B8" }}>Sentimento</span>
            <span className={isMobile ? "text-lg" : "text-2xl"}>{sentiment}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium" style={{ color: "#94A3B8" }}>Agente</span>
            <span className="text-xs font-bold" style={{ color: "#6EE7B7" }}>
              {currentAgent?.emoji} {currentAgent?.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-bold" style={{ color: "#C4B5FD" }}>
              {exchangeCount}/{maxExchanges}
            </span>
          </div>
        </div>
        {!isMobile && (
          <div className="w-full h-1.5 rounded-full overflow-hidden mt-3" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(exchangeCount / maxExchanges) * 100}%`,
                background: "linear-gradient(90deg, #8B5CF6, #A78BFA)",
              }}
            />
          </div>
        )}
      </div>

      {/* Transfer log */}
      {messages.some(m => m.role === "agent") && (
        <div className="rounded-xl p-3 md:p-4" style={{
          background: "rgba(15,23,42,0.7)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <p className="text-[11px] font-bold mb-2" style={{ color: "#94A3B8" }}>Pipeline</p>
          <div className="flex flex-wrap gap-1.5">
            {[...new Set(messages.filter(m => m.agentId).map(m => m.agentId!))].map(aid => {
              const a = AGENTS_V4.find(x => x.id === aid);
              return (
                <span key={aid} className="px-2 py-1 rounded-md text-[10px] font-medium" style={{
                  background: aid === currentAgentId ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)",
                  color: aid === currentAgentId ? "#6EE7B7" : "#64748B",
                  border: `1px solid ${aid === currentAgentId ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.05)"}`,
                }}>
                  {a?.emoji} {a?.name}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Debrief score summary */}
      {phase === "debrief" && debrief && (
        <div className="rounded-xl p-3 md:p-4 text-center" style={{
          background: "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(139,92,246,0.05))",
          border: "1px solid rgba(139,92,246,0.2)",
        }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#A78BFA" }}>Score Final</p>
          <p className={cn("text-3xl md:text-4xl font-black",
            debrief.scoreGeral >= 7 ? "text-emerald-400" :
            debrief.scoreGeral >= 5 ? "text-amber-400" : "text-red-400"
          )}>
            {debrief.scoreGeral.toFixed(1)}
          </p>
        </div>
      )}
    </>
  );

  // ─── CONVERSATION / DEBRIEF PHASE ───
  return (
    <div className={cn("flex", isMobile ? "flex-col" : "gap-4")} style={{ height: isMobile ? "calc(100vh - 200px)" : "calc(100vh - 220px)" }}>
      {/* Mobile: collapsible info bar */}
      {isMobile && (
        <div className="shrink-0">
          <button
            onClick={() => setShowMobilePanel(!showMobilePanel)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl mb-2"
            style={{
              background: "rgba(15,23,42,0.7)",
              border: "1px solid rgba(139,92,246,0.15)",
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span>🦎</span>
              <span className="text-xs font-bold truncate" style={{ color: "#E2E8F0" }}>{profile?.nome}</span>
              <span className="text-xs" style={{ color: "#6EE7B7" }}>{currentAgent?.emoji} {currentAgent?.name}</span>
              <span className="text-[10px] font-mono" style={{ color: "#C4B5FD" }}>{exchangeCount}/{maxExchanges}</span>
              <span className="text-lg">{sentiment}</span>
            </div>
            {showMobilePanel ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: "#94A3B8" }} /> : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "#94A3B8" }} />}
          </button>
          {showMobilePanel && (
            <div className="space-y-2 mb-2 max-h-[40vh] overflow-y-auto">
              {sidebarContent}
            </div>
          )}
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 flex flex-col rounded-2xl overflow-hidden min-h-0" style={{
        background: "rgba(15,23,42,0.7)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        {/* Chat header */}
        <div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3 shrink-0" style={{
          background: "rgba(0,0,0,0.3)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base md:text-lg">🦎</span>
            <div className="min-w-0">
              <p className="text-xs md:text-sm font-bold truncate" style={{ color: "#E2E8F0" }}>
                {profile?.nome || "Camaleão"}
              </p>
              <p className="text-[10px] truncate" style={{ color: "#64748B" }}>
                {phase === "debrief" ? "Análise completa" : statusText || "Conversa em andamento..."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            {phase === "running" && (
              <>
                <button onClick={handlePause} className="p-1.5 md:p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <Pause className="w-4 h-4" style={{ color: "#94A3B8" }} />
                </button>
                <button onClick={handleSkipToDebrief} className="p-1.5 md:p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <SkipForward className="w-4 h-4" style={{ color: "#94A3B8" }} />
                </button>
              </>
            )}
            {phase === "paused" && (
              <button onClick={handleResume} className="px-2.5 py-1.5 rounded-lg text-[11px] md:text-xs font-bold" style={{
                background: "rgba(139,92,246,0.2)",
                color: "#C4B5FD",
                border: "1px solid rgba(139,92,246,0.3)",
              }}>
                ▶ Retomar
              </button>
            )}
            <button onClick={handleReset} className="p-1.5 md:p-2 rounded-lg hover:bg-white/5 transition-colors">
              <RotateCcw className="w-4 h-4" style={{ color: "#94A3B8" }} />
            </button>
          </div>
        </div>

        {/* Messages or Debrief */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
          {phase === "debrief" && debrief ? (
            <Suspense fallback={<Loader2 className="w-5 h-5 animate-spin mx-auto mt-10" style={{ color: "#A78BFA" }} />}>
              <ChameleonDebrief debrief={debrief} />
            </Suspense>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-2", isMobile ? "max-w-[92%]" : "max-w-[85%]", msg.role === "lead" ? "ml-auto flex-row-reverse" : "")}>
                  <div className="w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center shrink-0 text-xs"
                    style={{
                      background: msg.role === "lead" ? "rgba(139,92,246,0.2)" : "rgba(16,185,129,0.2)",
                      color: msg.role === "lead" ? "#C4B5FD" : "#6EE7B7",
                    }}
                  >
                    {msg.role === "lead" ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                  </div>
                  <div className="rounded-xl px-3 py-2 md:px-3.5 md:py-2.5" style={{
                    background: msg.role === "lead"
                      ? "rgba(139,92,246,0.1)"
                      : "rgba(16,185,129,0.08)",
                    border: `1px solid ${msg.role === "lead" ? "rgba(139,92,246,0.15)" : "rgba(16,185,129,0.1)"}`,
                  }}>
                    {msg.role === "agent" && msg.agentName && (
                      <p className="text-[10px] font-bold mb-1" style={{ color: "#6EE7B7" }}>
                        {AGENTS_V4.find(a => a.id === msg.agentId)?.emoji} {msg.agentName}
                      </p>
                    )}
                    <p className="text-xs leading-relaxed" style={{ color: "#E2E8F0" }}>{msg.content}</p>
                  </div>
                </div>
              ))}

              {isProcessing && (
                <div className="flex items-center gap-2 px-3 py-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#A78BFA", animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#A78BFA", animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#A78BFA", animationDelay: "300ms" }} />
                  </div>
                  <span className="text-[11px]" style={{ color: "#64748B" }}>{statusText}</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Desktop sidebar */}
      {!isMobile && (
        <div className="w-[280px] shrink-0 space-y-3 overflow-y-auto">
          {sidebarContent}
        </div>
      )}
    </div>
  );
}
