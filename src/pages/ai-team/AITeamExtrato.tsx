import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, RefreshCw, Plus, Pencil, Trash2, CheckCircle,
  Archive, Upload, Zap, ZapOff, Bot, BookOpen, Shield, Wand2,
  GitBranch, Brain, FlaskConical, Settings, Clock, User,
  Activity, Filter, ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

/* ═══ Mappings ═══ */

const ACTION_META: Record<string, { icon: typeof Plus; color: string; bg: string; label: string }> = {
  create:     { icon: Plus,        color: "text-emerald-400",           bg: "bg-emerald-500/15 border-emerald-500/30",  label: "Criação" },
  update:     { icon: Pencil,      color: "text-blue-400",              bg: "bg-blue-500/15 border-blue-500/30",        label: "Atualização" },
  delete:     { icon: Trash2,      color: "text-red-400",               bg: "bg-red-500/15 border-red-500/30",          label: "Exclusão" },
  approve:    { icon: CheckCircle, color: "text-violet-400",            bg: "bg-violet-500/15 border-violet-500/30",    label: "Aprovação" },
  archive:    { icon: Archive,     color: "text-amber-400",             bg: "bg-amber-500/15 border-amber-500/30",      label: "Arquivamento" },
  import:     { icon: Upload,      color: "text-cyan-400",              bg: "bg-cyan-500/15 border-cyan-500/30",        label: "Importação" },
  activate:   { icon: Zap,         color: "text-emerald-400",           bg: "bg-emerald-500/15 border-emerald-500/30",  label: "Ativação" },
  deactivate: { icon: ZapOff,      color: "text-slate-400",             bg: "bg-slate-500/15 border-slate-500/30",      label: "Desativação" },
};

const ENTITY_META: Record<string, { icon: typeof Bot; label: string; accent: string }> = {
  improvement: { icon: Zap,           label: "Melhoria",       accent: "text-amber-400" },
  knowledge:   { icon: BookOpen,      label: "Conhecimento",   accent: "text-cyan-400" },
  rule:        { icon: Shield,        label: "Regra",          accent: "text-red-400" },
  skill:       { icon: Wand2,         label: "Skill",          accent: "text-violet-400" },
  agent:       { icon: Bot,           label: "Agente",         accent: "text-emerald-400" },
  mission:     { icon: Brain,         label: "Missão",         accent: "text-blue-400" },
  flow:        { icon: GitBranch,     label: "Flow",           accent: "text-pink-400" },
  prompt:      { icon: Settings,      label: "Prompt",         accent: "text-slate-400" },
  lab_result:  { icon: FlaskConical,  label: "Teste Lab",      accent: "text-orange-400" },
  config:      { icon: Settings,      label: "Config",         accent: "text-slate-400" },
};

const FILTER_CHIPS = [
  { key: "all",        label: "Todos" },
  { key: "agent",      label: "Agentes" },
  { key: "rule",       label: "Regras" },
  { key: "skill",      label: "Skills" },
  { key: "knowledge",  label: "Conhecimento" },
  { key: "flow",       label: "Flows" },
  { key: "config",     label: "Config" },
];

