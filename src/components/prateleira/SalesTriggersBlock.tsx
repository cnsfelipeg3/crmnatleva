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

      {/* === DEPOIMENTOS · prova social === */}
      <Card className="p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-5">
          <Heart className="w-4 h-4 text-rose-500" />
          <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-foreground/70">
            Quem já viajou conta
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="rounded-xl border border-border/60 bg-card p-4 relative"
            >
              <Quote className="absolute -top-2 -left-1 w-6 h-6 text-amber-400/40" />
              <div className="flex items-center gap-0.5 mb-2">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star
                    key={j}
                    className="w-3 h-3 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <p className="text-[13px] text-foreground/85 leading-relaxed">
                "{t.text}"
              </p>
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-1.5 text-[11px]">
                <span className="font-semibold text-foreground">{t.name}</span>
                <span className="text-muted-foreground">·</span>
                <Plane className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">{t.trip}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

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
