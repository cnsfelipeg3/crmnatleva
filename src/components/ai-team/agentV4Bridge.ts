/**
 * Bridge: converts AgentV4 → Agent (mockData format) so the engine can run all 21 agents.
 */
import type { Agent, AgentStatus, Task } from "./mockData";
import type { AgentV4 } from "./agentsV4Data";
import { AGENTS_V4 } from "./agentsV4Data";

const STATUS_MAP: Record<AgentV4["status"], AgentStatus> = {
  online: "analyzing",
  busy: "suggesting",
  idle: "idle",
  offline: "idle",
};

export function v4ToAgent(v4: AgentV4): Agent {
  return {
    id: v4.id,
    name: v4.name,
    emoji: v4.emoji,
    role: v4.persona,
    sector: v4.squadId,
    level: v4.level >= 12 ? "advanced" : v4.level >= 8 ? "intermediate" : "basic",
    skills: [...v4.skills],
    scope: [v4.role],
    restrictions: ["Apenas sugerir", "Requer aprovação"],
    behaviorPrompt: v4.persona,
    status: STATUS_MAP[v4.status] ?? "idle",
    lastAction: "",
    currentThought: "",
  };
}

export function getAllV4Agents(): Agent[] {
  return AGENTS_V4.map(v4ToAgent);
}

export function getV4InitialTasks(): Task[] {
  const now = new Date().toISOString();
  return [
    { id: "v4t1", title: "Qualificar 5 leads pendentes", description: "Leads sem qualificação há 48h.", sourceAgentId: "atlas", status: "suggested", priority: "high", createdAt: now },
    { id: "v4t2", title: "Montar proposta Dubai VIP", description: "Cliente premium aguardando proposta personalizada.", sourceAgentId: "luna", status: "in_progress", priority: "high", createdAt: now },
    { id: "v4t3", title: "Follow-up propostas abertas", description: "8 propostas sem resposta há 72h.", sourceAgentId: "nero", status: "suggested", priority: "medium", createdAt: now },
    { id: "v4t4", title: "Auditoria de compliance", description: "Verificar últimas 20 mensagens contra regras fiscais.", sourceAgentId: "vigil", status: "analyzing", priority: "medium", createdAt: now },
    { id: "v4t5", title: "Campanha reativação Q2", description: "340 leads inativos com potencial.", sourceAgentId: "hunter", status: "suggested", priority: "medium", createdAt: now },
    { id: "v4t6", title: "Revisar markups <8%", description: "3 destinos com margem abaixo da meta.", sourceAgentId: "sage", status: "suggested", priority: "high", createdAt: now },
    { id: "v4t7", title: "Pesquisa NPS pós-viagem", description: "Enviar para clientes que retornaram esta semana.", sourceAgentId: "iris", status: "pending", priority: "low", createdAt: now },
    { id: "v4t8", title: "Automatizar briefing", description: "Processo manual consome 18min por proposta.", sourceAgentId: "opex", status: "suggested", priority: "medium", createdAt: now },
  ];
}
