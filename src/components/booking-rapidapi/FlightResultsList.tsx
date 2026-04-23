import { AlertCircle, PlaneLanding, Plane } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FlightCard } from "./FlightCard";
import type { FlightOffer, FlightDeal } from "./flightTypes";

interface Props {
  offers: FlightOffer[] | undefined;
  deals: FlightDeal[];
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  onSelectOffer: (offer: FlightOffer) => void;
  hasSearched: boolean;
  adults?: number;
}

export function FlightResultsList({
  offers,
  deals,
  isLoading,
  isError,
  error,
  onSelectOffer,
  hasSearched,
  adults,
}: Props) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded-lg" />
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
          {error?.message ||
            "Não foi possível completar a busca. Tente novamente em instantes."}
        </AlertDescription>
      </Alert>
    );
  }

  if (!hasSearched) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
        <Plane className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Informe origem, destino e datas acima para buscar voos.
        </p>
      </div>
    );
  }

  if (!offers?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
        <PlaneOff className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm font-medium">Nenhum voo encontrado</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Ajuste datas, classe ou tente origem/destino alternativos.
        </p>
      </div>
    );
  }

  const bestToken = deals.find((d) => d.key === "BEST")?.offerToken;
  const cheapestToken = deals.find((d) => d.key === "CHEAPEST")?.offerToken;
  const fastestToken = deals.find((d) => d.key === "FASTEST")?.offerToken;

  return (
    <div className="space-y-3">
      {offers.map((offer) => (
        <FlightCard
          key={offer.token}
          offer={offer}
          isBest={offer.token === bestToken}
          isCheapest={offer.token === cheapestToken}
          isFastest={offer.token === fastestToken}
          adults={adults}
          onClick={onSelectOffer}
        />
      ))}
    </div>
  );
}
