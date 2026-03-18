import { useRef, useState, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { DESKS, RECEPTION, SOFAS, PLANTS, WALLS, FLOOR_SIZE, CONFERENCE_TABLE } from './mapData3d';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
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
const TV_CONTENT = [
  { img: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800&h=500&fit=crop&q=80', label: 'Maldivas · Águas Cristalinas' },
  { img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=500&fit=crop&q=80', label: 'Paris · Cidade Luz' },
  { img: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&h=500&fit=crop&q=80', label: 'Veneza · Romance Italiano' },
  { img: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&h=500&fit=crop&q=80', label: 'Suíça · Alpes Majestosos' },
  { img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=500&fit=crop&q=80', label: 'Caribe · Paraíso Tropical' },
  { img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&h=500&fit=crop&q=80', label: 'Japão · Tradição e Futuro' },
  { img: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=500&fit=crop&q=80', label: 'Santorini · Grécia Mágica' },
  { img: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&h=500&fit=crop&q=80', label: 'Itália · Costa Amalfitana' },
];

/* ── Cycling TV ───────────────────────────────── */
function CyclingTV({ position, rotationY, offset }: {
  position: [number, number, number];
  rotationY: number;
  offset: number;
}) {
  const [idx, setIdx] = useState(offset % TV_CONTENT.length);
  const timerRef = useRef(0);

  useFrame((_, delta) => {
    timerRef.current += delta;
    if (timerRef.current > 6) {
      timerRef.current = 0;
      setIdx(prev => (prev + 1) % TV_CONTENT.length);
    }
  });

  const content = TV_CONTENT[idx];
  const tvW = 2.0;
  const tvH = 1.2;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* TV bezel */}
      <mesh castShadow>
        <boxGeometry args={[tvW + 0.06, tvH + 0.06, 0.05]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.12} metalness={0.7} />
      </mesh>
      {/* Screen surface (emissive for glow) */}
      <mesh position={[0, 0, 0.026]}>
        <planeGeometry args={[tvW - 0.04, tvH - 0.04]} />
        <meshStandardMaterial color="#111822" emissive="#2a4060" emissiveIntensity={0.3} roughness={0.1} />
      </mesh>
      {/* Content overlay via Html transform */}
      <Html
        position={[0, 0, 0.03]}
        center
        transform
        scale={0.22}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          width: '400px', height: '250px', position: 'relative',
          overflow: 'hidden', background: '#000', borderRadius: '2px',
        }}>
          <img
            src={content.img}
            alt={content.label}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              filter: 'brightness(0.95) saturate(1.15)',
              transition: 'opacity 0.8s ease',
            }}
          />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
          }} />
          <div style={{ position: 'absolute', top: '10px', left: '12px' }}>
            <img src={logoNatleva} alt="" style={{ width: '60px', opacity: 0.85 }} />
          </div>
          <div style={{ position: 'absolute', bottom: '14px', left: '14px', right: '14px' }}>
            <div style={{
              fontSize: '18px', fontWeight: 700, color: '#fff',
              fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '1px',
              textShadow: '0 2px 8px rgba(0,0,0,0.9)',
            }}>
              {content.label}
            </div>
            <div style={{
              fontSize: '9px', fontWeight: 500, color: '#c9a96e',
              fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '3px',
              marginTop: '4px',
            }}>
              NATLEVA TRAVEL
            </div>
          </div>
        </div>
      </Html>
      {/* Screen glow light */}
      <pointLight position={[0, 0, 0.4]} intensity={0.2} color="#6090c0" distance={2.5} decay={2} />
      {/* Wall bracket */}
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[0.3, 0.12, 0.04]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.4} metalness={0.5} />
      </mesh>
    </group>
  );
}

