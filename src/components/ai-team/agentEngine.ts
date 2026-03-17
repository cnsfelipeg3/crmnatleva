/**
 * Agent Engine — pure simulation logic, zero React dependencies.
 *
 * Every function is pure: receives state + time, returns new state.
 * No Date.now() inside — caller passes `now` for determinism.
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
const MAX_GLOBAL_EVENTS = 50;
const MIN_TASK_INTERVAL_MS = 15_000;
const MIN_ALERT_INTERVAL_MS = 25_000;
const MAX_ONE_TRANSITION_PER_TICK = true;
const DECAY_EVERY_N_TICKS = 30; // decay preferences every ~30s

const statusDuration: Record<AgentStatus, [number, number]> = {
  idle:       [8_000,  15_000],
  analyzing:  [10_000, 20_000],
  suggesting: [6_000,  12_000],
  waiting:    [12_000, 25_000],
  alert:      [5_000,  10_000],
};

type Weights = Record<string, number>;
type TransitionMap = Partial<Record<AgentStatus, Weights>>;

const transitionWeights: Record<string, TransitionMap> = {
  gerente: {
    idle:       { analyzing: 0.6, idle: 0.4 },
    analyzing:  { suggesting: 0.45, waiting: 0.3, alert: 0.15, analyzing: 0.1 },
    suggesting: { waiting: 0.55, idle: 0.45 },
    waiting:    { idle: 0.65, analyzing: 0.35 },
    alert:      { waiting: 0.5, suggesting: 0.5 },
  },
  auditor: {
    idle:       { analyzing: 0.7, idle: 0.3 },
    analyzing:  { alert: 0.35, suggesting: 0.4, analyzing: 0.15, idle: 0.1 },
    suggesting: { waiting: 0.5, idle: 0.5 },
    waiting:    { idle: 0.6, analyzing: 0.4 },
    alert:      { suggesting: 0.6, waiting: 0.4 },
  },
  estrategista: {
    idle:       { analyzing: 0.55, idle: 0.45 },
    analyzing:  { suggesting: 0.55, analyzing: 0.2, alert: 0.15, idle: 0.1 },
    suggesting: { waiting: 0.5, idle: 0.5 },
    waiting:    { idle: 0.55, analyzing: 0.45 },
    alert:      { suggesting: 0.6, waiting: 0.4 },
  },
};

const defaultWeights: TransitionMap = {
  idle:       { analyzing: 0.6, idle: 0.4 },
  analyzing:  { suggesting: 0.5, alert: 0.2, idle: 0.3 },
  suggesting: { waiting: 0.5, idle: 0.5 },
  waiting:    { idle: 0.6, analyzing: 0.4 },
  alert:      { suggesting: 0.5, waiting: 0.5 },
};

/* ═══════════════════════════════════════════
   Message banks
   ═══════════════════════════════════════════ */

const thoughtBank: Record<string, Partial<Record<AgentStatus, string[]>>> = {
  gerente: {
    idle: ["Aguardando novas demandas do time.", "Revisando status geral dos projetos."],
    analyzing: [
      "Revisando prioridades do backlog de tarefas...",
      "Avaliando performance da equipe esta semana...",
      "Cruzando métricas de conversão com capacidade operacional...",
    ],
    suggesting: [
      "Recomendo reorganizar as prioridades do módulo de propostas.",
      "Sugiro acelerar a entrega dos templates por perfil de cliente.",
      "Proposta de redistribuição de tarefas entre os agentes.",
    ],
    waiting: [
      "Aguardando sua aprovação para prosseguir com a reorganização.",
      "Esperando decisão sobre priorização do backlog.",
    ],
    alert: [
      "Detectei acúmulo de tarefas sem decisão há mais de 48h.",
      "Atenção: capacidade operacional próxima do limite esta semana.",
    ],
  },
  auditor: {
    idle: ["Monitorando processos em modo passivo.", "Aguardando novos dados para análise."],
    analyzing: [
      "Escaneando inconsistências no fluxo de propostas...",
      "Verificando padrões de uso da biblioteca de mídia...",
      "Analisando SLA dos fornecedores ativos...",
      "Comparando margens entre destinos nacionais e internacionais...",
    ],
    suggesting: [
      "Identifiquei oportunidade de otimização na curadoria de mídia.",
      "Recomendo padronizar descrições de quartos entre propostas.",
      "Detectei padrão recorrente que pode ser automatizado.",
    ],
    waiting: [
      "Aguardando validação do insight sobre fornecedores.",
      "Esperando decisão sobre alerta de inconsistência.",
    ],
    alert: [
      "Fornecedor com 3 confirmações pendentes acima de 48h.",
      "Detectada queda de 15% na reutilização de mídias.",
      "Inconsistência crítica encontrada em precificação.",
    ],
  },
  estrategista: {
    idle: ["Monitorando tendências de mercado.", "Consolidando padrões dos últimos 30 dias."],
    analyzing: [
      "Detectando padrões de vendas por sazonalidade...",
      "Analisando correlação entre qualidade de mídia e conversão...",
      "Mapeando oportunidades de upsell por perfil de cliente...",
      "Comparando margem por categoria de destino...",
    ],
    suggesting: [
      "Recomendo reforçar propostas nacionais premium — margem 18% superior.",
      "Clientes de lua de mel aceitam 40% mais upgrades. Oportunidade clara.",
      "Sugiro criar pacotes experienciais para o próximo trimestre.",
    ],
    waiting: [
      "Aguardando aprovação para priorizar destinos nacionais.",
      "Esperando decisão sobre estratégia de upsell.",
    ],
    alert: [
      "Concentração excessiva em destinos europeus detectada.",
      "Margem média em queda: requer atenção estratégica.",
    ],
  },
};

