// @ts-nocheck
import { useRef, useCallback, useEffect, useState } from 'react';

interface Props {
  onMove: (dx: number, dz: number) => void;
  onRelease: () => void;
}

const RADIUS = 50;
const KNOB = 22;

export default function VirtualJoystick({ onMove, onRelease }: Props) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const originRef = useRef({ x: 0, y: 0 });

  const handleStart = useCallback((cx: number, cy: number) => {
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    originRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    setActive(true);
    handleMove(cx, cy);
  }, []);

  const handleMove = useCallback((cx: number, cy: number) => {
    const dx = cx - originRef.current.x;
    const dy = cy - originRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clamped = Math.min(dist, RADIUS);
    const angle = Math.atan2(dy, dx);
    const nx = Math.cos(angle) * clamped;
    const ny = Math.sin(angle) * clamped;
    setKnobPos({ x: nx, y: ny });
    if (dist > 8) {
      onMove(nx / RADIUS, ny / RADIUS);
    } else {
      onMove(0, 0);
    }
  }, [onMove]);

  const handleEnd = useCallback(() => {
    setActive(false);
    setKnobPos({ x: 0, y: 0 });
    onRelease();
  }, [onRelease]);

  useEffect(() => {
    if (!active) return;
    const move = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      handleMove(t.clientX, t.clientY);
    };
    const end = () => handleEnd();
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end);
    window.addEventListener('touchcancel', end);
    return () => {
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
      window.removeEventListener('touchcancel', end);
    };
  }, [active, handleMove, handleEnd]);

  return (
    <div
      ref={baseRef}
      className="absolute bottom-20 left-6 z-50 pointer-events-auto"
      style={{ width: RADIUS * 2 + 12, height: RADIUS * 2 + 12 }}
      onTouchStart={(e) => {
        e.stopPropagation();
        const t = e.touches[0];
        handleStart(t.clientX, t.clientY);
      }}
    >
      {/* Base ring */}
      <div
        className="absolute rounded-full border-2 border-white/20"
        style={{
          width: RADIUS * 2,
          height: RADIUS * 2,
          left: 6,
          top: 6,
          background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
          backdropFilter: 'blur(4px)',
        }}
      />
      {/* Knob */}
      <div
        className="absolute rounded-full"
        style={{
          width: KNOB * 2,
          height: KNOB * 2,
          left: RADIUS + 6 - KNOB + knobPos.x,
          top: RADIUS + 6 - KNOB + knobPos.y,
          background: active
            ? 'radial-gradient(circle, rgba(108,92,231,0.7) 0%, rgba(108,92,231,0.3) 100%)'
            : 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.08) 100%)',
          border: '2px solid rgba(255,255,255,0.3)',
          boxShadow: active ? '0 0 20px rgba(108,92,231,0.4)' : 'none',
          transition: active ? 'none' : 'all 0.2s ease-out',
        }}
      />
    </div>
  );
}
