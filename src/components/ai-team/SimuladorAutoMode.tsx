import { useState, useCallback, useRef, useEffect } from "react";
import { Play, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp, Check, X, Square, BarChart3, Zap, User, MessageSquare, Lightbulb, AlertTriangle, Brain, Heart, Shield, Clock, TrendingUp, Send, MapPin, Wallet, Radio, Users, BookOpen, Search, FileText, Workflow, Edit3 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { AGENTS_V4, SQUADS } from "@/components/ai-team/agentsV4Data";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  type LeadInteligente, type MensagemLead, type PerfilPsicologico,
  PERFIS_INTELIGENTES, DESTINOS_LEAD, BUDGETS_LEAD, CANAIS_LEAD, GRUPOS_LEAD, ETAPAS_FUNIL,
  buildLeadPersona, buildConversaContext, buildFirstMessagePrompt, buildObjecaoPrompt,
  buildAvaliacaoPrompt, buildMensagemPerdaPrompt,
  gerarLeadInteligente, deveInserirObjecao, atualizarEstadoEmocional, devePerdeLead,
} from "./intelligentLeads";
import {
  getAgentPesos, getNivel, buildLiveEvalPrompt, buildDebriefV2Prompt,
  SYSTEM_DEBRIEF_V2, CRITERIOS_AVALIACAO,
  type DimensaoScore, type CriterioScore,
  saveHistoricoAvaliacao, loadHistoricoAvaliacoes,
} from "./evaluationFramework";

