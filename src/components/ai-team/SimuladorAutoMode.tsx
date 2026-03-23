import { useState, useCallback, useRef, useEffect } from "react";
import { Play, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp, Check, X, Square, BarChart3, Zap, User, MessageSquare, Lightbulb, AlertTriangle, Brain, Heart, Shield, Clock, TrendingUp, Send, MapPin, Wallet, Radio, Users } from "lucide-react";
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

interface Improvement {
  id: string; titulo: string; desc: string; impacto: string; agente: string;
  prioridade: "alta" | "media" | "baixa"; status: "pending" | "approved" | "rejected";
}
interface DebriefData {
  scoreGeral: number; resumoExecutivo: string; fraseNathAI: string;
  pontosFortes: string[]; melhorias: Improvement[]; lacunasConhecimento: string[]; insightsCliente: string[];
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
  const [configSections, setConfigSections] = useState<Record<string, boolean>>({ volume: true, perfis: false, cenario: false, comportamento: false, avancado: false });

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

  const chatRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef(false);
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

  const toggleSection = (s: string) => setConfigSections(p => ({ ...p, [s]: !p[s] }));
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
    setSelectedLeadId(null); setDebrief(null); abortRef.current = false;

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
      if (abortRef.current) break;

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
          if (abortRef.current || forceLoss) break;

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