/* ── LED Screen Panel — Ultra-bright 4K LED display ─ */
function LogoTexturePanel({ position, rotationY, width, height }: {
  position: [number, number, number];
  rotationY: number;
  width: number;
  height: number;
}) {
  const texture = useLoader(THREE.TextureLoader, logoNatleva);
  const screenRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const glowRef2 = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (glowRef.current) {
      glowRef.current.intensity = 2.0 + Math.sin(t * 1.5) * 0.6;
    }
    if (glowRef2.current) {
      glowRef2.current.intensity = 1.2 + Math.sin(t * 0.8 + 1) * 0.4;
    }
    // Subtle screen flicker for realism
    if (screenRef.current) {
      const mat = screenRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.8 + Math.sin(t * 30) * 0.02 + Math.sin(t * 1.2) * 0.15;
    }
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Outer bezel — thick dark metal frame */}
      <mesh>
        <boxGeometry args={[width + 0.12, height + 0.12, 0.06]} />
        <meshStandardMaterial color="#050505" roughness={0.08} metalness={0.9} />
      </mesh>
      {/* Inner bezel rim — subtle silver edge */}
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[width + 0.04, height + 0.04, 0.02]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.1} metalness={0.85} />
      </mesh>

      {/* ═══ MAIN LED SURFACE — bright emissive ═══ */}
      <mesh ref={screenRef} position={[0, 0, 0.031]}>
        <boxGeometry args={[width, height, 0.004]} />
        <meshStandardMaterial
          color="#0d1a0d"
          emissive="#1a4a20"
          emissiveIntensity={1.8}
          roughness={0.02}
          metalness={0.05}
        />
      </mesh>

      {/* LED backlight bloom layer */}
      <mesh position={[0, 0, 0.033]}>
        <planeGeometry args={[width * 0.98, height * 0.98]} />
        <meshStandardMaterial
          color="#000"
          emissive="#2a6030"
          emissiveIntensity={0.8}
          transparent
          opacity={0.4}
          roughness={0}
        />
      </mesh>

      {/* Scrolling logo — high brightness, sharp rendering */}
      <Html
        position={[0, 0.05, 0.036]}
        center
        transform
        scale={width * 0.035}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          width: `${Math.round(width * 28)}px`,
          height: `${Math.round(height * 28)}px`,
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(ellipse at center, rgba(30,80,40,0.6) 0%, rgba(5,15,8,0.95) 70%)',
          borderRadius: '2px',
        }}>
          {/* Pixel grid overlay for LED texture */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
            backgroundImage: `
              linear-gradient(0deg, rgba(0,0,0,0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)
            `,
            backgroundSize: '3px 3px',
            mixBlendMode: 'multiply',
          }} />
          {/* Scan line effect */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none',
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)',
          }} />
          {/* Bright vignette glow */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at center, rgba(120,220,100,0.15) 0%, transparent 60%)',
          }} />

          {/* Scrolling logo */}
          <div style={{
            display: 'flex',
            gap: `${Math.round(width * 12)}px`,
            alignItems: 'center',
            animation: 'led-scroll 14s linear infinite',
            whiteSpace: 'nowrap',
            zIndex: 4,
          }}>
            {[0, 1, 2].map(i => (
              <img
                key={i}
                src={logoNatleva}
                alt=""
                style={{
                  height: `${Math.round(height * 16)}px`,
                  objectFit: 'contain',
                  filter: 'brightness(2.5) contrast(1.1) drop-shadow(0 0 30px rgba(120,220,100,0.9)) drop-shadow(0 0 60px rgba(100,200,80,0.6)) drop-shadow(0 0 100px rgba(201,169,110,0.5))',
                  flexShrink: 0,
                  imageRendering: 'auto',
                }}
              />
            ))}
          </div>
          <style>{`
            @keyframes led-scroll {
              0%   { transform: translateX(30%); }
              100% { transform: translateX(-70%); }
            }
          `}</style>
        </div>
      </Html>

      {/* "Viagens Exclusivas" tagline — ultra bright neon */}
      <Html
        position={[0, -height / 2 + 0.15, 0.036]}
        center
        transform
        scale={width * 0.04}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          fontSize: '12px', fontWeight: 700, letterSpacing: '8px',
          color: '#ffd700', fontFamily: 'Space Grotesk, sans-serif',
          whiteSpace: 'nowrap', textTransform: 'uppercase',
          textShadow: `
            0 0 10px rgba(255,215,0,1),
            0 0 25px rgba(255,215,0,0.8),
            0 0 50px rgba(201,169,110,0.6),
            0 0 80px rgba(201,169,110,0.3)
          `,
          animation: 'led-tagline-glow 2.5s ease-in-out infinite',
        }}>
          Viagens Exclusivas
        </div>
        <style>{`
          @keyframes led-tagline-glow {
            0%, 100% { opacity: 0.9; filter: brightness(1); }
            50%      { opacity: 1; filter: brightness(1.3); }
          }
        `}</style>
      </Html>

      {/* ═══ LED EDGE LIGHTING — bright accent strips ═══ */}
      {/* Top strip */}
      <mesh position={[0, height / 2 + 0.015, 0.035]}>
        <boxGeometry args={[width + 0.02, 0.025, 0.012]} />
        <meshStandardMaterial color="#c9a96e" emissive="#ffd700" emissiveIntensity={2.5} metalness={0.6} roughness={0.05} />
      </mesh>
      {/* Bottom strip */}
      <mesh position={[0, -height / 2 - 0.015, 0.035]}>
        <boxGeometry args={[width + 0.02, 0.025, 0.012]} />
        <meshStandardMaterial color="#c9a96e" emissive="#ffd700" emissiveIntensity={2.5} metalness={0.6} roughness={0.05} />
      </mesh>
      {/* Left strip */}
      <mesh position={[-width / 2 - 0.015, 0, 0.035]}>
        <boxGeometry args={[0.025, height + 0.02, 0.012]} />
        <meshStandardMaterial color="#4a8a4a" emissive="#4aff4a" emissiveIntensity={1.5} metalness={0.5} roughness={0.05} />
      </mesh>
      {/* Right strip */}
      <mesh position={[width / 2 + 0.015, 0, 0.035]}>
        <boxGeometry args={[0.025, height + 0.02, 0.012]} />
        <meshStandardMaterial color="#4a8a4a" emissive="#4aff4a" emissiveIntensity={1.5} metalness={0.5} roughness={0.05} />
      </mesh>

      {/* ═══ POWERFUL SCREEN GLOW LIGHTS ═══ */}
      <pointLight ref={glowRef} position={[0, 0, 2.0]} intensity={2.0} color="#3a7a3a" distance={7} decay={2} />
      <pointLight ref={glowRef2} position={[0, 0.3, 1.5]} intensity={1.2} color="#50aa50" distance={5} decay={2} />
      <pointLight position={[-width / 3, -0.2, 0.8]} intensity={0.6} color="#c9a96e" distance={3.5} decay={2} />
      <pointLight position={[width / 3, -0.2, 0.8]} intensity={0.6} color="#c9a96e" distance={3.5} decay={2} />
      {/* Center bloom light */}
      <spotLight
        position={[0, 0, 1.0]}
        target-position={[0, 0, -1]}
        angle={0.6}
        penumbra={0.8}
        intensity={1.5}
        color="#2a5a2a"
        distance={6}
        decay={2}
      />
    </group>
  );
}

