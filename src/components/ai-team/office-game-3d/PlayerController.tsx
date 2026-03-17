import { useRef, useEffect, useCallback } from 'react';
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
const ORBIT_SPEED = 0.005;

interface Props {
  startPos: [number, number, number];
  onPositionChange: (x: number, z: number) => void;
  joystickInput?: { x: number; z: number };
}

export default function PlayerController({ startPos, onPositionChange, joystickInput }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const posRef = useRef(new THREE.Vector3(startPos[0], 0, startPos[2]));
  const targetRef = useRef<THREE.Vector3 | null>(null);
  const keysRef = useRef(new Set<string>());
  const velRef = useRef({ x: 0, z: 0 });
  const zoomRef = useRef(1.0);
  const orbitAngleRef = useRef(0); // horizontal orbit angle around player
  const orbitPitchRef = useRef(0); // vertical pitch offset
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const { camera } = useThree();

  // Mouse wheel zoom + drag orbit
  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? ZOOM_SPEED : -ZOOM_SPEED;
      zoomRef.current = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomRef.current + delta));
    };

    const onPointerDown = (e: PointerEvent) => {
      // Right-click or middle-click, or left-click with no floor hit (we'll use right/middle)
      if (e.button === 2 || e.button === 1) {
        e.preventDefault();
        isDraggingRef.current = true;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        canvas.style.cursor = 'grabbing';
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      orbitAngleRef.current -= dx * ORBIT_SPEED;
      orbitPitchRef.current = Math.max(-0.3, Math.min(0.5, orbitPitchRef.current + dy * ORBIT_SPEED * 0.5));
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.button === 2 || e.button === 1) {
        isDraggingRef.current = false;
        canvas.style.cursor = '';
      }
    };

    const onContextMenu = (e: Event) => e.preventDefault();

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('contextmenu', onContextMenu);
    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('contextmenu', onContextMenu);
    };
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        e.preventDefault();
        keysRef.current.add(k);
      }
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const { raycaster, pointer } = useThree();
  const floorRef = useRef<THREE.Mesh>(null);

  const handleFloorClick = useCallback(() => {
    if (!floorRef.current) return;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(floorRef.current);
    if (hits.length > 0) {
      targetRef.current = new THREE.Vector3(hits[0].point.x, 0, hits[0].point.z);
    }
  }, [raycaster, pointer, camera]);

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
      targetRef.current = null;
    }

    const accel = 12;
    const friction = 8;

    if (inputX || inputZ) {
      targetRef.current = null;
      const len = Math.sqrt(inputX * inputX + inputZ * inputZ);
      vel.x += (inputX / len) * accel * dt;
      vel.z += (inputZ / len) * accel * dt;
    } else if (targetRef.current) {
      const dx = targetRef.current.x - pos.x;
      const dz = targetRef.current.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 0.08) {
        targetRef.current = null;
      } else {
        vel.x += (dx / dist) * accel * dt;
        vel.z += (dz / dist) * accel * dt;
      }
    }

    // Friction
    vel.x -= vel.x * friction * dt;
    vel.z -= vel.z * friction * dt;

    // Clamp speed
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

    // Clamp to floor
    const hw = FLOOR_SIZE.w / 2 - 0.3;
    const hh = FLOOR_SIZE.h / 2 - 0.3;
    pos.x = Math.max(-hw, Math.min(hw, pos.x));
    pos.z = Math.max(-hh, Math.min(hh, pos.z));

    if (groupRef.current) {
      groupRef.current.position.x = pos.x;
      groupRef.current.position.z = pos.z;

      // Rotate body toward movement
      if (speed > 0.3) {
        const targetAngle = Math.atan2(vel.x, vel.z);
        const cur = groupRef.current.rotation.y;
        let diff = targetAngle - cur;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        groupRef.current.rotation.y += diff * 0.15;
      }
    }

    // Camera — third-person with orbit + zoom
    const zoom = zoomRef.current;
    const orbitAngle = orbitAngleRef.current;
    const orbitPitch = orbitPitchRef.current;
    const camDist = CAM_BACK_DEFAULT * zoom;
    const camHeight = CAM_HEIGHT_DEFAULT * zoom + orbitPitch * 4;
    const camTarget = new THREE.Vector3(
      pos.x + Math.sin(orbitAngle) * camDist,
      camHeight,
      pos.z + Math.cos(orbitAngle) * camDist
    );
    camera.position.lerp(camTarget, CAM_LERP);
    camera.lookAt(new THREE.Vector3(pos.x, 0.5, pos.z));

    onPositionChange(pos.x, pos.z);
  });

  return (
    <>
      <mesh
        ref={floorRef}
        rotation-x={-Math.PI / 2}
        position={[0, -0.01, 0]}
        onClick={handleFloorClick}
        visible={false}
      >
        <planeGeometry args={[FLOOR_SIZE.w * 1.5, FLOOR_SIZE.h * 1.5]} />
        <meshBasicMaterial />
      </mesh>

      <group ref={groupRef} position={[startPos[0], 0, startPos[2]]}>
        {/* Shadow disc */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, 0]}>
          <circleGeometry args={[0.25, 24]} />
          <meshStandardMaterial color="#000" transparent opacity={0.12} />
        </mesh>

        {/* Player body — humanoid */}
        {/* Legs */}
        <mesh position={[-0.06, 0.2, 0]} castShadow>
          <capsuleGeometry args={[0.04, 0.2, 4, 8]} />
          <meshStandardMaterial color="#2c3e50" roughness={0.7} />
        </mesh>
        <mesh position={[0.06, 0.2, 0]} castShadow>
          <capsuleGeometry args={[0.04, 0.2, 4, 8]} />
          <meshStandardMaterial color="#2c3e50" roughness={0.7} />
        </mesh>
        {/* Torso */}
        <mesh position={[0, 0.48, 0]} castShadow>
          <capsuleGeometry args={[0.1, 0.18, 6, 12]} />
          <meshStandardMaterial color="#6c5ce7" roughness={0.35} metalness={0.15} emissive="#6c5ce7" emissiveIntensity={0.08} />
        </mesh>
        {/* Arms */}
        <mesh position={[-0.15, 0.45, 0]} castShadow>
          <capsuleGeometry args={[0.03, 0.18, 4, 8]} />
          <meshStandardMaterial color="#6c5ce7" roughness={0.4} />
        </mesh>
        <mesh position={[0.15, 0.45, 0]} castShadow>
          <capsuleGeometry args={[0.03, 0.18, 4, 8]} />
          <meshStandardMaterial color="#6c5ce7" roughness={0.4} />
        </mesh>
        {/* Neck */}
        <mesh position={[0, 0.62, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.04, 0.06, 8]} />
          <meshStandardMaterial color="#deb887" roughness={0.6} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 0.72, 0]} castShadow>
          <sphereGeometry args={[0.09, 16, 12]} />
          <meshStandardMaterial color="#deb887" roughness={0.55} metalness={0.02} />
        </mesh>
        {/* Hair */}
        <mesh position={[0, 0.78, -0.01]} castShadow>
          <sphereGeometry args={[0.08, 12, 8]} />
          <meshStandardMaterial color="#2c1810" roughness={0.9} />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.025, 0.73, 0.08]}>
          <sphereGeometry args={[0.012, 8, 6]} />
          <meshStandardMaterial color="#fff" roughness={0.2} />
        </mesh>
        <mesh position={[0.025, 0.73, 0.08]}>
          <sphereGeometry args={[0.012, 8, 6]} />
          <meshStandardMaterial color="#fff" roughness={0.2} />
        </mesh>
        <mesh position={[-0.025, 0.73, 0.09]}>
          <sphereGeometry args={[0.006, 6, 4]} />
          <meshStandardMaterial color="#1a1a2e" roughness={0.1} />
        </mesh>
        <mesh position={[0.025, 0.73, 0.09]}>
          <sphereGeometry args={[0.006, 6, 4]} />
          <meshStandardMaterial color="#1a1a2e" roughness={0.1} />
        </mesh>
      </group>
    </>
  );
}
