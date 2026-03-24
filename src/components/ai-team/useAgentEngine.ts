import { useState, useEffect, useRef, useCallback } from "react";
import { createInitialState, tick, type EngineState, type EngineAgent, type AgentEvent } from "./agentEngine";
import { addMemory, createDecisionMemory, createEmptyMemory } from "./agentMemory";
import type { Agent, Task } from "./mockData";

const AGENT_OVERRIDES_KEY = "natleva_agent_overrides_v1";

function loadOverrides(): Record<string, Partial<Agent>> {
  try { return JSON.parse(localStorage.getItem(AGENT_OVERRIDES_KEY) || "{}"); } catch { return {}; }
}

function saveOverrides(overrides: Record<string, Partial<Agent>>) {
  localStorage.setItem(AGENT_OVERRIDES_KEY, JSON.stringify(overrides));
}

interface UseAgentEngineReturn {
  agents: EngineAgent[];
  tasks: Task[];
  events: AgentEvent[];
  addAgent: (agent: Agent) => void;
  updateAgent: (agentId: string, updates: Partial<Agent>) => void;
  removeTask: (taskId: string, action: "approve" | "ignore") => void;
}

export function useAgentEngine(baseAgents: Agent[], baseTasks: Task[]): UseAgentEngineReturn {
  const stateRef = useRef<EngineState | null>(null);
  const [snapshot, setSnapshot] = useState<EngineState | null>(null);

  useEffect(() => {
    const now = Date.now();
    // Apply persisted overrides to base agents
    const overrides = loadOverrides();
    const hydratedAgents = baseAgents.map(a => {
      const ov = overrides[a.id];
      return ov ? { ...a, ...ov } : a;
    });
    const initial = createInitialState(hydratedAgents, baseTasks, now);
    stateRef.current = initial;
    setSnapshot(initial);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!stateRef.current) return;
      const now = Date.now();
      const prev = stateRef.current;
      const next = tick(prev, now);
      if (next !== prev) {
        stateRef.current = next;
        setSnapshot(next);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const addAgent = useCallback((agent: Agent) => {
    if (!stateRef.current) return;
    const now = Date.now();
    const engineAgent: EngineAgent = {
      ...agent,
      nextTickAt: now + 5_000 + Math.random() * 7_000,
      eventHistory: [],
      memory: createEmptyMemory(),
    };
    const s = stateRef.current;
    stateRef.current = { ...s, agents: [...s.agents, engineAgent] };
    setSnapshot(stateRef.current);
  }, []);

  const updateAgent = useCallback((agentId: string, updates: Partial<Agent>) => {
    if (!stateRef.current) return;
    const s = stateRef.current;
    stateRef.current = {
      ...s,
      agents: s.agents.map(a => a.id === agentId ? { ...a, ...updates } : a),
    };
    setSnapshot(stateRef.current);

    // Persist overrides to localStorage
    const overrides = loadOverrides();
    overrides[agentId] = { ...(overrides[agentId] || {}), ...updates };
    saveOverrides(overrides);
  }, []);

  const removeTask = useCallback((taskId: string, action: "approve" | "ignore") => {
    if (!stateRef.current) return;
    const s = stateRef.current;
    const task = s.tasks.find(t => t.id === taskId);

    // Record decision in agent memory
    if (task) {
      const now = Date.now();
      const memItem = createDecisionMemory(
        task.sourceAgentId,
        task.title,
        task.priority,
        action,
        now,
      );

      const updatedAgents = s.agents.map(agent => {
        if (agent.id !== task.sourceAgentId) return agent;
        return { ...agent, memory: addMemory(agent.memory, memItem) };
      });

      stateRef.current = {
        ...s,
        agents: updatedAgents,
        tasks: s.tasks.filter(t => t.id !== taskId),
      };
    } else {
      stateRef.current = { ...s, tasks: s.tasks.filter(t => t.id !== taskId) };
    }

    setSnapshot(stateRef.current);
  }, []);

  return {
    agents: snapshot?.agents ?? [],
    tasks: snapshot?.tasks ?? [],
    events: snapshot?.events ?? [],
    addAgent,
    updateAgent,
    removeTask,
  };
}
