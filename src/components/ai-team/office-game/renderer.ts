import type { GameState, Camera, NPCData, PlayerState } from './types';
import { WORLD_W, WORLD_H, INTERACTION_RADIUS } from './types';
import {
  DESKS, ZONES, PLANTS, SOFAS, RUG, WHITEBOARD,
  RECEPTION_DESK,
} from './mapData';

/* ── Color palette ─────────────────────────────── */
const C = {
  floorBase: '#f0ece6',
  floorDot: '#ddd8d0',
  wallOuter: '#cfc9c0',
  wallAccent: '#bfb9b0',
  zoneLabel: '#b0aaa2',
  deskTop0: '#7d6b55',
  deskTop1: '#6b5b47',
  deskShadow: 'rgba(60,45,30,0.10)',
  deskEdge: 'rgba(255,255,255,0.07)',
  monitor: '#2a2a2a',
  screen: '#1a1a2e',
  screenGlow: 'rgba(70,100,180,0.35)',
  keyboard: '#484848',
  chair: '#505050',
  chairHi: 'rgba(255,255,255,0.07)',
  receptionTop0: '#4a4035',
  receptionTop1: '#3a3025',
  receptionAccent: '#c4a97d',
  sofaBase: '#7a6b58',
  sofaCushion: '#8a7b68',
  sofaBack: '#6a5b48',
  rug: '#c9b99a',
  rugInner: '#b8a888',
  wbBoard: '#f5f5f5',
  wbFrame: '#d0d0d0',
  wbLine: '#ccc',
  plantLeaf: '#5a8a6a',
  plantLeaf2: '#4a7a58',
  plantLeaf3: '#6a9a7a',
  plantPot: '#8b7355',
  statusIdle: '#9ca3af',
  statusAnalyzing: '#3b82f6',
  statusSuggesting: '#10b981',
  playerBody0: '#8577ed',
  playerBody1: '#6c5ce7',
  playerGlow: 'rgba(108,92,231,0.15)',
  playerRing: 'rgba(108,92,231,',
  npcBg: '#f5f0e8',
  textDark: '#3a3530',
  badge: '#ef4444',
  promptBg: 'rgba(20,18,15,0.75)',
  entranceMat: 'rgba(108,92,231,0.06)',
  shadow: 'rgba(0,0,0,',
};

/* ── Helpers ───────────────────────────────────── */
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function ellipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function statusColor(s: string) {
  return s === 'analyzing' ? C.statusAnalyzing : s === 'suggesting' ? C.statusSuggesting : C.statusIdle;
}

