import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  SlidersHorizontal, Plane, Sunrise, Sun, Moon, Leaf, Briefcase, Luggage,
  ArrowDownUp, ChevronDown, X, Building2, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  formatBRL,
  formatMinutes,
  type GFlightFilters,
  type GFlightItinerary,
} from "./gflightsTypes";

interface Props {
  filters: GFlightFilters;
  onChange: (next: GFlightFilters) => void;
  onReset: () => void;
  /** Voos disponíveis (após busca) · usado para popular cias e limites dinâmicos. */
  flights?: GFlightItinerary[];
  /** Total de voos que passam nos filtros atuais (calculado fora). */
  filteredCount?: number;
  /** Se controlado, mostra toggle "Auto-buscar" e dispara o callback. */
  autoApply?: boolean;
  onAutoApplyChange?: (next: boolean) => void;
  /** Disparado quando filters muda (debounce 400ms) e autoApply=true. */
  onAutoSearch?: () => void;
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

// Classe utilitária para foco visível consistente em todos os chips.
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background";

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
}

/**
 * Navegação por setas dentro de um radiogroup horizontal.
 * Move o foco e aciona o radio (padrão WAI-ARIA).
 */
function handleRadioGroupKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
  const key = e.key;
  if (key !== "ArrowRight" && key !== "ArrowLeft" && key !== "Home" && key !== "End") return;
  const group = e.currentTarget;
  const radios = Array.from(
    group.querySelectorAll<HTMLButtonElement>('[role="radio"]')
  ).filter(el => !el.hasAttribute("disabled"));
  if (radios.length === 0) return;
  const currentIndex = radios.findIndex(el => el === document.activeElement);
  let nextIndex = currentIndex;
  if (key === "ArrowRight") nextIndex = (currentIndex + 1 + radios.length) % radios.length;
  else if (key === "ArrowLeft") nextIndex = (currentIndex - 1 + radios.length) % radios.length;
  else if (key === "Home") nextIndex = 0;
  else if (key === "End") nextIndex = radios.length - 1;
  if (nextIndex !== currentIndex && radios[nextIndex]) {
    e.preventDefault();
    radios[nextIndex].focus();
    radios[nextIndex].click();
  }
}

