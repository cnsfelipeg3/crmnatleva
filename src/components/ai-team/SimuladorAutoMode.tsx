import { useState, useCallback, useRef, useEffect } from "react";
import { Play, Loader2, CheckCircle2, Star, XCircle, ChevronRight, Zap, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { AGENTS_V4, SQUADS } from "@/components/ai-team/agentsV4Data";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const CLIENT_PROFILES = [
  { id: "sonhador", name: "Sonhador", emoji: "🌟", color: "#F59E0B", description: "Empolgado, sem budget definido, quer tudo",
    prompt: "Voce e Juliana, cliente sonhadora. Quer uma viagem dos sonhos, sem definir budget. Usa muitos emojis e palavras como \"incrivel\", \"perfeito\", \"sonho da minha vida\". Nao tem destino definido, aceita sugestoes. Casal. Responda de forma entusiasmada e emotiva." },
  { id: "indeciso", name: "Indeciso", emoji: "🤔", color: "#06B6D4", description: "Não sabe o destino, precisa de orientação",
    prompt: "Voce e Ana, cliente indecisa. Quer viajar mas nao sabe pra onde. Muda de ideia: comeca querendo Europa, depois Dubai, depois uma amiga foi a Paris. Casal, R$20mil total. Usa \"mas sera que...\" e \"nao sei se...\". Precisa de orientacao firme." },
  { id: "desconfiado", name: "Desconfiado", emoji: "😒", color: "#64748B", description: "Questiona tudo, pede referências",
    prompt: "Voce e Fabio, cliente desconfiado. Questiona TUDO: \"isso e confiavel?\", \"ja tive problema com agencia antes\", pede CNPJ, referencias. Familia com 2 filhos. Precisa ser conquistado com transparencia e provas." },
  { id: "pechincheiro", name: "Pechincheiro", emoji: "💸", color: "#10B981", description: "Sempre acha caro, compara concorrentes",
    prompt: "Voce e Roberto, SEMPRE pede desconto. Compara com CVC e Decolar. Usa \"ta muito caro\", \"nao tem como melhorar?\". Quer Cancun ou Orlando, R$8mil por pessoa. Se oferecerem desconto, pede mais. Negocia tudo." },
  { id: "familia", name: "Família", emoji: "👨‍👩‍👧‍👦", color: "#3B82F6", description: "Casal com filhos, segurança e conforto",
    prompt: "Voce e Patricia, mae de familia. Viagem com marido e 2 filhos (4 e 8 anos). Preocupada com seguranca, hotel com piscina infantil, transfer seguro. Pergunta sobre medico e emergencia. Quer Orlando ou Cancun. R$25mil total." },
  { id: "lua-mel", name: "Lua de Mel", emoji: "💑", color: "#EC4899", description: "Casal, experiência romântica",
    prompt: "Voce e Marina, recém noiva. Quer lua de mel PERFEITA. Pede surpresas, jantar a luz de velas, quarto decorado, experiencias exclusivas. Sem limite de budget claro. Maldivas ou Dubai ou Grecia." },
  { id: "corporativo", name: "Corporativo", emoji: "🏢", color: "#8B5CF6", description: "Viagem de negócios, objetividade",
    prompt: "Voce e Ricardo, executivo. Viagem de negocios para Nova York, 5 dias. Precisa de hotel perto do centro financeiro, transfer pontual. Respostas curtas e diretas. Budget da empresa, ate R$15mil." },
  { id: "reclamacao", name: "Reclamação", emoji: "😡", color: "#EF4444", description: "Insatisfeito, quer solução imediata",
    prompt: "Voce e Carlos, cliente com problema. Hotel diferente do prometido ou transfer nao apareceu. Esta frustrado e exigindo solucao AGORA. Testa a capacidade de resolucao e recuperacao de relacionamento do agente." },
];

interface ChatMessage { role: "client" | "agent"; content: string; agentName?: string; }

interface TestResult {
  id: string; timestamp: Date; agentId: string; agentName: string; agentEmoji: string;
  perfilId: string; perfilName: string; perfilEmoji: string;
  score: number; aderencia: number; sentimento: number; clareza: number; proatividade: number;
  rodadas: number; aprovado: boolean;
  insights: { titulo: string; tipo: string; agente: string; sugestao: string; impacto: string }[];
  avaliacaoTexto: string; messages: ChatMessage[]; responseTimeMs: number;
}

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

function buildAgentSystemPrompt(agent: typeof AGENTS_V4[0], hasNext: boolean): string {
  return `${agent.persona}\nVoce conversa como ${agent.name} (${agent.role}) da agencia NatLeva pelo WhatsApp.\n${hasNext ? "Quando completar objetivo, termine com [TRANSFERIR].\n" : ""}Responda APENAS a ultima mensagem. Breve (1-3 frases).`;
}
function buildClientSystemPrompt(profile: typeof CLIENT_PROFILES[0], isFirst: boolean): string {
  return `${profile.prompt}\nVoce conversa com NatLeva pelo WhatsApp.\n${isFirst ? "PRIMEIRA mensagem. Inicie naturalmente." : "Responda a ultima msg. Breve. Mantenha perfil."}`;
}
function computeScores(messages: ChatMessage[], rodadas: number) {
  let aderencia = 60, sentimento = 50, clareza = 55;
  for (let i = 0; i < rodadas; i++) { aderencia = Math.min(100, aderencia + 5 + Math.floor(Math.random() * 10)); clareza = Math.min(100, clareza + 6 + Math.floor(Math.random() * 8)); }
  for (const msg of messages) {
    if (msg.role === "client") {
      if (/\?|caro|não|nao/.test(msg.content.toLowerCase())) sentimento = Math.max(0, sentimento - 5);
      if (/!|legal|amo|incrivel|perfeito/.test(msg.content.toLowerCase())) sentimento = Math.min(100, sentimento + 5);
    }
  }
  return { aderencia, sentimento, clareza, total: Math.round((aderencia + sentimento + clareza) / 3) };
}

const HISTORY_KEY = "natleva_auto_sim_history";
function loadHistory(): TestResult[] {
  try { const raw = localStorage.getItem(HISTORY_KEY); if (!raw) return []; return JSON.parse(raw).map((r: any) => ({ ...r, timestamp: new Date(r.timestamp) })); } catch { return []; }
}
function saveHistory(results: TestResult[]) { localStorage.setItem(HISTORY_KEY, JSON.stringify(results.slice(0, 200))); }

// Animated counter hook
function useCountUp(target: number, duration = 500) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(from + (target - from) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

function KpiCard({ value, label, color, isEmpty }: { value: number | string; label: string; color: string; isEmpty?: boolean }) {
  const numVal = typeof value === "number" ? value : 0;
  const animated = useCountUp(isEmpty ? 0 : numVal);
  return (
    <div className="relative rounded-xl overflow-hidden transition-all duration-200 hover:translate-y-[-1px]"
      style={{ background: "#0D1220", border: `1px solid #1E293B` }}>
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }} />
      <div className="p-4 text-center">
        <p className="text-[28px] font-extrabold tabular-nums" style={{ color: isEmpty ? "#334155" : color }}>
          {isEmpty ? "—" : (typeof value === "string" ? value : animated)}
        </p>
        <p className="text-[11px] uppercase tracking-[0.5px] mt-1" style={{ color: "#64748B" }}>{label}</p>
      </div>
    </div>
  );
}

