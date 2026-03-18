// Positions mapped from 2D canvas (1600×900) → 3D world (16×9 units)
// x stays x/100, z = y/100 (canvas Y → 3D Z)

export interface Vec3 { x: number; y: number; z: number }
export interface Box3D { pos: Vec3; size: Vec3 }

export const FLOOR_SIZE = { w: 18, h: 20 };

export const DESKS: { pos: Vec3; size: Vec3; label?: string }[] = [
  // Row 1 (north) — 5 desks
  { pos: { x: -6.0, y: 0.4, z: -2.8 }, size: { x: 1.5, y: 0.05, z: 0.75 }, label: 'Auditor' },
  { pos: { x: -3.2, y: 0.4, z: -2.8 }, size: { x: 1.5, y: 0.05, z: 0.75 }, label: 'Estrategista' },
  { pos: { x: -0.4, y: 0.4, z: -2.8 }, size: { x: 1.5, y: 0.05, z: 0.75 }, label: 'Analista' },
  { pos: { x: 2.4, y: 0.4, z: -2.8 }, size: { x: 1.5, y: 0.05, z: 0.75 }, label: 'Financeiro' },
  { pos: { x: 5.2, y: 0.4, z: -2.8 }, size: { x: 1.5, y: 0.05, z: 0.75 }, label: 'Marketing' },
  // Row 2 (south) — 5 desks
  { pos: { x: -6.0, y: 0.4, z: 0.2 }, size: { x: 1.5, y: 0.05, z: 0.75 }, label: 'Comercial' },
  { pos: { x: -3.2, y: 0.4, z: 0.2 }, size: { x: 1.5, y: 0.05, z: 0.75 }, label: 'Atendimento' },
  { pos: { x: -0.4, y: 0.4, z: 0.2 }, size: { x: 1.5, y: 0.05, z: 0.75 }, label: 'Operacional' },
  { pos: { x: 2.4, y: 0.4, z: 0.2 }, size: { x: 1.5, y: 0.05, z: 0.75 }, label: 'Inovação' },
  // Manager desk (center, prominent)
  { pos: { x: 2.4, y: 0.42, z: -1.2 }, size: { x: 2.0, y: 0.06, z: 0.9 }, label: 'Gerente' },
];

export const NPC_POSITIONS: Record<string, Vec3> = {
  auditor:       { x: -6.0, y: 0, z: -1.8 },
  estrategista:  { x: -3.2, y: 0, z: -1.8 },
  analista:      { x: -0.4, y: 0, z: -1.8 },
  financeiro:    { x: 2.4, y: 0, z: -1.8 },
  marketing:     { x: 5.2, y: 0, z: -1.8 },
  comercial:     { x: -6.0, y: 0, z: 1.2 },
  atendimento:   { x: -3.2, y: 0, z: 1.2 },
  operacional:   { x: -0.4, y: 0, z: 1.2 },
  inovacao:      { x: 2.4, y: 0, z: 1.2 },
  gerente:       { x: 2.4, y: 0, z: -0.1 },
};

export const PLAYER_SPAWN: Vec3 = { x: 0, y: 0, z: 5.5 };

export const WALLS = {
  thickness: 0.15,
  height: 2.2,
};

export const RECEPTION: Box3D = {
  pos: { x: -5.5, y: 0.35, z: -4.5 },
  size: { x: 2.8, y: 0.6, z: 0.55 },
};

export const SOFAS: Box3D[] = [
  { pos: { x: 6.0, y: 0.2, z: 2.2 }, size: { x: 0.5, y: 0.4, z: 1.4 } },
  { pos: { x: 7.0, y: 0.2, z: 3.4 }, size: { x: 1.8, y: 0.35, z: 0.5 } },
  // Meeting corner
  { pos: { x: -6.5, y: 0.2, z: 3.0 }, size: { x: 1.6, y: 0.35, z: 0.5 } },
];

export const PLANTS: Vec3[] = [
  { x: -8.2, y: 0, z: -4.0 },
  { x: 8.2, y: 0, z: -4.0 },
  { x: 8.0, y: 0, z: 1.0 },
  { x: -8.0, y: 0, z: 1.0 },
  { x: -4.5, y: 0, z: -4.5 },
  { x: 7.5, y: 0, z: -1.5 },
  { x: 0, y: 0, z: -4.5 },
];

export const RUG = { x: 6.2, z: 2.8, rx: 2.2, rz: 1.8 };

export const WHITEBOARD = { x: 0.5, z: -5.3, w: 1.6, h: 1.0 };

export const CONFERENCE_TABLE: Box3D = {
  pos: { x: -6.5, y: 0.38, z: 3.8 },
  size: { x: 2.2, y: 0.05, z: 1.0 },
};

// Collision boxes (AABB on XZ plane)
export interface CollisionRect { x: number; z: number; hw: number; hd: number }

export const COLLISION_BOXES: CollisionRect[] = [
  // Desks
  ...DESKS.map(d => ({ x: d.pos.x, z: d.pos.z, hw: d.size.x / 2 + 0.15, hd: d.size.z / 2 + 0.15 })),
  // Reception
  { x: RECEPTION.pos.x, z: RECEPTION.pos.z, hw: RECEPTION.size.x / 2 + 0.1, hd: RECEPTION.size.z / 2 + 0.1 },
  // Sofas
  ...SOFAS.map(s => ({ x: s.pos.x, z: s.pos.z, hw: s.size.x / 2 + 0.1, hd: s.size.z / 2 + 0.1 })),
  // Conference table
  { x: CONFERENCE_TABLE.pos.x, z: CONFERENCE_TABLE.pos.z, hw: CONFERENCE_TABLE.size.x / 2 + 0.1, hd: CONFERENCE_TABLE.size.z / 2 + 0.1 },
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
