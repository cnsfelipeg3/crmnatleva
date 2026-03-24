import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users, TrendingUp, TrendingDown, Zap, Eye, Clock,
  ArrowRight, X, Sparkles, Activity, Radio,
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

// ─── STAGE BLOCK ───
function StageBlock({
  stage, count, inRate, outRate, isSelected, onClick, maxCount, transitioning,
}: {
  stage: FunnelStage; count: number; inRate: number; outRate: number;
  isSelected: boolean; onClick: () => void; maxCount: number; transitioning: number;
}) {
  const intensity = maxCount > 0 ? Math.min(count / maxCount, 1) : 0;
  const isBottleneck = count > 0 && inRate > outRate * 2;

  return (
    <motion.div
      layout
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-2xl border-2 cursor-pointer transition-all duration-500 min-w-[140px] flex-1",
        "backdrop-blur-sm bg-card/80 hover:bg-card",
        isSelected ? "border-primary ring-2 ring-primary/30 scale-[1.02]" : "border-border/50 hover:border-border",
        isBottleneck && "border-destructive/60 animate-pulse",
      )}
      style={{
        boxShadow: isSelected
          ? `0 0 30px ${stage.glowColor}, 0 8px 32px rgba(0,0,0,0.2)`
          : count > 0
            ? `0 0 ${12 + intensity * 20}px ${stage.glowColor}`
            : "0 4px 12px rgba(0,0,0,0.1)",
      }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Glow bg */}
      {count > 0 && (
        <div
          className="absolute inset-0 rounded-2xl opacity-20 transition-opacity duration-1000"
          style={{ background: `radial-gradient(ellipse at center, ${stage.glowColor} 0%, transparent 70%)` }}
        />
      )}

      {/* Bottleneck indicator */}
      {isBottleneck && (
        <motion.div
          className="absolute -top-2 -right-2 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <span className="text-[8px] text-destructive-foreground font-bold">!</span>
        </motion.div>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-1 p-4">
        <span className="text-2xl">{stage.emoji}</span>
        <span className="text-[11px] font-bold text-foreground tracking-wide uppercase">{stage.label}</span>
        <span className="text-[9px] text-muted-foreground font-mono">{stage.agent}</span>

        {/* Count */}
        <motion.div
          className="mt-1 text-3xl font-black tabular-nums"
          style={{ color: stage.color }}
          key={count}
          initial={{ scale: 1.3, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {count}
        </motion.div>

        {/* Rates */}
        <div className="flex items-center gap-2 mt-1">
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

        {/* Transitioning count */}
        {transitioning > 0 && (
          <motion.div
            className="mt-1 flex items-center gap-1 text-[9px] font-mono text-primary/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Activity className="w-2.5 h-2.5" /> {transitioning} em trânsito
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─── CONNECTION LINE ───
function ConnectionLine({ particleCount }: { particleCount: number }) {
  return (
    <div className="flex items-center justify-center w-8 flex-shrink-0 relative">
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

    // Detect movements for particles
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
          newParticles.push({
            id: `${s.id}-${Date.now()}-${p}`,
            from: idx - 1,
            to: idx,
            delay: p * 0.3,
          });
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

  // Simulation mode - generate fake moving leads
  const startSimulation = useCallback(() => {
    const simLeads: LeadDot[] = [];
    const names = [
      "Ana Silva", "Carlos Souza", "Maria Santos", "João Lima", "Fernanda Costa",
      "Pedro Oliveira", "Julia Almeida", "Lucas Pereira", "Camila Rodrigues", "Rafael Ferreira",
      "Beatriz Gomes", "Bruno Martins", "Larissa Nascimento", "Diego Barbosa", "Amanda Ribeiro",
      "Thiago Araújo", "Patricia Cardoso", "Gustavo Moreira", "Isabela Nunes", "Mateus Correia",
    ];

    // Distribute leads across stages with decreasing count
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

    // Animate leads moving between stages
    simInterval.current = setInterval(() => {
      setLeads(prev => {
        const updated = [...prev];
        // Move 1-3 random leads forward
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
            from: fromIdx,
            to: toIdx,
            delay: m * 0.2,
          }]);
          setTimeout(() => {
            setParticles(pp => pp.filter(p => !p.id.startsWith(`sim-p-${Date.now()}`)));
          }, 3000);
        }

        // Add new lead at stage 0 occasionally
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

      // Update rates
      setRates(prev => {
        const newRates = { ...prev };
        STAGES.forEach(s => {
          newRates[s.id] = {
            in: Math.floor(Math.random() * 4),
            out: Math.floor(Math.random() * 3),
          };
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

  // Counts per stage
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STAGES.forEach(s => { counts[s.id] = 0; });
    leads.forEach(l => { if (counts[l.stage] !== undefined) counts[l.stage]++; });
    return counts;
  }, [leads]);

  const maxCount = Math.max(...Object.values(stageCounts), 1);
  const totalLeads = leads.length;

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
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 bg-card/80 backdrop-blur-xl z-30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Radio className="w-4 h-4 text-emerald-400" />
            </motion.div>
            <h1 className="text-lg font-black tracking-tight">FUNIL VIVO</h1>
            <Badge variant="outline" className="text-[9px] font-mono gap-1 border-emerald-500/30 text-emerald-400">
              <Activity className="w-2.5 h-2.5" /> AO VIVO
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Total */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/60 border border-border/50">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-bold tabular-nums">{totalLeads}</span>
            <span className="text-[10px] text-muted-foreground">leads ativos</span>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-1 bg-background/60 border border-border/50 rounded-lg p-0.5">
            <Button
              variant={mode === "real" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-[10px] px-3"
              onClick={() => setMode("real")}
            >
              <Eye className="w-3 h-3 mr-1" /> Real
            </Button>
            <Button
              variant={mode === "sim" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-[10px] px-3"
              onClick={() => setMode("sim")}
            >
              <Sparkles className="w-3 h-3 mr-1" /> Simulação
            </Button>
          </div>

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Funnel Visualization */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative z-10">
        {/* Pipeline bar with particles */}
        <div className="relative w-full max-w-7xl">
          {/* Particle track */}
          <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 z-0">
            <AnimatePresence>
              {particles.map(p => (
                <Particle key={p.id} from={p.from} to={p.to} delay={p.delay} />
              ))}
            </AnimatePresence>
          </div>

          {/* Stage blocks */}
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
                />
                {idx < STAGES.length - 1 && (
                  <ConnectionLine particleCount={particles.filter(p => p.to === idx + 1).length} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Conversion funnel visualization (bar chart below) */}
        <div className="w-full max-w-7xl mt-8">
          <div className="flex items-end gap-0 h-32">
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

          {/* Stage labels below bars */}
          <div className="flex gap-0 mt-2">
            {STAGES.map(stage => (
              <div key={stage.id} className="flex-1 text-center">
                <span className="text-[9px] text-muted-foreground font-mono">{stage.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live feed ticker */}
        <div className="w-full max-w-7xl mt-6 overflow-hidden">
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

      {/* Lead Detail Drawer */}
      <AnimatePresence>
        {selectedStage && selectedStageObj && (
          <LeadDrawer
            stage={selectedStageObj}
            leads={selectedLeads}
            onClose={() => setSelectedStage(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
