import { useEffect, useRef, type RefObject } from 'react';
import type { Vec2, Camera } from './types';

export interface InputState {
  keys: Set<string>;
  lastClick: Vec2 | null;
  consumed: boolean;
}

export function useInputHandler(
  canvasRef: RefObject<HTMLCanvasElement>,
  cameraRef: RefObject<Camera>,
) {
  const stateRef = useRef<InputState>({ keys: new Set(), lastClick: null, consumed: true });

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      // Prevent page scroll on arrow keys / space
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      stateRef.current.keys.add(e.key.toLowerCase());
    };
    const onUp = (e: KeyboardEvent) => {
      stateRef.current.keys.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onClick = (e: MouseEvent) => {
      const cam = cameraRef.current;
      if (!cam) return;
      const rect = canvas.getBoundingClientRect();
      const gx = (e.clientX - rect.left - cam.offsetX) / cam.scale;
      const gy = (e.clientY - rect.top - cam.offsetY) / cam.scale;
      stateRef.current.lastClick = { x: gx, y: gy };
      stateRef.current.consumed = false;
    };

    canvas.addEventListener('click', onClick);
    return () => canvas.removeEventListener('click', onClick);
  }, [canvasRef, cameraRef]);

  return stateRef;
}
