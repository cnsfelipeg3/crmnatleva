/**
 * HandoffAgent — A small NPC clone that walks between desks carrying a glowing folder.
 * Entirely self-animated via useFrame.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  type HandoffEvent,
  getHandoffPosition,
  tickHandoff,
  PRIORITY_COLORS,
} from './taskHandoffSystem';

interface Props {
  event: HandoffEvent;
  onDone: (id: string) => void;
  onUpdate: (updated: HandoffEvent) => void;
}

const fmt = (v: number) => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`;

export default function HandoffAgent({ event, onDone, onUpdate }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const folderRef = useRef<THREE.Mesh>(null);
  const lastTime = useRef(0);

  const prioColor = PRIORITY_COLORS[event.priority];

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const delta = lastTime.current === 0 ? 0.016 : t - lastTime.current;
    lastTime.current = t;

    if (event.phase === 'done') {
      onDone(event.id);
      return;
    }

    // Tick progress
    const updated = tickHandoff(event, delta);
    if (updated.progress !== event.progress) {
      onUpdate(updated);
    }

    // Position
    const pos = getHandoffPosition(updated);
    if (groupRef.current) {
      groupRef.current.position.set(pos.x, pos.y, pos.z);
      groupRef.current.rotation.y = pos.rotation;

      // Walking bob animation
      if (updated.phase === 'walking') {
        groupRef.current.position.y = Math.abs(Math.sin(t * 8)) * 0.03;
      }
    }

    // Folder glow pulse
    if (folderRef.current) {
      const mat = folderRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.4 + Math.sin(t * 4) * 0.2;
    }
  });

  // Hide during 'done' phase
  if (event.phase === 'done') return null;

  const isDelivering = event.phase === 'delivering';

  return (
    <group ref={groupRef}>
      {/* Mini humanoid — simplified silhouette */}
      {/* Legs with walking animation */}
      <mesh position={[-0.04, 0.14, 0]} castShadow>
        <capsuleGeometry args={[0.025, 0.14, 3, 6]} />
        <meshStandardMaterial color="#2c3e50" roughness={0.7} />
      </mesh>
      <mesh position={[0.04, 0.14, 0]} castShadow>
        <capsuleGeometry args={[0.025, 0.14, 3, 6]} />
        <meshStandardMaterial color="#2c3e50" roughness={0.7} />
      </mesh>
      {/* Torso */}
      <mesh position={[0, 0.38, 0]} castShadow>
        <capsuleGeometry args={[0.065, 0.12, 4, 8]} />
        <meshStandardMaterial color="#1a3050" roughness={0.5} metalness={0.1} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.56, 0]} castShadow>
        <sphereGeometry args={[0.055, 10, 8]} />
        <meshStandardMaterial color="#e8c39e" roughness={0.55} />
      </mesh>

      {/* ═══ THE FOLDER ═══ */}
      <group position={[0.12, 0.35, 0.06]} rotation={[0.2, 0, -0.3]}>
        {/* Folder body */}
        <mesh ref={folderRef} castShadow>
          <boxGeometry args={[0.14, 0.1, 0.015]} />
          <meshStandardMaterial
            color={prioColor}
            emissive={prioColor}
            emissiveIntensity={0.4}
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>
        {/* Folder flap */}
        <mesh position={[0, 0.04, -0.002]}>
          <boxGeometry args={[0.14, 0.03, 0.012]} />
          <meshStandardMaterial color={prioColor} roughness={0.5} />
        </mesh>
        {/* Folder glow */}
        <pointLight color={prioColor} intensity={0.3} distance={1.2} decay={2} />
      </group>

      {/* Folder label */}
      <Html position={[0.12, 0.52, 0.06]} center distanceFactor={4} style={{ pointerEvents: 'none' }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px',
          animation: 'handoffLabel 0.4s ease-out',
        }}>
          <span style={{
            fontSize: '8px', fontWeight: 700, color: '#fff',
            background: `${prioColor}dd`, padding: '1px 6px', borderRadius: '4px',
            whiteSpace: 'nowrap', boxShadow: `0 1px 6px ${prioColor}40`,
          }}>
            {event.clientName}
          </span>
          <span style={{
            fontSize: '6px', fontWeight: 600, color: '#ddd',
            background: 'rgba(0,0,0,0.7)', padding: '1px 5px', borderRadius: '3px',
            whiteSpace: 'nowrap',
          }}>
            {event.funnelStage} • {fmt(event.dealValue)}
          </span>
        </div>
        <style>{`
          @keyframes handoffLabel {
            0% { opacity: 0; transform: translateY(5px); }
            100% { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </Html>

      {/* Delivery flash effect */}
      {isDelivering && (
        <pointLight
          position={[0, 0.5, 0]}
          color="#10b981"
          intensity={1.5}
          distance={2}
          decay={2}
        />
      )}

      {/* Trail dots while walking */}
      {event.phase === 'walking' && (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, -0.15]}>
          <circleGeometry args={[0.04, 8]} />
          <meshStandardMaterial
            color={prioColor}
            emissive={prioColor}
            emissiveIntensity={0.5}
            transparent
            opacity={0.3}
          />
        </mesh>
      )}
    </group>
  );
}
