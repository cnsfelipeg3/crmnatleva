// NatLeva — Sistema de Avaliação de Excelência em Atendimento
// Framework Completo: 3 Dimensões, 12 Critérios, Pesos por Agente

// ═══ PESOS POR AGENTE (% por dimensão) ═══
export const PESOS_AGENTE: Record<string, { humanizacao: number; eficaciaComercial: number; qualidadeTecnica: number }> = {
  MAYA:    { humanizacao: 0.50, eficaciaComercial: 0.30, qualidadeTecnica: 0.20 },
  ATLAS:   { humanizacao: 0.30, eficaciaComercial: 0.40, qualidadeTecnica: 0.30 },
  HABIBI:  { humanizacao: 0.30, eficaciaComercial: 0.30, qualidadeTecnica: 0.40 },
  NEMO:    { humanizacao: 0.30, eficaciaComercial: 0.30, qualidadeTecnica: 0.40 },
  DANTE:   { humanizacao: 0.30, eficaciaComercial: 0.30, qualidadeTecnica: 0.40 },
  LUNA:    { humanizacao: 0.25, eficaciaComercial: 0.50, qualidadeTecnica: 0.25 },
  NERO:    { humanizacao: 0.20, eficaciaComercial: 0.60, qualidadeTecnica: 0.20 },
  IRIS:    { humanizacao: 0.50, eficaciaComercial: 0.20, qualidadeTecnica: 0.30 },
  DEFAULT: { humanizacao: 0.35, eficaciaComercial: 0.40, qualidadeTecnica: 0.25 },
};

export function getAgentPesos(agentName: string) {
  const key = agentName.toUpperCase();
  return PESOS_AGENTE[key] || PESOS_AGENTE.DEFAULT;
}

// ═══ 12 CRITÉRIOS ═══
export interface CriterioAvaliacao {
  id: string;
  nome: string;
  dimensao: "humanizacao" | "eficaciaComercial" | "qualidadeTecnica";
}

export const CRITERIOS_AVALIACAO: CriterioAvaliacao[] = [
  // Dimensão 1 — Humanização
  { id: "rapport",          nome: "Rapport e Conexão Humana",   dimensao: "humanizacao" },
  { id: "personalizacao",   nome: "Personalização Genuína",     dimensao: "humanizacao" },
  { id: "tomVoz",           nome: "Tom de Voz NatLeva",         dimensao: "humanizacao" },
  { id: "surpresa",         nome: "Momento de Surpresa",        dimensao: "humanizacao" },
  // Dimensão 2 — Eficácia Comercial
  { id: "identificacaoPerfil", nome: "Identificação de Perfil",    dimensao: "eficaciaComercial" },
  { id: "progressaoFunil",    nome: "Progressão do Funil",        dimensao: "eficaciaComercial" },
  { id: "manejoObjecoes",     nome: "Manejo de Objeções",         dimensao: "eficaciaComercial" },
  { id: "antecipacao",        nome: "Antecipação de Necessidades", dimensao: "eficaciaComercial" },
  // Dimensão 3 — Qualidade Técnica
  { id: "clarezaEscrita",       nome: "Clareza e Correção Escrita",  dimensao: "qualidadeTecnica" },
  { id: "conhecimentoProduto",   nome: "Conhecimento do Produto",    dimensao: "qualidadeTecnica" },
  { id: "coerencia",            nome: "Coerência na Conversa",       dimensao: "qualidadeTecnica" },
  { id: "timing",               nome: "Timing e Velocidade",         dimensao: "qualidadeTecnica" },
];

// ═══ RUBRICA ═══
export function getNivel(score: number): { nivel: string; cor: string } {
  if (score >= 86) return { nivel: "EXCELENTE", cor: "#10B981" };
  if (score >= 71) return { nivel: "BOM",       cor: "#3B82F6" };
  if (score >= 41) return { nivel: "REGULAR",   cor: "#F59E0B" };
  return                   { nivel: "CRÍTICO",   cor: "#EF4444" };
}

// ═══ DIMENSÕES CALCULADAS ═══
export interface CriterioScore {
  score: number;
  nivel: string;
  evidencia: string;
}

export interface DimensaoScore {
  score: number;
  peso_agente: number;
  criterios: Record<string, CriterioScore>;
}

export interface AvaliacaoCompleta {
  scoreGeral: number;
  agente: string;
  perfil_lead: string;
  dimensoes: {
    humanizacao: DimensaoScore;
    eficaciaComercial: DimensaoScore;
    qualidadeTecnica: DimensaoScore;
  };
  pontos_fortes: string[];
  melhorias: Array<{ criterio: string; titulo: string; tipo: string; desc: string }>;
  resumo_executivo: string;
  timestamp: number;
}

