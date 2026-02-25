import { useState, useEffect, useMemo } from "react";
import { formatDateBR, formatTimeBR } from "@/lib/dateFormat";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  ClipboardCheck, Clock, AlertTriangle, CheckCircle2, Copy,
  ExternalLink, Eye, Plane, User, Search,
  RefreshCw, Loader2, Shield, Calendar, List, LayoutGrid,
} from "lucide-react";
import AirlineLogo from "@/components/AirlineLogo";

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

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; dot: string }> = {
  PENDENTE: { label: "Pendente", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: Clock, dot: "bg-blue-500" },
  URGENTE: { label: "Urgente", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", icon: AlertTriangle, dot: "bg-amber-500" },
  CRITICO: { label: "Crítico", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: AlertTriangle, dot: "bg-red-500" },
  CONCLUIDO: { label: "Concluído", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", icon: CheckCircle2, dot: "bg-emerald-500" },
  BLOQUEADO: { label: "Bloqueado", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300", icon: Shield, dot: "bg-gray-400" },
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
  const dayAfter = new Date(today); dayAfter.setDate(today.getDate() + 2);
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

export default function Checkin() {
  const [tasks, setTasks] = useState<CheckinTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [mainTab, setMainTab] = useState<"active" | "history">("active");
  const [viewMode, setViewMode] = useState<"agenda" | "cards">("agenda");
  const [completeDialog, setCompleteDialog] = useState<CheckinTask | null>(null);
  const [seatInfo, setSeatInfo] = useState("");
  const [completeNotes, setCompleteNotes] = useState("");
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

  const filtered = useMemo(() => {
    let result = tasks;
    if (mainTab === "active") {
      result = result.filter(t => t.status !== "CONCLUIDO");
    } else {
      result = result.filter(t => t.status === "CONCLUIDO");
    }
    if (filterStatus !== "all") result = result.filter(t => t.status === filterStatus);
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
  }, [tasks, mainTab, filterStatus, search]);

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

  const renderAgendaRow = (task: CheckinTask) => {
    const sale = task.sale;
    const segment = task.segment;
    const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDENTE;
    const StatusIcon = statusCfg.icon;
    const airline = segment?.airline || sale?.airline || "";
    const flightNum = segment?.flight_number || "";
    const origin = segment?.origin_iata || sale?.origin_iata || "?";
    const dest = segment?.destination_iata || sale?.destination_iata || "?";
    const depTime = segment?.departure_time || "";
    const locators = sale?.locators?.filter(Boolean) || [];
    const checkinUrl = task.airline_rule?.checkin_url;
    const paxNames = task.passengers?.map((p: any) => p.full_name).join(", ") || "—";

    return (
      <div
        key={task.id}
        className="flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-b-0 hover:bg-muted/30 transition-colors group"
      >
        {/* Status dot */}
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusCfg.dot}`} />

        {/* Time */}
        <div className="w-14 shrink-0 text-center">
          {depTime ? (
            <span className="text-sm font-mono font-bold text-foreground">{depTime.slice(0, 5)}</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>

        {/* Flight */}
        <div className="flex items-center gap-2 w-40 shrink-0">
          {airline ? <AirlineLogo iata={airline} size={18} /> : <Plane className="w-4 h-4 text-muted-foreground" />}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{origin} → {dest}</p>
            <p className="text-[10px] text-muted-foreground truncate">{airline} {flightNum}</p>
          </div>
        </div>

        {/* Direction badge */}
        <Badge variant="outline" className="text-[9px] uppercase shrink-0 h-5">{task.direction}</Badge>

        {/* Passengers */}
        <div className="flex-1 min-w-0 hidden md:block">
          <p className="text-xs text-muted-foreground truncate" title={paxNames}>
            <User className="w-3 h-3 inline mr-1" />{paxNames}
          </p>
        </div>

        {/* PNR */}
        <div className="w-24 shrink-0 hidden lg:block">
          {locators.length > 0 ? (
            <button onClick={() => copyToClipboard(locators[0])} className="flex items-center gap-1 text-xs font-mono text-foreground hover:text-primary transition-colors">
              {locators[0]} <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />
            </button>
          ) : (
            <span className="text-xs text-muted-foreground/50">—</span>
          )}
        </div>

        {/* Time remaining */}
        <div className="w-20 shrink-0 text-right">
          <Badge className={`${statusCfg.color} text-[9px] gap-0.5`}>
            <StatusIcon className="w-3 h-3" />
            {getTimeRemaining(task.departure_datetime_utc)}
          </Badge>
        </div>

        {/* Actions */}
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
            <Button size="sm" variant="outline" className="text-[10px] h-6 px-2" onClick={() => window.open(checkinUrl, "_blank")}>
              <ExternalLink className="w-3 h-3" />
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
    const sale = task.sale;
    const segment = task.segment;
    const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDENTE;
    const StatusIcon = statusCfg.icon;
    const airline = segment?.airline || sale?.airline || "";
    const flightNum = segment?.flight_number || "";
    const origin = segment?.origin_iata || sale?.origin_iata || "?";
    const dest = segment?.destination_iata || sale?.destination_iata || "?";
    const depDate = segment?.departure_date || sale?.departure_date || "";
    const depTime = segment?.departure_time || "";
    const locators = sale?.locators?.filter(Boolean) || [];
    const checkinUrl = task.airline_rule?.checkin_url;

    return (
      <Card key={task.id} className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className={`${statusCfg.color} text-[10px] gap-1`}>
              <StatusIcon className="w-3 h-3" /> {statusCfg.label}
            </Badge>
            <Badge variant="outline" className="text-[10px] uppercase">{task.direction}</Badge>
          </div>
          <span className="text-xs font-bold text-foreground whitespace-nowrap">
            {task.status !== "CONCLUIDO" ? getTimeRemaining(task.departure_datetime_utc) : "✓"}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-2">
          {airline ? <AirlineLogo iata={airline} size={20} /> : <Plane className="w-4 h-4 text-muted-foreground" />}
          <span className="text-sm font-semibold text-foreground">{origin} → {dest}</span>
          {flightNum && <span className="text-xs font-mono text-muted-foreground">{flightNum}</span>}
        </div>

        <div className="text-xs text-muted-foreground mb-2 space-y-0.5">
          {depDate && <p>📅 {formatDateBR(depDate)} {depTime && `às ${depTime.slice(0, 5)}`}</p>}
          {locators.length > 0 && (
            <p className="flex items-center gap-1">
              📋 <span className="font-mono font-bold text-foreground">{locators.join(", ")}</span>
              <button onClick={() => copyToClipboard(locators[0])} className="hover:text-primary"><Copy className="w-3 h-3" /></button>
            </p>
          )}
        </div>

        {task.passengers && task.passengers.length > 0 && (
          <div className="mb-3 space-y-0.5">
            {task.passengers.slice(0, 2).map((p: any, i: number) => (
              <p key={i} className="text-xs flex items-center gap-1.5">
                <User className="w-3 h-3 text-muted-foreground" />
                <span className="text-foreground">{p.full_name}</span>
              </p>
            ))}
            {task.passengers.length > 2 && (
              <p className="text-[10px] text-muted-foreground">+{task.passengers.length - 2} passageiro(s)</p>
            )}
          </div>
        )}

        {task.seat_info && <p className="text-xs text-muted-foreground mb-2">💺 {task.seat_info}</p>}

        <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/40">
          {task.status !== "CONCLUIDO" && (
            <Button size="sm" className="text-[10px] h-7" onClick={() => {
              setCompleteDialog(task);
              setSeatInfo(task.seat_info || "");
              setCompleteNotes(task.notes || "");
            }}>
              <CheckCircle2 className="w-3 h-3 mr-1" /> Concluir
            </Button>
          )}
          {checkinUrl && (
            <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => window.open(checkinUrl, "_blank")}>
              <ExternalLink className="w-3 h-3 mr-1" /> Check-in
            </Button>
          )}
          <Button size="sm" variant="ghost" className="text-[10px] h-7" onClick={() => navigate(`/sales/${task.sale_id}`)}>
            <Eye className="w-3 h-3 mr-1" /> Venda
          </Button>
        </div>
      </Card>
    );
  };

  const dateLabelStyle = (label: string) => {
    if (label === "Atrasado") return "bg-red-500 text-white";
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
            <ClipboardCheck className="w-5 h-5 md:w-6 md:h-6" /> Check-in
          </h1>
          <p className="text-xs text-muted-foreground">Controle operacional de check-ins de voo</p>
        </div>
        <Button size="sm" onClick={handleGenerate} disabled={generating}>
          {generating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          Atualizar Tarefas
        </Button>
      </div>

      {/* Quick stats - prominent "today" */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className={`p-4 border-2 ${overdueTasks.length > 0 ? "border-red-500/50 bg-red-50 dark:bg-red-950/20" : "border-transparent"}`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium text-muted-foreground">Atrasados</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{overdueTasks.length}</p>
        </Card>
        <Card className={`p-4 border-2 ${todayTasks.length > 0 ? "border-primary/50 bg-primary/5" : "border-transparent"}`}>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Hoje</span>
          </div>
          <p className="text-2xl font-bold text-primary">{todayTasks.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-muted-foreground">Amanhã</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{tomorrowTasks.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-muted-foreground">Concluídos</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{tasks.filter(t => t.status === "CONCLUIDO").length}</p>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setMainTab("active")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mainTab === "active" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            Ativos ({activeTasks.length})
          </button>
          <button
            onClick={() => setMainTab("history")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mainTab === "history" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            Histórico
          </button>
        </div>

        <div className="flex-1" />

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

        {/* View toggle */}
        <div className="flex gap-0.5 bg-muted rounded-md p-0.5">
          <button onClick={() => setViewMode("agenda")} className={`p-1.5 rounded ${viewMode === "agenda" ? "bg-background shadow-sm" : ""}`}>
            <List className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setViewMode("cards")} className={`p-1.5 rounded ${viewMode === "cards" ? "bg-background shadow-sm" : ""}`}>
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

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
      ) : (
        <div className="space-y-4">
          {groupedByDate.map(([key, group]) => (
            <div key={key}>
              {/* Date header */}
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
            <DialogTitle>Confirmar Check-in</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {completeDialog && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-semibold">
                  {completeDialog.segment?.origin_iata || completeDialog.sale?.origin_iata} → {completeDialog.segment?.destination_iata || completeDialog.sale?.destination_iata}
                </p>
                <p className="text-xs text-muted-foreground">
                  {completeDialog.passengers?.map((p: any) => p.full_name).join(", ")}
                </p>
              </div>
            )}
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
            <Button onClick={handleComplete}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Confirmar Concluído
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
