import { useState, useCallback, useRef, useEffect } from "react";
import { Play, Loader2, CheckCircle2, Star, XCircle, ChevronRight, Zap, BarChart3, Clock, Square, ChevronDown, ChevronUp, Check, X, Trophy, TrendingUp, AlertTriangle, Lightbulb, MessageSquare, Filter, User, Send } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { AGENTS_V4, SQUADS } from "@/components/ai-team/agentsV4Data";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// ===== PROFILES =====
const CLIENT_PROFILES = [
  { id: "sonhador", name: "Sonhador", emoji: "🌟", color: "#F59E0B", convRate: 40, description: "Empolgado, sem budget definido",
    prompt: "Voce e Juliana, cliente sonhadora. Quer uma viagem dos sonhos, sem definir budget. Usa muitos emojis e palavras como \"incrivel\", \"perfeito\", \"sonho da minha vida\". Nao tem destino definido, aceita sugestoes. Casal. Responda de forma entusiasmada e emotiva." },
  { id: "indeciso", name: "Indeciso", emoji: "🤔", color: "#06B6D4", convRate: 30, description: "Precisa de orientação",
    prompt: "Voce e Ana, cliente indecisa. Quer viajar mas nao sabe pra onde. Muda de ideia. Casal, R$20mil total. Usa \"mas sera que...\" e \"nao sei se...\". Precisa de orientacao firme." },
  { id: "desconfiado", name: "Desconfiado", emoji: "😒", color: "#64748B", convRate: 25, description: "Questiona tudo",
    prompt: "Voce e Fabio, cliente desconfiado. Questiona TUDO: \"isso e confiavel?\", pede CNPJ, referencias. Familia com 2 filhos." },
  { id: "pechincheiro", name: "Pechincheiro", emoji: "💸", color: "#10B981", convRate: 35, description: "Sempre acha caro",
    prompt: "Voce e Roberto, SEMPRE pede desconto. Compara com CVC e Decolar. Negocia tudo." },
  { id: "familia", name: "Família", emoji: "👨‍👩‍👧‍👦", color: "#3B82F6", convRate: 60, description: "Segurança e conforto",
    prompt: "Voce e Patricia, mae de familia. Viagem com marido e 2 filhos. Preocupada com seguranca, hotel com piscina infantil." },
  { id: "lua-mel", name: "Lua de Mel", emoji: "💑", color: "#EC4899", convRate: 90, description: "Experiência romântica",
    prompt: "Voce e Marina, recém noiva. Quer lua de mel PERFEITA. Pede surpresas, experiencias exclusivas." },
  { id: "corporativo", name: "Corporativo", emoji: "🏢", color: "#8B5CF6", convRate: 70, description: "Objetividade",
    prompt: "Voce e Ricardo, executivo. Viagem de negocios para Nova York, 5 dias. Respostas curtas e diretas." },
  { id: "reclamacao", name: "Reclamação", emoji: "😡", color: "#EF4444", convRate: 15, description: "Quer solução imediata",
    prompt: "Voce e Carlos, cliente com problema. Hotel diferente do prometido. Frustrado e exigindo solucao AGORA." },
];

const DESTINOS_ALL = ["Dubai", "Orlando", "Europa", "Maldivas", "Caribe", "Japão", "Egito", "Tailândia", "Nova York", "Paris", "Grécia", "Bali", "Cancún", "Lisboa", "Seychelles"];
const BUDGETS = ["R$5k-10k", "R$10k-15k", "R$15k-25k", "R$25k-50k", "R$50k+"];
const CANAIS = ["Instagram DM", "WhatsApp", "Site", "Indicação", "Google", "TikTok"];
const GRUPOS = ["1 pessoa", "Casal", "Família", "Grupo amigos", "Corporativo", "Lua de mel"];
const SPEED_OPTIONS = [{ id: "lenta", label: "Lenta", delay: 5000 }, { id: "normal", label: "Normal", delay: 2500 }, { id: "rapida", label: "Rápida", delay: 500 }, { id: "instant", label: "Instantâneo", delay: 0 }];

// ===== TYPES =====
interface ChatMessage { role: "client" | "agent"; content: string; agentName?: string; }
interface Lead {
  id: string; name: string; destino: string; profileId: string; profileName: string; profileEmoji: string; profileColor: string;
  budget: string; canal: string; grupo: string; messages: ChatMessage[]; status: "active" | "closed" | "lost";
  stage: string; score: number; receita: number; objecoes: number; objecoesContornadas: number; startedAt: Date;
}
interface Improvement {
  id: string; titulo: string; desc: string; impacto: string; agente: string; prioridade: "alta" | "media" | "baixa";
  status: "pending" | "approved" | "rejected";
}
interface DebriefData {
  scoreGeral: number; resumoExecutivo: string; fraseNathAI: string;
  pontosFortes: string[]; melhorias: Improvement[]; lacunasConhecimento: string[]; insightsCliente: string[];
}
type Phase = "config" | "running" | "report";
type ReportTab = "numeros" | "conversas" | "debrief";

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

function buildAgentSysPrompt(agent: typeof AGENTS_V4[0], hasNext: boolean) {
  return `${agent.persona}\nVoce conversa como ${agent.name} (${agent.role}) da agencia NatLeva pelo WhatsApp.\n${hasNext ? "Quando completar objetivo, termine com [TRANSFERIR].\n" : ""}Responda APENAS a ultima mensagem. Breve (1-3 frases).`;
}
function buildClientSysPrompt(profile: typeof CLIENT_PROFILES[0], isFirst: boolean) {
  return `${profile.prompt}\nVoce conversa com NatLeva pelo WhatsApp.\n${isFirst ? "PRIMEIRA mensagem. Inicie naturalmente." : "Responda a ultima msg. Breve. Mantenha perfil."}`;
}

const NAMES = ["Carlos M.", "Ana B.", "Roberto S.", "Eduardo L.", "Juliana F.", "Patricia G.", "Marina C.", "Fabio R.", "Ricardo V.", "Camila T.", "Lucas H.", "Beatriz N."];

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

const getAgentColor = (agent: typeof AGENTS_V4[0]) => {
  const c: Record<string, string> = { orquestracao: "#10B981", comercial: "#F59E0B", atendimento: "#3B82F6", financeiro: "#8B5CF6", operacional: "#06B6D4", demanda: "#EF4444", retencao: "#EC4899" };
  return c[agent.squadId] || "#10B981";
};

