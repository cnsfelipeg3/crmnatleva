import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, ClipboardCheck, Hotel, RotateCcw, AlertTriangle, Eye } from "lucide-react";
import { format, isValid, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  const [kpis, setKpis] = useState<KpiData>({ activeTrips: 0, pendingCheckins: 0, pendingLodgings: 0, pendingAlterations: 0 });
  const [urgentItems, setUrgentItems] = useState<UrgentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Active trips (sales with travel dates)
        const { count: activeTrips } = await supabase
          .from("sales")
          .select("*", { count: "exact", head: true })
          .in("status", ["confirmed", "in_progress", "pending"]);

        // Pending checkins
        const { count: pendingCheckins } = await supabase
          .from("checkin_tasks")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");

        // Pending lodgings (sales needing hotel confirmation)
        const { count: pendingLodgings } = await supabase
          .from("sales")
          .select("*", { count: "exact", head: true })
          .eq("hotel_status", "pending");

        // Pending alterations
        const { count: pendingAlterations } = await (supabase as any)
          .from("trip_alterations")
          .select("*", { count: "exact", head: true })
          .in("status", ["pending", "in_progress"]);

        setKpis({
          activeTrips: activeTrips || 0,
          pendingCheckins: pendingCheckins || 0,
          pendingLodgings: pendingLodgings || 0,
          pendingAlterations: pendingAlterations || 0,
        });

        // Build urgent items list
        const items: UrgentItem[] = [];

        // Upcoming checkins
        const { data: checkins } = await supabase
          .from("checkin_tasks")
          .select("id, sale_id, direction, departure_datetime_utc, status, priority_score")
          .eq("status", "pending")
          .order("departure_datetime_utc", { ascending: true })
          .limit(5);

        if (checkins) {
          for (const c of checkins) {
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

        // Pending alterations
        const { data: alterations } = await (supabase as any)
          .from("trip_alterations")
          .select("id, type, description, status, created_at")
          .in("status", ["pending", "in_progress"])
          .order("created_at", { ascending: false })
          .limit(3);

        if (alterations) {
          for (const a of alterations) {
            items.push({
              id: a.id,
              type: "alteracao",
              title: `Alteração: ${a.type || "Geral"}`,
              subtitle: a.description?.slice(0, 60) || "Sem descrição",
              urgency: a.status === "pending" ? "alta" : "media",
              route: "/alteracoes",
            });
          }
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
  }, []);

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
