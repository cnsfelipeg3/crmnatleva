import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { collides3D, FLOOR_SIZE } from './mapData3d';

const SPEED = 4;
const CAM_HEIGHT_DEFAULT = 5.5;
const CAM_BACK_DEFAULT = 4.5;
const CAM_LERP = 0.06;
const PLAYER_RADIUS = 0.22;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2.5;
const ZOOM_SPEED = 0.1;
const PAN_SPEED = 0.012;
const ORBIT_SPEED = 0.005;

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
  const orbitAngleRef = useRef(0);
  const orbitPitchRef = useRef(0);
  const panOffsetRef = useRef({ x: 0, z: 0 });
  const isDraggingRef = useRef(false);
  const dragButtonRef = useRef<number | null>(null);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const { camera } = useThree();

  // Mouse wheel zoom + click-drag pan + right-click orbit
  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? ZOOM_SPEED : -ZOOM_SPEED;
      zoomRef.current = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomRef.current + delta));
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
    const dt = Math.min(delta, 0.05);
    const pos = posRef.current;
    const keys = keysRef.current;
    const vel = velRef.current;

    let inputX = 0, inputZ = 0;
    if (keys.has('w') || keys.has('arrowup')) inputZ = -1;
    if (keys.has('s') || keys.has('arrowdown')) inputZ = 1;
    if (keys.has('a') || keys.has('arrowleft')) inputX = -1;
    if (keys.has('d') || keys.has('arrowright')) inputX = 1;

    if (joystickInput && (Math.abs(joystickInput.x) > 0.05 || Math.abs(joystickInput.z) > 0.05)) {
      inputX = joystickInput.x;
      inputZ = joystickInput.z;
    }

    const accel = 12;
    const friction = 8;

    if (inputX || inputZ) {
      const len = Math.sqrt(inputX * inputX + inputZ * inputZ);
      vel.x += (inputX / len) * accel * dt;
      vel.z += (inputZ / len) * accel * dt;
    }

    vel.x -= vel.x * friction * dt;
    vel.z -= vel.z * friction * dt;

    const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    if (speed > SPEED) {
      vel.x = (vel.x / speed) * SPEED;
      vel.z = (vel.z / speed) * SPEED;
    }

    const mx = vel.x * dt;
    const mz = vel.z * dt;
    const nx = pos.x + mx;
    if (!collides3D(nx, pos.z, PLAYER_RADIUS)) pos.x = nx; else vel.x = 0;
    const nz = pos.z + mz;
    if (!collides3D(pos.x, nz, PLAYER_RADIUS)) pos.z = nz; else vel.z = 0;

    const hw = FLOOR_SIZE.w / 2 - 0.3;
    const hh = FLOOR_SIZE.h / 2 - 0.3;
    pos.x = Math.max(-hw, Math.min(hw, pos.x));
    pos.z = Math.max(-hh, Math.min(hh, pos.z));

    if (groupRef.current) {
      groupRef.current.position.x = pos.x;
      groupRef.current.position.z = pos.z;

      if (speed > 0.3) {
        const targetAngle = Math.atan2(vel.x, vel.z);
        const cur = groupRef.current.rotation.y;
        let diff = targetAngle - cur;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        groupRef.current.rotation.y += diff * 0.15;
      }
    }

    // Boss aura pulse
    if (auraRef.current) {
      const t = performance.now() / 1000;
      const s = 1 + Math.sin(t * 2) * 0.08;
      auraRef.current.scale.set(s, s, 1);
      (auraRef.current.material as THREE.MeshStandardMaterial).opacity = 0.18 + Math.sin(t * 1.5) * 0.08;
    }

    // Camera
    const zoom = zoomRef.current;
    const orbitAngle = orbitAngleRef.current;
    const orbitPitch = orbitPitchRef.current;
    const pan = panOffsetRef.current;
    const camDist = CAM_BACK_DEFAULT * zoom;
    const camHeight = CAM_HEIGHT_DEFAULT * zoom + orbitPitch * 4;
    const lookTarget = new THREE.Vector3(pos.x + pan.x, 0.5, pos.z + pan.z);
    const camTarget = new THREE.Vector3(
      pos.x + pan.x + Math.sin(orbitAngle) * camDist,
      camHeight,
      pos.z + pan.z + Math.cos(orbitAngle) * camDist
    );
    camera.position.lerp(camTarget, CAM_LERP);
    camera.lookAt(lookTarget);

    onPositionChange(pos.x, pos.z);
  });

  return (
    <group ref={groupRef} position={[startPos[0], 0, startPos[2]]}>
      {/* Ground shadow — larger for boss */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, 0]}>
        <circleGeometry args={[0.32, 28]} />
        <meshStandardMaterial color="#000" transparent opacity={0.15} />
      </mesh>

      {/* Golden aura ring */}
      <mesh ref={auraRef} rotation-x={-Math.PI / 2} position={[0, 0.007, 0]}>
        <ringGeometry args={[0.34, 0.44, 36]} />
        <meshStandardMaterial
          color={AURA_GOLD}
          emissive={AURA_GOLD}
          emissiveIntensity={0.7}
          transparent
          opacity={0.22}
        />
      </mesh>

      {/* Inner gold disc */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, 0]}>
        <circleGeometry args={[0.33, 28]} />
        <meshStandardMaterial color={AURA_GOLD} transparent opacity={0.06} />
      </mesh>

      {/* === BOSS HUMANOID — Premium Suit === */}

      {/* Shoes — polished leather */}
      <mesh position={[-0.055, 0.028, 0.04]} castShadow>
        <boxGeometry args={[0.05, 0.04, 0.11]} />
        <meshStandardMaterial color={SHOE_COLOR} roughness={0.25} metalness={0.3} />
      </mesh>
      <mesh position={[0.055, 0.028, 0.04]} castShadow>
        <boxGeometry args={[0.05, 0.04, 0.11]} />
        <meshStandardMaterial color={SHOE_COLOR} roughness={0.25} metalness={0.3} />
      </mesh>

      {/* Legs — tailored pants */}
      <mesh position={[-0.055, 0.2, 0]} castShadow>
        <capsuleGeometry args={[0.04, 0.22, 4, 10]} />
        <meshStandardMaterial color={SUIT_PANTS} roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[0.055, 0.2, 0]} castShadow>
        <capsuleGeometry args={[0.04, 0.22, 4, 10]} />
        <meshStandardMaterial color={SUIT_PANTS} roughness={0.55} metalness={0.05} />
      </mesh>

      {/* Belt */}
      <mesh position={[0, 0.34, 0]} castShadow>
        <boxGeometry args={[0.19, 0.025, 0.11]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Belt buckle */}
      <mesh position={[0, 0.34, 0.055]}>
        <boxGeometry args={[0.03, 0.02, 0.005]} />
        <meshStandardMaterial color={WATCH_GOLD} roughness={0.15} metalness={0.8} emissive={WATCH_GOLD} emissiveIntensity={0.3} />
      </mesh>

      {/* Torso — suit jacket (slightly larger, more imposing) */}
      <mesh position={[0, 0.48, 0]} castShadow>
        <capsuleGeometry args={[0.1, 0.2, 6, 12]} />
        <meshStandardMaterial color={SUIT_DARK} roughness={0.4} metalness={0.12} />
      </mesh>

      {/* Shirt collar peeking */}
      <mesh position={[0, 0.59, 0.065]}>
        <boxGeometry args={[0.07, 0.03, 0.02]} />
        <meshStandardMaterial color={SHIRT_WHITE} roughness={0.4} />
      </mesh>
      {/* Tie */}
      <mesh position={[0, 0.5, 0.09]} castShadow>
        <boxGeometry args={[0.025, 0.14, 0.008]} />
        <meshStandardMaterial color="#8b1a1a" roughness={0.5} metalness={0.1} />
      </mesh>
      {/* Tie knot */}
      <mesh position={[0, 0.57, 0.09]}>
        <sphereGeometry args={[0.015, 6, 4]} />
        <meshStandardMaterial color="#7a1515" roughness={0.5} />
      </mesh>

      {/* Jacket lapels */}
      <mesh position={[-0.04, 0.52, 0.08]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[0.035, 0.1, 0.008]} />
        <meshStandardMaterial color={SUIT_DARK} roughness={0.35} metalness={0.15} />
      </mesh>
      <mesh position={[0.04, 0.52, 0.08]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[0.035, 0.1, 0.008]} />
        <meshStandardMaterial color={SUIT_DARK} roughness={0.35} metalness={0.15} />
      </mesh>

      {/* Arms — suit sleeves */}
      <mesh position={[-0.15, 0.46, 0]} castShadow>
        <capsuleGeometry args={[0.032, 0.2, 4, 8]} />
        <meshStandardMaterial color={SUIT_DARK} roughness={0.45} metalness={0.08} />
      </mesh>
      <mesh position={[0.15, 0.46, 0]} castShadow>
        <capsuleGeometry args={[0.032, 0.2, 4, 8]} />
        <meshStandardMaterial color={SUIT_DARK} roughness={0.45} metalness={0.08} />
      </mesh>

      {/* Hands */}
      <mesh position={[-0.15, 0.32, 0]} castShadow>
        <sphereGeometry args={[0.025, 8, 6]} />
        <meshStandardMaterial color={SKIN} roughness={0.55} />
      </mesh>
      <mesh position={[0.15, 0.32, 0]} castShadow>
        <sphereGeometry args={[0.025, 8, 6]} />
        <meshStandardMaterial color={SKIN} roughness={0.55} />
      </mesh>

      {/* Watch on left wrist */}
      <mesh position={[-0.15, 0.35, 0]}>
        <torusGeometry args={[0.022, 0.004, 8, 16]} />
        <meshStandardMaterial color={WATCH_GOLD} roughness={0.15} metalness={0.85} emissive={WATCH_GOLD} emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[-0.15, 0.35, 0.005]}>
        <circleGeometry args={[0.018, 12]} />
        <meshStandardMaterial color="#0a1420" roughness={0.1} metalness={0.3} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 0.63, 0]} castShadow>
        <cylinderGeometry args={[0.032, 0.038, 0.05, 8]} />
        <meshStandardMaterial color={SKIN} roughness={0.55} />
      </mesh>

      {/* Head — slightly larger for boss presence */}
      <mesh position={[0, 0.73, 0]} castShadow>
        <sphereGeometry args={[0.09, 16, 14]} />
        <meshStandardMaterial color={SKIN} roughness={0.5} metalness={0.02} />
      </mesh>

      {/* Hair — styled executive cut */}
      <mesh position={[0, 0.79, -0.015]} castShadow>
        <sphereGeometry args={[0.085, 12, 10]} />
        <meshStandardMaterial color={HAIR} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.8, 0.015]}>
        <boxGeometry args={[0.15, 0.025, 0.08]} />
        <meshStandardMaterial color={HAIR} roughness={0.8} />
      </mesh>

      {/* Ears */}
      <mesh position={[-0.085, 0.73, 0]}>
        <sphereGeometry args={[0.018, 6, 4]} />
        <meshStandardMaterial color={SKIN} roughness={0.55} />
      </mesh>
      <mesh position={[0.085, 0.73, 0]}>
        <sphereGeometry args={[0.018, 6, 4]} />
        <meshStandardMaterial color={SKIN} roughness={0.55} />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.028, 0.74, 0.08]}>
        <sphereGeometry args={[0.013, 8, 6]} />
        <meshStandardMaterial color="#fff" roughness={0.15} />
      </mesh>
      <mesh position={[0.028, 0.74, 0.08]}>
        <sphereGeometry args={[0.013, 8, 6]} />
        <meshStandardMaterial color="#fff" roughness={0.15} />
      </mesh>
      <mesh position={[-0.028, 0.74, 0.092]}>
        <sphereGeometry args={[0.006, 6, 4]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.1} />
      </mesh>
      <mesh position={[0.028, 0.74, 0.092]}>
        <sphereGeometry args={[0.006, 6, 4]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.1} />
      </mesh>

      {/* Eyebrows — slightly thicker for authority */}
      <mesh position={[-0.028, 0.76, 0.078]}>
        <boxGeometry args={[0.028, 0.006, 0.01]} />
        <meshStandardMaterial color={HAIR} roughness={0.8} />
      </mesh>
      <mesh position={[0.028, 0.76, 0.078]}>
        <boxGeometry args={[0.028, 0.006, 0.01]} />
        <meshStandardMaterial color={HAIR} roughness={0.8} />
      </mesh>

      {/* Nose */}
      <mesh position={[0, 0.725, 0.09]}>
        <boxGeometry args={[0.016, 0.022, 0.016]} />
        <meshStandardMaterial color={SKIN} roughness={0.55} />
      </mesh>

      {/* Subtle confident smile */}
      <mesh position={[0, 0.705, 0.085]}>
        <boxGeometry args={[0.028, 0.004, 0.006]} />
        <meshStandardMaterial color="#c4917a" roughness={0.6} />
      </mesh>

      {/* Subtle boss point light — personal glow */}
      <pointLight position={[0, 0.5, 0.3]} intensity={0.15} color={AURA_GOLD} distance={2} decay={2} />
    </group>
  );
}
