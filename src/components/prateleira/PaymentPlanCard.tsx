import { CheckCircle2, CreditCard, FileText, CalendarClock, Wallet } from "lucide-react";
import { computeNatlevaPlan, formatMoneyBR, formatPayoffDate } from "@/lib/prateleira/payment-plan";

type Props = {
  price: number | null | undefined;
  departureDate?: string | null;
  currency?: string;
  entryPercent?: number;
  entryAmount?: number;
  daysBefore?: number;
  compact?: boolean;
  paxMin?: number | null;
  paxMax?: number | null;
  customInstallments?: number[];
};

export default function PaymentPlanCard({ price, departureDate, currency = "BRL", entryPercent, entryAmount, daysBefore, compact, paxMin, paxMax, customInstallments }: Props) {
  const plan = computeNatlevaPlan(price, departureDate, { entryPercent, entryAmount, daysBefore, currency, customInstallments });
  if (!plan) return null;

  const longInstallments = plan.installments >= 8;
  const balancePercent = 100 - plan.entryPercent;

  const paxLabel = (() => {
    if (!paxMin && !paxMax) return null;
    const a = paxMin || paxMax!;
    const b = paxMax || paxMin!;
    if (a !== b) return `Valor para ${a} a ${b} pessoas`;
    return `Valor para ${a} ${a === 1 ? "pessoa" : "pessoas"}`;
  })();

  const sellingCopy = longInstallments
    ? "Quanto antes você fecha, mais a gente dilui o saldo no boleto · parcela menor, viagem mais leve no seu mês."
    : "Não precisa de cartão pra viajar. Entrada à vista garante a reserva e o saldo vai no boleto, sem juros, ajustado pro seu embarque.";

  return (
    <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border/60 bg-muted/40">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <h3 className="font-serif text-base sm:text-lg leading-tight text-foreground">Como você paga</h3>
        </div>
      </div>

      {/* Resumo direto · pra quem é + entrada + parcelas */}
      <div className="px-5 pt-4 pb-1">
        {paxLabel && (
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
            {paxLabel}
          </div>
        )}
        <div className="mt-1 text-[13px] sm:text-sm text-foreground/90 leading-snug">
          <span className="font-bold tabular-nums">{formatMoneyBR(plan.entryAmount, plan.currency)}</span>
          <span className="text-muted-foreground"> de entrada</span>
          <span className="text-muted-foreground"> + </span>
          <span className="font-bold tabular-nums">{plan.installments}x</span>
          <span className="text-muted-foreground"> de </span>
          <span className="font-bold tabular-nums">{formatMoneyBR(plan.installmentAmount, plan.currency)}</span>
          <span className="text-muted-foreground"> sem juros</span>
        </div>
      </div>

      {/* Etapas com timeline */}
      <div className="px-5 py-5 relative">
        {/* Linha vertical conectora · alinhada ao centro dos números */}
        <div className="absolute left-[34px] top-12 bottom-[100px] w-px bg-border/70" aria-hidden />

        {/* Etapa 1 · Entrada */}
        <div className="flex gap-3.5 relative">
          <div className="shrink-0 w-7 h-7 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center text-xs font-bold ring-4 ring-card relative z-10 mt-0.5">
            1
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
              Entrada
            </div>
            <div className="text-[22px] sm:text-[24px] font-bold text-foreground tabular-nums leading-[1.1] mt-1 whitespace-nowrap">
              {formatMoneyBR(plan.entryAmount, plan.currency)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1.5">
              <CreditCard className="w-3 h-3 shrink-0" />
              <span>PIX, cartão ou link de pagamento</span>
            </div>
          </div>
        </div>

        {/* Conector "+" entre entrada e saldo */}
        <div className="flex items-center gap-3.5 relative mt-2 mb-1" aria-hidden>
          <div className="shrink-0 w-7 flex justify-center">
            <div className="w-6 h-6 rounded-full bg-card border border-border/70 text-foreground/70 flex items-center justify-center text-sm font-bold relative z-10">
              +
            </div>
          </div>
        </div>

        {/* Etapa 2 · Saldo */}
        <div className="flex gap-3.5 relative mt-2">
          <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold ring-4 ring-card relative z-10 mt-0.5">
            2
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
              Saldo {balancePercent}% · boleto sem juros
            </div>
            <div className="mt-1 flex items-baseline gap-1.5 whitespace-nowrap flex-wrap">
              <span className="text-[22px] sm:text-[24px] font-bold text-foreground tabular-nums leading-[1.1]">
                {plan.installments}x
              </span>
              <span className="text-sm text-muted-foreground">de</span>
              <span className="text-[22px] sm:text-[24px] font-bold text-foreground tabular-nums leading-[1.1]">
                {formatMoneyBR(plan.installmentAmount, plan.currency)}
              </span>
              {plan.customInstallments && (
                <span className="text-[10px] text-muted-foreground font-medium">· valor médio · veja cronograma</span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1.5">
              <FileText className="w-3 h-3 shrink-0" />
              <span>Total parcelado · {formatMoneyBR(plan.balanceAmount, plan.currency)}</span>
            </div>
            {plan.customInstallments && (
              <ul className="mt-3 space-y-1 rounded-lg border border-border/60 bg-muted/30 p-2.5">
                {plan.customInstallments.map((v, i) => (
                  <li key={i} className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Parcela {i + 1}</span>
                    <span className="font-semibold text-foreground tabular-nums">{formatMoneyBR(v, plan.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Quitação */}
        <div className="flex items-start gap-2 pt-4 mt-5 border-t border-border/60">
          <CalendarClock className="w-3.5 h-3.5 text-foreground/60 mt-0.5 shrink-0" />
          <div className="text-[11px] leading-relaxed">
            {plan.isSimulated ? (
              <>
                <span className="font-semibold text-foreground">Simulação para embarque em ~6 meses.</span>{" "}
                <span className="text-muted-foreground">Parcelas variam conforme a data · quitação até {plan.daysBefore} dias antes do embarque.</span>
              </>
            ) : (
              <>
                <span className="font-semibold text-foreground">Quitação até {formatPayoffDate(plan.payoffDate)}</span>
                <span className="text-muted-foreground"> · {plan.daysBefore} dias antes do embarque</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Selling copy */}
      {!compact && (
        <div className="px-5 py-4 border-t border-border/60 bg-muted/20 space-y-2.5">
          <p className="text-xs leading-relaxed text-foreground/85">{sellingCopy}</p>
          <ul className="space-y-1.5">
            {[
              "Sem cartão também viaja · entrada no PIX já garante a reserva",
              "Boleto sem juros · você paga só o que combinou",
              "Reservou cedo, parcelou em mais vezes · parcela cabe no mês",
            ].map((t) => (
              <li key={t} className="flex items-start gap-1.5 text-[11px] text-foreground/75 leading-relaxed">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-500 mt-0.5 shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
