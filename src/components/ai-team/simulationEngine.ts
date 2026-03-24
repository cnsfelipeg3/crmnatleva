/**
 * Simulation Engine v2 — Event-driven, chunked, memory-efficient
 * 
 * Architecture:
 * - Event queue for all lead interactions
 * - Conversation chunking (every CHUNK_SIZE messages → summary + archive)
 * - Lead state isolation (each lead = independent unit)
 * - Incremental processing (only process current event, not full history)
 * - Metrics snapshots (periodic aggregations, not recalculated)
 */

import { supabase } from "@/integrations/supabase/client";
import type { LeadInteligente, MensagemLead } from "./intelligentLeads";
import { compressConversation, estimateTokens } from "./contextCompression";

// ===== CONSTANTS =====
export const CHUNK_SIZE = 30; // Messages per chunk before archiving
const SNAPSHOT_INTERVAL_MS = 15_000; // Metrics snapshot every 15s
const MAX_ACTIVE_CONTEXT_MSGS = 16; // Messages kept in active memory

// ===== TYPES =====
export interface SimulationConfig {
  numLeads: number;
  msgsPerLead: number;
  intervalSec: number;
  duration: number;
  speed: string;
  dispatchMode: "sequential" | "simultaneous" | "wave";
  parallelLeads: number;
  objectionDensity: number;
  enableEvaluation: boolean;
  enableMultiMsg: boolean;
  enableTransfers: boolean;
  emotionalVolatility: number;
  agentResponseLength: "curta" | "media" | "longa";
  enableLossNarrative: boolean;
  evalFrequency: "every" | "every2" | "every3";
  funnelMode: string;
  [key: string]: any; // Additional config fields
}

export interface SimEvent {
  id: string;
  type: SimEventType;
  leadId?: string;
  agentId?: string;
  payload: Record<string, any>;
  timestamp: number;
}

export type SimEventType =
  | "lead_created"
  | "lead_first_message"
  | "agent_response"
  | "lead_response"
  | "objection_raised"
  | "objection_handled"
  | "transfer"
  | "evaluation"
  | "stage_change"
  | "lead_inactive"
  | "lead_reengaged"
  | "lead_closed"
  | "lead_lost"
  | "proposal_sent"
  | "price_image_sent"
  | "chunk_archived"
  | "snapshot_taken"
  | "follow_up"
  | "multi_message";

export interface LeadContextSummary {
  destino: string;
  orcamento: string;
  etapa: string;
  sentimento: string;
  objecoesPrincipais: string[];
  decisoesChave: string[];
  preferencias: string[];
  ultimaIntencao: string;
  resumoConversa: string;
}

export interface ChunkData {
  chunkIndex: number;
  messages: MensagemLead[];
  summary: string;
  tokenEstimate: number;
}

// ===== EVENT QUEUE =====
export class SimEventQueue {
  private queue: SimEvent[] = [];
  private processing = false;
  private handler: ((event: SimEvent) => Promise<void>) | null = null;

  setHandler(fn: (event: SimEvent) => Promise<void>) {
    this.handler = fn;
  }

  enqueue(event: Omit<SimEvent, "id" | "timestamp">) {
    this.queue.push({
      ...event,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    });
    this.processNext();
  }

  enqueueBatch(events: Omit<SimEvent, "id" | "timestamp">[]) {
    for (const e of events) {
      this.queue.push({ ...e, id: crypto.randomUUID(), timestamp: Date.now() });
    }
    this.processNext();
  }

  private async processNext() {
    if (this.processing || this.queue.length === 0 || !this.handler) return;
    this.processing = true;
    while (this.queue.length > 0) {
      const event = this.queue.shift()!;
      try {
        await this.handler(event);
      } catch (err) {
        console.error("Event processing error:", err);
      }
    }
    this.processing = false;
  }

  clear() {
    this.queue = [];
    this.processing = false;
  }

  get pending() { return this.queue.length; }
}

// ===== CONVERSATION CHUNKING =====
export function shouldChunk(messageCount: number): boolean {
  return messageCount >= CHUNK_SIZE && messageCount % CHUNK_SIZE === 0;
}