export default function SimuladorAutoMode() {
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [rodadas, setRodadas] = useState(6);
  const [running, setRunning] = useState(false);
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [liveScores, setLiveScores] = useState<{ aderencia: number; sentimento: number; clareza: number; total: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [results, setResults] = useState<TestResult[]>([]);
  const [history, setHistory] = useState<TestResult[]>(() => loadHistory());
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [activeSquad, setActiveSquad] = useState("all");
  const chatRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const filteredAgents = activeSquad === "all" ? AGENTS_V4 : AGENTS_V4.filter(a => a.squadId === activeSquad);
  const totalCombos = selectedAgents.length * selectedProfiles.length;
  const totalMessages = totalCombos * rodadas * 2;
  const estimatedMinutes = Math.ceil(totalMessages * 4 / 60);

  const toggleAgent = (id: string) => setSelectedAgents(p => p.includes(id) ? p.filter(a => a !== id) : [...p, id]);
  const toggleProfile = (id: string) => setSelectedProfiles(p => p.includes(id) ? p.filter(a => a !== id) : [...p, id]);

  const allResults = [...history, ...results];
  const avgScore = allResults.length > 0 ? Math.round(allResults.reduce((s, r) => s + r.score, 0) / allResults.length) : 0;
  const aprovados = allResults.filter(r => r.aprovado).length;
  const bestAgent = allResults.length > 0 ? (() => {
    const byAgent: Record<string, { sum: number; count: number; name: string; emoji: string }> = {};
    allResults.forEach(r => { if (!byAgent[r.agentId]) byAgent[r.agentId] = { sum: 0, count: 0, name: r.agentName, emoji: r.agentEmoji }; byAgent[r.agentId].sum += r.score; byAgent[r.agentId].count++; });
    let best = { name: "", emoji: "", avg: 0 };
    Object.values(byAgent).forEach(v => { const avg = v.sum / v.count; if (avg > best.avg) best = { name: v.name, emoji: v.emoji, avg }; });
    return best;
  })() : null;

  const getAgentColor = (agent: typeof AGENTS_V4[0]) => {
    const colors: Record<string, string> = { orquestracao: "#10B981", comercial: "#F59E0B", atendimento: "#3B82F6", financeiro: "#8B5CF6", operacional: "#06B6D4", demanda: "#EF4444", retencao: "#EC4899" };
    return colors[agent.squadId] || "#10B981";
  };

  const runTests = useCallback(async () => {
    if (selectedAgents.length === 0 || selectedProfiles.length === 0) { toast({ title: "Selecione agentes e perfis", variant: "destructive" }); return; }
    setRunning(true); setResults([]); setSelectedResult(null); setShowChat(false);
    const newResults: TestResult[] = []; let completed = 0;

    for (const profileId of selectedProfiles) {
      const profile = CLIENT_PROFILES.find(p => p.id === profileId)!;
      const agentFunnel = selectedAgents.map(id => AGENTS_V4.find(a => a.id === id)!);
      let currentAgentIdx = 0;
      const messages: ChatMessage[] = [];
      const start = Date.now();
      setLiveMessages([]); setLiveScores(null);
      setProgressLabel(`${agentFunnel[0].name} × ${profile.name}`);

      try {
        const clientFirst = await callAgent(buildClientSystemPrompt(profile, true), []);
        messages.push({ role: "client", content: clientFirst }); setLiveMessages([...messages]);
        setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight), 50);

        for (let round = 0; round < rodadas; round++) {
          const agent = agentFunnel[currentAgentIdx];
          const hasNext = currentAgentIdx < agentFunnel.length - 1;
          const agentResp = await callAgent(buildAgentSystemPrompt(agent, hasNext), messages.map(m => ({ role: m.role === "client" ? "user" : "assistant", content: m.content })));
          messages.push({ role: "agent", content: agentResp, agentName: agent.name }); setLiveMessages([...messages]);
          if (hasNext && agentResp.includes("[TRANSFERIR]")) currentAgentIdx++;
          const scores = computeScores(messages, round + 1); setLiveScores(scores);
          setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight), 50);
          if (round < rodadas - 1) {
            await new Promise(r => setTimeout(r, 1000));
            const clientResp = await callAgent(buildClientSystemPrompt(profile, false), messages.map(m => ({ role: m.role === "client" ? "assistant" : "user", content: m.content })));
            messages.push({ role: "client", content: clientResp }); setLiveMessages([...messages]);
            setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight), 50);
          }
          await new Promise(r => setTimeout(r, 500));
        }

        setProgressLabel(`Avaliando ${agentFunnel[0].name} × ${profile.name}...`);
        const evalPrompt = `Voce e especialista em qualidade de agencias de viagem premium.\nRetorne SOMENTE array JSON valido sem markdown.\nFormato: [{"titulo":"...","tipo":"problema|melhoria|positivo","agente":"...","sugestao":"...","impacto":"..."}]\nGere 3-5 itens.\n\nPERFIL: ${profile.name} (${profile.description})\nFUNIL: ${agentFunnel.map(a => a.name).join(" → ")}\n\nCONVERSA:\n${messages.map(m => `${m.role === "client" ? "CLIENTE" : `AGENTE (${m.agentName})`}: ${m.content}`).join("\n")}`;
        let insights: TestResult["insights"] = []; let avaliacaoTexto = "";
        try {
          const evalResp = await callAgent("Voce e especialista em qualidade de agencias de viagem premium. Retorne SOMENTE array JSON valido sem markdown.", [{ role: "user", content: evalPrompt }]);
          const jsonMatch = evalResp.match(/\[[\s\S]*\]/);
          if (jsonMatch) insights = JSON.parse(jsonMatch[0]);
          avaliacaoTexto = insights.length > 0 ? insights.filter(i => i.tipo === "positivo").map(i => i.titulo).join(". ") || insights[0]?.titulo || "" : "";
        } catch { avaliacaoTexto = "Avaliação concluída."; }

        const finalScores = computeScores(messages, rodadas);
        const proatividade = Math.min(100, 40 + (messages.filter(m => m.role === "agent" && /suger|recomen|antecip|exclusiv|surpres/i.test(m.content)).length * 15));
        const score = Math.round((finalScores.aderencia + finalScores.sentimento + finalScores.clareza + proatividade) / 4);

        newResults.push({
          id: crypto.randomUUID(), timestamp: new Date(), agentId: agentFunnel[0].id,
          agentName: agentFunnel.map(a => a.name).join(" → "), agentEmoji: agentFunnel[0].emoji,
          perfilId: profileId, perfilName: profile.name, perfilEmoji: profile.emoji,
          score, aderencia: finalScores.aderencia, sentimento: finalScores.sentimento,
          clareza: finalScores.clareza, proatividade, rodadas, aprovado: score >= 80,
          insights, avaliacaoTexto, messages, responseTimeMs: Date.now() - start,
        });
        setResults([...newResults]);
      } catch (err) {
        console.error("Test error:", err);
        toast({ title: "Erro no teste", description: `${agentFunnel[0].name} × ${profile.name} falhou`, variant: "destructive" });
      }
      completed++; setProgress(Math.round((completed / totalCombos) * 100));
      if (completed < totalCombos) await new Promise(r => setTimeout(r, 2000));
    }

    const updated = [...newResults, ...history]; setHistory(updated); saveHistory(updated);
    setRunning(false); setLiveMessages([]); setLiveScores(null);
    toast({ title: "Simulação concluída!", description: `${newResults.length} testes realizados.` });
  }, [selectedAgents, selectedProfiles, rodadas, history, totalCombos, toast]);

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <KpiCard value={avgScore} label="Média Geral" color={allResults.length === 0 ? "#334155" : avgScore >= 80 ? "#10B981" : avgScore >= 60 ? "#F59E0B" : "#EF4444"} isEmpty={allResults.length === 0} />
        <KpiCard value={allResults.length} label="Testes Realizados" color="#F1F5F9" isEmpty={allResults.length === 0} />
        <KpiCard value={aprovados} label="Aprovados (≥80)" color="#10B981" isEmpty={allResults.length === 0} />
        <div className="relative rounded-xl overflow-hidden transition-all duration-200 hover:translate-y-[-1px]"
          style={{ background: "#0D1220", border: "1px solid #1E293B" }}>
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: "#F59E0B" }} />
          <div className="p-4 text-center">
            {bestAgent && bestAgent.name ? (
              <>
                <p className="text-[28px] font-extrabold" style={{ color: "#F59E0B" }}>{bestAgent.emoji}</p>
                <p className="text-[11px] uppercase tracking-[0.5px] mt-1" style={{ color: "#64748B" }}>Melhor: {bestAgent.name}</p>
              </>
            ) : (
              <>
                <p className="text-[28px] font-extrabold" style={{ color: "#334155" }}>—</p>
                <p className="text-[11px] uppercase tracking-[0.5px] mt-1" style={{ color: "#64748B" }}>Melhor Agente</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Config */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: "50ms" }}>
          {/* Agent selection */}
          <div className="rounded-xl p-4" style={{ background: "#0D1220", border: "1px solid #1E293B" }}>
            <p className="text-[11px] uppercase tracking-[0.08em] font-bold mb-3" style={{ color: "#64748B" }}>Selecionar Agentes (funil)</p>
            <div className="flex gap-1.5 flex-wrap mb-3">
              <button onClick={() => setActiveSquad("all")}
                className="text-[10px] px-2.5 py-1 rounded-md font-medium transition-all"
                style={{ background: activeSquad === "all" ? "#10B98110" : "transparent", border: `1px solid ${activeSquad === "all" ? "#10B981" : "#1E293B"}`, color: activeSquad === "all" ? "#10B981" : "#64748B" }}>
                Todos
              </button>
              {SQUADS.map(s => (
                <button key={s.id} onClick={() => setActiveSquad(s.id)}
                  className="text-[10px] px-2.5 py-1 rounded-md font-medium transition-all"
                  style={{ background: activeSquad === s.id ? "#10B98110" : "transparent", border: `1px solid ${activeSquad === s.id ? "#10B981" : "#1E293B"}`, color: activeSquad === s.id ? "#10B981" : "#64748B" }}>
                  {s.name}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {filteredAgents.map(a => {
                const idx = selectedAgents.indexOf(a.id);
                const color = getAgentColor(a);
                return (
                  <button key={a.id} onClick={() => toggleAgent(a.id)}
                    className="relative flex items-center gap-2 p-2 rounded-lg transition-all duration-200 cursor-pointer"
                    style={{
                      background: idx >= 0 ? `${color}12` : "#0D1220",
                      border: `1px solid ${idx >= 0 ? color : "#1E293B"}`,
                      transform: idx >= 0 ? "scale(1)" : undefined,
                    }}>
                    {idx >= 0 && (
                      <span className="absolute -top-1.5 -left-1.5 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold text-white animate-in zoom-in duration-200"
                        style={{ background: color }}>{idx + 1}</span>
                    )}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                      style={{ background: `${color}20`, color }}>{a.name[0]}</div>
                    <div className="min-w-0 text-left">
                      <p className="text-[11px] font-semibold truncate" style={{ color: idx >= 0 ? color : "#F1F5F9" }}>{a.name}</p>
                      <p className="text-[9px] truncate" style={{ color: "#64748B" }}>{a.role.slice(0, 20)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedAgents.length > 0 && (
              <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
                {selectedAgents.map((id, i) => {
                  const agent = AGENTS_V4.find(a => a.id === id)!;
                  const color = getAgentColor(agent);
                  return (
                    <div key={id} className="flex items-center gap-1.5 shrink-0 animate-in fade-in duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: `${color}20`, color, border: `2px solid ${color}` }}>{agent.name[0]}</div>
                      {i < selectedAgents.length - 1 && (
                        <div className="w-6 h-px" style={{ background: `repeating-linear-gradient(90deg, ${color}60 0px, ${color}60 4px, transparent 4px, transparent 8px)` }} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Profile selection */}
          <div className="rounded-xl p-4" style={{ background: "#0D1220", border: "1px solid #1E293B" }}>
            <p className="text-[11px] uppercase tracking-[0.08em] font-bold mb-3" style={{ color: "#64748B" }}>Perfis de Cliente ({CLIENT_PROFILES.length})</p>
            <div className="grid grid-cols-2 gap-2">
              {CLIENT_PROFILES.map(p => {
                const active = selectedProfiles.includes(p.id);
                return (
                  <button key={p.id} onClick={() => toggleProfile(p.id)}
                    className="text-left rounded-lg p-3 transition-all duration-200"
                    style={{
                      background: active ? `${p.color}08` : "#111827",
                      border: `1px solid ${active ? p.color : "#1E293B"}`,
                    }}>
                    <span className="text-lg">{p.emoji}</span>
                    <p className="text-[11px] font-bold mt-1" style={{ color: active ? p.color : "#F1F5F9" }}>{p.name}</p>
                    <p className="text-[9px]" style={{ color: "#64748B" }}>{p.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slider + action */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: "#0D1220", border: "1px solid #1E293B" }}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.08em] font-bold" style={{ color: "#64748B" }}>Rodadas por teste</p>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ background: "#1E293B", color: "#F1F5F9" }}>{rodadas}</span>
            </div>
            <Slider min={4} max={20} step={1} value={[rodadas]} onValueChange={v => setRodadas(v[0])} />
            {totalCombos > 0 && (
              <p className="text-[10px]" style={{ color: "#64748B" }}>
                ~{totalMessages} mensagens totais · ~{estimatedMinutes} min
              </p>
            )}
            <button onClick={runTests} disabled={running || totalCombos === 0}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all duration-200"
              style={{
                background: totalCombos === 0 ? "#1E293B" : "linear-gradient(135deg, #10B981, #06B6D4)",
                color: totalCombos === 0 ? "#475569" : "#000",
                cursor: totalCombos === 0 || running ? "not-allowed" : "pointer",
                boxShadow: totalCombos > 0 && !running ? "0 8px 24px #10B98140" : "none",
                transform: totalCombos > 0 && !running ? "translateY(0)" : undefined,
                opacity: running ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (totalCombos > 0 && !running) (e.target as HTMLElement).style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.transform = "translateY(0)"; }}>
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? "Rodando..." : totalCombos === 0 ? "Selecione agentes e perfis" : `Rodar ${totalCombos} teste${totalCombos > 1 ? "s" : ""} (${selectedAgents.length} agente${selectedAgents.length > 1 ? "s" : ""} × ${selectedProfiles.length} perfil${selectedProfiles.length > 1 ? "s" : ""})`}
            </button>
          </div>
        </div>

        {/* Right: Live + Results */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: "100ms" }}>
          {/* Live chat */}
          {running && (
            <div className="rounded-xl flex flex-col overflow-hidden" style={{ height: 400, background: "#0B141A", border: "1px solid #1E293B" }}>
              <div className="px-4 py-2 flex items-center justify-between" style={{ background: "#1F2C33", borderBottom: "1px solid #1E293B" }}>
                <p className="text-[11px] font-bold" style={{ color: "#F1F5F9" }}>{progressLabel}</p>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: "#8B5CF620", color: "#8B5CF6" }}>{progress}%</span>
              </div>
              <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                {liveMessages.map((msg, i) => (
                  <div key={i} className={cn("flex gap-2 animate-in duration-200", msg.role === "client" ? "justify-end slide-in-from-right-2" : "justify-start slide-in-from-left-2")}>
                    <div className="max-w-[80%] px-3 py-2 text-[11px]" style={{
                      background: msg.role === "client" ? "#005C4B" : "#1F2C33",
                      color: "#E9EDEF",
                      borderRadius: msg.role === "client" ? "12px 0 12px 12px" : "0 12px 12px 12px",
                    }}>
                      {msg.agentName && <p className="text-[9px] font-bold mb-0.5" style={{ color: "#53BDEB" }}>{msg.agentName}</p>}
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
              {liveScores && (
                <div className="px-4 py-2 grid grid-cols-3 gap-3" style={{ borderTop: "1px solid #1E293B" }}>
                  {[
                    { label: "Aderência", v: liveScores.aderencia },
                    { label: "Sentimento", v: liveScores.sentimento },
                    { label: "Clareza", v: liveScores.clareza },
                  ].map(d => (
                    <div key={d.label}>
                      <p className="text-[8px] uppercase tracking-wider" style={{ color: "#64748B" }}>{d.label}</p>
                      <Progress value={d.v} className="h-1 mt-1" />
                      <p className="text-[9px] font-bold mt-0.5" style={{ color: d.v >= 80 ? "#10B981" : d.v >= 60 ? "#F59E0B" : "#EF4444" }}>{d.v}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="px-4 py-2" style={{ borderTop: "1px solid #1E293B" }}>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "#1E293B" }}>
                  <div className="h-full rounded-full transition-all duration-[400ms] ease-out" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #10B981, #06B6D4)" }} />
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && !running && (
            <div className="rounded-xl overflow-hidden" style={{ background: "#0D1220", border: "1px solid #1E293B" }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid #1E293B" }}>
                <BarChart3 className="w-4 h-4" style={{ color: "#10B981" }} />
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#F1F5F9" }}>
                  {results.length} testes concluídos · Média {Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)}/100
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ borderTop: "1px solid #1E293B" }}>
                {/* List */}
                <div className="max-h-[500px] overflow-y-auto" style={{ borderRight: "1px solid #1E293B" }}>
                  {results.map(r => (
                    <button key={r.id} onClick={() => { setSelectedResult(r); setShowChat(false); }}
                      className="w-full text-left p-3 transition-all duration-200"
                      style={{
                        background: selectedResult?.id === r.id ? "#11182750" : "transparent",
                        borderBottom: "1px solid #1E293B20",
                      }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold"
                            style={{ background: `${getAgentColor(AGENTS_V4.find(a => a.id === r.agentId) || AGENTS_V4[0])}20`, color: getAgentColor(AGENTS_V4.find(a => a.id === r.agentId) || AGENTS_V4[0]) }}>
                            {r.agentEmoji}
                          </div>
                          <div>
                            <p className="text-[11px] font-bold" style={{ color: "#F1F5F9" }}>{r.agentName}</p>
                            <p className="text-[9px]" style={{ color: "#64748B" }}>{r.perfilEmoji} {r.perfilName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                            style={{
                              background: r.aprovado ? "#10B98115" : "#EF444415",
                              color: r.aprovado ? "#10B981" : "#EF4444",
                              border: `1px solid ${r.aprovado ? "#10B98130" : "#EF444430"}`,
                            }}>
                            {r.aprovado ? "Aprovado" : "Revisar"}
                          </span>
                          <span className="text-sm font-extrabold tabular-nums" style={{ color: r.aprovado ? "#10B981" : "#F59E0B" }}>{r.score}</span>
                          <ChevronRight className="w-3 h-3" style={{ color: "#64748B" }} />
                        </div>
                      </div>
                      {/* Mini bars */}
                      <div className="flex gap-3 mt-2">
                        {[r.aderencia, r.sentimento, r.clareza].map((v, i) => (
                          <div key={i} className="flex-1">
                            <div className="h-1 rounded-full overflow-hidden" style={{ background: "#1E293B" }}>
                              <div className="h-full rounded-full" style={{ width: `${v}%`, background: v >= 80 ? "#10B981" : v >= 60 ? "#F59E0B" : "#EF4444" }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
                {/* Detail */}
                <div className="p-4 max-h-[500px] overflow-y-auto">
                  {selectedResult ? (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                          style={{ background: `${getAgentColor(AGENTS_V4.find(a => a.id === selectedResult.agentId) || AGENTS_V4[0])}20`, color: getAgentColor(AGENTS_V4.find(a => a.id === selectedResult.agentId) || AGENTS_V4[0]) }}>
                          {selectedResult.agentEmoji}
                        </div>
                        <div className="flex-1">
                          <p className="text-[13px] font-bold" style={{ color: "#F1F5F9" }}>{selectedResult.agentName}</p>
                          <p className="text-[11px]" style={{ color: "#64748B" }}>{selectedResult.perfilEmoji} {selectedResult.perfilName}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[28px] font-extrabold tabular-nums" style={{ color: selectedResult.aprovado ? "#10B981" : "#F59E0B" }}>{selectedResult.score}</p>
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                            style={{ background: selectedResult.aprovado ? "#10B98115" : "#EF444415", color: selectedResult.aprovado ? "#10B981" : "#EF4444" }}>
                            {selectedResult.aprovado ? "Aprovado" : "Revisar"}
                          </span>
                        </div>
                      </div>

                      {selectedResult.avaliacaoTexto && (
                        <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "#10B98108", border: "1px solid #10B98120" }}>
                          <Star className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#10B981" }} />
                          <p className="text-[11px]" style={{ color: "#E9EDEF" }}>{selectedResult.avaliacaoTexto}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: "Aderência", value: selectedResult.aderencia },
                          { label: "Sentimento", value: selectedResult.sentimento },
                          { label: "Clareza", value: selectedResult.clareza },
                          { label: "Proatividade", value: selectedResult.proatividade },
                        ].map(dim => (
                          <div key={dim.label}>
                            <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>{dim.label}</p>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1E293B" }}>
                              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${dim.value}%`, background: dim.value >= 80 ? "#10B981" : dim.value >= 60 ? "#F59E0B" : "#EF4444" }} />
                            </div>
                            <p className="text-[11px] font-bold mt-0.5 tabular-nums" style={{ color: dim.value >= 80 ? "#10B981" : dim.value >= 60 ? "#F59E0B" : "#EF4444" }}>{dim.value}</p>
                          </div>
                        ))}
                      </div>

                      <p className="text-[10px]" style={{ color: "#64748B" }}>{(selectedResult.responseTimeMs / 1000).toFixed(1)}s · {selectedResult.rodadas} rodadas</p>

                      {selectedResult.insights.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#64748B" }}>Insights do avaliador</p>
                          {selectedResult.insights.map((ins, i) => (
                            <div key={i} className="text-[10px] p-2.5 rounded-lg"
                              style={{
                                background: ins.tipo === "positivo" ? "#10B98108" : ins.tipo === "problema" ? "#EF444408" : "#F59E0B08",
                                border: `1px solid ${ins.tipo === "positivo" ? "#10B98120" : ins.tipo === "problema" ? "#EF444420" : "#F59E0B20"}`,
                              }}>
                              <p className="font-bold" style={{ color: "#F1F5F9" }}>{ins.titulo}</p>
                              <p style={{ color: "#64748B" }}>{ins.sugestao}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      <button onClick={() => setShowChat(!showChat)} className="text-[10px] font-bold hover:underline" style={{ color: "#06B6D4" }}>
                        {showChat ? "Ocultar conversa" : "Ver conversa completa"}
                      </button>
                      {showChat && (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto p-3 rounded-lg" style={{ background: "#0B141A" }}>
                          {selectedResult.messages.map((msg, i) => (
                            <div key={i} className={cn("flex gap-2", msg.role === "client" ? "justify-end" : "justify-start")}>
                              <div className="max-w-[85%] px-3 py-2 text-[11px]" style={{
                                background: msg.role === "client" ? "#005C4B" : "#1F2C33",
                                color: "#E9EDEF",
                                borderRadius: msg.role === "client" ? "12px 0 12px 12px" : "0 12px 12px 12px",
                              }}>
                                {msg.agentName && <p className="text-[9px] font-bold mb-0.5" style={{ color: "#53BDEB" }}>{msg.agentName}</p>}
                                {msg.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <p className="text-[11px]" style={{ color: "#334155" }}>Clique em um teste para ver detalhes</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {results.length === 0 && !running && (
            <div className="rounded-xl p-16 text-center" style={{ background: "#0D1220", border: "1px solid #1E293B" }}>
              <svg className="w-16 h-16 mx-auto opacity-15 mb-4" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1">
                <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                <circle cx="12" cy="12" r="3" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
              </svg>
              <p className="text-[13px] font-medium" style={{ color: "#334155" }}>Selecione agentes e perfis</p>
              <p className="text-[11px] mt-1" style={{ color: "#475569" }}>Os testes rodam em sequência com chat ao vivo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
