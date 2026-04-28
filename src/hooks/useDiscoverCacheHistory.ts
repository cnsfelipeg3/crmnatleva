import { useCallback, useEffect, useState } from "react";

// Histórico de hit-rate de cache do Discover · persistido em localStorage.
// Limitado a 30 entradas pra não inflar storage.

const STORAGE_KEY = "discover:cache_history:v1";
const MAX_ENTRIES = 30;

export interface DiscoverCachePoint {
  ts: number; // epoch ms
  cache_hits: number;
  api_calls: number;
  total_checked: number;
  hit_rate_percent: number;
}

function safeRead(): DiscoverCachePoint[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is DiscoverCachePoint =>
        p && typeof p.ts === "number" && typeof p.hit_rate_percent === "number",
    );
  } catch {
    return [];
  }
}

function safeWrite(list: DiscoverCachePoint[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* quota / privacy mode · silenciar */
  }
}

export function useDiscoverCacheHistory() {
  const [history, setHistory] = useState<DiscoverCachePoint[]>(() => safeRead());

  const append = useCallback((point: Omit<DiscoverCachePoint, "ts"> & { ts?: number }) => {
    setHistory((prev) => {
      const entry: DiscoverCachePoint = {
        ts: point.ts ?? Date.now(),
        cache_hits: point.cache_hits,
        api_calls: point.api_calls,
        total_checked: point.total_checked,
        hit_rate_percent: point.hit_rate_percent,
      };
      const next = [...prev, entry].slice(-MAX_ENTRIES);
      safeWrite(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setHistory([]);
    safeWrite([]);
  }, []);

  // Sincroniza entre abas
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setHistory(safeRead());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { history, append, clear };
}