/* ── Floor Logo — large emblem on ground ─────── */
function FloorLogo({ position }: { position: [number, number, number] }) {
  const texture = useLoader(THREE.TextureLoader, logoNatleva);
  const size = 2.8;
  const logoAspect = 3.2;

  return (
    <group position={position}>
      {/* Decorative ring */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, 0]}>
        <ringGeometry args={[size * 0.48, size * 0.52, 48]} />
        <meshStandardMaterial color="#c9a96e" transparent opacity={0.25} roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Inner circle background */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.007, 0]}>
        <circleGeometry args={[size * 0.47, 48]} />
        <meshStandardMaterial color="#0a1420" transparent opacity={0.12} roughness={0.9} />
      </mesh>
      {/* Logo texture on floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.009, 0]}>
        <planeGeometry args={[size * 0.7, size * 0.7 / logoAspect]} />
        <meshStandardMaterial
          map={texture}
          transparent
          opacity={0.35}
          roughness={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Outer decorative ring */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, 0]}>
        <ringGeometry args={[size * 0.53, size * 0.56, 48]} />
        <meshStandardMaterial color="#c9a96e" transparent opacity={0.12} roughness={0.5} metalness={0.4} />
      </mesh>
    </group>
  );
}

function NatLevaBranding() {
  const hw = FLOOR_SIZE.w / 2;
  const hh = FLOOR_SIZE.h / 2;

  return (
    <group>
      {/* ═══ NORTH WALL — Main hero logo, big and centered ═══ */}
      <LogoTexturePanel position={[0, 1.3, -hh + 0.08]} rotationY={0} width={6.0} height={1.8} />
      <CyclingTV position={[-7.2, 1.2, -hh + 0.09]} rotationY={0} offset={0} />
      <CyclingTV position={[7.2, 1.2, -hh + 0.09]} rotationY={0} offset={3} />

      {/* ═══ SOUTH WALL ═══ */}
      <LogoTexturePanel position={[0, 1.3, hh - 0.08]} rotationY={Math.PI} width={4.5} height={1.4} />
      <CyclingTV position={[-6, 1.2, hh - 0.09]} rotationY={Math.PI} offset={1} />
      <CyclingTV position={[6, 1.2, hh - 0.09]} rotationY={Math.PI} offset={4} />

      {/* ═══ EAST WALL ═══ */}
      <LogoTexturePanel position={[hw - 0.08, 1.3, -1]} rotationY={-Math.PI / 2} width={3.5} height={1.2} />
      <CyclingTV position={[hw - 0.09, 1.2, 2.5]} rotationY={-Math.PI / 2} offset={2} />

      {/* ═══ WEST WALL ═══ */}
      <LogoTexturePanel position={[-hw + 0.08, 1.3, -1]} rotationY={Math.PI / 2} width={3.5} height={1.2} />
      <CyclingTV position={[-hw + 0.09, 1.2, 2.5]} rotationY={Math.PI / 2} offset={5} />

      {/* ═══ FLOOR LOGOS ═══ */}
      {/* Main entrance floor logo */}
      <FloorLogo position={[0, 0, 3.2]} />
      {/* Center of office */}
      <FloorLogo position={[0, 0, -1.0]} />

      {/* ═══ DECORATIONS ═══ */}
      {/* Globe */}
      <group position={[-hw + 0.3, 0.7, -2]}>
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
      <group position={[-hw + 0.35, 0, 1]}>
        <mesh position={[0, 0.18, 0]} castShadow>
          <boxGeometry args={[0.28, 0.35, 0.14]} />
          <meshStandardMaterial color="#8b4513" roughness={0.7} metalness={0.05} />
        </mesh>
        <mesh position={[0, 0.38, 0]}>
          <boxGeometry args={[0.08, 0.03, 0.04]} />
          <meshStandardMaterial color="#5a3a1a" roughness={0.5} metalness={0.2} />
        </mesh>
      </group>
      <group position={[-hw + 0.55, 0, 1.1]}>
        <mesh position={[0, 0.12, 0]} castShadow>
          <boxGeometry args={[0.22, 0.24, 0.12]} />
          <meshStandardMaterial color="#2c5f7a" roughness={0.6} metalness={0.08} />
        </mesh>
      </group>

      {/* Airplane on reception */}
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
          <meshStandardMaterial color="#1a5a30" roughness={0.3} metalness={0.3} />
        </mesh>
      </group>
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
      {/* Whiteboard removed */}
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
