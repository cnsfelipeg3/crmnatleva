/**
 * CommercialSector — The 5-zone commercial floor of the NatLeva 3D office.
 * Lazy-renderable, self-contained, performance-optimized.
 */
import { useRef, useState, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  COMMERCIAL_ZONES,
  COMMERCIAL_DESKS,
  COMMERCIAL_AGENTS,
  PERF_COLORS,
  type CommercialAgent,
} from './commercialMapData';
import { checkProximityGreeting, pickCommercialGreeting } from './greetingSystem';
import { generateRandomHandoff, type HandoffEvent } from './taskHandoffSystem';
import HandoffAgent from './HandoffAgent';

/* ────────────────────────── helpers ─────────────── */
const fmt = (v: number) => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`;

/* ────────────────────────── Zone Floor ──────────── */
function ZoneFloor({ center, size, color }: { center: { x: number; z: number }; size: { w: number; h: number }; color: string }) {
  return (
    <group>
      {/* Zone highlight */}
      <mesh rotation-x={-Math.PI / 2} position={[center.x, 0.004, center.z]}>
        <planeGeometry args={[size.w, size.h]} />
        <meshStandardMaterial color={color} roughness={1} transparent opacity={0.08} />
      </mesh>
      {/* Border line */}
      <mesh rotation-x={-Math.PI / 2} position={[center.x, 0.005, center.z]}>
        <ringGeometry args={[Math.min(size.w, size.h) * 0.48, Math.min(size.w, size.h) * 0.49, 4]} />
        <meshStandardMaterial color={color} transparent opacity={0.15} roughness={0.5} />
      </mesh>
    </group>
  );
}

/* ────────────────────────── Zone Sign ───────────── */
function ZoneSign({ label, emoji, color, position }: { label: string; emoji: string; color: string; position: [number, number, number] }) {
  return (
    <Html position={position} center distanceFactor={7} style={{ pointerEvents: 'none' }}>
      <div style={{
        fontSize: '11px', fontWeight: 700, color: '#fff',
        background: `linear-gradient(135deg, ${color}dd, ${color}88)`,
        backdropFilter: 'blur(8px)',
        padding: '4px 14px', borderRadius: '8px', whiteSpace: 'nowrap',
        letterSpacing: '1.5px', fontFamily: 'Space Grotesk, sans-serif',
        boxShadow: `0 2px 12px ${color}40`,
        border: `1px solid ${color}60`,
      }}>
        {emoji} {label.toUpperCase()}
      </div>
    </Html>
  );
}

/* ────────────────────────── Commercial Desk with Odyssey G9 ─── */
function CommDesk({ pos, size, zone }: { pos: { x: number; y: number; z: number }; size: { x: number; y: number; z: number }; zone: string }) {
  const zoneData = COMMERCIAL_ZONES.find(z => z.key === zone);
  const tint = zoneData?.color || '#6d5d48';
  const legH = pos.y - 0.02;
  const monW = size.x * 0.85;
  const monH = monW * 0.28;

  return (
    <group position={[pos.x, 0, pos.z]}>
      {/* Desktop */}
      <mesh position={[0, pos.y, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, size.y, size.z]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.5} metalness={0.1} />
      </mesh>
      {/* Accent strip */}
      <mesh position={[0, pos.y + size.y / 2 + 0.002, 0]}>
        <boxGeometry args={[size.x + 0.01, 0.004, size.z + 0.01]} />
        <meshStandardMaterial color={tint} roughness={0.3} metalness={0.3} emissive={tint} emissiveIntensity={0.15} />
      </mesh>
      {/* Legs */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([fx, fz], i) => (
        <mesh key={i} position={[fx * (size.x / 2 - 0.08), legH / 2, fz * (size.z / 2 - 0.06)]}>
          <cylinderGeometry args={[0.02, 0.02, legH, 6]} />
          <meshStandardMaterial color="#3a3a3a" roughness={0.4} metalness={0.5} />
        </mesh>
      ))}

      {/* ═══ Samsung Odyssey OLED G9 49" Ultrawide ═══ */}
      <group position={[0, pos.y + monH / 2 + 0.06, -size.z / 2 + 0.12]}>
        {/* Stand base */}
        <mesh position={[0, -monH / 2 - 0.02, 0.05]}>
          <boxGeometry args={[0.2, 0.008, 0.12]} />
          <meshStandardMaterial color="#c0c0c0" roughness={0.15} metalness={0.85} />
        </mesh>
        <mesh position={[0, -monH / 2 + 0.03, 0.05]}>
          <cylinderGeometry args={[0.012, 0.016, 0.08, 8]} />
          <meshStandardMaterial color="#b0b0b0" roughness={0.15} metalness={0.85} />
        </mesh>
        {/* Monitor body — silver */}
        <mesh castShadow>
          <boxGeometry args={[monW, monH, 0.02]} />
          <meshStandardMaterial color="#c8c8c8" roughness={0.12} metalness={0.8} />
        </mesh>
        {/* Bezel */}
        <mesh position={[0, 0, 0.011]}>
          <boxGeometry args={[monW + 0.006, monH + 0.006, 0.002]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.1} metalness={0.7} />
        </mesh>
        {/* OLED Screen */}
        <mesh position={[0, 0, 0.012]}>
          <planeGeometry args={[monW - 0.008, monH - 0.008]} />
          <meshStandardMaterial color="#020208" emissive={tint} emissiveIntensity={0.5} roughness={0.02} metalness={0.05} />
        </mesh>
        <pointLight position={[0, 0, 0.12]} intensity={0.08} color={tint} distance={1} decay={2} />
      </group>

      {/* Keyboard */}
      <mesh position={[0, pos.y + 0.025, size.z / 2 - 0.16]} castShadow>
        <boxGeometry args={[0.2, 0.01, 0.07]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Mouse */}
      <mesh position={[0.16, pos.y + 0.02, size.z / 2 - 0.16]} castShadow>
        <boxGeometry args={[0.035, 0.012, 0.05]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.5} metalness={0.2} />
      </mesh>

      {/* File holder */}
      <group position={[size.x / 2 - 0.1, pos.y, size.z / 2 - 0.06]}>
        <mesh position={[0, 0.035, 0]} castShadow>
          <boxGeometry args={[0.08, 0.07, 0.08]} />
          <meshStandardMaterial color="#3a3a3a" roughness={0.4} metalness={0.5} />
        </mesh>
        {[0, 1].map(i => (
          <mesh key={i} position={[0, 0.05 + i * 0.016, -0.008]} castShadow>
            <boxGeometry args={[0.065, 0.012, 0.065]} />
            <meshStandardMaterial color={tint} roughness={0.6} metalness={0.1} emissive={tint} emissiveIntensity={0.1} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ────────────────────────── Comm Chair ──────────── */
function CommChair({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.04, 12]} />
        <meshStandardMaterial color="#383838" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.46, -0.1]} castShadow>
        <boxGeometry args={[0.24, 0.28, 0.025]} />
        <meshStandardMaterial color="#333" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.28, 6]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.3} metalness={0.5} />
      </mesh>
    </group>
  );
}

/* ────────────────────────── Commercial NPC ──────── */
function CommNPC({ agent, playerPos, onSelect, greetingMessage }: {
  agent: CommercialAgent;
  playerPos: { x: number; z: number };
  onSelect: (agent: CommercialAgent) => void;
  greetingMessage?: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const perfColor = PERF_COLORS[agent.performance];

  const dx = playerPos.x - agent.position.x;
  const dz = playerPos.z - agent.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const isNearby = dist < 1.8;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const offset = agent.position.x * 2 + agent.position.z;
    groupRef.current.position.y = Math.sin(t * 1.5 + offset) * 0.008;

    // Turn toward boss when greeting
    if (greetingMessage) {
      const tdx = playerPos.x - agent.position.x;
      const tdz = playerPos.z - agent.position.z;
      const targetAngle = Math.atan2(tdx, tdz);
      const cur = groupRef.current.rotation.y;
      let diff = targetAngle - cur;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      groupRef.current.rotation.y += diff * 0.08;
    } else {
      groupRef.current.rotation.y = Math.sin(t * 0.6 + offset) * 0.1;
    }

    if (ringRef.current) {
      const s = 1 + Math.sin(t * 3) * 0.1;
      ringRef.current.scale.set(s, s, 1);
    }
  });

  return (
    <group position={[agent.position.x, 0, agent.position.z]}>
      <group ref={groupRef} onClick={() => onSelect(agent)}>
        {/* Shadow */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, 0]}>
          <circleGeometry args={[0.25, 20]} />
          <meshStandardMaterial color="#000" transparent opacity={0.12} />
        </mesh>

        {/* Performance aura */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, 0]}>
          <ringGeometry args={[0.28, 0.36, 28]} />
          <meshStandardMaterial color={perfColor} emissive={perfColor} emissiveIntensity={0.6} transparent opacity={0.35} />
        </mesh>

        {/* Proximity ring */}
        {isNearby && (
          <mesh ref={ringRef} rotation-x={-Math.PI / 2} position={[0, 0.008, 0]}>
            <ringGeometry args={[0.38, 0.44, 28]} />
            <meshStandardMaterial color="#c9a96e" emissive="#c9a96e" emissiveIntensity={0.5} transparent opacity={0.3} />
          </mesh>
        )}

        {/* Body */}
        {/* Shoes */}
        <mesh position={[-0.05, 0.025, 0.03]} castShadow>
          <boxGeometry args={[0.045, 0.035, 0.08]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
        </mesh>
        <mesh position={[0.05, 0.025, 0.03]} castShadow>
          <boxGeometry args={[0.045, 0.035, 0.08]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
        </mesh>
        {/* Legs */}
        <mesh position={[-0.05, 0.17, 0]} castShadow>
          <capsuleGeometry args={[0.035, 0.18, 4, 8]} />
          <meshStandardMaterial color={agent.pants} roughness={0.7} />
        </mesh>
        <mesh position={[0.05, 0.17, 0]} castShadow>
          <capsuleGeometry args={[0.035, 0.18, 4, 8]} />
          <meshStandardMaterial color={agent.pants} roughness={0.7} />
        </mesh>
        {/* Torso */}
        <mesh position={[0, 0.44, 0]} castShadow>
          <capsuleGeometry args={[0.085, 0.16, 6, 10]} />
          <meshStandardMaterial color={agent.shirt} roughness={0.5} metalness={0.08} />
        </mesh>
        {/* Arms */}
        <mesh position={[-0.13, 0.42, 0]} castShadow>
          <capsuleGeometry args={[0.028, 0.16, 4, 6]} />
          <meshStandardMaterial color={agent.shirt} roughness={0.5} />
        </mesh>
        <mesh position={[0.13, 0.42, 0]} castShadow>
          <capsuleGeometry args={[0.028, 0.16, 4, 6]} />
          <meshStandardMaterial color={agent.shirt} roughness={0.5} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 0.67, 0]} castShadow>
          <sphereGeometry args={[0.08, 14, 10]} />
          <meshStandardMaterial color={agent.skin} roughness={0.55} />
        </mesh>
        {/* Hair */}
        {agent.hairStyle === 'short' && (
          <mesh position={[0, 0.73, -0.01]} castShadow>
            <sphereGeometry args={[0.075, 10, 8]} />
            <meshStandardMaterial color={agent.hair} roughness={0.85} />
          </mesh>
        )}
        {agent.hairStyle === 'long' && (
          <>
            <mesh position={[0, 0.73, -0.01]} castShadow>
              <sphereGeometry args={[0.082, 10, 8]} />
              <meshStandardMaterial color={agent.hair} roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.66, -0.05]} castShadow>
              <capsuleGeometry args={[0.055, 0.1, 4, 6]} />
              <meshStandardMaterial color={agent.hair} roughness={0.85} />
            </mesh>
          </>
        )}
        {agent.hairStyle === 'bun' && (
          <>
            <mesh position={[0, 0.73, -0.01]} castShadow>
              <sphereGeometry args={[0.075, 10, 8]} />
              <meshStandardMaterial color={agent.hair} roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.78, -0.03]} castShadow>
              <sphereGeometry args={[0.035, 6, 4]} />
              <meshStandardMaterial color={agent.hair} roughness={0.85} />
            </mesh>
          </>
        )}
        {agent.hairStyle === 'buzz' && (
          <mesh position={[0, 0.72, -0.005]} castShadow>
            <sphereGeometry args={[0.078, 10, 8]} />
            <meshStandardMaterial color={agent.hair} roughness={0.9} />
          </mesh>
        )}
        {/* Eyes */}
        <mesh position={[-0.025, 0.68, 0.07]}>
          <sphereGeometry args={[0.01, 6, 4]} />
          <meshStandardMaterial color="#fff" roughness={0.2} />
        </mesh>
        <mesh position={[0.025, 0.68, 0.07]}>
          <sphereGeometry args={[0.01, 6, 4]} />
          <meshStandardMaterial color="#fff" roughness={0.2} />
        </mesh>
        <mesh position={[-0.025, 0.68, 0.079]}>
          <sphereGeometry args={[0.005, 4, 3]} />
          <meshStandardMaterial color="#1a1a2e" roughness={0.1} />
        </mesh>
        <mesh position={[0.025, 0.68, 0.079]}>
          <sphereGeometry args={[0.005, 4, 3]} />
          <meshStandardMaterial color="#1a1a2e" roughness={0.1} />
        </mesh>
      </group>

      {/* Labels */}
      <Html position={[0, 0.95, 0]} center distanceFactor={5} style={{ pointerEvents: 'none' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap' }}>
          <span style={{
            fontSize: '9px', fontWeight: 700, color: '#3a3530',
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)',
            padding: '2px 8px', borderRadius: '8px',
            border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
          }}>
            {agent.name}
          </span>
          <span style={{
            fontSize: '7px', fontWeight: 600, color: perfColor,
            background: 'rgba(255,255,255,0.9)', padding: '1px 6px', borderRadius: '6px',
          }}>
            ● {agent.funnelStage}
          </span>
          {agent.dealValue > 0 && (
            <span style={{
              fontSize: '7px', fontWeight: 700, color: '#10b981',
              background: 'rgba(16,185,129,0.1)', padding: '1px 5px', borderRadius: '4px',
            }}>
              {fmt(agent.dealValue)}
            </span>
          )}
        </div>
      </Html>

      {/* Greeting bubble */}
      {greetingMessage && (
        <Html position={[0, 1.2, 0]} center distanceFactor={4} style={{ pointerEvents: 'none' }}>
          <div style={{
            maxWidth: '220px', minWidth: '120px',
            background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)',
            borderRadius: '14px', padding: '10px 14px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
            border: '1px solid rgba(201,169,110,0.2)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            animation: 'greetPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}>
            <div style={{ fontSize: '10px', lineHeight: '1.5', color: '#2a2a2a', wordBreak: 'break-word' }}>
              {greetingMessage}
            </div>
            <div style={{
              position: 'absolute', bottom: '-8px', left: '50%', transform: 'translateX(-50%)',
              width: 0, height: 0,
              borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
              borderTop: '8px solid rgba(255,255,255,0.97)',
            }} />
          </div>
          <style>{`
            @keyframes greetPop {
              0% { opacity: 0; transform: scale(0.6) translateY(10px); }
              100% { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
        </Html>
      )}

      {/* Interaction prompt */}
      {isNearby && !greetingMessage && (
        <Html position={[0, 1.2, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{
            fontSize: '9px', fontWeight: 600, color: '#fff',
            background: 'rgba(20,18,15,0.88)', backdropFilter: 'blur(4px)',
            padding: '3px 10px', borderRadius: '8px', whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}>
            Clique para ver detalhes
          </div>
        </Html>
      )}
    </group>
  );
}

