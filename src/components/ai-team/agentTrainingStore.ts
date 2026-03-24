/**
 * Shared Agent Training Store
 * Persists agent-specific training data (behavior prompts, custom rules, skill overrides, knowledge)
 * accessible from both agent detail page and simulator.
 */

const STORE_KEY = "natleva_agent_training_v1";

export interface AgentTrainingConfig {
  behaviorPrompt: string;
  customRules: { id: string; name: string; description: string; active: boolean; impact: string }[];
  disabledRuleIds: string[];      // IDs of global rules turned off for this agent
  disabledSkillIds: string[];     // IDs of skills turned off
  knowledgeSummaries: string[];   // Quick summaries of KB docs for prompt injection
  updatedAt: string;
}

type TrainingStore = Record<string, AgentTrainingConfig>;

function load(): TrainingStore {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch { return {}; }
}

function save(store: TrainingStore) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

export function getAgentTraining(agentId: string): AgentTrainingConfig | null {
  return load()[agentId] || null;
}

export function setAgentTraining(agentId: string, config: Partial<AgentTrainingConfig>) {
  const store = load();
  const existing = store[agentId] || {
    behaviorPrompt: "",
    customRules: [],
    disabledRuleIds: [],
    disabledSkillIds: [],
    knowledgeSummaries: [],
    updatedAt: new Date().toISOString(),
  };
  store[agentId] = {
    ...existing,
    ...config,
    updatedAt: new Date().toISOString(),
  };
  save(store);
}

export function updateBehaviorPrompt(agentId: string, prompt: string) {
  setAgentTraining(agentId, { behaviorPrompt: prompt });
}

export function getAllTrainingConfigs(): TrainingStore {
  return load();
}
