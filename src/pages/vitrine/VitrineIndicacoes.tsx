import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users2, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function VitrineIndicacoes() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl">Minhas indicações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cada lead que você enviou pra Nath aparece aqui com o status atualizado.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/vitrine/pacotes">
            Gerar novo link <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: "Novos", count: 0, tone: "bg-sky-500/10 text-sky-700" },
          { label: "Em negociação", count: 0, tone: "bg-amber-500/10 text-amber-700" },
          { label: "Proposta enviada", count: 0, tone: "bg-violet-500/10 text-violet-700" },
          { label: "Fechados", count: 0, tone: "bg-emerald-500/10 text-emerald-700" },
          { label: "Perdidos", count: 0, tone: "bg-rose-500/10 text-rose-700" },
        ].map((s) => (
          <Card key={s.label} className="border-border/60">
            <CardContent className="p-3 flex flex-col items-center text-center">
              <Badge variant="outline" className={`text-[10px] mb-1 ${s.tone} border-transparent`}>
                {s.label}
              </Badge>
              <span className="text-xl font-semibold">{s.count}</span>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline de indicações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-16 text-sm text-muted-foreground border border-dashed rounded-lg">
            <Users2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-foreground mb-1">Nenhuma indicação registrada ainda</p>
            <p className="max-w-md mx-auto text-xs leading-relaxed">
              Compartilhe seu link de afiliado e, assim que alguém clicar e iniciar uma conversa
              com a Nath, o lead aparece aqui em tempo real.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