/* ── Floor ─────────────────────────────────────── */
function drawFloor(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = C.floorBase;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.fillStyle = C.floorDot;
  for (let x = 30; x < WORLD_W; x += 30) {
    for (let y = 30; y < WORLD_H; y += 30) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/* ── Walls ─────────────────────────────────────── */
function drawWalls(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = C.wallOuter;
  ctx.fillRect(0, 0, WORLD_W, 14);
  ctx.fillRect(0, 0, 14, WORLD_H);
  ctx.fillRect(WORLD_W - 14, 0, 14, WORLD_H);
  ctx.fillRect(0, WORLD_H - 14, WORLD_W, 14);
  ctx.strokeStyle = C.wallAccent;
  ctx.lineWidth = 1;
  ctx.strokeRect(14.5, 14.5, WORLD_W - 29, WORLD_H - 29);
}

/* ── Zones ─────────────────────────────────────── */
function drawZones(ctx: CanvasRenderingContext2D) {
  for (const z of ZONES) {
    ctx.fillStyle = z.color;
    rr(ctx, z.rect.x, z.rect.y, z.rect.w, z.rect.h, 12);
    ctx.fill();
    ctx.font = '600 9px system-ui';
    ctx.fillStyle = C.zoneLabel;
    ctx.textAlign = 'left';
    ctx.fillText(z.label, z.rect.x + 16, z.rect.y + 20);
  }
  // Entrance mat
  ctx.fillStyle = C.entranceMat;
  rr(ctx, WORLD_W / 2 - 50, WORLD_H - 56, 100, 36, 8);
  ctx.fill();
  ctx.font = '600 7px system-ui';
  ctx.fillStyle = 'rgba(108,92,231,0.25)';
  ctx.textAlign = 'center';
  ctx.fillText('ENTRADA', WORLD_W / 2, WORLD_H - 34);
}

/* ── Rug ───────────────────────────────────────── */
function drawRug(ctx: CanvasRenderingContext2D) {
  const { x, y, w, h } = RUG;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = C.rug;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2 - 14, h / 2 - 10, 0, 0, Math.PI * 2);
  ctx.strokeStyle = C.rugInner;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

/* ── Desk ──────────────────────────────────────── */
function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Shadow
  ctx.fillStyle = C.deskShadow;
  rr(ctx, x + 3, y + 4, w, h, 5);
  ctx.fill();
  // Surface
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, C.deskTop0);
  g.addColorStop(1, C.deskTop1);
  ctx.fillStyle = g;
  rr(ctx, x, y, w, h, 5);
  ctx.fill();
  // Top edge highlight
  ctx.strokeStyle = C.deskEdge;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 5, y + 0.5);
  ctx.lineTo(x + w - 5, y + 0.5);
  ctx.stroke();
  // Monitor
  const mw = 28, mh = 20, mx = x + w / 2 - mw / 2, my = y + 10;
  ctx.fillStyle = C.monitor;
  rr(ctx, mx, my, mw, mh, 2);
  ctx.fill();
  ctx.fillStyle = C.screen;
  rr(ctx, mx + 2, my + 2, mw - 4, mh - 6, 1);
  ctx.fill();
  ctx.fillStyle = C.screenGlow;
  rr(ctx, mx + 4, my + 4, mw - 8, mh - 10, 1);
  ctx.fill();
  // Stand
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(x + w / 2 - 3, my + mh, 6, 4);
  // Keyboard
  ctx.fillStyle = C.keyboard;
  rr(ctx, x + w / 2 - 14, y + h - 22, 28, 12, 2);
  ctx.fill();
}

/* ── Chair ─────────────────────────────────────── */
function drawChair(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ellipse(ctx, cx, cy + 2, 11, 6, `${C.shadow}0.05)`);
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fillStyle = C.chair;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx - 2, cy - 2, 4, 0, Math.PI * 2);
  ctx.fillStyle = C.chairHi;
  ctx.fill();
}

/* ── Reception desk ────────────────────────────── */
function drawReception(ctx: CanvasRenderingContext2D) {
  const { x, y, w, h } = RECEPTION_DESK;
  ctx.fillStyle = C.deskShadow;
  rr(ctx, x + 3, y + 4, w, h, 6);
  ctx.fill();
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, C.receptionTop0);
  g.addColorStop(1, C.receptionTop1);
  ctx.fillStyle = g;
  rr(ctx, x, y, w, h, 6);
  ctx.fill();
  ctx.fillStyle = C.receptionAccent;
  ctx.fillRect(x + 12, y + 5, w - 24, 3);
  // Small computer
  ctx.fillStyle = C.monitor;
  rr(ctx, x + w / 2 - 16, y + 18, 32, 22, 2);
  ctx.fill();
  ctx.fillStyle = C.screen;
  rr(ctx, x + w / 2 - 14, y + 20, 28, 15, 1);
  ctx.fill();
}

/* ── Sofas ─────────────────────────────────────── */
function drawSofas(ctx: CanvasRenderingContext2D) {
  for (const s of SOFAS) {
    ctx.fillStyle = `${C.shadow}0.06)`;
    rr(ctx, s.x + 2, s.y + 3, s.w, s.h, 6);
    ctx.fill();
    ctx.fillStyle = C.sofaBase;
    rr(ctx, s.x, s.y, s.w, s.h, 6);
    ctx.fill();
    ctx.fillStyle = C.sofaCushion;
    rr(ctx, s.x + 4, s.y + 4, s.w - 8, s.h - 8, 4);
    ctx.fill();
    // Back rest
    const isHorz = s.w > s.h;
    if (isHorz) {
      ctx.fillStyle = C.sofaBack;
      rr(ctx, s.x + 2, s.y, s.w - 4, s.h * 0.28, 4);
      ctx.fill();
    } else {
      ctx.fillStyle = C.sofaBack;
      rr(ctx, s.x, s.y + 2, s.w * 0.28, s.h - 4, 4);
      ctx.fill();
    }
  }
}

