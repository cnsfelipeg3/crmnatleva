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

// Unique appearance per agent
const AGENT_APPEARANCE: Record<string, { skin: string; hair: string; hairStyle: 'short' | 'long' | 'bun' | 'buzz'; shirt: string; pants: string }> = {
  auditor:      { skin: '#d4a574', hair: '#1a1a1a', hairStyle: 'short', shirt: '#1e3a5f', pants: '#2c3e50' },
  estrategista: { skin: '#f5d0a9', hair: '#8b4513', hairStyle: 'long',  shirt: '#2d4a3e', pants: '#34495e' },
  analista:     { skin: '#c68642', hair: '#0a0a0a', hairStyle: 'buzz',  shirt: '#4a6fa5', pants: '#2c3e50' },
  financeiro:   { skin: '#f0d5b0', hair: '#654321', hairStyle: 'short', shirt: '#2e4057', pants: '#1a1a2e' },
  marketing:    { skin: '#deb887', hair: '#d4a017', hairStyle: 'long',  shirt: '#c0392b', pants: '#2c3e50' },
  comercial:    { skin: '#e8c39e', hair: '#3b2f2f', hairStyle: 'short', shirt: '#27ae60', pants: '#34495e' },
  atendimento:  { skin: '#f5cba7', hair: '#a0522d', hairStyle: 'bun',   shirt: '#8e44ad', pants: '#2c3e50' },
  operacional:  { skin: '#c68642', hair: '#1a1a1a', hairStyle: 'buzz',  shirt: '#e67e22', pants: '#2c3e50' },
  inovacao:     { skin: '#deb887', hair: '#2c1810', hairStyle: 'short', shirt: '#2980b9', pants: '#1a252f' },
  gerente:      { skin: '#f0d5b0', hair: '#3b2f2f', hairStyle: 'short', shirt: '#1a1a2e', pants: '#1a1a2e' },
};

