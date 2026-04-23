import { useMemo, useState } from "react";
import {
  Filter,
  X,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Luggage,
  ShieldCheck,
  MapPin,
  ChevronDown,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import {
  type FlightFiltersState,
  type FlightsAggregation,
  formatMoney,
  moneyToNumber,
} from "./flightTypes";

interface Props {
  aggregation: FlightsAggregation | undefined;
  isLoading: boolean;
  state: FlightFiltersState;
  onStateChange: (next: FlightFiltersState) => void;
  filteredCount?: number | null;
  className?: string;
}

const TIME_SLOTS = [
  { key: "00:00-05:59", label: "Madrugada", icon: Moon, range: "00h–06h" },
  { key: "06:00-11:59", label: "Manhã", icon: Sunrise, range: "06h–12h" },
  { key: "12:00-17:59", label: "Tarde", icon: Sun, range: "12h–18h" },
  { key: "18:00-23:59", label: "Noite", icon: Sunset, range: "18h–00h" },
];

function toggleInSet<T>(set: Set<T>, v: T): Set<T> {
  const next = new Set(set);
  if (next.has(v)) next.delete(v);
  else next.add(v);
  return next;
}

export function FlightFiltersSidebar({
  aggregation,
  isLoading,
  state,
  onStateChange,
  filteredCount,
  className,
}: Props) {
  const clearAll = () => {
    onStateChange({
      airlines: new Set(),
      stops: new Set(),
      maxBudget: undefined,
      maxDuration: undefined,
      maxLayoverDuration: undefined,
      departureTimeSlots: new Set(),
      arrivalTimeSlots: new Set(),
      baggage: new Set(),
      flexibleTicketOnly: false,
      departureAirports: new Set(),
      arrivalAirports: new Set(),
    });
  };

  const hasActive =
    state.airlines.size > 0 ||
    state.stops.size > 0 ||
    state.maxBudget !== undefined ||
    state.maxDuration !== undefined ||
    state.maxLayoverDuration !== undefined ||
    state.departureTimeSlots.size > 0 ||
    state.arrivalTimeSlots.size > 0 ||
    state.baggage.size > 0 ||
    !!state.flexibleTicketOnly ||
    state.departureAirports.size > 0 ||
    state.arrivalAirports.size > 0;

  const budgetMin = useMemo(
    () => (aggregation?.budget ? moneyToNumber(aggregation.budget.min) ?? 0 : 0),
    [aggregation?.budget],
  );
  const budgetMax = useMemo(
    () =>
      aggregation?.budget ? moneyToNumber(aggregation.budget.max) ?? 10000 : 10000,
    [aggregation?.budget],
  );
  const currentBudget = state.maxBudget ?? budgetMax;

  const durationJourney = aggregation?.duration?.find(
    (d) => d.durationType === "JOURNEY",
  );
  const durationLayover = aggregation?.duration?.find(
    (d) => d.durationType === "LAYOVER",
  );

  if (isLoading) {
    return (
      <aside className={cn("space-y-3", className)}>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </aside>
    );
  }

  if (!aggregation) return null;

  return (
    <aside className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Filtros</h3>
        </div>
        {hasActive && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 gap-1 text-xs">
            <X className="h-3 w-3" />
            Limpar
          </Button>
        )}
      </div>

      {typeof filteredCount === "number" && (
        <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <strong className="text-foreground">
            {filteredCount.toLocaleString("pt-BR")}
          </strong>{" "}
          voos batem com os filtros
        </div>
      )}

      {/* Ticket flexível em destaque */}
      {aggregation.flexibleTicket && (
        <div className="flex items-center justify-between rounded-md border border-border bg-card p-3">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <div className="text-sm font-medium">Ticket flexível</div>
              <div className="text-xs text-muted-foreground">
                Só voos com cancelamento grátis
              </div>
            </div>
          </div>
          <Switch
            checked={!!state.flexibleTicketOnly}
            onCheckedChange={(c) =>
              onStateChange({ ...state, flexibleTicketOnly: c })
            }
          />
        </div>
      )}

      <Accordion
        type="multiple"
        defaultValue={["stops", "budget", "airlines", "depTime"]}
        className="space-y-1"
      >
        {/* Paradas */}
        {aggregation.stops && aggregation.stops.length > 0 && (
          <AccordionItem value="stops" className="rounded-md border border-border bg-card px-3">
            <AccordionTrigger className="py-2 text-sm hover:no-underline">
              <span className="flex items-center gap-2">
                Paradas
                {state.stops.size > 0 && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    {state.stops.size}
                  </span>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pb-1">
                {aggregation.stops.map((s) => {
                  const label =
                    s.numberOfStops === 0
                      ? "Direto"
                      : `${s.numberOfStops} escala${s.numberOfStops > 1 ? "s" : ""}`;
                  const id = `stop-${s.numberOfStops}`;
                  return (
                    <label
                      key={id}
                      htmlFor={id}
                      className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-muted/50"
                    >
                      <Checkbox
                        id={id}
                        checked={state.stops.has(s.numberOfStops)}
                        onCheckedChange={() =>
                          onStateChange({
                            ...state,
                            stops: toggleInSet(state.stops, s.numberOfStops),
                          })
                        }
                      />
                      <span className="flex-1 text-sm">
                        {label}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({s.count})
                        </span>
                      </span>
                      {s.minPrice && (
                        <span className="text-xs text-muted-foreground">
                          a partir de {formatMoney(s.minPrice)}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Orçamento */}
        {aggregation.budget && budgetMax > budgetMin && (
          <AccordionItem value="budget" className="rounded-md border border-border bg-card px-3">
            <AccordionTrigger className="py-2 text-sm hover:no-underline">
              <span className="flex items-center gap-2">
                Orçamento máximo
                {state.maxBudget !== undefined && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    ativo
                  </span>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pb-2">
                <Slider
                  value={[currentBudget]}
                  min={budgetMin}
                  max={budgetMax}
                  step={Math.max(50, Math.round((budgetMax - budgetMin) / 50))}
                  onValueChange={(v) =>
                    onStateChange({
                      ...state,
                      maxBudget:
                        v[0] >= budgetMax ? undefined : Math.round(v[0]),
                    })
                  }
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatMoney(aggregation.budget.min)}</span>
                  <span className="font-semibold text-foreground">
                    até R$ {Math.round(currentBudget).toLocaleString("pt-BR")}
                  </span>
                  <span>{formatMoney(aggregation.budget.max)}</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Companhias aéreas */}
        {aggregation.airlines && aggregation.airlines.length > 0 && (
          <AccordionItem value="airlines" className="rounded-md border border-border bg-card px-3">
            <AccordionTrigger className="py-2 text-sm hover:no-underline">
              <span className="flex items-center gap-2">
                Companhias aéreas
                {state.airlines.size > 0 && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    {state.airlines.size}
                  </span>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <AirlinesList
                airlines={aggregation.airlines}
                selected={state.airlines}
                onToggle={(code) =>
                  onStateChange({
                    ...state,
                    airlines: toggleInSet(state.airlines, code),
                  })
                }
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Horário de partida */}
        <AccordionItem value="depTime" className="rounded-md border border-border bg-card px-3">
          <AccordionTrigger className="py-2 text-sm hover:no-underline">
            <span className="flex items-center gap-2">
              Horário de partida
              {state.departureTimeSlots.size > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  {state.departureTimeSlots.size}
                </span>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-2 pb-1">
              {TIME_SLOTS.map((slot) => {
                const active = state.departureTimeSlots.has(slot.key);
                const Icon = slot.icon;
                const count = aggregation.flightTimes?.[0]?.departure?.find(
                  (d) => `${d.start}-${d.end}` === slot.key,
                )?.count;
                return (
                  <button
                    key={slot.key}
                    type="button"
                    onClick={() =>
                      onStateChange({
                        ...state,
                        departureTimeSlots: toggleInSet(
                          state.departureTimeSlots,
                          slot.key,
                        ),
                      })
                    }
                    className={cn(
                      "flex flex-col items-center gap-1 rounded border p-2 text-center transition-colors",
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-medium">{slot.label}</span>
                    <span className="text-[10px] text-muted-foreground">{slot.range}</span>
                    {count !== undefined && (
                      <span className="text-[10px] text-muted-foreground">({count})</span>
                    )}
                  </button>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Horário de chegada */}
        <AccordionItem value="arrTime" className="rounded-md border border-border bg-card px-3">
          <AccordionTrigger className="py-2 text-sm hover:no-underline">
            <span className="flex items-center gap-2">
              Horário de chegada
              {state.arrivalTimeSlots.size > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  {state.arrivalTimeSlots.size}
                </span>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-2 pb-1">
              {TIME_SLOTS.map((slot) => {
                const active = state.arrivalTimeSlots.has(slot.key);
                const Icon = slot.icon;
                const count = aggregation.flightTimes?.[0]?.arrival?.find(
                  (d) => `${d.start}-${d.end}` === slot.key,
                )?.count;
                return (
                  <button
                    key={slot.key}
                    type="button"
                    onClick={() =>
                      onStateChange({
                        ...state,
                        arrivalTimeSlots: toggleInSet(
                          state.arrivalTimeSlots,
                          slot.key,
                        ),
                      })
                    }
                    className={cn(
                      "flex flex-col items-center gap-1 rounded border p-2 text-center transition-colors",
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-medium">{slot.label}</span>
                    <span className="text-[10px] text-muted-foreground">{slot.range}</span>
                    {count !== undefined && (
                      <span className="text-[10px] text-muted-foreground">({count})</span>
                    )}
                  </button>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Duração total */}
        {durationJourney && durationJourney.max > durationJourney.min && (
          <AccordionItem value="duration" className="rounded-md border border-border bg-card px-3">
            <AccordionTrigger className="py-2 text-sm hover:no-underline">
              <span className="flex items-center gap-2">
                Duração total (máx)
                {state.maxDuration !== undefined && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    ativo
                  </span>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pb-2">
                <Slider
                  value={[state.maxDuration ?? durationJourney.max]}
                  min={durationJourney.min}
                  max={durationJourney.max}
                  step={1}
                  onValueChange={(v) =>
                    onStateChange({
                      ...state,
                      maxDuration: v[0] >= durationJourney.max ? undefined : v[0],
                    })
                  }
                />
                <div className="text-center text-xs text-muted-foreground">
                  até{" "}
                  <span className="font-semibold text-foreground">
                    {state.maxDuration ?? durationJourney.max}h
                  </span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Duração de escala */}
        {durationLayover && durationLayover.max > durationLayover.min && (
          <AccordionItem value="layover" className="rounded-md border border-border bg-card px-3">
            <AccordionTrigger className="py-2 text-sm hover:no-underline">
              <span className="flex items-center gap-2">
                Escala (máx)
                {state.maxLayoverDuration !== undefined && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    ativo
                  </span>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pb-2">
                <Slider
                  value={[state.maxLayoverDuration ?? durationLayover.max]}
                  min={durationLayover.min}
                  max={durationLayover.max}
                  step={1}
                  onValueChange={(v) =>
                    onStateChange({
                      ...state,
                      maxLayoverDuration:
                        v[0] >= durationLayover.max ? undefined : v[0],
                    })
                  }
                />
                <div className="text-center text-xs text-muted-foreground">
                  máx{" "}
                  <span className="font-semibold text-foreground">
                    {state.maxLayoverDuration ?? durationLayover.max}h
                  </span>{" "}
                  de escala
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Bagagem */}
        {aggregation.baggage && aggregation.baggage.length > 0 && (
          <AccordionItem value="baggage" className="rounded-md border border-border bg-card px-3">
            <AccordionTrigger className="py-2 text-sm hover:no-underline">
              <span className="flex items-center gap-2">
                <Luggage className="h-3.5 w-3.5" />
                Bagagem
                {state.baggage.size > 0 && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    {state.baggage.size}
                  </span>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pb-1">
                {aggregation.baggage.map((b, i) => {
                  const val = b.paramValue || b.name;
                  const id = `bag-${i}`;
                  return (
                    <label
                      key={id}
                      htmlFor={id}
                      className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-muted/50"
                    >
                      <Checkbox
                        id={id}
                        checked={state.baggage.has(val)}
                        onCheckedChange={() =>
                          onStateChange({
                            ...state,
                            baggage: toggleInSet(state.baggage, val),
                          })
                        }
                      />
                      <span className="flex-1 text-sm">{b.name}</span>
                      <span className="text-xs text-muted-foreground">({b.count})</span>
                    </label>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Aeroportos */}
        {aggregation.airports && aggregation.airports.length > 0 && (
          <AccordionItem value="airports" className="rounded-md border border-border bg-card px-3">
            <AccordionTrigger className="py-2 text-sm hover:no-underline">
              <span className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                Aeroportos
                {state.departureAirports.size + state.arrivalAirports.size > 0 && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    {state.departureAirports.size + state.arrivalAirports.size}
                  </span>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pb-1">
                {aggregation.airports.slice(0, 12).map((a, i) => {
                  const isDep = a.type === "departure";
                  const selected = isDep ? state.departureAirports : state.arrivalAirports;
                  const id = `apt-${i}-${a.code}`;
                  return (
                    <label
                      key={id}
                      htmlFor={id}
                      className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-muted/50"
                    >
                      <Checkbox
                        id={id}
                        checked={selected.has(a.code)}
                        onCheckedChange={() =>
                          onStateChange({
                            ...state,
                            [isDep ? "departureAirports" : "arrivalAirports"]:
                              toggleInSet(selected, a.code),
                          })
                        }
                      />
                      <span className="flex-1 text-sm">
                        <span className="font-mono font-semibold">{a.code}</span>
                        {a.name && (
                          <span className="text-xs text-muted-foreground"> — {a.name}</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">({a.count})</span>
                    </label>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </aside>
  );
}

function AirlinesList({
  airlines,
  selected,
  onToggle,
  maxVisible = 8,
}: {
  airlines: Array<{
    iataCode: string;
    name: string;
    logoUrl?: string;
    count: number;
    minPrice?: { currencyCode: string; units: number; nanos: number };
  }>;
  selected: Set<string>;
  onToggle: (code: string) => void;
  maxVisible?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? airlines : airlines.slice(0, maxVisible);

  return (
    <div className="space-y-2 pb-1">
      {visible.map((a) => {
        const id = `airline-${a.iataCode}`;
        return (
          <label
            key={id}
            htmlFor={id}
            className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-muted/50"
          >
            <Checkbox
              id={id}
              checked={selected.has(a.iataCode)}
              onCheckedChange={() => onToggle(a.iataCode)}
            />
            {a.logoUrl ? (
              <img
                src={a.logoUrl}
                alt=""
                className="h-5 w-5 rounded object-contain"
                loading="lazy"
              />
            ) : (
              <span className="inline-block h-5 w-5 rounded bg-muted" />
            )}
            <span className="flex-1 truncate text-sm">{a.name}</span>
            <span className="text-xs text-muted-foreground">({a.count})</span>
            {a.minPrice && (
              <span className="text-xs font-medium text-foreground">
                {formatMoney(a.minPrice as any)}
              </span>
            )}
          </label>
        );
      })}
      {airlines.length > maxVisible && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {expanded ? "Mostrar menos" : `Mostrar mais ${airlines.length - maxVisible}`}
          <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
        </button>
      )}
    </div>
  );
}