// ═══ SYSTEM PROMPT DO DEBRIEF V2 ═══
export const SYSTEM_DEBRIEF_V2 = `Você é NATH.AI, avaliadora de qualidade da NatLeva Viagens.
FRAMEWORK DE AVALIAÇÃO — 12 CRITÉRIOS EM 3 DIMENSÕES:
DIMENSÃO 1: HUMANIZAÇÃO (critérios 1-4)
1. rapport: vínculo humano genuíno além do transacional
2. personalizacao: usou informações do lead de forma integrada
3. tomVoz: caloroso, próximo, sem travessão (travessão = -30pts automático)
4. surpresa: elemento inesperado que criou memória positiva
DIMENSÃO 2: EFICÁCIA COMERCIAL (critérios 5-8)
5. identificacaoPerfil: reconheceu e adaptou ao tipo do lead
6. progressaoFunil: avançou no momento certo, nem antes nem depois
7. manejoObjecoes: contornou com valor, não cedeu de imediato
8. antecipacao: respondeu antes de ser perguntado
DIMENSÃO 3: QUALIDADE TÉCNICA (critérios 9-12)
9. clarezaEscrita: mensagem clara à primeira leitura
10. conhecimentoProduto: informações específicas e verificáveis sobre o produto
11. coerencia: zero contradições ao longo da conversa
12. timing: ritmo adequado para o perfil do lead
RUBRICA (aplicar a cada critério):
86-100 = EXCELENTE · 71-85 = BOM · 41-70 = REGULAR · 0-40 = CRÍTICO
REGRAS:
- Use evidências do texto para cada score (cite trecho ou padrão observado)
- Travessão detectado em qualquer mensagem: critério tomVoz = máximo 40pts
- Contradição de valor/produto: critério coerencia = máximo 40pts
- Critério "N/A" se a etapa avaliada não cobre aquele critério (use score 50 como neutro)
- Retorne SOMENTE JSON válido, sem markdown`;

// ═══ PROMPT PARA AVALIAÇÃO AO VIVO (simplificada, a cada 2-3 msgs) ═══
export function buildLiveEvalPrompt(agentResponse: string, leadProfile: string, etapa: string) {
  return `Avalie esta resposta do agente rapidamente nas 3 dimensões.
Perfil do lead: ${leadProfile}
Etapa: ${etapa}
Resposta do agente: "${agentResponse}"

Retorne SOMENTE JSON:
{
  "humanizacao": 0-100,
  "eficaciaComercial": 0-100,
  "qualidadeTecnica": 0-100,
  "nota": 0-100,
  "reacaoEmocional": "texto curto",
  "sentimentoScore": 0-100,
  "motivoNota": "1 frase"
}`;
}

