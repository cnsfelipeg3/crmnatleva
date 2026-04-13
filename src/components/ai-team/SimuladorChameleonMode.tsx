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
import { useAgencyConfig } from "@/hooks/useAgencyConfig";
import { buildKnowledgeBlocksByAgent } from "@/components/ai-team/knowledgeRouting";
import { debugLog } from "@/lib/debugMode";
import { enforceAgentFormatting, stripRepeatedLeadingName } from "./agentFormatting";
import { fullCompliancePipeline } from "./complianceEngine";
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
import SimuladorReport from "./SimuladorReport";
import ConversationIntelligencePanel from "./ConversationIntelligencePanel";

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
  const { config: agencyConfig } = useAgencyConfig();

  // Load KB and behavior_prompts from DB (same as manual simulator)
  const [kbContent, setKbContent] = useState<Record<string, string>>({});
  const [agentBehaviors, setAgentBehaviors] = useState<Record<string, string>>({});
  // Cache enrichment data (skills + workflows) at mount — avoids repeated DB queries per turn
  const enrichmentCacheRef = useRef<Record<string, string>>({});
  const enrichmentLoadedRef = useRef(false);

  useEffect(() => {
    // Parallel load: behaviors, KB, and enrichment cache
    Promise.all([
      supabase.from("ai_team_agents").select("id, behavior_prompt").then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((a: any) => { if (a.behavior_prompt) map[a.id] = a.behavior_prompt; });
          setAgentBehaviors(map);
        }
      }),
      supabase.from("ai_knowledge_base").select("title, category, content_text").eq("is_active", true).then(({ data }) => {
        if (data) setKbContent(buildKnowledgeBlocksByAgent(data));
      }),
      // Pre-load enrichment for ALL agents at once
      (async () => {
        try {
          const cache: Record<string, string> = {};
          const [skillsRes, flowsRes] = await Promise.all([
            supabase.from("agent_skill_assignments")
              .select("agent_id, skill_id, agent_skills(name, prompt_instruction, is_active)")
              .eq("is_active", true),
            supabase.from("automation_flows")
              .select("id, name, description")
              .eq("status", "active")
              .limit(3),
          ]);

          // Index skills by agent
          const skillsByAgent: Record<string, string[]> = {};
          if (skillsRes.data) {
            for (const sa of skillsRes.data) {
              const skill = (sa as any).agent_skills;
              if (!skill?.is_active || !skill?.prompt_instruction) continue;
              const agentId = (sa as any).agent_id;
              (skillsByAgent[agentId] ??= []).push(`- ${skill.name}: ${(skill.prompt_instruction || "").slice(0, 150)}`);
            }
          }

          // Load workflow steps
          let workflowBlock = "";
          if (flowsRes.data && flowsRes.data.length > 0) {
            const flowSteps = await Promise.all(
              flowsRes.data.map(async (flow) => {
                const { data: nodes } = await supabase
                  .from("automation_nodes")
                  .select("label, node_type")
                  .eq("flow_id", flow.id)
                  .order("position_y", { ascending: true })
                  .limit(10);
                if (nodes && nodes.length > 0) {
                  const steps = nodes.map(n => n.label || n.node_type).join(" → ");
                  return `\n[FLUXO]\n"${flow.name}": ${steps}`;
                }
                return "";
              })
            );
            workflowBlock = flowSteps.filter(Boolean).join("\n");
          }

          // Build per-agent enrichment strings
          for (const [agentId, skills] of Object.entries(skillsByAgent)) {
            cache[agentId] = `\n[SKILLS ATUALIZADAS]\n${skills.join("\n")}` + workflowBlock;
          }
          // For agents with no skills, still add workflow block
          if (workflowBlock) {
            for (const a of AGENTS_V4) {
              if (!cache[a.id]) cache[a.id] = workflowBlock;
            }
          }

          enrichmentCacheRef.current = cache;
          enrichmentLoadedRef.current = true;
          debugLog("[CHAMELEON] Enrichment pre-cached for all agents");
        } catch (err) {
          debugLog("[CHAMELEON] Enrichment pre-cache failed (non-fatal)", err);
          enrichmentLoadedRef.current = true;
        }
      })(),
    ]);
  }, []);

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
    setTimeout(() => runConversationStep(p, [msg], firstAgent, agents, maxEx, 0, sType, chId), 500);
  }, [globalRulesBlock, agencyConfig, kbContent, agentBehaviors]);

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
      // Use pre-loaded behavior_prompt (no per-step DB query needed)
      const dbData: { behavior_prompt?: string | null; persona?: string | null; skills?: string[] } = {
        behavior_prompt: agentBehaviors[agentId] || null,
      };

      // Build prompt with agency config + KB (identical to manual simulator)
      let agentPrompt = buildAgentPromptForChameleon(
        agentId,
        globalRulesBlock,
        dbData,
        agencyConfig.agency_name,
        agencyConfig.tom_comunicacao,
        kbContent[agentId] || "",
      );

      // Apply pre-cached enrichment (skills + workflows — loaded once at mount)
      // Skip for Maya — her prompt is self-contained; enrichment dilutes her constraints
      if (agentId !== "maya") {
        const enrichment = enrichmentCacheRef.current[agentId];
        if (enrichment) {
          agentPrompt += enrichment;
        }
      }

      // Build history in OpenAI format
      const history = currentMessages.map(m => ({
        role: m.role === "lead" ? "user" : "assistant",
        content: m.content,
      }));

      const agentResponse = await callSimulatorAI(agentPrompt, history, "agent", undefined, 0, "lovable");

      if (abortRef.current) return;

      // ── Post-processing: enforce formatting (identical to manual simulator) ──
      let cleanResponse = enforceAgentFormatting(agentResponse);

      // ── Compliance Engine: validate against all rules ──
      try {
        const conversationContext = currentMessages.map(m => `${m.role === "lead" ? "Lead" : "Agente"}: ${m.content}`).join("\n");
        const lastLead = [...currentMessages].reverse().find(m => m.role === "lead")?.content || "";
        const agentMsgCount = currentMessages.filter(m => m.role === "agent" && m.agentId === agentId).length;
        const recentAgentMsgs = currentMessages.filter(m => m.role === "agent").map(m => m.content).slice(-5);
        const { text: compliantText, wasRewritten } = await fullCompliancePipeline(
          agentId, cleanResponse, conversationContext, lastLead, agentMsgCount,
          p.nome, recentAgentMsgs,
        );
        if (wasRewritten) {
          debugLog(`[CHAMELEON] Compliance rewrite applied for ${agent.name}`);
        }
        cleanResponse = compliantText;
      } catch (compErr) {
        debugLog("[CHAMELEON] Compliance check failed (non-fatal)", compErr);
      }

      // ── Detect transfer BEFORE stripping tags ──
      const isTransfer = agentResponse.includes("[TRANSFERIR]") || cleanResponse.includes("[TRANSFERIR]");

      // ── Strip ALL internal tags before UI ──
      cleanResponse = cleanResponse.replace(/\[TRANSFERIR\]/g, "").trim();
      cleanResponse = cleanResponse.replace(/\[BRIEFING[^\]]*\]:?\s*/gi, "").trim();
      cleanResponse = cleanResponse.replace(/\[ESCALON[^\]]*\]:?\s*/gi, "").trim();
      cleanResponse = cleanResponse.replace(/\[INTERNO[^\]]*\]:?\s*/gi, "").trim();

      // Name sanitization is now handled inside fullCompliancePipeline

      // ── Final word-count enforcer (deterministic safety net) ──
      const wordLimit = agentId === "maya" ? 70 : 100;
      const wordCount = cleanResponse.split(/\s+/).length;
      if (wordCount > wordLimit) {
        const words = cleanResponse.split(/\s+/).slice(0, wordLimit).join(" ");
        const lastEnd = Math.max(words.lastIndexOf("."), words.lastIndexOf("!"), words.lastIndexOf("?"));
        cleanResponse = lastEnd > words.length * 0.4 ? words.slice(0, lastEnd + 1).trim() : words.trim();
        debugLog(`[CHAMELEON] Word-count enforcer truncated ${agent.name}: ${wordCount} → ${cleanResponse.split(/\s+/).length} words`);
      }

      const agentMsg: ChameleonMessage = {
        role: "agent",
        content: cleanResponse,
        agentId,
        agentName: "Nath",
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

      // ── Step 2: Chameleon responds (reduced delay for speed) ──
      await new Promise(r => setTimeout(r, 800 + Math.random() * 700));
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

      // Progressive monitor field reveal (fire-and-forget)
      const mBid = monitorBriefingIdRef.current;
      if (mBid) revealMonitorFields(mBid, newExchanges, p).catch(() => {});

      // Continue loop (reduced delay)
      if (!abortRef.current && newExchanges < maxEx) {
        setTimeout(() => runConversationStep(p, finalMessages, nextAgentId, agents, maxEx, newExchanges, sType, chId), 600);
      } else {
        runDebrief(p, finalMessages, sType, chId);
      }
    } catch (err) {
      console.error("Chameleon conversation error:", err);
      setIsProcessing(false);
      setStatusText("Erro na conversa. Gerando análise...");
      setTimeout(() => runDebrief(p, currentMessages, sType, chId), 1000);
    }
  }, [globalRulesBlock, agencyConfig, kbContent, agentBehaviors]);

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

  // ─── CONFIG PHASE ───
  if (phase === "config") {
    return <ChameleonConfig onStart={handleStart} loading={startLoading} />;
  }

  // ─── Mobile sidebar content (reused) ───
  const sidebarContent = (
    <>
      {/* Profile card */}
      {profile && (
        <div className="rounded-xl p-3 md:p-4 bg-card border border-border">
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
      <div className="rounded-xl p-3 md:p-4 bg-card border border-border">
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

      {/* Pipeline progress */}
      <div className="rounded-xl p-3 md:p-4 bg-card border border-border">
        <p className="text-[11px] font-bold mb-2" style={{ color: "#94A3B8" }}>Pipeline</p>
        <div className="flex flex-wrap gap-1.5">
          {PIPELINE_ORDER.filter(pid => selectedAgents.includes(pid)).map((pid, idx) => {
            const a = AGENTS_V4.find(x => x.id === pid);
            const isActive = pid === currentAgentId;
            const wasPassed = messages.some(m => m.agentId === pid);
            const isPast = wasPassed && !isActive;
            const currentPipelineIdx = PIPELINE_ORDER.indexOf(currentAgentId);
            const thisPipelineIdx = PIPELINE_ORDER.indexOf(pid);
            const isFuture = thisPipelineIdx > currentPipelineIdx && !wasPassed;
            return (
              <div key={pid} className="flex items-center gap-1">
                {idx > 0 && (
                  <span className="text-[9px] mx-0.5" style={{ color: isPast ? "#6EE7B7" : "#334155" }}>→</span>
                )}
                <span className="px-2 py-1 rounded-md text-[10px] font-medium" style={{
                  background: isActive ? "rgba(16,185,129,0.2)" : isPast ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)",
                  color: isActive ? "#6EE7B7" : isPast ? "#4ADE80" : isFuture ? "#475569" : "#64748B",
                  border: `1px solid ${isActive ? "rgba(16,185,129,0.35)" : isPast ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)"}`,
                  opacity: isFuture ? 0.5 : 1,
                }}>
                  {a?.emoji} {a?.name}
                  {isActive && " ●"}
                  {isPast && " ✓"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Intelligence Panel */}
      <ConversationIntelligencePanel
        messages={messages.map(m => ({ content: m.content, role: m.role, agentName: m.agentName, timestamp: m.timestamp }))}
      />

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
            {(debrief.scoreGeral ?? 0).toFixed(1)}
          </p>
        </div>
      )}
    </>
  );

  // ─── CONVERSATION / DEBRIEF PHASE ───
  return (
    <div className={cn("flex flex-1 min-h-0", isMobile ? "flex-col" : "gap-4")}>
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
      <div className="flex-1 flex flex-col rounded-2xl overflow-hidden min-h-0 bg-card border border-border">
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
            <div className="space-y-6">
              <SimuladorReport
                messages={messages.map(m => ({ role: m.role, content: m.content, agentId: m.agentId, agentName: m.agentName, timestamp: m.timestamp }))}
                agents={selectedAgents}
                durationSeconds={Math.round((Date.now() - (messages[0]?.timestamp || Date.now())) / 1000)}
                mode="chameleon"
                leadProfile={profile ? { nome: profile.nome, destino: profile.destino, orcamento: profile.orcamentoLabel, composicao: profile.composicaoLabel, motivacao: profile.motivacao } : undefined}
                onNewSimulation={handleReset}
              />
              <Suspense fallback={<Loader2 className="w-5 h-5 animate-spin mx-auto mt-10" style={{ color: "#A78BFA" }} />}>
                <ChameleonDebrief debrief={debrief} />
              </Suspense>
            </div>
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
                        {AGENTS_V4.find(a => a.id === msg.agentId)?.emoji} Nath
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
        <div className="w-[300px] shrink-0 space-y-3 overflow-y-auto">
          {sidebarContent}
        </div>
      )}
    </div>
  );
}
