import { useMemo, useState } from "react";
import {
  SlidersHorizontal, Plane, Sunrise, Sun, Moon, Leaf, Briefcase, Luggage,
  ArrowDownUp, ChevronDown, X, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  formatBRL,
  formatMinutes,
  DEFAULT_GFLIGHT_FILTERS,
  type GFlightFilters,
  type GFlightItinerary,
} from "./gflightsTypes";

interface Props {
  filters: GFlightFilters;
  onChange: (next: GFlightFilters) => void;
  onReset: () => void;
  /** Voos disponíveis (após busca) · usado para popular cias e limites dinâmicos. */
  flights?: GFlightItinerary[];
  className?: string;
}

const SORT_OPTIONS: Array<{ value: GFlightFilters["sortBy"]; label: string }> = [
  { value: "price_asc", label: "Menor preço" },
  { value: "duration_asc", label: "Mais rápido" },
  { value: "departure_asc", label: "Saída mais cedo" },
  { value: "co2_asc", label: "Menos CO₂" },
];

const QUICK = [
  { v: "direct" as const, label: "Direto", icon: Plane },
  { v: "morning" as const, label: "Manhã", icon: Sunrise },
  { v: "afternoon" as const, label: "Tarde", icon: Sun },
  { v: "evening" as const, label: "Noite", icon: Moon },
  { v: "eco" as const, label: "Eco", icon: Leaf },
];

const STOPS_OPTS: Array<{ v: "0" | "1" | "2+"; label: string; short: string }> = [
  { v: "0", label: "Voo direto", short: "Direto" },
  { v: "1", label: "1 parada", short: "1 parada" },
  { v: "2+", label: "2+ paradas", short: "2+" },
];

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
}

