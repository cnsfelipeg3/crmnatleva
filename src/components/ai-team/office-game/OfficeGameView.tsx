import { useRef, useCallback, useMemo } from 'react';
import type { Agent, Task } from '../mockData';
import type { GameState, Camera, NPCData } from './types';
import { NPC_SPAWNS, PLAYER_SPAWN } from './mapData';
import { useInputHandler } from './useInputHandler';
import { useGameLoop } from './useGameLoop';
import OfficeHUD from './OfficeHUD';

interface Props {
  agents: Agent[];
  tasks: Task[];
  onBack: () => void;
  onSelectAgent: (agent: Agent) => void;
}

export default function OfficeGameView({ agents, tasks, onBack, onSelectAgent }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<Camera>({ scale: 1, offsetX: 0, offsetY: 0 });

  const npcs: NPCData[] = useMemo(
    () =>
      agents.map((a) => ({
        id: a.id,
        agentId: a.id,
        pos: { ...(NPC_SPAWNS[a.id] || { x: 900 + agents.indexOf(a) * 120, y: 400 }) },
        emoji: a.emoji,
        name: a.name,
        status: a.status,
        taskCount: tasks.filter((t) => t.sourceAgentId === a.id).length,
      })),
    [agents, tasks],
  );

  const gameStateRef = useRef<GameState>({
    player: { pos: { ...PLAYER_SPAWN }, target: null },
    npcs,
    nearbyNpcId: null,
  });

  // Keep NPC data in sync
  gameStateRef.current.npcs = npcs;

  const inputRef = useInputHandler(canvasRef, cameraRef);

  const handleInteract = useCallback(
    (agentId: string) => {
      const agent = agents.find((a) => a.id === agentId);
      if (agent) onSelectAgent(agent);
    },
    [agents, onSelectAgent],
  );

  useGameLoop(canvasRef, gameStateRef, inputRef, cameraRef, handleInteract);

  return (
    <div className="fixed inset-0 z-50" style={{ background: '#e8e4dc' }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ cursor: 'crosshair' }}
      />
      <OfficeHUD onBack={onBack} />
    </div>
  );
}
