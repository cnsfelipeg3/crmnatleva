import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LeadRow = {
  id: string;
  affiliate_id: string;
  ref_code: string | null;
  product_id: string | null;
  product_slug: string | null;
  lead_name: string | null;
  lead_phone: string | null;
  lead_email: string | null;
  source_page: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  status: string;
  estimated_commission: number | null;
  device_type: string | null;
  referrer: string | null;
  country: string | null;
  city: string | null;
  session_id: string | null;
  time_on_page_seconds: number | null;
  created_at: string;
  converted_at: string | null;
  client_id: string | null;
  sale_id: string | null;
};

export type LeadsStats = {
  rows: LeadRow[];
  totalClicks: number;
  uniqueSessions: number;
  leadsCount: number;
  conversions: number;
  conversionRate: number;
  estimatedRevenue: number;
  estimatedCommission: number;
  avgTimeOnPage: number;
  byDevice: Record<string, number>;
  byCity: { city: string; count: number }[];
  bySource: { source: string; count: number }[];
  byProduct: { product: string; clicks: number; leads: number; conversions: number }[];
  timeSeries: { date: string; clicks: number; leads: number; conversions: number }[];
  funnel: { click: number; lead: number; negotiating: number; converted: number };
};

function classify(status: string) {
  if (status === "converted") return "converted";
  if (status === "negotiating") return "negotiating";
  if (["lead", "qualified"].includes(status)) return "lead";
  return "click";
}

function buildStats(rows: LeadRow[]): LeadsStats {
  const totalClicks = rows.length;
  const sessions = new Set<string>();
  for (const r of rows) if (r.session_id) sessions.add(r.session_id);
  const uniqueSessions = sessions.size || totalClicks;

  const leadsCount = rows.filter((r) => r.status !== "click").length;
  const conversions = rows.filter((r) => r.status === "converted").length;
  const conversionRate = totalClicks > 0 ? (conversions / totalClicks) * 100 : 0;

  const estimatedCommission = rows
    .filter((r) => r.status === "converted")
    .reduce((s, r) => s + Number(r.estimated_commission || 0), 0);
  // Estimativa de receita = comissão * 10 (média de comissão ~10%); apenas indicativo
  const estimatedRevenue = estimatedCommission * 10;

  const validTimes = rows.map((r) => Number(r.time_on_page_seconds || 0)).filter((t) => t > 5);
  const avgTimeOnPage = validTimes.length
    ? Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length)
    : 0;

  const byDevice: Record<string, number> = {};
  const cityMap = new Map<string, number>();
  const sourceMap = new Map<string, number>();
  const productMap = new Map<string, { clicks: number; leads: number; conversions: number }>();
  const dayMap = new Map<string, { clicks: number; leads: number; conversions: number }>();

  for (const r of rows) {
    const dev = r.device_type || "desconhecido";
    byDevice[dev] = (byDevice[dev] || 0) + 1;

    if (r.city) cityMap.set(r.city, (cityMap.get(r.city) || 0) + 1);

    const src = r.utm_source
      ? r.utm_source
      : (r.referrer || "direct").replace(/^https?:\/\//, "").split("/")[0] || "direct";
    sourceMap.set(src, (sourceMap.get(src) || 0) + 1);

    const prod = r.product_slug || "—";
    const p = productMap.get(prod) || { clicks: 0, leads: 0, conversions: 0 };
    p.clicks += 1;
    if (r.status !== "click") p.leads += 1;
    if (r.status === "converted") p.conversions += 1;
    productMap.set(prod, p);

    const day = r.created_at.slice(0, 10);
    const d = dayMap.get(day) || { clicks: 0, leads: 0, conversions: 0 };
    d.clicks += 1;
    if (r.status !== "click") d.leads += 1;
    if (r.status === "converted") d.conversions += 1;
    dayMap.set(day, d);
  }

  const funnel = {
    click: rows.filter((r) => classify(r.status) === "click").length,
    lead: rows.filter((r) => classify(r.status) === "lead").length,
    negotiating: rows.filter((r) => classify(r.status) === "negotiating").length,
    converted: conversions,
  };

  return {
    rows,
    totalClicks,
    uniqueSessions,
    leadsCount,
    conversions,
    conversionRate,
    estimatedRevenue,
    estimatedCommission,
    avgTimeOnPage,
    byDevice,
    byCity: [...cityMap.entries()].map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    bySource: [...sourceMap.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    byProduct: [...productMap.entries()]
      .map(([product, v]) => ({ product, ...v }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 12),
    timeSeries: [...dayMap.entries()]
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    funnel,
  };
}

export function useAffiliateLeadsStats(affiliateId: string | undefined, days: number = 90) {
  return useQuery({
    queryKey: ["affiliate-leads-stats", affiliateId, days],
    enabled: !!affiliateId,
    staleTime: 30_000,
    queryFn: async (): Promise<LeadsStats> => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .from("affiliate_referrals")
        .select("*")
        .eq("affiliate_id", affiliateId!)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return buildStats((data || []) as LeadRow[]);
    },
  });
}

export function useAllAffiliatesLeadsStats(days: number = 90) {
  return useQuery({
    queryKey: ["admin-all-affiliates-leads-stats", days],
    staleTime: 30_000,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const [{ data: refs, error }, { data: affs }] = await Promise.all([
        supabase
          .from("affiliate_referrals")
          .select("*")
          .gte("created_at", since.toISOString())
          .order("created_at", { ascending: false }),
        supabase.from("affiliates").select("id, full_name, avatar_url, ref_code, status"),
      ]);
      if (error) throw error;
      const rows = (refs || []) as LeadRow[];
      const stats = buildStats(rows);

      const affMap = new Map((affs || []).map((a: any) => [a.id, a]));
      const perAff = new Map<string, { clicks: number; leads: number; conversions: number; commission: number }>();
      for (const r of rows) {
        const cur = perAff.get(r.affiliate_id) || { clicks: 0, leads: 0, conversions: 0, commission: 0 };
        cur.clicks += 1;
        if (r.status !== "click") cur.leads += 1;
        if (r.status === "converted") {
          cur.conversions += 1;
          cur.commission += Number(r.estimated_commission || 0);
        }
        perAff.set(r.affiliate_id, cur);
      }
      const ranking = [...perAff.entries()]
        .map(([id, v]) => {
          const a: any = affMap.get(id);
          return {
            affiliate_id: id,
            full_name: a?.full_name || "Afiliado removido",
            avatar_url: a?.avatar_url || null,
            ref_code: a?.ref_code || null,
            ...v,
            conversionRate: v.clicks > 0 ? (v.conversions / v.clicks) * 100 : 0,
          };
        })
        .sort((a, b) => b.conversions - a.conversions || b.clicks - a.clicks);

      return { stats, ranking, affiliates: affs || [] };
    },
  });
}
