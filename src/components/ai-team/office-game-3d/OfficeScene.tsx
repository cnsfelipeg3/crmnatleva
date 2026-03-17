import { useState, useCallback, useRef } from 'react';
import OfficeFloor from './OfficeFloor';
import OfficeFurniture from './OfficeFurniture';
import PlayerController from './PlayerController';
import NPCAgent from './NPCAgent';
import { NPC_POSITIONS, PLAYER_SPAWN } from './mapData3d';
import { INTERACTION_RADIUS } from '../office-game/types';
import type { Agent, Task } from '../mockData';

interface Props {
  agents: Agent[];
  tasks: Task[];
  onSelectAgent: (agent: Agent) => void;
}

export default function OfficeScene({ agents, tasks, onSelectAgent }: Props) {
  const [nearbyId, setNearbyId] = useState<string | null>(null);
  const playerPosRef = useRef({ x: PLAYER_SPAWN.x, z: PLAYER_SPAWN.z });

  const handlePositionChange = useCallback((x: number, z: number) => {
    playerPosRef.current = { x, z };

    // Check proximity to NPCs
    let closest: string | null = null;
    let minDist = 1.2; // 3D interaction radius
    for (const agent of agents) {
      const npcPos = NPC_POSITIONS[agent.id];
      if (!npcPos) continue;
      const dx = x - npcPos.x;
      const dz = z - npcPos.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < minDist) {
        minDist = d;
        closest = agent.id;
      }
    }
    setNearbyId(closest);
  }, [agents]);

  const handleKeyInteract = useCallback(() => {
    if (nearbyId) {
      const agent = agents.find(a => a.id === nearbyId);
      if (agent) onSelectAgent(agent);
    }
  }, [nearbyId, agents, onSelectAgent]);

  // Listen for E key
  const eHandled = useRef(false);
  if (typeof window !== 'undefined') {
    // Use effect-like approach in render for simplicity
    // The actual E key handling is in a useEffect inside the component
  }

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} color="#faf0e6" />
      <directionalLight
        position={[6, 10, 4]}
        intensity={0.8}
        color="#fff8f0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={1}
        shadow-camera-far={20}
        shadow-bias={-0.002}
      />
      {/* Subtle fill light from opposite side */}
      <directionalLight position={[-4, 6, -3]} intensity={0.2} color="#e0e8ff" />

      {/* Environment */}
      <OfficeFloor />
      <OfficeFurniture />

      {/* Player */}
      <PlayerController
        startPos={[PLAYER_SPAWN.x, 0, PLAYER_SPAWN.z]}
        onPositionChange={handlePositionChange}
      />

      {/* NPCs */}
      {agents.map((agent) => {
        const npcPos = NPC_POSITIONS[agent.id];
        if (!npcPos) return null;
        return (
          <NPCAgent
            key={agent.id}
            agentId={agent.id}
            emoji={agent.emoji}
            name={agent.name}
            status={agent.status}
            taskCount={tasks.filter(t => t.sourceAgentId === agent.id).length}
            position={[npcPos.x, npcPos.y, npcPos.z]}
            isNearby={nearbyId === agent.id}
            onClick={() => onSelectAgent(agent)}
          />
        );
      })}
    </>
  );
}
