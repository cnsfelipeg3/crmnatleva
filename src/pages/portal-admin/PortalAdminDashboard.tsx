import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAll";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plane, Users, FileText, AlertTriangle, DollarSign, Calendar,
  MapPin, Eye, Clock, CheckCircle2, XCircle, ArrowRight, Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateBR } from "@/lib/dateFormat";

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

export default function PortalAdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sales, setSales] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    Promise.all([
      fetchAllRows("sales", "id, name, display_id, status, origin_iata, destination_iata, departure_date, return_date, received_value, total_cost, margin, seller_id, client_id, hotel_name, airline, adults, children, created_at, emission_status", { order: { column: "departure_date", ascending: false } }),
      fetchAllRows("clients", "id, display_name, email, phone, created_at"),
    ]).then(([s, c]) => {
      setSales(s);
      setClients(c);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [authLoading]);

  const stats = useMemo(() => {
    const now = new Date();
    const active = sales.filter(s => {
      const st = getTripStatus(s);
      return st === "confirmada" || st === "em_andamento";
    });
    const upcoming = sales.filter(s => {
      const dep = s.departure_date ? new Date(s.departure_date + "T00:00:00") : null;
      return dep && dep > now && dep.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000;
    });
    const pendingPayment = sales.filter(s => (s.received_value || 0) === 0 && s.status !== "Cancelado");
    const noItinerary = sales.filter(s => getTripStatus(s) === "confirmada");

    return {
      activeTrips: active.length,
      upcomingTrips: upcoming.length,
      totalClients: clients.length,
      pendingPayment: pendingPayment.length,
      noDocuments: 0,
      noItinerary: noItinerary.length,
    };
  }, [sales, clients]);

  const recentTrips = useMemo(() => {
    const now = new Date();
    return sales
      .filter(s => s.departure_date)
      .sort((a, b) => {
        const da = new Date(a.departure_date + "T00:00:00").getTime();
        const db = new Date(b.departure_date + "T00:00:00").getTime();
        return Math.abs(da - now.getTime()) - Math.abs(db - now.getTime());
      })
      .slice(0, 8);
  }, [sales]);

  const statusLabel: Record<string, string> = {
    planejamento: "Planejamento",
    confirmada: "Confirmada",
    em_andamento: "Em Andamento",
    concluida: "Concluída",
    cancelada: "Cancelada",
  };
  const statusStyle: Record<string, string> = {
    planejamento: "bg-muted text-muted-foreground",
    confirmada: "bg-info/10 text-info border-info/20",
    em_andamento: "bg-accent/10 text-accent border-accent/20",
    concluida: "bg-success/15 text-success border-success/20",
    cancelada: "bg-destructive/10 text-destructive border-destructive/20",
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Carregando painel do portal...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" />
            <h1 className="text-xl sm:text-2xl font-serif text-foreground">Portal do Viajante — Admin</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Centro de controle do portal Minhas Viagens</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/portal-admin/viagens")}>
            <Plane className="w-4 h-4 mr-1" /> Todas as Viagens
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/portal-admin/clientes")}>
            <Users className="w-4 h-4 mr-1" /> Clientes
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { icon: Plane, label: "Viagens Ativas", value: stats.activeTrips, color: "text-primary" },
          { icon: Calendar, label: "Próximas (30d)", value: stats.upcomingTrips, color: "text-info" },
          { icon: Users, label: "Clientes", value: stats.totalClients, color: "text-accent" },
          { icon: DollarSign, label: "Pgto Pendente", value: stats.pendingPayment, color: "text-warning-foreground" },
          { icon: FileText, label: "Sem Documentos", value: stats.noDocuments, color: "text-destructive" },
          { icon: AlertTriangle, label: "Sem Itinerário", value: stats.noItinerary, color: "text-muted-foreground" },
        ].map((kpi, i) => (
          <Card key={i} className="p-4 glass-card hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className={cn("w-4 h-4", kpi.color)} />
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
          </Card>
        ))}
      </div>

      {/* Recent / Nearest trips */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Viagens Mais Próximas</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/portal-admin/viagens")}>
            Ver todas <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {recentTrips.map((trip) => {
            const st = getTripStatus(trip);
            return (
              <Card key={trip.id} className="p-4 glass-card cursor-pointer hover:shadow-md transition-all group" onClick={() => navigate(`/portal-admin/viagens/${trip.id}`)}>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline" className={cn("text-[10px]", statusStyle[st])}>{statusLabel[st]}</Badge>
                  <Eye className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="font-medium text-foreground truncate">{trip.name}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-mono">
                    {trip.origin_iata || "?"} → {trip.destination_iata || "?"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {trip.departure_date ? formatDateBR(trip.departure_date) : "Sem data"}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Quick distribution */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-4 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-3">Distribuição por Status</h3>
          <div className="space-y-2">
            {Object.entries(
              sales.reduce((acc: Record<string, number>, s) => {
                const st = getTripStatus(s);
                acc[st] = (acc[st] || 0) + 1;
                return acc;
              }, {})
            ).sort(([, a], [, b]) => (b as number) - (a as number)).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("text-[10px]", statusStyle[status])}>{statusLabel[status] || status}</Badge>
                </div>
                <span className="text-sm font-medium text-foreground">{count as number}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-3">Ações Rápidas</h3>
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate("/portal-admin/viagens")}>
              <Plane className="w-4 h-4 mr-2" /> Gerenciar Viagens
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate("/portal-admin/clientes")}>
              <Users className="w-4 h-4 mr-2" /> Gerenciar Clientes do Portal
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate("/itinerario")}>
              <FileText className="w-4 h-4 mr-2" /> Gerar Itinerário
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => window.open("/portal", "_blank")}>
              <Eye className="w-4 h-4 mr-2" /> Abrir Portal do Cliente
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
