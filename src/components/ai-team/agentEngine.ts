/**
 * Agent Engine — pure simulation logic, zero React dependencies.
 * Every function is pure: receives state + time, returns new state.
 */

import type { Agent, Task, AgentStatus, TaskPriority } from "./mockData";
import {
  type AgentMemory,
  createEmptyMemory,
  addMemory,
  decayPreferences,
  computeRelevance,
  getPreferenceWeight,
  shouldUseMemoryThought,
} from "./agentMemory";

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */

export interface AgentEvent {
  id: string;
  agentId: string;
  type: "insight" | "alert" | "action" | "status_change";
  message: string;
  timestamp: number;
  severity: "low" | "medium" | "high";
}

export interface EngineAgent extends Agent {
  nextTickAt: number;
  eventHistory: AgentEvent[];
  memory: AgentMemory;
}

export interface EngineState {
  agents: EngineAgent[];
  tasks: Task[];
  events: AgentEvent[];
  lastTaskCreatedAt: number;
  lastAlertAt: number;
  tickCount: number;
}

/* ═══════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════ */

const MAX_TASKS_PER_AGENT = 15;
const MAX_EVENTS_PER_AGENT = 20;
const MAX_GLOBAL_EVENTS = 80;
const MIN_TASK_INTERVAL_MS = 12_000;
const MIN_ALERT_INTERVAL_MS = 20_000;
const DECAY_EVERY_N_TICKS = 30;

const statusDuration: Record<AgentStatus, [number, number]> = {
  idle:       [6_000,  12_000],
  analyzing:  [8_000,  16_000],
  suggesting: [5_000,  10_000],
  waiting:    [10_000, 20_000],
  alert:      [4_000,  8_000],
};

type Weights = Record<string, number>;
type TransitionMap = Partial<Record<AgentStatus, Weights>>;

const defaultWeights: TransitionMap = {
  idle:       { analyzing: 0.6, idle: 0.4 },
  analyzing:  { suggesting: 0.5, alert: 0.15, idle: 0.2, analyzing: 0.15 },
  suggesting: { waiting: 0.5, idle: 0.5 },
  waiting:    { idle: 0.6, analyzing: 0.4 },
  alert:      { suggesting: 0.5, waiting: 0.5 },
};

/* Agent-specific weights for the original 3 (others use default) */
const transitionWeights: Record<string, TransitionMap> = {
  gerente: {
    idle: { analyzing: 0.6, idle: 0.4 },
    analyzing: { suggesting: 0.45, waiting: 0.3, alert: 0.15, analyzing: 0.1 },
    suggesting: { waiting: 0.55, idle: 0.45 },
    waiting: { idle: 0.65, analyzing: 0.35 },
    alert: { waiting: 0.5, suggesting: 0.5 },
  },
  auditor: {
    idle: { analyzing: 0.7, idle: 0.3 },
    analyzing: { alert: 0.3, suggesting: 0.4, analyzing: 0.15, idle: 0.15 },
    suggesting: { waiting: 0.5, idle: 0.5 },
    waiting: { idle: 0.6, analyzing: 0.4 },
    alert: { suggesting: 0.6, waiting: 0.4 },
  },
};

/* ═══════════════════════════════════════════
   Message banks — all 10 agents
   ═══════════════════════════════════════════ */

