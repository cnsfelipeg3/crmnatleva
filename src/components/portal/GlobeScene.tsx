import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Sphere, Line, Html } from "@react-three/drei";
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

function createArcPoints(start: THREE.Vector3, end: THREE.Vector3, segments = 64, altitude = 0.15): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = new THREE.Vector3().lerpVectors(start, end, t);
    const elevation = 1 + altitude * Math.sin(Math.PI * t);
    point.normalize().multiplyScalar(1.01 * elevation);
  }
  // Recalculate properly
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const mid = new THREE.Vector3().lerpVectors(start, end, t);
    const len = mid.length();
    const elevation = 1 + altitude * Math.sin(Math.PI * t);
    mid.normalize().multiplyScalar(len * elevation);
    pts.push(mid);
  }
  return pts;
}

/* ═══ Globe Sphere ═══ */
function GlobeMesh() {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <group>
      {/* Main sphere - dark with grid */}
      <Sphere ref={meshRef} args={[1, 64, 64]}>
        <meshStandardMaterial
          color="#0a1628"
          roughness={0.9}
          metalness={0.1}
          transparent
          opacity={0.95}
        />
      </Sphere>
      {/* Wireframe overlay */}
      <Sphere args={[1.002, 32, 32]}>
        <meshBasicMaterial
          color="#1a3a5c"
          wireframe
          transparent
          opacity={0.08}
        />
      </Sphere>
      {/* Atmosphere glow */}
      <Sphere args={[1.04, 32, 32]}>
        <meshBasicMaterial
          color="#22c55e"
          transparent
          opacity={0.03}
          side={THREE.BackSide}
        />
      </Sphere>
      <Sphere args={[1.08, 32, 32]}>
        <meshBasicMaterial
          color="#22c55e"
          transparent
          opacity={0.015}
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  );
}

/* ═══ Destination Marker ═══ */
function DestMarker({ lat, lng, label, isActive, onClick }: {
  lat: number; lng: number; label: string; isActive?: boolean; onClick?: () => void;
}) {
  const pos = useMemo(() => latLngToVec3(lat, lng, 1.015), [lat, lng]);
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (ref.current) {
      const scale = 1 + 0.15 * Math.sin(clock.getElapsedTime() * 2 + lat);
      ref.current.scale.setScalar(isActive ? scale * 1.3 : scale);
    }
  });

  return (
    <group position={pos}>
      <mesh
        ref={ref}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      >
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshBasicMaterial
          color={isActive ? "#22c55e" : "#4ade80"}
          transparent
          opacity={hovered ? 1 : 0.8}
        />
      </mesh>
      {/* Glow ring */}
      <mesh>
        <ringGeometry args={[0.025, 0.04, 32]} />
        <meshBasicMaterial
          color="#22c55e"
          transparent
          opacity={isActive ? 0.5 : 0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      {hovered && (
        <Html distanceFactor={3} center style={{ pointerEvents: "none" }}>
          <div className="bg-black/80 backdrop-blur-xl text-white text-[11px] font-bold px-3 py-1.5 rounded-lg border border-white/10 whitespace-nowrap shadow-xl">
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

/* ═══ Route Arc ═══ */
function RouteArc({ from, to, color = "#22c55e", animated = true }: {
  from: [number, number]; to: [number, number]; color?: string; animated?: boolean;
}) {
  const start = useMemo(() => latLngToVec3(from[0], from[1], 1.01), [from]);
  const end = useMemo(() => latLngToVec3(to[0], to[1], 1.01), [to]);
  const points = useMemo(() => createArcPoints(start, end, 64, 0.12), [start, end]);
  const [progress, setProgress] = useState(animated ? 0 : 1);

  useEffect(() => {
    if (!animated) return;
    let frame: number;
    let start = performance.now();
    const duration = 2000;
    const animate = (now: number) => {
      const elapsed = now - start;
      setProgress(Math.min(1, elapsed / duration));
      if (elapsed < duration) frame = requestAnimationFrame(animate);
    };
    // Delay start
    const timeout = setTimeout(() => {
      start = performance.now();
      frame = requestAnimationFrame(animate);
    }, 800);
    return () => { clearTimeout(timeout); cancelAnimationFrame(frame); };
  }, [animated]);

  const visiblePoints = useMemo(() => {
    const count = Math.max(2, Math.floor(points.length * progress));
    return points.slice(0, count);
  }, [points, progress]);

  if (visiblePoints.length < 2) return null;

  return (
    <Line
      points={visiblePoints}
      color={color}
      lineWidth={1.5}
      transparent
      opacity={0.7}
    />
  );
}

/* ═══ Scene Content ═══ */
function SceneContent({ routes, onMarkerClick }: {
  routes: Array<{ cities: string[]; status: "active" | "upcoming" | "past"; saleId: string; label: string }>;
  onMarkerClick?: (saleId: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0008;
    }
  });

  // Collect unique markers
  const markers = useMemo(() => {
    const map = new Map<string, { lat: number; lng: number; label: string; isActive: boolean; saleId: string }>();
    routes.forEach((route) => {
      route.cities.forEach((iata) => {
        const coord = COORDS[iata];
        if (coord && !map.has(iata)) {
          map.set(iata, {
            lat: coord[0], lng: coord[1],
            label: iata,
            isActive: route.status === "active",
            saleId: route.saleId,
          });
        }
      });
    });
    return Array.from(map.values());
  }, [routes]);

  // Collect route arcs
  const arcs = useMemo(() => {
    const result: Array<{ from: [number, number]; to: [number, number]; color: string; animated: boolean }> = [];
    routes.forEach((route) => {
      const colorMap = { active: "#22c55e", upcoming: "#4ade80", past: "#1a5c3a" };
      for (let i = 0; i < route.cities.length - 1; i++) {
        const fromCoord = COORDS[route.cities[i]];
        const toCoord = COORDS[route.cities[i + 1]];
        if (fromCoord && toCoord) {
          result.push({
            from: fromCoord, to: toCoord,
            color: colorMap[route.status] || "#22c55e",
            animated: route.status !== "past",
          });
        }
      }
    });
    return result;
  }, [routes]);

  return (
    <group ref={groupRef}>
      <GlobeMesh />
      {markers.map((m, i) => (
        <DestMarker
          key={`${m.label}-${i}`}
          lat={m.lat} lng={m.lng}
          label={m.label}
          isActive={m.isActive}
          onClick={() => onMarkerClick?.(m.saleId)}
        />
      ))}
      {arcs.map((arc, i) => (
        <RouteArc key={i} from={arc.from} to={arc.to} color={arc.color} animated={arc.animated} />
      ))}
    </group>
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
        camera={{ position: [0, 0, 2.8], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 3, 5]} intensity={0.5} color="#ffffff" />
        <pointLight position={[-5, -3, -5]} intensity={0.15} color="#22c55e" />
        <SceneContent routes={routes} onMarkerClick={onMarkerClick} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          rotateSpeed={0.3}
          autoRotate={false}
          minPolarAngle={Math.PI * 0.25}
          maxPolarAngle={Math.PI * 0.75}
        />
      </Canvas>
    </div>
  );
}
