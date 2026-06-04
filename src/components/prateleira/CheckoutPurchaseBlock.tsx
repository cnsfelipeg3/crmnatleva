import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Zap, Wallet, Loader2, ShieldCheck, Minus, Plus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import {
  computeNatlevaPlan,
  formatMoneyBR,
  paymentPlanOptionsFromTerms,
  type PublicPaymentTerms,
} from "@/lib/prateleira/payment-plan";

type Intent = "pix" | "cartao" | "entrada";

interface CheckoutPurchaseBlockProps {
  productId: string;
  productSlug?: string | null;
  productTitle: string;
  priceFrom?: number | null;
  pricePromo?: number | null;
  isPromo?: boolean;
  currency?: string | null;
  pixDiscountPercent?: number | null;
  installmentsMax?: number | null;
  installmentsNoInterest?: number | null;
  paymentTerms?: PublicPaymentTerms | null;
  priceLabel?: string | null;
  paxMin?: number | null;
  paxMax?: number | null;
  departureDate?: string | null;
  buyer?: { name?: string; email?: string; phone?: string };
  affiliateRef?: string | null;
  source?: "catalogo_publico" | "link_avulso";
  onBeforeRedirect?: (intent: Intent) => void;
}

function isPerPersonLabel(label?: string | null): boolean {
  if (label === null || label === undefined) return true;
  const s = String(label).trim();
  if (!s) return true;
  return /pessoa/i.test(s);
}

