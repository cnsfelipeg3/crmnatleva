/**
 * Commercial Sector Map Data
 * The commercial sector is placed SOUTH of the existing office (z > 6)
 * separated by a glass divider wall.
 *
 * Floor expands from 18×11 to 18×24
 */

import type { Vec3, Box3D, CollisionRect } from './mapData3d';

// ── Zone definitions ──────────────────────────────
export interface CommercialZone {
  key: string;
  label: string;
  emoji: string;
  color: string;          // HSL accent
  lightColor: string;     // zone ambient tint
  lightIntensity: number;
  center: Vec3;
  size: { w: number; h: number };
}

export const COMMERCIAL_ZONES: CommercialZone[] = [
  {
    key: 'prospeccao',
    label: 'Prospecção',
    emoji: '🆕',
    color: '#3b82f6',
    lightColor: '#d0e8ff',
    lightIntensity: 0.3,
    center: { x: -5.5, y: 0, z: 8.5 },
    size: { w: 6, h: 3.5 },
  },
  {
    key: 'qualificacao',
    label: 'Qualificação',
    emoji: '🔍',
    color: '#f59e0b',
    lightColor: '#fff5d0',
    lightIntensity: 0.25,
    center: { x: 2.5, y: 0, z: 8.5 },
    size: { w: 6, h: 3.5 },
  },
  {
    key: 'negociacao',
    label: 'Negociação',
    emoji: '🤝',
    color: '#ef4444',
    lightColor: '#ffe0d0',
    lightIntensity: 0.35,
    center: { x: -4, y: 0, z: 13 },
    size: { w: 8, h: 3.5 },
  },
  {
    key: 'fechamento',
    label: 'Fechamento VIP',
    emoji: '✅',
    color: '#10b981',
    lightColor: '#d0ffe8',
    lightIntensity: 0.3,
    center: { x: 5, y: 0, z: 13 },
    size: { w: 5, h: 3.5 },
  },
  {
    key: 'lider',
    label: 'Head Comercial',
    emoji: '👑',
    color: '#c9a96e',
    lightColor: '#fff5e0',
    lightIntensity: 0.35,
    center: { x: 0, y: 0, z: 17 },
    size: { w: 6, h: 3 },
  },
];

// ── Commercial desks ────────────────────────────
export const COMMERCIAL_DESKS: { pos: Vec3; size: Vec3; zone: string; label?: string }[] = [
  // Prospecção — 4 desks in tight rows
  { pos: { x: -7, y: 0.4, z: 7.5 }, size: { x: 1.4, y: 0.05, z: 0.7 }, zone: 'prospeccao', label: 'SDR 1' },
  { pos: { x: -5.2, y: 0.4, z: 7.5 }, size: { x: 1.4, y: 0.05, z: 0.7 }, zone: 'prospeccao', label: 'SDR 2' },
  { pos: { x: -7, y: 0.4, z: 9.5 }, size: { x: 1.4, y: 0.05, z: 0.7 }, zone: 'prospeccao', label: 'SDR 3' },
  { pos: { x: -5.2, y: 0.4, z: 9.5 }, size: { x: 1.4, y: 0.05, z: 0.7 }, zone: 'prospeccao', label: 'SDR 4' },

  // Qualificação — 3 desks, more spaced
  { pos: { x: 1, y: 0.4, z: 7.8 }, size: { x: 1.5, y: 0.05, z: 0.75 }, zone: 'qualificacao', label: 'Qualificador 1' },
  { pos: { x: 3.2, y: 0.4, z: 7.8 }, size: { x: 1.5, y: 0.05, z: 0.75 }, zone: 'qualificacao', label: 'Qualificador 2' },
  { pos: { x: 2.1, y: 0.4, z: 9.6 }, size: { x: 1.5, y: 0.05, z: 0.75 }, zone: 'qualificacao', label: 'Qualificador 3' },

  // Negociação — 3 executive desks (larger)
  { pos: { x: -6, y: 0.42, z: 12.5 }, size: { x: 1.8, y: 0.06, z: 0.85 }, zone: 'negociacao', label: 'Closer 1' },
  { pos: { x: -3.5, y: 0.42, z: 12.5 }, size: { x: 1.8, y: 0.06, z: 0.85 }, zone: 'negociacao', label: 'Closer 2' },
  { pos: { x: -4.8, y: 0.42, z: 14 }, size: { x: 1.8, y: 0.06, z: 0.85 }, zone: 'negociacao', label: 'Closer 3' },

  // Fechamento VIP — 2 premium desks
  { pos: { x: 4, y: 0.44, z: 12.5 }, size: { x: 2.0, y: 0.06, z: 0.9 }, zone: 'fechamento', label: 'VIP 1' },
  { pos: { x: 6.2, y: 0.44, z: 13.5 }, size: { x: 2.0, y: 0.06, z: 0.9 }, zone: 'fechamento', label: 'VIP 2' },

  // Head Comercial — 1 elevated/central desk
  { pos: { x: 0, y: 0.46, z: 17 }, size: { x: 2.4, y: 0.07, z: 1.0 }, zone: 'lider', label: 'Head Comercial' },
];

// ── Commercial NPC positions ─────────────────────
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

