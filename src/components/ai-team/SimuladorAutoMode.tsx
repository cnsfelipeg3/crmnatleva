import { useState, useCallback, useRef, useEffect, Fragment } from "react";
import { fullCompliancePipeline } from "./complianceEngine";
import { supabase } from "@/integrations/supabase/client";
import { Play, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp, Check, X, Square, BarChart3, Zap, User, MessageSquare, Lightbulb, AlertTriangle, Brain, Heart, Shield, Clock, TrendingUp, Send, MapPin, Wallet, Radio, Users, BookOpen, Search, FileText, Workflow, Edit3, Download, Bot, CheckCheck, Repeat, Gauge, Timer, Target, Flame, SlidersHorizontal } from "lucide-react";
import SimulatorObservationsPanel, { type SelectedMessage } from "./SimulatorObservationsPanel";
import { useIsMobile } from "@/hooks/use-mobile";
import NathOpinionButton from "./NathOpinionButton";
import SimConfigInput from "./SimConfigInput";
import { AGENTS_V4, SQUADS } from "@/components/ai-team/agentsV4Data";
import { useGlobalRules, buildGlobalRulesBlock, type GlobalRule } from "@/hooks/useGlobalRules";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useSimulationPersistence } from "@/hooks/useSimulationPersistence";
import { buildActiveContext, shouldChunk, createChunkSummary, type SimEvent, type ChunkData, CHUNK_SIZE, createMetricsSnapshot, buildLeadContextSummary } from "./simulationEngine";
import {
  type LeadInteligente, type MensagemLead, type PerfilPsicologico,
  PERFIS_INTELIGENTES, DESTINOS_LEAD, BUDGETS_LEAD, CANAIS_LEAD, GRUPOS_LEAD, ETAPAS_FUNIL,
  gerarLeadInteligente, deveInserirObjecao, atualizarEstadoEmocional, devePerdeLead,
} from "./intelligentLeads";
import { compressConversation, estimateTokens, BUILT_IN_PRESETS } from "./contextCompression";
import {
  getAgentPesos, getNivel, buildDebriefV2Prompt,
  SYSTEM_DEBRIEF_V2, CRITERIOS_AVALIACAO,
  type DimensaoScore, type CriterioScore,
  saveHistoricoAvaliacao, loadHistoricoAvaliacoes,
} from "./evaluationFramework";

// Import all utilities from extracted file
import {
  callSimulatorAI, pushUniqueSimMessage, detectsPricePrint, generatePriceImage,
  generateLeadMsg, gerarObjecao, avaliarRespostaAgente, gerarMensagemPerda,
  buildCalibrationPrompt, buildAgentSysPrompt, type DbAgentOverride,
  MIN_TROCAS_POR_AGENTE, AGENT_ROLE_INSTRUCTIONS, FILOSOFIA_NATLEVA,
  SPEED_OPTIONS, getAgentColor,
  type Phase, type ReportTab, type ImprovementType,
  type Improvement, type DeepAnalysis, type DebriefDimensoes, type DebriefData, type SimHistoryEntry,
  TIPO_COLORS, STORAGE_KEYS, loadJson, saveJson,
  implementImprovement, saveSimHistory, sentimentColor, sentimentLabel,
} from "./simuladorAutoUtils";

function useCountUp(target: number, duration = 500) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

