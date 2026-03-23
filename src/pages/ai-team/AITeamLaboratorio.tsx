import { FlaskConical, Play, BarChart3, Loader2, CheckCircle2, Star, Zap } from "lucide-react";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AGENTS_V4 } from "@/components/ai-team/agentsV4Data";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const CLIENT_PROFILES = [
  { id: "sonhador", name: "Sonhador", emoji: "🌟", description: "Empolgado, sem budget definido, quer tudo", prompt: "Oi! Estou morrendo de vontade de viajar, quero conhecer tudo! Não tenho um orçamento definido ainda mas quero algo incrível. O que vocês recomendam?" },
  { id: "indeciso", name: "Indeciso", emoji: "🤔", description: "Não sabe o destino, precisa de orientação", prompt: "Então, eu e minha esposa queremos viajar em julho mas não sabemos pra onde. Vocês podem ajudar a escolher?" },
  { id: "desconfiado", name: "Desconfiado", emoji: "😒", description: "Questiona tudo, pede referências", prompt: "Vi no site de vocês, mas como sei que é confiável? Tem referências? Qual a garantia se algo der errado na viagem?" },
  { id: "pechincheiro", name: "Pechincheiro", emoji: "💸", description: "Sempre acha caro, compara concorrentes", prompt: "Recebi uma cotação de outra agência por R$ 8.000. Vocês conseguem cobrir? Achei o preço de vocês bem acima do mercado." },
  { id: "familia", name: "Família", emoji: "👨‍👩‍👧‍👦", description: "Casal com filhos, segurança e conforto", prompt: "Somos eu, minha esposa e 2 filhos (5 e 8 anos). Queremos Orlando mas preciso de hotel seguro perto dos parques. Tem opção com cozinha?" },
  { id: "lua-mel", name: "Lua de Mel", emoji: "💑", description: "Casal, experiência romântica", prompt: "Vamos casar em setembro e queremos uma lua de mel inesquecível! Maldivas ou Bali? Queremos algo super romântico e exclusivo." },
  { id: "corporativo", name: "Corporativo", emoji: "🏢", description: "Viagem de negócios, objetividade", prompt: "Preciso de 5 passagens São Paulo - Nova York para reunião na próxima terça. Classe executiva, hotel perto de Midtown. Urgente." },
  { id: "reclamacao", name: "Reclamação", emoji: "😡", description: "Insatisfeito, quer solução imediata", prompt: "O hotel que vocês reservaram estava sujo, o quarto era diferente das fotos e o café da manhã era horrível. Quero reembolso e uma explicação." },
];

interface TestResult {
  agentId: string;
  profileId: string;
  profileName: string;
  response: string;
  aderencia: number;
  sentimento: number;
  clareza: number;
  proatividade: number;
  total: number;
  responseTime: number;
  aiEvaluation: string;
}

async function streamAgentResponse(agentName: string, agentPersona: string, prompt: string): Promise<{ text: string; time: number }> {
  const start = Date.now();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      question: prompt,
      agentName,
      agentRole: agentPersona,
    }),
  });

  let text = "";
  if (resp.ok && resp.body) {
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        let line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") break;
        try {
          const parsed = JSON.parse(json);
          const c = parsed.choices?.[0]?.delta?.content;
          if (c) text += c;
        } catch { /* skip */ }
      }
    }
  } else if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${errText}`);
  }

  return { text, time: Date.now() - start };
}

async function evaluateWithAI(agentName: string, profileName: string, profilePrompt: string, agentResponse: string): Promise<{ aderencia: number; sentimento: number; clareza: number; proatividade: number; avaliacao: string }> {
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`;
    const evalPrompt = `Você é um avaliador de qualidade de atendimento de uma agência de viagens premium.

AGENTE AVALIADO: ${agentName}
PERFIL DO CLIENTE: ${profileName}
MENSAGEM DO CLIENTE: "${profilePrompt}"
RESPOSTA DO AGENTE: "${agentResponse}"

Avalie a resposta do agente em 4 dimensões (0 a 100 cada):

1. ADERÊNCIA: A resposta é adequada ao perfil do cliente e à situação? Responde o que foi perguntado?
2. SENTIMENTO: O tom emocional é apropriado? Empatia, acolhimento, profissionalismo?
3. CLAREZA: A resposta é clara, organizada e fácil de entender?
4. PROATIVIDADE: O agente vai além do pedido? Sugere, antecipa necessidades, cria valor?

Responda EXATAMENTE neste formato (sem markdown, sem quebra de linha extra):
ADERENCIA:XX
SENTIMENTO:XX
CLAREZA:XX
PROATIVIDADE:XX
AVALIACAO:Uma frase resumindo a qualidade geral da resposta.`;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        question: evalPrompt,
        agentName: "AVALIADOR",
        agentRole: "Analista de qualidade de atendimento. Responda apenas com as métricas solicitadas, sem formatação markdown.",
      }),
    });

    let text = "";
    if (resp.ok && resp.body) {
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) text += c;
          } catch { /* skip */ }
        }
      }
    }

    const parseScore = (key: string): number => {
      const match = text.match(new RegExp(`${key}:\\s*(\\d+)`, "i"));
      return match ? Math.min(100, Math.max(0, parseInt(match[1]))) : 70;
    };

    const avalMatch = text.match(/AVALIACAO:\s*(.+)/i);

    return {
      aderencia: parseScore("ADERENCIA"),
      sentimento: parseScore("SENTIMENTO"),
      clareza: parseScore("CLAREZA"),
      proatividade: parseScore("PROATIVIDADE"),
      avaliacao: avalMatch?.[1]?.trim() || "Avaliação concluída.",
    };
  } catch (err) {
    console.error("AI evaluation error:", err);
    // Fallback to heuristic scoring
    const hasGreeting = /oi|olá|bem.?vindo|prazer/i.test(agentResponse);
    const hasDestination = /hotel|voo|pacote|destino|experiência|roteiro/i.test(agentResponse);
    const hasCTA = /entre em contato|vamos|agende|podemos|quando|marcar/i.test(agentResponse);
    const isLong = agentResponse.length > 100;
    return {
      aderencia: 40 + (hasGreeting ? 15 : 0) + (hasDestination ? 20 : 0) + (hasCTA ? 15 : 0) + (isLong ? 10 : 0),
      sentimento: 50 + (hasGreeting ? 20 : 0) + (isLong ? 15 : 0) + (hasCTA ? 15 : 0),
      clareza: 45 + (hasDestination ? 20 : 0) + (hasCTA ? 15 : 0) + (isLong ? 20 : 0),
      proatividade: 40 + (hasCTA ? 25 : 0) + (hasDestination ? 20 : 0) + (isLong ? 15 : 0),
      avaliacao: "Avaliação heurística (fallback).",
    };
  }
}

