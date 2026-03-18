import { useState, useCallback, useRef } from 'react';
import { Environment } from '@react-three/drei';
import OfficeFloor from './OfficeFloor';
import OfficeFurniture from './OfficeFurniture';
import PlayerController from './PlayerController';
import HumanNPC from './HumanNPC';
import CommercialSector from './CommercialSector';
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
  const [bubbleAgentId, setBubbleAgentId] = useState<string | null>(null);
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
    // Close bubble if player walks away
    if (bubbleAgentId && closest !== bubbleAgentId) {
      setBubbleAgentId(null);
    }
  }, [agents, bubbleAgentId]);

  return (
    <>
      {/* Premium Lighting */}
      <ambientLight intensity={0.35} color="#faf0e6" />
      <directionalLight
        position={[6, 16, 8]}
        intensity={1.4}
        color="#fff5e6"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={1}
        shadow-camera-far={35}
        shadow-bias={-0.0008}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-8, 10, -4]} intensity={0.3} color="#d0e0ff" />
      <directionalLight position={[2, 6, -12]} intensity={0.25} color="#ffe0c0" />
      <pointLight position={[0, 3, 0]} intensity={0.3} color="#fff0d0" distance={14} decay={2} />
      <pointLight position={[-6, 2, -3]} intensity={0.15} color="#ffe8d0" distance={8} decay={2} />
      <pointLight position={[6, 2, 2]} intensity={0.15} color="#e0e8ff" distance={8} decay={2} />
      <spotLight position={[-3.5, 2.5, -4.5]} target-position={[-3.5, 1.3, -5.3]} angle={0.4} penumbra={0.6} intensity={0.5} color="#c9a96e" distance={5} />
      <hemisphereLight args={['#e8e0d0', '#c0b8a8', 0.25]} />
      <fog attach="fog" args={['#e8e4dc', 14, 32]} />
      <Environment preset="apartment" environmentIntensity={0.2} />

      <OfficeFloor />
      <OfficeFurniture />

      <PlayerController
        startPos={[PLAYER_SPAWN.x, 0, PLAYER_SPAWN.z]}
        onPositionChange={handlePositionChange}
        joystickInput={joystickInput}
      />

      {agents.map((agent) => {
        const npcPos = NPC_POSITIONS[agent.id];
        if (!npcPos) return null;
        return (
          <HumanNPC
            key={agent.id}
            agentId={agent.id}
            emoji={agent.emoji}
            name={agent.name}
            status={agent.status}
            taskCount={tasks.filter(t => t.sourceAgentId === agent.id).length}
            position={[npcPos.x, npcPos.y, npcPos.z]}
            isNearby={nearbyId === agent.id}
            onClick={() => onSelectAgent(agent)}
            showBubble={bubbleAgentId === agent.id}
            onBubbleToggle={() => setBubbleAgentId(prev => prev === agent.id ? null : agent.id)}
          />
        );
      })}

      {/* Commercial Sector */}
      <CommercialSector playerPos={playerPosRef.current} />
    </>
  );
}
