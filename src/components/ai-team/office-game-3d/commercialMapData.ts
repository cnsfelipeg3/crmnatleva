/**
 * Commercial Sector Map Data — mapped to v4 agents
 * South of main office (z > 6), separated by glass divider
 */

import type { Vec3, Box3D, CollisionRect } from './mapData3d';

export interface CommercialZone {
  key: string;
  label: string;
  emoji: string;
  color: string;
  lightColor: string;
  lightIntensity: number;
  center: Vec3;
  size: { w: number; h: number };
}

export const COMMERCIAL_ZONES: CommercialZone[] = [
  {
    key: 'boas-vindas',
    label: 'Boas-vindas & SDR',
    emoji: '🌸',
    color: '#3b82f6',
    lightColor: '#d0e8ff',
    lightIntensity: 0.3,
    center: { x: -5.5, y: 0, z: 8.5 },
    size: { w: 6, h: 3.5 },
  },
  {
    key: 'especialistas',
    label: 'Especialistas',
    emoji: '🗺️',
    color: '#f59e0b',
    lightColor: '#fff5d0',
    lightIntensity: 0.25,
    center: { x: 2.5, y: 0, z: 8.5 },
    size: { w: 6, h: 3.5 },
  },
  {
    key: 'proposta-fechamento',
    label: 'Proposta & Fechamento',
    emoji: '🎯',
    color: '#ef4444',
    lightColor: '#ffe0d0',
    lightIntensity: 0.35,
    center: { x: -4, y: 0, z: 13 },
    size: { w: 8, h: 3.5 },
  },
  {
    key: 'pos-venda',
    label: 'Pós-venda & VIP',
    emoji: '🌈',
    color: '#10b981',
    lightColor: '#d0ffe8',
    lightIntensity: 0.3,
    center: { x: 5, y: 0, z: 13 },
    size: { w: 5, h: 3.5 },
  },
];

// ── Commercial desks (mapped to v4 pipeline agents) ────
export const COMMERCIAL_DESKS: { pos: Vec3; size: Vec3; zone: string; label?: string }[] = [
  // Boas-vindas & SDR — MAYA + ATLAS
  { pos: { x: -7, y: 0.4, z: 7.5 }, size: { x: 1.4, y: 0.05, z: 0.7 }, zone: 'boas-vindas', label: 'MAYA' },
  { pos: { x: -5.2, y: 0.4, z: 7.5 }, size: { x: 1.4, y: 0.05, z: 0.7 }, zone: 'boas-vindas', label: 'ATLAS' },

  // Especialistas — HABIBI + NEMO
  { pos: { x: 1, y: 0.4, z: 7.8 }, size: { x: 1.5, y: 0.05, z: 0.75 }, zone: 'especialistas', label: 'HABIBI' },
  { pos: { x: 3.2, y: 0.4, z: 7.8 }, size: { x: 1.5, y: 0.05, z: 0.75 }, zone: 'especialistas', label: 'NEMO' },

  // Proposta & Fechamento — DANTE + LUNA + NERO
  { pos: { x: -6, y: 0.42, z: 12.5 }, size: { x: 1.8, y: 0.06, z: 0.85 }, zone: 'proposta-fechamento', label: 'DANTE' },
  { pos: { x: -3.5, y: 0.42, z: 12.5 }, size: { x: 1.8, y: 0.06, z: 0.85 }, zone: 'proposta-fechamento', label: 'LUNA' },

  // Pós-venda & VIP — NERO + IRIS
  { pos: { x: 4, y: 0.44, z: 12.5 }, size: { x: 2.0, y: 0.06, z: 0.9 }, zone: 'pos-venda', label: 'NERO' },
  { pos: { x: 6.2, y: 0.44, z: 13.5 }, size: { x: 2.0, y: 0.06, z: 0.9 }, zone: 'pos-venda', label: 'IRIS' },
];

// ── Commercial NPC visual data ─────────────────────
export interface CommercialAgent {
  id: string;
  name: string;
  zone: string;
  position: Vec3;
  performance: 'high' | 'medium' | 'low';
  funnelStage: string;
  activeLeads: number;
  dealValue: number;
  lastActivity: string;
  skin: string;
  hair: string;
  hairStyle: 'short' | 'long' | 'bun' | 'buzz';
  shirt: string;
  pants: string;
}

