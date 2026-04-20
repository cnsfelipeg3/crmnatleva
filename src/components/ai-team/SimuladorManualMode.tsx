import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { debugLog } from "@/lib/debugMode";
import { clearComplianceCache } from "./complianceEngine";
import { enforceAgentFormatting } from "./agentFormatting";
import { Send, RotateCcw, Loader2, FileText, Trophy, Plane, MapPin, ChevronDown, Users, X, Mic } from "lucide-react";
import NathOpinionButton from "./NathOpinionButton";
import ViewProposalButton from "./ViewProposalButton";
import SimulatorChatLayout, { type SimChatMessage } from "./SimulatorChatLayout";
import SimulatorObservationsPanel, { type SelectedMessage } from "./SimulatorObservationsPanel";
import { AGENTS_V4, SQUADS, type AgentV4 } from "@/components/ai-team/agentsV4Data";
import { getAgentTraining, type AgentTrainingConfig } from "@/components/ai-team/agentTrainingStore";
import { useGlobalRules, buildGlobalRulesBlock } from "@/hooks/useGlobalRules";
import { buildTeamContextBlock, NATH_UNIVERSAL_RULES, getTransferTargets } from "@/components/ai-team/agentTeamContext";
import { buildUnifiedAgentPrompt, fetchApprovedImprovements } from "@/utils/buildAgentPrompt";
import { useAgencyConfig } from "@/hooks/useAgencyConfig";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { buildKnowledgeBlocksByAgent } from "./knowledgeRouting";
import { supabase } from "@/integrations/supabase/client";
import { logAITeamAudit, AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/aiTeamAudit";
import { extractAndSaveBriefing } from "./briefingExtractor";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import ConversationIntelligencePanel from "./ConversationIntelligencePanel";

const DESTINOS = ["💬 Livre", "🎲 Aleatório", "Dubai", "Orlando", "Europa", "Maldivas", "Caribe", "Japão", "Egito", "Tailândia", "Nova York", "Paris", "Grécia", "Bali", "Cancún", "Lisboa", "Seychelles"];

// enforceAgentFormatting is now imported from ./agentFormatting

const DESTINOS_ALEATORIOS = [
  "Butão", "Islândia", "Patagônia", "Fiji", "Tanzânia", "Marrocos", "Sri Lanka",
  "Mongólia", "Noruega", "Croácia", "Nova Zelândia", "Vietnã", "Costa Rica",
  "Jordânia", "Georgia (Cáucaso)", "Madagascar", "Omã", "Eslovênia", "Quirguistão",
  "Namíbia", "Laos", "Bermudas", "Açores", "Zanzibar", "Ruanda", "Belize",
  "Faroe Islands", "Svalbard", "Galápagos", "Reunião", "Tahiti", "Cabo Verde",
  "Uzbequistão", "Lapônia", "Sardenha", "Sicília", "Montenegro", "Albânia",
];

// MIN_TROCAS_MANUAL and AGENT_ROLE_MANUAL moved to src/utils/buildAgentPrompt.ts
// buildManualAgentPrompt replaced by buildUnifiedAgentPrompt from shared util
const SESSIONS_KEY = "natleva_manual_sessions";

interface ChatMsg {
  id: string; role: "user" | "agent"; content: string; timestamp: string; agentId?: string; agentName?: string;
  audioUrl?: string; imageUrl?: string; fileName?: string; attachmentType?: "audio" | "image" | "file";
  replyTo?: { id: string; content: string; role: "user" | "agent"; agentName?: string };
}
interface SavedSession {
  id: string; agentId: string; agentName: string; agentEmoji: string; destino: string;
  messages: ChatMsg[]; createdAt: string; updatedAt: string;
}

interface AIHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

function loadSessions(): SavedSession[] { try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]"); } catch { return []; } }
function saveSessions(sessions: SavedSession[]) { localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, 50))); }

function stripInternalTagsFromHistory(text: string): string {
  return text
    .replace(/\[TRANSFERIR[^\]]*\]/g, "")
    .replace(/\[BRIEFING[^\]]*\]:?\s*/gi, "")
    .replace(/\[ESCALON[^\]]*\]:?\s*/gi, "")
    .replace(/\[INTERNO[^\]]*\]:?\s*/gi, "")
    .trim();
}

