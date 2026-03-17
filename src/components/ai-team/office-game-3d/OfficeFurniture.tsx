import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { DESKS, RECEPTION, SOFAS, PLANTS, WHITEBOARD, WALLS, FLOOR_SIZE, CONFERENCE_TABLE } from './mapData3d';
import { Html } from '@react-three/drei';
import logoNatleva from '@/assets/logo-natleva-wall.png';

/* ── Desk ──────────────────────────────────────── */
function Desk({ pos, size, label }: { pos: { x: number; y: number; z: number }; size: { x: number; y: number; z: number }; label?: string }) {
  const legH = pos.y - 0.02;
  const legR = 0.025;
  const legOffX = size.x / 2 - 0.08;
  const legOffZ = size.z / 2 - 0.06;

  return (
    <group position={[pos.x, 0, pos.z]}>
      <mesh position={[0, pos.y, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, size.y, size.z]} />
        <meshStandardMaterial color="#6d5d48" roughness={0.55} metalness={0.08} envMapIntensity={0.3} />
      </mesh>
      <mesh position={[0, pos.y + size.y / 2 + 0.001, 0]}>
        <boxGeometry args={[size.x + 0.01, 0.005, size.z + 0.01]} />
        <meshStandardMaterial color="#5a4a38" roughness={0.4} metalness={0.15} />
      </mesh>
      {[[-legOffX, -legOffZ], [legOffX, -legOffZ], [-legOffX, legOffZ], [legOffX, legOffZ]].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, legH / 2, lz]}>
          <cylinderGeometry args={[legR, legR, legH, 8]} />
          <meshStandardMaterial color="#4a4a4a" roughness={0.4} metalness={0.4} />
        </mesh>
      ))}
      {/* Monitor */}
      <group position={[0, pos.y + 0.2, -size.z / 2 + 0.15]}>
        <mesh castShadow>
          <boxGeometry args={[0.34, 0.24, 0.015]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.15} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.009]}>
          <planeGeometry args={[0.3, 0.19]} />
          <meshStandardMaterial color="#0a0a1a" emissive="#3050aa" emissiveIntensity={0.5} roughness={0.1} metalness={0.1} />
        </mesh>
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.012, 0.025, 0.06, 8]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.3} metalness={0.5} />
        </mesh>
        <mesh position={[0, -0.18, 0.02]} rotation-x={-0.1}>
          <boxGeometry args={[0.1, 0.005, 0.06]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.3} metalness={0.5} />
        </mesh>
      </group>
      {/* Keyboard */}
      <mesh position={[0, pos.y + 0.03, size.z / 2 - 0.18]} castShadow>
        <boxGeometry args={[0.22, 0.012, 0.08]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Mouse */}
      <mesh position={[0.18, pos.y + 0.025, size.z / 2 - 0.18]} castShadow>
        <boxGeometry args={[0.04, 0.015, 0.06]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.5} metalness={0.2} />
      </mesh>
      {/* Coffee mug */}
      <mesh position={[-0.5, pos.y + 0.06, 0.1]} castShadow>
        <cylinderGeometry args={[0.025, 0.022, 0.06, 8]} />
        <meshStandardMaterial color="#f0e8d8" roughness={0.7} />
      </mesh>
    </group>
  );
}

/* ── Chair ─────────────────────────────────────── */
function Chair({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.04, 16]} />
        <meshStandardMaterial color="#404040" roughness={0.6} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.48, -0.12]} castShadow>
        <boxGeometry args={[0.28, 0.3, 0.03]} />
        <meshStandardMaterial color="#383838" roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.3, 8]} />
        <meshStandardMaterial color="#505050" roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.015, 10]} />
        <meshStandardMaterial color="#404040" roughness={0.4} metalness={0.4} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.12, 0.01, Math.sin(a) * 0.12]}>
            <sphereGeometry args={[0.015, 6, 4]} />
            <meshStandardMaterial color="#333" roughness={0.4} metalness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}

