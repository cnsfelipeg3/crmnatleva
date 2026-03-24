import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search, RefreshCw, Plus, Pencil, Trash2, CheckCircle,
  Archive, Upload, Zap, ZapOff, Bot, BookOpen, Shield, Wand2,
  GitBranch, Brain, FlaskConical, Settings, Clock, User,
  Activity, ChevronRight, Sparkles, Radio, Eye,
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday, subDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

/* ═══ Action config ═══ */
const ACTION_META: Record<string, { icon: typeof Plus; label: string; gradient: string; dot: string }> = {
  create:     { icon: Plus,        label: "Criação",       gradient: "from-emerald-500 to-teal-600",    dot: "bg-emerald-400" },
  update:     { icon: Pencil,      label: "Edição",        gradient: "from-blue-500 to-indigo-600",     dot: "bg-blue-400" },
  delete:     { icon: Trash2,      label: "Exclusão",      gradient: "from-red-500 to-rose-600",        dot: "bg-red-400" },
  approve:    { icon: CheckCircle, label: "Aprovação",     gradient: "from-violet-500 to-purple-600",   dot: "bg-violet-400" },
  archive:    { icon: Archive,     label: "Arquivamento",  gradient: "from-amber-500 to-orange-600",    dot: "bg-amber-400" },
  import:     { icon: Upload,      label: "Importação",    gradient: "from-cyan-500 to-sky-600",        dot: "bg-cyan-400" },
  activate:   { icon: Zap,         label: "Ativação",      gradient: "from-emerald-500 to-green-600",   dot: "bg-emerald-400" },
  deactivate: { icon: ZapOff,      label: "Desativação",   gradient: "from-slate-400 to-slate-500",     dot: "bg-slate-400" },
};

const ENTITY_META: Record<string, { icon: typeof Bot; label: string; color: string }> = {
  improvement: { icon: Zap,           label: "Melhoria",     color: "text-amber-300" },
  knowledge:   { icon: BookOpen,      label: "Conhecimento", color: "text-cyan-300" },
  rule:        { icon: Shield,        label: "Regra",        color: "text-rose-300" },
  skill:       { icon: Wand2,         label: "Skill",        color: "text-violet-300" },
  agent:       { icon: Bot,           label: "Agente",       color: "text-emerald-300" },
  mission:     { icon: Brain,         label: "Missão",       color: "text-blue-300" },
  flow:        { icon: GitBranch,     label: "Flow",         color: "text-pink-300" },
  prompt:      { icon: Settings,      label: "Prompt",       color: "text-slate-300" },
  lab_result:  { icon: FlaskConical,  label: "Lab",          color: "text-orange-300" },
  config:      { icon: Settings,      label: "Config",       color: "text-slate-300" },
};

const ENTITY_FILTERS = [
  { key: "all", label: "Tudo", icon: Eye },
  { key: "agent", label: "Agentes", icon: Bot },
  { key: "rule", label: "Regras", icon: Shield },
  { key: "skill", label: "Skills", icon: Wand2 },
  { key: "knowledge", label: "Base", icon: BookOpen },
  { key: "flow", label: "Flows", icon: GitBranch },
  { key: "config", label: "Config", icon: Settings },
];

/* ═══ Helpers ═══ */
function formatDayLabel(day: string): string {
  const d = new Date(day + "T12:00:00");
  if (isToday(d)) return "Hoje";
  if (isYesterday(d)) return "Ontem";
  return format(d, "EEEE, d 'de' MMMM", { locale: ptBR });
}

function getRelativeTime(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
}

