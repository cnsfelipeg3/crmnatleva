import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LevelTier = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  min_sales_count: number;
  min_revenue: number;
  commission_bonus_percent: number;
  perks: string[];
  display_order: number;
};

/**
 * Tiers de fallback caso a tabela ainda não tenha registros.
 */
const FALLBACK: LevelTier[] = [
  { id: "bronze", name: "Bronze", emoji: "🥉", color: "#b8763a",
    min_sales_count: 0, min_revenue: 0, commission_bonus_percent: 0, display_order: 1,
    perks: ["Comissão padrão", "Acesso à vitrine", "Materiais essenciais"] },
  { id: "prata", name: "Prata", emoji: "🥈", color: "#9ca3af",
    min_sales_count: 5, min_revenue: 15000, commission_bonus_percent: 1, display_order: 2,
    perks: ["+1% comissão", "Acesso antecipado a campanhas", "Badge exclusivo", "Materiais premium"] },
  { id: "ouro", name: "Ouro", emoji: "🥇", color: "#d4af37",
    min_sales_count: 15, min_revenue: 50000, commission_bonus_percent: 2, display_order: 3,
    perks: ["+2% comissão", "Destaque no ranking", "Convites para eventos", "Suporte VIP"] },
  { id: "diamante", name: "Diamante", emoji: "💎", color: "#5cbdb9",
    min_sales_count: 30, min_revenue: 120000, commission_bonus_percent: 3, display_order: 4,
    perks: ["+3% comissão", "Viagem anual paga", "Coprodução de campanhas", "Cartão exclusivo"] },
  { id: "black", name: "Black", emoji: "👑", color: "#0d0d0d",
    min_sales_count: 60, min_revenue: 300000, commission_bonus_percent: 5, display_order: 5,
    perks: ["+5% comissão", "Concierge dedicado", "Sociedade no clube", "Premiações raras"] },
];

export function useAffiliateLevels() {
  return useQuery({
    queryKey: ["affiliate-levels-tiers"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<LevelTier[]> => {
      const { data } = await supabase
        .from("affiliate_levels")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (!data || data.length === 0) return FALLBACK;
      return data.map((d: any) => ({
        id: d.id,
        name: d.name,
        emoji: d.emoji || "🏅",
        color: d.color || "#10b981",
        min_sales_count: Number(d.min_sales_count) || 0,
        min_revenue: Number(d.min_revenue) || 0,
        commission_bonus_percent: Number(d.commission_bonus_percent) || 0,
        perks: Array.isArray(d.perks) ? (d.perks as string[]) : [],
        display_order: Number(d.display_order) || 0,
      }));
    },
  });
}

export function resolveLevel(
  tiers: LevelTier[],
  salesCount: number,
  totalRevenue: number,
) {
  const sorted = [...tiers].sort((a, b) => a.display_order - b.display_order);
  let current = sorted[0];
  for (const t of sorted) {
    if (salesCount >= t.min_sales_count && totalRevenue >= t.min_revenue) {
      current = t;
    }
  }
  const next = sorted.find((t) => t.display_order > current.display_order) || null;
  const missingSales = next ? Math.max(0, next.min_sales_count - salesCount) : 0;
  const missingRevenue = next ? Math.max(0, next.min_revenue - totalRevenue) : 0;
  const totalNeeded = next ? next.min_revenue - current.min_revenue : 1;
  const earnedInRange = totalRevenue - current.min_revenue;
  const progress = next
    ? Math.min(100, Math.max(0, Math.round((earnedInRange / Math.max(1, totalNeeded)) * 100)))
    : 100;
  return { current, next, missingSales, missingRevenue, progress };
}
