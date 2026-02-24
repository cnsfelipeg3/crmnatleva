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
  Clock, Shield, Eye, ExternalLink, Radio, Zap,
} from "lucide-react";

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

type TripStatus = "em_viagem" | "proxima" | "embarque_amanha" | "retorno_hoje" | "futura" | "finalizada";

function getTripStatus(dep: string | null, ret: string | null): TripStatus {
  if (!dep) return "futura";
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
  const depDate = dep.slice(0, 10);
  const retDate = ret?.slice(0, 10);

  if (retDate && retDate < today) return "finalizada";
  if (retDate === today) return "retorno_hoje";
  if (depDate <= today && (!retDate || retDate >= today)) return "em_viagem";
  if (depDate === tomorrow) return "embarque_amanha";
  const in7days = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
  if (depDate <= in7days) return "proxima";
  return "futura";
}

const STATUS_CONFIG: Record<TripStatus, { label: string; color: string; icon: typeof Plane }> = {
  em_viagem: { label: "Em Viagem", color: "bg-green-500/15 text-green-400 border-green-500/30", icon: Plane },
  proxima: { label: "Próxima", color: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: Clock },
  embarque_amanha: { label: "Amanhã", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", icon: AlertTriangle },
  retorno_hoje: { label: "Retorna Hoje", color: "bg-orange-500/15 text-orange-400 border-orange-500/30", icon: MapPin },
  futura: { label: "Futura", color: "bg-muted text-muted-foreground border-border", icon: Globe },
  finalizada: { label: "Finalizada", color: "bg-muted/50 text-muted-foreground/50 border-border/50", icon: Shield },
};

type FilterMode = "all" | "em_viagem" | "48h" | "7d" | "critico";

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
    return sales
      .filter(s => s.departure_date)
      .map(s => ({ ...s, tripStatus: getTripStatus(s.departure_date, s.return_date) }))
      .filter(s => s.tripStatus !== "finalizada" || filterMode === "all");
  }, [sales, filterMode]);

  const filtered = useMemo(() => {
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 3600000).toISOString().slice(0, 10);
    const in7d = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
    const today = now.toISOString().slice(0, 10);

    switch (filterMode) {
      case "em_viagem": return tripsWithStatus.filter(t => t.tripStatus === "em_viagem");
      case "48h": return tripsWithStatus.filter(t => t.departure_date && t.departure_date.slice(0, 10) <= in48h && t.departure_date.slice(0, 10) >= today);
      case "7d": return tripsWithStatus.filter(t => t.departure_date && t.departure_date.slice(0, 10) <= in7d && t.departure_date.slice(0, 10) >= today);
      case "critico": return tripsWithStatus.filter(t => ["em_viagem", "embarque_amanha", "retorno_hoje"].includes(t.tripStatus));
      default: return tripsWithStatus;
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
    return {
      emViagem: active.length,
      next7d: next7d.length,
      countries: countries.size,
      activeRevenue,
      returningToday: returningToday.length,
      pax,
    };
  }, [tripsWithStatus]);

  // Routes for map
  const routes = useMemo(() => {
    const active = filtered.filter(t => t.tripStatus !== "finalizada" && t.origin_iata && t.destination_iata);
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
    const items: { icon: typeof AlertTriangle; text: string; severity: "red" | "yellow" | "blue" }[] = [];
    const embarqueAmanha = tripsWithStatus.filter(t => t.tripStatus === "embarque_amanha");
    if (embarqueAmanha.length > 0) items.push({ icon: AlertTriangle, text: `${embarqueAmanha.length} cliente(s) embarca(m) amanhã`, severity: "yellow" });
    const retornoHoje = tripsWithStatus.filter(t => t.tripStatus === "retorno_hoje");
    if (retornoHoje.length > 0) items.push({ icon: MapPin, text: `${retornoHoje.length} cliente(s) retorna(m) hoje`, severity: "blue" });
    const highValue = tripsWithStatus.filter(t => t.tripStatus === "em_viagem" && t.received_value >= 50000);
    if (highValue.length > 0) items.push({ icon: DollarSign, text: `${highValue.length} viagem(s) acima de R$ 50k ativa(s)`, severity: "red" });
    const intl = tripsWithStatus.filter(t => t.tripStatus === "em_viagem" && t.is_international);
    if (intl.length > 0) items.push({ icon: Globe, text: `${intl.length} viagem(s) internacional(is) em andamento`, severity: "blue" });
    return items;
  }, [tripsWithStatus]);

  const daysUntil = (dateStr: string | null) => {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
    return diff;
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
            <p className="text-[10px] text-muted-foreground font-mono tracking-wider">MONITORAMENTO DE VIAGENS EM TEMPO REAL</p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {([
            ["all", "Todas"], ["em_viagem", "🟢 Em Viagem"], ["48h", "⚡ 48h"],
            ["7d", "📅 7 dias"], ["critico", "🔴 Crítico"],
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
          { label: "Em Viagem", value: kpis.emViagem, icon: Plane, color: "text-green-400" },
          { label: "Próx. 7 dias", value: kpis.next7d, icon: Clock, color: "text-blue-400" },
          { label: "Países Ativos", value: kpis.countries, icon: Globe, color: "text-accent" },
          { label: "Receita Ativa", value: fmt(kpis.activeRevenue), icon: DollarSign, color: "text-success" },
          { label: "Retornam Hoje", value: kpis.returningToday, icon: MapPin, color: "text-orange-400" },
          { label: "Passageiros Fora", value: kpis.pax, icon: Users, color: "text-info" },
        ].map(k => (
          <Card key={k.label} className="p-3 glass-card">
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
        {/* Alerts */}
        <Card className="p-4 glass-card lg:col-span-1">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" /> Alertas
          </h3>
          <div className="space-y-2">
            {alerts.length === 0 && <p className="text-xs text-muted-foreground">Nenhum alerta no momento ✅</p>}
            {alerts.map((a, i) => (
              <div key={i} className={`flex items-start gap-2 p-2 rounded-lg border ${
                a.severity === "red" ? "bg-red-500/5 border-red-500/20" :
                a.severity === "yellow" ? "bg-yellow-500/5 border-yellow-500/20" :
                "bg-blue-500/5 border-blue-500/20"
              }`}>
                <a.icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                  a.severity === "red" ? "text-red-400" : a.severity === "yellow" ? "text-yellow-400" : "text-blue-400"
                }`} />
                <span className="text-[11px] text-foreground">{a.text}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Map */}
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
              {filtered.slice(0, 50).map(trip => {
                const cfg = STATUS_CONFIG[trip.tripStatus];
                const days = daysUntil(trip.tripStatus === "em_viagem" ? trip.return_date : trip.departure_date);
                return (
                  <TableRow key={trip.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedSale(trip)}>
                    <TableCell>
                      <Badge variant="outline" className={`text-[9px] ${cfg.color}`}>
                        <cfg.icon className="w-2.5 h-2.5 mr-0.5" />
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium">{trip.name}</TableCell>
                    <TableCell className="text-xs">{iataToCityName(trip.destination_iata)}</TableCell>
                    <TableCell className="text-xs font-mono">{formatDateBR(trip.departure_date)}</TableCell>
                    <TableCell className="text-xs font-mono">{formatDateBR(trip.return_date)}</TableCell>
                    <TableCell className="text-xs text-center">
                      {days !== null && (
                        <span className={days <= 1 ? "text-yellow-400 font-bold" : days <= 3 ? "text-blue-400" : "text-muted-foreground"}>
                          {days > 0 ? `${days}d` : days === 0 ? "Hoje" : "—"}
                        </span>
                      )}
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
                  <div className="col-span-2"><span className="text-muted-foreground text-xs">Localizadores</span><p className="font-mono">{selectedSale.locators.join(", ")}</p></div>
                )}
              </div>
              <Button className="w-full" onClick={() => navigate(`/sales/${selectedSale.id}`)}>
                <Eye className="w-4 h-4 mr-2" /> Abrir Venda
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
