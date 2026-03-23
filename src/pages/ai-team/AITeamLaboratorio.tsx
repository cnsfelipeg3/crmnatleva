import { FlaskConical, Play, BarChart3, Loader2, CheckCircle2 } from "lucide-react";
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
];

interface TestResult {
  agentId: string;
  profileId: string;
  profileName: string;
  response: string;
  aderencia: number;
  sentimento: number;
  clareza: number;
  total: number;
  responseTime: number;
}

export default function AITeamLaboratorio() {
  const [selectedAgents, setSelectedAgents] = useState<string[]>(["maya", "nero", "habibi"]);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>(["sonhador", "pechincheiro"]);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [progress, setProgress] = useState(0);
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

        const start = Date.now();
        try {
          const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`;
          const resp = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              question: `[Stress Test - Perfil: ${profile.name}] ${profile.prompt}`,
              agentName: agent.name,
              agentRole: agent.persona,
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

          const responseTime = Date.now() - start;
          const hasGreeting = /oi|olá|bem.?vindo|prazer/i.test(text);
          const hasDestination = /hotel|voo|pacote|destino|experiência|roteiro/i.test(text);
          const hasPersonalization = new RegExp(profile.name, "i").test(text) || /você|seu|sua|vocês/i.test(text);
          const hasCTA = /entre em contato|vamos|agende|podemos|quando|marcar/i.test(text);
          const isLong = text.length > 100;

          const aderencia = Math.min(100, 40 + (hasGreeting ? 15 : 0) + (hasDestination ? 20 : 0) + (hasCTA ? 15 : 0) + (isLong ? 10 : 0));
          const sentimento = Math.min(100, 50 + (hasGreeting ? 20 : 0) + (hasPersonalization ? 15 : 0) + (isLong ? 15 : 0));
          const clareza = Math.min(100, 45 + (hasDestination ? 20 : 0) + (hasCTA ? 15 : 0) + (isLong ? 20 : 0));
          const totalScore = Math.round((aderencia + sentimento + clareza) / 3);

          newResults.push({
            agentId, profileId, profileName: profile.name, response: text,
            aderencia, sentimento, clareza, total: totalScore, responseTime,
          });
        } catch {
          newResults.push({
            agentId, profileId, profileName: profile.name, response: "Erro",
            aderencia: 0, sentimento: 0, clareza: 0, total: 0, responseTime: Date.now() - start,
          });
        }

        completed++;
        setProgress(Math.round((completed / total) * 100));
        setResults([...newResults]);

        // Delay between calls to avoid rate limiting
        if (completed < total) await new Promise(r => setTimeout(r, 1500));
      }
    }

    setRunning(false);
    toast({ title: "Teste concluído!", description: `${newResults.length} cenários testados.` });
  }, [selectedAgents, selectedProfiles, toast]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><FlaskConical className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold">Laboratório (War Room)</h1>
            <p className="text-sm text-muted-foreground">Stress test real com IA — testa cada agente contra perfis de cliente</p>
          </div>
        </div>
        <Button className="gap-1.5" onClick={runTests} disabled={running}>
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? "Testando..." : "Rodar Teste"}
        </Button>
      </div>

      {running && (
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-muted-foreground">Progresso</span>
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
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
            <h3 className="text-sm font-bold mb-3">Perfis de Cliente</h3>
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
              <p className="text-xs text-muted-foreground/50 mt-1">Cada agente será testado contra cada perfil via IA</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
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
                      <span className={cn("text-lg font-bold",
                        r.total >= 80 ? "text-emerald-500" : r.total >= 60 ? "text-amber-500" : "text-red-500"
                      )}>{r.total}/100</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Aderência", value: r.aderencia },
                        { label: "Sentimento", value: r.sentimento },
                        { label: "Clareza", value: r.clareza },
                      ].map(dim => (
                        <div key={dim.label}>
                          <p className="text-[10px] text-muted-foreground mb-1">{dim.label}</p>
                          <Progress value={dim.value} className="h-1.5" />
                          <p className="text-xs font-medium mt-0.5">{dim.value}%</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">{(r.responseTime / 1000).toFixed(1)}s · {r.response.length} chars</p>
                    {r.response && r.response !== "Erro" && (
                      <details className="mt-2">
                        <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">Ver resposta</summary>
                        <p className="text-xs text-muted-foreground/70 mt-1 p-2 rounded bg-muted/30 whitespace-pre-wrap">{r.response.slice(0, 500)}</p>
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