// ===== API =====
async function callAgent(sysPrompt: string, history: { role: string; content: string }[]): Promise<string> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`;
  const lastMsg = history[history.length - 1]?.content || "";
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
    body: JSON.stringify({ question: lastMsg, agentName: "SIMULADOR", agentRole: sysPrompt }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  let text = "";
  if (resp.body) {
    const reader = resp.body.getReader(); const decoder = new TextDecoder(); let buf = "";
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      buf += decoder.decode(value, { stream: true }); let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim(); if (json === "[DONE]") break;
        try { const p = JSON.parse(json); const c = p.choices?.[0]?.delta?.content; if (c) text += c; } catch {}
      }
    }
  }
  return text;
}

// Generate lead message using AI with full persona context
async function generateLeadMsg(lead: LeadInteligente, ultimaMsgAgente: string, isFirst: boolean): Promise<string> {
  const sysPrompt = buildLeadPersona(lead);
  const userPrompt = isFirst
    ? buildFirstMessagePrompt(lead)
    : buildConversaContext(lead.mensagens, ultimaMsgAgente, lead.etapaAtual, lead);
  return callAgent(sysPrompt, [{ role: "user", content: userPrompt }]);
}

// Generate contextual objection
async function gerarObjecao(lead: LeadInteligente, ultimaMsgAgente: string): Promise<string> {
  const prompt = buildObjecaoPrompt(lead, lead.etapaAtual, ultimaMsgAgente);
  return callAgent(buildLeadPersona(lead), [{ role: "user", content: prompt }]);
}

// Evaluate agent response quality
async function avaliarRespostaAgente(resposta: string, lead: LeadInteligente): Promise<{ nota: number; reacao: string; sentimento: number; motivo: string }> {
  try {
    const prompt = buildAvaliacaoPrompt(resposta, lead, lead.etapaAtual);
    const result = await callAgent("Voce avalia qualidade de atendimento. Retorne SOMENTE JSON válido sem markdown.", [{ role: "user", content: prompt }]);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      return {
        nota: Math.min(100, Math.max(0, data.nota || 50)),
        reacao: data.reacaoEmocional || "neutro",
        sentimento: Math.min(100, Math.max(0, data.sentimentoScore || 50)),
        motivo: data.motivoNota || "",
      };
    }
  } catch {}
  return { nota: 50, reacao: "neutro", sentimento: 50, motivo: "" };
}

// Generate motivated loss message
async function gerarMensagemPerda(lead: LeadInteligente): Promise<string> {
  const prompt = buildMensagemPerdaPrompt(lead, lead.etapaAtual);
  return callAgent(buildLeadPersona(lead), [{ role: "user", content: prompt }]);
}

function buildAgentSysPrompt(agent: typeof AGENTS_V4[0], hasNext: boolean) {
  return `${agent.persona}\nVoce conversa como ${agent.name} (${agent.role}) da agencia NatLeva pelo WhatsApp.\n${hasNext ? "Quando completar objetivo, termine com [TRANSFERIR].\n" : ""}Responda APENAS a ultima mensagem. Breve (1-3 frases).`;
}

const SPEED_OPTIONS = [
  { id: "lenta", label: "Lenta", delay: 5000 },
  { id: "normal", label: "Normal", delay: 2500 },
  { id: "rapida", label: "Rápida", delay: 500 },
  { id: "instant", label: "Instantâneo", delay: 0 },
];

const getAgentColor = (agent: typeof AGENTS_V4[0]) => {
  const c: Record<string, string> = { orquestracao: "#10B981", comercial: "#F59E0B", atendimento: "#3B82F6", financeiro: "#8B5CF6", operacional: "#06B6D4", demanda: "#EF4444", retencao: "#EC4899" };
  return c[agent.squadId] || "#10B981";
};

type Phase = "config" | "running" | "report";
type ReportTab = "numeros" | "conversas" | "debrief";
type ImprovementType = "conhecimento_kb" | "nova_skill" | "instrucao_prompt" | "workflow";

interface Improvement {
  id: string; titulo: string; desc: string; impacto: string; agente: string;
  prioridade: "alta" | "media" | "baixa"; status: "pending" | "analyzing" | "approved" | "rejected";
  tipo: ImprovementType; conteudoSugerido: string; fonte: string;
  deepAnalysis?: DeepAnalysis | null; editedContent?: string; rejectReason?: string;
}
interface DeepAnalysis {
  analiseCompleta: string; linhaRaciocinio: string[];
  impactoNumeros: { conversao: string; receita: string; satisfacao: string; eficiencia: string };
  psicologiaCliente: string; riscosNaoImplementar: string;
  recomendacao: string; confianca: number;
}
interface DebriefData {
  scoreGeral: number; resumoExecutivo: string; fraseNathAI: string;
  pontosFortes: string[]; melhorias: Improvement[]; lacunasConhecimento: string[]; insightsCliente: string[];
}
interface SimHistoryEntry {
  id: string; date: string; scoreGeral: number; totalLeads: number;
  fechados: number; perdidos: number; conversao: number; melhorias_aprovadas: string[];
}

const TIPO_COLORS: Record<ImprovementType, { bg: string; color: string; label: string; icon: string }> = {
  conhecimento_kb: { bg: "rgba(59,130,246,0.08)", color: "#3B82F6", label: "KB", icon: "📚" },
  nova_skill: { bg: "rgba(245,158,11,0.08)", color: "#F59E0B", label: "Skill", icon: "⚡" },
  instrucao_prompt: { bg: "rgba(139,92,246,0.08)", color: "#8B5CF6", label: "Prompt", icon: "📝" },
  workflow: { bg: "rgba(6,182,212,0.08)", color: "#06B6D4", label: "Workflow", icon: "🔄" },
};

// ===== FLYWHEEL STORAGE =====
const STORAGE_KEYS = {
  sim_history: "natleva_sim_historico",
  kb: "natleva_knowledge_base_improvements",
  skills: "natleva_skills_improvements",
  prompts: "natleva_prompt_improvements",
  workflows: "natleva_workflow_improvements",
  evolution: "natleva_evolution_timeline",
};

function loadJson(key: string) {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}
function saveJson(key: string, data: any) {
  localStorage.setItem(key, JSON.stringify(data));
}

async function implementImprovement(m: Improvement) {
  const entry = { id: m.id, titulo: m.titulo, agente: m.agente, conteudo: m.editedContent || m.conteudoSugerido, data: new Date().toISOString(), tipo: m.tipo };
  if (m.tipo === "conhecimento_kb") {
    const kb = loadJson(STORAGE_KEYS.kb);
    kb.unshift(entry);
    saveJson(STORAGE_KEYS.kb, kb);
  } else if (m.tipo === "nova_skill") {
    const skills = loadJson(STORAGE_KEYS.skills);
    skills.unshift(entry);
    saveJson(STORAGE_KEYS.skills, skills);
  } else if (m.tipo === "instrucao_prompt") {
    const prompts = loadJson(STORAGE_KEYS.prompts);
    prompts.unshift(entry);
    saveJson(STORAGE_KEYS.prompts, prompts);
  } else if (m.tipo === "workflow") {
    const wfs = loadJson(STORAGE_KEYS.workflows);
    wfs.unshift(entry);
    saveJson(STORAGE_KEYS.workflows, wfs);
  }
  // Register in Evolution timeline
  const timeline = loadJson(STORAGE_KEYS.evolution);
  timeline.unshift({
    id: "ev_" + Date.now(), tipo: m.tipo, agenteId: m.agente,
    titulo: m.titulo, antes: "Problema identificado em simulação",
    depois: (m.editedContent || m.conteudoSugerido).slice(0, 80),
    impacto: m.impacto, status: "aplicado", data: new Date().toISOString(), fonte: "debrief_simulacao",
  });
  saveJson(STORAGE_KEYS.evolution, timeline);
}

function saveSimHistory(entry: SimHistoryEntry) {
  const history = loadJson(STORAGE_KEYS.sim_history);
  history.unshift(entry);
  saveJson(STORAGE_KEYS.sim_history, history.slice(0, 20));
}

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
  // Config
  const [numLeads, setNumLeads] = useState(8);
  const [msgsPerLead, setMsgsPerLead] = useState(14);
  const [intervalSec, setIntervalSec] = useState(1);
  const [duration, setDuration] = useState(180);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [profileMode, setProfileMode] = useState<"random" | "roundrobin">("random");
  const [selectedDestinos, setSelectedDestinos] = useState<string[]>([]);
  const [selectedBudgets, setSelectedBudgets] = useState<string[]>([]);
  const [selectedCanais, setSelectedCanais] = useState<string[]>([]);
  const [selectedGrupos, setSelectedGrupos] = useState<string[]>([]);
  const [conversionOverride, setConversionOverride] = useState<number | null>(null);
  const [objectionDensity, setObjectionDensity] = useState(50);
  const [speed, setSpeed] = useState("normal");
  const [funnelMode, setFunnelMode] = useState<"full" | "comercial" | "custom">("full");
  const [customFunnelAgents, setCustomFunnelAgents] = useState<string[]>([]);
  const [enableEvaluation, setEnableEvaluation] = useState(true);
  const [enableMultiMsg, setEnableMultiMsg] = useState(true);
  const [configTab, setConfigTab] = useState<"volume" | "perfis" | "cenario" | "comportamento" | "avancado">("volume");

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

  const chatRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef(false);
  const simAtivaRef = useRef(false);
  const { toast } = useToast();

  const selectedLead = leads.find(l => l.id === selectedLeadId) || null;
  const closedLeads = leads.filter(l => l.status === "fechou");
  const lostLeads = leads.filter(l => l.status === "perdeu");
  const totalReceita = closedLeads.reduce((s, l) => s + l.ticket, 0);
  const conversionRate = leads.length > 0 ? Math.round((closedLeads.length / leads.length) * 100) : 0;
  const totalObjecoes = leads.reduce((s, l) => s + l.objecoesLancadas.length, 0);
  const totalContornadas = leads.reduce((s, l) => s + (l.status === "fechou" ? l.objecoesLancadas.length : 0), 0);
  const ticketMedio = closedLeads.length > 0 ? Math.round(totalReceita / closedLeads.length) : 0;
  const avgSentimento = leads.length > 0 ? Math.round(leads.reduce((s, l) => s + l.sentimentoScore, 0) / leads.length) : 0;

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

  // ===== SIMULATION ENGINE =====
  const runSimulation = useCallback(async () => {
    setPhase("running"); setRunning(true); setLeads([]); setEvents([]); setElapsedSeconds(0);
    setSelectedLeadId(null); setDebrief(null); abortRef.current = false; simAtivaRef.current = true;

    timerRef.current = setInterval(() => setElapsedSeconds(p => p + 1), 1000);

    const profiles = selectedProfiles.length > 0
      ? PERFIS_INTELIGENTES.filter(p => selectedProfiles.includes(p.tipo))
      : PERFIS_INTELIGENTES;
    const destinos = selectedDestinos.length > 0 ? selectedDestinos : DESTINOS_LEAD;
    const budgets = selectedBudgets.length > 0 ? selectedBudgets : BUDGETS_LEAD;
    const canais = selectedCanais.length > 0 ? selectedCanais : CANAIS_LEAD;
    const speedDelay = SPEED_OPTIONS.find(s => s.id === speed)?.delay ?? 2500;

    const funnelAgents = funnelMode === "full"
      ? AGENTS_V4.filter(a => ["comercial", "atendimento"].includes(a.squadId)).slice(0, 6)
      : funnelMode === "comercial"
        ? AGENTS_V4.filter(a => a.squadId === "comercial")
        : customFunnelAgents.map(id => AGENTS_V4.find(a => a.id === id)!).filter(Boolean);

    if (funnelAgents.length === 0) {
      toast({ title: "Selecione agentes para o funil", variant: "destructive" });
      setRunning(false); setPhase("config");
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const allLeads: LeadInteligente[] = [];

    for (let i = 0; i < numLeads; i++) {
      if (!simAtivaRef.current || abortRef.current) break;

      const perfil = profileMode === "roundrobin"
        ? profiles[i % profiles.length]
        : profiles[Math.floor(Math.random() * profiles.length)];

      const lead = gerarLeadInteligente(perfil, {
        destino: destinos[Math.floor(Math.random() * destinos.length)],
        orcamento: budgets[Math.floor(Math.random() * budgets.length)],
        canal: canais[Math.floor(Math.random() * canais.length)],
      });

      // Apply conversion override
      if (conversionOverride !== null) {
        lead.ticket = Math.random() * 100 < conversionOverride ? (8000 + Math.floor(Math.random() * 42000)) : 0;
      }

      // Apply objection density
      lead.temObjecao = Math.random() * 100 < objectionDensity;

      allLeads.push(lead);
      setLeads([...allLeads]);
      if (i === 0) setSelectedLeadId(lead.id);

      addEvent("#3B82F6", `${lead.perfil.emoji} ${lead.nome} entrou via ${lead.origem} · ${lead.destino}`, "📥");

      try {
        // 1. Generate first client message via AI
        const firstMsg = await generateLeadMsg(lead, "", true);
        lead.mensagens.push({ role: "client", content: firstMsg, timestamp: Date.now() });
        setLeads([...allLeads]);
        addEvent(lead.perfil.cor, `${lead.nome}: "${firstMsg.slice(0, 50)}..."`, "💬");

        const stages = ETAPAS_FUNIL.map(e => e.id);
        const rounds = Math.min(Math.floor(msgsPerLead / 2), 12);
        let agentIdx = 0;
        let forceLoss = false;

        for (let r = 0; r < rounds; r++) {
          if (!simAtivaRef.current || abortRef.current || forceLoss) break;

          const agent = funnelAgents[agentIdx % funnelAgents.length];
          const hasNext = agentIdx < funnelAgents.length - 1;
          lead.etapaAtual = stages[Math.min(agentIdx, stages.length - 1)];

          // 2. Agent responds
          const agentResp = await callAgent(
            buildAgentSysPrompt(agent, hasNext),
            lead.mensagens.map(m => ({ role: m.role === "client" ? "user" : "assistant", content: m.content }))
          );
          lead.mensagens.push({ role: "agent", content: agentResp, agentName: agent.name, timestamp: Date.now() });
          setLeads([...allLeads]);

          // 3. Evaluate agent response (AI judge)
          if (enableEvaluation) {
            const avaliacao = await avaliarRespostaAgente(agentResp, lead);
            const updatedLead = atualizarEstadoEmocional(lead, avaliacao.nota, avaliacao.reacao, avaliacao.sentimento);
            Object.assign(lead, updatedLead);
            setLeads([...allLeads]);

            if (avaliacao.nota < 40) {
              addEvent("#F59E0B", `${lead.nome}: ${avaliacao.reacao} (nota ${avaliacao.nota})`, "😤");
            } else if (avaliacao.nota >= 80) {
              addEvent("#10B981", `${lead.nome}: ${avaliacao.reacao} (nota ${avaliacao.nota})`, "😊");
            }

            // Check if lead gives up
            if (devePerdeLead(lead)) {
              const lossMsg = await gerarMensagemPerda(lead);
              lead.mensagens.push({ role: "client", content: lossMsg, timestamp: Date.now() });
              lead.status = "perdeu";
              lead.resultadoFinal = "perdeu";
              lead.etapaPerda = lead.etapaAtual;
              lead.motivoPerda = lossMsg;
              setLeads([...allLeads]);
              addEvent("#EF4444", `❌ ${lead.nome} DESISTIU em ${lead.etapaAtual}: "${lossMsg.slice(0, 60)}..."`, "💔");
              forceLoss = true;
              break;
            }
          }

          // Handle transfer
          if (hasNext && agentResp.includes("[TRANSFERIR]")) {
            agentIdx++;
            const nextAgent = funnelAgents[agentIdx % funnelAgents.length];
            addEvent("#06B6D4", `${agent.name} → ${nextAgent.name}`, "🔄");
            // Reveal info on stage advance
            if (lead.informacoesPendentes.length > 0) {
              const revealed = lead.informacoesPendentes.shift()!;
              lead.informacoesReveladas.push(revealed);
            }
          }

          if (speedDelay > 0) await new Promise(r => setTimeout(r, speedDelay));
          if (r >= rounds - 1 || abortRef.current) break;

          // 4. Check for dynamic objection
          const turno = r + 1;
          if (deveInserirObjecao(lead, lead.etapaAtual, turno)) {
            const objecao = await gerarObjecao(lead, agentResp);
            lead.mensagens.push({ role: "client", content: objecao, timestamp: Date.now() });
            if (lead.objecoesPendentes.length > 0) {
              lead.objecoesLancadas.push(lead.objecoesPendentes.shift()!);
            }
            setLeads([...allLeads]);
            addEvent("#F59E0B", `⚠️ Objeção de ${lead.nome}: "${objecao.slice(0, 50)}..."`, "🛡️");

            // Agent needs to handle objection
            const objResp = await callAgent(
              buildAgentSysPrompt(agent, false),
              lead.mensagens.map(m => ({ role: m.role === "client" ? "user" : "assistant", content: m.content }))
            );
            lead.mensagens.push({ role: "agent", content: objResp, agentName: agent.name, timestamp: Date.now() });
            setLeads([...allLeads]);
            continue;
          }

          // 5. Generate contextual lead response via AI
          const clientResp = await generateLeadMsg(lead, agentResp, false);
          lead.mensagens.push({ role: "client", content: clientResp, timestamp: Date.now() });
          setLeads([...allLeads]);

          // Multi-message behavior
          if (enableMultiMsg && Math.random() < lead.probabilidadeMultiMensagem) {
            const extraMsg = await generateLeadMsg(lead, agentResp, false);
            lead.mensagens.push({ role: "client", content: extraMsg, timestamp: Date.now() });
            setLeads([...allLeads]);
            addEvent(lead.perfil.cor, `${lead.nome} enviou múltiplas msgs`, "💬💬");
          }

          if (speedDelay > 0) await new Promise(r => setTimeout(r, Math.max(100, speedDelay / 2)));
        }

        // Resolve lead
        if (!forceLoss && lead.status === "ativo") {
          const willClose = conversionOverride !== null
            ? Math.random() * 100 < conversionOverride
            : lead.ticket > 0;

          if (willClose) {
            lead.status = "fechou";
            lead.resultadoFinal = "fechou";
            lead.etapaAtual = "fechamento";
            addEvent("#EAB308", `🎉 ${lead.nome} FECHOU · R$${(lead.ticket / 1000).toFixed(0)}k · ${lead.perfil.label}`, "🏆");
          } else {
            const lossMsg = await gerarMensagemPerda(lead);
            lead.mensagens.push({ role: "client", content: lossMsg, timestamp: Date.now() });
            lead.status = "perdeu";
            lead.resultadoFinal = "perdeu";
            lead.etapaPerda = lead.etapaAtual;
            lead.motivoPerda = lossMsg;
            addEvent("#EF4444", `${lead.nome} perdido em ${lead.etapaAtual} · ${lead.perfil.label}`, "📉");
          }
          setLeads([...allLeads]);
        }
      } catch (err) {
        console.error("Lead sim error:", err);
        lead.status = "perdeu";
        lead.motivoPerda = "Erro de sistema";
        setLeads([...allLeads]);
      }

      // Delay between leads
      if (i < numLeads - 1 && speedDelay > 0 && !abortRef.current) {
        await new Promise(r => setTimeout(r, Math.max(500, intervalSec * 1000)));
      }
    }

    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    setPhase("report");
    toast({ title: "Simulação concluída!", description: `${allLeads.length} leads processados com IA dinâmica` });
  }, [numLeads, msgsPerLead, intervalSec, duration, selectedProfiles, profileMode, selectedDestinos, selectedBudgets, selectedCanais, conversionOverride, objectionDensity, speed, funnelMode, customFunnelAgents, enableEvaluation, enableMultiMsg, toast]);

  const stopSimulation = () => { simAtivaRef.current = false; abortRef.current = true; setRunning(false); if (timerRef.current) clearInterval(timerRef.current); setPhase("report"); };

  // Generate debrief
  const generateDebrief = useCallback(async () => {
    setDebriefLoading(true);
    try {
      const sampleConvos = leads.slice(0, 8).map(l => ({
        name: l.nome, profile: l.perfil.label, destino: l.destino, status: l.status,
        sentimento: l.sentimentoScore, emocao: l.estadoEmocional, motivoPerda: l.motivoPerda,
        objecoes: l.objecoesLancadas, etapaPerda: l.etapaPerda,
        msgs: l.mensagens.slice(0, 12).map(m => `${m.role}: ${m.content.slice(0, 120)}`).join("\n"),
      }));

      const pResumo = PERFIS_INTELIGENTES.map(p => {
        const pLeads = leads.filter(l => l.perfil.tipo === p.tipo);
        const pClosed = pLeads.filter(l => l.status === "fechou");
        return pLeads.length > 0 ? `${p.label}: ${pClosed.length}/${pLeads.length}` : null;
      }).filter(Boolean).join(" | ");

      const topObjs = leads.flatMap(l => l.objecoesLancadas).reduce((acc, o) => { acc[o] = (acc[o] || 0) + 1; return acc; }, {} as Record<string, number>);
      const topObjsStr = Object.entries(topObjs).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `"${k}" (${v}x)`).join(", ");

      const prompt = `Você é NATH.AI, consultora de inteligência operacional da NatLeva Viagens.
