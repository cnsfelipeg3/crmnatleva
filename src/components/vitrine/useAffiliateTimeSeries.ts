import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MonthPoint = { month: string; label: string; value: number; count: number };

/**
 * Série mensal das comissões dos últimos N meses.
 */
export function useAffiliateMonthlyCommissions(
  affiliateId: string | undefined,
  months = 6,
) {
  return useQuery({
    queryKey: ["affiliate-monthly-series", affiliateId, months],
    enabled: !!affiliateId,
    staleTime: 60_000,
    queryFn: async (): Promise<MonthPoint[]> => {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      start.setMonth(start.getMonth() - (months - 1));

      const { data } = await supabase
        .from("affiliate_commissions")
        .select("commission_value, created_at, status")
        .eq("affiliate_id", affiliateId!)
        .gte("created_at", start.toISOString())
        .order("created_at", { ascending: true });

      const buckets = new Map<string, MonthPoint>();
      const labels = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
      for (let i = 0; i < months; i++) {
        const d = new Date(start);
        d.setMonth(start.getMonth() + i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        buckets.set(key, { month: key, label: labels[d.getMonth()], value: 0, count: 0 });
      }
      for (const row of data || []) {
        const d = new Date(row.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const bucket = buckets.get(key);
        if (bucket) {
          bucket.value += Number(row.commission_value || 0);
          bucket.count += 1;
        }
      }
      return Array.from(buckets.values());
    },
  });
}
