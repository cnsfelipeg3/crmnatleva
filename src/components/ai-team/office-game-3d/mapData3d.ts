// Positions mapped for 21 v4 agents across 7 squads
// Floor: 18×24 units (main office + commercial sector)

export interface Vec3 { x: number; y: number; z: number }
export interface Box3D { pos: Vec3; size: Vec3 }

export const FLOOR_SIZE = { w: 18, h: 24 };

// ═══ DESKS ═══
// Row 1 (north) — Orquestração + Operacional (5 desks)
// Row 2 (mid-north) — Atendimento + Financeiro (4 desks)
// Row 3 (mid) — Geração de Demanda + Retenção (4 desks)
// South sector — Comercial (handled in commercialMapData.ts)

export const DESKS: { pos: Vec3; size: Vec3; label?: string }[] = [
  // ═══ ORQUESTRAÇÃO — center, prominent ═══
  { pos: { x: -1.5, y: 0.44, z: -3.5 }, size: { x: 2.0, y: 0.06, z: 0.9 }, label: 'NATH.AI' },
  { pos: { x: 1.5, y: 0.42, z: -3.5 }, size: { x: 1.8, y: 0.06, z: 0.85 }, label: 'ÓRION' },

  // ═══ OPERACIONAL — right side ═══
  { pos: { x: 5.0, y: 0.4, z: -3.5 }, size: { x: 1.5, y: 0.05, z: 0.75 }, label: 'OPEX' },
  { pos: { x: 7.0, y: 0.4, z: -3.5 }, size: { x: 1.5, y: 0.05, z: 0.75 }, label: 'VIGIL' },
  { pos: { x: 6.0, y: 0.4, z: -1.8 }, size: { x: 1.5, y: 0.05, z: 0.75 }, label: 'SENTINEL' },

  // ═══ ATENDIMENTO — left side ═══
  { pos: { x: -6.0, y: 0.4, z: -1.8 }, size: { x: 1.5, y: 0.05, z: 0.75 }, label: 'ATHOS' },
  { pos: { x: -4.0, y: 0.4, z: -1.8 }, size: { x: 1.5, y: 0.05, z: 0.75 }, label: 'ZARA' },

  // ═══ FINANCEIRO — center-left ═══
  { pos: { x: -1.0, y: 0.4, z: -1.0 }, size: { x: 1.5, y: 0.05, z: 0.75 }, label: 'FINX' },
  { pos: { x: 1.5, y: 0.4, z: -1.0 }, size: { x: 1.5, y: 0.05, z: 0.75 }, label: 'SAGE' },

  // ═══ GERAÇÃO DE DEMANDA — left ═══
  { pos: { x: -6.0, y: 0.4, z: 1.0 }, size: { x: 1.5, y: 0.05, z: 0.75 }, label: 'SPARK' },
  { pos: { x: -4.0, y: 0.4, z: 1.0 }, size: { x: 1.5, y: 0.05, z: 0.75 }, label: 'HUNTER' },

  // ═══ RETENÇÃO — right ═══
  { pos: { x: 4.5, y: 0.4, z: 1.0 }, size: { x: 1.5, y: 0.05, z: 0.75 }, label: 'AEGIS' },
  { pos: { x: 6.5, y: 0.4, z: 1.0 }, size: { x: 1.5, y: 0.05, z: 0.75 }, label: 'NURTURE' },
];

// ═══ NPC POSITIONS (21 agents) ═══
// NPCs are positioned behind their desks facing toward monitor (z offset)
export const NPC_POSITIONS: Record<string, Vec3 & { facingY?: number }> = {
  // Orquestração
  "nath-ai":   { x: -1.5, y: 0, z: -2.8, facingY: Math.PI },
  orion:       { x: 1.5,  y: 0, z: -2.8, facingY: Math.PI },

  // Operacional
  opex:        { x: 5.0,  y: 0, z: -2.8, facingY: Math.PI },
  vigil:       { x: 7.0,  y: 0, z: -2.8, facingY: Math.PI },
  sentinel:    { x: 6.0,  y: 0, z: -1.1, facingY: Math.PI },

  // Atendimento
  athos:       { x: -6.0, y: 0, z: -1.1, facingY: Math.PI },
  zara:        { x: -4.0, y: 0, z: -1.1, facingY: Math.PI },

  // Financeiro
  finx:        { x: -1.0, y: 0, z: -0.3, facingY: Math.PI },
  sage:        { x: 1.5,  y: 0, z: -0.3, facingY: Math.PI },

  // Geração de Demanda
  spark:       { x: -6.0, y: 0, z: 1.7, facingY: Math.PI },
  hunter:      { x: -4.0, y: 0, z: 1.7, facingY: Math.PI },

  // Retenção
  aegis:       { x: 4.5,  y: 0, z: 1.7, facingY: Math.PI },
  nurture:     { x: 6.5,  y: 0, z: 1.7, facingY: Math.PI },

  // ═══ SQUAD COMERCIAL (south sector, z > 6) ═══
  maya:        { x: -7.0, y: 0, z: 8.05, facingY: Math.PI },
  atlas:       { x: -5.2, y: 0, z: 8.05, facingY: Math.PI },
  habibi:      { x: 1.0,  y: 0, z: 8.35, facingY: Math.PI },
  nemo:        { x: 3.2,  y: 0, z: 8.35, facingY: Math.PI },
  dante:       { x: -6.0, y: 0, z: 13.1, facingY: Math.PI },
  luna:        { x: -3.5, y: 0, z: 13.1, facingY: Math.PI },
  nero:        { x: 4.0,  y: 0, z: 13.15, facingY: Math.PI },
  iris:        { x: 6.2,  y: 0, z: 14.15, facingY: Math.PI },
};

