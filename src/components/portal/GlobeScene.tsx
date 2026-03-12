import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Sphere, Line, Html, Stars } from "@react-three/drei";
import * as THREE from "three";

/* ═══ IATA → lat/lng mapping ═══ */
const COORDS: Record<string, [number, number]> = {
  GRU: [-23.43, -46.47], CGH: [-23.63, -46.66],
  MCO: [28.43, -81.31], MIA: [25.79, -80.29], JFK: [40.64, -73.78],
  LAX: [33.94, -118.41], SFO: [37.62, -122.38], ORD: [41.97, -87.91],
  LIS: [38.77, -9.13], CDG: [49.01, 2.55], FCO: [41.80, 12.25],
  LHR: [51.47, -0.46], BCN: [41.30, 2.08], MAD: [40.47, -3.57],
  CUN: [21.04, -86.87], EZE: [-34.82, -58.54], SCL: [-33.39, -70.79],
  BOG: [4.70, -74.15], LIM: [-12.02, -77.11], MEX: [19.44, -99.07],
  NRT: [35.76, 140.39], DXB: [25.25, 55.36], SIN: [1.36, 103.99],
  SYD: [-33.95, 151.18], CPT: [-33.96, 18.60], CAI: [30.12, 31.41],
  AMS: [52.31, 4.76], MUC: [48.35, 11.79], ZRH: [47.46, 8.55],
  FLN: [-27.67, -48.55], SSA: [-12.91, -38.33], BSB: [-15.87, -47.92],
  REC: [-8.13, -34.92], POA: [-29.99, -51.17], CNF: [-19.63, -43.97],
  GIG: [-22.81, -43.25], SDU: [-22.91, -43.16],
};

function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function createArcPoints(from: [number, number], to: [number, number], segments = 80, altitude = 0.18): THREE.Vector3[] {
  const start = latLngToVec3(from[0], from[1], 1.005);
  const end = latLngToVec3(to[0], to[1], 1.005);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const mid = new THREE.Vector3().lerpVectors(start, end, t);
    const elevation = 1 + altitude * Math.sin(Math.PI * t);
    mid.normalize().multiplyScalar(mid.length() * elevation);
    pts.push(mid);
  }
  return pts;
}