const thoughtBank: Record<string, Partial<Record<AgentStatus, string[]>>> = {
  gerente: {
    idle: ["Aguardando novas demandas do time.", "Revisando status geral."],
    analyzing: ["Revisando prioridades do backlog...", "Avaliando performance da equipe...", "Cruzando métricas de conversão..."],
    suggesting: ["Reorganizar prioridades do módulo de propostas.", "Acelerar entrega dos templates por perfil.", "Redistribuir tarefas entre os agentes."],
    waiting: ["Aguardando aprovação para reorganização.", "Esperando decisão sobre priorização."],
    alert: ["Acúmulo de tarefas sem decisão há 48h.", "Capacidade operacional no limite."],
  },
  auditor: {
    idle: ["Monitorando processos.", "Aguardando novos dados."],
    analyzing: ["Escaneando inconsistências em propostas...", "Verificando uso da biblioteca de mídia...", "Analisando SLA de fornecedores...", "Comparando margens entre destinos..."],
    suggesting: ["Otimização na curadoria de mídia.", "Padronizar descrições de quartos.", "Padrão automatizável detectado."],
    waiting: ["Aguardando validação sobre fornecedores.", "Esperando decisão sobre inconsistência."],
    alert: ["Fornecedor com 3 confirmações >48h.", "Queda de 15% na reutilização de mídias.", "Inconsistência em precificação."],
  },
  estrategista: {
    idle: ["Monitorando tendências.", "Consolidando padrões dos últimos 30 dias."],
    analyzing: ["Padrões de vendas por sazonalidade...", "Correlação mídia vs. conversão...", "Oportunidades de upsell...", "Margem por categoria de destino..."],
    suggesting: ["Reforçar propostas nacionais premium.", "Lua de mel aceita 40% mais upgrades.", "Pacotes experienciais para Q2."],
    waiting: ["Aguardando aprovação para destinos nacionais.", "Esperando decisão sobre upsell."],
    alert: ["Concentração excessiva em destinos europeus.", "Margem média em queda."],
  },
  analista: {
    idle: ["Consolidando dados para relatório.", "Monitorando anomalias nos KPIs."],
    analyzing: ["Cruzando conversão com tempo de resposta...", "Funil de vendas por etapa...", "Performance semanal...", "Outliers em dados de venda..."],
    suggesting: ["Painel de conversão por etapa do funil.", "Fotos de qualidade → +25% conversão.", "Segmento premium cresceu 12%."],
    waiting: ["Aguardando validação do relatório.", "Esperando aprovação do dashboard."],
    alert: ["Conversão caiu 8% vs. semana anterior.", "Anomalia em dados de vendas."],
  },
  financeiro: {
    idle: ["Monitorando fluxo de caixa.", "Aguardando fechamento mensal."],
    analyzing: ["Margens por destino e fornecedor...", "Projeção de fluxo de caixa...", "Custos fixos vs. variáveis...", "DRE do período..."],
    suggesting: ["Revisar markups com margem <8%.", "Renegociação com 3 fornecedores.", "Ajuste em custos operacionais."],
    waiting: ["Aguardando aprovação de markups.", "Esperando decisão sobre renegociação."],
    alert: ["Margem abaixo da meta de 15%.", "Caixa negativo projetado em 15 dias."],
  },
  marketing: {
    idle: ["Monitorando engajamento de leads.", "Analisando campanhas anteriores."],
    analyzing: ["Segmentando leads inativos...", "Destinos mais buscados...", "Perfis com potencial...", "ROI de campanhas..."],
    suggesting: ["Reativação de 340 leads premium.", "Maldivas trending (+45%).", "Remarketing: até R$180k."],
    waiting: ["Aguardando aprovação de campanha.", "Esperando decisão sobre segmentação."],
    alert: ["Pipeline de leads caiu 20%.", "Email marketing em queda."],
  },
  comercial: {
    idle: ["Monitorando pipeline.", "Aguardando propostas."],
    analyzing: ["Probabilidade de fechamento...", "Tempo de decisão dos clientes...", "Objeções mais comuns...", "Taxas de follow-up..."],
    suggesting: ["5 propostas com score >80%.", "Follow-up em 24h triplica fechamento.", "Cliente premium sem contato há 48h."],
    waiting: ["Aguardando retorno de propostas.", "Esperando decisão comercial."],
    alert: ["3 propostas perdendo timing.", "Pipeline de fechamento em queda."],
  },
  atendimento: {
    idle: ["Monitorando chamados.", "Verificando SLA."],
    analyzing: ["Tempo médio de resposta...", "Satisfação dos atendimentos...", "Chamados pendentes...", "Padrões de reclamação..."],
    suggesting: ["3 clientes sem retorno 48h.", "Template reduz 30% do tempo.", "Pesquisa NPS pós-viagem."],
    waiting: ["Aguardando resolução de chamados.", "Esperando feedback de SLA."],
    alert: ["Resposta acima do SLA (6.5h vs 4h).", "NPS caiu 5 pontos."],
  },
  operacional: {
    idle: ["Monitorando fluxos.", "Verificando eficiência."],
    analyzing: ["Gargalos no fluxo de propostas...", "Tempo por etapa...", "Etapas automatizáveis...", "Eficiência entre times..."],
    suggesting: ["Automatizar briefing (-18min).", "3 etapas redundantes.", "Templates: -35% tempo."],
    waiting: ["Aguardando aprovação de otimização.", "Esperando decisão sobre automação."],
    alert: ["Gargalo: aprovação fornecedor (18h).", "Montagem subiu 20%."],
  },
  inovacao: {
    idle: ["Explorando travel tech.", "Monitorando concorrentes."],
    analyzing: ["Viabilidade de itinerário IA...", "Portais interativos...", "IA generativa no turismo...", "Tecnologias emergentes..."],
    suggesting: ["Itinerário IA: -80% tempo.", "Portal interativo: diferencial.", "Galeria imersiva aumenta conversão."],
    waiting: ["Aguardando aprovação de protótipo.", "Esperando decisão sobre portal."],
    alert: ["Concorrente lançou IA generativa.", "Gap tecnológico detectado."],
  },
};

