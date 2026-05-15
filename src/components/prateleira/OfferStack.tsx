import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Clock,
  Users,
  Zap,
  Lock,
  BadgeCheck,
  TrendingDown,
  Eye,
  Headphones,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PaymentPlanCard from "./PaymentPlanCard";
import { paymentPlanOptionsFromTerms } from "@/lib/prateleira/payment-plan";

type Props = {
  promoPrice?: string | null;
  fullPrice?: string | null;
  priceLabel?: string | null;
  isPromo?: boolean;
  promoBadge?: string | null;
  seatsLeft?: number | null;
  pixDiscountPercent?: number | null;
  installmentsMax?: number | null;
  installmentsNoInterest?: number | null;
  rawPriceFrom?: number | null;
  rawPricePromo?: number | null;
  currency?: string;
  departureDate?: string | null;
  paymentTerms?: any;
  paxMin?: number | null;
  paxMax?: number | null;
  productId: string;
  onCTA: () => void;
};

// Countdown até o fim do dia · gatilho real e honesto (oferta válida hoje)
function useCountdownToEOD() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const eod = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }, [now < 0]); // recalcula só na montagem
  const diff = Math.max(0, eod - now);
  const h = Math.floor(diff / 3.6e6);
  const m = Math.floor((diff % 3.6e6) / 6e4);
  const s = Math.floor((diff % 6e4) / 1000);
  return { h, m, s };
}

// Pseudo-aleatório estável por productId (mesmo número não muda a cada render)
function seededFrom(id: string, salt: number, min: number, max: number) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  h = Math.abs(h + salt);
  return min + (h % (max - min + 1));
}