/* ────────────────────────── Floating KPI Panel ──── */
function FloatingKPI({ position, title, value, subtitle, color }: {
  position: [number, number, number];
  title: string;
  value: string;
  subtitle?: string;
  color: string;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 0.8 + position[0]) * 0.03;
    }
  });

  return (
    <group ref={ref} position={position}>
      <Html center distanceFactor={6} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(10,20,32,0.92)',
          backdropFilter: 'blur(12px)',
          borderRadius: '10px',
          padding: '8px 16px',
          border: `1px solid ${color}40`,
          boxShadow: `0 4px 20px ${color}20`,
          minWidth: '100px',
          textAlign: 'center',
          fontFamily: 'Space Grotesk, sans-serif',
        }}>
          <div style={{ fontSize: '8px', color: `${color}cc`, letterSpacing: '1.5px', fontWeight: 600, marginBottom: '3px' }}>
            {title}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
            {value}
          </div>
          {subtitle && (
            <div style={{ fontSize: '8px', color: '#9ca3af', marginTop: '2px' }}>
              {subtitle}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

/* ────────────────────────── Wall KPI Screen ─────── */
function WallKPIScreen({ position, rotationY }: { position: [number, number, number]; rotationY: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Screen bezel */}
      <mesh castShadow>
        <boxGeometry args={[2.2, 1.3, 0.04]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.12} metalness={0.7} />
      </mesh>
      {/* Screen surface */}
      <mesh position={[0, 0, 0.022]}>
        <planeGeometry args={[2.0, 1.1]} />
        <meshStandardMaterial color="#0a1420" emissive="#1a3050" emissiveIntensity={0.25} roughness={0.1} />
      </mesh>
      {/* Content */}
      <Html position={[0, 0, 0.03]} center transform scale={0.2} style={{ pointerEvents: 'none' }}>
        <div style={{
          width: '440px', height: '260px', background: 'linear-gradient(135deg, #0a1420, #0f2030)',
          borderRadius: '4px', padding: '16px', fontFamily: 'Space Grotesk, sans-serif',
          display: 'flex', flexDirection: 'column', gap: '8px',
        }}>
          <div style={{ fontSize: '11px', color: '#c9a96e', letterSpacing: '3px', fontWeight: 700 }}>
            📊 PAINEL COMERCIAL
          </div>
          {/* Mini funnel bars */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '80px', marginTop: '4px' }}>
            {[
              { label: 'Leads', value: 85, color: '#3b82f6' },
              { label: 'Qualif.', value: 42, color: '#f59e0b' },
              { label: 'Negoc.', value: 18, color: '#ef4444' },
              { label: 'Fechados', value: 8, color: '#10b981' },
            ].map((bar, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <div style={{
                  width: '100%', height: `${bar.value}px`, background: `linear-gradient(to top, ${bar.color}, ${bar.color}80)`,
                  borderRadius: '3px 3px 0 0', minHeight: '8px',
                }} />
                <span style={{ fontSize: '8px', color: '#9ca3af' }}>{bar.label}</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>{bar.value}</span>
              </div>
            ))}
          </div>
          {/* Bottom stats */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#10b981' }}>R$525k</div>
              <div style={{ fontSize: '8px', color: '#6b7280' }}>Faturamento</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#f59e0b' }}>23%</div>
              <div style={{ fontSize: '8px', color: '#6b7280' }}>Conversão</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#3b82f6' }}>4.2d</div>
              <div style={{ fontSize: '8px', color: '#6b7280' }}>Ciclo Médio</div>
            </div>
          </div>
        </div>
      </Html>
      <pointLight position={[0, 0, 0.3]} intensity={0.15} color="#3050a0" distance={2} decay={2} />
    </group>
  );
}

/* ────────────────────────── Glass Divider Wall ──── */
function GlassDivider() {
  return (
    <group position={[0, 0, 6.2]}>
      {/* Glass panel */}
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[16, 2.2, 0.06]} />
        <meshPhysicalMaterial
          color="#e0e8f0"
          transparent
          opacity={0.15}
          roughness={0.05}
          metalness={0.1}
          transmission={0.6}
          thickness={0.5}
        />
      </mesh>
      {/* Metal frame top */}
      <mesh position={[0, 2.2, 0]}>
        <boxGeometry args={[16.1, 0.04, 0.08]} />
        <meshStandardMaterial color="#8a8580" roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Metal frame bottom */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[16.1, 0.04, 0.08]} />
        <meshStandardMaterial color="#8a8580" roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Vertical mullions */}
      {[-6, -2, 2, 6].map((x, i) => (
        <mesh key={i} position={[x, 1.1, 0]}>
          <boxGeometry args={[0.04, 2.2, 0.08]} />
          <meshStandardMaterial color="#8a8580" roughness={0.3} metalness={0.6} />
        </mesh>
      ))}
      {/* Sign */}
      <Html position={[0, 2.0, 0.05]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div style={{
          fontSize: '13px', fontWeight: 800, color: '#c9a96e',
          background: 'rgba(10,20,32,0.9)', backdropFilter: 'blur(8px)',
          padding: '5px 20px', borderRadius: '8px', whiteSpace: 'nowrap',
          letterSpacing: '3px', fontFamily: 'Space Grotesk, sans-serif',
          boxShadow: '0 4px 20px rgba(201,169,110,0.2)',
          border: '1px solid rgba(201,169,110,0.3)',
        }}>
          🔥 SETOR COMERCIAL
        </div>
      </Html>
    </group>
  );
}

