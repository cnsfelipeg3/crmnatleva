import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, ClipboardCheck, Hotel, RotateCcw, AlertTriangle, Eye } from "lucide-react";
import { format, isValid, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useSalesScope } from "@/hooks/useSalesScope";

interface KpiData {
  activeTrips: number;
  pendingCheckins: number;
  pendingLodgings: number;
  pendingAlterations: number;
}

interface UrgentItem {
  id: string;
  type: "checkin" | "hospedagem" | "alteracao" | "viagem";
  title: string;
  subtitle: string;
  urgency: "alta" | "media" | "baixa";
  daysLeft?: number;
  route: string;
}

export default function TorreDeControle() {
  const navigate = useNavigate();
  const { canViewAll, sellerId, loading: scopeLoading } = useSalesScope();
  const [kpis, setKpis] = useState<KpiData>({ activeTrips: 0, pendingCheckins: 0, pendingLodgings: 0, pendingAlterations: 0 });
  const [urgentItems, setUrgentItems] = useState<UrgentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (scopeLoading) return;
    const fetchData = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);

        // Active trips: currently traveling (departure <= today <= return)
        // or departed within 30 days with no return date
        let q = supabase
          .from("sales")
          .select("id, name, departure_date, return_date, destination_iata, origin_iata, seller_id")
          .not("departure_date", "is", null)
          .neq("status", "Cancelado")
          .lte("departure_date", today);
        if (!canViewAll && sellerId) q = q.eq("seller_id", sellerId);
        const { data: activeSales } = await q;

        const activeTrips = (activeSales || []).filter(s => {
          if (s.return_date && s.return_date >= today) return true;
          if (!s.return_date) {
            const depDays = Math.floor((Date.now() - new Date(s.departure_date!).getTime()) / 86400000);
            return depDays <= 30;
          }
          return false;
        });

        // Pending checkins (status = PENDENTE)
        const { count: pendingCheckins } = await supabase
          .from("checkin_tasks")
          .select("*", { count: "exact", head: true })
          .eq("status", "PENDENTE");

        // Pending lodging confirmations
        const { count: pendingLodgings } = await (supabase as any)
          .from("lodging_confirmation_tasks")
          .select("*", { count: "exact", head: true })
          .eq("status", "PENDENTE");

        // Pending trip alterations
        const { count: pendingAlterations } = await (supabase as any)
          .from("trip_alterations")
          .select("*", { count: "exact", head: true })
          .in("status", ["PENDENTE", "EM_ANDAMENTO"]);

        setKpis({
          activeTrips: activeTrips.length,
          pendingCheckins: pendingCheckins || 0,
          pendingLodgings: pendingLodgings || 0,
          pendingAlterations: pendingAlterations || 0,
        });

        // Build urgent items list
        const items: UrgentItem[] = [];

        // Set of sale_ids visíveis ao usuário (para filtrar tarefas)
        let visibleSaleIds: Set<string> | null = null;
        if (!canViewAll && sellerId) {
          const { data: visibleSales } = await supabase
            .from("sales")
            .select("id")
            .eq("seller_id", sellerId);
          visibleSaleIds = new Set((visibleSales || []).map((s: any) => s.id));
        }

        // Upcoming checkins
        let checkinsQuery = supabase
          .from("checkin_tasks")
          .select("id, sale_id, direction, departure_datetime_utc, status, priority_score")
          .eq("status", "PENDENTE")
          .order("departure_datetime_utc", { ascending: true })
          .limit(20);
        if (visibleSaleIds) {
          if (visibleSaleIds.size === 0) checkinsQuery = checkinsQuery.eq("sale_id", "00000000-0000-0000-0000-000000000000");
          else checkinsQuery = checkinsQuery.in("sale_id", Array.from(visibleSaleIds));
        }
        const { data: checkins } = await checkinsQuery;

        if (checkins) {
          for (const c of checkins.slice(0, 5)) {
            const depDate = c.departure_datetime_utc ? parseISO(c.departure_datetime_utc) : null;
            const daysLeft = depDate && isValid(depDate) ? differenceInDays(depDate, new Date()) : null;
            items.push({
              id: c.id,
              type: "checkin",
              title: `Check-in ${c.direction === "ida" ? "Ida" : "Volta"}`,
              subtitle: depDate && isValid(depDate)
                ? `Embarque ${format(depDate, "dd/MM HH:mm", { locale: ptBR })}`
                : "Data não definida",
              urgency: daysLeft !== null && daysLeft <= 1 ? "alta" : daysLeft !== null && daysLeft <= 3 ? "media" : "baixa",
              daysLeft: daysLeft ?? undefined,
              route: "/checkin",
            });
          }
        }

        // Pending lodging confirmations
        let lodgingsQuery = (supabase as any)
          .from("lodging_confirmation_tasks")
          .select("id, sale_id, milestone, status, scheduled_at_utc")
          .eq("status", "PENDENTE")
          .order("scheduled_at_utc", { ascending: true })
          .limit(20);
        if (visibleSaleIds) {
          if (visibleSaleIds.size === 0) lodgingsQuery = lodgingsQuery.eq("sale_id", "00000000-0000-0000-0000-000000000000");
          else lodgingsQuery = lodgingsQuery.in("sale_id", Array.from(visibleSaleIds));
        }
        const { data: lodgings } = await lodgingsQuery;

        if (lodgings) {
          for (const l of lodgings.slice(0, 3)) {
            const scheduled = l.scheduled_at_utc ? parseISO(l.scheduled_at_utc) : null;
            const daysLeft = scheduled && isValid(scheduled) ? differenceInDays(scheduled, new Date()) : null;
            items.push({
              id: l.id,
              type: "hospedagem",
              title: `Confirmação Hotel (${l.milestone || "—"})`,
              subtitle: scheduled && isValid(scheduled)
                ? `Prazo ${format(scheduled, "dd/MM", { locale: ptBR })}`
                : "Sem prazo definido",
              urgency: l.milestone === "H24" ? "alta" : l.milestone === "D7" ? "media" : "baixa",
              daysLeft: daysLeft ?? undefined,
              route: "/hospedagem",
            });
          }
        }

        // Active trips needing attention (departing tomorrow or today)
        const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
        const tripsUrgent = activeTrips.filter(s => {
          const dep = s.departure_date?.slice(0, 10);
          return dep === today || dep === tomorrow;
        });
        for (const t of tripsUrgent.slice(0, 3)) {
          const dep = t.departure_date ? t.departure_date.slice(0, 10) : null;
          items.push({
            id: t.id,
            type: "viagem",
            title: t.name || "Viagem sem nome",
            subtitle: `${t.origin_iata || "?"} → ${t.destination_iata || "?"} • ${dep === today ? "Embarca HOJE" : "Embarca amanhã"}`,
            urgency: dep === today ? "alta" : "media",
            daysLeft: dep === today ? 0 : 1,
            route: `/sales/${t.id}`,
          });
        }

        // Sort by urgency
        const urgencyOrder = { alta: 0, media: 1, baixa: 2 };
        items.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

        setUrgentItems(items.slice(0, 8));
      } catch (err) {
        console.error("Torre de Controle fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [scopeLoading, canViewAll, sellerId]);

  const kpiCards = [
    {
      label: "Viagens Ativas",
      value: kpis.activeTrips,
      icon: Plane,
      color: "text-primary",
      bgColor: "bg-primary/10",
      route: "/viagens/monitor",
    },
    {
      label: "Check-ins Pendentes",
      value: kpis.pendingCheckins,
      icon: ClipboardCheck,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      route: "/checkin",
    },
    {
      label: "Hospedagens a Confirmar",
      value: kpis.pendingLodgings,
      icon: Hotel,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      route: "/hospedagem",
    },
    {
      label: "Alterações em Aberto",
      value: kpis.pendingAlterations,
      icon: RotateCcw,
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
      route: "/alteracoes",
    },
  ];

  const urgencyStyles = {
    alta: "bg-destructive/10 text-destructive border-destructive/20",
    media: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    baixa: "bg-muted text-muted-foreground border-border/20",
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Torre de Controle</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Resumo operacional de todas as viagens em andamento
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Card
            key={kpi.label}
            className="cursor-pointer hover:scale-[1.02] transition-transform duration-200"
            onClick={() => navigate(kpi.route)}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {kpi.label}
                  </p>
                  <p className="text-3xl font-bold mt-1">
                    {loading ? "—" : kpi.value}
                  </p>
                </div>
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", kpi.bgColor)}>
                  <kpi.icon className={cn("w-5 h-5", kpi.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Card
            key={`action-${kpi.label}`}
            className="cursor-pointer group hover:border-primary/30 transition-all duration-200"
            onClick={() => navigate(kpi.route)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <kpi.icon className={cn("w-4 h-4", kpi.color)} />
                {kpi.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground">
                {kpi.value > 0
                  ? `${kpi.value} item(s) aguardando ação`
                  : "Tudo em dia ✓"}
              </p>
              <span className="text-[11px] text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity mt-2 inline-flex items-center gap-1">
                <Eye className="w-3 h-3" /> Ver detalhes
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Atenção Agora */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Atenção Agora
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : urgentItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum item urgente no momento. Tudo sob controle! 🎉
            </p>
          ) : (
            <div className="space-y-2">
              {urgentItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(item.route)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:scale-[1.01] transition-all duration-150",
                    urgencyStyles[item.urgency]
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs opacity-75 truncate">{item.subtitle}</p>
                  </div>
                  {item.daysLeft !== undefined && (
                    <span className="text-xs font-mono shrink-0">
                      {item.daysLeft <= 0 ? "HOJE" : `${item.daysLeft}d`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
