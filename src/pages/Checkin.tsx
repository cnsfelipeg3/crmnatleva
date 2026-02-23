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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  ClipboardCheck, Clock, AlertTriangle, CheckCircle2, Copy,
  ExternalLink, Eye, Plane, User, Phone, FileText, Search,
  RefreshCw, Loader2, Shield,
} from "lucide-react";

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
  // Joined data
  sale?: any;
  segment?: any;
  passengers?: any[];
  airline_rule?: any;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDENTE: { label: "Pendente", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: Clock },
  URGENTE: { label: "Urgente", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300", icon: AlertTriangle },
  CRITICO: { label: "Crítico", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: AlertTriangle },
  CONCLUIDO: { label: "Concluído", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", icon: CheckCircle2 },
  BLOQUEADO: { label: "Bloqueado", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300", icon: Shield },
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

export default function Checkin() {
  const [tasks, setTasks] = useState<CheckinTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("48h");
  const [filterStatus, setFilterStatus] = useState("all");
  const [tab, setTab] = useState<"active" | "history">("active");
  const [completeDialog, setCompleteDialog] = useState<CheckinTask | null>(null);
  const [seatInfo, setSeatInfo] = useState("");
  const [completeNotes, setCompleteNotes] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchTasks = async () => {
    setLoading(true);

    // Fetch tasks with sale data
    const { data: tasksData } = await supabase
      .from("checkin_tasks")
      .select("*")
      .order("departure_datetime_utc", { ascending: true });

    if (!tasksData) { setLoading(false); return; }

    // Fetch sales, segments, passengers, rules in parallel
    const saleIds = [...new Set(tasksData.map(t => t.sale_id))];
    const segmentIds = tasksData.map(t => t.segment_id).filter(Boolean) as string[];

    const [salesRes, segmentsRes, passengersRes, rulesRes] = await Promise.all([
      saleIds.length > 0
        ? supabase.from("sales").select("*").in("id", saleIds)
        : { data: [] },
      segmentIds.length > 0
        ? supabase.from("flight_segments").select("*").in("id", segmentIds)
        : { data: [] },
      saleIds.length > 0
        ? supabase.from("sale_passengers").select("passenger_id, sale_id, passengers(*)").in("sale_id", saleIds)
        : { data: [] },
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
      return {
        ...t,
        sale,
        segment,
        passengers: passengersBySale.get(t.sale_id) || [],
        airline_rule: rulesMap.get(airline),
      };
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
    } finally {
      setGenerating(false);
    }
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

    // Tab filter
    if (tab === "active") {
      result = result.filter(t => t.status !== "CONCLUIDO");
    } else {
      result = result.filter(t => t.status === "CONCLUIDO");
    }

    // Period filter
    if (filterPeriod !== "all" && tab === "active") {
      const now = Date.now();
      const hours = filterPeriod === "today" ? 24 : filterPeriod === "48h" ? 48 : 168;
      result = result.filter(t => {
        if (!t.departure_datetime_utc) return true; // show blocked
        const diff = new Date(t.departure_datetime_utc).getTime() - now;
        return diff <= hours * 60 * 60 * 1000;
      });
    }

    // Status filter
    if (filterStatus !== "all") {
      result = result.filter(t => t.status === filterStatus);
    }

    // Search
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
  }, [tasks, tab, filterPeriod, filterStatus, search]);

  // Group by urgency
  const grouped = useMemo(() => {
    if (tab === "history") return { history: filtered };
    const critico = filtered.filter(t => t.status === "CRITICO");
    const urgente = filtered.filter(t => t.status === "URGENTE");
    const pendente = filtered.filter(t => t.status === "PENDENTE");
    const bloqueado = filtered.filter(t => t.status === "BLOQUEADO");
    return { critico, urgente, pendente, bloqueado };
  }, [filtered, tab]);

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
    const isInternational = sale?.is_international;
    const checkinUrl = task.airline_rule?.checkin_url;

    return (
      <Card key={task.id} className="p-4 glass-card hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Badge className={`${statusCfg.color} text-[10px] gap-1`}>
              <StatusIcon className="w-3 h-3" />
              {statusCfg.label}
            </Badge>
            <Badge variant="outline" className="text-[10px] uppercase">{task.direction}</Badge>
            {isInternational && (
              <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-300">
                🌍 Internacional
              </Badge>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-bold text-foreground">
              {task.status !== "CONCLUIDO" ? getTimeRemaining(task.departure_datetime_utc) : "✓"}
            </p>
            {task.status !== "CONCLUIDO" && (
              <p className="text-[10px] text-muted-foreground">restante</p>
            )}
          </div>
        </div>

        {/* Flight info */}
        <div className="flex items-center gap-2 mb-2">
          <Plane className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-semibold text-foreground">{origin} → {dest}</span>
          {airline && <span className="text-xs text-muted-foreground">{airline}</span>}
          {flightNum && <span className="text-xs font-mono text-muted-foreground">{flightNum}</span>}
        </div>

        <div className="text-xs text-muted-foreground mb-2 space-y-0.5">
          {depDate && <p>📅 {formatDateBR(depDate)} {depTime && `às ${formatTimeBR(depTime)}`}</p>}
          {locators.length > 0 && (
            <p className="flex items-center gap-1">
              📋 PNR: <span className="font-mono font-bold text-foreground">{locators.join(", ")}</span>
              <button onClick={() => copyToClipboard(locators[0])} className="hover:text-primary">
                <Copy className="w-3 h-3" />
              </button>
            </p>
          )}
        </div>

        {/* Passengers */}
        {task.passengers && task.passengers.length > 0 && (
          <div className="mb-3 space-y-1">
            {task.passengers.slice(0, 2).map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <User className="w-3 h-3 text-muted-foreground" />
                <span className="text-foreground">{p.full_name}</span>
                {p.cpf && <span className="text-muted-foreground">CPF: {p.cpf}</span>}
                {isInternational && p.passport_number && (
                  <span className="text-orange-600">🛂 {p.passport_number}</span>
                )}
              </div>
            ))}
            {task.passengers.length > 2 && (
              <p className="text-[10px] text-muted-foreground">+{task.passengers.length - 2} passageiro(s)</p>
            )}
          </div>
        )}

        {/* International passport alert */}
        {isInternational && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded p-2 mb-3 text-[10px] text-orange-700 dark:text-orange-300 flex items-center gap-1">
            <Shield className="w-3 h-3" /> Conferir passaportes de todos os passageiros
          </div>
        )}

        {/* Seat info */}
        {task.seat_info && (
          <p className="text-xs text-muted-foreground mb-2">💺 Assentos: {task.seat_info}</p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {task.status !== "CONCLUIDO" && (
            <Button size="sm" variant="default" className="text-[10px] h-7" onClick={() => {
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
          {locators.length > 0 && (
            <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => copyToClipboard(locators[0])}>
              <Copy className="w-3 h-3 mr-1" /> PNR
            </Button>
          )}
          <Button size="sm" variant="ghost" className="text-[10px] h-7" onClick={() => navigate(`/sales/${task.sale_id}`)}>
            <Eye className="w-3 h-3 mr-1" /> Venda
          </Button>
        </div>
      </Card>
    );
  };

  const renderSection = (title: string, icon: any, items: CheckinTask[], color: string) => {
    if (items.length === 0) return null;
    const Icon = icon;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {items.map(renderCard)}
        </div>
      </div>
    );
  };

  // KPIs
  const activeTasks = tasks.filter(t => t.status !== "CONCLUIDO");
  const kpis = [
    { label: "Pendentes", value: activeTasks.filter(t => t.status === "PENDENTE").length, color: "text-blue-600" },
    { label: "Urgentes", value: activeTasks.filter(t => t.status === "URGENTE").length, color: "text-yellow-600" },
    { label: "Críticos", value: activeTasks.filter(t => t.status === "CRITICO").length, color: "text-red-600" },
    { label: "Bloqueados", value: activeTasks.filter(t => t.status === "BLOQUEADO").length, color: "text-gray-600" },
    { label: "Concluídos", value: tasks.filter(t => t.status === "CONCLUIDO").length, color: "text-green-600" },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif text-foreground flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6" /> Check-in
          </h1>
          <p className="text-sm text-muted-foreground">Controle operacional de check-ins</p>
        </div>
        <Button size="sm" onClick={handleGenerate} disabled={generating}>
          {generating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          Atualizar Tarefas
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {kpis.map(k => (
          <Card key={k.label} className="p-3 glass-card text-center">
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-[10px] text-muted-foreground">{k.label}</p>
          </Card>
        ))}
      </div>

      {/* Tabs + Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setTab("active")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === "active" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            Ativos
          </button>
          <button
            onClick={() => setTab("history")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === "history" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
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
            className="pl-8 h-8 text-xs w-[220px]"
          />
        </div>

        {tab === "active" && (
          <>
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="48h">Próximas 48h</SelectItem>
                <SelectItem value="7d">Próximos 7 dias</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
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
          </>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center glass-card">
          <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            {tab === "active" ? "Nenhum check-in pendente" : "Nenhum check-in no histórico"}
          </p>
          {tab === "active" && (
            <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generating}>
              <RefreshCw className="w-3 h-3 mr-1" /> Gerar tarefas de check-in
            </Button>
          )}
        </Card>
      ) : tab === "active" ? (
        <div className="space-y-6">
          {renderSection("🔴 Crítico — menos de 6h", AlertTriangle, (grouped as any).critico || [], "text-red-600")}
          {renderSection("🟡 Urgente — menos de 24h", AlertTriangle, (grouped as any).urgente || [], "text-yellow-600")}
          {renderSection("🔵 Pendente", Clock, (grouped as any).pendente || [], "text-blue-600")}
          {renderSection("⚫ Bloqueado — dados faltando", Shield, (grouped as any).bloqueado || [], "text-gray-600")}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(renderCard)}
        </div>
      )}

      {/* Complete Dialog */}
      <Dialog open={!!completeDialog} onOpenChange={() => setCompleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Check-in</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Assentos (opcional)</Label>
              <Input
                placeholder="Ex: 12A, 12B"
                value={seatInfo}
                onChange={e => setSeatInfo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Observações</Label>
              <Textarea
                placeholder="Notas sobre o check-in..."
                value={completeNotes}
                onChange={e => setCompleteNotes(e.target.value)}
                rows={3}
              />
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
