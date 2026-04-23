import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { format, addDays, parseISO, isValid } from "date-fns";
import {
  Search,
  Info,
  Cloud,
  ArrowRightLeft,
  Plane,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { BetaBadge } from "@/components/booking-rapidapi/BetaBadge";
import { AirportAutocomplete } from "@/components/booking-rapidapi/AirportAutocomplete";
import {
  FlightSearchFilters,
  type FlightPassengers,
  type TripType,
} from "@/components/booking-rapidapi/FlightSearchFilters";
import { FlightResultsList } from "@/components/booking-rapidapi/FlightResultsList";
import { FlightDetailDrawer } from "@/components/booking-rapidapi/FlightDetailDrawer";
import { FlightsPagination } from "@/components/booking-rapidapi/FlightsPagination";
import { useSearchFlights } from "@/hooks/useBookingRapidApi";
import type {
  CabinClass,
  FlightLocation,
  FlightOffer,
  FlightSort,
} from "@/components/booking-rapidapi/flightTypes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SORT_OPTIONS: { value: FlightSort; label: string }[] = [
  { value: "BEST", label: "Recomendados" },
  { value: "CHEAPEST", label: "Mais baratos" },
  { value: "FASTEST", label: "Mais rápidos" },
  { value: "EARLIEST_DEPARTURE", label: "Saída mais cedo" },
  { value: "LATEST_DEPARTURE", label: "Saída mais tarde" },
];

const VALID_SORTS: FlightSort[] = SORT_OPTIONS.map((o) => o.value);
const VALID_CABINS: CabinClass[] = [
  "ECONOMY",
  "PREMIUM_ECONOMY",
  "BUSINESS",
  "FIRST",
];

interface SearchSnapshot {
  from: FlightLocation;
  to: FlightLocation;
  departDate: string;
  returnDate: string;
  adults: number;
  children: string;
  cabinClass: CabinClass;
}

/**
 * URL params (compartilháveis):
 *  fromId, fromCode, fromName, fromType  → origem
 *  toId,   toCode,   toName,   toType    → destino
 *  dep (YYYY-MM-DD), ret (YYYY-MM-DD opcional)
 *  adults, children (CSV de idades), cabin (ECONOMY...)
 *  sort (BEST...), page (1+)
 *
 * Faltando origem/destino/dep ⇒ não dispara busca (URL apenas pré-preenche).
 */
function buildLocationFromParams(
  prefix: "from" | "to",
  sp: URLSearchParams,
): FlightLocation | null {
  const id = sp.get(`${prefix}Id`);
  const code = sp.get(`${prefix}Code`);
  if (!id || !code) return null;
  const type = (sp.get(`${prefix}Type`) || "AIRPORT") as "AIRPORT" | "CITY";
  return {
    id,
    code,
    type,
    name: sp.get(`${prefix}Name`) || code,
  };
}

function parseDateParam(value: string | null): Date | undefined {
  if (!value) return undefined;
  const d = parseISO(value);
  return isValid(d) ? d : undefined;
}