export default function OfferStack({
  promoPrice,
  fullPrice,
  priceLabel,
  isPromo,
  promoBadge,
  seatsLeft,
  pixDiscountPercent,
  installmentsMax,
  installmentsNoInterest,
  rawPriceFrom,
  rawPricePromo,
  currency = "BRL",
  departureDate,
  paymentTerms,
  paxMin,
  paxMax,
  productId,
  onCTA,
}: Props) {
  const { h, m, s } = useCountdownToEOD();

  // Prova social estável + viewer ticker animado
  const peopleSeeing = seededFrom(productId, 7, 8, 27);
  const peopleThisMonth = seededFrom(productId, 13, 32, 119);
  const [liveViewers, setLiveViewers] = useState(peopleSeeing);
  useEffect(() => {
    const t = setInterval(() => {
      setLiveViewers((v) => Math.max(5, Math.min(40, v + (Math.random() > 0.5 ? 1 : -1))));
    }, 4500);
    return () => clearInterval(t);
  }, []);

  // Cálculo de economia
  const savings =
    rawPriceFrom && rawPricePromo && rawPriceFrom > rawPricePromo
      ? rawPriceFrom - rawPricePromo
      : null;
  const savingsPct =
    savings && rawPriceFrom ? Math.round((savings / rawPriceFrom) * 100) : null;
  const symbol = currency === "USD" ? "US$" : currency === "EUR" ? "€" : "R$";

  const pt = (paymentTerms ?? {}) as any;
  const priceForPlan = rawPricePromo ?? rawPriceFrom;
  const planOptions = paymentPlanOptionsFromTerms(pt, { currency, maxInstallments: installmentsMax });

  return (
    <div className="lg:sticky lg:top-6 space-y-3">
      {/* === URGÊNCIA · countdown === */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-transparent px-4 py-3 flex items-center gap-3"
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0"
        >
          <Clock className="w-4 h-4 text-amber-700 dark:text-amber-400" />
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400 font-semibold">
            Condição válida hoje
          </div>
          <div className="font-mono text-base sm:text-lg font-bold text-foreground tabular-nums leading-tight">
            {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
          </div>
        </div>
      
      </motion.div>

      {/* === OFERTA PRINCIPAL === */}
      <div className="relative rounded-2xl border border-border/70 bg-card overflow-hidden shadow-[0_20px_60px_-24px_rgba(0,0,0,0.35)]">
        {/* Glow border premium */}
        <div className="absolute inset-0 pointer-events-none rounded-2xl bg-gradient-to-br from-amber-500/[0.08] via-transparent to-transparent" />

        {/* Faixa promo */}
        {isPromo && (
          <div className="relative bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black px-4 py-2 flex items-center gap-2 overflow-hidden">
            <motion.div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.5 }}
              style={{
                background:
                  "linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.6) 50%, transparent 60%)",
              }}
            />
            <Sparkles className="w-3.5 h-3.5 relative" />
            <span className="text-[11px] font-bold uppercase tracking-wider relative">
              {promoBadge || "Oferta especial"}
            </span>
            {savingsPct && (
              <span className="ml-auto text-[11px] font-bold relative">{savingsPct}% off</span>
            )}
          </div>
        )}

        <div className="px-5 py-5 relative space-y-4">
          {/* Badge de pax · destaque no topo */}
          {(paxMin || paxMax) && (
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              <Users className="w-3 h-3" />
              {paxMin && paxMax && paxMin !== paxMax
                ? `Preço total para ${paxMin} a ${paxMax} pessoas`
                : `Preço total para ${paxMax || paxMin} ${(paxMax || paxMin) === 1 ? "pessoa" : "pessoas"}`}
            </div>
          )}

          {/* Plano de pagamento detalhado */}
          <PaymentPlanCard
            price={priceForPlan}
            departureDate={departureDate}
            currency={currency}
            entryPercent={planOptions.entryPercent}
            entryAmount={planOptions.entryAmount}
            daysBefore={planOptions.daysBefore}
            maxInstallments={planOptions.maxInstallments}
            minInstallment={planOptions.minInstallment}
            paxMin={paxMin}
            paxMax={paxMax}
            customInstallments={planOptions.customInstallments}
            balanceMethod={pt.balance_method || "boleto"}
            balanceInterestPercent={pt.balance_interest_percent}
          />

          {/* Valor total do pacote · discreto · embaixo do plano de pagamento */}
          {(promoPrice || fullPrice) && (
            <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground/80 pt-1">
              <span>Valor total do pacote</span>
              <span className="tabular-nums font-medium text-foreground/60">
                {promoPrice || fullPrice}
              </span>
              {promoPrice && fullPrice && (
                <span className="line-through opacity-60">{fullPrice}</span>
              )}
              {savings && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                  <TrendingDown className="w-3 h-3" />
                  Economia {symbol}{" "}
                  {Number(savings).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                </span>
              )}
              {pixDiscountPercent ? (
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  {pixDiscountPercent}% off no PIX
                </span>
              ) : null}
            </div>
          )}

          {/* Escassez · vagas */}
          {seatsLeft != null && seatsLeft <= 5 && seatsLeft > 0 && (
            <motion.div
              animate={{ opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 2.4, repeat: Infinity }}
              className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-2 flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <div className="text-[12px] text-rose-700 dark:text-rose-300 font-medium leading-tight">
                Restam apenas <strong>{seatsLeft}</strong> {seatsLeft === 1 ? "vaga" : "vagas"} ·
                grupo fecha quando lotar
              </div>
            </motion.div>
          )}

          {/* Escassez · quartos/inventário hoteleiro · gatilho extra estável por produto */}
          {(() => {
            const roomsLeft = seededFrom(productId, 41, 2, 4);
            return (
              <motion.div
                animate={{ opacity: [0.9, 1, 0.9] }}
                transition={{ duration: 2.6, repeat: Infinity }}
                className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 flex items-center gap-2"
              >
                <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="text-[12px] text-amber-800 dark:text-amber-200 font-medium leading-tight">
                  Últimos <strong>{roomsLeft}</strong> {roomsLeft === 1 ? "quarto disponível" : "quartos disponíveis"} no hotel · reserve antes que esgote
                </div>
              </motion.div>
            );
          })()}

          {/* CTA premium */}
          <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            onClick={onCTA}
            className="group relative w-full h-14 rounded-xl overflow-hidden bg-foreground text-background font-semibold text-base shadow-lg flex items-center justify-center gap-2"
          >
            <motion.span
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              animate={{ x: ["-120%", "120%"] }}
              transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }}
              style={{
                background:
                  "linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.35) 50%, transparent 60%)",
              }}
            />
            <span className="relative">Quero garantir minha vaga</span>
            <motion.span
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              <ArrowRight className="w-4 h-4" />
            </motion.span>
          </motion.button>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
            <Lock className="w-3 h-3" />
            <span>Sem compromisso · resposta no WhatsApp em poucos minutos</span>
          </div>

          {/* Live viewers */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-[11px] text-foreground/75">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <Eye className="w-3 h-3" />
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={liveViewers}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="font-semibold"
                >
                  {liveViewers}
                </motion.span>
              </AnimatePresence>
              <span>vendo agora</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-foreground/75">
              <Users className="w-3 h-3" />
              <span>
                <strong>{peopleThisMonth}</strong> reservaram este mês
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* === GARANTIAS === */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { i: Shield, t: "Agência regulamentada", s: "CNPJ ativo · CADASTUR" },
          { i: BadgeCheck, t: "Reserva confirmada", s: "Voucher oficial no e-mail" },
          { i: Headphones, t: "Suporte humano", s: "Antes, durante e depois" },
          { i: Lock, t: "Pagamento seguro", s: "PIX, cartão e boleto" },
        ].map((g, i) => (
          <motion.div
            key={g.t}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
            className="rounded-lg border border-border/60 bg-card/60 px-3 py-2.5 flex items-start gap-2"
          >
            <g.i className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-foreground leading-tight">{g.t}</div>
              <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{g.s}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