function buildConversationHistory(messages: ChatMsg[], destino: string, isLivreMode: boolean): AIHistoryMessage[] {
  return messages
    .filter((message): message is ChatMsg => message.role === "user" || message.role === "agent")
    .map((message, index) => {
      const role: "user" | "assistant" = message.role === "user" ? "user" : "assistant";
      const isFirstUserMessage = role === "user" && index === 0;
      const rawContent = stripInternalTagsFromHistory(message.content);
      const content = isFirstUserMessage && !isLivreMode
        ? `[Simulação - Cliente interessado em ${destino}] ${rawContent}`
        : rawContent;

      return { role, content };
    })
    .filter(m => m.content.length > 0);
}

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
  const { config: agencyConfig } = useAgencyConfig();
  const { data: globalRules = [] } = useGlobalRules();
  const globalRulesBlock = buildGlobalRulesBlock(globalRules);
  // Always start with Maya (index 2 in AGENTS_V4 = maya)
  const mayaAgent = AGENTS_V4.find(a => a.id === "maya") || AGENTS_V4[2];
  const [selectedAgent, setSelectedAgent] = useState(mayaAgent);
  const [selectedDestino, setSelectedDestinoRaw] = useState("💬 Livre");
  const isLivreMode = selectedDestino === "💬 Livre";
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
  const [manualObsSelectedMsg, setManualObsSelectedMsg] = useState<SelectedMessage | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMsg | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const messagesRef = useRef<ChatMsg[]>([]);
  const pendingMessagesRef = useRef<ChatMsg[]>([]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessingRef = useRef(false);

  // Load behavior_prompt from DB for all agents
  const [agentBehaviors, setAgentBehaviors] = useState<Record<string, string>>({});
  const [kbContent, setKbContent] = useState<Record<string, string>>({});
  const [improvementsBlock, setImprovementsBlock] = useState("");
  useEffect(() => {
    supabase.from("ai_team_agents").select("id, behavior_prompt").then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((a: any) => { if (a.behavior_prompt) map[a.id] = a.behavior_prompt; });
        setAgentBehaviors(map);
      }
    });
    // Load KB docs and map to agents by category/title
    supabase.from("ai_knowledge_base").select("title, category, content_text").eq("is_active", true).then(({ data }) => {
      if (data) {
        setKbContent(buildKnowledgeBlocksByAgent(data));
      }
    });
    // Load approved improvements
    fetchApprovedImprovements().then(setImprovementsBlock).catch(console.error);
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current!.scrollHeight, behavior: messages.length > 1 ? "smooth" : "auto" });
      });
    }
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
    setCurrentStage(Math.min(5, Math.floor(messages.length / 4)));
  }, [messages]);

  const filteredAgents = activeSquad === "all" ? AGENTS_V4 : AGENTS_V4.filter(a => a.squadId === activeSquad);
  const manualSystemPrompt = useMemo(
    () => buildUnifiedAgentPrompt({
      agent: selectedAgent,
      globalRulesBlock,
      agencyName: agencyConfig.agency_name,
      agencyTone: agencyConfig.tom_comunicacao,
      knowledgeBlock: kbContent[selectedAgent.id] || "",
      improvementsBlock,
      dbOverride: {
        behavior_prompt: agentBehaviors[selectedAgent.id] || null,
      },
    }),
    [selectedAgent, globalRulesBlock, agencyConfig.agency_name, agencyConfig.tom_comunicacao, kbContent, agentBehaviors, improvementsBlock],
  );

  // ═══ DEBOUNCE CHAT — Input livre, fila de mensagens, resposta em lote ═══
  const DEBOUNCE_MS = 4000;

  const triggerAgentResponse = useCallback(async () => {
    // Strict guard: prevent any concurrent execution
    if (isProcessingRef.current) {
      return;
    }
    const batch = [...pendingMessagesRef.current];
    pendingMessagesRef.current = [];
    if (batch.length === 0) return;

    isProcessingRef.current = true;
    setLoading(true);

    const currentMessages = messagesRef.current;

    // ═══ ENRICHMENT LAYER — additive, safe, no-break ═══
    // behavior_prompt and KB are already in manualSystemPrompt via dbOverride.
    // This layer adds ONLY skills and workflows that aren't already present.
    let enrichmentExtras = "";
    try {
      const baseLower = manualSystemPrompt.toLowerCase();
      let addedSkills = 0, addedWorkflows = 0;
      const extras: string[] = [];

      // 1) Skills from DB
      const { data: skillAssignments } = await supabase
        .from("agent_skill_assignments")
        .select("skill_id, agent_skills(name, prompt_instruction, is_active)")
        .eq("agent_id", selectedAgent.id)
        .eq("is_active", true);
      if (skillAssignments && skillAssignments.length > 0) {
        const newSkills: string[] = [];
        for (const sa of skillAssignments) {
          const skill = sa.agent_skills as any;
          if (!skill || !skill.is_active || !skill.prompt_instruction) continue;
          if (baseLower.includes(skill.name.toLowerCase())) continue;
          newSkills.push(`- ${skill.name}: ${(skill.prompt_instruction || "").slice(0, 150)}`);
        }
        if (newSkills.length > 0) {
          extras.push(`\n[SKILLS ATUALIZADAS]\n${newSkills.join("\n")}`);
          addedSkills = newSkills.length;
        }
      }

      // 2) Active workflow from Flow Builder (lower priority, keep brief)
      const { data: flows } = await supabase
        .from("automation_flows")
        .select("id, name, description")
        .eq("status", "active")
        .limit(2);
      if (flows && flows.length > 0) {
        for (const flow of flows) {
          if (baseLower.includes(flow.name.toLowerCase())) continue;
          const { data: flowNodes } = await supabase
            .from("automation_nodes")
            .select("label, node_type")
            .eq("flow_id", flow.id)
            .order("position_y", { ascending: true })
            .limit(10);
          if (flowNodes && flowNodes.length > 0) {
            const steps = flowNodes.map(n => n.label || n.node_type).join(" → ");
            extras.push(`\n[FLUXO]\n"${flow.name}": ${steps}`);
            addedWorkflows++;
          }
        }
      }

      if (extras.length > 0) {
        enrichmentExtras = extras.join("\n");
      }
      debugLog(`[ENRICHMENT] ${addedSkills} skills, ${addedWorkflows} workflows`);
    } catch (err) {
      debugLog("[ENRICHMENT] Falha silenciosa", err);
    }

    try {
      const isMayaAgent = selectedAgent.id === "maya";
      const finalSystemPrompt = manualSystemPrompt
        + (isMayaAgent ? "" : enrichmentExtras ? "\n" + enrichmentExtras : "");

      // Use configured provider from ai_config
      const configuredProvider = agencyConfig.default_provider || "lovable";

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/simulator-ai`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          type: "agent",
          systemPrompt: finalSystemPrompt,
          history: buildConversationHistory(currentMessages, selectedDestino, isLivreMode),
          provider: configuredProvider,
        }),
      });

      if (!resp.ok || !resp.body) {
        const errorData = resp.status === 429
          ? "IA temporariamente indisponível. Aguarde alguns segundos e tente novamente."
          : resp.status === 402 ? "Créditos insuficientes." : "Erro na comunicação.";
        setMessages(prev => {
          const updated = [...prev, { id: crypto.randomUUID(), role: "agent" as const, content: errorData, timestamp: new Date().toISOString(), agentId: selectedAgent.id, agentName: selectedAgent.name }];
          messagesRef.current = updated;
          return updated;
        });
        setLoading(false);
        isProcessingRef.current = false;
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "", agentText = "";
      const normalizeMessage = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();
      const commitAgentMessage = (text: string) => {
        const normalizedIncoming = normalizeMessage(text);
        if (!normalizedIncoming) return false;

        const lastAgentMessage = [...messagesRef.current].reverse().find(m => m.role === "agent");
        if (lastAgentMessage?.content && normalizeMessage(lastAgentMessage.content) === normalizedIncoming) {
          return false;
        }

        const updated = [
          ...messagesRef.current,
          {
            id: crypto.randomUUID(),
            role: "agent" as const,
            content: text,
            timestamp: new Date().toISOString(),
            agentId: selectedAgent.id,
            agentName: "Nath",
          },
        ];
        messagesRef.current = updated;
        setMessages(updated);
        return true;
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
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content;
            if (c) {
              agentText += c;
            }
          } catch {}
        }
      }

      const textForTransferCheck = agentText;
      if (!agentText) {
        // CORREÇÃO 4: Do NOT show technical error to client — log internally only
        console.error("[AGENT] Empty response from AI — suppressed technical error message");
        debugLog("[AGENT] Resposta vazia da IA — erro técnico suprimido (não exposto ao cliente)");
      } else {
        const cleanedText = enforceAgentFormatting(agentText);
        const committed = commitAgentMessage(cleanedText);

        if (!committed) {
          debugLog("[AGENT] Mensagem duplicada bloqueada no commit final");
        }
      }

      // Transfer uses raw model output so internal tags still work even after visible cleanup.
      if (textForTransferCheck.includes("[TRANSFERIR]")) {
        // ── Pipeline-aware transfer using PIPELINE_MAP ──
        const pipelineTargets = getTransferTargets(selectedAgent.id);
        let nextAgent: AgentV4 | undefined;
        let transferReason = "";

        if (pipelineTargets.length === 1) {
          nextAgent = AGENTS_V4.find(a => a.id === pipelineTargets[0]);
          transferReason = `rota única no pipeline: ${selectedAgent.id}→${pipelineTargets[0]}`;
        } else if (pipelineTargets.length > 1) {
          const allClientText = messagesRef.current
            .filter(m => m.role === "user")
            .map(m => (m.content || "").toLowerCase())
            .join(" ");

          const DESTINATION_KEYWORDS: Record<string, string[]> = {
            habibi: ["dubai", "emirados", "abu dhabi", "oriente", "oriente médio", "qatar", "doha", "arábia", "omã", "bahrein"],
            nemo: ["orlando", "disney", "miami", "eua", "estados unidos", "nova york", "americas", "caribe", "cancun", "cancún", "mexico", "méxico", "las vegas", "los angeles", "califórnia", "hawaii", "punta cana"],
            dante: ["europa", "paris", "londres", "italia", "itália", "roma", "portugal", "espanha", "grecia", "grécia", "amsterdam", "berlim", "praga", "viena", "suíça", "croácia", "santorini"],
          };

          let matchedId = "";
          let matchedKeyword = "";
          for (const [agentId, keywords] of Object.entries(DESTINATION_KEYWORDS)) {
            if (!pipelineTargets.includes(agentId)) continue;
            const found = keywords.find(kw => allClientText.includes(kw));
            if (found) {
              matchedId = agentId;
              matchedKeyword = found;
              break;
            }
          }

          if (matchedId) {
            nextAgent = AGENTS_V4.find(a => a.id === matchedId);
            transferReason = `destino "${matchedKeyword}" detectado no histórico`;
          } else {
            const fallbackId = pipelineTargets.includes("luna") ? "luna" : pipelineTargets[0];
            nextAgent = AGENTS_V4.find(a => a.id === fallbackId);
            transferReason = `sem keyword de destino detectado, fallback para ${fallbackId}`;
          }
        }

        if (!nextAgent) {
          console.warn("[TRANSFER] Sem rota no PIPELINE_MAP para", selectedAgent.name, selectedAgent.id);
          const currentIdx = AGENTS_V4.findIndex(a => a.id === selectedAgent.id);
          const sameSquad = AGENTS_V4.filter(a => a.squadId === selectedAgent.squadId && a.id !== selectedAgent.id);
          nextAgent = sameSquad[0] || AGENTS_V4[(currentIdx + 1) % AGENTS_V4.length];
          transferReason = "fallback por squad (sem rota no PIPELINE_MAP)";
        }

        debugLog(`[TRANSFER] ${selectedAgent.name} → ${nextAgent.name} | Motivo: ${transferReason}`);

        // If ATLAS is transferring, generate a quotation briefing
        if (selectedAgent.id === "atlas") {
          const manualMessages = messagesRef.current.map(m => ({
            role: m.role,
            content: m.content || "",
            agentName: m.agentName,
          }));
          const leadNameMatch = manualMessages.find(m => m.role === "user")?.content || "Lead";
          extractAndSaveBriefing(
            { nome: leadNameMatch.slice(0, 40), messages: manualMessages },
            "manual",
          ).then(result => {
            if (result.success) {
              toast({ title: "📋 Novo Briefing de Cotação", description: "Briefing gerado com sucesso! Veja em Cotações." });
            }
          });
        }

        logAITeamAudit({
          action_type: "create",
          entity_type: AUDIT_ENTITIES.FLOW,
          entity_name: `${selectedAgent.name} → ${nextAgent.name}`,
          agent_id: selectedAgent.id,
          agent_name: selectedAgent.name,
          description: `Transferência: ${selectedAgent.name} → ${nextAgent.name}. ${transferReason}`,
          details: { from: selectedAgent.id, to: nextAgent.id, reason: transferReason },
          performed_by: "Sistema",
        });

        setTransferNotice(`${selectedAgent.name} → ${nextAgent.name}`);
        setSelectedAgent(nextAgent);
        setTimeout(() => setTransferNotice(null), 4000);
      }
    } catch (err) {
      // CORREÇÃO 4: Do NOT show technical error to client — log internally only
      console.error("[AGENT] Error in triggerAgentResponse — suppressed from client", err);
      debugLog("[AGENT] Erro técnico suprimido (não exposto ao cliente)");
    } finally {
      setLoading(false);
      isProcessingRef.current = false;

      // If new messages accumulated during processing, start new debounce cycle
      if (pendingMessagesRef.current.length > 0) {
        debugLog(`[DEBOUNCE] ${pendingMessagesRef.current.length} mensagens pendentes acumuladas durante processamento, novo ciclo em ${DEBOUNCE_MS}ms`);
        debounceTimerRef.current = setTimeout(() => {
          triggerAgentResponse();
        }, DEBOUNCE_MS);
      }
    }
  }, [selectedAgent, selectedDestino, isLivreMode, agentBehaviors, kbContent, manualSystemPrompt]);

  const handleSend = useCallback((overrideText?: string) => {
    const text = overrideText || input.trim();
    if (!text) return;

    // 1. Always add to visual history immediately
    const userMsg: ChatMsg = {
      id: crypto.randomUUID(), role: "user", content: text, timestamp: new Date().toISOString(),
      ...(replyingTo ? { replyTo: { id: replyingTo.id, content: replyingTo.content, role: replyingTo.role, agentName: replyingTo.agentName } } : {}),
    };
    const nextMessages = [...messagesRef.current, userMsg];
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
    setInput("");
    setReplyingTo(null);

    // 2. Add to pending queue
    pendingMessagesRef.current = [...pendingMessagesRef.current, userMsg];

    // 3. Reset debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // 4. Start new 4s timer (only if agent is NOT currently processing)
    if (!isProcessingRef.current) {
      debounceTimerRef.current = setTimeout(() => {
        triggerAgentResponse();
      }, DEBOUNCE_MS);
      debugLog(`[DEBOUNCE] Timer de ${DEBOUNCE_MS}ms iniciado (${pendingMessagesRef.current.length} msgs na fila)`);
    } else {
      debugLog(`[DEBOUNCE] Agente processando, msg adicionada à fila (${pendingMessagesRef.current.length} msgs pendentes)`);
    }
  }, [input, replyingTo, triggerAgentResponse]);

  // ─── Audio handler: transcribe then send as text ───
  const handleSendAudio = useCallback(async (blob: Blob) => {
    const audioUrl = URL.createObjectURL(blob);
    // Add audio message immediately (user sees their audio)
    const audioMsg: ChatMsg = {
      id: crypto.randomUUID(), role: "user",
      content: "🎤 Áudio enviado — transcrevendo...",
      timestamp: new Date().toISOString(),
      audioUrl,
      attachmentType: "audio",
    };
    const nextMessages = [...messagesRef.current, audioMsg];
    messagesRef.current = nextMessages;
    setMessages(nextMessages);


    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/simulator-media`;
      const fd = new FormData();
      fd.append("file", blob, "audio.webm");
      fd.append("type", "audio");
      const resp = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: fd,
      });
      if (!resp.ok) throw new Error("Transcription failed");
      const data = await resp.json();
      const transcription = data.transcription || "[áudio inaudível]";

      // Update the audio message with transcription
      setMessages(prev => {
        const updated = prev.map(m => m.id === audioMsg.id ? { ...m, content: transcription } : m);
        messagesRef.current = updated;
        return updated;
      });

      // Now send to agent as regular text
      handleSend(transcription);
    } catch (err) {
      console.error("Audio processing error:", err);
      setMessages(prev => {
        const updated = prev.map(m => m.id === audioMsg.id ? { ...m, content: "❌ Erro ao transcrever áudio" } : m);
        messagesRef.current = updated;
        return updated;
      });
      setLoading(false);
    }
  }, [handleSend]);

  // ─── File/image handler: describe then send context ───
  const handleSendFile = useCallback(async (file: File) => {
    const isImage = file.type.startsWith("image/");
    const fileUrl = isImage ? URL.createObjectURL(file) : undefined;

    const fileMsg: ChatMsg = {
      id: crypto.randomUUID(), role: "user",
      content: isImage ? "📷 Foto enviada — analisando..." : `📎 ${file.name} — analisando...`,
      timestamp: new Date().toISOString(),
      imageUrl: fileUrl,
      fileName: file.name,
      attachmentType: isImage ? "image" : "file",
    };
    const nextMessages = [...messagesRef.current, fileMsg];
    messagesRef.current = nextMessages;
    setMessages(nextMessages);


    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/simulator-media`;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", isImage ? "image" : "file");
      const resp = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: fd,
      });
      if (!resp.ok) throw new Error("File processing failed");
      const data = await resp.json();
      const description = data.description || data.transcription || "[não foi possível analisar]";

      // Update the file message with description
      const contextText = isImage
        ? `[Cliente enviou uma foto: ${description}]`
        : `[Cliente enviou o arquivo "${file.name}": ${description}]`;

      setMessages(prev => {
        const updated = prev.map(m => m.id === fileMsg.id ? { ...m, content: isImage ? "" : `📎 ${file.name}` } : m);
        messagesRef.current = updated;
        return updated;
      });

      // Send context to agent
      handleSend(contextText);
    } catch (err) {
      console.error("File processing error:", err);
      setMessages(prev => {
        const updated = prev.map(m => m.id === fileMsg.id ? { ...m, content: `❌ Erro ao processar ${isImage ? "foto" : "arquivo"}` } : m);
        messagesRef.current = updated;
        return updated;
      });
      setLoading(false);
    }
  }, [handleSend]);

  const resetChat = useCallback(() => {
    if (messagesRef.current.length > 0 && !confirm("Tem certeza? Os dados atuais serão perdidos.")) return;
    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
    pendingMessagesRef.current = [];
    messagesRef.current = [];
    isProcessingRef.current = false;
    clearComplianceCache();
    // CRITICAL: Always reset to Maya on new conversation — spread to force new reference
    const maya = AGENTS_V4.find(a => a.id === "maya");
    setSelectedAgent(maya ? { ...maya } : { ...AGENTS_V4[2] });
    setSelectedDestinoRaw("💬 Livre");
    setMessages([]);
    setCurrentSessionId(crypto.randomUUID());
    setTransferNotice(null);
    setCurrentStage(0);
    setReplyingTo(null);
    setManualObsSelectedMsg(null);
    setLoading(false);
  }, []);

  const loadSession = (session: SavedSession) => {
    messagesRef.current = session.messages;
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
          provider: "anthropic",
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPanel(false)} />
      <div className={cn(
        "absolute bottom-0 left-0 right-0 rounded-t-2xl transition-transform duration-300 max-h-[75vh] overflow-hidden flex flex-col bg-card border-t border-border shadow-2xl",
        showPanel ? "translate-y-0" : "translate-y-full"
      )}>
        {/* Handle + Close */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted" />
          <button onClick={() => setShowPanel(false)} className="w-7 h-7 rounded-full flex items-center justify-center bg-muted/50">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Agent mini-profile */}
        <div className="px-4 pb-2 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{ background: `${agentColor}15`, border: `1.5px solid ${agentColor}30` }}>
            {selectedAgent.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate text-foreground">{selectedAgent.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{selectedAgent.role} · Lv.{selectedAgent.level}</p>
          </div>
          <span className="text-sm font-extrabold tabular-nums text-emerald-600">{selectedAgent.successRate}%</span>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-2 flex gap-1.5 shrink-0">
          {(["agente", "destino", "sessoes"] as const).map(t => (
            <button key={t} onClick={() => setPanelTab(t)}
              className={cn(
                "flex-1 text-[11px] font-bold py-2 rounded-lg transition-all",
                panelTab === t
                  ? "bg-primary/10 text-primary"
                  : "bg-muted/30 text-muted-foreground"
              )}>
              {t === "agente" ? "Agentes" : t === "destino" ? "Destinos" : "Sessões"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {panelTab === "agente" && (
            <div className="space-y-2">
              <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-hide">
                <button onClick={() => setActiveSquad("all")} className={cn(
                  "text-[10px] px-2.5 py-1.5 rounded-lg font-bold shrink-0 transition-all",
                  activeSquad === "all" ? "bg-primary/10 text-primary" : "bg-muted/30 text-muted-foreground"
                )}>Todos</button>
                {SQUADS.map(s => (
                  <button key={s.id} onClick={() => setActiveSquad(s.id)} className={cn(
                    "text-[10px] px-2.5 py-1.5 rounded-lg font-bold shrink-0 transition-all",
                    activeSquad === s.id ? "bg-primary/10 text-primary" : "bg-muted/30 text-muted-foreground"
                  )}>{s.emoji} {s.name.replace("Squad ", "")}</button>
                ))}
              </div>
              <div className="space-y-1">
                {filteredAgents.map(a => {
                  const c = getAgentColor(a);
                  const active = selectedAgent.id === a.id;
                  return (
                    <button key={a.id} onClick={() => { setSelectedAgent(a); setShowPanel(false); }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all",
                        active ? "bg-primary/5 border border-primary/20" : "border border-transparent hover:bg-muted/30"
                      )}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                        style={{ background: `${c}12` }}>{a.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-semibold truncate", active ? "text-primary" : "text-foreground")}>{a.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{a.role}</p>
                      </div>
                      <span className="text-[10px] font-bold tabular-nums text-emerald-600">{a.successRate}%</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {panelTab === "destino" && (
            <div className="grid grid-cols-3 gap-1.5">
              {DESTINOS.map(d => {
                const isRandom = d === "🎲 Aleatório";
                const isLivre = d === "💬 Livre";
                const isActive = isLivre ? selectedDestino === "💬 Livre" : isRandom ? (!DESTINOS.slice(2).includes(selectedDestino) && selectedDestino !== "💬 Livre") : selectedDestino === d;
                return (
                  <button key={d} onClick={() => { setSelectedDestino(d); setShowPanel(false); }}
                    className={cn(
                      "text-[11px] px-2 py-2.5 rounded-xl font-medium text-center transition-all",
                      isActive ? "bg-primary/10 text-primary font-bold" : "bg-muted/20 text-muted-foreground"
                    )}>{isRandom && isActive ? `🎲 ${selectedDestino}` : d}</button>
                );
              })}
            </div>
          )}

          {panelTab === "sessoes" && (
            <div className="space-y-1.5">
              {sessions.length === 0 && <p className="text-xs text-center py-8 text-muted-foreground">Nenhuma sessão salva</p>}
              {sessions.slice(0, 15).map(session => (
                <div key={session.id} onClick={() => { loadSession(session); setShowPanel(false); }}
                  className={cn(
                    "rounded-xl p-2.5 cursor-pointer transition-all",
                    session.id === currentSessionId ? "bg-primary/5 border border-primary/20" : "bg-muted/10 border border-transparent hover:bg-muted/20"
                  )}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{session.agentEmoji}</span>
                    <span className="text-xs font-bold flex-1 truncate text-foreground">{session.agentName}</span>
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700">{session.destino}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 pl-6">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(session.updatedAt).toLocaleDateString("pt-BR")} · {session.messages.length} msgs
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                      className="text-[10px] w-6 h-6 rounded flex items-center justify-center text-destructive hover:bg-destructive/10">×</button>
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
        "flex flex-1 min-h-0 animate-in fade-in slide-in-from-bottom-2 duration-500",
        isMobile ? "flex-col" : "gap-4"
      )}>

        {/* ═══════════ CHAT AREA ═══════════ */}
        <div className="flex-1 min-w-0 min-h-0">
          <SimulatorChatLayout
            messages={messages.map(m => ({
              ...m,
              role: m.role as "user" | "agent",
            } as SimChatMessage))}
            loading={loading}
            inputValue={input}
            onInputChange={setInput}
            onSend={() => handleSend()}
            onSendAudio={handleSendAudio}
            onSendFile={handleSendFile}
            onMessageClick={(msg) => {
              setManualObsSelectedMsg({
                content: msg.content,
                role: msg.role === "agent" ? "agent" : "client",
                agentName: msg.agentName,
                leadId: "manual",
                leadName: "Cliente Manual",
                timestamp: new Date(msg.timestamp).getTime(),
              });
            }}
            selectedMessageTimestamp={manualObsSelectedMsg ? new Date(manualObsSelectedMsg.timestamp).toISOString() : undefined}
            replyingTo={replyingTo ? { ...replyingTo, role: replyingTo.role as "user" | "agent" } as SimChatMessage : null}
            onReply={(msg) => {
              const chatMsg = messages.find(m => m.id === msg.id);
              if (chatMsg) setReplyingTo(chatMsg);
            }}
            onCancelReply={() => setReplyingTo(null)}
            inputPlaceholder="Digite como um cliente..."
            headerContent={
              <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                <button
                  onClick={() => { if (isMobile) { setPanelTab("agente"); setShowPanel(true); } }}
                  className="relative shrink-0"
                >
                  <div className={cn("rounded-full flex items-center justify-center font-bold bg-secondary", isMobile ? "w-9 h-9 text-sm" : "w-10 h-10 text-base")}>
                    {selectedAgent.emoji}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card">
                    <span className="absolute inset-0 rounded-full animate-ping bg-emerald-500 opacity-40" />
                  </span>
                </button>
                <div className="flex-1 min-w-0" onClick={() => { if (isMobile) { setPanelTab("agente"); setShowPanel(true); } }}>
                  <div className="flex items-center gap-2">
                    <p className={cn("font-bold truncate text-foreground", isMobile ? "text-sm" : "text-[15px]")}>{selectedAgent.name.toUpperCase()}</p>
                    {isMobile && <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <MapPin className={cn("w-3 h-3 shrink-0", isLivreMode ? "text-emerald-500" : "text-amber-500")} />
                    <p className={cn("truncate text-muted-foreground", isMobile ? "text-[11px]" : "text-xs")}>
                      {isMobile
                        ? (isLivreMode ? `Modo Livre · Lv.${selectedAgent.level}` : `${selectedDestino} · Lv.${selectedAgent.level}`)
                        : (isLivreMode ? `Modo Livre — destino definido na conversa · Lv.${selectedAgent.level} · ${selectedAgent.role}` : `Especialista ${selectedDestino} · Lv.${selectedAgent.level} · ${selectedAgent.role}`)
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isMobile ? (
                    <>
                      <button onClick={generateSummary} disabled={messages.length < 2}
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all bg-secondary/50 disabled:opacity-30">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button onClick={resetChat}
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all bg-primary/10">
                        <RotateCcw className="w-4 h-4 text-primary" />
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/30">
                      {FUNNEL_STAGES.map((stage, i) => (
                        <div key={i} className="flex items-center gap-1" title={stage}>
                          <div className={cn("w-2.5 h-2.5 rounded-full transition-all duration-500", i < currentStage ? "bg-emerald-500" : i === currentStage ? "bg-primary" : "bg-muted")} />
                          {i < FUNNEL_STAGES.length - 1 && <div className={cn("w-4 h-px", i < currentStage ? "bg-emerald-500/40" : "bg-muted")} />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            }
            bannerContent={transferNotice ? (
              <div className="flex items-center justify-center py-2.5 animate-in fade-in zoom-in-95 duration-300 bg-accent/30">
                <div className="flex items-center gap-2 text-xs font-medium px-4 py-1.5 rounded-full bg-accent text-accent-foreground border border-border">
                  <Plane className="w-3.5 h-3.5" /> {transferNotice}
                </div>
              </div>
            ) : undefined}
            emptyContent={
              <div className={cn("text-center animate-in fade-in zoom-in-95 duration-700", isMobile ? "py-12 space-y-5" : "py-20 space-y-6")}>
                <div className={cn("relative mx-auto", isMobile ? "w-18 h-18" : "w-24 h-24")}>
                  <div className={cn("absolute rounded-full flex items-center justify-center bg-secondary/50 border border-border", isMobile ? "inset-2" : "inset-3")}>
                    <span className={isMobile ? "text-3xl" : "text-4xl"}>{selectedAgent.emoji}</span>
                  </div>
                </div>
                <div>
                  <p className={cn("font-semibold text-foreground", isMobile ? "text-[15px]" : "text-[17px]")}>
                    Converse com {selectedAgent.name}
                  </p>
                  <p className={cn("mt-1.5 text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>
                    {isLivreMode ? "Converse livremente — o destino será descoberto na conversa" : `Simule um cliente interessado em ${selectedDestino}`}
                  </p>
                </div>
                <div className={cn("flex flex-wrap gap-2.5 justify-center mx-auto", isMobile ? "max-w-[340px]" : "max-w-lg")}>
                  {SUGGESTION_CHIPS.map(chip => (
                    <button key={chip} onClick={() => handleSend(chip)}
                      className={cn("rounded-xl transition-all duration-300 hover:scale-[1.03] bg-secondary/50 border border-border text-foreground", isMobile ? "text-xs px-3.5 py-2.5" : "text-sm px-4 py-2.5")}>
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            }
          />
        </div>

        {/* ═══════════ RIGHT PANEL — Desktop only ═══════════ */}
        {!isMobile && (
          <div className="w-[280px] xl:w-[320px] 2xl:w-[340px] shrink-0 flex flex-col overflow-y-auto custom-scrollbar pr-1 rounded-2xl bg-card border border-border">
            {/* Gold line */}
            <div className="h-[3px] shrink-0" style={{ background: `linear-gradient(90deg, transparent 5%, hsl(var(--champagne) / 0.5) 30%, ${agentColor}90 50%, hsl(var(--champagne) / 0.5) 70%, transparent 95%)` }} />

            {/* Agent profile */}
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ background: `${agentColor}12`, border: `1.5px solid ${agentColor}25` }}>
                  {selectedAgent.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold tracking-wide truncate text-foreground">{selectedAgent.name}</p>
                  <p className="text-[11px] mt-0.5 truncate text-muted-foreground">{selectedAgent.role}</p>
                </div>
                <span className="text-base font-extrabold tabular-nums" style={{ color: agentColor }}>Lv.{selectedAgent.level}</span>
              </div>
              <div className="flex items-center gap-4 mt-3 text-center">
                <div className="flex-1">
                  <p className="text-sm font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">{selectedAgent.successRate}%</p>
                  <p className="text-[9px] uppercase tracking-wider mt-0.5 font-semibold text-muted-foreground">Sucesso</p>
                </div>
                <div className="w-px h-6 bg-border" />
                <div className="flex-1">
                  <p className="text-sm font-extrabold tabular-nums text-foreground">{selectedAgent.tasksToday}</p>
                  <p className="text-[9px] uppercase tracking-wider mt-0.5 font-semibold text-muted-foreground">Tarefas</p>
                </div>
                <div className="w-px h-6 bg-border" />
                <div className="flex-1">
                  <p className="text-sm font-extrabold tabular-nums text-foreground">{selectedAgent.skills.length}</p>
                  <p className="text-[9px] uppercase tracking-wider mt-0.5 font-semibold text-muted-foreground">Skills</p>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="px-4 pb-3 space-y-2">
              <NathOpinionButton
                messages={messages.map(m => ({ role: m.role === "user" ? "user" : "agent", content: m.content, agentName: m.agentName, timestamp: m.timestamp }))}
                context={`${isLivreMode ? "Modo Livre (destino aberto)" : `Destino: ${selectedDestino}`} · Agente: ${selectedAgent.name} (${selectedAgent.role})`}
                variant="floating"
              />
              <ViewProposalButton
                sessionId={currentSessionId}
                mode="manual"
                messages={messages.map(m => ({ role: m.role, content: m.content, agentName: m.agentName }))}
                agentName={selectedAgent.name}
                destinoHint={isLivreMode ? undefined : selectedDestino}
                simulatorContext={`Simulador Manual · Agente: ${selectedAgent.name} (${selectedAgent.role})`}
              />
              <div className="flex gap-2">
                <button onClick={generateSummary} disabled={messages.length < 2}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all bg-muted/50 text-muted-foreground hover:bg-muted disabled:opacity-30">
                  <FileText className="w-3.5 h-3.5" /> Resumo IA
                </button>
                <button onClick={resetChat}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all bg-primary/10 text-primary hover:bg-primary/15">
                  <RotateCcw className="w-3.5 h-3.5" /> Nova
                </button>
              </div>
            </div>

            <div className="h-px bg-border mx-4" />

            {/* Agents section */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[10px] uppercase tracking-[0.12em] font-bold text-foreground">Agentes</p>
                <span className="text-[10px] font-bold tabular-nums text-muted-foreground">{AGENTS_V4.length}</span>
              </div>
              <div className="space-y-0.5 max-h-[480px] overflow-y-auto custom-scrollbar">
                {AGENTS_V4.map(a => {
                  const active = selectedAgent.id === a.id;
                  return (
                    <button key={a.id} onClick={() => setSelectedAgent(a)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all",
                        active ? "bg-primary/5" : "hover:bg-muted/30"
                      )}>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-[12px] font-semibold truncate", active ? "text-primary" : "text-foreground")}>{a.name}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="h-px bg-border mx-4" />

            {/* Sessions section */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[10px] uppercase tracking-[0.12em] font-bold text-foreground">Sessões</p>
                <span className="text-[10px] font-bold tabular-nums text-muted-foreground">{sessions.length}</span>
              </div>
              <div className="space-y-1 max-h-[180px] overflow-y-auto custom-scrollbar">
                {sessions.length === 0 && <p className="text-[11px] text-center py-6 text-muted-foreground">Nenhuma sessão salva</p>}
                {sessions.slice(0, 10).map(s => (
                  <div key={s.id} onClick={() => loadSession(s)}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all group",
                      s.id === currentSessionId ? "bg-primary/5" : "hover:bg-muted/30"
                    )}>
                    <span className="text-sm shrink-0">{s.agentEmoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold truncate text-foreground">{s.agentName}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(s.updatedAt).toLocaleDateString("pt-BR")} · {s.messages.length} msgs</p>
                    </div>
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground shrink-0">{s.destino}</span>
                    <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                      className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive text-xs shrink-0">×</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-border mx-4" />

            {/* Intelligence Panel */}
            <div className="px-4 py-3">
              <ConversationIntelligencePanel
                messages={messages.map(m => ({ content: m.content, role: m.role, agentName: m.agentName, timestamp: m.timestamp }))}
              />
            </div>

            {/* Observations Panel */}
            <SimulatorObservationsPanel
              selectedMessage={manualObsSelectedMsg}
              onClearSelectedMessage={() => setManualObsSelectedMsg(null)}
              className="min-h-[250px] border-t border-border"
            />
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
