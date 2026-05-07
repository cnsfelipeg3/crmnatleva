/**
 * CIA-style Monitoring Dashboard for Quotation Extraction
 * Real-time progressive field tracking
 */
import { useState, useEffect, useRef, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio, Activity, Target, Timer, ChevronDown,
  User, MapPin, Users, CalendarDays, DollarSign, Hotel,
  Brain, Plane, FileText, Sparkles, Eye, CheckCircle2,
  TrendingUp, Zap,
} from "lucide-react";
import { FIELD_GROUPS, MONITOR_ALL_FIELDS, MONITOR_TOTAL_FIELDS, countFilledFields } from "@/lib/quotationMonitor";

interface BriefingRow {
  id: string;
  lead_name: string | null;
  lead_origin: string | null;
  status: string;
  urgency: string;
  destination: string | null;
  trip_motivation: string | null;
  total_people: number | null;
  adults: number | null;
  children: number | null;
  group_details: string | null;
  departure_date: string | null;
  return_date: string | null;
  duration_days: number | null;
  budget_range: string | null;
  price_sensitivity: string | null;
  hotel_preference: string | null;
  hotel_stars: string | null;
  hotel_location: string | null;
  lead_type: string | null;
  lead_sentiment: string | null;
  travel_experience: string | null;
  cabin_class: string | null;
  departure_airport: string | null;
  flight_preference: string | null;
  behavioral_notes: string | null;
  conversation_summary: string | null;
  ai_recommendation: string | null;
  next_steps: string | null;
  lead_score: number | null;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

const CATEGORY_ICONS: Record<string, typeof User> = {
  Lead: User, Viagem: MapPin, Grupo: Users, Datas: CalendarDays,
  Orçamento: DollarSign, Hotel: Hotel, Perfil: Brain, Transporte: Plane,
  Análise: FileText, Ação: Target,
};

const FIELD_LABELS: Record<string, string> = {
  lead_name: "Nome", lead_origin: "Origem", destination: "Destino",
  trip_motivation: "Motivação", total_people: "Total pax", adults: "Adultos",
  children: "Crianças", group_details: "Grupo", departure_date: "Ida",
  return_date: "Volta", duration_days: "Duração", budget_range: "Orçamento",
  price_sensitivity: "Sensibilidade", hotel_preference: "Preferência",
  hotel_stars: "Categoria", hotel_location: "Localização", lead_type: "Tipo",
  lead_sentiment: "Sentimento", travel_experience: "Experiência",
  cabin_class: "Classe", departure_airport: "Aeroporto", flight_preference: "Voo",
  behavioral_notes: "Comportamento", conversation_summary: "Resumo",
  ai_recommendation: "Recomendação IA", next_steps: "Próx. passos",
  lead_score: "Score",
};

function useCountUp(target: number, duration = 600) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    const start = performance.now();
    const from = val;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setVal(Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target]);
  return val;
}

