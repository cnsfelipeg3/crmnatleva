import { useState, useMemo, useEffect } from "react";
import { format, addDays } from "date-fns";
import {
  Search,
  Sparkles,
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
import { HotelscomDetailDrawer } from "@/components/booking-rapidapi/HotelscomDetailDrawer";
import { HotelsPagination } from "@/components/booking-rapidapi/HotelsPagination";
import { HotelFiltersSidebar } from "@/components/booking-rapidapi/HotelFiltersSidebar";
import { UnifiedHotelCard } from "@/components/booking-rapidapi/UnifiedHotelCard";
import {
  useSearchHotels,
  useHotelFilters,
  useHotelscomAutocomplete,
  useHotelscomSearch,
} from "@/hooks/useBookingRapidApi";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import type {
  BookingDestination,
  BookingHotel,
  HotelFiltersState,
} from "@/components/booking-rapidapi/types";
import { emptyHotelFiltersState } from "@/components/booking-rapidapi/types";
import {
  normalizeBookingHotel,
  normalizeHotelscomHotel,
  convertOfferToBRL,
  groupHotelsByIdentity,
  type UnifiedHotel,
  type UnifiedHotelGroup,
  type UnifiedHotelOffer,
  type HotelscomLodgingCard,
} from "@/components/booking-rapidapi/unifiedHotelTypes";

const SORT_OPTIONS = [
  { value: "popularity", label: "Mais populares" },
  { value: "price", label: "Menor preço" },
  { value: "class_descending", label: "Mais estrelas primeiro" },
  { value: "review_score_and_price", label: "Melhor avaliado + preço" },
];

interface ActiveSearch {
  destination: BookingDestination;
  arrival: string;
  departure: string;
  adults: number;
  children: number[];
  rooms: number;
}

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

  const [sources, setSources] = useState<{ booking: boolean; hotelscom: boolean }>({
    booking: true,
    hotelscom: true,
  });

  const [searchParams, setSearchParams] = useState<ActiveSearch | null>(null);
  const [filtersState, setFiltersState] = useState<HotelFiltersState>(() =>
    emptyHotelFiltersState(),
  );
  const [currentPage, setCurrentPage] = useState(1);

  // Drawers separados por fonte
  const [selectedBookingHotel, setSelectedBookingHotel] = useState<BookingHotel | null>(null);
  const [bookingDrawerOpen, setBookingDrawerOpen] = useState(false);
  const [selectedHotelscomCard, setSelectedHotelscomCard] = useState<HotelscomLodgingCard | null>(null);
  const [hotelscomDrawerOpen, setHotelscomDrawerOpen] = useState(false);
  const [selectedOfferConverted, setSelectedOfferConverted] = useState<{
    priceTotal?: number;
    priceStriked?: number;
    priceTaxes?: number;
    currency?: string;
  } | null>(null);

  const { data: exchangeData } = useExchangeRates();
  const rates = exchangeData?.rates ?? null;

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

  // Normalizar + converter BRL + agrupar Trivago
  const hotelGroups: UnifiedHotelGroup[] = useMemo(() => {
    const unified: UnifiedHotel[] = [];
    if (sources.booking && bookingData?.hotels) {
      unified.push(...bookingData.hotels.map(normalizeBookingHotel));
    }
    if (sources.hotelscom && hotelscomData?.cards) {
      unified.push(...hotelscomData.cards.map(normalizeHotelscomHotel));
    }

    const groups = groupHotelsByIdentity(unified);

    return groups.map((g) => {
      const convertedOffers = g.offers.map((o) => convertOfferToBRL(o, rates));
      const sorted = [...convertedOffers].sort((a, b) => {
        const pa = a.priceTotal ?? Infinity;
        const pb = b.priceTotal ?? Infinity;
        return pa - pb;
      });
      const best = sorted.find((o) => typeof o.priceTotal === "number");
      const worst = [...sorted].reverse().find((o) => typeof o.priceTotal === "number");
      let priceDeltaPercent = 0;
      let savings: number | undefined;
      if (
        best &&
        worst &&
        best !== worst &&
        typeof best.priceTotal === "number" &&
        typeof worst.priceTotal === "number" &&
        worst.priceTotal > 0
      ) {
        savings = worst.priceTotal - best.priceTotal;
        priceDeltaPercent = Math.round((savings / worst.priceTotal) * 100);
      }
      return {
        ...g,
        offers: sorted,
        bestOffer: best,
        priceDeltaPercent,
        savings,
        savingsCurrency: best?.priceCurrency,
      };
    });
  }, [sources, bookingData?.hotels, hotelscomData?.cards, rates]);

  const bookingCount = bookingData?.hotels?.length ?? 0;
  const hotelscomCount = hotelscomData?.cards?.length ?? 0;
  const totalCount = hotelGroups.length;

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

  const openOfferDrawer = (offer: UnifiedHotelOffer) => {
    if (offer.source === "booking") {
      setSelectedBookingHotel(offer.raw as BookingHotel);
      setBookingDrawerOpen(true);
    } else if (offer.source === "hotelscom") {
      setSelectedHotelscomCard(offer.raw as HotelscomLodgingCard);
      setSelectedOfferConverted({
        priceTotal: offer.priceTotal,
        priceStriked: offer.priceStriked,
        priceTaxes: offer.priceTaxes,
        currency: offer.priceCurrency,
      });
      setHotelscomDrawerOpen(true);
    }
  };

  const handleCardClick = (group: UnifiedHotelGroup) => {
    const best = group.bestOffer ?? group.offers[0];
    if (best) openOfferDrawer(best);
  };

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Busca Unificada</h1>
            <BetaBadge />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Compara preços em <strong>Booking.com + Hotels.com</strong> no mesmo grid.
            Preços do Hotels.com são convertidos automaticamente para BRL.
          </p>
        </div>
      </div>

      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Hotéis das 2 fontes são agrupados por nome — se o mesmo hotel aparece
          nas duas, você vê as ofertas lado a lado com a melhor destacada em verde.
        </AlertDescription>
      </Alert>

      {/* Formulário */}
      <Card className="p-4">
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Destino</Label>
            <DestinationAutocomplete value={destination} onChange={setDestination} />
          </div>

          <SearchFilters
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            guests={guests}
            onGuestsChange={setGuests}
          />

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <Label className="text-xs font-medium">Fontes:</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={sources.booking}
                onCheckedChange={(c) => setSources({ ...sources, booking: c })}
              />
              <Label className="text-xs flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Booking.com
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={sources.hotelscom}
                onCheckedChange={(c) => setSources({ ...sources, hotelscom: c })}
              />
              <Label className="text-xs flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Hotels.com
              </Label>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              <span>Preços em BRL</span>
              {(bookingData?.cache_hit || hotelscomData?.cache_hit) && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Cloud className="h-3 w-3" />
                  Cache
                </Badge>
              )}
            </div>
            <Button onClick={handleSearch} disabled={!canSearch || isAnyLoading} size="sm">
              <Search className="h-4 w-4 mr-2" />
              {isAnyLoading ? "Buscando..." : "Buscar hotéis"}
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex gap-4">
        {searchParams && sources.booking && (
          <aside className="hidden lg:block w-72 shrink-0">
            <HotelFiltersSidebar
              filters={filtersData?.filters}
              isLoading={filtersLoading}
              state={filtersState}
              onStateChange={setFiltersState}
              filteredCount={filtersData?.pagination?.nbResultsTotal ?? null}
            />
          </aside>
        )}

        <div className="flex-1 min-w-0 space-y-4">
          {searchParams && (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-sm">
                <strong>{totalCount}</strong>{" "}
                {totalCount === 1 ? "hotel encontrado" : "hotéis encontrados"}
                {" em "}
                <strong>{searchParams.destination.label}</strong>
                {sources.booking && sources.hotelscom && (
                  <span className="ml-2 text-xs text-muted-foreground inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    Booking: {bookingCount}
                    <span>·</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    Hotels.com: {hotelscomCount}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden">
                      <SlidersHorizontal className="h-4 w-4 mr-1.5" />
                      Filtros
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 p-4 overflow-y-auto">
                    <SheetTitle className="mb-3">Filtros</SheetTitle>
                    <HotelFiltersSidebar
                      filters={filtersData?.filters}
                      isLoading={filtersLoading}
                      state={filtersState}
                      onStateChange={setFiltersState}
                      filteredCount={filtersData?.pagination?.nbResultsTotal ?? null}
                    />
                  </SheetContent>
                </Sheet>

                <Select
                  value={filtersState.sortBy}
                  onValueChange={(v) => setFiltersState({ ...filtersState, sortBy: v })}
                >
                  <SelectTrigger className="w-[200px] h-9 text-xs">
                    <SelectValue placeholder="Ordenar por..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
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
              <Search className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground max-w-md">
                Informe destino e datas acima para iniciar a busca.
              </p>
            </div>
          ) : isAnyLoading && totalCount === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="aspect-[4/3] w-full" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-8 w-full mt-2" />
                  </div>
                </Card>
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
              {hotelGroups.map((group) => (
                <UnifiedHotelCard
                  key={group.groupKey}
                  group={group}
                  onOfferClick={(offer) => openOfferDrawer(offer)}
                  onCardClick={handleCardClick}
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
              <AlertDescription className="text-xs">
                <strong>Hotels.com</strong> não retornou resultados (pode ser
                instabilidade temporária).
              </AlertDescription>
            </Alert>
          )}

          {bookingData && bookingData.hotels.length > 0 && sources.booking && (
            <HotelsPagination
              currentPage={currentPage}
              totalHotels={filtersData?.pagination?.nbResultsTotal ?? null}
              pageSize={20}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>

      {/* Drawer Booking */}
      <HotelDetailDrawer
        hotel={selectedBookingHotel}
        open={bookingDrawerOpen}
        onOpenChange={setBookingDrawerOpen}
        arrival={searchParams?.arrival ?? null}
        departure={searchParams?.departure ?? null}
        adults={searchParams?.adults ?? 2}
        childrenAges={searchParams?.children ?? []}
        rooms={searchParams?.rooms ?? 1}
      />

      {/* Drawer Hotels.com */}
      <HotelscomDetailDrawer
        card={selectedHotelscomCard}
        open={hotelscomDrawerOpen}
        onOpenChange={setHotelscomDrawerOpen}
        arrival={searchParams?.arrival ?? null}
        departure={searchParams?.departure ?? null}
        adults={searchParams?.adults ?? 2}
        converted={selectedOfferConverted ?? undefined}
      />
    </div>
  );
}
