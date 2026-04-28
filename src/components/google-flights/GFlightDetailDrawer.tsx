import { useState } from "react";
import {
  Plane, Clock, Briefcase, Luggage, Leaf, AlertTriangle, Repeat,
  Copy, Check, ExternalLink, Building2, ShieldCheck, ShieldAlert, Shield,
  ChevronDown, Sun, Moon, ShoppingCart, Sparkles, Loader2,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFlightBookingDetails, invokeGFlights } from "@/hooks/useGoogleFlights";
import {
  cabinLabel, classifyExtensions, dayDiff, formatBRL, formatCO2, formatDateLong,
  formatMinutes, formatTime,
  type GBookingProvider, type GFlightItinerary,
} from "./gflightsTypes";
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
    label: "Confiável",
    icon: ShieldCheck,
  },
  neutral: {
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-500",
    label: "Neutra",
    icon: Shield,
  },
  avoid: {
    color: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-500",
    label: "Atenção",
    icon: ShieldAlert,
    note: "OTA com histórico de cobranças extras ou atendimento ruim. Confirme política antes de fechar.",
  },
};

interface Props {
  itinerary: GFlightItinerary | null;
  searchInput: SearchGFlightsInput | null;
  onClose: () => void;
}

export function GFlightDetailDrawer({ itinerary, searchInput, onClose }: Props) {
  const [copiedToken, setCopiedToken] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const open = !!itinerary;
  const bookingToken = itinerary?.booking_token ?? null;
  const { data: bookingDetails, isLoading: provLoading } =
    useFlightBookingDetails(searchInput, bookingToken, open);
  const providers = bookingDetails?.providers ?? [];
  const bagInfo = bookingDetails?.bag_info ?? null;

  const providersSorted = [...providers].sort((a, b) => a.price - b.price);

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

  // Melhor oferta = primeira ordenada por preço com website
  const bestOffer = providersSorted.find((p) => !!p.website) ?? providersSorted[0] ?? null;
  const buildHref = (url?: string) =>
    url ? (url.startsWith("http") ? url : `https://${url}`) : "";

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
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold text-primary">{formatBRL(itinerary.price)}</div>
              <div className="text-[10px] text-muted-foreground">por adulto</div>
            </div>
          </div>

          {/* CTA topo · vai direto pra melhor oferta */}
          {bestOffer?.website && (
            <Button
              asChild
              variant="premium"
              size="lg"
              className="w-full gap-2"
            >
              <a href={buildHref(bestOffer.website)} target="_blank" rel="noopener noreferrer">
                <Sparkles className="h-4 w-4" />
                Reservar agora em {bestOffer.title} · {formatBRL(bestOffer.price || itinerary.price)}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-5 py-4 space-y-5">
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

                    {/* Layover entre legs */}
                    {lay && i < flights.length - 1 && (
                      <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/20 rounded-md px-3 py-2 ml-3">
                        <Repeat className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <div className="text-[11px]">
                          <span className="font-medium">Conexão {lay.duration_text || formatMinutes(lay.duration)}</span>
                          <span className="text-muted-foreground"> em {lay.city || lay.name} ({lay.id})</span>
                          {lay.overnight && (
                            <Badge variant="outline" className="ml-2 text-[9px] border-indigo-500/30 text-indigo-700 dark:text-indigo-300 gap-1">
                              <Moon className="h-2.5 w-2.5" /> Pernoite
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
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
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Onde reservar este voo
                </h3>
                {providersSorted.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {providersSorted.length} {providersSorted.length === 1 ? "opção" : "opções"} · ordenadas por preço
                  </span>
                )}
              </div>
              {provLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : providersSorted.length === 0 ? (
                <div className="text-xs text-muted-foreground py-6 text-center bg-muted/20 rounded-md border border-dashed border-border">
                  Nenhum canal de venda direto disponível para este voo.
                  <div className="mt-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <a
                        href={`https://www.google.com/travel/flights?q=${encodeURIComponent(
                          `${dep?.id} to ${arr?.id} ${itinerary.flights?.[0]?.airline ?? ""}`,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Buscar no Google Flights
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {providersSorted.map((p, i) => {
                    const trust = getTrust(p);
                    const meta = TRUST_META[trust];
                    const Icon = meta.icon;
                    const isCheapest = i === 0;
                    return (
                      <div
                        key={`${p.id}-${i}`}
                        className={cn(
                          "border rounded-lg p-3 transition-colors",
                          isCheapest
                            ? "border-primary/40 bg-primary/5"
                            : "border-border hover:border-primary/30",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn("h-2.5 w-2.5 rounded-full mt-1.5 shrink-0", meta.bg)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2 flex-wrap">
                              <div className="text-sm font-semibold flex items-center gap-1.5 flex-wrap">
                                {p.title}
                                {p.is_airline ? (
                                  <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-700 dark:text-emerald-300 gap-1">
                                    <Building2 className="h-2.5 w-2.5" /> Cia oficial
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[9px] gap-1">OTA</Badge>
                                )}
                                {isCheapest && (
                                  <Badge className="text-[9px] gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15">
                                    <Sparkles className="h-2.5 w-2.5" /> Melhor preço
                                  </Badge>
                                )}
                              </div>
                              <div className="text-base font-bold shrink-0">{formatBRL(p.price)}</div>
                            </div>
                            <div className={cn("text-[10px] mt-1 flex items-center gap-1", meta.color)}>
                              <Icon className="h-3 w-3" /> {meta.label}
                            </div>
                            {meta.note && (
                              <div className="text-[10px] text-rose-700 dark:text-rose-300 mt-0.5">
                                ⚠️ {meta.note}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Botão reservar */}
                        <div className="mt-3">
                          {p.website ? (
                            <Button
                              asChild
                              variant={isCheapest ? "default" : "outline"}
                              size="sm"
                              className="w-full gap-2"
                            >
                              <a
                                href={buildHref(p.website)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ShoppingCart className="h-3.5 w-3.5" />
                                Reservar em {p.title}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                          ) : (
                            <div className="text-[10px] text-muted-foreground italic text-center py-1.5">
                              Link de reserva indisponível neste canal
                            </div>
                          )}
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
          {bestOffer?.website ? (
            <Button asChild className="flex-1 gap-2">
              <a href={buildHref(bestOffer.website)} target="_blank" rel="noopener noreferrer">
                <ShoppingCart className="h-4 w-4" />
                Reservar · {formatBRL(bestOffer.price || itinerary.price)}
              </a>
            </Button>
          ) : (
            <Button disabled className="flex-1 gap-2">
              <ShoppingCart className="h-4 w-4" />
              Sem link de reserva
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
