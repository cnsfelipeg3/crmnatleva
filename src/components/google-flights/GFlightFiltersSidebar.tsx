import { useMemo } from "react";
import {
  Filter, X, Briefcase, Luggage, Plane, Sunrise, Sun, Moon, Leaf,
  ShieldAlert, MapPin,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  formatBRL,
  formatMinutes,
  detectBags,
  type GFlightFilters,
  type GFlightItinerary,
} from "./gflightsTypes";

interface Props {
  flights: GFlightItinerary[];
  filters: GFlightFilters;
  onChange: (next: GFlightFilters) => void;
  onReset: () => void;
}

const SORT_OPTIONS: Array<{ value: GFlightFilters["sortBy"]; label: string }> = [
  { value: "price_asc", label: "Menor preço" },
  { value: "duration_asc", label: "Mais rápido" },
  { value: "departure_asc", label: "Saída mais cedo" },
  { value: "co2_asc", label: "Menos emissões CO₂" },
];

export function GFlightFiltersSidebar({ flights, filters, onChange, onReset }: Props) {
  // Cias dinâmicas com count
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

  function toggle<T>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
  }

  // Effective values (se filtro ainda zerado, usar limites)
  const effectivePMax = filters.priceMax || limits.pMax;
  const effectiveDMax = filters.durationMaxMin || limits.dMax;

  // Aeroportos de conexão · count dinâmico
  const connAirports = useMemo(() => {
    const map = new Map<string, { count: number; city?: string }>();
    for (const it of flights) {
      for (const lv of it.layovers ?? []) {
        if (!lv.id) continue;
        const cur = map.get(lv.id) ?? { count: 0, city: lv.city };
        cur.count += 1;
        if (!cur.city) cur.city = lv.city;
        map.set(lv.id, cur);
      }
    }
    return Array.from(map.entries())
      .map(([id, info]) => ({ id, count: info.count, city: info.city }))
      .sort((a, b) => b.count - a.count);
  }, [flights]);

  const QUICK = [
    { v: "direct" as const, label: "Direto", icon: Plane },
    { v: "morning" as const, label: "Manhã", icon: Sunrise },
    { v: "afternoon" as const, label: "Tarde", icon: Sun },
    { v: "evening" as const, label: "Noite", icon: Moon },
    { v: "eco" as const, label: "Eco", icon: Leaf },
  ];

  return (
    <Card className="p-4 space-y-5 sticky top-4">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Filtros</h3>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-7 px-2 text-[11px] gap-1"
          onClick={onReset}
        >
          <X className="h-3 w-3" /> Limpar
        </Button>
      </div>

      {/* Ordenação */}
      <div className="space-y-1.5">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Ordenar por</Label>
        <Select
          value={filters.sortBy}
          onValueChange={(v) => onChange({ ...filters, sortBy: v as GFlightFilters["sortBy"] })}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Paradas */}
      <div className="space-y-2">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Paradas</Label>
        {([
          { v: "0" as const, label: "Direto" },
          { v: "1" as const, label: "1 parada" },
          { v: "2+" as const, label: "2+ paradas" },
        ]).map(opt => (
          <label key={opt.v} className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox
              checked={filters.stops.includes(opt.v)}
              onCheckedChange={() => onChange({ ...filters, stops: toggle(filters.stops, opt.v) })}
            />
            {opt.label}
          </label>
        ))}
      </div>

      {/* Cias */}
      {airlinesCount.length > 0 && (
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Cias aéreas {filters.airlines.length > 0 && (
              <Badge variant="outline" className="ml-1 text-[9px] h-4 px-1">{filters.airlines.length}</Badge>
            )}
          </Label>
          <ScrollArea className="max-h-44 pr-2">
            <div className="space-y-1.5">
              {airlinesCount.map(([name, count]) => (
                <label key={name} className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={filters.airlines.length === 0 || filters.airlines.includes(name)}
                    onCheckedChange={() => {
                      // Lógica: se nada marcado = todos. Se marca um, vira filtro.
                      if (filters.airlines.length === 0) {
                        onChange({ ...filters, airlines: airlinesCount.filter(([n]) => n !== name).map(([n]) => n) });
                      } else {
                        const next = toggle(filters.airlines, name);
                        // Se desmarcou tudo, resetar pra "todos"
                        onChange({ ...filters, airlines: next.length === 0 ? [] : next });
                      }
                    }}
                  />
                  <span className="flex-1 truncate">{name}</span>
                  <span className="text-[10px] text-muted-foreground">{count}</span>
                </label>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Preço */}
      {limits.pMax > limits.pMin && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Preço</Label>
            <span className="text-[10px] text-muted-foreground">
              até {formatBRL(effectivePMax)}
            </span>
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

      {/* Janela de saída */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Saída</Label>
          <span className="text-[10px] text-muted-foreground font-mono">
            {String(filters.depHourFrom).padStart(2, "0")}h · {String(filters.depHourTo).padStart(2, "0")}h
          </span>
        </div>
        <Slider
          min={0}
          max={24}
          step={1}
          value={[filters.depHourFrom, filters.depHourTo]}
          onValueChange={(v) => onChange({ ...filters, depHourFrom: v[0], depHourTo: v[1] })}
        />
      </div>

      {/* Bagagem */}
      <div className="space-y-2">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Bagagem inclusa</Label>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <Checkbox
            checked={filters.bagCarryOn}
            onCheckedChange={(c) => onChange({ ...filters, bagCarryOn: !!c })}
          />
          <Briefcase className="h-3 w-3" /> De mão
        </label>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <Checkbox
            checked={filters.bagChecked}
            onCheckedChange={(c) => onChange({ ...filters, bagChecked: !!c })}
          />
          <Luggage className="h-3 w-3" /> Despachada
        </label>
      </div>

      {/* Janela de chegada */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Horário de chegada</Label>
          <span className="text-[10px] text-muted-foreground font-mono">
            {String(filters.arrHourFrom).padStart(2, "0")}h · {String(filters.arrHourTo).padStart(2, "0")}h
          </span>
        </div>
        <Slider
          min={0}
          max={24}
          step={1}
          value={[filters.arrHourFrom, filters.arrHourTo]}
          onValueChange={(v) => onChange({ ...filters, arrHourFrom: v[0], arrHourTo: v[1] })}
        />
      </div>

      {/* Aeroportos de conexão · count dinâmico */}
      {connAirports.length > 0 && (
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Aeroportos de conexão
          </Label>
          <ScrollArea className="max-h-44 pr-2">
            <div className="space-y-1.5">
              {connAirports.map(({ id, count, city }) => {
                const isExcluded = filters.excludeConnectingAirports.includes(id);
                return (
                  <div key={id} className="flex items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="font-mono font-semibold">{id}</span>
                      {city && <span className="text-muted-foreground truncate">· {city}</span>}
                      <span className="text-muted-foreground">({count})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onChange({
                        ...filters,
                        excludeConnectingAirports: isExcluded
                          ? filters.excludeConnectingAirports.filter(x => x !== id)
                          : [...filters.excludeConnectingAirports, id],
                      })}
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded border transition-colors shrink-0",
                        isExcluded
                          ? "bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-300"
                          : "border-border text-muted-foreground hover:border-rose-500/30",
                      )}
                    >
                      {isExcluded ? "Excluído" : "Excluir"}
                    </button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Segurança · toggles */}
      <div className="space-y-2">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Segurança</Label>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="ex-self-transfer" className="text-xs cursor-pointer flex items-center gap-1.5">
            <ShieldAlert className="h-3 w-3" /> Sem self-transfer
          </Label>
          <Switch
            id="ex-self-transfer"
            checked={filters.excludeSelfTransfer}
            onCheckedChange={(v) => onChange({ ...filters, excludeSelfTransfer: !!v })}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="ex-prob-layover" className="text-xs cursor-pointer">
            Sem conexão muito curta/longa
          </Label>
          <Switch
            id="ex-prob-layover"
            checked={filters.excludeProblematicLayovers}
            onCheckedChange={(v) => onChange({ ...filters, excludeProblematicLayovers: !!v })}
          />
        </div>
      </div>
    </Card>
  );
}

// ----------------------------------------------------------------------
// Helpers de aplicação dos filtros (exportados pra usar na página)
// ----------------------------------------------------------------------

import { getDepHour } from "./gflightsTypes";

export function applyFilters(
  flights: GFlightItinerary[],
  filters: GFlightFilters,
): GFlightItinerary[] {
  let out = flights.slice();

  // Stops
  if (filters.stops.length > 0 && filters.stops.length < 3) {
    out = out.filter(f => {
      const s = f.stops ?? f.flights.length - 1;
      const bucket = s === 0 ? "0" : s === 1 ? "1" : "2+";
      return filters.stops.includes(bucket);
    });
  }

  // Airlines (se vazio = todas)
  if (filters.airlines.length > 0) {
    out = out.filter(f =>
      f.flights.some(leg => leg.airline && filters.airlines.includes(leg.airline)),
    );
  }

  // Preço
  if (filters.priceMax > 0) {
    out = out.filter(f => typeof f.price !== "number" || f.price <= filters.priceMax);
  }
  if (filters.priceMin > 0) {
    out = out.filter(f => typeof f.price !== "number" || f.price >= filters.priceMin);
  }

  // Duração
  if (filters.durationMaxMin > 0) {
    out = out.filter(f => typeof f.total_duration !== "number" || f.total_duration <= filters.durationMaxMin);
  }

  // Janela de saída
  if (filters.depHourFrom > 0 || filters.depHourTo < 24) {
    out = out.filter(f => {
      const h = getDepHour(f);
      if (h === null) return true;
      return h >= filters.depHourFrom && h <= filters.depHourTo;
    });
  }

  // Bagagem · usa heurística resiliente (numérico + extensions[])
  if (filters.bagCarryOn) {
    out = out.filter(f => detectBags(f).carry_on);
  }
  if (filters.bagChecked) {
    out = out.filter(f => detectBags(f).checked);
  }

  // Sort
  out.sort((a, b) => {
    switch (filters.sortBy) {
      case "price_asc":
        return (a.price ?? Infinity) - (b.price ?? Infinity);
      case "duration_asc":
        return (a.total_duration ?? Infinity) - (b.total_duration ?? Infinity);
      case "departure_asc": {
        const ha = getDepHour(a) ?? 99;
        const hb = getDepHour(b) ?? 99;
        return ha - hb;
      }
      case "co2_asc":
        return (a.carbon_emissions?.this_flight ?? Infinity) - (b.carbon_emissions?.this_flight ?? Infinity);
      default:
        return 0;
    }
  });

  return out;
}