export default function CheckoutPurchaseBlock({
  productId,
  productTitle,
  priceFrom,
  pricePromo,
  isPromo,
  currency = "BRL",
  pixDiscountPercent,
  installmentsMax,
  paymentTerms,
  priceLabel,
  paxMin,
  paxMax,
  departureDate,
  buyer,
  affiliateRef,
  source = "catalogo_publico",
  onBeforeRedirect,
}: CheckoutPurchaseBlockProps) {
  const unit = useMemo(() => {
    const v = isPromo && pricePromo ? Number(pricePromo) : Number(priceFrom);
    return Number.isFinite(v) && v > 0 ? v : 0;
  }, [isPromo, priceFrom, pricePromo]);

  const perPerson = isPerPersonLabel(priceLabel);
  const minPax = Math.max(1, Number(paxMin) || 1);
  const maxPax = (() => {
    const v = Number(paxMax);
    return Number.isFinite(v) && v > 0 ? v : Math.max(minPax, 20);
  })();

  const [pax, setPax] = useState<number>(minPax);
  const paxMultiplier = perPerson ? pax : 1;
  const groupTotal = useMemo(
    () => Math.round(unit * paxMultiplier * 100) / 100,
    [unit, paxMultiplier],
  );

  const plan = useMemo(
    () =>
      computeNatlevaPlan(
        groupTotal,
        departureDate,
        paymentPlanOptionsFromTerms(paymentTerms ?? undefined, {
          currency: currency ?? "BRL",
          maxInstallments: installmentsMax ?? null,
        }),
      ),
    [groupTotal, departureDate, paymentTerms, currency, installmentsMax],
  );

  const hasEntry = !!plan && plan.entryAmount > 0 && plan.entryAmount < plan.total;
  const pixDisc = Number(pixDiscountPercent) || 0;
  const pixTotal = pixDisc > 0 ? Math.round(groupTotal * (1 - pixDisc / 100) * 100) / 100 : groupTotal;

  const defaultIntent: Intent = hasEntry ? "entrada" : pixDisc > 0 ? "pix" : "cartao";
  const [intent, setIntent] = useState<Intent>(defaultIntent);
  const [loading, setLoading] = useState(false);

  if (!unit) return null;

  const decPax = () => setPax((p) => Math.max(minPax, p - 1));
  const incPax = () => setPax((p) => Math.min(maxPax, p + 1));

  const handlePay = async () => {
    setLoading(true);
    try {
      onBeforeRedirect?.(intent);
      const { data, error } = await supabase.functions.invoke("infinitepay-create-link", {
        body: {
          product_id: productId,
          payment_intent: intent,
          pax: perPerson ? pax : undefined,
          buyer,
          affiliate_ref: affiliateRef ?? undefined,
          source,
        },
      });
      if (error) throw error;
      const url = (data as { checkout_url?: string })?.checkout_url;
      if (!url) throw new Error("Link de pagamento não retornado");
      window.location.href = url;
    } catch (e: any) {
      toast.error("Não foi possível abrir o checkout", {
        description: e?.message ?? "Tente novamente em instantes.",
      });
      setLoading(false);
    }
  };

  const options: Array<{
    id: Intent;
    icon: typeof CreditCard;
    title: string;
    subtitle: string;
    amount: number;
    visible: boolean;
  }> = [
    {
      id: "pix",
      icon: Zap,
      title: pixDisc > 0 ? `Pix · ${pixDisc}% off` : "Pix à vista",
      subtitle: "Confirmação imediata",
      amount: pixTotal,
      visible: true,
    },
    {
      id: "cartao",
      icon: CreditCard,
      title: `Cartão${installmentsMax && installmentsMax > 1 ? ` · até ${installmentsMax}x` : ""}`,
      subtitle: "Parcelamento escolhido no checkout",
      amount: groupTotal,
      visible: true,
    },
    {
      id: "entrada",
      icon: Wallet,
      title: "Pagar entrada agora",
      subtitle: hasEntry
        ? `Saldo (${formatMoneyBR(plan!.balanceAmount, plan!.currency)}) combinado depois`
        : "",
      amount: hasEntry ? plan!.entryAmount : 0,
      visible: hasEntry,
    },
  ];

  return (
    <Card className="p-5 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <h3 className="font-serif text-base">Comprar agora · checkout seguro</h3>
      </div>
      <p className="text-[12px] text-muted-foreground mb-4">
        Pagamento processado pela InfinitePay. Você escolhe Pix ou cartão na próxima tela.
      </p>

      {perPerson && (
        <div className="mb-4 rounded-xl border border-border bg-background/50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-emerald-600" />
              <span className="font-medium">Passageiros</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={decPax}
                disabled={pax <= minPax || loading}
                className="w-8 h-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-40 hover:border-emerald-500/50"
                aria-label="Diminuir passageiros"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="w-8 text-center font-semibold tabular-nums">{pax}</div>
              <button
                type="button"
                onClick={incPax}
                disabled={pax >= maxPax || loading}
                className="w-8 h-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-40 hover:border-emerald-500/50"
                aria-label="Aumentar passageiros"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            {formatMoneyBR(unit, currency ?? "BRL")} por pessoa · total{" "}
            <span className="font-semibold text-foreground">
              {formatMoneyBR(groupTotal, currency ?? "BRL")}
            </span>{" "}
            para {pax} {pax === 1 ? "pessoa" : "pessoas"}
            {(minPax > 1 || maxPax < 20) && (
              <> · mín {minPax}, máx {maxPax}</>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2 mb-4">
        {options
          .filter((o) => o.visible)
          .map((o) => {
            const Icon = o.icon;
            const active = intent === o.id;
            return (
              <button
                key={o.id}
                onClick={() => setIntent(o.id)}
                disabled={loading}
                className={`w-full text-left rounded-xl border px-3 py-2.5 flex items-center gap-3 transition-all ${
                  active
                    ? "border-emerald-500 bg-emerald-500/10 shadow-sm"
                    : "border-border hover:border-emerald-500/50"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    active ? "bg-emerald-500 text-white" : "bg-muted text-foreground/70"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium leading-tight">{o.title}</div>
                  {o.subtitle && (
                    <div className="text-[11px] text-muted-foreground truncate">{o.subtitle}</div>
                  )}
                </div>
                <div className="text-sm font-semibold tabular-nums shrink-0">
                  {formatMoneyBR(o.amount, currency ?? "BRL")}
                </div>
              </button>
            );
          })}
      </div>

      <motion.button
        onClick={handlePay}
        disabled={loading}
        whileTap={{ scale: 0.97 }}
        className="relative overflow-hidden w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Abrindo checkout…
          </>
        ) : (
          <>
            Pagar {formatMoneyBR(
              options.find((o) => o.id === intent)?.amount ?? groupTotal,
              currency ?? "BRL",
            )}
          </>
        )}
      </motion.button>
      <div className="text-[10px] text-center text-muted-foreground mt-2 truncate">
        {productTitle}
        {perPerson && pax > 1 ? ` · ${pax} passageiros` : ""}
      </div>
    </Card>
  );
}
