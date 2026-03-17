// Positions mapped from 2D canvas (1600×900) → 3D world (16×9 units)
// x stays x/100, z = y/100 (canvas Y → 3D Z)

export interface Vec3 { x: number; y: number; z: number }
export interface Box3D { pos: Vec3; size: Vec3 }

export const FLOOR_SIZE = { w: 16, h: 9 };

export const DESKS: { pos: Vec3; size: Vec3; label?: string }[] = [
  { pos: { x: -5.4, y: 0.4, z: -1.5 }, size: { x: 1.6, y: 0.05, z: 0.8 }, label: 'Auditor' },
  { pos: { x: -2.2, y: 0.4, z: -1.5 }, size: { x: 1.6, y: 0.05, z: 0.8 }, label: 'Estrategista' },
  { pos: { x: 1.0, y: 0.4, z: -1.5 }, size: { x: 1.6, y: 0.05, z: 0.8 } },
  { pos: { x: -1.6, y: 0.4, z: 0.8 }, size: { x: 2.0, y: 0.05, z: 0.9 }, label: 'Gerente' },
];

export const NPC_POSITIONS: Record<string, Vec3> = {
  auditor:      { x: -5.4, y: 0, z: -0.5 },
  estrategista: { x: -2.2, y: 0, z: -0.5 },
  gerente:      { x: -1.6, y: 0, z: 1.9 },
};

export const PLAYER_SPAWN: Vec3 = { x: 0, y: 0, z: 3.5 };

export const WALLS = {
  thickness: 0.15,
  height: 1.8,
};

export const RECEPTION: Box3D = {
  pos: { x: -5.0, y: 0.35, z: -3.2 },
  size: { x: 2.4, y: 0.55, z: 0.55 },
};

export const SOFAS: Box3D[] = [
  { pos: { x: 4.5, y: 0.2, z: 1.5 }, size: { x: 0.5, y: 0.4, z: 1.2 } },
  { pos: { x: 5.5, y: 0.2, z: 2.8 }, size: { x: 1.5, y: 0.35, z: 0.5 } },
];

export const PLANTS: Vec3[] = [
  { x: -7.2, y: 0, z: 0.5 },
  { x: 7.2, y: 0, z: -3.5 },
  { x: 7.0, y: 0, z: 0.5 },
  { x: -4.0, y: 0, z: -3.2 },
];

export const RUG = { x: 5.0, z: 2.0, rx: 2.0, rz: 1.5 };

export const WHITEBOARD = { x: 0.5, z: -4.3, w: 1.2, h: 0.8 };

// Collision boxes (AABB on XZ plane)
export interface CollisionRect { x: number; z: number; hw: number; hd: number }

export const COLLISION_BOXES: CollisionRect[] = [
  // Desks
  ...DESKS.map(d => ({ x: d.pos.x, z: d.pos.z, hw: d.size.x / 2 + 0.15, hd: d.size.z / 2 + 0.15 })),
  // Reception
  { x: RECEPTION.pos.x, z: RECEPTION.pos.z, hw: RECEPTION.size.x / 2 + 0.1, hd: RECEPTION.size.z / 2 + 0.1 },
  // Sofas
  ...SOFAS.map(s => ({ x: s.pos.x, z: s.pos.z, hw: s.size.x / 2 + 0.1, hd: s.size.z / 2 + 0.1 })),
  // Walls
  { x: 0, z: -FLOOR_SIZE.h / 2, hw: FLOOR_SIZE.w / 2, hd: 0.15 }, // north
  { x: 0, z: FLOOR_SIZE.h / 2, hw: FLOOR_SIZE.w / 2, hd: 0.15 },  // south
  { x: -FLOOR_SIZE.w / 2, z: 0, hw: 0.15, hd: FLOOR_SIZE.h / 2 }, // west
  { x: FLOOR_SIZE.w / 2, z: 0, hw: 0.15, hd: FLOOR_SIZE.h / 2 },  // east
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