// ===== COMPONENT =====
export default function SimuladorAutoMode() {
  // Config state
  const [totalMsgs, setTotalMsgs] = useState(200);
  const [duration, setDuration] = useState(180);
  const [msgsPerLead, setMsgsPerLead] = useState(14);
  const [msgsPerLeadLocked, setMsgsPerLeadLocked] = useState(false);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [profileMode, setProfileMode] = useState<"random" | "forced" | "roundrobin">("random");
  const [selectedDestinos, setSelectedDestinos] = useState<string[]>([]);
  const [selectedBudgets, setSelectedBudgets] = useState<string[]>([]);
  const [selectedCanais, setSelectedCanais] = useState<string[]>([]);
  const [selectedGrupos, setSelectedGrupos] = useState<string[]>([]);
  const [conversionOverride, setConversionOverride] = useState<number | null>(null);
  const [objectionDensity, setObjectionDensity] = useState(50);
  const [speed, setSpeed] = useState("normal");
  const [funnelMode, setFunnelMode] = useState<"full" | "comercial" | "custom">("full");
  const [customFunnelAgents, setCustomFunnelAgents] = useState<string[]>([]);
  const [configSections, setConfigSections] = useState<Record<string, boolean>>({ volume: true, perfis: false, comportamento: false });

  // Runtime state
  const [phase, setPhase] = useState<Phase>("config");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [events, setEvents] = useState<{ id: string; color: string; text: string; time: string }[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  // Report state
  const [reportTab, setReportTab] = useState<ReportTab>("numeros");
  const [debrief, setDebrief] = useState<DebriefData | null>(null);
  const [debriefLoading, setDebriefLoading] = useState(false);
  const [leadFilter, setLeadFilter] = useState<"all" | "active" | "closed" | "lost">("all");

  const chatRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  // Computed
  const estLeads = msgsPerLeadLocked ? Math.floor(totalMsgs / msgsPerLead) : Math.max(1, Math.floor(totalMsgs / 14));
  const autoMsgsPerLead = msgsPerLeadLocked ? msgsPerLead : Math.round(totalMsgs / estLeads);
  const interval = estLeads > 1 ? Math.round(duration / estLeads) : duration;
  const selectedLead = leads.find(l => l.id === selectedLeadId) || null;

  // KPIs
  const closedLeads = leads.filter(l => l.status === "closed");
  const lostLeads = leads.filter(l => l.status === "lost");
  const totalReceita = closedLeads.reduce((s, l) => s + l.receita, 0);
  const conversionRate = leads.length > 0 ? Math.round((closedLeads.length / leads.length) * 100) : 0;
  const totalObjecoes = leads.reduce((s, l) => s + l.objecoes, 0);
  const totalContornadas = leads.reduce((s, l) => s + l.objecoesContornadas, 0);
  const ticketMedio = closedLeads.length > 0 ? Math.round(totalReceita / closedLeads.length) : 0;

  const animLeads = useCountUp(leads.length);
  const animClosed = useCountUp(closedLeads.length);
  const animReceita = useCountUp(Math.round(totalReceita / 1000));

  // Filtered leads for report
  const filteredLeads = leadFilter === "all" ? leads : leads.filter(l => l.status === leadFilter);

  const toggleSection = (s: string) => setConfigSections(p => ({ ...p, [s]: !p[s] }));
  const toggleMulti = (arr: string[], id: string, setter: (v: string[]) => void) => {
    setter(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const addEvent = (color: string, text: string) => {
    setEvents(prev => [{ id: crypto.randomUUID(), color, text, time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }, ...prev].slice(0, 20));
  };

  // ===== RUN SIMULATION =====
  const runSimulation = useCallback(async () => {
    setPhase("running");
    setRunning(true);
    setLeads([]);
    setEvents([]);
    setElapsedSeconds(0);
    setSelectedLeadId(null);
    setDebrief(null);

    timerRef.current = setInterval(() => setElapsedSeconds(p => p + 1), 1000);

    const profiles = selectedProfiles.length > 0 ? CLIENT_PROFILES.filter(p => selectedProfiles.includes(p.id)) : CLIENT_PROFILES;
    const destinos = selectedDestinos.length > 0 ? selectedDestinos : DESTINOS_ALL;
    const budgets = selectedBudgets.length > 0 ? selectedBudgets : BUDGETS;
    const canais = selectedCanais.length > 0 ? selectedCanais : CANAIS;
    const grupos = selectedGrupos.length > 0 ? selectedGrupos : GRUPOS;
    const speedDelay = SPEED_OPTIONS.find(s => s.id === speed)?.delay ?? 2500;

    const funnelAgents = funnelMode === "full"
      ? AGENTS_V4.filter(a => ["comercial", "atendimento", "operacional"].includes(a.squadId)).slice(0, 6)
      : funnelMode === "comercial"
        ? AGENTS_V4.filter(a => a.squadId === "comercial")
        : customFunnelAgents.map(id => AGENTS_V4.find(a => a.id === id)!).filter(Boolean);

    if (funnelAgents.length === 0) {
      toast({ title: "Selecione agentes para o funil", variant: "destructive" });
      setRunning(false); setPhase("config");
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const numLeads = estLeads;
    const msgsPerL = autoMsgsPerLead;
    const allNewLeads: Lead[] = [];

    for (let i = 0; i < numLeads; i++) {
      const profile = profileMode === "roundrobin" ? profiles[i % profiles.length] : profiles[Math.floor(Math.random() * profiles.length)];
      const destino = destinos[Math.floor(Math.random() * destinos.length)];
      const budget = budgets[Math.floor(Math.random() * budgets.length)];
      const canal = canais[Math.floor(Math.random() * canais.length)];
      const grupo = grupos[Math.floor(Math.random() * grupos.length)];
      const name = NAMES[i % NAMES.length];

      const willClose = conversionOverride !== null ? Math.random() * 100 < conversionOverride : Math.random() * 100 < profile.convRate;
      const willObject = Math.random() * 100 < objectionDensity;
      const receita = willClose ? (10000 + Math.floor(Math.random() * 40000)) : 0;

      const lead: Lead = {
        id: crypto.randomUUID(), name, destino, profileId: profile.id, profileName: profile.name,
        profileEmoji: profile.emoji, profileColor: profile.color, budget, canal, grupo,
        messages: [], status: "active", stage: "recepcao", score: 0, receita,
        objecoes: willObject ? 1 + Math.floor(Math.random() * 3) : 0,
        objecoesContornadas: 0, startedAt: new Date(),
      };

      allNewLeads.push(lead);
      setLeads([...allNewLeads]);
      if (!selectedLeadId) setSelectedLeadId(lead.id);
      addEvent("#3B82F6", `${name} entrou via ${canal}`);

      // Simulate conversation
      let agentIdx = 0;
      const stages = ["recepcao", "qualificacao", "especialista", "proposta", "fechamento", "posvenda"];

      try {
        // Client first message
        const clientFirst = await callAgent(buildClientSysPrompt(profile, true), []);
        lead.messages.push({ role: "client", content: clientFirst });
        setLeads([...allNewLeads]);
        addEvent("#10B981", `${name}: recepção iniciada`);

        const rounds = Math.min(msgsPerL / 2, 10);
        for (let r = 0; r < rounds; r++) {
          const agent = funnelAgents[agentIdx % funnelAgents.length];
          const hasNext = agentIdx < funnelAgents.length - 1;
          lead.stage = stages[Math.min(agentIdx, stages.length - 1)];

          const agentResp = await callAgent(
            buildAgentSysPrompt(agent, hasNext),
            lead.messages.map(m => ({ role: m.role === "client" ? "user" : "assistant", content: m.content }))
          );
          lead.messages.push({ role: "agent", content: agentResp, agentName: agent.name });
          setLeads([...allNewLeads]);

          if (hasNext && agentResp.includes("[TRANSFERIR]")) {
            agentIdx++;
            const nextAgent = funnelAgents[agentIdx % funnelAgents.length];
            addEvent("#06B6D4", `${agent.name} → ${nextAgent.name}`);
          }

          if (speedDelay > 0) await new Promise(r => setTimeout(r, speedDelay));

          // Client responds
          if (r < rounds - 1) {
            const clientResp = await callAgent(
              buildClientSysPrompt(profile, false),
              lead.messages.map(m => ({ role: m.role === "client" ? "assistant" : "user", content: m.content }))
            );
            lead.messages.push({ role: "client", content: clientResp });
            setLeads([...allNewLeads]);

            // Check for objections
            if (/caro|preço|desconto|concorr/i.test(clientResp)) {
              addEvent("#F59E0B", `Objeção de ${name}: preço`);
              lead.objecoesContornadas++;
            }
          }

          if (speedDelay > 0) await new Promise(r => setTimeout(r, Math.max(100, speedDelay / 2)));
        }

        // Resolve lead
        if (willClose) {
          lead.status = "closed";
          lead.stage = "fechamento";
          addEvent("#EAB308", `🎉 ${name} FECHOU · R$${(lead.receita / 1000).toFixed(0)}k`);
        } else {
          lead.status = "lost";
          lead.stage = stages[Math.min(agentIdx, 3)];
          addEvent("#EF4444", `${name} perdido em ${lead.stage}`);
        }
        lead.score = willClose ? 70 + Math.floor(Math.random() * 30) : 20 + Math.floor(Math.random() * 40);
        setLeads([...allNewLeads]);
      } catch (err) {
        console.error("Lead sim error:", err);
        lead.status = "lost";
        setLeads([...allNewLeads]);
      }

      // Delay before next lead
      if (i < numLeads - 1 && speedDelay > 0) {
        await new Promise(r => setTimeout(r, Math.max(500, interval * 100)));
      }
    }

    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    setPhase("report");
    toast({ title: "Simulação concluída!", description: `${allNewLeads.length} leads processados` });
  }, [totalMsgs, duration, msgsPerLead, msgsPerLeadLocked, selectedProfiles, profileMode, selectedDestinos, selectedBudgets, selectedCanais, selectedGrupos, conversionOverride, objectionDensity, speed, funnelMode, customFunnelAgents, estLeads, autoMsgsPerLead, interval, toast]);

  const stopSimulation = () => {
    setRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("report");
  };

  // Generate debrief
  const generateDebrief = useCallback(async () => {
    setDebriefLoading(true);
    try {
      const sampleConvos = leads.slice(0, 8).map(l => ({
        name: l.name, profile: l.profileName, destino: l.destino, status: l.status,
        msgs: l.messages.slice(0, 10).map(m => `${m.role}: ${m.content.slice(0, 100)}`).join("\n"),
      }));
      const prompt = `Analise esta simulação de agência de viagens premium e retorne JSON válido com: scoreGeral (0-100), resumoExecutivo (2-3 frases), fraseNathAI (frase motivacional), pontosFortes (array strings), melhorias (array com titulo, desc, impacto, agente, prioridade alta/media/baixa), lacunasConhecimento (array strings), insightsCliente (array strings).\n\nStats: ${leads.length} leads, ${closedLeads.length} fechados, ${lostLeads.length} perdidos, R$${totalReceita} receita, ${totalObjecoes} objeções (${totalContornadas} contornadas).\n\nConversas amostra:\n${JSON.stringify(sampleConvos)}`;

      const resp = await callAgent("Voce e analista de qualidade de agencia de viagens premium. Retorne SOMENTE JSON válido sem markdown.", [{ role: "user", content: prompt }]);
      const jsonMatch = resp.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        setDebrief({
          scoreGeral: data.scoreGeral || 0,
          resumoExecutivo: data.resumoExecutivo || "",
          fraseNathAI: data.fraseNathAI || "",
          pontosFortes: data.pontosFortes || [],
          melhorias: (data.melhorias || []).map((m: any, i: number) => ({
            id: `imp-${i}`, titulo: m.titulo, desc: m.desc || m.descricao || "",
            impacto: m.impacto || "", agente: m.agente || "", prioridade: m.prioridade || "media",
            status: "pending" as const,
          })),
          lacunasConhecimento: data.lacunasConhecimento || [],
          insightsCliente: data.insightsCliente || [],
        });
      }
    } catch { toast({ title: "Erro ao gerar debrief", variant: "destructive" }); }
    finally { setDebriefLoading(false); }
  }, [leads, closedLeads, lostLeads, totalReceita, totalObjecoes, totalContornadas, toast]);

  useEffect(() => {
    if (phase === "report" && !debrief && !debriefLoading) generateDebrief();
  }, [phase]);

  const handleImprovement = (id: string, action: "approved" | "rejected") => {
    if (!debrief) return;
    setDebrief({
      ...debrief,
      melhorias: debrief.melhorias.map(m => m.id === id ? { ...m, status: action } : m),
    });
    toast({ title: action === "approved" ? "Melhoria aprovada" : "Melhoria rejeitada", description: action === "approved" ? "Enviada ao Evolution Engine" : "" });
  };

  const approveAll = () => {
    if (!debrief) return;
    setDebrief({ ...debrief, melhorias: debrief.melhorias.map(m => ({ ...m, status: "approved" as const })) });
    toast({ title: `${debrief.melhorias.length} melhorias aprovadas`, description: "Enviadas ao Evolution Engine" });
  };

  // ===== CONFIG SECTION COMPONENT =====
  const ConfigSection = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
    <div className="rounded-xl overflow-hidden" style={{ background: "#0D1220", border: "1px solid #1E293B" }}>
      <button onClick={() => toggleSection(id)} className="w-full flex items-center justify-between px-4 py-3">
        <p className="text-[11px] uppercase tracking-[0.08em] font-bold" style={{ color: "#64748B" }}>{title}</p>
        {configSections[id] ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "#64748B" }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: "#64748B" }} />}
      </button>
      {configSections[id] && <div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  );

  // ===== RENDER =====
  if (phase === "config") {
    return (
      <div className="space-y-4 max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Volume */}
        <ConfigSection id="volume" title="Volume e Tempo">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px]" style={{ color: "#64748B" }}>Total de mensagens</span>
              <span className="text-[24px] font-extrabold tabular-nums" style={{ background: "linear-gradient(135deg, #10B981, #06B6D4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{totalMsgs}</span>
            </div>
            <Slider min={20} max={2000} step={10} value={[totalMsgs]} onValueChange={v => setTotalMsgs(v[0])} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px]" style={{ color: "#64748B" }}>Duração</span>
              <span className="text-[18px] font-bold tabular-nums" style={{ color: "#8B5CF6" }}>{formatTime(duration)}</span>
            </div>
            <Slider min={30} max={1800} step={30} value={[duration]} onValueChange={v => setDuration(v[0])} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px]" style={{ color: "#64748B" }}>Msgs por lead</span>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold tabular-nums" style={{ color: "#F1F5F9" }}>{msgsPerLeadLocked ? msgsPerLead : "Auto"}</span>
                <button onClick={() => setMsgsPerLeadLocked(!msgsPerLeadLocked)} className="text-[9px] px-1.5 py-0.5 rounded"
                  style={{ background: msgsPerLeadLocked ? "#10B98120" : "#1E293B", color: msgsPerLeadLocked ? "#10B981" : "#64748B", border: "1px solid #1E293B" }}>
                  {msgsPerLeadLocked ? "Travado" : "Auto"}
                </button>
              </div>
            </div>
            {msgsPerLeadLocked && <Slider min={6} max={60} step={2} value={[msgsPerLead]} onValueChange={v => setMsgsPerLead(v[0])} />}
          </div>
          {/* Preview card */}
          <div className="grid grid-cols-4 gap-2 p-3 rounded-lg" style={{ background: "#111827", border: "1px solid #1E293B" }}>
            {[
              { label: "LEADS EST.", value: estLeads, color: "#3B82F6" },
              { label: "MSGS/LEAD", value: autoMsgsPerLead, color: "#10B981" },
              { label: "INTERVALO", value: `${interval}s`, color: "#F59E0B" },
              { label: "DURAÇÃO", value: formatTime(duration), color: "#8B5CF6" },
            ].map(k => (
              <div key={k.label} className="text-center">
                <p className="text-[16px] font-extrabold tabular-nums" style={{ color: k.color }}>{k.value}</p>
                <p className="text-[8px] uppercase tracking-wider" style={{ color: "#64748B" }}>{k.label}</p>
              </div>
            ))}
          </div>
        </ConfigSection>

        {/* Profiles */}
        <ConfigSection id="perfis" title="Perfis dos Leads">
          <div className="grid grid-cols-4 gap-2">
            {CLIENT_PROFILES.map(p => {
              const active = selectedProfiles.includes(p.id);
              return (
                <button key={p.id} onClick={() => toggleMulti(selectedProfiles, p.id, setSelectedProfiles)}
                  className="text-left rounded-lg p-2.5 transition-all duration-200"
                  style={{ background: active ? `${p.color}08` : "#111827", border: `1px solid ${active ? p.color : "#1E293B"}` }}>
                  <span className="text-lg">{p.emoji}</span>
                  <p className="text-[10px] font-bold mt-1" style={{ color: active ? p.color : "#F1F5F9" }}>{p.name}</p>
                  <p className="text-[8px]" style={{ color: "#64748B" }}>{p.description}</p>
                </button>
              );
            })}
          </div>
          <div>
            <p className="text-[10px] mb-2" style={{ color: "#64748B" }}>Modo de distribuição</p>
            <div className="flex gap-2">
              {[{ id: "random", label: "Aleatório" }, { id: "forced", label: "Forçado" }, { id: "roundrobin", label: "Round-robin" }].map(m => (
                <button key={m.id} onClick={() => setProfileMode(m.id as any)}
                  className="text-[10px] px-3 py-1.5 rounded-lg font-medium"
                  style={{ background: profileMode === m.id ? "#10B98110" : "#111827", border: `1px solid ${profileMode === m.id ? "#10B981" : "#1E293B"}`, color: profileMode === m.id ? "#10B981" : "#64748B" }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] mb-2" style={{ color: "#64748B" }}>Destinos</p>
            <div className="flex flex-wrap gap-1">
              {DESTINOS_ALL.map(d => (
                <button key={d} onClick={() => toggleMulti(selectedDestinos, d, setSelectedDestinos)}
                  className="text-[9px] px-2 py-1 rounded font-medium"
                  style={{ background: selectedDestinos.includes(d) ? "#F59E0B10" : "transparent", border: `1px solid ${selectedDestinos.includes(d) ? "#F59E0B" : "#1E293B"}`, color: selectedDestinos.includes(d) ? "#F59E0B" : "#64748B" }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] mb-2" style={{ color: "#64748B" }}>Faixa de orçamento</p>
            <div className="flex flex-wrap gap-1">
              {BUDGETS.map(b => (
                <button key={b} onClick={() => toggleMulti(selectedBudgets, b, setSelectedBudgets)}
                  className="text-[9px] px-2 py-1 rounded font-medium"
                  style={{ background: selectedBudgets.includes(b) ? "#10B98110" : "transparent", border: `1px solid ${selectedBudgets.includes(b) ? "#10B981" : "#1E293B"}`, color: selectedBudgets.includes(b) ? "#10B981" : "#64748B" }}>
                  {b}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] mb-2" style={{ color: "#64748B" }}>Origens de canal</p>
            <div className="flex flex-wrap gap-1">
              {CANAIS.map(c => (
                <button key={c} onClick={() => toggleMulti(selectedCanais, c, setSelectedCanais)}
                  className="text-[9px] px-2 py-1 rounded font-medium"
                  style={{ background: selectedCanais.includes(c) ? "#3B82F610" : "transparent", border: `1px solid ${selectedCanais.includes(c) ? "#3B82F6" : "#1E293B"}`, color: selectedCanais.includes(c) ? "#3B82F6" : "#64748B" }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] mb-2" style={{ color: "#64748B" }}>Grupos de viajantes</p>
            <div className="flex flex-wrap gap-1">
              {GRUPOS.map(g => (
                <button key={g} onClick={() => toggleMulti(selectedGrupos, g, setSelectedGrupos)}
                  className="text-[9px] px-2 py-1 rounded font-medium"
                  style={{ background: selectedGrupos.includes(g) ? "#8B5CF610" : "transparent", border: `1px solid ${selectedGrupos.includes(g) ? "#8B5CF6" : "#1E293B"}`, color: selectedGrupos.includes(g) ? "#8B5CF6" : "#64748B" }}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </ConfigSection>

        {/* Behavior */}
        <ConfigSection id="comportamento" title="Comportamento da Simulação">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px]" style={{ color: "#64748B" }}>Taxa alvo de conversão</span>
              <span className="text-[14px] font-bold" style={{ color: conversionOverride !== null ? "#10B981" : "#64748B" }}>
                {conversionOverride !== null ? `${conversionOverride}%` : "Natural"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Slider min={0} max={100} step={5} value={[conversionOverride ?? 50]} onValueChange={v => setConversionOverride(v[0])} disabled={conversionOverride === null} />
              <button onClick={() => setConversionOverride(conversionOverride === null ? 50 : null)}
                className="text-[9px] px-2 py-1 rounded shrink-0"
                style={{ background: conversionOverride !== null ? "#10B98120" : "#1E293B", color: conversionOverride !== null ? "#10B981" : "#64748B" }}>
                {conversionOverride !== null ? "Override" : "Natural"}
              </button>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px]" style={{ color: "#64748B" }}>Densidade de objeções</span>
              <span className="text-[14px] font-bold" style={{ color: "#F59E0B" }}>{objectionDensity}%</span>
            </div>
            <Slider min={0} max={100} step={5} value={[objectionDensity]} onValueChange={v => setObjectionDensity(v[0])} />
          </div>
          <div>
            <p className="text-[10px] mb-2" style={{ color: "#64748B" }}>Velocidade das mensagens</p>
            <div className="flex gap-2">
              {SPEED_OPTIONS.map(s => (
                <button key={s.id} onClick={() => setSpeed(s.id)}
                  className="text-[10px] px-3 py-1.5 rounded-lg font-medium flex-1"
                  style={{ background: speed === s.id ? "#10B98110" : "#111827", border: `1px solid ${speed === s.id ? "#10B981" : "#1E293B"}`, color: speed === s.id ? "#10B981" : "#64748B" }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] mb-2" style={{ color: "#64748B" }}>Agentes do funil</p>
            <div className="flex gap-2 mb-2">
              {[{ id: "full", label: "Funil completo" }, { id: "comercial", label: "Só comercial" }, { id: "custom", label: "Personalizado" }].map(m => (
                <button key={m.id} onClick={() => setFunnelMode(m.id as any)}
                  className="text-[10px] px-3 py-1.5 rounded-lg font-medium"
                  style={{ background: funnelMode === m.id ? "#8B5CF610" : "#111827", border: `1px solid ${funnelMode === m.id ? "#8B5CF6" : "#1E293B"}`, color: funnelMode === m.id ? "#8B5CF6" : "#64748B" }}>
                  {m.label}
                </button>
              ))}
            </div>
            {funnelMode === "custom" && (
              <div className="flex flex-wrap gap-1">
                {AGENTS_V4.map(a => {
                  const active = customFunnelAgents.includes(a.id);
                  const c = getAgentColor(a);
                  return (
                    <button key={a.id} onClick={() => toggleMulti(customFunnelAgents, a.id, setCustomFunnelAgents)}
                      className="text-[9px] px-2 py-1 rounded font-medium"
                      style={{ background: active ? `${c}10` : "transparent", border: `1px solid ${active ? c : "#1E293B"}`, color: active ? c : "#64748B" }}>
                      {a.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </ConfigSection>

        {/* Start button */}
        <button onClick={runSimulation}
          className="w-full py-4 rounded-xl text-sm font-bold transition-all duration-200"
          style={{ background: "linear-gradient(135deg, #10B981, #06B6D4)", color: "#000", boxShadow: "0 8px 24px #10B98140" }}
          onMouseEnter={e => { (e.target as HTMLElement).style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.transform = "translateY(0)"; }}>
          <Play className="w-4 h-4 inline mr-2" />
          Iniciar Simulação · {estLeads} leads · {formatTime(duration)}
        </button>
      </div>
    );
  }

  // ===== WAR ROOM (running) or REPORT =====
  return (
    <div className="space-y-0 animate-in fade-in duration-300">
      {/* War Room header (running) */}
      {running && (
        <div className="flex items-center gap-4 px-4 py-2 rounded-xl mb-3" style={{ background: "#0D1220", border: "1px solid #1E293B" }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#EF4444" }} />
            <span className="text-[13px] font-bold" style={{ color: "#F1F5F9" }}>WAR ROOM</span>
            <span className="text-[13px] font-bold tabular-nums" style={{ color: "#F59E0B" }}>{formatTime(elapsedSeconds)}</span>
          </div>
          <div className="flex-1 flex items-center justify-center gap-6">
            <span className="text-[11px]" style={{ color: "#64748B" }}><strong style={{ color: "#3B82F6" }}>{animLeads}</strong> leads</span>
            <span className="text-[11px]" style={{ color: "#64748B" }}><strong style={{ color: "#10B981" }}>{animClosed}</strong> fechados</span>
            <span className="text-[11px]" style={{ color: "#64748B" }}><strong style={{ color: "#F59E0B" }}>{conversionRate}%</strong></span>
          </div>
          <button onClick={stopSimulation} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold"
            style={{ background: "#EF444420", color: "#EF4444", border: "1px solid #EF444430" }}>
            <Square className="w-3 h-3" /> Parar
          </button>
        </div>
      )}

      {/* Report tabs (after simulation) */}
      {phase === "report" && !running && (
        <div className="flex items-center gap-2 mb-3">
          {(["numeros", "conversas", "debrief"] as ReportTab[]).map(t => (
            <button key={t} onClick={() => setReportTab(t)}
              className="text-[11px] px-4 py-2 rounded-lg font-bold transition-all"
              style={{
                background: reportTab === t ? (t === "debrief" ? "#8B5CF610" : "#10B98110") : "transparent",
                border: `1px solid ${reportTab === t ? (t === "debrief" ? "#8B5CF6" : "#10B981") : "#1E293B"}`,
                color: reportTab === t ? (t === "debrief" ? "#8B5CF6" : "#10B981") : "#64748B",
              }}>
              {t === "numeros" ? "📊 Números" : t === "conversas" ? "💬 Conversas" : "🧠 Debrief IA"}
            </button>
          ))}
          <button onClick={() => { setPhase("config"); setLeads([]); setDebrief(null); }}
            className="ml-auto text-[10px] px-3 py-1.5 rounded-lg font-medium"
            style={{ border: "1px solid #1E293B", color: "#64748B" }}>Nova Simulação</button>
        </div>
      )}

      {/* 3-column layout for running / conversas tab */}
      {(running || (phase === "report" && reportTab === "conversas")) && (
        <div className="flex gap-3" style={{ height: "calc(100vh - 280px)", minHeight: 500 }}>
          {/* LEFT: Lead list */}
          <div className="w-[240px] shrink-0 rounded-xl overflow-hidden flex flex-col" style={{ background: "#111B21", border: "1px solid #2A3942" }}>
            <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid #2A3942" }}>
              <span className="text-[13px] font-semibold" style={{ color: "#E9EDEF" }}>Conversas</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#25D36620", color: "#25D366" }}>
                {leads.filter(l => l.status === "active").length}
              </span>
            </div>
            {!running && (
              <div className="flex px-2 py-1 gap-0.5" style={{ borderBottom: "1px solid #2A3942" }}>
                {(["all", "active", "closed", "lost"] as const).map(f => (
                  <button key={f} onClick={() => setLeadFilter(f)}
                    className="flex-1 text-[9px] py-1 font-medium transition-all"
                    style={{ color: leadFilter === f ? "#10B981" : "#667781", borderBottom: leadFilter === f ? "2px solid #10B981" : "2px solid transparent" }}>
                    {f === "all" ? "Todos" : f === "active" ? "Ativos" : f === "closed" ? "Fechados" : "Perdidos"}
                  </button>
                ))}
              </div>
            )}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              {(running ? leads : filteredLeads).map((l, i) => (
                <button key={l.id} onClick={() => setSelectedLeadId(l.id)}
                  className={cn("w-full text-left px-3 py-2.5 transition-all duration-200", i === 0 && running && "animate-in slide-in-from-top-2")}
                  style={{
                    background: selectedLeadId === l.id ? "#1F2C34" : "transparent",
                    borderLeft: selectedLeadId === l.id ? "3px solid #10B981" : "3px solid transparent",
                    borderBottom: "1px solid #2A394220",
                  }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-[46px] h-[46px] rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: `${l.profileColor}20`, color: l.profileColor }}>{l.name[0]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-bold truncate" style={{ color: "#E9EDEF" }}>{l.name}</p>
                        <span className="text-[11px] tabular-nums" style={{ color: "#667781" }}>
                          {l.startedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-[12px] truncate" style={{ color: "#8696A0" }}>{l.destino}</p>
                      <p className="text-[12px] truncate" style={{ color: "#8696A0" }}>
                        {l.messages[l.messages.length - 1]?.content?.slice(0, 40) || "..."}
                      </p>
                    </div>
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{
                      background: l.status === "active" ? "#25D366" : l.status === "closed" ? "#3B82F6" : "#EF4444",
                      animation: l.status === "active" ? "pulse 2s infinite" : "none",
                    }} />
                  </div>
                  <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded font-medium"
                    style={{ background: `${l.profileColor}15`, color: l.profileColor }}>{l.profileEmoji} {l.profileName}</span>
                </button>
              ))}
            </div>
          </div>

          {/* CENTER: Chat */}
          <div className="flex-1 rounded-[14px] flex flex-col overflow-hidden" style={{ background: "#111B21", border: "1px solid #2A3942" }}>
            {selectedLead ? (
              <>
                <div className="flex items-center gap-3 px-4 shrink-0" style={{ height: 56, background: "#1F2C33" }}>
                  <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: `${selectedLead.profileColor}20`, color: selectedLead.profileColor }}>
                    {selectedLead.name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-semibold" style={{ color: "#E9EDEF" }}>{selectedLead.name}</p>
                    <p className="text-[11px]" style={{ color: "#8696A0" }}>{selectedLead.destino} · {selectedLead.profileEmoji} {selectedLead.profileName}</p>
                  </div>
                  {running && <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: "#F59E0B15", color: "#F59E0B" }}>AUTO</span>}
                </div>
                <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-1.5" style={{ background: "#0B141A" }}>
                  {selectedLead.messages.map((msg, i) => {
                    const isAgent = msg.role === "agent";
                    const showName = isAgent && (i === 0 || selectedLead.messages[i - 1]?.role !== "agent" || selectedLead.messages[i - 1]?.agentName !== msg.agentName);
                    return (
                      <div key={i} className={cn("flex gap-2 animate-in duration-200", isAgent ? "justify-start slide-in-from-left-2" : "justify-end slide-in-from-right-2")}>
                        <div style={{
                          background: isAgent ? "#1F2C33" : "#005C4B", color: "#E9EDEF",
                          borderRadius: isAgent ? "0 12px 12px 12px" : "12px 0 12px 12px",
                          maxWidth: "70%", padding: "8px 12px", boxShadow: "0 1px 1px rgba(0,0,0,0.13)",
                        }}>
                          {showName && msg.agentName && <p className="text-[11px] font-semibold mb-0.5" style={{ color: "#53BDEB" }}>{msg.agentName}</p>}
                          <p className="text-[13px] leading-[1.5]">{msg.content.replace("[TRANSFERIR]", "").trim()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center" style={{ background: "#0B141A" }}>
                <p className="text-[13px]" style={{ color: "#334155" }}>Selecione um lead para ver a conversa</p>
              </div>
            )}
          </div>

          {/* RIGHT: KPIs + Feed */}
          {running && (
            <div className="w-[220px] shrink-0 space-y-3 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              {[
                { label: "Leads", value: animLeads, color: "#3B82F6" },
                { label: "Fechados", value: animClosed, color: "#10B981", extra: conversionRate > 0 ? `${conversionRate}%` : undefined },
                { label: "Receita", value: `R$${animReceita}k`, color: "#EAB308" },
                { label: "Objeções", value: `${totalContornadas}/${totalObjecoes}`, color: "#F59E0B" },
              ].map(k => (
                <div key={k.label} className="relative rounded-xl overflow-hidden" style={{ background: "#0D1220", border: "1px solid #1E293B" }}>
                  <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: k.color }} />
                  <div className="p-3 text-center">
                    <p className="text-[22px] font-extrabold tabular-nums" style={{ color: k.color }}>{k.value}</p>
                    <p className="text-[9px] uppercase tracking-wider" style={{ color: "#64748B" }}>{k.label}</p>
                    {k.extra && <span className="text-[9px] px-1.5 py-0.5 rounded mt-1 inline-block" style={{ background: `${k.color}15`, color: k.color }}>{k.extra}</span>}
                  </div>
                </div>
              ))}
              {/* Conversion gauge */}
              <div className="rounded-xl p-3 text-center" style={{ background: "#0D1220", border: "1px solid #1E293B" }}>
                <div className="relative w-16 h-16 mx-auto">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="#1E293B" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke={conversionRate >= 50 ? "#10B981" : conversionRate >= 30 ? "#F59E0B" : "#EF4444"}
                      strokeWidth="3" strokeDasharray={`${conversionRate * 0.94} 100`} strokeLinecap="round" className="transition-all duration-500" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[14px] font-extrabold" style={{ color: "#F1F5F9" }}>{conversionRate}%</span>
                </div>
                <p className="text-[9px] uppercase tracking-wider mt-1" style={{ color: "#64748B" }}>Conversão</p>
              </div>
              {/* Feed */}
              <div className="rounded-xl overflow-hidden" style={{ background: "#0D1220", border: "1px solid #1E293B" }}>
                <p className="text-[9px] uppercase tracking-wider font-bold px-3 py-2" style={{ color: "#64748B", borderBottom: "1px solid #1E293B" }}>Feed ao vivo</p>
                <div className="max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                  {events.map(e => (
                    <div key={e.id} className="flex items-start gap-2 px-3 py-1.5 animate-in slide-in-from-top-1 duration-200" style={{ borderBottom: "1px solid #1E293B10" }}>
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: e.color }} />
                      <div>
                        <p className="text-[10px]" style={{ color: "#E9EDEF" }}>{e.text}</p>
                        <p className="text-[8px]" style={{ color: "#667781" }}>{e.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Report: Números tab */}
      {phase === "report" && !running && reportTab === "numeros" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: "Leads", value: leads.length, color: "#3B82F6" },
              { label: "Fechados", value: closedLeads.length, color: "#10B981" },
              { label: "Perdidos", value: lostLeads.length, color: "#EF4444" },
              { label: "Receita", value: `R$${Math.round(totalReceita / 1000)}k`, color: "#EAB308" },
              { label: "Taxa", value: `${conversionRate}%`, color: conversionRate >= 50 ? "#10B981" : "#F59E0B" },
              { label: "Ticket Médio", value: `R$${Math.round(ticketMedio / 1000)}k`, color: "#8B5CF6" },
            ].map(k => (
              <div key={k.label} className="relative rounded-xl overflow-hidden" style={{ background: "#0D1220", border: "1px solid #1E293B" }}>
                <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: k.color }} />
                <div className="p-3 text-center">
                  <p className="text-[20px] font-extrabold tabular-nums" style={{ color: k.color }}>{k.value}</p>
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: "#64748B" }}>{k.label}</p>
                </div>
              </div>
            ))}
          </div>
          {/* By profile */}
          <div className="rounded-xl p-4" style={{ background: "#0D1220", border: "1px solid #1E293B" }}>
            <p className="text-[11px] uppercase tracking-[0.08em] font-bold mb-3" style={{ color: "#64748B" }}>Por Perfil</p>
            {CLIENT_PROFILES.map(p => {
              const pLeads = leads.filter(l => l.profileId === p.id);
              const pClosed = pLeads.filter(l => l.status === "closed");
              const rate = pLeads.length > 0 ? Math.round((pClosed.length / pLeads.length) * 100) : 0;
              if (pLeads.length === 0) return null;
              return (
                <div key={p.id} className="flex items-center gap-3 py-2" style={{ borderBottom: "1px solid #1E293B20" }}>
                  <span className="text-sm">{p.emoji}</span>
                  <span className="text-[11px] font-semibold w-24" style={{ color: p.color }}>{p.name}</span>
                  <span className="text-[10px] w-12 text-center" style={{ color: "#64748B" }}>{pLeads.length} leads</span>
                  <span className="text-[10px] w-16 text-center" style={{ color: "#10B981" }}>{pClosed.length} fechados</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#1E293B" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${rate}%`, background: rate >= 50 ? "#10B981" : rate >= 30 ? "#F59E0B" : "#EF4444" }} />
                  </div>
                  <span className="text-[11px] font-bold tabular-nums w-10 text-right" style={{ color: rate >= 50 ? "#10B981" : rate >= 30 ? "#F59E0B" : "#EF4444" }}>{rate}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Report: Debrief tab */}
      {phase === "report" && !running && reportTab === "debrief" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {debriefLoading && (
            <div className="flex items-center justify-center py-12 gap-2" style={{ color: "#64748B" }}>
              <Loader2 className="w-5 h-5 animate-spin" /> Gerando Debrief IA...
            </div>
          )}
          {debrief && (
            <>
              {/* Score gauge + resumo */}
              <div className="flex gap-4">
                <div className="rounded-xl p-6 text-center" style={{ background: "#0D1220", border: "1px solid #1E293B" }}>
                  <div className="relative w-24 h-24 mx-auto">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#1E293B" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15" fill="none"
                        stroke={debrief.scoreGeral >= 70 ? "#10B981" : debrief.scoreGeral >= 40 ? "#F59E0B" : "#EF4444"}
                        strokeWidth="3" strokeDasharray={`${debrief.scoreGeral * 0.94} 100`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[28px] font-extrabold"
                      style={{ color: debrief.scoreGeral >= 70 ? "#10B981" : debrief.scoreGeral >= 40 ? "#F59E0B" : "#EF4444" }}>
                      {debrief.scoreGeral}
                    </span>
                  </div>
                  <p className="text-[9px] uppercase tracking-wider mt-2" style={{ color: "#64748B" }}>Score Geral</p>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="rounded-xl p-4" style={{ background: "#0D1220", border: "1px solid #1E293B" }}>
                    <p className="text-[13px] leading-relaxed" style={{ color: "#E9EDEF" }}>{debrief.resumoExecutivo}</p>
                  </div>
                  {debrief.fraseNathAI && (
                    <div className="rounded-xl p-4" style={{ background: "#10B98108", border: "1px solid #10B98120" }}>
                      <p className="text-[12px] italic" style={{ color: "#10B981" }}>"{debrief.fraseNathAI}"</p>
                      <p className="text-[9px] mt-1" style={{ color: "#64748B" }}>— NATH.AI</p>
                    </div>
                  )}
                </div>
              </div>
              {/* Pontos fortes */}
              {debrief.pontosFortes.length > 0 && (
                <div className="rounded-xl p-4" style={{ background: "#0D1220", border: "1px solid #1E293B" }}>
                  <p className="text-[11px] uppercase tracking-[0.08em] font-bold mb-2" style={{ color: "#64748B" }}>Pontos Fortes</p>
                  {debrief.pontosFortes.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 py-1">
                      <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#10B981" }} />
                      <p className="text-[11px]" style={{ color: "#E9EDEF" }}>{p}</p>
                    </div>
                  ))}
                </div>
              )}
              {/* Melhorias */}
              <div className="rounded-xl p-4" style={{ background: "#0D1220", border: "1px solid #1E293B" }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] font-bold" style={{ color: "#64748B" }}>Melhorias Sugeridas</p>
                  <button onClick={approveAll} className="text-[9px] px-2 py-1 rounded font-bold"
                    style={{ background: "#10B98120", color: "#10B981", border: "1px solid #10B98130" }}>
                    Aprovar Tudo
                  </button>
                </div>
                <div className="space-y-2">
                  {debrief.melhorias.map(m => (
                    <div key={m.id} className="rounded-lg p-3" style={{
                      background: "#111827",
                      border: `1px solid ${m.status === "approved" ? "#10B98130" : m.status === "rejected" ? "#EF444430" : "#1E293B"}`,
                      opacity: m.status === "rejected" ? 0.5 : 1,
                    }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-[12px] font-bold" style={{ color: "#F1F5F9" }}>{m.titulo}</p>
                            <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded"
                              style={{
                                background: m.prioridade === "alta" ? "#EF444415" : m.prioridade === "media" ? "#F59E0B15" : "#3B82F615",
                                color: m.prioridade === "alta" ? "#EF4444" : m.prioridade === "media" ? "#F59E0B" : "#3B82F6",
                              }}>{m.prioridade}</span>
                          </div>
                          <p className="text-[10px]" style={{ color: "#64748B" }}>{m.desc}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[9px]" style={{ color: "#8B5CF6" }}>Agente: {m.agente}</span>
                            <span className="text-[9px]" style={{ color: "#10B981" }}>Impacto: {m.impacto}</span>
                          </div>
                        </div>
                        {m.status === "pending" && (
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => handleImprovement(m.id, "approved")}
                              className="w-7 h-7 rounded flex items-center justify-center"
                              style={{ background: "#10B98120", border: "1px solid #10B98130" }}>
                              <Check className="w-3.5 h-3.5" style={{ color: "#10B981" }} />
                            </button>
                            <button onClick={() => handleImprovement(m.id, "rejected")}
                              className="w-7 h-7 rounded flex items-center justify-center"
                              style={{ background: "#EF444420", border: "1px solid #EF444430" }}>
                              <X className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
                            </button>
                          </div>
                        )}
                        {m.status === "approved" && <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "#10B981" }} />}
                        {m.status === "rejected" && <XCircle className="w-5 h-5 shrink-0" style={{ color: "#EF4444" }} />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Lacunas + Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {debrief.lacunasConhecimento.length > 0 && (
                  <div className="rounded-xl p-4" style={{ background: "#0D1220", border: "1px solid #1E293B" }}>
                    <p className="text-[11px] uppercase tracking-[0.08em] font-bold mb-2" style={{ color: "#64748B" }}>Lacunas de Conhecimento</p>
                    {debrief.lacunasConhecimento.map((l, i) => (
                      <div key={i} className="flex items-start gap-2 py-1">
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "#F59E0B" }} />
                        <p className="text-[10px]" style={{ color: "#E9EDEF" }}>{l}</p>
                      </div>
                    ))}
                  </div>
                )}
                {debrief.insightsCliente.length > 0 && (
                  <div className="rounded-xl p-4" style={{ background: "#0D1220", border: "1px solid #1E293B" }}>
                    <p className="text-[11px] uppercase tracking-[0.08em] font-bold mb-2" style={{ color: "#64748B" }}>Insights de Cliente</p>
                    {debrief.insightsCliente.map((ins, i) => (
                      <div key={i} className="flex items-start gap-2 py-1">
                        <Lightbulb className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "#06B6D4" }} />
                        <p className="text-[10px]" style={{ color: "#E9EDEF" }}>{ins}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={generateDebrief} className="text-[10px] px-4 py-2 rounded-lg font-medium"
                  style={{ border: "1px solid #1E293B", color: "#64748B" }}>
                  <Loader2 className={cn("w-3 h-3 inline mr-1", debriefLoading && "animate-spin")} /> Reanalisar
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
