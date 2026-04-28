import { useState } from "react";
import {
  Plane, Clock, ArrowRight, Award, Zap, DollarSign, ChevronDown,
  Briefcase, Luggage, Wifi, Power, Tv, Leaf, Coffee, Armchair,
  AlertTriangle, Repeat, Sun, Moon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  cabinLabel,
  classifyExtensions,
  dayDiff,
  formatBRL,
  formatCO2,
  formatDateLong,
  formatMinutes,
  formatTime,
  type ExtensionTag,
  type GFlightItinerary,
} from "./gflightsTypes";

interface Props {
  itinerary: GFlightItinerary;
  isBest?: boolean;
  isCheapest?: boolean;
  isFastest?: boolean;
  onClick?: (it: GFlightItinerary) => void;
}

function ExtIcon({ kind }: { kind: ExtensionTag["kind"] }) {
  const cls = "h-3 w-3";
  switch (kind) {
    case "wifi": return <Wifi className={cls} />;
    case "power": return <Power className={cls} />;
    case "video": return <Tv className={cls} />;
    case "audio": return <Tv className={cls} />;
    case "legroom": return <Armchair className={cls} />;
    case "co2": return <Leaf className={cls} />;
    case "meal": return <Coffee className={cls} />;
    default: return <Plane className={cls} />;
  }
}

