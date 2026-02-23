import { Suspense, lazy, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const RoutesMap = lazy(() => import("@/components/RoutesMap"));
const ClientDistributionMap = lazy(() => import("@/components/ClientDistributionMap"));

interface Sale {
  origin_iata: string | null;
  destination_iata: string | null;
  received_value: number;
}

interface Props {
  filtered: Sale[];
}

export default function GeographicSection({ filtered }: Props) {
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
      <h2 className="text-lg font-serif text-foreground">Geográfico</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {routes.length > 0 && (
          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-3">Mapa de Rotas Aéreas</h3>
            <Suspense fallback={<MapFallback />}>
              <RoutesMap routes={routes} height="300px" />
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
          <h3 className="text-sm font-semibold text-foreground mb-3">Distribuição de Clientes</h3>
          <Suspense fallback={<MapFallback />}>
            <ClientDistributionMap />
          </Suspense>
        </Card>
      </div>
    </div>
  );
}