  const stopSimulation = () => { abortRef.current = true; setRunning(false); if (timerRef.current) clearInterval(timerRef.current); setPhase("report"); };

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
      const prompt = `Analise esta simulação de agência de viagens com leads inteligentes (IA dinâmica) e retorne JSON válido com: scoreGeral (0-100), resumoExecutivo (3-4 frases detalhadas sobre performance), fraseNathAI (frase motivacional da gestora), pontosFortes (array strings detalhadas), melhorias (array com titulo, desc, impacto, agente, prioridade alta/media/baixa), lacunasConhecimento (array strings), insightsCliente (array strings sobre padrões de comportamento dos leads).\n\nStats: ${leads.length} leads, ${closedLeads.length} fechados, ${lostLeads.length} perdidos, R$${totalReceita} receita, ${totalObjecoes} objeções (${totalContornadas} contornadas), sentimento médio: ${avgSentimento}/100.\n\nPerdas por perfil: ${lostLeads.map(l => `${l.perfil.label} em ${l.etapaPerda}: ${l.motivoPerda?.slice(0, 80)}`).join(" | ")}\n\nConversas:\n${JSON.stringify(sampleConvos)}`;
      const resp = await callAgent("Voce e analista de qualidade de agencia de viagens premium. Retorne SOMENTE JSON válido sem markdown.", [{ role: "user", content: prompt }]);
      const jsonMatch = resp.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        setDebrief({
          scoreGeral: data.scoreGeral || 0, resumoExecutivo: data.resumoExecutivo || "",
          fraseNathAI: data.fraseNathAI || "",
          pontosFortes: data.pontosFortes || [],
          melhorias: (data.melhorias || []).map((m: any, i: number) => ({ id: `imp-${i}`, titulo: m.titulo, desc: m.desc || m.descricao || "", impacto: m.impacto || "", agente: m.agente || "", prioridade: m.prioridade || "media", status: "pending" as const })),
          lacunasConhecimento: data.lacunasConhecimento || [],
          insightsCliente: data.insightsCliente || [],
        });
      }
    } catch { toast({ title: "Erro ao gerar debrief", variant: "destructive" }); }
    finally { setDebriefLoading(false); }
  }, [leads, closedLeads, lostLeads, totalReceita, totalObjecoes, totalContornadas, avgSentimento, toast]);

  useEffect(() => { if (phase === "report" && !debrief && !debriefLoading) generateDebrief(); }, [phase]);

  const handleImprovement = (id: string, action: "approved" | "rejected") => {
    if (!debrief) return;
    setDebrief({ ...debrief, melhorias: debrief.melhorias.map(m => m.id === id ? { ...m, status: action } : m) });
    toast({ title: action === "approved" ? "Melhoria aprovada" : "Melhoria rejeitada", description: action === "approved" ? "Enviada ao Evolution Engine" : "" });
  };
  const approveAll = () => {
    if (!debrief) return;
    setDebrief({ ...debrief, melhorias: debrief.melhorias.map(m => ({ ...m, status: "approved" as const })) });
    toast({ title: `${debrief.melhorias.length} melhorias aprovadas` });
  };

  // Sentiment color helper
  const sentimentColor = (s: number) => s >= 70 ? "#10B981" : s >= 40 ? "#F59E0B" : "#EF4444";
  const sentimentLabel = (s: number) => s >= 80 ? "Empolgado" : s >= 60 ? "Satisfeito" : s >= 40 ? "Neutro" : s >= 20 ? "Impaciente" : "Desistindo";

  // ===== CONFIG SECTION =====
  const ConfigSection = ({ id, title, icon, accentColor, children }: { id: string; title: string; icon?: React.ReactNode; accentColor?: string; children: React.ReactNode }) => (
    <div className="rounded-2xl overflow-hidden transition-all duration-300 relative" style={{
      background: "linear-gradient(135deg, rgba(13,18,32,0.9), rgba(13,18,32,0.7))",
      border: `1px solid ${configSections[id] ? (accentColor || "#10B981") + "30" : "rgba(255,255,255,0.06)"}`,
      backdropFilter: "blur(8px)",
    }}>
      {configSections[id] && <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${accentColor || "#10B981"}, transparent)` }} />}
      <button onClick={() => toggleSection(id)} className="w-full flex items-center justify-between px-5 py-3.5 relative">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-[11px] uppercase tracking-[0.1em] font-bold" style={{ color: configSections[id] ? (accentColor || "#10B981") : "#64748B" }}>{title}</p>
        </div>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.03)" }}>
          {configSections[id] ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "#64748B" }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: "#64748B" }} />}
        </div>
      </button>
      {configSections[id] && <div className="px-5 pb-5 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">{children}</div>}
    </div>
  );

  // ===== RENDER: CONFIG =====
  if (phase === "config") {
    return (
      <div className="space-y-4 max-w-4xl animate-in fade-in slide-in-from-bottom-3 duration-500">
        {/* Volume */}
        <ConfigSection id="volume" title="Volume e Tempo" accentColor="#3B82F6" icon={<BarChart3 className="w-3.5 h-3.5" style={{ color: "#3B82F6" }} />}>
          <div className="grid grid-cols-2 gap-5">
            {[
              { label: "Leads", value: numLeads, setter: setNumLeads, min: 1, max: 100, step: 1, color: "#3B82F6" },
              { label: "Msgs por lead", value: msgsPerLead, setter: setMsgsPerLead, min: 4, max: 40, step: 2, color: "#10B981" },
              { label: "Intervalo (s)", value: intervalSec, setter: setIntervalSec, min: 0, max: 30, step: 1, color: "#F59E0B", suffix: "s" },
              { label: "Duração máx", value: duration, setter: setDuration, min: 30, max: 1800, step: 30, color: "#8B5CF6", format: true },
            ].map(s => (
              <div key={s.label}>
                <span className="text-[11px] block mb-2" style={{ color: "#94A3B8" }}>{s.label}</span>
                <Slider min={s.min} max={s.max} step={s.step} value={[s.value]} onValueChange={v => s.setter(v[0])} />
                <p className="text-[24px] font-extrabold tabular-nums text-right mt-1.5" style={{ color: s.color, textShadow: `0 0 20px ${s.color}20` }}>
                  {s.format ? formatTime(s.value) : `${s.value}${s.suffix || ""}`}
                </p>
              </div>
            ))}
          </div>
        </ConfigSection>

        {/* Profiles */}
        <ConfigSection id="perfis" title="Perfis Psicológicos (8 tipos)" accentColor="#F59E0B" icon={<Brain className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />}>
          <div className="grid grid-cols-4 gap-2">
            {PERFIS_INTELIGENTES.map(p => {
              const active = selectedProfiles.includes(p.tipo);
              return (
                <button key={p.tipo} onClick={() => toggleMulti(selectedProfiles, p.tipo, setSelectedProfiles)}
                  className="text-left rounded-xl p-3 transition-all duration-300 hover:scale-[1.02] relative overflow-hidden"
                  style={{
                    background: active ? `${p.cor}08` : "rgba(255,255,255,0.015)",
                    border: `1px solid ${active ? `${p.cor}30` : "rgba(255,255,255,0.04)"}`,
                  }}>
                  {active && <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: p.cor }} />}
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">{p.emoji}</span>
                    <span className="text-[10px] font-bold" style={{ color: active ? p.cor : "#E2E8F0" }}>{p.label}</span>
                  </div>
                  <p className="text-[8px] mt-1 leading-snug" style={{ color: "#64748B" }}>{p.descricaoPsicologica.slice(0, 60)}...</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: `${p.cor}10`, color: p.cor }}>{p.convRate}% conv.</span>
                    <span className="text-[8px]" style={{ color: "#475569" }}>{p.velocidadeResposta.min/1000}-{p.velocidadeResposta.max/1000}s</span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 mt-2">
            {[{ id: "random", label: "Aleatório" }, { id: "roundrobin", label: "Round-robin" }].map(m => (
              <button key={m.id} onClick={() => setProfileMode(m.id as any)}
                className="text-[10px] px-4 py-2 rounded-xl font-semibold transition-all"
                style={{ background: profileMode === m.id ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.02)", border: `1px solid ${profileMode === m.id ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.04)"}`, color: profileMode === m.id ? "#10B981" : "#64748B" }}>{m.label}</button>
            ))}
          </div>
          <div>
            <p className="text-[10px] mb-2" style={{ color: "#94A3B8" }}>Destinos</p>
            <div className="flex flex-wrap gap-1.5">
              {DESTINOS_LEAD.map(d => (
                <button key={d} onClick={() => toggleMulti(selectedDestinos, d, setSelectedDestinos)}
                  className="text-[9px] px-2.5 py-1.5 rounded-lg font-medium transition-all"
                  style={{ background: selectedDestinos.includes(d) ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.02)", border: `1px solid ${selectedDestinos.includes(d) ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.04)"}`, color: selectedDestinos.includes(d) ? "#F59E0B" : "#64748B" }}>{d}</button>
              ))}
            </div>
          </div>
        </ConfigSection>

        {/* Behavior */}
        <ConfigSection id="comportamento" title="Comportamento & Funil" accentColor="#8B5CF6" icon={<Zap className="w-3.5 h-3.5" style={{ color: "#8B5CF6" }} />}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px]" style={{ color: "#94A3B8" }}>Taxa alvo de conversão</span>
                <span className="text-[13px] font-bold" style={{ color: conversionOverride !== null ? "#10B981" : "#64748B" }}>
                  {conversionOverride !== null ? `${conversionOverride}%` : "Natural"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Slider min={0} max={100} step={5} value={[conversionOverride ?? 50]} onValueChange={v => setConversionOverride(v[0])} disabled={conversionOverride === null} />
                <button onClick={() => setConversionOverride(conversionOverride === null ? 50 : null)}
                  className="text-[9px] px-3 py-1.5 rounded-lg shrink-0 font-semibold transition-all"
                  style={{ background: conversionOverride !== null ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.02)", border: `1px solid ${conversionOverride !== null ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.04)"}`, color: conversionOverride !== null ? "#10B981" : "#64748B" }}>
                  {conversionOverride !== null ? "Override" : "Natural"}
                </button>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px]" style={{ color: "#94A3B8" }}>Densidade de objeções</span>
                <span className="text-[13px] font-bold" style={{ color: "#F59E0B" }}>{objectionDensity}%</span>
              </div>
              <Slider min={0} max={100} step={5} value={[objectionDensity]} onValueChange={v => setObjectionDensity(v[0])} />
            </div>
          </div>
          <div>
            <p className="text-[10px] mb-2" style={{ color: "#94A3B8" }}>Velocidade</p>
            <div className="flex gap-2">
              {SPEED_OPTIONS.map(s => (
                <button key={s.id} onClick={() => setSpeed(s.id)}
                  className="text-[10px] px-3 py-2 rounded-xl font-semibold flex-1 transition-all"
                  style={{ background: speed === s.id ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.02)", border: `1px solid ${speed === s.id ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.04)"}`, color: speed === s.id ? "#10B981" : "#64748B" }}>{s.label}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] mb-2" style={{ color: "#94A3B8" }}>Agentes do funil</p>
            <div className="flex gap-2 mb-2">
              {[{ id: "full", label: "Funil completo" }, { id: "comercial", label: "Só comercial" }, { id: "custom", label: "Personalizado" }].map(m => (
                <button key={m.id} onClick={() => setFunnelMode(m.id as any)}
                  className="text-[10px] px-4 py-2 rounded-xl font-semibold transition-all"
                  style={{ background: funnelMode === m.id ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.02)", border: `1px solid ${funnelMode === m.id ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.04)"}`, color: funnelMode === m.id ? "#8B5CF6" : "#64748B" }}>{m.label}</button>
              ))}
            </div>
            {funnelMode === "custom" && (
              <div className="flex flex-wrap gap-1.5 animate-in fade-in duration-200">
                {AGENTS_V4.map(a => {
                  const active = customFunnelAgents.includes(a.id); const c = getAgentColor(a);
                  return (
                    <button key={a.id} onClick={() => toggleMulti(customFunnelAgents, a.id, setCustomFunnelAgents)}
                      className="text-[9px] px-2.5 py-1.5 rounded-lg font-medium transition-all"
                      style={{ background: active ? `${c}10` : "rgba(255,255,255,0.02)", border: `1px solid ${active ? `${c}30` : "rgba(255,255,255,0.04)"}`, color: active ? c : "#64748B" }}>{a.name}</button>
                  );
                })}
              </div>
            )}
          </div>
        </ConfigSection>

        {/* Advanced */}
        <ConfigSection id="avancado" title="Motor IA Avançado" accentColor="#EC4899" icon={<Brain className="w-3.5 h-3.5" style={{ color: "#EC4899" }} />}>
          <div className="space-y-3">
            {[
              { label: "Avaliação IA em tempo real", desc: "Lead julga qualidade de cada resposta e ajusta sentimento", value: enableEvaluation, setter: setEnableEvaluation, color: "#EC4899" },
              { label: "Multi-mensagem por perfil", desc: "Ansioso e Sonhador enviam múltiplas msgs seguidas", value: enableMultiMsg, setter: setEnableMultiMsg, color: "#F59E0B" },
            ].map(opt => (
              <button key={opt.label} onClick={() => opt.setter(!opt.value)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                style={{
                  background: opt.value ? `${opt.color}06` : "rgba(255,255,255,0.015)",
                  border: `1px solid ${opt.value ? `${opt.color}25` : "rgba(255,255,255,0.04)"}`,
                }}>
                <div className="w-8 h-5 rounded-full relative transition-all" style={{ background: opt.value ? opt.color : "rgba(255,255,255,0.1)" }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all" style={{ left: opt.value ? 16 : 2, background: "#fff" }} />
                </div>
                <div>
                  <p className="text-[11px] font-bold" style={{ color: opt.value ? opt.color : "#94A3B8" }}>{opt.label}</p>
                  <p className="text-[9px]" style={{ color: "#64748B" }}>{opt.desc}</p>
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
        </ConfigSection>

        {/* Start */}
        <button onClick={runSimulation}
          className="w-full py-4 rounded-2xl text-sm font-bold transition-all duration-300 relative overflow-hidden group"
          style={{ background: "linear-gradient(135deg, #10B981, #06B6D4)", color: "#000", boxShadow: "0 8px 32px rgba(16,185,129,0.3)" }}
          onMouseEnter={e => { (e.target as HTMLElement).style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.transform = "translateY(0)"; }}>
          <Brain className="w-4 h-4 inline mr-2" />
          Iniciar Simulação IA · {numLeads} leads inteligentes · {formatTime(duration)}
        </button>
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
        <div className="flex items-center gap-2 mb-4">
          {(["numeros", "conversas", "debrief"] as ReportTab[]).map(t => {
            const active = reportTab === t;
            const accent = t === "debrief" ? "#8B5CF6" : t === "numeros" ? "#3B82F6" : "#10B981";
            return (
              <button key={t} onClick={() => setReportTab(t)}
                className="text-[11px] px-5 py-2.5 rounded-xl font-bold transition-all duration-300"
                style={{ background: active ? `${accent}10` : "rgba(255,255,255,0.02)", border: `1px solid ${active ? `${accent}30` : "rgba(255,255,255,0.04)"}`, color: active ? accent : "#64748B" }}>
                {t === "numeros" ? "📊 Números" : t === "conversas" ? "💬 Conversas" : "🧠 Debrief IA"}
              </button>
            );
          })}
          <button onClick={() => { setPhase("config"); setLeads([]); setDebrief(null); }}
            className="ml-auto text-[10px] px-4 py-2 rounded-xl font-semibold transition-all"
            style={{ border: "1px solid rgba(255,255,255,0.06)", color: "#64748B", background: "rgba(255,255,255,0.02)" }}>Nova Simulação</button>
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
                      <div key={i} className={cn("flex gap-2 animate-in duration-300", isAgent ? "justify-start slide-in-from-left-3" : "justify-end slide-in-from-right-3")}>
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
              <p className="text-[13px]" style={{ color: "#64748B" }}>Gerando Debrief IA com análise de leads inteligentes...</p>
            </div>
          )}
          {debrief && (
            <>
              <div className="flex gap-4">
                <div className="rounded-2xl p-6 text-center relative overflow-hidden" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${sentimentColor(debrief.scoreGeral)}, transparent)` }} />
                  <div className="relative w-28 h-28 mx-auto">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15" fill="none" stroke={sentimentColor(debrief.scoreGeral)}
                        strokeWidth="3" strokeDasharray={`${debrief.scoreGeral * 0.94} 100`} strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 6px ${sentimentColor(debrief.scoreGeral)})` }} />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[32px] font-extrabold" style={{ color: sentimentColor(debrief.scoreGeral) }}>{debrief.scoreGeral}</span>
                  </div>
                  <p className="text-[9px] uppercase tracking-[0.12em] mt-2" style={{ color: "#64748B" }}>Score Geral</p>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="rounded-2xl p-5" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
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
              {debrief.pontosFortes.length > 0 && (
                <div className="rounded-2xl p-5" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-[10px] uppercase tracking-[0.1em] font-bold mb-3" style={{ color: "#64748B" }}>Pontos Fortes</p>
                  {debrief.pontosFortes.map((p, i) => (
                    <div key={i} className="flex items-start gap-2.5 py-1.5">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#10B981" }} />
                      <p className="text-[11px] leading-relaxed" style={{ color: "#E2E8F0" }}>{p}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-2xl p-5" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] uppercase tracking-[0.1em] font-bold" style={{ color: "#64748B" }}>Melhorias Sugeridas</p>
                  <button onClick={approveAll} className="text-[9px] px-3 py-1.5 rounded-xl font-bold transition-all hover:scale-105"
                    style={{ background: "rgba(16,185,129,0.08)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}>Aprovar Tudo</button>
                </div>
                <div className="space-y-2.5">
                  {debrief.melhorias.map(m => (
                    <div key={m.id} className="rounded-xl p-4 transition-all" style={{
                      background: "rgba(255,255,255,0.015)",
                      border: `1px solid ${m.status === "approved" ? "rgba(16,185,129,0.2)" : m.status === "rejected" ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.04)"}`,
                      opacity: m.status === "rejected" ? 0.5 : 1,
                    }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <p className="text-[12px] font-bold" style={{ color: "#F1F5F9" }}>{m.titulo}</p>
                            <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-lg"
                              style={{ background: m.prioridade === "alta" ? "rgba(239,68,68,0.08)" : m.prioridade === "media" ? "rgba(245,158,11,0.08)" : "rgba(59,130,246,0.08)", color: m.prioridade === "alta" ? "#EF4444" : m.prioridade === "media" ? "#F59E0B" : "#3B82F6" }}>{m.prioridade}</span>
                          </div>
                          <p className="text-[10px]" style={{ color: "#94A3B8" }}>{m.desc}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-[9px]" style={{ color: "#8B5CF6" }}>Agente: {m.agente}</span>
                            <span className="text-[9px]" style={{ color: "#10B981" }}>Impacto: {m.impacto}</span>
                          </div>
                        </div>
                        {m.status === "pending" && (
                          <div className="flex gap-1.5 shrink-0">
                            <button onClick={() => handleImprovement(m.id, "approved")} className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                              style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}><Check className="w-4 h-4" style={{ color: "#10B981" }} /></button>
                            <button onClick={() => handleImprovement(m.id, "rejected")} className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}><X className="w-4 h-4" style={{ color: "#EF4444" }} /></button>
                          </div>
                        )}
                        {m.status === "approved" && <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "#10B981" }} />}
                        {m.status === "rejected" && <XCircle className="w-5 h-5 shrink-0" style={{ color: "#EF4444" }} />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {debrief.lacunasConhecimento.length > 0 && (
                  <div className="rounded-2xl p-5" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-[10px] uppercase tracking-[0.1em] font-bold mb-3" style={{ color: "#64748B" }}>Lacunas de Conhecimento</p>
                    {debrief.lacunasConhecimento.map((l, i) => (
                      <div key={i} className="flex items-start gap-2.5 py-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#F59E0B" }} />
                        <p className="text-[10px]" style={{ color: "#E2E8F0" }}>{l}</p>
                      </div>
                    ))}
                  </div>
                )}
                {debrief.insightsCliente.length > 0 && (
                  <div className="rounded-2xl p-5" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-[10px] uppercase tracking-[0.1em] font-bold mb-3" style={{ color: "#64748B" }}>Insights de Comportamento</p>
                    {debrief.insightsCliente.map((ins, i) => (
                      <div key={i} className="flex items-start gap-2.5 py-1.5">
                        <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#06B6D4" }} />
                        <p className="text-[10px]" style={{ color: "#E2E8F0" }}>{ins}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={generateDebrief} className="text-[10px] px-5 py-2.5 rounded-xl font-semibold transition-all hover:scale-[1.02]"
                  style={{ border: "1px solid rgba(255,255,255,0.06)", color: "#64748B", background: "rgba(255,255,255,0.02)" }}>
                  <Loader2 className={cn("w-3 h-3 inline mr-1.5", debriefLoading && "animate-spin")} /> Reanalisar
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