// ═══ PROMPT COMPLETO PARA DEBRIEF FINAL ═══
export function buildDebriefV2Prompt(dados: {
  totalLeads: number;
  fechados: number;
  perdidos: number;
  conversionRate: number;
  receita: number;
  ticketMedio: number;
  totalObjecoes: number;
  totalContornadas: number;
  performancePorPerfil: string;
  topObjecoes: string;
  perdasMotivadas: string;
  amostraConversas: string;
  agentesUsados: string[];
  fichasIndividuais?: string;
}) {
  const pesosInfo = dados.agentesUsados.map(a => {
    const p = getAgentPesos(a);
    return `${a}: H${Math.round(p.humanizacao * 100)}% E${Math.round(p.eficaciaComercial * 100)}% T${Math.round(p.qualidadeTecnica * 100)}%`;
  }).join(" | ");

  return `Você é NATH.AI, avaliadora de qualidade da NatLeva Viagens.
Avalie a simulação usando o framework de 12 critérios em 3 dimensões.
Tom: direto, construtivo, sem rodeios. Diagnóstico acionável.
Cultura NatLeva: calorosa, próxima, humana. Nunca genérica.
IMPORTANTE: Avalie CADA lead individualmente E a sessão como um todo.
Retorne SOMENTE JSON válido. Nenhum texto fora do JSON.

PESOS POR AGENTE USADO: ${pesosInfo}

DADOS DA SIMULAÇÃO:
- Total de leads: ${dados.totalLeads}
- Fechados: ${dados.fechados} (${dados.conversionRate}%)
- Perdidos: ${dados.perdidos}
- Receita simulada: R$${(dados.receita / 1000).toFixed(0)}k
- Ticket médio: R$${(dados.ticketMedio / 1000).toFixed(0)}k
- Objeções total: ${dados.totalObjecoes}
- Objeções contornadas: ${dados.totalContornadas} (${dados.totalObjecoes > 0 ? Math.round(dados.totalContornadas / dados.totalObjecoes * 100) : 0}%)

PERFORMANCE POR PERFIL: ${dados.performancePorPerfil}
TOP OBJEÇÕES: ${dados.topObjecoes || "nenhuma"}
PERDAS MOTIVADAS: ${dados.perdasMotivadas}

FICHAS INDIVIDUAIS DE CADA LEAD:
${dados.fichasIndividuais || "N/A"}

AMOSTRA DE CONVERSAS (trechos representativos):
${dados.amostraConversas}

Retorne JSON com esta ESTRUTURA EXATA:
{
  "scoreGeral": 0-100,
  "diagnosticoSessao": "3-5 frases analisando o PANORAMA GERAL da sessão: padrões recorrentes, tendências, comparação entre agentes, consistência de qualidade",
  "dimensoes": {
    "humanizacao": {
      "score": 0-100,
      "criterios": {
        "rapport": { "score": 0-100, "nivel": "EXCELENTE|BOM|REGULAR|CRÍTICO", "evidencia": "1 frase" },
        "personalizacao": { "score": 0-100, "nivel": "...", "evidencia": "..." },
        "tomVoz": { "score": 0-100, "nivel": "...", "evidencia": "..." },
        "surpresa": { "score": 0-100, "nivel": "...", "evidencia": "..." }
      }
    },
    "eficaciaComercial": {
      "score": 0-100,
      "criterios": {
        "identificacaoPerfil": { "score": 0-100, "nivel": "...", "evidencia": "..." },
        "progressaoFunil": { "score": 0-100, "nivel": "...", "evidencia": "..." },
        "manejoObjecoes": { "score": 0-100, "nivel": "...", "evidencia": "..." },
        "antecipacao": { "score": 0-100, "nivel": "...", "evidencia": "..." }
      }
    },
    "qualidadeTecnica": {
      "score": 0-100,
      "criterios": {
        "clarezaEscrita": { "score": 0-100, "nivel": "...", "evidencia": "..." },
        "conhecimentoProduto": { "score": 0-100, "nivel": "...", "evidencia": "..." },
        "coerencia": { "score": 0-100, "nivel": "...", "evidencia": "..." },
        "timing": { "score": 0-100, "nivel": "...", "evidencia": "..." }
      }
    }
  },
  "analiseIndividual": [
    {
      "leadNome": "nome do lead",
      "perfil": "tipo psicológico",
      "destino": "destino",
      "status": "fechou|perdeu|ativo",
      "score": 0-100,
      "humanizacao": 0-100,
      "eficacia": 0-100,
      "tecnica": 0-100,
      "diagnostico": "2 frases específicas sobre este atendimento",
      "pontosFortes": ["o que o agente fez bem NESTE lead"],
      "falhasCriticas": ["erros específicos que custaram resultado"],
      "agenteResponsavel": "nome do agente principal"
    }
  ],
  "resumoExecutivo": "2-3 frases de diagnóstico preciso da sessão inteira",
  "fraseNathAI": "frase motivacional e específica para a Nathália",
  "pontosFortes": ["o que funcionou bem com evidência cruzando vários leads"],
  "melhorias": [{
    "criterio": "id do criterio que falhou",
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
}

// ═══ HISTÓRICO DE AVALIAÇÕES ═══
export const STORAGE_KEY_HISTORICO_AVALIACOES = "natleva_historico_avaliacoes";

export interface HistoricoAvaliacao {
  id: string;
  timestamp: number;
  agenteId: string;
  agenteName: string;
  scoreGeral: number;
  dimensoes: {
    humanizacao: number;
    eficaciaComercial: number;
    qualidadeTecnica: number;
  };
  perfilLead: string;
  fonteSimulacao: string;
  criterios?: Record<string, number>;
}

export function saveHistoricoAvaliacao(avaliacao: HistoricoAvaliacao) {
  try {
    const hist: HistoricoAvaliacao[] = JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORICO_AVALIACOES) || "[]");
    hist.unshift(avaliacao);
    localStorage.setItem(STORAGE_KEY_HISTORICO_AVALIACOES, JSON.stringify(hist.slice(0, 200)));
  } catch { /* silent */ }
}

export function loadHistoricoAvaliacoes(): HistoricoAvaliacao[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORICO_AVALIACOES) || "[]");
  } catch { return []; }
}

// ═══ CALCPERFSCORE V2 ═══
export function calcPerfScoreV2(
  agente: { id: string; successRate?: number | null; level?: number; tasksToday?: number | null },
  historicoAvaliacoes?: HistoricoAvaliacao[]
): number {
  // Component 1: média das últimas 10 avaliações reais (peso 50%)
  const avaliacoesAgente = (historicoAvaliacoes || [])
    .filter(av => av.agenteId === agente.id)
    .slice(0, 10);
  const mediaAvaliacoes = avaliacoesAgente.length > 0
    ? avaliacoesAgente.reduce((s, av) => s + av.scoreGeral, 0) / avaliacoesAgente.length
    : 70; // fallback neutro se sem histórico

  // Components originais (peso 50% combinado)
  const taxaW = (agente.successRate ?? 70) * 0.20;
  const nivelW = Math.min((agente.level ?? 1) / 15, 1) * 100 * 0.15;
  const tarefasW = Math.min((agente.tasksToday ?? 0) / 40, 1) * 100 * 0.10;
  const treino = 50 * 0.05; // placeholder

  return Math.round(mediaAvaliacoes * 0.50 + taxaW + nivelW + tarefasW + treino);
}