const memoryThoughts: Record<string, string[]> = {
  gerente: ["Ajustei prioridades com base nas suas decisões.", "Você aprova organização — reforçando.", "Preferência por ações rápidas detectada."],
  auditor: ["Focando em inconsistências que você aprova.", "Análises ajustadas por suas decisões."],
  estrategista: ["Upsell não aceito — ajustando.", "Priorizei abordagens diretas."],
  analista: ["Priorizando métricas que você aprova."],
  financeiro: ["Alertas financeiros ajustados por suas aprovações."],
  marketing: ["Foco em campanhas por suas aprovações."],
  comercial: ["Propostas alinhadas ao seu padrão."],
  atendimento: ["Priorizando SLA por suas decisões."],
  operacional: ["Automação ajustada por suas aprovações."],
  inovacao: ["Inovações alinhadas com suas aprovações."],
};

const taskTemplates: Record<string, Array<{ title: string; description: string; priority: TaskPriority; context: string }>> = {
  gerente: [
    { title: "Reorganizar prioridades do backlog", description: "Redistribuir tarefas com base na capacidade e impacto.", priority: "medium", context: "backlog" },
    { title: "Revisar SLA de atendimento", description: "Tempo de resposta subiu 12%.", priority: "high", context: "sla" },
    { title: "Relatório semanal de performance", description: "Consolidar métricas de vendas e conversão.", priority: "low", context: "operacional" },
  ],
  auditor: [
    { title: "Auditar propostas sem resposta 7+ dias", description: "Propostas abandonadas — recontato.", priority: "high", context: "follow-up" },
    { title: "Mapear fornecedores com SLA irregular", description: "Confirmações >48h recorrentes.", priority: "medium", context: "fornecedores" },
    { title: "Consistência de dados de hospedagem", description: "Cruzar nomes de quartos.", priority: "low", context: "propostas" },
  ],
  estrategista: [
    { title: "Pacote experiencial Q2", description: "Pacote temático baseado em tendências.", priority: "medium", context: "estratégia" },
    { title: "Elasticidade de preço", description: "Impacto de 5% na margem.", priority: "high", context: "pricing" },
    { title: "Destinos emergentes", description: "Crescimento >20%.", priority: "low", context: "estratégia" },
  ],
  analista: [
    { title: "Dashboard de conversão por etapa", description: "Funil de vendas detalhado.", priority: "medium", context: "métricas" },
    { title: "Relatório de anomalias", description: "Outliers em vendas e margens.", priority: "high", context: "métricas" },
    { title: "Correlação mídia vs. conversão", description: "Impacto de fotos.", priority: "low", context: "métricas" },
  ],
  financeiro: [
    { title: "Revisar markups abaixo da meta", description: "Margem <8%.", priority: "high", context: "pricing" },
    { title: "Projeção de fluxo de caixa", description: "Próximos 30 dias.", priority: "medium", context: "financeiro" },
    { title: "Renegociar fornecedores caros", description: "Acima do benchmark.", priority: "medium", context: "fornecedores" },
  ],
  marketing: [
    { title: "Campanha de reativação de leads", description: "340 leads inativos premium.", priority: "medium", context: "marketing" },
    { title: "Destaque destino trending", description: "Destino em alta.", priority: "low", context: "marketing" },
    { title: "Remarketing propostas abertas", description: "Propostas sem resposta.", priority: "high", context: "marketing" },
  ],
  comercial: [
    { title: "Propostas para fechamento", description: "Score >80%.", priority: "high", context: "vendas" },
    { title: "Follow-up urgente", description: "Sem contato há 48h.", priority: "high", context: "follow-up" },
    { title: "Objeções recorrentes", description: "Padrões comuns.", priority: "medium", context: "vendas" },
  ],
  atendimento: [
    { title: "Clientes sem resposta 48h", description: "Chamados abertos.", priority: "high", context: "sla" },
    { title: "Pesquisa NPS pós-viagem", description: "Enviar para clientes.", priority: "low", context: "atendimento" },
    { title: "Template de resposta rápida", description: "Reduzir 30% do tempo.", priority: "medium", context: "atendimento" },
  ],
  operacional: [
    { title: "Automatizar briefing", description: "Consome 18min.", priority: "medium", context: "automação" },
    { title: "Eliminar etapas redundantes", description: "3 etapas duplicadas.", priority: "high", context: "processos" },
    { title: "Benchmark tempo por etapa", description: "Comparar com meta.", priority: "low", context: "processos" },
  ],
  inovacao: [
    { title: "Prototipar itinerário por IA", description: "Geração baseada no perfil.", priority: "medium", context: "inovação" },
    { title: "Portal do viajante interativo", description: "Tracking em tempo real.", priority: "low", context: "inovação" },
    { title: "Galeria imersiva em propostas", description: "Fotos 360° e vídeos.", priority: "medium", context: "inovação" },
  ],
};

