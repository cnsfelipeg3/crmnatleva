import { useMemo } from 'react';
import { DESKS, RECEPTION, SOFAS, PLANTS, WALLS, FLOOR_SIZE, CONFERENCE_TABLE } from './mapData3d';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const MONITOR_GLB_PATH = '/models/samsung_odyssey_oled_g9.glb';

// Preload for performance
useGLTF.preload(MONITOR_GLB_PATH);

/* ── Samsung Odyssey G9 — Real 3D Model ── */
function MonitorModel({ targetWidth = 0.9 }: { targetWidth?: number }) {
  const { scene } = useGLTF(MONITOR_GLB_PATH);
  const group = useMemo(() => {
    const cloned = scene.clone(true);
    // Center the model and compute scale
    const box = new THREE.Box3().setFromObject(cloned);
    const center = box.getCenter(new THREE.Vector3());
    const modelSize = box.getSize(new THREE.Vector3());
    // Center horizontally and on Z, sit on bottom (Y=0)
    cloned.position.set(-center.x, -box.min.y, -center.z);
    // Attach model width for scale computation
    (cloned as any).__modelWidth = modelSize.x;
    return cloned;
  }, [scene]);

  const s = targetWidth / ((group as any).__modelWidth || 1.2);

  return (
    <group rotation={[0, Math.PI, 0]}>
      <primitive
        object={group}
        scale={[s, s, s]}
      />
    </group>
  );
}

/* ── Desk with real Samsung Odyssey G9 49" ── */
function Desk({ pos, size, label }: { pos: { x: number; y: number; z: number }; size: { x: number; y: number; z: number }; label?: string }) {
  const legH = pos.y - 0.02;
  const legR = 0.025;
  const legOffX = size.x / 2 - 0.08;
  const legOffZ = size.z / 2 - 0.06;

  // Desk top surface Y = pos.y + size.y/2
  const deskTopY = pos.y + size.y / 2;

  return (
    <group position={[pos.x, 0, pos.z]}>
      {/* Desk surface */}
      <mesh position={[0, pos.y, 0]} castShadow receiveShadow>
        <boxGeometry args={[size.x, size.y, size.z]} />
        <meshStandardMaterial color="#6d5d48" roughness={0.55} metalness={0.08} envMapIntensity={0.3} />
      </mesh>
      <mesh position={[0, deskTopY + 0.001, 0]}>
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

      {/* ═══ Samsung Odyssey OLED G9 — on desk surface, centered, facing front ═══ */}
      <group position={[0, deskTopY, -size.z * 0.25]}>
        <MonitorModel targetWidth={0.7} />
      </group>

      {/* Keyboard */}
      <mesh position={[0, pos.y + 0.03, size.z / 2 - 0.2]} castShadow>
        <boxGeometry args={[0.24, 0.01, 0.08]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Mouse */}
      <mesh position={[0.2, pos.y + 0.025, size.z / 2 - 0.2]} castShadow>
        <boxGeometry args={[0.04, 0.015, 0.06]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.5} metalness={0.2} />
      </mesh>

      {/* File/Folder Holder */}
      <group position={[size.x / 2 - 0.12, pos.y, size.z / 2 - 0.08]}>
        <mesh position={[0, 0.04, 0]} castShadow>
          <boxGeometry args={[0.1, 0.08, 0.1]} />
          <meshStandardMaterial color="#3a3a3a" roughness={0.4} metalness={0.5} />
        </mesh>
        {[0, 1, 2].map(i => (
          <mesh key={i} position={[0, 0.06 + i * 0.018, -0.01]} castShadow>
            <boxGeometry args={[0.08, 0.014, 0.08]} />
            <meshStandardMaterial
              color={['#c9a96e', '#4a8a5a', '#4a6aaa'][i]}
              roughness={0.6}
              metalness={0.1}
            />
          </mesh>
        ))}
      </group>
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

/* ── Whiteboard removed — NatLeva branding replaces it ── */

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

/* ── Ceiling light fixtures — REMOVED for performance ── */

/* ── NatLeva Wall Branding — LIGHTWEIGHT version ── */
/* Replaced heavy LogoTexturePanel (5 lights + Html each) and CyclingTV (Html+img each)
   with simple emissive meshes. This removes ~30 pointLights and ~12 Html overlays. */

function SimpleWallScreen({ position, rotationY, width, height, emissiveColor }: {
  position: [number, number, number];
  rotationY: number;
  width: number;
  height: number;
  emissiveColor?: string;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Bezel */}
      <mesh>
        <boxGeometry args={[width + 0.08, height + 0.08, 0.04]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.1} metalness={0.7} />
      </mesh>
      {/* Screen */}
      <mesh position={[0, 0, 0.022]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          color="#050810"
          emissive={emissiveColor || "#1a3a20"}
          emissiveIntensity={0.5}
          roughness={0.05}
        />
      </mesh>
    </group>
  );
}

function SimpleTVScreen({ position, rotationY, offset }: {
  position: [number, number, number];
  rotationY: number;
  offset: number;
}) {
  const emissiveColors = ['#1a3050', '#2a1a40', '#1a4030', '#3a2a1a', '#1a2a50', '#2a3a1a'];
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh>
        <boxGeometry args={[2.06, 1.26, 0.04]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.12} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.022]}>
        <planeGeometry args={[1.96, 1.16]} />
        <meshStandardMaterial
          color="#080810"
          emissive={emissiveColors[offset % emissiveColors.length]}
          emissiveIntensity={0.3}
          roughness={0.1}
        />
      </mesh>
    </group>
  );
}