export default function FlightsSearchPage() {
  const [urlParams, setUrlParams] = useSearchParams();

  // --- 1) Inicialização a partir da URL (uma vez) -----------------
  const initial = useMemo(() => {
    const fromLoc = buildLocationFromParams("from", urlParams);
    const toLoc = buildLocationFromParams("to", urlParams);
    const dep = parseDateParam(urlParams.get("dep"));
    const ret = parseDateParam(urlParams.get("ret"));
    const adultsRaw = parseInt(urlParams.get("adults") || "1", 10);
    const adults = Number.isFinite(adultsRaw) && adultsRaw > 0 ? adultsRaw : 1;
    const childrenCsv = urlParams.get("children") || "";
    const children = childrenCsv
      ? childrenCsv
          .split(",")
          .map((s) => parseInt(s, 10))
          .filter((n) => Number.isFinite(n) && n >= 0 && n <= 17)
      : [];
    const cabinRaw = urlParams.get("cabin") as CabinClass | null;
    const cabinClass: CabinClass = cabinRaw && VALID_CABINS.includes(cabinRaw)
      ? cabinRaw
      : "ECONOMY";
    const sortRaw = urlParams.get("sort") as FlightSort | null;
    const sort: FlightSort = sortRaw && VALID_SORTS.includes(sortRaw)
      ? sortRaw
      : "BEST";
    const pageRaw = parseInt(urlParams.get("page") || "1", 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

    const tripType: TripType = ret ? "roundtrip" : dep ? "oneway" : "roundtrip";
    return {
      fromLoc,
      toLoc,
      dep,
      ret,
      adults,
      children,
      cabinClass,
      sort,
      page,
      tripType,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // só na montagem

  // --- 2) Estado local ---------------------------------------------
  const [from, setFrom] = useState<FlightLocation | null>(initial.fromLoc);
  const [to, setTo] = useState<FlightLocation | null>(initial.toLoc);
  const [tripType, setTripType] = useState<TripType>(initial.tripType);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (initial.dep && initial.ret) return { from: initial.dep, to: initial.ret };
    if (initial.dep) return { from: initial.dep, to: undefined };
    const today = new Date();
    return { from: addDays(today, 30), to: addDays(today, 37) };
  });
  const [oneWayDate, setOneWayDate] = useState<Date | undefined>(
    initial.dep ?? addDays(new Date(), 30),
  );
  const [passengers, setPassengers] = useState<FlightPassengers>({
    adults: initial.adults,
    children: initial.children,
  });
  const [cabinClass, setCabinClass] = useState<CabinClass>(initial.cabinClass);
  const [sort, setSort] = useState<FlightSort>(initial.sort);

  const [searchParams, setSearchParams] = useState<SearchSnapshot | null>(() => {
    if (!initial.fromLoc || !initial.toLoc || !initial.dep) return null;
    return {
      from: initial.fromLoc,
      to: initial.toLoc,
      departDate: format(initial.dep, "yyyy-MM-dd"),
      returnDate: initial.ret ? format(initial.ret, "yyyy-MM-dd") : "",
      adults: initial.adults,
      children: initial.children.join(","),
      cabinClass: initial.cabinClass,
    };
  });

  const [currentPage, setCurrentPage] = useState(initial.page);

  // Reset pra página 1 só quando a busca em si muda (não no boot).
  // Sort também volta pra página 1, conforme já era o comportamento.
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    setCurrentPage(1);
  }, [searchParams, sort]);

  const [selectedOffer, setSelectedOffer] = useState<FlightOffer | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // --- 3) Sincronização ESTADO → URL -------------------------------
  useEffect(() => {
    const next = new URLSearchParams();
    if (searchParams) {
      next.set("fromId", searchParams.from.id);
      next.set("fromCode", searchParams.from.code);
      if (searchParams.from.type) next.set("fromType", searchParams.from.type);
      if (searchParams.from.name) next.set("fromName", searchParams.from.name);

      next.set("toId", searchParams.to.id);
      next.set("toCode", searchParams.to.code);
      if (searchParams.to.type) next.set("toType", searchParams.to.type);
      if (searchParams.to.name) next.set("toName", searchParams.to.name);

      next.set("dep", searchParams.departDate);
      if (searchParams.returnDate) next.set("ret", searchParams.returnDate);

      next.set("adults", String(searchParams.adults));
      if (searchParams.children) next.set("children", searchParams.children);
      next.set("cabin", searchParams.cabinClass);

      if (sort && sort !== "BEST") next.set("sort", sort);
      if (currentPage > 1) next.set("page", String(currentPage));
    }
    // Evita histórico poluído: usa replace (botão "voltar" continua útil).
    setUrlParams(next, { replace: true });
  }, [searchParams, sort, currentPage, setUrlParams]);

  // --- 4) Busca ----------------------------------------------------
  const { data, isLoading, isError, error } = useSearchFlights(
    searchParams
      ? {
          fromId: searchParams.from.id,
          toId: searchParams.to.id,
          departDate: searchParams.departDate,
          returnDate: searchParams.returnDate,
          adults: searchParams.adults,
          children: searchParams.children,
          cabinClass: searchParams.cabinClass,
          sort,
          pageNo: currentPage,
          currency_code: "BRL",
        }
      : null,
  );

  const canSearch = useMemo(() => {
    if (!from || !to) return false;
    if (tripType === "roundtrip") return !!dateRange?.from && !!dateRange?.to;
    return !!oneWayDate;
  }, [from, to, tripType, dateRange, oneWayDate]);

  const handleSearch = () => {
    if (!from || !to) return;
    const depart = tripType === "roundtrip" ? dateRange?.from : oneWayDate;
    if (!depart) return;
    const ret =
      tripType === "roundtrip" && dateRange?.to ? dateRange.to : null;

    setSearchParams({
      from,
      to,
      departDate: format(depart, "yyyy-MM-dd"),
      returnDate: ret ? format(ret, "yyyy-MM-dd") : "",
      adults: passengers.adults,
      children: passengers.children.join(","),
      cabinClass,
    });
  };

  const handleSelectOffer = (offer: FlightOffer) => {
    setSelectedOffer(offer);
    setDrawerOpen(true);
  };

  const swapAirports = () => {
    const f = from;
    setFrom(to);
    setTo(f);
  };

  return (
    <div className="container mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Plane className="h-6 w-6 text-primary" />
            Busca de Voos
          </h1>
          <BetaBadge />
        </div>
        <p className="text-sm text-muted-foreground">
          Busca de passagens aéreas em tempo real via Booking.com (API RapidAPI).
          Módulo experimental — isolado do módulo de voos existente.
        </p>
      </div>

      {/* Aviso */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Plano Basic (Free)</strong> — limite compartilhado de 50
          requests/mês (hotéis + voos). Respostas cacheadas por até 30 min.
        </AlertDescription>
      </Alert>

      {/* Formulário */}
      <Card className="p-4 md:p-5">
        <div className="space-y-4">
          {/* Origem / Swap / Destino */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr] md:items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Origem
              </Label>
              <AirportAutocomplete
                value={from}
                onChange={setFrom}
                placeholder="De onde sai? Ex: GRU, São Paulo..."
                icon="plane"
              />
            </div>
            <div className="flex items-end justify-center pb-0.5 md:pb-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={swapAirports}
                disabled={!from && !to}
                title="Inverter origem e destino"
              >
                <ArrowRightLeft className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Destino
              </Label>
              <AirportAutocomplete
                value={to}
                onChange={setTo}
                placeholder="Para onde vai? Ex: JFK, Nova York..."
                icon="mapPin"
              />
            </div>
          </div>

          <FlightSearchFilters
            tripType={tripType}
            onTripTypeChange={setTripType}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            oneWayDate={oneWayDate}
            onOneWayDateChange={setOneWayDate}
            passengers={passengers}
            onPassengersChange={setPassengers}
            cabinClass={cabinClass}
            onCabinClassChange={setCabinClass}
          />

          <div className="flex flex-col items-stretch justify-between gap-3 border-t border-border pt-4 md:flex-row md:items-center">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              Preços em BRL
              {data?.cache_hit && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Cloud className="h-3 w-3" />
                  Cache
                </Badge>
              )}
            </div>
            <Button
              onClick={handleSearch}
              disabled={!canSearch || isLoading}
              className="gap-2 md:min-w-[180px]"
            >
              <Search className="h-4 w-4" />
              {isLoading ? "Buscando voos..." : "Buscar voos"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Ordenação */}
      {data && data.offers.length > 0 && (
        <div className="flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-center">
          <div className="text-sm text-muted-foreground">
            {data.totalCount !== null ? (
              <>
                <strong className="text-foreground">
                  {data.totalCount.toLocaleString("pt-BR")}
                </strong>{" "}
                {data.totalCount === 1 ? "voo encontrado" : "voos encontrados"}
              </>
            ) : (
              <>
                <strong className="text-foreground">
                  {data.offers.length}
                </strong>{" "}
                {data.offers.length === 1
                  ? "voo encontrado"
                  : "voos encontrados"}
              </>
            )}
            {searchParams && (
              <>
                {" de "}
                <span className="font-mono">{searchParams.from.code}</span>
                {" para "}
                <span className="font-mono">{searchParams.to.code}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Label className="shrink-0 text-xs text-muted-foreground">
              Ordenar por:
            </Label>
            <Select
              value={sort}
              onValueChange={(v) => setSort(v as FlightSort)}
            >
              <SelectTrigger className="h-9 w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Resultados */}
      <FlightResultsList
        offers={data?.offers}
        deals={data?.deals ?? []}
        isLoading={isLoading}
        isError={isError}
        error={error as Error | null}
        onSelectOffer={handleSelectOffer}
        hasSearched={!!searchParams}
        adults={passengers.adults}
      />

      {/* Paginação — aparece quando tem resultados */}
      {data && data.offers.length > 0 && (
        <FlightsPagination
          currentPage={currentPage}
          totalCount={data.totalCount}
          pageSize={data.pageSize}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Drawer */}
      <FlightDetailDrawer
        offer={selectedOffer}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        adults={passengers.adults}
      />
    </div>
  );
}
