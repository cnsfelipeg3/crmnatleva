import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardKpisResult {
  total_sales: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  avg_ticket: number;
  avg_margin: number;
  by_status: Record<string, number> | null;
  by_seller: { seller_id: string; seller_name: string; count: number; revenue: number; profit: number }[] | null;
  top_destinations: { iata: string; count: number; revenue: number }[] | null;
  monthly_trend: { month: string; count: number; revenue: number }[] | null;
}

/**
 * Hook that calls the dashboard_kpis RPC instead of fetching thousands of raw rows.
 * Falls back to null on error so callers can display a skeleton/fallback.
 */
export function useDashboardKpis(
  period: string,
  sellerId?: string | null,
  destination?: string | null,
  status?: string | null,
) {
  const [data, setData] = useState<DashboardKpisResult | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { p_period: period };
      if (sellerId) params.p_seller_id = sellerId;
      if (destination) params.p_destination = destination;
      if (status) params.p_status = status;

      const { data: result, error } = await supabase.rpc("dashboard_kpis", params);
      if (error) { console.error("dashboard_kpis error:", error); setData(null); }
      else setData(result as unknown as DashboardKpisResult);
    } catch (err) {
      console.error("dashboard_kpis exception:", err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period, sellerId, destination, status]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, refetch: fetch };
}