/* ═══ Heatmap (last 35 days) ═══ */
function ActivityHeatmap({ entries }: { entries: any[] }) {
  const days = 35;
  const today = new Date();
  const countByDay: Record<string, number> = {};
  entries.forEach((e: any) => {
    const d = format(new Date(e.created_at), "yyyy-MM-dd");
    countByDay[d] = (countByDay[d] || 0) + 1;
  });
  const maxCount = Math.max(1, ...Object.values(countByDay));

  const cells = Array.from({ length: days }, (_, i) => {
    const date = subDays(today, days - 1 - i);
    const key = format(date, "yyyy-MM-dd");
    const count = countByDay[key] || 0;
    const intensity = count / maxCount;
    return { key, count, intensity, date };
  });

  return (
    <div className="flex items-end gap-[3px]">
      {cells.map(cell => (
        <div
          key={cell.key}
          title={`${format(cell.date, "dd/MM")} · ${cell.count} ações`}
          className="rounded-[3px] transition-all hover:scale-125 cursor-default"
          style={{
            width: 10,
            height: Math.max(4, 28 * cell.intensity + 4),
            background: cell.count === 0
              ? "hsl(var(--muted) / 0.3)"
              : `hsl(${160 - cell.intensity * 40}, ${50 + cell.intensity * 30}%, ${30 + cell.intensity * 25}%)`,
          }}
        />
      ))}
    </div>
  );
}

