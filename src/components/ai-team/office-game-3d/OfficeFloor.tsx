import { useMemo } from 'react';
import { FLOOR_SIZE, RUG } from './mapData3d';
import * as THREE from 'three';

export default function OfficeFloor() {
  // Grid texture generated procedurally
  const gridTexture = useMemo(() => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base
    ctx.fillStyle = '#e8e4dc';
    ctx.fillRect(0, 0, size, size);

    // Subtle grid dots
    ctx.fillStyle = '#d8d3cb';
    const step = size / 16;
    for (let x = step; x < size; x += step) {
      for (let y = step; y < size; y += step) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 2.25);
    return tex;
  }, []);

  return (
    <group>
      {/* Main floor */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[FLOOR_SIZE.w, FLOOR_SIZE.h]} />
        <meshStandardMaterial map={gridTexture} roughness={0.95} metalness={0} />
      </mesh>

      {/* Rug in lounge area */}
      <mesh rotation-x={-Math.PI / 2} position={[RUG.x, 0.005, RUG.z]}>
        <circleGeometry args={[RUG.rx, 48]} />
        <meshStandardMaterial color="#c9b99a" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[RUG.x, 0.008, RUG.z]}>
        <ringGeometry args={[RUG.rx - 0.15, RUG.rx - 0.05, 48]} />
        <meshStandardMaterial color="#b8a888" roughness={1} />
      </mesh>

      {/* Zone highlights */}
      {/* Reception zone */}
      <mesh rotation-x={-Math.PI / 2} position={[-5, 0.003, -3.2]}>
        <planeGeometry args={[3.6, 1.7]} />
        <meshStandardMaterial color="#ddd5c8" roughness={1} transparent opacity={0.5} />
      </mesh>
      {/* Lounge zone */}
      <mesh rotation-x={-Math.PI / 2} position={[5, 0.003, 2]}>
        <planeGeometry args={[4.8, 3.2]} />
        <meshStandardMaterial color="#ddd5c8" roughness={1} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}
