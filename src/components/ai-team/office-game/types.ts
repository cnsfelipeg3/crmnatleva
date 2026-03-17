export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface NPCData {
  id: string;
  agentId: string;
  pos: Vec2;
  emoji: string;
  name: string;
  status: string;
  taskCount: number;
}

export interface PlayerState {
  pos: Vec2;
  target: Vec2 | null;
}

export interface GameState {
  player: PlayerState;
  npcs: NPCData[];
  nearbyNpcId: string | null;
}

export interface Camera {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export const WORLD_W = 1600;
export const WORLD_H = 900;
export const PLAYER_SPEED = 220;
export const PLAYER_RADIUS = 14;
export const NPC_RADIUS = 14;
export const INTERACTION_RADIUS = 70;
