import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, Sparkles, Store, Users2, Wallet } from "lucide-react";

import { useAffiliateProfile } from "@/components/vitrine/useAffiliateProfile";
import { useAffiliateStats } from "@/components/vitrine/useAffiliateStats";
import { useAffiliateLevels, resolveLevel } from "@/components/vitrine/useAffiliateLevel";
import { useAffiliateMonthlyCommissions } from "@/components/vitrine/useAffiliateTimeSeries";

import CountUp from "@/components/vitrine/CountUp";
import WalletCard from "@/components/vitrine/WalletCard";
import JourneyTrack from "@/components/vitrine/JourneyTrack";
import WeeklyMission from "@/components/vitrine/WeeklyMission";
import DreamCard from "@/components/vitrine/DreamCard";
import NationalRankCard from "@/components/vitrine/NationalRankCard";
import ClubFeed, { FeedItem } from "@/components/vitrine/ClubFeed";
import AchievementsGrid, { Achievement } from "@/components/vitrine/AchievementsGrid";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const DEFAULT_DREAM = {
  destination: "Dubai 2027",
  imageUrl:
    "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1600&q=80",
  goal: 15000,
  inspiration: "Suas indicações já estão construindo essa viagem.",
};

export default function VitrineHome() {
  const { data: affiliate } = useAffiliateProfile();
  const { data: stats } = useAffiliateStats(affiliate?.id);
  const { data: tiers = [] } = useAffiliateLevels();
  const { data: series = [] } = useAffiliateMonthlyCommissions(affiliate?.id, 6);

  const firstName = affiliate?.full_name?.split(" ")[0] || "Afiliado";

  const lifetime = stats?.totalEarned ?? 0;
  const available = stats?.availablePayout ?? 0;
  const pending = stats?.pendingPayout ?? 0;
  const future = (stats?.monthCommission ?? 0) - available - pending > 0
    ? (stats?.monthCommission ?? 0)
    : pending; // visual placeholder; futuro = pending por enquanto

  const lvl = tiers.length
    ? resolveLevel(tiers, stats?.closedThisMonth ?? 0, lifetime)
    : null;

  const { data: rankRows } = useQuery({
    queryKey: ["affiliate-monthly-ranking-home"],
    queryFn: async () => {
      const { data } = await supabase.rpc("affiliate_monthly_ranking", { p_month: null });
      return (data || []) as any[];
    },
    staleTime: 60_000,
  });

  const totalAffiliates = rankRows?.length || 0;
  const myRankRow = rankRows?.find((r) => r.affiliate_id === affiliate?.id);
  const myRank = myRankRow?.rank || (rankRows?.length ? rankRows.length + 1 : 1);
  const above = rankRows?.find((r) => r.rank === myRank - 1);
  const below = rankRows?.find((r) => r.rank === myRank + 1);

  // Last referral feed
  const { data: feedReferrals } = useQuery({
    queryKey: ["club-feed-referrals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("affiliate_referrals")
        .select("id, status, product_slug, created_at, affiliates(full_name)")
        .order("created_at", { ascending: false })
        .limit(8);
      return data || [];
    },
    staleTime: 60_000,
  });

  const feedItems: FeedItem[] = (feedReferrals || []).slice(0, 6).map((r: any) => ({
    id: r.id,
    type:
      r.status === "won" ? "sale" :
      r.status === "negotiating" ? "goal" :
      "sale",
    who: r.affiliates?.full_name?.split(" ")[0] || "Afiliado",
    text:
      r.status === "won"
        ? `fechou ${r.product_slug || "uma viagem"}`
        : r.status === "negotiating"
        ? `está negociando ${r.product_slug || "uma viagem"}`
        : `enviou uma nova indicação`,
    when: new Date(r.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
  }));

  if (feedItems.length === 0) {
    feedItems.push(
      { id: "demo1", type: "sale", who: "Carlos", text: "fechou Dubai 7 dias", when: "agora há pouco" },
      { id: "demo2", type: "level", who: "Ana", text: "alcançou nível Ouro 🥇", when: "há 2h" },
      { id: "demo3", type: "payout", who: "Fernanda", text: "recebeu R$ 2.100 no PIX", when: "hoje" },
      { id: "demo4", type: "goal", who: "Lucas", text: "bateu a meta semanal", when: "ontem" },
      { id: "demo5", type: "top", who: "Marina", text: "entrou no Top 10 nacional", when: "ontem" },
    );
  }

  const closed = stats?.closedThisMonth ?? 0;
  const achievements: Achievement[] = [
    { code: "primeira_indicacao", icon: "🚀", title: "Primeira indicação", desc: "Você entrou no jogo", unlocked: (stats?.activeReferrals ?? 0) + closed > 0 },
    { code: "primeira_venda", icon: "🎯", title: "Primeira venda", desc: "Closer oficial", unlocked: lifetime > 0 || closed > 0 },
    { code: "1k", icon: "💵", title: "Primeiros R$ 1.000", desc: "Mil reais no bolso", unlocked: lifetime >= 1000 },
    { code: "10k", icon: "💰", title: "R$ 10.000 acumulados", desc: "Dois dígitos de mil", unlocked: lifetime >= 10000, rare: true },
    { code: "internacional", icon: "🌍", title: "Primeira internacional", desc: "Vendeu fora do Brasil", unlocked: false },
    { code: "dubai", icon: "🕌", title: "Primeiro Dubai", desc: "Fechou o destino símbolo", unlocked: false, rare: true },
    { code: "top10", icon: "🏆", title: "Top 10 do mês", desc: "Pódio nacional", unlocked: myRank <= 10 && !!myRankRow, rare: true },
    { code: "diamante", icon: "💎", title: "Nível Diamante", desc: "Elite NatLeva", unlocked: lvl?.current.id === "diamante" || lvl?.current.id === "black", rare: true },
  ];

  const mission = {
    target: 2,
    current: Math.min(closed, 2),
    reward: "+500 NatCoins · badge especial",
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* HERO PREMIUM */}
      <motion.section
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="space-y-1"
      >
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] font-semibold text-amber-700">
          <Sparkles className="h-3 w-3" /> NatLeva Partners Club
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-[1.1]">
          Olá, {firstName} 👋
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mt-2 leading-relaxed">
          Você já gerou{" "}
          <strong className="text-foreground">
            <CountUp value={lifetime} prefix="R$ " />
          </strong>{" "}
          em comissões com a NatLeva.
          {lvl?.next && lvl.missingRevenue > 0 && (
            <>
              {" "}Faltam apenas{" "}
              <strong className="text-amber-700">{fmtBRL(lvl.missingRevenue)}</strong> em vendas pra alcançar{" "}
              <strong className="text-foreground">{lvl.next.name}</strong>.
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-2 pt-3">
          <Button asChild className="rounded-full h-10 px-5">
            <Link to="/vitrine/pacotes">
              Vender uma viagem hoje <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full h-10 px-5">
            <Link to="/vitrine/materiais">Pegar materiais</Link>
          </Button>
        </div>
      </motion.section>

      {/* CARTEIRA */}
      <WalletCard
        available={available}
        pending={pending}
        future={future}
        lifetime={lifetime}
        series={series}
        hasPix={!!affiliate?.pix_key}
        onWithdraw={() =>
          toast.success("Solicitação enviada · cai no seu PIX em até 1 dia útil.")
        }
      />

      {/* JORNADA + MISSÃO */}
      <section className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
          {lvl && (
            <JourneyTrack
              tiers={tiers}
              currentId={lvl.current.id}
              nextId={lvl.next?.id || null}
              progress={lvl.progress}
              missingSales={lvl.missingSales}
              missingRevenue={lvl.missingRevenue}
            />
          )}
        </div>
        <div className="space-y-6">
          <WeeklyMission
            description="Feche 2 viagens até domingo."
            current={mission.current}
            target={mission.target}
            rewardLabel={mission.reward}
          />
          <NationalRankCard
            myRank={myRank}
            delta={4}
            totalAffiliates={totalAffiliates || undefined}
            above={above ? { rank: above.rank, name: above.full_name, revenue: Number(above.total_commission || 0) } : undefined}
            me={{ rank: myRank, name: affiliate?.full_name || "Você", revenue: lifetime, me: true }}
            below={below ? { rank: below.rank, name: below.full_name, revenue: Number(below.total_commission || 0) } : undefined}
          />
        </div>
      </section>

      {/* SONHO + FEED */}
      <section className="grid lg:grid-cols-[1.3fr_1fr] gap-6">
        <DreamCard
          destination={DEFAULT_DREAM.destination}
          imageUrl={DEFAULT_DREAM.imageUrl}
          goal={DEFAULT_DREAM.goal}
          achieved={Math.min(DEFAULT_DREAM.goal, lifetime)}
          inspiration={DEFAULT_DREAM.inspiration}
        />
        <ClubFeed items={feedItems} />
      </section>

      {/* CONQUISTAS */}
      <section>
        <AchievementsGrid items={achievements} />
      </section>

      {/* Atalhos */}
      <section className="grid sm:grid-cols-3 gap-4">
        <Shortcut to="/vitrine/pacotes" icon={<Store className="h-5 w-5" />} title="Pacotes pra vender" desc="Escolha, copie o link, compartilhe." />
        <Shortcut to="/vitrine/indicacoes" icon={<Users2 className="h-5 w-5" />} title="Minhas indicações" desc="Acompanhe cada lead em tempo real." />
        <Shortcut to="/vitrine/comissoes" icon={<Wallet className="h-5 w-5" />} title="Extrato premium" desc="Cada PIX, cada centavo, sem zona cinza." />
      </section>
    </div>
  );
}

function Shortcut({ to, icon, title, desc }: { to: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 hover:border-emerald-700/40 hover:shadow-lg hover:-translate-y-0.5 transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-emerald-950/5 text-emerald-800 grid place-items-center group-hover:bg-emerald-950/10">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-700 group-hover:translate-x-0.5 transition" />
      </div>
    </Link>
  );
}
