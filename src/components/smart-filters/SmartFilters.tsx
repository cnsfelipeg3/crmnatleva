import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Search, ArrowUpDown, X, SlidersHorizontal, CalendarIcon, CalendarRange,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { SmartFilterConfig, SmartFilterState, DatePreset, SelectFilterConfig } from "./types";
import { DATE_PRESET_LABELS } from "./types";
import type { DateRange } from "react-day-picker";

interface SmartFiltersProps {
  config: SmartFilterConfig;
  state: SmartFilterState;
  setState: (updater: Partial<SmartFilterState> | ((prev: SmartFilterState) => SmartFilterState)) => void;
  activeFilterCount: number;
  clearAll: () => void;
  /** Extra select filter options dynamically extracted from data */
  dynamicOptions?: Record<string, string[]>;
}

const DEFAULT_PILLS: DatePreset[] = ["today", "tomorrow", "next_7_days", "next_30_days", "this_month", "next_month", "all"];

export default function SmartFilters({
  config, state, setState, activeFilterCount, clearAll, dynamicOptions,
}: SmartFiltersProps) {
  const isMobile = useIsMobile();
  const [localSearch, setLocalSearch] = useState(state.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Sync localSearch when state.search changes externally
  useEffect(() => { setLocalSearch(state.search); }, [state.search]);

  const handleSearchChange = useCallback((value: string) => {
    setLocalSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setState({ search: value });
    }, 200);
  }, [setState]);

  const setDatePreset = useCallback((preset: DatePreset) => {
    setState(prev => ({
      ...prev,
      dateFilter: {
        ...prev.dateFilter,
        field: prev.dateFilter.field || config.dateField || "",
        preset,
        from: undefined,
        to: undefined,
        specificDate: undefined,
      },
    }));
  }, [setState, config.dateField]);

  const pillPresets = config.pillPresets || DEFAULT_PILLS;

  const sortToggle = useCallback(() => {
    setState(prev => ({
      ...prev,
      sortDirection: prev.sortDirection === "asc" ? "desc" : "asc",
    }));
  }, [setState]);

  const renderDateFieldSelector = () => {
    if (!config.dateFieldOptions || config.dateFieldOptions.length <= 1) return null;
    const currentField = state.dateFilter.field || config.dateField || "";
    return (
      <Select
        value={currentField}
        onValueChange={v =>
          setState(prev => ({
            ...prev,
            dateFilter: { ...prev.dateFilter, field: v },
          }))
        }
      >
        <SelectTrigger className="w-[150px] h-8 text-xs" aria-label="Campo de data">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {config.dateFieldOptions.map(o => (
            <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const [specificOpen, setSpecificOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(undefined);

  // Sync pending range when popover opens
  useEffect(() => {
    if (rangeOpen) {
      setPendingRange(
        state.dateFilter.from && state.dateFilter.to
          ? { from: state.dateFilter.from, to: state.dateFilter.to }
          : undefined
      );
    }
  }, [rangeOpen]);

  const renderDatePickers = () => (
    <div className="flex gap-1.5 items-center flex-wrap">
      {/* Specific date */}
      <Popover open={specificOpen} onOpenChange={setSpecificOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={state.dateFilter.preset === "specific" ? "default" : "outline"}
            size="sm"
            className="h-7 text-[11px] gap-1"
            aria-label="Filtrar por data específica"
          >
            <CalendarIcon className="w-3 h-3" />
            {state.dateFilter.preset === "specific" && state.dateFilter.specificDate
              ? format(state.dateFilter.specificDate, "dd/MM/yy", { locale: ptBR })
              : "Data"
            }
            {state.dateFilter.preset === "specific" && (
              <X
                className="w-3 h-3 ml-0.5 opacity-60 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  setDatePreset("all");
                  setSpecificOpen(false);
                }}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={state.dateFilter.specificDate}
            onSelect={(date) => {
              if (date) {
                setState(prev => ({
                  ...prev,
                  dateFilter: {
                    ...prev.dateFilter,
                    field: prev.dateFilter.field || config.dateField || "",
                    preset: "specific",
                    specificDate: date,
                    from: undefined,
                    to: undefined,
                  },
                }));
                setSpecificOpen(false);
              }
            }}
            locale={ptBR}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* Range */}
      <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={state.dateFilter.preset === "custom" ? "default" : "outline"}
            size="sm"
            className="h-7 text-[11px] gap-1"
            aria-label="Filtrar por intervalo de datas"
          >
            <CalendarRange className="w-3 h-3" />
            {state.dateFilter.preset === "custom" && state.dateFilter.from && state.dateFilter.to
              ? `${format(state.dateFilter.from, "dd/MM", { locale: ptBR })} — ${format(state.dateFilter.to, "dd/MM", { locale: ptBR })}`
              : "Intervalo"
            }
            {state.dateFilter.preset === "custom" && (
              <X
                className="w-3 h-3 ml-0.5 opacity-60 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  setDatePreset("all");
                  setRangeOpen(false);
                }}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col">
            <Calendar
              mode="range"
              selected={pendingRange}
              onSelect={(range) => {
                setPendingRange(range);
                // Auto-apply when both dates are selected
                if (range?.from && range?.to && range.from.getTime() !== range.to.getTime()) {
                  setState(prev => ({
                    ...prev,
                    dateFilter: {
                      ...prev.dateFilter,
                      field: prev.dateFilter.field || config.dateField || "",
                      preset: "custom",
                      from: range.from,
                      to: range.to,
                      specificDate: undefined,
                    },
                  }));
                  // Close after a brief delay so user sees the selection
                  setTimeout(() => setRangeOpen(false), 300);
                }
              }}
              locale={ptBR}
              numberOfMonths={2}
              className="p-3 pointer-events-auto"
            />
            <div className="flex items-center justify-between px-3 pb-3 pt-1 border-t border-border">
              <span className="text-[11px] text-muted-foreground">
                {pendingRange?.from && !pendingRange?.to
                  ? "Selecione a data final"
                  : pendingRange?.from && pendingRange?.to
                    ? `${format(pendingRange.from, "dd/MM/yyyy", { locale: ptBR })} — ${format(pendingRange.to, "dd/MM/yyyy", { locale: ptBR })}`
                    : "Selecione a data inicial"
                }
              </span>
              <div className="flex gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => {
                    setPendingRange(undefined);
                    setDatePreset("all");
                    setRangeOpen(false);
                  }}
                >
                  Limpar
                </Button>
                {pendingRange?.from && pendingRange?.to && (
                  <Button
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={() => {
                      setState(prev => ({
                        ...prev,
                        dateFilter: {
                          ...prev.dateFilter,
                          field: prev.dateFilter.field || config.dateField || "",
                          preset: "custom",
                          from: pendingRange.from,
                          to: pendingRange.to,
                          specificDate: undefined,
                        },
                      }));
                      setRangeOpen(false);
                    }}
                  >
                    Aplicar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );

  const renderSelectFilters = () =>
    config.selectFilters.map(sf => {
      const options = dynamicOptions?.[sf.key] || sf.options || [];
      if (options.length === 0) return null;
      return (
        <Select
          key={sf.key}
          value={state.selectFilters[sf.key] || "all"}
          onValueChange={v =>
            setState(prev => ({
              ...prev,
              selectFilters: { ...prev.selectFilters, [sf.key]: v },
            }))
          }
        >
          <SelectTrigger className="w-[130px] h-8 text-xs" aria-label={`Filtrar por ${sf.label}`}>
            <SelectValue placeholder={sf.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos {sf.label.toLowerCase()}</SelectItem>
            {options.map(o => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    });

  const renderPills = () => (
    <div className="flex gap-1.5 flex-wrap">
      {pillPresets.map(preset => (
        <button
          key={preset}
          onClick={() => setDatePreset(preset)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            state.dateFilter.preset === preset
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          aria-label={`Filtrar por ${DATE_PRESET_LABELS[preset]}`}
        >
          {DATE_PRESET_LABELS[preset]}
        </button>
      ))}
    </div>
  );

  // ── Mobile: show pills + search inline, advanced in sheet ──
  if (isMobile) {
    return (
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={config.searchPlaceholder || "Buscar..."}
            value={localSearch}
            onChange={e => handleSearchChange(e.target.value)}
            className="pl-9 h-9 text-sm"
            aria-label="Busca textual"
          />
        </div>

        {/* Pills */}
        <div className="overflow-x-auto -mx-4 px-4">
          {renderPills()}
        </div>

        {/* Advanced filters trigger */}
        <div className="flex gap-2 items-center">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filtros
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 min-w-4 text-[9px] px-1">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <SheetHeader>
                <SheetTitle className="font-serif text-lg">Filtros Avançados</SheetTitle>
              </SheetHeader>
              <div className="space-y-5 mt-6">
                {/* Sort */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ordenar por</label>
                  <div className="flex gap-2">
                    <Select
                      value={state.sortKey}
                      onValueChange={v => setState(prev => ({ ...prev, sortKey: v }))}
                    >
                      <SelectTrigger className="flex-1 h-9 text-xs" aria-label="Ordenar por">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {config.sortOptions.map(o => (
                          <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={sortToggle} aria-label="Alternar direção">
                      <ArrowUpDown className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Date pickers */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data</label>
                  {renderDatePickers()}
                </div>

                {/* Select filters */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtros</label>
                  <div className="space-y-2">
                    {renderSelectFilters()}
                  </div>
                </div>

                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" className="w-full text-xs gap-1" onClick={() => { clearAll(); setSheetOpen(false); }}>
                    <X className="w-3 h-3" /> Limpar todos os filtros
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Sort (inline for quick access) */}
          <Select
            value={state.sortKey}
            onValueChange={v => setState(prev => ({ ...prev, sortKey: v }))}
          >
            <SelectTrigger className="w-[120px] h-8 text-xs" aria-label="Ordenar por">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {config.sortOptions.map(o => (
                <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={sortToggle} aria-label="Alternar direção de ordenação">
            <ArrowUpDown className={cn("w-3.5 h-3.5 transition-transform", state.sortDirection === "desc" && "rotate-180")} />
          </Button>
        </div>
      </div>
    );
  }

  // ── Desktop ──
  return (
    <div className="space-y-3">
      {/* Row 1: Search + Sort + Selects + Clear */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={config.searchPlaceholder || "Buscar..."}
            value={localSearch}
            onChange={e => handleSearchChange(e.target.value)}
            className="pl-9 h-9 text-sm"
            aria-label="Busca textual"
          />
        </div>

        {/* Sort */}
        <Select
          value={state.sortKey}
          onValueChange={v => setState(prev => ({ ...prev, sortKey: v }))}
        >
          <SelectTrigger className="w-[160px] h-9 text-xs" aria-label="Ordenar por">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {config.sortOptions.map(o => (
              <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={sortToggle} aria-label="Alternar direção de ordenação">
          <ArrowUpDown className={cn("w-4 h-4 transition-transform", state.sortDirection === "desc" && "rotate-180")} />
        </Button>

        {/* Select filters */}
        {renderSelectFilters()}

        {/* Active filter count + clear */}
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground" onClick={clearAll} aria-label="Limpar todos os filtros">
            <X className="w-3 h-3" />
            Limpar ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Row 2: Date field selector + presets pills + date pickers */}
      <div className="flex flex-wrap gap-2 items-center">
        {renderDateFieldSelector()}
        {config.dateFieldOptions && config.dateFieldOptions.length > 1 && (
          <div className="w-px h-5 bg-border/40 mx-0.5 hidden sm:block" />
        )}
        {renderPills()}
        <div className="w-px h-5 bg-border/40 mx-1 hidden sm:block" />
        {renderDatePickers()}
      </div>
    </div>
  );
}
