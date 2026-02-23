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
  XCircle, Phone, Mail,
} from "lucide-react";

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

const MILESTONE_CONFIG: Record<string, { label: string; color: string; urgency: string }> = {
  D14: { label: "Confirmação 14d", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", urgency: "LOW" },
  D7: { label: "Confirmação 7d", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", urgency: "MEDIUM" },
  H24: { label: "Confirmação 24h", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", urgency: "HIGH" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDENTE: { label: "Pendente", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: Clock },
  EM_ANDAMENTO: { label: "Em andamento", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300", icon: Clock },
  CONFIRMADO: { label: "Confirmado", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", icon: CheckCircle2 },
  PROBLEMA: { label: "Problema", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: XCircle },
  BLOQUEADO: { label: "Bloqueado", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300", icon: Shield },
  CANCELADO: { label: "Cancelado", color: "bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400", icon: XCircle },
};

// Using shared formatDateBR from @/lib/dateFormat

function getTimeRemaining(checkin: string | null): string {
  if (!checkin) return "—";
  const diff = new Date(checkin).getTime() - Date.now();
  if (diff <= 0) return "Já passou";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

export default function Lodging() {
  const [tasks, setTasks] = useState<LodgingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("14d");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMilestone, setFilterMilestone] = useState("all");
  const [tab, setTab] = useState<"active" | "history">("active");

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<LodgingTask | null>(null);
  const [confirmMethod, setConfirmMethod] = useState("");
  const [confirmNotes, setConfirmNotes] = useState("");

  // Problem dialog
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

    const enriched = tasksData.map(t => ({
      ...t,
      sale: salesMap.get(t.sale_id),
      passengers: paxBySale.get(t.sale_id) || [],
    }));

    setTasks(enriched);
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
    } finally {
      setGenerating(false);
    }
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

    if (tab === "active") {
      result = result.filter(t => !["CONFIRMADO", "CANCELADO"].includes(t.status));
    } else {
      result = result.filter(t => ["CONFIRMADO", "CANCELADO"].includes(t.status));
    }

    if (filterPeriod !== "all" && tab === "active") {
      const now = Date.now();
      const days = filterPeriod === "today" ? 1 : filterPeriod === "7d" ? 7 : 14;
      result = result.filter(t => {
        if (!t.hotel_checkin_datetime_utc) return true;
        const diff = new Date(t.hotel_checkin_datetime_utc).getTime() - now;
        return diff <= days * 24 * 60 * 60 * 1000;
      });
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
          t.sale?.destination_iata?.toLowerCase().includes(q) ||
          paxNames.includes(q)
        );
      });
    }

    return result;
  }, [tasks, tab, filterPeriod, filterStatus, filterMilestone, search]);

  const grouped = useMemo(() => {
    if (tab === "history") return { history: filtered };
    const h24 = filtered.filter(t => t.milestone === "H24");
    const d7 = filtered.filter(t => t.milestone === "D7");
    const d14 = filtered.filter(t => t.milestone === "D14");
    const bloqueado = filtered.filter(t => t.status === "BLOQUEADO");
    const problema = filtered.filter(t => t.status === "PROBLEMA");
    return { h24, d7, d14, bloqueado, problema };
  }, [filtered, tab]);

  const renderCard = (task: LodgingTask) => {
    const sale = task.sale;
    const milestoneCfg = MILESTONE_CONFIG[task.milestone] || MILESTONE_CONFIG.D14;
    const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDENTE;
    const StatusIcon = statusCfg.icon;

    return (
      <Card key={task.id} className="p-4 glass-card hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${milestoneCfg.color} text-[10px] gap-1`}>
              {milestoneCfg.label}
            </Badge>
            <Badge className={`${statusCfg.color} text-[10px] gap-1`}>
              <StatusIcon className="w-3 h-3" />
              {statusCfg.label}
            </Badge>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-bold text-foreground">
              {!["CONFIRMADO", "CANCELADO"].includes(task.status) ? getTimeRemaining(task.hotel_checkin_datetime_utc) : "✓"}
            </p>
            {!["CONFIRMADO", "CANCELADO"].includes(task.status) && (
              <p className="text-[10px] text-muted-foreground">para check-in</p>
            )}
          </div>
        </div>

        {/* Hotel info */}
        <div className="flex items-center gap-2 mb-2">
          <Hotel className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-semibold text-foreground">{task.hotel_name || "Hotel não informado"}</span>
        </div>

        <div className="text-xs text-muted-foreground mb-2 space-y-0.5">
          {task.hotel_checkin_datetime_utc && (
            <p>📅 Check-in: {formatDateBR(task.hotel_checkin_datetime_utc)}</p>
          )}
          {sale?.destination_iata && <p>📍 Destino: {sale.destination_iata}</p>}
          {task.hotel_reservation_code && (
            <p className="flex items-center gap-1">
              📋 Reserva: <span className="font-mono font-bold text-foreground">{task.hotel_reservation_code}</span>
              <button onClick={() => copyToClipboard(task.hotel_reservation_code!)} className="hover:text-primary">
                <Copy className="w-3 h-3" />
              </button>
            </p>
          )}
          {sale?.hotel_room && <p>🛏️ Quarto: {sale.hotel_room}</p>}
          {sale?.hotel_meal_plan && <p>🍽️ Alimentação: {sale.hotel_meal_plan}</p>}
        </div>

        {/* Passengers */}
        {task.passengers && task.passengers.length > 0 && (
          <div className="mb-3 space-y-1">
            {task.passengers.slice(0, 2).map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <User className="w-3 h-3 text-muted-foreground" />
                <span className="text-foreground">{p.full_name}</span>
                {p.phone && (
                  <button onClick={() => copyToClipboard(p.phone)} className="text-muted-foreground hover:text-primary">
                    <Phone className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {task.passengers.length > 2 && (
              <p className="text-[10px] text-muted-foreground">+{task.passengers.length - 2} hóspede(s)</p>
            )}
          </div>
        )}

        {/* Issue info */}
        {task.status === "PROBLEMA" && task.issue_type && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2 mb-3 text-[10px] text-red-700 dark:text-red-300">
            ⚠️ {task.issue_type}{task.issue_resolution && ` — ${task.issue_resolution}`}
          </div>
        )}

        {/* Contact method */}
        {task.contact_method && (
          <p className="text-[10px] text-muted-foreground mb-2">
            📞 Contato: {task.contact_method} {task.contact_details && `(${task.contact_details})`}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {!["CONFIRMADO", "CANCELADO"].includes(task.status) && (
            <>
              <Button size="sm" variant="default" className="text-[10px] h-7" onClick={() => {
                setConfirmDialog(task);
                setConfirmMethod("");
                setConfirmNotes(task.notes || "");
              }}>
                <CheckCircle2 className="w-3 h-3 mr-1" /> Confirmado
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
          {task.hotel_reservation_code && (
            <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => copyToClipboard(task.hotel_reservation_code!)}>
              <Copy className="w-3 h-3 mr-1" /> Reserva
            </Button>
          )}
          <Button size="sm" variant="ghost" className="text-[10px] h-7" onClick={() => navigate(`/sales/${task.sale_id}`)}>
            <Eye className="w-3 h-3 mr-1" /> Venda
          </Button>
        </div>
      </Card>
    );
  };

  const renderSection = (title: string, icon: any, items: LodgingTask[], color: string) => {
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
  const activeTasks = tasks.filter(t => !["CONFIRMADO", "CANCELADO"].includes(t.status));
  const kpis = [
    { label: "14 dias", value: activeTasks.filter(t => t.milestone === "D14").length, color: "text-emerald-600" },
    { label: "7 dias", value: activeTasks.filter(t => t.milestone === "D7").length, color: "text-amber-600" },
    { label: "24 horas", value: activeTasks.filter(t => t.milestone === "H24").length, color: "text-red-600" },
    { label: "Problemas", value: activeTasks.filter(t => t.status === "PROBLEMA").length, color: "text-red-600" },
    { label: "Bloqueados", value: activeTasks.filter(t => t.status === "BLOQUEADO").length, color: "text-gray-600" },
    { label: "Confirmados", value: tasks.filter(t => t.status === "CONFIRMADO").length, color: "text-emerald-600" },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif text-foreground flex items-center gap-2">
            <Hotel className="w-6 h-6" /> Confirmar Hospedagens
          </h1>
          <p className="text-sm text-muted-foreground">Confirmações de reserva de hotel</p>
        </div>
        <Button size="sm" onClick={handleGenerate} disabled={generating}>
          {generating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          Atualizar Tarefas
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
          <button onClick={() => setTab("active")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === "active" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
            Ativos
          </button>
          <button onClick={() => setTab("history")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === "history" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
            Histórico
          </button>
        </div>

        <div className="flex-1" />

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar hotel, hóspede, reserva..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs w-[220px]" />
        </div>

        {tab === "active" && (
          <>
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="7d">Próximos 7 dias</SelectItem>
                <SelectItem value="14d">Próximos 14 dias</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterMilestone} onValueChange={setFilterMilestone}>
              <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
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
          <Hotel className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            {tab === "active" ? "Nenhuma confirmação pendente" : "Nenhuma confirmação no histórico"}
          </p>
          {tab === "active" && (
            <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generating}>
              <RefreshCw className="w-3 h-3 mr-1" /> Gerar tarefas
            </Button>
          )}
        </Card>
      ) : tab === "active" ? (
        <div className="space-y-6">
          {renderSection("🔴 Confirmação 24h — CRÍTICO", AlertTriangle, (grouped as any).h24 || [], "text-red-600")}
          {renderSection("🟡 Confirmação 7 dias", AlertTriangle, (grouped as any).d7 || [], "text-amber-600")}
          {renderSection("🟢 Confirmação 14 dias", Clock, (grouped as any).d14 || [], "text-emerald-600")}
          {renderSection("⚠️ Problemas", XCircle, (grouped as any).problema || [], "text-red-600")}
          {renderSection("⚫ Bloqueados — dados faltando", Shield, (grouped as any).bloqueado || [], "text-gray-600")}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(renderCard)}
        </div>
      )}

      {/* Confirm Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Hospedagem</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
              <Textarea placeholder="Descreva o problema e o que será feito..." value={issueNotes} onChange={e => setIssueNotes(e.target.value)} rows={4} />
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
