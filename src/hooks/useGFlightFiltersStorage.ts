import { useEffect, useRef, useState } from "react";
import { DEFAULT_GFLIGHT_FILTERS, type GFlightFilters } from "@/components/google-flights/gflightsTypes";

const STORAGE_KEY = "gflights:filters:v1";
const AUTO_KEY = "gflights:filters:auto:v1";

function safeParse(raw: string | null): Partial<GFlightFilters> | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Persistência dos filtros do buscador no localStorage.
 * Faz merge com o default para tolerar versões antigas / chaves novas.
 */
export function useGFlightFiltersStorage() {
  const [filters, setFilters] = useState<GFlightFilters>(() => {
    if (typeof window === "undefined") return DEFAULT_GFLIGHT_FILTERS;
    const stored = safeParse(window.localStorage.getItem(STORAGE_KEY));
    return { ...DEFAULT_GFLIGHT_FILTERS, ...(stored ?? {}) } as GFlightFilters;
  });

  const [autoApply, setAutoApply] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(AUTO_KEY) === "1";
  });

  // Persiste filtros (debounced via microtask)
  const writeRef = useRef<number | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (writeRef.current) window.clearTimeout(writeRef.current);
    writeRef.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
      } catch {
        /* quota / private mode · ignora */
      }
    }, 200);
    return () => {
      if (writeRef.current) window.clearTimeout(writeRef.current);
    };
  }, [filters]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(AUTO_KEY, autoApply ? "1" : "0");
    } catch {
      /* ignora */
    }
  }, [autoApply]);

  return { filters, setFilters, autoApply, setAutoApply };
}
