import { DESKS, RECEPTION, SOFAS, PLANTS, WHITEBOARD, WALLS, FLOOR_SIZE } from './mapData3d';

/* ── Desk ──────────────────────────────────────── */
function Desk({ pos, size, label }: { pos: { x: number; y: number; z: number }; size: { x: number; y: number; z: number }; label?: string }) {
  const legH = pos.y - 0.02;
  const legR = 0.03;
  const legOffX = size.x / 2 - 0.1;
  const legOffZ = size.z / 2 - 0.08;

  return (
    <group position={[pos.x, 0, pos.z]}>
      {/* Tabletop */}
      <mesh position={[0, pos.y, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, size.y, size.z]} />
        <meshStandardMaterial color="#7a6a54" roughness={0.7} metalness={0.05} />
      </mesh>

      {/* Legs */}
      {[[-legOffX, -legOffZ], [legOffX, -legOffZ], [-legOffX, legOffZ], [legOffX, legOffZ]].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, legH / 2, lz]}>
          <cylinderGeometry args={[legR, legR, legH, 6]} />
          <meshStandardMaterial color="#5a4a38" roughness={0.8} />
        </mesh>
      ))}

      {/* Monitor */}
      <group position={[0, pos.y + 0.18, -size.z / 2 + 0.15]}>
        <mesh castShadow>
          <boxGeometry args={[0.32, 0.22, 0.02]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.3} metalness={0.4} />
        </mesh>
        {/* Screen */}
        <mesh position={[0, 0, 0.011]}>
          <planeGeometry args={[0.28, 0.17]} />
          <meshStandardMaterial color="#1a1a2e" emissive="#2a3a5a" emissiveIntensity={0.3} roughness={0.2} />
        </mesh>
        {/* Stand */}
        <mesh position={[0, -0.14, 0]}>
          <cylinderGeometry args={[0.015, 0.03, 0.06, 6]} />
          <meshStandardMaterial color="#3a3a3a" roughness={0.5} metalness={0.3} />
        </mesh>
      </group>

      {/* Keyboard */}
      <mesh position={[0, pos.y + 0.03, size.z / 2 - 0.18]} castShadow>
        <boxGeometry args={[0.24, 0.015, 0.1]} />
        <meshStandardMaterial color="#484848" roughness={0.6} metalness={0.2} />
      </mesh>
    </group>
  );
}

/* ── Chair ─────────────────────────────────────── */
function Chair({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {/* Seat */}
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.04, 12]} />
        <meshStandardMaterial color="#505050" roughness={0.7} metalness={0.1} />
      </mesh>
      {/* Pole */}
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.28, 6]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Base */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.02, 8]} />
        <meshStandardMaterial color="#404040" roughness={0.6} metalness={0.2} />
      </mesh>
    </group>
  );
}

/* ── Plant ─────────────────────────────────────── */
function Plant({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {/* Pot */}
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.08, 0.24, 8]} />
        <meshStandardMaterial color="#8b7355" roughness={0.85} />
      </mesh>
      {/* Foliage */}
      <mesh position={[0, 0.38, 0]} castShadow>
        <sphereGeometry args={[0.2, 8, 6]} />
        <meshStandardMaterial color="#5a8a6a" roughness={0.9} />
      </mesh>
      <mesh position={[-0.08, 0.42, 0.06]} castShadow>
        <sphereGeometry args={[0.14, 8, 6]} />
        <meshStandardMaterial color="#4a7a58" roughness={0.9} />
      </mesh>
      <mesh position={[0.06, 0.45, -0.05]} castShadow>
        <sphereGeometry args={[0.12, 8, 6]} />
        <meshStandardMaterial color="#6a9a7a" roughness={0.9} />
      </mesh>
    </group>
  );
}

