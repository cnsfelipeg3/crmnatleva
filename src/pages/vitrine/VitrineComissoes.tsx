import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Clock, TrendingUp, Download, Info } from "lucide-react";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

export default function VitrineComissoes() {
  // Fase 1 · placeholders. Fase 2 integra com tabelas affiliate_commissions.
  const saldo = { disponivel: 0, pendente: 0, total: 0 };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="font-serif text-2xl sm:text-3xl">Comissões</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhe o que você já recebeu e o que está pra cair no seu PIX.
        </p>
      </header>

      <section className="grid sm:grid-cols-3 gap-4">
        <SaldoCard
          icon={<Wallet className="h-4 w-4" />}
          label="Saldo disponível"
          value={fmtBRL(saldo.disponivel)}
          tone="emerald"
          cta={
            <Button size="sm" disabled className="w-full">
              Solicitar saque
            </Button>
          }
        />
        <SaldoCard
          icon={<Clock className="h-4 w-4" />}
          label="A receber (pendente)"
          value={fmtBRL(saldo.pendente)}
          tone="amber"
          cta={
            <p className="text-[11px] text-muted-foreground">
              Liberado após o embarque do passageiro.
            </p>
          }
        />
        <SaldoCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Total recebido (lifetime)"
          value={fmtBRL(saldo.total)}
          tone="sky"
          cta={
            <Button variant="outline" size="sm" disabled className="w-full gap-1.5">
              <Download className="h-3.5 w-3.5" /> Exportar extrato
            </Button>
          }
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Extrato detalhado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-16 text-sm text-muted-foreground border border-dashed rounded-lg">
            <Wallet className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-foreground mb-1">Nenhuma comissão por aqui ainda</p>
            <p className="max-w-md mx-auto text-xs leading-relaxed">
              Quando alguém fechar uma viagem usando seu link, o valor aparece aqui com data,
              cliente, pacote e status do pagamento.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-emerald-950/5 border-emerald-900/15">
        <CardContent className="p-4 flex gap-3 items-start">
          <Info className="h-4 w-4 text-emerald-800 mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Como funciona o pagamento:</strong> a comissão é
            confirmada quando o cliente paga a viagem e liberada para saque após o embarque. O
            PIX cai em até 1 dia útil depois da solicitação.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SaldoCard({
  icon,
  label,
  value,
  tone,
  cta,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "emerald" | "amber" | "sky";
  cta: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-700",
    amber: "bg-amber-500/10 text-amber-700",
    sky: "bg-sky-500/10 text-sky-700",
  };
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className={`h-7 w-7 rounded-md grid place-items-center ${tones[tone]}`}>{icon}</div>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="text-2xl font-semibold">{value}</div>
        {cta}
      </CardContent>
    </Card>
  );
}
