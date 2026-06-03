import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AffiliateStats = {
  monthCommission: number;
  pendingPayout: number;
  availablePayout: number;
  totalEarned: number;
  activeReferrals: number;
  closedThisMonth: number;
  byStatus: Record<string, number>;
};

export function useAffiliateStats(affiliateId: string | undefined) {
  return useQuery({
    queryKey: ["affiliate-stats", affiliateId],
    enabled: !!affiliateId,
    staleTime: 30_000,
    queryFn: async (): Promise<AffiliateStats> => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [commissionsRes, referralsRes] = await Promise.all([
        supabase
          .from("affiliate_commissions")
          .select("commission_value,status,created_at")
          .eq("affiliate_id", affiliateId!),
        supabase
          .from("affiliate_referrals")
          .select("status,created_at")
          .eq("affiliate_id", affiliateId!),
      ]);

      const commissions = commissionsRes.data || [];
      const referrals = referralsRes.data || [];

      const monthCommission = commissions
        .filter((c) => new Date(c.created_at) >= monthStart)
        .reduce((s, c) => s + Number(c.commission_value || 0), 0);

      const pendingPayout = commissions
        .filter((c) => c.status === "pending")
        .reduce((s, c) => s + Number(c.commission_value || 0), 0);

      const availablePayout = commissions
        .filter((c) => c.status === "available")
        .reduce((s, c) => s + Number(c.commission_value || 0), 0);

      const totalEarned = commissions
        .filter((c) => c.status === "paid")
        .reduce((s, c) => s + Number(c.commission_value || 0), 0);

      const byStatus: Record<string, number> = {};
      for (const r of referrals) {
        byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      }

      const activeReferrals = referrals.filter((r) =>
        ["click", "lead", "negotiating"].includes(r.status)
      ).length;

      const closedThisMonth = commissions.filter(
        (c) => new Date(c.created_at) >= monthStart
      ).length;

      return {
        monthCommission,
        pendingPayout,
        availablePayout,
        totalEarned,
        activeReferrals,
        closedThisMonth,
        byStatus,
      };
    },
  });
}
