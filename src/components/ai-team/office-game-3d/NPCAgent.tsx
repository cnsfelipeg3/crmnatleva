import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Group } from 'three';

interface Props {
  agentId: string;
  emoji: string;
  name: string;
  status: 'idle' | 'analyzing' | 'suggesting';
  taskCount: number;
  position: [number, number, number];
  isNearby: boolean;
  onClick: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  idle: '#9ca3af',
  analyzing: '#3b82f6',
  suggesting: '#10b981',
};

const STATUS_LABELS: Record<string, string> = {
  idle: 'Aguardando',
  analyzing: 'Analisando',
  suggesting: 'Sugerindo',
};

export default function NPCAgent({ emoji, name, status, taskCount, position, isNearby, onClick }: Props) {
  const groupRef = useRef<Group>(null);
  const ringRef = useRef<any>(null);
  const color = STATUS_COLORS[status];

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    // Idle bob
    groupRef.current.position.y = Math.sin(t * 1.8 + position[0] * 2) * 0.02;

    // Slow rotation
    if (status !== 'idle') {
      groupRef.current.rotation.y = Math.sin(t * 0.5 + position[0]) * 0.15;
    }

    // Proximity ring pulse
    if (ringRef.current) {
      const s = 1 + Math.sin(t * 4) * 0.08;
      ringRef.current.scale.set(s, s, 1);
    }
  });

  return (
    <group position={position}>
      <group ref={groupRef}>
        {/* Ground shadow */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, 0]}>
          <circleGeometry args={[0.28, 16]} />
          <meshStandardMaterial color="#000" transparent opacity={0.08} />
        </mesh>

        {/* Status glow ring on floor */}
        {status !== 'idle' && (
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.008, 0]}>
            <ringGeometry args={[0.26, 0.32, 24]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} transparent opacity={0.4} />
          </mesh>
        )}

        {/* Proximity ring */}
        {isNearby && (
          <mesh ref={ringRef} rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
            <ringGeometry args={[0.36, 0.42, 24]} />
            <meshStandardMaterial color="#6c5ce7" emissive="#6c5ce7" emissiveIntensity={0.5} transparent opacity={0.35} />
          </mesh>
        )}

        {/* Body capsule */}
        <mesh position={[0, 0.38, 0]} castShadow onClick={onClick}>
          <capsuleGeometry args={[0.14, 0.28, 4, 12]} />
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} />
        </mesh>

        {/* Head sphere */}
        <mesh position={[0, 0.7, 0]} castShadow onClick={onClick}>
          <sphereGeometry args={[0.12, 12, 8]} />
          <meshStandardMaterial color="#f0ebe3" roughness={0.7} />
        </mesh>

        {/* Label (only nearby or hover) */}
        <Html position={[0, 1.05, 0]} center distanceFactor={6} style={{ pointerEvents: 'none' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            whiteSpace: 'nowrap',
          }}>
            <span style={{ fontSize: '18px', lineHeight: 1 }}>{emoji}</span>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#3a3530',
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(4px)',
              padding: '1px 6px',
              borderRadius: '6px',
              border: '1px solid rgba(0,0,0,0.06)',
            }}>
              {name}
            </span>
            {isNearby && (
              <span style={{
                fontSize: '8px',
                fontWeight: 600,
                color: color,
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(4px)',
                padding: '1px 5px',
                borderRadius: '4px',
              }}>
                ● {STATUS_LABELS[status]}
              </span>
            )}
            {taskCount > 0 && (
              <span style={{
                fontSize: '8px',
                fontWeight: 700,
                color: '#fff',
                background: '#ef4444',
                padding: '0 4px',
                borderRadius: '6px',
                minWidth: '14px',
                textAlign: 'center',
              }}>
                {taskCount}
              </span>
            )}
          </div>
        </Html>

        {/* Interaction prompt */}
        {isNearby && (
          <Html position={[0, 1.4, 0]} center style={{ pointerEvents: 'none' }}>
            <div style={{
              fontSize: '10px',
              fontWeight: 600,
              color: '#fff',
              background: 'rgba(20,18,15,0.78)',
              padding: '3px 10px',
              borderRadius: '8px',
              whiteSpace: 'nowrap',
            }}>
              E &nbsp;ou&nbsp; Clique
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}