/* ── Plant ─────────────────────────────────────── */
function Plant({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.13, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.07, 0.26, 10]} />
        <meshStandardMaterial color="#8b7355" roughness={0.8} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.26, 0]}>
        <torusGeometry args={[0.1, 0.012, 8, 16]} />
        <meshStandardMaterial color="#7a6348" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.25, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.09, 12]} />
        <meshStandardMaterial color="#4a3520" roughness={1} />
      </mesh>
      <mesh position={[0, 0.42, 0]} castShadow>
        <sphereGeometry args={[0.22, 12, 8]} />
        <meshStandardMaterial color="#4a8a5a" roughness={0.85} />
      </mesh>
      <mesh position={[-0.08, 0.46, 0.06]} castShadow>
        <sphereGeometry args={[0.16, 10, 6]} />
        <meshStandardMaterial color="#3a7a48" roughness={0.85} />
      </mesh>
      <mesh position={[0.06, 0.5, -0.05]} castShadow>
        <sphereGeometry args={[0.13, 10, 6]} />
        <meshStandardMaterial color="#5a9a6a" roughness={0.85} />
      </mesh>
    </group>
  );
}

/* ── Sofa ──────────────────────────────────────── */
function Sofa({ pos, size }: { pos: { x: number; y: number; z: number }; size: { x: number; y: number; z: number } }) {
  return (
    <group position={[pos.x, 0, pos.z]}>
      <mesh position={[0, pos.y / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, size.y, size.z]} />
        <meshStandardMaterial color="#6a5b48" roughness={0.8} metalness={0.05} />
      </mesh>
      <mesh position={[0, pos.y + 0.04, 0]} castShadow>
        <boxGeometry args={[size.x - 0.06, 0.1, size.z - 0.06]} />
        <meshStandardMaterial color="#7a6b58" roughness={0.85} />
      </mesh>
      {size.x > size.z ? (
        <mesh position={[0, pos.y + 0.2, -size.z / 2 + 0.06]} castShadow>
          <boxGeometry args={[size.x - 0.04, 0.28, 0.1]} />
          <meshStandardMaterial color="#5a4b38" roughness={0.8} />
        </mesh>
      ) : (
        <mesh position={[-size.x / 2 + 0.06, pos.y + 0.2, 0]} castShadow>
          <boxGeometry args={[0.1, 0.28, size.z - 0.04]} />
          <meshStandardMaterial color="#5a4b38" roughness={0.8} />
        </mesh>
      )}
    </group>
  );
}

/* ── Reception ─────────────────────────────────── */
function ReceptionDesk() {
  const { pos, size } = RECEPTION;
  return (
    <group position={[pos.x, 0, pos.z]}>
      <mesh position={[0, pos.y / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, size.y, size.z]} />
        <meshStandardMaterial color="#2e2518" roughness={0.5} metalness={0.1} envMapIntensity={0.3} />
      </mesh>
      <mesh position={[0, pos.y - 0.04, size.z / 2 + 0.001]}>
        <planeGeometry args={[size.x - 0.2, 0.05]} />
        <meshStandardMaterial color="#c9a96e" roughness={0.4} metalness={0.2} emissive="#c9a96e" emissiveIntensity={0.05} />
      </mesh>
      <mesh position={[0.4, pos.y + 0.17, 0]} castShadow>
        <boxGeometry args={[0.3, 0.22, 0.015]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.15} metalness={0.5} />
      </mesh>
      <mesh position={[0.4, pos.y + 0.17, 0.009]}>
        <planeGeometry args={[0.26, 0.17]} />
        <meshStandardMaterial color="#0a0a1a" emissive="#2a4a8a" emissiveIntensity={0.4} roughness={0.1} />
      </mesh>
    </group>
  );
}

/* ── Whiteboard ────────────────────────────────── */
function Whiteboard() {
  const { x, z, w, h } = WHITEBOARD;
  return (
    <group position={[x, 1.1, z]}>
      <mesh castShadow>
        <boxGeometry args={[w + 0.08, h + 0.08, 0.04]} />
        <meshStandardMaterial color="#c0c0c0" roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0, 0.021]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color="#f8f8f8" roughness={0.3} metalness={0.02} />
      </mesh>
      <mesh position={[0, -h / 2 - 0.04, 0.03]}>
        <boxGeometry args={[w * 0.6, 0.03, 0.04]} />
        <meshStandardMaterial color="#b0b0b0" roughness={0.4} metalness={0.3} />
      </mesh>
    </group>
  );
}

