import { Suspense, lazy, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Map, Globe } from "lucide-react";
import ClientDistributionMap from "@/components/ClientDistributionMap";

const RoutesMap = lazy(() => import("@/components/RoutesMap"));

interface Sale {
  origin_iata: string | null;
  destination_iata: string | null;
  received_value: number;
  total_cost: number;
  margin: number;
  close_date: string | null;
  created_at: string;
}

interface Props {
  filtered: Sale[];
}

export default function GeographicSection({ filtered }: Props) {
  const navigate = useNavigate();
  const [showDistMap, setShowDistMap] = useState(true);

  const handleDestinationClick = (iata: string) => {
    navigate(`/vendas?destino=${iata}`);
  };

  const routes = useMemo(() => {
    const c: Record<string, { count: number; revenue: number; profit: number; margins: number[]; months: string[] }> = {};
    filtered.forEach(s => {
      if (s.origin_iata && s.destination_iata) {
        const k = `${s.origin_iata}-${s.destination_iata}`;
        if (!c[k]) c[k] = { count: 0, revenue: 0, profit: 0, margins: [], months: [] };
        c[k].count++;
        c[k].revenue += s.received_value || 0;
        c[k].profit += (s.received_value || 0) - (s.total_cost || 0);
        c[k].margins.push(s.margin || 0);
        const dt = s.close_date || s.created_at;
        if (dt) {
          const d = new Date(dt);
          const m = d.toLocaleString("pt-BR", { month: "short" }).replace(".", "");
          c[k].months.push(m);
        }
      }
    });
    return Object.entries(c).map(([k, v]) => {
      const [origin, destination] = k.split("-");
      const avgMargin = v.margins.length ? v.margins.reduce((a, b) => a + b, 0) / v.margins.length : 0;
      // top 3 months by frequency
      const freq: Record<string, number> = {};
      v.months.forEach(m => { freq[m] = (freq[m] || 0) + 1; });
      const topMonths = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m]) => m);
      return { origin, destination, count: v.count, revenue: v.revenue, profit: v.profit, avgMargin, topMonths };
    }).sort((a, b) => b.count - a.count);
  }, [filtered]);

  const MapFallback = () => (
    <div className="h-[320px] flex items-center justify-center text-muted-foreground text-sm">Carregando mapa...</div>
  );

  return (
    <div className="space-y-4">
      <h2 className="section-title">
        <Globe className="w-5 h-5 text-primary" />
        Geográfico
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {routes.length > 0 && (
          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Map className="w-4 h-4 text-primary" />
              Mapa de Rotas Aéreas
            </h3>
            <Suspense fallback={<MapFallback />}>
              <RoutesMap routes={routes} height="300px" onDestinationClick={handleDestinationClick} />
            </Suspense>
            <div className="mt-3 flex flex-wrap gap-2">
              {routes.slice(0, 5).map((r, i) => (
                <Badge key={i} variant="outline" className="text-xs font-mono">
                  {r.origin} → {r.destination} ({r.count})
                </Badge>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-accent" />
            Distribuição de Clientes
          </h3>
          {showDistMap && <ClientDistributionMap />}
        </Card>
      </div>
    </div>
  );
}
