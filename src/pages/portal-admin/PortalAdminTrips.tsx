import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAllRows } from "@/lib/fetchAll";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Eye, Plane, Hotel, X, Globe, FileText, Bell,
  Calendar, MapPin, Users, Copy, Archive, Edit, DollarSign,
  CheckCircle2, ClipboardCheck, MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDateBR } from "@/lib/dateFormat";
import AirlineLogo from "@/components/AirlineLogo";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function getTripStatus(sale: any): string {
  const dep = sale.departure_date ? new Date(sale.departure_date + "T00:00:00") : null;
  const ret = sale.return_date ? new Date(sale.return_date + "T23:59:59") : null;
  const now = new Date();
  if (!dep) return "planejamento";
  if (sale.status === "Cancelado" || sale.status === "Cancelada") return "cancelada";
  if (dep > now) return "confirmada";
  if (dep <= now && ret && ret >= now) return "em_andamento";
  if (ret && ret < now) return "concluida";
  return "planejamento";
}

const statusLabel: Record<string, string> = {
  planejamento: "Planejamento",
  aguardando_confirmacao: "Aguard. Confirmação",
  confirmada: "Confirmada",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};
const statusStyle: Record<string, string> = {
  planejamento: "bg-muted text-muted-foreground",
  aguardando_confirmacao: "bg-warning/15 text-warning-foreground border-warning/20",
  confirmada: "bg-info/10 text-info border-info/20",
  em_andamento: "bg-accent/10 text-accent border-accent/20",
  concluida: "bg-success/15 text-success border-success/20",
  cancelada: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function PortalAdminTrips() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sales, setSales] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [destFilter, setDestFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;
    Promise.all([
      fetchAllRows("sales", "id, name, display_id, status, origin_iata, destination_iata, departure_date, return_date, received_value, total_cost, margin, seller_id, client_id, hotel_name, airline, adults, children, created_at, emission_status", { order: { column: "departure_date", ascending: false } }),
      fetchAllRows("clients", "id, display_name"),
      fetchAllRows("profiles", "id, full_name"),
    ]).then(([s, c, p]) => {
      setSales(s);
      setClients(c);
      setProfiles(p);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user, authLoading]);

  const clientMap = useMemo(() => {
    const map: Record<string, string> = {};
    clients.forEach(c => { map[c.id] = c.display_name; });
    return map;
  }, [clients]);

  const sellerMap = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach(p => { map[p.id] = p.full_name; });
    return map;
  }, [profiles]);

  const destinations = useMemo(() => [...new Set(sales.map(s => s.destination_iata).filter(Boolean))].sort(), [sales]);

  const filtered = useMemo(() => {
    let result = sales;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.display_id?.toLowerCase().includes(q) ||
        s.destination_iata?.toLowerCase().includes(q) ||
        clientMap[s.client_id]?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter(s => getTripStatus(s) === statusFilter);
    }
    if (destFilter) {
      result = result.filter(s => s.destination_iata === destFilter);
    }
    if (clientFilter) {
      result = result.filter(s => s.client_id === clientFilter);
    }
    return result;
  }, [sales, search, statusFilter, destFilter, clientFilter, clientMap]);

  const hasFilters = statusFilter !== "all" || destFilter || clientFilter;

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Carregando viagens...</div>;

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <h1 className="text-xl sm:text-2xl font-serif text-foreground">Todas as Viagens</h1>
          </div>
          <p className="text-sm text-muted-foreground">{filtered.length} de {sales.length} viagens no portal</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar viagem, cliente, destino..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(statusLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={destFilter || "all"} onValueChange={v => setDestFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-[120px] h-9 text-xs"><SelectValue placeholder="Destino" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos destinos</SelectItem>
            {destinations.map(d => <SelectItem key={d!} value={d!}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter("all"); setDestFilter(""); setClientFilter(""); }}>
            <X className="w-3.5 h-3.5 mr-1" /> Limpar
          </Button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search || hasFilters ? "Nenhuma viagem encontrada com esses filtros." : "Nenhuma viagem cadastrada."}
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {filtered.slice(0, 50).map(trip => {
              const st = getTripStatus(trip);
              return (
                <Card key={trip.id} className="p-4 glass-card cursor-pointer active:scale-[0.98] transition-transform" onClick={() => navigate(`/portal-admin/viagens/${trip.id}`)}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{trip.name}</p>
                      <p className="text-xs text-muted-foreground">{clientMap[trip.client_id] || "—"}</p>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px] shrink-0", statusStyle[st])}>{statusLabel[st]}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">{trip.origin_iata || "?"} → {trip.destination_iata || "?"}</span>
                    <span className="text-xs text-muted-foreground">{trip.departure_date ? formatDateBR(trip.departure_date) : "Sem data"}</span>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop table */}
          <Card className="glass-card overflow-hidden hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Viagem</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Cliente</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Destino</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Embarque</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Retorno</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Consultor</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Receita</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 200).map(trip => {
                    const st = getTripStatus(trip);
                    return (
                      <tr key={trip.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/portal-admin/viagens/${trip.id}`)}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{trip.name}</p>
                          <p className="text-xs text-muted-foreground">{trip.display_id}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{clientMap[trip.client_id] || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs">{trip.origin_iata || "?"} → {trip.destination_iata || "?"}</span>
                            {trip.airline && <AirlineLogo iata={trip.airline} size={16} />}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{trip.departure_date ? formatDateBR(trip.departure_date) : "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{trip.return_date ? formatDateBR(trip.return_date) : "—"}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn("text-[10px]", statusStyle[st])}>{statusLabel[st]}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{sellerMap[trip.seller_id] || "—"}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium">{fmt(trip.received_value || 0)}</td>
                        <td className="px-4 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/portal-admin/viagens/${trip.id}`); }}>
                                <Eye className="w-3.5 h-3.5 mr-2" /> Abrir Viagem
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/sales/${trip.id}`); }}>
                                <Edit className="w-3.5 h-3.5 mr-2" /> Editar Venda
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open("/portal", "_blank"); }}>
                                <Globe className="w-3.5 h-3.5 mr-2" /> Ver Portal do Cliente
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/itinerario`); }}>
                                <FileText className="w-3.5 h-3.5 mr-2" /> Gerar Itinerário
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
                                <Bell className="w-3.5 h-3.5 mr-2" /> Enviar Notificação
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
                                <ClipboardCheck className="w-3.5 h-3.5 mr-2" /> Atualizar Checklist
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
                                <Copy className="w-3.5 h-3.5 mr-2" /> Duplicar Viagem
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }} className="text-destructive">
                                <Archive className="w-3.5 h-3.5 mr-2" /> Arquivar Viagem
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Summary */}
          <Card className="glass-card p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Viagens</p>
                <p className="text-lg font-bold text-foreground">{filtered.length}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">PAX Total</p>
                <p className="text-lg font-bold text-foreground">{filtered.reduce((s, t) => s + (t.adults || 0) + (t.children || 0), 0)}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Receita Total</p>
                <p className="text-lg font-bold text-foreground">{fmt(filtered.reduce((s, t) => s + (t.received_value || 0), 0))}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Margem Média</p>
                <p className="text-lg font-bold text-foreground">
                  {filtered.length ? (filtered.reduce((s, t) => s + (t.margin || 0), 0) / filtered.length).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
