import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format, addDays, parseISO, isValid } from "date-fns";
import {
  Search, Info, Cloud, ArrowRightLeft, Plane, Calendar as CalIcon,
  TrendingUp, List as ListIcon, Users as UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BetaBadge } from "@/components/booking-rapidapi/BetaBadge";
import { GFlightAirportAutocomplete } from "@/components/google-flights/GFlightAirportAutocomplete";
import { GFlightResultsList } from "@/components/google-flights/GFlightResultsList";
import { GFlightCalendarHeatmap } from "@/components/google-flights/GFlightCalendarHeatmap";
import { GFlightPriceTrendChart } from "@/components/google-flights/GFlightPriceTrendChart";
import { GFlightPriceInsightBanner } from "@/components/google-flights/GFlightPriceInsightBanner";
import { GFlightPriceHistoryChart } from "@/components/google-flights/GFlightPriceHistoryChart";
import { GFlightDiscoverPanel } from "@/components/google-flights/GFlightDiscoverPanel";
import {
  useSearchGFlights,
  useCalendarPicker,
  usePriceGraph,
  priceGraphToCalendar,
  type SearchGFlightsInput,
} from "@/hooks/useGoogleFlights";
import type { GAirport, GCalendarDay, GFlightCabin, GFlightFilters, GFlightItinerary } from "@/components/google-flights/gflightsTypes";
import { formatBRL, DEFAULT_GFLIGHT_FILTERS } from "@/components/google-flights/gflightsTypes";
import { GFlightFiltersSidebar, applyFilters } from "@/components/google-flights/GFlightFiltersSidebar";
import { GFlightDetailDrawer } from "@/components/google-flights/GFlightDetailDrawer";
import { GFlightLegsBuilder, type MultiLeg } from "@/components/google-flights/GFlightLegsBuilder";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const VALID_CABINS: GFlightCabin[] = ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"];

const CABIN_LABELS: Record<GFlightCabin, string> = {
  ECONOMY: "Econômica",
  PREMIUM_ECONOMY: "Econômica Premium",
  BUSINESS: "Executiva",
  FIRST: "Primeira Classe",
};

function buildAirport(prefix: "from" | "to", sp: URLSearchParams): GAirport | null {
  const id = sp.get(`${prefix}Id`);
  if (!id) return null;
  return {
    id: id.toUpperCase(),
    name: sp.get(`${prefix}Name`) || undefined,
    city: sp.get(`${prefix}City`) || undefined,
    country: sp.get(`${prefix}Country`) || undefined,
    type: (sp.get(`${prefix}Type`) as any) || "AIRPORT",
  };
}

function parseDateParam(v: string | null): Date | undefined {
  if (!v) return undefined;
  const d = parseISO(v);
  return isValid(d) ? d : undefined;
}

interface SearchSnapshot {
  from: GAirport;
  to: GAirport;
  outbound_date: string;
  return_date?: string;
  adults: number;
  travel_class: GFlightCabin;
  multi_legs?: Array<{ departure_id: string; arrival_id: string; date: string }>;
}

