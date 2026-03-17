import type { Rect, Vec2 } from './types';
import { WORLD_W, WORLD_H } from './types';

/* ── Desks ─────────────────────────────────────── */
export interface DeskDef {
  rect: Rect;
  chairPos: Vec2;
  label?: string;
}

export const DESKS: DeskDef[] = [
  { rect: { x: 180, y: 300, w: 160, h: 80 }, chairPos: { x: 260, y: 400 }, label: 'Auditor' },
  { rect: { x: 500, y: 300, w: 160, h: 80 }, chairPos: { x: 580, y: 400 }, label: 'Estrategista' },
  { rect: { x: 820, y: 300, w: 160, h: 80 }, chairPos: { x: 900, y: 400 } },
  { rect: { x: 440, y: 530, w: 200, h: 90 }, chairPos: { x: 540, y: 640 }, label: 'Gerente' },
];

/* ── NPC spawn positions (at their chairs) ────── */
export const NPC_SPAWNS: Record<string, Vec2> = {
  auditor:       { x: 260, y: 398 },
  estrategista:  { x: 580, y: 398 },
  gerente:       { x: 540, y: 636 },
};

/* ── Player spawn ─────────────────────────────── */
export const PLAYER_SPAWN: Vec2 = { x: 800, y: 790 };

/* ── Zone highlights ──────────────────────────── */
export const ZONES = [
  { rect: { x: 50, y: 36, w: 360, h: 170 }, color: 'rgba(210,195,175,0.18)', label: 'RECEPÇÃO' },
  { rect: { x: 1060, y: 530, w: 490, h: 330 }, color: 'rgba(210,195,175,0.14)', label: 'LOUNGE' },
];

/* ── Decoration positions ─────────────────────── */
export const PLANTS: Vec2[] = [
  { x: 56, y: 460 },
  { x: 1520, y: 76 },
  { x: 1510, y: 540 },
  { x: 380, y: 100 },
];

export const SOFAS = [
  { x: 1100, y: 610, w: 50, h: 120 },
  { x: 1230, y: 780, w: 150, h: 45 },
];

export const RUG = { x: 1150, y: 600, w: 300, h: 200 };

export const WHITEBOARD = { x: 720, y: 490 };

export const RECEPTION_DESK: Rect = { x: 100, y: 100, w: 240, h: 55 };

/* ── Collision rects ──────────────────────────── */
export const COLLISION_RECTS: Rect[] = [
  // Walls
  { x: 0, y: 0, w: WORLD_W, h: 18 },
  { x: 0, y: 0, w: 18, h: WORLD_H },
  { x: WORLD_W - 18, y: 0, w: 18, h: WORLD_H },
  { x: 0, y: WORLD_H - 18, w: WORLD_W, h: 18 },
  // Agent desks
  ...DESKS.map((d) => d.rect),
  // Reception
  RECEPTION_DESK,
  // Sofas
  ...SOFAS.map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h })),
];

/* ── Collision helper ─────────────────────────── */
export function collides(x: number, y: number, radius: number): boolean {
  for (const r of COLLISION_RECTS) {
    if (
      x + radius > r.x &&
      x - radius < r.x + r.w &&
      y + radius > r.y &&
      y - radius < r.y + r.h
    ) {
      return true;
    }
  }
  return false;
}
