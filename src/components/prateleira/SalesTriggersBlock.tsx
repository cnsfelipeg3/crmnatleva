import { motion } from "framer-motion";
import { Quote, Star, Award, Plane, Heart, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

type Props = {
  destination?: string | null;
  productKind?: string | null;
};

function getInitials(name: string): string {
  return name
    .replace(/[^A-Za-zÀ-ÿ&\s]/g, "")
    .split(/[\s&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const TESTIMONIALS = [
  {
    name: "Camila R.",
    text: "Achei que ia ser só mais uma viagem. Voltei com a sensação de que valeu cada centavo · a Nath cuidou de tudo, eu só apareci.",
    trip: "Fernando de Noronha",
    rating: 5,
  },
  {
    name: "Rodrigo M.",
    text: "Parcelei sem juros, a entrada foi tranquila e o suporte resolveu um problema no aeroporto em 4 minutos. Coisa rara.",
    trip: "Cancún",
    rating: 5,
  },
  {
    name: "Júlia & André",
    text: "Lua de mel inesquecível. Eles antecipam o que você nem sabia que ia precisar. Próxima viagem é com eles, sem pensar.",
    trip: "Maldivas",
    rating: 5,
  },
];

export default function SalesTriggersBlock({ destination }: Props) {
  return (
    <div className="space-y-6">
      {/* === MANIFESTO · por que NatLeva === */}
      <Card className="p-6 sm:p-8 relative overflow-hidden border-amber-500/20">
        <motion.div
          aria-hidden
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
          animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background:
              "radial-gradient(circle, rgba(251,191,36,0.18), transparent 70%)",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-amber-700 dark:text-amber-400">
              Por que NatLeva
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl leading-tight text-foreground">
            Você não está comprando uma viagem · está terceirizando a parte chata pra
            quem faz isso melhor que ninguém.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-foreground/75 leading-relaxed max-w-2xl">
            A gente desenha o roteiro, negocia preço, monta o pagamento que cabe no seu
            mês e fica do seu lado do briefing ao desembarque. Você só faz a mala.
            {destination ? ` Em ${destination}, isso vira diferença real entre uma viagem boa e uma viagem que você vai contar pra vida toda.` : ""}
          </p>

          <div className="grid grid-cols-3 gap-3 sm:gap-6 mt-6 pt-6 border-t border-border/60">
            {[
              { n: "+8 anos", l: "moldando viagens" },
              { n: "+2.400", l: "viajantes felizes" },
              { n: "4.9 ★", l: "avaliação média" },
            ].map((s, i) => (
              <motion.div
                key={s.l}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center sm:text-left"
              >
                <div className="font-serif text-2xl sm:text-3xl text-foreground tracking-tight">
                  {s.n}
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mt-0.5">
                  {s.l}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Card>

      {/* === DEPOIMENTOS · prova social · editorial mosaic === */}
      <section className="rounded-2xl bg-gradient-to-b from-amber-50/40 via-background to-background dark:from-amber-950/10 py-7 sm:py-10 -mx-2 sm:mx-0">
        <div className="flex flex-col items-center mb-6 sm:mb-10 text-center px-4">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 uppercase tracking-[0.18em] sm:tracking-[0.22em] text-[10px] font-semibold mb-2">
            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
            Quem já viajou conta
          </div>
          <h2 className="font-serif italic text-xl sm:text-4xl text-foreground leading-tight max-w-xl px-2">
            Memórias de quem viveu a experiência
          </h2>
        </div>

        {/* Mobile: carrossel horizontal com snap · Desktop: grid 3 col */}
        <div
          className="flex md:grid md:grid-cols-3 gap-4 sm:gap-7 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none scroll-smooth px-4 sm:px-4 pb-3 md:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollPaddingInline: "1rem" }}
        >
          {TESTIMONIALS.map((t, i) => (
            <motion.article
              key={t.name}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6 }}
              className="group relative bg-card border border-border/70 rounded-xl p-5 sm:p-7 flex flex-col shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-2xl hover:border-amber-500/40 transition-all duration-500 snap-center md:snap-align-none shrink-0 w-[85%] sm:w-[70%] md:w-auto"
            >
              {/* Badge "Viagem Real" sobreposto */}
              <span className="absolute -top-2.5 right-4 bg-foreground text-background text-[9px] uppercase tracking-[0.18em] font-semibold px-2.5 py-1 rounded-full border-2 border-background shadow-sm">
                Viagem real
              </span>

              {/* Marca d'água de aspas */}
              <Quote
                aria-hidden
                className="absolute top-4 left-4 w-9 h-9 text-amber-500/10 group-hover:text-amber-500/20 transition-colors"
              />

              <div className="flex gap-0.5 mb-4 relative">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                ))}
              </div>

              <p className="text-[14px] sm:text-[15px] leading-relaxed italic text-foreground/85 font-serif flex-grow">
                "{t.text}"
              </p>

              <div className="mt-5 sm:mt-7 pt-4 sm:pt-5 border-t border-border/60 flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-foreground font-semibold text-sm tabular-nums shrink-0">
                  {getInitials(t.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground text-sm truncate">{t.name}</p>
                  <div className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-500 font-medium mt-0.5">
                    <Plane className="w-3 h-3 -rotate-12 shrink-0" />
                    <span className="truncate">{t.trip}</span>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Indicador de swipe · só mobile */}
        <div className="md:hidden flex justify-center gap-1.5 mt-4">
          {TESTIMONIALS.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all ${i === 0 ? "w-6 bg-foreground/70" : "w-1.5 bg-foreground/20"}`}
            />
          ))}
        </div>
      </section>

      {/* === GARANTIA / RISK REVERSAL === */}
      <Card className="p-6 sm:p-8 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent">
        <div className="flex items-start gap-4">
          <motion.div
            animate={{ rotate: [0, -6, 6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0"
          >
            <ShieldCheck className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <h3 className="font-serif text-xl sm:text-2xl text-foreground leading-tight">
              Você só fecha quando estiver 100% confortável
            </h3>
            <p className="mt-2 text-sm text-foreground/75 leading-relaxed">
              A gente envia uma proposta detalhada, simula o pagamento que faz sentido
              pra você e só avança quando todas as suas dúvidas estiverem respondidas.
              Sem pressão, sem letra miúda · transparência do orçamento ao voucher.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
