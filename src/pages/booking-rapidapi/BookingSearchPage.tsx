import { useState, useMemo, useEffect } from "react";
import { format, addDays } from "date-fns";
import { Search, Info, Cloud, SlidersHorizontal } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BetaBadge } from "@/components/booking-rapidapi/BetaBadge";
import { DestinationAutocomplete } from "@/components/booking-rapidapi/DestinationAutocomplete";
import {
  SearchFilters,
  type GuestsConfig,
} from "@/components/booking-rapidapi/SearchFilters";
import { HotelResultsGrid } from "@/components/booking-rapidapi/HotelResultsGrid";
import { HotelDetailDrawer } from "@/components/booking-rapidapi/HotelDetailDrawer";
import { HotelsPagination } from "@/components/booking-rapidapi/HotelsPagination";
import { HotelFiltersSidebar } from "@/components/booking-rapidapi/HotelFiltersSidebar";
import {
  useSearchHotels,
  useHotelFilters,
} from "@/hooks/useBookingRapidApi";
import type {
  BookingDestination,
  BookingHotel,
  HotelFiltersState,
} from "@/components/booking-rapidapi/types";
import { emptyHotelFiltersState } from "@/components/booking-rapidapi/types";

interface SearchState {
  destination: BookingDestination;
  arrival: string;
  departure: string;
  adults: number;
  children: number[];
  rooms: number;
}

const SORT_OPTIONS = [
  { value: "popularity", label: "Mais populares" },
  { value: "price", label: "Menor preço" },
  { value: "class_descending", label: "Mais estrelas primeiro" },
  { value: "class_ascending", label: "Menos estrelas primeiro" },
  { value: "distance_from_search", label: "Mais próximos do centro" },
  { value: "review_score_and_price", label: "Melhor avaliado + preço" },
];

