import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { collides3D, FLOOR_SIZE } from './mapData3d';

const SPEED = 4.5;
const CAM_HEIGHT_DEFAULT = 5.5;
const CAM_BACK_DEFAULT = 4.5;
const CAM_LERP = 0.08;
const PLAYER_RADIUS = 0.22;
const ZOOM_MIN = 0.35;
const ZOOM_MAX = 2.8;
const ZOOM_SPEED = 0.08;
const PAN_SPEED = 0.012;
const ORBIT_SPEED = 0.005;
const ACCEL = 18;
const FRICTION = 10;
const ROT_LERP = 0.18;

// Boss suit colors
const SUIT_DARK = '#0a0f18';
const SUIT_PANTS = '#0c1220';
const SHIRT_WHITE = '#e8e4e0';
const SKIN = '#f0d5b0';
const HAIR = '#1a1210';
const WATCH_GOLD = '#c9a96e';
const AURA_GOLD = '#c9a96e';
const SHOE_COLOR = '#1a0e08';

interface Props {
  startPos: [number, number, number];
  onPositionChange: (x: number, z: number) => void;
  joystickInput?: { x: number; z: number };
}

export default function PlayerController({ startPos, onPositionChange, joystickInput }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const posRef = useRef(new THREE.Vector3(startPos[0], 0, startPos[2]));
  const keysRef = useRef(new Set<string>());
  const velRef = useRef({ x: 0, z: 0 });
  const zoomRef = useRef(1.0);
  const targetZoomRef = useRef(1.0);
  const orbitAngleRef = useRef(0);
  const orbitPitchRef = useRef(0);
  const panOffsetRef = useRef({ x: 0, z: 0 });
  const isDraggingRef = useRef(false);
  const dragButtonRef = useRef<number | null>(null);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const lastReportRef = useRef({ x: 0, z: 0 });
  const camPosRef = useRef(new THREE.Vector3());
  const lookTargetRef = useRef(new THREE.Vector3());
  const { camera } = useThree();

  // Pre-create reusable vectors
  const _camTarget = useMemo(() => new THREE.Vector3(), []);
  const _lookTarget = useMemo(() => new THREE.Vector3(), []);

  // Mouse/pointer events
  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? ZOOM_SPEED : -ZOOM_SPEED;
      targetZoomRef.current = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, targetZoomRef.current + delta));
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 0 || e.button === 2 || e.button === 1) {
        e.preventDefault();
        isDraggingRef.current = true;
        dragButtonRef.current = e.button;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        canvas.style.cursor = e.button === 0 ? 'grab' : 'grabbing';
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };

      if (dragButtonRef.current === 2 || dragButtonRef.current === 1) {
        orbitAngleRef.current -= dx * ORBIT_SPEED;
        orbitPitchRef.current = Math.max(-0.3, Math.min(0.5, orbitPitchRef.current + dy * ORBIT_SPEED * 0.5));
      } else {
        const angle = orbitAngleRef.current;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const zoom = zoomRef.current;
        panOffsetRef.current.x += (-dx * cos - dy * sin) * PAN_SPEED * zoom;
        panOffsetRef.current.z += (dx * sin - dy * cos) * PAN_SPEED * zoom;
      }
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
      dragButtonRef.current = null;
      canvas.style.cursor = '';
    };

    const onContextMenu = (e: Event) => e.preventDefault();
    const onDblClick = () => { panOffsetRef.current = { x: 0, z: 0 }; };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('contextmenu', onContextMenu);
    canvas.addEventListener('dblclick', onDblClick);
    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('contextmenu', onContextMenu);
      canvas.removeEventListener('dblclick', onDblClick);
    };
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Skip movement capture when typing in an input/textarea (e.g. NPC chat)
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        e.preventDefault();
        keysRef.current.add(k);
        panOffsetRef.current = { x: 0, z: 0 };
      }
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.04); // cap delta
    const pos = posRef.current;
    const keys = keysRef.current;
    const vel = velRef.current;

    // ── Input ──
    let inputX = 0, inputZ = 0;
    if (keys.has('w') || keys.has('arrowup')) inputZ = -1;
    if (keys.has('s') || keys.has('arrowdown')) inputZ = 1;
    if (keys.has('a') || keys.has('arrowleft')) inputX = -1;
    if (keys.has('d') || keys.has('arrowright')) inputX = 1;

    if (joystickInput && (Math.abs(joystickInput.x) > 0.05 || Math.abs(joystickInput.z) > 0.05)) {
      inputX = joystickInput.x;
      inputZ = joystickInput.z;
    }

    // ── Acceleration / friction based movement ──
    if (inputX || inputZ) {
      const len = Math.sqrt(inputX * inputX + inputZ * inputZ);
      const nx = inputX / len;
      const nz = inputZ / len;
      vel.x += nx * ACCEL * dt;
      vel.z += nz * ACCEL * dt;
    }

    vel.x *= 1 - FRICTION * dt;
    vel.z *= 1 - FRICTION * dt;

    // Clamp speed
    const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    if (speed > SPEED) {
      const s = SPEED / speed;
      vel.x *= s;
      vel.z *= s;
    }
    // Dead zone — stop micro-drift
    if (speed < 0.05) { vel.x = 0; vel.z = 0; }

    // ── Collision-aware movement ──
    const mx = vel.x * dt;
    const mz = vel.z * dt;
    const nx = pos.x + mx;
    if (!collides3D(nx, pos.z, PLAYER_RADIUS)) pos.x = nx; else vel.x *= -0.2;
    const nz = pos.z + mz;
    if (!collides3D(pos.x, nz, PLAYER_RADIUS)) pos.z = nz; else vel.z *= -0.2;

    // Boundary clamp
    const hw = FLOOR_SIZE.w / 2 - 0.3;
    const hh = FLOOR_SIZE.h / 2 - 0.3;
    pos.x = Math.max(-hw, Math.min(hw, pos.x));
    pos.z = Math.max(-hh, Math.min(hh, pos.z));

    // ── Avatar position & rotation ──
    const g = groupRef.current;
    if (g) {
      g.position.x = pos.x;
      g.position.z = pos.z;
      // Walking bob
      g.position.y = speed > 0.3 ? Math.abs(Math.sin(performance.now() * 0.008)) * 0.015 : 0;

      if (speed > 0.3) {
        const targetAngle = Math.atan2(vel.x, vel.z);
        let diff = targetAngle - g.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        g.rotation.y += diff * ROT_LERP;
      }
    }

    // ── Aura pulse (cheap) ──
    if (auraRef.current) {
      const t = performance.now() * 0.001;
      const s = 1 + Math.sin(t * 2) * 0.08;
      auraRef.current.scale.set(s, s, 1);
      (auraRef.current.material as THREE.MeshStandardMaterial).opacity = 0.18 + Math.sin(t * 1.5) * 0.08;
    }

    // ── Smooth zoom ──
    zoomRef.current += (targetZoomRef.current - zoomRef.current) * 0.12;

    // ── Camera — smooth follow with lerp ──
    const zoom = zoomRef.current;
    const orbitAngle = orbitAngleRef.current;
    const orbitPitch = orbitPitchRef.current;
    const pan = panOffsetRef.current;
    const camDist = CAM_BACK_DEFAULT * zoom;
    const camHeight = CAM_HEIGHT_DEFAULT * zoom + orbitPitch * 4;

    _lookTarget.set(pos.x + pan.x, 0.5, pos.z + pan.z);
    _camTarget.set(
      pos.x + pan.x + Math.sin(orbitAngle) * camDist,
      camHeight,
      pos.z + pan.z + Math.cos(orbitAngle) * camDist
    );

    camera.position.lerp(_camTarget, CAM_LERP);
    // Smooth look interpolation
    lookTargetRef.current.lerp(_lookTarget, CAM_LERP * 1.5);
    camera.lookAt(lookTargetRef.current);

    // ── Throttled position callback (avoid per-frame React setState) ──
    const lr = lastReportRef.current;
    const rdx = pos.x - lr.x;
    const rdz = pos.z - lr.z;
    if (rdx * rdx + rdz * rdz > 0.001 || speed > 0.1) {
      lr.x = pos.x;
      lr.z = pos.z;
      onPositionChange(pos.x, pos.z);
    }
  });

  // Pre-create materials once
  const materials = useMemo(() => ({
    suitDark: new THREE.MeshStandardMaterial({ color: SUIT_DARK, roughness: 0.4, metalness: 0.12 }),
    suitPants: new THREE.MeshStandardMaterial({ color: SUIT_PANTS, roughness: 0.55, metalness: 0.05 }),
    skin: new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.55 }),
    hair: new THREE.MeshStandardMaterial({ color: HAIR, roughness: 0.8 }),
    shoe: new THREE.MeshStandardMaterial({ color: SHOE_COLOR, roughness: 0.25, metalness: 0.3 }),
    shirtWhite: new THREE.MeshStandardMaterial({ color: SHIRT_WHITE, roughness: 0.4 }),
    belt: new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.3, metalness: 0.4 }),
    buckle: new THREE.MeshStandardMaterial({ color: WATCH_GOLD, roughness: 0.15, metalness: 0.8, emissive: new THREE.Color(WATCH_GOLD), emissiveIntensity: 0.3 }),
    tie: new THREE.MeshStandardMaterial({ color: '#8b1a1a', roughness: 0.5, metalness: 0.1 }),
    tieKnot: new THREE.MeshStandardMaterial({ color: '#7a1515', roughness: 0.5 }),
    eyeWhite: new THREE.MeshStandardMaterial({ color: '#fff', roughness: 0.15 }),
    pupil: new THREE.MeshStandardMaterial({ color: '#1a1a2e', roughness: 0.1 }),
    mouthColor: new THREE.MeshStandardMaterial({ color: '#c4917a', roughness: 0.6 }),
    watchBand: new THREE.MeshStandardMaterial({ color: WATCH_GOLD, roughness: 0.15, metalness: 0.85, emissive: new THREE.Color(WATCH_GOLD), emissiveIntensity: 0.4 }),
    watchFace: new THREE.MeshStandardMaterial({ color: '#0a1420', roughness: 0.1, metalness: 0.3 }),
    aura: new THREE.MeshStandardMaterial({ color: AURA_GOLD, emissive: new THREE.Color(AURA_GOLD), emissiveIntensity: 0.7, transparent: true, opacity: 0.22 }),
    auraDisc: new THREE.MeshStandardMaterial({ color: AURA_GOLD, transparent: true, opacity: 0.06 }),
    shadow: new THREE.MeshStandardMaterial({ color: '#000', transparent: true, opacity: 0.15 }),
  }), []);

  return (
    <group ref={groupRef} position={[startPos[0], 0, startPos[2]]}>
      {/* Ground shadow */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, 0]} material={materials.shadow}>
        <circleGeometry args={[0.32, 16]} />
      </mesh>

      {/* Golden aura ring */}
      <mesh ref={auraRef} rotation-x={-Math.PI / 2} position={[0, 0.007, 0]} material={materials.aura}>
        <ringGeometry args={[0.34, 0.44, 24]} />
      </mesh>

      {/* Inner gold disc */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, 0]} material={materials.auraDisc}>
        <circleGeometry args={[0.33, 16]} />
      </mesh>

      {/* === BOSS HUMANOID === */}
      {/* Shoes */}
      <mesh position={[-0.055, 0.028, 0.04]} castShadow material={materials.shoe}>
        <boxGeometry args={[0.05, 0.04, 0.11]} />
      </mesh>
      <mesh position={[0.055, 0.028, 0.04]} castShadow material={materials.shoe}>
        <boxGeometry args={[0.05, 0.04, 0.11]} />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.055, 0.2, 0]} castShadow material={materials.suitPants}>
        <capsuleGeometry args={[0.04, 0.22, 3, 8]} />
      </mesh>
      <mesh position={[0.055, 0.2, 0]} castShadow material={materials.suitPants}>
        <capsuleGeometry args={[0.04, 0.22, 3, 8]} />
      </mesh>
      {/* Belt */}
      <mesh position={[0, 0.34, 0]} castShadow material={materials.belt}>
        <boxGeometry args={[0.19, 0.025, 0.11]} />
      </mesh>
      <mesh position={[0, 0.34, 0.055]} material={materials.buckle}>
        <boxGeometry args={[0.03, 0.02, 0.005]} />
      </mesh>
      {/* Torso */}
      <mesh position={[0, 0.48, 0]} castShadow material={materials.suitDark}>
        <capsuleGeometry args={[0.1, 0.2, 4, 8]} />
      </mesh>
      {/* Collar */}
      <mesh position={[0, 0.59, 0.065]} material={materials.shirtWhite}>
        <boxGeometry args={[0.07, 0.03, 0.02]} />
      </mesh>
      {/* Tie */}
      <mesh position={[0, 0.5, 0.09]} castShadow material={materials.tie}>
        <boxGeometry args={[0.025, 0.14, 0.008]} />
      </mesh>
      <mesh position={[0, 0.57, 0.09]} material={materials.tieKnot}>
        <sphereGeometry args={[0.015, 4, 3]} />
      </mesh>
      {/* Lapels */}
      <mesh position={[-0.04, 0.52, 0.08]} rotation={[0, 0, 0.2]} material={materials.suitDark}>
        <boxGeometry args={[0.035, 0.1, 0.008]} />
      </mesh>
      <mesh position={[0.04, 0.52, 0.08]} rotation={[0, 0, -0.2]} material={materials.suitDark}>
        <boxGeometry args={[0.035, 0.1, 0.008]} />
      </mesh>
      {/* Arms */}
      <mesh position={[-0.15, 0.46, 0]} castShadow material={materials.suitDark}>
        <capsuleGeometry args={[0.032, 0.2, 3, 6]} />
      </mesh>
      <mesh position={[0.15, 0.46, 0]} castShadow material={materials.suitDark}>
        <capsuleGeometry args={[0.032, 0.2, 3, 6]} />
      </mesh>
      {/* Hands */}
      <mesh position={[-0.15, 0.32, 0]} castShadow material={materials.skin}>
        <sphereGeometry args={[0.025, 6, 4]} />
      </mesh>
      <mesh position={[0.15, 0.32, 0]} castShadow material={materials.skin}>
        <sphereGeometry args={[0.025, 6, 4]} />
      </mesh>
      {/* Watch */}
      <mesh position={[-0.15, 0.35, 0]} material={materials.watchBand}>
        <torusGeometry args={[0.022, 0.004, 6, 12]} />
      </mesh>
      <mesh position={[-0.15, 0.35, 0.005]} material={materials.watchFace}>
        <circleGeometry args={[0.018, 8]} />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 0.63, 0]} castShadow material={materials.skin}>
        <cylinderGeometry args={[0.032, 0.038, 0.05, 6]} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.73, 0]} castShadow material={materials.skin}>
        <sphereGeometry args={[0.09, 12, 10]} />
      </mesh>
      {/* Hair */}
      <mesh position={[0, 0.79, -0.015]} castShadow material={materials.hair}>
        <sphereGeometry args={[0.085, 10, 8]} />
      </mesh>
      <mesh position={[0, 0.8, 0.015]} material={materials.hair}>
        <boxGeometry args={[0.15, 0.025, 0.08]} />
      </mesh>
      {/* Ears */}
      <mesh position={[-0.085, 0.73, 0]} material={materials.skin}>
        <sphereGeometry args={[0.018, 4, 3]} />
      </mesh>
      <mesh position={[0.085, 0.73, 0]} material={materials.skin}>
        <sphereGeometry args={[0.018, 4, 3]} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.028, 0.74, 0.08]} material={materials.eyeWhite}>
        <sphereGeometry args={[0.013, 6, 4]} />
      </mesh>
      <mesh position={[0.028, 0.74, 0.08]} material={materials.eyeWhite}>
        <sphereGeometry args={[0.013, 6, 4]} />
      </mesh>
      <mesh position={[-0.028, 0.74, 0.092]} material={materials.pupil}>
        <sphereGeometry args={[0.006, 4, 3]} />
      </mesh>
      <mesh position={[0.028, 0.74, 0.092]} material={materials.pupil}>
        <sphereGeometry args={[0.006, 4, 3]} />
      </mesh>
      {/* Eyebrows */}
      <mesh position={[-0.028, 0.76, 0.078]} material={materials.hair}>
        <boxGeometry args={[0.028, 0.006, 0.01]} />
      </mesh>
      <mesh position={[0.028, 0.76, 0.078]} material={materials.hair}>
        <boxGeometry args={[0.028, 0.006, 0.01]} />
      </mesh>
      {/* Nose */}
      <mesh position={[0, 0.725, 0.09]} material={materials.skin}>
        <boxGeometry args={[0.016, 0.022, 0.016]} />
      </mesh>
      {/* Mouth */}
      <mesh position={[0, 0.705, 0.085]} material={materials.mouthColor}>
        <boxGeometry args={[0.028, 0.004, 0.006]} />
      </mesh>

      {/* Boss glow — single cheap light */}
      <pointLight position={[0, 0.5, 0.3]} intensity={0.15} color={AURA_GOLD} distance={2} decay={2} />
    </group>
  );
}
