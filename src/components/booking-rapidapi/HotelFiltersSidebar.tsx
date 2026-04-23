import { useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Filter, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HotelFilter, HotelFiltersState } from "./types";

interface Props {
  filters: HotelFilter[] | undefined;
  isLoading: boolean;
  state: HotelFiltersState;
  onStateChange: (next: HotelFiltersState) => void;
  filteredCount?: number | null;
  className?: string;
}

function CheckboxGroup({
  options,
  selected,
  onToggle,
  maxVisible = 6,
}: {
  options: Array<{ title: string; genericId: string; countNotAutoextended?: number }>;
  selected: Set<string>;
  onToggle: (id: string) => void;
  maxVisible?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? options : options.slice(0, maxVisible);

  return (
    <div className="space-y-2">
      {visible.map((opt) => {
        const isChecked = selected.has(opt.genericId);
        return (
          <label
            key={opt.genericId}
            className="flex items-start gap-2 cursor-pointer text-sm hover:bg-muted/50 rounded px-1 py-0.5"
          >
            <Checkbox
              checked={isChecked}
              onCheckedChange={() => onToggle(opt.genericId)}
              className="mt-0.5"
            />
            <span className="flex-1 leading-tight">{opt.title}</span>
            {typeof opt.countNotAutoextended === "number" && (
              <span className="text-xs text-muted-foreground">
                ({opt.countNotAutoextended.toLocaleString("pt-BR")})
              </span>
            )}
          </label>
        );
      })}
      {options.length > maxVisible && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {expanded ? "Mostrar menos" : `Mostrar mais ${options.length - maxVisible}`}
          <ChevronDown
            className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")}
          />
        </button>
      )}
    </div>
  );
}

function PriceSliderWithHistogram({
  filter,
  value,
  onChange,
}: {
  filter: HotelFilter;
  value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  const min = Number(filter.min ?? 0);
  const max = Number(filter.max ?? 10000);
  const step = Number(filter.minPriceStep ?? 50);
  const hist = filter.histogram ?? [];
  const maxBar = Math.max(...hist, 1);
  const currency = filter.currency || "BRL";

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(v);

  return (
    <div className="space-y-3">
      {hist.length > 0 && (
        <div className="flex items-end gap-px h-10">
          {hist.map((h, i) => {
            const bucketSize = (max - min) / hist.length;
            const bucketStart = min + bucketSize * i;
            const bucketEnd = bucketStart + bucketSize;
            const inRange = bucketStart < value[1] && bucketEnd > value[0];
            return (
              <div
                key={i}
                className={cn(
                  "flex-1 rounded-sm transition-colors",
                  inRange ? "bg-primary/70" : "bg-muted",
                )}
                style={{ height: `${Math.max(8, (h / maxBar) * 100)}%` }}
              />
            );
          })}
        </div>
      )}
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={(v) => onChange([v[0], v[1]] as [number, number])}
        className="w-full"
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{fmt(value[0])}</span>
        <span>até</span>
        <span className="font-medium text-foreground">{fmt(value[1])}</span>
      </div>
    </div>
  );
}

export function HotelFiltersSidebar({
  filters,
  isLoading,
  state,
  onStateChange,
  filteredCount,
  className,
}: Props) {
  const priceFilter = useMemo(
    () => filters?.find((f) => f.field === "price" || f.filterStyle === "SLIDER"),
    [filters],
  );

  const priceRange: [number, number] = useMemo(() => {
    const min = state.priceMin ?? Number(priceFilter?.min ?? 0);
    const max = state.priceMax ?? Number(priceFilter?.max ?? 10000);
    return [min, max];
  }, [state.priceMin, state.priceMax, priceFilter]);

  const toggleCategory = (id: string) => {
    const next = new Set(state.categoriesSelected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onStateChange({ ...state, categoriesSelected: next });
  };

  const clearAll = () => {
    onStateChange({
      categoriesSelected: new Set(),
      priceMin: undefined,
      priceMax: undefined,
      sortBy: state.sortBy,
    });
  };

  const setPrice = (v: [number, number]) => {
    const min = Number(priceFilter?.min ?? 0);
    const max = Number(priceFilter?.max ?? 10000);
    onStateChange({
      ...state,
      priceMin: v[0] > min ? v[0] : undefined,
      priceMax: v[1] < max ? v[1] : undefined,
    });
  };

  const hasActiveFilters =
    state.categoriesSelected.size > 0 ||
    state.priceMin !== undefined ||
    state.priceMax !== undefined;

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!filters?.length) {
    return null;
  }

  const checkboxFilters = filters.filter((f) => f.filterStyle === "CHECKBOX");

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <h3 className="font-semibold text-sm">Filtros</h3>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-7 text-xs gap-1"
          >
            <X className="h-3 w-3" />
            Limpar
          </Button>
        )}
      </div>

      {typeof filteredCount === "number" && filteredCount > 0 && (
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">
            {filteredCount.toLocaleString("pt-BR")}
          </strong>{" "}
          acomodações batem com seus filtros
        </p>
      )}

      {priceFilter && (
        <div className="space-y-3 border-b border-border pb-4">
          <h4 className="text-sm font-medium">{priceFilter.title}</h4>
          <PriceSliderWithHistogram
            filter={priceFilter}
            value={priceRange}
            onChange={setPrice}
          />
        </div>
      )}

      <Accordion type="multiple" className="w-full">
        {checkboxFilters.map((f, idx) => {
          const activeInThisGroup = Array.from(
            state.categoriesSelected,
          ).filter((id) => f.options?.some((o) => o.genericId === id)).length;

          return (
            <AccordionItem key={`${f.title}-${idx}`} value={`${f.title}-${idx}`}>
              <AccordionTrigger className="text-sm hover:no-underline py-3">
                <span className="flex items-center gap-2">
                  {f.title}
                  {activeInThisGroup > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                      {activeInThisGroup}
                    </span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <CheckboxGroup
                  options={f.options ?? []}
                  selected={state.categoriesSelected}
                  onToggle={toggleCategory}
                />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