export function createChunkSummary(messages: MensagemLead[], leadName: string): string {
  if (messages.length === 0) return "";

  const clientMsgs = messages.filter(m => m.role === "client");
  const agentMsgs = messages.filter(m => m.role === "agent");
  const allContent = messages.map(m => m.content).join(" ");

  // Extract key data points
  const destinations = allContent.match(/\b(Maldivas|Paris|Nova York|Tóquio|Dubai|Roma|Cancún|Santorini|Fernando de Noronha|Orlando|Lisboa|Bali|Londres|Grécia|Tailândia|Egito|Marrocos|Peru|Chile|Argentina|Colômbia|México|Europa|Caribe|Japão|Seychelles)\b/gi);
  const budgets = allContent.match(/R\$\s*[\d.,]+(?:\s*(?:mil|k))?/gi);
  const dates = allContent.match(/\b(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/gi);
  const objections = clientMsgs.filter(m =>
    /\b(caro|preço|desconto|concorrente|pensar|depois|difícil|não sei|orçamento|outra agência|vi mais barato)\b/i.test(m.content)
  );
  const positives = clientMsgs.filter(m =>
    /\b(ótimo|maravilh|perfeito|adorei|incrível|lindo|fechado|bora|vamos|quero)\b/i.test(m.content)
  );

  const agents = [...new Set(agentMsgs.filter(m => m.agentName).map(m => m.agentName!))];
  const lastClient = clientMsgs[clientMsgs.length - 1]?.content.slice(0, 100) || "";
  const lastAgent = agentMsgs[agentMsgs.length - 1]?.content.slice(0, 100) || "";

  const parts: string[] = [];
  parts.push(`Bloco com ${messages.length} mensagens (${clientMsgs.length} do cliente, ${agentMsgs.length} do agente)`);
  if (agents.length > 0) parts.push(`Agentes: ${agents.join(", ")}`);
  if (destinations?.length) parts.push(`Destinos: ${[...new Set(destinations)].join(", ")}`);
  if (budgets?.length) parts.push(`Valores: ${[...new Set(budgets)].join(", ")}`);
  if (dates?.length) parts.push(`Datas: ${[...new Set(dates)].join(", ")}`);
  if (objections.length > 0) parts.push(`Objeções (${objections.length}): ${objections.map(o => o.content.slice(0, 40)).join(" | ")}`);
  if (positives.length > 0) parts.push(`Sinais positivos (${positives.length})`);
  parts.push(`Última msg cliente: "${lastClient}"`);
  parts.push(`Última msg agente: "${lastAgent}"`);

  return parts.join("\n");
}

export function buildActiveContext(
  lead: LeadInteligente,
  chunks: ChunkData[],
): { role: string; content: string }[] {
  const recentMsgs = lead.mensagens.slice(-MAX_ACTIVE_CONTEXT_MSGS);

  // If we have archived chunks, prepend their summaries
  if (chunks.length > 0) {
    const chunkSummaries = chunks.map(c =>
      `[RESUMO BLOCO ${c.chunkIndex + 1}]: ${c.summary}`
    ).join("\n\n");

    return [
      {
        role: "user",
        content: `[CONTEXTO HISTÓRICO — ${chunks.reduce((s, c) => s + c.messages.length, 0)} mensagens anteriores resumidas]\n${chunkSummaries}\n[FIM DO CONTEXTO — CONTINUE COM AS MENSAGENS RECENTES]`,
      },
      ...recentMsgs.map(m => ({
        role: m.role === "client" ? "user" : "assistant",
        content: m.content,
      })),
    ];
  }

  // No chunks yet, use compression from contextCompression.ts
  return compressConversation(lead.mensagens);
}

// ===== LEAD CONTEXT MANAGEMENT =====
export function buildLeadContextSummary(lead: LeadInteligente): LeadContextSummary {
  return {
    destino: lead.destino,
    orcamento: lead.orcamento,
    etapa: lead.etapaAtual,
    sentimento: lead.estadoEmocional,
    objecoesPrincipais: lead.objecoesLancadas.slice(-5),
    decisoesChave: lead.informacoesReveladas,
    preferencias: [],
    ultimaIntencao: lead.mensagens.length > 0
      ? lead.mensagens[lead.mensagens.length - 1].content.slice(0, 100)
      : "",
    resumoConversa: `${lead.nome} - ${lead.destino} - ${lead.orcamento} - Etapa: ${lead.etapaAtual} - Sentimento: ${lead.sentimentoScore}/100 - Msgs: ${lead.mensagens.length}`,
  };
}

// ===== METRICS SNAPSHOT =====
export function createMetricsSnapshot(leads: LeadInteligente[]): {
  leadsByStage: Record<string, number>;
  activeLeads: number;
  closedLeads: number;
  lostLeads: number;
  avgSentimento: number;
  avgHumanizacao: number;
  avgEficacia: number;
  avgTecnica: number;
  bottleneckStage: string | null;
  revenueSoFar: number;
} {
  const leadsByStage: Record<string, number> = {};
  let activeCount = 0, closedCount = 0, lostCount = 0;
  let totalSentimento = 0, totalH = 0, totalE = 0, totalT = 0;
  let revenue = 0;

  for (const l of leads) {
    leadsByStage[l.etapaAtual] = (leadsByStage[l.etapaAtual] || 0) + 1;
    if (l.status === "ativo") activeCount++;
    else if (l.status === "fechou") { closedCount++; revenue += l.ticket; }
    else lostCount++;
    totalSentimento += l.sentimentoScore;
    totalH += l.scoreHumanizacao;
    totalE += l.scoreEficacia;
    totalT += l.scoreTecnica;
  }

  const n = leads.length || 1;
  // Find bottleneck: stage with most active leads
  let bottleneck: string | null = null;
  let maxInStage = 0;
  for (const [stage, count] of Object.entries(leadsByStage)) {
    if (count > maxInStage) { maxInStage = count; bottleneck = stage; }
  }

  return {
    leadsByStage,
    activeLeads: activeCount,
    closedLeads: closedCount,
    lostLeads: lostCount,
    avgSentimento: Math.round(totalSentimento / n),
    avgHumanizacao: Math.round(totalH / n),
    avgEficacia: Math.round(totalE / n),
    avgTecnica: Math.round(totalT / n),
    bottleneckStage: bottleneck,
    revenueSoFar: revenue,
  };
}

// ===== DB PERSISTENCE =====
export class SimulationPersistence {
  private simulationId: string | null = null;
  private leadDbIds = new Map<string, string>(); // local lead id → DB UUID
  private eventBuffer: Array<{
    simulation_id: string;
    lead_id?: string;
    event_type: string;
    payload: Record<string, any>;
    agent_id?: string;
  }> = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  async createSimulation(config: SimulationConfig): Promise<string> {
    const { data, error } = await supabase
      .from("simulations")
      .insert({
        config: config as any,
        total_leads: config.numLeads,
        status: "running",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create simulation:", error);
      throw error;
    }

    this.simulationId = data.id;

    // Start event buffer flush every 5s
    this.flushTimer = setInterval(() => this.flushEvents(), 5000);

    return data.id;
  }

  async registerLead(lead: LeadInteligente): Promise<string> {
    if (!this.simulationId) throw new Error("No active simulation");

    const { data, error } = await supabase
      .from("simulated_leads")
      .insert({
        simulation_id: this.simulationId,
        lead_name: lead.nome,
        profile_type: lead.perfil.tipo,
        destino: lead.destino,
        orcamento: lead.orcamento,
        pax: lead.pax,
        ticket: lead.ticket,
        status: "ativo",
        sentimento_score: lead.sentimentoScore,
        paciencia: lead.pacienciaRestante,
        context_summary: buildLeadContextSummary(lead) as any,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to register lead:", error);
      return lead.id;
    }

    this.leadDbIds.set(lead.id, data.id);
    return data.id;
  }

  bufferEvent(event: SimEvent) {
    if (!this.simulationId) return;
    this.eventBuffer.push({
      simulation_id: this.simulationId,
      lead_id: event.leadId ? this.leadDbIds.get(event.leadId) : undefined,
      event_type: event.type,
      payload: event.payload,
      agent_id: event.agentId,
    });

    // Auto-flush if buffer is large
    if (this.eventBuffer.length >= 50) {
      this.flushEvents();
    }
  }

  private async flushEvents() {
    if (this.eventBuffer.length === 0) return;
    const batch = this.eventBuffer.splice(0, this.eventBuffer.length);
    try {
      await supabase.from("simulation_events").insert(batch as any);
    } catch (err) {
      console.error("Failed to flush events:", err);
    }
  }

  async saveChunk(leadId: string, chunk: ChunkData) {
    if (!this.simulationId) return;
    const dbLeadId = this.leadDbIds.get(leadId);
    if (!dbLeadId) return;

    await supabase.from("conversation_chunks").insert({
      lead_id: dbLeadId,
      simulation_id: this.simulationId,
      chunk_index: chunk.chunkIndex,
      messages: chunk.messages as any,
      summary: chunk.summary,
      token_estimate: chunk.tokenEstimate,
      message_count: chunk.messages.length,
    } as any);
  }

  async saveSnapshot(snapshot: ReturnType<typeof createMetricsSnapshot>) {
    if (!this.simulationId) return;
    await supabase.from("metrics_snapshots").insert({
      simulation_id: this.simulationId,
      leads_by_stage: snapshot.leadsByStage as any,
      active_leads: snapshot.activeLeads,
      closed_leads: snapshot.closedLeads,
      lost_leads: snapshot.lostLeads,
      avg_sentimento: snapshot.avgSentimento,
      avg_humanizacao: snapshot.avgHumanizacao,
      avg_eficacia: snapshot.avgEficacia,
      avg_tecnica: snapshot.avgTecnica,
      bottleneck_stage: snapshot.bottleneckStage,
      revenue_so_far: snapshot.revenueSoFar,
    } as any);
  }

  async updateLeadState(leadId: string, updates: Partial<{
    status: string;
    etapa_atual: string;
    sentimento_score: number;
    paciencia: number;
    estado_emocional: string;
    motivo_perda: string;
    score_humanizacao: number;
    score_eficacia: number;
    score_tecnica: number;
    total_messages: number;
    total_chunks: number;
    context_summary: LeadContextSummary;
  }>) {
    const dbId = this.leadDbIds.get(leadId);
    if (!dbId) return;
    await supabase.from("simulated_leads")
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq("id", dbId);
  }

  async finishSimulation(results: {
    leadsClosed: number;
    leadsLost: number;
    conversionRate: number;
    totalRevenue: number;
    scoreGeral: number;
    durationSeconds: number;
    debrief?: any;
  }) {
    if (!this.simulationId) return;
    await this.flushEvents();
    if (this.flushTimer) clearInterval(this.flushTimer);

    await supabase.from("simulations").update({
      status: "finished",
      finished_at: new Date().toISOString(),
      leads_closed: results.leadsClosed,
      leads_lost: results.leadsLost,
      conversion_rate: results.conversionRate,
      total_revenue: results.totalRevenue,
      score_geral: results.scoreGeral,
      duration_seconds: results.durationSeconds,
      debrief: results.debrief,
    } as any).eq("id", this.simulationId);
  }

  async loadSimulationHistory(limit = 20): Promise<any[]> {
    const { data } = await supabase
      .from("simulations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    return data ?? [];
  }

  async loadSimulationLeads(simId: string): Promise<any[]> {
    const { data } = await supabase
      .from("simulated_leads")
      .select("*")
      .eq("simulation_id", simId)
      .order("created_at");
    return data ?? [];
  }

  async loadSimulationSnapshots(simId: string): Promise<any[]> {
    const { data } = await supabase
      .from("metrics_snapshots")
      .select("*")
      .eq("simulation_id", simId)
      .order("snapshot_at");
    return data ?? [];
  }

  cleanup() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushEvents();
    this.eventBuffer = [];
    this.leadDbIds.clear();
    this.simulationId = null;
  }

  get currentSimulationId() { return this.simulationId; }
}

// ===== LEAD CHUNK MANAGER =====
export class LeadChunkManager {
  private chunks = new Map<string, ChunkData[]>(); // leadId → chunks
  private persistence: SimulationPersistence;

  constructor(persistence: SimulationPersistence) {
    this.persistence = persistence;
  }

  /**
   * Check if lead conversation needs chunking.
   * If so, archive oldest messages into a chunk with summary.
   */
  async processLead(lead: LeadInteligente): Promise<boolean> {
    if (!shouldChunk(lead.mensagens.length)) return false;

    const leadChunks = this.chunks.get(lead.id) || [];
    const chunkIndex = leadChunks.length;

    // Take the oldest CHUNK_SIZE messages
    const toArchive = lead.mensagens.splice(0, CHUNK_SIZE);
    const summary = createChunkSummary(toArchive, lead.nome);
    const tokenEst = estimateTokens(toArchive.map(m => ({ content: m.content })));

    const chunkData: ChunkData = {
      chunkIndex,
      messages: toArchive,
      summary,
      tokenEstimate: tokenEst,
    };

    leadChunks.push(chunkData);
    this.chunks.set(lead.id, leadChunks);

    // Persist chunk to DB
    await this.persistence.saveChunk(lead.id, chunkData);

    return true;
  }

  getChunks(leadId: string): ChunkData[] {
    return this.chunks.get(leadId) || [];
  }

  getTotalArchivedMessages(leadId: string): number {
    return (this.chunks.get(leadId) || []).reduce((s, c) => s + c.messages.length, 0);
  }

  clear() {
    this.chunks.clear();
  }
}

// ===== SNAPSHOT SCHEDULER =====
export class SnapshotScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private persistence: SimulationPersistence;
  private getLeads: () => LeadInteligente[];

  constructor(persistence: SimulationPersistence, getLeads: () => LeadInteligente[]) {
    this.persistence = persistence;
    this.getLeads = getLeads;
  }

  start() {
    this.timer = setInterval(async () => {
      const snapshot = createMetricsSnapshot(this.getLeads());
      await this.persistence.saveSnapshot(snapshot);
    }, SNAPSHOT_INTERVAL_MS);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