export default function AITeamExtrato() {
  const [search, setSearch] = useState("");
  const [filterEntity, setFilterEntity] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ["ai_team_audit_log", filterEntity, filterAction],
    queryFn: async () => {
      let query = (supabase.from("ai_team_audit_log" as any) as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (filterEntity !== "all") query = query.eq("entity_type", filterEntity);
      if (filterAction !== "all") query = query.eq("action_type", filterAction);
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

  // Group by date
  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    filtered.forEach((entry: any) => {
      const day = format(new Date(entry.created_at), "yyyy-MM-dd");
      if (!map[day]) map[day] = [];
      map[day].push(entry);
    });
    return map;
  }, [filtered]);

  // Stats
  const stats = useMemo(() => {
    const byAction: Record<string, number> = {};
    entries.forEach((e: any) => {
      byAction[e.action_type] = (byAction[e.action_type] || 0) + 1;
    });
    return byAction;
  }, [entries]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ═══ HEADER ═══ */}
      <div className="shrink-0 px-5 pt-5 pb-4 border-b border-border/30">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/20">
              <Activity className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100 tracking-tight">Extrato · AI Team</h1>
              <p className="text-xs text-slate-400">{entries.length} registros · {Object.keys(grouped).length} dias de atividade</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1.5 text-xs border-border/40 text-slate-300 hover:text-slate-100">
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </Button>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
          {Object.entries(stats).map(([action, count]) => {
            const meta = ACTION_META[action];
            if (!meta) return null;
            const Icon = meta.icon;
            return (
              <button
                key={action}
                onClick={() => setFilterAction(filterAction === action ? "all" : action)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                  filterAction === action
                    ? cn(meta.bg, meta.color)
                    : "border-border/20 text-slate-400 hover:border-border/40 hover:text-slate-300"
                )}
              >
                <Icon className="w-3 h-3" />
                <span>{meta.label}</span>
                <span className="text-[10px] opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Search + Entity filter chips */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input
              placeholder="Buscar ações, agentes, descrições..."
              className="pl-9 h-9 bg-muted/30 border-border/30 text-slate-200 placeholder:text-slate-500 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {FILTER_CHIPS.map(chip => (
              <button
                key={chip.key}
                onClick={() => setFilterEntity(chip.key)}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                  filterEntity === chip.key
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-slate-400 hover:text-slate-300 hover:bg-muted/30"
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ TIMELINE ═══ */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-slate-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Carregando extrato...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="p-4 rounded-2xl bg-muted/20 mb-4">
              <Activity className="w-10 h-10 text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-400">Nenhum registro encontrado</p>
            <p className="text-xs text-slate-500 mt-1">Ajuste os filtros ou aguarde novas ações</p>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-6">
            {Object.entries(grouped).map(([day, dayEntries]) => (
              <div key={day}>
                {/* Date header */}
                <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 py-2 mb-3 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent" />
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {format(new Date(day), "EEEE, dd MMM yyyy", { locale: ptBR })}
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-500 border-border/30">
                    {dayEntries.length}
                  </Badge>
                  <div className="h-px flex-1 bg-gradient-to-l from-border/50 to-transparent" />
                </div>

                {/* Timeline entries */}
                <div className="relative ml-4 pl-6 border-l border-border/30 space-y-1">
                  {dayEntries.map((entry: any) => {
                    const action = ACTION_META[entry.action_type] || ACTION_META.create;
                    const entity = ENTITY_META[entry.entity_type] || ENTITY_META.config;
                    const ActionIcon = action.icon;
                    const EntityIcon = entity.icon;
                    const isExpanded = expandedId === entry.id;

                    return (
                      <button
                        key={entry.id}
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        className={cn(
                          "relative w-full text-left rounded-xl px-4 py-3 transition-all group",
                          "hover:bg-muted/20",
                          isExpanded && "bg-muted/25 ring-1 ring-border/30"
                        )}
                      >
                        {/* Timeline dot */}
                        <div className={cn(
                          "absolute -left-[31px] top-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                          "bg-background",
                          isExpanded ? "border-primary" : "border-border/50 group-hover:border-border"
                        )}>
                          <ActionIcon className={cn("w-2.5 h-2.5", action.color)} />
                        </div>

                        {/* Content */}
                        <div className="flex items-start gap-3">
                          <div className={cn("shrink-0 p-2 rounded-lg border", action.bg)}>
                            <EntityIcon className={cn("w-4 h-4", entity.accent)} />
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Top row: entity name + badges */}
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              {entry.entity_name && (
                                <span className="text-sm font-semibold text-slate-200 truncate max-w-[320px]">
                                  {entry.entity_name}
                                </span>
                              )}
                              <Badge className={cn("text-[9px] px-1.5 py-0 border font-medium", action.bg, action.color)}>
                                {action.label}
                              </Badge>
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-slate-400 border-border/30">
                                {entity.label}
                              </Badge>
                            </div>

                            {/* Description */}
                            <p className={cn(
                              "text-xs leading-relaxed",
                              isExpanded ? "text-slate-300" : "text-slate-400 line-clamp-1"
                            )}>
                              {entry.description}
                            </p>

                            {/* Meta row */}
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              <span className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                                <Clock className="w-3 h-3" />
                                {format(new Date(entry.created_at), "HH:mm:ss")}
                              </span>
                              {entry.performed_by && (
                                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                  <User className="w-3 h-3" />
                                  {entry.performed_by}
                                </span>
                              )}
                              {entry.approved_by && (
                                <span className="flex items-center gap-1 text-[10px] text-violet-400 font-medium">
                                  <CheckCircle className="w-3 h-3" />
                                  Aprovado por {entry.approved_by}
                                  {entry.approved_at && <> · {format(new Date(entry.approved_at), "HH:mm")}</>}
                                </span>
                              )}
                              {entry.agent_name && (
                                <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                                  <Bot className="w-3 h-3" />
                                  {entry.agent_name}
                                </span>
                              )}
                            </div>

                            {/* Expanded details */}
                            {isExpanded && entry.details && Object.keys(entry.details).length > 0 && (
                              <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border/20">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 font-semibold">Detalhes técnicos</p>
                                <pre className="text-[10px] text-slate-400 overflow-x-auto max-h-[160px] font-mono leading-relaxed">
                                  {JSON.stringify(entry.details, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>

                          {/* Expand indicator */}
                          <ChevronDown className={cn(
                            "w-3.5 h-3.5 shrink-0 text-slate-600 transition-transform mt-1",
                            isExpanded && "rotate-180 text-slate-400"
                          )} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