/* ═══════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════ */

let _idCounter = 100;
function uid(): string { return `gen_${++_idCounter}_${Math.random().toString(36).slice(2, 6)}`; }

function pickWeighted(weights: Record<string, number>, seed: number): AgentStatus {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + (w as number), 0);
  let r = (Math.abs(seed) % 1000) / 1000 * total;
  for (const [key, w] of entries) {
    r -= w as number;
    if (r <= 0) return key as AgentStatus;
  }
  return entries[entries.length - 1][0] as AgentStatus;
}

function randRange(min: number, max: number, seed: number): number {
  const t = (seed % 10000) / 10000;
  const jitter = 0.7 + t * 0.6;
  return Math.round((min + (max - min) * t) * jitter);
}

function pickRandom<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function getThought(agent: EngineAgent, status: AgentStatus, seed: number): string {
  if (
    (status === "suggesting" || status === "analyzing") &&
    shouldUseMemoryThought(agent.memory) &&
    seed % 5 === 0
  ) {
    const mThoughts = memoryThoughts[agent.id];
    if (mThoughts?.length) return pickRandom(mThoughts, seed + 99);
  }
  const bank = thoughtBank[agent.id]?.[status] ?? [`Operando em modo ${status}.`];
  return pickRandom(bank, seed);
}

function getActionLabel(status: AgentStatus): string {
  switch (status) {
    case "idle": return "Entrou em modo de espera";
    case "analyzing": return "Iniciou nova análise";
    case "suggesting": return "Gerou nova recomendação";
    case "waiting": return "Aguardando decisão";
    case "alert": return "Emitiu alerta";
    default: return "Atualizou status";
  }
}

/* ═══════════════════════════════════════════
   Init
   ═══════════════════════════════════════════ */

export function createInitialState(baseAgents: Agent[], baseTasks: Task[], now: number): EngineState {
  const agents: EngineAgent[] = baseAgents.map((a, i) => ({
    ...a,
    nextTickAt: now + randRange(3_000, 10_000, i * 137),
    eventHistory: [],
    memory: createEmptyMemory(),
  }));

  return {
    agents,
    tasks: [...baseTasks],
    events: [],
    lastTaskCreatedAt: now - MIN_TASK_INTERVAL_MS,
    lastAlertAt: now - MIN_ALERT_INTERVAL_MS,
    tickCount: 0,
  };
}

/* ═══════════════════════════════════════════
   TICK — allow up to 2 transitions per tick for 10 agents
   ═══════════════════════════════════════════ */

const MAX_TRANSITIONS_PER_TICK = 2;

