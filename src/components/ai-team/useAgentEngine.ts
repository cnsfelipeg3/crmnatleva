import { useState, useEffect, useRef, useCallback } from "react";
import { createInitialState, tick, type EngineState, type EngineAgent, type AgentEvent } from "./agentEngine";
import type { Agent, Task } from "./mockData";

interface UseAgentEngineReturn {
  agents: EngineAgent[];
  tasks: Task[];
  events: AgentEvent[];
  /** Add an agent dynamically */
  addAgent: (agent: Agent) => void;
  /** Remove a task (approve/ignore) */
  removeTask: (taskId: string) => void;
}

export function useAgentEngine(baseAgents: Agent[], baseTasks: Task[]): UseAgentEngineReturn {
  const stateRef = useRef<EngineState | null>(null);
  const [snapshot, setSnapshot] = useState<EngineState | null>(null);

  // Initialize once
  useEffect(() => {
    const now = Date.now();
    const initial = createInitialState(baseAgents, baseTasks, now);
    stateRef.current = initial;
    setSnapshot(initial);
  }, []); // run once on mount

  // Tick loop — 1s interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (!stateRef.current) return;
      const now = Date.now();
      const prev = stateRef.current;
      const next = tick(prev, now);

      // Only update React state if something actually changed
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
    };
    const s = stateRef.current;
    stateRef.current = {
      ...s,
      agents: [...s.agents, engineAgent],
    };
    setSnapshot(stateRef.current);
  }, []);

  const removeTask = useCallback((taskId: string) => {
    if (!stateRef.current) return;
    const s = stateRef.current;
    stateRef.current = {
      ...s,
      tasks: s.tasks.filter(t => t.id !== taskId),
    };
    setSnapshot(stateRef.current);
  }, []);

  return {
    agents: snapshot?.agents ?? [],
    tasks: snapshot?.tasks ?? [],
    events: snapshot?.events ?? [],
    addAgent,
    removeTask,
  };
}
