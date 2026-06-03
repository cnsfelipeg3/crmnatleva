import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, Lock, CheckCircle2 } from "lucide-react";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function VitrineMetas() {
  const metaMes = { target: 5, current: 0, bonus: 500 };
  const pct = Math.min(100, Math.round((metaMes.current / metaMes.target) * 100));

  const trilha = [
    { titulo: "Primeira venda", desc: "Bônus boas-vindas", bonus: 100, done: false, locked: false },
    { titulo: "5 viagens no mês", desc: "Bônus de performance", bonus: 500, done: false, locked: false },
    { titulo: "10 viagens no mês", desc: "Próximo nível", bonus: 1500, done: false, locked: true },
    { titulo: "Top 3 do mês", desc: "Bônus de elite", bonus: 3000, done: false, locked: true },
  ];

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
              + {fmtBRL(metaMes.bonus)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Feche <strong className="text-foreground">{metaMes.target} viagens</strong> este mês e
            leve o bônus extra além da comissão normal.
          </p>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-semibold">{metaMes.current}/{metaMes.target}</span>
          </div>
          <Progress value={pct} className="h-3" />
        </CardContent>
      </Card>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground/70 mb-3">
          Trilha de bônus
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {trilha.map((t) => (
            <Card
              key={t.titulo}
              className={`border ${t.locked ? "opacity-60 bg-muted/30" : "border-border/60"}`}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div
                  className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${
                    t.done
                      ? "bg-emerald-500/15 text-emerald-700"
                      : t.locked
                      ? "bg-muted text-muted-foreground"
                      : "bg-amber-500/10 text-amber-700"
                  }`}
                >
                  {t.done ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : t.locked ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Target className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium text-sm">{t.titulo}</h3>
                    <span className="text-xs font-semibold text-amber-700">
                      + {fmtBRL(t.bonus)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
