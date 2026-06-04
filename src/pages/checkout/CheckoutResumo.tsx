import { useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Users, Minus, Plus, Zap, CreditCard, Wallet, Calendar, Plane, Hotel, Check, X, Star, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CheckoutCtx } from "@/components/checkout/CheckoutLayout";
import {
  computeNatlevaPlan, formatMoneyBR, paymentPlanOptionsFromTerms,
  paymentBalanceLabel, formatPayoffDate,
} from "@/lib/prateleira/payment-plan";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type Intent = "pix" | "cartao" | "entrada";

function fmt(d?: string | null) {
  if (!d) return null;
  try { return format(parseISO(d), "dd 'de' MMM yyyy", { locale: ptBR }); } catch { return d; }
}
function isPerPerson(label?: string | null) {
  if (label == null) return true;
  const s = String(label).trim();
  if (!s) return true;
  return /pessoa/i.test(s);
}

export default function CheckoutResumo() {
  const { orderId, draft, update } = useOutletContext<CheckoutCtx>();
  const navigate = useNavigate();
  const p = draft.product || {};
  const currency = p.currency || draft.currency || "BRL";

  const perPerson = isPerPerson(p.price_label);
  const minPax = Math.max(1, Number(p.pax_min) || 1);
  const maxPaxRaw = Number(p.pax_max);
  const maxPax = Number.isFinite(maxPaxRaw) && maxPaxRaw > 0 ? maxPaxRaw : Math.max(minPax, 20);

  const [pax, setPax] = useState<number>(draft.pax || minPax);
  const unit = (p.is_promo && Number(p.price_promo)) ? Number(p.price_promo) : Number(p.price_from);
  const groupTotal = useMemo(
    () => Math.round((unit || 0) * (perPerson ? pax : 1) * 100) / 100,
    [unit, perPerson, pax],
  );

  const plan = useMemo(
    () => computeNatlevaPlan(
      groupTotal,
      p.departure_date,
      paymentPlanOptionsFromTerms(p.payment_terms ?? undefined, {
        currency, maxInstallments: p.installments_max ?? null,
      }),
    ),
    [groupTotal, p.departure_date, p.payment_terms, p.installments_max, currency],
  );

  const hasEntry = !!plan && plan.entryAmount > 0 && plan.entryAmount < plan.total;
  const pixDisc = Number(p.pix_discount_percent) || 0;
  const pixTotal = pixDisc > 0
    ? Math.round(groupTotal * (1 - pixDisc / 100) * 100) / 100
    : groupTotal;

  const defaultIntent: Intent = (draft.payment_intent as Intent)
    || (hasEntry ? "entrada" : pixDisc > 0 ? "pix" : "cartao");
  const [intent, setIntent] = useState<Intent>(defaultIntent);
  const [saving, setSaving] = useState(false);

  const options: Array<{ id: Intent; icon: typeof Zap; title: string; subtitle: string; amount: number; visible: boolean }> = [
    { id: "pix", icon: Zap, title: pixDisc > 0 ? `Pix · ${pixDisc}% off` : "Pix à vista", subtitle: "Confirmação imediata", amount: pixTotal, visible: true },
    { id: "cartao", icon: CreditCard, title: `Cartão${p.installments_max && p.installments_max > 1 ? ` · até ${p.installments_max}x` : ""}`, subtitle: "Parcelamento no checkout", amount: groupTotal, visible: true },
    { id: "entrada", icon: Wallet, title: "Pagar entrada agora", subtitle: hasEntry ? `Saldo (${formatMoneyBR(plan!.balanceAmount, currency)}) combinado depois` : "", amount: hasEntry ? plan!.entryAmount : 0, visible: hasEntry },
  ];

  const onContinue = async () => {
    setSaving(true);
    try {
      await update({ step: "resumo", pax, payment_intent: intent });
      navigate(`/checkout/${orderId}/contato`);
    } catch (e: any) {
      toast.error("Não foi possível salvar", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="p-5 sm:p-6">
        <h1 className="font-serif text-xl sm:text-2xl mb-1">{p.title}</h1>
        <p className="text-sm text-muted-foreground">
          {[p.destination, p.destination_country].filter(Boolean).join(" · ")}
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {p.departure_date && <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /><span><span className="text-muted-foreground">Ida:</span> {fmt(p.departure_date)}</span></div>}
          {p.return_date && <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /><span><span className="text-muted-foreground">Volta:</span> {fmt(p.return_date)}</span></div>}
          {p.nights && <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /><span><span className="text-muted-foreground">Duração:</span> {p.nights} noite(s)</span></div>}
          {p.airline && <div className="flex items-center gap-2"><Plane className="w-4 h-4 text-muted-foreground" /><span><span className="text-muted-foreground">Cia:</span> {p.airline}</span></div>}
          {p.hotel_name && (
            <div className="flex items-center gap-2 sm:col-span-2">
              <Hotel className="w-4 h-4 text-muted-foreground" />
              <span>
                <span className="text-muted-foreground">Hotel:</span> {p.hotel_name}{" "}
                {p.hotel_stars ? Array.from({ length: p.hotel_stars }).map((_, i) => (
                  <Star key={i} className="inline w-3 h-3 text-amber-500 fill-amber-500" />
                )) : null}
              </span>
            </div>
          )}
        </div>
      </Card>

      {(Array.isArray(p.includes) && p.includes.length > 0) || (Array.isArray(p.excludes) && p.excludes.length > 0) ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.isArray(p.includes) && p.includes.length > 0 && (
            <Card className="p-5">
              <h3 className="font-medium mb-3 text-emerald-700 dark:text-emerald-400 flex items-center gap-2"><Check className="w-4 h-4" /> Está incluso</h3>
              <ul className="space-y-1.5 text-sm">
                {p.includes.map((it: string, i: number) => (
                  <li key={i} className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-emerald-600 mt-1 shrink-0" /><span>{it}</span></li>
                ))}
              </ul>
            </Card>
          )}
          {Array.isArray(p.excludes) && p.excludes.length > 0 && (
            <Card className="p-5">
              <h3 className="font-medium mb-3 text-muted-foreground flex items-center gap-2"><X className="w-4 h-4" /> Não incluso</h3>
              <ul className="space-y-1.5 text-sm">
                {p.excludes.map((it: string, i: number) => (
                  <li key={i} className="flex items-start gap-2"><X className="w-3.5 h-3.5 text-muted-foreground mt-1 shrink-0" /><span>{it}</span></li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      ) : null}

      <Card className="p-5 sm:p-6 border-emerald-500/30">
        <h2 className="font-serif text-lg mb-4">Sua reserva</h2>

        {perPerson && (
          <div className="mb-4 rounded-xl border border-border bg-background/50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="font-medium">Passageiros</span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPax((x) => Math.max(minPax, x - 1))}
                  disabled={pax <= minPax || saving}
                  className="w-8 h-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-40 hover:border-emerald-500/50">
                  <Minus className="w-4 h-4" />
                </button>
                <div className="w-8 text-center font-semibold tabular-nums">{pax}</div>
                <button type="button" onClick={() => setPax((x) => Math.min(maxPax, x + 1))}
                  disabled={pax >= maxPax || saving}
                  className="w-8 h-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-40 hover:border-emerald-500/50">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              {formatMoneyBR(unit || 0, currency)} por pessoa · total{" "}
              <span className="font-semibold text-foreground">{formatMoneyBR(groupTotal, currency)}</span>{" "}
              para {pax} {pax === 1 ? "pessoa" : "pessoas"}
            </div>
          </div>
        )}

        <div className="space-y-2 mb-2">
          {options.filter((o) => o.visible).map((o) => {
            const Icon = o.icon;
            const active = intent === o.id;
            return (
              <button key={o.id} onClick={() => setIntent(o.id)} disabled={saving}
                className={`w-full text-left rounded-xl border px-3 py-2.5 flex items-center gap-3 transition-all ${
                  active ? "border-emerald-500 bg-emerald-500/10 shadow-sm" : "border-border hover:border-emerald-500/50"
                }`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-emerald-500 text-white" : "bg-muted text-foreground/70"}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium leading-tight">{o.title}</div>
                  {o.subtitle && <div className="text-[11px] text-muted-foreground truncate">{o.subtitle}</div>}
                </div>
                <div className="text-sm font-semibold tabular-nums shrink-0">{formatMoneyBR(o.amount, currency)}</div>
              </button>
            );
          })}
        </div>
      </Card>

      <motion.div whileTap={{ scale: 0.99 }}>
        <Button onClick={onContinue} disabled={saving} className="w-full h-12 text-sm font-semibold">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando…</> : "Continuar"}
        </Button>
      </motion.div>
    </div>
  );
}
