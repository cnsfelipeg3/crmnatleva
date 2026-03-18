import { useState, useCallback, useRef, useMemo, memo } from 'react';
import { Environment } from '@react-three/drei';
import OfficeFloor from './OfficeFloor';
import OfficeFurniture from './OfficeFurniture';
import PlayerController from './PlayerController';
import HumanNPC from './HumanNPC';
import CommercialSector from './CommercialSector';
import { NPC_POSITIONS, PLAYER_SPAWN } from './mapData3d';
import { checkProximityGreeting } from './greetingSystem';
import type { Agent, Task } from '../mockData';

interface Props {
  agents: Agent[];
  tasks: Task[];
  onSelectAgent: (agent: Agent) => void;
  joystickInput?: { x: number; z: number };
}

interface ActiveGreeting {
  message: string;
  expiresAt: number;
}

// Memoize static parts to prevent re-renders
const StaticEnvironment = memo(function StaticEnvironment() {
  return (
    <>
      {/* Simplified lighting — fewer lights = better perf */}
      <ambientLight intensity={0.45} color="#faf0e6" />
      <directionalLight
        position={[6, 16, 8]}
        intensity={1.4}
        color="#fff5e6"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={1}
        shadow-camera-far={35}
        shadow-bias={-0.001}
        shadow-normalBias={0.03}
      />
      <directionalLight position={[-8, 10, -4]} intensity={0.25} color="#d0e0ff" />
      <hemisphereLight args={['#e8e0d0', '#c0b8a8', 0.3]} />
      <fog attach="fog" args={['#e8e4dc', 16, 36]} />
      <Environment preset="apartment" environmentIntensity={0.15} />

      <OfficeFloor />
      <OfficeFurniture />
    </>
  );
});

export default function OfficeScene({ agents, tasks, onSelectAgent, joystickInput }: Props) {
  const [nearbyId, setNearbyId] = useState<string | null>(null);
  const [bubbleAgentId, setBubbleAgentId] = useState<string | null>(null);
  const [greetings, setGreetings] = useState<Record<string, ActiveGreeting>>({});
  const playerPosRef = useRef({ x: PLAYER_SPAWN.x, z: PLAYER_SPAWN.z });
  const greetingsRef = useRef<Record<string, ActiveGreeting>>({});
  const nearbyIdRef = useRef<string | null>(null);

  // Pre-compute task counts to avoid .filter() on every NPC render
  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      counts[t.sourceAgentId] = (counts[t.sourceAgentId] || 0) + 1;
    }
    return counts;
  }, [tasks]);

  const handlePositionChange = useCallback((x: number, z: number) => {
    playerPosRef.current = { x, z };

    let closest: string | null = null;
    let minDist = 1.5;
    let newGreetings = false;

    for (const agent of agents) {
      const npcPos = NPC_POSITIONS[agent.id];
      if (!npcPos) continue;
      const dx = x - npcPos.x;
      const dz = z - npcPos.z;
      const d = dx * dx + dz * dz; // skip sqrt — compare squared
      if (d < minDist * minDist) {
        minDist = Math.sqrt(d);
        closest = agent.id;
      }

      const event = checkProximityGreeting(agent.id, npcPos.x, npcPos.z, x, z, agent.status);
      if (event) {
        greetingsRef.current[agent.id] = { message: event.message, expiresAt: Date.now() + 4500 };
        newGreetings = true;
      }
    }

    // Clean expired
    const now = Date.now();
    let cleaned = false;
    for (const id in greetingsRef.current) {
      if (now > greetingsRef.current[id].expiresAt) {
        delete greetingsRef.current[id];
        cleaned = true;
      }
    }

    if (newGreetings || cleaned) {
      setGreetings({ ...greetingsRef.current });
    }

    // Only update state if changed
    if (closest !== nearbyIdRef.current) {
      nearbyIdRef.current = closest;
      setNearbyId(closest);
    }
    if (bubbleAgentId && closest !== bubbleAgentId) {
      setBubbleAgentId(null);
    }
  }, [agents, bubbleAgentId]);

  return (
    <>
      <StaticEnvironment />

      <PlayerController
        startPos={[PLAYER_SPAWN.x, 0, PLAYER_SPAWN.z]}
        onPositionChange={handlePositionChange}
        joystickInput={joystickInput}
      />

      {agents.map((agent) => {
        const npcPos = NPC_POSITIONS[agent.id];
        if (!npcPos) return null;
        const greeting = greetings[agent.id];
        return (
          <HumanNPC
            key={agent.id}
            agentId={agent.id}
            emoji={agent.emoji}
            name={agent.name}
            status={agent.status}
            taskCount={taskCounts[agent.id] || 0}
            position={[npcPos.x, npcPos.y, npcPos.z]}
            facingAngle={(npcPos as any).facingY ?? Math.PI}
            isNearby={nearbyId === agent.id}
            onClick={() => onSelectAgent(agent)}
            showBubble={bubbleAgentId === agent.id}
            onBubbleToggle={() => setBubbleAgentId(prev => prev === agent.id ? null : agent.id)}
            greetingMessage={greeting?.message}
            playerPos={playerPosRef.current}
          />
        );
      })}

      <CommercialSector playerPos={playerPosRef.current} />
    </>
  );
}