// ━━━ Monitor Card ━━━
const MonitorCard = memo(({ briefing, isNew }: { briefing: BriefingRow; isNew: boolean }) => {
  const [expanded, setExpanded] = useState(false);
  const filled = countFilledFields(briefing as any);
  const pct = Math.round((filled / MONITOR_TOTAL_FIELDS) * 100);
  const isExtracting = briefing.status === "extraindo";
  const isComplete = pct >= 90;

  // Find the currently extracting field group
  const currentGroupIdx = FIELD_GROUPS.findIndex(g =>
    g.fields.some(f => briefing[f] == null || briefing[f] === "")
  );

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, scale: 0.9, y: 20 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "rounded-xl overflow-hidden transition-all duration-500",
        isExtracting && "ring-1 ring-accent/30",
        isComplete && "ring-1 ring-emerald-500/30",
      )}
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        boxShadow: isExtracting
          ? "0 0 20px hsla(var(--accent), 0.08)"
          : isComplete
            ? "0 0 20px hsla(160, 60%, 42%, 0.06)"
            : "none",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div className="relative">
            <div className={cn(
              "w-3 h-3 rounded-full",
              isExtracting ? "bg-accent" : isComplete ? "bg-emerald-500" : "bg-amber-500",
            )}>
              {isExtracting && (
                <span className="absolute inset-0 rounded-full bg-accent animate-ping opacity-40" />
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground text-sm truncate">
                {briefing.lead_name || "Novo Lead"}
              </span>
              {briefing.destination && (
                <>
                  <span className="text-muted-foreground text-xs">→</span>
                  <span className="text-accent font-medium text-sm truncate">
                    {briefing.destination}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                isExtracting
                  ? "bg-accent/10 text-accent"
                  : isComplete
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-amber-500/10 text-amber-500",
              )}>
                {isExtracting ? "EXTRAINDO" : isComplete ? "COMPLETO" : "PENDENTE"}
              </span>
              {briefing.lead_origin && (
                <span className="text-[10px] text-muted-foreground">{briefing.lead_origin}</span>
              )}
            </div>
          </div>

          {/* Progress ring */}
          <div className="relative w-12 h-12 shrink-0">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" strokeWidth="3"
                className="stroke-muted/30" />
              <circle cx="24" cy="24" r="20" fill="none" strokeWidth="3"
                strokeDasharray={`${pct * 1.256} 125.6`}
                strokeLinecap="round"
                className={cn(
                  "transition-all duration-1000",
                  isComplete ? "stroke-emerald-500" : "stroke-accent",
                )}
              />
            </svg>
            <span className={cn(
              "absolute inset-0 flex items-center justify-center text-[11px] font-bold font-mono",
              isComplete ? "text-emerald-500" : "text-accent",
            )}>
              {pct}%
            </span>
          </div>

          <ChevronDown className={cn(
            "w-4 h-4 text-muted-foreground transition-transform shrink-0",
            expanded && "rotate-180",
          )} />
        </div>

        {/* Progress bar */}
        <div className="mt-3 w-full h-1.5 rounded-full bg-muted/30 overflow-hidden">
          <motion.div
            className={cn(
              "h-full rounded-full",
              isComplete ? "bg-emerald-500" : "bg-accent",
            )}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </button>

      {/* Expanded field list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="p-4 space-y-3">
              {FIELD_GROUPS.map((group, gi) => {
                const Icon = CATEGORY_ICONS[group.label] || FileText;
                const groupFilled = group.fields.filter(f => briefing[f] != null && briefing[f] !== "").length;
                const isCurrentGroup = gi === currentGroupIdx && isExtracting;

                return (
                  <div key={group.label} className={cn(
                    "rounded-lg p-3 transition-all duration-500",
                    isCurrentGroup ? "bg-accent/5 ring-1 ring-accent/20" : "bg-muted/10",
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={cn(
                        "w-3.5 h-3.5",
                        isCurrentGroup ? "text-accent" : "text-muted-foreground",
                      )} />
                      <span className={cn(
                        "text-[11px] font-bold uppercase tracking-wider",
                        isCurrentGroup ? "text-accent" : "text-muted-foreground",
                      )}>
                        {group.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                        {groupFilled}/{group.fields.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {group.fields.map(field => {
                        const value = briefing[field];
                        const isFilled = value != null && value !== "";
                        const isExtrField = isCurrentGroup && !isFilled;

                        return (
                          <div key={field} className="flex items-center gap-2 text-xs">
                            {isFilled ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ) : isExtrField ? (
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-accent border-t-transparent animate-spin shrink-0" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/20 shrink-0" />
                            )}
                            <span className={cn(
                              "truncate",
                              isFilled ? "text-foreground" : "text-muted-foreground/50",
                            )}>
                              {FIELD_LABELS[field] || field}
                            </span>
                            {isFilled && (
                              <span className="text-muted-foreground truncate ml-auto max-w-[120px] text-right font-mono text-[10px]">
                                {String(value).slice(0, 25)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
MonitorCard.displayName = "MonitorCard";

// ━━━ KPI Card ━━━
function KpiCard({ icon: Icon, label, value, suffix, color }: {
  icon: typeof Activity; label: string; value: number; suffix?: string; color: string;
}) {
  const animated = useCountUp(value);
  return (
    <div className="rounded-xl p-4 flex items-center gap-3" style={{
      background: "hsl(var(--card))",
      border: "1px solid hsl(var(--border))",
    }}>
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center")}
        style={{ background: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold font-mono text-foreground">
          {animated}{suffix}
        </p>
      </div>
    </div>
  );
}

// ━━━ Main Dashboard ━━━
export default function CotacoesMonitorView() {
  const [briefings, setBriefings] = useState<BriefingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [showFictional, setShowFictional] = useState(false);
  const prevIdsRef = useRef<Set<string>>(new Set());

  const fetchBriefings = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("quotation_briefings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      // Detect new entries
      const currentIds = new Set<string>(data.map((d: any) => d.id as string));
      const fresh = new Set<string>();
      currentIds.forEach((id) => {
        if (!prevIdsRef.current.has(id)) fresh.add(id);
      });
      if (fresh.size > 0) {
        setNewIds(prev => new Set([...prev, ...fresh]));
        setTimeout(() => setNewIds(new Set()), 3000);
      }
      prevIdsRef.current = currentIds;
      setBriefings(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBriefings();
    const channel = supabase
      .channel("monitor-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "quotation_briefings" }, () => {
        fetchBriefings();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "quotation_briefings" }, () => {
        fetchBriefings();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchBriefings]);

  // Filtra fictícias por padrão (toggle dinâmico no header)
  const visibleBriefings = showFictional
    ? briefings
    : briefings.filter((b: any) => !b.is_fictional);
  const fictionalCount = briefings.filter((b: any) => b.is_fictional).length;

  // KPIs (calculados sobre o set visível)
  const extracting = visibleBriefings.filter(b => b.status === "extraindo").length;
  const totalFields = visibleBriefings.reduce((s, b) => s + countFilledFields(b as any), 0);
  const maxFields = visibleBriefings.length * MONITOR_TOTAL_FIELDS;
  const completionPct = maxFields > 0 ? Math.round((totalFields / maxFields) * 100) : 0;
  const completed = visibleBriefings.filter(b => {
    const f = countFilledFields(b as any);
    return f >= Math.floor(MONITOR_TOTAL_FIELDS * 0.9);
  }).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl p-4 relative overflow-hidden" style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
      }}>
        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--accent)) 2px, hsl(var(--accent)) 3px)",
        }} />
        {/* Grid pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.015]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--accent)) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }} />

        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{
              background: "linear-gradient(135deg, hsl(var(--accent)), hsl(160, 80%, 35%))",
              boxShadow: "0 0 20px hsla(var(--accent), 0.25)",
            }}>
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                Centro de Monitoramento
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                  </span>
                  LIVE
                </span>
              </h1>
              <p className="text-xs text-muted-foreground">
                Extração inteligente de cotações em tempo real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <Activity className="w-3.5 h-3.5 text-accent" />
            {visibleBriefings.length} operações rastreadas
            <button
              onClick={() => setShowFictional(v => !v)}
              className="ml-2 px-2 py-1 rounded text-[10px] uppercase tracking-wider border border-border hover:bg-accent/10 transition-colors"
            >
              {showFictional ? "Ocultar fictícias" : `Fictícias (${fictionalCount})`}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Zap} label="Extraindo" value={extracting} color="hsl(var(--accent))" />
        <KpiCard icon={TrendingUp} label="Campos" value={totalFields} suffix={`/${maxFields}`} color="hsl(210, 80%, 52%)" />
        <KpiCard icon={Target} label="Completude" value={completionPct} suffix="%" color="hsl(38, 92%, 50%)" />
        <KpiCard icon={CheckCircle2} label="Completos" value={completed} color="hsl(160, 60%, 42%)" />
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-muted-foreground">Conectando ao monitor...</span>
          </div>
        </div>
      ) : briefings.length === 0 ? (
        <div className="text-center py-20 rounded-xl" style={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
        }}>
          <div className="relative inline-flex">
            <Radio className="w-14 h-14 text-muted-foreground/20" />
            <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-muted-foreground/20 animate-pulse" />
          </div>
          <p className="text-muted-foreground mt-4 font-medium">Monitor aguardando sinais</p>
          <p className="text-xs text-muted-foreground/60 mt-1 max-w-md mx-auto">
            Inicie uma simulação no modo Automático ou Camaleão. As cotações aparecerão aqui em tempo real conforme as conversas avançarem.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <AnimatePresence>
            {briefings.map(b => (
              <MonitorCard key={b.id} briefing={b} isNew={newIds.has(b.id)} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Footer scanline */}
      <div className="h-px w-full" style={{
        background: "linear-gradient(90deg, transparent, hsl(var(--accent) / 0.15), transparent)",
      }} />
    </div>
  );
}