/* ────────────────────────── Celebration Effect ──── */
function CelebrationGlow({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.getElapsedTime();
      ref.current.intensity = 0.3 + Math.sin(t * 4) * 0.2;
    }
  });
  return <pointLight ref={ref} position={position} color="#10b981" distance={3} decay={2} />;
}

/* ─────────────────── Agent Detail Panel (overlay) ─ */
function AgentDetailPanel({ agent, onClose }: { agent: CommercialAgent; onClose: () => void }) {
  const perfColor = PERF_COLORS[agent.performance];
  return (
    <div
      style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 100, width: '320px',
        background: 'rgba(10,20,32,0.96)', backdropFilter: 'blur(20px)',
        borderRadius: '16px', padding: '20px',
        border: `1px solid ${perfColor}40`,
        boxShadow: `0 8px 40px rgba(0,0,0,0.5), 0 0 20px ${perfColor}15`,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: '#fff',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700 }}>{agent.name}</div>
          <div style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '1px' }}>{agent.zone.toUpperCase()}</div>
        </div>
        <div style={{
          width: '12px', height: '12px', borderRadius: '50%',
          background: perfColor, boxShadow: `0 0 8px ${perfColor}80`,
        }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px' }}>
          <div style={{ fontSize: '8px', color: '#6b7280', letterSpacing: '1px' }}>ETAPA</div>
          <div style={{ fontSize: '12px', fontWeight: 600 }}>{agent.funnelStage}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px' }}>
          <div style={{ fontSize: '8px', color: '#6b7280', letterSpacing: '1px' }}>LEADS ATIVOS</div>
          <div style={{ fontSize: '12px', fontWeight: 600 }}>{agent.activeLeads}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px' }}>
          <div style={{ fontSize: '8px', color: '#6b7280', letterSpacing: '1px' }}>EM NEGOCIAÇÃO</div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#10b981' }}>{fmt(agent.dealValue)}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px' }}>
          <div style={{ fontSize: '8px', color: '#6b7280', letterSpacing: '1px' }}>PERFORMANCE</div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: perfColor }}>
            {agent.performance === 'high' ? '🔥 Alta' : agent.performance === 'medium' ? '⚡ Média' : '⚠️ Baixa'}
          </div>
        </div>
      </div>

      <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '12px' }}>
        📌 {agent.lastActivity}
      </div>

      <button
        onClick={onClose}
        style={{
          width: '100%', padding: '8px', borderRadius: '8px',
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
          color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
        }}
      >
        Fechar
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   MAIN COMMERCIAL SECTOR COMPONENT
   ════════════════════════════════════════════════════ */
