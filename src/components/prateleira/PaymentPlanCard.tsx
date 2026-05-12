import { Card } from "@/components/ui/card";
import { CheckCircle2, CreditCard, FileText, CalendarClock, Sparkles } from "lucide-react";
import { computeNatlevaPlan, formatMoneyBR, formatPayoffDate } from "@/lib/prateleira/payment-plan";

type Props = {
  price: number | null | undefined;
  departureDate?: string | null;
  currency?: string;
  entryPercent?: number;
  daysBefore?: number;
  compact?: boolean;
};

export default function PaymentPlanCard({ price, departureDate, currency = "BRL", entryPercent, daysBefore, compact }: Props) {
  const plan = computeNatlevaPlan(price, departureDate, { entryPercent, daysBefore, currency });
  if (!plan) return null;

  const longInstallments = plan.installments >= 8;

  const sellingCopy = longInstallments
    ? "Olha que parcela cabendo no seu mês. Quanto antes você fecha, mais a gente consegue diluir o saldo no boleto, sem juros, do seu jeito."
    : "Você não precisa de cartão pra viajar. Dá uma entrada à vista e o restante a gente parcela no boleto, sem juros, ajustado pro seu embarque.";

  return (
    <Card className="p-5 space-y-4 border-amber-500/30 bg-gradient-to-br from-amber-50/40 to-transparent dark:from-amber-500/5">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <h3 className="font-serif text-lg leading-tight">Como você paga essa viagem</h3>
      </div>

      {/* Etapa 1 · Entrada */}
      <div className="rounded-lg border border-border/60 p-3.5 bg-background/60">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 w-8 h-8 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center text-sm font-bold">1</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-muted-foreground">Entrada de {plan.entryPercent}% à vista</div>
            <div className="text-xl font-bold text-foreground">{formatMoneyBR(plan.entryAmount, plan.currency)}</div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" /> PIX, cartão de crédito ou link de pagamento
            </div>
          </div>
        </div>
      </div>

      {/* Etapa 2 · Saldo */}
      <div className="rounded-lg border border-border/60 p-3.5 bg-background/60">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-sm font-bold">2</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-muted-foreground">Saldo de {100 - plan.entryPercent}% no boleto, sem juros</div>
            <div className="text-xl font-bold text-foreground">
              {plan.installments}x de {formatMoneyBR(plan.installmentAmount, plan.currency)}
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Total parcelado · {formatMoneyBR(plan.balanceAmount, plan.currency)}
            </div>
          </div>
        </div>
      </div>

      {/* Quitação */}
      <div className="flex items-start gap-2 text-xs bg-muted/50 rounded-lg p-3">
        <CalendarClock className="w-4 h-4 text-foreground/70 mt-0.5 shrink-0" />
        <div>
          {plan.isSimulated ? (
            <>
              <span className="font-medium text-foreground">Simulação para embarque em ~6 meses.</span>{" "}
              <span className="text-muted-foreground">O número de parcelas varia conforme a data escolhida · quitação até {plan.daysBefore} dias antes do embarque.</span>
            </>
          ) : (
            <>
              <span className="font-medium text-foreground">Quitação até {formatPayoffDate(plan.payoffDate)}</span>
              <span className="text-muted-foreground"> · {plan.daysBefore} dias antes do embarque.</span>
            </>
          )}
        </div>
      </div>

      {!compact && (
        <div className="text-xs leading-relaxed text-foreground/80 space-y-2 pt-1">
          <p>{sellingCopy}</p>
          <ul className="space-y-1">
            <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" /> Sem cartão de crédito também viaja · entrada no PIX já garante a reserva.</li>
            <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" /> Boleto sem juros · você paga só o que combinou, do começo ao fim.</li>
            <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" /> Quanto mais cedo reservar, mais parcelas a gente encaixa · parcela menor, viagem mais leve.</li>
          </ul>
        </div>
      )}
    </Card>
  );
}