/* ── Conference Table ─────────────────────────── */
function ConferenceTable() {
  const { pos, size } = CONFERENCE_TABLE;
  return (
    <group position={[pos.x, 0, pos.z]}>
      <mesh position={[0, pos.y, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, size.y, size.z]} />
        <meshStandardMaterial color="#5a4a38" roughness={0.5} metalness={0.1} envMapIntensity={0.3} />
      </mesh>
      {[[-0.8, -0.35], [0.8, -0.35], [-0.8, 0.35], [0.8, 0.35]].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, pos.y / 2, lz]}>
          <cylinderGeometry args={[0.03, 0.03, pos.y, 8]} />
          <meshStandardMaterial color="#404040" roughness={0.3} metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/* ── Walls ─────────────────────────────────────── */
function WallSet() {
  const { w, h } = FLOOR_SIZE;
  const { thickness: t, height: ht } = WALLS;
  const wallColor = '#d0c8be';

  return (
    <group>
      <mesh position={[0, ht / 2, -h / 2]} receiveShadow>
        <boxGeometry args={[w, ht, t]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} envMapIntensity={0.1} />
      </mesh>
      <mesh position={[0, ht / 2, h / 2]} receiveShadow>
        <boxGeometry args={[w, ht, t]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} envMapIntensity={0.1} />
      </mesh>
      <mesh position={[-w / 2, ht / 2, 0]} receiveShadow>
        <boxGeometry args={[t, ht, h]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} envMapIntensity={0.1} />
      </mesh>
      <mesh position={[w / 2, ht / 2, 0]} receiveShadow>
        <boxGeometry args={[t, ht, h]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} envMapIntensity={0.1} />
      </mesh>
      {/* Baseboards */}
      {[
        [0, -h / 2 + t / 2, w, 0.06],
        [0, h / 2 - t / 2, w, 0.06],
      ].map(([x, z, bw, bh], i) => (
        <mesh key={`bb-${i}`} position={[x, bh / 2, z]}>
          <boxGeometry args={[bw as number, bh as number, t + 0.02]} />
          <meshStandardMaterial color="#b8b0a5" roughness={0.6} metalness={0.05} />
        </mesh>
      ))}
    </group>
  );
}

/* ── Ceiling light fixtures ────────────────────── */
function CeilingLights() {
  const positions = [[-3, 0], [3, 0], [-3, -3], [3, -3], [0, 2], [-6, 0], [6, 0], [0, -3]];
  return (
    <group>
      {positions.map(([x, z], i) => (
        <group key={i} position={[x, WALLS.height - 0.05, z]}>
          <mesh>
            <cylinderGeometry args={[0.25, 0.25, 0.03, 16]} />
            <meshStandardMaterial color="#e0d8cc" roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.02, 0]} rotation-x={Math.PI}>
            <circleGeometry args={[0.2, 16]} />
            <meshStandardMaterial color="#fff8e8" emissive="#fff0d0" emissiveIntensity={0.6} transparent opacity={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ── NatLeva Wall Branding + TVs + Travel Agency ─ */
function NatLevaBranding() {
  const tvContent = [
    { img: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800&h=500&fit=crop&q=80', label: 'Maldivas · Águas Cristalinas' },
    { img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=500&fit=crop&q=80', label: 'Paris · Cidade Luz' },
    { img: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&h=500&fit=crop&q=80', label: 'Veneza · Romance Italiano' },
    { img: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&h=500&fit=crop&q=80', label: 'Suíça · Alpes Majestosos' },
    { img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=500&fit=crop&q=80', label: 'Caribe · Paraíso Tropical' },
    { img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&h=500&fit=crop&q=80', label: 'Japão · Tradição e Futuro' },
  ];

  return (
    <group>
      {/* ═══ NORTH WALL — Giant NatLeva Logo + 2 TVs ═══ */}

      {/* BIG LOGO — center of north wall */}
      <group position={[0, 1.3, -FLOOR_SIZE.h / 2 + 0.08]}>
        <mesh>
          <boxGeometry args={[5.0, 1.6, 0.03]} />
          <meshStandardMaterial color="#0a1420" roughness={0.2} metalness={0.25} />
        </mesh>
        <Html position={[0, 0.1, 0.02]} center distanceFactor={3.5} style={{ pointerEvents: 'none' }}>
          <img
            src={logoNatleva}
            alt="NatLeva"
            style={{ width: '360px', filter: 'drop-shadow(0 0 30px rgba(201,169,110,0.6))' }}
          />
        </Html>
        {/* Gold lines */}
        <mesh position={[0, -0.65, 0.016]}>
          <boxGeometry args={[4.4, 0.008, 0.001]} />
          <meshStandardMaterial color="#c9a96e" emissive="#c9a96e" emissiveIntensity={0.5} metalness={0.6} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.68, 0.016]}>
          <boxGeometry args={[4.4, 0.008, 0.001]} />
          <meshStandardMaterial color="#c9a96e" emissive="#c9a96e" emissiveIntensity={0.5} metalness={0.6} roughness={0.2} />
        </mesh>
        <Html position={[0, -0.55, 0.02]} center distanceFactor={4} style={{ pointerEvents: 'none' }}>
          <div style={{
            fontSize: '11px', fontWeight: 500, letterSpacing: '6px',
            color: '#c9a96e', fontFamily: 'Space Grotesk, sans-serif',
            whiteSpace: 'nowrap', textTransform: 'uppercase', opacity: 0.9,
          }}>
            Viagens Exclusivas · Experiências Únicas
          </div>
        </Html>
      </group>

      {/* TV 1 — left of north wall */}
      <WallTV position={[-6.5, 1.2, -FLOOR_SIZE.h / 2 + 0.09]} rotation={[0, 0, 0]} content={tvContent[0]} />

      {/* TV 2 — right of north wall */}
      <WallTV position={[6.5, 1.2, -FLOOR_SIZE.h / 2 + 0.09]} rotation={[0, 0, 0]} content={tvContent[1]} />

      {/* ═══ SOUTH WALL — Logo mirror + 2 TVs ═══ */}

      {/* Logo on south wall */}
      <group position={[0, 1.3, FLOOR_SIZE.h / 2 - 0.08]}>
        <mesh rotation-y={Math.PI}>
          <boxGeometry args={[3.5, 1.2, 0.03]} />
          <meshStandardMaterial color="#0a1420" roughness={0.2} metalness={0.25} />
        </mesh>
        <Html position={[0, 0.05, -0.02]} center distanceFactor={4} style={{ pointerEvents: 'none', transform: 'scaleX(-1)' }}>
          <img
            src={logoNatleva}
            alt="NatLeva"
            style={{ width: '240px', filter: 'drop-shadow(0 0 20px rgba(201,169,110,0.5))', transform: 'scaleX(-1)' }}
          />
        </Html>
        <mesh position={[0, -0.5, -0.016]} rotation-y={Math.PI}>
          <boxGeometry args={[3.0, 0.006, 0.001]} />
          <meshStandardMaterial color="#c9a96e" emissive="#c9a96e" emissiveIntensity={0.4} metalness={0.5} roughness={0.3} />
        </mesh>
      </group>

      {/* TV 3 — left of south wall */}
      <WallTV position={[-6, 1.2, FLOOR_SIZE.h / 2 - 0.09]} rotation={[0, Math.PI, 0]} content={tvContent[2]} />

      {/* TV 4 — right of south wall */}
      <WallTV position={[6, 1.2, FLOOR_SIZE.h / 2 - 0.09]} rotation={[0, Math.PI, 0]} content={tvContent[3]} />

      {/* ═══ EAST WALL — Logo + TV ═══ */}
      <group position={[FLOOR_SIZE.w / 2 - 0.08, 1.3, 0]}>
        <mesh rotation-y={-Math.PI / 2}>
          <boxGeometry args={[3.0, 1.0, 0.03]} />
          <meshStandardMaterial color="#0a1420" roughness={0.2} metalness={0.25} />
        </mesh>
        <Html position={[0, 0.05, 0]} center distanceFactor={4.5} style={{ pointerEvents: 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <img src={logoNatleva} alt="NatLeva" style={{ width: '140px', filter: 'drop-shadow(0 0 12px rgba(201,169,110,0.4))' }} />
            <div style={{
              fontSize: '8px', fontWeight: 600, letterSpacing: '3px',
              color: '#c9a96e', fontFamily: 'Space Grotesk, sans-serif',
            }}>
              ✈ AI TEAM · CENTRO DE OPERAÇÕES
            </div>
          </div>
        </Html>
      </group>

      {/* TV on east wall */}
      <WallTV position={[FLOOR_SIZE.w / 2 - 0.09, 1.2, -3.5]} rotation={[0, -Math.PI / 2, 0]} content={tvContent[4]} />

      {/* ═══ WEST WALL — Logo + TV ═══ */}
      <group position={[-FLOOR_SIZE.w / 2 + 0.08, 1.3, 0]}>
        <mesh rotation-y={Math.PI / 2}>
          <boxGeometry args={[3.0, 1.0, 0.03]} />
          <meshStandardMaterial color="#0a1420" roughness={0.2} metalness={0.25} />
        </mesh>
        <Html position={[0, 0.05, 0]} center distanceFactor={4.5} style={{ pointerEvents: 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <img src={logoNatleva} alt="NatLeva" style={{ width: '140px', filter: 'drop-shadow(0 0 12px rgba(201,169,110,0.4))' }} />
            <div style={{
              fontSize: '8px', fontWeight: 600, letterSpacing: '3px',
              color: '#c9a96e', fontFamily: 'Space Grotesk, sans-serif',
            }}>
              VIAGENS PREMIUM
            </div>
          </div>
        </Html>
      </group>

      {/* TV on west wall */}
      <WallTV position={[-FLOOR_SIZE.w / 2 + 0.09, 1.2, -3.5]} rotation={[0, Math.PI / 2, 0]} content={tvContent[5]} />

      {/* ═══ DECORATIONS ═══ */}

      {/* Globe decoration */}
      <group position={[-FLOOR_SIZE.w / 2 + 0.3, 0.7, -2]}>
        <mesh castShadow>
          <sphereGeometry args={[0.18, 16, 12]} />
          <meshStandardMaterial color="#2a5a8a" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.19, 0.008, 8, 24]} />
          <meshStandardMaterial color="#c9a96e" roughness={0.3} metalness={0.4} />
        </mesh>
        <mesh position={[0, -0.22, 0]}>
          <cylinderGeometry args={[0.015, 0.04, 0.08, 8]} />
          <meshStandardMaterial color="#4a4a4a" roughness={0.4} metalness={0.4} />
        </mesh>
        <mesh position={[0, -0.26, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.01, 10]} />
          <meshStandardMaterial color="#3a3a3a" roughness={0.4} metalness={0.4} />
        </mesh>
      </group>

      {/* Luggage */}
      <group position={[-FLOOR_SIZE.w / 2 + 0.35, 0, 1]}>
        <mesh position={[0, 0.18, 0]} castShadow>
          <boxGeometry args={[0.28, 0.35, 0.14]} />
          <meshStandardMaterial color="#8b4513" roughness={0.7} metalness={0.05} />
        </mesh>
        <mesh position={[0, 0.18, 0.071]}>
          <boxGeometry args={[0.22, 0.01, 0.001]} />
          <meshStandardMaterial color="#c9a96e" roughness={0.4} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.38, 0]}>
          <boxGeometry args={[0.08, 0.03, 0.04]} />
          <meshStandardMaterial color="#5a3a1a" roughness={0.5} metalness={0.2} />
        </mesh>
      </group>
      <group position={[-FLOOR_SIZE.w / 2 + 0.55, 0, 1.1]}>
        <mesh position={[0, 0.12, 0]} castShadow>
          <boxGeometry args={[0.22, 0.24, 0.12]} />
          <meshStandardMaterial color="#2c5f7a" roughness={0.6} metalness={0.08} />
        </mesh>
        <mesh position={[0, 0.26, 0]}>
          <boxGeometry args={[0.06, 0.025, 0.035]} />
          <meshStandardMaterial color="#3a3a3a" roughness={0.4} metalness={0.3} />
        </mesh>
      </group>

      {/* Floor logo emblem */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 3.5]}>
        <circleGeometry args={[0.8, 32]} />
        <meshStandardMaterial color="#c9a96e" transparent opacity={0.12} roughness={0.9} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.013, 3.5]}>
        <ringGeometry args={[0.7, 0.8, 32]} />
        <meshStandardMaterial color="#c9a96e" transparent opacity={0.2} roughness={0.8} />
      </mesh>

      {/* Airplane model on reception */}
      <group position={[RECEPTION.pos.x - 0.6, RECEPTION.pos.y + 0.15, RECEPTION.pos.z]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.02, 0.12, 4, 8]} />
          <meshStandardMaterial color="#e8e0d8" roughness={0.3} metalness={0.3} />
        </mesh>
        <mesh rotation-z={Math.PI / 2}>
          <boxGeometry args={[0.005, 0.12, 0.03]} />
          <meshStandardMaterial color="#c0c0c0" roughness={0.3} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.07, 0]} rotation-z={Math.PI / 2}>
          <boxGeometry args={[0.005, 0.04, 0.02]} />
          <meshStandardMaterial color="#c9a96e" roughness={0.3} metalness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

/* ── Wall-mounted TV Component ────────────────── */
function WallTV({ position, rotation, content }: {
  position: [number, number, number];
  rotation: [number, number, number];
  content: { img: string; label: string };
}) {
  const tvW = 2.0;
  const tvH = 1.2;
  return (
    <group position={position} rotation={rotation}>
      {/* TV Frame — slim bezel */}
      <mesh castShadow>
        <boxGeometry args={[tvW + 0.08, tvH + 0.08, 0.04]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.15} metalness={0.6} />
      </mesh>
      {/* Screen with image */}
      <Html position={[0, 0, 0.025]} center distanceFactor={3.5} style={{ pointerEvents: 'none' }}>
        <div style={{
          width: '240px', height: '150px', position: 'relative',
          overflow: 'hidden', borderRadius: '2px', background: '#000',
        }}>
          <img src={content.img} alt={content.label} style={{
            width: '100%', height: '100%', objectFit: 'cover',
            filter: 'brightness(0.9) saturate(1.2)',
          }} />
          {/* Gradient overlay */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
          }} />
          {/* NatLeva watermark */}
          <div style={{
            position: 'absolute', top: '6px', left: '8px',
          }}>
            <img src={logoNatleva} alt="" style={{ width: '40px', opacity: 0.8 }} />
          </div>
          {/* Destination label */}
          <div style={{
            position: 'absolute', bottom: '8px', left: '10px', right: '10px',
          }}>
            <div style={{
              fontSize: '10px', fontWeight: 700, color: '#fff',
              fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '1px',
              textShadow: '0 1px 6px rgba(0,0,0,0.8)',
            }}>
              {content.label}
            </div>
            <div style={{
              fontSize: '6px', fontWeight: 500, color: '#c9a96e',
              fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '2px',
              marginTop: '2px',
            }}>
              NATLEVA TRAVEL
            </div>
          </div>
        </div>
      </Html>
      {/* Screen glow effect */}
      <pointLight position={[0, 0, 0.3]} intensity={0.15} color="#8ab4f8" distance={2} decay={2} />
      {/* Wall mount bracket */}
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[0.3, 0.15, 0.03]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.4} metalness={0.5} />
      </mesh>
    </group>
  );
}
function Cafeteria() {
  const cx = 6.5, cz = -3.5;
  return (
    <group>
      {/* Floor area marker */}
      <mesh rotation-x={-Math.PI / 2} position={[cx, 0.004, cz]}>
        <planeGeometry args={[3.5, 3.0]} />
        <meshStandardMaterial color="#d5cdc2" roughness={1} transparent opacity={0.4} />
      </mesh>

      {/* Counter / bar */}
      <mesh position={[cx + 0.8, 0.45, cz - 1.0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.9, 0.5]} />
        <meshStandardMaterial color="#3a3020" roughness={0.5} metalness={0.1} />
      </mesh>
      {/* Counter top */}
      <mesh position={[cx + 0.8, 0.91, cz - 1.0]}>
        <boxGeometry args={[1.85, 0.03, 0.55]} />
        <meshStandardMaterial color="#f0ebe3" roughness={0.3} metalness={0.05} />
      </mesh>

      {/* Coffee machine */}
      <mesh position={[cx + 1.4, 1.1, cz - 1.0]} castShadow>
        <boxGeometry args={[0.22, 0.32, 0.2]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* Machine glow */}
      <mesh position={[cx + 1.4, 1.08, cz - 0.89]}>
        <planeGeometry args={[0.08, 0.04]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={0.5} />
      </mesh>

      {/* Coffee cups on counter */}
      {[0, 0.2, 0.4].map((offset, i) => (
        <mesh key={`cup-${i}`} position={[cx + 0.2 + offset, 0.96, cz - 1.0]} castShadow>
          <cylinderGeometry args={[0.025, 0.02, 0.06, 8]} />
          <meshStandardMaterial color={['#f0e8d8', '#e0d0b8', '#fff'][i]} roughness={0.7} />
        </mesh>
      ))}

      {/* Round table 1 */}
      <group position={[cx - 0.4, 0, cz]}>
        <mesh position={[0, 0.36, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.4, 0.4, 0.03, 16]} />
          <meshStandardMaterial color="#f0ebe3" roughness={0.4} metalness={0.05} />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.03, 0.06, 0.36, 8]} />
          <meshStandardMaterial color="#4a4a4a" roughness={0.3} metalness={0.5} />
        </mesh>
        {/* Stools */}
        {[0, Math.PI * 0.66, Math.PI * 1.33].map((angle, i) => (
          <group key={`stool-${i}`} position={[Math.sin(angle) * 0.55, 0, Math.cos(angle) * 0.55]}>
            <mesh position={[0, 0.28, 0]} castShadow>
              <cylinderGeometry args={[0.12, 0.12, 0.03, 10]} />
              <meshStandardMaterial color="#5a4a38" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.14, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.28, 6]} />
              <meshStandardMaterial color="#4a4a4a" roughness={0.3} metalness={0.5} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Round table 2 */}
      <group position={[cx + 0.6, 0, cz + 0.6]}>
        <mesh position={[0, 0.36, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.03, 16]} />
          <meshStandardMaterial color="#f0ebe3" roughness={0.4} metalness={0.05} />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.03, 0.06, 0.36, 8]} />
          <meshStandardMaterial color="#4a4a4a" roughness={0.3} metalness={0.5} />
        </mesh>
        {[0, Math.PI].map((angle, i) => (
          <group key={`st2-${i}`} position={[Math.sin(angle) * 0.48, 0, Math.cos(angle) * 0.48]}>
            <mesh position={[0, 0.28, 0]} castShadow>
              <cylinderGeometry args={[0.12, 0.12, 0.03, 10]} />
              <meshStandardMaterial color="#5a4a38" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.14, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.28, 6]} />
              <meshStandardMaterial color="#4a4a4a" roughness={0.3} metalness={0.5} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Fridge */}
      <mesh position={[cx + 1.5, 0.55, cz + 0.4]} castShadow>
        <boxGeometry args={[0.4, 1.1, 0.35]} />
        <meshStandardMaterial color="#e0e0e0" roughness={0.3} metalness={0.2} />
      </mesh>
      {/* Fridge handle */}
      <mesh position={[cx + 1.28, 0.6, 0.4 + cz]}>
        <boxGeometry args={[0.015, 0.2, 0.02]} />
        <meshStandardMaterial color="#c0c0c0" roughness={0.2} metalness={0.6} />
      </mesh>

      {/* Microwave on counter */}
      <mesh position={[cx + 0.3, 1.0, cz - 1.0]} castShadow>
        <boxGeometry args={[0.22, 0.14, 0.18]} />
        <meshStandardMaterial color="#e8e0d8" roughness={0.4} metalness={0.1} />
      </mesh>
      <mesh position={[cx + 0.3, 1.0, cz - 0.9]}>
        <planeGeometry args={[0.12, 0.08]} />
        <meshStandardMaterial color="#111" roughness={0.1} />
      </mesh>

      {/* "Refeitório" sign */}
      <Html position={[cx, 1.9, cz - 1.3]} center distanceFactor={6} style={{ pointerEvents: 'none' }}>
        <div style={{
          fontSize: '10px', fontWeight: 700, color: '#c9a96e',
          background: 'rgba(26,35,50,0.9)', backdropFilter: 'blur(4px)',
          padding: '3px 12px', borderRadius: '6px', whiteSpace: 'nowrap',
          letterSpacing: '2px', fontFamily: 'Space Grotesk, sans-serif',
          border: '1px solid rgba(201,169,110,0.3)',
        }}>
          ☕ REFEITÓRIO
        </div>
      </Html>

      {/* Warm light over cafeteria */}
      <pointLight position={[cx, 2.0, cz]} intensity={0.4} color="#ffe0a0" distance={5} decay={2} />
    </group>
  );
}

/* ── Main export ───────────────────────────────── */
export default function OfficeFurniture() {
  return (
    <group>
      <WallSet />
      <CeilingLights />
      <NatLevaBranding />
      <ReceptionDesk />
      <ConferenceTable />
      <Whiteboard />
      <Cafeteria />

      {DESKS.map((d, i) => (
        <Desk key={i} pos={d.pos} size={d.size} label={d.label} />
      ))}
      {DESKS.map((d, i) => (
        <Chair key={`ch-${i}`} x={d.pos.x} z={d.pos.z + d.size.z / 2 + 0.35} />
      ))}
      {SOFAS.map((s, i) => (
        <Sofa key={`sf-${i}`} pos={s.pos} size={s.size} />
      ))}
      {PLANTS.map((p, i) => (
        <Plant key={`pl-${i}`} x={p.x} z={p.z} />
      ))}
    </group>
  );
}
