import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users, TrendingUp, TrendingDown, Zap, Eye, Clock,
  ArrowRight, X, Sparkles, Activity, Radio, AlertTriangle,
  Target, Flame, Trophy, Timer, ArrowUpRight, Shield,
  BarChart3, ChevronRight, Gauge,
} from "lucide-react";

// ─── TYPES ───
interface FunnelStage {
  id: string;
  label: string;
  emoji: string;
  agent: string;
  color: string;
  glowColor: string;
}

interface LeadDot {
  id: string;
  name: string;
  stage: string;
  prevStage: string | null;
  movedAt: number;
  score: number;
  phone?: string;
}

interface BottleneckAlert {
  stageId: string;
  type: "overload" | "slow" | "stuck" | "agent_overload";
  message: string;
  severity: "warning" | "critical";
  since: number;
  impact: string;
}

interface AgentStats {
  agent: string;
  emoji: string;
  stageId: string;
  leadsReceived: number;
  leadsAdvanced: number;
  progressionRate: number;
  avgTimeMin: number;
  currentLoad: number;
  trend: "up" | "down" | "stable";
}

// ─── STAGES ───
const STAGES: FunnelStage[] = [
  { id: "novo_lead", label: "Recepção", emoji: "🌟", agent: "MAYA", color: "hsl(45 93% 58%)", glowColor: "rgba(234,179,8,0.3)" },
  { id: "qualificacao", label: "Qualificação", emoji: "🔍", agent: "ATLAS", color: "hsl(210 100% 56%)", glowColor: "rgba(59,130,246,0.3)" },
  { id: "especialista", label: "Especialista", emoji: "🎯", agent: "ÓRION", color: "hsl(280 80% 60%)", glowColor: "rgba(168,85,247,0.3)" },
  { id: "proposta_preparacao", label: "Proposta", emoji: "💎", agent: "LUNA", color: "hsl(160 60% 45%)", glowColor: "rgba(16,185,129,0.3)" },
  { id: "negociacao", label: "Negociação", emoji: "🤝", agent: "NERO", color: "hsl(32 95% 55%)", glowColor: "rgba(249,115,22,0.3)" },
  { id: "fechamento", label: "Fechamento", emoji: "🏆", agent: "NERO", color: "hsl(142 71% 45%)", glowColor: "rgba(34,197,94,0.3)" },
  { id: "pos_venda", label: "Pós-venda", emoji: "✨", agent: "IRIS", color: "hsl(340 75% 55%)", glowColor: "rgba(244,63,94,0.3)" },
];

const STAGE_ORDER = STAGES.map(s => s.id);

// ─── INTELLIGENCE ENGINE ───
function detectBottlenecks(leads: LeadDot[], stageCounts: Record<string, number>, rates: Record<string, { in: number; out: number }>): BottleneckAlert[] {
  const alerts: BottleneckAlert[] = [];
  const avgCount = Object.values(stageCounts).reduce((a, b) => a + b, 0) / STAGES.length;

  STAGES.forEach((stage, idx) => {
    const count = stageCounts[stage.id] || 0;
    const inRate = rates[stage.id]?.in || 0;
    const outRate = rates[stage.id]?.out || 0;
    const stageLeads = leads.filter(l => l.stage === stage.id);
    const avgTime = stageLeads.length > 0
      ? stageLeads.reduce((sum, l) => sum + (Date.now() - l.movedAt), 0) / stageLeads.length / 60000
      : 0;

    // Overload: 2x average
    if (count > avgCount * 2 && count > 5) {
      alerts.push({
        stageId: stage.id,
        type: "overload",
        message: `${count} leads acumulados em ${stage.label}`,
        severity: count > avgCount * 3 ? "critical" : "warning",
        since: Math.min(...stageLeads.map(l => l.movedAt)),
        impact: `${Math.round((count / leads.length) * 100)}% do funil concentrado aqui`,
      });
    }

    // Slow: in >> out
    if (inRate > 0 && outRate === 0 && count > 3) {
      alerts.push({
        stageId: stage.id,
        type: "stuck",
        message: `Leads não estão saindo de ${stage.label}`,
        severity: "critical",
        since: Date.now() - 300000,
        impact: `${count} leads parados, taxa de saída: 0/min`,
      });
    }

    // Slow throughput
    if (avgTime > 30 && count > 2) {
      alerts.push({
        stageId: stage.id,
        type: "slow",
        message: `Tempo médio alto em ${stage.label}: ${Math.round(avgTime)}min`,
        severity: avgTime > 60 ? "critical" : "warning",
        since: Date.now() - avgTime * 60000,
        impact: `Leads demoram ${Math.round(avgTime)}min em média nesta etapa`,
      });
    }
  });

  return alerts;
}

