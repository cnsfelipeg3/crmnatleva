import { useState, useEffect, useMemo } from "react";
import { formatDateBR, formatDateTimeBR } from "@/lib/dateFormat";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Hotel, Clock, AlertTriangle, CheckCircle2, Copy,
  Eye, User, Search, RefreshCw, Loader2, Shield,
  XCircle, Phone, Calendar, List, LayoutGrid,
} from "lucide-react";
import TaskCalendarView from "@/components/TaskCalendarView";

interface LodgingTask {
  id: string;
  sale_id: string;
  hotel_name: string | null;
  hotel_reservation_code: string | null;
  hotel_checkin_datetime_utc: string | null;
  milestone: string;
  scheduled_at_utc: string | null;
  status: string;
  urgency_level: string;
  contact_method: string | null;
  contact_details: string | null;
  notes: string | null;
  confirmed_at: string | null;
  confirmed_by_user_id: string | null;
  issue_type: string | null;
  issue_resolution: string | null;
  created_at: string;
  sale?: any;
  passengers?: any[];
}

const MILESTONE_CONFIG: Record<string, { label: string; short: string; color: string; dot: string }> = {
  D14: { label: "Confirmação 14 dias", short: "14d", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", dot: "bg-emerald-500" },
  D7: { label: "Confirmação 7 dias", short: "7d", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", dot: "bg-amber-500" },
  H24: { label: "Confirmação 24h", short: "24h", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", dot: "bg-red-500" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; dot: string }> = {
  PENDENTE: { label: "Pendente", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: Clock, dot: "bg-blue-500" },
  EM_ANDAMENTO: { label: "Em andamento", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300", icon: Clock, dot: "bg-indigo-500" },
  CONFIRMADO: { label: "Confirmado", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", icon: CheckCircle2, dot: "bg-emerald-500" },
  PROBLEMA: { label: "Problema", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: XCircle, dot: "bg-red-500" },
  BLOQUEADO: { label: "Bloqueado", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300", icon: Shield, dot: "bg-gray-400" },
  CANCELADO: { label: "Cancelado", color: "bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400", icon: XCircle, dot: "bg-gray-300" },
};

function getTimeRemaining(checkin: string | null): string {
  if (!checkin) return "—";
  const diff = new Date(checkin).getTime() - Date.now();
  if (diff <= 0) return "Já passou";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
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

function getScheduledDateLabel(task: LodgingTask): string {
  // Use scheduled_at for grouping (when the confirmation should happen)
  const dateStr = task.scheduled_at_utc || task.hotel_checkin_datetime_utc;
  return getDateLabel(dateStr);
}

function getDateKey(dateStr: string | null): string {
  if (!dateStr) return "9999-sem-data";
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Lodging() {
  const [tasks, setTasks] = useState<LodgingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMilestone, setFilterMilestone] = useState("all");
  const [mainTab, setMainTab] = useState<"active" | "history">("active");
  const [viewMode, setViewMode] = useState<"agenda" | "cards" | "calendar">("agenda");

  const [confirmDialog, setConfirmDialog] = useState<LodgingTask | null>(null);
  const [confirmMethod, setConfirmMethod] = useState("");
  const [confirmNotes, setConfirmNotes] = useState("");

  const [problemDialog, setProblemDialog] = useState<LodgingTask | null>(null);
  const [issueType, setIssueType] = useState("");
  const [issueNotes, setIssueNotes] = useState("");

  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchTasks = async () => {
    setLoading(true);
    const { data: tasksData } = await supabase
      .from("lodging_confirmation_tasks")
      .select("*")
      .order("hotel_checkin_datetime_utc", { ascending: true });

    if (!tasksData) { setLoading(false); return; }

    const saleIds = [...new Set(tasksData.map(t => t.sale_id))];
    const [salesRes, passengersRes] = await Promise.all([
      saleIds.length > 0 ? supabase.from("sales").select("*").in("id", saleIds) : { data: [] },
      saleIds.length > 0 ? supabase.from("sale_passengers").select("passenger_id, sale_id, passengers(*)").in("sale_id", saleIds) : { data: [] },
    ]);

    const salesMap = new Map((salesRes.data || []).map((s: any) => [s.id, s]));
    const paxBySale = new Map<string, any[]>();
    (passengersRes.data || []).forEach((sp: any) => {
      if (!paxBySale.has(sp.sale_id)) paxBySale.set(sp.sale_id, []);
      if (sp.passengers) paxBySale.get(sp.sale_id)!.push(sp.passengers);
    });

    setTasks(tasksData.map(t => ({
      ...t,
      sale: salesMap.get(t.sale_id),
      passengers: paxBySale.get(t.sale_id) || [],
    })));
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke("lodging-generate");
      if (error) throw error;
      toast({ title: "Tarefas de hospedagem atualizadas!" });
      await fetchTasks();
    } catch (err: any) {
      toast({ title: "Erro ao gerar tarefas", description: err.message, variant: "destructive" });
    } finally { setGenerating(false); }
  };

  const handleConfirm = async () => {
    if (!confirmDialog) return;
    try {
      await supabase.from("lodging_confirmation_tasks").update({
        status: "CONFIRMADO",
        confirmed_at: new Date().toISOString(),
        confirmed_by_user_id: user?.id,
        contact_method: confirmMethod || null,
        notes: confirmNotes || null,
      }).eq("id", confirmDialog.id);
      toast({ title: "Hospedagem confirmada!" });
      setConfirmDialog(null);
      setConfirmMethod("");
      setConfirmNotes("");
      await fetchTasks();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleProblem = async () => {
    if (!problemDialog) return;
    try {
      await supabase.from("lodging_confirmation_tasks").update({
        status: "PROBLEMA",
        issue_type: issueType || null,
        issue_resolution: issueNotes || null,
        notes: issueNotes || null,
      }).eq("id", problemDialog.id);
      toast({ title: "Problema registrado" });
      setProblemDialog(null);
      setIssueType("");
      setIssueNotes("");
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
      result = result.filter(t => !["CONFIRMADO", "CANCELADO"].includes(t.status));
    } else {
      result = result.filter(t => ["CONFIRMADO", "CANCELADO"].includes(t.status));
    }
    if (filterStatus !== "all") result = result.filter(t => t.status === filterStatus);
    if (filterMilestone !== "all") result = result.filter(t => t.milestone === filterMilestone);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t => {
        const paxNames = t.passengers?.map((p: any) => p.full_name?.toLowerCase()).join(" ") || "";
        return (
          t.hotel_name?.toLowerCase().includes(q) ||
          t.hotel_reservation_code?.toLowerCase().includes(q) ||
          t.sale?.name?.toLowerCase().includes(q) ||
          t.sale?.display_id?.toLowerCase().includes(q) ||
          paxNames.includes(q)
        );
      });
    }
    return result;
  }, [tasks, mainTab, filterStatus, filterMilestone, search]);

  // Group by scheduled date (when confirmation should happen)
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, { label: string; tasks: LodgingTask[] }>();
    filtered.forEach(t => {
      const dateStr = t.scheduled_at_utc || t.hotel_checkin_datetime_utc;
      const key = getDateKey(dateStr);
      const label = getDateLabel(dateStr);
      if (!groups.has(key)) groups.set(key, { label, tasks: [] });
      groups.get(key)!.tasks.push(t);
    });
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  // Stats
  const activeTasks = tasks.filter(t => !["CONFIRMADO", "CANCELADO"].includes(t.status));
  const todayTasks = activeTasks.filter(t => {
    const dateStr = t.scheduled_at_utc || t.hotel_checkin_datetime_utc;
    return dateStr && getDateLabel(dateStr) === "Hoje";
  });
  const tomorrowTasks = activeTasks.filter(t => {
    const dateStr = t.scheduled_at_utc || t.hotel_checkin_datetime_utc;
    return dateStr && getDateLabel(dateStr) === "Amanhã";
  });
  const problemTasks = activeTasks.filter(t => t.status === "PROBLEMA");
  const overdueTasks = activeTasks.filter(t => {
    const dateStr = t.scheduled_at_utc || t.hotel_checkin_datetime_utc;
    return dateStr && getDateLabel(dateStr) === "Atrasado";
  });

  const renderAgendaRow = (task: LodgingTask) => {
    const sale = task.sale;
    const milestoneCfg = MILESTONE_CONFIG[task.milestone] || MILESTONE_CONFIG.D14;
    const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDENTE;
    const StatusIcon = statusCfg.icon;
    const paxNames = task.passengers?.map((p: any) => p.full_name).join(", ") || "—";

    return (
      <div
        key={task.id}
        className="flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-b-0 hover:bg-muted/30 transition-colors group"
      >
        {/* Milestone dot */}
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${milestoneCfg.dot}`} />

        {/* Milestone badge */}
        <Badge className={`${milestoneCfg.color} text-[9px] shrink-0 h-5`}>{milestoneCfg.short}</Badge>

        {/* Hotel */}
        <div className="flex items-center gap-2 w-48 shrink-0 min-w-0">
          <Hotel className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{task.hotel_name || "Hotel não informado"}</p>
            <p className="text-[10px] text-muted-foreground truncate">{sale?.destination_city || sale?.destination_iata || ""}</p>
          </div>
        </div>

        {/* Check-in date */}
        <div className="w-24 shrink-0 hidden md:block">
          <p className="text-xs text-muted-foreground">
            {task.hotel_checkin_datetime_utc ? formatDateBR(task.hotel_checkin_datetime_utc) : "—"}
          </p>
        </div>

        {/* Reservation code */}
        <div className="w-28 shrink-0 hidden lg:block">
          {task.hotel_reservation_code ? (
            <button onClick={() => copyToClipboard(task.hotel_reservation_code!)} className="flex items-center gap-1 text-xs font-mono text-foreground hover:text-primary transition-colors">
              {task.hotel_reservation_code} <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />
            </button>
          ) : (
            <span className="text-xs text-muted-foreground/50">—</span>
          )}
        </div>

        {/* Passengers */}
        <div className="flex-1 min-w-0 hidden md:block">
          <p className="text-xs text-muted-foreground truncate" title={paxNames}>
            <User className="w-3 h-3 inline mr-1" />{paxNames}
          </p>
        </div>

        {/* Status */}
        <Badge className={`${statusCfg.color} text-[9px] gap-0.5 shrink-0`}>
          <StatusIcon className="w-3 h-3" />
          {getTimeRemaining(task.hotel_checkin_datetime_utc)}
        </Badge>

        {/* Actions */}
        <div className="flex gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
          {!["CONFIRMADO", "CANCELADO"].includes(task.status) && (
            <>
              <Button size="sm" variant="default" className="text-[10px] h-6 px-2" onClick={() => {
                setConfirmDialog(task);
                setConfirmMethod("");
                setConfirmNotes(task.notes || "");
              }}>
                <CheckCircle2 className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="outline" className="text-[10px] h-6 px-2 text-red-600 border-red-200 hover:bg-red-50" onClick={() => {
                setProblemDialog(task);
                setIssueType("");
                setIssueNotes("");
              }}>
                <XCircle className="w-3 h-3" />
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={() => navigate(`/sales/${task.sale_id}`)}>
            <Eye className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  };

  const renderCard = (task: LodgingTask) => {
    const sale = task.sale;
    const milestoneCfg = MILESTONE_CONFIG[task.milestone] || MILESTONE_CONFIG.D14;
    const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDENTE;
    const StatusIcon = statusCfg.icon;

    return (
      <Card key={task.id} className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className={`${milestoneCfg.color} text-[10px]`}>{milestoneCfg.short}</Badge>
            <Badge className={`${statusCfg.color} text-[10px] gap-1`}>
              <StatusIcon className="w-3 h-3" /> {statusCfg.label}
            </Badge>
          </div>
          <span className="text-xs font-bold text-foreground whitespace-nowrap">
            {!["CONFIRMADO", "CANCELADO"].includes(task.status) ? getTimeRemaining(task.hotel_checkin_datetime_utc) : "✓"}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <Hotel className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{task.hotel_name || "Hotel não informado"}</span>
        </div>

        <div className="text-xs text-muted-foreground mb-2 space-y-0.5">
          {task.hotel_checkin_datetime_utc && <p>📅 Check-in: {formatDateBR(task.hotel_checkin_datetime_utc)}</p>}
          {sale?.destination_iata && <p>📍 {sale.destination_city || sale.destination_iata}</p>}
          {task.hotel_reservation_code && (
            <p className="flex items-center gap-1">
              📋 <span className="font-mono font-bold text-foreground">{task.hotel_reservation_code}</span>
              <button onClick={() => copyToClipboard(task.hotel_reservation_code!)} className="hover:text-primary"><Copy className="w-3 h-3" /></button>
            </p>
          )}
          {sale?.hotel_room && <p>🛏️ {sale.hotel_room}</p>}
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
              <p className="text-[10px] text-muted-foreground">+{task.passengers.length - 2} hóspede(s)</p>
            )}
          </div>
        )}

        {task.status === "PROBLEMA" && task.issue_type && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2 mb-3 text-[10px] text-red-700 dark:text-red-300">
            ⚠️ {task.issue_type}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/40">
          {!["CONFIRMADO", "CANCELADO"].includes(task.status) && (
            <>
              <Button size="sm" className="text-[10px] h-7" onClick={() => {
                setConfirmDialog(task);
                setConfirmMethod("");
                setConfirmNotes(task.notes || "");
              }}>
                <CheckCircle2 className="w-3 h-3 mr-1" /> Confirmar
              </Button>
              <Button size="sm" variant="destructive" className="text-[10px] h-7" onClick={() => {
                setProblemDialog(task);
                setIssueType("");
                setIssueNotes("");
              }}>
                <XCircle className="w-3 h-3 mr-1" /> Problema
              </Button>
            </>
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
            <Hotel className="w-5 h-5 md:w-6 md:h-6" /> Confirmar Hospedagens
          </h1>
          <p className="text-xs text-muted-foreground">Confirmações de reserva organizadas por data</p>
        </div>
        <Button size="sm" onClick={handleGenerate} disabled={generating}>
          {generating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          Atualizar Tarefas
        </Button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
        <Card className={`p-4 ${problemTasks.length > 0 ? "border-2 border-red-300 dark:border-red-800" : ""}`}>
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium text-muted-foreground">Problemas</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{problemTasks.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-muted-foreground">Confirmados</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{tasks.filter(t => t.status === "CONFIRMADO").length}</p>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          <button onClick={() => setMainTab("active")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mainTab === "active" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
            Ativos ({activeTasks.length})
          </button>
          <button onClick={() => setMainTab("history")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mainTab === "history" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
            Histórico
          </button>
        </div>

        <div className="flex-1" />

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar hotel, hóspede, reserva..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs w-[200px]" />
        </div>

        {mainTab === "active" && (
          <>
            <Select value={filterMilestone} onValueChange={setFilterMilestone}>
              <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas etapas</SelectItem>
                <SelectItem value="H24">24 horas</SelectItem>
                <SelectItem value="D7">7 dias</SelectItem>
                <SelectItem value="D14">14 dias</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="PENDENTE">Pendente</SelectItem>
                <SelectItem value="EM_ANDAMENTO">Em andamento</SelectItem>
                <SelectItem value="PROBLEMA">Problema</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}

        <div className="flex gap-0.5 bg-muted rounded-md p-0.5">
          <button onClick={() => setViewMode("agenda")} className={`p-1.5 rounded ${viewMode === "agenda" ? "bg-background shadow-sm" : ""}`}>
            <List className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setViewMode("cards")} className={`p-1.5 rounded ${viewMode === "cards" ? "bg-background shadow-sm" : ""}`}>
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setViewMode("calendar")} className={`p-1.5 rounded ${viewMode === "calendar" ? "bg-background shadow-sm" : ""}`}>
            <Calendar className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Hotel className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            {mainTab === "active" ? "Nenhuma confirmação pendente" : "Nenhuma confirmação no histórico"}
          </p>
          {mainTab === "active" && (
            <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generating}>
              <RefreshCw className="w-3 h-3 mr-1" /> Gerar tarefas
            </Button>
          )}
        </Card>
      ) : viewMode === "calendar" ? (
        <TaskCalendarView
          tasks={filtered.map(t => {
            const milestoneCfg = MILESTONE_CONFIG[t.milestone] || MILESTONE_CONFIG.D14;
            const statusCfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.PENDENTE;
            const dateStr = t.hotel_checkin_datetime_utc || t.scheduled_at_utc;
            return {
              id: t.id,
              date: dateStr,
              label: t.hotel_name || "Hotel",
              sublabel: `${milestoneCfg.short} — ${t.sale?.name || ""}`,
              statusDot: statusCfg.dot,
              statusLabel: statusCfg.label,
              onClick: () => navigate(`/sales/${t.sale_id}`),
            };
          })}
          emptyMessage="Nenhuma hospedagem neste mês"
        />
      ) : (
        <div className="space-y-4">
          {groupedByDate.map(([key, group]) => (
            <div key={key}>
              <div className="flex items-center gap-2 mb-2 sticky top-0 z-10 bg-background/95 backdrop-blur py-1">
                <Badge className={`${dateLabelStyle(group.label)} text-xs font-bold px-3 py-1`}>
                  {group.label}
                </Badge>
                <span className="text-xs text-muted-foreground">{group.tasks.length} confirmação(ões)</span>
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

      {/* Confirm Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Hospedagem</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {confirmDialog && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-semibold">{confirmDialog.hotel_name}</p>
                <p className="text-xs text-muted-foreground">
                  {confirmDialog.hotel_reservation_code && `Reserva: ${confirmDialog.hotel_reservation_code} • `}
                  {confirmDialog.passengers?.map((p: any) => p.full_name).join(", ")}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs">Método de contato</Label>
              <Select value={confirmMethod} onValueChange={setConfirmMethod}>
                <SelectTrigger><SelectValue placeholder="Como confirmou?" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">E-mail</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="PHONE">Telefone</SelectItem>
                  <SelectItem value="PORTAL">Portal da reserva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Observações</Label>
              <Textarea placeholder="Resumo do retorno do hotel..." value={confirmNotes} onChange={e => setConfirmNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancelar</Button>
            <Button onClick={handleConfirm}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Problem Dialog */}
      <Dialog open={!!problemDialog} onOpenChange={() => setProblemDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Problema</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {problemDialog && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-semibold">{problemDialog.hotel_name}</p>
                <p className="text-xs text-muted-foreground">{problemDialog.hotel_reservation_code}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs">Tipo do problema</Label>
              <Select value={issueType} onValueChange={setIssueType}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Reserva não localizada">Reserva não localizada</SelectItem>
                  <SelectItem value="Pagamento pendente">Pagamento pendente</SelectItem>
                  <SelectItem value="Overbooking">Overbooking</SelectItem>
                  <SelectItem value="Cancelamento pelo hotel">Cancelamento pelo hotel</SelectItem>
                  <SelectItem value="Dados divergentes">Dados divergentes</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Descrição e plano de resolução</Label>
              <Textarea placeholder="Descreva o problema..." value={issueNotes} onChange={e => setIssueNotes(e.target.value)} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProblemDialog(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleProblem}>
              <XCircle className="w-4 h-4 mr-1" /> Registrar Problema
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
