/**
 * Funil 3D Vivo — NatLeva
 * React Three Fiber funnel with particle leads flowing through stages.
 */
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Float, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, Target, Flame, Trophy, Pause, Play, Eye, Sparkles, AlertTriangle } from "lucide-react";

// ─── STAGE DATA ───
interface Stage3D {
  id: string;
  label: string;
  emoji: string;
  agent: string;
  color: string;
  hex: string;
}

const STAGES: Stage3D[] = [
  { id: "recepcao", label: "Recepção", emoji: "🌟", agent: "MAYA", color: "hsl(45 93% 58%)", hex: "#eab308" },
  { id: "qualificacao", label: "Qualificação", emoji: "🔍", agent: "ATLAS", color: "hsl(210 100% 56%)", hex: "#3b82f6" },
  { id: "especialista", label: "Especialista", emoji: "🎯", agent: "ÓRION", color: "hsl(280 80% 60%)", hex: "#a855f7" },
  { id: "proposta", label: "Proposta", emoji: "💎", agent: "LUNA", color: "hsl(160 60% 45%)", hex: "#10b981" },
  { id: "negociacao", label: "Negociação", emoji: "🤝", agent: "NERO", color: "hsl(32 95% 55%)", hex: "#f97316" },
  { id: "fechamento", label: "Fechamento", emoji: "🏆", agent: "NERO", color: "hsl(142 71% 45%)", hex: "#22c55e" },
  { id: "pos_venda", label: "Pós-venda", emoji: "✨", agent: "IRIS", color: "hsl(340 75% 55%)", hex: "#f43e5e" },
];

// ─── PARTICLE TYPE ───
interface Particle {
  id: number;
  stageIdx: number;
  targetStageIdx: number;
  progress: number; // 0-1 within transition
  speed: number;
  offsetX: number;
  offsetZ: number;
  stuck: boolean;
  color: THREE.Color;
}

// ─── FUNNEL RING ───
function FunnelRing({ y, radiusTop, radiusBottom, height, color, count, label, agent, isBottleneck, opacity }: {
  y: number; radiusTop: number; radiusBottom: number; height: number;
  color: string; count: number; label: string; agent: string;
  isBottleneck: boolean; opacity: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (glowRef.current && isBottleneck) {
      glowRef.current.rotation.y += delta * 0.5;
      const scale = 1 + Math.sin(Date.now() * 0.003) * 0.03;
      glowRef.current.scale.set(scale, 1, scale);
    }
  });

  return (
    <group position={[0, y, 0]}>
      {/* Main ring */}
      <mesh ref={meshRef}>
        <cylinderGeometry args={[radiusTop, radiusBottom, height, 48, 1, true]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          emissive={color}
          emissiveIntensity={isBottleneck ? 0.4 : 0.1}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>

      {/* Glow ring for bottleneck */}
      {isBottleneck && (
        <mesh ref={glowRef} position={[0, 0, 0]}>
          <torusGeometry args={[(radiusTop + radiusBottom) / 2, 0.05, 8, 48]} />
          <meshBasicMaterial color="#ff4444" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Label */}
      <Text
        position={[(radiusTop + radiusBottom) / 2 + 0.6, 0, 0]}
        fontSize={0.18}
        color="white"
        anchorX="left"
        anchorY="middle"
        font={undefined}
      >
        {`${label}  (${count})`}
      </Text>

      {/* Agent badge */}
      <Text
        position={[(radiusTop + radiusBottom) / 2 + 0.6, -0.22, 0]}
        fontSize={0.12}
        color="#94a3b8"
        anchorX="left"
        anchorY="middle"
        font={undefined}
      >
        {agent}
      </Text>
    </group>
  );
}

// ─── PARTICLE SYSTEM (instanced) ───
function ParticleSystem({ particles, stageYPositions, stageRadii }: {
  particles: Particle[];
  stageYPositions: number[];
  stageRadii: number[];
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorArray = useMemo(() => new Float32Array(500 * 3), []);

  useFrame(() => {
    if (!meshRef.current) return;
    const count = Math.min(particles.length, 500);

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      const fromY = stageYPositions[p.stageIdx] ?? 0;
      const toY = stageYPositions[p.targetStageIdx] ?? fromY;
      const fromR = stageRadii[p.stageIdx] ?? 1;
      const toR = stageRadii[p.targetStageIdx] ?? fromR;

      const y = THREE.MathUtils.lerp(fromY, toY, p.progress);
      const r = THREE.MathUtils.lerp(fromR, toR, p.progress) * 0.7;

      const angle = (p.id * 2.399) + Date.now() * 0.0003 * (p.stuck ? 0.1 : 1);
      const radius = r * (0.3 + p.offsetX * 0.6);

      dummy.position.set(
        Math.cos(angle) * radius + p.offsetZ * 0.1,
        y,
        Math.sin(angle) * radius + p.offsetX * 0.1
      );

      const s = p.stuck ? 0.04 : 0.055;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      p.color.toArray(colorArray, i * 3);
    }

    meshRef.current.count = count;
    meshRef.current.instanceMatrix.needsUpdate = true;
    (meshRef.current.geometry.attributes.color as any) && ((meshRef.current.geometry.attributes as any).color.needsUpdate = true);
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, 500]}>
      <sphereGeometry args={[1, 8, 8]}>
        <instancedBufferAttribute
          attach="attributes-color"
          args={[colorArray, 3]}
        />
      </sphereGeometry>
      <meshStandardMaterial
        vertexColors
        emissive="white"
        emissiveIntensity={0.3}
        transparent
        opacity={0.9}
        metalness={0.2}
        roughness={0.5}
      />
    </instancedMesh>
  );
}

