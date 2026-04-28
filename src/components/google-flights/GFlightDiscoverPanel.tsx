import { useState, useEffect } from "react";
import {
  Sparkles,
  Wand2,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Globe,
  Heart,
  Compass,
  PartyPopper,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useDiscoverDestinations,
  type DiscoveredDestination,
  type DiscoverResponse,
} from "@/hooks/useDiscoverDestinations";
import { GFlightDestinationCard } from "./GFlightDestinationCard";
import { AudioRecorder } from "./AudioRecorder";
import { formatBRL } from "./gflightsTypes";

interface Props {
  onSelectDestination: (dest: DiscoveredDestination, ctx: DiscoverResponse) => void;
}

// ────────────────────────────────────────────────────────────────
// OPÇÕES VISUAIS
// ────────────────────────────────────────────────────────────────

const ORIGEM_OPCOES = [
  { value: "GRU", label: "São Paulo" },
  { value: "GIG", label: "Rio" },
  { value: "BSB", label: "Brasília" },
  { value: "CNF", label: "BH" },
  { value: "POA", label: "Porto Alegre" },
  { value: "REC", label: "Recife" },
  { value: "FOR", label: "Fortaleza" },
  { value: "SSA", label: "Salvador" },
  { value: "CWB", label: "Curitiba" },
];

const MESES = [
  { value: 0, label: "Este mês" },
  { value: 1, label: "Mês que vem" },
  { value: 2, label: "Em 2 meses" },
  { value: 3, label: "Em 3 meses" },
  { value: 4, label: "Em 4 meses" },
  { value: 6, label: "Em 6 meses" },
  { value: 9, label: "Em 9 meses" },
  { value: 12, label: "Em 1 ano" },
];

const DURACOES = [
  { value: 3, label: "Fim de semana", icon: "🌅" },
  { value: 5, label: "5 dias", icon: "📆" },
  { value: 7, label: "1 semana", icon: "🗓️" },
  { value: 10, label: "10 dias", icon: "✈️" },
  { value: 15, label: "2 semanas", icon: "🌍" },
  { value: 21, label: "3 semanas", icon: "🏝️" },
  { value: 30, label: "1 mês", icon: "🌟" },
];

const PAX_OPCOES = [
  { value: 1, label: "Solo", icon: "🧍" },
  { value: 2, label: "Casal", icon: "💑" },
  { value: 3, label: "Trio", icon: "👨‍👩‍👧" },
  { value: 4, label: "Família", icon: "👨‍👩‍👧‍👦" },
  { value: 5, label: "Grupo", icon: "👥" },
];

