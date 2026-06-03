import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Lock, Crown, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAffiliateProfile } from "@/components/vitrine/useAffiliateProfile";
import { useAffiliateStats } from "@/components/vitrine/useAffiliateStats";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function VitrinePremiacoes() {
  const { data: affiliate } = useAffiliateProfile();
  const { data: stats } = useAffiliateStats(affiliate?.id);

  const { data: levels } = useQuery({
    queryKey: ["affiliate-levels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_levels")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: achievements } = useQuery({
    queryKey: ["affiliate-achievements", affiliate?.id],
    enabled: !!affiliate?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_achievements")
        .select("*")
        .eq("affiliate_id", affiliate!.id)
        .order("earned_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: ranking } = useQuery({
    queryKey: ["affiliate-monthly-ranking"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("affiliate_monthly_ranking", { p_month: null });
      if (error) throw error;
      return data || [];
    },
  });

  const closedThisMonth = stats?.closedThisMonth ?? 0;
  const totalEarned = stats?.totalEarned ?? 0;

  // Compute current level based on totals
  const currentLevel = (levels || [])
    .filter((l) => closedThisMonth >= l.min_sales_count || totalEarned >= l.min_revenue)
    .slice(-1)[0];

  // Achievements catalog
  const catalog = [
    { code: "primeiro_passo", title: "Primeiro passo", desc: "Faça sua primeira indicação", icon: "🚀" },
    { code: "primeira_venda", title: "Closer", desc: "Feche a primeira viagem", icon: "🎯" },
    { code: "5_no_mes", title: "Maratonista", desc: "5 vendas em um mês", icon: "🏃" },
    { code: "10_no_mes", title: "Imparável", desc: "10 vendas em um mês", icon: "🔥" },
    { code: "top3_mes", title: "Top 3 do mês", desc: "Suba no pódio mensal", icon: "🏆" },
    { code: "diamante", title: "Diamante", desc: "Alcance o nível Diamante", icon: "💠" },
  ];

  const earnedCodes = new Set((achievements || []).map((a) => a.code));

  const myRankRow = ranking?.find((r: any) => r.affiliate_id === affiliate?.id);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="font-serif text-2xl sm:text-3xl">Premiações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Suba de nível, conquiste badges e dispute o ranking mensal dos afiliados.
        </p>
      </header>

      {/* Níveis */}
      <section>
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground/70 mb-3">Seus níveis</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {(levels || []).map((n) => {
            const isCurrent = currentLevel?.id === n.id;
            return (
              <Card key={n.id} className={isCurrent ? "border-emerald-700/50 shadow-md ring-1 ring-emerald-700/20" : ""}>
                <CardContent className="p-4">
                  <div
                    className="h-12 w-12 rounded-xl grid place-items-center mb-3 text-2xl"
                    style={{ background: `${n.color}22`, color: n.color || undefined }}
                  >
                    {n.emoji || "🏅"}
                  </div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{n.name}</h3>
                    {isCurrent && (
                      <Badge variant="outline" className="text-[10px] border-emerald-700/30 bg-emerald-500/10 text-emerald-700">atual</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {n.min_sales_count > 0 ? `${n.min_sales_count} vendas · ` : ""}{fmtBRL(Number(n.min_revenue))} +
                  </p>
                  {Number(n.commission_bonus_percent) > 0 && (
                    <p className="text-[11px] mt-1 font-semibold text-amber-700">
                      +{n.commission_bonus_percent}% extra
                    </p>
                  )}
                  {Array.isArray(n.perks) && n.perks.length > 0 && (
                    <ul className="text-[10px] text-muted-foreground mt-2 space-y-0.5">
                      {(n.perks as string[]).slice(0, 3).map((p, i) => (
                        <li key={i} className="flex gap-1"><Sparkles className="h-2.5 w-2.5 mt-0.5 shrink-0 text-amber-500" />{p}</li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Badges */}
      <section>
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground/70 mb-3">Conquistas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {catalog.map((b) => {
            const unlocked = earnedCodes.has(b.code);
            return (
              <Card key={b.code} className={!unlocked ? "opacity-50" : "border-amber-500/30"}>
                <CardContent className="p-4 text-center">
                  <div className={`h-12 w-12 mx-auto rounded-full grid place-items-center mb-2 text-2xl ${
                    unlocked ? "bg-amber-500/15" : "bg-muted text-muted-foreground"
                  }`}>
                    {unlocked ? b.icon : <Lock className="h-5 w-5" />}
                  </div>
                  <h3 className="text-xs font-medium">{b.title}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{b.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Ranking */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-600" /> Ranking do mês
            </CardTitle>
            {myRankRow && (
              <Badge variant="outline" className="text-[10px]">
                Sua posição · #{myRankRow.rank}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {ranking && ranking.length > 0 ? (
            <div className="divide-y">
              {ranking.slice(0, 10).map((row: any) => {
                const isMe = row.affiliate_id === affiliate?.id;
                const podium = row.rank <= 3;
                return (
                  <div
                    key={row.affiliate_id}
                    className={`flex items-center gap-3 px-4 py-3 text-sm ${isMe ? "bg-emerald-500/5" : ""}`}
                  >
                    <div className={`h-8 w-8 rounded-full grid place-items-center font-bold text-xs shrink-0 ${
                      row.rank === 1 ? "bg-amber-500/20 text-amber-700" :
                      row.rank === 2 ? "bg-slate-300/30 text-slate-700" :
                      row.rank === 3 ? "bg-orange-500/20 text-orange-700" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {podium ? <Crown className="h-3.5 w-3.5" /> : `#${row.rank}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {row.full_name}
                        {isMe && <span className="text-[10px] text-emerald-700 ml-1">· você</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{row.sales_count} venda{row.sales_count === 1 ? "" : "s"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-700">{fmtBRL(Number(row.total_commission))}</p>
                      <p className="text-[10px] text-muted-foreground">comissão</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-sm text-muted-foreground border-t border-dashed">
              <Trophy className="h-10 w-10 mx-auto mb-2 opacity-40" />
              Ranking começa a contar assim que houver vendas fechadas neste mês.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