/* ── Sofa ──────────────────────────────────────── */
function Sofa({ pos, size }: { pos: { x: number; y: number; z: number }; size: { x: number; y: number; z: number } }) {
  return (
    <group position={[pos.x, 0, pos.z]}>
      {/* Base */}
      <mesh position={[0, pos.y / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, size.y, size.z]} />
        <meshStandardMaterial color="#7a6b58" roughness={0.85} />
      </mesh>
      {/* Cushion */}
      <mesh position={[0, pos.y + 0.04, 0]} castShadow>
        <boxGeometry args={[size.x - 0.06, 0.08, size.z - 0.06]} />
        <meshStandardMaterial color="#8a7b68" roughness={0.9} />
      </mesh>
      {/* Backrest */}
      {size.x > size.z ? (
        <mesh position={[0, pos.y + 0.18, -size.z / 2 + 0.06]} castShadow>
          <boxGeometry args={[size.x - 0.04, 0.25, 0.1]} />
          <meshStandardMaterial color="#6a5b48" roughness={0.85} />
        </mesh>
      ) : (
        <mesh position={[-size.x / 2 + 0.06, pos.y + 0.18, 0]} castShadow>
          <boxGeometry args={[0.1, 0.25, size.z - 0.04]} />
          <meshStandardMaterial color="#6a5b48" roughness={0.85} />
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
        <meshStandardMaterial color="#3a3025" roughness={0.6} metalness={0.05} />
      </mesh>
      {/* Accent strip */}
      <mesh position={[0, pos.y - 0.04, size.z / 2 + 0.001]}>
        <planeGeometry args={[size.x - 0.2, 0.04]} />
        <meshStandardMaterial color="#c4a97d" roughness={0.5} />
      </mesh>
      {/* Small monitor */}
      <mesh position={[0.3, pos.y + 0.15, 0]} castShadow>
        <boxGeometry args={[0.28, 0.2, 0.02]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.3} metalness={0.3} />
      </mesh>
      <mesh position={[0.3, pos.y + 0.15, 0.011]}>
        <planeGeometry args={[0.24, 0.15]} />
        <meshStandardMaterial color="#1a1a2e" emissive="#2a3a5a" emissiveIntensity={0.25} roughness={0.2} />
      </mesh>
    </group>
  );
}

/* ── Whiteboard ────────────────────────────────── */
function Whiteboard() {
  const { x, z, w, h } = WHITEBOARD;
  return (
    <group position={[x, 1.0, z]}>
      {/* Frame */}
      <mesh castShadow>
        <boxGeometry args={[w + 0.06, h + 0.06, 0.03]} />
        <meshStandardMaterial color="#d0d0d0" roughness={0.5} metalness={0.1} />
      </mesh>
      {/* Board */}
      <mesh position={[0, 0, 0.016]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.4} />
      </mesh>
    </group>
  );
}

/* ── Walls ─────────────────────────────────────── */
function WallSet() {
  const { w, h } = FLOOR_SIZE;
  const { thickness: t, height: ht } = WALLS;
  const wallColor = '#d6d0c8';

  return (
    <group>
      {/* North */}
      <mesh position={[0, ht / 2, -h / 2]} receiveShadow>
        <boxGeometry args={[w, ht, t]} />
        <meshStandardMaterial color={wallColor} roughness={0.85} />
      </mesh>
      {/* South */}
      <mesh position={[0, ht / 2, h / 2]} receiveShadow>
        <boxGeometry args={[w, ht, t]} />
        <meshStandardMaterial color={wallColor} roughness={0.85} />
      </mesh>
      {/* West */}
      <mesh position={[-w / 2, ht / 2, 0]} receiveShadow>
        <boxGeometry args={[t, ht, h]} />
        <meshStandardMaterial color={wallColor} roughness={0.85} />
      </mesh>
      {/* East */}
      <mesh position={[w / 2, ht / 2, 0]} receiveShadow>
        <boxGeometry args={[t, ht, h]} />
        <meshStandardMaterial color={wallColor} roughness={0.85} />
      </mesh>
    </group>
  );
}

/* ── Main export ───────────────────────────────── */
export default function OfficeFurniture() {
  return (
    <group>
      <WallSet />
      <ReceptionDesk />
      <Whiteboard />

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