export default function BookingSearchPage() {
  const [destination, setDestination] = useState<BookingDestination | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    return { from: addDays(today, 14), to: addDays(today, 17) };
  });
  const [guests, setGuests] = useState<GuestsConfig>({
    adults: 2,
    children: [],
    rooms: 1,
  });

  const [searchParams, setSearchParams] = useState<SearchState | null>(null);

  const [filtersState, setFiltersState] = useState<HotelFiltersState>(() =>
    emptyHotelFiltersState(),
  );

  const [currentPage, setCurrentPage] = useState(1);

  const [selectedHotel, setSelectedHotel] = useState<BookingHotel | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchParams, filtersState]);

  useEffect(() => {
    setFiltersState(emptyHotelFiltersState());
  }, [searchParams?.destination.dest_id]);

  const { data: filtersData, isLoading: filtersLoading } = useHotelFilters(
    searchParams
      ? {
          dest_id: searchParams.destination.dest_id,
          search_type: searchParams.destination.search_type,
          arrival_date: searchParams.arrival,
          departure_date: searchParams.departure,
          adults: searchParams.adults,
          children_age: searchParams.children.join(","),
          room_qty: searchParams.rooms,
        }
      : null,
  );

  const categoriesFilterStr = useMemo(
    () =>
      filtersState.categoriesSelected.size > 0
        ? Array.from(filtersState.categoriesSelected).join(",")
        : undefined,
    [filtersState.categoriesSelected],
  );

  const { data, isLoading, isError, error } = useSearchHotels(
    searchParams
      ? {
          dest_id: searchParams.destination.dest_id,
          search_type: searchParams.destination.search_type,
          arrival_date: searchParams.arrival,
          departure_date: searchParams.departure,
          adults: searchParams.adults,
          children_age: searchParams.children.join(","),
          room_qty: searchParams.rooms,
          page_number: currentPage,
          categories_filter: categoriesFilterStr,
          price_min: filtersState.priceMin,
          price_max: filtersState.priceMax,
          sort_by: filtersState.sortBy,
        }
      : null,
  );

  const canSearch = useMemo(() => {
    return !!destination && !!dateRange?.from && !!dateRange?.to;
  }, [destination, dateRange]);

  const handleSearch = () => {
    if (!destination || !dateRange?.from || !dateRange?.to) return;
    setSearchParams({
      destination,
      arrival: format(dateRange.from, "yyyy-MM-dd"),
      departure: format(dateRange.to, "yyyy-MM-dd"),
      adults: guests.adults,
      children: guests.children,
      rooms: guests.rooms,
    });
  };

  const handleSelectHotel = (hotel: BookingHotel) => {
    setSelectedHotel(hotel);
    setDrawerOpen(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-7xl">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Busca Booking</h1>
          <BetaBadge />
        </div>
        <p className="text-sm text-muted-foreground">
          Busca de hotéis em tempo real via Booking.com (API RapidAPI). Módulo experimental — isolado do módulo de Hospedagem existente.
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Integração em plano <strong>Basic (Free)</strong> — limite de 50 requests/mês. Respostas são cacheadas por até 24h para economizar consumo.
        </AlertDescription>
      </Alert>

      <Card className="p-5 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Destino</Label>
          <DestinationAutocomplete value={destination} onChange={setDestination} />
        </div>

        <SearchFilters
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          guests={guests}
          onGuestsChange={setGuests}
        />

        <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            Preços em BRL · Idioma pt-BR
            {data?.cache_hit && (
              <Badge variant="secondary" className="gap-1 ml-2">
                <Cloud className="h-3 w-3" />
                Cache
              </Badge>
            )}
          </div>
          <Button onClick={handleSearch} disabled={!canSearch || isLoading} size="lg">
            <Search className="h-4 w-4 mr-2" />
            {isLoading ? "Buscando..." : "Buscar hotéis"}
          </Button>
        </div>
      </Card>

      {/* Layout com sidebar (desktop) / drawer (mobile) */}
      <div className="flex gap-6">
        {/* Sidebar desktop */}
        {searchParams && (
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-4">
              <HotelFiltersSidebar
                filters={filtersData?.filters}
                isLoading={filtersLoading}
                state={filtersState}
                onStateChange={setFiltersState}
                filteredCount={data?.totalHotels ?? null}
              />
            </div>
          </aside>
        )}

        {/* Conteúdo principal */}
        <div className="flex-1 min-w-0 space-y-4">
          {data && searchParams && (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm text-muted-foreground">
                {data.totalHotels !== null ? (
                  <>
                    <strong className="text-foreground">
                      {data.totalHotels.toLocaleString("pt-BR")}
                    </strong>{" "}
                    {data.totalHotels === 1
                      ? "acomodação encontrada"
                      : "acomodações encontradas"}
                  </>
                ) : (
                  <>
                    <strong className="text-foreground">{data.hotels.length}</strong>{" "}
                    {data.hotels.length === 1 ? "hotel encontrado" : "hotéis encontrados"}
                  </>
                )}
                {" em "}
                <strong className="text-foreground">
                  {searchParams.destination.label || searchParams.destination.name}
                </strong>
              </div>

              <div className="flex items-center gap-2">
                {/* Botão de filtros (mobile) */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden gap-2">
                      <SlidersHorizontal className="h-4 w-4" />
                      Filtros
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 overflow-y-auto">
                    <SheetTitle className="mb-4">Filtros</SheetTitle>
                    <HotelFiltersSidebar
                      filters={filtersData?.filters}
                      isLoading={filtersLoading}
                      state={filtersState}
                      onStateChange={setFiltersState}
                      filteredCount={data?.totalHotels ?? null}
                    />
                  </SheetContent>
                </Sheet>

                {/* Ordenação */}
                <Select
                  value={filtersState.sortBy ?? ""}
                  onValueChange={(v) =>
                    setFiltersState({ ...filtersState, sortBy: v || undefined })
                  }
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Ordenar por..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <HotelResultsGrid
            hotels={data?.hotels}
            isLoading={isLoading}
            isError={isError}
            error={error as Error | null}
            onSelectHotel={handleSelectHotel}
            hasSearched={!!searchParams}
          />

          {data && data.hotels.length > 0 && (
            <HotelsPagination
              currentPage={currentPage}
              totalHotels={data.totalHotels}
              pageSize={data.pageSize}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>

      <HotelDetailDrawer
        hotel={selectedHotel}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        arrival={searchParams?.arrival ?? null}
        departure={searchParams?.departure ?? null}
        adults={searchParams?.adults ?? 2}
        childrenAges={searchParams?.children ?? []}
        rooms={searchParams?.rooms ?? 1}
      />
    </div>
  );
}
