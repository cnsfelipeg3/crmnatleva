import { useState, useCallback, useRef } from 'react';
import { Environment } from '@react-three/drei';
import OfficeFloor from './OfficeFloor';
import OfficeFurniture from './OfficeFurniture';
import PlayerController from './PlayerController';
import NPCAgent from './NPCAgent';
import { NPC_POSITIONS, PLAYER_SPAWN } from './mapData3d';
import type { Agent, Task } from '../mockData';

interface Props {
  agents: Agent[];
  tasks: Task[];
  onSelectAgent: (agent: Agent) => void;
  joystickInput?: { x: number; z: number };
}

export default function OfficeScene({ agents, tasks, onSelectAgent, joystickInput }: Props) {
  const [nearbyId, setNearbyId] = useState<string | null>(null);
  const playerPosRef = useRef({ x: PLAYER_SPAWN.x, z: PLAYER_SPAWN.z });

  const handlePositionChange = useCallback((x: number, z: number) => {
    playerPosRef.current = { x, z };

    let closest: string | null = null;
    let minDist = 1.5;
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

  return (
    <>
      {/* Premium Lighting */}
      <ambientLight intensity={0.4} color="#faf0e6" />

      {/* Main key light — warm sun */}
      <directionalLight
        position={[8, 14, 5]}
        intensity={1.2}
        color="#fff5e6"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-bias={-0.001}
        shadow-normalBias={0.02}
      />

      {/* Fill light — cool blue */}
      <directionalLight position={[-6, 8, -4]} intensity={0.35} color="#d0e0ff" />

      {/* Rim light — accent from behind */}
      <directionalLight position={[0, 5, -10]} intensity={0.2} color="#ffe0c0" />

      {/* Subtle point lights for warmth */}
      <pointLight position={[0, 3, 0]} intensity={0.3} color="#fff0d0" distance={12} decay={2} />
      <pointLight position={[-5, 2, -3]} intensity={0.15} color="#ffe8d0" distance={6} decay={2} />
      <pointLight position={[5, 2, 2]} intensity={0.15} color="#e0e8ff" distance={6} decay={2} />

      {/* Hemisphere for softer ambient */}
      <hemisphereLight args={['#e8e0d0', '#c0b8a8', 0.3]} />

      {/* Fog for depth */}
      <fog attach="fog" args={['#e8e4dc', 12, 28]} />

      {/* Environment map for reflections */}
      <Environment preset="apartment" environmentIntensity={0.15} />

      {/* Environment */}
      <OfficeFloor />
      <OfficeFurniture />

      {/* Player */}
      <PlayerController
        startPos={[PLAYER_SPAWN.x, 0, PLAYER_SPAWN.z]}
        onPositionChange={handlePositionChange}
        joystickInput={joystickInput}
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
