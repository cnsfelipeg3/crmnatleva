/**
 * Hook that wires SimulationPersistence into the SimuladorAutoMode.
 * Provides a clean API for the UI component to persist simulation data.
 */
import { useRef, useCallback } from "react";
import {
  SimulationPersistence,
  LeadChunkManager,
  SnapshotScheduler,
  type SimulationConfig,
  type SimEvent,
  createMetricsSnapshot,
  buildLeadContextSummary,
} from "@/components/ai-team/simulationEngine";
import type { LeadInteligente } from "@/components/ai-team/intelligentLeads";

export function useSimulationPersistence() {
  const persistenceRef = useRef<SimulationPersistence | null>(null);
  const chunkManagerRef = useRef<LeadChunkManager | null>(null);
  const snapshotSchedulerRef = useRef<SnapshotScheduler | null>(null);

  const startSimulation = useCallback(async (config: SimulationConfig, getLeads: () => LeadInteligente[]) => {
    // Cleanup any previous session
    persistenceRef.current?.cleanup();
    snapshotSchedulerRef.current?.stop();

    const persistence = new SimulationPersistence();
    persistenceRef.current = persistence;

    const chunkManager = new LeadChunkManager(persistence);
    chunkManagerRef.current = chunkManager;

    try {
      const simId = await persistence.createSimulation(config);

      // Start periodic snapshots
      const scheduler = new SnapshotScheduler(persistence, getLeads);
      snapshotSchedulerRef.current = scheduler;
      scheduler.start();

      return simId;
    } catch (err) {
      console.error("Failed to start simulation persistence:", err);
      return null;
    }
  }, []);

  const registerLead = useCallback(async (lead: LeadInteligente) => {
    if (!persistenceRef.current) return;
    try {
      await persistenceRef.current.registerLead(lead);
    } catch (err) {
      console.error("Failed to register lead:", err);
    }
  }, []);

  const bufferEvent = useCallback((event: SimEvent) => {
    persistenceRef.current?.bufferEvent(event);
  }, []);

  const processChunking = useCallback(async (lead: LeadInteligente) => {
    if (!chunkManagerRef.current) return false;
    return chunkManagerRef.current.processLead(lead);
  }, []);

  const getChunks = useCallback((leadId: string) => {
    return chunkManagerRef.current?.getChunks(leadId) || [];
  }, []);

  const updateLeadState = useCallback(async (lead: LeadInteligente) => {
    if (!persistenceRef.current) return;
    try {
      await persistenceRef.current.updateLeadState(lead.id, {
        status: lead.status,
        etapa_atual: lead.etapaAtual,
        sentimento_score: lead.sentimentoScore,
        paciencia: lead.pacienciaRestante,
        estado_emocional: lead.estadoEmocional,
        motivo_perda: lead.motivoPerda || undefined,
        score_humanizacao: lead.scoreHumanizacao,
        score_eficacia: lead.scoreEficacia,
        score_tecnica: lead.scoreTecnica,
        total_messages: lead.mensagens.length,
        total_chunks: chunkManagerRef.current?.getChunks(lead.id).length || 0,
        context_summary: buildLeadContextSummary(lead),
      });
    } catch (err) {
      console.error("Failed to update lead state:", err);
    }
  }, []);

  const finishSimulation = useCallback(async (results: {
    leadsClosed: number;
    leadsLost: number;
    conversionRate: number;
    totalRevenue: number;
    scoreGeral: number;
    durationSeconds: number;
    debrief?: any;
  }) => {
    snapshotSchedulerRef.current?.stop();
    if (!persistenceRef.current) return;
    try {
      await persistenceRef.current.finishSimulation(results);
    } catch (err) {
      console.error("Failed to finish simulation:", err);
    }
  }, []);

  const loadHistory = useCallback(async (limit = 20) => {
    const p = persistenceRef.current || new SimulationPersistence();
    return p.loadSimulationHistory(limit);
  }, []);

  const cleanup = useCallback(() => {
    snapshotSchedulerRef.current?.stop();
    persistenceRef.current?.cleanup();
    chunkManagerRef.current?.clear();
  }, []);

  return {
    startSimulation,
    registerLead,
    bufferEvent,
    processChunking,
    getChunks,
    updateLeadState,
    finishSimulation,
    loadHistory,
    cleanup,
  };
}
