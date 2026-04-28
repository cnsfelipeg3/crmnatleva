import { forwardRef } from "react";
import { AlertCircle, Plane } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GFlightCard } from "./GFlightCard";
import type { GFlightItinerary } from "./gflightsTypes";

interface Props {
  best?: GFlightItinerary[];
  others?: GFlightItinerary[];
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  hasSearched: boolean;
  onSelect?: (it: GFlightItinerary) => void;
}

export const GFlightResultsList = forwardRef<HTMLDivElement, Props>(function GFlightResultsList({ best = [], others = [], isLoading, isError, error, hasSearched, onSelect }, _ref) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro ao buscar voos</AlertTitle>
        <AlertDescription>
          {error?.message || "Não foi possível completar a busca. Tente novamente em instantes."}
        </AlertDescription>
      </Alert>
    );
  }
  if (!hasSearched) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
        <Plane className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Informe origem, destino e datas para buscar voos no Google Flights.
        </p>
      </div>
    );
  }
  if (best.length === 0 && others.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
        <Plane className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm font-medium">Nenhum voo encontrado</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Tente outras datas ou aeroportos alternativos.
        </p>
      </div>
    );
  }

  // Calcular flags entre todos
  const all = [...best, ...others];
  const cheapest = all.reduce<GFlightItinerary | null>((m, c) => {
    if (typeof c.price !== "number") return m;
    if (!m || (typeof m.price === "number" && c.price < m.price)) return c;
    return m;
  }, null);
  const fastest = all.reduce<GFlightItinerary | null>((m, c) => {
    if (typeof c.total_duration !== "number") return m;
    if (!m || (typeof m.total_duration === "number" && c.total_duration < m.total_duration)) return c;
    return m;
  }, null);

  return (
    <div className="space-y-5">
      {best.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Melhores opções
          </h3>
          {best.map((it, idx) => (
            <GFlightCard
              key={`best-${idx}-${it.booking_token ?? it.departure_token ?? idx}`}
              itinerary={it}
              isBest={idx === 0}
              isCheapest={it === cheapest}
              isFastest={it === fastest}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
      {others.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Outras opções ({others.length})
          </h3>
          {others.map((it, idx) => (
            <GFlightCard
              key={`other-${idx}-${it.booking_token ?? it.departure_token ?? idx}`}
              itinerary={it}
              isCheapest={it === cheapest}
              isFastest={it === fastest}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