export function GFlightCard({ itinerary, isBest, isCheapest, isFastest, onClick }: Props) {
  const [expanded, setExpanded] = useState(false);
  const flights = itinerary.flights ?? [];
  const layovers = itinerary.layovers ?? [];
  const first = flights[0];
  const last = flights[flights.length - 1];
  const stops = itinerary.stops ?? Math.max(0, flights.length - 1);
  const dep = first?.departure_airport;
  const arr = last?.arrival_airport;
  const overnight = dayDiff(dep?.time, arr?.time);
  const carriers = Array.from(
    new Set(flights.map((f) => f.airline).filter(Boolean) as string[]),
  );
  const logo = itinerary.airline_logo ?? first?.airline_logo;
  const co2 = itinerary.carbon_emissions;
  const co2Diff = co2?.difference_percent;
  const bags = itinerary.bags;

  return (
    <Card
      className={cn(
        "p-4 transition-all hover:shadow-md border-border/60",
        isBest && "ring-2 ring-primary/30",
      )}
    >
      {/* Badges */}
      {(isBest || isCheapest || isFastest || itinerary.self_transfer || (co2Diff !== undefined && co2Diff <= -5)) && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {isBest && (
            <Badge variant="default" className="gap-1 text-[10px]">
              <Award className="h-3 w-3" /> Recomendado
            </Badge>
          )}
          {isCheapest && (
            <Badge variant="outline" className="gap-1 text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
              <DollarSign className="h-3 w-3" /> Mais barato
            </Badge>
          )}
          {isFastest && (
            <Badge variant="outline" className="gap-1 text-[10px] border-sky-500/40 text-sky-700 dark:text-sky-300">
              <Zap className="h-3 w-3" /> Mais rápido
            </Badge>
          )}
          {co2Diff !== undefined && co2Diff <= -5 && (
            <Badge variant="outline" className="gap-1 text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
              <Leaf className="h-3 w-3" /> {co2Diff}% CO₂
            </Badge>
          )}
          {itinerary.self_transfer && (
            <Badge variant="outline" className="gap-1 text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300">
              <Repeat className="h-3 w-3" /> Self transfer
            </Badge>
          )}
        </div>
      )}

      {/* Linha principal */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Logo + carriers */}
        <div className="flex items-center gap-3 md:w-44 shrink-0">
          {logo ? (
            <img src={logo} alt="" className="h-10 w-10 object-contain rounded bg-white p-1 border border-border/40" />
          ) : (
            <div className="h-10 w-10 rounded bg-muted/40 flex items-center justify-center">
              <Plane className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-xs font-medium truncate">{carriers.join(" · ") || "—"}</div>
            <div className="text-[10px] text-muted-foreground truncate">
              {flights.map((f) => f.flight_number).filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>

        {/* Route */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-lg font-bold leading-none">{formatTime(dep?.time)}</div>
              <div className="text-[11px] font-mono text-muted-foreground mt-0.5">{dep?.id}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-center text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" />
                {itinerary.total_duration_text || formatMinutes(itinerary.total_duration)}
              </div>
              <div className="relative h-px bg-border">
                <ArrowRight className="absolute -top-1.5 right-0 h-3 w-3 text-muted-foreground" />
                {layovers.map((l, i) => (
                  <div
                    key={i}
                    className="absolute -top-0.5 h-1.5 w-1.5 rounded-full bg-primary/60"
                    style={{ left: `${((i + 1) / (layovers.length + 1)) * 100}%` }}
                    title={`${l.city ?? l.name ?? l.id} · ${l.duration_text || formatMinutes(l.duration)}`}
                  />
                ))}
              </div>
              <div className="text-[10px] text-center text-muted-foreground mt-0.5">
                {stops === 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Direto</span>
                ) : (
                  <>{stops} {stops === 1 ? "parada" : "paradas"} · {layovers.map((l) => l.id ?? l.city).filter(Boolean).join(", ")}</>
                )}
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold leading-none">
                {formatTime(arr?.time)}
                {overnight > 0 && (
                  <sup className="text-[10px] text-rose-500 ml-0.5" title={`Chega ${overnight} dia${overnight > 1 ? "s" : ""} depois`}>
                    +{overnight}
                  </sup>
                )}
              </div>
              <div className="text-[11px] font-mono text-muted-foreground mt-0.5">{arr?.id}</div>
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="md:w-32 md:text-right shrink-0 border-t md:border-t-0 md:border-l border-border/40 md:pl-4 pt-2 md:pt-0">
          <div className="text-xl font-bold text-primary">{formatBRL(itinerary.price)}</div>
          <div className="text-[10px] text-muted-foreground">por adulto</div>
          <div className="text-[10px] text-muted-foreground mt-1">
            {cabinLabel((first?.travel_class as string) || "ECONOMY")}
          </div>
        </div>
      </div>

      {/* Resumo rápido (sempre visível): bagagens + CO2 */}
      <div className="mt-3 pt-3 border-t border-border/40 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
        {bags && (
          <>
            <span className="inline-flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              {bags.carry_on ? `${bags.carry_on} mão` : "Sem mão"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Luggage className="h-3 w-3" />
              {bags.checked ? `${bags.checked} despachada` : "Sem despacho"}
            </span>
          </>
        )}
        {co2?.this_flight !== undefined && (
          <span className="inline-flex items-center gap-1">
            <Leaf className={cn("h-3 w-3", co2Diff !== undefined && co2Diff < 0 && "text-emerald-600 dark:text-emerald-400")} />
            {formatCO2(co2.this_flight)}
            {co2Diff !== undefined && (
              <span className={cn(
                "ml-0.5",
                co2Diff < 0 && "text-emerald-600 dark:text-emerald-400",
                co2Diff > 0 && "text-rose-600 dark:text-rose-400",
              )}>
                ({co2Diff > 0 ? "+" : ""}{co2Diff}% rota)
              </span>
            )}
          </span>
        )}
        {itinerary.delay?.values && (
          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" /> Atrasos frequentes
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-6 px-2 text-[11px] gap-1"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Recolher" : "Detalhes"}
          <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
        </Button>
      </div>

      {/* Detalhes expandidos */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/40 space-y-3">
          {flights.map((leg, i) => {
            const legExt = classifyExtensions(leg.extensions);
            const legOvernight = dayDiff(leg.departure_airport?.time, leg.arrival_airport?.time);
            const lay = layovers[i]; // layover DEPOIS deste leg
            return (
              <div key={i} className="space-y-2">
                {/* Cabeçalho do leg */}
                <div className="flex items-start gap-3">
                  {leg.airline_logo && (
                    <img src={leg.airline_logo} alt="" className="h-8 w-8 object-contain rounded bg-white p-0.5 border border-border/40 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold">
                      {leg.airline} · <span className="font-mono">{leg.flight_number}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {leg.aircraft || "—"}
                      {leg.legroom && <> · Espaço entre assentos: {leg.legroom}</>}
                    </div>
                  </div>
                </div>

                {/* Rota detalhada */}
                <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center bg-muted/30 rounded-md p-2.5">
                  <div className="text-center">
                    <div className="text-sm font-bold leading-none flex items-center gap-1 justify-center">
                      {formatTime(leg.departure_airport?.time)}
                      <Sun className="h-3 w-3 text-amber-500/70" />
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{leg.departure_airport?.id}</div>
                    <div className="text-[10px] text-muted-foreground max-w-[120px] truncate" title={leg.departure_airport?.name}>
                      {leg.departure_airport?.name}
                    </div>
                    <div className="text-[9px] text-muted-foreground/70 mt-0.5">
                      {formatDateLong(leg.departure_airport?.time)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" />
                      {leg.duration_text || formatMinutes(leg.duration)}
                    </div>
                    <div className="h-px bg-border my-1.5 relative">
                      <Plane className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 text-primary rotate-90" />
                    </div>
                    <div className="text-[9px] text-muted-foreground/70">
                      {cabinLabel((leg.travel_class as string) || "ECONOMY")}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold leading-none flex items-center gap-1 justify-center">
                      {formatTime(leg.arrival_airport?.time)}
                      {legOvernight > 0 ? <Moon className="h-3 w-3 text-indigo-400" /> : <Sun className="h-3 w-3 text-amber-500/70" />}
                      {legOvernight > 0 && <sup className="text-[9px] text-rose-500">+{legOvernight}</sup>}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{leg.arrival_airport?.id}</div>
                    <div className="text-[10px] text-muted-foreground max-w-[120px] truncate" title={leg.arrival_airport?.name}>
                      {leg.arrival_airport?.name}
                    </div>
                    <div className="text-[9px] text-muted-foreground/70 mt-0.5">
                      {formatDateLong(leg.arrival_airport?.time)}
                    </div>
                  </div>
                </div>

                {/* Amenities classificadas */}
                {legExt.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {legExt.map((t, k) => (
                      <span
                        key={k}
                        className={cn(
                          "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border",
                          t.kind === "wifi" && "border-sky-500/30 text-sky-700 dark:text-sky-300 bg-sky-500/5",
                          t.kind === "power" && "border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/5",
                          t.kind === "video" && "border-violet-500/30 text-violet-700 dark:text-violet-300 bg-violet-500/5",
                          t.kind === "audio" && "border-violet-500/30 text-violet-700 dark:text-violet-300 bg-violet-500/5",
                          t.kind === "legroom" && "border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/5",
                          t.kind === "co2" && "border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/5",
                          t.kind === "meal" && "border-orange-500/30 text-orange-700 dark:text-orange-300 bg-orange-500/5",
                          t.kind === "other" && "border-border text-muted-foreground bg-muted/30",
                        )}
                      >
                        <ExtIcon kind={t.kind} />
                        {t.label}
                      </span>
                    ))}
                  </div>
                )}

                {/* Layover (entre este leg e o próximo) */}
                {lay && i < flights.length - 1 && (
                  <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/20 rounded-md px-3 py-2">
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

          {/* Ação principal */}
          {onClick && (
            <Button onClick={() => onClick(itinerary)} className="w-full" size="sm">
              Selecionar este voo · {formatBRL(itinerary.price)}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