function predictClosings(leads: LeadDot[], stageCounts: Record<string, number>): {
  predicted: number;
  highProbability: number;
  atRisk: number;
  trend: string;
} {
  // Conversion probability by stage distance to closing
  const stageProb: Record<string, number> = {
    novo_lead: 0.05,
    qualificacao: 0.12,
    especialista: 0.25,
    proposta_preparacao: 0.45,
    negociacao: 0.70,
    fechamento: 0.90,
    pos_venda: 1.0,
  };

  let totalPredicted = 0;
  let highProb = 0;
  let atRisk = 0;

  leads.forEach(l => {
    const prob = stageProb[l.stage] || 0;
    const timeInStage = (Date.now() - l.movedAt) / 60000;
    // Decay probability if stuck too long
    const decayedProb = prob * Math.max(0.3, 1 - (timeInStage / 120) * 0.5);

    totalPredicted += decayedProb;
    if (decayedProb >= 0.6) highProb++;
    if (decayedProb < 0.15 && l.score < 40) atRisk++;
  });

  const closingLeads = stageCounts["fechamento"] || 0;
  const negoLeads = stageCounts["negociacao"] || 0;

  return {
    predicted: Math.round(totalPredicted),
    highProbability: highProb,
    atRisk,
    trend: negoLeads + closingLeads > 5 ? "Funil aquecido 🔥" : negoLeads + closingLeads > 2 ? "Fluxo estável" : "Funil frio ❄️",
  };
}

function computeAgentStats(leads: LeadDot[], stageCounts: Record<string, number>, rates: Record<string, { in: number; out: number }>): AgentStats[] {
  const agentMap: Record<string, AgentStats> = {};

  STAGES.forEach(stage => {
    const agent = stage.agent;
    if (!agentMap[agent]) {
      agentMap[agent] = {
        agent,
        emoji: stage.emoji,
        stageId: stage.id,
        leadsReceived: 0,
        leadsAdvanced: 0,
        progressionRate: 0,
        avgTimeMin: 0,
        currentLoad: 0,
        trend: "stable",
      };
    }

    const count = stageCounts[stage.id] || 0;
    const inR = rates[stage.id]?.in || 0;
    const outR = rates[stage.id]?.out || 0;
    const stageLeads = leads.filter(l => l.stage === stage.id);
    const avgTime = stageLeads.length > 0
      ? stageLeads.reduce((sum, l) => sum + (Date.now() - l.movedAt), 0) / stageLeads.length / 60000
      : 0;

    agentMap[agent].leadsReceived += count + inR;
    agentMap[agent].leadsAdvanced += outR;
    agentMap[agent].currentLoad += count;
    agentMap[agent].avgTimeMin = Math.max(agentMap[agent].avgTimeMin, avgTime);
    agentMap[agent].trend = outR > inR ? "up" : outR < inR ? "down" : "stable";
  });

  Object.values(agentMap).forEach(a => {
    a.progressionRate = a.leadsReceived > 0
      ? Math.round((a.leadsAdvanced / a.leadsReceived) * 100)
      : 0;
  });

  return Object.values(agentMap).sort((a, b) => b.progressionRate - a.progressionRate);
}

// ─── HEATMAP INTENSITY ───
function getHeatmapStyle(count: number, maxCount: number, alerts: BottleneckAlert[], stageId: string) {
  const intensity = maxCount > 0 ? Math.min(count / maxCount, 1) : 0;
  const hasAlert = alerts.some(a => a.stageId === stageId);
  const isCritical = alerts.some(a => a.stageId === stageId && a.severity === "critical");

  if (isCritical) {
    return {
      borderColor: "hsl(0 72% 51%)",
      glowIntensity: 30,
      pulseSpeed: 1.5,
      bgOpacity: 0.35,
    };
  }
  if (hasAlert) {
    return {
      borderColor: "hsl(38 92% 50%)",
      glowIntensity: 20,
      pulseSpeed: 2,
      bgOpacity: 0.25,
    };
  }
  if (intensity > 0.7) {
    return {
      borderColor: undefined,
      glowIntensity: 15 + intensity * 15,
      pulseSpeed: 2.5,
      bgOpacity: 0.2 + intensity * 0.15,
    };
  }
  return {
    borderColor: undefined,
    glowIntensity: 8 + intensity * 10,
    pulseSpeed: 0,
    bgOpacity: 0.1 + intensity * 0.1,
  };
}