// v4 agent NPCs in the commercial sector
export const COMMERCIAL_AGENTS: CommercialAgent[] = [
  // Boas-vindas & SDR
  { id: 'maya', name: 'MAYA', zone: 'boas-vindas', position: { x: -7, y: 0, z: 8.05 }, performance: 'high', funnelStage: 'Primeiro Contato', activeLeads: 24, dealValue: 0, lastActivity: 'Recepcionando leads', skin: '#f5cba7', hair: '#a0522d', hairStyle: 'long', shirt: '#3b82f6', pants: '#34495e' },
  { id: 'atlas', name: 'ATLAS', zone: 'boas-vindas', position: { x: -5.2, y: 0, z: 8.05 }, performance: 'high', funnelStage: 'Qualificação', activeLeads: 18, dealValue: 45000, lastActivity: 'Qualificando leads', skin: '#d4a574', hair: '#1a1a1a', hairStyle: 'short', shirt: '#3b82f6', pants: '#2c3e50' },

  // Especialistas
  { id: 'habibi', name: 'HABIBI', zone: 'especialistas', position: { x: 1, y: 0, z: 8.35 }, performance: 'high', funnelStage: 'Dubai & Oriente', activeLeads: 8, dealValue: 128000, lastActivity: 'Cotando Maldivas VIP', skin: '#c68642', hair: '#0a0a0a', hairStyle: 'short', shirt: '#f59e0b', pants: '#2c3e50' },
  { id: 'nemo', name: 'NEMO', zone: 'especialistas', position: { x: 3.2, y: 0, z: 8.35 }, performance: 'high', funnelStage: 'Orlando & Américas', activeLeads: 12, dealValue: 95000, lastActivity: 'Roteiro Disney', skin: '#e8c39e', hair: '#3b2f2f', hairStyle: 'short', shirt: '#f59e0b', pants: '#1a1a2e' },

  // Proposta & Fechamento
  { id: 'dante', name: 'DANTE', zone: 'proposta-fechamento', position: { x: -6, y: 0, z: 13.1 }, performance: 'high', funnelStage: 'Europa', activeLeads: 7, dealValue: 185000, lastActivity: 'Montando roteiro Itália', skin: '#f0d5b0', hair: '#3b2f2f', hairStyle: 'short', shirt: '#1a1a2e', pants: '#1a1a2e' },
  { id: 'luna', name: 'LUNA', zone: 'proposta-fechamento', position: { x: -3.5, y: 0, z: 13.1 }, performance: 'high', funnelStage: 'Proposta', activeLeads: 9, dealValue: 210000, lastActivity: 'Montando proposta visual', skin: '#deb887', hair: '#2c1810', hairStyle: 'bun', shirt: '#ef4444', pants: '#34495e' },

  // Pós-venda & VIP
  { id: 'nero', name: 'NERO', zone: 'pos-venda', position: { x: 4, y: 0, z: 13.15 }, performance: 'high', funnelStage: 'Fechamento', activeLeads: 5, dealValue: 340000, lastActivity: 'Negociando fechamento', skin: '#f0d5b0', hair: '#3b2f2f', hairStyle: 'short', shirt: '#10b981', pants: '#1a1a2e' },
  { id: 'iris', name: 'IRIS', zone: 'pos-venda', position: { x: 6.2, y: 0, z: 14.15 }, performance: 'medium', funnelStage: 'Pós-venda', activeLeads: 2, dealValue: 0, lastActivity: 'Coletando NPS', skin: '#deb887', hair: '#d4a017', hairStyle: 'long', shirt: '#10b981', pants: '#34495e' },
];

// ── Collision boxes for commercial desks ─────────
export const COMMERCIAL_COLLISION_BOXES: CollisionRect[] = [
  ...COMMERCIAL_DESKS.map(d => ({
    x: d.pos.x, z: d.pos.z,
    hw: d.size.x / 2 + 0.15, hd: d.size.z / 2 + 0.15,
  })),
];

// Performance aura colors
export const PERF_COLORS: Record<string, string> = {
  high: '#10b981',
  medium: '#f59e0b',
  low: '#ef4444',
};
