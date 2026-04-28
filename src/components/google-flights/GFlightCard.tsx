import { useMemo } from "react";
import {
  Plane, Briefcase, Luggage, Leaf, AlertTriangle, Repeat,
  Wifi, Power, Tv, Award, Zap, DollarSign, ChevronRight, Layers,
  Clock, Moon, ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  cabinLabel, dayDiff, detectBags, formatBRL, formatMinutes, formatTime, hasExtension,
  type GFlightItinerary, type GLayover,
} from "./gflightsTypes";

interface Props {
  itinerary: GFlightItinerary;
  isBest?: boolean;
  isCheapest?: boolean;
  isFastest?: boolean;
  onSelect?: (it: GFlightItinerary) => void;
}

type LayoverKind = "tight" | "long" | "overnight" | "ok";

export function GFlightCard({ itinerary, isBest, isCheapest, isFastest, onSelect }: Props) {
  const flights = itinerary.flights ?? [];
  const layovers = itinerary.layovers ?? [];
  const first = flights[0];
  const last = flights[flights.length - 1];
  const stops = itinerary.stops ?? Math.max(0, flights.length - 1);
  const dep = first?.departure_airport;
  const arr = last?.arrival_airport;
  const overnight = dayDiff(dep?.time, arr?.time);
  const airlines = Array.from(new Set(flights.map(f => f.airline).filter(Boolean) as string[]));
  const flightNumbers = flights.map(f => f.flight_number).filter(Boolean).join(" · ");
  const logo = itinerary.airline_logo ?? first?.airline_logo;
  const co2 = itinerary.carbon_emissions;
  const bags = itinerary.bags;
  const detected = detectBags(itinerary);

  const hasUSB = hasExtension(itinerary, /USB|power/i);
  const hasWifi = hasExtension(itinerary, /wi-?fi/i);
  const hasVideo = hasExtension(itinerary, /video|on-demand|entertainment/i);

  // Detecta o pior layover · prioridade tight > overnight > long
  const worstLayover = useMemo<(GLayover & { kind: LayoverKind }) | null>(() => {
    if (!layovers.length) return null;
    let worst: (GLayover & { kind: LayoverKind }) | null = null;
    for (const lv of layovers) {
      const dur = lv.duration ?? 0;
      let kind: LayoverKind = "ok";
      if (dur > 0 && dur < 45) kind = "tight";
      else if (dur > 720) kind = "overnight";
      else if (dur > 300) kind = "long";
      if (kind === "tight") return { ...lv, kind };
      if (kind === "overnight" && (!worst || worst.kind === "ok" || worst.kind === "long")) worst = { ...lv, kind };
      if (kind === "long" && (!worst || worst.kind === "ok")) worst = { ...lv, kind };
    }
    return worst;
  }, [layovers]);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(itinerary)}
      className={cn(
        "w-full text-left rounded-lg border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all",
        isBest ? "border-primary/40 ring-1 ring-primary/20" : "border-border",
      )}
    >
      {/* Top: cia + preço */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {logo ? (
            <img src={logo} alt="" className="h-8 w-8 object-contain rounded bg-white p-0.5 border border-border/40 shrink-0" />
          ) : (
            <div className="h-8 w-8 rounded bg-muted/40 grid place-items-center shrink-0">
              <Plane className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{airlines.join(" + ") || "—"}</div>
            <div className="text-[10px] text-muted-foreground truncate">
              {flightNumbers}
              {first?.travel_class && <> · {cabinLabel(first.travel_class)}</>}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold text-primary">{formatBRL(itinerary.price)}</div>
          <div className="text-[10px] text-muted-foreground">por adulto</div>
        </div>
      </div>

      {/* Tags de destaque */}
      {(isBest || isCheapest || isFastest || itinerary.is_round_trip || (flights.length >= 3 && !itinerary.is_round_trip)) && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {isBest && (
            <Badge variant="default" className="gap-1 text-[10px]"><Award className="h-2.5 w-2.5" /> Recomendado</Badge>
          )}
          {isCheapest && (
            <Badge variant="outline" className="gap-1 text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
              <DollarSign className="h-2.5 w-2.5" /> Mais barato
            </Badge>
          )}
          {isFastest && (
            <Badge variant="outline" className="gap-1 text-[10px] border-sky-500/40 text-sky-700 dark:text-sky-300">
              <Zap className="h-2.5 w-2.5" /> Mais rápido
            </Badge>
          )}
          {itinerary.is_round_trip && (
            <Badge variant="outline" className="gap-1 text-[10px] border-violet-500/40 text-violet-700 dark:text-violet-300">
              <Repeat className="h-2.5 w-2.5" /> Ida e volta
            </Badge>
          )}
          {flights.length >= 3 && !itinerary.is_round_trip && (
            <Badge variant="outline" className="gap-1 text-[10px] border-indigo-500/40 text-indigo-700 dark:text-indigo-300">
              🗺️ {flights.length} trechos
            </Badge>
          )}
        </div>
      )}

      {/* Mini-render de uma rota (leg início → leg fim · serve pra IDA, VOLTA ou única) */}
      {(() => {
        const renderRoute = (legs: typeof flights, lays: typeof layovers, label?: string, totalText?: string) => {
          const f = legs[0];
          const l = legs[legs.length - 1];
          const d = f?.departure_airport;
          const a = l?.arrival_airport;
          const ovn = dayDiff(d?.time, a?.time);
          const stp = Math.max(lays.length, Math.max(0, legs.length - 1));
          return (
            <div className="space-y-1">
              {label && (
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  {label}
                  {totalText && <span className="text-muted-foreground/70 normal-case font-normal">· {totalText}</span>}
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-base font-bold font-mono leading-none">{formatTime(d?.time)}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{d?.id}</div>
                </div>
                <div className="flex-1 flex flex-col items-center min-w-0">
                  <div className="text-[10px] text-muted-foreground">{totalText || ""}</div>
                  <div className="w-full h-px bg-border my-1 relative">
                    {lays.map((_, i) => (
                      <div key={i}
                        className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-500"
                        style={{ left: `${((i + 1) / (lays.length + 1)) * 100}%` }}
                      />
                    ))}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate w-full text-center">
                    {stp === 0
                      ? <span className="text-emerald-600 dark:text-emerald-400 font-medium">Direto</span>
                      : <span className="text-amber-700 dark:text-amber-400 font-medium">
                          {stp} {stp === 1 ? "parada" : "paradas"}
                          {lays.length > 0 && ` · ${lays.map((x) => x.id).filter(Boolean).join(", ")}`}
                        </span>
                    }
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-base font-bold font-mono leading-none">
                    {formatTime(a?.time)}
                    {ovn > 0 && <sup className="text-[10px] text-rose-500 ml-0.5">+{ovn}</sup>}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{a?.id}</div>
                </div>
              </div>
            </div>
          );
        };

        if (itinerary.is_round_trip && itinerary.outbound_flights?.length && itinerary.return_flights?.length) {
          return (
            <div className="space-y-3 mb-3">
              {renderRoute(
                itinerary.outbound_flights,
                itinerary.outbound_layovers ?? [],
                "✈️ Ida",
                itinerary.outbound_duration_text || formatMinutes(itinerary.outbound_duration),
              )}
              <div className="border-t border-dashed border-border/60" />
              {renderRoute(
                itinerary.return_flights,
                itinerary.return_layovers ?? [],
                "🔄 Volta",
                itinerary.return_duration_text || formatMinutes(itinerary.return_duration),
              )}
            </div>
          );
        }
        return (
          <div className="mb-3">
            {renderRoute(
              flights,
              layovers,
              undefined,
              itinerary.total_duration_text || formatMinutes(itinerary.total_duration),
            )}
          </div>
        );
      })()}

      {/* Bottom: badges */}
      <div className="flex items-center gap-1.5 flex-wrap pt-3 border-t border-border/40">
        {(bags?.carry_on != null && bags.carry_on > 0) ? (
          <Badge variant="outline" className="text-[10px] gap-1 h-5">
            <Briefcase className="h-2.5 w-2.5" /> Mão {bags.carry_on}
          </Badge>
        ) : detected.carry_on === "yes" ? (
          <Badge variant="outline" className="text-[10px] gap-1 h-5">
            <Briefcase className="h-2.5 w-2.5" /> Mão inclusa
          </Badge>
        ) : detected.carry_on === "no" ? (
          <Badge variant="outline" className="text-[10px] gap-1 h-5 border-rose-500/30 text-rose-700 dark:text-rose-300">
            <Briefcase className="h-2.5 w-2.5" /> Sem mão
          </Badge>
        ) : null}
        {(bags?.checked != null && bags.checked > 0) ? (
          <Badge variant="outline" className="text-[10px] gap-1 h-5">
            <Luggage className="h-2.5 w-2.5" /> Despachada {bags.checked}
          </Badge>
        ) : detected.checked === "yes" ? (
          <Badge variant="outline" className="text-[10px] gap-1 h-5">
            <Luggage className="h-2.5 w-2.5" /> Despachada inclusa
          </Badge>
        ) : detected.checked === "no" ? (
          <Badge variant="outline" className="text-[10px] gap-1 h-5 border-rose-500/30 text-rose-700 dark:text-rose-300">
            <Luggage className="h-2.5 w-2.5" /> Sem despachada
          </Badge>
        ) : null}
        {co2?.difference_percent != null && (
          <Badge variant="outline"
            className={cn("text-[10px] gap-1 h-5",
              co2.difference_percent < 0 && "border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
              co2.difference_percent > 10 && "border-rose-500/30 text-rose-700 dark:text-rose-300",
            )}>
            <Leaf className="h-2.5 w-2.5" /> CO₂ {co2.difference_percent > 0 ? "+" : ""}{co2.difference_percent}%
          </Badge>
        )}
        {itinerary.self_transfer && (
          <Badge
            variant="outline"
            className="text-[10px] gap-1 h-5 border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300"
            title="Sem proteção em conexão perdida"
          >
            <ShieldAlert className="h-2.5 w-2.5" /> Self-transfer · sem proteção
          </Badge>
        )}
        {worstLayover?.kind === "tight" && (
          <Badge variant="outline" className="text-[10px] gap-1 h-5 border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300">
            <AlertTriangle className="h-2.5 w-2.5" />
            Conexão apertada · {formatMinutes(worstLayover.duration)} em {worstLayover.id}
          </Badge>
        )}
        {worstLayover?.kind === "long" && (
          <Badge variant="outline" className="text-[10px] gap-1 h-5 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
            <Clock className="h-2.5 w-2.5" />
            Conexão arrastada · {formatMinutes(worstLayover.duration)} em {worstLayover.id}
          </Badge>
        )}
        {worstLayover?.kind === "overnight" && (
          <Badge variant="outline" className="text-[10px] gap-1 h-5 border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
            <Moon className="h-2.5 w-2.5" />
            Pernoite forçado · {formatMinutes(worstLayover.duration)} em {worstLayover.id}
          </Badge>
        )}
        {itinerary.delay?.values && (
          <Badge variant="outline" className="text-[10px] gap-1 h-5 border-amber-500/30 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-2.5 w-2.5" />
            Atrasos{itinerary.delay.text ? ` · ${itinerary.delay.text}${typeof itinerary.delay.text === "number" ? " min" : ""}` : ""}
          </Badge>
        )}
        {hasUSB && <Badge variant="outline" className="text-[10px] gap-1 h-5"><Power className="h-2.5 w-2.5" /> USB</Badge>}
        {hasWifi && <Badge variant="outline" className="text-[10px] gap-1 h-5"><Wifi className="h-2.5 w-2.5" /> Wi-Fi</Badge>}
        {hasVideo && <Badge variant="outline" className="text-[10px] gap-1 h-5"><Tv className="h-2.5 w-2.5" /> Vídeo</Badge>}
        {itinerary.booking_token ? (
          <div className="ml-auto flex items-center gap-1 text-[10px] text-primary font-medium">
            <Layers className="h-3 w-3" /> Comparar canais
            <ChevronRight className="h-3 w-3" />
          </div>
        ) : (
          <div className="ml-auto text-[10px] text-primary font-medium">Ver detalhes →</div>
        )}
      </div>
    </button>
  );
}