function GFlightInlineFiltersImpl({
  filters, onChange, onReset, flights = [],
  filteredCount, autoApply, onAutoApplyChange, onAutoSearch,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Cias dinâmicas · memoizadas pelo conteúdo, não pela referência do array.
  const flightsKey = flights.length;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flightsKey, flights]);

  // Limites dinâmicos · também por tamanho da lista
  const limits = useMemo(() => {
    let pMin = Infinity, pMax = -Infinity, dMin = Infinity, dMax = -Infinity;
    for (const f of flights) {
      if (typeof f.price === "number") {
        if (f.price < pMin) pMin = f.price;
        if (f.price > pMax) pMax = f.price;
      }
      if (typeof f.total_duration === "number") {
        if (f.total_duration < dMin) dMin = f.total_duration;
        if (f.total_duration > dMax) dMax = f.total_duration;
      }
    }
    return {
      pMin: Number.isFinite(pMin) ? pMin : 0,
      pMax: Number.isFinite(pMax) ? pMax : 0,
      dMin: Number.isFinite(dMin) ? dMin : 0,
      dMax: Number.isFinite(dMax) ? dMax : 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flightsKey, flights]);

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

  // Auto-buscar · debounce ao mudar filters
  const firstRunRef = useRef(true);
  useEffect(() => {
    if (!autoApply || !onAutoSearch) return;
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    const t = window.setTimeout(() => onAutoSearch(), 400);
    return () => window.clearTimeout(t);
  }, [filters, autoApply, onAutoSearch]);

  // Restaura foco no trigger ao fechar o popover (a11y)
  // O retorno efetivo é feito em onCloseAutoFocus para evitar race com rAF.
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
  };

  const countLabel = typeof filteredCount === "number"
    ? `${filteredCount} voo${filteredCount === 1 ? "" : "s"}`
    : null;

  return (
    <div className={cn("space-y-2", className)} role="region" aria-label="Filtros de busca de voos">
      <div className="flex flex-wrap items-center gap-2">
        {/* Quick chips · paradas */}
        <div
          role="radiogroup"
          aria-label="Filtrar por número de paradas"
          onKeyDown={handleRadioGroupKeyDown}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 p-0.5"
        >
          <button
            type="button"
            role="radio"
            aria-checked={allStops}
            tabIndex={allStops ? 0 : -1}
            onClick={() => onChange({ ...filters, stops: ["0", "1", "2+"] })}
            className={cn(
              "px-2.5 py-1 text-[11px] rounded-full transition-all",
              FOCUS_RING,
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
                role="radio"
                aria-checked={isSolo}
                aria-label={opt.label}
                tabIndex={isSolo ? 0 : -1}
                onClick={() => onChange({ ...filters, stops: isSolo ? ["0", "1", "2+"] : [opt.v] })}
                className={cn(
                  "px-2.5 py-1 text-[11px] rounded-full transition-all",
                  FOCUS_RING,
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
              aria-pressed={active}
              aria-label={`Filtro rápido ${label}${active ? " · ativo" : ""}`}
              onClick={() => onChange({ ...filters, quickFilter: active ? null : v })}
              className={cn(
                "inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-all",
                FOCUS_RING,
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-background/60 text-muted-foreground hover:text-foreground hover:border-primary/40"
              )}
            >
              <Icon className="h-3 w-3" aria-hidden="true" />
              {label}
            </button>
          );
        })}

        {/* Bagagem */}
        <button
          type="button"
          aria-pressed={filters.bagCarryOn}
          aria-label={`Bagagem de mão inclusa${filters.bagCarryOn ? " · ativo" : ""}`}
          onClick={() => onChange({ ...filters, bagCarryOn: !filters.bagCarryOn })}
          className={cn(
            "inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-all",
            FOCUS_RING,
            filters.bagCarryOn
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
          )}
        >
          <Briefcase className="h-3 w-3" aria-hidden="true" />
          Mão
        </button>
        <button
          type="button"
          aria-pressed={filters.bagChecked}
          aria-label={`Bagagem despachada inclusa${filters.bagChecked ? " · ativo" : ""}`}
          onClick={() => onChange({ ...filters, bagChecked: !filters.bagChecked })}
          className={cn(
            "inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-all",
            FOCUS_RING,
            filters.bagChecked
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
          )}
        >
          <Luggage className="h-3 w-3" aria-hidden="true" />
          Despachada
        </button>

        {/* Ordenação compacta */}
        <Select
          value={filters.sortBy}
          onValueChange={(v) => onChange({ ...filters, sortBy: v as GFlightFilters["sortBy"] })}
        >
          <SelectTrigger
            aria-label="Ordenar resultados"
            className={cn("h-8 w-auto gap-1 px-2.5 text-[11px] rounded-full", FOCUS_RING)}
          >
            <ArrowDownUp className="h-3 w-3" aria-hidden="true" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Mais filtros · popover */}
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button
              ref={triggerRef}
              variant="outline"
              size="sm"
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-label={`Mais filtros${activeCount > 0 ? ` (${activeCount} ativo${activeCount === 1 ? "" : "s"})` : ""}`}
              className={cn("h-8 gap-1 rounded-full text-[11px]", FOCUS_RING)}
            >
              <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
              Mais filtros
              {activeCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 min-w-[16px] px-1 text-[9px]">{activeCount}</Badge>
              )}
              <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[360px] p-0"
            align="end"
            role="dialog"
            aria-modal="false"
            aria-labelledby="gflights-filters-title"
            onOpenAutoFocus={(e) => {
              // Foca no primeiro elemento interativo dentro do popover
              const root = e.currentTarget as HTMLElement;
              const first = root.querySelector<HTMLElement>(
                "button:not([disabled]), [role='checkbox']:not([disabled]), [role='slider'], input:not([disabled]), [role='switch'], [tabindex]:not([tabindex='-1'])"
              );
              if (first) {
                e.preventDefault();
                first.focus();
              }
            }}
            onCloseAutoFocus={(e) => {
              // Garante retorno do foco ao trigger sem rolagem brusca
              e.preventDefault();
              triggerRef.current?.focus({ preventScroll: true });
            }}
            onEscapeKeyDown={() => setOpen(false)}
          >
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-5 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h4 id="gflights-filters-title" className="text-sm font-semibold">Refinar busca</h4>
                  <div className="flex items-center gap-2">
                    {countLabel && (
                      <Badge variant="outline" className="text-[10px] h-5 gap-1" aria-live="polite">
                        {countLabel}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("h-7 px-2 text-[11px] gap-1", FOCUS_RING)}
                      onClick={onReset}
                      aria-label="Limpar todos os filtros"
                    >
                      <X className="h-3 w-3" aria-hidden="true" /> Limpar
                    </Button>
                  </div>
                </div>

                {/* Auto-buscar */}
                {onAutoApplyChange && (
                  <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                      <Label htmlFor="gflights-auto-apply" className="text-xs cursor-pointer">
                        Buscar automaticamente
                      </Label>
                    </div>
                    <Switch
                      id="gflights-auto-apply"
                      checked={!!autoApply}
                      onCheckedChange={onAutoApplyChange}
                      aria-label="Reexecutar busca automaticamente ao alterar filtros"
                    />
                  </div>
                )}

                {/* Paradas multiselect */}
                <fieldset className="space-y-2">
                  <legend className="text-[11px] uppercase tracking-wider text-muted-foreground">Paradas</legend>
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
                          aria-label={opt.label}
                        />
                        {opt.label}
                      </label>
                    );
                  })}
                </fieldset>

                {/* Preço */}
                {limits.pMax > limits.pMin && (
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <Label htmlFor="gflights-price-slider" className="text-[11px] uppercase tracking-wider text-muted-foreground">Preço máx.</Label>
                      <span className="text-[10px] text-muted-foreground">até {formatBRL(effectivePMax)}</span>
                    </div>
                    <Slider
                      id="gflights-price-slider"
                      aria-label="Preço máximo"
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
                      <Label htmlFor="gflights-dur-slider" className="text-[11px] uppercase tracking-wider text-muted-foreground">Duração máx.</Label>
                      <span className="text-[10px] text-muted-foreground">{formatMinutes(effectiveDMax)}</span>
                    </div>
                    <Slider
                      id="gflights-dur-slider"
                      aria-label="Duração máxima"
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
                    <Label htmlFor="gflights-dep-slider" className="text-[11px] uppercase tracking-wider text-muted-foreground">Saída</Label>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {String(filters.depHourFrom).padStart(2, "0")}h · {String(filters.depHourTo).padStart(2, "0")}h
                    </span>
                  </div>
                  <Slider
                    id="gflights-dep-slider"
                    aria-label="Janela de horário de saída"
                    min={0} max={24} step={1}
                    value={[filters.depHourFrom, filters.depHourTo]}
                    onValueChange={(v) => onChange({ ...filters, depHourFrom: v[0], depHourTo: v[1] })}
                  />
                </div>

                {/* Janela chegada */}
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="gflights-arr-slider" className="text-[11px] uppercase tracking-wider text-muted-foreground">Chegada</Label>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {String(filters.arrHourFrom).padStart(2, "0")}h · {String(filters.arrHourTo).padStart(2, "0")}h
                    </span>
                  </div>
                  <Slider
                    id="gflights-arr-slider"
                    aria-label="Janela de horário de chegada"
                    min={0} max={24} step={1}
                    value={[filters.arrHourFrom, filters.arrHourTo]}
                    onValueChange={(v) => onChange({ ...filters, arrHourFrom: v[0], arrHourTo: v[1] })}
                  />
                </div>

                {/* Cias */}
                {airlinesCount.length > 0 && (
                  <fieldset className="space-y-2">
                    <legend className="flex w-full items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
                      <span className="inline-flex items-center">
                        <Building2 className="inline h-3 w-3 mr-1" aria-hidden="true" />
                        Companhias
                        {filters.airlines.length > 0 && (
                          <Badge variant="outline" className="ml-1 text-[9px] h-4 px-1">{filters.airlines.length}</Badge>
                        )}
                      </span>
                      {filters.airlines.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onChange({ ...filters, airlines: [] })}
                          className={cn("text-[10px] text-primary hover:underline", FOCUS_RING)}
                        >Todas</button>
                      )}
                    </legend>
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
                              aria-label={`${name} · ${count} voo${count === 1 ? "" : "s"}`}
                            />
                            <span className="flex-1 truncate">{name}</span>
                            <span className="text-[10px] text-muted-foreground">{count}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                )}

                {/* Avançado */}
                <fieldset className="space-y-2 border-t border-border pt-3">
                  <legend className="text-[11px] uppercase tracking-wider text-muted-foreground">Avançado</legend>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={filters.excludeSelfTransfer}
                      onCheckedChange={(c) => onChange({ ...filters, excludeSelfTransfer: !!c })}
                      aria-label="Excluir self-transfer (bagagem própria)"
                    />
                    Excluir self-transfer (bagagem própria)
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={filters.excludeProblematicLayovers}
                      onCheckedChange={(c) => onChange({ ...filters, excludeProblematicLayovers: !!c })}
                      aria-label="Excluir conexões problemáticas"
                    />
                    Excluir conexões problemáticas (curtas/longas)
                  </label>
                </fieldset>
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* Contador de matches inline · sempre visível quando há resultados */}
        {countLabel && (
          <Badge
            variant="secondary"
            className="h-7 rounded-full px-2.5 text-[11px] font-medium"
            aria-live="polite"
            aria-label={`${countLabel} correspondem aos filtros`}
          >
            {countLabel}
          </Badge>
        )}

        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 gap-1 text-[11px] text-muted-foreground hover:text-foreground", FOCUS_RING)}
            onClick={onReset}
            aria-label={`Limpar ${activeCount} filtro${activeCount === 1 ? "" : "s"} ativo${activeCount === 1 ? "" : "s"}`}
          >
            <X className="h-3 w-3" aria-hidden="true" />
            Limpar ({activeCount})
          </Button>
        )}
      </div>
    </div>
  );
}

export const GFlightInlineFilters = memo(GFlightInlineFiltersImpl);