export function GFlightInlineFilters({
  filters, onChange, onReset, flights = [], className,
}: Props) {
  const [open, setOpen] = useState(false);

  // Cias dinâmicas
  const airlinesCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of flights) {
      const set = new Set<string>();
      for (const leg of f.flights ?? []) {
        if (leg.airline) set.add(leg.airline);
      }
      for (const a of set) map.set(a, (map.get(a) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [flights]);

  // Limites dinâmicos
  const limits = useMemo(() => {
    const prices = flights.map(f => f.price).filter((p): p is number => typeof p === "number");
    const durs = flights.map(f => f.total_duration).filter((d): d is number => typeof d === "number");
    return {
      pMin: prices.length ? Math.min(...prices) : 0,
      pMax: prices.length ? Math.max(...prices) : 0,
      dMin: durs.length ? Math.min(...durs) : 0,
      dMax: durs.length ? Math.max(...durs) : 0,
    };
  }, [flights]);

  const effectivePMax = filters.priceMax || limits.pMax;
  const effectiveDMax = filters.durationMaxMin || limits.dMax;

  // Conta filtros ativos (vs default)
  const activeCount = useMemo(() => {
    let n = 0;
    if (filters.stops.length > 0 && filters.stops.length < 3) n++;
    if (filters.airlines.length > 0) n++;
    if (filters.priceMax > 0) n++;
    if (filters.durationMaxMin > 0) n++;
    if (filters.depHourFrom > 0 || filters.depHourTo < 24) n++;
    if (filters.arrHourFrom > 0 || filters.arrHourTo < 24) n++;
    if (filters.bagCarryOn) n++;
    if (filters.bagChecked) n++;
    if (filters.quickFilter) n++;
    if (filters.excludeSelfTransfer) n++;
    if (filters.excludeProblematicLayovers) n++;
    if (filters.excludeConnectingAirports.length > 0) n++;
    return n;
  }, [filters]);

  const allStops = filters.stops.length === 3 || filters.stops.length === 0;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {/* Quick chips · paradas */}
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 p-0.5">
          <button
            type="button"
            onClick={() => onChange({ ...filters, stops: ["0", "1", "2+"] })}
            className={cn(
              "px-2.5 py-1 text-[11px] rounded-full transition-all",
              allStops ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Todas
          </button>
          {STOPS_OPTS.map(opt => {
            const isSolo = filters.stops.length === 1 && filters.stops[0] === opt.v;
            return (
              <button
                key={opt.v}
                type="button"
                onClick={() => onChange({ ...filters, stops: isSolo ? ["0", "1", "2+"] : [opt.v] })}
                className={cn(
                  "px-2.5 py-1 text-[11px] rounded-full transition-all",
                  isSolo ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                title={opt.label}
              >
                {opt.short}
              </button>
            );
          })}
        </div>

        {/* Quick filters chips */}
        {QUICK.map(({ v, label, icon: Icon }) => {
          const active = filters.quickFilter === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange({ ...filters, quickFilter: active ? null : v })}
              className={cn(
                "inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-all",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-background/60 text-muted-foreground hover:text-foreground hover:border-primary/40"
              )}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          );
        })}

        {/* Bagagem */}
        <button
          type="button"
          onClick={() => onChange({ ...filters, bagCarryOn: !filters.bagCarryOn })}
          className={cn(
            "inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-all",
            filters.bagCarryOn
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
          )}
        >
          <Briefcase className="h-3 w-3" />
          Mão
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...filters, bagChecked: !filters.bagChecked })}
          className={cn(
            "inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-all",
            filters.bagChecked
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
          )}
        >
          <Luggage className="h-3 w-3" />
          Despachada
        </button>

        {/* Ordenação compacta */}
        <Select
          value={filters.sortBy}
          onValueChange={(v) => onChange({ ...filters, sortBy: v as GFlightFilters["sortBy"] })}
        >
          <SelectTrigger className="h-8 w-auto gap-1 px-2.5 text-[11px] rounded-full">
            <ArrowDownUp className="h-3 w-3" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Mais filtros · popover */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 rounded-full text-[11px]"
            >
              <SlidersHorizontal className="h-3 w-3" />
              Mais filtros
              {activeCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 min-w-[16px] px-1 text-[9px]">{activeCount}</Badge>
              )}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[360px] p-0" align="end">
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-5 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Refinar busca</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px] gap-1"
                    onClick={onReset}
                  >
                    <X className="h-3 w-3" /> Limpar
                  </Button>
                </div>

                {/* Paradas multiselect */}
                <div className="space-y-2">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Paradas</Label>
                  {STOPS_OPTS.map(opt => {
                    const checked = filters.stops.includes(opt.v);
                    return (
                      <label key={opt.v} className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => {
                            const next = toggle(filters.stops, opt.v);
                            onChange({ ...filters, stops: next.length === 0 ? ["0", "1", "2+"] : next });
                          }}
                        />
                        {opt.label}
                      </label>
                    );
                  })}
                </div>

                {/* Preço */}
                {limits.pMax > limits.pMin && (
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Preço máx.</Label>
                      <span className="text-[10px] text-muted-foreground">até {formatBRL(effectivePMax)}</span>
                    </div>
                    <Slider
                      min={limits.pMin}
                      max={limits.pMax}
                      step={Math.max(50, Math.round((limits.pMax - limits.pMin) / 50))}
                      value={[effectivePMax]}
                      onValueChange={(v) => onChange({ ...filters, priceMax: v[0], priceMin: limits.pMin })}
                    />
                    <div className="flex justify-between text-[9px] text-muted-foreground">
                      <span>{formatBRL(limits.pMin)}</span>
                      <span>{formatBRL(limits.pMax)}</span>
                    </div>
                  </div>
                )}

                {/* Duração */}
                {limits.dMax > limits.dMin && (
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Duração máx.</Label>
                      <span className="text-[10px] text-muted-foreground">{formatMinutes(effectiveDMax)}</span>
                    </div>
                    <Slider
                      min={limits.dMin}
                      max={limits.dMax}
                      step={30}
                      value={[effectiveDMax]}
                      onValueChange={(v) => onChange({ ...filters, durationMaxMin: v[0] })}
                    />
                  </div>
                )}

                {/* Janela saída */}
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Saída</Label>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {String(filters.depHourFrom).padStart(2, "0")}h · {String(filters.depHourTo).padStart(2, "0")}h
                    </span>
                  </div>
                  <Slider
                    min={0} max={24} step={1}
                    value={[filters.depHourFrom, filters.depHourTo]}
                    onValueChange={(v) => onChange({ ...filters, depHourFrom: v[0], depHourTo: v[1] })}
                  />
                </div>

                {/* Janela chegada */}
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Chegada</Label>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {String(filters.arrHourFrom).padStart(2, "0")}h · {String(filters.arrHourTo).padStart(2, "0")}h
                    </span>
                  </div>
                  <Slider
                    min={0} max={24} step={1}
                    value={[filters.arrHourFrom, filters.arrHourTo]}
                    onValueChange={(v) => onChange({ ...filters, arrHourFrom: v[0], arrHourTo: v[1] })}
                  />
                </div>

                {/* Cias */}
                {airlinesCount.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        <Building2 className="inline h-3 w-3 mr-1" />
                        Companhias
                        {filters.airlines.length > 0 && (
                          <Badge variant="outline" className="ml-1 text-[9px] h-4 px-1">{filters.airlines.length}</Badge>
                        )}
                      </Label>
                      {filters.airlines.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onChange({ ...filters, airlines: [] })}
                          className="text-[10px] text-primary hover:underline"
                        >Todas</button>
                      )}
                    </div>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {airlinesCount.map(([name, count]) => {
                        const allSelected = filters.airlines.length === 0;
                        const checked = allSelected || filters.airlines.includes(name);
                        return (
                          <label key={name} className="flex items-center gap-2 text-xs cursor-pointer">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => {
                                if (allSelected) {
                                  onChange({ ...filters, airlines: [name] });
                                  return;
                                }
                                const next = toggle(filters.airlines, name);
                                onChange({ ...filters, airlines: next });
                              }}
                            />
                            <span className="flex-1 truncate">{name}</span>
                            <span className="text-[10px] text-muted-foreground">{count}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Avançado */}
                <div className="space-y-2 border-t border-border pt-3">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Avançado</Label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={filters.excludeSelfTransfer}
                      onCheckedChange={(c) => onChange({ ...filters, excludeSelfTransfer: !!c })}
                    />
                    Excluir self-transfer (bagagem própria)
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={filters.excludeProblematicLayovers}
                      onCheckedChange={(c) => onChange({ ...filters, excludeProblematicLayovers: !!c })}
                    />
                    Excluir conexões problemáticas (curtas/longas)
                  </label>
                </div>
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={onReset}
          >
            <X className="h-3 w-3" />
            Limpar ({activeCount})
          </Button>
        )}
      </div>
    </div>
  );
}
