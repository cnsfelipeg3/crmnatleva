import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Star, Lock } from "lucide-react";

const niveis = [
  { nome: "Bronze", de: "R$ 0", color: "from-orange-200 to-orange-400 text-orange-900", icon: Medal, current: true },
  { nome: "Prata", de: "R$ 5k em comissão", color: "from-slate-200 to-slate-400 text-slate-800", icon: Medal, current: false },
  { nome: "Ouro", de: "R$ 20k em comissão", color: "from-amber-200 to-amber-400 text-amber-900", icon: Trophy, current: false },
  { nome: "Diamante", de: "R$ 50k em comissão", color: "from-sky-200 to-sky-400 text-sky-900", icon: Award, current: false },
];

const badges = [
  { titulo: "Primeiro passo", desc: "Faça sua primeira indicação", icon: Star, unlocked: false },
  { titulo: "Closer", desc: "Feche a primeira viagem", icon: Trophy, unlocked: false },
  { titulo: "Maratonista", desc: "10 indicações em um mês", icon: Medal, unlocked: false },
  { titulo: "Top 3 do mês", desc: "Suba no pódio mensal", icon: Award, unlocked: false },
];

export default function VitrinePremiacoes() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="font-serif text-2xl sm:text-3xl">Premiações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Suba de nível, conquiste badges e dispute o ranking mensal dos afiliados.
        </p>
      </header>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground/70 mb-3">
          Seus níveis
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {niveis.map((n) => (
            <Card key={n.nome} className={n.current ? "border-emerald-700/50 shadow-md" : ""}>
              <CardContent className="p-4">
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${n.color} grid place-items-center mb-3`}>
                  <n.icon className="h-6 w-6" />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{n.nome}</h3>
                  {n.current && (
                    <Badge variant="outline" className="text-[10px] border-emerald-700/30 bg-emerald-500/10 text-emerald-700">
                      atual
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{n.de}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground/70 mb-3">
          Conquistas
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {badges.map((b) => (
            <Card key={b.titulo} className={!b.unlocked ? "opacity-60" : ""}>
              <CardContent className="p-4 text-center">
                <div className={`h-12 w-12 mx-auto rounded-full grid place-items-center mb-2 ${b.unlocked ? "bg-amber-500/15 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                  {b.unlocked ? <b.icon className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                </div>
                <h3 className="text-sm font-medium">{b.titulo}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{b.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-600" /> Ranking do mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-sm text-muted-foreground border border-dashed rounded-lg">
            <Trophy className="h-10 w-10 mx-auto mb-2 opacity-40" />
            Ranking começa a contar assim que houver afiliados ativos com vendas no mês.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