/* ═══ Earth Texture Sphere (NASA-style) ═══ */
function EarthSphere() {
  const earthRef = useRef<THREE.Mesh>(null);

  // Create a procedural continent-like texture with canvas
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;

    // Ocean base - deep dark blue
    ctx.fillStyle = "#050d1a";
    ctx.fillRect(0, 0, 1024, 512);

    // Draw simplified continents with subtle fill
    ctx.fillStyle = "#0c1f35";
    ctx.strokeStyle = "#1a4a6e";
    ctx.lineWidth = 0.8;

    // Helper to draw a continent blob
    const blob = (points: [number, number][]) => {
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        const xc = (points[i][0] + points[i - 1][0]) / 2;
        const yc = (points[i][1] + points[i - 1][1]) / 2;
        ctx.quadraticCurveTo(points[i - 1][0], points[i - 1][1], xc, yc);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    // North America
    blob([[170, 60], [200, 50], [280, 55], [320, 80], [310, 120], [280, 140], [260, 160], [230, 180], [200, 170], [180, 140], [165, 100]]);
    // South America
    blob([[280, 210], [310, 200], [340, 220], [350, 270], [340, 330], [320, 370], [290, 360], [270, 310], [265, 260]]);
    // Europe
    blob([[480, 60], [520, 50], [560, 55], [570, 80], [550, 110], [530, 120], [500, 115], [480, 100], [475, 80]]);
    // Africa
    blob([[480, 140], [530, 130], [570, 150], [590, 200], [580, 270], [560, 330], [520, 350], [490, 310], [470, 250], [465, 190]]);
    // Asia
    blob([[560, 40], [620, 35], [700, 40], [780, 55], [820, 80], [800, 120], [750, 140], [700, 150], [650, 130], [600, 110], [570, 80]]);
    // Australia
    blob([[770, 270], [830, 260], [860, 280], [850, 320], [810, 340], [770, 330], [755, 300]]);

    // Add grid lines (lat/lng)
    ctx.strokeStyle = "#0a2240";
    ctx.lineWidth = 0.3;
    for (let lat = 0; lat < 512; lat += 512 / 12) {
      ctx.beginPath();
      ctx.moveTo(0, lat);
      ctx.lineTo(1024, lat);
      ctx.stroke();
    }
    for (let lng = 0; lng < 1024; lng += 1024 / 24) {
      ctx.beginPath();
      ctx.moveTo(lng, 0);
      ctx.lineTo(lng, 512);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, []);

  return (
    <group>
      {/* Main Earth */}
      <Sphere ref={earthRef} args={[1, 96, 96]}>
        <meshStandardMaterial
          map={texture}
          roughness={0.85}
          metalness={0.05}
          emissive="#0a1628"
          emissiveIntensity={0.15}
        />
      </Sphere>
      {/* Atmosphere inner glow */}
      <Sphere args={[1.015, 64, 64]}>
        <meshBasicMaterial
          color="#22c55e"
          transparent
          opacity={0.012}
        />
      </Sphere>
      {/* Atmosphere outer glow */}
      <Sphere args={[1.06, 48, 48]}>
        <meshBasicMaterial
          color="#22c55e"
          transparent
          opacity={0.04}
          side={THREE.BackSide}
        />
      </Sphere>
      <Sphere args={[1.12, 48, 48]}>
        <meshBasicMaterial
          color="#1a8a4a"
          transparent
          opacity={0.02}
          side={THREE.BackSide}
        />
      </Sphere>
      <Sphere args={[1.25, 32, 32]}>
        <meshBasicMaterial
          color="#0d4a2a"
          transparent
          opacity={0.008}
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  );
}

/* ═══ Destination Marker (NASA-style) ═══ */
function DestMarker({ lat, lng, label, isActive, onClick }: {
  lat: number; lng: number; label: string; isActive?: boolean; onClick?: () => void;
}) {
  const pos = useMemo(() => latLngToVec3(lat, lng, 1.012), [lat, lng]);
  const ref = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ref.current) {
      const scale = 1 + 0.2 * Math.sin(t * 2.5 + lat);
      ref.current.scale.setScalar(isActive ? scale * 1.4 : scale);
    }
    if (ringRef.current) {
      ringRef.current.scale.setScalar(1 + 0.3 * Math.sin(t * 1.5 + lng));
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity =
        (isActive ? 0.4 : 0.15) * (0.7 + 0.3 * Math.sin(t * 2 + lat));
    }
  });

  return (
    <group position={pos}>
      {/* Core dot */}
      <mesh
        ref={ref}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      >
        <sphereGeometry args={[0.018, 16, 16]} />
        <meshBasicMaterial
          color={isActive ? "#22c55e" : "#4ade80"}
          transparent
          opacity={hovered ? 1 : 0.9}
        />
      </mesh>
      {/* Animated pulse ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.03, 0.045, 32]} />
        <meshBasicMaterial
          color="#22c55e"
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Vertical beam */}
      {isActive && (
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.002, 0.002, 0.08, 8]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.3} />
        </mesh>
      )}
      {/* Hover tooltip */}
      {hovered && (
        <Html distanceFactor={3} center style={{ pointerEvents: "none" }}>
          <div className="bg-[#0a1628]/95 backdrop-blur-xl text-white text-[11px] font-bold px-4 py-2 rounded-xl border border-[#22c55e]/20 whitespace-nowrap shadow-2xl shadow-[#22c55e]/10">
            <span className="text-[#4ade80] font-mono tracking-widest mr-1.5">{label}</span>
          </div>
        </Html>
      )}
    </group>
  );
}