interface CommercialSectorProps {
  playerPos: { x: number; z: number };
}

export default function CommercialSector({ playerPos }: CommercialSectorProps) {
  const [selectedAgent, setSelectedAgent] = useState<CommercialAgent | null>(null);
  const [greetings, setGreetings] = useState<Record<string, { message: string; expiresAt: number }>>({});
  const greetingsRef = useRef<Record<string, { message: string; expiresAt: number }>>({});

  // ── Handoff queue ────────────────────────────────
  const [handoffs, setHandoffs] = useState<HandoffEvent[]>([]);
  const handoffsRef = useRef<HandoffEvent[]>([]);
  const lastHandoffSpawn = useRef(0);
  const MAX_CONCURRENT = 2;
  const SPAWN_INTERVAL = 12_000; // ms between new handoffs

  const handleHandoffDone = useCallback((id: string) => {
    handoffsRef.current = handoffsRef.current.filter(h => h.id !== id);
    setHandoffs([...handoffsRef.current]);
  }, []);

  const handleHandoffUpdate = useCallback((updated: HandoffEvent) => {
    handoffsRef.current = handoffsRef.current.map(h => h.id === updated.id ? updated : h);
    // Only sync state on phase changes to avoid excessive re-renders
    const old = handoffsRef.current.find(h => h.id === updated.id);
    if (old && old.phase !== updated.phase) {
      setHandoffs([...handoffsRef.current]);
    }
  }, []);

  const handleSelect = useCallback((agent: CommercialAgent) => {
    setSelectedAgent(agent);
  }, []);

  // Check commercial agent proximity greetings + spawn handoffs
  const lastCheckRef = useRef(0);
  useFrame(() => {
    const now = Date.now();
    if (now - lastCheckRef.current < 200) return;
    lastCheckRef.current = now;

    let changed = false;
    for (const agent of COMMERCIAL_AGENTS) {
      const event = checkProximityGreeting(
        `comm_${agent.id}`, agent.position.x, agent.position.z,
        playerPos.x, playerPos.z
      );
      if (event) {
        const msg = pickCommercialGreeting(agent.zone, agent.performance);
        greetingsRef.current[agent.id] = { message: msg, expiresAt: now + 4500 };
        changed = true;
      }
    }
    // Clean expired greetings
    for (const [id, g] of Object.entries(greetingsRef.current)) {
      if (now > g.expiresAt) {
        delete greetingsRef.current[id];
        changed = true;
      }
    }
    if (changed) setGreetings({ ...greetingsRef.current });

    // ── Spawn handoffs periodically ──
    if (
      handoffsRef.current.length < MAX_CONCURRENT &&
      now - lastHandoffSpawn.current > SPAWN_INTERVAL
    ) {
      const newHandoff = generateRandomHandoff();
      if (newHandoff) {
        // Avoid duplicate from/to currently in motion
        const activeIds = new Set(handoffsRef.current.flatMap(h => [h.fromId, h.toId]));
        if (!activeIds.has(newHandoff.fromId) && !activeIds.has(newHandoff.toId)) {
          handoffsRef.current.push(newHandoff);
          setHandoffs([...handoffsRef.current]);
          lastHandoffSpawn.current = now;
        }
      }
    }
  });

  return (
    <>
      {/* Glass divider separating general from commercial */}
      <GlassDivider />

      {/* Zone floors & signs */}
      {COMMERCIAL_ZONES.map(zone => (
        <group key={zone.key}>
          <ZoneFloor center={{ x: zone.center.x, z: zone.center.z }} size={zone.size} color={zone.color} />
          <ZoneSign
            label={zone.label}
            emoji={zone.emoji}
            color={zone.color}
            position={[zone.center.x, 2.0, zone.center.z - zone.size.h / 2 + 0.2]}
          />
          {/* Zone ambient light */}
          <pointLight
            position={[zone.center.x, 2.2, zone.center.z]}
            intensity={zone.lightIntensity}
            color={zone.lightColor}
            distance={zone.size.w * 1.2}
            decay={2}
          />
        </group>
      ))}

      {/* Commercial desks & chairs */}
      {COMMERCIAL_DESKS.map((d, i) => (
        <group key={`cd-${i}`}>
          <CommDesk pos={d.pos} size={d.size} zone={d.zone} />
          <CommChair x={d.pos.x} z={d.pos.z + d.size.z / 2 + 0.35} />
        </group>
      ))}

      {/* Commercial agents */}
      {COMMERCIAL_AGENTS.map(agent => (
        <CommNPC
          key={agent.id}
          agent={agent}
          playerPos={playerPos}
          onSelect={handleSelect}
          greetingMessage={greetings[agent.id]?.message}
        />
      ))}

      {/* ═══ HANDOFF AGENTS ═══ */}
      {handoffs.filter(h => h.phase !== 'done').map(h => (
        <HandoffAgent key={h.id} event={h} onDone={handleHandoffDone} onUpdate={handleHandoffUpdate} />
      ))}

      {/* Floating KPIs for Head Comercial zone */}
      <FloatingKPI position={[-2.5, 1.8, 17]} title="LEADS ATIVOS" value="85" subtitle="esta semana" color="#3b82f6" />
      <FloatingKPI position={[2.5, 1.8, 17]} title="CONVERSÃO" value="23%" subtitle="vs 19% anterior" color="#10b981" />
      <FloatingKPI position={[0, 2.3, 16]} title="FATURAMENTO" value="R$525k" subtitle="mês atual" color="#c9a96e" />

      {/* Wall KPI screen */}
      <WallKPIScreen position={[0, 1.3, 19.3]} rotationY={Math.PI} />

      {/* Celebration effects in closing zone */}
      <CelebrationGlow position={[4, 1.5, 12.5]} />
      <CelebrationGlow position={[6.2, 1.5, 13.5]} />

      {/* Some plants for the commercial area */}
      {[
        { x: -8.2, z: 8 }, { x: 7.5, z: 8 }, { x: -8.2, z: 13 },
        { x: 7.5, z: 13 }, { x: -2, z: 17 }, { x: 2, z: 17 },
      ].map((p, i) => (
        <group key={`cp-${i}`} position={[p.x, 0, p.z]}>
          <mesh position={[0, 0.13, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.06, 0.24, 8]} />
            <meshStandardMaterial color="#8b7355" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.38, 0]} castShadow>
            <sphereGeometry args={[0.2, 10, 6]} />
            <meshStandardMaterial color="#4a8a5a" roughness={0.85} />
          </mesh>
          <mesh position={[-0.06, 0.42, 0.04]} castShadow>
            <sphereGeometry args={[0.14, 8, 5]} />
            <meshStandardMaterial color="#3a7a48" roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* Agent detail overlay (HTML) */}
      {selectedAgent && (
        <Html fullscreen style={{ pointerEvents: 'auto' }}>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99 }}
            onClick={() => setSelectedAgent(null)}
          />
          <AgentDetailPanel agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
        </Html>
      )}
    </>
  );
}
