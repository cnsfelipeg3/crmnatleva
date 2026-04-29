import { useState, useMemo, useEffect } from "react";
import { format, addDays } from "date-fns";
import {
  Search,
  Sparkles,
  Info,
  Cloud,
  SlidersHorizontal,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { UnifiedHotelCard } from "@/components/booking-rapidapi/UnifiedHotelCard";
import { UnifiedHotelDetailDrawer } from "@/components/booking-rapidapi/UnifiedHotelDetailDrawer";
import { HotelsPagination } from "@/components/booking-rapidapi/HotelsPagination";
import { HotelFiltersSidebar } from "@/components/booking-rapidapi/HotelFiltersSidebar";
import {
  HotelscomPremiumFilters,
  emptyHotelscomPremiumFilters,
  premiumFiltersToParams,
  type HotelscomPremiumFiltersState,
} from "@/components/booking-rapidapi/HotelscomPremiumFilters";
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
  convertPriceToBRL,
  groupHotelsByIdentity,
  type UnifiedHotel,
  type UnifiedHotelGroup,
  type UnifiedHotelOffer,
  type HotelSource,
} from "@/components/booking-rapidapi/unifiedHotelTypes";

const SORT_OPTIONS = [
  { value: "popularity", label: "Mais populares" },
  { value: "price", label: "Menor preço" },
  { value: "class_descending", label: "Mais estrelas primeiro" },
  { value: "review_score_and_price", label: "Melhor avaliado + preço" },
];

interface SearchParams {
  destination: BookingDestination;
  arrival: string;
  departure: string;
  adults: number;
  children: number[];
  rooms: number;
}