function FloorLogo({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, 0]}>
        <ringGeometry args={[1.2, 1.35, 32]} />
        <meshStandardMaterial color="#c9a96e" transparent opacity={0.2} roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.007, 0]}>
        <circleGeometry args={[1.18, 32]} />
        <meshStandardMaterial color="#0a1420" transparent opacity={0.08} roughness={0.9} />
      </mesh>
    </group>
  );
}

function NatLevaBranding() {
  const hw = FLOOR_SIZE.w / 2;
  const hh = FLOOR_SIZE.h / 2;

  return (
    <group>
      {/* North wall — main screen + 2 TVs */}
      <SimpleWallScreen position={[0, 1.3, -hh + 0.08]} rotationY={0} width={5.5} height={1.6} emissiveColor="#1a4a20" />
      <SimpleTVScreen position={[-7.2, 1.2, -hh + 0.09]} rotationY={0} offset={0} />
      <SimpleTVScreen position={[7.2, 1.2, -hh + 0.09]} rotationY={0} offset={3} />

      {/* South wall */}
      <SimpleWallScreen position={[0, 1.3, hh - 0.08]} rotationY={Math.PI} width={4.0} height={1.2} emissiveColor="#1a3a20" />
      <SimpleTVScreen position={[-6, 1.2, hh - 0.09]} rotationY={Math.PI} offset={1} />
      <SimpleTVScreen position={[6, 1.2, hh - 0.09]} rotationY={Math.PI} offset={4} />

      {/* East wall */}
      <SimpleWallScreen position={[hw - 0.08, 1.3, -1]} rotationY={-Math.PI / 2} width={3.2} height={1.0} emissiveColor="#1a3a20" />
      <SimpleTVScreen position={[hw - 0.09, 1.2, 2.5]} rotationY={-Math.PI / 2} offset={2} />

      {/* West wall */}
      <SimpleWallScreen position={[-hw + 0.08, 1.3, -1]} rotationY={Math.PI / 2} width={3.2} height={1.0} emissiveColor="#1a3a20" />
      <SimpleTVScreen position={[-hw + 0.09, 1.2, 2.5]} rotationY={Math.PI / 2} offset={5} />

      {/* Floor logos — lightweight rings */}
      <FloorLogo position={[0, 0, 3.2]} />
      <FloorLogo position={[0, 0, -1.0]} />

      {/* Globe decoration */}
      <group position={[-hw + 0.3, 0.7, -2]}>
        <mesh>
          <sphereGeometry args={[0.18, 12, 8]} />
          <meshStandardMaterial color="#2a5a8a" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.19, 0.008, 6, 16]} />
          <meshStandardMaterial color="#c9a96e" roughness={0.3} metalness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

/* ── Simplified Cafeteria (no Html, no animated lights) ── */
function Cafeteria() {
  const cx = 6.5, cz = -3.5;
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[cx, 0.004, cz]}>
        <planeGeometry args={[3.5, 3.0]} />
        <meshStandardMaterial color="#d5cdc2" roughness={1} transparent opacity={0.3} />
      </mesh>
      {/* Counter */}
      <mesh position={[cx + 0.8, 0.45, cz - 1.0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.9, 0.5]} />
        <meshStandardMaterial color="#3a3020" roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh position={[cx + 0.8, 0.91, cz - 1.0]}>
        <boxGeometry args={[1.85, 0.03, 0.55]} />
        <meshStandardMaterial color="#f0ebe3" roughness={0.3} />
      </mesh>
      {/* Coffee machine */}
      <mesh position={[cx + 1.4, 1.1, cz - 1.0]} castShadow>
        <boxGeometry args={[0.22, 0.32, 0.2]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* Round table */}
      <mesh position={[cx - 0.4, 0.36, cz]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.03, 12]} />
        <meshStandardMaterial color="#f0ebe3" roughness={0.4} />
      </mesh>
      <mesh position={[cx - 0.4, 0.18, cz]}>
        <cylinderGeometry args={[0.03, 0.06, 0.36, 6]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.3} metalness={0.5} />
      </mesh>
    </group>
  );
}

/* ── Main export ───────────────────────────────── */
export default function OfficeFurniture() {
  return (
    <group>
      <WallSet />
      <NatLevaBranding />
      <ReceptionDesk />
      <ConferenceTable />
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
