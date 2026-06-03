import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Crown, Sparkles, Flame, Clock, Target, Gift, TrendingUp, Award, Medal } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAffiliateProfile } from "@/components/vitrine/useAffiliateProfile";
import { useAffiliateStats } from "@/components/vitrine/useAffiliateStats";
import { useAffiliateLevels, resolveLevel } from "@/components/vitrine/useAffiliateLevel";
import JourneyTrack from "@/components/vitrine/JourneyTrack";
import { useEffect, useState } from "react";
import { smartCapitalizeName } from "@/lib/nameUtils";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const LEVEL_PRIZES = [
  {
    id: "prata",
    name: "Prata",
    emoji: "🥈",
    goal: 20000,
    pix: 200,
    bonus: 1,
    gradient: "from-slate-200 via-slate-100 to-slate-300",
    accent: "#94a3b8",
    image: "linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 50%, #94a3b8 100%)",
    perks: ["R$ 200 via PIX", "+1% comissão extra", "Selo Prata no perfil"],
  },
  {
    id: "ouro",
    name: "Ouro",
    emoji: "🥇",
    goal: 50000,
    pix: 500,
    bonus: 2,
    gradient: "from-amber-200 via-yellow-100 to-amber-300",
    accent: "#f59e0b",
    image: "linear-gradient(135deg, #fde68a 0%, #fbbf24 50%, #d97706 100%)",
    perks: ["R$ 500 via PIX", "+2% comissão extra", "Atendimento prioritário"],
  },
  {
    id: "diamante",
    name: "Diamante",
    emoji: "💎",
    goal: 120000,
    pix: 1500,
    bonus: 3,
    gradient: "from-cyan-200 via-sky-100 to-blue-300",
    accent: "#0ea5e9",
    image: "linear-gradient(135deg, #bae6fd 0%, #7dd3fc 50%, #0284c7 100%)",
    perks: ["R$ 1.500 via PIX", "+3% comissão extra", "Acesso VIP a campanhas"],
  },
  {
    id: "black",
    name: "Black",
    emoji: "👑",
    goal: 300000,
    pix: 0,
    bonus: 0,
    gradient: "from-zinc-800 via-zinc-900 to-black",
    accent: "#facc15",
    image: "linear-gradient(135deg, #18181b 0%, #000000 50%, #27272a 100%)",
    perks: [
      "Viagem nacional completa para 2",
      "Aéreo + hospedagem + passeios",
      "Convite para o Club Black anual",
    ],
    flagship: true,
  },
];

const CAMPAIGNS = [
  {
    id: "dubai",
    emoji: "🕌",
    name: "Operação Dubai",
    description: "Venda Dubai e leve o smartphone mais desejado do ano.",
    goal: 150000,
    metric: "vendidos em Dubai",
    prize: "iPhone 18 Pro",
    prizeIcon: "📱",
    deadline: "2026-08-31",
    gradient: "from-amber-500 via-orange-500 to-rose-500",
    progress: 0.34,
  },
  {
    id: "europa",
    emoji: "🗼",
    name: "Operação Europa",
    description: "O continente clássico vale R$ 5.000 em PIX direto.",
    goal: 250000,
    metric: "vendidos na Europa",
    prize: "R$ 5.000 PIX",
    prizeIcon: "💸",
    deadline: "2026-09-30",
    gradient: "from-indigo-500 via-violet-500 to-fuchsia-500",
    progress: 0.18,
  },
  {
    id: "cruzeiros",
    emoji: "🛳️",
    name: "Operação Cruzeiros",
    description: "Top 3 vendedores embarcam num cruzeiro inesquecível.",
    goal: 0,
    metric: "Top 3 do ranking",
    prize: "Cruzeiro para 2 pessoas",
    prizeIcon: "⚓",
    deadline: "2026-12-31",
    gradient: "from-sky-500 via-cyan-500 to-teal-500",
    progress: 0.62,
    ranking: true,
  },
  {
    id: "copa",
    emoji: "🏆",
    name: "Operação Copa do Mundo",
    description: "O maior vendedor leva o pacote do ano: a Copa do Mundo.",
    goal: 0,
    metric: "Maior vendedor do período",
    prize: "Pacote Copa do Mundo 2026",
    prizeIcon: "⚽",
    deadline: "2026-05-31",
    gradient: "from-emerald-600 via-green-600 to-lime-500",
    progress: 0.08,
    ranking: true,
  },
];

function useCountdown(deadline: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const diff = new Date(deadline).getTime() - now;
  if (diff <= 0) return { days: 0, hours: 0, expired: true };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  return { days, hours, expired: false };
}

function Countdown({ deadline }: { deadline: string }) {
  const { days, hours, expired } = useCountdown(deadline);
  if (expired) return <span className="text-xs font-semibold text-rose-600">encerrada</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
      <Clock className="h-3 w-3" />
      {days}d {hours}h restantes
    </span>
  );
}

