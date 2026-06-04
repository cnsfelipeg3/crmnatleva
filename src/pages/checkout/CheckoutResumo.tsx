import { useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Loader2, Users, Minus, Plus, Zap, CreditCard, Wallet, Calendar, Plane, Hotel,
  Check, X, Star, Receipt, Sparkles, MapPin, ArrowRight, Heart, Clock, ShieldCheck,
} from "lucide-react";
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
  const pixSaved = Math.max(0, Math.round((groupTotal - pixTotal) * 100) / 100);

  const balanceMethod = (p.payment_terms?.balance_method as string | undefined) ?? "boleto";
  const balanceInterest = Number(p.payment_terms?.balance_interest_percent) || 0;
  const balanceLabel = paymentBalanceLabel(balanceMethod, balanceInterest);
  const installmentsMaxCard = Number(p.installments_max) || 1;
  const payoffStr = plan ? formatPayoffDate(plan.payoffDate) : null;

  const defaultIntent: Intent = (draft.payment_intent as Intent)
    || (hasEntry ? "entrada" : pixDisc > 0 ? "pix" : "cartao");
  const [intent, setIntent] = useState<Intent>(defaultIntent);
  const [saving, setSaving] = useState(false);

  const cardSubtitle = installmentsMaxCard > 1
    ? `Em até ${installmentsMaxCard}x de ${formatMoneyBR(groupTotal / installmentsMaxCard, currency)} sem juros`
    : "À vista no cartão";

  const entrySubtitle = hasEntry
    ? `Entrada ${formatMoneyBR(plan!.entryAmount, currency)} · saldo ${plan!.installments}x ${formatMoneyBR(plan!.installmentAmount, currency)}`
    : "";

  const options: Array<{ id: Intent; icon: typeof Zap; title: string; subtitle: string; amount: number; visible: boolean; badge?: string }> = [
    {
      id: "pix",
      icon: Zap,
      title: pixDisc > 0 ? `Pix à vista` : "Pix à vista",
      subtitle: pixDisc > 0
        ? `Você economiza ${formatMoneyBR(pixSaved, currency)} · confirmação imediata`
        : "Confirmação imediata · sem taxas",
      amount: pixTotal,
      visible: true,
      badge: pixDisc > 0 ? `−${pixDisc}%` : undefined,
    },
    {
      id: "cartao",
      icon: CreditCard,
      title: installmentsMaxCard > 1 ? `Cartão em até ${installmentsMaxCard}x` : "Cartão à vista",
      subtitle: cardSubtitle,
      amount: groupTotal,
      visible: true,
      badge: installmentsMaxCard > 1 ? "Sem juros" : undefined,
    },
    {
      id: "entrada",
      icon: Wallet,
      title: "Entrada + saldo parcelado",
      subtitle: entrySubtitle,
      amount: hasEntry ? plan!.entryAmount : 0,
      visible: hasEntry,
      badge: "Mais flexível",
    },
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

  // Hero & gallery
  const cover: string | undefined =
    p.cover_image_url ||
    (Array.isArray(p.gallery) && p.gallery[0]?.url) ||
    undefined;
  const gallery: { url: string }[] = Array.isArray(p.gallery) ? p.gallery : [];
  const galleryThumbs = gallery.slice(0, 4);

  const departure = fmt(p.departure_date);
  const returnD = fmt(p.return_date);

  return (
    <div className="space-y-6">
      {/* HERO imersivo */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative rounded-3xl overflow-hidden border border-border shadow-xl shadow-black/10"
      >
        <div className="relative h-[260px] sm:h-[340px] lg:h-[400px]">
          {cover ? (
            <motion.img
              src={cover}
              alt={p.title}
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ scale: 1.08 }}
              animate={{ scale: 1 }}
              transition={{ duration: 12, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-emerald-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />

          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-white/90 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15">
              <Sparkles className="w-3 h-3 text-amber-300" /> Você está reservando
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 text-white">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-white/70 mb-2">
              <MapPin className="w-3 h-3" />
              {[p.destination, p.destination_country].filter(Boolean).join(" · ")}
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.02] tracking-tight max-w-2xl">
              {p.title}
            </h1>
            {p.short_description && (
              <p className="mt-3 text-sm sm:text-base text-white/80 max-w-xl line-clamp-2 font-light">
                {p.short_description}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-white/80">
              {departure && returnD && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-white/60" />
                  {departure} <ArrowRight className="w-3 h-3" /> {returnD}
                </span>
              )}
              {p.nights && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-white/60" /> {p.nights} noites
                </span>
              )}
              {p.airline && (
                <span className="flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5 text-white/60" /> {p.airline}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Galeria de thumbs sob o hero */}
        {galleryThumbs.length > 1 && (
          <div className="grid grid-cols-4 gap-1 bg-card p-1">
            {galleryThumbs.map((g, i) => (
              <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-lg group">
                <img src={g.url} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Hotel destaque */}
      {p.hotel_name && (
        <Card className="p-5 flex items-center gap-4 border-amber-500/20 bg-gradient-to-br from-amber-500/[0.03] to-transparent">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <Hotel className="w-5 h-5 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sua hospedagem</div>
            <div className="font-medium truncate">{p.hotel_name}</div>
            {p.hotel_stars ? (
              <div className="flex items-center gap-0.5 mt-0.5">
                {Array.from({ length: p.hotel_stars }).map((_, i) => (
                  <Star key={i} className="w-3 h-3 text-amber-500 fill-amber-500" />
                ))}
              </div>
            ) : null}
          </div>
        </Card>
      )}

      {/* Highlights vendedores */}
      {Array.isArray(p.highlights) && p.highlights.length > 0 && (
        <Card className="p-5 sm:p-6">
          <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" /> Por que essa viagem é única
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
            {p.highlights.slice(0, 6).map((h: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </span>
                <span className="leading-snug">{h}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Includes / Excludes */}
      {((Array.isArray(p.includes) && p.includes.length > 0) || (Array.isArray(p.excludes) && p.excludes.length > 0)) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.isArray(p.includes) && p.includes.length > 0 && (
            <Card className="p-5">
              <h3 className="font-medium mb-3 text-emerald-700 dark:text-emerald-400 flex items-center gap-2 text-sm">
                <Check className="w-4 h-4" /> O que está incluso
              </h3>
              <ul className="space-y-1.5 text-sm">
                {p.includes.map((it: string, i: number) => (
                  <li key={i} className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-emerald-600 mt-1 shrink-0" /><span>{it}</span></li>
                ))}
              </ul>
            </Card>
          )}
          {Array.isArray(p.excludes) && p.excludes.length > 0 && (
            <Card className="p-5">
              <h3 className="font-medium mb-3 text-muted-foreground flex items-center gap-2 text-sm">
                <X className="w-4 h-4" /> Não incluso
              </h3>
              <ul className="space-y-1.5 text-sm">
                {p.excludes.map((it: string, i: number) => (
                  <li key={i} className="flex items-start gap-2"><X className="w-3.5 h-3.5 text-muted-foreground mt-1 shrink-0" /><span>{it}</span></li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* Bloco de configuração da reserva */}
      <Card className="p-5 sm:p-6 border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.04] to-transparent">
        <h2 className="font-serif text-xl mb-1">Monte sua reserva</h2>
        <p className="text-xs text-muted-foreground mb-5">Escolha quantas pessoas e a melhor forma de pagar.</p>

        {perPerson && (
          <div className="mb-5 rounded-xl border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-sm font-medium leading-tight">Passageiros</div>
                  <div className="text-[11px] text-muted-foreground">{formatMoneyBR(unit || 0, currency)} por pessoa</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPax((x) => Math.max(minPax, x - 1))}
                  disabled={pax <= minPax || saving}
                  className="w-9 h-9 rounded-lg border border-border flex items-center justify-center disabled:opacity-40 hover:border-emerald-500/60 hover:bg-emerald-500/5 transition-colors">
                  <Minus className="w-4 h-4" />
                </button>
                <div className="w-9 text-center font-semibold tabular-nums text-lg">{pax}</div>
                <button type="button" onClick={() => setPax((x) => Math.min(maxPax, x + 1))}
                  disabled={pax >= maxPax || saving}
                  className="w-9 h-9 rounded-lg border border-border flex items-center justify-center disabled:opacity-40 hover:border-emerald-500/60 hover:bg-emerald-500/5 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total para {pax} {pax === 1 ? "pessoa" : "pessoas"}</span>
              <span className="font-bold text-lg tabular-nums">{formatMoneyBR(groupTotal, currency)}</span>
            </div>
          </div>
        )}

        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">Como você prefere pagar</div>
        <div className="space-y-2 mb-3">
          {options.filter((o) => o.visible).map((o) => {
            const Icon = o.icon;
            const active = intent === o.id;
            return (
              <motion.button
                key={o.id}
                onClick={() => setIntent(o.id)}
                disabled={saving}
                whileTap={{ scale: 0.99 }}
                className={`w-full text-left rounded-xl border px-3.5 py-3 flex items-center gap-3 transition-all ${
                  active
                    ? "border-emerald-500 bg-emerald-500/10 shadow-md shadow-emerald-500/10"
                    : "border-border bg-background hover:border-emerald-500/50"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${active ? "bg-emerald-500 text-white" : "bg-muted text-foreground/70"}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium leading-tight">{o.title}</span>
                    {o.badge && (
                      <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold ${
                        active ? "bg-emerald-600 text-white" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      }`}>{o.badge}</span>
                    )}
                  </div>
                  {o.subtitle && <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{o.subtitle}</div>}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold tabular-nums">{formatMoneyBR(o.amount, currency)}</div>
                  {o.id === "entrada" && hasEntry && (
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider">agora</div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Detalhamento */}
        <motion.div
          key={intent}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-xl border border-emerald-500/30 bg-background/60 p-4 space-y-2 text-sm"
        >
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium text-[13px]">
            <Receipt className="w-4 h-4" /> Detalhes do pagamento
          </div>

          {intent === "pix" && (
            <ul className="space-y-1 text-[13px]">
              <li className="flex justify-between"><span className="text-muted-foreground">Valor total</span><span className="font-semibold tabular-nums">{formatMoneyBR(groupTotal, currency)}</span></li>
              {pixDisc > 0 && (
                <li className="flex justify-between text-emerald-700"><span>Desconto Pix ({pixDisc}%)</span><span className="font-semibold tabular-nums">− {formatMoneyBR(pixSaved, currency)}</span></li>
              )}
              <li className="flex justify-between border-t border-emerald-500/20 pt-2"><span className="font-medium">Você paga via Pix</span><span className="font-bold tabular-nums">{formatMoneyBR(pixTotal, currency)}</span></li>
              <li className="text-[11px] text-muted-foreground pt-1">QR code gerado na próxima tela · confirmação automática em segundos.</li>
            </ul>
          )}

          {intent === "cartao" && (
            <ul className="space-y-1 text-[13px]">
              <li className="flex justify-between"><span className="text-muted-foreground">Valor total</span><span className="font-semibold tabular-nums">{formatMoneyBR(groupTotal, currency)}</span></li>
              {installmentsMaxCard > 1 ? (
                <>
                  <li className="flex justify-between"><span className="text-muted-foreground">Parcelamento</span><span className="font-semibold">até {installmentsMaxCard}x sem juros</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Parcela mínima</span><span className="font-semibold tabular-nums">{formatMoneyBR(groupTotal / installmentsMaxCard, currency)}</span></li>
                </>
              ) : (
                <li className="flex justify-between"><span className="text-muted-foreground">Forma</span><span className="font-semibold">À vista no cartão</span></li>
              )}
              <li className="text-[11px] text-muted-foreground pt-1">Bandeira e parcelas escolhidas no checkout · Visa, Master, Elo, Amex e Hiper.</li>
            </ul>
          )}

          {intent === "entrada" && hasEntry && plan && (
            <ul className="space-y-1 text-[13px]">
              <li className="flex justify-between"><span className="text-muted-foreground">Valor total</span><span className="font-semibold tabular-nums">{formatMoneyBR(plan.total, currency)}</span></li>
              <li className="flex justify-between"><span className="text-muted-foreground">Entrada agora ({plan.entryPercent}%)</span><span className="font-semibold tabular-nums">{formatMoneyBR(plan.entryAmount, currency)}</span></li>
              <li className="flex justify-between"><span className="text-muted-foreground">Saldo</span><span className="font-semibold tabular-nums">{formatMoneyBR(plan.balanceAmount, currency)}</span></li>
              <li className="flex justify-between"><span className="text-muted-foreground">Saldo parcelado</span><span className="font-semibold">{plan.installments}x de {formatMoneyBR(plan.installmentAmount, currency)} {balanceLabel}</span></li>
              {payoffStr && (
                <li className="flex justify-between"><span className="text-muted-foreground">Quitação até</span><span className="font-semibold">{payoffStr}</span></li>
              )}
              <li className="text-[11px] text-muted-foreground pt-1">Entrada via Pix ou cartão agora · saldo combinado depois com nossa equipe.</li>
            </ul>
          )}
        </motion.div>
      </Card>

      {/* CTA + reasons */}
      <div className="space-y-3">
        <motion.div whileTap={{ scale: 0.99 }}>
          <Button onClick={onContinue} disabled={saving} size="lg" className="w-full h-14 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20">
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando…</>
            ) : (
              <>Continuar reserva <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        </motion.div>
        <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-muted-foreground">
          <div className="flex flex-col items-center gap-1 p-2"><ShieldCheck className="w-4 h-4 text-emerald-600" />Compra protegida</div>
          <div className="flex flex-col items-center gap-1 p-2"><Zap className="w-4 h-4 text-emerald-600" />Confirmação em 24h</div>
          <div className="flex flex-col items-center gap-1 p-2"><Heart className="w-4 h-4 text-rose-500" />+10mil viajantes</div>
        </div>
      </div>
    </div>
  );
}
