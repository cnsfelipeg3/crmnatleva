import { DESKS, RECEPTION, SOFAS, PLANTS, WHITEBOARD, WALLS, FLOOR_SIZE, CONFERENCE_TABLE } from './mapData3d';

/* ── Desk ──────────────────────────────────────── */
function Desk({ pos, size, label }: { pos: { x: number; y: number; z: number }; size: { x: number; y: number; z: number }; label?: string }) {
  const legH = pos.y - 0.02;
  const legR = 0.025;
  const legOffX = size.x / 2 - 0.08;
  const legOffZ = size.z / 2 - 0.06;

  return (
    <group position={[pos.x, 0, pos.z]}>
      {/* Tabletop */}
      <mesh position={[0, pos.y, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, size.y, size.z]} />
        <meshStandardMaterial color="#6d5d48" roughness={0.55} metalness={0.08} envMapIntensity={0.3} />
      </mesh>
      {/* Edge strip */}
      <mesh position={[0, pos.y + size.y / 2 + 0.001, 0]}>
        <boxGeometry args={[size.x + 0.01, 0.005, size.z + 0.01]} />
        <meshStandardMaterial color="#5a4a38" roughness={0.4} metalness={0.15} />
      </mesh>

      {/* Legs */}
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
        {/* Screen glow */}
        <mesh position={[0, 0, 0.009]}>
          <planeGeometry args={[0.3, 0.19]} />
          <meshStandardMaterial
            color="#0a0a1a"
            emissive="#3050aa"
            emissiveIntensity={0.5}
            roughness={0.1}
            metalness={0.1}
          />
        </mesh>
        {/* Stand */}
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.012, 0.025, 0.06, 8]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.3} metalness={0.5} />
        </mesh>
        {/* Base */}
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
      {/* Seat */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.04, 16]} />
        <meshStandardMaterial color="#404040" roughness={0.6} metalness={0.15} />
      </mesh>
      {/* Backrest */}
      <mesh position={[0, 0.48, -0.12]} castShadow>
        <boxGeometry args={[0.28, 0.3, 0.03]} />
        <meshStandardMaterial color="#383838" roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Pole */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.3, 8]} />
        <meshStandardMaterial color="#505050" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* Base */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.015, 10]} />
        <meshStandardMaterial color="#404040" roughness={0.4} metalness={0.4} />
      </mesh>
      {/* Wheels (5) */}
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
      {/* Pot */}
      <mesh position={[0, 0.13, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.07, 0.26, 10]} />
        <meshStandardMaterial color="#8b7355" roughness={0.8} metalness={0.05} />
      </mesh>
      {/* Pot rim */}
      <mesh position={[0, 0.26, 0]}>
        <torusGeometry args={[0.1, 0.012, 8, 16]} />
        <meshStandardMaterial color="#7a6348" roughness={0.7} />
      </mesh>
      {/* Soil */}
      <mesh position={[0, 0.25, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.09, 12]} />
        <meshStandardMaterial color="#4a3520" roughness={1} />
      </mesh>
      {/* Foliage layers */}
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
      {/* Base */}
      <mesh position={[0, pos.y / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, size.y, size.z]} />
        <meshStandardMaterial color="#6a5b48" roughness={0.8} metalness={0.05} />
      </mesh>
      {/* Cushion */}
      <mesh position={[0, pos.y + 0.04, 0]} castShadow>
        <boxGeometry args={[size.x - 0.06, 0.1, size.z - 0.06]} />
        <meshStandardMaterial color="#7a6b58" roughness={0.85} />
      </mesh>
      {/* Backrest */}
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
      {/* Accent strip */}
      <mesh position={[0, pos.y - 0.04, size.z / 2 + 0.001]}>
        <planeGeometry args={[size.x - 0.2, 0.05]} />
        <meshStandardMaterial color="#c9a96e" roughness={0.4} metalness={0.2} emissive="#c9a96e" emissiveIntensity={0.05} />
      </mesh>
      {/* Monitor */}
      <mesh position={[0.4, pos.y + 0.17, 0]} castShadow>
        <boxGeometry args={[0.3, 0.22, 0.015]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.15} metalness={0.5} />
      </mesh>
      <mesh position={[0.4, pos.y + 0.17, 0.009]}>
        <planeGeometry args={[0.26, 0.17]} />
        <meshStandardMaterial color="#0a0a1a" emissive="#2a4a8a" emissiveIntensity={0.4} roughness={0.1} />
      </mesh>
      {/* Sign */}
      <mesh position={[-0.6, pos.y + 0.12, size.z / 2 + 0.002]}>
        <planeGeometry args={[0.4, 0.12]} />
        <meshStandardMaterial color="#f5f0e6" emissive="#c9a96e" emissiveIntensity={0.05} roughness={0.5} />
      </mesh>
    </group>
  );
}

/* ── Whiteboard ────────────────────────────────── */
function Whiteboard() {
  const { x, z, w, h } = WHITEBOARD;
  return (
    <group position={[x, 1.1, z]}>
      {/* Frame */}
      <mesh castShadow>
        <boxGeometry args={[w + 0.08, h + 0.08, 0.04]} />
        <meshStandardMaterial color="#c0c0c0" roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Board */}
      <mesh position={[0, 0, 0.021]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color="#f8f8f8" roughness={0.3} metalness={0.02} />
      </mesh>
      {/* Marker tray */}
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
      {/* Legs */}
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
      {/* North */}
      <mesh position={[0, ht / 2, -h / 2]} receiveShadow>
        <boxGeometry args={[w, ht, t]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} envMapIntensity={0.1} />
      </mesh>
      {/* South */}
      <mesh position={[0, ht / 2, h / 2]} receiveShadow>
        <boxGeometry args={[w, ht, t]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} envMapIntensity={0.1} />
      </mesh>
      {/* West */}
      <mesh position={[-w / 2, ht / 2, 0]} receiveShadow>
        <boxGeometry args={[t, ht, h]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} envMapIntensity={0.1} />
      </mesh>
      {/* East */}
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
  const positions = [
    [-3, 0], [3, 0], [-3, -3], [3, -3], [0, 2],
  ];
  return (
    <group>
      {positions.map(([x, z], i) => (
        <group key={i} position={[x, WALLS.height - 0.05, z]}>
          {/* Fixture housing */}
          <mesh>
            <cylinderGeometry args={[0.25, 0.25, 0.03, 16]} />
            <meshStandardMaterial color="#e0d8cc" roughness={0.5} />
          </mesh>
          {/* Glow disc */}
          <mesh position={[0, -0.02, 0]} rotation-x={Math.PI}>
            <circleGeometry args={[0.2, 16]} />
            <meshStandardMaterial
              color="#fff8e8"
              emissive="#fff0d0"
              emissiveIntensity={0.6}
              transparent
              opacity={0.8}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ── Main export ───────────────────────────────── */
export default function OfficeFurniture() {
  return (
    <group>
      <WallSet />
      <CeilingLights />
      <ReceptionDesk />
      <ConferenceTable />
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