export default function VitrinePremiacoes() {
  const { data: affiliate } = useAffiliateProfile();
  const { data: stats } = useAffiliateStats(affiliate?.id);
  const { data: tiers = [] } = useAffiliateLevels();

  // Total vendido (sale_value somado)
  const { data: lifetimeRevenue = 0 } = useQuery({
    queryKey: ["affiliate-lifetime-revenue", affiliate?.id],
    enabled: !!affiliate?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("affiliate_commissions")
        .select("sale_value, status")
        .eq("affiliate_id", affiliate!.id);
      return (data || [])
        .filter((c: any) => c.status !== "canceled")
        .reduce((s: number, c: any) => s + Number(c.sale_value || 0), 0);
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
  const myRankRow = ranking?.find((r: any) => r.affiliate_id === affiliate?.id);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-12">
      <header className="space-y-1">
        <span className="text-[10px] uppercase tracking-[0.22em] text-amber-700 font-semibold">
          hall of fame · partners club
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl">Premiações</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Cada conquista vira história. A próxima já está te esperando · venda mais, suba de nível
          e leve para casa o que poucos conseguem.
        </p>
      </header>

      {/* ===================== BLOCO 1 · SUA JORNADA ===================== */}
      <section className="space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-amber-700 font-semibold">bloco 01</p>
          <h2 className="font-serif text-2xl mt-1">Sua jornada</h2>
        </div>
        {lvl && (
          <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-emerald-50/40 dark:to-emerald-500/5 p-6 sm:p-8 shadow-sm">
            <JourneyTrack
              tiers={tiers}
              currentId={lvl.current.id}
              nextId={lvl.next?.id || null}
              progress={lvl.progress}
              missingSales={lvl.missingSales}
              missingRevenue={lvl.missingRevenue}
            />
          </div>
        )}
      </section>

      {/* ===================== BLOCO 2 · PRÊMIOS DE NÍVEL ===================== */}
      <section className="space-y-4">
        <div className="flex items-end justify-between flex-wrap gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-amber-700 font-semibold">bloco 02</p>
            <h2 className="font-serif text-2xl mt-1">Prêmios de nível</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Cada degrau libera dinheiro, status e benefícios reais. Total vendido:{" "}
              <strong className="text-foreground">{fmtBRL(lifetimeRevenue)}</strong>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {LEVEL_PRIZES.map((p, i) => {
            const progress = Math.min(1, lifetimeRevenue / p.goal);
            const missing = Math.max(0, p.goal - lifetimeRevenue);
            const unlocked = lifetimeRevenue >= p.goal;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Card
                  className={`relative overflow-hidden h-full border-2 transition-all hover:scale-[1.02] hover:shadow-2xl ${
                    unlocked ? "border-emerald-500/60" : "border-border/60"
                  } ${p.flagship ? "lg:row-span-1" : ""}`}
                >
                  {/* Capa visual */}
                  <div className="h-32 relative overflow-hidden" style={{ background: p.image }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    <div className="absolute top-3 right-3">
                      {unlocked ? (
                        <Badge className="bg-emerald-600 text-white shadow-lg">
                          <Sparkles className="h-3 w-3 mr-1" /> Conquistado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-white/90 backdrop-blur text-[10px]">
                          {Math.round(progress * 100)}%
                        </Badge>
                      )}
                    </div>
                    <div className="absolute bottom-3 left-4 flex items-end gap-2">
                      <span className="text-5xl drop-shadow-lg">{p.emoji}</span>
                      <div className={`pb-1 ${p.flagship ? "text-white" : "text-zinc-900"}`}>
                        <p className="text-[10px] uppercase tracking-widest opacity-80">nível</p>
                        <p className="font-serif text-xl leading-none">{p.name}</p>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-4 space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">meta</p>
                      <p className="font-bold text-lg">{fmtBRL(p.goal)}</p>
                      <p className="text-[10px] text-muted-foreground">em vendas acumuladas</p>
                    </div>

                    <ul className="space-y-1.5 border-t border-border/40 pt-3">
                      {p.perks.map((perk, j) => (
                        <li key={j} className="flex gap-2 text-xs">
                          <Gift className="h-3 w-3 mt-0.5 shrink-0 text-amber-600" />
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-2">
                      <Progress value={progress * 100} className="h-2" />
                      <p className="text-[11px] mt-2 font-semibold">
                        {unlocked ? (
                          <span className="text-emerald-700">Prêmio liberado · fale com a NatLeva</span>
                        ) : (
                          <span className="text-amber-700">Faltam {fmtBRL(missing)}</span>
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ===================== BLOCO 3 · CAMPANHAS ATIVAS ===================== */}
      <section className="space-y-4">
        <div className="flex items-end justify-between flex-wrap gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-rose-600 font-semibold flex items-center gap-1.5">
              <Flame className="h-3 w-3" /> bloco 03 · ao vivo
            </p>
            <h2 className="font-serif text-2xl mt-1">Campanhas ativas</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Missões temporárias com prêmios físicos. Quem se mexe primeiro leva.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CAMPAIGNS.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className="relative overflow-hidden h-full border-2 border-border/60 hover:shadow-2xl transition-all">
                <div className={`h-28 relative bg-gradient-to-br ${c.gradient}`}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,white,transparent_60%)] opacity-30" />
                  <div className="absolute top-3 left-4 flex items-center gap-2 text-white">
                    <span className="text-3xl drop-shadow">{c.emoji}</span>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest opacity-90 flex items-center gap-1">
                        <Flame className="h-2.5 w-2.5" /> campanha quente
                      </p>
                      <p className="font-serif text-lg leading-none drop-shadow">{c.name}</p>
                    </div>
                  </div>
                  <div className="absolute bottom-3 right-4 text-right">
                    <Countdown deadline={c.deadline} />
                  </div>
                </div>

                <CardContent className="p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">{c.description}</p>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-muted/40 p-2.5">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                        <Target className="h-2.5 w-2.5" /> meta
                      </p>
                      <p className="text-sm font-bold mt-0.5">
                        {c.goal > 0 ? fmtBRL(c.goal) : c.metric}
                      </p>
                      {c.goal > 0 && <p className="text-[10px] text-muted-foreground">{c.metric}</p>}
                    </div>
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 p-2.5 border border-amber-200/50">
                      <p className="text-[10px] uppercase tracking-widest text-amber-700 flex items-center gap-1">
                        <Trophy className="h-2.5 w-2.5" /> prêmio
                      </p>
                      <p className="text-sm font-bold mt-0.5 flex items-center gap-1">
                        <span>{c.prizeIcon}</span> {c.prize}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-muted-foreground">
                        {c.ranking ? "Sua posição na campanha" : "Seu progresso"}
                      </span>
                      <span className="font-semibold">
                        {c.ranking ? `#${myRankRow?.rank ?? "—"}` : `${Math.round(c.progress * 100)}%`}
                      </span>
                    </div>
                    <Progress value={c.progress * 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===================== BLOCO 4 · HALL DA FAMA ===================== */}
      <section className="space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-amber-700 font-semibold">bloco 04</p>
          <h2 className="font-serif text-2xl mt-1">Hall da fama</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Os nomes que estão fazendo história agora. Próximo a aparecer aqui pode ser o seu.
          </p>
        </div>

        {/* Destaques */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              title: "Top do mês",
              icon: Crown,
              gradient: "from-amber-400 to-yellow-600",
              name: smartCapitalizeName(ranking?.[0]?.full_name) || "Em disputa",
              detail: ranking?.[0] ? fmtBRL(Number(ranking[0].total_commission)) : "—",
            },
            {
              title: "Maior comissão",
              icon: TrendingUp,
              gradient: "from-emerald-500 to-teal-600",
              name: smartCapitalizeName(ranking?.[0]?.full_name) || "Em disputa",
              detail: ranking?.[0] ? fmtBRL(Number(ranking[0].total_commission)) : "—",
            },
            {
              title: "Maior crescimento",
              icon: Award,
              gradient: "from-violet-500 to-fuchsia-600",
              name: smartCapitalizeName(ranking?.[1]?.full_name) || "Em disputa",
              detail: ranking?.[1] ? `${ranking[1].sales_count} vendas` : "—",
            },
            {
              title: "Maior venda única",
              icon: Medal,
              gradient: "from-rose-500 to-pink-600",
              name: smartCapitalizeName(ranking?.[2]?.full_name) || "Em disputa",
              detail: ranking?.[2] ? fmtBRL(Number(ranking[2].total_revenue)) : "—",
            },
          ].map((d, i) => {
            const Icon = d.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card className="overflow-hidden border-2 border-border/60 hover:shadow-xl transition-all">
                  <div className={`h-1.5 bg-gradient-to-r ${d.gradient}`} />
                  <CardContent className="p-4">
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${d.gradient} grid place-items-center mb-2 shadow-md`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{d.title}</p>
                    <p className="font-semibold text-sm mt-1 truncate">{d.name}</p>
                    <p className="text-xs text-emerald-700 font-semibold mt-0.5">{d.detail}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Ranking nacional */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-600" /> Top vendedores · este mês
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
                      className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                        isMe
                          ? "bg-gradient-to-r from-emerald-500/10 to-transparent"
                          : "hover:bg-muted/30"
                      }`}
                    >
                      <div
                        className={`h-9 w-9 rounded-full grid place-items-center font-bold text-xs shrink-0 ${
                          row.rank === 1
                            ? "bg-gradient-to-br from-amber-300 to-amber-500 text-emerald-950"
                            : row.rank === 2
                            ? "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800"
                            : row.rank === 3
                            ? "bg-gradient-to-br from-orange-300 to-orange-500 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {podium ? <Crown className="h-3.5 w-3.5" /> : `#${row.rank}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {row.full_name}
                          {isMe && (
                            <span className="text-[10px] text-emerald-700 ml-1 font-semibold">
                              · você
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.sales_count} venda{row.sales_count === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-emerald-700">
                          {fmtBRL(Number(row.total_commission))}
                        </p>
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
      </section>
    </div>
  );
}
