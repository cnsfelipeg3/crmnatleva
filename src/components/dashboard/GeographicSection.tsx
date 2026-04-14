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
    const c: Record<string, { count: number; revenue: number }> = {};
    filtered.forEach(s => {
      if (s.origin_iata && s.destination_iata) {
        const k = `${s.origin_iata}-${s.destination_iata}`;
        if (!c[k]) c[k] = { count: 0, revenue: 0 };
        c[k].count++;
        c[k].revenue += s.received_value || 0;
      }
    });
    return Object.entries(c).map(([k, v]) => {
      const [origin, destination] = k.split("-");
      return { origin, destination, ...v };
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
