// @ts-nocheck
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Group, Mesh } from 'three';

interface Props {
  agentId: string;
  emoji: string;
  name: string;
  status: string;
  taskCount: number;
  position: [number, number, number];
  isNearby: boolean;
  onClick: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  idle: '#9ca3af',
  analyzing: '#3b82f6',
  suggesting: '#10b981',
  waiting: '#f59e0b',
  alert: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  idle: 'Aguardando',
  analyzing: 'Analisando',
  suggesting: 'Sugerindo',
  waiting: 'Esperando',
  alert: 'Alerta',
};

export default function NPCAgent({ emoji, name, status, taskCount, position, isNearby, onClick }: Props) {
  const groupRef = useRef<Group>(null);
  const ringRef = useRef<Mesh>(null);
  const bodyRef = useRef<Mesh>(null);
  const color = STATUS_COLORS[status] || '#9ca3af';

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    // Idle bob
    groupRef.current.position.y = Math.sin(t * 1.8 + position[0] * 2) * 0.025;

    // Subtle rotation based on status
    if (status !== 'idle') {
      groupRef.current.rotation.y = Math.sin(t * 0.5 + position[0]) * 0.2;
    } else {
      groupRef.current.rotation.y = Math.sin(t * 0.2 + position[0]) * 0.05;
    }

    // Proximity ring pulse
    if (ringRef.current) {
      const s = 1 + Math.sin(t * 4) * 0.1;
      ringRef.current.scale.set(s, s, 1);
    }

    // Body breathing
    if (bodyRef.current) {
      const breathe = 1 + Math.sin(t * 2 + position[0]) * 0.015;
      bodyRef.current.scale.set(breathe, 1, breathe);
    }
  });

  return (
    <group position={position}>
      <group ref={groupRef}>
        {/* Ground shadow */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, 0]}>
          <circleGeometry args={[0.32, 24]} />
          <meshStandardMaterial color="#000" transparent opacity={0.1} />
        </mesh>

        {/* Status glow ring on floor */}
        {status !== 'idle' && (
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, 0]}>
            <ringGeometry args={[0.28, 0.36, 32]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.8}
              transparent
              opacity={0.45}
            />
          </mesh>
        )}

        {/* Proximity ring */}
        {isNearby && (
          <mesh ref={ringRef} rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
            <ringGeometry args={[0.4, 0.48, 32]} />
            <meshStandardMaterial
              color="#6c5ce7"
              emissive="#6c5ce7"
              emissiveIntensity={0.7}
              transparent
              opacity={0.4}
            />
          </mesh>
        )}

        {/* Body capsule */}
        <mesh ref={bodyRef} position={[0, 0.4, 0]} castShadow onClick={onClick}>
          <capsuleGeometry args={[0.15, 0.3, 6, 16]} />
          <meshStandardMaterial
            color={color}
            roughness={0.4}
            metalness={0.15}
            envMapIntensity={0.3}
          />
        </mesh>

        {/* Shoulders */}
        <mesh position={[0, 0.52, 0]} castShadow>
          <boxGeometry args={[0.36, 0.06, 0.16]} />
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} />
        </mesh>

        {/* Head sphere */}
        <mesh position={[0, 0.72, 0]} castShadow onClick={onClick}>
          <sphereGeometry args={[0.13, 16, 12]} />
          <meshStandardMaterial color="#f0ebe3" roughness={0.55} metalness={0.05} />
        </mesh>

        {/* Eyes (subtle) */}
        <mesh position={[-0.04, 0.73, 0.11]}>
          <sphereGeometry args={[0.02, 8, 6]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.3} />
        </mesh>
        <mesh position={[0.04, 0.73, 0.11]}>
          <sphereGeometry args={[0.02, 8, 6]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.3} />
        </mesh>

        {/* Label */}
        <Html position={[0, 1.1, 0]} center distanceFactor={6} style={{ pointerEvents: 'none' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            whiteSpace: 'nowrap',
          }}>
            <span style={{ fontSize: '20px', lineHeight: 1, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}>
              {emoji}
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#3a3530',
              background: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(6px)',
              padding: '2px 8px',
              borderRadius: '8px',
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            }}>
              {name}
            </span>
            {(isNearby || status !== 'idle') && (
              <span style={{
                fontSize: '8px',
                fontWeight: 600,
                color: color,
                background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(4px)',
                padding: '1px 6px',
                borderRadius: '6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}>
                ● {STATUS_LABELS[status] || status}
              </span>
            )}
            {taskCount > 0 && (
              <span style={{
                fontSize: '8px',
                fontWeight: 700,
                color: '#fff',
                background: '#ef4444',
                padding: '0 5px',
                borderRadius: '8px',
                minWidth: '16px',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(239,68,68,0.4)',
              }}>
                {taskCount}
              </span>
            )}
          </div>
        </Html>

        {/* Interaction prompt */}
        {isNearby && (
          <Html position={[0, 1.5, 0]} center style={{ pointerEvents: 'none' }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#fff',
              background: 'rgba(20,18,15,0.85)',
              backdropFilter: 'blur(4px)',
              padding: '4px 12px',
              borderRadius: '10px',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}>
              Toque para interagir
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}
