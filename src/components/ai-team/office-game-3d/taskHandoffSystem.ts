/**
 * Task Handoff System
 * Manages a queue of animated "folder delivery" events between NPCs.
 * Purely visual — does not affect real data.
 */

import { COMMERCIAL_AGENTS, type CommercialAgent } from './commercialMapData';
import { NPC_POSITIONS } from './mapData3d';

export interface HandoffEvent {
  id: string;
  fromId: string;
  toId: string;
  fromPos: { x: number; y: number; z: number };
  toPos: { x: number; y: number; z: number };
  clientName: string;
  funnelStage: string;
  dealValue: number;
  priority: 'hot' | 'warm' | 'normal';
  startedAt: number;
  /** 0→1 progress of entire animation (rise, walk, deliver, return) */
  progress: number;
  phase: 'rising' | 'walking' | 'delivering' | 'returning' | 'done';
}

// ── Simulated transfer routes ────────────────────
const TRANSFER_ROUTES: { from: string; to: string; stage: string }[] = [
  { from: 'sdr1', to: 'qual1', stage: 'Qualificação' },
  { from: 'sdr2', to: 'qual2', stage: 'Qualificação' },
  { from: 'sdr4', to: 'qual3', stage: 'Qualificação' },
  { from: 'qual1', to: 'closer1', stage: 'Negociação' },
  { from: 'qual2', to: 'closer2', stage: 'Negociação' },
  { from: 'qual3', to: 'closer3', stage: 'Negociação' },
  { from: 'closer1', to: 'vip1', stage: 'Fechamento' },
  { from: 'closer2', to: 'vip2', stage: 'Fechamento' },
  { from: 'closer3', to: 'vip1', stage: 'Fechamento' },
];

const CLIENT_NAMES = [
  'Fam. Silva', 'João M.', 'Ana P.', 'Carlos R.', 'Marcela S.',
  'Pedro H.', 'Julia F.', 'Fernanda L.', 'Roberto C.', 'Isabella G.',
  'Thiago B.', 'Lucas V.', 'Marina A.', 'Daniel K.', 'Beatriz O.',
];

const PRIORITIES: HandoffEvent['priority'][] = ['hot', 'warm', 'normal'];

let idCounter = 0;

function getAgentPos(agentId: string): { x: number; y: number; z: number } | null {
  const comm = COMMERCIAL_AGENTS.find(a => a.id === agentId);
  if (comm) return comm.position;
  const npc = NPC_POSITIONS[agentId];
  if (npc) return npc;
  return null;
}

/** Generate a random handoff event */
export function generateRandomHandoff(): HandoffEvent | null {
  const route = TRANSFER_ROUTES[Math.floor(Math.random() * TRANSFER_ROUTES.length)];
  const fromPos = getAgentPos(route.from);
  const toPos = getAgentPos(route.to);
  if (!fromPos || !toPos) return null;

  return {
    id: `hoff_${++idCounter}`,
    fromId: route.from,
    toId: route.to,
    fromPos: { ...fromPos },
    toPos: { ...toPos },
    clientName: CLIENT_NAMES[Math.floor(Math.random() * CLIENT_NAMES.length)],
    funnelStage: route.stage,
    dealValue: Math.floor(Math.random() * 150 + 15) * 1000,
    priority: PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)],
    startedAt: Date.now(),
    progress: 0,
    phase: 'rising',
  };
}

// ── Phase timing (seconds) ───────────────────────
const PHASE_RISE = 0.8;
const PHASE_DELIVER = 0.6;
const PHASE_RETURN = 0; // agent teleports back (simpler)

const WALK_SPEED = 1.8; // units per second

export function getWalkDuration(from: { x: number; z: number }, to: { x: number; z: number }): number {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  return Math.sqrt(dx * dx + dz * dz) / WALK_SPEED;
}

export function getTotalDuration(event: HandoffEvent): number {
  return PHASE_RISE + getWalkDuration(event.fromPos, event.toPos) + PHASE_DELIVER;
}

/** Advance handoff progress, returns updated event */
export function tickHandoff(event: HandoffEvent, deltaSec: number): HandoffEvent {
  const totalDur = getTotalDuration(event);
  const newProgress = Math.min(1, event.progress + deltaSec / totalDur);

  const riseEnd = PHASE_RISE / totalDur;
  const walkEnd = (PHASE_RISE + getWalkDuration(event.fromPos, event.toPos)) / totalDur;
  const deliverEnd = 1;

  let phase: HandoffEvent['phase'];
  if (newProgress < riseEnd) phase = 'rising';
  else if (newProgress < walkEnd) phase = 'walking';
  else if (newProgress < deliverEnd) phase = 'delivering';
  else phase = 'done';

  return { ...event, progress: newProgress, phase };
}

/** Get interpolated position of the walking agent */
export function getHandoffPosition(event: HandoffEvent): { x: number; y: number; z: number; rotation: number } {
  const totalDur = getTotalDuration(event);
  const riseEnd = PHASE_RISE / totalDur;
  const walkEnd = (PHASE_RISE + getWalkDuration(event.fromPos, event.toPos)) / totalDur;

  if (event.progress < riseEnd) {
    // Rising from desk
    return { x: event.fromPos.x, y: 0, z: event.fromPos.z, rotation: 0 };
  }

  if (event.progress >= walkEnd) {
    // At destination
    const angle = Math.atan2(
      event.fromPos.x - event.toPos.x,
      event.fromPos.z - event.toPos.z,
    );
    return { x: event.toPos.x, y: 0, z: event.toPos.z, rotation: angle };
  }

  // Walking — lerp position
  const walkProgress = (event.progress - riseEnd) / (walkEnd - riseEnd);
  const x = event.fromPos.x + (event.toPos.x - event.fromPos.x) * walkProgress;
  const z = event.fromPos.z + (event.toPos.z - event.fromPos.z) * walkProgress;
  const angle = Math.atan2(
    event.toPos.x - event.fromPos.x,
    event.toPos.z - event.fromPos.z,
  );
  return { x, y: 0, z, rotation: angle };
}

// ── Priority colors ──────────────────────────────
export const PRIORITY_COLORS: Record<HandoffEvent['priority'], string> = {
  hot: '#ef4444',
  warm: '#f59e0b',
  normal: '#3b82f6',
};
