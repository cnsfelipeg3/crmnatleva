import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { formatDateBR } from "@/lib/dateFormat";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  ClipboardCheck, Clock, AlertTriangle, CheckCircle2, Copy,
  ExternalLink, Eye, Plane, User, Upload, X, FileText,
  RefreshCw, Loader2, Shield, Calendar, List, LayoutGrid, Columns3,
  ArrowRight, Timer, Zap, Bell, AlertCircle, Lock, ChevronRight,
} from "lucide-react";
import AirlineLogo from "@/components/AirlineLogo";
import TaskCalendarView from "@/components/TaskCalendarView";
import { SmartFilters, useSmartFilters } from "@/components/smart-filters";
import type { SmartFilterConfig } from "@/components/smart-filters";

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

// ─── Status config with 6 levels (FAZER_CHECKIN added) ───
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; dot: string; bg: string; description: string }> = {
  CRITICO: {
    label: "Crítico",
    color: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-200",
    icon: AlertTriangle,
    dot: "bg-red-500",
    bg: "from-red-500/5 to-transparent",
    description: "Menos de 6h para o voo!",
  },
  URGENTE: {
    label: "Urgente",
    color: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200",
    icon: Clock,
    dot: "bg-orange-500",
    bg: "from-orange-500/5 to-transparent",
    description: "Menos de 24h — faça o check-in agora!",
  },
  FAZER_CHECKIN: {
    label: "Fazer Check-in",
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200",
    icon: AlertCircle,
    dot: "bg-amber-500",
    bg: "from-amber-500/5 to-transparent",
    description: "Check-in disponível — faltam menos de 2 dias",
  },
  PENDENTE: {
    label: "Pendente",
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200",
    icon: Clock,
    dot: "bg-blue-500",
    bg: "from-blue-500/5 to-transparent",
    description: "Aguardando — voo em mais de 2 dias",
  },
  BLOQUEADO: {
    label: "Bloqueado",
    color: "bg-muted text-muted-foreground border-border",
    icon: Lock,
    dot: "bg-muted-foreground/50",
    bg: "from-muted/50 to-transparent",
    description: "Aguardando trecho anterior",
  },
  CONCLUIDO: {
    label: "Concluído",
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200",
    icon: CheckCircle2,
    dot: "bg-emerald-500",
    bg: "from-emerald-500/5 to-transparent",
    description: "Check-in realizado",
  },
};

// ─── New 4-level dynamic status calculation ───
function computeStatus(departure: string | null): string {
  if (!departure) return "BLOQUEADO";
  const diffMs = new Date(departure).getTime() - Date.now();
  if (diffMs <= 0) return "CRITICO";
  const hours = diffMs / (1000 * 60 * 60);
  if (hours <= 6) return "CRITICO";
  if (hours <= 24) return "URGENTE";
  if (hours <= 48) return "FAZER_CHECKIN";
  return "PENDENTE";
}

// ─── Countdown in natural language ───
function formatCountdown(departureDateUtc: string | null): string {
  if (!departureDateUtc) return "—";
  const dep = new Date(departureDateUtc).getTime();
  if (isNaN(dep)) return "—";
  const diff = dep - Date.now();
  if (diff <= 0) return "Já partiu";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const days = Math.floor(hours / 24);

  if (days === 0) {
    if (hours === 0) return `Faltam ${minutes}min`;
    return `Faltam ${hours}h ${minutes}min`;
  }
  if (days === 1) return "Amanhã";
  if (days === 2) return "Faltam 2 dias ⚠️";
  return `Faltam ${days} dias`;
}

// ─── Flight date with weekday ───
function formatFlightDate(departureDateUtc: string | null): string {
  if (!departureDateUtc) return "Sem data";
  const date = new Date(departureDateUtc);
  if (isNaN(date.getTime())) return "Sem data";
  const diasSemana = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  const dia = date.getDate().toString().padStart(2, "0");
  const mes = (date.getMonth() + 1).toString().padStart(2, "0");
  const ano = date.getFullYear();
  const diaSemana = diasSemana[date.getDay()];
  return `${dia}/${mes}/${ano} (${diaSemana})`;
}