export default function HumanNPC({ agentId, emoji, name, status, taskCount, position, isNearby, onClick }: Props) {
  const groupRef = useRef<Group>(null);
  const ringRef = useRef<Mesh>(null);
  const color = STATUS_COLORS[status] || '#9ca3af';
  const look = AGENT_APPEARANCE[agentId] || AGENT_APPEARANCE.analista;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const offset = position[0] * 2 + position[2];

    // Breathing bob
    groupRef.current.position.y = Math.sin(t * 1.5 + offset) * 0.01;

    // Subtle idle sway
    if (status === 'idle') {
      groupRef.current.rotation.y = Math.sin(t * 0.3 + offset) * 0.05;
    } else {
      // Active agents look around more
      groupRef.current.rotation.y = Math.sin(t * 0.8 + offset) * 0.15;
    }

    if (ringRef.current) {
      const s = 1 + Math.sin(t * 3) * 0.12;
      ringRef.current.scale.set(s, s, 1);
    }
  });

  return (
    <group position={position}>
      <group ref={groupRef}>
        {/* Ground shadow */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, 0]}>
          <circleGeometry args={[0.28, 24]} />
          <meshStandardMaterial color="#000" transparent opacity={0.15} />
        </mesh>

        {/* Status glow ring */}
        {status !== 'idle' && (
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, 0]}>
            <ringGeometry args={[0.3, 0.38, 32]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} transparent opacity={0.4} />
          </mesh>
        )}

        {/* Proximity ring */}
        {isNearby && (
          <mesh ref={ringRef} rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
            <ringGeometry args={[0.4, 0.48, 32]} />
            <meshStandardMaterial color="#6c5ce7" emissive="#6c5ce7" emissiveIntensity={0.6} transparent opacity={0.35} />
          </mesh>
        )}

        {/* === HUMANOID BODY === */}
        <group onClick={onClick}>
          {/* Shoes */}
          <mesh position={[-0.055, 0.025, 0.03]} castShadow>
            <boxGeometry args={[0.05, 0.04, 0.1]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.2} />
          </mesh>
          <mesh position={[0.055, 0.025, 0.03]} castShadow>
            <boxGeometry args={[0.05, 0.04, 0.1]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.2} />
          </mesh>

          {/* Legs */}
          <mesh position={[-0.055, 0.18, 0]} castShadow>
            <capsuleGeometry args={[0.038, 0.2, 4, 10]} />
            <meshStandardMaterial color={look.pants} roughness={0.7} />
          </mesh>
          <mesh position={[0.055, 0.18, 0]} castShadow>
            <capsuleGeometry args={[0.038, 0.2, 4, 10]} />
            <meshStandardMaterial color={look.pants} roughness={0.7} />
          </mesh>

          {/* Hips/Belt */}
          <mesh position={[0, 0.32, 0]} castShadow>
            <boxGeometry args={[0.18, 0.04, 0.1]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.5} metalness={0.3} />
          </mesh>

          {/* Torso */}
          <mesh position={[0, 0.46, 0]} castShadow>
            <capsuleGeometry args={[0.09, 0.18, 6, 12]} />
            <meshStandardMaterial color={look.shirt} roughness={0.5} metalness={0.08} />
          </mesh>

          {/* Collar detail */}
          <mesh position={[0, 0.56, 0.06]}>
            <boxGeometry args={[0.06, 0.025, 0.02]} />
            <meshStandardMaterial color={look.shirt} roughness={0.4} />
          </mesh>

          {/* Arms */}
          <mesh position={[-0.14, 0.44, 0]} castShadow>
            <capsuleGeometry args={[0.03, 0.2, 4, 8]} />
            <meshStandardMaterial color={look.shirt} roughness={0.5} />
          </mesh>
          <mesh position={[0.14, 0.44, 0]} castShadow>
            <capsuleGeometry args={[0.03, 0.2, 4, 8]} />
            <meshStandardMaterial color={look.shirt} roughness={0.5} />
          </mesh>

          {/* Hands */}
          <mesh position={[-0.14, 0.3, 0]} castShadow>
            <sphereGeometry args={[0.025, 8, 6]} />
            <meshStandardMaterial color={look.skin} roughness={0.6} />
          </mesh>
          <mesh position={[0.14, 0.3, 0]} castShadow>
            <sphereGeometry args={[0.025, 8, 6]} />
            <meshStandardMaterial color={look.skin} roughness={0.6} />
          </mesh>

          {/* Neck */}
          <mesh position={[0, 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.04, 0.05, 8]} />
            <meshStandardMaterial color={look.skin} roughness={0.6} />
          </mesh>

          {/* Head */}
          <mesh position={[0, 0.69, 0]} castShadow>
            <sphereGeometry args={[0.085, 16, 14]} />
            <meshStandardMaterial color={look.skin} roughness={0.55} metalness={0.02} />
          </mesh>

          {/* Ears */}
          <mesh position={[-0.08, 0.69, 0]}>
            <sphereGeometry args={[0.018, 6, 4]} />
            <meshStandardMaterial color={look.skin} roughness={0.6} />
          </mesh>
          <mesh position={[0.08, 0.69, 0]}>
            <sphereGeometry args={[0.018, 6, 4]} />
            <meshStandardMaterial color={look.skin} roughness={0.6} />
          </mesh>

          {/* Eyes — whites */}
          <mesh position={[-0.028, 0.7, 0.075]}>
            <sphereGeometry args={[0.013, 8, 6]} />
            <meshStandardMaterial color="#fff" roughness={0.15} />
          </mesh>
          <mesh position={[0.028, 0.7, 0.075]}>
            <sphereGeometry args={[0.013, 8, 6]} />
            <meshStandardMaterial color="#fff" roughness={0.15} />
          </mesh>
          {/* Pupils */}
          <mesh position={[-0.028, 0.7, 0.087]}>
            <sphereGeometry args={[0.006, 6, 4]} />
            <meshStandardMaterial color="#1a1a2e" roughness={0.1} />
          </mesh>
          <mesh position={[0.028, 0.7, 0.087]}>
            <sphereGeometry args={[0.006, 6, 4]} />
            <meshStandardMaterial color="#1a1a2e" roughness={0.1} />
          </mesh>

          {/* Nose */}
          <mesh position={[0, 0.685, 0.085]}>
            <boxGeometry args={[0.015, 0.02, 0.015]} />
            <meshStandardMaterial color={look.skin} roughness={0.6} />
          </mesh>

          {/* Mouth line */}
          <mesh position={[0, 0.665, 0.08]}>
            <boxGeometry args={[0.025, 0.004, 0.005]} />
            <meshStandardMaterial color="#b5836b" roughness={0.7} />
          </mesh>

          {/* Eyebrows */}
          <mesh position={[-0.028, 0.72, 0.075]}>
            <boxGeometry args={[0.025, 0.005, 0.008]} />
            <meshStandardMaterial color={look.hair} roughness={0.8} />
          </mesh>
          <mesh position={[0.028, 0.72, 0.075]}>
            <boxGeometry args={[0.025, 0.005, 0.008]} />
            <meshStandardMaterial color={look.hair} roughness={0.8} />
          </mesh>

          {/* Hair */}
          {look.hairStyle === 'short' && (
            <>
              <mesh position={[0, 0.75, -0.01]} castShadow>
                <sphereGeometry args={[0.082, 12, 10]} />
                <meshStandardMaterial color={look.hair} roughness={0.85} />
              </mesh>
              <mesh position={[0, 0.77, 0.02]}>
                <boxGeometry args={[0.14, 0.03, 0.08]} />
                <meshStandardMaterial color={look.hair} roughness={0.85} />
              </mesh>
            </>
          )}
          {look.hairStyle === 'long' && (
            <>
              <mesh position={[0, 0.75, -0.01]} castShadow>
                <sphereGeometry args={[0.09, 12, 10]} />
                <meshStandardMaterial color={look.hair} roughness={0.85} />
              </mesh>
              <mesh position={[0, 0.68, -0.05]} castShadow>
                <capsuleGeometry args={[0.06, 0.12, 4, 8]} />
                <meshStandardMaterial color={look.hair} roughness={0.85} />
              </mesh>
            </>
          )}
          {look.hairStyle === 'bun' && (
            <>
              <mesh position={[0, 0.75, -0.01]} castShadow>
                <sphereGeometry args={[0.082, 12, 10]} />
                <meshStandardMaterial color={look.hair} roughness={0.85} />
              </mesh>
              <mesh position={[0, 0.8, -0.03]} castShadow>
                <sphereGeometry args={[0.04, 8, 6]} />
                <meshStandardMaterial color={look.hair} roughness={0.85} />
              </mesh>
            </>
          )}
          {look.hairStyle === 'buzz' && (
            <mesh position={[0, 0.74, -0.005]} castShadow>
              <sphereGeometry args={[0.084, 12, 10]} />
              <meshStandardMaterial color={look.hair} roughness={0.9} />
            </mesh>
          )}
        </group>

        {/* Label */}
        <Html position={[0, 1.0, 0]} center distanceFactor={5} style={{ pointerEvents: 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: '18px', lineHeight: 1, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
              {emoji}
            </span>
            <span style={{
              fontSize: '9px', fontWeight: 700, color: '#3a3530',
              background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)',
              padding: '2px 8px', borderRadius: '8px',
              border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            }}>
              {name}
            </span>
            {(isNearby || status !== 'idle') && (
              <span style={{
                fontSize: '7px', fontWeight: 600, color: color,
                background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)',
                padding: '1px 6px', borderRadius: '6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}>
                ● {STATUS_LABELS[status] || status}
              </span>
            )}
            {taskCount > 0 && (
              <span style={{
                fontSize: '7px', fontWeight: 700, color: '#fff',
                background: '#ef4444', padding: '0 5px', borderRadius: '8px',
                minWidth: '14px', textAlign: 'center',
                boxShadow: '0 1px 3px rgba(239,68,68,0.4)',
              }}>
                {taskCount}
              </span>
            )}
          </div>
        </Html>

        {/* Interaction prompt */}
        {isNearby && (
          <Html position={[0, 1.3, 0]} center style={{ pointerEvents: 'none' }}>
            <div style={{
              fontSize: '10px', fontWeight: 600, color: '#fff',
              background: 'rgba(20,18,15,0.88)', backdropFilter: 'blur(4px)',
              padding: '4px 12px', borderRadius: '10px', whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            }}>
              Toque para interagir
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}
