import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, Lock, CheckCircle2, Calendar, Trophy, Sparkles, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAffiliateProfile } from "@/components/vitrine/useAffiliateProfile";
import { useAffiliateStats } from "@/components/vitrine/useAffiliateStats";
import CountUp from "@/components/vitrine/CountUp";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function VitrineMetas() {
  const { data: affiliate } = useAffiliateProfile();
  const { data: stats } = useAffiliateStats(affiliate?.id);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const refMonth = monthStart.toISOString().slice(0, 10);

  const { data: goals } = useQuery({
    queryKey: ["affiliate-goals-current", affiliate?.id, refMonth],
    enabled: !!affiliate?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_goals")
        .select("*")
        .order("reference_month", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const closed = stats?.closedThisMonth ?? 0;
  const revenue = stats?.monthCommission ?? 0;

  const monthGoals = (goals || []).filter((g) => g.reference_month?.startsWith(refMonth.slice(0, 7)));
  const mainGoal = monthGoals[0];
  const targetSales = mainGoal?.target_sales || 5;
  const bonus = Number(mainGoal?.bonus_value || 500);
  const pct = Math.min(100, Math.round((closed / Math.max(1, targetSales)) * 100));

  const trilha = monthGoals.slice(1).map((g) => ({
    id: g.id,
    titulo: g.description || `${g.target_sales} viagens no mês`,
    bonus: Number(g.bonus_value),
    target: g.target_sales,
    done: closed >= g.target_sales,
  }));

  const historico = (goals || [])
    .filter((g) => !g.reference_month?.startsWith(refMonth.slice(0, 7)))
    .slice(0, 6);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      <header className="space-y-1">
        <span className="text-[10px] uppercase tracking-[0.22em] text-amber-700 font-semibold">jornada</span>
        <h1 className="font-serif text-3xl sm:text-4xl">Suas Metas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cada meta batida é um passo na sua evolução dentro do Partners Club.
        </p>
      </header>

      {/* Meta principal · cinematográfica */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-emerald-900/15 bg-gradient-to-br from-emerald-50 via-background to-amber-50/40 dark:from-emerald-500/5 dark:to-amber-500/5 p-6 sm:p-8"
      >
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="relative grid lg:grid-cols-[1.4fr_1fr] gap-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-700 mb-2">
              <Flame className="h-4 w-4" />
              <span className="text-[10px] uppercase tracking-[0.22em] font-semibold">Meta do mês</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl leading-tight">
              {mainGoal?.description || `Feche ${targetSales} viagens este mês`}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Bater a meta libera um bônus extra além da comissão normal · pagamento via PIX.
            </p>

            <div className="mt-6 space-y-2">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-semibold tabular-nums">
                  {closed}/{targetSales} viagens · {fmtBRL(revenue)}
                </span>
              </div>
              <div className="h-3 rounded-full bg-emerald-900/8 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {monthStart.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white/60 dark:bg-card border border-amber-400/30 p-5 flex flex-col justify-center text-center">
            <p className="text-[10px] uppercase tracking-widest text-amber-700 font-semibold">Recompensa</p>
            <div className="font-serif text-4xl sm:text-5xl text-emerald-800 mt-2">
              + <CountUp value={bonus} prefix="R$ " />
            </div>
            <p className="text-xs text-muted-foreground mt-2">no PIX assim que a meta bater</p>
            {pct >= 100 && (
              <Badge className="mx-auto mt-3 bg-emerald-600 text-white">Meta batida 🎉</Badge>
            )}
          </div>
        </div>
      </motion.div>

      {/* Trilha de bônus */}
      <section>
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground/70 mb-3 font-semibold">
          Trilha de bônus · próximas recompensas
        </h2>
        {trilha.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              <Target className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Ainda não há metas extras esse mês · novas recompensas em breve.
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {trilha.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card className={`hover:-translate-y-0.5 hover:shadow-md transition-all ${t.done ? "border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-500/5" : ""}`}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${
                      t.done ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/10 text-amber-700"
                    }`}>
                      {t.done ? <CheckCircle2 className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-medium text-sm">{t.titulo}</h3>
                        <span className="text-sm font-bold text-amber-700">+ {fmtBRL(t.bonus)}</span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-all"
                          style={{ width: `${Math.min(100, (closed / Math.max(1, t.target)) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        {closed}/{t.target} viagens
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Histórico */}
      <section>
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground/70 mb-3 font-semibold">
          Histórico de metas
        </h2>
        {historico.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              <Trophy className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Seu histórico de conquistas vai aparecer aqui mês a mês.
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            {historico.map((g, i) => (
              <div key={g.id} className={`flex items-center gap-4 p-4 ${i > 0 ? "border-t border-border/40" : ""}`}>
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-700 grid place-items-center shrink-0">
                  <Trophy className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{g.description || `${g.target_sales} viagens`}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(g.reference_month).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                  </p>
                </div>
                <span className="text-sm font-semibold text-amber-700">+ {fmtBRL(Number(g.bonus_value))}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
