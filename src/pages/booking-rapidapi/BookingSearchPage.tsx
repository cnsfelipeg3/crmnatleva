import { useState, useMemo, useEffect } from "react";
import { format, addDays } from "date-fns";
import {
  Search,
  Info,
  Cloud,
  SlidersHorizontal,
  Layers,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BetaBadge } from "@/components/booking-rapidapi/BetaBadge";
import { DestinationAutocomplete } from "@/components/booking-rapidapi/DestinationAutocomplete";
import {
  SearchFilters,
  type GuestsConfig,
} from "@/components/booking-rapidapi/SearchFilters";
import { HotelDetailDrawer } from "@/components/booking-rapidapi/HotelDetailDrawer";
import { HotelsPagination } from "@/components/booking-rapidapi/HotelsPagination";
import { HotelFiltersSidebar } from "@/components/booking-rapidapi/HotelFiltersSidebar";
import { UnifiedHotelCard } from "@/components/booking-rapidapi/UnifiedHotelCard";
import {
  useSearchHotels,
  useHotelFilters,
  useHotelscomAutocomplete,
  useHotelscomSearch,
} from "@/hooks/useBookingRapidApi";
import type {
  BookingDestination,
  BookingHotel,
  HotelFiltersState,
} from "@/components/booking-rapidapi/types";
import { emptyHotelFiltersState } from "@/components/booking-rapidapi/types";
import {
  normalizeBookingHotel,
  normalizeHotelscomHotel,
  groupHotelsByIdentity,
  type HotelSource,
  type UnifiedHotel,
} from "@/components/booking-rapidapi/unifiedHotelTypes";

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

  const [sources, setSources] = useState<Record<HotelSource, boolean>>({
    booking: true,
    hotelscom: true,
  });

  const [searchParams, setSearchParams] = useState<SearchState | null>(null);

  const [filtersState, setFiltersState] = useState<HotelFiltersState>(() =>
    emptyHotelFiltersState(),
  );

  const [currentPage, setCurrentPage] = useState(1);

  const [selectedHotel, setSelectedHotel] = useState<BookingHotel | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Client-side "search by hotel name" filter (applied to unifiedResults)
  const [nameQuery, setNameQuery] = useState("");

  useEffect(() => {
    setCurrentPage(1);
  }, [searchParams, filtersState]);

  useEffect(() => {
    setFiltersState(emptyHotelFiltersState());
    setNameQuery("");
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

  const {
    data: bookingData,
    isLoading: bookingLoading,
    isError: bookingError,
    error: bookingErrorObj,
  } = useSearchHotels(
    searchParams && sources.booking
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

  const destinationName = searchParams?.destination.name || "";
  const { data: hotelscomRegions } = useHotelscomAutocomplete(
    destinationName,
    !!destinationName && sources.hotelscom,
  );

  const hotelscomLocationId = useMemo(() => {
    const cityMatch = hotelscomRegions?.find((r) => r.type === "CITY");
    return cityMatch?.gaiaId ?? hotelscomRegions?.[0]?.gaiaId ?? null;
  }, [hotelscomRegions]);

  const {
    data: hotelscomData,
    isLoading: hotelscomLoading,
    isError: hotelscomError,
  } = useHotelscomSearch(
    searchParams && sources.hotelscom && hotelscomLocationId
      ? {
          locationId: hotelscomLocationId,
          checkinDate: searchParams.arrival,
          checkoutDate: searchParams.departure,
          adults: searchParams.adults,
          children_ages: searchParams.children.join(","),
          currency: "BRL",
          locale: "pt_BR",
          page_number: currentPage,
          sort_order: "RECOMMENDED",
        }
      : null,
  );

  const unifiedResults: UnifiedHotel[] = useMemo(() => {
    const out: UnifiedHotel[] = [];
    if (sources.booking && bookingData?.hotels) {
      out.push(...bookingData.hotels.map(normalizeBookingHotel));
    }
    if (sources.hotelscom && hotelscomData?.cards) {
      out.push(...hotelscomData.cards.map(normalizeHotelscomHotel));
    }
    // Apply client-side name filter
    const q = nameQuery.trim().toLowerCase();
    if (!q) return out;
    return out.filter((h) => h.name?.toLowerCase().includes(q));
  }, [sources, bookingData?.hotels, hotelscomData?.cards, nameQuery]);

  const bookingCount = bookingData?.hotels?.length ?? 0;
  const hotelscomCount = hotelscomData?.cards?.length ?? 0;
  const totalCount = unifiedResults.length;

  const isAnyLoading =
    (sources.booking && bookingLoading) ||
    (sources.hotelscom && hotelscomLoading);

  const canSearch = useMemo(
    () => !!destination && !!dateRange?.from && !!dateRange?.to,
    [destination, dateRange],
  );

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

  const handleSelectHotel = (h: UnifiedHotel) => {
    if (h.source === "booking" && h.raw) {
      setSelectedHotel(h.raw as BookingHotel);
      setDrawerOpen(true);
    } else if (h.externalUrl) {
      window.open(h.externalUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-7xl">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Busca Unificada</h1>
          <BetaBadge />
        </div>
        <p className="text-sm text-muted-foreground">
          Compara preços em <strong>Booking.com + Hotels.com</strong> numa busca
          só. Módulo experimental — isolado do módulo de Hospedagem existente.
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Cada fonte consulta a API uma vez. Respostas cacheadas por até 24h.
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

        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Layers className="h-4 w-4" />
            <span className="font-medium text-foreground">Fontes:</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="src-booking"
              checked={sources.booking}
              onCheckedChange={(c) => setSources({ ...sources, booking: c })}
            />
            <Label htmlFor="src-booking" className="text-sm cursor-pointer">
              Booking.com
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="src-hotelscom"
              checked={sources.hotelscom}
              onCheckedChange={(c) => setSources({ ...sources, hotelscom: c })}
            />
            <Label htmlFor="src-hotelscom" className="text-sm cursor-pointer">
              Hotels.com
            </Label>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            Preços em BRL · Idioma pt-BR
            {(bookingData?.cache_hit || hotelscomData?.cache_hit) && (
              <Badge variant="secondary" className="gap-1 ml-2">
                <Cloud className="h-3 w-3" />
                Cache
              </Badge>
            )}
          </div>
          <Button
            onClick={handleSearch}
            disabled={!canSearch || isAnyLoading || (!sources.booking && !sources.hotelscom)}
            size="lg"
          >
            <Search className="h-4 w-4 mr-2" />
            {isAnyLoading ? "Buscando..." : "Buscar hotéis"}
          </Button>
        </div>
      </Card>

      <div className="flex gap-6">
        {searchParams && sources.booking && (
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-4">
              <HotelFiltersSidebar
                filters={filtersData?.filters}
                isLoading={filtersLoading}
                state={filtersState}
                onStateChange={setFiltersState}
                filteredCount={bookingData?.totalHotels ?? null}
              />
            </div>
          </aside>
        )}

        <div className="flex-1 min-w-0 space-y-4">
          {searchParams && (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm text-muted-foreground">
                <strong className="text-foreground">{totalCount}</strong>{" "}
                {totalCount === 1 ? "hotel encontrado" : "hotéis encontrados"}
                {" em "}
                <strong className="text-foreground">
                  {searchParams.destination.label || searchParams.destination.name}
                </strong>
                {sources.booking && sources.hotelscom && (
                  <span className="ml-2 text-xs">
                    <Badge variant="outline" className="text-xs mr-1">
                      Booking: {bookingCount}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Hotels.com: {hotelscomCount}
                    </Badge>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {sources.booking && (
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
                        filteredCount={bookingData?.totalHotels ?? null}
                      />
                    </SheetContent>
                  </Sheet>
                )}

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

          {!searchParams ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                Informe destino e datas acima para iniciar a busca.
              </p>
            </div>
          ) : isAnyLoading && totalCount === 0 ? (
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
          ) : totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <h3 className="text-base font-semibold">Nenhum hotel encontrado</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Ajuste datas, destino ou filtros e tente novamente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {groupHotelsByIdentity(unifiedResults).map((group) => (
                <UnifiedHotelCard
                  key={group.groupKey}
                  group={group}
                  onCardClick={(g) => {
                    const offer = g.bestOffer ?? g.offers[0];
                    if (!offer) return;
                    const hotel = unifiedResults.find(
                      (h) => h.source === offer.source && h.id === offer.id,
                    );
                    if (hotel) handleSelectHotel(hotel);
                  }}
                  onOfferClick={(offer) => {
                    const hotel = unifiedResults.find(
                      (h) => h.source === offer.source && h.id === offer.id,
                    );
                    if (hotel) handleSelectHotel(hotel);
                  }}
                />
              ))}
            </div>
          )}

          {bookingError && sources.booking && (
            <Alert variant="destructive">
              <AlertDescription>
                <strong>Booking.com falhou:</strong>{" "}
                {(bookingErrorObj as Error)?.message ?? "erro desconhecido"}
              </AlertDescription>
            </Alert>
          )}
          {hotelscomError && sources.hotelscom && (
            <Alert>
              <AlertDescription>
                <strong>Hotels.com</strong> não retornou resultados (pode ser
                instabilidade temporária).
              </AlertDescription>
            </Alert>
          )}

          {bookingData && bookingData.hotels.length > 0 && sources.booking && (
            <HotelsPagination
              currentPage={currentPage}
              totalHotels={bookingData.totalHotels}
              pageSize={bookingData.pageSize}
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