/* ═══ Single entry card ═══ */
function EntryCard({ entry, isExpanded, onToggle }: { entry: any; isExpanded: boolean; onToggle: () => void }) {
  const action = ACTION_META[entry.action_type] || ACTION_META.create;
  const entity = ENTITY_META[entry.entity_type] || ENTITY_META.config;
  const ActionIcon = action.icon;
  const EntityIcon = entity.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      onClick={onToggle}
      className={cn(
        "group relative rounded-2xl border cursor-pointer transition-all duration-200",
        "bg-card/60 backdrop-blur-sm",
        isExpanded
          ? "border-primary/30 shadow-lg shadow-primary/5"
          : "border-border/20 hover:border-border/40 hover:bg-card/80"
      )}
    >
      <div className="p-4 flex items-start gap-3.5">
        {/* Icon orb */}
        <div className={cn(
          "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-inner",
          action.gradient
        )}>
          <EntityIcon className="w-4.5 h-4.5 text-white drop-shadow" />
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-foreground leading-tight truncate max-w-[340px]">
              {entry.entity_name || entry.description?.slice(0, 50)}
            </span>
            <span className={cn(
              "inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
              "bg-gradient-to-r bg-clip-text text-transparent",
              action.gradient
            )}>
              <ActionIcon className={cn("w-3 h-3", action.dot.replace("bg-", "text-"))} />
              {action.label}
            </span>
            <span className={cn("text-[10px] font-medium", entity.color)}>
              {entity.label}
            </span>
          </div>

          {/* Description */}
          <p className={cn(
            "text-xs leading-relaxed transition-all",
            isExpanded ? "text-muted-foreground" : "text-muted-foreground/70 line-clamp-1"
          )}>
            {entry.description}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground/60">
            <span className="flex items-center gap-1 font-mono tabular-nums">
              <Clock className="w-3 h-3" />
              {format(new Date(entry.created_at), "HH:mm")}
            </span>
            {entry.performed_by && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {entry.performed_by}
              </span>
            )}
            {entry.agent_name && (
              <span className="flex items-center gap-1 text-emerald-400/80">
                <Bot className="w-3 h-3" />
                {entry.agent_name}
              </span>
            )}
            {entry.approved_by && (
              <span className="flex items-center gap-1 text-violet-400/80 font-medium">
                <CheckCircle className="w-3 h-3" />
                {entry.approved_by}
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <ChevronRight className={cn(
          "w-4 h-4 shrink-0 text-muted-foreground/30 transition-transform mt-1",
          isExpanded && "rotate-90 text-primary/60"
        )} />
      </div>

      {/* Expanded panel */}
      <AnimatePresence>
        {isExpanded && entry.details && Object.keys(entry.details).length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0">
              <div className="rounded-xl bg-muted/20 border border-border/10 p-3">
                <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-semibold mb-2">Dados técnicos</p>
                <pre className="text-[11px] text-muted-foreground/70 font-mono leading-relaxed overflow-x-auto max-h-[200px] whitespace-pre-wrap">
                  {JSON.stringify(entry.details, null, 2)}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ═══ Main Component ═══ */
export default function AITeamExtrato() {
  const [search, setSearch] = useState("");
  const [filterEntity, setFilterEntity] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ["ai_team_audit_log", filterEntity],
    queryFn: async () => {
      let query = (supabase.from("ai_team_audit_log" as any) as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (filterEntity !== "all") query = query.eq("entity_type", filterEntity);
      const { data } = await query;
      return (data || []) as any[];
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter((e: any) =>
      [e.description, e.entity_name, e.agent_name, e.performed_by]
        .some(f => (f || "").toLowerCase().includes(q))
    );
  }, [entries, search]);

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    filtered.forEach((entry: any) => {
      const day = format(new Date(entry.created_at), "yyyy-MM-dd");
      if (!map[day]) map[day] = [];
      map[day].push(entry);
    });
    return map;
  }, [filtered]);

  // Quick stats
  const totalDays = Object.keys(grouped).length;
  const recentCount = entries.filter((e: any) => differenceInDays(new Date(), new Date(e.created_at)) < 7).length;

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* ═══ HERO HEADER ═══ */}
      <div className="shrink-0 relative overflow-hidden">
        {/* Gradient bg */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/40 via-background to-cyan-950/20" />
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-violet-500/5 rounded-full blur-[100px]" />

        <div className="relative px-6 pt-6 pb-5 space-y-5">
          {/* Top row */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-background animate-pulse" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground tracking-tight">
                    Centro de Atividade
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {entries.length} registros · {totalDays} dias · {recentCount} esta semana
                  </p>
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => refetch()}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Atualizar
            </Button>
          </div>

          {/* Heatmap bar */}
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-semibold">
                Últimos 35 dias
              </p>
              <ActivityHeatmap entries={entries} />
            </div>
            <div className="text-right shrink-0 space-y-0.5">
              <p className="text-2xl font-bold text-foreground tabular-nums">{recentCount}</p>
              <p className="text-[10px] text-muted-foreground/60">ações/7d</p>
            </div>
          </div>

          {/* Search + Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
              <Input
                placeholder="Buscar no histórico..."
                className="pl-10 h-10 bg-card/50 border-border/20 text-foreground placeholder:text-muted-foreground/40 rounded-xl text-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-card/40 border border-border/10">
              {ENTITY_FILTERS.map(f => {
                const Icon = f.icon;
                const active = filterEntity === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilterEntity(f.key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                      active
                        ? "bg-primary/15 text-primary shadow-sm"
                        : "text-muted-foreground/60 hover:text-foreground hover:bg-card/60"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ ACTIVITY STREAM ═══ */}
      <ScrollArea className="flex-1 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Radio className="w-5 h-5 text-primary animate-pulse" />
              </div>
              <p className="text-sm text-muted-foreground">Carregando atividade...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6">
            <div className="w-16 h-16 rounded-3xl bg-muted/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-muted-foreground/20" />
            </div>
            <p className="text-sm font-medium text-muted-foreground/60">Sem atividade registrada</p>
            <p className="text-xs text-muted-foreground/40 mt-1">Novas ações aparecerão aqui automaticamente</p>
          </div>
        ) : (
          <div className="px-6 py-4 space-y-8">
            {Object.entries(grouped).map(([day, dayEntries]) => (
              <div key={day} className="space-y-2">
                {/* Day header */}
                <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/70 -mx-6 px-6 py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-foreground/80 uppercase tracking-widest capitalize">
                      {formatDayLabel(day)}
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-border/30 to-transparent" />
                    <span className="text-[10px] text-muted-foreground/40 tabular-nums font-mono">
                      {dayEntries.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {dayEntries.map((entry: any) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      isExpanded={expandedId === entry.id}
                      onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