// NPCs seated at their desks — z = desk.z + size.z/2 + 0.2, facing -Z (toward monitor)
export const COMMERCIAL_AGENTS: CommercialAgent[] = [
  // Prospecção (desks at z=7.5 sz=0.7 → seat z=8.05, desks at z=9.5 → seat z=10.05)
  { id: 'sdr1', name: 'Lucas', zone: 'prospeccao', position: { x: -7, y: 0, z: 8.05 }, performance: 'high', funnelStage: 'Novo Lead', activeLeads: 24, dealValue: 0, lastActivity: 'Enviou 5 mensagens', skin: '#d4a574', hair: '#1a1a1a', hairStyle: 'short', shirt: '#3b82f6', pants: '#2c3e50' },
  { id: 'sdr2', name: 'Marina', zone: 'prospeccao', position: { x: -5.2, y: 0, z: 8.05 }, performance: 'medium', funnelStage: 'Contato Inicial', activeLeads: 18, dealValue: 0, lastActivity: 'Qualificando lead', skin: '#f5cba7', hair: '#a0522d', hairStyle: 'long', shirt: '#3b82f6', pants: '#34495e' },
  { id: 'sdr3', name: 'Rafael', zone: 'prospeccao', position: { x: -7, y: 0, z: 10.05 }, performance: 'low', funnelStage: 'Sem Resposta', activeLeads: 8, dealValue: 0, lastActivity: 'Parado há 2h', skin: '#c68642', hair: '#0a0a0a', hairStyle: 'buzz', shirt: '#3b82f6', pants: '#2c3e50' },
  { id: 'sdr4', name: 'Ana', zone: 'prospeccao', position: { x: -5.2, y: 0, z: 10.05 }, performance: 'high', funnelStage: 'Lead Ativo', activeLeads: 31, dealValue: 0, lastActivity: 'Agendou call', skin: '#f0d5b0', hair: '#654321', hairStyle: 'bun', shirt: '#3b82f6', pants: '#34495e' },

  // Qualificação (desks at z=7.8 sz=0.75 → seat z=8.375, z=9.6 → seat z=10.175)
  { id: 'qual1', name: 'Pedro', zone: 'qualificacao', position: { x: 1, y: 0, z: 8.35 }, performance: 'high', funnelStage: 'Qualificando', activeLeads: 12, dealValue: 45000, lastActivity: 'Analisando perfil', skin: '#e8c39e', hair: '#3b2f2f', hairStyle: 'short', shirt: '#f59e0b', pants: '#2c3e50' },
  { id: 'qual2', name: 'Juliana', zone: 'qualificacao', position: { x: 3.2, y: 0, z: 8.35 }, performance: 'medium', funnelStage: 'Diagnóstico', activeLeads: 8, dealValue: 32000, lastActivity: 'Levantando orçamento', skin: '#deb887', hair: '#d4a017', hairStyle: 'long', shirt: '#f59e0b', pants: '#34495e' },
  { id: 'qual3', name: 'Thiago', zone: 'qualificacao', position: { x: 2.1, y: 0, z: 10.15 }, performance: 'high', funnelStage: 'Entendendo Cliente', activeLeads: 15, dealValue: 67000, lastActivity: 'Montando proposta', skin: '#d4a574', hair: '#1a1a1a', hairStyle: 'short', shirt: '#f59e0b', pants: '#1a1a2e' },

  // Negociação (desks at z=12.5 sz=0.85 → seat z=13.125, z=14 → seat z=14.625)
  { id: 'closer1', name: 'Carlos', zone: 'negociacao', position: { x: -6, y: 0, z: 13.1 }, performance: 'high', funnelStage: 'Negociação', activeLeads: 5, dealValue: 128000, lastActivity: 'Em call com cliente', skin: '#f0d5b0', hair: '#3b2f2f', hairStyle: 'short', shirt: '#1a1a2e', pants: '#1a1a2e' },
  { id: 'closer2', name: 'Fernanda', zone: 'negociacao', position: { x: -3.5, y: 0, z: 13.1 }, performance: 'medium', funnelStage: 'Proposta Enviada', activeLeads: 7, dealValue: 95000, lastActivity: 'Aguardando retorno', skin: '#f5cba7', hair: '#8b4513', hairStyle: 'long', shirt: '#ef4444', pants: '#34495e' },
  { id: 'closer3', name: 'Roberto', zone: 'negociacao', position: { x: -4.8, y: 0, z: 14.6 }, performance: 'high', funnelStage: 'Ajustes', activeLeads: 3, dealValue: 210000, lastActivity: 'Revisando proposta', skin: '#c68642', hair: '#0a0a0a', hairStyle: 'buzz', shirt: '#1a1a2e', pants: '#2c3e50' },

  // Fechamento VIP (desks at z=12.5 sz=0.9 → seat z=13.15, z=13.5 → seat z=14.15)
  { id: 'vip1', name: 'Isabella', zone: 'fechamento', position: { x: 4, y: 0, z: 13.15 }, performance: 'high', funnelStage: 'Fechamento', activeLeads: 2, dealValue: 185000, lastActivity: 'Fechou venda!', skin: '#deb887', hair: '#2c1810', hairStyle: 'bun', shirt: '#10b981', pants: '#1a1a2e' },
  { id: 'vip2', name: 'Daniel', zone: 'fechamento', position: { x: 6.2, y: 0, z: 14.15 }, performance: 'high', funnelStage: 'Pós-Venda', activeLeads: 1, dealValue: 340000, lastActivity: 'Confirmando docs', skin: '#e8c39e', hair: '#3b2f2f', hairStyle: 'short', shirt: '#10b981', pants: '#1a1a2e' },

  // Head Comercial (desk at z=17 sz=1.0 → seat z=17.7)
  { id: 'head', name: 'Marcelo', zone: 'lider', position: { x: 0, y: 0, z: 17.7 }, performance: 'high', funnelStage: 'Gestão', activeLeads: 0, dealValue: 0, lastActivity: 'Monitorando funil', skin: '#f0d5b0', hair: '#3b2f2f', hairStyle: 'short', shirt: '#0a1420', pants: '#0a1420' },
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
