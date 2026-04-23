import { AlertCircle, SearchX, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HotelCard } from "./HotelCard";
import type { BookingHotel } from "./types";

interface Props {
  hotels: BookingHotel[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  onSelectHotel: (hotel: BookingHotel) => void;
  hasSearched: boolean;
}

export function HotelResultsGrid({
  hotels,
  isLoading,
  isError,
  error,
  onSelectHotel,
  hasSearched,
}: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-[4/3] w-full rounded-md" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-5 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro ao buscar hotéis</AlertTitle>
        <AlertDescription>
          {error?.message || "Não foi possível completar a busca. Tente novamente em instantes."}
        </AlertDescription>
      </Alert>
    );
  }

  if (!hasSearched) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Search className="h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">
          Informe destino e datas acima para iniciar a busca.
        </p>
      </div>
    );
  }

  if (!hotels?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <SearchX className="h-12 w-12 text-muted-foreground/50 mb-3" />
        <h3 className="text-base font-semibold">Nenhum hotel encontrado</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Ajuste datas, destino ou quantidade de hóspedes e tente novamente.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {hotels.map((hotel) => (
        <HotelCard key={String(hotel.hotel_id)} hotel={hotel} onClick={onSelectHotel} />
      ))}
    </div>
  );
}