export const PLAYER_SPAWN: Vec3 = { x: 0, y: 0, z: 4.0 };

export const WALLS = {
  thickness: 0.15,
  height: 2.2,
};

export const RECEPTION: Box3D = {
  pos: { x: -5.5, y: 0.35, z: -5.0 },
  size: { x: 2.8, y: 0.6, z: 0.55 },
};

export const SOFAS: Box3D[] = [
  { pos: { x: 6.0, y: 0.2, z: 3.2 }, size: { x: 0.5, y: 0.4, z: 1.4 } },
  { pos: { x: 7.0, y: 0.2, z: 4.4 }, size: { x: 1.8, y: 0.35, z: 0.5 } },
  { pos: { x: -6.5, y: 0.2, z: 3.8 }, size: { x: 1.6, y: 0.35, z: 0.5 } },
];

export const PLANTS: Vec3[] = [
  { x: -8.2, y: 0, z: -4.5 },
  { x: 8.2, y: 0, z: -4.5 },
  { x: 8.0, y: 0, z: 2.0 },
  { x: -8.0, y: 0, z: 2.0 },
  { x: -4.5, y: 0, z: -5.0 },
  { x: 7.5, y: 0, z: -1.5 },
  { x: 0, y: 0, z: -5.0 },
];

export const RUG = { x: 6.2, z: 3.8, rx: 2.2, rz: 1.8 };

export const WHITEBOARD = { x: 0.5, z: -5.8, w: 1.6, h: 1.0 };

export const CONFERENCE_TABLE: Box3D = {
  pos: { x: -6.5, y: 0.38, z: 4.8 },
  size: { x: 2.2, y: 0.05, z: 1.0 },
};

// Collision boxes (AABB on XZ plane)
export interface CollisionRect { x: number; z: number; hw: number; hd: number }

import { COMMERCIAL_COLLISION_BOXES } from './commercialMapData';

export const COLLISION_BOXES: CollisionRect[] = [
  ...DESKS.map(d => ({ x: d.pos.x, z: d.pos.z, hw: d.size.x / 2 + 0.15, hd: d.size.z / 2 + 0.15 })),
  { x: RECEPTION.pos.x, z: RECEPTION.pos.z, hw: RECEPTION.size.x / 2 + 0.1, hd: RECEPTION.size.z / 2 + 0.1 },
  ...SOFAS.map(s => ({ x: s.pos.x, z: s.pos.z, hw: s.size.x / 2 + 0.1, hd: s.size.z / 2 + 0.1 })),
  { x: CONFERENCE_TABLE.pos.x, z: CONFERENCE_TABLE.pos.z, hw: CONFERENCE_TABLE.size.x / 2 + 0.1, hd: CONFERENCE_TABLE.size.z / 2 + 0.1 },
  { x: 0, z: 6.2, hw: 8, hd: 0.15 }, // Glass divider
  ...COMMERCIAL_COLLISION_BOXES,
  // Walls
  { x: 0, z: -FLOOR_SIZE.h / 2, hw: FLOOR_SIZE.w / 2, hd: 0.15 },
  { x: 0, z: FLOOR_SIZE.h / 2, hw: FLOOR_SIZE.w / 2, hd: 0.15 },
  { x: -FLOOR_SIZE.w / 2, z: 0, hw: 0.15, hd: FLOOR_SIZE.h / 2 },
  { x: FLOOR_SIZE.w / 2, z: 0, hw: 0.15, hd: FLOOR_SIZE.h / 2 },
];

export function collides3D(px: number, pz: number, radius: number): boolean {
  for (const b of COLLISION_BOXES) {
    if (
      px + radius > b.x - b.hw &&
      px - radius < b.x + b.hw &&
      pz + radius > b.z - b.hd &&
      pz - radius < b.z + b.hd
    ) return true;
  }
  return false;
}