export function tick(state: EngineState, now: number): EngineState {
  let { agents, tasks, events, lastTaskCreatedAt, lastAlertAt, tickCount } = state;
  let changed = false;
  let transitionsThisTick = 0;

  const seed = now ^ (tickCount * 7919);
  const shouldDecay = tickCount > 0 && tickCount % DECAY_EVERY_N_TICKS === 0;

  const newAgents = agents.map((agent, idx) => {
    let currentAgent = agent;

    if (shouldDecay) {
      currentAgent = { ...currentAgent, memory: decayPreferences(currentAgent.memory) };
      changed = true;
    }

    if (now < currentAgent.nextTickAt) return currentAgent;
    if (transitionsThisTick >= MAX_TRANSITIONS_PER_TICK) return currentAgent;

    const agentSeed = seed ^ (idx * 3571);
    const weights = transitionWeights[currentAgent.id]?.[currentAgent.status] ?? defaultWeights[currentAgent.status] ?? { idle: 1 };

    let filteredWeights = { ...weights };
    if (now - lastAlertAt < MIN_ALERT_INTERVAL_MS && "alert" in filteredWeights) {
      const alertW = (filteredWeights as Record<string, number>)["alert"] ?? 0;
      delete (filteredWeights as Record<string, number>)["alert"];
      const keys = Object.keys(filteredWeights);
      if (keys.length > 0) {
        const share = alertW / keys.length;
        keys.forEach(k => { (filteredWeights as Record<string, number>)[k] += share; });
      }
    }

    const nextStatus = pickWeighted(filteredWeights as Record<string, number>, agentSeed);
    const [minDur, maxDur] = statusDuration[nextStatus] ?? [10_000, 15_000];
    const duration = randRange(minDur, maxDur, agentSeed + 1);

    const thought = getThought(currentAgent, nextStatus, agentSeed + 2);
    const actionLabel = getActionLabel(nextStatus);

    const evt: AgentEvent = {
      id: uid(),
      agentId: currentAgent.id,
      type: nextStatus === "alert" ? "alert" : nextStatus === "suggesting" ? "insight" : "status_change",
      message: thought,
      timestamp: now,
      severity: nextStatus === "alert" ? "high" : nextStatus === "suggesting" ? "medium" : "low",
    };

    events = [evt, ...events].slice(0, MAX_GLOBAL_EVENTS);

    let agentMemory = addMemory(currentAgent.memory, {
      type: nextStatus === "alert" ? "alert" : "interaction",
      content: thought,
      timestamp: now,
      relevanceScore: computeRelevance({ type: nextStatus === "alert" ? "alert" : "interaction" }),
      agentId: currentAgent.id,
      context: nextStatus === "alert" ? "alerta" : nextStatus,
    });

    if ((nextStatus === "suggesting" || nextStatus === "alert") && now - lastTaskCreatedAt >= MIN_TASK_INTERVAL_MS) {
      const templates = taskTemplates[currentAgent.id];
      if (templates && Math.abs(agentSeed) % 100 < (nextStatus === "suggesting" ? 55 : 75)) {
        const filtered = templates.filter(tmpl => getPreferenceWeight(agentMemory, tmpl.context) > -0.5);
        const pool = filtered.length > 0 ? filtered : templates;
        const tmpl = pickRandom(pool, agentSeed + 3);
        const agentTaskCount = tasks.filter(t => t.sourceAgentId === currentAgent.id).length;
        if (agentTaskCount < MAX_TASKS_PER_AGENT) {
          const newTask: Task = {
            id: uid(),
            title: tmpl.title,
            description: tmpl.description,
            sourceAgentId: currentAgent.id,
            status: "suggested",
            priority: tmpl.priority,
            createdAt: new Date(now).toISOString(),
          };
          tasks = [newTask, ...tasks];
          lastTaskCreatedAt = now;
        }
      }
    }

    if (nextStatus === "alert") lastAlertAt = now;

    transitionsThisTick++;
    changed = true;

    const newHistory = [evt, ...currentAgent.eventHistory].slice(0, MAX_EVENTS_PER_AGENT);

    return {
      ...currentAgent,
      status: nextStatus,
      currentThought: thought,
      lastAction: actionLabel,
      nextTickAt: now + duration,
      eventHistory: newHistory,
      memory: agentMemory,
    };
  });

  if (!changed) return state;

  return {
    agents: newAgents,
    tasks,
    events,
    lastTaskCreatedAt,
    lastAlertAt,
    tickCount: tickCount + 1,
  };
}
