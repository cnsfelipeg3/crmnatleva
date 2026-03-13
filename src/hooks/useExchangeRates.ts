import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ExchangeRatesData {
  rates: Record<string, number>;
  timestamp: number;
  cached?: boolean;
  stale?: boolean;
}

const LOCAL_CACHE_KEY = "natleva_exchange_rates";
const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 min

function getLocalCache(): ExchangeRatesData | null {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Accept cache up to 30 min old
    if (Date.now() - data.timestamp > 30 * 60 * 1000) return null;
    return data;
  } catch { return null; }
}

function setLocalCache(data: ExchangeRatesData) {
  try { localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(data)); } catch { }
}

export function useExchangeRates() {
  const [data, setData] = useState<ExchangeRatesData | null>(getLocalCache);
  const [loading, setLoading] = useState(!getLocalCache());
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchRates = useCallback(async () => {
    try {
      setError(null);
      const { data: result, error: fnError } = await supabase.functions.invoke("exchange-rates");
      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);
      const ratesData: ExchangeRatesData = {
        rates: result.rates,
        timestamp: result.timestamp,
        cached: result.cached,
        stale: result.stale,
      };
      setData(ratesData);
      setLocalCache(ratesData);
    } catch (err) {
      setError((err as Error).message);
      // Keep stale data if available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
    intervalRef.current = setInterval(fetchRates, REFRESH_INTERVAL_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchRates]);

  const convert = useCallback(
    (amount: number, from: string, to: string): number | null => {
      if (!data?.rates) return null;
      if (from === to) return amount;
      // rates are all X/BRL (1 unit of currency = X BRL)
      if (from === "BRL" && data.rates[to]) return amount / data.rates[to];
      if (to === "BRL" && data.rates[from]) return amount * data.rates[from];
      // Cross rate: from -> BRL -> to
      if (data.rates[from] && data.rates[to]) {
        const inBrl = amount * data.rates[from];
        return inBrl / data.rates[to];
      }
      return null;
    },
    [data]
  );

  return { data, loading, error, refresh: fetchRates, convert };
}
