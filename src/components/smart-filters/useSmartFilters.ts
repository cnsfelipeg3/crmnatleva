import { useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addDays, addMonths, startOfYear, endOfYear, isWithinInterval, isSameDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { SmartFilterConfig, SmartFilterState, DatePreset } from "./types";

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

/** Parse YYYY-MM-DD as local date (not UTC) to avoid timezone shifts */
function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function parseDatePresetRange(preset: DatePreset): { from: Date; to: Date } | null {
  const now = new Date();
  const today = startOfDay(now);
  switch (preset) {
    case "today": return { from: today, to: endOfDay(now) };
    case "tomorrow": { const t = addDays(today, 1); return { from: t, to: endOfDay(t) }; }
    case "this_week": return { from: startOfWeek(today, { locale: ptBR }), to: endOfWeek(today, { locale: ptBR }) };
    case "next_7_days": return { from: today, to: endOfDay(addDays(today, 7)) };
    case "next_30_days": return { from: today, to: endOfDay(addDays(today, 30)) };
    case "this_month": return { from: startOfMonth(today), to: endOfMonth(today) };
    case "next_month": { const nm = addMonths(today, 1); return { from: startOfMonth(nm), to: endOfMonth(nm) }; }
    case "last_30_days": return { from: addDays(today, -30), to: endOfDay(now) };
    case "this_year": return { from: startOfYear(today), to: endOfYear(today) };
    default: return null;
  }
}

function serializeState(state: SmartFilterState): Record<string, string> {
  const params: Record<string, string> = {};
  if (state.search) params.q = state.search;
  if (state.sortKey) params.sort = `${state.sortKey}:${state.sortDirection}`;
  // Always serialize the date field if it's set (even when preset is "all")
  if (state.dateFilter.field) {
    params.date = `${state.dateFilter.field}:${state.dateFilter.preset}`;
  }
  if (state.dateFilter.preset === "custom" && state.dateFilter.from && state.dateFilter.to) {
    params.from = state.dateFilter.from.toISOString().slice(0, 10);
    params.to = state.dateFilter.to.toISOString().slice(0, 10);
  }
  if (state.dateFilter.preset === "specific" && state.dateFilter.specificDate) {
    params.specific = state.dateFilter.specificDate.toISOString().slice(0, 10);
  }
  Object.entries(state.selectFilters).forEach(([k, v]) => {
    if (v && v !== "all") params[k] = v;
  });
  return params;
}

function deserializeState(
  params: URLSearchParams,
  config: SmartFilterConfig
): SmartFilterState {
  const sort = params.get("sort")?.split(":") || [];
  const dateParts = params.get("date")?.split(":") || [];

  const selectFilters: Record<string, string> = {};
  config.selectFilters.forEach(sf => {
    selectFilters[sf.key] = params.get(sf.key) || "all";
  });

  const dateField = dateParts[0] || config.dateField || "";
  const datePreset = (dateParts[1] as DatePreset) || "all";

  return {
    search: params.get("q") || "",
    sortKey: sort[0] || config.defaultSortKey || config.sortOptions[0]?.key || "",
    sortDirection: (sort[1] as "asc" | "desc") || config.defaultSortDirection || "asc",
    dateFilter: {
      field: dateField,
      preset: datePreset,
      from: params.get("from") ? parseLocalDate(params.get("from")!) : undefined,
      to: params.get("to") ? parseLocalDate(params.get("to")!) : undefined,
      specificDate: params.get("specific") ? parseLocalDate(params.get("specific")!) : undefined,
    },
    selectFilters,
  };
}

export function useSmartFilters<T>(data: T[], config: SmartFilterConfig<T>) {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo(
    () => deserializeState(searchParams, config),
    [searchParams, config]
  );

  const setState = useCallback(
    (updater: Partial<SmartFilterState> | ((prev: SmartFilterState) => SmartFilterState)) => {
      setSearchParams(prev => {
        const currentState = deserializeState(prev, config);
        const next = typeof updater === "function" ? updater(currentState) : { ...currentState, ...updater };
        const serialized = serializeState(next);
        return serialized;
      }, { replace: true });
    },
    [setSearchParams, config]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (state.search) count++;
    if (state.dateFilter.preset !== "all") count++;
    Object.values(state.selectFilters).forEach(v => { if (v && v !== "all") count++; });
    return count;
  }, [state]);

  const clearAll = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const filtered = useMemo(() => {
    let result = [...data];

    // 1. Text search
    if (state.search) {
      const q = state.search.toLowerCase();
      result = result.filter(item =>
        config.searchFields.some(field => {
          const val = getNestedValue(item, field);
          if (val == null) return false;
          if (Array.isArray(val)) return val.some(v => String(v).toLowerCase().includes(q));
          return String(val).toLowerCase().includes(q);
        })
      );
    }

    // 2. Date filters
    if (state.dateFilter.preset !== "all" && state.dateFilter.field) {
      if (state.dateFilter.preset === "specific" && state.dateFilter.specificDate) {
        result = result.filter(item => {
          const val = getNestedValue(item, state.dateFilter.field);
          if (!val) return false;
          return isSameDay(new Date(val), state.dateFilter.specificDate!);
        });
      } else if (state.dateFilter.preset === "custom" && state.dateFilter.from && state.dateFilter.to) {
        const from = startOfDay(state.dateFilter.from);
        const to = endOfDay(state.dateFilter.to);
        result = result.filter(item => {
          const val = getNestedValue(item, state.dateFilter.field);
          if (!val) return false;
          return isWithinInterval(new Date(val), { start: from, end: to });
        });
      } else {
        const range = parseDatePresetRange(state.dateFilter.preset);
        if (range) {
          result = result.filter(item => {
            const val = getNestedValue(item, state.dateFilter.field);
            if (!val) return false;
            return isWithinInterval(new Date(val), { start: range.from, end: range.to });
          });
        }
      }
    }

    // 3. Select filters
    Object.entries(state.selectFilters).forEach(([key, value]) => {
      if (!value || value === "all") return;
      result = result.filter(item => {
        const itemVal = getNestedValue(item, key);
        if (Array.isArray(itemVal)) return itemVal.includes(value);
        return String(itemVal) === value;
      });
    });

    // 4. Sort
    if (state.sortKey) {
      const sortOpt = config.sortOptions.find(o => o.key === state.sortKey);
      const dir = state.sortDirection === "desc" ? -1 : 1;
      result.sort((a, b) => {
        const aVal = getNestedValue(a, state.sortKey);
        const bVal = getNestedValue(b, state.sortKey);
        // Nulls always at the end
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        if (sortOpt?.type === "date") {
          return (new Date(aVal).getTime() - new Date(bVal).getTime()) * dir;
        }
        if (sortOpt?.type === "number") {
          return (Number(aVal) - Number(bVal)) * dir;
        }
        return String(aVal).localeCompare(String(bVal), "pt-BR") * dir;
      });
    }

    return result;
  }, [data, state, config]);

  return { filtered, state, setState, activeFilterCount, clearAll };
}