Sua missão: analisar simulações de atendimento com precisão cirúrgica.
Tom: direto, construtivo, sem rodeios. A Nathália precisa de diagnóstico acionável.
Cultura NatLeva: calorosa, próxima, humana. Nunca genérica.
Retorne SOMENTE JSON válido. Nenhum texto fora do JSON.

DADOS DA SIMULAÇÃO:
- Total de leads: ${leads.length}
- Fechados: ${closedLeads.length} (${conversionRate}%)
- Perdidos: ${lostLeads.length}
- Receita simulada: R$${(totalReceita/1000).toFixed(0)}k
- Ticket médio: R$${(ticketMedio/1000).toFixed(0)}k
- Objeções total: ${totalObjecoes}
- Objeções contornadas: ${totalContornadas} (${totalObjecoes > 0 ? Math.round(totalContornadas/totalObjecoes*100) : 0}%)

PERFORMANCE POR PERFIL: ${pResumo}
TOP 5 OBJEÇÕES: ${topObjsStr || "nenhuma"}

Perdas motivadas: ${lostLeads.slice(0, 5).map(l => `${l.perfil.label} em ${l.etapaPerda}: ${l.motivoPerda?.slice(0, 80)}`).join(" | ")}

AMOSTRA DE CONVERSAS:
${JSON.stringify(sampleConvos)}

