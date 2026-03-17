import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { collides3D, FLOOR_SIZE } from './mapData3d';

const SPEED = 4;
const CAM_HEIGHT = 8;
const CAM_BACK = 6;
const CAM_LERP = 0.08;
const PLAYER_RADIUS = 0.22;

interface Props {
  startPos: [number, number, number];
  onPositionChange: (x: number, z: number) => void;
}

export default function PlayerController({ startPos, onPositionChange }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const posRef = useRef(new THREE.Vector3(startPos[0], 0, startPos[2]));
  const targetRef = useRef<THREE.Vector3 | null>(null);
  const keysRef = useRef(new Set<string>());
  const { camera } = useThree();

  // Keyboard
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

  // Click-to-move via floor raycast
  const { raycaster, pointer, scene } = useThree();
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

    // WASD
    let vx = 0, vz = 0;
    if (keys.has('w') || keys.has('arrowup')) vz = -1;
    if (keys.has('s') || keys.has('arrowdown')) vz = 1;
    if (keys.has('a') || keys.has('arrowleft')) vx = -1;
    if (keys.has('d') || keys.has('arrowright')) vx = 1;

    if (vx || vz) {
      targetRef.current = null;
      const len = Math.sqrt(vx * vx + vz * vz);
      const mx = (vx / len) * SPEED * dt;
      const mz = (vz / len) * SPEED * dt;

      const nx = pos.x + mx;
      if (!collides3D(nx, pos.z, PLAYER_RADIUS)) pos.x = nx;
      const nz = pos.z + mz;
      if (!collides3D(pos.x, nz, PLAYER_RADIUS)) pos.z = nz;
    }

    // Click-to-move
    if (targetRef.current) {
      const dx = targetRef.current.x - pos.x;
      const dz = targetRef.current.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 0.08) {
        targetRef.current = null;
      } else {
        const step = SPEED * dt;
        const r = Math.min(step / dist, 1);
        const mx = dx * r;
        const mz = dz * r;
        const nx = pos.x + mx;
        if (!collides3D(nx, pos.z, PLAYER_RADIUS)) pos.x = nx;
        const nz = pos.z + mz;
        if (!collides3D(pos.x, nz, PLAYER_RADIUS)) pos.z = nz;
      }
    }

    // Clamp to floor
    const hw = FLOOR_SIZE.w / 2 - 0.3;
    const hh = FLOOR_SIZE.h / 2 - 0.3;
    pos.x = Math.max(-hw, Math.min(hw, pos.x));
    pos.z = Math.max(-hh, Math.min(hh, pos.z));

    // Update mesh
    if (groupRef.current) {
      groupRef.current.position.x = pos.x;
      groupRef.current.position.z = pos.z;
    }

    // Camera follow
    const camTarget = new THREE.Vector3(pos.x, CAM_HEIGHT, pos.z + CAM_BACK);
    camera.position.lerp(camTarget, CAM_LERP);
    const lookAt = new THREE.Vector3(pos.x, 0, pos.z);
    const currentLook = new THREE.Vector3();
    camera.getWorldDirection(currentLook);
    camera.lookAt(lookAt);

    onPositionChange(pos.x, pos.z);
  });

  return (
    <>
      {/* Invisible floor for raycasting clicks */}
      <mesh
        ref={floorRef}
        rotation-x={-Math.PI / 2}
        position={[0, -0.01, 0]}
        onClick={handleFloorClick}
        visible={false}
      >
        <planeGeometry args={[FLOOR_SIZE.w, FLOOR_SIZE.h]} />
        <meshBasicMaterial />
      </mesh>

      <group ref={groupRef} position={[startPos[0], 0, startPos[2]]}>
        {/* Ground shadow */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, 0]}>
          <circleGeometry args={[0.3, 16]} />
          <meshStandardMaterial color="#6c5ce7" transparent opacity={0.12} />
        </mesh>

        {/* Pulsing ring */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.008, 0]}>
          <ringGeometry args={[0.3, 0.38, 24]} />
          <meshStandardMaterial
            color="#6c5ce7"
            emissive="#6c5ce7"
            emissiveIntensity={0.5}
            transparent
            opacity={0.3}
          />
        </mesh>

        {/* Body capsule */}
        <mesh position={[0, 0.4, 0]} castShadow>
          <capsuleGeometry args={[0.15, 0.32, 4, 12]} />
          <meshStandardMaterial color="#6c5ce7" roughness={0.35} metalness={0.15} emissive="#6c5ce7" emissiveIntensity={0.08} />
        </mesh>

        {/* Head */}
        <mesh position={[0, 0.74, 0]} castShadow>
          <sphereGeometry args={[0.13, 12, 8]} />
          <meshStandardMaterial color="#f0ebe3" roughness={0.6} />
        </mesh>

        {/* Target indicator */}
        {targetRef.current && (
          <mesh rotation-x={-Math.PI / 2} position={[targetRef.current.x - posRef.current.x, 0.01, targetRef.current.z - posRef.current.z]}>
            <ringGeometry args={[0.08, 0.14, 12]} />
            <meshStandardMaterial color="#6c5ce7" transparent opacity={0.4} />
          </mesh>
        )}
      </group>
    </>
  );
}
