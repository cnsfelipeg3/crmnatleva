import { useState, useEffect, useMemo } from "react";
import { fetchAllRows } from "@/lib/fetchAll";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { iataToLabel, iataToCityName } from "@/lib/iataUtils";
import { formatDateBR } from "@/lib/dateFormat";
import { useNavigate } from "react-router-dom";
import RoutesMap from "@/components/RoutesMap";
import {
  Plane, Globe, AlertTriangle, Users, DollarSign, MapPin,
  Clock, Shield, Eye, ExternalLink, Radio, Zap, Info, ChevronRight,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Sale {
  id: string; name: string; display_id: string; status: string;
  origin_iata: string | null; destination_iata: string | null;
  departure_date: string | null; return_date: string | null;
  received_value: number; total_cost: number; margin: number;
  seller_id: string | null; client_id: string | null;
  hotel_name: string | null; airline: string | null;
  adults: number; children: number; locators: string[];
  is_international: boolean | null;
}
interface Profile { id: string; full_name: string; }
interface Segment { sale_id: string; origin_iata: string; destination_iata: string; }

type TripStatus = "em_viagem" | "proxima" | "embarque_amanha" | "retorno_hoje" | "futura" | "finalizada" | "erro_data" | "sem_data";

function getTripStatus(dep: string | null, ret: string | null): TripStatus {
  // No departure date at all
  if (!dep) return "sem_data";

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
  const depDate = dep.slice(0, 10);
  const retDate = ret?.slice(0, 10);

  // Return date before departure = treat as past trip (data was likely entered wrong)
  if (retDate && retDate < depDate) return "finalizada";

  // WITH return date: standard logic
  if (retDate) {
    if (retDate < today) return "finalizada";
    if (retDate === today) return "retorno_hoje";
    if (depDate <= today) return "em_viagem";
    if (depDate === tomorrow) return "embarque_amanha";
    const in7days = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
    if (depDate <= in7days) return "proxima";
    return "futura";
  }

  // WITHOUT return date: 30-day rule
  const depTime = new Date(depDate).getTime();
  const diffDays = Math.floor((now.getTime() - depTime) / 86400000);

  if (diffDays > 30) return "finalizada"; // Auto-close after 30 days
  if (diffDays >= 0 && diffDays <= 30) {
    if (depDate === today) return "em_viagem";
    if (diffDays > 0) return "em_viagem";
  }
  if (depDate > today) {
    if (depDate === tomorrow) return "embarque_amanha";
    const in7days = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
    if (depDate <= in7days) return "proxima";
    return "futura";
  }

  return "em_viagem";
}

function getDaysSinceDeparture(dep: string | null): number | null {
  if (!dep) return null;
  return Math.floor((Date.now() - new Date(dep.slice(0, 10)).getTime()) / 86400000);
}

const STATUS_CONFIG: Record<TripStatus, { label: string; color: string; icon: typeof Plane }> = {
  em_viagem: { label: "Em Viagem", color: "bg-green-500/15 text-green-400 border-green-500/30", icon: Plane },
  proxima: { label: "Próxima", color: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: Clock },
  embarque_amanha: { label: "Amanhã", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", icon: AlertTriangle },
  retorno_hoje: { label: "Retorna Hoje", color: "bg-orange-500/15 text-orange-400 border-orange-500/30", icon: MapPin },
  futura: { label: "Futura", color: "bg-muted text-muted-foreground border-border", icon: Globe },
  finalizada: { label: "Finalizada", color: "bg-muted/50 text-muted-foreground/50 border-border/50", icon: Shield },
  erro_data: { label: "Erro de Data", color: "bg-red-500/15 text-red-400 border-red-500/30", icon: AlertTriangle },
  sem_data: { label: "Sem Data", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", icon: Info },
};

type FilterMode = "all" | "em_viagem" | "48h" | "7d" | "critico" | "sem_data";

export default function Viagens() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      fetchAllRows("sales", "*", { order: { column: "departure_date", ascending: true } }),
      fetchAllRows("profiles", "id, full_name"),
      fetchAllRows("flight_segments", "sale_id, origin_iata, destination_iata"),
    ]).then(([s, p, seg]) => {
      setSales(s as Sale[]);
      setProfiles(p as Profile[]);
      setSegments(seg as Segment[]);
      setLoading(false);
    });
  }, []);

  const sellerNames = useMemo(() => {
    const m: Record<string, string> = {};
    profiles.forEach(p => (m[p.id] = p.full_name));
    return m;
  }, [profiles]);

  const tripsWithStatus = useMemo(() => {
    return sales.map(s => ({
      ...s,
      tripStatus: getTripStatus(s.departure_date, s.return_date),
      daysSinceDep: getDaysSinceDeparture(s.departure_date),
    }));
  }, [sales]);

  // Status correction log
  const correctionLog = useMemo(() => {
    const autoFinalized = tripsWithStatus.filter(t => t.tripStatus === "finalizada" && !t.return_date && (t.daysSinceDep ?? 0) > 30);
    const noDate = tripsWithStatus.filter(t => t.tripStatus === "sem_data");
    const dateErrors = tripsWithStatus.filter(t => t.tripStatus === "erro_data");
    return { autoFinalized: autoFinalized.length, noDate: noDate.length, dateErrors: dateErrors.length };
  }, [tripsWithStatus]);

  const filtered = useMemo(() => {
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 3600000).toISOString().slice(0, 10);
    const in7d = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
    const today = now.toISOString().slice(0, 10);

    let base = tripsWithStatus;

    switch (filterMode) {
      case "em_viagem": return base.filter(t => t.tripStatus === "em_viagem");
      case "48h": return base.filter(t => t.departure_date && t.departure_date.slice(0, 10) <= in48h && t.departure_date.slice(0, 10) >= today);
      case "7d": return base.filter(t => t.departure_date && t.departure_date.slice(0, 10) <= in7d && t.departure_date.slice(0, 10) >= today);
      case "critico": return base.filter(t => ["em_viagem", "embarque_amanha", "retorno_hoje", "erro_data"].includes(t.tripStatus));
      case "sem_data": return base.filter(t => t.tripStatus === "sem_data" || t.tripStatus === "erro_data");
      default:
        // "all" hides finalized by default
        return base.filter(t => t.tripStatus !== "finalizada");
    }
  }, [tripsWithStatus, filterMode]);

  // KPIs
  const kpis = useMemo(() => {
    const active = tripsWithStatus.filter(t => t.tripStatus === "em_viagem");
    const next7d = tripsWithStatus.filter(t => ["proxima", "embarque_amanha"].includes(t.tripStatus));
    const countries = new Set(active.map(t => t.destination_iata).filter(Boolean));
    const activeRevenue = active.reduce((s, v) => s + (v.received_value || 0), 0);
    const returningToday = tripsWithStatus.filter(t => t.tripStatus === "retorno_hoje");
    const pax = active.reduce((s, v) => s + (v.adults || 0) + (v.children || 0), 0);
    return { emViagem: active.length, next7d: next7d.length, countries: countries.size, activeRevenue, returningToday: returningToday.length, pax };
  }, [tripsWithStatus]);

  // Routes for map
  const routes = useMemo(() => {
    const active = filtered.filter(t => !["finalizada", "sem_data", "erro_data"].includes(t.tripStatus) && t.origin_iata && t.destination_iata);
    const map: Record<string, { origin: string; destination: string; count: number; revenue: number }> = {};
    active.forEach(s => {
      const key = `${s.origin_iata}-${s.destination_iata}`;
      if (!map[key]) map[key] = { origin: s.origin_iata!, destination: s.destination_iata!, count: 0, revenue: 0 };
      map[key].count++;
      map[key].revenue += s.received_value || 0;
    });
    return Object.values(map);
  }, [filtered]);

  // Alerts
  const alerts = useMemo(() => {
    const items: { icon: typeof AlertTriangle; text: string; severity: "red" | "yellow" | "blue"; filterFn: (t: typeof tripsWithStatus[0]) => boolean }[] = [];
    const embarqueAmanha = tripsWithStatus.filter(t => t.tripStatus === "embarque_amanha");
    if (embarqueAmanha.length > 0) items.push({ icon: AlertTriangle, text: `${embarqueAmanha.length} cliente(s) embarca(m) amanhã`, severity: "yellow", filterFn: t => t.tripStatus === "embarque_amanha" });
    const retornoHoje = tripsWithStatus.filter(t => t.tripStatus === "retorno_hoje");
    if (retornoHoje.length > 0) items.push({ icon: MapPin, text: `${retornoHoje.length} cliente(s) retorna(m) hoje`, severity: "blue", filterFn: t => t.tripStatus === "retorno_hoje" });
    const highValue = tripsWithStatus.filter(t => t.tripStatus === "em_viagem" && t.received_value >= 50000);
    if (highValue.length > 0) items.push({ icon: DollarSign, text: `${highValue.length} viagem(s) acima de R$ 50k ativa(s)`, severity: "red", filterFn: t => t.tripStatus === "em_viagem" && t.received_value >= 50000 });
    const intl = tripsWithStatus.filter(t => t.tripStatus === "em_viagem" && t.is_international);
    if (intl.length > 0) items.push({ icon: Globe, text: `${intl.length} viagem(s) internacional(is) em andamento`, severity: "blue", filterFn: t => t.tripStatus === "em_viagem" && !!t.is_international });
    if (correctionLog.autoFinalized > 0) items.push({ icon: Shield, text: `${correctionLog.autoFinalized} viagem(s) encerrada(s) automaticamente (>30 dias sem retorno)`, severity: "yellow", filterFn: t => t.tripStatus === "finalizada" && !t.return_date && (t.daysSinceDep ?? 0) > 30 });
    if (correctionLog.noDate > 0) items.push({ icon: Info, text: `${correctionLog.noDate} venda(s) sem data de embarque`, severity: "yellow", filterFn: t => t.tripStatus === "sem_data" });
    if (correctionLog.dateErrors > 0) items.push({ icon: AlertTriangle, text: `${correctionLog.dateErrors} venda(s) com erro de data (retorno < ida)`, severity: "red", filterFn: t => t.tripStatus === "erro_data" });
    return items;
  }, [tripsWithStatus, correctionLog]);

  // Alert drill-down state
  const [alertDrilldown, setAlertDrilldown] = useState<{ title: string; trips: typeof tripsWithStatus } | null>(null);

  const daysUntil = (dateStr: string | null) => {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  };

  if (loading) return (
    <div className="p-4 md:p-6 space-y-4">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Radio className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">Torre de Controle</h1>
            <p className="text-[10px] text-muted-foreground font-mono tracking-wider">MONITORAMENTO EM TEMPO REAL • REGRA 30 DIAS ATIVA</p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {([
            ["all", "Ativas"], ["em_viagem", "🟢 Em Viagem"], ["48h", "⚡ 48h"],
            ["7d", "📅 7 dias"], ["critico", "🔴 Crítico"], ["sem_data", "⚠️ Pendências"],
          ] as [FilterMode, string][]).map(([key, label]) => (
            <Button
              key={key}
              variant={filterMode === key ? "default" : "outline"}
              size="sm"
              className="text-xs h-7"
              onClick={() => setFilterMode(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          { label: "Em Viagem", value: kpis.emViagem, icon: Plane, color: "text-green-400", filter: "em_viagem" as FilterMode },
          { label: "Próx. 7 dias", value: kpis.next7d, icon: Clock, color: "text-blue-400", filter: "7d" as FilterMode },
          { label: "Países Ativos", value: kpis.countries, icon: Globe, color: "text-accent", filter: "em_viagem" as FilterMode },
          { label: "Receita Ativa", value: fmt(kpis.activeRevenue), icon: DollarSign, color: "text-success", filter: "em_viagem" as FilterMode },
          { label: "Retornam Hoje", value: kpis.returningToday, icon: MapPin, color: "text-orange-400", filter: "critico" as FilterMode },
          { label: "Passageiros Fora", value: kpis.pax, icon: Users, color: "text-info", filter: "em_viagem" as FilterMode },
        ].map(k => (
          <Card key={k.label} className="p-3 glass-card cursor-pointer hover:ring-1 hover:ring-accent/30 transition-all"
            onClick={() => setFilterMode(k.filter)}>
            <div className="flex items-center gap-1.5 mb-1">
              <k.icon className={`w-3.5 h-3.5 ${k.color}`} />
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{k.label}</span>
            </div>
            <p className="text-lg font-bold text-foreground">{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Alerts + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="p-4 glass-card lg:col-span-1">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" /> Alertas
          </h3>
          <div className="space-y-2">
            {alerts.length === 0 && <p className="text-xs text-muted-foreground">Nenhum alerta ✅</p>}
            {alerts.map((a, i) => (
              <button key={i} onClick={() => setAlertDrilldown({ title: a.text, trips: tripsWithStatus.filter(a.filterFn) })}
                className={`flex items-start gap-2 p-2 rounded-lg border w-full text-left cursor-pointer transition-all hover:scale-[1.01] hover:shadow-sm ${
                  a.severity === "red" ? "bg-red-500/5 border-red-500/20 hover:bg-red-500/10" :
                  a.severity === "yellow" ? "bg-yellow-500/5 border-yellow-500/20 hover:bg-yellow-500/10" :
                  "bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10"
                }`}>
                <a.icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                  a.severity === "red" ? "text-red-400" : a.severity === "yellow" ? "text-yellow-400" : "text-blue-400"
                }`} />
                <span className="text-[11px] text-foreground">{a.text}</span>
                <ChevronRight className="w-3 h-3 mt-0.5 ml-auto shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </Card>

        <Card className="glass-card lg:col-span-3 overflow-hidden">
          <div className="p-3 pb-0">
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" /> Radar de Viagens
            </h3>
          </div>
          <RoutesMap routes={routes} height="340px" />
        </Card>
      </div>

      {/* Flight Board */}
      <Card className="p-4 glass-card">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Plane className="w-4 h-4 text-accent" /> Monitor de Voos
          <Badge variant="outline" className="text-[10px] ml-auto">{filtered.length} viagens</Badge>
        </h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Cliente</TableHead>
                <TableHead className="text-xs">Destino</TableHead>
                <TableHead className="text-xs">Embarque</TableHead>
                <TableHead className="text-xs">Retorno</TableHead>
                <TableHead className="text-xs text-center">Dias</TableHead>
                <TableHead className="text-xs text-right">Valor</TableHead>
                <TableHead className="text-xs">Vendedor</TableHead>
                <TableHead className="text-xs w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 80).map(trip => {
                const cfg = STATUS_CONFIG[trip.tripStatus];
                const days = daysUntil(trip.tripStatus === "em_viagem" ? trip.return_date : trip.departure_date);
                return (
                  <TableRow key={trip.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedSale(trip)}>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className={`text-[9px] ${cfg.color}`}>
                            <cfg.icon className="w-2.5 h-2.5 mr-0.5" />
                            {cfg.label}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          {trip.tripStatus === "finalizada" && !trip.return_date && (trip.daysSinceDep ?? 0) > 30 && (
                            <p className="text-xs">Encerrada automaticamente ({trip.daysSinceDep} dias sem retorno)</p>
                          )}
                          {trip.tripStatus === "erro_data" && <p className="text-xs">Data de retorno anterior à ida</p>}
                          {trip.tripStatus === "sem_data" && <p className="text-xs">Preencha a data de embarque</p>}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-xs font-medium">{trip.name}</TableCell>
                    <TableCell className="text-xs">{iataToCityName(trip.destination_iata)}</TableCell>
                    <TableCell className="text-xs font-mono">{formatDateBR(trip.departure_date)}</TableCell>
                    <TableCell className="text-xs font-mono">{trip.return_date ? formatDateBR(trip.return_date) : <span className="text-muted-foreground/50">—</span>}</TableCell>
                    <TableCell className="text-xs text-center">
                      {trip.tripStatus === "em_viagem" && !trip.return_date && trip.daysSinceDep !== null ? (
                        <span className="text-yellow-400 text-[9px]">{trip.daysSinceDep}d sem retorno</span>
                      ) : days !== null ? (
                        <span className={days <= 1 ? "text-yellow-400 font-bold" : days <= 3 ? "text-blue-400" : "text-muted-foreground"}>
                          {days > 0 ? `${days}d` : days === 0 ? "Hoje" : "—"}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium">{fmt(trip.received_value || 0)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{sellerNames[trip.seller_id || ""] || "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={e => { e.stopPropagation(); navigate(`/sales/${trip.id}`); }}>
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plane className="w-4 h-4 text-accent" />
              {selectedSale?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground text-xs">ID</span><p className="font-mono">{selectedSale.display_id}</p></div>
                <div><span className="text-muted-foreground text-xs">Status</span><p>{selectedSale.status}</p></div>
                <div><span className="text-muted-foreground text-xs">Origem</span><p>{iataToLabel(selectedSale.origin_iata)}</p></div>
                <div><span className="text-muted-foreground text-xs">Destino</span><p>{iataToLabel(selectedSale.destination_iata)}</p></div>
                <div><span className="text-muted-foreground text-xs">Embarque</span><p className="font-mono">{formatDateBR(selectedSale.departure_date)}</p></div>
                <div><span className="text-muted-foreground text-xs">Retorno</span><p className="font-mono">{formatDateBR(selectedSale.return_date)}</p></div>
                <div><span className="text-muted-foreground text-xs">Valor</span><p className="font-bold text-success">{fmt(selectedSale.received_value || 0)}</p></div>
                <div><span className="text-muted-foreground text-xs">Margem</span><p>{(selectedSale.margin || 0).toFixed(1)}%</p></div>
                {selectedSale.hotel_name && <div className="col-span-2"><span className="text-muted-foreground text-xs">Hotel</span><p>{selectedSale.hotel_name}</p></div>}
                {selectedSale.airline && <div><span className="text-muted-foreground text-xs">Cia Aérea</span><p>{selectedSale.airline}</p></div>}
                <div><span className="text-muted-foreground text-xs">Vendedor</span><p>{sellerNames[selectedSale.seller_id || ""] || "—"}</p></div>
                {selectedSale.locators?.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground text-xs">Localizadores</span>
                    <p className="font-mono text-xs">{selectedSale.locators.join(", ")}</p>
                  </div>
                )}
              </div>
              <Button className="w-full" onClick={() => { setSelectedSale(null); navigate(`/sales/${selectedSale.id}`); }}>
                <ExternalLink className="w-4 h-4 mr-2" /> Abrir Venda
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Alert Drill-down Dialog */}
      <Dialog open={!!alertDrilldown} onOpenChange={() => setAlertDrilldown(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-yellow-400" />
              {alertDrilldown?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">ID</TableHead>
                  <TableHead className="text-xs">Cliente</TableHead>
                  <TableHead className="text-xs">Destino</TableHead>
                  <TableHead className="text-xs">Embarque</TableHead>
                  <TableHead className="text-xs">Retorno</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                  <TableHead className="text-xs w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertDrilldown?.trips.map(trip => (
                  <TableRow key={trip.id} className="cursor-pointer hover:bg-muted/30" onClick={() => { setAlertDrilldown(null); navigate(`/sales/${trip.id}`); }}>
                    <TableCell className="text-xs font-mono text-primary">{trip.display_id}</TableCell>
                    <TableCell className="text-xs font-medium">{trip.name}</TableCell>
                    <TableCell className="text-xs">{iataToCityName(trip.destination_iata)}</TableCell>
                    <TableCell className="text-xs font-mono">{formatDateBR(trip.departure_date)}</TableCell>
                    <TableCell className="text-xs font-mono">{formatDateBR(trip.return_date)}</TableCell>
                    <TableCell className="text-xs text-right font-medium">{fmt(trip.received_value || 0)}</TableCell>
                    <TableCell><ExternalLink className="w-3 h-3 text-muted-foreground" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
