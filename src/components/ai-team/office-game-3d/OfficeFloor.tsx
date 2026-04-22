// @ts-nocheck
import { useMemo } from 'react';
import { FLOOR_SIZE, RUG } from './mapData3d';
import * as THREE from 'three';

export default function OfficeFloor() {
  const gridTexture = useMemo(() => {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#e2ddd4';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = '#d5cfc6';
    ctx.lineWidth = 1;
    const plankH = size / 8;
    for (let y = 0; y < size; y += plankH) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    const imgData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 6;
      imgData.data[i] += n;
      imgData.data[i + 1] += n;
      imgData.data[i + 2] += n;
    }
    ctx.putImageData(imgData, 0, 0);

    ctx.fillStyle = '#ccc7be';
    const step = size / 20;
    for (let x = step; x < size; x += step) {
      for (let y = step; y < size; y += step) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4.5, 5);
    tex.anisotropy = 8;
    return tex;
  }, []);

  return (
    <group>
      {/* Main floor — full size including commercial */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[FLOOR_SIZE.w, FLOOR_SIZE.h]} />
        <meshStandardMaterial
          map={gridTexture}
          roughness={0.85}
          metalness={0.02}
          envMapIntensity={0.15}
        />
      </mesh>

      {/* Rug in lounge area (original office) */}
      <mesh rotation-x={-Math.PI / 2} position={[RUG.x, 0.005, RUG.z]}>
        <circleGeometry args={[RUG.rx, 64]} />
        <meshStandardMaterial color="#c2ab8a" roughness={0.95} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[RUG.x, 0.008, RUG.z]}>
        <ringGeometry args={[RUG.rx - 0.15, RUG.rx - 0.04, 64]} />
        <meshStandardMaterial color="#b09878" roughness={0.95} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[RUG.x, 0.009, RUG.z]}>
        <ringGeometry args={[0.6, 0.7, 48]} />
        <meshStandardMaterial color="#b8a080" roughness={0.95} transparent opacity={0.5} />
      </mesh>

      {/* Zone highlights — original office */}
      <mesh rotation-x={-Math.PI / 2} position={[-5.5, 0.003, -4.5]}>
        <planeGeometry args={[3.8, 1.8]} />
        <meshStandardMaterial color="#d8d0c2" roughness={1} transparent opacity={0.4} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[-1.5, 0.002, -2.8]}>
        <planeGeometry args={[14, 2.0]} />
        <meshStandardMaterial color="#ddd6c8" roughness={1} transparent opacity={0.2} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[-2.5, 0.002, 0.2]}>
        <planeGeometry args={[10, 2.0]} />
        <meshStandardMaterial color="#ddd6c8" roughness={1} transparent opacity={0.2} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[6.0, 0.003, 2.8]}>
        <planeGeometry args={[5.0, 3.5]} />
        <meshStandardMaterial color="#ddd5c8" roughness={1} transparent opacity={0.3} />
      </mesh>

      {/* Commercial sector — subtle darker floor tint */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, 13]}>
        <planeGeometry args={[17, 14]} />
        <meshStandardMaterial color="#d5cfc5" roughness={1} transparent opacity={0.15} />
      </mesh>

      {/* Head Comercial — premium rug */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, 17]}>
        <circleGeometry args={[2.5, 48]} />
        <meshStandardMaterial color="#c9a96e" roughness={0.95} transparent opacity={0.12} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.007, 17]}>
        <ringGeometry args={[2.2, 2.4, 48]} />
        <meshStandardMaterial color="#c9a96e" roughness={0.9} transparent opacity={0.2} />
      </mesh>
    </group>
  );
}
