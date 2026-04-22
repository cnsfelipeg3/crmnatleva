// @ts-nocheck
import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const MONITOR_GLB_PATH = '/models/samsung_odyssey_oled_g9.glb';

useGLTF.preload(MONITOR_GLB_PATH);

export default function MonitorModel({ targetWidth = 0.9 }: { targetWidth?: number }) {
  const { scene } = useGLTF(MONITOR_GLB_PATH);
  const group = useMemo(() => {
    const cloned = scene.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const center = box.getCenter(new THREE.Vector3());
    const modelSize = box.getSize(new THREE.Vector3());

    cloned.position.set(-center.x, -box.min.y, -center.z);

    const wrapper = new THREE.Group();
    wrapper.add(cloned);
    wrapper.rotation.y = Math.PI;

    wrapper.updateMatrixWorld(true);
    const rotatedBox = new THREE.Box3().setFromObject(wrapper);
    wrapper.position.y = -rotatedBox.min.y;

    (wrapper as any).__modelWidth = modelSize.x;
    return wrapper;
  }, [scene]);

  const s = targetWidth / ((group as any).__modelWidth || 1.2);

  return <primitive object={group} scale={[s, s, s]} />;
}
