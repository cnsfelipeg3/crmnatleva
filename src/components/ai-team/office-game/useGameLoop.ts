import { useEffect, useRef, type MutableRefObject, type RefObject } from 'react';
import type { GameState, Camera } from './types';
import { PLAYER_SPEED, PLAYER_RADIUS, INTERACTION_RADIUS } from './types';
import type { InputState } from './useInputHandler';
import { collides } from './mapData';
import { renderFrame } from './renderer';

export function useGameLoop(
  canvasRef: RefObject<HTMLCanvasElement>,
  gameStateRef: MutableRefObject<GameState>,
  inputRef: MutableRefObject<InputState>,
  cameraRef: MutableRefObject<Camera>,
  onInteract: (agentId: string) => void,
) {
  const rafRef = useRef(0);
  const lastRef = useRef(0);

  useEffect(() => {
    const loop = (ts: number) => {
      const dt = Math.min((ts - (lastRef.current || ts)) / 1000, 0.05);
      lastRef.current = ts;

      const canvas = canvasRef.current;
      if (!canvas) { rafRef.current = requestAnimationFrame(loop); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) { rafRef.current = requestAnimationFrame(loop); return; }

      const state = gameStateRef.current;
      const input = inputRef.current;

      /* ── Handle click ─────────────────────── */
      if (input.lastClick && !input.consumed) {
        input.consumed = true;
        const c = input.lastClick;
        let clickedNpc = false;
        for (const npc of state.npcs) {
          const dx = c.x - npc.pos.x;
          const dy = c.y - npc.pos.y;
          if (dx * dx + dy * dy < 900) { // 30px radius
            onInteract(npc.agentId);
            clickedNpc = true;
            break;
          }
        }
        if (!clickedNpc) {
          state.player.target = { x: c.x, y: c.y };
        }
      }

      /* ── Handle E key ─────────────────────── */
      if (input.keys.has('e') && state.nearbyNpcId) {
        input.keys.delete('e');
        onInteract(state.nearbyNpcId);
      }

      /* ── WASD / Arrow movement ────────────── */
      let vx = 0, vy = 0;
      if (input.keys.has('w') || input.keys.has('arrowup')) vy = -1;
      if (input.keys.has('s') || input.keys.has('arrowdown')) vy = 1;
      if (input.keys.has('a') || input.keys.has('arrowleft')) vx = -1;
      if (input.keys.has('d') || input.keys.has('arrowright')) vx = 1;

      if (vx || vy) {
        state.player.target = null;
        const len = Math.sqrt(vx * vx + vy * vy);
        const mx = (vx / len) * PLAYER_SPEED * dt;
        const my = (vy / len) * PLAYER_SPEED * dt;
        const nx = state.player.pos.x + mx;
        if (!collides(nx, state.player.pos.y, PLAYER_RADIUS)) state.player.pos.x = nx;
        const ny = state.player.pos.y + my;
        if (!collides(state.player.pos.x, ny, PLAYER_RADIUS)) state.player.pos.y = ny;
      }

      /* ── Click-to-move ────────────────────── */
      if (state.player.target) {
        const dx = state.player.target.x - state.player.pos.x;
        const dy = state.player.target.y - state.player.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 3) {
          state.player.target = null;
        } else {
          const step = PLAYER_SPEED * dt;
          const r = Math.min(step / dist, 1);
          const mx = dx * r;
          const my = dy * r;
          const nx = state.player.pos.x + mx;
          if (!collides(nx, state.player.pos.y, PLAYER_RADIUS)) state.player.pos.x = nx;
          const ny = state.player.pos.y + my;
          if (!collides(state.player.pos.x, ny, PLAYER_RADIUS)) state.player.pos.y = ny;
        }
      }

      /* ── Proximity check ──────────────────── */
      state.nearbyNpcId = null;
      let minD = INTERACTION_RADIUS;
      for (const npc of state.npcs) {
        const dx = state.player.pos.x - npc.pos.x;
        const dy = state.player.pos.y - npc.pos.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < minD) { minD = d; state.nearbyNpcId = npc.id; }
      }

      /* ── Resize canvas ────────────────────── */
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const cw = rect.width;
      const ch = rect.height;
      if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
      }

      /* ── Render ────────────────────────────── */
      ctx.save();
      ctx.scale(dpr, dpr);
      const cam = renderFrame(ctx, state, ts / 1000, cw, ch);
      cameraRef.current = cam;
      ctx.restore();

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [canvasRef, gameStateRef, inputRef, cameraRef, onInteract]);
}
