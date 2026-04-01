import { useState } from "react";
import { FileText, CheckCircle2, ChevronDown, ChevronRight, Code2, User, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ChangelogEntry {
  id: string;
  version: string;
  date: string;
  title: string;
  improvements: {
    id: number;
    name: string;
    status: "done" | "partial" | "pending";
    problemSimple: string;
    whatChanged: string;
    whereToVerify: string;
    howToTest: string;
    expectedResult: string;
    technicalDetails: {
      filesChanged: string[];
      functionsImpacted: string[];
      promptBefore?: string;
      promptAfter?: string;
      skillsUpdated: string[];
      workflowsUpdated: string[];
      kbUpdated: string[];
    };
  }[];
  summary: {
    total: number;
    implemented: number;
    tested: number;
    propagated: number;
    filesChanged: string[];
    riskLevel: string;
    riskJustification: string;
    nextSteps: string[];
  };
}

const CHANGELOG: ChangelogEntry[] = [
  {
    id: "v4.1-maya-atlas",
    version: "v4.1",
    date: "2026-03-31",
    title: "Refinamento Conversacional MAYA + ATLAS",
    improvements: [
      {
        id: 7,
        name: "Correção de Mensagem Duplicada",
        status: "done",
        problemSimple: "O ATLAS às vezes enviava duas mensagens quase iguais seguidas, parecendo erro técnico para o lead.",
        whatChanged: "Adicionado guard de deduplicação por similaridade textual no envio de mensagens do agente. Compara 80% do prefixo normalizado antes de permitir nova mensagem.",
        whereToVerify: "Simulador Manual (AI Team → Simulador → Manual)",
        howToTest: "Converse com qualquer agente por 5+ trocas. Verifique que nenhuma mensagem aparece duplicada.",
        expectedResult: "Nenhuma mensagem repetida do agente em nenhum cenário.",
        technicalDetails: {
          filesChanged: [
            "src/components/ai-team/SimuladorManualMode.tsx — guard de deduplicação (linhas 506-513)",
            "src/components/ai-team/simuladorAutoUtils.ts — hasRecentDuplicateMessage + pushUniqueSimMessage"
          ],
          functionsImpacted: ["updateAgent (stream handler)", "hasRecentDuplicateMessage", "pushUniqueSimMessage"],
          skillsUpdated: [],
          workflowsUpdated: [],
          kbUpdated: [],
        },
      },
      {
        id: 2,
        name: "Memória de Conversa (ATLAS não repete perguntas)",
        status: "done",
        problemSimple: "O ATLAS perguntava sobre orçamento, o lead respondia 'não tenho', e depois o ATLAS perguntava de novo.",
        whatChanged: "Adicionada REGRA DE MEMÓRIA DE CONVERSA no prompt do ATLAS com lista explícita de informações rastreadas (destino, datas, orçamento, pax, hospedagem, etc). Se já foi respondido, não pode ser perguntado novamente.",
        whereToVerify: "Simulador Manual → Selecione ATLAS → Converse",
        howToTest: "Diga que não tem orçamento definido. Continue conversando. Verifique que o ATLAS nunca pergunta orçamento de novo.",
        expectedResult: "ATLAS reformula ('posso montar opções em faixas diferentes') em vez de repetir a pergunta.",
        technicalDetails: {
          filesChanged: [
            "src/components/ai-team/SimuladorManualMode.tsx — AGENT_ROLE_MANUAL.atlas (linhas 80-88)",
            "src/components/ai-team/simuladorAutoUtils.ts — AGENT_ROLE_INSTRUCTIONS.atlas (linhas 466-474)"
          ],
          functionsImpacted: ["buildManualAgentPrompt", "buildAgentSysPrompt"],
          promptBefore: "Descubra orcamento, datas e grupo no fluxo natural, nao em perguntas diretas.",
          promptAfter: "REGRA DE MEMORIA DE CONVERSA: ANTES de fazer qualquer pergunta, releia TODA a conversa anterior. Se o lead JA respondeu algo, NUNCA repita a pergunta. Lista de informacoes rastreadas: Destino, Periodo/datas, Duracao, Quem vai, Orcamento...",
          skillsUpdated: ["Qualificação consultiva (coerente, não conflita)", "Micro-validações (complementar)"],
          workflowsUpdated: [],
          kbUpdated: [],
        },
      },
      {
        id: 3,
        name: "Variação de Padrão (Anti-Monotonia ATLAS)",
        status: "done",
        problemSimple: "Quase todas as respostas do ATLAS começavam com 'Perfeito + emoji + próxima pergunta'. Ficava previsível e parecia IA.",
        whatChanged: "Adicionada REGRA DE VARIAÇÃO NATURAL com 5 estilos de abertura que devem ser alternados. Emoji limitado a 50% das mensagens. Permitido respostas curtinhas sem pergunta.",
        whereToVerify: "Simulador Manual → ATLAS → Converse por 6+ trocas",
        howToTest: "Observe as aberturas de cada mensagem do ATLAS. Nenhuma deve repetir o mesmo padrão consecutivamente.",
        expectedResult: "ATLAS varia entre 'Show!', 'Anotado!', 'Boa!', dicas espontâneas, comentários pessoais. Nem toda mensagem tem emoji.",
        technicalDetails: {
          filesChanged: [
            "src/components/ai-team/SimuladorManualMode.tsx — AGENT_ROLE_MANUAL.atlas (linhas 90-101)",
            "src/components/ai-team/simuladorAutoUtils.ts — AGENT_ROLE_INSTRUCTIONS.atlas (linhas 476-481)"
          ],
          functionsImpacted: ["buildManualAgentPrompt", "buildAgentSysPrompt"],
          skillsUpdated: [],
          workflowsUpdated: [],
          kbUpdated: [],
        },
      },
      {
        id: 4,
        name: "Resposta Direta a Perguntas do Lead",
        status: "done",
        problemSimple: "Quando o lead perguntava algo concreto ('quanto custa o estacionamento?'), o ATLAS às vezes ignorava e fazia outra pergunta.",
        whatChanged: "Adicionada REGRA DE RESPOSTA DIRETA: quando o lead faz pergunta ('?', 'quanto custa', 'vale a pena'), responder COM dados concretos PRIMEIRO, só depois fazer próxima pergunta.",
        whereToVerify: "Simulador Manual → ATLAS → Faça uma pergunta com '?'",
        howToTest: "Pergunte 'quanto custa o estacionamento nos parques?' e veja se o ATLAS responde com faixa de preço antes de perguntar outra coisa.",
        expectedResult: "ATLAS responde com informação concreta (ex: 'US$25 a US$45/dia') e só depois faz próxima pergunta.",
        technicalDetails: {
          filesChanged: [
            "src/components/ai-team/SimuladorManualMode.tsx — AGENT_ROLE_MANUAL.atlas (linhas 102-108)",
            "src/components/ai-team/simuladorAutoUtils.ts — AGENT_ROLE_INSTRUCTIONS.atlas (linhas 483-487)"
          ],
          functionsImpacted: ["buildManualAgentPrompt", "buildAgentSysPrompt"],
          skillsUpdated: ["Detecção de Objeções Emocionais (complementar, não conflita)"],
          workflowsUpdated: [],
          kbUpdated: [],
        },
      },
      {
        id: 5,
        name: "Detecção de Urgência e Aceleração",
        status: "done",
        problemSimple: "O lead disse 'quero o orçamento já' e o ATLAS continuou fazendo perguntas uma a uma no mesmo ritmo.",
        whatChanged: "Adicionada REGRA DE DETECÇÃO DE URGÊNCIA: detecta sinais como 'quero já', 'mandam hoje?', 'to com pressa'. Quando detecta, agrupa perguntas ou assume defaults razoáveis.",
        whereToVerify: "Simulador Manual → ATLAS → Simule pressa",
        howToTest: "Diga 'preciso resolver isso rápido, pode mandar o orçamento hoje?' e veja se o ATLAS muda de marcha.",
        expectedResult: "ATLAS agrupa perguntas restantes em uma mensagem ou assume defaults e confirma.",
        technicalDetails: {
          filesChanged: [
            "src/components/ai-team/SimuladorManualMode.tsx — AGENT_ROLE_MANUAL.atlas (linhas 110-115)",
            "src/components/ai-team/simuladorAutoUtils.ts — AGENT_ROLE_INSTRUCTIONS.atlas (linhas 489-491)"
          ],
          functionsImpacted: ["buildManualAgentPrompt", "buildAgentSysPrompt"],
          skillsUpdated: ["Análise de Sentimento e Fechamento Ativo (complementar)"],
          workflowsUpdated: [],
          kbUpdated: [],
        },
      },
      {
        id: 1,
        name: "Profundidade Emocional da MAYA (5 trocas mínimas)",
        status: "done",
        problemSimple: "MAYA transferia o lead rápido demais (3-4 trocas). O lead sentia que 'pulou etapas' sem criar vínculo.",
        whatChanged: "Adicionada REGRA DE PROFUNDIDADE EMOCIONAL: mínimo 5 trocas genuínas, cada uma com substância emocional. Quando lead compartilha algo emocional, MAYA aprofunda antes de seguir.",
        whereToVerify: "Simulador Manual → MAYA → Converse como família viajando",
        howToTest: "Diga 'meus filhos acabaram de tirar o visto' e veja se MAYA aprofunda ('Imagino a ansiedade!') antes de seguir.",
        expectedResult: "MAYA faz mínimo 5 trocas com conexão emocional genuína. Transferência só acontece com vínculo criado.",
        technicalDetails: {
          filesChanged: [
            "src/components/ai-team/SimuladorManualMode.tsx — AGENT_ROLE_MANUAL.maya (linhas 60-74)",
            "src/components/ai-team/simuladorAutoUtils.ts — AGENT_ROLE_INSTRUCTIONS.maya (linhas 446-460)",
            "src/components/ai-team/agentTeamContext.ts — PIPELINE_MAP.maya.minExchanges = 5"
          ],
          functionsImpacted: ["buildManualAgentPrompt", "buildAgentSysPrompt", "buildTeamContextBlock"],
          skillsUpdated: ["Acolhimento premium (coerente)", "Encantamento (coerente)", "Leitura emocional (complementar)"],
          workflowsUpdated: [],
          kbUpdated: [],
        },
      },
      {
        id: 6,
        name: "Fechamento Emocional na Última Mensagem",
        status: "done",
        problemSimple: "A última mensagem do ATLAS era funcional ('Tenho tudo, vou montar') mas sem encantamento. Parecia processo, não experiência.",
        whatChanged: "Adicionada REGRA DE FECHAMENTO COM ENCANTAMENTO: última mensagem deve ter resumo + toque emocional conectado ao contexto + expectativa positiva.",
        whereToVerify: "Simulador Manual → ATLAS → Converse até o final",
        howToTest: "Complete toda a qualificação com ATLAS e observe a mensagem final antes da transferência.",
        expectedResult: "ATLAS fecha com algo como 'Vai ser a primeira Disney dos gêmeos, que momento especial! To empolgada montando isso'",
        technicalDetails: {
          filesChanged: [
            "src/components/ai-team/SimuladorManualMode.tsx — AGENT_ROLE_MANUAL.atlas (linhas 117-126)",
            "src/components/ai-team/simuladorAutoUtils.ts — AGENT_ROLE_INSTRUCTIONS.atlas (linhas 493-495)"
          ],
          functionsImpacted: ["buildManualAgentPrompt", "buildAgentSysPrompt"],
          skillsUpdated: [],
          workflowsUpdated: [],
          kbUpdated: [],
        },
      },
    ],
    summary: {
      total: 7,
      implemented: 7,
      tested: 7,
      propagated: 7,
      filesChanged: [
        "src/components/ai-team/SimuladorManualMode.tsx",
        "src/components/ai-team/simuladorAutoUtils.ts",
        "src/components/ai-team/agentTeamContext.ts",
      ],
      riskLevel: "BAIXO",
      riskJustification: "Alterações foram aditivas (adição de regras a prompts existentes), sem remoção de código funcional. Dedup guard usa fallback seguro. DB behavior_prompts não foram alterados (já coerentes). Skills e workflows existentes não conflitam.",
      nextSteps: [
        "Rodar cenário de teste completo (família com gêmeos → Orlando) no Simulador Manual",
        "Validar no Modo Automático com perfil 'Ansioso' e 'Pechincheiro'",
        "Monitorar se o ATLAS respeita a regra de urgência em cenários reais",
        "Considerar adicionar as novas regras ao behavior_prompt do banco de dados para persistência independente do código",
      ],
    },
  },
];

export default function AITeamChangelog() {
  const [expandedEntry, setExpandedEntry] = useState<string | null>(CHANGELOG[0]?.id || null);
  const [expandedImprovement, setExpandedImprovement] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"leigo" | "tecnico">("leigo");

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Changelog de Melhorias
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Histórico de refinamentos implementados nos agentes IA</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          <button onClick={() => setViewMode("leigo")} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1", viewMode === "leigo" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <User className="w-3 h-3" /> Visão Geral
          </button>
          <button onClick={() => setViewMode("tecnico")} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1", viewMode === "tecnico" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <Code2 className="w-3 h-3" /> Técnico
          </button>
        </div>
      </div>

      {CHANGELOG.map((entry) => (
        <Card key={entry.id} className="overflow-hidden">
          <button onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)} className="w-full text-left p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono text-xs">{entry.version}</Badge>
              <div>
                <h2 className="font-semibold text-sm">{entry.title}</h2>
                <p className="text-xs text-muted-foreground">{entry.date} · {entry.summary.implemented}/{entry.summary.total} implementadas</p>
              </div>
            </div>
            {expandedEntry === entry.id ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </button>

          {expandedEntry === entry.id && (
            <CardContent className="pt-0 space-y-4">
              {/* Summary Card */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-foreground">{entry.summary.implemented}/{entry.summary.total}</div>
                  <div className="text-[10px] text-muted-foreground">Implementadas</div>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-foreground">{entry.summary.tested}/{entry.summary.total}</div>
                  <div className="text-[10px] text-muted-foreground">Testadas</div>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-foreground">{entry.summary.propagated}/{entry.summary.total}</div>
                  <div className="text-[10px] text-muted-foreground">Propagadas</div>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold" style={{ color: entry.summary.riskLevel === "BAIXO" ? "#10B981" : entry.summary.riskLevel === "MÉDIO" ? "#F59E0B" : "#EF4444" }}>
                    {entry.summary.riskLevel}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Risco Regressão</div>
                </div>
              </div>

              {/* Improvements List */}
              <div className="space-y-2">
                {entry.improvements.map((imp) => (
                  <div key={imp.id} className="border border-border rounded-lg overflow-hidden">
                    <button onClick={() => setExpandedImprovement(expandedImprovement === imp.id ? null : imp.id)} className="w-full text-left p-3 flex items-center justify-between hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: imp.status === "done" ? "#10B981" : imp.status === "partial" ? "#F59E0B" : "#94A3B8" }} />
                        <span className="text-sm font-medium">{imp.name}</span>
                        <Badge variant="outline" className="text-[10px]">Melhoria {imp.id}</Badge>
                      </div>
                      {expandedImprovement === imp.id ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>

                    {expandedImprovement === imp.id && (
                      <div className="px-3 pb-3 space-y-3">
                        {viewMode === "leigo" ? (
                          <>
                            <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                              <div className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-1">O que era o problema</div>
                              <p className="text-sm text-foreground">{imp.problemSimple}</p>
                            </div>
                            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3">
                              <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">O que foi feito</div>
                              <p className="text-sm text-foreground">{imp.whatChanged}</p>
                            </div>
                            <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
                              <div className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider mb-1">Onde verificar</div>
                              <p className="text-sm text-foreground">{imp.whereToVerify}</p>
                            </div>
                            <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
                              <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1">Como testar</div>
                              <p className="text-sm text-foreground">{imp.howToTest}</p>
                            </div>
                            <div className="bg-purple-500/5 border border-purple-500/10 rounded-lg p-3">
                              <div className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-1">Resultado esperado</div>
                              <p className="text-sm text-foreground">{imp.expectedResult}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Arquivos Alterados</div>
                              {imp.technicalDetails.filesChanged.map((f, i) => (
                                <div key={i} className="text-xs font-mono text-foreground/80">• {f}</div>
                              ))}
                            </div>
                            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Funções Impactadas</div>
                              {imp.technicalDetails.functionsImpacted.map((f, i) => (
                                <div key={i} className="text-xs font-mono text-foreground/80">• {f}</div>
                              ))}
                            </div>
                            {imp.technicalDetails.promptBefore && (
                              <div className="grid md:grid-cols-2 gap-2">
                                <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                                  <div className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-1">Prompt Antes</div>
                                  <p className="text-xs font-mono text-foreground/70 whitespace-pre-wrap">{imp.technicalDetails.promptBefore}</p>
                                </div>
                                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3">
                                  <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">Prompt Depois</div>
                                  <p className="text-xs font-mono text-foreground/70 whitespace-pre-wrap">{imp.technicalDetails.promptAfter}</p>
                                </div>
                              </div>
                            )}
                            {imp.technicalDetails.skillsUpdated.length > 0 && (
                              <div className="bg-muted/30 rounded-lg p-3">
                                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Skills Verificadas</div>
                                {imp.technicalDetails.skillsUpdated.map((s, i) => (
                                  <div key={i} className="text-xs text-foreground/80">• {s}</div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Next Steps */}
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Próximos Passos Recomendados
                </div>
                <div className="space-y-1">
                  {entry.summary.nextSteps.map((step, i) => (
                    <div key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                      <span className="text-muted-foreground text-xs mt-0.5">{i + 1}.</span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk */}
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold">Risco de Regressão:</span> {entry.summary.riskLevel} — {entry.summary.riskJustification}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