/** Memory-aware thoughts — used sparingly when shouldUseMemoryThought is true */
const memoryThoughts: Record<string, string[]> = {
  gerente: [
    "Com base nas suas últimas decisões, ajustei as prioridades do backlog.",
    "Notei que você tem aprovado tarefas de organização — reforçando essa linha.",
    "Suas decisões recentes indicam preferência por ações rápidas. Priorizando.",
  ],
  auditor: [
    "Com base no histórico, estou focando em inconsistências que você costuma aprovar.",
    "Ajustei minhas análises com base nas suas decisões anteriores.",
    "Suas aprovações recentes indicam foco em qualidade de mídia.",
  ],
  estrategista: [
    "Notei que sugestões de upsell não têm sido aceitas. Ajustando estratégia.",
    "Com base nas suas decisões, priorizei abordagens mais diretas.",
    "Suas aprovações indicam interesse em destinos nacionais premium.",
  ],
};

const taskTemplates: Record<string, Array<{ title: string; description: string; priority: TaskPriority; context: string }>> = {
  gerente: [
    { title: "Reorganizar prioridades do backlog", description: "Redistribuir tarefas com base na capacidade atual e impacto estimado.", priority: "medium", context: "backlog" },
    { title: "Revisar SLA de atendimento ao cliente", description: "Tempo médio de resposta subiu 12%. Recomendar melhorias.", priority: "high", context: "sla" },
    { title: "Criar relatório semanal de performance", description: "Consolidar métricas de vendas, conversão e tempo de montagem.", priority: "low", context: "operacional" },
  ],
  auditor: [
    { title: "Auditar propostas sem resposta há 7+ dias", description: "Identificar propostas abandonadas e recomendar recontato.", priority: "high", context: "follow-up" },
    { title: "Mapear fornecedores com SLA irregular", description: "Listar fornecedores com confirmações acima de 48h recorrentes.", priority: "medium", context: "fornecedores" },
    { title: "Verificar consistência de dados de hospedagem", description: "Cruzar nomes de quartos entre propostas do mesmo hotel.", priority: "low", context: "propostas" },
  ],
  estrategista: [
    { title: "Propor pacote experiencial Q2", description: "Criar sugestão de pacote temático baseado nas tendências de busca.", priority: "medium", context: "estratégia" },
    { title: "Análise de elasticidade de preço", description: "Testar se aumento de 5% na margem impacta conversão.", priority: "high", context: "pricing" },
    { title: "Identificar destinos emergentes", description: "Mapear destinos com crescimento de busca acima de 20% no mês.", priority: "low", context: "estratégia" },
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
  // Sparingly use memory-aware thoughts
  if (
    (status === "suggesting" || status === "analyzing") &&
    shouldUseMemoryThought(agent.memory) &&
    seed % 5 === 0 // ~20% chance when conditions are met
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
    nextTickAt: now + randRange(5_000, 12_000, i * 137),
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
   TICK — main simulation step
   ═══════════════════════════════════════════ */

export function tick(state: EngineState, now: number): EngineState {
  let { agents, tasks, events, lastTaskCreatedAt, lastAlertAt, tickCount } = state;
  let changed = false;
  let transitionedThisTick = false;

  const seed = now ^ (tickCount * 7919);

  // Periodic preference decay
  const shouldDecay = tickCount > 0 && tickCount % DECAY_EVERY_N_TICKS === 0;

  const newAgents = agents.map((agent, idx) => {
    let currentAgent = agent;

    // Apply decay if needed
    if (shouldDecay) {
      currentAgent = { ...currentAgent, memory: decayPreferences(currentAgent.memory) };
      changed = true;
    }

    // Not time yet
    if (now < currentAgent.nextTickAt) return currentAgent;
    if (MAX_ONE_TRANSITION_PER_TICK && transitionedThisTick) return currentAgent;

    const agentSeed = seed ^ (idx * 3571);
    const weights = transitionWeights[currentAgent.id]?.[currentAgent.status] ?? defaultWeights[currentAgent.status] ?? { idle: 1 };

    // Check alert throttle
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

    // Create status change event
    const evt: AgentEvent = {
      id: uid(),
      agentId: currentAgent.id,
      type: nextStatus === "alert" ? "alert" : nextStatus === "suggesting" ? "insight" : "status_change",
      message: thought,
      timestamp: now,
      severity: nextStatus === "alert" ? "high" : nextStatus === "suggesting" ? "medium" : "low",
    };

    events = [evt, ...events].slice(0, MAX_GLOBAL_EVENTS);

    // Record interaction in memory
    let agentMemory = addMemory(currentAgent.memory, {
      type: nextStatus === "alert" ? "alert" : "interaction",
      content: thought,
      timestamp: now,
      relevanceScore: computeRelevance({ type: nextStatus === "alert" ? "alert" : "interaction" }),
      agentId: currentAgent.id,
      context: nextStatus === "alert" ? "alerta" : nextStatus,
    });

    // Maybe generate task (on suggesting or alert)
    if ((nextStatus === "suggesting" || nextStatus === "alert") && now - lastTaskCreatedAt >= MIN_TASK_INTERVAL_MS) {
      const templates = taskTemplates[currentAgent.id];
      if (templates && Math.abs(agentSeed) % 100 < (nextStatus === "suggesting" ? 60 : 80)) {
        // Filter templates based on memory preferences
        const filtered = templates.filter(tmpl => {
          const prefWeight = getPreferenceWeight(agentMemory, tmpl.context);
          // Skip templates the user strongly dislikes
          return prefWeight > -0.5;
        });
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

    if (nextStatus === "alert") {
      lastAlertAt = now;
    }

    transitionedThisTick = true;
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