// ─── CONVERSION BEAM (base glow) ───
function ConversionBeam() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y += 0.01;
      const s = 1 + Math.sin(Date.now() * 0.002) * 0.15;
      ref.current.scale.set(s, 1, s);
    }
  });
  return (
    <mesh ref={ref} position={[0, -4.8, 0]}>
      <torusGeometry args={[0.5, 0.08, 16, 32]} />
      <meshBasicMaterial color="#22c55e" transparent opacity={0.5} />
    </mesh>
  );
}

// ─── AMBIENT PARTICLES (floating dust) ───
function AmbientDust() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(200 * 3);
    for (let i = 0; i < 200; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 8;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 12;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.02;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.02} color="#475569" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

// ─── SCENE ───
function FunnelScene({ stageCounts, bottlenecks, paused }: {
  stageCounts: number[];
  bottlenecks: Set<number>;
  paused: boolean;
}) {
  const particlesRef = useRef<Particle[]>([]);
  const nextIdRef = useRef(0);
  const [renderTick, setRenderTick] = useState(0);

  // Funnel geometry
  const stageHeight = 1.1;
  const topRadius = 2.8;
  const bottomRadius = 0.6;

  const stageYPositions = useMemo(() =>
    STAGES.map((_, i) => 3.5 - i * stageHeight), []);

  const stageRadii = useMemo(() =>
    STAGES.map((_, i) => {
      const t = i / (STAGES.length - 1);
      return THREE.MathUtils.lerp(topRadius, bottomRadius, t);
    }), []);

  // Spawn & move particles
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      const particles = particlesRef.current;

      // Spawn 1-3 new particles at top
      const spawnCount = Math.floor(Math.random() * 3) + 1;
      for (let s = 0; s < spawnCount; s++) {
        if (particles.length < 400) {
          const stageColor = new THREE.Color(STAGES[0].hex);
          particles.push({
            id: nextIdRef.current++,
            stageIdx: 0,
            targetStageIdx: 0,
            progress: 0,
            speed: 0.02 + Math.random() * 0.03,
            offsetX: Math.random(),
            offsetZ: (Math.random() - 0.5) * 2,
            stuck: false,
            color: stageColor,
          });
        }
      }

      // Move particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const isBottleneck = bottlenecks.has(p.stageIdx);

        if (p.stageIdx === p.targetStageIdx) {
          // Idle in stage — decide to advance
          const advanceChance = isBottleneck ? 0.005 : 0.04;
          if (Math.random() < advanceChance && p.stageIdx < STAGES.length - 1) {
            p.targetStageIdx = p.stageIdx + 1;
            p.progress = 0;
            p.stuck = false;
          } else if (isBottleneck) {
            p.stuck = true;
          }
        } else {
          // Transitioning
          p.progress += p.speed * (isBottleneck ? 0.3 : 1);
          if (p.progress >= 1) {
            p.stageIdx = p.targetStageIdx;
            p.progress = 0;
            p.color = new THREE.Color(STAGES[p.stageIdx]?.hex || "#fff");
          }
        }

        // Remove converted
        if (p.stageIdx >= STAGES.length - 1 && Math.random() < 0.01) {
          particles.splice(i, 1);
        }
      }

      setRenderTick(t => t + 1);
    }, 80);

    return () => clearInterval(interval);
  }, [paused, bottlenecks]);

  // Count per stage
  const liveCounts = useMemo(() => {
    const counts = new Array(STAGES.length).fill(0);
    particlesRef.current.forEach(p => { counts[p.stageIdx]++; });
    return counts;
  }, [renderTick]);

  // Opacity based on heat
  const maxC = Math.max(...liveCounts, 1);

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} color="#e2e8f0" />
      <pointLight position={[0, 4, 0]} intensity={0.5} color="#eab308" distance={10} />
      <pointLight position={[0, -4, 0]} intensity={0.4} color="#22c55e" distance={8} />

      {/* Funnel rings */}
      {STAGES.map((stage, idx) => {
        const y = stageYPositions[idx];
        const rTop = stageRadii[idx];
        const rBot = stageRadii[Math.min(idx + 1, STAGES.length - 1)];
        const heat = liveCounts[idx] / maxC;
        const opacity = 0.12 + heat * 0.25;

        return (
          <FunnelRing
            key={stage.id}
            y={y}
            radiusTop={rTop}
            radiusBottom={rBot}
            height={stageHeight * 0.9}
            color={stage.hex}
            count={stageCounts[idx] ?? liveCounts[idx]}
            label={stage.label}
            agent={stage.agent}
            isBottleneck={bottlenecks.has(idx)}
            opacity={opacity}
          />
        );
      })}

      {/* Particles */}
      <ParticleSystem
        particles={particlesRef.current}
        stageYPositions={stageYPositions}
        stageRadii={stageRadii}
      />

      {/* Conversion glow at bottom */}
      <ConversionBeam />

      {/* Ambient dust */}
      <AmbientDust />

      {/* Controls */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={4}
        maxDistance={14}
        minPolarAngle={Math.PI * 0.15}
        maxPolarAngle={Math.PI * 0.75}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </>
  );
}