/* ── Whiteboard ────────────────────────────────── */
function drawWhiteboard(ctx: CanvasRenderingContext2D) {
  const { x, y } = WHITEBOARD;
  ctx.fillStyle = C.wbBoard;
  rr(ctx, x, y, 84, 52, 3);
  ctx.fill();
  ctx.strokeStyle = C.wbFrame;
  ctx.lineWidth = 2;
  rr(ctx, x, y, 84, 52, 3);
  ctx.stroke();
  ctx.strokeStyle = C.wbLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 12, y + 16); ctx.lineTo(x + 64, y + 16);
  ctx.moveTo(x + 12, y + 26); ctx.lineTo(x + 52, y + 26);
  ctx.moveTo(x + 12, y + 36); ctx.lineTo(x + 44, y + 36);
  ctx.stroke();
}

/* ── Plants ────────────────────────────────────── */
function drawPlant(ctx: CanvasRenderingContext2D, px: number, py: number) {
  ctx.fillStyle = C.plantPot;
  rr(ctx, px - 8, py, 16, 12, 3);
  ctx.fill();
  ctx.fillStyle = C.plantLeaf;
  ctx.beginPath(); ctx.arc(px, py - 6, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.plantLeaf2;
  ctx.beginPath(); ctx.arc(px - 4, py - 9, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.plantLeaf3;
  ctx.beginPath(); ctx.arc(px + 4, py - 11, 6, 0, Math.PI * 2); ctx.fill();
}

/* ── NPC ───────────────────────────────────────── */
function drawNPC(ctx: CanvasRenderingContext2D, npc: NPCData, t: number, isNearby: boolean) {
  const { x, y } = npc.pos;
  const bob = Math.sin(t * 2 + npc.id.charCodeAt(0) * 0.7) * 1.5;
  const ny = y + bob;

  // Shadow
  ellipse(ctx, x, ny + 18, 13, 5, `${C.shadow}0.08)`);

  // Active glow
  const sc = statusColor(npc.status);
  if (npc.status !== 'idle') {
    const gl = ctx.createRadialGradient(x, ny, 0, x, ny, 28);
    gl.addColorStop(0, sc + '20');
    gl.addColorStop(1, sc + '00');
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(x, ny, 28, 0, Math.PI * 2); ctx.fill();
  }

  // Proximity ring
  if (isNearby) {
    const p = 0.5 + Math.sin(t * 4) * 0.25;
    ctx.beginPath(); ctx.arc(x, ny, 24, 0, Math.PI * 2);
    ctx.strokeStyle = `${C.playerRing}${p})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Status ring
  ctx.beginPath(); ctx.arc(x, ny, 17, 0, Math.PI * 2);
  ctx.fillStyle = sc;
  ctx.fill();

  // Body
  ctx.beginPath(); ctx.arc(x, ny, 14.5, 0, Math.PI * 2);
  ctx.fillStyle = C.npcBg;
  ctx.fill();

  // Emoji
  ctx.font = '16px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(npc.emoji, x, ny + 1);

  // Name
  ctx.font = 'bold 10px system-ui';
  ctx.fillStyle = C.textDark;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(npc.name, x, ny + 26);

  // Status label
  const sLabel = npc.status === 'analyzing' ? 'Analisando' : npc.status === 'suggesting' ? 'Sugerindo' : 'Aguardando';
  ctx.font = '600 8px system-ui';
  ctx.fillStyle = sc;
  ctx.fillText(`● ${sLabel}`, x, ny + 39);

  // Task badge
  if (npc.taskCount > 0) {
    ctx.beginPath(); ctx.arc(x + 14, ny - 14, 7, 0, Math.PI * 2);
    ctx.fillStyle = C.badge;
    ctx.fill();
    ctx.font = 'bold 8px system-ui';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(npc.taskCount), x + 14, ny - 13.5);
  }
}

/* ── Player ────────────────────────────────────── */
function drawPlayer(ctx: CanvasRenderingContext2D, p: PlayerState, t: number) {
  const { x, y } = p.pos;

  // Shadow
  ellipse(ctx, x, y + 18, 14, 6, `${C.playerRing}0.12)`);

  // Glow
  const gs = 24 + Math.sin(t * 3) * 3;
  const gl = ctx.createRadialGradient(x, y, 0, x, y, gs);
  gl.addColorStop(0, C.playerGlow);
  gl.addColorStop(1, 'rgba(108,92,231,0)');
  ctx.fillStyle = gl;
  ctx.beginPath(); ctx.arc(x, y, gs, 0, Math.PI * 2); ctx.fill();

  // Dashed ring
  const pulse = 0.35 + Math.sin(t * 2) * 0.25;
  ctx.beginPath(); ctx.arc(x, y, 21, 0, Math.PI * 2);
  ctx.strokeStyle = `${C.playerRing}${pulse})`;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Outer ring
  ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2);
  const bg = ctx.createRadialGradient(x - 3, y - 3, 0, x, y, 17);
  bg.addColorStop(0, C.playerBody0);
  bg.addColorStop(1, C.playerBody1);
  ctx.fillStyle = bg;
  ctx.fill();

  // Inner face
  ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.fillStyle = C.npcBg;
  ctx.fill();

  // Icon
  ctx.font = '14px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🧑‍💻', x, y + 1);

  // Label
  ctx.font = 'bold 10px system-ui';
  ctx.fillStyle = C.playerBody1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Você', x, y + 26);

  // Move target indicator
  if (p.target) {
    const ta = 0.25 + Math.sin(t * 5) * 0.15;
    ctx.beginPath(); ctx.arc(p.target.x, p.target.y, 6, 0, Math.PI * 2);
    ctx.strokeStyle = `${C.playerRing}${ta})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

/* ── Interaction prompt ────────────────────────── */
function drawPrompt(ctx: CanvasRenderingContext2D, npc: NPCData, t: number) {
  const bob = Math.sin(t * 2 + npc.id.charCodeAt(0) * 0.7) * 1.5;
  const py = npc.pos.y + bob - 46;
  const px = npc.pos.x;
  const a = 0.7 + Math.sin(t * 3) * 0.15;
  ctx.fillStyle = `rgba(20,18,15,${a})`;
  rr(ctx, px - 52, py - 11, 104, 22, 10);
  ctx.fill();
  ctx.font = '600 9px system-ui';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('E  ou  Clique', px, py);
}

/* ── Main render ───────────────────────────────── */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  time: number,
  viewW: number,
  viewH: number,
): Camera {
  // Clear
  ctx.fillStyle = '#e8e4dc';
  ctx.fillRect(0, 0, viewW, viewH);

  // Camera
  const scale = Math.min(viewW / WORLD_W, viewH / WORLD_H);
  const ox = (viewW - WORLD_W * scale) / 2;
  const oy = (viewH - WORLD_H * scale) / 2;

  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);

  // Background layers
  drawFloor(ctx);
  drawWalls(ctx);
  drawZones(ctx);
  drawRug(ctx);

  // Furniture (static, sorted by Y)
  drawReception(ctx);
  drawWhiteboard(ctx);
  for (const pl of PLANTS) drawPlant(ctx, pl.x, pl.y);
  drawSofas(ctx);

  // Desks + chairs (draw desk first, then chair in front)
  for (const d of DESKS) {
    drawDesk(ctx, d.rect.x, d.rect.y, d.rect.w, d.rect.h);
    drawChair(ctx, d.chairPos.x, d.chairPos.y);
  }

  // Entities — depth sort by Y
  const entities: { y: number; type: 'npc' | 'player'; data: NPCData | PlayerState }[] = [
    ...state.npcs.map((n) => ({ y: n.pos.y, type: 'npc' as const, data: n })),
    { y: state.player.pos.y, type: 'player' as const, data: state.player },
  ];
  entities.sort((a, b) => a.y - b.y);

  for (const e of entities) {
    if (e.type === 'npc') {
      const npc = e.data as NPCData;
      drawNPC(ctx, npc, time, state.nearbyNpcId === npc.id);
    } else {
      drawPlayer(ctx, e.data as PlayerState, time);
    }
  }

  // Interaction prompt
  if (state.nearbyNpcId) {
    const npc = state.npcs.find((n) => n.id === state.nearbyNpcId);
    if (npc) drawPrompt(ctx, npc, time);
  }

  ctx.restore();
  return { scale, offsetX: ox, offsetY: oy };
}
