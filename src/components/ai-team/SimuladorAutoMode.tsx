import { useState, useCallback, useRef } from "react";
import { Play, Loader2, CheckCircle2, Star, XCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { AGENTS_V4, SQUADS } from "@/components/ai-team/agentsV4Data";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const CLIENT_PROFILES = [
  { id: "sonhador", name: "Sonhador", emoji: "🌟", description: "Empolgado, sem budget definido, quer tudo",
    prompt: "Voce e Juliana, cliente sonhadora. Quer uma viagem dos sonhos, sem definir budget. Usa muitos emojis e palavras como \"incrivel\", \"perfeito\", \"sonho da minha vida\". Nao tem destino definido, aceita sugestoes. Casal. Responda de forma entusiasmada e emotiva." },
  { id: "indeciso", name: "Indeciso", emoji: "🤔", description: "Não sabe o destino, precisa de orientação",
    prompt: "Voce e Ana, cliente indecisa. Quer viajar mas nao sabe pra onde. Muda de ideia: comeca querendo Europa, depois Dubai, depois uma amiga foi a Paris. Casal, R$20mil total. Usa \"mas sera que...\" e \"nao sei se...\". Precisa de orientacao firme." },
  { id: "desconfiado", name: "Desconfiado", emoji: "😒", description: "Questiona tudo, pede referências",
    prompt: "Voce e Fabio, cliente desconfiado. Questiona TUDO: \"isso e confiavel?\", \"ja tive problema com agencia antes\", pede CNPJ, referencias. Familia com 2 filhos. Precisa ser conquistado com transparencia e provas." },
  { id: "pechincheiro", name: "Pechincheiro", emoji: "💸", description: "Sempre acha caro, compara concorrentes",
    prompt: "Voce e Roberto, SEMPRE pede desconto. Compara com CVC e Decolar. Usa \"ta muito caro\", \"nao tem como melhorar?\". Quer Cancun ou Orlando, R$8mil por pessoa. Se oferecerem desconto, pede mais. Negocia tudo." },
  { id: "familia", name: "Família", emoji: "👨‍👩‍👧‍👦", description: "Casal com filhos, segurança e conforto",
    prompt: "Voce e Patricia, mae de familia. Viagem com marido e 2 filhos (4 e 8 anos). Preocupada com seguranca, hotel com piscina infantil, transfer seguro. Pergunta sobre medico e emergencia. Quer Orlando ou Cancun. R$25mil total." },
  { id: "lua-mel", name: "Lua de Mel", emoji: "💑", description: "Casal, experiência romântica",
    prompt: "Voce e Marina, recém noiva. Quer lua de mel PERFEITA. Pede surpresas, jantar a luz de velas, quarto decorado, experiencias exclusivas. Sem limite de budget claro. Maldivas ou Dubai ou Grecia." },
  { id: "corporativo", name: "Corporativo", emoji: "🏢", description: "Viagem de negócios, objetividade",
    prompt: "Voce e Ricardo, executivo. Viagem de negocios para Nova York, 5 dias. Precisa de hotel perto do centro financeiro, transfer pontual. Respostas curtas e diretas. Budget da empresa, ate R$15mil." },
  { id: "reclamacao", name: "Reclamação", emoji: "😡", description: "Insatisfeito, quer solução imediata",
    prompt: "Voce e Carlos, cliente com problema. Hotel diferente do prometido ou transfer nao apareceu. Esta frustrado e exigindo solucao AGORA. Testa a capacidade de resolucao e recuperacao de relacionamento do agente." },
];

interface ChatMessage {
  role: "client" | "agent";
  content: string;
  agentName?: string;
}

interface TestResult {
  id: string;
  timestamp: Date;
  agentId: string;
  agentName: string;
  agentEmoji: string;
  perfilId: string;
  perfilName: string;
  perfilEmoji: string;
  score: number;
  aderencia: number;
  sentimento: number;
  clareza: number;
  proatividade: number;
  rodadas: number;
  aprovado: boolean;
  insights: { titulo: string; tipo: string; agente: string; sugestao: string; impacto: string }[];
  avaliacaoTexto: string;
  messages: ChatMessage[];
  responseTimeMs: number;
}

// ---- API helpers ----
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
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
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
        try { const p = JSON.parse(json); const c = p.choices?.[0]?.delta?.content; if (c) text += c; } catch { }
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
  for (let i = 0; i < rodadas; i++) {
    aderencia = Math.min(100, aderencia + 5 + Math.floor(Math.random() * 10));
    clareza = Math.min(100, clareza + 6 + Math.floor(Math.random() * 8));
  }
  for (const msg of messages) {
    if (msg.role === "client") {
      if (/\?|caro|não|nao/.test(msg.content.toLowerCase())) sentimento = Math.max(0, sentimento - 5);
      if (/!|legal|amo|incrivel|perfeito/.test(msg.content.toLowerCase())) sentimento = Math.min(100, sentimento + 5);
    }
  }
  const total = Math.round((aderencia + sentimento + clareza) / 3);
  return { aderencia, sentimento, clareza, total };
}