// ─── OVERLAY HUD ───
function FunnelHUD({ stageCounts, totalLeads, closings, bottleneckStages }: {
  stageCounts: number[];
  totalLeads: number;
  closings: number;
  bottleneckStages: string[];
}) {
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Top KPIs */}
      <div className="absolute top-4 left-4 right-4 flex items-center gap-3 pointer-events-auto">
        <div className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-xl px-4 py-2 flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground">Leads Ativos</span>
          <span className="text-sm font-bold text-foreground">{totalLeads}</span>
        </div>
        <div className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-xl px-4 py-2 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-muted-foreground">Fechamentos</span>
          <span className="text-sm font-bold text-emerald-400">{closings}</span>
        </div>
        <div className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-xl px-4 py-2 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-muted-foreground">Conversão</span>
          <span className="text-sm font-bold text-blue-400">
            {totalLeads > 0 ? `${((closings / totalLeads) * 100).toFixed(1)}%` : "—"}
          </span>
        </div>
      </div>

      {/* Bottleneck alerts */}
      {bottleneckStages.length > 0 && (
        <div className="absolute top-16 left-4 space-y-1 pointer-events-auto">
          {bottleneckStages.map(s => (
            <div key={s} className="bg-red-500/10 backdrop-blur border border-red-500/30 rounded-lg px-3 py-1.5 flex items-center gap-2 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[11px] text-red-300">Gargalo em {s}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stage legend - right side */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 space-y-1 pointer-events-auto">
        {STAGES.map((stage, idx) => (
          <div
            key={stage.id}
            className="bg-background/60 backdrop-blur border border-border/30 rounded-lg px-3 py-1.5 flex items-center gap-2 min-w-[130px]"
          >
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.hex }} />
            <span className="text-[10px] text-muted-foreground flex-1">{stage.emoji} {stage.label}</span>
            <span className="text-[11px] font-bold text-foreground">{stageCounts[idx] ?? 0}</span>
          </div>
        ))}
      </div>

      {/* Prediction card */}
      <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-xl border border-border/50 rounded-xl p-3 pointer-events-auto max-w-[200px]">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-semibold text-foreground">Previsão</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          ~{Math.max(1, Math.round(closings * 1.3))} fechamentos estimados nas próximas 2h
        </p>
      </div>
    </div>
  );
}

// ─── MAIN EXPORT ───
export function Funnel3DView({ mode = "simulation" }: { mode?: "real" | "simulation" }) {
  const [paused, setPaused] = useState(false);
  const [stageCounts, setStageCounts] = useState<number[]>(STAGES.map(() => 0));
  const [closings, setClosings] = useState(0);
  const [bottleneckSet, setBottleneckSet] = useState<Set<number>>(new Set());
  const [bottleneckNames, setBottleneckNames] = useState<string[]>([]);
  const tickRef = useRef(0);

  // Simulate real-time stage counts
  useEffect(() => {
    if (paused) return;
    const iv = setInterval(() => {
      tickRef.current++;
      const counts = STAGES.map((_, i) => {
        const base = Math.max(5, 50 - i * 8);
        const variance = Math.sin(tickRef.current * 0.1 + i) * 5;
        return Math.round(base + variance + Math.random() * 3);
      });

      // Simulate bottleneck at stage 3 (Proposta) occasionally
      const bnSet = new Set<number>();
      const bnNames: string[] = [];
      if (counts[3] > 35) {
        bnSet.add(3);
        bnNames.push(STAGES[3].label);
      }
      if (counts[1] > 42) {
        bnSet.add(1);
        bnNames.push(STAGES[1].label);
      }

      setStageCounts(counts);
      setClosings(prev => prev + (Math.random() < 0.15 ? 1 : 0));
      setBottleneckSet(bnSet);
      setBottleneckNames(bnNames);
    }, 2000);
    return () => clearInterval(iv);
  }, [paused]);

  const totalLeads = useMemo(() => stageCounts.reduce((a, b) => a + b, 0), [stageCounts]);

  return (
    <div className="relative w-full h-full min-h-[600px] bg-gradient-to-b from-[#0a0a1a] via-[#0f0f2e] to-[#0a0a1a] rounded-2xl overflow-hidden">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 1, 8], fov: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
      >
        <FunnelScene
          stageCounts={stageCounts}
          bottlenecks={bottleneckSet}
          paused={paused}
        />
      </Canvas>

      {/* HUD Overlay */}
      <FunnelHUD
        stageCounts={stageCounts}
        totalLeads={totalLeads}
        closings={closings}
        bottleneckStages={bottleneckNames}
      />

      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
        <Button
          size="sm"
          variant="outline"
          className="bg-background/60 backdrop-blur border-border/50 text-foreground h-8 text-[11px]"
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play className="w-3.5 h-3.5 mr-1" /> : <Pause className="w-3.5 h-3.5 mr-1" />}
          {paused ? "Play" : "Pausar"}
        </Button>
        <Badge variant="outline" className="bg-background/60 backdrop-blur text-[10px] border-border/50">
          {mode === "real" ? "🔴 Tempo Real" : "🧪 Simulação"}
        </Badge>
      </div>
    </div>
  );
}