export default function GoogleFlightsSearchPage() {
  const [urlParams, setUrlParams] = useSearchParams();

  const initial = useMemo(() => {
    const from = buildAirport("from", urlParams);
    const to = buildAirport("to", urlParams);
    const dep = parseDateParam(urlParams.get("dep"));
    const ret = parseDateParam(urlParams.get("ret"));
    const adultsRaw = parseInt(urlParams.get("adults") || "1", 10);
    const adults = Number.isFinite(adultsRaw) && adultsRaw > 0 ? adultsRaw : 1;
    const cabinRaw = urlParams.get("cabin") as GFlightCabin | null;
    const travel_class: GFlightCabin =
      cabinRaw && VALID_CABINS.includes(cabinRaw) ? cabinRaw : "ECONOMY";
    const tab = urlParams.get("tab") || "list";
    return { from, to, dep, ret, adults, travel_class, tab };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [from, setFrom] = useState<GAirport | null>(initial.from);
  const [to, setTo] = useState<GAirport | null>(initial.to);
  const [outboundDate, setOutboundDate] = useState<Date | undefined>(
    initial.dep ?? addDays(new Date(), 30),
  );
  const [returnDate, setReturnDate] = useState<Date | undefined>(initial.ret);
  const [adults, setAdults] = useState<number>(initial.adults);
  const [travelClass, setTravelClass] = useState<GFlightCabin>(initial.travel_class);
  const [tab, setTab] = useState<string>(initial.tab);
  const [outerTab, setOuterTab] = useState<"search" | "discover">(
    () => (urlParams.get("outerTab") as "search" | "discover") || "search",
  );
  const [selectedItinerary, setSelectedItinerary] = useState<GFlightItinerary | null>(null);
  const [filters, setFilters] = useState<GFlightFilters>(DEFAULT_GFLIGHT_FILTERS);
  const [showPriceHistory, setShowPriceHistory] = useState(false);

  const [tripMode, setTripMode] = useState<"round" | "oneway" | "multi">(
    () => (initial.ret ? "round" : "oneway"),
  );
  const [multiLegs, setMultiLegs] = useState<MultiLeg[]>([
    { from: null, to: null, date: undefined },
    { from: null, to: null, date: undefined },
  ]);

  const [snapshot, setSnapshot] = useState<SearchSnapshot | null>(() => {
    if (!initial.from || !initial.to || !initial.dep) return null;
    return {
      from: initial.from,
      to: initial.to,
      outbound_date: format(initial.dep, "yyyy-MM-dd"),
      return_date: initial.ret ? format(initial.ret, "yyyy-MM-dd") : undefined,
      adults: initial.adults,
      travel_class: initial.travel_class,
    };
  });

  // Sync ESTADO → URL
  useEffect(() => {
    const next = new URLSearchParams();
    if (snapshot) {
      next.set("fromId", snapshot.from.id);
      if (snapshot.from.name) next.set("fromName", snapshot.from.name);
      if (snapshot.from.city) next.set("fromCity", snapshot.from.city);
      if (snapshot.from.country) next.set("fromCountry", snapshot.from.country);
      if (snapshot.from.type) next.set("fromType", String(snapshot.from.type));
      next.set("toId", snapshot.to.id);
      if (snapshot.to.name) next.set("toName", snapshot.to.name);
      if (snapshot.to.city) next.set("toCity", snapshot.to.city);
      if (snapshot.to.country) next.set("toCountry", snapshot.to.country);
      if (snapshot.to.type) next.set("toType", String(snapshot.to.type));
      next.set("dep", snapshot.outbound_date);
      if (snapshot.return_date) next.set("ret", snapshot.return_date);
      next.set("adults", String(snapshot.adults));
      next.set("cabin", snapshot.travel_class);
      if (tab && tab !== "list") next.set("tab", tab);
    }
    setUrlParams(next, { replace: true });
  }, [snapshot, tab, setUrlParams]);

  const searchInput: SearchGFlightsInput | null = snapshot
    ? (snapshot.multi_legs && snapshot.multi_legs.length >= 2
        ? {
            departure_id: snapshot.multi_legs[0].departure_id,
            arrival_id: snapshot.multi_legs[snapshot.multi_legs.length - 1].arrival_id,
            outbound_date: snapshot.multi_legs[0].date,
            adults: snapshot.adults,
            travel_class: snapshot.travel_class,
            currency: "BRL",
            trip_type: "3",
            multi_city_json: JSON.stringify(snapshot.multi_legs),
            legs: snapshot.multi_legs,
          }
        : {
            departure_id: snapshot.from.id,
            arrival_id: snapshot.to.id,
            outbound_date: snapshot.outbound_date,
            return_date: snapshot.return_date,
            adults: snapshot.adults,
            travel_class: snapshot.travel_class,
            currency: "BRL",
            trip_type: snapshot.return_date ? "1" : "2",
          })
    : null;

  const { data: results, isLoading, isError, error } = useSearchGFlights(searchInput);
  const { data: trend = [], isLoading: trendLoading } = usePriceGraph(searchInput, !!snapshot);
  const { data: calendarApi = [], isLoading: calApiLoading } = useCalendarPicker(searchInput, false);

  const calendar: GCalendarDay[] = useMemo(() => {
    if (calendarApi.length > 0) return calendarApi;
    return priceGraphToCalendar(trend);
  }, [calendarApi, trend]);
  const calLoading = calApiLoading || (calendarApi.length === 0 && trendLoading);

  const trendInsights = useMemo(() => {
    const prices = trend.map(p => p.price).filter((p): p is number => typeof p === "number" && Number.isFinite(p));
    if (!prices.length) return null;
    const sorted = [...prices].sort((a, b) => a - b);
    const lowest = sorted[0];
    const highest = sorted[sorted.length - 1];
    const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
    const median = sorted[Math.floor(sorted.length / 2)];
    const bestDay = trend.find(p => p.price === lowest)?.date;
    const selectedPrice = snapshot
      ? trend.find(p => p.date === snapshot.outbound_date)?.price ?? null
      : null;
    let savingsVsSelected: number | null = null;
    if (selectedPrice !== null && lowest < selectedPrice) {
      savingsVsSelected = selectedPrice - lowest;
    }
    return { lowest, highest, avg, median, bestDay, selectedPrice, savingsVsSelected, count: prices.length };
  }, [trend, snapshot]);

  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  const updatedAgoLabel = useMemo(() => {
    if (!results?.fetched_at) return null;
    const t = new Date(results.fetched_at).getTime();
    if (!Number.isFinite(t)) return null;
    const diffSec = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (diffSec < 60) return `atualizado agora`;
    const min = Math.round(diffSec / 60);
    if (min < 60) return `atualizado há ${min} min`;
    const h = Math.round(min / 60);
    return `atualizado há ${h}h`;
  }, [results?.fetched_at]);

  const canSearch = useMemo(() => {
    if (tripMode === "multi") {
      return multiLegs.length >= 2 && multiLegs.every(l => l.from && l.to && l.date);
    }
    return !!from && !!to && !!outboundDate;
  }, [tripMode, multiLegs, from, to, outboundDate]);

  const handleSearch = () => {
    if (tripMode === "multi") {
      const valid = multiLegs.length >= 2 && multiLegs.every(l => l.from && l.to && l.date);
      if (!valid) {
        toast.error("Preencha origem, destino e data de cada trecho");
        return;
      }
      setSnapshot({
        from: multiLegs[0].from!,
        to: multiLegs[multiLegs.length - 1].to!,
        outbound_date: format(multiLegs[0].date!, "yyyy-MM-dd"),
        return_date: undefined,
        adults,
        travel_class: travelClass,
        multi_legs: multiLegs.map(l => ({
          departure_id: l.from!.id,
          arrival_id: l.to!.id,
          date: format(l.date!, "yyyy-MM-dd"),
        })),
      });
      return;
    }
    if (!from || !to || !outboundDate) return;
    setSnapshot({
      from,
      to,
      outbound_date: format(outboundDate, "yyyy-MM-dd"),
      return_date: tripMode === "round" && returnDate ? format(returnDate, "yyyy-MM-dd") : undefined,
      adults,
      travel_class: travelClass,
    });
  };

  const swap = () => {
    const f = from;
    setFrom(to);
    setTo(f);
  };

  const handleCalendarSelect = (dateStr: string) => {
    const d = parseISO(dateStr);
    if (!isValid(d)) return;
    setOutboundDate(d);
    if (snapshot) {
      setSnapshot({ ...snapshot, outbound_date: dateStr });
    }
    setTab("list");
  };

  return (
    <div className="container mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Plane className="h-6 w-6 text-primary" />
            Google Flights
          </h1>
          <BetaBadge />
        </div>
        <p className="text-sm text-muted-foreground">
          Busca de passagens via Google Flights (DataCrawler · RapidAPI). Calendário de preços
          + tendência mensal · módulo experimental isolado.
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Scraper do Google Flights tem latência de até 5 segundos por consulta. Respostas
          ficam em cache por até 6 horas (calendário/tendência) ou 30 minutos (resultados).
        </AlertDescription>
      </Alert>

      <Tabs
        value={outerTab}
        onValueChange={(v) => setOuterTab(v as "search" | "discover")}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-grid">
          <TabsTrigger value="search" className="gap-2">
            <Search className="h-4 w-4" /> Busca específica
          </TabsTrigger>
          <TabsTrigger value="discover" className="gap-2">
            <Plane className="h-4 w-4" /> Descobrir com IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover">
          <GFlightDiscoverPanel
            onSelectDestination={(dest, ctx) => {
              const originId = ctx.extracted.origin || "GRU";
              setFrom({ id: originId, name: originId, type: "AIRPORT" });
              setTo({ id: dest.iata, name: dest.city, city: dest.city, country: dest.country, type: "AIRPORT" });
              const dep = parseISO(ctx.period.day1);
              const ret = parseISO(ctx.period.returnDate);
              if (isValid(dep)) setOutboundDate(dep);
              if (isValid(ret)) setReturnDate(ret);
              setAdults(ctx.extracted.paxAdults || 1);
              setTravelClass("ECONOMY");
              setSnapshot({
                from: { id: originId, name: originId, type: "AIRPORT" },
                to: { id: dest.iata, name: dest.city, city: dest.city, country: dest.country, type: "AIRPORT" },
                outbound_date: ctx.period.day1,
                return_date: ctx.period.returnDate,
                adults: ctx.extracted.paxAdults || 1,
                travel_class: "ECONOMY",
              });
              // Mudar pra aba de busca específica + scroll suave
              setOuterTab("search");
              setTimeout(() => {
                const el = document.getElementById("gflights-results-anchor");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 200);
            }}
          />
        </TabsContent>

        <TabsContent value="search" className="space-y-5">

      {/* Formulário */}
      <Card id="gflights-results-anchor" className="p-4 md:p-5">
        <div className="space-y-4">
          {/* Toggle de modo */}
          <div className="inline-flex items-center gap-1 bg-muted/40 rounded-lg p-1">
            {([
              { v: "round", label: "Ida e volta" },
              { v: "oneway", label: "Só ida" },
              { v: "multi", label: "Multi-trecho" },
            ] as const).map((m) => (
              <button
                key={m.v}
                type="button"
                onClick={() => setTripMode(m.v)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                  tripMode === m.v
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          {tripMode === "multi" ? (
            <GFlightLegsBuilder legs={multiLegs} onChange={setMultiLegs} />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr] md:items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Origem</Label>
                  <GFlightAirportAutocomplete
                    value={from}
                    onChange={setFrom}
                    placeholder="GRU, São Paulo, JFK..."
                    icon="plane"
                  />
                </div>
                <div className="flex items-end justify-center pb-0.5 md:pb-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={swap}
                    disabled={!from && !to}
                    title="Inverter"
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Destino</Label>
                  <GFlightAirportAutocomplete
                    value={to}
                    onChange={setTo}
                    placeholder="CDG, Paris, MIA..."
                    icon="mapPin"
                  />
                </div>
              </div>

              <div className={cn("grid grid-cols-1 gap-3", tripMode === "round" ? "md:grid-cols-4" : "md:grid-cols-3")}>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Ida</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start", !outboundDate && "text-muted-foreground")}>
                        <CalIcon className="mr-2 h-4 w-4" />
                        {outboundDate ? format(outboundDate, "dd/MM/yyyy") : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={outboundDate} onSelect={setOutboundDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                {tripMode === "round" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Volta</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start", !returnDate && "text-muted-foreground")}>
                          <CalIcon className="mr-2 h-4 w-4" />
                          {returnDate ? format(returnDate, "dd/MM/yyyy") : "Selecionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={returnDate}
                          onSelect={setReturnDate}
                          disabled={(d) => (outboundDate ? d < outboundDate : false)}
                          initialFocus
                        />
                        {returnDate && (
                          <div className="p-2 border-t border-border">
                            <Button variant="ghost" size="sm" className="w-full" onClick={() => setReturnDate(undefined)}>
                              Limpar
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <UsersIcon className="h-3 w-3" /> Adultos
              </Label>
              <Input
                type="number"
                min={1}
                max={9}
                value={adults}
                onChange={(e) => setAdults(Math.max(1, Math.min(9, parseInt(e.target.value) || 1)))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Classe</Label>
              <Select value={travelClass} onValueChange={(v) => setTravelClass(v as GFlightCabin)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VALID_CABINS.map((c) => (
                    <SelectItem key={c} value={c}>{CABIN_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col items-stretch justify-between gap-3 border-t border-border pt-4 md:flex-row md:items-center">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              Preços em BRL · fonte: Google Flights via DataCrawler
              {results?.__cache && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Cloud className="h-3 w-3" /> Cache
                </Badge>
              )}
              {updatedAgoLabel && (
                <span className="text-[10px] text-muted-foreground/80 italic">· {updatedAgoLabel}</span>
              )}
              {results && (() => {
                const meta = results.search_metadata as any;
                const total = (meta?.total_top ?? 0) + (meta?.total_other ?? 0);
                const pages = meta?.pages_fetched ?? 1;
                if (!total) return null;
                return (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    {total} voos {pages > 1 && `· ${pages} páginas`}
                  </Badge>
                );
              })()}
            </div>
            <Button onClick={handleSearch} disabled={!canSearch || isLoading} className="gap-2 md:min-w-[180px]">
              <Search className="h-4 w-4" />
              {isLoading ? "Buscando voos..." : "Buscar voos"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Painel Inteligência de Preço · usa price_insight derivado de priceHistory */}
      {snapshot && results?.price_insight && (
        <div className="space-y-3">
          <GFlightPriceInsightBanner
            insight={results.price_insight}
            onShowHistory={() => setShowPriceHistory(v => !v)}
            showHistory={showPriceHistory}
          />
          {showPriceHistory && (
            <GFlightPriceHistoryChart insight={results.price_insight} />
          )}
        </div>
      )}

      {/* Tabs com 3 visões */}
      {snapshot && (
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-grid">
            <TabsTrigger value="list" className="gap-2">
              <ListIcon className="h-4 w-4" /> Lista
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <CalIcon className="h-4 w-4" /> Calendário
            </TabsTrigger>
            <TabsTrigger value="trend" className="gap-2">
              <TrendingUp className="h-4 w-4" /> Tendência
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-3">
            {/* Banner de Insights — agrega resultados + janela de 60 dias */}
            {(results?.price_insights || trendInsights) && (
              <Card className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {results?.price_insights?.lowest_price !== undefined && (
                    <div className="space-y-0.5">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Mais barato hoje</div>
                      <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {formatBRL(results.price_insights.lowest_price)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {results.search_metadata && (results.search_metadata as any).count
                          ? `${(results.search_metadata as any).count} opções`
                          : ""}
                      </div>
                    </div>
                  )}
                  {trendInsights && (
                    <>
                      <div className="space-y-0.5">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Preço médio · 60 dias</div>
                        <div className="text-lg font-bold">{formatBRL(trendInsights.avg)}</div>
                        <div className="text-[10px] text-muted-foreground">
                          mediana {formatBRL(trendInsights.median)}
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Menor preço · janela</div>
                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          {formatBRL(trendInsights.lowest)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          em {trendInsights.bestDay
                            ? new Date(trendInsights.bestDay + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
                            : "—"}
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {trendInsights.savingsVsSelected ? "Economia possível" : "Pico · janela"}
                        </div>
                        <div className={cn(
                          "text-lg font-bold",
                          trendInsights.savingsVsSelected
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400",
                        )}>
                          {trendInsights.savingsVsSelected
                            ? `−${formatBRL(trendInsights.savingsVsSelected)}`
                            : formatBRL(trendInsights.highest)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {trendInsights.savingsVsSelected
                            ? `escolhendo ${trendInsights.bestDay
                                ? new Date(trendInsights.bestDay + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
                                : "outra data"}`
                            : "data mais cara"}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                {trendInsights && (
                  <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      Variação na janela: <strong>{formatBRL(trendInsights.highest - trendInsights.lowest)}</strong>
                      {" · "}
                      {Math.round(((trendInsights.highest - trendInsights.lowest) / trendInsights.lowest) * 100)}% spread
                    </span>
                    {trendInsights.bestDay && trendInsights.bestDay !== snapshot?.outbound_date && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px]"
                        onClick={() => handleCalendarSelect(trendInsights.bestDay!)}
                      >
                        Buscar no melhor dia →
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            )}
            {(() => {
              const all = [...(results?.best_flights ?? []), ...(results?.other_flights ?? [])];
              const filtered = applyFilters(all, filters);
              const bestCount = results?.best_flights?.length ?? 0;
              const filteredBest = filtered.slice(0, Math.min(bestCount, filtered.length));
              const filteredOthers = filtered.slice(filteredBest.length);
              return (
                <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
                  <aside className="hidden lg:block">
                    {all.length > 0 && (
                      <GFlightFiltersSidebar
                        flights={all}
                        filters={filters}
                        onChange={setFilters}
                        onReset={() => setFilters(DEFAULT_GFLIGHT_FILTERS)}
                      />
                    )}
                  </aside>
                  <div>
                    <GFlightResultsList
                      best={filteredBest}
                      others={filteredOthers}
                      isLoading={isLoading}
                      isError={isError}
                      error={error as Error | null}
                      hasSearched={!!snapshot}
                      onSelect={(it) => setSelectedItinerary(it)}
                    />
                  </div>
                </div>
              );
            })()}
          </TabsContent>

          <TabsContent value="calendar">
            <GFlightCalendarHeatmap
              days={calendar}
              isLoading={calLoading}
              selectedDate={snapshot.outbound_date}
              onSelectDate={handleCalendarSelect}
            />
          </TabsContent>

          <TabsContent value="trend">
            <GFlightPriceTrendChart
              points={trend}
              isLoading={trendLoading}
              selectedDate={snapshot.outbound_date}
              onSelectDate={handleCalendarSelect}
            />
          </TabsContent>
        </Tabs>
      )}
        </TabsContent>
      </Tabs>

      <GFlightDetailDrawer
        itinerary={selectedItinerary}
        searchInput={searchInput}
        onClose={() => setSelectedItinerary(null)}
      />
    </div>
  );
}
