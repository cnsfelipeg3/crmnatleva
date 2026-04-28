import { useState } from "react";
import {
  Plane, Clock, Briefcase, Luggage, Leaf, AlertTriangle, Repeat,
  Copy, Check, ExternalLink, Building2, ShieldCheck, ShieldAlert, Shield,
  ChevronDown, Sun, Moon, ShoppingCart, Sparkles,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFlightBookingDetails } from "@/hooks/useGoogleFlights";
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
  const { data: providers = [], isLoading: provLoading } =
    useFlightBookingDetails(searchInput, bookingToken, open);

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

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-5 py-4 border-b border-border space-y-2">
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
                <div className="bg-muted/30 rounded-md p-3 text-xs space-y-1">
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
                  {co2.difference_percent !== undefined && (
                    <div className={cn(
                      "text-[11px]",
                      co2.difference_percent < 0 && "text-emerald-700 dark:text-emerald-300",
                      co2.difference_percent > 0 && "text-rose-700 dark:text-rose-300",
                    )}>
                      {co2.difference_percent > 0 ? "⚠️ " : "✓ "}
                      {co2.difference_percent > 0 ? "+" : ""}{co2.difference_percent}% vs média da rota
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Providers */}
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Onde comprar este voo
              </h3>
              {provLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : providersSorted.length === 0 ? (
                <div className="text-xs text-muted-foreground py-4 text-center bg-muted/20 rounded-md">
                  Nenhum canal de venda disponível para este voo no momento.
                </div>
              ) : (
                <div className="space-y-2">
                  {providersSorted.map((p, i) => {
                    const trust = getTrust(p);
                    const meta = TRUST_META[trust];
                    const Icon = meta.icon;
                    return (
                      <div
                        key={`${p.id}-${i}`}
                        className="border border-border rounded-md p-3 flex items-start gap-3 hover:border-primary/40 transition-colors"
                      >
                        <div className={cn("h-2.5 w-2.5 rounded-full mt-1.5 shrink-0", meta.bg)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                              {p.title}
                              {p.is_airline && (
                                <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-700 dark:text-emerald-300 gap-1">
                                  <Building2 className="h-2.5 w-2.5" /> Cia oficial
                                </Badge>
                              )}
                              {!p.is_airline && (
                                <Badge variant="outline" className="text-[9px] gap-1">OTA</Badge>
                              )}
                            </div>
                            <div className="text-base font-bold shrink-0">{formatBRL(p.price)}</div>
                          </div>
                          {p.website && (
                            <a
                              href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 mt-0.5"
                            >
                              {p.website} <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
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
        <div className="border-t border-border p-3">
          <Button onClick={copyForProposal} className="w-full gap-2">
            <Copy className="h-4 w-4" />
            Copiar dados para proposta
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
