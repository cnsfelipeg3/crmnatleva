import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAffiliateProfile } from "@/components/vitrine/useAffiliateProfile";
import {
  Wallet,
  Users2,
  Target,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Trophy,
  Store,
  Clock,
} from "lucide-react";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function VitrineHome() {
  const { data: affiliate } = useAffiliateProfile();
  const firstName = affiliate?.full_name?.split(" ")[0] || "Afiliado";

  // Fase 1 · dados ainda vazios (próxima fase integra com vendas reais)
  const kpis = {
    monthCommission: 0,
    activeReferrals: 0,
    closedThisMonth: 0,
    pendingPayout: 0,
  };

  const goal = { target: 5, current: 0, bonus: 500 };
  const progressPct = Math.min(100, Math.round((goal.current / goal.target) * 100));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white p-6 sm:p-8">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.4),transparent_60%)]" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] font-semibold text-amber-300/90">
              <Sparkles className="h-3 w-3" /> Programa de Bônus · NatLeva
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl mt-2">
              Olá, {firstName} · vamos vender uma viagem hoje?
            </h1>
            <p className="text-sm text-white/70 mt-2 leading-relaxed">
              Escolha um pacote, compartilhe com a sua rede e ganhe comissão direto no PIX
              assim que a viagem for fechada.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild className="bg-amber-500 hover:bg-amber-400 text-emerald-950 font-semibold">
              <Link to="/vitrine/pacotes">
                Ver pacotes <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10 hover:text-white">
              <Link to="/vitrine/materiais">Kit de divulgação</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          icon={<Wallet className="h-4 w-4" />}
          label="Comissão do mês"
          value={fmtBRL(kpis.monthCommission)}
          accent="emerald"
        />
        <KpiCard
          icon={<Users2 className="h-4 w-4" />}
          label="Indicações ativas"
          value={String(kpis.activeReferrals)}
          accent="sky"
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Fechadas no mês"
          value={String(kpis.closedThisMonth)}
          accent="amber"
        />
        <KpiCard
          icon={<Clock className="h-4 w-4" />}
          label="A receber"
          value={fmtBRL(kpis.pendingPayout)}
          accent="violet"
        />
      </section>

      {/* Goal + Ranking */}
      <section className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-emerald-900/15">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-700" />
                Meta do mês
              </CardTitle>
              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700">
                + {fmtBRL(goal.bonus)} de bônus
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-muted-foreground">
                Feche <strong className="text-foreground">{goal.target} viagens</strong> este mês e leve o bônus extra.
              </p>
              <span className="text-sm font-semibold">
                {goal.current}/{goal.target}
              </span>
            </div>
            <Progress value={progressPct} className="h-2.5" />
            <p className="text-xs text-muted-foreground">
              Faltam {goal.target - goal.current} indicações fechadas pra desbloquear o bônus.
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-600" />
              Sua posição no ranking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-center">
            <div className="text-4xl font-serif text-foreground">·</div>
            <p className="text-sm text-muted-foreground">
              Ainda sem ranking este mês. Faça sua primeira indicação pra entrar na disputa.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/vitrine/premiacoes">Ver ranking completo</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Atalhos */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ShortcutCard
          to="/vitrine/pacotes"
          icon={<Store className="h-5 w-5" />}
          title="Vitrine de pacotes"
          desc="Escolha o pacote, copie o link e compartilhe."
        />
        <ShortcutCard
          to="/vitrine/indicacoes"
          icon={<Users2 className="h-5 w-5" />}
          title="Minhas indicações"
          desc="Acompanhe o status de cada lead que você enviou."
        />
        <ShortcutCard
          to="/vitrine/comissoes"
          icon={<Wallet className="h-5 w-5" />}
          title="Extrato de comissões"
          desc="Veja pagamentos pendentes e histórico no PIX."
        />
      </section>

      {/* Recentes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Últimas indicações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10 text-sm text-muted-foreground">
            <Users2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Você ainda não tem indicações. Quando alguém clicar no seu link e fechar viagem,
            aparece aqui em tempo real.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: "emerald" | "sky" | "amber" | "violet";
}) {
  const accents: Record<string, string> = {
    emerald: "text-emerald-700 bg-emerald-500/10",
    sky: "text-sky-700 bg-sky-500/10",
    amber: "text-amber-700 bg-amber-500/10",
    violet: "text-violet-700 bg-violet-500/10",
  };
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`h-7 w-7 rounded-md grid place-items-center ${accents[accent]}`}>
            {icon}
          </div>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="text-xl sm:text-2xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

function ShortcutCard({
  to,
  icon,
  title,
  desc,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 hover:border-emerald-700/40 hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-emerald-950/5 text-emerald-800 grid place-items-center group-hover:bg-emerald-950/10">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-700 group-hover:translate-x-0.5 transition" />
      </div>
    </Link>
  );
}