// ===== COMPONENT =====
export default function SimuladorAutoMode() {
  const isMobile = useIsMobile();
  const { data: globalRules = [] } = useGlobalRules();
  const globalRulesBlockRef = useRef("");
  useEffect(() => { globalRulesBlockRef.current = buildGlobalRulesBlock(globalRules); }, [globalRules]);
  // Config — Volume
  const [numLeads, setNumLeads] = useState(8);
  const [msgsPerLead, setMsgsPerLead] = useState(14);
  const [intervalSec, setIntervalSec] = useState(1);
  const [duration, setDuration] = useState(0); // 0 = auto-calculate
  const [parallelLeads, setParallelLeads] = useState(1);
  const [dispatchMode, setDispatchMode] = useState<"sequential" | "simultaneous" | "wave">("sequential");
  // Config — Perfis
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [profileMode, setProfileMode] = useState<"random" | "roundrobin">("random");
  // Config — Cenário
  const [selectedDestinos, setSelectedDestinos] = useState<string[]>([]);
  const [selectedBudgets, setSelectedBudgets] = useState<string[]>([]);
  const [selectedCanais, setSelectedCanais] = useState<string[]>([]);
  const [selectedGrupos, setSelectedGrupos] = useState<string[]>([]);
  // Config — Comportamento
  const [conversionOverride, setConversionOverride] = useState<number | null>(null);
  const [objectionDensity, setObjectionDensity] = useState(50);
  const [speed, setSpeed] = useState("normal");
  const [funnelMode, setFunnelMode] = useState<"full" | "comercial" | "custom" | "individual">("full");
  const [customFunnelAgents, setCustomFunnelAgents] = useState<string[]>([]);
  // Config — Motor IA
  const [enableEvaluation, setEnableEvaluation] = useState(true);
  const [enableMultiMsg, setEnableMultiMsg] = useState(true);
  const [enableTransfers, setEnableTransfers] = useState(true);
  const [emotionalVolatility, setEmotionalVolatility] = useState(50);
  const [agentResponseLength, setAgentResponseLength] = useState<"curta" | "media" | "longa">("media");
  const [enableLossNarrative, setEnableLossNarrative] = useState(true);
  const [evalFrequency, setEvalFrequency] = useState<"every" | "every2" | "every3">("every");
  // Config — Calibração Lead
  const [leadPatienceCurve, setLeadPatienceCurve] = useState<"linear" | "exponential" | "sudden">("linear");
  const [initialPatience, setInitialPatience] = useState(80);
  const [leadToneFormality, setLeadToneFormality] = useState(50); // 0=informal 100=formal
  const [leadTypingStyle, setLeadTypingStyle] = useState<"natural" | "rapido" | "detalhado">("natural");
  const [abandonmentSensitivity, setAbandonmentSensitivity] = useState(50); // 0=nunca desiste 100=desiste fácil
  const [infoRevealSpeed, setInfoRevealSpeed] = useState<"gradual" | "imediato" | "resistente">("gradual");
  const [leadFollowUpPressure, setLeadFollowUpPressure] = useState(30); // % chance de mandar follow-up
  const [enableLeadTypos, setEnableLeadTypos] = useState(false);
  const [enableLeadEmojis, setEnableLeadEmojis] = useState(true);
  const [enableLeadAudioRef, setEnableLeadAudioRef] = useState(false); // simula "prefiro audio" / "não consigo ler agora"
  const [leadConversationGoal, setLeadConversationGoal] = useState<"comprar" | "pesquisar" | "comparar" | "aleatorio">("aleatorio");
  const [maxConversationMinutes, setMaxConversationMinutes] = useState(0); // 0 = sem limite por conversa
  const [leadReengagementChance, setLeadReengagementChance] = useState(20); // % chance de voltar depois de silêncio
  const [leadCustomInstructions, setLeadCustomInstructions] = useState("");
  // Config — Volume Avançado
  const [warmupRounds, setWarmupRounds] = useState(0);
  const [apiRetries, setApiRetries] = useState(2);
  const [cooldownMs, setCooldownMs] = useState(0);
  const [minScoreToPass, setMinScoreToPass] = useState(60);
  const [maxConcurrentChats, setMaxConcurrentChats] = useState(3);
  const [autoRetryOnLoss, setAutoRetryOnLoss] = useState(false);
  const [enableSentimentShock, setEnableSentimentShock] = useState(false);
  const [shockAtRound, setShockAtRound] = useState(4);
  const [enableAgentFatigue, setEnableAgentFatigue] = useState(false);
  const [fatigueThreshold, setFatigueThreshold] = useState(20);
  // Config — Presets
  const [presetName, setPresetName] = useState("");
  const [configTab, setConfigTab] = useState<string>("volume"); // kept for potential future use

  // Runtime
  const [phase, setPhase] = useState<Phase>("config");
  const [leads, setLeads] = useState<LeadInteligente[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [events, setEvents] = useState<{ id: string; color: string; text: string; time: string; icon?: string }[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [reportTab, setReportTab] = useState<ReportTab>("numeros");
  const [debrief, setDebrief] = useState<DebriefData | null>(null);
  const [debriefLoading, setDebriefLoading] = useState(false);
  const [leadFilter, setLeadFilter] = useState<"all" | "ativo" | "fechou" | "perdeu">("all");
  const [expandedMelhoriaId, setExpandedMelhoriaId] = useState<string | null>(null);
  const [observationSelectedMsg, setObservationSelectedMsg] = useState<SelectedMessage | null>(null);

  const chatRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef(false);
  const simAtivaRef = useRef(false);
  const { toast } = useToast();
  const simPersistence = useSimulationPersistence();
  const chunksRef = useRef<Map<string, ChunkData[]>>(new Map());
  const selectedLead = leads.find(l => l.id === selectedLeadId) || null;
  const closedLeads = leads.filter(l => l.status === "fechou");
  const lostLeads = leads.filter(l => l.status === "perdeu");
  const totalReceita = closedLeads.reduce((s, l) => s + l.ticket, 0);
  const conversionRate = leads.length > 0 ? Math.round((closedLeads.length / leads.length) * 100) : 0;
  const totalObjecoes = leads.reduce((s, l) => s + l.objecoesLancadas.length, 0);
  const totalContornadas = leads.reduce((s, l) => s + (l.status === "fechou" ? l.objecoesLancadas.length : 0), 0);
  const ticketMedio = closedLeads.length > 0 ? Math.round(totalReceita / closedLeads.length) : 0;
  const avgSentimento = leads.length > 0 ? Math.round(leads.reduce((s, l) => s + l.sentimentoScore, 0) / leads.length) : 0;
  // 3 Dimensões — médias ao vivo
  const avgHumanizacao = leads.length > 0 ? Math.round(leads.reduce((s, l) => s + l.scoreHumanizacao, 0) / leads.length) : 0;
  const avgEficacia = leads.length > 0 ? Math.round(leads.reduce((s, l) => s + l.scoreEficacia, 0) / leads.length) : 0;
  const avgTecnica = leads.length > 0 ? Math.round(leads.reduce((s, l) => s + l.scoreTecnica, 0) / leads.length) : 0;

  const animLeads = useCountUp(leads.length);
  const animClosed = useCountUp(closedLeads.length);
  const animReceita = useCountUp(Math.round(totalReceita / 1000));

  const filteredLeads = leadFilter === "all" ? leads : leads.filter(l => l.status === leadFilter);

  // configTab is used for tab navigation in the config panel
  const toggleMulti = (arr: string[], id: string, setter: (v: string[]) => void) => {
    setter(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);
  };
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const addEvent = (color: string, text: string, icon?: string) => {
    setEvents(prev => [{ id: crypto.randomUUID(), color, text, icon, time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }, ...prev].slice(0, 30));
  };

  // Auto-scroll chat
  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }); }, [selectedLead?.mensagens?.length]);

  // ★ Auto-stop simulation when duration is exceeded (only if duration > 0)
  useEffect(() => {
    if (running && duration > 0 && elapsedSeconds >= duration) {
      stopSimulationRef.current();
    }
  }, [running, elapsedSeconds, duration]);

  const stopSimulationRef = useRef(() => {});
  stopSimulationRef.current = () => { simAtivaRef.current = false; abortRef.current = true; setRunning(false); if (timerRef.current) clearInterval(timerRef.current); setPhase("report"); };
  const dbAgentOverridesRef = useRef<Record<string, DbAgentOverride>>({});

  // ===== PRESETS =====
  const PRESET_STORAGE_KEY = "natleva_sim_presets";
  const loadPresets = (): Array<{ name: string; config: any }> => {
    try { return JSON.parse(localStorage.getItem(PRESET_STORAGE_KEY) || "[]"); } catch { return []; }
  };
  const [presets, setPresets] = useState(loadPresets);
  const savePreset = (name: string) => {
    const config = { numLeads, msgsPerLead, intervalSec, duration, selectedProfiles, profileMode, selectedDestinos, selectedBudgets, selectedCanais, selectedGrupos, conversionOverride, objectionDensity, speed, funnelMode, customFunnelAgents, enableEvaluation, enableMultiMsg, enableTransfers, emotionalVolatility, agentResponseLength, enableLossNarrative, evalFrequency, leadPatienceCurve, initialPatience, leadToneFormality, leadTypingStyle, abandonmentSensitivity, infoRevealSpeed, leadFollowUpPressure, enableLeadTypos, enableLeadEmojis, enableLeadAudioRef, leadConversationGoal, maxConversationMinutes, leadReengagementChance, leadCustomInstructions };
    const updated = [...presets.filter(p => p.name !== name), { name, config }];
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(updated));
    setPresets(updated);
    toast({ title: `✅ Preset "${name}" salvo` });
  };
  const loadPreset = (config: any) => {
    setNumLeads(config.numLeads ?? 8); setMsgsPerLead(config.msgsPerLead ?? 14); setIntervalSec(config.intervalSec ?? 1);
    setDuration(config.duration ?? 180); setSelectedProfiles(config.selectedProfiles ?? []); setProfileMode(config.profileMode ?? "random");
    setSelectedDestinos(config.selectedDestinos ?? []); setSelectedBudgets(config.selectedBudgets ?? []); setSelectedCanais(config.selectedCanais ?? []);
    setSelectedGrupos(config.selectedGrupos ?? []); setConversionOverride(config.conversionOverride ?? null); setObjectionDensity(config.objectionDensity ?? 50);
    setSpeed(config.speed ?? "normal"); setFunnelMode(config.funnelMode ?? "full"); setCustomFunnelAgents(config.customFunnelAgents ?? []);
    setEnableEvaluation(config.enableEvaluation ?? true); setEnableMultiMsg(config.enableMultiMsg ?? true);
    setEnableTransfers(config.enableTransfers ?? true); setEmotionalVolatility(config.emotionalVolatility ?? 50);
    setAgentResponseLength(config.agentResponseLength ?? "media"); setEnableLossNarrative(config.enableLossNarrative ?? true);
    setEvalFrequency(config.evalFrequency ?? "every");
    setLeadPatienceCurve(config.leadPatienceCurve ?? "linear"); setInitialPatience(config.initialPatience ?? 80);
    setLeadToneFormality(config.leadToneFormality ?? 50); setLeadTypingStyle(config.leadTypingStyle ?? "natural");
    setAbandonmentSensitivity(config.abandonmentSensitivity ?? 50); setInfoRevealSpeed(config.infoRevealSpeed ?? "gradual");
    setLeadFollowUpPressure(config.leadFollowUpPressure ?? 30); setEnableLeadTypos(config.enableLeadTypos ?? false);
    setEnableLeadEmojis(config.enableLeadEmojis ?? true); setEnableLeadAudioRef(config.enableLeadAudioRef ?? false);
    setLeadConversationGoal(config.leadConversationGoal ?? "aleatorio"); setMaxConversationMinutes(config.maxConversationMinutes ?? 0);
    setLeadReengagementChance(config.leadReengagementChance ?? 20); setLeadCustomInstructions(config.leadCustomInstructions ?? "");
    toast({ title: "Preset carregado!" });
  };
  const deletePreset = (name: string) => {
    const updated = presets.filter(p => p.name !== name);
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(updated));
    setPresets(updated);
  };

  // ===== SIMULATION ENGINE =====
  const runSimulation = useCallback(async () => {
    setPhase("running"); setRunning(true); setLeads([]); setEvents([]); setElapsedSeconds(0);
    setSelectedLeadId(null); setDebrief(null); abortRef.current = false; simAtivaRef.current = true;
    chunksRef.current = new Map();

    // Fetch real agent configs from DB before starting
    try {
      const { data: dbAgents } = await supabase.from("ai_team_agents").select("id, behavior_prompt, persona, skills").eq("is_active", true);
      const overrides: Record<string, DbAgentOverride> = {};
      (dbAgents || []).forEach((a: any) => {
        overrides[a.id] = { behavior_prompt: a.behavior_prompt, persona: a.persona, skills: a.skills };
      });
      dbAgentOverridesRef.current = overrides;
    } catch { dbAgentOverridesRef.current = {}; }

    timerRef.current = setInterval(() => setElapsedSeconds(p => p + 1), 1000);

    // Start DB persistence
    const simConfig = { numLeads, msgsPerLead, intervalSec, duration, speed, dispatchMode, parallelLeads, objectionDensity, enableEvaluation, enableMultiMsg, enableTransfers, emotionalVolatility, agentResponseLength, enableLossNarrative, evalFrequency, funnelMode };
    const leadsRef_local = { current: [] as LeadInteligente[] };
    const simId = await simPersistence.startSimulation(simConfig, () => leadsRef_local.current);

    const profiles = selectedProfiles.length > 0
      ? PERFIS_INTELIGENTES.filter(p => selectedProfiles.includes(p.tipo))
      : PERFIS_INTELIGENTES;
    const destinos = selectedDestinos.length > 0 ? selectedDestinos : DESTINOS_LEAD;
    const budgets = selectedBudgets.length > 0 ? selectedBudgets : BUDGETS_LEAD;
    const canais = selectedCanais.length > 0 ? selectedCanais : CANAIS_LEAD;
    const speedDelay = SPEED_OPTIONS.find(s => s.id === speed)?.delay ?? 2500;
    const simStartTime = Date.now();
    // Auto-calculate duration: ~3s per API call, ~3 calls per round, per lead
    const estimatedCallsPerLead = Math.floor(msgsPerLead / 2) * 3 + 2;
    const estimatedSecondsPerLead = estimatedCallsPerLead * 2.5 + (speedDelay / 1000 * Math.floor(msgsPerLead / 2));
    const autoDuration = Math.max(300, Math.ceil(numLeads * estimatedSecondsPerLead * 1.3));
    const effectiveDuration = duration > 0 ? duration : autoDuration;
    const durationMs = effectiveDuration * 1000;
    const evalEvery = evalFrequency === "every" ? 1 : evalFrequency === "every2" ? 2 : 3;

    // Helper to check duration limit
    const isDurationExceeded = () => Date.now() - simStartTime >= durationMs;

    const funnelAgents = funnelMode === "full"
      ? AGENTS_V4.filter(a => ["comercial", "atendimento"].includes(a.squadId)).slice(0, 6)
      : funnelMode === "comercial"
        ? AGENTS_V4.filter(a => a.squadId === "comercial")
        : funnelMode === "individual"
          ? customFunnelAgents.slice(0, 1).map(id => AGENTS_V4.find(a => a.id === id)!).filter(Boolean)
          : customFunnelAgents.map(id => AGENTS_V4.find(a => a.id === id)!).filter(Boolean);

    if (funnelAgents.length === 0) {
      toast({ title: "Selecione agentes para o funil", variant: "destructive" });
      setRunning(false); setPhase("config");
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const allLeads: LeadInteligente[] = [];
    const grupos = selectedGrupos.length > 0 ? selectedGrupos : GRUPOS_LEAD;

    // ===== Create all leads upfront =====
    for (let i = 0; i < numLeads; i++) {
      const perfil = profileMode === "roundrobin"
        ? profiles[i % profiles.length]
        : profiles[Math.floor(Math.random() * profiles.length)];

      const lead = gerarLeadInteligente(perfil, {
        destino: destinos[Math.floor(Math.random() * destinos.length)],
        orcamento: budgets[Math.floor(Math.random() * budgets.length)],
        canal: canais[Math.floor(Math.random() * canais.length)],
        grupo: grupos[Math.floor(Math.random() * grupos.length)],
      });

      if (conversionOverride !== null) {
        lead.ticket = Math.random() * 100 < conversionOverride ? (8000 + Math.floor(Math.random() * 42000)) : 0;
      }
      lead.temObjecao = Math.random() * 100 < objectionDensity;
      lead.pacienciaRestante = initialPatience;
      if (emotionalVolatility > 70) {
        lead.pacienciaRestante = Math.max(20, lead.pacienciaRestante - Math.floor((emotionalVolatility - 50) * 0.5));
      }
      (lead as any)._abandonSensitivity = abandonmentSensitivity;
      (lead as any)._patienceCurve = leadPatienceCurve;
      (lead as any)._toneFormality = leadToneFormality;
      (lead as any)._typingStyle = leadTypingStyle;
      (lead as any)._followUpPressure = leadFollowUpPressure;
      (lead as any)._infoRevealSpeed = infoRevealSpeed;
      (lead as any)._enableTypos = enableLeadTypos;
      (lead as any)._enableEmojis = enableLeadEmojis;
      (lead as any)._enableAudioRef = enableLeadAudioRef;
      (lead as any)._conversationGoal = leadConversationGoal === "aleatorio" ? ["comprar","pesquisar","comparar"][Math.floor(Math.random()*3)] : leadConversationGoal;
      (lead as any)._maxConvMinutes = maxConversationMinutes;
      (lead as any)._reengagementChance = leadReengagementChance;
      (lead as any)._customInstructions = leadCustomInstructions;

      allLeads.push(lead);
    }
    setLeads([...allLeads]);
    leadsRef_local.current = allLeads;
    if (allLeads.length > 0) setSelectedLeadId(allLeads[0].id);

    // Register all leads in DB
    for (const lead of allLeads) {
      await simPersistence.registerLead(lead);
    }

    // ===== Per-lead simulation logic (extracted for parallel use) =====
    const simulateLead = async (lead: LeadInteligente) => {
      if (!simAtivaRef.current || abortRef.current) return;
      if (isDurationExceeded()) return;

      addEvent("#3B82F6", `${lead.perfil.emoji} ${lead.nome} entrou via ${lead.origem} · ${lead.destino} · ${lead.paxLabel}`, "📥");
      simPersistence.bufferEvent({ id: crypto.randomUUID(), type: "lead_created", leadId: lead.id, payload: { profile: lead.perfil.tipo, destino: lead.destino }, timestamp: Date.now() });

      try {
        const firstMsg = await generateLeadMsg(lead, "", true);
        if (!simAtivaRef.current) return;
        const addedFirstMsg = pushUniqueSimMessage(lead, { role: "client", content: firstMsg, timestamp: Date.now() });
        if (!addedFirstMsg) return;
        setLeads(prev => [...prev]);
        addEvent(lead.perfil.cor, `${lead.nome}: "${firstMsg.slice(0, 50)}..."`, "💬");

        const stages = ETAPAS_FUNIL.map(e => e.id);
        const rounds = Math.floor(msgsPerLead / 2);
        let agentIdx = 0;
        let forceLoss = false;
        let evalCounter = 0;

        for (let r = 0; r < rounds; r++) {
          if (!simAtivaRef.current || abortRef.current || forceLoss) break;
          if (isDurationExceeded()) {
            addEvent("#F59E0B", `⏱️ Tempo esgotado durante conversa com ${lead.nome}`, "⏰");
            break;
          }

          const agent = funnelAgents[agentIdx % funnelAgents.length];
          const hasNext = enableTransfers && agentIdx < funnelAgents.length - 1;
          lead.etapaAtual = stages[Math.min(agentIdx, stages.length - 1)];

          // Agent responds — with context compression + chunking for long conversations
          // Check if we need to chunk before building context
          if (shouldChunk(lead.mensagens.length)) {
            const toArchive = lead.mensagens.splice(0, CHUNK_SIZE);
            const summary = createChunkSummary(toArchive, lead.nome);
            const chunk: ChunkData = { chunkIndex: (chunksRef.current.get(lead.id) || []).length, messages: toArchive, summary, tokenEstimate: Math.ceil(toArchive.reduce((s, m) => s + m.content.length, 0) / 3.5) };
            const existingChunks = chunksRef.current.get(lead.id) || [];
            existingChunks.push(chunk);
            chunksRef.current.set(lead.id, existingChunks);
            simPersistence.processChunking(lead);
            addEvent("#8B5CF6", `📦 ${lead.nome}: bloco ${chunk.chunkIndex + 1} arquivado (${CHUNK_SIZE} msgs resumidas)`, "📦");
          }
          const leadChunks = chunksRef.current.get(lead.id) || [];
          const compressedHistory = leadChunks.length > 0 ? buildActiveContext(lead, leadChunks) : compressConversation(lead.mensagens);
          const agentResp = await callSimulatorAI(
            buildAgentSysPrompt(agent, hasNext, enableTransfers, agentResponseLength, globalRulesBlockRef.current, dbAgentOverridesRef.current[agent.id]),
            compressedHistory, "agent"
          );
          if (!simAtivaRef.current) return;
          const addedAgentResp = pushUniqueSimMessage(lead, { role: "agent", content: agentResp, agentName: agent.name, timestamp: Date.now() });
          if (addedAgentResp) setLeads(prev => [...prev]);

          // Detect price print mention → generate actual image
          if (detectsPricePrint(agentResp)) {
            addEvent("#8B5CF6", `📸 ${agent.name} gerando print de preço para ${lead.nome}...`, "🖼️");
            const priceImg = await generatePriceImage(lead);
            if (priceImg && simAtivaRef.current) {
              lead.mensagens.push({ role: "agent", content: "📋 Orçamento", agentName: agent.name, timestamp: Date.now(), imageUrl: priceImg });
              setLeads(prev => [...prev]);
              addEvent("#10B981", `✅ Print de preço enviado para ${lead.nome}`, "🖼️");
            }
          }

          // Evaluate agent response
          evalCounter++;
          if (enableEvaluation && evalCounter % evalEvery === 0) {
            const avaliacao = await avaliarRespostaAgente(agentResp, lead);
            if (!simAtivaRef.current) return;
            const volatilityMult = emotionalVolatility / 50;
            const adjustedNota = Math.round(avaliacao.nota * volatilityMult + (50 * (1 - volatilityMult / 2)));
            const updatedLead = atualizarEstadoEmocional(lead, adjustedNota, avaliacao.reacao, avaliacao.sentimento);
            Object.assign(lead, updatedLead);
            const curve = (lead as any)._patienceCurve || "linear";
            const abSens = ((lead as any)._abandonSensitivity ?? 50) / 100;
            if (curve === "exponential") {
              const ratio = 1 - (lead.pacienciaRestante / initialPatience);
              const extraDrain = Math.floor(ratio * ratio * 15 * (1 + abSens));
              lead.pacienciaRestante = Math.max(0, lead.pacienciaRestante - extraDrain);
            } else if (curve === "sudden") {
              if (lead.pacienciaRestante < 40 && adjustedNota < 60) {
                lead.pacienciaRestante = Math.max(0, lead.pacienciaRestante - Math.floor(25 * (1 + abSens)));
              }
            } else {
              const drain = Math.floor(5 * (1 + abSens));
              if (adjustedNota < 50) lead.pacienciaRestante = Math.max(0, lead.pacienciaRestante - drain);
            }
            lead.scoreHumanizacao = lead.scoreHumanizacao > 0 ? Math.round((lead.scoreHumanizacao + avaliacao.humanizacao) / 2) : avaliacao.humanizacao;
            lead.scoreEficacia = lead.scoreEficacia > 0 ? Math.round((lead.scoreEficacia + avaliacao.eficaciaComercial) / 2) : avaliacao.eficaciaComercial;
            lead.scoreTecnica = lead.scoreTecnica > 0 ? Math.round((lead.scoreTecnica + avaliacao.qualidadeTecnica) / 2) : avaliacao.qualidadeTecnica;
            setLeads(prev => [...prev]);

            if (avaliacao.nota < 40) {
              addEvent("#F59E0B", `${lead.nome}: ${avaliacao.reacao} (H:${avaliacao.humanizacao} E:${avaliacao.eficaciaComercial} T:${avaliacao.qualidadeTecnica})`, "😤");
            } else if (avaliacao.nota >= 80) {
              addEvent("#10B981", `${lead.nome}: ${avaliacao.reacao} (H:${avaliacao.humanizacao} E:${avaliacao.eficaciaComercial} T:${avaliacao.qualidadeTecnica})`, "😊");
            }

            if (devePerdeLead(lead)) {
              if (enableLossNarrative) {
                const lossMsg = await gerarMensagemPerda(lead);
                pushUniqueSimMessage(lead, { role: "client", content: lossMsg, timestamp: Date.now() });
                lead.motivoPerda = lossMsg;
              } else {
                lead.motivoPerda = `Paciência esgotada (${lead.pacienciaRestante})`;
              }
              lead.status = "perdeu"; lead.resultadoFinal = "perdeu"; lead.etapaPerda = lead.etapaAtual;
              setLeads(prev => [...prev]);
              addEvent("#EF4444", `❌ ${lead.nome} DESISTIU em ${lead.etapaAtual}: "${(lead.motivoPerda || "").slice(0, 60)}..."`, "💔");
              forceLoss = true;
              break;
            }
          }

          // Handle transfer
          if (enableTransfers && hasNext && agentResp.includes("[TRANSFERIR]")) {
            agentIdx++;
            const nextAgent = funnelAgents[agentIdx % funnelAgents.length];
            addEvent("#06B6D4", `${agent.name} → ${nextAgent.name}`, "🔄");
            if (lead.informacoesPendentes.length > 0) {
              const revealed = lead.informacoesPendentes.shift()!;
              lead.informacoesReveladas.push(revealed);
            }
          }

          if (speedDelay > 0) await new Promise(r => setTimeout(r, speedDelay));
          if (r >= rounds - 1 || abortRef.current) break;

          // Check for dynamic objection
          const turno = r + 1;
          if (deveInserirObjecao(lead, lead.etapaAtual, turno)) {
            const objecao = await gerarObjecao(lead, agentResp);
            if (!simAtivaRef.current) return;
            const addedObjection = pushUniqueSimMessage(lead, { role: "client", content: objecao, timestamp: Date.now() });
            if (lead.objecoesPendentes.length > 0) {
              lead.objecoesLancadas.push(lead.objecoesPendentes.shift()!);
            }
            if (addedObjection) {
              setLeads(prev => [...prev]);
              addEvent("#F59E0B", `⚠️ Objeção de ${lead.nome}: "${objecao.slice(0, 50)}..."`, "🛡️");
            }

            const objCompressed = compressConversation(lead.mensagens);
            const objResp = await callSimulatorAI(
              buildAgentSysPrompt(agent, false, enableTransfers, agentResponseLength, globalRulesBlockRef.current, dbAgentOverridesRef.current[agent.id]),
              objCompressed, "agent"
            );
            if (!simAtivaRef.current) return;
            const addedObjectionResp = pushUniqueSimMessage(lead, { role: "agent", content: objResp, agentName: agent.name, timestamp: Date.now() });
            if (addedObjectionResp) setLeads(prev => [...prev]);
            continue;
          }

          // Generate contextual lead response via AI
          const clientResp = await generateLeadMsg(lead, agentResp, false, { avoidRecentDuplicates: true });
          if (!simAtivaRef.current) return;
          const addedClientResp = pushUniqueSimMessage(lead, { role: "client", content: clientResp, timestamp: Date.now() });
          if (addedClientResp) setLeads(prev => [...prev]);

          // Multi-message behavior
          if (enableMultiMsg && Math.random() < lead.probabilidadeMultiMensagem) {
            const extraMsg = await generateLeadMsg(lead, agentResp, false, { avoidRecentDuplicates: true });
            if (simAtivaRef.current) {
              const addedExtraMsg = pushUniqueSimMessage(lead, { role: "client", content: extraMsg, timestamp: Date.now() }, { windowSize: 8 });
              if (addedExtraMsg) {
                setLeads(prev => [...prev]);
                addEvent(lead.perfil.cor, `${lead.nome} enviou múltiplas msgs`, "💬💬");
              }
            }
          }

          // Follow-up pressure
          const fup = (lead as any)._followUpPressure ?? 30;
          if (fup > 0 && Math.random() * 100 < fup) {
            const followUps = ["??", "e aí?", "alguém?", "oi?", "tô aguardando", "???", "🙄", "tem alguém aí?", "vou procurar outra agência..."];
            const fMsg = followUps[Math.floor(Math.random() * followUps.length)];
            const addedFollowUp = pushUniqueSimMessage(lead, { role: "client", content: fMsg, timestamp: Date.now() }, { windowSize: 10 });
            if (addedFollowUp) {
              setLeads(prev => [...prev]);
              addEvent("#F59E0B", `${lead.nome}: follow-up "${fMsg}"`, "⏰");
            }
          }

          // Per-conversation time limit
          const maxConvMs = ((lead as any)._maxConvMinutes ?? 0) * 60 * 1000;
          if (maxConvMs > 0 && lead.mensagens.length >= 2) {
            const convDuration = Date.now() - lead.mensagens[0].timestamp;
            if (convDuration >= maxConvMs) {
              addEvent("#8B5CF6", `${lead.nome}: limite de ${(lead as any)._maxConvMinutes}min por conversa`, "⏱️");
              break;
            }
          }

          if (speedDelay > 0) await new Promise(r => setTimeout(r, Math.max(100, speedDelay / 2)));
        }

        // Resolve lead
        if (!forceLoss && lead.status === "ativo") {
          const willClose = conversionOverride !== null
            ? Math.random() * 100 < conversionOverride
            : lead.ticket > 0;

          if (willClose) {
            lead.status = "fechou"; lead.resultadoFinal = "fechou"; lead.etapaAtual = "fechamento";
            addEvent("#EAB308", `🎉 ${lead.nome} FECHOU · R$${(lead.ticket / 1000).toFixed(0)}k · ${lead.perfil.label}`, "🏆");
          } else {
            if (enableLossNarrative) {
              const lossMsg = await gerarMensagemPerda(lead);
                pushUniqueSimMessage(lead, { role: "client", content: lossMsg, timestamp: Date.now() });
              lead.motivoPerda = lossMsg;
            } else {
              lead.motivoPerda = "Não converteu";
            }
            lead.status = "perdeu"; lead.resultadoFinal = "perdeu"; lead.etapaPerda = lead.etapaAtual;
            addEvent("#EF4444", `${lead.nome} perdido em ${lead.etapaAtual} · ${lead.perfil.label}`, "📉");
          }
          setLeads(prev => [...prev]);
          // Persist final lead state to DB
          simPersistence.updateLeadState(lead);
        }
      } catch (err) {
        console.error("Lead sim error:", err);
        lead.status = "perdeu"; lead.motivoPerda = "Erro de sistema";
        setLeads(prev => [...prev]);
        simPersistence.updateLeadState(lead);
      }
    };

    // ===== Dispatch leads based on mode =====
    if (dispatchMode === "simultaneous") {
      // All leads start at once — controlled micro-batches to protect Anthropic token/min limits
      addEvent("#8B5CF6", `⚡ Disparo simultâneo: ${allLeads.length} leads ao mesmo tempo!`, "🚀");
      const batchSize = Math.min(allLeads.length, 3);
      for (let i = 0; i < allLeads.length; i += batchSize) {
        if (!simAtivaRef.current || abortRef.current || isDurationExceeded()) break;
        const batch = allLeads.slice(i, i + batchSize);
        await Promise.all(batch.map((lead, index) => new Promise<void>((resolve) => {
          setTimeout(() => {
            void simulateLead(lead).finally(() => resolve());
          }, index * 1200);
        })));
        if (i + batchSize < allLeads.length) {
          await new Promise(r => setTimeout(r, 2200));
        }
      }
    } else if (dispatchMode === "wave") {
      // Wave mode — capped parallelism to avoid input-token burst throttling
      const waveSize = Math.min(Math.max(2, parallelLeads), 3);
      let waveNum = 1;
      for (let i = 0; i < allLeads.length; i += waveSize) {
        if (!simAtivaRef.current || abortRef.current || isDurationExceeded()) break;
        const batch = allLeads.slice(i, i + waveSize);
        addEvent("#06B6D4", `🌊 Onda ${waveNum}: ${batch.length} leads`, "🌊");
        await Promise.all(batch.map((lead, index) => new Promise<void>((resolve) => {
          setTimeout(() => {
            void simulateLead(lead).finally(() => resolve());
          }, index * 1200);
        })));
        waveNum++;
        if (i + waveSize < allLeads.length) {
          await new Promise(r => setTimeout(r, Math.max(intervalSec * 1000, 2000)));
        }
      }
    } else {
      // Sequential — original behavior
      for (let i = 0; i < allLeads.length; i++) {
        if (!simAtivaRef.current || abortRef.current || isDurationExceeded()) break;
        await simulateLead(allLeads[i]);
        if (i < allLeads.length - 1 && !abortRef.current && intervalSec > 0) {
          await new Promise(r => setTimeout(r, intervalSec * 1000));
        }
      }
    }

    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    setPhase("report");
    const elapsed = Math.round((Date.now() - simStartTime) / 1000);
    const wasTimeout = duration > 0 && elapsed >= duration;

    // Finalize DB persistence
    const finalClosed = allLeads.filter(l => l.status === "fechou");
    const finalLost = allLeads.filter(l => l.status === "perdeu");
    const finalRevenue = finalClosed.reduce((s, l) => s + l.ticket, 0);
    const finalConv = allLeads.length > 0 ? Math.round((finalClosed.length / allLeads.length) * 100) : 0;
    simPersistence.finishSimulation({
      leadsClosed: finalClosed.length,
      leadsLost: finalLost.length,
      conversionRate: finalConv,
      totalRevenue: finalRevenue,
      scoreGeral: 0,
      durationSeconds: elapsed,
    });

    toast({ title: wasTimeout ? "Simulação encerrada por tempo!" : "Simulação concluída!", description: `${allLeads.length} leads processados em ${formatTime(elapsed)}` });
  }, [numLeads, msgsPerLead, intervalSec, duration, parallelLeads, dispatchMode, selectedProfiles, profileMode, selectedDestinos, selectedBudgets, selectedCanais, selectedGrupos, conversionOverride, objectionDensity, speed, funnelMode, customFunnelAgents, enableEvaluation, enableMultiMsg, enableTransfers, emotionalVolatility, agentResponseLength, enableLossNarrative, evalFrequency, initialPatience, leadPatienceCurve, abandonmentSensitivity, leadToneFormality, leadTypingStyle, leadFollowUpPressure, infoRevealSpeed, enableLeadTypos, enableLeadEmojis, enableLeadAudioRef, leadConversationGoal, maxConversationMinutes, leadReengagementChance, leadCustomInstructions, toast, simPersistence]);

  const stopSimulation = () => stopSimulationRef.current();

  // Generate debrief — V2 com 12 critérios + análise individual de TODOS os leads
  const generateDebrief = useCallback(async () => {
    setDebriefLoading(true);
    try {
      // Build individual lead cards for ALL leads (compact format)
      const fichasIndividuais = leads.map((l, i) => {
        const agentNames = [...new Set(l.mensagens.filter(m => m.agentName).map(m => m.agentName!))];
        const clientMsgs = l.mensagens.filter(m => m.role === "client").length;
        const agentMsgs = l.mensagens.filter(m => m.role === "agent").length;
        return `[LEAD ${i + 1}] ${l.nome} | Perfil: ${l.perfil.label} | Destino: ${l.destino} | Budget: R$${(l.ticket / 1000).toFixed(0)}k
Status: ${l.status} | Sentimento: ${l.sentimentoScore}/100 | Emoção: ${l.estadoEmocional}
Scores: H${l.scoreHumanizacao} E${l.scoreEficacia} T${l.scoreTecnica}
Agente(s): ${agentNames.join(", ")} | Msgs: ${clientMsgs} cliente / ${agentMsgs} agente
Objeções: ${l.objecoesLancadas.join(", ") || "nenhuma"}
${l.motivoPerda ? `Motivo perda: ${l.motivoPerda} (etapa: ${l.etapaPerda})` : ""}
Conversa resumida:
${l.mensagens.slice(0, 6).map(m => `${m.role === "client" ? "CLI" : "AGT"}: ${m.content.slice(0, 100)}`).join("\n")}
${l.mensagens.length > 12 ? `... (${l.mensagens.length - 12} msgs omitidas) ...\n${l.mensagens.slice(-6).map(m => `${m.role === "client" ? "CLI" : "AGT"}: ${m.content.slice(0, 100)}`).join("\n")}` : l.mensagens.length > 6 ? l.mensagens.slice(6).map(m => `${m.role === "client" ? "CLI" : "AGT"}: ${m.content.slice(0, 100)}`).join("\n") : ""}`;
      }).join("\n---\n");

      // Representative deep samples (best, worst, edge cases)
      const sortedByScore = [...leads].sort((a, b) => {
        const scoreA = (a.scoreHumanizacao + a.scoreEficacia + a.scoreTecnica) / 3;
        const scoreB = (b.scoreHumanizacao + b.scoreEficacia + b.scoreTecnica) / 3;
        return scoreB - scoreA;
      });
      const sampleLeads = [
        ...sortedByScore.slice(0, 2), // best
        ...sortedByScore.slice(-2),   // worst
        ...leads.filter(l => l.status === "perdeu").slice(0, 2), // losses
      ];
      const uniqueSamples = [...new Map(sampleLeads.map(l => [l.id, l])).values()].slice(0, 6);

      const sampleConvos = uniqueSamples.map(l => ({
        name: l.nome, profile: l.perfil.label, destino: l.destino, status: l.status,
        sentimento: l.sentimentoScore, emocao: l.estadoEmocional, motivoPerda: l.motivoPerda,
        objecoes: l.objecoesLancadas, etapaPerda: l.etapaPerda,
        dimensoes: { h: l.scoreHumanizacao, e: l.scoreEficacia, t: l.scoreTecnica },
        msgs: l.mensagens.slice(0, 16).map(m => `${m.role}: ${m.content.slice(0, 150)}`).join("\n"),
      }));

      const pResumo = PERFIS_INTELIGENTES.map(p => {
        const pLeads = leads.filter(l => l.perfil.tipo === p.tipo);
        const pClosed = pLeads.filter(l => l.status === "fechou");
        return pLeads.length > 0 ? `${p.label}: ${pClosed.length}/${pLeads.length}` : null;
      }).filter(Boolean).join(" | ");

      const topObjs = leads.flatMap(l => l.objecoesLancadas).reduce((acc, o) => { acc[o] = (acc[o] || 0) + 1; return acc; }, {} as Record<string, number>);
      const topObjsStr = Object.entries(topObjs).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `"${k}" (${v}x)`).join(", ");

      const agentesUsados = [...new Set(leads.flatMap(l => l.mensagens.filter(m => m.agentName).map(m => m.agentName!)))];

      const prompt = buildDebriefV2Prompt({
        totalLeads: leads.length,
        fechados: closedLeads.length,
        perdidos: lostLeads.length,
        conversionRate,
        receita: totalReceita,
        ticketMedio,
        totalObjecoes,
        totalContornadas,
        performancePorPerfil: pResumo,
        topObjecoes: topObjsStr,
        perdasMotivadas: lostLeads.slice(0, 8).map(l => `${l.perfil.label} em ${l.etapaPerda}: ${l.motivoPerda?.slice(0, 80)}`).join(" | "),
        amostraConversas: JSON.stringify(sampleConvos),
        agentesUsados,
        fichasIndividuais,
      });

      const resp = await callSimulatorAI(SYSTEM_DEBRIEF_V2, [{ role: "user", content: prompt }], "debrief");
      const jsonMatch = resp.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);

        const parseDimensao = (dim: any, pesoKey: string): DimensaoScore => {
          if (!dim) return { score: 50, peso_agente: 35, criterios: {} };
          const criterios: Record<string, CriterioScore> = {};
          if (dim.criterios) {
            Object.entries(dim.criterios).forEach(([k, v]: [string, any]) => {
              criterios[k] = { score: v?.score ?? 50, nivel: v?.nivel ?? "REGULAR", evidencia: v?.evidencia ?? "" };
            });
          }
          return { score: dim.score ?? 50, peso_agente: dim.peso_agente ?? 35, criterios };
        };

        const dimensoes: DebriefDimensoes = {
          humanizacao: parseDimensao(data.dimensoes?.humanizacao, "humanizacao"),
          eficaciaComercial: parseDimensao(data.dimensoes?.eficaciaComercial, "eficaciaComercial"),
          qualidadeTecnica: parseDimensao(data.dimensoes?.qualidadeTecnica, "qualidadeTecnica"),
        };

        // Parse individual analyses
        const analiseIndividual = (data.analiseIndividual || []).map((a: any) => ({
          leadNome: a.leadNome || "",
          perfil: a.perfil || "",
          destino: a.destino || "",
          status: a.status || "ativo",
          score: a.score || 50,
          humanizacao: a.humanizacao || 50,
          eficacia: a.eficacia || 50,
          tecnica: a.tecnica || 50,
          diagnostico: a.diagnostico || "",
          pontosFortes: a.pontosFortes || [],
          falhasCriticas: a.falhasCriticas || [],
          agenteResponsavel: a.agenteResponsavel || "",
        }));

        const debriefResult: DebriefData = {
          scoreGeral: data.scoreGeral || 0,
          resumoExecutivo: data.resumoExecutivo || data.resumo_executivo || "",
          fraseNathAI: data.fraseNathAI || "",
          pontosFortes: data.pontosFortes || data.pontos_fortes || [],
          dimensoes,
          analiseIndividual,
          diagnosticoSessao: data.diagnosticoSessao || "",
          melhorias: (data.melhorias || []).map((m: any, i: number) => ({
            id: `imp-${Date.now()}-${i}`,
            titulo: m.titulo || "",
            desc: m.desc || m.descricao || "",
            impacto: m.impacto || "",
            agente: m.agente || "",
            prioridade: m.prioridade || "media",
            tipo: (m.tipo || "instrucao_prompt") as ImprovementType,
            conteudoSugerido: m.conteudoSugerido || "",
            fonte: `debrief_criterio_${m.criterio || "geral"}`,
            status: "pending" as const,
            deepAnalysis: null,
            editedContent: undefined,
          })),
          lacunasConhecimento: data.lacunasConhecimento || [],
          insightsCliente: data.insightsCliente || [],
        };
        setDebrief(debriefResult);

        // Save to simulation history with dimensions
        saveSimHistory({
          id: "wr_" + Date.now(),
          date: new Date().toISOString(),
          scoreGeral: debriefResult.scoreGeral,
          totalLeads: leads.length,
          fechados: closedLeads.length,
          perdidos: lostLeads.length,
          conversao: conversionRate,
          melhorias_aprovadas: [],
          dimensoes: {
            humanizacao: dimensoes.humanizacao.score,
            eficaciaComercial: dimensoes.eficaciaComercial.score,
            qualidadeTecnica: dimensoes.qualidadeTecnica.score,
          },
        });

        // Save to evaluation history
        agentesUsados.forEach(agenteName => {
          saveHistoricoAvaliacao({
            id: `eval_${Date.now()}_${agenteName}`,
            timestamp: Date.now(),
            agenteId: agenteName.toLowerCase(),
            agenteName,
            scoreGeral: debriefResult.scoreGeral,
            dimensoes: {
              humanizacao: dimensoes.humanizacao.score,
              eficaciaComercial: dimensoes.eficaciaComercial.score,
              qualidadeTecnica: dimensoes.qualidadeTecnica.score,
            },
            perfilLead: leads.map(l => l.perfil.label).join(", "),
            fonteSimulacao: "war_room_auto",
          });
        });
      }
    } catch (err) {
      console.error("Debrief generation error:", err);
      toast({ title: "Erro ao gerar debrief IA", description: "Tente novamente clicando em 'Debrief IA'.", variant: "destructive" });
    }
    finally { setDebriefLoading(false); }
  }, [leads, closedLeads, lostLeads, totalReceita, totalObjecoes, totalContornadas, avgSentimento, conversionRate, ticketMedio, toast]);

  useEffect(() => { if (phase === "report" && !debrief && !debriefLoading) generateDebrief(); }, [phase, generateDebrief]);

  // Deep analysis for a single improvement
  const runDeepAnalysis = useCallback(async (improvementId: string) => {
    if (!debrief) return;
    const m = debrief.melhorias.find(x => x.id === improvementId);
    if (!m) return;
    setDebrief(prev => prev ? { ...prev, melhorias: prev.melhorias.map(x => x.id === improvementId ? { ...x, status: "analyzing" as const } : x) } : prev);
    try {
      const agent = AGENTS_V4.find(a => a.name.toLowerCase().includes(m.agente.toLowerCase()));
      const prompt = `Você é NATH.AI. Analise esta melhoria com profundidade máxima.
Tom: consultora sênior. Evidências primeiro, depois recomendação.
Retorne SOMENTE JSON.

Melhoria: ${m.titulo}
Descrição: ${m.desc}
Agente afetado: ${m.agente} (${agent?.role || "agente"})
Tipo de implementação: ${m.tipo}
Impacto estimado: ${m.impacto}
Prioridade: ${m.prioridade}
Conteúdo sugerido: ${m.conteudoSugerido?.slice(0, 200)}

Retorne JSON:
{
  "analiseCompleta": "3-5 parágrafos com problema, causa raiz, solução, evidências",
  "linhaRaciocinio": ["passo 1", "passo 2", "passo 3", "conclusão"],
  "impactoNumeros": {
    "conversao": "ex: +12% taxa com Pechincheiro",
    "receita": "ex: +R$1.800/mês",
    "satisfacao": "ex: NPS +0.3 em 60 dias",
    "eficiencia": "ex: -2 turnos por conversa"
  },
  "psicologiaCliente": "como a melhoria afeta a percepção do cliente",
  "riscosNaoImplementar": "o que acontece se ignorar",
  "recomendacao": "APROVAR|AVALIAR|REJEITAR",
  "confianca": 0-100
}`;
      const resp = await callSimulatorAI("Voce e NATH.AI analista senior. Retorne SOMENTE JSON.", [{ role: "user", content: prompt }], "deep");
      const jsonMatch = resp.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis: DeepAnalysis = JSON.parse(jsonMatch[0]);
        setDebrief(prev => prev ? { ...prev, melhorias: prev.melhorias.map(x => x.id === improvementId ? { ...x, status: "pending" as const, deepAnalysis: analysis } : x) } : prev);
      }
    } catch {
      setDebrief(prev => prev ? { ...prev, melhorias: prev.melhorias.map(x => x.id === improvementId ? { ...x, status: "pending" as const } : x) } : prev);
      toast({ title: "Erro na análise profunda", variant: "destructive" });
    }
  }, [debrief, toast]);

  const handleImprovement = async (id: string, action: "approved" | "rejected", reason?: string) => {
    if (!debrief) return;
    const m = debrief.melhorias.find(x => x.id === id);
    if (!m) return;
    if (action === "approved") {
      await implementImprovement(m);
    }
    setDebrief({ ...debrief, melhorias: debrief.melhorias.map(x => x.id === id ? { ...x, status: action, rejectReason: reason } : x) });
    toast({ title: action === "approved" ? "✅ Melhoria aprovada e implementada" : "Melhoria rejeitada", description: action === "approved" ? `Salva em ${TIPO_COLORS[m.tipo].label} → ${m.agente}` : reason || "" });
  };

  const approveAll = async () => {
    if (!debrief) return;
    const pending = debrief.melhorias.filter(m => m.status === "pending");
    for (const m of pending) { await implementImprovement(m); }
    setDebrief({ ...debrief, melhorias: debrief.melhorias.map(m => ({ ...m, status: "approved" as const })) });
    toast({ title: `✅ ${pending.length} melhorias aprovadas e implementadas` });
  };

  const updateImprovementContent = (id: string, content: string) => {
    if (!debrief) return;
    setDebrief({ ...debrief, melhorias: debrief.melhorias.map(m => m.id === id ? { ...m, editedContent: content } : m) });
  };

  const convertInsightToImprovement = (insight: string) => {
    if (!debrief) return;
    const newImp: Improvement = {
      id: `imp-insight-${Date.now()}`, titulo: insight.slice(0, 60),
      desc: insight, impacto: "A ser avaliado", agente: "NATH.AI",
      prioridade: "media", status: "pending", tipo: "instrucao_prompt",
      conteudoSugerido: "", fonte: "insight_convertido",
    };
    setDebrief({ ...debrief, melhorias: [...debrief.melhorias, newImp] });
    toast({ title: "Insight convertido em melhoria pendente" });
  };

  const convertLacunaToKB = (lacuna: string) => {
    if (!debrief) return;
    const newImp: Improvement = {
      id: `imp-kb-${Date.now()}`, titulo: `KB: ${lacuna.slice(0, 50)}`,
      desc: lacuna, impacto: "Preencher lacuna de conhecimento", agente: "DANTE",
      prioridade: "alta", status: "pending", tipo: "conhecimento_kb",
      conteudoSugerido: "", fonte: "lacuna_convertida",
    };
    setDebrief({ ...debrief, melhorias: [...debrief.melhorias, newImp] });
    toast({ title: "Lacuna convertida em documento KB pendente" });
  };

  const simHistory: SimHistoryEntry[] = loadJson(STORAGE_KEYS.sim_history);

  // Sentiment color helper
  const sentimentColor = (s: number) => s >= 70 ? "#10B981" : s >= 40 ? "#F59E0B" : "#EF4444";
  const sentimentLabel = (s: number) => s >= 80 ? "Empolgado" : s >= 60 ? "Satisfeito" : s >= 40 ? "Neutro" : s >= 20 ? "Impaciente" : "Desistindo";

  // ===== EXPORT FUNCTIONS =====
  const exportConversations = useCallback((format: "txt" | "pdf") => {
    if (leads.length === 0) return;

    const timestamp = new Date().toLocaleString("pt-BR");
    const dateFile = new Date().toISOString().slice(0, 10);

    if (format === "txt") {
      const lines: string[] = [];
      lines.push("╔══════════════════════════════════════════════════════════════╗");
      lines.push("║           RELATÓRIO DE SIMULAÇÃO — NATLEVA AI              ║");
      lines.push("╚══════════════════════════════════════════════════════════════╝");
      lines.push("");
      lines.push(`📅 Data: ${timestamp}`);
      lines.push(`⏱️ Duração: ${formatTime(elapsedSeconds)}`);
      lines.push(`👥 Total de leads: ${leads.length}`);
      lines.push(`✅ Fechados: ${closedLeads.length}`);
      lines.push(`❌ Perdidos: ${lostLeads.length}`);
      lines.push(`📊 Conversão: ${conversionRate}%`);
      lines.push(`💰 Receita total: R$${totalReceita.toLocaleString("pt-BR")}`);
      lines.push(`🎯 Ticket médio: R$${ticketMedio.toLocaleString("pt-BR")}`);
      lines.push(`😊 Sentimento médio: ${avgSentimento}/100`);
      lines.push("");
      lines.push("┌──────────────────────────────────────────────────────────────┐");
      lines.push("│  📊 SCORECARD — 3 DIMENSÕES                                │");
      lines.push("├──────────────────────────────────────────────────────────────┤");
      lines.push(`│  ❤️ Humanização:       ${"█".repeat(Math.round(avgHumanizacao / 5))}${"░".repeat(20 - Math.round(avgHumanizacao / 5))}  ${avgHumanizacao}/100  │`);
      lines.push(`│  🎯 Eficácia Comercial: ${"█".repeat(Math.round(avgEficacia / 5))}${"░".repeat(20 - Math.round(avgEficacia / 5))}  ${avgEficacia}/100  │`);
      lines.push(`│  🔧 Qualidade Técnica:  ${"█".repeat(Math.round(avgTecnica / 5))}${"░".repeat(20 - Math.round(avgTecnica / 5))}  ${avgTecnica}/100  │`);
      lines.push("└──────────────────────────────────────────────────────────────┘");
      lines.push("");

      leads.forEach((lead, idx) => {
        lines.push("═".repeat(64));
        lines.push(`📱 CONVERSA ${idx + 1}/${leads.length}`);
        lines.push("═".repeat(64));
        lines.push(`👤 Lead: ${lead.nome}`);
        lines.push(`🧠 Perfil: ${lead.perfil.emoji} ${lead.perfil.label}`);
        lines.push(`✈️ Destino: ${lead.destino}`);
        lines.push(`💰 Orçamento: ${lead.orcamento}`);
        lines.push(`👥 Grupo: ${lead.paxLabel}`);
        lines.push(`📱 Canal: ${lead.origem}`);
        lines.push(`📍 Resultado: ${lead.status === "fechou" ? `✅ FECHOU — R$${(lead.ticket / 1000).toFixed(0)}k` : lead.status === "perdeu" ? `❌ PERDEU em ${lead.etapaPerda || "N/A"}` : "⏳ Ativo"}`);
        if (lead.motivoPerda) lines.push(`💬 Motivo: ${lead.motivoPerda.slice(0, 120)}`);
        lines.push(`❤️ Sentimento final: ${lead.sentimentoScore}/100 (${sentimentLabel(lead.sentimentoScore)})`);
        lines.push(`🔋 Paciência final: ${lead.pacienciaRestante}/100`);
        lines.push("");
        lines.push("─".repeat(50));
        lines.push("  MENSAGENS");
        lines.push("─".repeat(50));
        lines.push("");

        lead.mensagens.forEach(msg => {
          const time = new Date(msg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          if (msg.role === "client") {
            lines.push(`  ┌─ 👤 ${lead.nome} · ${time}`);
            lines.push(`  │ ${msg.content}`);
            lines.push(`  └─`);
          } else {
            lines.push(`  ┌─ 🤖 ${msg.agentName || "Agente"} · ${time}`);
            lines.push(`  │ ${msg.content}`);
            lines.push(`  └─`);
          }
          lines.push("");
        });

        if (lead.objecoesLancadas.length > 0) {
          lines.push(`  ⚠️ Objeções: ${lead.objecoesLancadas.join(", ")}`);
          lines.push("");
        }
      });

      lines.push("");
      lines.push("═".repeat(64));
      lines.push("Gerado automaticamente pelo Simulador NatLeva AI");
      lines.push(`${timestamp}`);

      const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `simulacao-natleva-${dateFile}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "📄 Conversa exportada em TXT!" });

    } else if (format === "pdf") {
      // Generate rich HTML and print to PDF
      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Simulação NatLeva AI — ${dateFile}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, sans-serif; background: #0F172A; color: #E2E8F0; padding: 40px; font-size: 13px; line-height: 1.6; }
  .header { text-align: center; margin-bottom: 40px; padding: 30px; background: linear-gradient(135deg, #0A1628, #1E293B); border-radius: 16px; border: 1px solid rgba(255,255,255,0.06); }
  .header h1 { font-size: 24px; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 4px; background: linear-gradient(135deg, #10B981, #06B6D4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .header .subtitle { color: #64748B; font-size: 12px; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 30px; }
  .stat-card { background: #1E293B; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid rgba(255,255,255,0.04); }
  .stat-value { font-size: 28px; font-weight: 800; }
  .stat-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748B; margin-top: 2px; }
  .dimensions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 30px; }
  .dim-card { background: #1E293B; border-radius: 12px; padding: 16px; border: 1px solid rgba(255,255,255,0.04); }
  .dim-label { font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; }
  .dim-bar { height: 6px; border-radius: 3px; background: rgba(255,255,255,0.06); margin-top: 8px; overflow: hidden; }
  .dim-fill { height: 100%; border-radius: 3px; }
  .dim-score { font-size: 22px; font-weight: 800; margin-top: 6px; }
  .conversation { margin-bottom: 30px; background: #1E293B; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.04); page-break-inside: avoid; }
  .conv-header { padding: 16px 20px; background: linear-gradient(135deg, rgba(16,185,129,0.06), rgba(6,182,212,0.04)); border-bottom: 1px solid rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: space-between; }
  .conv-header .lead-name { font-size: 15px; font-weight: 700; }
  .conv-header .lead-meta { font-size: 10px; color: #64748B; }
  .conv-result { font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; }
  .conv-result.won { background: rgba(16,185,129,0.12); color: #10B981; }
  .conv-result.lost { background: rgba(239,68,68,0.12); color: #EF4444; }
  .messages { padding: 16px 20px; }
  .msg { margin-bottom: 12px; max-width: 80%; }
  .msg.client { margin-left: auto; }
  .msg.agent { margin-right: auto; }
  .msg-bubble { padding: 10px 14px; border-radius: 12px; font-size: 12px; line-height: 1.5; }
  .msg.client .msg-bubble { background: #065F46; color: #D1FAE5; border-bottom-right-radius: 4px; }
  .msg.agent .msg-bubble { background: #1E293B; color: #E2E8F0; border: 1px solid rgba(255,255,255,0.06); border-bottom-left-radius: 4px; }
  .msg-sender { font-size: 9px; font-weight: 700; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.05em; }
  .msg.client .msg-sender { text-align: right; color: #34D399; }
  .msg.agent .msg-sender { color: #60A5FA; }
  .msg-time { font-size: 8px; color: #475569; margin-top: 2px; }
  .msg.client .msg-time { text-align: right; }
  .conv-footer { padding: 10px 20px; background: rgba(0,0,0,0.2); font-size: 10px; color: #64748B; display: flex; gap: 16px; flex-wrap: wrap; }
  .conv-footer span { display: flex; align-items: center; gap: 4px; }
  .footer { text-align: center; margin-top: 40px; color: #475569; font-size: 10px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.04); }
  @media print { body { background: #0F172A !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="header">
    <h1>✨ Simulação NatLeva AI</h1>
    <div class="subtitle">${timestamp} · Duração: ${formatTime(elapsedSeconds)}</div>
  </div>

  <div class="stats-grid">
    <div class="stat-card"><div class="stat-value" style="color:#3B82F6">${leads.length}</div><div class="stat-label">Leads</div></div>
    <div class="stat-card"><div class="stat-value" style="color:#10B981">${closedLeads.length}</div><div class="stat-label">Fechados</div></div>
    <div class="stat-card"><div class="stat-value" style="color:#F59E0B">${conversionRate}%</div><div class="stat-label">Conversão</div></div>
    <div class="stat-card"><div class="stat-value" style="color:#8B5CF6">R$${(totalReceita / 1000).toFixed(0)}k</div><div class="stat-label">Receita</div></div>
  </div>

  <div class="dimensions">
    <div class="dim-card"><div class="dim-label">❤️ Humanização</div><div class="dim-score" style="color:#EC4899">${avgHumanizacao}</div><div class="dim-bar"><div class="dim-fill" style="width:${avgHumanizacao}%;background:#EC4899"></div></div></div>
    <div class="dim-card"><div class="dim-label">🎯 Eficácia</div><div class="dim-score" style="color:#F59E0B">${avgEficacia}</div><div class="dim-bar"><div class="dim-fill" style="width:${avgEficacia}%;background:#F59E0B"></div></div></div>
    <div class="dim-card"><div class="dim-label">🔧 Técnica</div><div class="dim-score" style="color:#3B82F6">${avgTecnica}</div><div class="dim-bar"><div class="dim-fill" style="width:${avgTecnica}%;background:#3B82F6"></div></div></div>
  </div>

  ${leads.map((lead, idx) => `
  <div class="conversation">
    <div class="conv-header">
      <div>
        <div class="lead-name">${lead.perfil.emoji} ${lead.nome}</div>
        <div class="lead-meta">${lead.perfil.label} · ${lead.destino} · ${lead.orcamento} · ${lead.paxLabel} · via ${lead.origem}</div>
      </div>
      <div class="conv-result ${lead.status === "fechou" ? "won" : "lost"}">
        ${lead.status === "fechou" ? `✅ Fechou R$${(lead.ticket / 1000).toFixed(0)}k` : lead.status === "perdeu" ? `❌ Perdeu (${lead.etapaPerda || "N/A"})` : "⏳ Ativo"}
      </div>
    </div>
    <div class="messages">
      ${lead.mensagens.map(msg => {
        const time = new Date(msg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        return `<div class="msg ${msg.role === "client" ? "client" : "agent"}">
          <div class="msg-sender">${msg.role === "client" ? lead.nome : msg.agentName || "Agente"}</div>
          <div class="msg-bubble">${msg.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
          <div class="msg-time">${time}</div>
        </div>`;
      }).join("")}
    </div>
    <div class="conv-footer">
      <span>❤️ Sentimento: ${lead.sentimentoScore}/100</span>
      <span>🔋 Paciência: ${lead.pacienciaRestante}/100</span>
      <span>📊 H:${lead.scoreHumanizacao} E:${lead.scoreEficacia} T:${lead.scoreTecnica}</span>
      ${lead.objecoesLancadas.length > 0 ? `<span>⚠️ Objeções: ${lead.objecoesLancadas.join(", ")}</span>` : ""}
      ${lead.motivoPerda ? `<span>💬 ${lead.motivoPerda.slice(0, 80)}...</span>` : ""}
    </div>
  </div>`).join("")}

  <div class="footer">
    Gerado pelo Simulador NatLeva AI · ${timestamp}
  </div>
</body>
</html>`;

      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const printWin = window.open(url, "_blank");
      if (printWin) {
        printWin.onload = () => {
          setTimeout(() => {
            printWin.print();
          }, 800);
        };
      }
      URL.revokeObjectURL(url);
      toast({ title: "🖨️ PDF aberto para impressão!" });
    }
  }, [leads, closedLeads, lostLeads, elapsedSeconds, conversionRate, totalReceita, ticketMedio, avgSentimento, avgHumanizacao, avgEficacia, avgTecnica, toast]);

  // ===== RENDER: CONFIG (Simplified) =====
  if (phase === "config") {
    const allFunnelAgents = AGENTS_V4.filter(a => ["comercial", "atendimento"].includes(a.squadId));

    return (
      <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
        <div className={cn("mx-auto space-y-6", isMobile ? "px-0" : "max-w-[900px]")}>

          {/* ── Section 1: Volume ── */}
          <div className="rounded-2xl overflow-hidden" style={{
            background: "linear-gradient(135deg, rgba(13,18,32,0.9), rgba(13,18,32,0.7))",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div className="h-[2px]" style={{ background: "linear-gradient(90deg, transparent, #3B82F6, transparent)" }} />
            <div className={cn("p-5", isMobile && "p-4")}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.2)" }}>
                  <BarChart3 className="w-4.5 h-4.5" style={{ color: "#3B82F6" }} />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold" style={{ color: "#F1F5F9" }}>Volume da Simulação</h3>
                  <p className="text-xs" style={{ color: "#64748B" }}>Defina a escala do teste</p>
                </div>
              </div>
              <div className={cn("gap-4", isMobile ? "grid grid-cols-1" : "grid grid-cols-3")}>
                <SimConfigInput label="Leads totais" value={numLeads} onChange={setNumLeads} min={1} max={50} step={1} color="#3B82F6" desc="Quantidade de clientes fictícios" icon="👥" />
                <SimConfigInput label="Mensagens por lead" value={msgsPerLead} onChange={setMsgsPerLead} min={4} max={40} step={2} color="#10B981" desc="Rodadas de conversa por cliente" icon="💬" />
                <SimConfigInput label="Duração máxima" value={duration} onChange={setDuration} min={0} max={3600} step={30} color="#8B5CF6" desc="Tempo limite (0 = automático)" icon="⏳"
                  format={v => v === 0 ? "Auto" : v >= 3600 ? `${Math.floor(v / 3600)}h${Math.floor((v % 3600) / 60)}m` : formatTime(v)} />
              </div>
            </div>
          </div>

          {/* ── Section 2: Lead Profiles ── */}
          <div className="rounded-2xl overflow-hidden" style={{
            background: "linear-gradient(135deg, rgba(13,18,32,0.9), rgba(13,18,32,0.7))",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div className="h-[2px]" style={{ background: "linear-gradient(90deg, transparent, #EC4899, transparent)" }} />
            <div className={cn("p-5", isMobile && "p-4")}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(236,72,153,0.12)", border: "1px solid rgba(236,72,153,0.2)" }}>
                    <User className="w-4.5 h-4.5" style={{ color: "#EC4899" }} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold" style={{ color: "#F1F5F9" }}>Perfil do Lead</h3>
                    <p className="text-xs" style={{ color: "#64748B" }}>Que tipo de cliente vai testar · {selectedProfiles.length === 0 ? "Todos" : `${selectedProfiles.length} selecionados`}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedProfiles([])}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                  style={{ color: selectedProfiles.length > 0 ? "#EC4899" : "#64748B", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {selectedProfiles.length > 0 ? "Limpar" : "✓ Todos"}
                </button>
              </div>
              <div className={cn("grid gap-2", isMobile ? "grid-cols-2" : "grid-cols-4")}>
                {PERFIS_INTELIGENTES.map(p => {
                  const active = selectedProfiles.length === 0 || selectedProfiles.includes(p.tipo);
                  return (
                    <button key={p.tipo} onClick={() => toggleMulti(selectedProfiles, p.tipo, setSelectedProfiles)}
                      className="relative flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all duration-200 group"
                      style={{
                        background: active ? `${p.cor}08` : "rgba(255,255,255,0.015)",
                        border: `1px solid ${active ? `${p.cor}30` : "rgba(255,255,255,0.04)"}`,
                      }}>
                      {active && <div className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ background: p.cor }} />}
                      <span className="text-2xl">{p.emoji}</span>
                      <span className="text-xs font-bold" style={{ color: active ? "#F1F5F9" : "#64748B" }}>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Section 3: Destinations ── */}
          <div className="rounded-2xl overflow-hidden" style={{
            background: "linear-gradient(135deg, rgba(13,18,32,0.9), rgba(13,18,32,0.7))",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div className="h-[2px]" style={{ background: "linear-gradient(90deg, transparent, #06B6D4, transparent)" }} />
            <div className={cn("p-5", isMobile && "p-4")}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.2)" }}>
                    <MapPin className="w-4.5 h-4.5" style={{ color: "#06B6D4" }} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold" style={{ color: "#F1F5F9" }}>Destinos</h3>
                    <p className="text-xs" style={{ color: "#64748B" }}>Para onde os leads querem viajar · {selectedDestinos.length === 0 ? "Todos" : `${selectedDestinos.length} selecionados`}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedDestinos([])}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                  style={{ color: selectedDestinos.length > 0 ? "#06B6D4" : "#64748B", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {selectedDestinos.length > 0 ? "Limpar" : "✓ Todos"}
                </button>
              </div>
              <div className={cn("flex flex-wrap gap-2")}>
                {(() => {
                  const icons: Record<string, string> = {
                    "Maldivas": "🏝️", "Paris": "🗼", "Nova York": "🗽", "Tóquio": "🗾", "Dubai": "🏙️",
                    "Roma": "🏛️", "Cancún": "🌴", "Santorini": "🏖️", "Fernando de Noronha": "🐢",
                    "Gramado": "🏔️", "Bali": "🛕", "Londres": "🎡", "Orlando": "🎢", "Santiago": "🏔️", "Lisboa": "⛵",
                  };
                  return DESTINOS_LEAD.map(d => {
                    const active = selectedDestinos.length === 0 || selectedDestinos.includes(d);
                    return (
                      <button key={d} onClick={() => toggleMulti(selectedDestinos, d, setSelectedDestinos)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
                        style={{
                          background: active ? "rgba(6,182,212,0.08)" : "rgba(255,255,255,0.015)",
                          border: `1px solid ${active ? "rgba(6,182,212,0.25)" : "rgba(255,255,255,0.04)"}`,
                          color: active ? "#E2E8F0" : "#64748B",
                        }}>
                        <span>{icons[d] || "🌍"}</span> {d}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* ── Section 4: Agents ── */}
          <div className="rounded-2xl overflow-hidden" style={{
            background: "linear-gradient(135deg, rgba(13,18,32,0.9), rgba(13,18,32,0.7))",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div className="h-[2px]" style={{ background: "linear-gradient(90deg, transparent, #8B5CF6, transparent)" }} />
            <div className={cn("p-5", isMobile && "p-4")}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)" }}>
                  <Users className="w-4.5 h-4.5" style={{ color: "#8B5CF6" }} />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold" style={{ color: "#F1F5F9" }}>Agentes a Testar</h3>
                  <p className="text-xs" style={{ color: "#64748B" }}>Quem vai atender os leads na simulação</p>
                </div>
              </div>

              {/* Mode selector — 3 options */}
              <div className={cn("grid gap-3 mb-4", isMobile ? "grid-cols-1" : "grid-cols-3")}>
                {([
                  { id: "full" as const, label: "Pipeline Completo", desc: "Todos os agentes do funil", icon: "🔄", color: "#10B981" },
                  { id: "individual" as const, label: "Agente Individual", desc: "Teste um agente isolado", icon: "🎯", color: "#EC4899" },
                  { id: "custom" as const, label: "Seleção Customizada", desc: "Escolha agentes específicos", icon: "🔧", color: "#8B5CF6" },
                ] as const).map(m => (
                  <button key={m.id} onClick={() => { setFunnelMode(m.id); if (m.id === "full") setCustomFunnelAgents([]); }}
                    className="flex items-center gap-3 p-4 rounded-xl transition-all duration-200 text-left"
                    style={{
                      background: funnelMode === m.id ? `${m.color}0A` : "rgba(255,255,255,0.015)",
                      border: `1px solid ${funnelMode === m.id ? `${m.color}35` : "rgba(255,255,255,0.04)"}`,
                    }}>
                    <span className="text-xl">{m.icon}</span>
                    <div>
                      <p className="text-sm font-bold" style={{ color: funnelMode === m.id ? "#F1F5F9" : "#94A3B8" }}>{m.label}</p>
                      <p className="text-[11px]" style={{ color: "#64748B" }}>{m.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Agent selection — only for individual/custom */}
              {(funnelMode === "individual" || funnelMode === "custom") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#94A3B8" }}>
                      {funnelMode === "individual" ? "Selecione 1 agente" : `${customFunnelAgents.length} agentes selecionados`}
                    </span>
                    {funnelMode === "custom" && (
                      <div className="flex gap-2">
                        <button onClick={() => setCustomFunnelAgents(allFunnelAgents.map(a => a.id))}
                          className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: "rgba(139,92,246,0.08)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.2)" }}>
                          Todos
                        </button>
                        <button onClick={() => setCustomFunnelAgents([])}
                          className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", color: "#64748B", border: "1px solid rgba(255,255,255,0.06)" }}>
                          Limpar
                        </button>
                      </div>
                    )}
                  </div>
                  <div className={cn("grid gap-2", isMobile ? "grid-cols-2" : "grid-cols-3")}>
                    {allFunnelAgents.map(a => {
                      const active = customFunnelAgents.includes(a.id);
                      const c = getAgentColor(a);
                      return (
                        <button key={a.id} onClick={() => {
                          if (funnelMode === "individual") {
                            setCustomFunnelAgents(active ? [] : [a.id]);
                          } else {
                            toggleMulti(customFunnelAgents, a.id, setCustomFunnelAgents);
                          }
                        }}
                          className="flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200"
                          style={{
                            background: active ? `${c}0A` : "rgba(255,255,255,0.015)",
                            border: `1px solid ${active ? `${c}35` : "rgba(255,255,255,0.04)"}`,
                          }}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0" style={{
                            background: active ? `${c}15` : "rgba(255,255,255,0.04)",
                          }}>
                            {a.emoji}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold truncate" style={{ color: active ? "#F1F5F9" : "#64748B" }}>{a.name}</p>
                            <p className="text-[10px] truncate" style={{ color: "#94A3B8" }}>{a.role}</p>
                          </div>
                          {active && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pipeline preview for full mode */}
              {funnelMode === "full" && (
                <div className="flex items-center gap-1 flex-wrap">
                  {allFunnelAgents.slice(0, 6).map((a, i, arr) => {
                    const c = getAgentColor(a);
                    return (
                      <div key={a.id} className="flex items-center gap-1">
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: `${c}08`, border: `1px solid ${c}15` }}>
                          <span className="text-sm">{a.emoji}</span>
                          <span className="text-xs font-bold" style={{ color: c }}>{a.name}</span>
                        </div>
                        {i < arr.length - 1 && <span className="text-xs" style={{ color: "#334155" }}>→</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── CTA: Start Simulation ── */}
          <div className="sticky bottom-2 z-20">
            <button onClick={runSimulation}
              className={cn("w-full rounded-2xl font-extrabold tracking-wide transition-all duration-300 relative overflow-hidden group", isMobile ? "py-4 text-base" : "py-4 text-[15px]")}
              style={{
                background: "linear-gradient(135deg, #10B981, #06B6D4)",
                color: "#000",
                boxShadow: "0 8px 32px rgba(16,185,129,0.3), 0 0 0 1px rgba(16,185,129,0.2)",
              }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "linear-gradient(135deg, #059669, #0891B2)" }} />
              <span className="relative flex items-center justify-center gap-2">
                <Play className="w-5 h-5" />
                Iniciar Simulação · {numLeads} leads · {msgsPerLead} msgs
              </span>
            </button>
          </div>

        </div>
      </div>
    );
  }
  // ===== WAR ROOM / REPORT =====
  return (
    <div className="space-y-0 animate-in fade-in duration-300">
      {/* War Room header */}
      {running && (
        <div className={cn("rounded-2xl mb-4 relative overflow-hidden", isMobile ? "px-3 py-2" : "px-5 py-3")} style={{ background: "linear-gradient(135deg, rgba(13,18,32,0.95), rgba(15,23,42,0.9))", border: "1px solid rgba(239,68,68,0.15)" }}>
          <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, transparent, #EF4444, #F59E0B, transparent)" }} />
          <div className={cn("flex items-center", isMobile ? "flex-wrap gap-2" : "gap-4")}>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: "#EF4444", boxShadow: "0 0 12px rgba(239,68,68,0.5)" }} />
              <span className={cn("font-extrabold tracking-wider", isMobile ? "text-sm" : "text-sm")} style={{ color: "#F1F5F9" }}>WAR ROOM</span>
              <span className={cn("font-bold tabular-nums px-2 py-0.5 rounded-lg", isMobile ? "text-sm" : "text-sm px-3 py-1")} style={{ color: "#F59E0B", background: "rgba(245,158,11,0.08)" }}>{formatTime(elapsedSeconds)}</span>
            </div>
            <div className={cn("flex items-center gap-3", isMobile ? "flex-1 justify-between" : "flex-1 justify-center gap-6")}>
              {[
                { label: "Leads", value: animLeads, color: "#3B82F6" },
                { label: "Fechados", value: animClosed, color: "#10B981" },
                { label: "Conversão", value: `${conversionRate}%`, color: "#F59E0B" },
                ...(!isMobile ? [{ label: "Sentimento", value: `${avgSentimento}`, color: sentimentColor(avgSentimento) }] : []),
              ].map(k => (
                <div key={k.label} className="text-center">
                  <span className={cn("font-extrabold tabular-nums block", isMobile ? "text-lg" : "text-[16px]")} style={{ color: k.color }}>{k.value}</span>
                  <span className="text-[11px] uppercase tracking-wider" style={{ color: "#94A3B8" }}>{k.label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {!isMobile && (
                <>
                  <button onClick={() => exportConversations("txt")} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
                    style={{ background: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}>
                    <Download className="w-3 h-3" /> TXT
                  </button>
                  <button onClick={() => exportConversations("pdf")} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
                    style={{ background: "rgba(139,92,246,0.1)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.2)" }}>
                    <FileText className="w-3 h-3" /> PDF
                  </button>
                </>
              )}
              <button onClick={stopSimulation} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
                style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                <Square className="w-3 h-3" /> Parar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report tabs */}
      {phase === "report" && !running && (
        <div className={cn("mb-4 rounded-2xl relative overflow-hidden", isMobile ? "px-3 py-2" : "px-5 py-3")} style={{
          background: "linear-gradient(135deg, rgba(13,18,32,0.95), rgba(15,23,42,0.9))",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, #3B82F6, #10B981, #8B5CF6)" }} />
          <div className={cn("flex items-center", isMobile ? "flex-col gap-2" : "gap-3")}>
            {/* Tab buttons */}
            <div className={cn("flex items-center gap-1.5", isMobile ? "w-full" : "flex-1")}>
              {(["numeros", "conversas", "debrief"] as ReportTab[]).map(t => {
                const active = reportTab === t;
                const accent = t === "debrief" ? "#8B5CF6" : t === "numeros" ? "#3B82F6" : "#10B981";
                const icons = { numeros: "📊", conversas: "💬", debrief: "🧠" };
                const labels = { numeros: "Números", conversas: "Conversas", debrief: "Debrief" };
                return (
                  <button key={t} onClick={() => setReportTab(t)}
                    className={cn("font-bold rounded-xl transition-all duration-300", isMobile ? "flex-1 text-sm px-2 py-2" : "text-sm px-4 py-2")}
                    style={{
                      background: active ? `${accent}12` : "transparent",
                      border: `1px solid ${active ? `${accent}30` : "transparent"}`,
                      color: active ? accent : "#64748B",
                    }}>
                    {icons[t]} {labels[t]}
                  </button>
                );
              })}
            </div>
            {/* Export + Nova Simulação */}
            <div className={cn("flex items-center gap-1.5", isMobile ? "w-full" : "")}>
              <button onClick={() => exportConversations("txt")} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: "rgba(16,185,129,0.08)", color: "#10B981", border: "1px solid rgba(16,185,129,0.15)" }}>
                <Download className="w-3 h-3" /> TXT
              </button>
              <button onClick={() => exportConversations("pdf")} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-sm font-bold transition-all"
                style={{ background: "rgba(139,92,246,0.08)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.15)" }}>
                <FileText className="w-3 h-3" /> PDF
              </button>
              <button onClick={() => { if (leads.length > 0 && !confirm("Tem certeza? Os dados da simulação atual serão perdidos.")) return; setPhase("config"); setLeads([]); setDebrief(null); setEvents([]); setElapsedSeconds(0); }}
                className={cn("flex items-center gap-1.5 rounded-xl font-bold transition-all", isMobile ? "flex-1 justify-center text-sm px-3 py-2" : "text-sm px-5 py-2.5 hover:scale-[1.03]")}
                style={{
                  background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(6,182,212,0.1))",
                  border: "1px solid rgba(16,185,129,0.2)",
                  color: "#10B981",
                }}>
                <Play className="w-3.5 h-3.5" /> Nova
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3-column layout */}
      {(running || (phase === "report" && reportTab === "conversas")) && (
        <div className={cn(isMobile ? "flex flex-col gap-2" : "flex gap-4")} style={{ height: isMobile ? "auto" : "calc(100vh - 300px)", minHeight: isMobile ? undefined : 500 }}>
          {/* LEFT: Lead list */}
          <div className={cn("rounded-2xl overflow-hidden flex flex-col", isMobile ? "max-h-[35vh]" : "w-[280px] shrink-0")} style={{ background: "rgba(11,20,26,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span className="text-sm font-bold" style={{ color: "#F1F5F9" }}>Leads Inteligentes</span>
              <span className="text-sm font-bold px-2 py-0.5 rounded-lg" style={{ background: "rgba(37,211,102,0.1)", color: "#25D366" }}>
                {leads.filter(l => l.status === "ativo").length} ativos
              </span>
            </div>
            {!running && (
              <div className="flex px-3 py-1.5 gap-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                {(["all", "ativo", "fechou", "perdeu"] as const).map(f => (
                  <button key={f} onClick={() => setLeadFilter(f)}
                    className="flex-1 text-xs py-1.5 font-semibold transition-all rounded-lg"
                    style={{ color: leadFilter === f ? "#10B981" : "#667781", background: leadFilter === f ? "rgba(16,185,129,0.06)" : "transparent" }}>
                    {f === "all" ? "Todos" : f === "ativo" ? "Ativos" : f === "fechou" ? "Fechados" : "Perdidos"}
                  </button>
                ))}
              </div>
            )}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {(running ? leads : filteredLeads).map((l, i) => (
                <button key={l.id} onClick={() => setSelectedLeadId(l.id)}
                  className={cn("w-full text-left px-3.5 py-3 transition-all duration-300", i === 0 && running && "animate-in slide-in-from-top-2")}
                  style={{
                    background: selectedLeadId === l.id ? "rgba(16,185,129,0.05)" : "transparent",
                    borderLeft: selectedLeadId === l.id ? `3px solid ${l.perfil.cor}` : "3px solid transparent",
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                  }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm shrink-0 relative"
                      style={{ background: `${l.perfil.cor}12`, border: `1px solid ${l.perfil.cor}20` }}>
                      {l.perfil.emoji}
                      {/* Sentiment indicator */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full" style={{
                        background: sentimentColor(l.sentimentoScore), border: "2px solid #0B141A",
                      }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold truncate" style={{ color: "#E2E8F0" }}>{l.nome}</p>
                        <span className="text-[11px] tabular-nums" style={{ color: "#94A3B8" }}>{l.perfil.label}</span>
                      </div>
                      <p className="text-[11px] truncate mt-0.5" style={{ color: "#94A3B8" }}>
                        {l.mensagens[l.mensagens.length - 1]?.content?.slice(0, 40) || l.destino}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${l.perfil.cor}08`, color: l.perfil.cor }}>{l.destino}</span>
                        <span className="text-xs" style={{ color: sentimentColor(l.sentimentoScore) }}>♥ {l.sentimentoScore}</span>
                        {l.status !== "ativo" && (
                          <span className="text-sm font-bold" style={{ color: l.status === "fechou" ? "#10B981" : "#EF4444" }}>
                            {l.status === "fechou" ? "✓ FECHOU" : "✗ PERDEU"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* CENTER: Chat — identical to OperacaoInbox layout */}
          <div className={cn("flex-1 rounded-2xl flex flex-col overflow-hidden border border-border bg-background", isMobile && "min-h-[40vh]")}>
            {selectedLead ? (
              <>
                {/* Chat header — inbox style */}
                <div className="flex items-center justify-between px-2 md:px-4 py-2 md:py-2.5 border-b border-border bg-card/50 shrink-0">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                    <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-sm font-bold shrink-0">
                      {selectedLead.perfil.emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold truncate text-foreground">{selectedLead.nome}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{selectedLead.destino} · {selectedLead.perfil.label} · {selectedLead.ocasiao}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Sentiment */}
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary/50">
                      <Heart className="w-3 h-3" style={{ color: sentimentColor(selectedLead.sentimentoScore) }} />
                      <span className="text-[10px] font-bold tabular-nums" style={{ color: sentimentColor(selectedLead.sentimentoScore) }}>{selectedLead.sentimentoScore}</span>
                    </div>
                    {/* Patience */}
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary/50">
                      <Shield className="w-3 h-3" style={{ color: selectedLead.pacienciaRestante > 50 ? "#10B981" : "#EF4444" }} />
                      <span className="text-[10px] font-bold tabular-nums" style={{ color: selectedLead.pacienciaRestante > 50 ? "#10B981" : "#EF4444" }}>{selectedLead.pacienciaRestante}</span>
                    </div>
                    {/* Stage dots */}
                    <div className="flex items-center gap-1 bg-secondary/30 px-2.5 py-1.5 rounded-full">
                      {ETAPAS_FUNIL.map((e, i) => {
                        const idx = ETAPAS_FUNIL.findIndex(et => et.id === selectedLead.etapaAtual);
                        return (
                          <div key={e.id} className="flex items-center gap-0.5" title={e.label}>
                            <div className={cn("w-2 h-2 rounded-full transition-all", i < idx ? "bg-emerald-500" : i === idx ? "bg-primary" : "bg-muted")} />
                            {i < ETAPAS_FUNIL.length - 1 && <div className={cn("w-2 h-px", i < idx ? "bg-emerald-500/40" : "bg-muted")} />}
                          </div>
                        );
                      })}
                    </div>
                    <NathOpinionButton
                      messages={selectedLead.mensagens.map(m => ({ role: m.role, content: m.content, agentName: m.agentName, timestamp: String(m.timestamp) }))}
                      context={`Destino: ${selectedLead.destino} · Perfil: ${selectedLead.perfil.label} · Sentimento: ${selectedLead.sentimentoScore}/100 · Paciência: ${selectedLead.pacienciaRestante}% · Etapa: ${selectedLead.etapaAtual} · Ocasião: ${selectedLead.ocasiao}`}
                      variant="inline"
                    />
                  </div>
                </div>
                {/* Messages — inbox identical bubble style */}
                <div ref={chatRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 md:px-4">
                  <div className="py-4 space-y-3">
                    {selectedLead.mensagens.map((msg, i) => {
                      const isAgent = msg.role === "agent";
                      const isUser = msg.role === "client";
                      const showName = isAgent && (i === 0 || selectedLead.mensagens[i - 1]?.role !== "agent" || selectedLead.mensagens[i - 1]?.agentName !== msg.agentName);
                      const cleanContent = msg.content.replace("[TRANSFERIR]", "").trim();
                      const ts = new Date(msg.timestamp);
                      const prevTs = i > 0 ? new Date(selectedLead.mensagens[i - 1].timestamp) : null;
                      const showDate = i === 0 || (prevTs && ts.toDateString() !== prevTs.toDateString());

                      return (
                        <Fragment key={`msg-${msg.timestamp}-${i}`}>
                          {showDate && (
                            <div className="flex justify-center my-4">
                              <span className="bg-secondary/80 text-muted-foreground text-[10px] font-medium px-3 py-1.5 rounded-full">
                                {ts.toDateString() === new Date().toDateString() ? "Hoje" : ts.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                              </span>
                            </div>
                          )}
                          <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                            <div className={cn(
                              "group relative max-w-[70%] cursor-pointer transition-all",
                              observationSelectedMsg?.timestamp === msg.timestamp && observationSelectedMsg?.content === msg.content
                                ? "ring-2 ring-amber-500/50 rounded-2xl"
                                : "hover:brightness-110"
                            )}
                              onClick={() => {
                                if (!selectedLead) return;
                                setObservationSelectedMsg({
                                  content: cleanContent,
                                  role: msg.role === "agent" ? "agent" : "client",
                                  agentName: msg.agentName,
                                  leadId: selectedLead.id,
                                  leadName: selectedLead.nome,
                                  timestamp: msg.timestamp,
                                });
                              }}
                            >
                              <div className={cn(
                                "rounded-2xl px-4 py-2.5",
                                isUser
                                  ? "bg-primary text-primary-foreground rounded-br-md"
                                  : "bg-secondary text-secondary-foreground rounded-bl-md"
                              )}>
                                {showName && msg.agentName && (
                                  <p className="text-[10px] font-bold text-primary mb-1">{msg.agentName}</p>
                                )}
                                {msg.imageUrl ? (
                                  <div>
                                    <img src={msg.imageUrl} alt="Orçamento" className="rounded-lg max-w-[250px] max-h-[300px] object-cover mb-1" />
                                    {cleanContent && <p className="text-sm leading-relaxed mt-1">{cleanContent}</p>}
                                  </div>
                                ) : (
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{cleanContent}</p>
                                )}
                                <div className="flex items-center justify-end gap-1 mt-1">
                                  <span className="text-[9px] opacity-60">
                                    {ts.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                  {isUser && <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" style={{ filter: 'drop-shadow(0 0 1px rgba(83,189,235,0.5))' }} />}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Fragment>
                      );
                    })}
                  </div>
                </div>
                {/* Lead loss info */}
                {selectedLead.motivoPerda && (
                  <div className="px-4 py-2 flex items-center gap-2 border-t border-destructive/20 bg-destructive/5">
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                    <p className="text-xs text-destructive">Perda: {selectedLead.motivoPerda.slice(0, 100)}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-background">
                <Brain className="w-10 h-10 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">Selecione um lead para ver a conversa</p>
              </div>
            )}
          </div>

          {/* RIGHT: KPIs + Feed */}
          {running && !isMobile && (
            <div className="w-[240px] shrink-0 space-y-3 overflow-y-auto custom-scrollbar">
              {[
                { label: "Leads", value: animLeads, color: "#3B82F6", icon: "👥" },
                { label: "Fechados", value: animClosed, color: "#10B981", icon: "✅" },
                { label: "Receita", value: `R$${animReceita}k`, color: "#EAB308", icon: "💰" },
              ].map(k => (
                <div key={k.label} className="relative rounded-2xl overflow-hidden" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${k.color}, transparent)` }} />
                  <div className="p-3.5 text-center">
                    <p className="text-[22px] font-extrabold tabular-nums" style={{ color: k.color }}>{k.value}</p>
                    <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: "#94A3B8" }}>{k.icon} {k.label}</p>
                  </div>
                </div>
              ))}
              {/* 3 Dimensões — Scorecard ao vivo */}
              <div className="relative rounded-2xl overflow-hidden" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, #EC4899, #F59E0B, #06B6D4)" }} />
                <div className="p-3.5">
                  <p className="text-[10px] uppercase tracking-[0.12em] font-bold text-center mb-2" style={{ color: "#94A3B8" }}>📊 3 Dimensões</p>
                  {[
                    { label: "Humanização", value: avgHumanizacao, color: "#EC4899" },
                    { label: "Eficácia", value: avgEficacia, color: "#F59E0B" },
                    { label: "Técnica", value: avgTecnica, color: "#06B6D4" },
                  ].map(d => (
                    <div key={d.label} className="flex items-center gap-2 py-1">
                      <span className="text-xs w-16 shrink-0" style={{ color: d.color }}>{d.label}</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${d.value}%`, background: d.color }} />
                      </div>
                      <span className="text-lg font-extrabold tabular-nums w-8 text-right" style={{ color: d.color }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Conversion gauge */}
              <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="relative w-18 h-18 mx-auto" style={{ width: 72, height: 72 }}>
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke={sentimentColor(conversionRate)}
                      strokeWidth="3" strokeDasharray={`${conversionRate * 0.94} 100`} strokeLinecap="round" className="transition-all duration-500"
                      style={{ filter: `drop-shadow(0 0 4px ${sentimentColor(conversionRate)})` }} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[16px] font-extrabold" style={{ color: "#F1F5F9" }}>{conversionRate}%</span>
                </div>
                <p className="text-[11px] uppercase tracking-[0.12em] mt-1.5" style={{ color: "#94A3B8" }}>Conversão</p>
              </div>
              {/* Feed */}
              <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[10px] uppercase tracking-[0.12em] font-bold px-4 py-2.5" style={{ color: "#94A3B8", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>Feed ao vivo</p>
                <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                  {events.map(e => (
                    <div key={e.id} className="flex items-start gap-2.5 px-4 py-2 animate-in slide-in-from-top-1 duration-200" style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: e.color, boxShadow: `0 0 4px ${e.color}40` }} />
                      <div>
                        <p className="text-xs" style={{ color: "#E2E8F0" }}>{e.text}</p>
                        <p className="text-[11px]" style={{ color: "#94A3B8" }}>{e.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Observations Panel */}
              <SimulatorObservationsPanel
                selectedMessage={observationSelectedMsg}
                onClearSelectedMessage={() => setObservationSelectedMsg(null)}
                className="min-h-[280px]"
              />
            </div>
          )}
        </div>
      )}

      {/* Report: Números */}
      {phase === "report" && !running && reportTab === "numeros" && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className={cn("grid gap-3", isMobile ? "grid-cols-2" : "grid-cols-4 md:grid-cols-8")}>
            {[
              { label: "Leads", value: leads.length, color: "#3B82F6" },
              { label: "Fechados", value: closedLeads.length, color: "#10B981" },
              { label: "Perdidos", value: lostLeads.length, color: "#EF4444" },
              { label: "Receita", value: `R$${Math.round(totalReceita / 1000)}k`, color: "#EAB308" },
              { label: "Conversão", value: `${conversionRate}%`, color: conversionRate >= 50 ? "#10B981" : "#F59E0B" },
              { label: "Ticket Médio", value: `R$${Math.round(ticketMedio / 1000)}k`, color: "#8B5CF6" },
              { label: "Objeções", value: `${totalContornadas}/${totalObjecoes}`, color: "#F59E0B" },
              { label: "Sentimento", value: avgSentimento, color: sentimentColor(avgSentimento) },
            ].map(k => (
              <div key={k.label} className="relative rounded-2xl overflow-hidden" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${k.color}, transparent)` }} />
                <div className="p-3 text-center">
                  <p className="text-[18px] font-extrabold tabular-nums" style={{ color: k.color }}>{k.value}</p>
                  <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: "#94A3B8" }}>{k.label}</p>
                </div>
              </div>
            ))}
          </div>
          {/* By profile */}
          <div className="rounded-2xl p-5" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] uppercase tracking-[0.1em] font-bold mb-4" style={{ color: "#94A3B8" }}>Desempenho por Perfil Psicológico</p>
            {PERFIS_INTELIGENTES.map(p => {
              const pLeads = leads.filter(l => l.perfil.tipo === p.tipo);
              const pClosed = pLeads.filter(l => l.status === "fechou");
              const rate = pLeads.length > 0 ? Math.round((pClosed.length / pLeads.length) * 100) : 0;
              const avgS = pLeads.length > 0 ? Math.round(pLeads.reduce((s, l) => s + l.sentimentoScore, 0) / pLeads.length) : 0;
              if (pLeads.length === 0) return null;
              return (
                <div key={p.tipo} className={cn("py-2.5", isMobile ? "flex flex-col gap-1" : "flex items-center gap-3")} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{p.emoji}</span>
                    <span className="text-sm font-bold" style={{ color: p.cor }}>{p.label}</span>
                    <span className="text-[11px] ml-auto" style={{ color: "#94A3B8" }}>{pLeads.length} leads</span>
                    <span className="text-xs font-semibold" style={{ color: "#10B981" }}>{pClosed.length}✓</span>
                    <span className="text-xs" style={{ color: sentimentColor(avgS) }}>♥{avgS}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${rate}%`, background: `linear-gradient(90deg, ${rate >= 50 ? "#10B981" : rate >= 30 ? "#F59E0B" : "#EF4444"}, ${rate >= 50 ? "#06D6A0" : rate >= 30 ? "#FBBF24" : "#F87171"})` }} />
                    </div>
                    <span className="text-lg font-extrabold tabular-nums w-12 text-right" style={{ color: rate >= 50 ? "#10B981" : rate >= 30 ? "#F59E0B" : "#EF4444" }}>{rate}%</span>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Losses by stage */}
          {lostLeads.length > 0 && (
            <div className="rounded-2xl p-5" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[10px] uppercase tracking-[0.1em] font-bold mb-4" style={{ color: "#EF4444" }}>Perdas Motivadas por IA</p>
              {lostLeads.slice(0, 10).map(l => (
                <div key={l.id} className="flex items-start gap-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <span className="text-sm">{l.perfil.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: "#E2E8F0" }}>{l.nome}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444" }}>{l.etapaPerda}</span>
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: "#94A3B8" }}>"{l.motivoPerda?.slice(0, 120)}"</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Report: Debrief */}
      {phase === "report" && !running && reportTab === "debrief" && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {debriefLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#8B5CF6" }} />
              <p className="text-[11px]" style={{ color: "#94A3B8" }}>NATH.AI analisando simulação com leads inteligentes...</p>
            </div>
          )}
          {!debriefLoading && !debrief && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <AlertTriangle className="w-8 h-8" style={{ color: "#F59E0B" }} />
              <p className="text-[11px]" style={{ color: "#94A3B8" }}>O debrief não foi gerado. Clique abaixo para tentar novamente.</p>
              <button onClick={generateDebrief} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.03]"
                style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.15))", border: "1px solid rgba(139,92,246,0.25)", color: "#8B5CF6" }}>
                <Brain className="w-4 h-4" /> Gerar Debrief IA
              </button>
            </div>
          )}
          {debrief && (
            <>
              {/* Header */}
              <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: "#0D1220", border: "1px solid rgba(30,41,59,0.5)" }}>
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${sentimentColor(debrief.scoreGeral)}, transparent)` }} />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Brain className="w-5 h-5" style={{ color: "#8B5CF6" }} />
                    <div>
                      <p className="text-sm font-bold" style={{ color: "#F1F5F9" }}>Debrief da Simulação</p>
                      <p className="text-[11px]" style={{ color: "#94A3B8" }}>{new Date().toLocaleDateString("pt-BR")} · {leads.length} leads · {closedLeads.length} fechados</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={generateDebrief} className="text-xs px-4 py-2 rounded-xl font-semibold transition-all hover:scale-[1.02]"
                      style={{ border: "1px solid rgba(255,255,255,0.06)", color: "#94A3B8", background: "rgba(255,255,255,0.02)" }}>
                      <Loader2 className={cn("w-3 h-3 inline mr-1.5", debriefLoading && "animate-spin")} /> Reanalisar
                    </button>
                    {debrief.melhorias.filter(m => m.status === "pending").length > 0 && (
                      <button onClick={approveAll} className="text-sm px-4 py-2 rounded-xl font-bold transition-all hover:scale-105"
                        style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.15))", color: "#10B981", border: "1px solid rgba(16,185,129,0.25)" }}>
                        Aprovar todas ({debrief.melhorias.filter(m => m.status === "pending").length})
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Score + 3 Dimensões + Summary */}
              <div className={cn(isMobile ? "flex flex-col gap-3" : "flex gap-4")}>
                <div className="rounded-2xl p-6 text-center relative overflow-hidden" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)", minWidth: 180 }}>
                  <div className="relative w-[72px] h-[72px] mx-auto">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15" fill="none" stroke={sentimentColor(debrief.scoreGeral)}
                        strokeWidth="3" strokeDasharray={`${debrief.scoreGeral * 0.94} 100`} strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 6px ${sentimentColor(debrief.scoreGeral)})` }} />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[22px] font-extrabold" style={{ color: sentimentColor(debrief.scoreGeral) }}>{debrief.scoreGeral}</span>
                  </div>
                  <p className="text-[11px] uppercase tracking-[0.12em] mt-2" style={{ color: "#94A3B8" }}>Score Geral</p>
                  {debrief.dimensoes && (
                    <div className="mt-4 space-y-2">
                      {[
                        { label: "Humanização", score: debrief.dimensoes.humanizacao.score, color: "#EC4899" },
                        { label: "Eficácia", score: debrief.dimensoes.eficaciaComercial.score, color: "#F59E0B" },
                        { label: "Técnica", score: debrief.dimensoes.qualidadeTecnica.score, color: "#06B6D4" },
                      ].map(d => (
                        <div key={d.label}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs" style={{ color: d.color }}>{d.label}</span>
                            <span className="text-lg font-extrabold tabular-nums" style={{ color: d.color }}>{d.score}</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${d.score}%`, background: d.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="rounded-2xl p-4" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-xs leading-[1.7]" style={{ color: "#E2E8F0" }}>{debrief.resumoExecutivo}</p>
                  </div>
                  {debrief.fraseNathAI && (
                    <div className="rounded-2xl p-4 relative overflow-hidden" style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.1)" }}>
                      <p className="text-xs italic" style={{ color: "#10B981" }}>"{debrief.fraseNathAI}"</p>
                      <p className="text-sm mt-1.5 font-bold" style={{ color: "#94A3B8" }}>— NATH.AI</p>
                    </div>
                  )}
                  {debrief.dimensoes && (
                    <div className="rounded-2xl p-4" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="text-[10px] uppercase tracking-[0.1em] font-bold mb-3" style={{ color: "#8B5CF6" }}>📋 12 Critérios de Excelência</p>
                      {([
                        { key: "humanizacao" as const, label: "Humanização", color: "#EC4899", criterioIds: ["rapport", "personalizacao", "tomVoz", "surpresa"] },
                        { key: "eficaciaComercial" as const, label: "Eficácia Comercial", color: "#F59E0B", criterioIds: ["identificacaoPerfil", "progressaoFunil", "manejoObjecoes", "antecipacao"] },
                        { key: "qualidadeTecnica" as const, label: "Qualidade Técnica", color: "#06B6D4", criterioIds: ["clarezaEscrita", "conhecimentoProduto", "coerencia", "timing"] },
                      ]).map(dim => {
                        const dimData = debrief.dimensoes![dim.key];
                        return (
                          <div key={dim.key} className="mb-3 last:mb-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ background: dim.color }} />
                              <span className="text-sm font-bold" style={{ color: dim.color }}>{dim.label}</span>
                              <span className="text-sm font-extrabold ml-auto" style={{ color: dim.color }}>{dimData.score}</span>
                            </div>
                            <div className={cn("gap-x-4 gap-y-1 pl-4", isMobile ? "grid grid-cols-1" : "grid grid-cols-2")}>
                              {dim.criterioIds.map(cId => {
                                const criterio = dimData.criterios[cId];
                                const nome = CRITERIOS_AVALIACAO.find(c => c.id === cId)?.nome || cId;
                                if (!criterio) return (
                                  <div key={cId} className="flex items-center justify-between">
                                    <span className="text-[11px]" style={{ color: "#94A3B8" }}>{nome}</span>
                                    <span className="text-[11px]" style={{ color: "#94A3B8" }}>—</span>
                                  </div>
                                );
                                const nivelInfo = getNivel(criterio.score);
                                return (
                                  <div key={cId} className="flex items-center justify-between group" title={criterio.evidencia}>
                                    <span className="text-[11px]" style={{ color: "#94A3B8" }}>{nome}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ background: `${nivelInfo.cor}10`, color: nivelInfo.cor }}>{nivelInfo.nivel}</span>
                                      <span className="text-sm font-bold tabular-nums" style={{ color: nivelInfo.cor }}>{criterio.score}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Diagnóstico da Sessão */}
              {debrief.diagnosticoSessao && (
                <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(139,92,246,0.15)" }}>
                  <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, transparent, #8B5CF6, transparent)" }} />
                  <p className="text-[10px] uppercase tracking-[0.1em] font-bold mb-3" style={{ color: "#8B5CF6" }}>🔬 Diagnóstico Panorâmico da Sessão</p>
                  <p className="text-xs leading-[1.8]" style={{ color: "#E2E8F0" }}>{debrief.diagnosticoSessao}</p>
                </div>
              )}

              {/* Análise Individual de CADA Lead */}
              {debrief.analiseIndividual && debrief.analiseIndividual.length > 0 && (
                <div className="rounded-2xl p-5" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-[10px] uppercase tracking-[0.1em] font-bold mb-4" style={{ color: "#06B6D4" }}>👤 Análise Individual por Lead ({debrief.analiseIndividual.length})</p>
                  <div className={cn("gap-3", isMobile ? "flex flex-col" : "grid grid-cols-2")}>
                    {debrief.analiseIndividual.map((a, i) => {
                      const statusColor = a.status === "fechou" ? "#10B981" : a.status === "perdeu" ? "#EF4444" : "#F59E0B";
                      const statusIcon = a.status === "fechou" ? "✅" : a.status === "perdeu" ? "❌" : "⏳";
                      return (
                        <div key={`individual-${i}`} className="rounded-xl p-4 transition-all hover:brightness-110" style={{ background: "rgba(255,255,255,0.015)", border: `1px solid ${statusColor}20` }}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs">{statusIcon}</span>
                              <span className="text-sm font-bold" style={{ color: "#F1F5F9" }}>{a.leadNome}</span>
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${statusColor}15`, color: statusColor }}>{a.perfil}</span>
                            </div>
                            <span className="text-[18px] font-extrabold tabular-nums" style={{ color: sentimentColor(a.score) }}>{a.score}</span>
                          </div>
                          <div className="flex gap-3 mb-2">
                            {[
                              { label: "H", val: a.humanizacao, color: "#EC4899" },
                              { label: "E", val: a.eficacia, color: "#F59E0B" },
                              { label: "T", val: a.tecnica, color: "#06B6D4" },
                            ].map(d => (
                              <div key={d.label} className="flex items-center gap-1">
                                <span className="text-[11px] font-bold" style={{ color: d.color }}>{d.label}</span>
                                <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                                  <div className="h-full rounded-full" style={{ width: `${d.val}%`, background: d.color }} />
                                </div>
                                <span className="text-[11px] tabular-nums font-semibold" style={{ color: d.color }}>{d.val}</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-[13px] leading-relaxed mb-1.5" style={{ color: "#CBD5E1" }}>{a.diagnostico}</p>
                          {a.destino && <p className="text-[11px]" style={{ color: "#94A3B8" }}>📍 {a.destino} · 🤖 {a.agenteResponsavel}</p>}
                          {a.falhasCriticas.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {a.falhasCriticas.slice(0, 2).map((f, fi) => (
                                <span key={fi} className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444" }}>⚠ {f.slice(0, 60)}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pontos Fortes */}
              {debrief.pontosFortes.length > 0 && (
                <div className="rounded-2xl p-5" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-[10px] uppercase tracking-[0.1em] font-bold mb-3" style={{ color: "#10B981" }}>✅ Pontos Fortes</p>
                  {debrief.pontosFortes.slice(0, 4).map((p, i) => (
                    <div key={`forte-${i}`} className="flex items-start gap-2.5 py-1.5">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#10B981" }} />
                      <p className="text-xs leading-relaxed" style={{ color: "#E2E8F0" }}>{p}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* === MELHORIAS — O CORAÇÃO DO DEBRIEF === */}
              <div className="rounded-2xl p-5" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <p className="text-[10px] uppercase tracking-[0.1em] font-bold" style={{ color: "#F59E0B" }}>🔧 Melhorias Sugeridas</p>
                    <div className="flex gap-2">
                      {Object.entries(TIPO_COLORS).map(([key, val]) => {
                        const count = debrief.melhorias.filter(m => m.tipo === key).length;
                        if (count === 0) return null;
                        return <span key={key} className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: val.bg, color: val.color }}>{val.icon} {val.label} ({count})</span>;
                      })}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {debrief.melhorias.map(m => {
                    const tipoInfo = TIPO_COLORS[m.tipo] || TIPO_COLORS.instrucao_prompt;
                    const isAnalyzing = m.status === "analyzing";
                    const isApproved = m.status === "approved";
                    const isRejected = m.status === "rejected";
                    const isPending = m.status === "pending";
                    const hasDeepAnalysis = !!m.deepAnalysis;

                    const isExpanded = expandedMelhoriaId === m.id;

                    return (
                      <div key={m.id} className="rounded-xl overflow-hidden transition-all duration-300" style={{
                        border: `1px solid ${isApproved ? "rgba(16,185,129,0.25)" : isRejected ? "rgba(239,68,68,0.15)" : isAnalyzing ? "rgba(139,92,246,0.25)" : isExpanded ? "rgba(245,158,11,0.3)" : "rgba(245,158,11,0.15)"}`,
                        opacity: isRejected ? 0.5 : 1,
                      }}>
                        {/* Card header bar */}
                        <div className="h-[2px]" style={{ background: isApproved ? "#10B981" : isRejected ? "#EF4444" : isAnalyzing ? "#8B5CF6" : "#F59E0B" }} />

                        {/* Clickable header */}
                        <div
                          className="p-4 cursor-pointer transition-colors hover:brightness-110"
                          style={{ background: isApproved ? "rgba(16,185,129,0.03)" : isExpanded ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.015)" }}
                          onClick={() => setExpandedMelhoriaId(isExpanded ? null : m.id)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <p className="text-sm font-bold" style={{ color: "#F1F5F9" }}>{m.titulo}</p>
                                <span className="text-sm font-bold px-2 py-0.5 rounded-full" style={{ background: tipoInfo.bg, color: tipoInfo.color }}>
                                  {tipoInfo.icon} {tipoInfo.label}
                                </span>
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                                  style={{ background: m.prioridade === "alta" ? "rgba(239,68,68,0.08)" : m.prioridade === "media" ? "rgba(245,158,11,0.08)" : "rgba(59,130,246,0.08)", color: m.prioridade === "alta" ? "#EF4444" : m.prioridade === "media" ? "#F59E0B" : "#3B82F6" }}>{m.prioridade}</span>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.08)", color: "#8B5CF6" }}>{m.agente}</span>
                              </div>
                              <p className={cn("text-[11px] leading-relaxed", !isExpanded && "line-clamp-1")} style={{ color: "#94A3B8" }}>{m.desc}</p>
                              {!isExpanded && (
                                <p className="text-xs mt-1" style={{ color: "#10B981" }}>📈 Impacto: {m.impacto}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isApproved && <CheckCircle2 className="w-5 h-5" style={{ color: "#10B981" }} />}
                              {isRejected && <XCircle className="w-5 h-5" style={{ color: "#EF4444" }} />}
                              {isAnalyzing && <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#8B5CF6" }} />}
                              <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isExpanded && "rotate-180")} style={{ color: "#94A3B8" }} />
                            </div>
                          </div>
                        </div>

                        {/* Expanded detail panel */}
                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300" style={{ background: "rgba(255,255,255,0.01)" }}>
                            <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

                            {/* Full description */}
                            <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                              <p className="text-[10px] uppercase font-bold mb-1.5" style={{ color: "#94A3B8" }}>Descrição Completa</p>
                              <p className="text-xs leading-[1.8]" style={{ color: "#E2E8F0" }}>{m.desc}</p>
                              <p className="text-xs mt-2" style={{ color: "#10B981" }}>📈 Impacto estimado: {m.impacto}</p>
                            </div>

                            {/* Approved state */}
                            {isApproved && (
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.1)" }}>
                                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#10B981" }} />
                                <span className="text-xs font-semibold" style={{ color: "#10B981" }}>Implementada em {tipoInfo.label} → {m.agente}</span>
                              </div>
                            )}

                            {/* Deep analysis content if available */}
                            {hasDeepAnalysis && m.deepAnalysis && (
                              <>
                                {/* Recommendation + Confidence */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="rounded-xl p-3 text-center" style={{
                                    background: m.deepAnalysis.recomendacao === "APROVAR" ? "rgba(16,185,129,0.06)" : m.deepAnalysis.recomendacao === "REJEITAR" ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.06)",
                                    border: `1px solid ${m.deepAnalysis.recomendacao === "APROVAR" ? "rgba(16,185,129,0.15)" : m.deepAnalysis.recomendacao === "REJEITAR" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)"}`,
                                  }}>
                                    <p className="text-[16px] font-extrabold" style={{
                                      color: m.deepAnalysis.recomendacao === "APROVAR" ? "#10B981" : m.deepAnalysis.recomendacao === "REJEITAR" ? "#EF4444" : "#F59E0B"
                                    }}>{m.deepAnalysis.recomendacao}</p>
                                    <p className="text-[11px] uppercase" style={{ color: "#94A3B8" }}>Recomendação</p>
                                  </div>
                                  <div className="rounded-xl p-3 text-center" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}>
                                    <p className="text-[16px] font-extrabold" style={{ color: "#8B5CF6" }}>{m.deepAnalysis.confianca}%</p>
                                    <p className="text-[11px] uppercase" style={{ color: "#94A3B8" }}>Confiança</p>
                                  </div>
                                </div>

                                {/* Full analysis */}
                                <div className="rounded-xl p-4" style={{ background: "#111827", maxHeight: 200, overflow: "auto" }}>
                                  <p className="text-[10px] uppercase font-bold mb-1" style={{ color: "#94A3B8" }}>Análise Completa</p>
                                  <p className="text-xs leading-[1.8]" style={{ color: "#D1D5DB" }}>{m.deepAnalysis.analiseCompleta}</p>
                                </div>

                                {/* Reasoning chain */}
                                {m.deepAnalysis.linhaRaciocinio?.length > 0 && (
                                  <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                                    <p className="text-[10px] uppercase font-bold mb-2" style={{ color: "#94A3B8" }}>Linha de Raciocínio</p>
                                    <div className="flex items-start gap-2 flex-wrap">
                                      {m.deepAnalysis.linhaRaciocinio.map((step, i) => (
                                        <div key={`step-${i}`} className="flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{
                                            background: `hsl(${260 + i * 30}, 70%, 50%)`, color: "#fff"
                                          }}>{i + 1}</div>
                                          <p className="text-xs" style={{ color: "#E2E8F0" }}>{step}</p>
                                          {i < m.deepAnalysis!.linhaRaciocinio.length - 1 && <span className="text-[11px]" style={{ color: "#94A3B8" }}>→</span>}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Impact 4 dimensions */}
                                {m.deepAnalysis.impactoNumeros && (
                                  <div className="grid grid-cols-4 gap-2">
                                    {[
                                      { key: "conversao", label: "Conversão", icon: "📊", color: "#3B82F6" },
                                      { key: "receita", label: "Receita", icon: "💰", color: "#10B981" },
                                      { key: "satisfacao", label: "Satisfação", icon: "💗", color: "#EC4899" },
                                      { key: "eficiencia", label: "Eficiência", icon: "⚡", color: "#F59E0B" },
                                    ].map(dim => (
                                      <div key={dim.key} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                                        <p className="text-[10px] uppercase font-bold" style={{ color: dim.color }}>{dim.icon} {dim.label}</p>
                                        <p className="text-xs mt-1" style={{ color: "#E2E8F0" }}>{(m.deepAnalysis!.impactoNumeros as any)[dim.key]}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Psychology */}
                                {m.deepAnalysis.psicologiaCliente && (
                                  <div className="rounded-xl p-4" style={{ background: "rgba(236,72,153,0.04)", border: "1px solid rgba(236,72,153,0.1)" }}>
                                    <p className="text-[10px] uppercase font-bold mb-1" style={{ color: "#EC4899" }}>🧠 Psicologia do Cliente</p>
                                    <p className="text-xs leading-relaxed" style={{ color: "#E2E8F0" }}>{m.deepAnalysis.psicologiaCliente}</p>
                                  </div>
                                )}

                                {/* Risks */}
                                {m.deepAnalysis.riscosNaoImplementar && (
                                  <div className="rounded-xl p-4" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)" }}>
                                    <p className="text-[10px] uppercase font-bold mb-1" style={{ color: "#EF4444" }}>⚠️ Riscos de não implementar</p>
                                    <p className="text-xs leading-relaxed" style={{ color: "#E2E8F0" }}>{m.deepAnalysis.riscosNaoImplementar}</p>
                                  </div>
                                )}
                              </>
                            )}

                            {/* Conteúdo sugerido */}
                            {m.conteudoSugerido && (
                              <div>
                                <p className="text-[10px] uppercase font-bold mb-1.5" style={{ color: "#94A3B8" }}>
                                  <Edit3 className="w-3 h-3 inline mr-1" />Conteúdo sugerido {isPending ? "(editável)" : ""}
                                </p>
                                {isPending ? (
                                  <textarea
                                    value={m.editedContent ?? m.conteudoSugerido}
                                    onChange={e => updateImprovementContent(m.id, e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    className="w-full rounded-xl text-xs p-4 resize-y"
                                    rows={4}
                                    style={{ background: "#111827", color: "#E2E8F0", border: "1px solid rgba(255,255,255,0.08)", outline: "none" }}
                                  />
                                ) : (
                                  <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
                                    <p className="text-xs leading-[1.8]" style={{ color: "#E2E8F0" }}>{m.editedContent || m.conteudoSugerido}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Action buttons for pending */}
                            {isPending && (
                              <div className="flex gap-3" onClick={e => e.stopPropagation()}>
                                {!hasDeepAnalysis && (
                                  <button onClick={() => runDeepAnalysis(m.id)}
                                    className="px-5 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
                                    style={{ color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.05)" }}>
                                    <Search className="w-4 h-4 inline mr-1.5" />Análise Profunda
                                  </button>
                                )}
                                <button onClick={() => handleImprovement(m.id, "approved")}
                                  className="flex-1 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
                                  style={{ background: "linear-gradient(135deg, #10B981, #06B6D4)", color: "#000" }}>
                                  <CheckCircle2 className="w-4 h-4 inline mr-1.5" />Aprovar e implementar
                                </button>
                                <button onClick={() => handleImprovement(m.id, "rejected")}
                                  className="px-6 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
                                  style={{ color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)", background: "transparent" }}>
                                  Rejeitar
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lacunas + Insights side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {debrief.lacunasConhecimento.length > 0 && (
                  <div className="rounded-2xl p-5" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-[10px] uppercase tracking-[0.1em] font-bold mb-3" style={{ color: "#F59E0B" }}>
                      <BookOpen className="w-3.5 h-3.5 inline mr-1.5" />Lacunas de Conhecimento
                    </p>
                    {debrief.lacunasConhecimento.map((l, i) => (
                      <div key={`lacuna-${i}`} className="flex items-start gap-2.5 py-2 group" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#F59E0B" }} />
                        <p className="text-xs flex-1" style={{ color: "#E2E8F0" }}>{l}</p>
                        <button onClick={() => convertLacunaToKB(l)}
                          className="text-xs px-2 py-1 rounded-lg font-semibold opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          style={{ background: "rgba(59,130,246,0.08)", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.15)" }}>
                          📚 Criar KB
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {debrief.insightsCliente.length > 0 && (
                  <div className="rounded-2xl p-5" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-[10px] uppercase tracking-[0.1em] font-bold mb-3" style={{ color: "#06B6D4" }}>
                      <Lightbulb className="w-3.5 h-3.5 inline mr-1.5" />Insights de Comportamento
                    </p>
                    {debrief.insightsCliente.map((ins, i) => (
                      <div key={`insight-${i}`} className="flex items-start gap-2.5 py-2 group" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#06B6D4" }} />
                        <p className="text-xs flex-1" style={{ color: "#E2E8F0" }}>{ins}</p>
                        <button onClick={() => convertInsightToImprovement(ins)}
                          className="text-xs px-2 py-1 rounded-lg font-semibold opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          style={{ background: "rgba(245,158,11,0.08)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.15)" }}>
                          🔧 Usar como melhoria
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Simulation History */}
              {simHistory.length > 1 && (
                <div className="rounded-2xl p-5" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-[10px] uppercase tracking-[0.1em] font-bold mb-4" style={{ color: "#94A3B8" }}>
                    <TrendingUp className="w-3.5 h-3.5 inline mr-1.5" />Histórico de Simulações
                  </p>
                  <div className="flex items-end gap-2" style={{ height: 80 }}>
                    {simHistory.slice(0, 10).reverse().map((h, i) => {
                      const maxScore = Math.max(...simHistory.slice(0, 10).map(s => s.scoreGeral), 1);
                      const height = (h.scoreGeral / maxScore) * 100;
                      return (
                        <div key={h.id} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded-lg whitespace-nowrap z-10"
                            style={{ background: "#1E293B", color: "#E2E8F0", border: "1px solid rgba(255,255,255,0.1)" }}>
                            {new Date(h.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} · {h.conversao}% conv · {h.melhorias_aprovadas?.length || 0} mel.
                          </div>
                          <div className="w-full rounded-t transition-all duration-300 hover:opacity-80" style={{
                            height: `${height}%`,
                            background: `linear-gradient(180deg, ${sentimentColor(h.scoreGeral)}, ${sentimentColor(h.scoreGeral)}40)`,
                            minHeight: 4,
                          }} />
                          <span className="text-sm font-bold tabular-nums" style={{ color: sentimentColor(h.scoreGeral) }}>{h.scoreGeral}</span>
                        </div>
                      );
                    })}
                  </div>
                  {simHistory.length >= 2 && (
                    <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <TrendingUp className="w-3 h-3" style={{ color: simHistory[0].scoreGeral >= simHistory[1].scoreGeral ? "#10B981" : "#EF4444" }} />
                      <p className="text-[11px]" style={{ color: "#94A3B8" }}>
                        Delta: <span style={{ color: simHistory[0].scoreGeral >= simHistory[1].scoreGeral ? "#10B981" : "#EF4444", fontWeight: 700 }}>
                          {simHistory[0].scoreGeral >= simHistory[1].scoreGeral ? "+" : ""}{simHistory[0].scoreGeral - simHistory[1].scoreGeral} pontos
                        </span> vs simulação anterior
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