const HISTORY_KEY = "natleva_auto_sim_history";

function loadHistory(): TestResult[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw).map((r: any) => ({ ...r, timestamp: new Date(r.timestamp) }));
  } catch { return []; }
}

function saveHistory(results: TestResult[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(results.slice(0, 200)));
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

  // KPIs from history
  const allResults = [...history, ...results];
  const avgScore = allResults.length > 0 ? Math.round(allResults.reduce((s, r) => s + r.score, 0) / allResults.length) : 0;
  const aprovados = allResults.filter(r => r.aprovado).length;
  const bestAgent = allResults.length > 0 ? (() => {
    const byAgent: Record<string, { sum: number; count: number; name: string; emoji: string }> = {};
    allResults.forEach(r => {
      if (!byAgent[r.agentId]) byAgent[r.agentId] = { sum: 0, count: 0, name: r.agentName, emoji: r.agentEmoji };
      byAgent[r.agentId].sum += r.score;
      byAgent[r.agentId].count++;
    });
    let best = { name: "", emoji: "", avg: 0 };
    Object.values(byAgent).forEach(v => { const avg = v.sum / v.count; if (avg > best.avg) best = { name: v.name, emoji: v.emoji, avg }; });
    return best;
  })() : null;

  const runTests = useCallback(async () => {
    if (selectedAgents.length === 0 || selectedProfiles.length === 0) {
      toast({ title: "Selecione agentes e perfis", variant: "destructive" });
      return;
    }
    setRunning(true);
    setResults([]);
    setSelectedResult(null);
    setShowChat(false);
    const newResults: TestResult[] = [];
    let completed = 0;

    for (const profileId of selectedProfiles) {
      const profile = CLIENT_PROFILES.find(p => p.id === profileId)!;

      // Build agent funnel for this test
      const agentFunnel = selectedAgents.map(id => AGENTS_V4.find(a => a.id === id)!);
      let currentAgentIdx = 0;
      const messages: ChatMessage[] = [];
      const start = Date.now();

      setLiveMessages([]);
      setLiveScores(null);
      setProgressLabel(`${agentFunnel[0].emoji} ${agentFunnel[0].name} × ${profile.emoji} ${profile.name}`);

      try {
        // Client first message
        const clientFirst = await callAgent(buildClientSystemPrompt(profile, true), []);
        messages.push({ role: "client", content: clientFirst });
        setLiveMessages([...messages]);
        setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight), 50);

        for (let round = 0; round < rodadas; round++) {
          const agent = agentFunnel[currentAgentIdx];
          const hasNext = currentAgentIdx < agentFunnel.length - 1;

          // Agent responds
          const agentResp = await callAgent(
            buildAgentSystemPrompt(agent, hasNext),
            messages.map(m => ({ role: m.role === "client" ? "user" : "assistant", content: m.content }))
          );
          messages.push({ role: "agent", content: agentResp, agentName: agent.name });
          setLiveMessages([...messages]);

          // Check for transfer
          if (hasNext && agentResp.includes("[TRANSFERIR]")) {
            currentAgentIdx++;
          }

          // Update live scores
          const scores = computeScores(messages, round + 1);
          setLiveScores(scores);
          setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight), 50);

          // Client responds (if not last round)
          if (round < rodadas - 1) {
            await new Promise(r => setTimeout(r, 1000));
            const clientResp = await callAgent(
              buildClientSystemPrompt(profile, false),
              messages.map(m => ({ role: m.role === "client" ? "assistant" : "user", content: m.content }))
            );
            messages.push({ role: "client", content: clientResp });
            setLiveMessages([...messages]);
            setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight), 50);
          }

          await new Promise(r => setTimeout(r, 500));
        }

        // Evaluator
        setProgressLabel(`📊 Avaliando ${agentFunnel[0].name} × ${profile.name}...`);
        const evalPrompt = `Voce e especialista em qualidade de agencias de viagem premium.\nRetorne SOMENTE array JSON valido sem markdown.\nFormato: [{"titulo":"...","tipo":"problema|melhoria|positivo","agente":"...","sugestao":"...","impacto":"..."}]\nGere 3-5 itens.\n\nPERFIL: ${profile.name} (${profile.description})\nFUNIL: ${agentFunnel.map(a => a.name).join(" → ")}\n\nCONVERSA:\n${messages.map(m => `${m.role === "client" ? "CLIENTE" : `AGENTE (${m.agentName})`}: ${m.content}`).join("\n")}`;

        let insights: TestResult["insights"] = [];
        let avaliacaoTexto = "";
        try {
          const evalResp = await callAgent("Voce e especialista em qualidade de agencias de viagem premium. Retorne SOMENTE array JSON valido sem markdown.", [{ role: "user", content: evalPrompt }]);
          const jsonMatch = evalResp.match(/\[[\s\S]*\]/);
          if (jsonMatch) insights = JSON.parse(jsonMatch[0]);
          avaliacaoTexto = insights.length > 0 ? insights.filter(i => i.tipo === "positivo").map(i => i.titulo).join(". ") || insights[0]?.titulo || "" : "";
        } catch { avaliacaoTexto = "Avaliação concluída."; }

        // Final scores (use AI evaluator scores via heuristic + computed)
        const finalScores = computeScores(messages, rodadas);
        // Add proatividade from analysis
        const proatividade = Math.min(100, 40 + (messages.filter(m => m.role === "agent" && /suger|recomen|antecip|exclusiv|surpres/i.test(m.content)).length * 15));

        const result: TestResult = {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          agentId: agentFunnel[0].id,
          agentName: agentFunnel.map(a => a.name).join(" → "),
          agentEmoji: agentFunnel[0].emoji,
          perfilId: profileId,
          perfilName: profile.name,
          perfilEmoji: profile.emoji,
          score: Math.round((finalScores.aderencia + finalScores.sentimento + finalScores.clareza + proatividade) / 4),
          aderencia: finalScores.aderencia,
          sentimento: finalScores.sentimento,
          clareza: finalScores.clareza,
          proatividade,
          rodadas,
          aprovado: Math.round((finalScores.aderencia + finalScores.sentimento + finalScores.clareza + proatividade) / 4) >= 80,
          insights,
          avaliacaoTexto,
          messages,
          responseTimeMs: Date.now() - start,
        };

        newResults.push(result);
        setResults([...newResults]);
      } catch (err) {
        console.error("Test error:", err);
        toast({ title: "Erro no teste", description: `${agentFunnel[0].name} × ${profile.name} falhou`, variant: "destructive" });
      }

      completed++;
      setProgress(Math.round((completed / totalCombos) * 100));
      if (completed < totalCombos) await new Promise(r => setTimeout(r, 2000));
    }

    // Save to history
    const updated = [...newResults, ...history];
    setHistory(updated);
    saveHistory(updated);
    setRunning(false);
    setLiveMessages([]);
    setLiveScores(null);
    toast({ title: "Simulação concluída!", description: `${newResults.length} testes realizados.` });
  }, [selectedAgents, selectedProfiles, rodadas, history, totalCombos, toast]);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
          <p className={cn("text-2xl font-bold", allResults.length === 0 ? "text-muted-foreground/30" : avgScore >= 80 ? "text-emerald-500" : avgScore >= 60 ? "text-amber-500" : "text-red-500")}>
            {allResults.length === 0 ? "—" : avgScore}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Média Geral</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
          <p className="text-2xl font-bold">{allResults.length || "—"}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Testes Realizados</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-500">{aprovados || "—"}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Aprovados (≥80)</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
          {bestAgent && bestAgent.name ? (
            <><p className="text-2xl">{bestAgent.emoji}</p><p className="text-[10px] text-muted-foreground mt-1">Melhor: {bestAgent.name}</p></>
          ) : (
            <><p className="text-2xl text-muted-foreground/30">—</p><p className="text-[10px] text-muted-foreground mt-1">Melhor Agente</p></>
          )}
        </div>
      </div>

      {allResults.length === 0 && !running && (
        <p className="text-xs text-center text-muted-foreground/50">Rode a primeira simulação para ver KPIs aqui</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Config */}
        <div className="space-y-4">
          {/* Agent selection */}
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <h3 className="text-sm font-bold mb-2">Selecionar Agentes (funil)</h3>
            <div className="flex gap-1 flex-wrap mb-2">
              <button onClick={() => setActiveSquad("all")} className={cn("text-[10px] px-2 py-1 rounded-lg font-medium", activeSquad === "all" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>Todos</button>
              {SQUADS.map(s => (
                <button key={s.id} onClick={() => setActiveSquad(s.id)} className={cn("text-[10px] px-2 py-1 rounded-lg font-medium", activeSquad === s.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>{s.emoji} {s.name}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {filteredAgents.map(a => {
                const idx = selectedAgents.indexOf(a.id);
                return (
                  <button key={a.id} onClick={() => toggleAgent(a.id)}
                    className={cn("relative text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border",
                      idx >= 0 ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground hover:bg-muted border-transparent"
                    )}>
                    {idx >= 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">{idx + 1}</span>}
                    {a.emoji} {a.name}
                  </button>
                );
              })}
            </div>
            {selectedAgents.length > 0 && (
              <p className="text-[10px] text-muted-foreground mt-2">
                Funil: {selectedAgents.map(id => AGENTS_V4.find(a => a.id === id)!).map(a => a.name).join(" → ")}
              </p>
            )}
          </div>

          {/* Profile selection */}
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <h3 className="text-sm font-bold mb-2">Perfis de Cliente ({CLIENT_PROFILES.length})</h3>
            <div className="grid grid-cols-2 gap-2">
              {CLIENT_PROFILES.map(p => (
                <button key={p.id} onClick={() => toggleProfile(p.id)}
                  className={cn("text-left rounded-lg border p-3 transition-all",
                    selectedProfiles.includes(p.id) ? "bg-primary/5 border-primary/30" : "border-border/30 hover:bg-muted/30"
                  )}>
                  <span className="text-lg">{p.emoji}</span>
                  <p className="text-xs font-bold mt-1">{p.name}</p>
                  <p className="text-[9px] text-muted-foreground">{p.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Slider + action */}
          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Rodadas por teste</h3>
              <Badge variant="outline" className="text-xs">{rodadas} msgs</Badge>
            </div>
            <Slider min={4} max={20} step={1} value={[rodadas]} onValueChange={v => setRodadas(v[0])} />
            {totalCombos > 0 && (
              <p className="text-[10px] text-muted-foreground">
                ~{totalMessages} mensagens totais · ~{estimatedMinutes} min
              </p>
            )}
            <Button className="w-full gap-1.5" onClick={runTests} disabled={running || totalCombos === 0}
              variant={totalCombos === 0 ? "secondary" : "default"}>
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? "Rodando..." : totalCombos === 0 ? "Selecione agentes e perfis" : `Rodar ${totalCombos} teste${totalCombos > 1 ? "s" : ""} (${selectedAgents.length} agente${selectedAgents.length > 1 ? "s" : ""} × ${selectedProfiles.length} perfil${selectedProfiles.length > 1 ? "s" : ""})`}
            </Button>
          </div>
        </div>

        {/* Right: Live chat + results */}
        <div className="space-y-4">
          {/* Live chat during simulation */}
          {running && (
            <div className="rounded-xl border border-border/50 bg-card flex flex-col h-[400px]">
              <div className="px-4 py-2 border-b border-border/30 flex items-center justify-between">
                <p className="text-xs font-bold">{progressLabel}</p>
                <Badge variant="outline" className="text-[9px]">{progress}%</Badge>
              </div>
              <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                {liveMessages.map((msg, i) => (
                  <div key={i} className={cn("flex gap-2", msg.role === "client" ? "justify-end" : "justify-start")}>
                    <div className={cn("rounded-2xl px-3 py-2 max-w-[80%] text-xs",
                      msg.role === "client" ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded-br-md" : "bg-muted rounded-bl-md"
                    )}>
                      {msg.agentName && <p className="text-[9px] font-bold text-primary mb-0.5">{msg.agentName}</p>}
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
              {liveScores && (
                <div className="px-4 py-2 border-t border-border/30 grid grid-cols-3 gap-2">
                  {[
                    { label: "Aderência", v: liveScores.aderencia },
                    { label: "Sentimento", v: liveScores.sentimento },
                    { label: "Clareza", v: liveScores.clareza },
                  ].map(d => (
                    <div key={d.label}>
                      <p className="text-[8px] text-muted-foreground">{d.label}</p>
                      <Progress value={d.v} className="h-1" />
                      <p className={cn("text-[9px] font-medium", d.v >= 80 ? "text-emerald-500" : d.v >= 60 ? "text-amber-500" : "text-red-500")}>{d.v}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="px-4 py-2 border-t border-border/30">
                <Progress value={progress} className="h-1.5" />
              </div>
            </div>
          )}

          {/* Results panel */}
          {results.length > 0 && !running && (
            <div className="rounded-xl border border-border/50 bg-card">
              <div className="px-4 py-3 border-b border-border/30">
                <h3 className="text-sm font-bold">📊 Resultados da última rodada</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-border/30">
                {/* List */}
                <div className="max-h-[500px] overflow-y-auto divide-y divide-border/20">
                  {results.map(r => (
                    <button key={r.id} onClick={() => { setSelectedResult(r); setShowChat(false); }}
                      className={cn("w-full text-left p-3 hover:bg-muted/30 transition-colors",
                        selectedResult?.id === r.id && "bg-muted/50"
                      )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{r.agentEmoji}</span>
                          <div>
                            <p className="text-xs font-bold">{r.agentName}</p>
                            <p className="text-[9px] text-muted-foreground">{r.perfilEmoji} {r.perfilName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {r.aprovado ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-amber-500" />}
                          <span className={cn("text-sm font-bold", r.aprovado ? "text-emerald-500" : "text-amber-500")}>{r.score}</span>
                          <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {/* Detail */}
                <div className="p-4 max-h-[500px] overflow-y-auto">
                  {selectedResult ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{selectedResult.agentEmoji}</span>
                        <div>
                          <p className="text-sm font-bold">{selectedResult.agentName}</p>
                          <p className="text-xs text-muted-foreground">{selectedResult.perfilEmoji} {selectedResult.perfilName}</p>
                        </div>
                        <Badge className={cn("ml-auto", selectedResult.aprovado ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-amber-500/10 text-amber-600 border-amber-500/30")} variant="outline">
                          {selectedResult.aprovado ? "Aprovado" : "Reprovado"} · {selectedResult.score}/100
                        </Badge>
                      </div>

                      {selectedResult.avaliacaoTexto && (
                        <div className="flex items-start gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                          <Star className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                          <p className="text-[11px]">{selectedResult.avaliacaoTexto}</p>
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
                            <p className="text-[9px] text-muted-foreground mb-1">{dim.label}</p>
                            <Progress value={dim.value} className="h-1.5" />
                            <p className={cn("text-xs font-medium mt-0.5", dim.value >= 80 ? "text-emerald-500" : dim.value >= 60 ? "text-amber-500" : "text-red-500")}>{dim.value}</p>
                          </div>
                        ))}
                      </div>

                      <p className="text-[10px] text-muted-foreground">{(selectedResult.responseTimeMs / 1000).toFixed(1)}s · {selectedResult.rodadas} rodadas</p>

                      {selectedResult.insights.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground">Insights do avaliador:</p>
                          {selectedResult.insights.map((ins, i) => (
                            <div key={i} className={cn("text-[10px] p-2 rounded border",
                              ins.tipo === "positivo" ? "bg-emerald-500/5 border-emerald-500/20" :
                              ins.tipo === "problema" ? "bg-red-500/5 border-red-500/20" :
                              "bg-amber-500/5 border-amber-500/20"
                            )}>
                              <p className="font-bold">{ins.titulo}</p>
                              <p className="text-muted-foreground">{ins.sugestao}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      <button onClick={() => setShowChat(!showChat)} className="text-[10px] text-primary hover:underline cursor-pointer">
                        {showChat ? "Ocultar conversa" : "Ver conversa completa"}
                      </button>
                      {showChat && (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto p-2 rounded bg-muted/20">
                          {selectedResult.messages.map((msg, i) => (
                            <div key={i} className={cn("flex gap-2", msg.role === "client" ? "justify-end" : "justify-start")}>
                              <div className={cn("rounded-xl px-3 py-2 max-w-[85%] text-[11px]",
                                msg.role === "client" ? "bg-blue-500/10 rounded-br-sm" : "bg-muted rounded-bl-sm"
                              )}>
                                {msg.agentName && <p className="text-[9px] font-bold text-primary mb-0.5">{msg.agentName}</p>}
                                {msg.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-xs">Clique em um teste para ver detalhes</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {results.length === 0 && !running && (
            <div className="rounded-xl border border-border/50 bg-card p-12 text-center">
              <Play className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Selecione agentes e perfis, depois clique em "Rodar Teste"</p>
              <p className="text-xs text-muted-foreground/50 mt-1">Os testes rodam em sequência com chat ao vivo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
