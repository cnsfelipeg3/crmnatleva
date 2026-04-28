import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plane, Clock, Briefcase, Luggage, Leaf, AlertTriangle, Repeat,
  Copy, Check, X as XIcon, ExternalLink, Building2, ShieldCheck, ShieldAlert, Shield,
  ChevronDown, Sun, Moon, ShoppingCart, Sparkles, Loader2, RefreshCw, AlertCircle,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFlightBookingDetails, fetchBookingURL } from "@/hooks/useGoogleFlights";
import {
  cabinLabel, classifyExtensions, classifyLayover, dayDiff, formatBRL, formatCO2, formatDateLong,
  formatMinutes, formatTime,
  type GBookingProvider, type GFareTier, type GFlightItinerary,
} from "./gflightsTypes";
import { TIER_META } from "./fareClassifier";
import type { SearchGFlightsInput } from "@/hooks/useGoogleFlights";

// ----------------------------------------------------------------------
// Tabela de confiabilidade de providers (hardcoded inline · v1)
// ----------------------------------------------------------------------
type Trust = "trusted" | "neutral" | "avoid";

const PROVIDER_TRUST: Record<string, Trust> = {
  // Cias oficiais grandes
  AV: "trusted", G3: "trusted", AD: "trusted", LA: "trusted",
  TP: "trusted", AA: "trusted", DL: "trusted", UA: "trusted",
  AF: "trusted", KL: "trusted", LH: "trusted", BA: "trusted",
  EK: "trusted", QR: "trusted", TK: "trusted", IB: "trusted",
  // OTAs grandes
  "Booking.com": "trusted", Decolar: "trusted", Expedia: "trusted",
  CVC: "trusted", "Hotels.com": "trusted",
  // OTAs neutras
  "Kiwi.com": "neutral", "Trip.com": "neutral", Mundi: "neutral",
  Viajanet: "neutral", Submarino: "neutral",
  // OTAs problemáticas
  MyTrip: "avoid", GotoGate: "avoid", Kissandfly: "avoid",
  BudgetAir: "avoid", eDreams: "avoid",
  // Falidas / em RJ
  "123Milhas": "avoid", Maxmilhas: "avoid", Hurb: "avoid",
};

function getTrust(p: GBookingProvider): Trust {
  if (p.is_airline) return "trusted";
  return PROVIDER_TRUST[p.id] || PROVIDER_TRUST[p.title] || "neutral";
}

const TRUST_META: Record<Trust, { color: string; label: string; icon: typeof ShieldCheck; bg: string; note?: string }> = {
  trusted: {
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-500",
    label: "Canal confiável",
    icon: ShieldCheck,
    note: "Sem histórico de problemas",
  },
  neutral: {
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-500",
    label: "Canal neutro",
    icon: Shield,
    note: "Verifique reviews antes de comprar",
  },
  avoid: {
    color: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-500",
    label: "⚠️ Evitar",
    icon: ShieldAlert,
    note: "Histórico de cobranças extras e atendimento ruim",
  },
};

interface Props {
  itinerary: GFlightItinerary | null;
  searchInput: SearchGFlightsInput | null;
  onClose: () => void;
}

function buildGoogleFlightsDeepLink(
  dep: string | undefined,
  arr: string | undefined,
  outboundDate: string | undefined,
  returnDate: string | undefined,
  adults: number = 1,
): string {
  const base = "https://www.google.com/travel/flights";
  const params = new URLSearchParams();
  params.set("hl", "pt-BR");
  params.set("curr", "BRL");
  params.set("gl", "br");
  if (dep && arr && outboundDate) {
    const ret = returnDate ? ` returning ${returnDate}` : "";
    const paxText = adults > 1 ? ` ${adults} adults` : "";
    params.set("q", `Flights from ${dep} to ${arr} on ${outboundDate}${ret}${paxText}`);
  } else if (dep && arr) {
    params.set("q", `Flights from ${dep} to ${arr}`);
  }
  return `${base}?${params.toString()}`;
}