const MOODS = [
  { value: "praia", label: "Praia", icon: "🏖️", color: "from-cyan-500/20 to-blue-500/20 border-cyan-500/40" },
  { value: "urbano", label: "Urbano", icon: "🌃", color: "from-violet-500/20 to-purple-500/20 border-violet-500/40" },
  { value: "romantico", label: "Romântico", icon: "💑", color: "from-rose-500/20 to-pink-500/20 border-rose-500/40" },
  { value: "familia", label: "Família", icon: "👨‍👩‍👧", color: "from-amber-500/20 to-orange-500/20 border-amber-500/40" },
  { value: "aventura", label: "Aventura", icon: "⛰️", color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/40" },
  { value: "cultura", label: "Cultura", icon: "🏛️", color: "from-stone-500/20 to-amber-500/20 border-stone-500/40" },
  { value: "gastronomia", label: "Gastronomia", icon: "🍷", color: "from-red-500/20 to-rose-500/20 border-red-500/40" },
  { value: "luxo", label: "Luxo", icon: "💎", color: "from-fuchsia-500/20 to-purple-500/20 border-fuchsia-500/40" },
  { value: "natureza", label: "Natureza", icon: "🌿", color: "from-green-500/20 to-emerald-500/20 border-green-500/40" },
];

const EXAMPLES = [
  { icon: "💑", text: "Tenho R$ 5.000, sou de São Paulo, quero 10 dias em outubro com a esposa, lugar com praia" },
  { icon: "👨‍👩‍👧‍👦", text: "R$ 8 mil, família de 4, quero levar as crianças em janeiro, destino familiar" },
  { icon: "🌅", text: "R$ 3 mil pra fim de semana romântico em julho, saindo do Rio" },
  { icon: "⛰️", text: "R$ 15 mil, aventura em setembro, 2 pessoas, gosto de natureza" },
];

const LOADING_DESTINATIONS = [
  "Buenos Aires", "Lisboa", "Cancún", "Paris", "Roma", "Dubai",
  "Tóquio", "Maceió", "Nova York", "Bali", "Atenas", "Madrid",
  "Santiago", "Cidade do Cabo", "Bangkok", "Marrakesh",
];

const MESES_LABEL_PROMPT = [
  "este mês", "no mês que vem", "daqui a 2 meses", "daqui a 3 meses",
  "daqui a 4 meses", "daqui a 5 meses", "daqui a 6 meses", "daqui a 7 meses",
  "daqui a 8 meses", "daqui a 9 meses", "daqui a 10 meses", "daqui a 11 meses",
  "daqui a 1 ano",
];

// ────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ────────────────────────────────────────────────────────────────

export function GFlightDiscoverPanel({ onSelectDestination }: Props) {
  const [origin, setOrigin] = useState("GRU");
  const [monthOffset, setMonthOffset] = useState(2);
  const [durationDays, setDurationDays] = useState(7);
  const [paxAdults, setPaxAdults] = useState(2);
  const [budget, setBudget] = useState(5000);
  const [moods, setMoods] = useState<string[]>([]);
  const [extraContext, setExtraContext] = useState("");
  const [loadingDestIdx, setLoadingDestIdx] = useState(0);

  const discoverMutation = useDiscoverDestinations();
  const data = discoverMutation.data;

  useEffect(() => {
    if (!discoverMutation.isPending) return;
    const interval = setInterval(() => {
      setLoadingDestIdx((i) => (i + 1) % LOADING_DESTINATIONS.length);
    }, 800);
    return () => clearInterval(interval);
  }, [discoverMutation.isPending]);

  function toggleMood(m: string) {
    setMoods((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]));
  }

  function buildNaturalQuery(extra?: string): string {
    const periodLabel = MESES_LABEL_PROMPT[monthOffset] || `daqui a ${monthOffset} meses`;
    const paxLabel =
      paxAdults === 1 ? "sozinho"
      : paxAdults === 2 ? "com meu companheiro(a)"
      : paxAdults === 3 ? "com 3 pessoas"
      : paxAdults === 4 ? "família de 4"
      : `${paxAdults} pessoas`;
    const moodLabel = moods.length > 0 ? `, gosto de ${moods.join(", ")}` : "";
    const extraStr = (extra ?? extraContext).trim();
    const extraTail = extraStr ? `. ${extraStr}` : "";
    return `Tenho R$ ${budget.toLocaleString("pt-BR")}, saio de ${origin}, quero viajar ${durationDays} dias ${periodLabel}, ${paxLabel}${moodLabel}${extraTail}`;
  }

  function handleSubmit(overrideExtra?: string) {
    discoverMutation.mutate({
      naturalQuery: buildNaturalQuery(overrideExtra),
      budget,
      origin,
      monthOffset,
      durationDays,
      paxAdults,
      mood: moods[0] || undefined,
    });
  }

  function handleAudioTranscribed(text: string) {
    setExtraContext(text);
    handleSubmit(text);
  }

  function applyExample(ex: string) {
    setExtraContext(ex);
    const m = ex.match(/R\$\s*([\d.,]+)/i);
    if (m) {
      const n = Number(m[1].replace(/\./g, "").replace(",", "."));
      if (!Number.isNaN(n) && n >= 500) setBudget(Math.min(50000, n * (n < 100 ? 1000 : 1)));
    }
  }

  // ─────────────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────────────
  if (discoverMutation.isPending) {
    return <DiscoveryLoadingState destination={LOADING_DESTINATIONS[loadingDestIdx]} />;
  }

  return (
    <div className="space-y-4">
      {/* HERO */}
      <Card className="relative overflow-hidden p-5 md:p-6 border-primary/20 bg-gradient-to-br from-primary/8 via-purple-500/5 to-amber-500/5">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex items-start gap-3">
          <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
            <Wand2 className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              Não sabe pra onde ir?
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              A gente descobre o destino perfeito pra você.
            </p>
          </div>
        </div>

        <p className="relative text-xs text-muted-foreground mt-3 max-w-2xl">
          Use os campos abaixo pra dizer o essencial. Em segundos a IA · busca de voos
          encontram destinos que cabem no seu orçamento, período e estilo.
        </p>
      </Card>

      {/* GRID 4 INPUTS PRINCIPAIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* ORIGEM */}
        <Card className="p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold mb-2 text-foreground/80">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            Saio de
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ORIGEM_OPCOES.map((o) => (
              <button
                key={o.value}
                onClick={() => setOrigin(o.value)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium border transition-all",
                  origin === o.value
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border hover:border-primary/40",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </Card>

        {/* QUANDO */}
        <Card className="p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold mb-2 text-foreground/80">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            Quando vou
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MESES.map((m) => (
              <button
                key={m.value}
                onClick={() => setMonthOffset(m.value)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium border transition-all",
                  monthOffset === m.value
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border hover:border-primary/40",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </Card>

        {/* DURAÇÃO */}
        <Card className="p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold mb-2 text-foreground/80">
            <Compass className="h-3.5 w-3.5 text-primary" />
            Por quanto tempo
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DURACOES.map((d) => (
              <button
                key={d.value}
                onClick={() => setDurationDays(d.value)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium border transition-all flex items-center gap-1",
                  durationDays === d.value
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border hover:border-primary/40",
                )}
              >
                <span>{d.icon}</span>
                {d.label}
              </button>
            ))}
          </div>
        </Card>

        {/* PAX */}
        <Card className="p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold mb-2 text-foreground/80">
            <Users className="h-3.5 w-3.5 text-primary" />
            Quem vai
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PAX_OPCOES.map((p) => (
              <button
                key={p.value}
                onClick={() => setPaxAdults(p.value)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium border transition-all flex items-center gap-1",
                  paxAdults === p.value
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border hover:border-primary/40",
                )}
              >
                <span>{p.icon}</span>
                {p.label}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* ORÇAMENTO — slider grande */}
      <Card className="p-4 bg-gradient-to-br from-amber-500/5 via-background to-background border-amber-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
            <DollarSign className="h-4 w-4 text-amber-600" />
            Meu orçamento por adulto · ida e volta
          </div>
          <div className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent tabular-nums">
            {formatBRL(budget)}
          </div>
        </div>
        <Slider
          min={500}
          max={50000}
          step={250}
          value={[budget]}
          onValueChange={(v) => setBudget(v[0])}
          className="my-2"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>R$ 500</span>
          <span>R$ 5k</span>
          <span>R$ 15k</span>
          <span>R$ 30k</span>
          <span>R$ 50k</span>
        </div>
      </Card>

      {/* MOOD — chips visuais com cor */}
      <Card className="p-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold mb-3 text-foreground/80">
          <Heart className="h-3.5 w-3.5 text-rose-500" />
          Estilo de viagem · opcional · pode escolher mais de um
        </div>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => {
            const active = moods.includes(m.value);
            return (
              <button
                key={m.value}
                onClick={() => toggleMood(m.value)}
                className={cn(
                  "px-3 py-2 rounded-lg text-xs font-medium border-2 transition-all flex items-center gap-1.5",
                  active
                    ? `bg-gradient-to-br ${m.color} shadow-md scale-[1.03]`
                    : "bg-card border-border hover:border-primary/40",
                )}
              >
                <span className="text-base leading-none">{m.icon}</span>
                {m.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* TEXTO LIVRE OPCIONAL + ÁUDIO */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Quer dar mais contexto? · opcional
          </div>
          <AudioRecorder
            onTranscribed={handleAudioTranscribed}
            disabled={discoverMutation.isPending}
          />
        </div>
        <Textarea
          placeholder="Ex: aniversário de 10 anos de casamento, queremos algo memorável… ou grave um áudio 🎙️"
          value={extraContext}
          onChange={(e) => setExtraContext(e.target.value)}
          className="min-h-[60px] text-sm bg-background"
          maxLength={300}
        />
        <div className="text-right text-[10px] text-muted-foreground mt-1">
          {extraContext.length}/300
        </div>
      </Card>

      {/* CTA GIGANTE */}
      <Button
        onClick={() => handleSubmit()}
        size="lg"
        className="w-full gap-2 h-14 text-base bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg shadow-primary/25"
      >
        <Sparkles className="h-5 w-5" />
        Descobrir destinos perfeitos pra mim
        <ArrowRight className="h-5 w-5" />
      </Button>

      {/* EXAMPLES */}
      <div>
        <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
          <PartyPopper className="h-3 w-3" /> Inspire-se com exemplos:
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => applyExample(ex.text)}
              className="text-left text-xs px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted/70 border border-border/40 hover:border-primary/30 transition-colors flex gap-2"
            >
              <span className="text-base shrink-0">{ex.icon}</span>
              <span className="text-muted-foreground line-clamp-2">{ex.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ERRO */}
      {discoverMutation.isError && (
        <Alert variant="destructive">
          <AlertDescription>{(discoverMutation.error as Error).message}</AlertDescription>
        </Alert>
      )}

      {/* RESULTADO */}
      {data?.success && data.results.length > 0 && (
        <DiscoveryResultsSection data={data} onSelectDestination={onSelectDestination} />
      )}

      {data?.success && data.results.length === 0 && (
        <Alert>
          <AlertDescription>
            Nenhum destino encontrado com esses critérios. Tente um orçamento maior, período diferente
            ou flexibilizar o estilo.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// LOADING
// ────────────────────────────────────────────────────────────────

function DiscoveryLoadingState({ destination }: { destination: string }) {
  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden p-10 md:p-12 text-center bg-gradient-to-br from-primary/5 via-purple-500/5 to-amber-500/5 border-primary/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="relative inline-block mb-6">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-xl shadow-primary/30">
            <Globe className="h-10 w-10 text-white animate-spin" style={{ animationDuration: "3s" }} />
          </div>
          <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-amber-500 animate-pulse" />
          <span className="absolute -bottom-1 -left-1 h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
        </div>
        <h3 className="relative text-base font-bold mb-1">Buscando seu destino perfeito…</h3>
        <p className="relative text-xs text-muted-foreground mb-1">
          Verificando preços em{" "}
          <span
            key={destination}
            className="font-semibold text-primary inline-block animate-fade-in"
          >
            {destination}
          </span>
          …
        </p>
        <p className="relative text-[10px] text-muted-foreground">
          A IA está consultando até 20 destinos em paralelo · pode levar até 30 segundos.
        </p>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// RESULTADOS
// ────────────────────────────────────────────────────────────────

function DiscoveryResultsSection({
  data,
  onSelectDestination,
}: {
  data: DiscoverResponse;
  onSelectDestination: (d: DiscoveredDestination, ctx: DiscoverResponse) => void;
}) {
  return (
    <div className="space-y-4 pt-4 border-t border-border/40">
      <Card className="p-4 bg-gradient-to-r from-emerald-500/5 to-primary/5 border-emerald-500/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-full bg-emerald-500 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
            Encontrei {data.results.length} destinos pra você
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          {data.extracted?.budget && (
            <div className="bg-background rounded p-2 border border-border/40">
              <div className="text-muted-foreground">💰 Orçamento</div>
              <div className="font-bold">{formatBRL(data.extracted.budget)}</div>
            </div>
          )}
          {data.extracted?.origin && (
            <div className="bg-background rounded p-2 border border-border/40">
              <div className="text-muted-foreground">✈️ De</div>
              <div className="font-bold">{data.extracted.origin}</div>
            </div>
          )}
          {data.period && (
            <div className="bg-background rounded p-2 border border-border/40">
              <div className="text-muted-foreground">📅 Período</div>
              <div className="font-bold">
                {String(data.period.month).padStart(2, "0")}/{data.period.year}
              </div>
            </div>
          )}
          {data.extracted?.durationDays && (
            <div className="bg-background rounded p-2 border border-border/40">
              <div className="text-muted-foreground">⏱️ Duração</div>
              <div className="font-bold">{data.extracted.durationDays} dias</div>
            </div>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/30">
          Buscamos em {data.totalCandidates} destinos · {data.totalWithFlights} com voos ·{" "}
          {data.totalFitsBudget} no orçamento
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.results.map((d, i) => (
          <GFlightDestinationCard
            key={d.iata}
            destination={d}
            isCheapest={i === 0}
            departureDate={data.period?.day1}
            returnDate={data.period?.returnDate}
            paxAdults={data.extracted?.paxAdults || 1}
            originIata={data.extracted?.origin || "GRU"}
            onSelectDestination={(dest) => onSelectDestination(dest, data)}
          />
        ))}
      </div>
    </div>
  );
}