// ─── PARTICLE ───
function Particle({ from, to, delay }: { from: number; to: number; delay: number }) {
  const totalStages = STAGES.length;
  const fromPct = (from / (totalStages - 1)) * 100;
  const toPct = (to / (totalStages - 1)) * 100;

  return (
    <motion.div
      className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full z-20"
      style={{ background: STAGES[to]?.color || "hsl(var(--primary))", boxShadow: `0 0 8px ${STAGES[to]?.glowColor || "transparent"}` }}
      initial={{ left: `${fromPct}%`, opacity: 0, scale: 0 }}
      animate={{ left: `${toPct}%`, opacity: [0, 1, 1, 0], scale: [0, 1.2, 1, 0] }}
      transition={{ duration: 2.5, delay, ease: "easeInOut" }}
    />
  );
}

// ─── STAGE BLOCK (with heatmap) ───
function StageBlock({
  stage, count, inRate, outRate, isSelected, onClick, maxCount, transitioning, alerts,
}: {
  stage: FunnelStage; count: number; inRate: number; outRate: number;
  isSelected: boolean; onClick: () => void; maxCount: number; transitioning: number;
  alerts: BottleneckAlert[];
}) {
  const heatmap = getHeatmapStyle(count, maxCount, alerts, stage.id);
  const stageAlerts = alerts.filter(a => a.stageId === stage.id);
  const hasCritical = stageAlerts.some(a => a.severity === "critical");
  const hasWarning = stageAlerts.length > 0;

  return (
    <motion.div
      layout
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-2xl border-2 cursor-pointer transition-all duration-500 min-w-[120px] flex-1",
        "backdrop-blur-sm bg-card/80 hover:bg-card",
        isSelected ? "ring-2 ring-primary/30 scale-[1.02]" : "hover:border-border",
      )}
      style={{
        borderColor: isSelected
          ? stage.color
          : heatmap.borderColor || "hsl(var(--border) / 0.5)",
        boxShadow: isSelected
          ? `0 0 30px ${stage.glowColor}, 0 8px 32px rgba(0,0,0,0.2)`
          : count > 0
            ? `0 0 ${heatmap.glowIntensity}px ${stage.glowColor}`
            : "0 4px 12px rgba(0,0,0,0.1)",
      }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Heatmap glow */}
      {count > 0 && (
        <motion.div
          className="absolute inset-0 rounded-2xl transition-opacity duration-1000"
          style={{
            background: `radial-gradient(ellipse at center, ${stage.glowColor} 0%, transparent 70%)`,
            opacity: heatmap.bgOpacity,
          }}
          animate={heatmap.pulseSpeed > 0 ? { opacity: [heatmap.bgOpacity * 0.6, heatmap.bgOpacity, heatmap.bgOpacity * 0.6] } : undefined}
          transition={heatmap.pulseSpeed > 0 ? { repeat: Infinity, duration: heatmap.pulseSpeed } : undefined}
        />
      )}

      {/* Alert badge */}
      {hasCritical && (
        <motion.div
          className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center shadow-lg z-20"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        >
          <AlertTriangle className="w-3 h-3 text-destructive-foreground" />
        </motion.div>
      )}
      {!hasCritical && hasWarning && (
        <motion.div
          className="absolute -top-2 -right-2 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center shadow-lg z-20"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <span className="text-[8px] text-white font-bold">!</span>
        </motion.div>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-1 p-3">
        <span className="text-2xl">{stage.emoji}</span>
        <span className="text-[10px] font-bold text-foreground tracking-wide uppercase">{stage.label}</span>
        <span className="text-[9px] text-muted-foreground font-mono">{stage.agent}</span>

        <motion.div
          className="mt-1 text-2xl font-black tabular-nums"
          style={{ color: stage.color }}
          key={count}
          initial={{ scale: 1.3, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {count}
        </motion.div>

        <div className="flex items-center gap-2 mt-0.5">
          {inRate > 0 && (
            <span className="flex items-center gap-0.5 text-[9px] text-emerald-400 font-mono">
              <TrendingUp className="w-2.5 h-2.5" /> +{inRate}/m
            </span>
          )}
          {outRate > 0 && (
            <span className="flex items-center gap-0.5 text-[9px] text-orange-400 font-mono">
              <TrendingDown className="w-2.5 h-2.5" /> -{outRate}/m
            </span>
          )}
        </div>

        {transitioning > 0 && (
          <motion.div
            className="mt-0.5 flex items-center gap-1 text-[8px] font-mono text-primary/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Activity className="w-2.5 h-2.5" /> {transitioning} em trânsito
          </motion.div>
        )}

        {/* Inline alert preview */}
        {stageAlerts.length > 0 && (
          <div className="mt-1 text-[8px] font-mono text-amber-400 text-center max-w-[120px] truncate">
            {stageAlerts[0].message}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── CONNECTION LINE ───
function ConnectionLine({ particleCount }: { particleCount: number }) {
  return (
    <div className="flex items-center justify-center w-6 flex-shrink-0 relative">
      <div className="h-[2px] w-full bg-border/40 relative overflow-visible">
        <motion.div
          className="absolute inset-0 h-full bg-primary/40"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      </div>
      <ArrowRight className="w-3 h-3 text-muted-foreground absolute right-0" />
      {particleCount > 0 && (
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary"
          animate={{ x: [-8, 8], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}

// ─── BOTTLENECK ALERTS PANEL ───
function BottleneckAlertsBar({ alerts }: { alerts: BottleneckAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      className="border-b border-border/30 bg-card/60 backdrop-blur-sm"
    >
      <div className="flex items-center gap-4 px-6 py-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
            {alerts.length} Alerta{alerts.length > 1 ? "s" : ""}
          </span>
        </div>
        {alerts.map((alert, i) => (
          <motion.div
            key={`${alert.stageId}-${alert.type}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-mono flex-shrink-0",
              alert.severity === "critical"
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-amber-500/30 bg-amber-500/10 text-amber-400"
            )}
          >
            {alert.severity === "critical" ? (
              <Flame className="w-3 h-3" />
            ) : (
              <AlertTriangle className="w-3 h-3" />
            )}
            <span>{alert.message}</span>
            <span className="text-muted-foreground ml-1">• {alert.impact}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── PREDICTION CARD ───
function PredictionCard({ prediction }: { prediction: ReturnType<typeof predictClosings> }) {
  return (
    <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-card/60 border border-border/40 backdrop-blur-sm">
      <div className="flex items-center gap-1.5">
        <Target className="w-4 h-4 text-emerald-400" />
        <div className="flex flex-col">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Previsão</span>
          <span className="text-lg font-black tabular-nums text-emerald-400">{prediction.predicted}</span>
          <span className="text-[9px] text-muted-foreground">fechamentos</span>
        </div>
      </div>
      <div className="h-8 w-px bg-border/40" />
      <div className="flex flex-col items-center">
        <span className="text-[9px] text-muted-foreground">Alta prob.</span>
        <span className="text-sm font-bold text-primary tabular-nums">{prediction.highProbability}</span>
      </div>
      <div className="h-8 w-px bg-border/40" />
      <div className="flex flex-col items-center">
        <span className="text-[9px] text-muted-foreground">Em risco</span>
        <span className="text-sm font-bold text-destructive tabular-nums">{prediction.atRisk}</span>
      </div>
      <div className="h-8 w-px bg-border/40" />
      <div className="text-[10px] font-mono text-muted-foreground">{prediction.trend}</div>
    </div>
  );
}

// ─── AGENT RANKING ───
function AgentRanking({ agents, isOpen, onToggle }: { agents: AgentStats[]; isOpen: boolean; onToggle: () => void }) {
  return (
    <motion.div
      className="flex-shrink-0 border-l border-border/30 bg-card/60 backdrop-blur-sm flex flex-col"
      animate={{ width: isOpen ? 280 : 44 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
    >
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-3 border-b border-border/30 hover:bg-background/50 transition-colors"
      >
        <Trophy className="w-4 h-4 text-amber-400 flex-shrink-0" />
        {isOpen && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[10px] font-bold uppercase tracking-wider"
          >
            Ranking Agentes
          </motion.span>
        )}
        <ChevronRight
          className={cn("w-3 h-3 text-muted-foreground ml-auto transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {isOpen && (
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1.5">
            {agents.map((agent, idx) => (
              <motion.div
                key={agent.agent}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-2.5 rounded-lg border border-border/30 bg-background/50 hover:bg-background transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                    </span>
                    <span className="text-xs font-bold">{agent.agent}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] h-5 tabular-nums",
                      agent.progressionRate >= 70 ? "border-emerald-500/40 text-emerald-400" :
                      agent.progressionRate >= 40 ? "border-amber-500/40 text-amber-400" :
                      "border-destructive/40 text-destructive"
                    )}
                  >
                    {agent.progressionRate}%
                  </Badge>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-1 mt-1">
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-muted-foreground">Carga</span>
                    <span className="text-[11px] font-bold tabular-nums">{agent.currentLoad}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-muted-foreground">Avanç.</span>
                    <span className="text-[11px] font-bold tabular-nums text-emerald-400">{agent.leadsAdvanced}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] text-muted-foreground">Tempo</span>
                    <span className="text-[11px] font-bold tabular-nums">{Math.round(agent.avgTimeMin)}m</span>
                  </div>
                </div>

                {/* Progression bar */}
                <div className="mt-1.5 h-1 rounded-full bg-border/40 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: agent.progressionRate >= 70 ? "hsl(142 71% 45%)" :
                        agent.progressionRate >= 40 ? "hsl(38 92% 50%)" : "hsl(0 72% 51%)",
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${agent.progressionRate}%` }}
                    transition={{ delay: idx * 0.1, duration: 0.8 }}
                  />
                </div>

                {/* Trend indicator */}
                <div className="mt-1 flex items-center justify-end">
                  {agent.trend === "up" && (
                    <span className="flex items-center gap-0.5 text-[8px] text-emerald-400">
                      <ArrowUpRight className="w-2.5 h-2.5" /> Subindo
                    </span>
                  )}
                  {agent.trend === "down" && (
                    <span className="flex items-center gap-0.5 text-[8px] text-destructive">
                      <TrendingDown className="w-2.5 h-2.5" /> Caindo
                    </span>
                  )}
                  {agent.trend === "stable" && (
                    <span className="flex items-center gap-0.5 text-[8px] text-muted-foreground">
                      <Gauge className="w-2.5 h-2.5" /> Estável
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      )}
    </motion.div>
  );
}

// ─── LEAD DETAIL DRAWER ───
function LeadDrawer({ stage, leads, onClose }: { stage: FunnelStage; leads: LeadDot[]; onClose: () => void }) {
  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 bottom-0 w-[380px] bg-card border-l border-border shadow-2xl z-50 flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xl">{stage.emoji}</span>
          <div>
            <h3 className="font-bold text-sm">{stage.label}</h3>
            <p className="text-[10px] text-muted-foreground font-mono">Agente: {stage.agent}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="p-3">
        <Badge variant="secondary" className="text-xs gap-1">
          <Users className="w-3 h-3" /> {leads.length} leads
        </Badge>
      </div>
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-2 pb-4">
          {leads.map((lead, i) => (
            <motion.div
              key={lead.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-background transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate max-w-[200px]">{lead.name || "Lead anônimo"}</span>
                <Badge variant="outline" className="text-[9px] h-5" style={{ borderColor: stage.color, color: stage.color }}>
                  Score {lead.score || 0}
                </Badge>
              </div>
              {lead.phone && (
                <span className="text-[10px] text-muted-foreground font-mono mt-1 block">{lead.phone}</span>
              )}
              {lead.prevStage && (
                <span className="text-[9px] text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> Veio de: {STAGES.find(s => s.id === lead.prevStage)?.label || lead.prevStage}
                </span>
              )}
            </motion.div>
          ))}
          {leads.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum lead nesta etapa
            </div>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}

// ─── MAIN COMPONENT ───
export function LiveFunnel({ onClose }: { onClose: () => void }) {
  const [leads, setLeads] = useState<LeadDot[]>([]);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [mode, setMode] = useState<"real" | "sim">("real");
  const [particles, setParticles] = useState<{ id: string; from: number; to: number; delay: number }[]>([]);
  const [rates, setRates] = useState<Record<string, { in: number; out: number }>>({});
  const [transitioning, setTransitioning] = useState<Record<string, number>>({});
  const [rankingOpen, setRankingOpen] = useState(true);
  const simInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevCounts = useRef<Record<string, number>>({});

  // Load real data
  const loadRealData = useCallback(async () => {
    const { data } = await supabase
      .from("conversations")
      .select("id, display_name, contact_name, funnel_stage, phone, score_potential, stage_entered_at")
      .not("funnel_stage", "is", null)
      .order("last_message_at", { ascending: false })
      .limit(500);

    if (!data) return;

    const newLeads: LeadDot[] = data.map(c => ({
      id: c.id,
      name: c.display_name || c.contact_name || "Lead",
      stage: c.funnel_stage || "novo_lead",
      prevStage: null,
      movedAt: new Date(c.stage_entered_at || Date.now()).getTime(),
      score: c.score_potential || 0,
      phone: c.phone || undefined,
    }));

    const newCounts: Record<string, number> = {};
    STAGES.forEach(s => { newCounts[s.id] = 0; });
    newLeads.forEach(l => { if (newCounts[l.stage] !== undefined) newCounts[l.stage]++; });

    const newRates: Record<string, { in: number; out: number }> = {};
    const newTransit: Record<string, number> = {};
    const newParticles: typeof particles = [];

    STAGES.forEach((s, idx) => {
      const prev = prevCounts.current[s.id] || 0;
      const curr = newCounts[s.id];
      const diff = curr - prev;
      newRates[s.id] = { in: Math.max(0, diff), out: Math.max(0, -diff) };
      newTransit[s.id] = 0;

      if (diff > 0 && idx > 0) {
        for (let p = 0; p < Math.min(diff, 5); p++) {
          newParticles.push({ id: `${s.id}-${Date.now()}-${p}`, from: idx - 1, to: idx, delay: p * 0.3 });
        }
        newTransit[s.id] = Math.min(diff, 5);
      }
    });

    prevCounts.current = newCounts;
    setLeads(newLeads);
    setRates(newRates);
    setTransitioning(newTransit);
    if (newParticles.length > 0) {
      setParticles(prev => [...prev.slice(-20), ...newParticles]);
      setTimeout(() => setParticles(p => p.filter(pp => !newParticles.find(np => np.id === pp.id))), 3000);
    }
  }, []);

  // Simulation mode
  const startSimulation = useCallback(() => {
    const simLeads: LeadDot[] = [];
    const names = [
      "Ana Silva", "Carlos Souza", "Maria Santos", "João Lima", "Fernanda Costa",
      "Pedro Oliveira", "Julia Almeida", "Lucas Pereira", "Camila Rodrigues", "Rafael Ferreira",
      "Beatriz Gomes", "Bruno Martins", "Larissa Nascimento", "Diego Barbosa", "Amanda Ribeiro",
      "Thiago Araújo", "Patricia Cardoso", "Gustavo Moreira", "Isabela Nunes", "Mateus Correia",
    ];

    const distribution = [45, 28, 18, 12, 8, 5, 3];
    let nameIdx = 0;
    STAGES.forEach((stage, sIdx) => {
      const count = distribution[sIdx] || 2;
      for (let i = 0; i < count; i++) {
        simLeads.push({
          id: `sim-${sIdx}-${i}`,
          name: names[nameIdx % names.length],
          stage: stage.id,
          prevStage: sIdx > 0 ? STAGES[sIdx - 1].id : null,
          movedAt: Date.now() - Math.random() * 600000,
          score: Math.floor(30 + Math.random() * 70),
          phone: `(11) 9${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
        });
        nameIdx++;
      }
    });

    setLeads(simLeads);

    simInterval.current = setInterval(() => {
      setLeads(prev => {
        const updated = [...prev];
        const movableCount = Math.floor(1 + Math.random() * 3);
        for (let m = 0; m < movableCount; m++) {
          const movable = updated.filter(l => {
            const stageIdx = STAGE_ORDER.indexOf(l.stage);
            return stageIdx >= 0 && stageIdx < STAGES.length - 1;
          });
          if (movable.length === 0) continue;
          const chosen = movable[Math.floor(Math.random() * movable.length)];
          const fromIdx = STAGE_ORDER.indexOf(chosen.stage);
          const toIdx = fromIdx + 1;
          chosen.prevStage = chosen.stage;
          chosen.stage = STAGE_ORDER[toIdx];
          chosen.movedAt = Date.now();

          setParticles(pp => [...pp.slice(-15), {
            id: `sim-p-${Date.now()}-${m}`,
            from: fromIdx, to: toIdx, delay: m * 0.2,
          }]);
        }

        if (Math.random() > 0.5) {
          const names2 = ["Novo Lead", "Visitante Web", "Contato Ads", "Indicação"];
          updated.push({
            id: `sim-new-${Date.now()}`,
            name: names2[Math.floor(Math.random() * names2.length)],
            stage: STAGES[0].id,
            prevStage: null,
            movedAt: Date.now(),
            score: Math.floor(10 + Math.random() * 40),
          });
        }

        return updated;
      });

      setRates(prev => {
        const newRates = { ...prev };
        STAGES.forEach(s => {
          newRates[s.id] = { in: Math.floor(Math.random() * 4), out: Math.floor(Math.random() * 3) };
        });
        return newRates;
      });
    }, 3000);
  }, []);

  useEffect(() => {
    if (mode === "real") {
      loadRealData();
      const interval = setInterval(loadRealData, 10000);
      return () => clearInterval(interval);
    } else {
      startSimulation();
      return () => { if (simInterval.current) clearInterval(simInterval.current); };
    }
  }, [mode, loadRealData, startSimulation]);

  // Clean old particles
  useEffect(() => {
    const cleanup = setInterval(() => {
      setParticles(p => p.slice(-20));
    }, 5000);
    return () => clearInterval(cleanup);
  }, []);

  // Computed values
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STAGES.forEach(s => { counts[s.id] = 0; });
    leads.forEach(l => { if (counts[l.stage] !== undefined) counts[l.stage]++; });
    return counts;
  }, [leads]);

  const maxCount = Math.max(...Object.values(stageCounts), 1);
  const totalLeads = leads.length;

  const bottleneckAlerts = useMemo(() => detectBottlenecks(leads, stageCounts, rates), [leads, stageCounts, rates]);
  const prediction = useMemo(() => predictClosings(leads, stageCounts), [leads, stageCounts]);
  const agentStats = useMemo(() => computeAgentStats(leads, stageCounts, rates), [leads, stageCounts, rates]);

  const selectedStageObj = STAGES.find(s => s.id === selectedStage);
  const selectedLeads = leads.filter(l => l.stage === selectedStage);

  return (
    <div className="h-full flex flex-col bg-background relative overflow-hidden">
      {/* Background pulse */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-accent/5 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-border/50 bg-card/80 backdrop-blur-xl z-30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
              <Radio className="w-4 h-4 text-emerald-400" />
            </motion.div>
            <h1 className="text-lg font-black tracking-tight">FUNIL VIVO</h1>
            <Badge variant="outline" className="text-[9px] font-mono gap-1 border-emerald-500/30 text-emerald-400">
              <Activity className="w-2.5 h-2.5" /> AO VIVO
            </Badge>
          </div>

          {/* KPI strip */}
          <div className="hidden lg:flex items-center gap-3 ml-4">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background/60 border border-border/50">
              <Users className="w-3 h-3 text-muted-foreground" />
              <span className="text-sm font-bold tabular-nums">{totalLeads}</span>
              <span className="text-[9px] text-muted-foreground">ativos</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background/60 border border-border/50">
              <Activity className="w-3 h-3 text-primary" />
              <span className="text-sm font-bold tabular-nums">
                {Object.values(transitioning).reduce((a, b) => a + b, 0)}
              </span>
              <span className="text-[9px] text-muted-foreground">em trânsito</span>
            </div>
            {bottleneckAlerts.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertTriangle className="w-3 h-3 text-destructive" />
                <span className="text-sm font-bold tabular-nums text-destructive">{bottleneckAlerts.length}</span>
                <span className="text-[9px] text-destructive/80">gargalo{bottleneckAlerts.length > 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PredictionCard prediction={prediction} />

          <div className="flex items-center gap-1 bg-background/60 border border-border/50 rounded-lg p-0.5">
            <Button variant={mode === "real" ? "default" : "ghost"} size="sm" className="h-7 text-[10px] px-3" onClick={() => setMode("real")}>
              <Eye className="w-3 h-3 mr-1" /> Real
            </Button>
            <Button variant={mode === "sim" ? "default" : "ghost"} size="sm" className="h-7 text-[10px] px-3" onClick={() => setMode("sim")}>
              <Sparkles className="w-3 h-3 mr-1" /> Simulação
            </Button>
          </div>

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Bottleneck Alerts */}
      <BottleneckAlertsBar alerts={bottleneckAlerts} />

      {/* Main area: Funnel + Agent Ranking */}
      <div className="flex-1 flex overflow-hidden">
        {/* Funnel area */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-6 relative z-10 overflow-auto">
          {/* Pipeline with particles */}
          <div className="relative w-full max-w-7xl">
            <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 z-0">
              <AnimatePresence>
                {particles.map(p => (
                  <Particle key={p.id} from={p.from} to={p.to} delay={p.delay} />
                ))}
              </AnimatePresence>
            </div>

            <div className="flex items-stretch gap-0 relative z-10">
              {STAGES.map((stage, idx) => (
                <div key={stage.id} className="flex items-center flex-1 min-w-0">
                  <StageBlock
                    stage={stage}
                    count={stageCounts[stage.id]}
                    inRate={rates[stage.id]?.in || 0}
                    outRate={rates[stage.id]?.out || 0}
                    isSelected={selectedStage === stage.id}
                    onClick={() => setSelectedStage(selectedStage === stage.id ? null : stage.id)}
                    maxCount={maxCount}
                    transitioning={transitioning[stage.id] || 0}
                    alerts={bottleneckAlerts}
                  />
                  {idx < STAGES.length - 1 && (
                    <ConnectionLine particleCount={particles.filter(p => p.to === idx + 1).length} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Conversion bar chart */}
          <div className="w-full max-w-7xl mt-6">
            <div className="flex items-end gap-0 h-28">
              {STAGES.map((stage, idx) => {
                const count = stageCounts[stage.id];
                const height = maxCount > 0 ? Math.max((count / maxCount) * 100, 4) : 4;
                const convRate = idx > 0 && stageCounts[STAGES[idx - 1].id] > 0
                  ? Math.round((count / stageCounts[STAGES[idx - 1].id]) * 100)
                  : idx === 0 ? 100 : 0;

                return (
                  <div key={stage.id} className="flex-1 flex flex-col items-center gap-1">
                    {convRate < 100 && idx > 0 && (
                      <span className="text-[10px] font-mono text-muted-foreground">{convRate}%</span>
                    )}
                    <motion.div
                      className="w-full max-w-[80px] rounded-t-lg mx-auto relative overflow-hidden"
                      style={{ background: stage.color }}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ type: "spring", stiffness: 100, damping: 15, delay: idx * 0.1 }}
                    >
                      <motion.div
                        className="absolute inset-0 bg-white/10"
                        animate={{ y: ["100%", "-100%"] }}
                        transition={{ repeat: Infinity, duration: 3, ease: "linear", delay: idx * 0.5 }}
                      />
                    </motion.div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-0 mt-2">
              {STAGES.map(stage => (
                <div key={stage.id} className="flex-1 text-center">
                  <span className="text-[9px] text-muted-foreground font-mono">{stage.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Live ticker */}
          <div className="w-full max-w-7xl mt-4 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card/50 border border-border/30">
              <Zap className="w-3 h-3 text-amber-400 flex-shrink-0" />
              <div className="overflow-hidden flex-1">
                <motion.div
                  className="flex items-center gap-6 whitespace-nowrap"
                  animate={{ x: [0, -600] }}
                  transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                >
                  {leads.slice(0, 15).map(l => (
                    <span key={l.id} className="text-[10px] text-muted-foreground">
                      <span className="text-foreground font-medium">{l.name}</span> → {STAGES.find(s => s.id === l.stage)?.label}
                    </span>
                  ))}
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* Agent Ranking Sidebar */}
        <AgentRanking agents={agentStats} isOpen={rankingOpen} onToggle={() => setRankingOpen(!rankingOpen)} />
      </div>

      {/* Lead Detail Drawer */}
      <AnimatePresence>
        {selectedStage && selectedStageObj && (
          <LeadDrawer stage={selectedStageObj} leads={selectedLeads} onClose={() => setSelectedStage(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