Retorne JSON:
{
  "scoreGeral": 0-100,
  "resumoExecutivo": "2-3 frases de diagnóstico preciso",
  "fraseNathAI": "frase motivacional e específica para a Nathália",
  "pontosFortes": ["o que funcionou bem com evidência"],
  "melhorias": [{
    "titulo": "título curto e específico",
    "desc": "2-3 frases explicando o problema e a solução",
    "impacto": "impacto estimado com número",
    "agente": "nome do agente responsável",
    "prioridade": "alta|media|baixa",
    "tipo": "conhecimento_kb|nova_skill|instrucao_prompt|workflow",
    "conteudoSugerido": "TEXTO PRONTO para ser implementado no agente"
  }],
  "lacunasConhecimento": ["gap específico identificado"],
  "insightsCliente": ["padrão de comportamento detectado com dados"]
}`;

      const resp = await callAgent("Voce e NATH.AI da NatLeva. Retorne SOMENTE JSON válido sem markdown.", [{ role: "user", content: prompt }]);
      const jsonMatch = resp.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        const debriefResult: DebriefData = {
          scoreGeral: data.scoreGeral || 0,
          resumoExecutivo: data.resumoExecutivo || "",
          fraseNathAI: data.fraseNathAI || "",
          pontosFortes: data.pontosFortes || [],
          melhorias: (data.melhorias || []).map((m: any, i: number) => ({
            id: `imp-${Date.now()}-${i}`,
            titulo: m.titulo || "",
            desc: m.desc || m.descricao || "",
            impacto: m.impacto || "",
            agente: m.agente || "",
            prioridade: m.prioridade || "media",
            tipo: (m.tipo || "instrucao_prompt") as ImprovementType,
            conteudoSugerido: m.conteudoSugerido || "",
            fonte: "debrief_simulacao",
            status: "pending" as const,
            deepAnalysis: null,
            editedContent: undefined,
          })),
          lacunasConhecimento: data.lacunasConhecimento || [],
          insightsCliente: data.insightsCliente || [],
        };
        setDebrief(debriefResult);
        // Save to simulation history
        saveSimHistory({
          id: "wr_" + Date.now(),
          date: new Date().toISOString(),
          scoreGeral: debriefResult.scoreGeral,
          totalLeads: leads.length,
          fechados: closedLeads.length,
          perdidos: lostLeads.length,
          conversao: conversionRate,
          melhorias_aprovadas: [],
        });
      }
    } catch { toast({ title: "Erro ao gerar debrief", variant: "destructive" }); }
    finally { setDebriefLoading(false); }
  }, [leads, closedLeads, lostLeads, totalReceita, totalObjecoes, totalContornadas, avgSentimento, conversionRate, ticketMedio, toast]);

  useEffect(() => { if (phase === "report" && !debrief && !debriefLoading) generateDebrief(); }, [phase]);

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
      const resp = await callAgent("Voce e NATH.AI analista senior. Retorne SOMENTE JSON.", [{ role: "user", content: prompt }]);
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

  // ===== CONFIG TABS =====
  const CONFIG_TABS = [
    { id: "volume" as const, label: "Volume & Tempo", icon: BarChart3, color: "#3B82F6", summary: `${numLeads} leads · ${msgsPerLead} msgs · ${formatTime(duration)}` },
    { id: "perfis" as const, label: "Perfis", icon: User, color: "#EC4899", summary: `${selectedProfiles.length || 8} perfis ativos` },
    { id: "cenario" as const, label: "Cenário", icon: MapPin, color: "#06B6D4", summary: `${selectedDestinos.length || DESTINOS_LEAD.length} destinos` },
    { id: "comportamento" as const, label: "Funil & Velocidade", icon: Zap, color: "#8B5CF6", summary: `${SPEED_OPTIONS.find(s => s.id === speed)?.label} · ${funnelMode === "full" ? "Completo" : funnelMode === "comercial" ? "Comercial" : "Custom"}` },
    { id: "avancado" as const, label: "Motor IA", icon: Brain, color: "#F59E0B", summary: enableEvaluation ? "Avaliação ativa" : "Avaliação off" },
  ];

  // ===== RENDER: CONFIG =====
  if (phase === "config") {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-3 duration-500" style={{ maxWidth: 1100 }}>
        {/* 2-column: Tabs + Content */}
        <div className="flex gap-5" style={{ minHeight: 520 }}>
          {/* LEFT: Tab Navigation */}
          <div className="w-[220px] shrink-0 space-y-1.5">
            {CONFIG_TABS.map((tab, i) => {
              const active = configTab === tab.id;
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setConfigTab(tab.id)}
                  className="w-full text-left px-4 py-3.5 rounded-xl transition-all duration-300 relative group"
                  style={{
                    background: active ? `linear-gradient(135deg, ${tab.color}12, ${tab.color}06)` : "transparent",
                    border: `1px solid ${active ? `${tab.color}30` : "transparent"}`,
                  }}>
                  {active && <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full" style={{ background: tab.color }} />}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all" style={{
                      background: active ? `${tab.color}15` : "rgba(255,255,255,0.03)",
                      border: `1px solid ${active ? `${tab.color}25` : "rgba(255,255,255,0.05)"}`,
                    }}>
                      <Icon className="w-4 h-4" style={{ color: active ? tab.color : "#64748B" }} />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold" style={{ color: active ? "#F1F5F9" : "#94A3B8" }}>{tab.label}</p>
                      <p className="text-[9px] mt-0.5" style={{ color: active ? tab.color : "#475569" }}>{tab.summary}</p>
                    </div>
                  </div>
                  {/* Step number */}
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{ background: active ? `${tab.color}15` : "rgba(255,255,255,0.02)", color: active ? tab.color : "#334155" }}>
                    {i + 1}
                  </div>
                </button>
              );
            })}

            {/* Config Summary Card */}
            <div className="mt-4 rounded-xl p-4 space-y-2" style={{
              background: "linear-gradient(135deg, rgba(16,185,129,0.04), rgba(6,182,212,0.04))",
              border: "1px solid rgba(16,185,129,0.1)",
            }}>
              <p className="text-[9px] uppercase tracking-[0.12em] font-bold" style={{ color: "#10B981" }}>Resumo da Config</p>
              <div className="space-y-1.5">
                {[
                  { label: "Leads", value: `${numLeads}`, color: "#3B82F6" },
                  { label: "Msgs/lead", value: `${msgsPerLead}`, color: "#10B981" },
                  { label: "Duração", value: formatTime(duration), color: "#8B5CF6" },
                  { label: "Objeções", value: `${objectionDensity}%`, color: "#F59E0B" },
                  { label: "Perfis", value: `${selectedProfiles.length || 8}`, color: "#EC4899" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-[9px]" style={{ color: "#64748B" }}>{item.label}</span>
                    <span className="text-[11px] font-bold tabular-nums" style={{ color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Content Area */}
          <div className="flex-1 rounded-2xl overflow-hidden relative" style={{
            background: "linear-gradient(135deg, rgba(13,18,32,0.9), rgba(13,18,32,0.7))",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(8px)",
          }}>
            {/* Active tab accent line */}
            <div className="h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${CONFIG_TABS.find(t => t.id === configTab)?.color || "#10B981"}, transparent)` }} />

            <div className="p-6 overflow-y-auto" style={{ maxHeight: 500 }}>
              {/* ===== VOLUME TAB ===== */}
              {configTab === "volume" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <BarChart3 className="w-5 h-5" style={{ color: "#3B82F6" }} />
                    <div>
                      <h3 className="text-[15px] font-bold" style={{ color: "#F1F5F9" }}>Volume & Tempo</h3>
                      <p className="text-[11px]" style={{ color: "#64748B" }}>Configure a escala e duração do teste de estresse</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    {[
                      { label: "Leads simultâneos", value: numLeads, setter: setNumLeads, min: 1, max: 100, step: 1, color: "#3B82F6", desc: "Quantidade de leads que entram na simulação" },
                      { label: "Mensagens por lead", value: msgsPerLead, setter: setMsgsPerLead, min: 4, max: 40, step: 2, color: "#10B981", desc: "Rodadas de conversa entre agente e lead" },
                      { label: "Intervalo entre leads", value: intervalSec, setter: setIntervalSec, min: 0, max: 30, step: 1, color: "#F59E0B", desc: "Segundos entre entrada de cada lead", suffix: "s" },
                      { label: "Duração máxima", value: duration, setter: setDuration, min: 30, max: 1800, step: 30, color: "#8B5CF6", desc: "Tempo limite da simulação", format: true },
                    ].map(s => (
                      <div key={s.label} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12px] font-semibold" style={{ color: "#E2E8F0" }}>{s.label}</span>
                          <span className="text-[22px] font-extrabold tabular-nums" style={{ color: s.color, textShadow: `0 0 20px ${s.color}20` }}>
                            {s.format ? formatTime(s.value) : s.value}{s.suffix || ""}
                          </span>
                        </div>
                        <p className="text-[9px] mb-3" style={{ color: "#475569" }}>{s.desc}</p>
                        <Slider min={s.min} max={s.max} step={s.step} value={[s.value]} onValueChange={v => s.setter(v[0])} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ===== PERFIS TAB ===== */}
              {configTab === "perfis" && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5" style={{ color: "#EC4899" }} />
                      <div>
                        <h3 className="text-[15px] font-bold" style={{ color: "#F1F5F9" }}>Perfis Psicológicos</h3>
                        <p className="text-[11px]" style={{ color: "#64748B" }}>Selecione quais perfis participam · {selectedProfiles.length || "Todos os 8"} ativos</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {[
                        { id: "random", label: "Aleatório", icon: "🎲" },
                        { id: "roundrobin", label: "Round-robin", icon: "🔄" },
                      ].map(m => (
                        <button key={m.id} onClick={() => setProfileMode(m.id as any)}
                          className="text-[10px] px-3 py-1.5 rounded-lg font-semibold transition-all"
                          style={{
                            background: profileMode === m.id ? "rgba(236,72,153,0.1)" : "rgba(255,255,255,0.02)",
                            border: `1px solid ${profileMode === m.id ? "rgba(236,72,153,0.25)" : "rgba(255,255,255,0.04)"}`,
                            color: profileMode === m.id ? "#EC4899" : "#64748B",
                          }}>
                          {m.icon} {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {PERFIS_INTELIGENTES.map(p => {
                      const active = selectedProfiles.length === 0 || selectedProfiles.includes(p.tipo);
                      return (
                        <button key={p.tipo} onClick={() => toggleMulti(selectedProfiles, p.tipo, setSelectedProfiles)}
                          className="flex items-start gap-3 p-4 rounded-xl text-left transition-all duration-200"
                          style={{
                            background: active ? `${p.cor}06` : "rgba(255,255,255,0.01)",
                            border: `1px solid ${active ? `${p.cor}25` : "rgba(255,255,255,0.04)"}`,
                          }}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{
                            background: active ? `${p.cor}12` : "rgba(255,255,255,0.03)",
                          }}>
                            {p.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[12px] font-bold" style={{ color: active ? "#F1F5F9" : "#64748B" }}>{p.label}</p>
                              {active && <div className="w-2 h-2 rounded-full" style={{ background: p.cor }} />}
                            </div>
                            <p className="text-[9px] mt-0.5 line-clamp-2" style={{ color: "#475569" }}>{p.gatilhosCompra.slice(0, 2).join(" · ")}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ===== CENARIO TAB ===== */}
              {configTab === "cenario" && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <MapPin className="w-5 h-5" style={{ color: "#06B6D4" }} />
                    <div>
                      <h3 className="text-[15px] font-bold" style={{ color: "#F1F5F9" }}>Cenário dos Leads</h3>
                      <p className="text-[11px]" style={{ color: "#64748B" }}>Destinos, orçamentos, canais e composição de grupo</p>
                    </div>
                  </div>

                  {/* Destinations */}
                  {(() => {
                    const DESTINO_DATA = DESTINOS_LEAD.map(d => {
                      const regions: Record<string, { icon: string; region: string }> = {
                        "Maldivas": { icon: "🏝️", region: "Ásia" }, "Paris": { icon: "🗼", region: "Europa" }, "Nova York": { icon: "🗽", region: "América" },
                        "Tóquio": { icon: "🗾", region: "Ásia" }, "Dubai": { icon: "🏙️", region: "Oriente Médio" }, "Roma": { icon: "🏛️", region: "Europa" },
                        "Cancún": { icon: "🌴", region: "América" }, "Santorini": { icon: "🏖️", region: "Europa" }, "Fernando de Noronha": { icon: "🐢", region: "Brasil" },
                        "Gramado": { icon: "🏔️", region: "Brasil" }, "Bali": { icon: "🛕", region: "Ásia" }, "Londres": { icon: "🎡", region: "Europa" },
                        "Orlando": { icon: "🎢", region: "América" }, "Santiago": { icon: "🏔️", region: "América" }, "Lisboa": { icon: "⛵", region: "Europa" },
                      };
                      return { name: d, ...regions[d] || { icon: "🌍", region: "Outros" } };
                    });

                    return (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold" style={{ color: "#E2E8F0" }}>Destinos</span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: "rgba(6,182,212,0.08)", color: "#06B6D4" }}>
                              {selectedDestinos.length || DESTINOS_LEAD.length} selecionados
                            </span>
                          </div>
                          <button onClick={() => setSelectedDestinos([])} className="text-[9px] font-semibold px-2 py-1 rounded-lg" style={{ color: "#64748B", background: "rgba(255,255,255,0.02)" }}>
                            {selectedDestinos.length > 0 ? "Limpar" : "Todos"}
                          </button>
                        </div>
                        <div className="grid grid-cols-5 gap-0 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.04)" }}>
                          {DESTINO_DATA.map((d, i) => {
                            const active = selectedDestinos.length === 0 || selectedDestinos.includes(d.name);
                            return (
                              <button key={d.name} onClick={() => toggleMulti(selectedDestinos, d.name, setSelectedDestinos)}
                                className="flex items-center gap-2 px-3 py-2.5 text-left transition-all duration-200 hover:bg-white/[0.02]"
                                style={{
                                  background: active ? "rgba(6,182,212,0.06)" : "transparent",
                                  borderBottom: i < DESTINO_DATA.length - 5 ? "1px solid rgba(255,255,255,0.03)" : "none",
                                  borderRight: (i + 1) % 5 !== 0 ? "1px solid rgba(255,255,255,0.03)" : "none",
                                }}>
                                <div className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all" style={{
                                  background: active ? "#06B6D4" : "rgba(255,255,255,0.04)",
                                  border: `1px solid ${active ? "#06B6D4" : "rgba(255,255,255,0.08)"}`,
                                }}>
                                  {active && <Check className="w-2.5 h-2.5 text-white" />}
                                </div>
                                <span className="text-sm">{d.icon}</span>
                                <div className="min-w-0">
                                  <p className="text-[10px] font-semibold truncate" style={{ color: active ? "#E2E8F0" : "#94A3B8" }}>{d.name}</p>
                                  <p className="text-[8px]" style={{ color: "#475569" }}>{d.region}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Budget + Canal side by side */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Budget */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet className="w-3.5 h-3.5" style={{ color: "#10B981" }} />
                        <span className="text-[11px] font-bold" style={{ color: "#E2E8F0" }}>Faixa de Orçamento</span>
                      </div>
                      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.04)" }}>
                        {BUDGETS_LEAD.map((b, i) => {
                          const active = selectedBudgets.includes(b);
                          const barWidths = [20, 35, 55, 75, 100];
                          return (
                            <button key={b} onClick={() => toggleMulti(selectedBudgets, b, setSelectedBudgets)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-200 hover:bg-white/[0.02]"
                              style={{
                                background: active ? "rgba(16,185,129,0.05)" : "transparent",
                                borderBottom: i < BUDGETS_LEAD.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                              }}>
                              <div className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all" style={{
                                background: active ? "#10B981" : "rgba(255,255,255,0.04)",
                                border: `1px solid ${active ? "#10B981" : "rgba(255,255,255,0.08)"}`,
                              }}>
                                {active && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <span className="text-[11px] font-semibold w-24 shrink-0" style={{ color: active ? "#E2E8F0" : "#94A3B8" }}>{b}</span>
                              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                                <div className="h-full rounded-full transition-all" style={{ width: `${barWidths[i]}%`, background: active ? "#10B981" : "rgba(255,255,255,0.08)" }} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Canal */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Radio className="w-3.5 h-3.5" style={{ color: "#8B5CF6" }} />
                        <span className="text-[11px] font-bold" style={{ color: "#E2E8F0" }}>Origem do Lead</span>
                      </div>
                      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.04)" }}>
                        {CANAIS_LEAD.map((c, i) => {
                          const active = selectedCanais.includes(c);
                          const canalIcons: Record<string, string> = { "Instagram DM": "📸", WhatsApp: "💬", Site: "🌐", Indicação: "🤝", Google: "🔍", TikTok: "🎵" };
                          return (
                            <button key={c} onClick={() => toggleMulti(selectedCanais, c, setSelectedCanais)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-200 hover:bg-white/[0.02]"
                              style={{
                                background: active ? "rgba(139,92,246,0.05)" : "transparent",
                                borderBottom: i < CANAIS_LEAD.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                              }}>
                              <div className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all" style={{
                                background: active ? "#8B5CF6" : "rgba(255,255,255,0.04)",
                                border: `1px solid ${active ? "#8B5CF6" : "rgba(255,255,255,0.08)"}`,
                              }}>
                                {active && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <span className="text-sm">{canalIcons[c] || "📡"}</span>
                              <span className="text-[11px] font-semibold" style={{ color: active ? "#E2E8F0" : "#94A3B8" }}>{c}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Grupos */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />
                      <span className="text-[11px] font-bold" style={{ color: "#E2E8F0" }}>Grupo de Viajantes</span>
                    </div>
                    <div className="grid grid-cols-3 gap-0 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.04)" }}>
                      {GRUPOS_LEAD.map((g, i) => {
                        const active = selectedGrupos.includes(g);
                        const grupoIcons: Record<string, string> = { "1 pessoa": "🧍", Casal: "👫", "Família 4 pax": "👨‍👩‍👧‍👦", "Grupo 6 amigos": "👥", "Corporativo 3 pax": "💼", "Casal lua de mel": "💍" };
                        return (
                          <button key={g} onClick={() => toggleMulti(selectedGrupos, g, setSelectedGrupos)}
                            className="flex items-center gap-2.5 px-3 py-2.5 text-left transition-all duration-200 hover:bg-white/[0.02]"
                            style={{
                              background: active ? "rgba(245,158,11,0.05)" : "transparent",
                              borderBottom: i < GRUPOS_LEAD.length - 3 ? "1px solid rgba(255,255,255,0.03)" : "none",
                              borderRight: (i + 1) % 3 !== 0 ? "1px solid rgba(255,255,255,0.03)" : "none",
                            }}>
                            <div className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all" style={{
                              background: active ? "#F59E0B" : "rgba(255,255,255,0.04)",
                              border: `1px solid ${active ? "#F59E0B" : "rgba(255,255,255,0.08)"}`,
                            }}>
                              {active && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <span className="text-sm">{grupoIcons[g] || "👤"}</span>
                            <span className="text-[10px] font-semibold" style={{ color: active ? "#E2E8F0" : "#94A3B8" }}>{g}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ===== COMPORTAMENTO TAB ===== */}
              {configTab === "comportamento" && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <Zap className="w-5 h-5" style={{ color: "#8B5CF6" }} />
                    <div>
                      <h3 className="text-[15px] font-bold" style={{ color: "#F1F5F9" }}>Comportamento & Funil</h3>
                      <p className="text-[11px]" style={{ color: "#64748B" }}>Conversão, objeções, velocidade e agentes do pipeline</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold" style={{ color: "#E2E8F0" }}>Taxa alvo de conversão</span>
                        <span className="text-[15px] font-bold" style={{ color: conversionOverride !== null ? "#10B981" : "#64748B" }}>
                          {conversionOverride !== null ? `${conversionOverride}%` : "Natural"}
                        </span>
                      </div>
                      <p className="text-[9px] mb-3" style={{ color: "#475569" }}>Forçar uma taxa específica ou deixar natural</p>
                      <div className="flex items-center gap-3">
                        <Slider min={0} max={100} step={5} value={[conversionOverride ?? 50]} onValueChange={v => setConversionOverride(v[0])} disabled={conversionOverride === null} />
                        <button onClick={() => setConversionOverride(conversionOverride === null ? 50 : null)}
                          className="text-[9px] px-3 py-1.5 rounded-lg shrink-0 font-semibold transition-all"
                          style={{ background: conversionOverride !== null ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.02)", border: `1px solid ${conversionOverride !== null ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.04)"}`, color: conversionOverride !== null ? "#10B981" : "#64748B" }}>
                          {conversionOverride !== null ? "Override" : "Natural"}
                        </button>
                      </div>
                    </div>
                    <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold" style={{ color: "#E2E8F0" }}>Densidade de objeções</span>
                        <span className="text-[15px] font-bold" style={{ color: "#F59E0B" }}>{objectionDensity}%</span>
                      </div>
                      <p className="text-[9px] mb-3" style={{ color: "#475569" }}>Probabilidade de objeções por turno</p>
                      <Slider min={0} max={100} step={5} value={[objectionDensity]} onValueChange={v => setObjectionDensity(v[0])} />
                    </div>
                  </div>
                  {/* Speed */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-3.5 h-3.5" style={{ color: "#8B5CF6" }} />
                      <span className="text-[11px] font-bold" style={{ color: "#E2E8F0" }}>Velocidade da Simulação</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {SPEED_OPTIONS.map(s => {
                        const active = speed === s.id;
                        const speedIcons: Record<string, string> = { lenta: "🐢", normal: "⚡", rapida: "🚀", instant: "💥" };
                        return (
                          <button key={s.id} onClick={() => setSpeed(s.id)}
                            className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all"
                            style={{
                              background: active ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.015)",
                              border: `1px solid ${active ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.04)"}`,
                            }}>
                            <span className="text-lg">{speedIcons[s.id]}</span>
                            <span className="text-[11px] font-bold" style={{ color: active ? "#E2E8F0" : "#94A3B8" }}>{s.label}</span>
                            <span className="text-[8px]" style={{ color: "#475569" }}>{s.delay > 0 ? `${s.delay / 1000}s` : "0s"}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Funnel agents */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-3.5 h-3.5" style={{ color: "#8B5CF6" }} />
                      <span className="text-[11px] font-bold" style={{ color: "#E2E8F0" }}>Agentes do Funil</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[{ id: "full", label: "Funil completo", desc: "Comercial + Atendimento", icon: "🔄" }, { id: "comercial", label: "Só comercial", desc: "Squad comercial", icon: "💰" }, { id: "custom", label: "Personalizado", desc: "Escolha manual", icon: "⚙️" }].map(m => (
                        <button key={m.id} onClick={() => setFunnelMode(m.id as any)}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all"
                          style={{
                            background: funnelMode === m.id ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.015)",
                            border: `1px solid ${funnelMode === m.id ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.04)"}`,
                          }}>
                          <span className="text-lg">{m.icon}</span>
                          <span className="text-[11px] font-bold" style={{ color: funnelMode === m.id ? "#E2E8F0" : "#94A3B8" }}>{m.label}</span>
                          <span className="text-[8px]" style={{ color: "#475569" }}>{m.desc}</span>
                        </button>
                      ))}
                    </div>
                    {funnelMode === "custom" && (
                      <div className="rounded-xl overflow-hidden animate-in fade-in duration-200" style={{ border: "1px solid rgba(255,255,255,0.04)" }}>
                        {AGENTS_V4.map((a, i) => {
                          const active = customFunnelAgents.includes(a.id); const c = getAgentColor(a);
                          return (
                            <button key={a.id} onClick={() => toggleMulti(customFunnelAgents, a.id, setCustomFunnelAgents)}
                              className="w-full flex items-center gap-3 px-3 py-2 text-left transition-all duration-200 hover:bg-white/[0.02]"
                              style={{
                                background: active ? `${c}08` : "transparent",
                                borderBottom: i < AGENTS_V4.length - 1 ? "1px solid rgba(255,255,255,0.02)" : "none",
                              }}>
                              <div className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all" style={{
                                background: active ? c : "rgba(255,255,255,0.04)",
                                border: `1px solid ${active ? c : "rgba(255,255,255,0.08)"}`,
                              }}>
                                {active && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <span className="text-sm">{a.emoji}</span>
                              <span className="text-[10px] font-semibold" style={{ color: active ? "#E2E8F0" : "#64748B" }}>{a.name}</span>
                              <span className="text-[8px] ml-auto px-1.5 py-0.5 rounded" style={{ background: `${c}10`, color: c }}>{a.role.split(" ")[0]}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ===== AVANCADO TAB ===== */}
              {configTab === "avancado" && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <Brain className="w-5 h-5" style={{ color: "#F59E0B" }} />
                    <div>
                      <h3 className="text-[15px] font-bold" style={{ color: "#F1F5F9" }}>Motor IA Avançado</h3>
                      <p className="text-[11px]" style={{ color: "#64748B" }}>Controles avançados do engine de simulação</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Avaliação IA em tempo real", desc: "Lead julga qualidade de cada resposta e ajusta sentimento", value: enableEvaluation, setter: setEnableEvaluation, color: "#EC4899", icon: "🧠" },
                      { label: "Multi-mensagem por perfil", desc: "Ansioso e Sonhador enviam múltiplas msgs seguidas", value: enableMultiMsg, setter: setEnableMultiMsg, color: "#F59E0B", icon: "💬" },
                    ].map(opt => (
                      <button key={opt.label} onClick={() => opt.setter(!opt.value)}
                        className="w-full flex items-center gap-4 px-5 py-4 rounded-xl text-left transition-all"
                        style={{
                          background: opt.value ? `${opt.color}06` : "rgba(255,255,255,0.015)",
                          border: `1px solid ${opt.value ? `${opt.color}25` : "rgba(255,255,255,0.04)"}`,
                        }}>
                        <span className="text-xl">{opt.icon}</span>
                        <div className="flex-1">
                          <p className="text-[12px] font-bold" style={{ color: opt.value ? "#F1F5F9" : "#94A3B8" }}>{opt.label}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: "#475569" }}>{opt.desc}</p>
                        </div>
                        <div className="w-10 h-6 rounded-full relative transition-all" style={{ background: opt.value ? opt.color : "rgba(255,255,255,0.1)" }}>
                          <div className="absolute top-1 w-4 h-4 rounded-full transition-all" style={{ left: opt.value ? 20 : 4, background: "#fff" }} />
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="rounded-xl p-4" style={{ background: "rgba(236,72,153,0.04)", border: "1px solid rgba(236,72,153,0.1)" }}>
                    <p className="text-[10px] font-bold mb-2" style={{ color: "#EC4899" }}>Motor de Leads Inteligentes v2.0</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {["✅ Psicologia profunda (8 perfis)", "✅ Objeções dinâmicas por IA", "✅ Revelação gradual de info", "✅ Avaliação em tempo real", "✅ Multi-mensagem por perfil", "✅ Perdas motivadas por IA", "✅ Timing realista por perfil", "✅ Sentimento adaptativo"].map(f => (
                        <p key={f} className="text-[9px]" style={{ color: "#94A3B8" }}>{f}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CTA Bar */}
        <div className="mt-5 rounded-2xl overflow-hidden relative" style={{
          background: "linear-gradient(135deg, rgba(13,18,32,0.95), rgba(13,18,32,0.8))",
          border: "1px solid rgba(16,185,129,0.15)",
        }}>
          <div className="h-[2px]" style={{ background: "linear-gradient(90deg, #10B981, #06B6D4, #8B5CF6)" }} />
          <div className="flex items-center gap-6 px-6 py-4">
            {/* Config chips */}
            <div className="flex-1 flex items-center gap-3 overflow-x-auto">
              {[
                { icon: "👥", label: `${numLeads} leads`, color: "#3B82F6" },
                { icon: "💬", label: `${msgsPerLead} msgs`, color: "#10B981" },
                { icon: "⏱️", label: formatTime(duration), color: "#8B5CF6" },
                { icon: "🎯", label: `${selectedProfiles.length || 8} perfis`, color: "#EC4899" },
                { icon: "🌍", label: `${selectedDestinos.length || DESTINOS_LEAD.length} destinos`, color: "#06B6D4" },
                { icon: "⚡", label: SPEED_OPTIONS.find(s => s.id === speed)?.label || "Normal", color: "#F59E0B" },
              ].map(chip => (
                <span key={chip.label} className="text-[10px] font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0"
                  style={{ background: `${chip.color}08`, color: chip.color, border: `1px solid ${chip.color}15` }}>
                  {chip.icon} {chip.label}
                </span>
              ))}
            </div>
            {/* Start button */}
            <button onClick={runSimulation}
              className="px-8 py-3 rounded-xl text-[13px] font-bold transition-all duration-300 relative overflow-hidden shrink-0 hover:scale-[1.03] active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #10B981, #06B6D4)", color: "#000", boxShadow: "0 4px 24px rgba(16,185,129,0.3)" }}>
              <Play className="w-4 h-4 inline mr-2" />
              Iniciar Simulação IA
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
        <div className="flex items-center gap-4 px-5 py-3 rounded-2xl mb-4 relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(13,18,32,0.95), rgba(15,23,42,0.9))", border: "1px solid rgba(239,68,68,0.15)" }}>
          <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, transparent, #EF4444, #F59E0B, transparent)" }} />
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: "#EF4444", boxShadow: "0 0 12px rgba(239,68,68,0.5)" }} />
            <span className="text-[14px] font-extrabold tracking-wider" style={{ color: "#F1F5F9" }}>WAR ROOM</span>
            <span className="text-[15px] font-bold tabular-nums px-3 py-1 rounded-lg" style={{ color: "#F59E0B", background: "rgba(245,158,11,0.08)" }}>{formatTime(elapsedSeconds)}</span>
          </div>
          <div className="flex-1 flex items-center justify-center gap-6">
            {[
              { label: "Leads", value: animLeads, color: "#3B82F6" },
              { label: "Fechados", value: animClosed, color: "#10B981" },
              { label: "Conversão", value: `${conversionRate}%`, color: "#F59E0B" },
              { label: "Sentimento", value: `${avgSentimento}`, color: sentimentColor(avgSentimento) },
            ].map(k => (
              <div key={k.label} className="text-center">
                <span className="text-[16px] font-extrabold tabular-nums block" style={{ color: k.color }}>{k.value}</span>
                <span className="text-[8px] uppercase tracking-wider" style={{ color: "#64748B" }}>{k.label}</span>
              </div>
            ))}
          </div>
          <button onClick={stopSimulation} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold transition-all hover:scale-105"
            style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}>
            <Square className="w-3 h-3" /> Parar
          </button>
        </div>
      )}

      {/* Report tabs */}
      {phase === "report" && !running && (
        <div className="flex items-center gap-3 mb-5 rounded-2xl px-5 py-3 relative overflow-hidden" style={{
          background: "linear-gradient(135deg, rgba(13,18,32,0.95), rgba(15,23,42,0.9))",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, #3B82F6, #10B981, #8B5CF6)" }} />
          {/* Workflow stepper */}
          <div className="flex items-center gap-2 mr-4">
            {[
              { label: "Simulação", icon: "✓", done: true },
              { label: "Análise", icon: reportTab === "numeros" ? "●" : "✓", done: reportTab !== "numeros" },
              { label: "Debrief", icon: reportTab === "debrief" ? "●" : (reportTab === "numeros" ? "○" : "○"), done: false },
            ].map((step, i) => (
              <div key={step.label} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{
                    background: step.done ? "#10B981" : "rgba(255,255,255,0.06)",
                    color: step.done ? "#000" : "#64748B",
                  }}>{step.icon}</div>
                  <span className="text-[9px] font-semibold" style={{ color: step.done ? "#10B981" : "#64748B" }}>{step.label}</span>
                </div>
                {i < 2 && <div className="w-6 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />}
              </div>
            ))}
          </div>
          <div className="h-6 w-px mx-2" style={{ background: "rgba(255,255,255,0.06)" }} />
          {/* Tab buttons */}
          <div className="flex items-center gap-1.5 flex-1">
            {(["numeros", "conversas", "debrief"] as ReportTab[]).map(t => {
              const active = reportTab === t;
              const accent = t === "debrief" ? "#8B5CF6" : t === "numeros" ? "#3B82F6" : "#10B981";
              const icons = { numeros: "📊", conversas: "💬", debrief: "🧠" };
              const labels = { numeros: "Números", conversas: "Conversas", debrief: "Debrief IA" };
              return (
                <button key={t} onClick={() => setReportTab(t)}
                  className="text-[11px] px-4 py-2 rounded-xl font-bold transition-all duration-300"
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
          {/* Nova Simulação */}
          <button onClick={() => { if (leads.length > 0 && !confirm("Tem certeza? Os dados da simulação atual serão perdidos.")) return; setPhase("config"); setLeads([]); setDebrief(null); setEvents([]); setElapsedSeconds(0); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-bold transition-all hover:scale-[1.03]"
            style={{
              background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(6,182,212,0.1))",
              border: "1px solid rgba(16,185,129,0.2)",
              color: "#10B981",
            }}>
            <Play className="w-3.5 h-3.5" /> Nova Simulação
          </button>
        </div>
      )}

      {/* 3-column layout */}
      {(running || (phase === "report" && reportTab === "conversas")) && (
        <div className="flex gap-4" style={{ height: "calc(100vh - 300px)", minHeight: 500 }}>
          {/* LEFT: Lead list */}
          <div className="w-[280px] shrink-0 rounded-2xl overflow-hidden flex flex-col" style={{ background: "rgba(11,20,26,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span className="text-[13px] font-bold" style={{ color: "#F1F5F9" }}>Leads Inteligentes</span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg" style={{ background: "rgba(37,211,102,0.1)", color: "#25D366" }}>
                {leads.filter(l => l.status === "ativo").length} ativos
              </span>
            </div>
            {!running && (
              <div className="flex px-3 py-1.5 gap-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                {(["all", "ativo", "fechou", "perdeu"] as const).map(f => (
                  <button key={f} onClick={() => setLeadFilter(f)}
                    className="flex-1 text-[9px] py-1.5 font-semibold transition-all rounded-lg"
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
                        <p className="text-[12px] font-bold truncate" style={{ color: "#E2E8F0" }}>{l.nome}</p>
                        <span className="text-[9px] tabular-nums" style={{ color: "#475569" }}>{l.perfil.label}</span>
                      </div>
                      <p className="text-[10px] truncate mt-0.5" style={{ color: "#64748B" }}>
                        {l.mensagens[l.mensagens.length - 1]?.content?.slice(0, 40) || l.destino}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: `${l.perfil.cor}08`, color: l.perfil.cor }}>{l.destino}</span>
                        <span className="text-[8px]" style={{ color: sentimentColor(l.sentimentoScore) }}>♥ {l.sentimentoScore}</span>
                        {l.status !== "ativo" && (
                          <span className="text-[8px] font-bold" style={{ color: l.status === "fechou" ? "#10B981" : "#EF4444" }}>
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

          {/* CENTER: Chat */}
          <div className="flex-1 rounded-2xl flex flex-col overflow-hidden" style={{ background: "rgba(11,20,26,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {selectedLead ? (
              <>
                <div className="flex items-center gap-3 px-5 shrink-0 relative" style={{ height: 64, background: "linear-gradient(180deg, rgba(31,44,51,0.95), rgba(31,44,51,0.8))" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                    style={{ background: `${selectedLead.perfil.cor}12`, color: selectedLead.perfil.cor, border: `1px solid ${selectedLead.perfil.cor}20` }}>
                    {selectedLead.perfil.emoji}
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-bold" style={{ color: "#F1F5F9" }}>{selectedLead.nome}</p>
                    <p className="text-[11px]" style={{ color: "#64748B" }}>{selectedLead.destino} · {selectedLead.perfil.label} · {selectedLead.ocasiao}</p>
                  </div>
                  {/* Sentiment gauge */}
                  <div className="flex items-center gap-2">
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3" style={{ color: sentimentColor(selectedLead.sentimentoScore) }} />
                        <span className="text-[13px] font-bold tabular-nums" style={{ color: sentimentColor(selectedLead.sentimentoScore) }}>{selectedLead.sentimentoScore}</span>
                      </div>
                      <p className="text-[8px]" style={{ color: "#64748B" }}>{sentimentLabel(selectedLead.sentimentoScore)}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3" style={{ color: selectedLead.pacienciaRestante > 50 ? "#10B981" : "#EF4444" }} />
                        <span className="text-[13px] font-bold tabular-nums" style={{ color: selectedLead.pacienciaRestante > 50 ? "#10B981" : "#EF4444" }}>{selectedLead.pacienciaRestante}</span>
                      </div>
                      <p className="text-[8px]" style={{ color: "#64748B" }}>Paciência</p>
                    </div>
                  </div>
                  {/* Stage */}
                  <div className="flex items-center gap-1 bg-black/20 px-2.5 py-1.5 rounded-full">
                    {ETAPAS_FUNIL.map((e, i) => {
                      const idx = ETAPAS_FUNIL.findIndex(et => et.id === selectedLead.etapaAtual);
                      return (
                        <div key={e.id} className="flex items-center gap-0.5" title={e.label}>
                          <div className="w-2 h-2 rounded-full transition-all" style={{
                            background: i < idx ? "#10B981" : i === idx ? selectedLead.perfil.cor : "rgba(255,255,255,0.08)",
                            boxShadow: i === idx ? `0 0 6px ${selectedLead.perfil.cor}80` : "none",
                          }} />
                          {i < ETAPAS_FUNIL.length - 1 && <div className="w-2 h-px" style={{ background: i < idx ? "#10B98160" : "rgba(255,255,255,0.06)" }} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Messages */}
                <div ref={chatRef} className="flex-1 overflow-y-auto p-5 space-y-2" style={{ background: "#0B141A" }}>
                  {selectedLead.mensagens.map((msg, i) => {
                    const isAgent = msg.role === "agent";
                    const showName = isAgent && (i === 0 || selectedLead.mensagens[i - 1]?.role !== "agent" || selectedLead.mensagens[i - 1]?.agentName !== msg.agentName);
                    return (
                      <div key={`msg-${msg.timestamp}-${i}`} className={cn("flex gap-2 animate-in duration-300", isAgent ? "justify-start slide-in-from-left-3" : "justify-end slide-in-from-right-3")}>
                        <div style={{
                          background: isAgent ? "rgba(31,44,51,0.9)" : "linear-gradient(135deg, #005C4B, #00694D)", color: "#E9EDEF",
                          borderRadius: isAgent ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                          maxWidth: "70%", padding: "10px 14px",
                        }}>
                          {showName && msg.agentName && <p className="text-[11px] font-bold mb-1" style={{ color: "#53BDEB" }}>{msg.agentName}</p>}
                          <p className="text-[13px] leading-[1.6]">{msg.content.replace("[TRANSFERIR]", "").trim()}</p>
                          <div className="flex items-center justify-end gap-1.5 mt-1">
                            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                              {new Date(msg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {!isAgent && <span className="text-[10px]" style={{ color: "#34B7F1" }}>✓✓</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Lead info bar */}
                {selectedLead.motivoPerda && (
                  <div className="px-5 py-2 flex items-center gap-2" style={{ background: "rgba(239,68,68,0.05)", borderTop: "1px solid rgba(239,68,68,0.1)" }}>
                    <AlertTriangle className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
                    <p className="text-[11px]" style={{ color: "#EF4444" }}>Perda: {selectedLead.motivoPerda.slice(0, 100)}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ background: "#0B141A" }}>
                <Brain className="w-10 h-10" style={{ color: "rgba(255,255,255,0.05)" }} />
                <p className="text-[13px]" style={{ color: "#334155" }}>Selecione um lead para ver a conversa</p>
              </div>
            )}
          </div>

          {/* RIGHT: KPIs + Feed */}
          {running && (
            <div className="w-[240px] shrink-0 space-y-3 overflow-y-auto custom-scrollbar">
              {[
                { label: "Leads", value: animLeads, color: "#3B82F6", icon: "👥" },
                { label: "Fechados", value: animClosed, color: "#10B981", icon: "✅" },
                { label: "Receita", value: `R$${animReceita}k`, color: "#EAB308", icon: "💰" },
                { label: "Sentimento", value: avgSentimento, color: sentimentColor(avgSentimento), icon: "💗" },
              ].map(k => (
                <div key={k.label} className="relative rounded-2xl overflow-hidden" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${k.color}, transparent)` }} />
                  <div className="p-3.5 text-center">
                    <p className="text-[22px] font-extrabold tabular-nums" style={{ color: k.color }}>{k.value}</p>
                    <p className="text-[9px] uppercase tracking-[0.12em]" style={{ color: "#64748B" }}>{k.icon} {k.label}</p>
                  </div>
                </div>
              ))}
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
                <p className="text-[9px] uppercase tracking-[0.12em] mt-1.5" style={{ color: "#64748B" }}>Conversão</p>
              </div>
              {/* Feed */}
              <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[9px] uppercase tracking-[0.12em] font-bold px-4 py-2.5" style={{ color: "#64748B", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>Feed ao vivo</p>
                <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                  {events.map(e => (
                    <div key={e.id} className="flex items-start gap-2.5 px-4 py-2 animate-in slide-in-from-top-1 duration-200" style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: e.color, boxShadow: `0 0 4px ${e.color}40` }} />
                      <div>
                        <p className="text-[10px]" style={{ color: "#E2E8F0" }}>{e.text}</p>
                        <p className="text-[8px]" style={{ color: "#475569" }}>{e.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Report: Números */}
      {phase === "report" && !running && reportTab === "numeros" && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
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
                  <p className="text-[8px] uppercase tracking-[0.12em]" style={{ color: "#64748B" }}>{k.label}</p>
                </div>
              </div>
            ))}
          </div>
          {/* By profile */}
          <div className="rounded-2xl p-5" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[10px] uppercase tracking-[0.1em] font-bold mb-4" style={{ color: "#64748B" }}>Desempenho por Perfil Psicológico</p>
            {PERFIS_INTELIGENTES.map(p => {
              const pLeads = leads.filter(l => l.perfil.tipo === p.tipo);
              const pClosed = pLeads.filter(l => l.status === "fechou");
              const rate = pLeads.length > 0 ? Math.round((pClosed.length / pLeads.length) * 100) : 0;
              const avgS = pLeads.length > 0 ? Math.round(pLeads.reduce((s, l) => s + l.sentimentoScore, 0) / pLeads.length) : 0;
              if (pLeads.length === 0) return null;
              return (
                <div key={p.tipo} className="flex items-center gap-3 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <span className="text-sm">{p.emoji}</span>
                  <span className="text-[11px] font-bold w-24" style={{ color: p.cor }}>{p.label}</span>
                  <span className="text-[10px] w-12 text-center" style={{ color: "#64748B" }}>{pLeads.length}</span>
                  <span className="text-[10px] w-12 text-center font-semibold" style={{ color: "#10B981" }}>{pClosed.length}✓</span>
                  <span className="text-[10px] w-12 text-center" style={{ color: sentimentColor(avgS) }}>♥{avgS}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${rate}%`, background: `linear-gradient(90deg, ${rate >= 50 ? "#10B981" : rate >= 30 ? "#F59E0B" : "#EF4444"}, ${rate >= 50 ? "#06D6A0" : rate >= 30 ? "#FBBF24" : "#F87171"})` }} />
                  </div>
                  <span className="text-[12px] font-extrabold tabular-nums w-12 text-right" style={{ color: rate >= 50 ? "#10B981" : rate >= 30 ? "#F59E0B" : "#EF4444" }}>{rate}%</span>
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
                      <span className="text-[11px] font-bold" style={{ color: "#E2E8F0" }}>{l.nome}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444" }}>{l.etapaPerda}</span>
                    </div>
                    <p className="text-[10px] mt-0.5" style={{ color: "#94A3B8" }}>"{l.motivoPerda?.slice(0, 120)}"</p>
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
              <p className="text-[13px]" style={{ color: "#64748B" }}>NATH.AI analisando simulação com leads inteligentes...</p>
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
                      <p className="text-[14px] font-bold" style={{ color: "#F1F5F9" }}>Debrief da Simulação</p>
                      <p className="text-[10px]" style={{ color: "#64748B" }}>{new Date().toLocaleDateString("pt-BR")} · {leads.length} leads · {closedLeads.length} fechados</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={generateDebrief} className="text-[10px] px-4 py-2 rounded-xl font-semibold transition-all hover:scale-[1.02]"
                      style={{ border: "1px solid rgba(255,255,255,0.06)", color: "#64748B", background: "rgba(255,255,255,0.02)" }}>
                      <Loader2 className={cn("w-3 h-3 inline mr-1.5", debriefLoading && "animate-spin")} /> Reanalisar
                    </button>
                    {debrief.melhorias.filter(m => m.status === "pending").length > 0 && (
                      <button onClick={approveAll} className="text-[10px] px-4 py-2 rounded-xl font-bold transition-all hover:scale-105"
                        style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.15))", color: "#10B981", border: "1px solid rgba(16,185,129,0.25)" }}>
                        Aprovar todas ({debrief.melhorias.filter(m => m.status === "pending").length})
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Score + Summary */}
              <div className="flex gap-4">
                <div className="rounded-2xl p-6 text-center relative overflow-hidden" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)", minWidth: 160 }}>
                  <div className="relative w-[72px] h-[72px] mx-auto">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15" fill="none" stroke={sentimentColor(debrief.scoreGeral)}
                        strokeWidth="3" strokeDasharray={`${debrief.scoreGeral * 0.94} 100`} strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 6px ${sentimentColor(debrief.scoreGeral)})` }} />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[22px] font-extrabold" style={{ color: sentimentColor(debrief.scoreGeral) }}>{debrief.scoreGeral}</span>
                  </div>
                  <p className="text-[9px] uppercase tracking-[0.12em] mt-2" style={{ color: "#64748B" }}>Score Geral</p>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="rounded-2xl p-4" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-[13px] leading-[1.7]" style={{ color: "#E2E8F0" }}>{debrief.resumoExecutivo}</p>
                  </div>
                  {debrief.fraseNathAI && (
                    <div className="rounded-2xl p-4 relative overflow-hidden" style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.1)" }}>
                      <p className="text-[12px] italic" style={{ color: "#10B981" }}>"{debrief.fraseNathAI}"</p>
                      <p className="text-[9px] mt-1.5 font-bold" style={{ color: "#64748B" }}>— NATH.AI</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pontos Fortes */}
              {debrief.pontosFortes.length > 0 && (
                <div className="rounded-2xl p-5" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-[10px] uppercase tracking-[0.1em] font-bold mb-3" style={{ color: "#10B981" }}>✅ Pontos Fortes</p>
                  {debrief.pontosFortes.slice(0, 4).map((p, i) => (
                    <div key={`forte-${i}`} className="flex items-start gap-2.5 py-1.5">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#10B981" }} />
                      <p className="text-[11px] leading-relaxed" style={{ color: "#E2E8F0" }}>{p}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* === MELHORIAS — O CORAÇÃO DO DEBRIEF === */}
              <div className="rounded-2xl p-5" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <p className="text-[10px] uppercase tracking-[0.1em] font-bold" style={{ color: "#F59E0B" }}>🔧 Melhorias Sugeridas</p>
                    <div className="flex gap-1.5">
                      {Object.entries(TIPO_COLORS).map(([key, val]) => {
                        const count = debrief.melhorias.filter(m => m.tipo === key).length;
                        if (count === 0) return null;
                        return <span key={key} className="text-[8px] px-2 py-0.5 rounded-full font-semibold" style={{ background: val.bg, color: val.color }}>{val.icon} {val.label} ({count})</span>;
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
                                <p className="text-[12px] font-bold" style={{ color: "#F1F5F9" }}>{m.titulo}</p>
                                <span className="text-[8px] font-bold px-2 py-0.5 rounded-full" style={{ background: tipoInfo.bg, color: tipoInfo.color }}>
                                  {tipoInfo.icon} {tipoInfo.label}
                                </span>
                                <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full"
                                  style={{ background: m.prioridade === "alta" ? "rgba(239,68,68,0.08)" : m.prioridade === "media" ? "rgba(245,158,11,0.08)" : "rgba(59,130,246,0.08)", color: m.prioridade === "alta" ? "#EF4444" : m.prioridade === "media" ? "#F59E0B" : "#3B82F6" }}>{m.prioridade}</span>
                                <span className="text-[8px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.08)", color: "#8B5CF6" }}>{m.agente}</span>
                              </div>
                              <p className={cn("text-[10px] leading-relaxed", !isExpanded && "line-clamp-1")} style={{ color: "#94A3B8" }}>{m.desc}</p>
                              {!isExpanded && (
                                <p className="text-[9px] mt-1" style={{ color: "#10B981" }}>📈 Impacto: {m.impacto}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isApproved && <CheckCircle2 className="w-5 h-5" style={{ color: "#10B981" }} />}
                              {isRejected && <XCircle className="w-5 h-5" style={{ color: "#EF4444" }} />}
                              {isAnalyzing && <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#8B5CF6" }} />}
                              <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isExpanded && "rotate-180")} style={{ color: "#64748B" }} />
                            </div>
                          </div>
                        </div>

                        {/* Expanded detail panel */}
                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300" style={{ background: "rgba(255,255,255,0.01)" }}>
                            <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

                            {/* Full description */}
                            <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                              <p className="text-[9px] uppercase font-bold mb-1.5" style={{ color: "#64748B" }}>Descrição Completa</p>
                              <p className="text-[11px] leading-[1.8]" style={{ color: "#E2E8F0" }}>{m.desc}</p>
                              <p className="text-[10px] mt-2" style={{ color: "#10B981" }}>📈 Impacto estimado: {m.impacto}</p>
                            </div>

                            {/* Approved state */}
                            {isApproved && (
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.1)" }}>
                                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#10B981" }} />
                                <span className="text-[10px] font-semibold" style={{ color: "#10B981" }}>Implementada em {tipoInfo.label} → {m.agente}</span>
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
                                    <p className="text-[8px] uppercase" style={{ color: "#64748B" }}>Recomendação</p>
                                  </div>
                                  <div className="rounded-xl p-3 text-center" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}>
                                    <p className="text-[16px] font-extrabold" style={{ color: "#8B5CF6" }}>{m.deepAnalysis.confianca}%</p>
                                    <p className="text-[8px] uppercase" style={{ color: "#64748B" }}>Confiança</p>
                                  </div>
                                </div>

                                {/* Full analysis */}
                                <div className="rounded-xl p-4" style={{ background: "#111827", maxHeight: 200, overflow: "auto" }}>
                                  <p className="text-[9px] uppercase font-bold mb-1" style={{ color: "#64748B" }}>Análise Completa</p>
                                  <p className="text-[11px] leading-[1.8]" style={{ color: "#D1D5DB" }}>{m.deepAnalysis.analiseCompleta}</p>
                                </div>

                                {/* Reasoning chain */}
                                {m.deepAnalysis.linhaRaciocinio?.length > 0 && (
                                  <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                                    <p className="text-[9px] uppercase font-bold mb-2" style={{ color: "#64748B" }}>Linha de Raciocínio</p>
                                    <div className="flex items-start gap-2 flex-wrap">
                                      {m.deepAnalysis.linhaRaciocinio.map((step, i) => (
                                        <div key={`step-${i}`} className="flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0" style={{
                                            background: `hsl(${260 + i * 30}, 70%, 50%)`, color: "#fff"
                                          }}>{i + 1}</div>
                                          <p className="text-[10px]" style={{ color: "#E2E8F0" }}>{step}</p>
                                          {i < m.deepAnalysis!.linhaRaciocinio.length - 1 && <span className="text-[10px]" style={{ color: "#475569" }}>→</span>}
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
                                        <p className="text-[8px] uppercase font-bold" style={{ color: dim.color }}>{dim.icon} {dim.label}</p>
                                        <p className="text-[10px] mt-1" style={{ color: "#E2E8F0" }}>{(m.deepAnalysis!.impactoNumeros as any)[dim.key]}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Psychology */}
                                {m.deepAnalysis.psicologiaCliente && (
                                  <div className="rounded-xl p-4" style={{ background: "rgba(236,72,153,0.04)", border: "1px solid rgba(236,72,153,0.1)" }}>
                                    <p className="text-[9px] uppercase font-bold mb-1" style={{ color: "#EC4899" }}>🧠 Psicologia do Cliente</p>
                                    <p className="text-[10px] leading-relaxed" style={{ color: "#E2E8F0" }}>{m.deepAnalysis.psicologiaCliente}</p>
                                  </div>
                                )}

                                {/* Risks */}
                                {m.deepAnalysis.riscosNaoImplementar && (
                                  <div className="rounded-xl p-4" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)" }}>
                                    <p className="text-[9px] uppercase font-bold mb-1" style={{ color: "#EF4444" }}>⚠️ Riscos de não implementar</p>
                                    <p className="text-[10px] leading-relaxed" style={{ color: "#E2E8F0" }}>{m.deepAnalysis.riscosNaoImplementar}</p>
                                  </div>
                                )}
                              </>
                            )}

                            {/* Conteúdo sugerido */}
                            {m.conteudoSugerido && (
                              <div>
                                <p className="text-[9px] uppercase font-bold mb-1.5" style={{ color: "#64748B" }}>
                                  <Edit3 className="w-3 h-3 inline mr-1" />Conteúdo sugerido {isPending ? "(editável)" : ""}
                                </p>
                                {isPending ? (
                                  <textarea
                                    value={m.editedContent ?? m.conteudoSugerido}
                                    onChange={e => updateImprovementContent(m.id, e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    className="w-full rounded-xl text-[11px] p-4 resize-y"
                                    rows={4}
                                    style={{ background: "#111827", color: "#E2E8F0", border: "1px solid rgba(255,255,255,0.08)", outline: "none" }}
                                  />
                                ) : (
                                  <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
                                    <p className="text-[11px] leading-[1.8]" style={{ color: "#E2E8F0" }}>{m.editedContent || m.conteudoSugerido}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Action buttons for pending */}
                            {isPending && (
                              <div className="flex gap-3" onClick={e => e.stopPropagation()}>
                                {!hasDeepAnalysis && (
                                  <button onClick={() => runDeepAnalysis(m.id)}
                                    className="px-5 py-3 rounded-xl text-[12px] font-bold transition-all hover:scale-[1.02]"
                                    style={{ color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.05)" }}>
                                    <Search className="w-4 h-4 inline mr-1.5" />Análise Profunda
                                  </button>
                                )}
                                <button onClick={() => handleImprovement(m.id, "approved")}
                                  className="flex-1 py-3 rounded-xl text-[12px] font-bold transition-all hover:scale-[1.02]"
                                  style={{ background: "linear-gradient(135deg, #10B981, #06B6D4)", color: "#000" }}>
                                  <CheckCircle2 className="w-4 h-4 inline mr-1.5" />Aprovar e implementar
                                </button>
                                <button onClick={() => handleImprovement(m.id, "rejected")}
                                  className="px-6 py-3 rounded-xl text-[12px] font-bold transition-all hover:scale-[1.02]"
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
                        <p className="text-[10px] flex-1" style={{ color: "#E2E8F0" }}>{l}</p>
                        <button onClick={() => convertLacunaToKB(l)}
                          className="text-[8px] px-2 py-1 rounded-lg font-semibold opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
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
                        <p className="text-[10px] flex-1" style={{ color: "#E2E8F0" }}>{ins}</p>
                        <button onClick={() => convertInsightToImprovement(ins)}
                          className="text-[8px] px-2 py-1 rounded-lg font-semibold opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
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
                  <p className="text-[10px] uppercase tracking-[0.1em] font-bold mb-4" style={{ color: "#64748B" }}>
                    <TrendingUp className="w-3.5 h-3.5 inline mr-1.5" />Histórico de Simulações
                  </p>
                  <div className="flex items-end gap-2" style={{ height: 80 }}>
                    {simHistory.slice(0, 10).reverse().map((h, i) => {
                      const maxScore = Math.max(...simHistory.slice(0, 10).map(s => s.scoreGeral), 1);
                      const height = (h.scoreGeral / maxScore) * 100;
                      return (
                        <div key={h.id} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] px-2 py-1 rounded-lg whitespace-nowrap z-10"
                            style={{ background: "#1E293B", color: "#E2E8F0", border: "1px solid rgba(255,255,255,0.1)" }}>
                            {new Date(h.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} · {h.conversao}% conv · {h.melhorias_aprovadas?.length || 0} mel.
                          </div>
                          <div className="w-full rounded-t transition-all duration-300 hover:opacity-80" style={{
                            height: `${height}%`,
                            background: `linear-gradient(180deg, ${sentimentColor(h.scoreGeral)}, ${sentimentColor(h.scoreGeral)}40)`,
                            minHeight: 4,
                          }} />
                          <span className="text-[8px] font-bold tabular-nums" style={{ color: sentimentColor(h.scoreGeral) }}>{h.scoreGeral}</span>
                        </div>
                      );
                    })}
                  </div>
                  {simHistory.length >= 2 && (
                    <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <TrendingUp className="w-3 h-3" style={{ color: simHistory[0].scoreGeral >= simHistory[1].scoreGeral ? "#10B981" : "#EF4444" }} />
                      <p className="text-[10px]" style={{ color: "#94A3B8" }}>
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