export function GFlightDetailDrawer({ itinerary, searchInput, onClose }: Props) {
  const queryClient = useQueryClient();
  const [copiedToken, setCopiedToken] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [reservingId, setReservingId] = useState<string | null>(null);

  // Filtros locais de tarifa (atuam só sobre os providers deste voo)
  const ALL_TIERS: GFareTier[] = ["basic", "standard", "flexible", "premium", "business", "first"];
  const [tierFilter, setTierFilter] = useState<GFareTier[]>(ALL_TIERS);
  const [needCheckedBag, setNeedCheckedBag] = useState(false);
  const [needRefundable, setNeedRefundable] = useState(false);
  const [needFreeChange, setNeedFreeChange] = useState(false);
  const [needFreeSeat, setNeedFreeSeat] = useState(false);

  const open = !!itinerary;
  const bookingToken = itinerary?.booking_token ?? null;
  const { data: bookingDetails, isLoading: provLoading } =
    useFlightBookingDetails(searchInput, bookingToken, open);
  const providers = bookingDetails?.providers ?? [];
  const bagInfo = bookingDetails?.bag_info ?? null;

  const providersSorted = [...providers].sort((a, b) => a.price - b.price);
  const minPrice = providersSorted[0]?.price ?? 0;
  const maxPrice = providersSorted[providersSorted.length - 1]?.price ?? 0;
  const savings = maxPrice - minPrice;

  // Counts úteis pra header
  const uniqueAirlines = new Set(providersSorted.map(p => p.title)).size;

  const filteredProviders = useMemo(() => {
    if (!providersSorted) return [];
    return providersSorted.filter((p) => {
      if (p.fareTier && !tierFilter.includes(p.fareTier)) return false;
      const benefits = (p.benefits ?? []).join(" ").toLowerCase();
      if (needCheckedBag && !/despachada/.test(benefits)) return false;
      if (needRefundable && !/reembols/.test(benefits)) return false;
      if (needFreeChange && !/altera[cç][aã]o\s*gratuit/.test(benefits)) return false;
      if (needFreeSeat && !/sele[cç][aã]o.*gr[áa]tis|sele[cç][aã]o.*gratuit/.test(benefits)) return false;
      return true;
    });
  }, [providersSorted, tierFilter, needCheckedBag, needRefundable, needFreeChange, needFreeSeat]);

  function resetFareFilters() {
    setTierFilter(ALL_TIERS);
    setNeedCheckedBag(false);
    setNeedRefundable(false);
    setNeedFreeChange(false);
    setNeedFreeSeat(false);
  }

  if (!itinerary) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full sm:max-w-2xl" />
      </Sheet>
    );
  }

  const flights = itinerary.flights ?? [];
  const layovers = itinerary.layovers ?? [];
  const first = flights[0];
  const last = flights[flights.length - 1];
  const dep = first?.departure_airport;
  const arr = last?.arrival_airport;
  const co2 = itinerary.carbon_emissions;

  const copyToken = () => {
    if (!bookingToken) return;
    navigator.clipboard.writeText(bookingToken);
    setCopiedToken(true);
    toast.success("Token copiado");
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const copyForProposal = () => {
    const payload = {
      route: `${dep?.id} → ${arr?.id}`,
      departure: dep?.time,
      arrival: arr?.time,
      total_duration_min: itinerary.total_duration,
      stops: itinerary.stops,
      price_brl: itinerary.price,
      airlines: Array.from(new Set(flights.map(f => f.airline).filter(Boolean))),
      legs: flights.map(f => ({
        airline: f.airline,
        flight_number: f.flight_number,
        aircraft: f.aircraft,
        from: f.departure_airport?.id,
        from_time: f.departure_airport?.time,
        to: f.arrival_airport?.id,
        to_time: f.arrival_airport?.time,
        duration_min: f.duration,
        cabin: f.travel_class,
        legroom: f.legroom,
      })),
      layovers: layovers.map(l => ({
        airport: l.id,
        city: l.city,
        duration_min: l.duration,
        overnight: l.overnight,
      })),
      bags: itinerary.bags,
      carbon: co2,
      providers: providersSorted.map(p => ({
        title: p.title,
        is_airline: p.is_airline,
        price_brl: p.price,
        website: p.website,
      })),
      booking_token: bookingToken,
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    toast.success("Dados copiados para proposta");
  };

  // Melhor oferta = primeira ordenada por preço com token (preferencial) ou website (fallback)
  const bestOffer = providersSorted.find((p) => !!p.token) ?? providersSorted.find((p) => !!p.website) ?? providersSorted[0] ?? null;
  const buildHref = (url?: string) =>
    url ? (url.startsWith("http") ? url : `https://${url}`) : "";

  // Resolve provider deeplink via getBookingURL e abre em nova aba.
  // Fallback: se não tiver token ou der erro, usa provider.website cru.
  async function handleReserveProvider(p: GBookingProvider) {
    const reserveId = `${p.id}-${p.title}`;
    if (!p.token) {
      if (p.website) window.open(buildHref(p.website), "_blank", "noopener,noreferrer");
      else toast.error("Link de reserva indisponível neste canal");
      return;
    }
    setReservingId(reserveId);
    try {
      const link = await fetchBookingURL(p.token);
      if (!link) {
        if (p.website) {
          toast.message("Link direto indisponível · abrindo site do canal");
          window.open(buildHref(p.website), "_blank", "noopener,noreferrer");
        } else {
          toast.error("Não foi possível obter link de reserva");
        }
        return;
      }
      window.open(link, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error("Erro ao obter link · " + (e?.message ?? "tente novamente"));
      if (p.website) window.open(buildHref(p.website), "_blank", "noopener,noreferrer");
    } finally {
      setReservingId(null);
    }
  }

  function scrollToProviders() {
    document.getElementById("providers-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-5 py-4 border-b border-border space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="text-base flex items-center gap-2">
                <Plane className="h-4 w-4 text-primary" />
                <span className="font-mono">{dep?.id}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-mono">{arr?.id}</span>
              </SheetTitle>
              <SheetDescription className="text-xs">
                {formatTime(dep?.time)} · {formatDateLong(dep?.time)} ·{" "}
                {itinerary.total_duration_text || formatMinutes(itinerary.total_duration)} ·{" "}
                {(itinerary.stops ?? 0) === 0 ? "Direto" : `${itinerary.stops} parada${(itinerary.stops ?? 0) > 1 ? "s" : ""}`}
              </SheetDescription>
            </div>
            <div className="text-right shrink-0 pr-8">
              <div className="text-2xl font-bold text-primary">{formatBRL(itinerary.price)}</div>
              <div className="text-[10px] text-muted-foreground">por adulto</div>
            </div>
          </div>

          {/* CTA topo · resolve deeplink real do melhor canal via getBookingURL */}
          {bestOffer && (
            <Button
              variant="premium"
              size="lg"
              className="w-full gap-2"
              onClick={() => handleReserveProvider(bestOffer)}
              disabled={reservingId === `${bestOffer.id}-${bestOffer.title}`}
            >
              {reservingId === `${bestOffer.id}-${bestOffer.title}` ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Reservar em {bestOffer.title} · {formatBRL(bestOffer.price || itinerary.price)}
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-5 py-4 space-y-5">
            {/* Self-transfer warning · destaque destrutivo */}
            {itinerary.self_transfer && (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Atenção · Voo com self-transfer</AlertTitle>
                <AlertDescription className="space-y-1.5 text-xs">
                  <p>
                    Esse voo é vendido como 2 trechos separados. Em caso de atraso ou cancelamento
                    do primeiro voo, a companhia <strong>não se responsabiliza</strong> por perda de conexão.
                  </p>
                  <p className="text-muted-foreground">
                    Recomenda-se margem mínima de 4 a 5 horas entre os voos e seguro-viagem com
                    cobertura de conexão perdida.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Trajeto */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trajeto</h3>
              {flights.map((leg, i) => {
                const legExt = classifyExtensions(leg.extensions);
                const legOvernight = dayDiff(leg.departure_airport?.time, leg.arrival_airport?.time);
                const lay = layovers[i];
                return (
                  <div key={i} className="space-y-2">
                    <div className="flex items-start gap-3 bg-muted/30 rounded-md p-3">
                      {leg.airline_logo ? (
                        <img src={leg.airline_logo} alt="" className="h-9 w-9 object-contain rounded bg-white p-0.5 border border-border/40 shrink-0" />
                      ) : (
                        <div className="h-9 w-9 rounded bg-muted/60 grid place-items-center shrink-0">
                          <Plane className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="text-xs font-semibold truncate">
                            {leg.airline} <span className="font-mono text-muted-foreground">· {leg.flight_number}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground shrink-0">
                            {leg.duration_text || formatMinutes(leg.duration)}
                          </div>
                        </div>

                        {/* timeline horizontal */}
                        <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center">
                          <div>
                            <div className="text-sm font-bold flex items-center gap-1">
                              {formatTime(leg.departure_airport?.time)}
                              <Sun className="h-3 w-3 text-amber-500/70" />
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground">{leg.departure_airport?.id}</div>
                            <div className="text-[10px] text-muted-foreground max-w-[150px] truncate" title={leg.departure_airport?.name}>
                              {leg.departure_airport?.name}
                            </div>
                          </div>
                          <div className="h-px bg-border/60 relative">
                            <Plane className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 text-primary rotate-90" />
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold flex items-center gap-1 justify-end">
                              {formatTime(leg.arrival_airport?.time)}
                              {legOvernight > 0 ? <Moon className="h-3 w-3 text-indigo-400" /> : <Sun className="h-3 w-3 text-amber-500/70" />}
                              {legOvernight > 0 && <sup className="text-[9px] text-rose-500">+{legOvernight}</sup>}
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground">{leg.arrival_airport?.id}</div>
                            <div className="text-[10px] text-muted-foreground max-w-[150px] truncate ml-auto" title={leg.arrival_airport?.name}>
                              {leg.arrival_airport?.name}
                            </div>
                          </div>
                        </div>

                        {/* Specs */}
                        <div className="text-[10px] text-muted-foreground space-y-0.5">
                          {leg.aircraft && <div>Aeronave: <span className="text-foreground">{leg.aircraft}</span></div>}
                          {leg.seat && <div>Assento: <span className="text-foreground">{leg.seat}</span>{leg.legroom && <> · {leg.legroom}</>}</div>}
                          {leg.travel_class && <div>Classe: <span className="text-foreground">{cabinLabel(leg.travel_class)}</span></div>}
                        </div>

                        {/* Amenities */}
                        {legExt.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {legExt.map((t, k) => (
                              <span key={k} className={cn(
                                "inline-flex items-center text-[10px] px-1.5 py-0.5 rounded border",
                                t.kind === "wifi" && "border-sky-500/30 text-sky-700 dark:text-sky-300",
                                t.kind === "power" && "border-amber-500/30 text-amber-700 dark:text-amber-300",
                                t.kind === "video" && "border-violet-500/30 text-violet-700 dark:text-violet-300",
                                t.kind === "legroom" && "border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
                                t.kind === "co2" && "border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
                                t.kind === "meal" && "border-orange-500/30 text-orange-700 dark:text-orange-300",
                                t.kind === "other" && "border-border text-muted-foreground",
                              )}>
                                {t.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Layover entre legs · cor contextualizada por severidade */}
                    {lay && i < flights.length - 1 && (() => {
                      const cls = classifyLayover(lay);
                      return (
                        <div className={cn(
                          "ml-3 rounded-md px-3 py-2 border space-y-1",
                          cls.bgClass,
                          cls.borderClass,
                        )}>
                          <div className="flex items-center gap-2 text-[11px]">
                            <Repeat className={cn("h-3.5 w-3.5 shrink-0", cls.textClass)} />
                            <span className={cn("font-semibold", cls.textClass)}>
                              {cls.label} · {lay.duration_text || formatMinutes(lay.duration)}
                            </span>
                            <span className="text-muted-foreground">
                              em {lay.city || lay.name} ({lay.id})
                            </span>
                            {lay.overnight && cls.severity !== "overnight" && (
                              <Badge variant="outline" className="ml-auto text-[9px] border-indigo-500/30 text-indigo-700 dark:text-indigo-300 gap-1">
                                <Moon className="h-2.5 w-2.5" /> Pernoite
                              </Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground pl-5">{cls.hint}</div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </section>

            {/* Bagagem */}
            {itinerary.bags && (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bagagem</h3>
                <div className="flex gap-3">
                  <div className="flex-1 bg-muted/30 rounded-md p-3 text-center">
                    <Briefcase className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                    <div className="text-sm font-bold">{itinerary.bags.carry_on ?? 0}</div>
                    <div className="text-[10px] text-muted-foreground">de mão</div>
                  </div>
                  <div className="flex-1 bg-muted/30 rounded-md p-3 text-center">
                    <Luggage className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                    <div className="text-sm font-bold">{itinerary.bags.checked ?? 0}</div>
                    <div className="text-[10px] text-muted-foreground">despachada</div>
                  </div>
                </div>
              </section>
            )}

            {/* CO2 */}
            {co2?.this_flight !== undefined && (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Emissões CO₂</h3>
                <div className="bg-muted/30 rounded-md p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Leaf className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <strong>{formatCO2(co2.this_flight)}</strong> nesse voo
                    </span>
                    {co2.typical_for_this_route !== undefined && (
                      <span className="text-muted-foreground text-[11px]">
                        média da rota {formatCO2(co2.typical_for_this_route)}
                      </span>
                    )}
                  </div>
                  {/* Barra comparativa visual · usa typical_for_this_route + higher */}
                  {co2.typical_for_this_route !== undefined && co2.this_flight !== undefined && (() => {
                    const max = Math.max(co2.this_flight!, co2.typical_for_this_route!);
                    const thisPct = (co2.this_flight! / max) * 100;
                    const typicalPct = (co2.typical_for_this_route! / max) * 100;
                    const isHigher = !!co2.higher;
                    return (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-16 shrink-0">Esse voo</span>
                          <div className="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all", isHigher ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${thisPct}%` }} />
                          </div>
                          <span className="text-[10px] font-mono w-14 text-right">{formatCO2(co2.this_flight)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-16 shrink-0">Média rota</span>
                          <div className="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-muted-foreground/40" style={{ width: `${typicalPct}%` }} />
                          </div>
                          <span className="text-[10px] font-mono w-14 text-right">{formatCO2(co2.typical_for_this_route)}</span>
                        </div>
                      </div>
                    );
                  })()}
                  {co2.difference_percent !== undefined && (
                    <div className={cn(
                      "text-[11px] pt-1 border-t border-border/40",
                      co2.difference_percent < 0 && "text-emerald-700 dark:text-emerald-300",
                      co2.difference_percent > 0 && "text-rose-700 dark:text-rose-300",
                    )}>
                      {co2.higher ? "⚠️ Emite mais que a média · " : "✓ Emite menos que a média · "}
                      {co2.difference_percent > 0 ? "+" : ""}{co2.difference_percent}%
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Bagagem do provider (bag_info) · só aparece quando a API retorna */}
            {bagInfo && (bagInfo.carry_on || bagInfo.checked) && (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Bagagem detalhada do canal de venda
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {bagInfo.carry_on && (
                    <div className="bg-muted/30 rounded-md p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Briefcase className="h-3.5 w-3.5" /> Mão
                        </span>
                        {bagInfo.carry_on.included ? (
                          <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-700 dark:text-emerald-300">Incluída</Badge>
                        ) : (
                          <span className="text-[11px] font-bold">{bagInfo.carry_on.price ? formatBRL(bagInfo.carry_on.price) : "—"}</span>
                        )}
                      </div>
                      {bagInfo.carry_on.description && (
                        <div className="text-[10px] text-muted-foreground">{bagInfo.carry_on.description}</div>
                      )}
                    </div>
                  )}
                  {bagInfo.checked && (
                    <div className="bg-muted/30 rounded-md p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Luggage className="h-3.5 w-3.5" /> Despachada
                        </span>
                        {bagInfo.checked.included ? (
                          <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-700 dark:text-emerald-300">Incluída</Badge>
                        ) : (
                          <span className="text-[11px] font-bold">{bagInfo.checked.price ? formatBRL(bagInfo.checked.price) : "—"}</span>
                        )}
                      </div>
                      {bagInfo.checked.description && (
                        <div className="text-[10px] text-muted-foreground">{bagInfo.checked.description}</div>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Aviso de atraso histórico (delay.text) */}
            {itinerary.delay?.values && itinerary.delay.text && (
              <section className="bg-amber-500/5 border border-amber-500/20 rounded-md p-3 text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-amber-800 dark:text-amber-200">Histórico de atrasos</div>
                  <div className="text-amber-700 dark:text-amber-300 mt-0.5">
                    Esse voo costuma atrasar {itinerary.delay.text}{typeof itinerary.delay.text === "number" ? " minutos" : ""} em relação ao horário previsto.
                  </div>
                </div>
              </section>
            )}

            {/* Providers */}
            <section id="providers-section" className="space-y-3 scroll-mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Onde reservar este voo
                </h3>
                {providersSorted.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    ordenado por preço
                  </span>
                )}
              </div>

              {/* Banner: total de tarifas + canais + economia */}
              {!provLoading && providersSorted.length > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-md p-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold flex items-center gap-1.5">
                      <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                      {providersSorted.length} {providersSorted.length === 1 ? "tarifa disponível" : "tarifas disponíveis"}
                      {uniqueAirlines > 0 && (
                        <span className="text-muted-foreground font-normal">
                          · {uniqueAirlines} {uniqueAirlines === 1 ? "companhia" : "companhias"}
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground text-[10px]">do mais barato ao mais caro</span>
                  </div>
                  {providersSorted.length > 1 && savings > 0 && (
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Economia até <strong>{formatBRL(savings)}</strong> escolhendo a tarifa certa
                    </div>
                  )}
                </div>
              )}

              {/* Filtros locais de tarifa */}
              {!provLoading && providersSorted.length > 1 && (
                <div className="space-y-2 bg-muted/20 border border-border rounded-md p-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Tipos de tarifa:
                    </span>
                    {ALL_TIERS.map((t) => {
                      const active = tierFilter.includes(t);
                      const tmeta = TIER_META[t];
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() =>
                            setTierFilter((s) => (active ? s.filter((x) => x !== t) : [...s, t]))
                          }
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1",
                            active
                              ? `${tmeta.bg} ${tmeta.color} ${tmeta.border}`
                              : "bg-muted/30 text-muted-foreground border-border hover:border-primary/30",
                          )}
                          title={tmeta.description}
                        >
                          <span>{tmeta.emoji}</span>
                          <span>{tmeta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap pt-1 border-t border-border/40">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Exigir:
                    </span>
                    {[
                      { v: needCheckedBag, set: setNeedCheckedBag, label: "Bagagem despachada" },
                      { v: needRefundable, set: setNeedRefundable, label: "Reembolsável" },
                      { v: needFreeChange, set: setNeedFreeChange, label: "Alteração grátis" },
                      { v: needFreeSeat, set: setNeedFreeSeat, label: "Assento grátis" },
                    ].map((f, i) => (
                      <label key={i} className="flex items-center gap-1 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={f.v}
                          onChange={(e) => f.set(e.target.checked)}
                          className="h-3 w-3 accent-primary"
                        />
                        <span className={f.v ? "text-foreground font-medium" : "text-muted-foreground"}>
                          {f.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {provLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : providersSorted.length === 0 ? (
                <div className="py-6 px-4 bg-muted/20 rounded-md border border-dashed border-border flex flex-col items-center text-center space-y-3">
                  <AlertCircle className="h-10 w-10 text-amber-500" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      Sem ofertas diretas no momento
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-md">
                      Tokens de reserva têm validade curta. O voo é real, mas o link direto
                      pode ter expirado ou ainda não foi indexado pelos canais de venda.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <a
                        href={buildGoogleFlightsDeepLink(
                          dep?.id,
                          arr?.id,
                          searchInput?.outbound_date,
                          searchInput?.return_date,
                          searchInput?.adults ?? 1,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Abrir no Google Flights (BRL)
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        queryClient.invalidateQueries({
                          queryKey: ["gflights", "getBookingDetails"],
                        });
                        toast.message("Buscando ofertas novamente...");
                      }}
                    >
                      <RefreshCw className="h-3 w-3" /> Tentar de novo
                    </Button>
                  </div>
                </div>
              ) : filteredProviders.length === 0 ? (
                <div className="text-xs text-muted-foreground py-6 text-center bg-muted/20 rounded-md border border-dashed border-border space-y-2">
                  <div>Nenhuma tarifa atende todos os filtros selecionados.</div>
                  <Button variant="outline" size="sm" onClick={resetFareFilters}>
                    Limpar filtros de tarifa
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProviders.map((p, i) => {
                    const tierKey: GFareTier = p.fareTier ?? "standard";
                    const tmeta = TIER_META[tierKey];
                    const trust = getTrust(p);
                    const trustMeta = TRUST_META[trust];
                    const TrustIcon = trustMeta.icon;
                    const isCheapest = i === 0;
                    const reserveId = `${p.id}-${p.title}`;
                    const isReserving = reservingId === reserveId;
                    return (
                      <div
                        key={`${p.id}-${i}`}
                        className={cn(
                          "border rounded-lg overflow-hidden transition-colors",
                          tmeta.border,
                          tmeta.bg,
                        )}
                      >
                        {/* Header colorido por tier */}
                        <div className={cn("flex items-center justify-between px-3 py-1.5 border-b", tmeta.border)}>
                          <div className={cn("flex items-center gap-1.5 text-[11px] font-semibold", tmeta.color)}>
                            <span>{tmeta.emoji}</span>
                            <span>{p.fareDisplayName || tmeta.label}</span>
                          </div>
                          {isCheapest && (
                            <Badge className="text-[9px] gap-1 bg-emerald-500 text-white hover:bg-emerald-500">
                              <Sparkles className="h-2.5 w-2.5" /> Mais barato
                            </Badge>
                          )}
                        </div>

                        {/* Conteúdo */}
                        <div className="p-3 space-y-2 bg-card">
                          <div className="flex items-baseline justify-between gap-2 flex-wrap">
                            <div className="text-sm font-semibold flex items-center gap-1.5 flex-wrap">
                              <div className={cn("h-2.5 w-2.5 rounded-full", trustMeta.bg)} />
                              {p.title}
                              {p.is_airline ? (
                                <Badge className="text-[9px] border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 gap-1">
                                  <Building2 className="h-2.5 w-2.5" /> Cia oficial
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[9px] gap-1">OTA</Badge>
                              )}
                            </div>
                            <div className="text-base font-bold shrink-0">{formatBRL(p.price)}</div>
                          </div>

                          {/* Benefícios */}
                          {p.benefits && p.benefits.length > 0 && (
                            <ul className="space-y-0.5">
                              {p.benefits.map((b, k) => (
                                <li key={k} className="flex items-start gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300">
                                  <Check className="h-3 w-3 shrink-0 mt-0.5" />
                                  <span>{b}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {/* Restrições */}
                          {p.restrictions && p.restrictions.length > 0 && (
                            <ul className="space-y-0.5">
                              {p.restrictions.map((r, k) => (
                                <li key={k} className="flex items-start gap-1.5 text-[11px] text-rose-700 dark:text-rose-300">
                                  <XIcon className="h-3 w-3 shrink-0 mt-0.5" />
                                  <span>{r}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {/* Trust note (só se não-confiável) */}
                          {trust !== "trusted" && (
                            <div className={cn("text-[10px] flex items-center gap-1", trustMeta.color)}>
                              <TrustIcon className="h-3 w-3" />
                              <span>{trustMeta.label}</span>
                              {trustMeta.note && <span className="text-muted-foreground">· {trustMeta.note}</span>}
                            </div>
                          )}

                          {/* Botão reservar */}
                          <div className="flex gap-2 pt-1">
                            <Button
                              variant={isCheapest ? "default" : "outline"}
                              size="sm"
                              className={cn(
                                "flex-1 gap-2",
                                isCheapest && "bg-emerald-600 hover:bg-emerald-700 text-white",
                              )}
                              onClick={() => handleReserveProvider(p)}
                              disabled={isReserving || (!p.token && !p.website)}
                            >
                              {isReserving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <ShoppingCart className="h-3.5 w-3.5" />
                              )}
                              {trust === "avoid" ? "Reservar mesmo assim" : `Reservar em ${p.title}`}
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                            {p.website && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px] text-muted-foreground"
                                asChild
                              >
                                <a href={buildHref(p.website)} target="_blank" rel="noopener noreferrer" title="Abrir site do canal">
                                  site
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Avançado */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-[11px]">
                  <span>Avançado · token de reserva</span>
                  <ChevronDown className={cn("h-3 w-3 transition-transform", advancedOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                <div className="bg-muted/30 rounded-md p-2 font-mono text-[10px] break-all text-muted-foreground">
                  {bookingToken || "—"}
                </div>
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={copyToken} disabled={!bookingToken}>
                  {copiedToken ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedToken ? "Copiado" : "Copiar token"}
                </Button>
                <p className="text-[10px] text-muted-foreground">
                  Use este token na proposta interna para rastreabilidade.
                </p>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>

        {/* Action bar */}
        <div className="border-t border-border p-3 flex gap-2">
          {providersSorted.length > 0 ? (
            <Button
              variant="outline"
              size="default"
              className="flex-1 gap-2"
              onClick={scrollToProviders}
            >
              <ShoppingCart className="h-4 w-4" />
              Comparar {providersSorted.length} {providersSorted.length === 1 ? "oferta" : "ofertas"}
            </Button>
          ) : (
            <Button disabled className="flex-1 gap-2">
              <ShoppingCart className="h-4 w-4" />
              Sem ofertas disponíveis
            </Button>
          )}
          <Button onClick={copyForProposal} variant="outline" size="icon" title="Copiar dados para proposta">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