function extractHotelscomTotalLabel(raw: unknown): string | null {
  const messages = Array.isArray((raw as { summary?: { resultMessages?: Array<{ text?: string }> } } | undefined)?.summary?.resultMessages)
    ? (raw as { summary?: { resultMessages?: Array<{ text?: string }> } }).summary?.resultMessages ?? []
    : [];

  for (const item of messages) {
    const text = typeof item?.text === "string" ? item.text.trim() : "";
    const match = text.match(/(\d[\d.,]*\+?)\s*(properties|property|acomodações|hoteis|hotéis)/i);
    if (match) return match[1];
  }

  return null;
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

  const [sources, setSources] = useState({
    booking: true,
    hotelscom: true,
  });

  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [nameQuery, setNameQuery] = useState("");

  const [filtersState, setFiltersState] = useState<HotelFiltersState>(() =>
    emptyHotelFiltersState(),
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [hotelscomPremium, setHotelscomPremium] = useState<HotelscomPremiumFiltersState>(
    () => emptyHotelscomPremiumFilters(),
  );

  // Drawer unificado (1 hotel = vários providers em tabs)
  const [selectedGroup, setSelectedGroup] = useState<UnifiedHotelGroup | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<HotelSource | undefined>(undefined);

  // Taxas de câmbio (pra converter USD do Hotels.com → BRL)
  const { data: exchangeData } = useExchangeRates();
  const rates = exchangeData?.rates ?? null;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchParams, filtersState, hotelscomPremium]);
  useEffect(() => {
    setFiltersState(emptyHotelFiltersState());
  }, [searchParams?.destination.dest_id]);

  // 1) Filtros Booking
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

  // 2) Booking
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

  // 3) Autocomplete Hotels.com (baseado no nome do destino Booking)
  const destinationName = searchParams?.destination.name || "";
  const { data: hotelscomRegions } = useHotelscomAutocomplete(
    destinationName,
    !!destinationName && sources.hotelscom,
  );
  const hotelscomLocationId = useMemo(() => {
    const cityMatch = hotelscomRegions?.find((r: any) => r.type === "CITY");
    return cityMatch?.gaiaId ?? hotelscomRegions?.[0]?.gaiaId ?? null;
  }, [hotelscomRegions]);

  // 4) Hotels.com
  const {
    data: hotelscomData,
    isLoading: hotelscomLoading,
    isError: hotelscomError,
  } = useHotelscomSearch(
    searchParams && sources.hotelscom && hotelscomLocationId
      ? {
          region_id: hotelscomLocationId,
          checkin_date: searchParams.arrival,
          checkout_date: searchParams.departure,
          adults_number: searchParams.adults,
          children_ages: searchParams.children.join(","),
          domain: "BR",
          locale: "pt_BR",
          page_number: currentPage,
          ...premiumFiltersToParams(hotelscomPremium),
        }
      : null,
  );

  // 5) Hotels.com já vem normalizado em UnifiedHotel — só converte preços pra BRL
  const hotelscomUnified: UnifiedHotel[] = useMemo(() => {
    if (!hotelscomData?.cards) return [];
    return hotelscomData.cards.map((base: UnifiedHotel) => {
      if (base.priceCurrency && base.priceCurrency !== "BRL") {
        const totalConv = convertPriceToBRL(base.priceTotal, base.priceCurrency, rates);
        const strikedConv = convertPriceToBRL(base.priceStriked, base.priceCurrency, rates);
        const perNightConv = convertPriceToBRL(base.pricePerNight, base.priceCurrency, rates);
        return {
          ...base,
          priceTotal: totalConv.value,
          priceCurrency: totalConv.converted ? "BRL" : base.priceCurrency,
          priceStriked: strikedConv.value,
          pricePerNight: perNightConv.value,
          priceFormatted: undefined,
        };
      }
      return base;
    });
  }, [hotelscomData?.cards, rates]);

  // Normalizar Booking
  const bookingUnified: UnifiedHotel[] = useMemo(() => {
    if (!bookingData?.hotels) return [];
    return bookingData.hotels.map(normalizeBookingHotel);
  }, [bookingData?.hotels]);

  // Combinar fontes ativas
  const combinedHotels: UnifiedHotel[] = useMemo(() => {
    const list: UnifiedHotel[] = [];
    if (sources.booking) list.push(...bookingUnified);
    if (sources.hotelscom) list.push(...hotelscomUnified);
    return list;
  }, [bookingUnified, hotelscomUnified, sources.booking, sources.hotelscom]);

  // Agrupar por identidade (Trivago-style)
  const groupedHotels: UnifiedHotelGroup[] = useMemo(
    () => groupHotelsByIdentity(combinedHotels),
    [combinedHotels],
  );

  // Filtro client-side por nome (aplicado nos grupos)
  const filteredGroups = useMemo(() => {
    if (!nameQuery.trim()) return groupedHotels;
    const q = nameQuery.toLowerCase();
    return groupedHotels.filter((g) => g.name.toLowerCase().includes(q));
  }, [groupedHotels, nameQuery]);

  // Contadores
  const bookingPageCount = bookingUnified.length;
  const hotelscomPageCount = hotelscomUnified.length;
  const pageCount = filteredGroups.length;
  const unifiedCount = groupedHotels.filter((g) => g.offers.length > 1).length;

  // Totais reais retornados pelas APIs (todas as páginas)
  const bookingTotal = bookingData?.totalHotels ?? bookingPageCount;
  const hotelscomTotal = hotelscomData?.totalCount ?? hotelscomPageCount;
  const hotelscomTotalLabel = extractHotelscomTotalLabel(hotelscomData?.raw) ?? hotelscomTotal.toLocaleString("pt-BR");
  const grandTotal =
    (sources.booking ? bookingTotal : 0) +
    (sources.hotelscom ? hotelscomTotal : 0);
  const grandTotalLabel =
    sources.hotelscom && hotelscomTotalLabel.includes("+")
      ? `${grandTotal.toLocaleString("pt-BR")}+`
      : grandTotal.toLocaleString("pt-BR");

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

  const handleCardClick = (group: UnifiedHotelGroup) => {
    setSelectedGroup(group);
    setInitialTab(undefined);
    setDrawerOpen(true);
  };

  const handleOfferClick = (offer: UnifiedHotelOffer, group: UnifiedHotelGroup) => {
    setSelectedGroup(group);
    setInitialTab(offer.source);
    setDrawerOpen(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Busca Unificada de Hotéis
            <BetaBadge />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Busca em <strong>Booking.com</strong> + <strong>Hotels.com</strong>.
            Preços do Hotels.com convertidos automaticamente pra BRL.
          </p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Cada fonte tem seu próprio card visual. Hotels.com identificado pelo badge rosa.
          Respostas cacheadas por até 24h.
        </AlertDescription>
      </Alert>

      {/* Formulário */}
      <Card className="p-4 space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Destino</Label>
          <DestinationAutocomplete value={destination} onChange={setDestination} />
        </div>

        <SearchFilters
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          guests={guests}
          onGuestsChange={setGuests}
        />

        <div className="flex flex-wrap items-center gap-4 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Fontes:</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="src-booking"
              checked={sources.booking}
              onCheckedChange={(c) => setSources({ ...sources, booking: c })}
            />
            <Label htmlFor="src-booking" className="text-sm cursor-pointer">Booking.com</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="src-hotelscom"
              checked={sources.hotelscom}
              onCheckedChange={(c) => setSources({ ...sources, hotelscom: c })}
            />
            <Label htmlFor="src-hotelscom" className="text-sm cursor-pointer">Hotels.com</Label>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            Preços em BRL
            {(bookingData?.cache_hit || hotelscomData?.cache_hit) && (
              <Badge variant="secondary" className="ml-2 gap-1">
                <Cloud className="h-3 w-3" />
                Cache
              </Badge>
            )}
          </div>
          <Button onClick={handleSearch} disabled={!canSearch || isAnyLoading} size="lg">
            <Search className="h-4 w-4 mr-2" />
            {isAnyLoading ? "Buscando..." : "Buscar hotéis"}
          </Button>
        </div>
      </Card>

      <div className="flex flex-col lg:flex-row gap-6">
        {searchParams && !filtersCollapsed && (
          <div className="hidden lg:block w-72 shrink-0 relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFiltersCollapsed(true)}
              className="absolute -right-3 top-2 z-10 h-7 w-7 rounded-full bg-background border shadow-sm"
              aria-label="Recolher filtros"
              title="Recolher filtros"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
            <HotelFiltersSidebar
              filters={filtersData?.filters}
              isLoading={filtersLoading}
              state={filtersState}
              onStateChange={setFiltersState}
              nameQuery={nameQuery}
              onNameQueryChange={setNameQuery}
            />
            {sources.hotelscom && (
              <div className="mt-4">
                <HotelscomPremiumFilters
                  state={hotelscomPremium}
                  onStateChange={setHotelscomPremium}
                />
              </div>
            )}
          </div>
        )}

        <div className="flex-1 space-y-4">
          {searchParams && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{grandTotalLabel}</span>{" "}
                {grandTotal === 1 ? "hotel encontrado" : "hotéis encontrados"}
                {" em "}
                <span className="font-medium text-foreground">{searchParams.destination.label}</span>
                {sources.booking && sources.hotelscom && (
                  <span className="ml-2 text-xs">
                    (<span className="text-blue-600 dark:text-blue-400">Booking: {bookingTotal.toLocaleString("pt-BR")}</span>
                    {" · "}
                    <span className="text-rose-600 dark:text-rose-400">Hotels.com: {hotelscomTotalLabel}</span>)
                  </span>
                )}
                {pageCount < grandTotal && (
                  <span className="ml-2 text-xs">· exibindo {pageCount} nesta página</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {filtersCollapsed && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFiltersCollapsed(false)}
                    className="hidden lg:inline-flex"
                  >
                    <PanelLeftOpen className="h-4 w-4 mr-2" />
                    Mostrar filtros
                  </Button>
                )}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden">
                      <SlidersHorizontal className="h-4 w-4 mr-2" />
                      Filtros
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 overflow-y-auto">
                    <SheetTitle>Filtros</SheetTitle>
                    <div className="mt-4">
                      <HotelFiltersSidebar
                        filters={filtersData?.filters}
                        isLoading={filtersLoading}
                        state={filtersState}
                        onStateChange={setFiltersState}
                        nameQuery={nameQuery}
                        onNameQueryChange={setNameQuery}
                      />
                    </div>
                  </SheetContent>
                </Sheet>

                <Select
                  value={filtersState.sortBy}
                  onValueChange={(v) => setFiltersState({ ...filtersState, sortBy: v })}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Busca rápida por nome — só mobile (na sidebar desktop já existe) */}
          {searchParams && (
            <div className="relative lg:hidden">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={nameQuery}
                onChange={(e) => setNameQuery(e.target.value)}
                placeholder="Filtrar por nome do hotel…"
                className="h-10 pl-9 pr-9"
              />
              {nameQuery && (
                <button
                  type="button"
                  onClick={() => setNameQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  aria-label="Limpar busca"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {!searchParams ? (
            <Card className="p-12 text-center">
              <Search className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Informe destino e datas acima para iniciar a busca.
              </p>
            </Card>
          ) : isAnyLoading && pageCount === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="aspect-[4/3] w-full rounded-none" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-5 w-1/3" />
                  </div>
                </Card>
              ))}
            </div>
          ) : pageCount === 0 ? (
            <Card className="p-12 text-center">
              <h3 className="text-lg font-semibold mb-2">Nenhum hotel encontrado</h3>
              <p className="text-sm text-muted-foreground">
                Ajuste datas, destino, nome ou filtros e tente novamente.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredGroups.map((group) => (
                <UnifiedHotelCard
                  key={group.groupKey}
                  group={group}
                  onCardClick={handleCardClick}
                  onOfferClick={handleOfferClick}
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
                <strong>Hotels.com não retornou resultados</strong>{" "}
                (pode ser instabilidade temporária).
              </AlertDescription>
            </Alert>
          )}

          {bookingData && bookingData.hotels.length > 0 && sources.booking && (
            <HotelsPagination
              currentPage={currentPage}
              totalHotels={bookingData.totalHotels ?? null}
              pageSize={bookingData.pageSize ?? bookingData.hotels.length}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>

      {/* Drawer unificado (1 hotel = N abas de providers) */}
      <UnifiedHotelDetailDrawer
        group={selectedGroup}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        arrival={searchParams?.arrival ?? null}
        departure={searchParams?.departure ?? null}
        adults={searchParams?.adults ?? 1}
        childrenAges={searchParams?.children ?? []}
        rooms={searchParams?.rooms ?? 1}
        initialTab={initialTab}
      />
    </div>
  );
}