export default function AITeamLaboratorio() {
  const [selectedAgents, setSelectedAgents] = useState<string[]>(["maya", "nero", "habibi"]);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>(["sonhador", "pechincheiro"]);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "generating" | "evaluating">("idle");
  const { toast } = useToast();

  const toggleAgent = (id: string) => {
    setSelectedAgents(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const toggleProfile = (id: string) => {
    setSelectedProfiles(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const runTests = useCallback(async () => {
    if (selectedAgents.length === 0 || selectedProfiles.length === 0) {
      toast({ title: "Selecione agentes e perfis", variant: "destructive" });
      return;
    }

    setRunning(true);
    setResults([]);
    const total = selectedAgents.length * selectedProfiles.length;
    let completed = 0;
    const newResults: TestResult[] = [];

    for (const agentId of selectedAgents) {
      const agent = AGENTS_V4.find(a => a.id === agentId);
      if (!agent) continue;

      for (const profileId of selectedProfiles) {
        const profile = CLIENT_PROFILES.find(p => p.id === profileId);
        if (!profile) continue;

        try {
          // Phase 1: Generate agent response
          setPhase("generating");
          const { text, time } = await streamAgentResponse(agent.name, agent.persona, profile.prompt);

          if (!text || text === "Erro") throw new Error("Empty response");

          // Phase 2: AI evaluation
          setPhase("evaluating");
          const evaluation = await evaluateWithAI(agent.name, profile.name, profile.prompt, text);

          const totalScore = Math.round((evaluation.aderencia + evaluation.sentimento + evaluation.clareza + evaluation.proatividade) / 4);

          newResults.push({
            agentId,
            profileId,
            profileName: profile.name,
            response: text,
            aderencia: evaluation.aderencia,
            sentimento: evaluation.sentimento,
            clareza: evaluation.clareza,
            proatividade: evaluation.proatividade,
            total: totalScore,
            responseTime: time,
            aiEvaluation: evaluation.avaliacao,
          });
        } catch (err) {
          console.error(`Test failed for ${agent.name} x ${profile.name}:`, err);
          newResults.push({
            agentId,
            profileId,
            profileName: profile.name,
            response: "Erro na geração da resposta",
            aderencia: 0, sentimento: 0, clareza: 0, proatividade: 0, total: 0,
            responseTime: 0,
            aiEvaluation: "Falha no teste.",
          });
        }

        completed++;
        setProgress(Math.round((completed / total) * 100));
        setResults([...newResults]);

        // Delay between calls to avoid rate limiting
        if (completed < total) await new Promise(r => setTimeout(r, 2000));
      }
    }

    setPhase("idle");
    setRunning(false);
    toast({ title: "Teste concluído!", description: `${newResults.length} cenários testados com avaliação por IA.` });
  }, [selectedAgents, selectedProfiles, toast]);

  const avgScore = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.total, 0) / results.length) : 0;
  const bestAgent = results.length > 0
    ? (() => {
        const byAgent: Record<string, number[]> = {};
        results.forEach(r => { (byAgent[r.agentId] ??= []).push(r.total); });
        let best = { id: "", avg: 0 };
        Object.entries(byAgent).forEach(([id, scores]) => {
          const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
          if (avg > best.avg) best = { id, avg };
        });
        return AGENTS_V4.find(a => a.id === best.id);
      })()
    : null;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><FlaskConical className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold">Laboratório (War Room)</h1>
            <p className="text-sm text-muted-foreground">Stress test real com IA — cada resposta é avaliada por um juiz de IA</p>
          </div>
        </div>
        <Button className="gap-1.5" onClick={runTests} disabled={running}>
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? (phase === "generating" ? "Gerando resposta..." : "Avaliando...") : "Rodar Teste"}
        </Button>
      </div>

      {running && (
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-muted-foreground">
              {phase === "generating" ? "🤖 Gerando resposta do agente..." : "📊 Avaliando com IA juiz..."}
            </span>
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Summary cards */}
      {results.length > 0 && !running && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
            <p className={cn("text-2xl font-bold", avgScore >= 80 ? "text-emerald-500" : avgScore >= 60 ? "text-amber-500" : "text-red-500")}>{avgScore}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Média Geral</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
            <p className="text-2xl font-bold">{results.length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Testes Realizados</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
            <p className="text-2xl font-bold text-emerald-500">{results.filter(r => r.total >= 80).length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Aprovados (≥80)</p>
          </div>
          {bestAgent && (
            <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
              <p className="text-2xl">{bestAgent.emoji}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Melhor: {bestAgent.name}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <h3 className="text-sm font-bold mb-3">Selecionar Agentes</h3>
            <div className="flex flex-wrap gap-2">
              {AGENTS_V4.map(a => (
                <button key={a.id} onClick={() => toggleAgent(a.id)}
                  className={cn("text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border",
                    selectedAgents.includes(a.id)
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "text-muted-foreground hover:bg-muted border-border/30"
                  )}>{a.emoji} {a.name}</button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-5">
            <h3 className="text-sm font-bold mb-3">Perfis de Cliente ({CLIENT_PROFILES.length})</h3>
            <div className="grid grid-cols-2 gap-2">
              {CLIENT_PROFILES.map(p => (
                <button key={p.id} onClick={() => toggleProfile(p.id)}
                  className={cn("text-left rounded-lg border p-3 transition-all",
                    selectedProfiles.includes(p.id)
                      ? "bg-primary/5 border-primary/30"
                      : "border-border/30 hover:bg-muted/30"
                  )}>
                  <span className="text-lg">{p.emoji}</span>
                  <p className="text-xs font-bold mt-1">{p.name}</p>
                  <p className="text-[9px] text-muted-foreground">{p.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <h3 className="text-sm font-bold mb-4">📊 Resultados</h3>
          {results.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Rode um teste para ver resultados reais</p>
              <p className="text-xs text-muted-foreground/50 mt-1">Cada resposta é avaliada por uma IA juiz em 4 dimensões</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[700px] overflow-y-auto">
              {results.map((r, i) => {
                const agent = AGENTS_V4.find(a => a.id === r.agentId);
                return (
                  <div key={i} className="rounded-lg border border-border/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{agent?.emoji}</span>
                        <span className="text-sm font-bold">{agent?.name}</span>
                        <Badge variant="outline" className="text-[9px]">{r.profileName}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.total >= 80 && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        <span className={cn("text-lg font-bold",
                          r.total >= 80 ? "text-emerald-500" : r.total >= 60 ? "text-amber-500" : "text-red-500"
                        )}>{r.total}/100</span>
                      </div>
                    </div>

                    {/* AI Evaluation */}
                    {r.aiEvaluation && (
                      <div className="flex items-start gap-2 mb-3 p-2 rounded-lg bg-primary/5 border border-primary/10">
                        <Star className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                        <p className="text-[11px] text-foreground/80">{r.aiEvaluation}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: "Aderência", value: r.aderencia },
                        { label: "Sentimento", value: r.sentimento },
                        { label: "Clareza", value: r.clareza },
                        { label: "Proatividade", value: r.proatividade },
                      ].map(dim => (
                        <div key={dim.label}>
                          <p className="text-[9px] text-muted-foreground mb-1">{dim.label}</p>
                          <Progress value={dim.value} className="h-1.5" />
                          <p className={cn("text-xs font-medium mt-0.5",
                            dim.value >= 80 ? "text-emerald-500" : dim.value >= 60 ? "text-amber-500" : "text-red-500"
                          )}>{dim.value}%</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">{(r.responseTime / 1000).toFixed(1)}s · {r.response.length} chars</p>
                    {r.response && r.response !== "Erro na geração da resposta" && (
                      <details className="mt-2">
                        <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">Ver resposta completa</summary>
                        <p className="text-xs text-muted-foreground/70 mt-1 p-2 rounded bg-muted/30 whitespace-pre-wrap">{r.response}</p>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
