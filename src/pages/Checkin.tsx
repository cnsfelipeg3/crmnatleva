import { useState, useEffect, useMemo, useCallback } from "react";
import { formatDateBR } from "@/lib/dateFormat";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  ClipboardCheck, Clock, AlertTriangle, CheckCircle2, Copy,
  ExternalLink, Eye, Plane, User, Search,
  RefreshCw, Loader2, Shield, Calendar, List, LayoutGrid, Columns3,
  ArrowRight, Timer, Zap,
} from "lucide-react";
import AirlineLogo from "@/components/AirlineLogo";
import TaskCalendarView from "@/components/TaskCalendarView";

interface CheckinTask {
  id: string;
  sale_id: string;
  direction: string;
  segment_id: string | null;
  departure_datetime_utc: string | null;
  checkin_open_datetime_utc: string | null;
  checkin_due_datetime_utc: string | null;
  status: string;
  priority_score: number;
  notes: string | null;
  seat_info: string | null;
  completed_at: string | null;
  completed_by_user_id: string | null;
  created_at: string;
  sale?: any;
  segment?: any;
  passengers?: any[];
  airline_rule?: any;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; dot: string; bg: string }> = {
  PENDENTE: { label: "Pendente", color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200", icon: Clock, dot: "bg-blue-500", bg: "from-blue-500/5 to-transparent" },
  URGENTE: { label: "Urgente", color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200", icon: AlertTriangle, dot: "bg-amber-500", bg: "from-amber-500/5 to-transparent" },
  CRITICO: { label: "Crítico", color: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertTriangle, dot: "bg-destructive", bg: "from-destructive/5 to-transparent" },
  CONCLUIDO: { label: "Concluído", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200", icon: CheckCircle2, dot: "bg-emerald-500", bg: "from-emerald-500/5 to-transparent" },
  BLOQUEADO: { label: "Bloqueado", color: "bg-muted text-muted-foreground border-border", icon: Shield, dot: "bg-muted-foreground/50", bg: "from-muted/50 to-transparent" },
};

function getTimeRemaining(departure: string | null): string {
  if (!departure) return "—";
  const diff = new Date(departure).getTime() - Date.now();
  if (diff <= 0) return "Já partiu";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  return `${hours}h ${mins}m`;
}

function computeStatus(departure: string | null): string {
  if (!departure) return "BLOQUEADO";
  const diff = new Date(departure).getTime() - Date.now();
  if (diff <= 0) return "CRITICO";
  const hours = diff / (1000 * 60 * 60);
  if (hours <= 6) return "CRITICO";
  if (hours <= 24) return "URGENTE";
  return "PENDENTE";
}

function getDateLabel(dateStr: string | null): string {
  if (!dateStr) return "Sem data";
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (target.getTime() < today.getTime()) return "Atrasado";
  if (target.getTime() === today.getTime()) return "Hoje";
  if (target.getTime() === tomorrow.getTime()) return "Amanhã";
  return formatDateBR(dateStr);
}

function getDateKey(dateStr: string | null): string {
  if (!dateStr) return "9999-sem-data";
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDaysUntil(dateStr: string | null): number {
  if (!dateStr) return 999;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d = new Date(dateStr);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

type ViewMode = "agenda" | "cards" | "pipeline" | "calendar";
type TimeFilter = "all" | "today" | "tomorrow" | "3days" | "7days";

export default function Checkin() {
  const [tasks, setTasks] = useState<CheckinTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTime, setFilterTime] = useState<TimeFilter>("all");
  const [filterAirline, setFilterAirline] = useState("all");
  const [mainTab, setMainTab] = useState<"active" | "history">("active");
  const [viewMode, setViewMode] = useState<ViewMode>("agenda");
  const [completeDialog, setCompleteDialog] = useState<CheckinTask | null>(null);
  const [seatInfo, setSeatInfo] = useState("");
  const [completeNotes, setCompleteNotes] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchTasks = async () => {
    setLoading(true);
    const { data: tasksData } = await supabase
      .from("checkin_tasks")
      .select("*")
      .order("departure_datetime_utc", { ascending: true });

    if (!tasksData) { setLoading(false); return; }

    const saleIds = [...new Set(tasksData.map(t => t.sale_id))];
    const segmentIds = tasksData.map(t => t.segment_id).filter(Boolean) as string[];

    const [salesRes, segmentsRes, passengersRes, rulesRes] = await Promise.all([
      saleIds.length > 0 ? supabase.from("sales").select("*").in("id", saleIds) : { data: [] },
      segmentIds.length > 0 ? supabase.from("flight_segments").select("*").in("id", segmentIds) : { data: [] },
      saleIds.length > 0 ? supabase.from("sale_passengers").select("passenger_id, sale_id, passengers(*)").in("sale_id", saleIds) : { data: [] },
      supabase.from("airline_checkin_rules").select("*"),
    ]);

    const salesMap = new Map((salesRes.data || []).map((s: any) => [s.id, s]));
    const segmentsMap = new Map((segmentsRes.data || []).map((s: any) => [s.id, s]));
    const rulesMap = new Map((rulesRes.data || []).map((r: any) => [r.airline_iata, r]));
    const passengersBySale = new Map<string, any[]>();
    (passengersRes.data || []).forEach((sp: any) => {
      if (!passengersBySale.has(sp.sale_id)) passengersBySale.set(sp.sale_id, []);
      if (sp.passengers) passengersBySale.get(sp.sale_id)!.push(sp.passengers);
    });

    const enriched = tasksData.map(t => {
      const sale = salesMap.get(t.sale_id);
      const segment = t.segment_id ? segmentsMap.get(t.segment_id) : null;
      const airline = segment?.airline || sale?.airline || "";
      return { ...t, sale, segment, passengers: passengersBySale.get(t.sale_id) || [], airline_rule: rulesMap.get(airline) };
    });

    setTasks(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke("checkin-generate");
      if (error) throw error;
      toast({ title: "Tarefas de check-in atualizadas!" });
      await fetchTasks();
    } catch (err: any) {
      toast({ title: "Erro ao gerar tarefas", description: err.message, variant: "destructive" });
    } finally { setGenerating(false); }
  };

  const handleComplete = async () => {
    if (!completeDialog) return;
    try {
      await supabase.from("checkin_tasks").update({
        status: "CONCLUIDO",
        completed_at: new Date().toISOString(),
        completed_by_user_id: user?.id,
        seat_info: seatInfo || null,
        notes: completeNotes || null,
      }).eq("id", completeDialog.id);
      toast({ title: "Check-in marcado como concluído!" });
      setCompleteDialog(null);
      setSeatInfo("");
      setCompleteNotes("");
      await fetchTasks();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  const toggleSelected = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBatchCheckin = () => {
    const selectedTasks = tasks.filter(t => selected.has(t.id));
    const urls = new Set<string>();
    selectedTasks.forEach(t => {
      if (t.airline_rule?.checkin_url) urls.add(t.airline_rule.checkin_url);
    });
    urls.forEach(url => window.open(url, "_blank"));
    if (urls.size === 0) toast({ title: "Nenhum link de check-in disponível para os itens selecionados" });
    else toast({ title: `${urls.size} aba(s) de check-in aberta(s)` });
  };

  // Unique airlines for filter
  const airlines = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => {
      const airline = t.segment?.airline || t.sale?.airline || "";
      if (airline) set.add(airline);
    });
    return [...set].sort();
  }, [tasks]);

  const filtered = useMemo(() => {
    let result = tasks;
    if (mainTab === "active") {
      result = result.filter(t => t.status !== "CONCLUIDO");
    } else {
      result = result.filter(t => t.status === "CONCLUIDO");
    }
    if (filterStatus !== "all") result = result.filter(t => t.status === filterStatus);
    if (filterAirline !== "all") result = result.filter(t => (t.segment?.airline || t.sale?.airline) === filterAirline);
    if (filterTime !== "all") {
      result = result.filter(t => {
        const dep = t.segment?.departure_date || t.sale?.departure_date || t.departure_datetime_utc;
        const days = getDaysUntil(dep);
        if (filterTime === "today") return days === 0;
        if (filterTime === "tomorrow") return days === 1;
        if (filterTime === "3days") return days >= 0 && days <= 3;
        if (filterTime === "7days") return days >= 0 && days <= 7;
        return true;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t => {
        const sale = t.sale;
        const paxNames = t.passengers?.map((p: any) => p.full_name?.toLowerCase()).join(" ") || "";
        return (
          sale?.name?.toLowerCase().includes(q) ||
          sale?.display_id?.toLowerCase().includes(q) ||
          sale?.origin_iata?.toLowerCase().includes(q) ||
          sale?.destination_iata?.toLowerCase().includes(q) ||
          sale?.locators?.some((l: string) => l?.toLowerCase().includes(q)) ||
          paxNames.includes(q) ||
          t.segment?.flight_number?.toLowerCase().includes(q)
        );
      });
    }
    return result;
  }, [tasks, mainTab, filterStatus, filterAirline, filterTime, search]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, { label: string; tasks: CheckinTask[] }>();
    filtered.forEach(t => {
      const depDate = t.segment?.departure_date || t.sale?.departure_date || t.departure_datetime_utc;
      const key = getDateKey(depDate);
      const label = getDateLabel(depDate);
      if (!groups.has(key)) groups.set(key, { label, tasks: [] });
      groups.get(key)!.tasks.push(t);
    });
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  // Pipeline columns
  const pipelineCols = useMemo(() => {
    const cols = {
      CRITICO: [] as CheckinTask[],
      URGENTE: [] as CheckinTask[],
      PENDENTE: [] as CheckinTask[],
      CONCLUIDO: [] as CheckinTask[],
    };
    filtered.forEach(t => {
      const status = t.status === "CONCLUIDO" ? "CONCLUIDO" : computeStatus(t.departure_datetime_utc);
      if (cols[status as keyof typeof cols]) cols[status as keyof typeof cols].push(t);
    });
    return cols;
  }, [filtered]);

  // KPIs
  const activeTasks = tasks.filter(t => t.status !== "CONCLUIDO");
  const todayTasks = activeTasks.filter(t => {
    const dep = t.segment?.departure_date || t.sale?.departure_date || t.departure_datetime_utc;
    return dep && getDateLabel(dep) === "Hoje";
  });
  const tomorrowTasks = activeTasks.filter(t => {
    const dep = t.segment?.departure_date || t.sale?.departure_date || t.departure_datetime_utc;
    return dep && getDateLabel(dep) === "Amanhã";
  });
  const overdueTasks = activeTasks.filter(t => {
    const dep = t.segment?.departure_date || t.sale?.departure_date || t.departure_datetime_utc;
    return dep && getDateLabel(dep) === "Atrasado";
  });

  const getTaskDetails = (task: CheckinTask) => {
    const sale = task.sale;
    const segment = task.segment;
    const airline = segment?.airline || sale?.airline || "";
    const flightNum = segment?.flight_number || "";
    const origin = segment?.origin_iata || sale?.origin_iata || "?";
    const dest = segment?.destination_iata || sale?.destination_iata || "?";
    const depDate = segment?.departure_date || sale?.departure_date || "";
    const depTime = segment?.departure_time || "";
    const locators = sale?.locators?.filter(Boolean) || [];
    const checkinUrl = task.airline_rule?.checkin_url;
    const cabinType = segment?.cabin_type || segment?.flight_class || "";
    const paxNames = task.passengers?.map((p: any) => p.full_name) || [];
    const statusKey = task.status === "CONCLUIDO" ? "CONCLUIDO" : computeStatus(task.departure_datetime_utc);
    const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.PENDENTE;
    return { sale, segment, airline, flightNum, origin, dest, depDate, depTime, locators, checkinUrl, cabinType, paxNames, statusKey, statusCfg };
  };

  const renderAgendaRow = (task: CheckinTask) => {
    const { airline, flightNum, origin, dest, depTime, locators, checkinUrl, paxNames, statusCfg, statusKey } = getTaskDetails(task);
    const StatusIcon = statusCfg.icon;
    const isSelected = selected.has(task.id);

    return (
      <div
        key={task.id}
        className={`flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-b-0 hover:bg-muted/30 transition-colors group ${statusKey === "CRITICO" ? "bg-gradient-to-r " + statusCfg.bg : ""}`}
      >
        {mainTab === "active" && (
          <Checkbox checked={isSelected} onCheckedChange={() => toggleSelected(task.id)} className="shrink-0" />
        )}

        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusCfg.dot} ${statusKey === "CRITICO" ? "animate-pulse" : ""}`} />

        <div className="w-14 shrink-0 text-center">
          {depTime ? (
            <span className="text-sm font-mono font-bold text-foreground">{depTime.slice(0, 5)}</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>

        <div className="flex items-center gap-2 w-44 shrink-0">
          {airline ? <AirlineLogo iata={airline} size={22} /> : <Plane className="w-4 h-4 text-muted-foreground" />}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1">
              {origin} <ArrowRight className="w-3 h-3 text-muted-foreground" /> {dest}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">{airline} {flightNum}</p>
          </div>
        </div>

        <Badge variant="outline" className="text-[9px] uppercase shrink-0 h-5">{task.direction}</Badge>

        <div className="flex-1 min-w-0 hidden md:block">
          <p className="text-xs text-muted-foreground truncate" title={paxNames.join(", ")}>
            <User className="w-3 h-3 inline mr-1" />{paxNames.join(", ") || "—"}
          </p>
        </div>

        <div className="w-24 shrink-0 hidden lg:block">
          {locators.length > 0 ? (
            <button onClick={() => copyToClipboard(locators[0])} className="flex items-center gap-1 text-xs font-mono text-foreground hover:text-primary transition-colors">
              {locators[0]} <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />
            </button>
          ) : (
            <span className="text-xs text-muted-foreground/50">—</span>
          )}
        </div>

        <div className="w-20 shrink-0 text-right">
          <Badge variant="outline" className={`${statusCfg.color} text-[9px] gap-0.5`}>
            <StatusIcon className="w-3 h-3" />
            {getTimeRemaining(task.departure_datetime_utc)}
          </Badge>
        </div>

        <div className="flex gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
          {task.status !== "CONCLUIDO" && (
            <Button size="sm" variant="default" className="text-[10px] h-6 px-2" onClick={() => {
              setCompleteDialog(task);
              setSeatInfo(task.seat_info || "");
              setCompleteNotes(task.notes || "");
            }}>
              <CheckCircle2 className="w-3 h-3" />
            </Button>
          )}
          {checkinUrl && (
            <Button size="sm" variant="outline" className="text-[10px] h-6 px-2 gap-1" onClick={() => window.open(checkinUrl, "_blank")}>
              <ExternalLink className="w-3 h-3" /> Check-in
            </Button>
          )}
          <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={() => navigate(`/sales/${task.sale_id}`)}>
            <Eye className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  };

  const renderCard = (task: CheckinTask) => {
    const { airline, flightNum, origin, dest, depDate, depTime, locators, checkinUrl, cabinType, paxNames, statusCfg, statusKey } = getTaskDetails(task);
    const StatusIcon = statusCfg.icon;
    const isSelected = selected.has(task.id);

    return (
      <Card key={task.id} className={`p-0 overflow-hidden hover:shadow-lg transition-all ${statusKey === "CRITICO" ? "ring-1 ring-destructive/30" : ""}`}>
        {/* Top gradient bar */}
        <div className={`h-1.5 bg-gradient-to-r ${statusCfg.bg.replace("to-transparent", statusKey === "CRITICO" ? "to-destructive/20" : statusKey === "URGENTE" ? "to-amber-500/20" : "to-primary/10")}`} />

        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {mainTab === "active" && <Checkbox checked={isSelected} onCheckedChange={() => toggleSelected(task.id)} />}
              <Badge variant="outline" className={`${statusCfg.color} text-[10px] gap-1`}>
                <StatusIcon className="w-3 h-3" /> {statusCfg.label}
              </Badge>
              <Badge variant="outline" className="text-[10px] uppercase">{task.direction}</Badge>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-foreground whitespace-nowrap flex items-center gap-1">
                <Timer className="w-3 h-3 text-muted-foreground" />
                {task.status !== "CONCLUIDO" ? getTimeRemaining(task.departure_datetime_utc) : "✓"}
              </span>
            </div>
          </div>

          {/* Flight info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
              {airline ? <AirlineLogo iata={airline} size={28} /> : <Plane className="w-5 h-5 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-foreground flex items-center gap-1.5">
                {origin} <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" /> {dest}
              </p>
              <p className="text-xs text-muted-foreground">
                {airline} {flightNum} {cabinType ? `• ${cabinType}` : ""}
              </p>
            </div>
          </div>

          {/* Date + Time */}
          <div className="flex gap-4 text-xs text-muted-foreground">
            {depDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {formatDateBR(depDate)}
              </span>
            )}
            {depTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {depTime.slice(0, 5)}
              </span>
            )}
          </div>

          {/* Locators */}
          {locators.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase text-muted-foreground font-semibold">PNR</span>
              {locators.map((l: string, i: number) => (
                <button key={i} onClick={() => copyToClipboard(l)} className="text-xs font-mono font-bold text-primary bg-primary/5 px-2 py-0.5 rounded hover:bg-primary/10 transition-colors flex items-center gap-1">
                  {l} <Copy className="w-2.5 h-2.5" />
                </button>
              ))}
            </div>
          )}

          {/* Passengers */}
          {paxNames.length > 0 && (
            <div className="space-y-1">
              {paxNames.slice(0, 3).map((name: string, i: number) => (
                <p key={i} className="text-xs flex items-center gap-1.5">
                  <User className="w-3 h-3 text-muted-foreground" />
                  <span className="text-foreground">{name}</span>
                </p>
              ))}
              {paxNames.length > 3 && (
                <p className="text-[10px] text-muted-foreground">+{paxNames.length - 3} passageiro(s)</p>
              )}
            </div>
          )}

          {task.seat_info && <p className="text-xs text-muted-foreground">💺 {task.seat_info}</p>}

          {/* Sale reference */}
          {task.sale?.display_id && (
            <p className="text-[10px] text-muted-foreground">Venda: <span className="font-mono font-bold">{task.sale.display_id}</span> — {task.sale.name}</p>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/40">
            {checkinUrl && task.status !== "CONCLUIDO" && (
              <Button size="sm" className="text-[10px] h-7 gap-1" onClick={() => window.open(checkinUrl, "_blank")}>
                <Zap className="w-3 h-3" /> Fazer Check-in Agora
              </Button>
            )}
            {task.status !== "CONCLUIDO" && (
              <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1" onClick={() => {
                setCompleteDialog(task);
                setSeatInfo(task.seat_info || "");
                setCompleteNotes(task.notes || "");
              }}>
                <CheckCircle2 className="w-3 h-3" /> Concluir
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-[10px] h-7 gap-1" onClick={() => navigate(`/sales/${task.sale_id}`)}>
              <Eye className="w-3 h-3" /> Venda
            </Button>
          </div>

          {/* Completed info */}
          {task.status === "CONCLUIDO" && task.completed_at && (
            <p className="text-[10px] text-muted-foreground italic">
              ✓ Concluído em {formatDateBR(task.completed_at)} {task.seat_info ? `• Assento: ${task.seat_info}` : ""}
            </p>
          )}
        </div>
      </Card>
    );
  };

  const renderPipelineCol = (title: string, statusKey: string, items: CheckinTask[]) => {
    const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.PENDENTE;
    return (
      <div className="flex-1 min-w-[260px] space-y-2">
        <div className="flex items-center gap-2 px-1 mb-3">
          <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</span>
          <Badge variant="outline" className="text-[10px] ml-auto">{items.length}</Badge>
        </div>
        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          {items.map(t => renderCard(t))}
          {items.length === 0 && (
            <div className="text-center py-8 text-muted-foreground/50 text-xs">Vazio</div>
          )}
        </div>
      </div>
    );
  };

  const dateLabelStyle = (label: string) => {
    if (label === "Atrasado") return "bg-destructive text-destructive-foreground";
    if (label === "Hoje") return "bg-primary text-primary-foreground";
    if (label === "Amanhã") return "bg-amber-500 text-white";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-serif text-foreground flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 md:w-6 md:h-6" /> Centro de Check-in
          </h1>
          <p className="text-xs text-muted-foreground">Controle operacional de check-ins de voo</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && mainTab === "active" && (
            <Button size="sm" variant="secondary" onClick={handleBatchCheckin} className="gap-1">
              <ExternalLink className="w-3.5 h-3.5" />
              Check-in em lote ({selected.size})
            </Button>
          )}
          <Button size="sm" onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className={`p-4 cursor-pointer transition-all hover:scale-[1.02] border-2 ${overdueTasks.length > 0 ? "border-destructive/50 bg-destructive/5" : "border-transparent"} ${filterTime === "all" && filterStatus === "all" ? "" : ""}`}
          onClick={() => { setFilterTime("all"); setFilterStatus("all"); setMainTab("active"); }}>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-3 h-3 rounded-full bg-destructive ${overdueTasks.length > 0 ? "animate-pulse" : ""}`} />
            <span className="text-xs font-medium text-muted-foreground">Atrasados</span>
          </div>
          <p className="text-2xl font-bold text-destructive">{overdueTasks.length}</p>
        </Card>
        <Card className={`p-4 cursor-pointer transition-all hover:scale-[1.02] border-2 ${todayTasks.length > 0 ? "border-primary/50 bg-primary/5" : "border-transparent"}`}
          onClick={() => { setFilterTime("today"); setMainTab("active"); }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-xs font-medium text-muted-foreground">Hoje</span>
          </div>
          <p className="text-2xl font-bold text-primary">{todayTasks.length}</p>
        </Card>
        <Card className="p-4 cursor-pointer transition-all hover:scale-[1.02]"
          onClick={() => { setFilterTime("tomorrow"); setMainTab("active"); }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-xs font-medium text-muted-foreground">Amanhã</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{tomorrowTasks.length}</p>
        </Card>
        <Card className="p-4 cursor-pointer transition-all hover:scale-[1.02]"
          onClick={() => { setMainTab("history"); setFilterTime("all"); }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-muted-foreground">Concluídos</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{tasks.filter(t => t.status === "CONCLUIDO").length}</p>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          <button
            onClick={() => { setMainTab("active"); setFilterTime("all"); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mainTab === "active" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            Ativos ({activeTasks.length})
          </button>
          <button
            onClick={() => { setMainTab("history"); setFilterTime("all"); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mainTab === "history" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            Histórico
          </button>
        </div>

        <div className="flex-1" />

        {/* Time filters */}
        {mainTab === "active" && (
          <div className="flex gap-1">
            {([["all", "Todos"], ["today", "Hoje"], ["tomorrow", "Amanhã"], ["3days", "3 dias"], ["7days", "7 dias"]] as [TimeFilter, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilterTime(val)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${filterTime === val ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar passageiro, PNR, destino..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs w-[200px]"
          />
        </div>

        {mainTab === "active" && (
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="CRITICO">Crítico</SelectItem>
              <SelectItem value="URGENTE">Urgente</SelectItem>
              <SelectItem value="PENDENTE">Pendente</SelectItem>
              <SelectItem value="BLOQUEADO">Bloqueado</SelectItem>
            </SelectContent>
          </Select>
        )}

        {airlines.length > 1 && (
          <Select value={filterAirline} onValueChange={setFilterAirline}>
            <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Cia aérea</SelectItem>
              {airlines.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <div className="flex gap-0.5 bg-muted rounded-md p-0.5">
          <button onClick={() => setViewMode("agenda")} className={`p-1.5 rounded ${viewMode === "agenda" ? "bg-background shadow-sm" : ""}`} title="Lista">
            <List className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setViewMode("cards")} className={`p-1.5 rounded ${viewMode === "cards" ? "bg-background shadow-sm" : ""}`} title="Cards">
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setViewMode("pipeline")} className={`p-1.5 rounded ${viewMode === "pipeline" ? "bg-background shadow-sm" : ""}`} title="Pipeline">
            <Columns3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setViewMode("calendar")} className={`p-1.5 rounded ${viewMode === "calendar" ? "bg-background shadow-sm" : ""}`} title="Calendário">
            <Calendar className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Batch bar */}
      {selected.size > 0 && mainTab === "active" && (
        <Card className="p-3 flex items-center gap-3 bg-primary/5 border-primary/20">
          <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={(checked) => {
            if (checked) setSelected(new Set(filtered.map(t => t.id)));
            else setSelected(new Set());
          }} />
          <span className="text-xs font-medium">{selected.size} selecionado(s)</span>
          <Button size="sm" variant="default" className="text-[10px] h-7 gap-1 ml-auto" onClick={handleBatchCheckin}>
            <ExternalLink className="w-3 h-3" /> Abrir check-in em lote
          </Button>
          <Button size="sm" variant="ghost" className="text-[10px] h-7" onClick={() => setSelected(new Set())}>
            Limpar
          </Button>
        </Card>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <ClipboardCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            {mainTab === "active" ? "Nenhum check-in pendente" : "Nenhum check-in no histórico"}
          </p>
          {mainTab === "active" && (
            <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generating}>
              <RefreshCw className="w-3 h-3 mr-1" /> Gerar tarefas
            </Button>
          )}
        </Card>
      ) : viewMode === "pipeline" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {renderPipelineCol("Crítico / Urgente", "CRITICO", [...pipelineCols.CRITICO, ...pipelineCols.URGENTE])}
          {renderPipelineCol("Pendente", "PENDENTE", pipelineCols.PENDENTE)}
          {renderPipelineCol("Concluído", "CONCLUIDO", pipelineCols.CONCLUIDO)}
        </div>
      ) : viewMode === "calendar" ? (
        <TaskCalendarView
          tasks={filtered.map(t => {
            const d = getTaskDetails(t);
            const depDate = t.segment?.departure_date || t.sale?.departure_date || t.departure_datetime_utc;
            return {
              id: t.id,
              date: depDate,
              label: `${d.origin} → ${d.dest}`,
              sublabel: `${d.airline} ${d.flightNum} ${d.paxNames.join(", ")}`,
              statusDot: d.statusCfg.dot,
              statusLabel: d.statusCfg.label,
              onClick: () => navigate(`/sales/${t.sale_id}`),
            };
          })}
          emptyMessage="Nenhum check-in neste mês"
        />
      ) : (
        <div className="space-y-4">
          {groupedByDate.map(([key, group]) => (
            <div key={key}>
              <div className="flex items-center gap-2 mb-2 sticky top-0 z-10 bg-background/95 backdrop-blur py-1">
                <Badge className={`${dateLabelStyle(group.label)} text-xs font-bold px-3 py-1`}>
                  {group.label}
                </Badge>
                <span className="text-xs text-muted-foreground">{group.tasks.length} check-in(s)</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>

              {viewMode === "agenda" ? (
                <Card className="overflow-hidden divide-y divide-border/30">
                  {group.tasks.map(renderAgendaRow)}
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {group.tasks.map(renderCard)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Complete Dialog */}
      <Dialog open={!!completeDialog} onOpenChange={() => setCompleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Confirmar Check-in
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {completeDialog && (() => {
              const d = getTaskDetails(completeDialog);
              return (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    {d.airline && <AirlineLogo iata={d.airline} size={28} />}
                    <div>
                      <p className="font-bold text-foreground flex items-center gap-1">
                        {d.origin} <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" /> {d.dest}
                      </p>
                      <p className="text-xs text-muted-foreground">{d.airline} {d.flightNum} {d.depDate ? `• ${formatDateBR(d.depDate)}` : ""} {d.depTime ? `às ${d.depTime.slice(0, 5)}` : ""}</p>
                    </div>
                  </div>
                  {d.paxNames.length > 0 && (
                    <div className="pt-2 border-t border-border/40">
                      {d.paxNames.map((name: string, i: number) => (
                        <p key={i} className="text-xs flex items-center gap-1.5"><User className="w-3 h-3" />{name}</p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
            <div className="space-y-2">
              <Label className="text-xs">Assentos (opcional)</Label>
              <Input placeholder="Ex: 12A, 12B" value={seatInfo} onChange={e => setSeatInfo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Observações</Label>
              <Textarea placeholder="Notas sobre o check-in..." value={completeNotes} onChange={e => setCompleteNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialog(null)}>Cancelar</Button>
            <Button onClick={handleComplete} className="gap-1">
              <CheckCircle2 className="w-4 h-4" /> Confirmar Concluído
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