// ─── Short flight date for list view ───
function formatFlightDateShort(departureDateUtc: string | null): string {
  if (!departureDateUtc) return "—";
  const date = new Date(departureDateUtc);
  if (isNaN(date.getTime())) return "—";
  const diasSemana = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const dia = date.getDate().toString().padStart(2, "0");
  const mes = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${dia}/${mes} (${diasSemana[date.getDay()]})`;
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

const CHECKIN_FILTER_CONFIG: SmartFilterConfig = {
  sortOptions: [
    { key: "departure_datetime_utc", label: "Data do voo", type: "date" },
    { key: "priority_score", label: "Prioridade", type: "number" },
    { key: "status", label: "Status", type: "string" },
  ],
  defaultSortKey: "departure_datetime_utc",
  defaultSortDirection: "asc",
  dateField: "departure_datetime_utc",
  searchPlaceholder: "Buscar passageiro, PNR, destino...",
  searchFields: ["sale.name", "sale.display_id", "sale.origin_iata", "sale.destination_iata", "sale.locators", "segment.flight_number"],
  selectFilters: [
    { key: "status", label: "Status", options: ["PENDENTE", "FAZER_CHECKIN", "URGENTE", "CRITICO", "BLOQUEADO", "CONCLUIDO"] },
    { key: "direction", label: "Direção", options: ["ida", "volta"] },
  ],
  pillPresets: ["today", "tomorrow", "next_7_days", "next_30_days", "this_month", "all"],
};

export default function Checkin() {
  const [tasks, setTasks] = useState<CheckinTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [mainTab, setMainTab] = useState<"active" | "history">("active");
  const [viewMode, setViewMode] = useState<ViewMode>("agenda");
  const [completeDialog, setCompleteDialog] = useState<CheckinTask | null>(null);
  const [completeNotes, setCompleteNotes] = useState("");
  const [passengerSeats, setPassengerSeats] = useState<Record<string, string>>({});
  // Cartões pendentes de upload (novos): por passageiro, lista de {file, label, tempId}
  const [pendingPasses, setPendingPasses] = useState<Record<string, Array<{ tempId: string; file: File; label: string }>>>({});
  // Cartões já salvos (do banco): por passageiro
  const [existingPasses, setExistingPasses] = useState<Record<string, Array<{ id: string; file_url: string; file_name: string | null; label: string | null }>>>({});
  const [expandedPassengers, setExpandedPassengers] = useState<Set<string>>(new Set());
  const [savingCheckin, setSavingCheckin] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // refs por chave passenger.tempId — input file oculto
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
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

  const openCompleteDialog = async (task: CheckinTask) => {
    setCompleteDialog(task);
    setCompleteNotes(task.notes || "");
    const seats: Record<string, string> = {};
    const existing: Record<string, Array<{ id: string; file_url: string; file_name: string | null; label: string | null }>> = {};
    (task.passengers || []).forEach((p: any) => {
      seats[p.id] = "";
      existing[p.id] = [];
    });
    // Carrega seats da tabela legacy
    const { data: details } = await supabase
      .from("checkin_passenger_details")
      .select("*")
      .eq("checkin_task_id", task.id);
    if (details) {
      details.forEach((d: any) => {
        if (d.seat) seats[d.passenger_id] = d.seat;
        // Migra cartão único legado para a lista (mostra como já existente)
        if (d.boarding_pass_url) {
          existing[d.passenger_id] = existing[d.passenger_id] || [];
          existing[d.passenger_id].push({
            id: `legacy-${d.id}`,
            file_url: d.boarding_pass_url,
            file_name: d.boarding_pass_file_name,
            label: d.boarding_pass_file_name || "Cartão de embarque",
          });
        }
      });
    }
    // Carrega múltiplos cartões da nova tabela
    const { data: passes } = await (supabase as any)
      .from("checkin_boarding_passes")
      .select("id, passenger_id, file_url, file_name, label, display_order")
      .eq("checkin_task_id", task.id)
      .order("display_order", { ascending: true });
    if (passes) {
      passes.forEach((p: any) => {
        existing[p.passenger_id] = existing[p.passenger_id] || [];
        existing[p.passenger_id].push({
          id: p.id, file_url: p.file_url, file_name: p.file_name, label: p.label,
        });
      });
    }
    setPassengerSeats(seats);
    setPendingPasses({});
    setExistingPasses(existing);
  };

  const handleComplete = async () => {
    if (!completeDialog) return;
    setSavingCheckin(true);
    try {
      const task = completeDialog;
      const passengers = task.passengers || [];

      for (const pax of passengers) {
        // 1) Sobe novos cartões pendentes
        const pending = pendingPasses[pax.id] || [];
        for (let idx = 0; idx < pending.length; idx++) {
          const item = pending[idx];
          const ext = item.file.name.split(".").pop() || "pdf";
          const filePath = `${task.sale_id}/boarding_passes/${task.id}_${pax.id}_${Date.now()}_${idx}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("sale-attachments")
            .upload(filePath, item.file);
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage
            .from("sale-attachments")
            .getPublicUrl(filePath);
          await (supabase as any).from("checkin_boarding_passes").insert({
            checkin_task_id: task.id,
            passenger_id: pax.id,
            label: item.label?.trim() || item.file.name,
            file_url: urlData.publicUrl,
            file_name: item.file.name,
            file_size: item.file.size,
            mime_type: item.file.type,
            display_order: (existingPasses[pax.id]?.length || 0) + idx,
          });
        }

        // 2) Atualiza label de cartões existentes (não-legacy) que tiveram nome editado
        const existingList = existingPasses[pax.id] || [];
        for (const ep of existingList) {
          if (ep.id.startsWith("legacy-")) continue;
          await (supabase as any)
            .from("checkin_boarding_passes")
            .update({ label: ep.label })
            .eq("id", ep.id);
        }

        // 3) Mantém compatibilidade com tabela legacy (seat + 1º cartão)
        const firstPass = existingList[0] || (pending[0] ? { file_url: null, file_name: pending[0].file.name } : null);
        await supabase.from("checkin_passenger_details").upsert({
          checkin_task_id: task.id,
          passenger_id: pax.id,
          seat: passengerSeats[pax.id] || null,
          boarding_pass_url: firstPass?.file_url || null,
          boarding_pass_file_name: firstPass?.file_name || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "checkin_task_id,passenger_id" });
      }

      const allSeats = passengers
        .map((p: any) => passengerSeats[p.id])
        .filter(Boolean);

      await supabase.from("checkin_tasks").update({
        status: "CONCLUIDO",
        completed_at: new Date().toISOString(),
        completed_by_user_id: user?.id,
        seat_info: allSeats.join(", ") || null,
        notes: completeNotes || null,
      }).eq("id", task.id);

      toast({ title: "Check-in marcado como concluído!" });
      setCompleteDialog(null);
      setCompleteNotes("");
      setPassengerSeats({});
      setPendingPasses({});
      setExistingPasses({});
      await fetchTasks();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSavingCheckin(false);
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

  const airlines = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => {
      const airline = t.segment?.airline || t.sale?.airline || "";
      if (airline) set.add(airline);
    });
    return [...set].sort();
  }, [tasks]);

  const tabData = useMemo(() => {
    if (mainTab === "active") return tasks.filter(t => t.status !== "CONCLUIDO");
    return tasks.filter(t => t.status === "CONCLUIDO");
  }, [tasks, mainTab]);

  const { filtered, state: filterState, setState: setFilterState, activeFilterCount, clearAll: clearFilters } = useSmartFilters(tabData, CHECKIN_FILTER_CONFIG);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, { label: string; tasks: CheckinTask[] }>();
    filtered.forEach(t => {
      const isVolta = t.direction === "volta";
      const depDate = t.segment?.departure_date || (isVolta ? t.sale?.return_date : t.sale?.departure_date) || t.departure_datetime_utc;
      const key = getDateKey(depDate);
      const label = getDateLabel(depDate);
      if (!groups.has(key)) groups.set(key, { label, tasks: [] });
      groups.get(key)!.tasks.push(t);
    });
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const pipelineCols = useMemo(() => {
    const cols = {
      CRITICO: [] as CheckinTask[],
      URGENTE: [] as CheckinTask[],
      FAZER_CHECKIN: [] as CheckinTask[],
      PENDENTE: [] as CheckinTask[],
      CONCLUIDO: [] as CheckinTask[],
    };
    filtered.forEach(t => {
      const status = t.status === "CONCLUIDO" ? "CONCLUIDO" : (t.status === "BLOQUEADO" ? "PENDENTE" : computeStatus(t.departure_datetime_utc));
      if (cols[status as keyof typeof cols]) cols[status as keyof typeof cols].push(t);
    });
    return cols;
  }, [filtered]);

  // ─── KPIs ───
  const activeTasks = tasks.filter(t => t.status !== "CONCLUIDO");
  const todayTasks = activeTasks.filter(t => {
    const isVolta = t.direction === "volta";
    const dep = t.segment?.departure_date || (isVolta ? t.sale?.return_date : t.sale?.departure_date) || t.departure_datetime_utc;
    return dep && getDateLabel(dep) === "Hoje";
  });
  const tomorrowTasks = activeTasks.filter(t => {
    const isVolta = t.direction === "volta";
    const dep = t.segment?.departure_date || (isVolta ? t.sale?.return_date : t.sale?.departure_date) || t.departure_datetime_utc;
    return dep && getDateLabel(dep) === "Amanhã";
  });
  const overdueTasks = activeTasks.filter(t => {
    const isVolta = t.direction === "volta";
    const dep = t.segment?.departure_date || (isVolta ? t.sale?.return_date : t.sale?.departure_date) || t.departure_datetime_utc;
    return dep && getDateLabel(dep) === "Atrasado";
  });

  // ─── Tasks needing action (≤48h) ───
  const tasksNeedingAction = useMemo(() => {
    return activeTasks.filter(t => {
      if (t.status === "BLOQUEADO") return false;
      const status = computeStatus(t.departure_datetime_utc);
      return ["FAZER_CHECKIN", "URGENTE", "CRITICO"].includes(status);
    });
  }, [activeTasks]);

  const getTaskDetails = (task: CheckinTask) => {
    const sale = task.sale;
    const segment = task.segment;
    const isVolta = task.direction === "volta";
    const airline = segment?.airline || sale?.airline || "";
    const flightNum = segment?.flight_number || "";
    const origin = segment?.origin_iata || (isVolta ? sale?.destination_iata : sale?.origin_iata) || "N/D";
    const dest = segment?.destination_iata || (isVolta ? sale?.origin_iata : sale?.destination_iata) || "N/D";
    const depDate = segment?.departure_date || (isVolta ? sale?.return_date : sale?.departure_date) || "";
    const depTime = segment?.departure_time || "";
    const locators = sale?.locators?.filter(Boolean) || [];
    const checkinUrl = task.airline_rule?.checkin_url;
    const cabinType = segment?.cabin_type || segment?.flight_class || "";
    const paxNames = task.passengers?.map((p: any) => p.full_name) || [];
    // Dynamic status: only for PENDENTE in DB; CONCLUIDO and BLOQUEADO stay as-is
    const statusKey = task.status === "CONCLUIDO" ? "CONCLUIDO" : (task.status === "BLOQUEADO" ? "BLOQUEADO" : computeStatus(task.departure_datetime_utc));
    const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.PENDENTE;
    return { sale, segment, airline, flightNum, origin, dest, depDate, depTime, locators, checkinUrl, cabinType, paxNames, statusKey, statusCfg };
  };

  // ─── Agenda Row (List View) ───
  const renderAgendaRow = (task: CheckinTask) => {
    const { airline, flightNum, origin, dest, depDate, depTime, locators, checkinUrl, paxNames, statusCfg, statusKey } = getTaskDetails(task);
    const StatusIcon = statusCfg.icon;
    const isSelected = selected.has(task.id);
    const isFazerCheckin = statusKey === "FAZER_CHECKIN";
    const isCritical = statusKey === "CRITICO";
    const isUrgent = statusKey === "URGENTE";

    return (
      <div
        key={task.id}
        className={`flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-b-0 hover:bg-muted/30 transition-colors group ${
          isCritical ? "bg-gradient-to-r from-red-500/5 to-transparent" :
          isUrgent ? "bg-gradient-to-r from-orange-500/5 to-transparent" :
          isFazerCheckin ? "bg-gradient-to-r from-amber-500/5 to-transparent" : ""
        }`}
      >
        {mainTab === "active" && (
          <Checkbox checked={isSelected} onCheckedChange={() => toggleSelected(task.id)} className="shrink-0" />
        )}

        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusCfg.dot} ${isCritical ? "animate-pulse" : ""}`} />

        {/* Status badge */}
        <div className="w-28 shrink-0">
          <Badge variant="outline" className={`${statusCfg.color} text-[9px] gap-0.5 whitespace-nowrap`}>
            <StatusIcon className="w-3 h-3" /> {statusCfg.label}
          </Badge>
        </div>

        {/* Route + Airline */}
        <div className="flex items-center gap-2 w-40 shrink-0">
          {airline ? <AirlineLogo iata={airline} size={22} /> : <Plane className="w-4 h-4 text-muted-foreground" />}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1">
              {origin} <ArrowRight className="w-3 h-3 text-muted-foreground" /> {dest}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">{airline} {flightNum}</p>
          </div>
        </div>

        {/* Flight date */}
        <div className="w-28 shrink-0 text-center">
          <span className="text-xs font-medium text-foreground flex items-center gap-1 justify-center">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            {formatFlightDateShort(task.departure_datetime_utc || depDate)}
          </span>
          {depTime && <span className="text-[10px] font-mono text-muted-foreground">{depTime.slice(0, 5)}</span>}
        </div>

        {/* Countdown */}
        <div className="w-28 shrink-0 text-center">
          <span className={`text-xs font-bold whitespace-nowrap flex items-center gap-1 justify-center ${
            isCritical ? "text-red-600" : isUrgent ? "text-orange-600" : isFazerCheckin ? "text-amber-600" : "text-muted-foreground"
          }`}>
            <Timer className="w-3 h-3" />
            {task.status !== "CONCLUIDO" ? formatCountdown(task.departure_datetime_utc) : "✓"}
          </span>
        </div>

        <Badge variant="outline" className="text-[9px] uppercase shrink-0 h-5">{task.direction}</Badge>

        {/* Passengers */}
        <div className="flex-1 min-w-0 hidden md:block">
          <p className="text-xs text-muted-foreground truncate" title={paxNames.join(", ")}>
            <User className="w-3 h-3 inline mr-1" />{paxNames.join(", ") || "—"}
          </p>
        </div>

        {/* Locator */}
        <div className="w-24 shrink-0 hidden lg:block">
          {locators.length > 0 ? (
            <button onClick={() => copyToClipboard(locators[0])} className="flex items-center gap-1 text-xs font-mono text-foreground hover:text-primary transition-colors">
              {locators[0]} <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />
            </button>
          ) : (
            <span className="text-xs text-muted-foreground/50">—</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
          {task.status !== "CONCLUIDO" && (
            <Button size="sm" variant="default" className="text-[10px] h-6 px-2" onClick={() => openCompleteDialog(task)}>
              <CheckCircle2 className="w-3 h-3" />
            </Button>
          )}
          {checkinUrl && task.status !== "CONCLUIDO" && (
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

  // ─── Card View ───
  const renderCard = (task: CheckinTask) => {
    const { airline, flightNum, origin, dest, depDate, depTime, locators, checkinUrl, cabinType, paxNames, statusCfg, statusKey } = getTaskDetails(task);
    const StatusIcon = statusCfg.icon;
    const isSelected = selected.has(task.id);
    const isFazerCheckin = statusKey === "FAZER_CHECKIN";
    const isCritical = statusKey === "CRITICO";
    const isUrgent = statusKey === "URGENTE";

    const barColor = isCritical ? "bg-red-500" : isUrgent ? "bg-orange-500" : isFazerCheckin ? "bg-amber-500" : statusKey === "CONCLUIDO" ? "bg-emerald-500" : "bg-blue-500";

    return (
      <Card key={task.id} className={`p-0 overflow-hidden hover:shadow-lg transition-all ${
        isCritical ? "ring-1 ring-red-500/30" :
        isUrgent ? "ring-1 ring-orange-500/30" :
        isFazerCheckin ? "ring-1 ring-amber-500/30" : ""
      }`}>
        {/* Top color bar */}
        <div className={`h-1.5 ${barColor}`} />

        <div className="p-4 space-y-3">
          {/* Header: Status + Countdown */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {mainTab === "active" && <Checkbox checked={isSelected} onCheckedChange={() => toggleSelected(task.id)} />}
              <Badge variant="outline" className={`${statusCfg.color} text-[10px] gap-1`}>
                <StatusIcon className="w-3 h-3" /> {statusCfg.label}
              </Badge>
              <Badge variant="outline" className="text-[10px] uppercase">{task.direction}</Badge>
            </div>
            <div className="text-right">
              <span className={`text-xs font-bold whitespace-nowrap flex items-center gap-1 ${
                isCritical ? "text-red-600" : isUrgent ? "text-orange-600" : isFazerCheckin ? "text-amber-600" : "text-muted-foreground"
              }`}>
                <Timer className="w-3 h-3" />
                {task.status !== "CONCLUIDO" ? formatCountdown(task.departure_datetime_utc) : "✓"}
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

          {/* Flight date — ALWAYS visible and prominent */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span className="flex items-center gap-1 font-medium text-foreground">
              📅 Voo em {formatFlightDate(task.departure_datetime_utc || depDate)}
            </span>
            {depTime && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" /> {depTime.slice(0, 5)}
              </span>
            )}
          </div>

          {/* Locators */}
          {locators.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase text-muted-foreground font-semibold">🔖 PNR</span>
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
              <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1" onClick={() => openCompleteDialog(task)}>
                <CheckCircle2 className="w-3 h-3" /> Concluir
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-[10px] h-7 gap-1" onClick={() => navigate(`/sales/${task.sale_id}`)}>
              <Eye className="w-3 h-3" /> Venda
            </Button>
          </div>

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

      {/* ─── Alert Banner ─── */}
      {tasksNeedingAction.length > 0 && mainTab === "active" && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-3 flex items-center gap-3">
          <Bell className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              ⚠️ {tasksNeedingAction.length} check-in(s) precisam de atenção!
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Faça o check-in dos seus clientes com antecedência de 1-2 dias antes do voo.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className={`p-4 cursor-pointer transition-all hover:scale-[1.02] border-2 ${overdueTasks.length > 0 ? "border-destructive/50 bg-destructive/5" : "border-transparent"}`}
          onClick={() => { clearFilters(); setMainTab("active"); }}>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-3 h-3 rounded-full bg-destructive ${overdueTasks.length > 0 ? "animate-pulse" : ""}`} />
            <span className="text-xs font-medium text-muted-foreground">Atrasados</span>
          </div>
          <p className="text-2xl font-bold text-destructive">{overdueTasks.length}</p>
        </Card>
        <Card className={`p-4 cursor-pointer transition-all hover:scale-[1.02] border-2 ${todayTasks.length > 0 ? "border-primary/50 bg-primary/5" : "border-transparent"}`}
          onClick={() => { setFilterState(prev => ({ ...prev, dateFilter: { ...prev.dateFilter, field: "departure_datetime_utc", preset: "today" } })); setMainTab("active"); }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-xs font-medium text-muted-foreground">Hoje</span>
          </div>
          <p className="text-2xl font-bold text-primary">{todayTasks.length}</p>
        </Card>
        <Card className="p-4 cursor-pointer transition-all hover:scale-[1.02]"
          onClick={() => { setFilterState(prev => ({ ...prev, dateFilter: { ...prev.dateFilter, field: "departure_datetime_utc", preset: "tomorrow" } })); setMainTab("active"); }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span className="text-xs font-medium text-muted-foreground">Amanhã</span>
          </div>
          <p className="text-2xl font-bold text-warning">{tomorrowTasks.length}</p>
        </Card>
        <Card className="p-4 cursor-pointer transition-all hover:scale-[1.02]"
          onClick={() => { setMainTab("history"); clearFilters(); }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-eucalyptus" />
            <span className="text-xs font-medium text-muted-foreground">Concluídos</span>
          </div>
          <p className="text-2xl font-bold text-eucalyptus">{tasks.filter(t => t.status === "CONCLUIDO").length}</p>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-1 bg-muted rounded-lg p-0.5">
            <button
              onClick={() => { setMainTab("active"); clearFilters(); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mainTab === "active" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Ativos ({activeTasks.length})
            </button>
            <button
              onClick={() => { setMainTab("history"); clearFilters(); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mainTab === "history" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Histórico
            </button>
          </div>

          <div className="flex-1" />

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

        <SmartFilters
          config={CHECKIN_FILTER_CONFIG}
          state={filterState}
          setState={setFilterState}
          activeFilterCount={activeFilterCount}
          clearAll={clearFilters}
          dynamicOptions={{ "segment.airline": airlines }}
        />
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
          {renderPipelineCol("Crítico", "CRITICO", pipelineCols.CRITICO)}
          {renderPipelineCol("Urgente", "URGENTE", pipelineCols.URGENTE)}
          {renderPipelineCol("Fazer Check-in", "FAZER_CHECKIN", pipelineCols.FAZER_CHECKIN)}
          {renderPipelineCol("Pendente", "PENDENTE", pipelineCols.PENDENTE)}
          {renderPipelineCol("Concluído", "CONCLUIDO", pipelineCols.CONCLUIDO)}
        </div>
      ) : viewMode === "calendar" ? (
        <TaskCalendarView
          tasks={filtered.map(t => {
            const d = getTaskDetails(t);
            const depDate = d.depDate || t.departure_datetime_utc;
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
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Confirmar Check-in
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {completeDialog && (() => {
              const d = getTaskDetails(completeDialog);
              const passengers = completeDialog.passengers || [];
              return (
                <>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-1">
                    <div className="flex items-center gap-3">
                      {d.airline && <AirlineLogo iata={d.airline} size={28} />}
                      <div>
                        <p className="font-bold text-foreground flex items-center gap-1">
                          {d.origin} <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" /> {d.dest}
                        </p>
                        <p className="text-xs text-muted-foreground">{d.airline} {d.flightNum} {d.depDate ? `• ${formatDateBR(d.depDate)}` : ""} {d.depTime ? `às ${d.depTime.slice(0, 5)}` : ""}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Passageiros</Label>
                    {passengers.length === 0 ? (
                      <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-4 text-center">
                        Nenhum passageiro cadastrado para esta venda. Cadastre os passageiros primeiro.
                      </div>
                    ) : (
                      <table className="w-full border border-border/30 rounded-lg overflow-hidden">
                        <thead>
                          <tr className="bg-muted/40 border-b border-border/30">
                            <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-2">Passageiro</th>
                            <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2 w-[100px]">Assento</th>
                            <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2">Cartão de Embarque</th>
                          </tr>
                        </thead>
                        <tbody>
                        {passengers.map((pax: any, idx: number) => {
                          const isExpanded = expandedPassengers.has(pax.id);
                          const hasDetails = pax.birth_date || pax.cpf || pax.rg || pax.passport_number || pax.passport_expiry;
                          return (
                          <React.Fragment key={pax.id}>
                          <tr className={idx < passengers.length - 1 && !isExpanded ? "border-b border-border/20" : ""}>
                            <td className="px-4 py-3 align-middle">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setExpandedPassengers(prev => {
                                    const next = new Set(prev);
                                    next.has(pax.id) ? next.delete(pax.id) : next.add(pax.id);
                                    return next;
                                  })}
                                  className="p-0.5 hover:bg-muted rounded transition-colors shrink-0"
                                  title="Ver dados do passageiro"
                                >
                                  <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                </button>
                                <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="text-sm font-medium text-foreground break-words">{pax.full_name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 align-middle w-[100px]">
                              <Input
                                placeholder="Ex: 12A"
                                className="h-8 text-xs"
                                value={passengerSeats[pax.id] || ""}
                                onChange={e => setPassengerSeats(prev => ({ ...prev, [pax.id]: e.target.value }))}
                              />
                            </td>
                            <td className="px-3 py-3 align-middle">
                              {passengerFiles[pax.id] ? (
                                <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-md px-2 py-1.5">
                                  <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span className="truncate flex-1 text-foreground">{passengerFiles[pax.id]!.name}</span>
                                  <button onClick={() => setPassengerFiles(prev => ({ ...prev, [pax.id]: null }))} className="text-muted-foreground hover:text-destructive shrink-0">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : passengerExisting[pax.id]?.boarding_pass_url ? (
                                <div className="flex items-center gap-2 text-xs bg-emerald-500/10 rounded-md px-2 py-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <a href={passengerExisting[pax.id].boarding_pass_url} target="_blank" rel="noreferrer" className="truncate flex-1 text-foreground hover:underline">
                                    {passengerExisting[pax.id].boarding_pass_file_name || "Cartão"}
                                  </a>
                                  <button onClick={() => {
                                    setPassengerExisting(prev => {
                                      const next = { ...prev };
                                      delete next[pax.id];
                                      return next;
                                    });
                                  }} className="text-muted-foreground hover:text-destructive shrink-0">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => fileInputRefs.current[pax.id]?.click()}
                                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border/50 rounded-md px-3 py-1.5 w-full transition-colors hover:border-primary/40 hover:bg-primary/5"
                                >
                                  <Upload className="w-3.5 h-3.5" /> Upload
                                </button>
                              )}
                              <input
                                ref={el => { fileInputRefs.current[pax.id] = el; }}
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg"
                                className="hidden"
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 10 * 1024 * 1024) {
                                      toast({ title: "Arquivo muito grande", description: "Máximo 10MB", variant: "destructive" });
                                      return;
                                    }
                                    setPassengerFiles(prev => ({ ...prev, [pax.id]: file }));
                                  }
                                  e.target.value = "";
                                }}
                              />
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className={idx < passengers.length - 1 ? "border-b border-border/20" : ""}>
                              <td colSpan={3} className="px-4 pb-3 pt-0">
                                <div className="ml-6 py-2.5 px-4 bg-muted/30 rounded-md border border-border/30">
                                  {hasDetails ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                      {pax.birth_date && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground text-xs">📅 Data de Nascimento:</span>
                                          <span className="font-medium text-xs">{formatDateBR(pax.birth_date)}</span>
                                        </div>
                                      )}
                                      {pax.cpf && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground text-xs">🪪 CPF:</span>
                                          <span className="font-medium text-xs">{pax.cpf}</span>
                                        </div>
                                      )}
                                      {pax.rg && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground text-xs">🪪 RG:</span>
                                          <span className="font-medium text-xs">{pax.rg}</span>
                                        </div>
                                      )}
                                      {pax.passport_number && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground text-xs">🛂 Passaporte:</span>
                                          <span className="font-medium text-xs">{pax.passport_number}</span>
                                        </div>
                                      )}
                                      {pax.passport_expiry && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground text-xs">📅 Venc. Passaporte:</span>
                                          <span className="font-medium text-xs">{formatDateBR(pax.passport_expiry)}</span>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground italic">Nenhum dado cadastrado para este passageiro.</p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                          </React.Fragment>
                          );
                        })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Observações</Label>
                    <Textarea placeholder="Notas sobre o check-in..." value={completeNotes} onChange={e => setCompleteNotes(e.target.value)} rows={2} />
                  </div>
                </>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialog(null)}>Cancelar</Button>
            <Button onClick={handleComplete} disabled={savingCheckin} className="gap-1">
              {savingCheckin ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirmar Concluído
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
