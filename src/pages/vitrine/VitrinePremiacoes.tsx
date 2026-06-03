import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Crown, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAffiliateProfile } from "@/components/vitrine/useAffiliateProfile";
import { useAffiliateStats } from "@/components/vitrine/useAffiliateStats";
import { useAffiliateLevels, resolveLevel } from "@/components/vitrine/useAffiliateLevel";
import JourneyTrack from "@/components/vitrine/JourneyTrack";
import AchievementsGrid, { Achievement } from "@/components/vitrine/AchievementsGrid";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function VitrinePremiacoes() {
  const { data: affiliate } = useAffiliateProfile();
  const { data: stats } = useAffiliateStats(affiliate?.id);
  const { data: tiers = [] } = useAffiliateLevels();

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

  const closed = stats?.closedThisMonth ?? 0;
  const lifetime = stats?.totalEarned ?? 0;
  const lvl = tiers.length ? resolveLevel(tiers, closed, lifetime) : null;

  const earned = new Set((achievements || []).map((a) => a.code));
  const myRankRow = ranking?.find((r: any) => r.affiliate_id === affiliate?.id);
  const myRank = myRankRow?.rank;

  const items: Achievement[] = [
    { code: "primeira_indicacao", icon: "🚀", title: "Primeira indicação", desc: "Você entrou no jogo", unlocked: earned.has("primeira_indicacao") || (stats?.activeReferrals ?? 0) + closed > 0 },
    { code: "primeira_venda", icon: "🎯", title: "Closer", desc: "Primeira venda fechada", unlocked: earned.has("primeira_venda") || lifetime > 0 },
    { code: "1k", icon: "💵", title: "Primeiro R$ 1k", desc: "Mil reais no bolso", unlocked: lifetime >= 1000 },
    { code: "10k", icon: "💰", title: "R$ 10k acumulados", desc: "Dois dígitos de mil", unlocked: lifetime >= 10000, rare: true },
    { code: "internacional", icon: "🌍", title: "Internacional", desc: "Vendeu fora do Brasil", unlocked: earned.has("internacional") },
    { code: "dubai", icon: "🕌", title: "Dubai", desc: "Fechou o destino símbolo", unlocked: earned.has("dubai"), rare: true },
    { code: "top10", icon: "🏆", title: "Top 10 do mês", desc: "Pódio nacional", unlocked: !!myRank && myRank <= 10, rare: true },
    { code: "5_no_mes", icon: "🏃", title: "Maratonista", desc: "5 vendas em um mês", unlocked: closed >= 5 },
    { code: "10_no_mes", icon: "🔥", title: "Imparável", desc: "10 vendas em um mês", unlocked: closed >= 10, rare: true },
    { code: "diamante", icon: "💎", title: "Diamante", desc: "Elite NatLeva", unlocked: lvl?.current.id === "diamante" || lvl?.current.id === "black", rare: true },
    { code: "black", icon: "👑", title: "Black", desc: "Sociedade do clube", unlocked: lvl?.current.id === "black", rare: true },
    { code: "embaixador", icon: "🎖️", title: "Embaixador", desc: "Recrutou outro afiliado", unlocked: earned.has("embaixador"), rare: true },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-10">
      <header className="space-y-1">
        <span className="text-[10px] uppercase tracking-[0.22em] text-amber-700 font-semibold">hall of fame</span>
        <h1 className="font-serif text-3xl sm:text-4xl">Premiações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cada nível desbloqueia status. Cada conquista deixa marca. Bem-vindo ao clube.
        </p>
      </header>

      {/* Jornada timeline */}
      {lvl && (
        <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-card to-emerald-50/30 dark:to-emerald-500/5 p-6 sm:p-8">
          <JourneyTrack
            tiers={tiers}
            currentId={lvl.current.id}
            nextId={lvl.next?.id || null}
            progress={lvl.progress}
            missingSales={lvl.missingSales}
            missingRevenue={lvl.missingRevenue}
          />
        </section>
      )}

      {/* Cards dos níveis */}
      <section>
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-amber-700 font-semibold">os níveis</p>
          <h2 className="font-serif text-2xl mt-1">Status do Partners Club</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {tiers.map((n, i) => {
            const isCurrent = lvl?.current.id === n.id;
            const isPast = lvl && n.display_order < lvl.current.display_order;
            const isLocked = lvl && n.display_order > lvl.current.display_order;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card
                  className={`relative overflow-hidden h-full transition-all ${
                    isCurrent ? "border-emerald-700/50 shadow-lg ring-2 ring-amber-400/30 scale-[1.02]" : ""
                  } ${isLocked ? "opacity-70" : ""}`}
                >
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{ background: `radial-gradient(circle at top right, ${n.color}, transparent 70%)` }}
                  />
                  <CardContent className="relative p-4">
                    <div
                      className="h-14 w-14 rounded-2xl grid place-items-center mb-3 text-3xl"
                      style={{
                        background: `linear-gradient(135deg, ${n.color}33, ${n.color}11)`,
                        boxShadow: isCurrent ? `0 8px 24px -8px ${n.color}88` : undefined,
                      }}
                    >
                      {n.emoji}
                    </div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base">{n.name}</h3>
                      {isCurrent && (
                        <Badge className="bg-emerald-600 text-white text-[9px]">atual</Badge>
                      )}
                      {isPast && (
                        <Badge variant="outline" className="text-[9px] text-emerald-700">conquistado</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {n.min_sales_count > 0 ? `${n.min_sales_count} vendas · ` : ""}{fmtBRL(n.min_revenue)}+
                    </p>
                    {n.commission_bonus_percent > 0 && (
                      <p className="text-xs mt-1.5 font-bold text-amber-700">
                        +{n.commission_bonus_percent}% extra
                      </p>
                    )}
                    {n.perks?.length > 0 && (
                      <ul className="text-[10px] text-muted-foreground mt-3 space-y-1 border-t border-border/40 pt-2">
                        {n.perks.slice(0, 3).map((p, j) => (
                          <li key={j} className="flex gap-1.5">
                            <Sparkles className="h-2.5 w-2.5 mt-0.5 shrink-0 text-amber-500" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Conquistas */}
      <section>
        <AchievementsGrid items={items} title="Conquistas · seu hall pessoal" />
      </section>

      {/* Ranking */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-600" /> Ranking nacional · este mês
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
                    className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isMe ? "bg-gradient-to-r from-emerald-500/10 to-transparent" : "hover:bg-muted/30"}`}
                  >
                    <div className={`h-9 w-9 rounded-full grid place-items-center font-bold text-xs shrink-0 ${
                      row.rank === 1 ? "bg-gradient-to-br from-amber-300 to-amber-500 text-emerald-950" :
                      row.rank === 2 ? "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800" :
                      row.rank === 3 ? "bg-gradient-to-br from-orange-300 to-orange-500 text-white" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {podium ? <Crown className="h-3.5 w-3.5" /> : `#${row.rank}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {row.full_name}
                        {isMe && <span className="text-[10px] text-emerald-700 ml-1 font-semibold">· você</span>}
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
              Ranking começa assim que houver vendas fechadas neste mês.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