/* ═══ Aircraft on Route ═══ */
function Aircraft({ arcPoints, speed = 0.15, delay = 1.5 }: {
  arcPoints: THREE.Vector3[]; speed?: number; delay?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Points>(null);
  const [started, setStarted] = useState(false);
  const progressRef = useRef(0);
  const trailPositions = useRef(new Float32Array(30 * 3)); // 30 trail particles

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay * 1000);
    return () => clearTimeout(t);
  }, [delay]);

  useFrame((_, delta) => {
    if (!started || !meshRef.current || arcPoints.length < 2) return;

    progressRef.current += delta * speed;
    if (progressRef.current > 1) progressRef.current = 0; // loop

    const totalLen = arcPoints.length - 1;
    const exactIdx = progressRef.current * totalLen;
    const idx = Math.floor(exactIdx);
    const frac = exactIdx - idx;

    const curr = arcPoints[Math.min(idx, totalLen)];
    const next = arcPoints[Math.min(idx + 1, totalLen)];
    const pos = new THREE.Vector3().lerpVectors(curr, next, frac);
    meshRef.current.position.copy(pos);

    // Orient aircraft along route
    if (idx < totalLen - 1) {
      const dir = new THREE.Vector3().subVectors(next, curr).normalize();
      const up = pos.clone().normalize();
      const right = new THREE.Vector3().crossVectors(dir, up).normalize();
      const correctedUp = new THREE.Vector3().crossVectors(right, dir).normalize();
      const m = new THREE.Matrix4().makeBasis(right, correctedUp, dir.negate());
      meshRef.current.setRotationFromMatrix(m);
    }

    // Trail particles
    if (trailRef.current) {
      const positions = trailPositions.current;
      // Shift trail
      for (let i = positions.length - 3; i >= 3; i -= 3) {
        positions[i] = positions[i - 3];
        positions[i + 1] = positions[i - 2];
        positions[i + 2] = positions[i - 1];
      }
      positions[0] = pos.x;
      positions[1] = pos.y;
      positions[2] = pos.z;
      trailRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  if (arcPoints.length < 2) return null;

  return (
    <group>
      {/* Aircraft body - simple elegant cone */}
      <mesh ref={meshRef} scale={0.012}>
        <coneGeometry args={[0.6, 2.5, 4]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </mesh>
      {/* Trail particles */}
      <points ref={trailRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[trailPositions.current, 3]}
            count={30}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#22c55e"
          size={0.004}
          transparent
          opacity={0.4}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

/* ═══ Animated Route Arc ═══ */
function RouteArc({ from, to, color = "#22c55e", animated = true, showAircraft = false, delay = 0.8 }: {
  from: [number, number]; to: [number, number]; color?: string; animated?: boolean;
  showAircraft?: boolean; delay?: number;
}) {
  const points = useMemo(() => createArcPoints(from, to, 80, 0.15), [from, to]);
  const [progress, setProgress] = useState(animated ? 0 : 1);

  useEffect(() => {
    if (!animated) return;
    let frame: number;
    let startTime = performance.now();
    const duration = 2500;
    const run = (now: number) => {
      const elapsed = now - startTime;
      setProgress(Math.min(1, elapsed / duration));
      if (elapsed < duration) frame = requestAnimationFrame(run);
    };
    const timeout = setTimeout(() => {
      startTime = performance.now();
      frame = requestAnimationFrame(run);
    }, delay * 1000);
    return () => { clearTimeout(timeout); cancelAnimationFrame(frame); };
  }, [animated, delay]);

  const visiblePoints = useMemo(() => {
    const count = Math.max(2, Math.floor(points.length * progress));
    return points.slice(0, count);
  }, [points, progress]);

  if (visiblePoints.length < 2) return null;

  return (
    <group>
      {/* Main route line */}
      <Line
        points={visiblePoints}
        color={color}
        lineWidth={2}
        transparent
        opacity={0.6}
      />
      {/* Route glow (thicker, more transparent) */}
      <Line
        points={visiblePoints}
        color={color}
        lineWidth={5}
        transparent
        opacity={0.12}
      />
      {/* Aircraft */}
      {showAircraft && progress >= 0.1 && (
        <Aircraft arcPoints={points} speed={0.08} delay={0} />
      )}
    </group>
  );
}

/* ═══ Camera Intro Animation ═══ */
function CameraIntro() {
  const { camera } = useThree();
  const [phase, setPhase] = useState<"far" | "approach" | "orbit">("far");
  const elapsed = useRef(0);

  useEffect(() => {
    camera.position.set(0, 1.5, 5);
    camera.lookAt(0, 0, 0);
    setTimeout(() => setPhase("approach"), 100);
    setTimeout(() => setPhase("orbit"), 2500);
  }, [camera]);

  useFrame((_, delta) => {
    elapsed.current += delta;
    if (phase === "approach") {
      camera.position.lerp(new THREE.Vector3(0, 0.4, 2.8), delta * 1.5);
      camera.lookAt(0, 0, 0);
    } else if (phase === "orbit") {
      camera.position.lerp(new THREE.Vector3(0, 0.3, 2.6), delta * 0.5);
    }
  });

  return null;
}

/* ═══ Scene Content ═══ */
function SceneContent({ routes, onMarkerClick }: {
  routes: Array<{ cities: string[]; status: "active" | "upcoming" | "past"; saleId: string; label: string }>;
  onMarkerClick?: (saleId: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0006;
    }
  });

  const markers = useMemo(() => {
    const map = new Map<string, { lat: number; lng: number; label: string; isActive: boolean; saleId: string }>();
    routes.forEach((route) => {
      route.cities.forEach((iata) => {
        const coord = COORDS[iata];
        if (coord && !map.has(iata)) {
          map.set(iata, {
            lat: coord[0], lng: coord[1], label: iata,
            isActive: route.status === "active" || route.status === "upcoming",
            saleId: route.saleId,
          });
        }
      });
    });
    return Array.from(map.values());
  }, [routes]);

  const arcs = useMemo(() => {
    const result: Array<{ from: [number, number]; to: [number, number]; color: string; animated: boolean; showAircraft: boolean; delay: number }> = [];
    let arcIndex = 0;
    routes.forEach((route) => {
      const colorMap: Record<string, string> = { active: "#22c55e", upcoming: "#4ade80", past: "#0d3a1e" };
      for (let i = 0; i < route.cities.length - 1; i++) {
        const fromCoord = COORDS[route.cities[i]];
        const toCoord = COORDS[route.cities[i + 1]];
        if (fromCoord && toCoord) {
          result.push({
            from: fromCoord, to: toCoord,
            color: colorMap[route.status] || "#22c55e",
            animated: route.status !== "past",
            showAircraft: route.status === "upcoming" || route.status === "active",
            delay: 1.2 + arcIndex * 0.6,
          });
          arcIndex++;
        }
      }
    });
    return result;
  }, [routes]);

  return (
    <>
      <CameraIntro />
      <Stars radius={100} depth={80} count={1500} factor={2} saturation={0} fade speed={0.3} />

      <group ref={groupRef}>
        <EarthSphere />
        {markers.map((m, i) => (
          <DestMarker
            key={`${m.label}-${i}`}
            lat={m.lat} lng={m.lng} label={m.label}
            isActive={m.isActive}
            onClick={() => onMarkerClick?.(m.saleId)}
          />
        ))}
        {arcs.map((arc, i) => (
          <RouteArc
            key={i}
            from={arc.from} to={arc.to}
            color={arc.color}
            animated={arc.animated}
            showAircraft={arc.showAircraft}
            delay={arc.delay}
          />
        ))}
      </group>
    </>
  );
}

/* ═══ Main Export ═══ */
export interface GlobeRoute {
  cities: string[];
  status: "active" | "upcoming" | "past";
  saleId: string;
  label: string;
}

export default function GlobeScene({ routes, onMarkerClick, className }: {
  routes: GlobeRoute[];
  onMarkerClick?: (saleId: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 1.5, 5], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.2} />
        <directionalLight position={[5, 3, 5]} intensity={0.6} color="#e0f0ff" />
        <directionalLight position={[-3, -2, -4]} intensity={0.15} color="#22c55e" />
        <pointLight position={[2, 4, 2]} intensity={0.3} color="#ffffff" distance={10} />
        <SceneContent routes={routes} onMarkerClick={onMarkerClick} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          rotateSpeed={0.25}
          autoRotate={false}
          minPolarAngle={Math.PI * 0.2}
          maxPolarAngle={Math.PI * 0.8}
        />
      </Canvas>
    </div>
  );
}
