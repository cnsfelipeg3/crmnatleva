import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, Lock, CheckCircle2, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAffiliateProfile } from "@/components/vitrine/useAffiliateProfile";
import { useAffiliateStats } from "@/components/vitrine/useAffiliateStats";

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
        .eq("reference_month", refMonth)
        .or(`is_global.eq.true,affiliate_id.eq.${affiliate!.id}`)
        .order("is_global", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const closed = stats?.closedThisMonth ?? 0;
  const revenue = stats?.monthCommission ?? 0;
  const mainGoal = goals?.[0];
  const targetSales = mainGoal?.target_sales || 5;
  const bonus = Number(mainGoal?.bonus_value || 500);
  const pct = Math.min(100, Math.round((closed / Math.max(1, targetSales)) * 100));

  const trilha = (goals || []).slice(1).map((g) => ({
    titulo: g.description || `${g.target_sales} viagens no mês`,
    bonus: Number(g.bonus_value),
    target: g.target_sales,
    done: closed >= g.target_sales,
    locked: false,
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="font-serif text-2xl sm:text-3xl">Metas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bata as metas do mês pra liberar bônus extras direto no seu PIX.
        </p>
      </header>

      <Card className="border-emerald-900/15">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-700" /> Meta principal do mês
            </CardTitle>
            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700">
              + {fmtBRL(bonus)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {mainGoal?.description || (
              <>Feche <strong className="text-foreground">{targetSales} viagens</strong> este mês e leve o bônus extra além da comissão normal.</>
            )}
          </p>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-semibold">{closed}/{targetSales} viagens · {fmtBRL(revenue)}</span>
          </div>
          <Progress value={pct} className="h-3" />
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Mês de referência · {monthStart.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </p>
        </CardContent>
      </Card>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground/70 mb-3">
          Trilha de bônus
        </h2>
        {trilha.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              <Target className="h-8 w-8 mx-auto mb-2 opacity-40" />
              A NatLeva ainda não definiu metas extras pra este mês. Fique de olho.
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {trilha.map((t) => (
              <Card key={t.titulo} className={`border ${t.locked ? "opacity-60 bg-muted/30" : "border-border/60"}`}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${
                    t.done ? "bg-emerald-500/15 text-emerald-700" : t.locked ? "bg-muted text-muted-foreground" : "bg-amber-500/10 text-amber-700"
                  }`}>
                    {t.done ? <CheckCircle2 className="h-4 w-4" /> : t.locked ? <Lock className="h-4 w-4" /> : <Target className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-medium text-sm">{t.titulo}</h3>
                      <span className="text-xs font-semibold text-amber-700">+ {fmtBRL(t.bonus)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {closed}/{t.target} viagens
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
