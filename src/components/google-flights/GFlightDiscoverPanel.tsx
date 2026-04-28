import { useState, useEffect, useMemo, useRef } from "react";
import { Sparkles, Mic, MicOff, ArrowRight, X, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatBRL } from "./gflightsTypes";
import {
  useDiscoverDestinations,
  type DiscoveredDestination,
  type DiscoverResponse,
} from "@/hooks/useDiscoverDestinations";
import { GFlightDestinationCard } from "./GFlightDestinationCard";

interface Props {
  onSelectDestination: (dest: DiscoveredDestination, ctx: DiscoverResponse) => void;
}

// ────────────────────────────────────────────────────────────────
// EXTRAÇÃO LOCAL (instantânea, sem API)
// ────────────────────────────────────────────────────────────────

type LocalExtract = {
  budget: number | null;
  origin: { iata: string; label: string } | null;
  target: { type: "city" | "country" | "region"; label: string; flag?: string } | null;
  monthLabel: string | null;
  duration: string | null;
  pax: { count: number; label: string } | null;
  mood: string | null;
};

const ORIGEM_MAP: Array<{ iata: string; label: string; pat: RegExp }> = [
  { iata: "GRU", label: "São Paulo", pat: /\b(s(ão|ao)\s+paulo|sampa|\bsp\b|gru|guarulhos)\b/i },
  { iata: "GIG", label: "Rio de Janeiro", pat: /\b(rio(\s+de\s+janeiro)?|\brj\b|gig|sdu)\b/i },
  { iata: "BSB", label: "Brasília", pat: /\b(bras(í|i)lia|\bbsb\b|\bdf\b)\b/i },
  { iata: "CWB", label: "Curitiba", pat: /\b(curitiba|cwb)\b/i },
  { iata: "POA", label: "Porto Alegre", pat: /\b(porto\s+alegre|\bpoa\b)\b/i },
  { iata: "REC", label: "Recife", pat: /\b(recife|\brec\b)\b/i },
  { iata: "FOR", label: "Fortaleza", pat: /\b(fortaleza|for\b)\b/i },
  { iata: "SSA", label: "Salvador", pat: /\b(salvador|\bssa\b)\b/i },
  { iata: "CNF", label: "Belo Horizonte", pat: /\b(belo\s+horizonte|\bbh\b|cnf)\b/i },
];

const TARGET_COUNTRIES: Array<{ name: string; flag: string; pat: RegExp }> = [
  { name: "Itália", flag: "🇮🇹", pat: /\bit(á|a)lia\b/i },
  { name: "Portugal", flag: "🇵🇹", pat: /\bportugal\b/i },
  { name: "Espanha", flag: "🇪🇸", pat: /\bespanha\b/i },
  { name: "França", flag: "🇫🇷", pat: /\bfran(ç|c)a\b/i },
  { name: "Alemanha", flag: "🇩🇪", pat: /\balemanha\b/i },
  { name: "Inglaterra", flag: "🇬🇧", pat: /\b(inglaterra|reino\s+unido)\b/i },
  { name: "Grécia", flag: "🇬🇷", pat: /\bgr(é|e)cia\b/i },
  { name: "Suíça", flag: "🇨🇭", pat: /\bsu(í|i)(ç|c)a\b/i },
  { name: "Holanda", flag: "🇳🇱", pat: /\bholanda\b/i },
  { name: "Argentina", flag: "🇦🇷", pat: /\bargentina\b/i },
  { name: "Chile", flag: "🇨🇱", pat: /\bchile\b/i },
  { name: "Peru", flag: "🇵🇪", pat: /\bperu\b/i },
  { name: "Uruguai", flag: "🇺🇾", pat: /\burugu(ai|ay)\b/i },
  { name: "México", flag: "🇲🇽", pat: /\bm(é|e)xico\b/i },
  { name: "EUA", flag: "🇺🇸", pat: /\b(eua|estados\s+unidos|usa)\b/i },
  { name: "Japão", flag: "🇯🇵", pat: /\bjap(ã|a)o\b/i },
  { name: "Tailândia", flag: "🇹🇭", pat: /\btail(â|a)ndia\b/i },
  { name: "Indonésia", flag: "🇮🇩", pat: /\b(bali|indon(é|e)sia)\b/i },
  { name: "Emirados", flag: "🇦🇪", pat: /\b(dubai|emirados)\b/i },
  { name: "Marrocos", flag: "🇲🇦", pat: /\b(marrocos|marrakech)\b/i },
  { name: "Brasil", flag: "🇧🇷", pat: /\b(brasil|nordeste|maceió|fortaleza|recife|natal|salvador|gramado|noronha)\b/i },
];

const TARGET_CITIES: Array<{ name: string; flag: string; pat: RegExp }> = [
  { name: "Roma", flag: "🇮🇹", pat: /\broma\b/i },
  { name: "Veneza", flag: "🇮🇹", pat: /\bveneza\b/i },
  { name: "Milão", flag: "🇮🇹", pat: /\bmil(ã|a)o\b/i },
  { name: "Florença", flag: "🇮🇹", pat: /\bflorença\b/i },
  { name: "Lisboa", flag: "🇵🇹", pat: /\blisboa\b/i },
  { name: "Porto", flag: "🇵🇹", pat: /\bporto\b/i },
  { name: "Madri", flag: "🇪🇸", pat: /\bmadri(d)?\b/i },
  { name: "Barcelona", flag: "🇪🇸", pat: /\bbarcelona\b/i },
  { name: "Paris", flag: "🇫🇷", pat: /\bparis\b/i },
  { name: "Londres", flag: "🇬🇧", pat: /\blondres\b/i },
  { name: "Amsterdã", flag: "🇳🇱", pat: /\bamsterd(ã|a)m\b/i },
  { name: "Atenas", flag: "🇬🇷", pat: /\b(atenas|santorini)\b/i },
  { name: "Buenos Aires", flag: "🇦🇷", pat: /\bbuenos\s+aires\b/i },
  { name: "Cancún", flag: "🇲🇽", pat: /\bcanc(ú|u)n\b/i },
  { name: "Nova York", flag: "🇺🇸", pat: /\b(nova\s+york|new\s+york|ny)\b/i },
  { name: "Miami", flag: "🇺🇸", pat: /\bmiami\b/i },
  { name: "Tóquio", flag: "🇯🇵", pat: /\bt(ó|o)quio\b/i },
  { name: "Bangkok", flag: "🇹🇭", pat: /\bbangkok\b/i },
];

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function localExtract(s: string): LocalExtract {
  const lower = s.toLowerCase();

  let budget: number | null = null;
  const bm = lower.match(/(?:r\$\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)\s*(mil|k)?/);
  if (bm) {
    let n = Number(bm[1].replace(/\./g, "").replace(",", "."));
    if (bm[2] && /mil|k/.test(bm[2])) n *= 1000;
    if (n >= 500 && n <= 500000) budget = Math.round(n);
  }

  let origin: LocalExtract["origin"] = null;
  for (const o of ORIGEM_MAP) {
    if (o.pat.test(lower)) { origin = { iata: o.iata, label: o.label }; break; }
  }

  let target: LocalExtract["target"] = null;
  for (const c of TARGET_CITIES) {
    if (c.pat.test(lower)) { target = { type: "city", label: c.name, flag: c.flag }; break; }
  }
  if (!target) {
    for (const c of TARGET_COUNTRIES) {
      if (c.pat.test(lower)) { target = { type: "country", label: c.name, flag: c.flag }; break; }
    }
  }

  let monthLabel: string | null = null;
  for (const m of MESES) {
    if (new RegExp(`\\b${m}\\b`, "i").test(lower)) { monthLabel = m; break; }
  }

  let duration: string | null = null;
  const dm = lower.match(/(\d+)\s*(dias?|semanas?|meses?)/);
  if (dm) duration = `${dm[1]} ${dm[2]}`;
  else if (/fim\s+de\s+semana/.test(lower)) duration = "fim de semana";
  else if (/uma\s+semana/.test(lower)) duration = "1 semana";

  let pax: LocalExtract["pax"] = null;
  if (/\bsozinh[oa]\b/.test(lower)) pax = { count: 1, label: "sozinho" };
  else if (/\b(esposa|marido|namorad[oa]|casal|companheir[oa])\b/.test(lower))
    pax = { count: 2, label: "casal" };
  else if (/fam(í|i)lia\s+de\s+(\d+)/.test(lower)) {
    const fm = lower.match(/fam(?:í|i)lia\s+de\s+(\d+)/);
    if (fm) pax = { count: Number(fm[1]), label: `família de ${fm[1]}` };
  } else if (/\bfam(í|i)lia\b/.test(lower)) pax = { count: 4, label: "família" };
  else if (/(\d+)\s+(pessoas?|adultos?)/.test(lower)) {
    const pm = lower.match(/(\d+)\s+(pessoas?|adultos?)/);
    if (pm) pax = { count: Number(pm[1]), label: `${pm[1]} adultos` };
  }

  const MOODS: Record<string, RegExp> = {
    praia: /\b(praia|mar|litoral|beira-mar)\b/i,
    romantico: /\b(rom(â|a)ntic[oa]|lua\s+de\s+mel|anivers(á|a)rio\s+de\s+casamento)\b/i,
    familia: /\b(fam(í|i)lia|crianças?|filhos?)\b/i,
    aventura: /\b(aventura|trilha|montanha|escalada)\b/i,
    cultura: /\b(cultura|hist(ó|o)ri[ac]o?|museu)\b/i,
    gastronomia: /\b(gastronomia|comida|vinho|restaurantes?)\b/i,
    luxo: /\b(luxo|all-inclusive|resort|requintad[oa])\b/i,
    natureza: /\b(natureza|floresta|trilhas?)\b/i,
    urbano: /\b(urbano|cidade\s+grande|metr(ó|o)pole)\b/i,
  };
  let mood: string | null = null;
  for (const [name, pat] of Object.entries(MOODS)) {
    if (pat.test(lower)) { mood = name; break; }
  }

  return { budget, origin, target, monthLabel, duration, pax, mood };
}

// ────────────────────────────────────────────────────────────────
// STORIES SUGERIDAS
// ────────────────────────────────────────────────────────────────

const SUGGESTED_STORIES = [
  {
    icon: "💑",
    title: "Lua de mel romântica",
    text: "Casei mês passado, tenho R$ 18 mil, queremos uma lua de mel inesquecível em outubro, 12 dias, lugar com praia e jantar à beira-mar. Saímos de São Paulo.",
  },
  {
    icon: "🇮🇹",
    title: "Itália em família",
    text: "Tenho R$ 25 mil, sou de São Paulo, vai eu, minha esposa e dois filhos. Queremos passar 12 dias na Itália em julho, conhecer Roma, Veneza e Florença.",
  },
  {
    icon: "🌴",
    title: "Fim de semana romântico",
    text: "R$ 4 mil pra um fim de semana romântico em julho, saindo do Rio, pode ser nordeste ou caribe próximo, 4 dias.",
  },
  {
    icon: "⛰️",
    title: "Aventura solo",
    text: "R$ 12 mil, sozinho, quero aventura em setembro por 15 dias, montanhas, trilhas, gosto de natureza e adrenalina. Saio de Brasília.",
  },
];

// ────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ────────────────────────────────────────────────────────────────

export function GFlightDiscoverPanel({ onSelectDestination }: Props) {
  const [story, setStory] = useState("");
  const [recording, setRecording] = useState(false);
  const [extract, setExtract] = useState<LocalExtract | null>(null);
  const recognitionRef = useRef<any>(null);
  const discover = useDiscoverDestinations();
  const data = discover.data;

  // Live extract local (debounced 350ms)
  useEffect(() => {
    if (story.trim().length < 8) { setExtract(null); return; }
    const t = setTimeout(() => setExtract(localExtract(story)), 350);
    return () => clearTimeout(t);
  }, [story]);

  function toggleRecording() {
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      alert("Seu navegador não suporta gravação de áudio. Use Chrome ou Edge.");
      return;
    }
    const r = new SR();
    r.lang = "pt-BR";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (ev: any) => {
      const transcript = Array.from(ev.results)
        .map((res: any) => res[0].transcript).join(" ");
      setStory(transcript);
    };
    r.onend = () => setRecording(false);
    r.onerror = () => setRecording(false);
    r.start();
    recognitionRef.current = r;
    setRecording(true);
  }

  // ─── VALIDAÇÃO + NORMALIZAÇÃO DO STORY ──────────────────────────
  // Normaliza: trim, colapsa whitespace múltiplo, remove caracteres
  // de controle invisíveis. NÃO altera o que está no textarea (UX),
  // só calcula uma versão limpa pra validação.
  const normalizedStory = useMemo(() => {
    return story
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }, [story]);

  const wordCount = useMemo(
    () => (normalizedStory ? normalizedStory.split(/\s+/).filter(Boolean).length : 0),
    [normalizedStory],
  );

  // Detecção mínima de idioma latino · evita lixo (emojis puros, "asdf")
  const looksLatin = useMemo(() => {
    if (!normalizedStory) return false;
    const letters = normalizedStory.replace(/[^a-zA-ZáàâãéèêíïóôõöúüçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇÑ]/g, "");
    return letters.length >= 12;
  }, [normalizedStory]);

  // Motivo determinístico pelo qual o botão pode estar desabilitado
  const disabledReason = useMemo<string | null>(() => {
    if (discover.isPending) return "Buscando destinos…";
    if (normalizedStory.length === 0) return "Comece escrevendo sua história";
    if (normalizedStory.length < 20) return `Faltam ${20 - normalizedStory.length} caracteres pra começar`;
    if (wordCount < 4) return "Conta um pouco mais · pelo menos 4 palavras";
    if (!looksLatin) return "Texto não reconhecido · escreva em português";
    return null;
  }, [normalizedStory, wordCount, looksLatin, discover.isPending]);

  const ready = disabledReason === null;

  // Hints visuais do que ajudaria a melhorar o resultado
  const hints = useMemo(() => {
    if (!extract) return [] as string[];
    const h: string[] = [];
    if (!extract.budget) h.push("orçamento");
    if (!extract.target && !/europa|am(é|e)ricas|ásia|asia|caribe|oriente|áfrica|africa|nordeste|sul|sudeste/i.test(story))
      h.push("região ou país");
    if (!extract.monthLabel) h.push("quando");
    return h;
  }, [extract, story]);

  // ─── DEPURAÇÃO ──────────────────────────────────────────────────
  const lastReadyRef = useRef<{ ready: boolean; reason: string | null } | null>(null);
  useEffect(() => {
    const prev = lastReadyRef.current;
    if (!prev || prev.ready !== ready || prev.reason !== disabledReason) {
      // eslint-disable-next-line no-console
      console.debug("[Discover] ready=", ready, "reason=", disabledReason, {
        chars: normalizedStory.length,
        words: wordCount,
        looksLatin,
        isPending: discover.isPending,
        extract,
      });
      lastReadyRef.current = { ready, reason: disabledReason };
    }
  }, [ready, disabledReason, normalizedStory.length, wordCount, looksLatin, discover.isPending, extract]);

  function handleSubmit() {
    if (!ready) {
      // eslint-disable-next-line no-console
      console.warn("[Discover] submit bloqueado:", disabledReason);
      return;
    }
    discover.mutate({ naturalQuery: normalizedStory });
  }

  // ─── AUTO-RERUN ─────────────────────────────────────────────────
  // Se o usuário tentou submeter quando ainda não estava pronto, refaz
  // a busca automaticamente assim que o critério ficar válido.
  const wantsAutoSubmitRef = useRef(false);
  useEffect(() => {
    if (
      wantsAutoSubmitRef.current &&
      ready &&
      !discover.isPending &&
      !data?.success
    ) {
      wantsAutoSubmitRef.current = false;
      // eslint-disable-next-line no-console
      console.debug("[Discover] auto-rerun: critério atingido após edição");
      discover.mutate({ naturalQuery: normalizedStory });
    }
  }, [ready, discover.isPending, data?.success, normalizedStory, discover]);

  function handleSubmitClick() {
    if (!ready) {
      wantsAutoSubmitRef.current = true;
      // eslint-disable-next-line no-console
      console.warn("[Discover] aguardando critério ficar válido:", disabledReason);
      return;
    }
    handleSubmit();
  }

  if (discover.isPending) {
    return <CinematicLoading targetLabel={extract?.target?.label} />;
  }

  return (
    <div className="space-y-6">
      {/* HERO + CONVERSA */}
      {!data?.success && (
        <div className="space-y-5">
          <div className="text-center space-y-2 pt-2">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight"
                style={{ fontFamily: "Georgia, 'Playfair Display', serif" }}>
              Conta a sua história.
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              A gente escuta · e descobre o destino perfeito.
            </p>
          </div>

          {/* Textarea + botão de áudio */}
          <Card className="overflow-hidden border-border/60 shadow-sm">
            <div className="flex items-stretch">
              <textarea
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="Aniversário de 10 anos de casamento, queremos algo memorável e fora do óbvio..."
                className="flex-1 min-h-[140px] md:min-h-[180px] p-4 md:p-5 text-base md:text-lg leading-relaxed bg-transparent resize-none focus:outline-none placeholder:text-muted-foreground/50"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && ready) handleSubmit();
                }}
              />
              <button
                type="button"
                onClick={toggleRecording}
                className={cn(
                  "shrink-0 w-14 md:w-16 m-2 rounded-2xl flex items-center justify-center transition-all",
                  recording
                    ? "bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse"
                    : "bg-primary/10 text-primary hover:bg-primary/20",
                )}
                aria-label={recording ? "Parar gravação" : "Gravar áudio"}
              >
                {recording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </button>
            </div>
            <div className="flex justify-between items-center px-4 pb-2 text-[10px] text-muted-foreground">
              <span>{story.length} caracteres · ⌘+Enter pra enviar</span>
              {recording && <span className="text-red-500 font-medium animate-pulse">● Gravando…</span>}
            </div>
          </Card>

          {/* Live extract chips */}
          {extract && (
            <div className="flex flex-wrap gap-2 items-center justify-center pt-1">
              <span className="text-xs text-muted-foreground">Entendi:</span>
              {extract.target && <Chip>{extract.target.flag} {extract.target.label}</Chip>}
              {extract.origin && <Chip>✈️ saindo de {extract.origin.label}</Chip>}
              {extract.budget && (
                <Chip className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                  💰 {formatBRL(extract.budget)}
                </Chip>
              )}
              {extract.monthLabel && <Chip>📅 {extract.monthLabel}</Chip>}
              {extract.duration && <Chip>⏱️ {extract.duration}</Chip>}
              {extract.pax && <Chip>👥 {extract.pax.label}</Chip>}
              {extract.mood && <Chip>🎯 {extract.mood}</Chip>}
            </div>
          )}

          {/* CTA · SEMPRE visível. Quando bloqueado, mostra o motivo
               · clique mesmo bloqueado deixa "agendado" pra auto-rerun */}
          <div className="flex flex-col items-center gap-2 pt-2">
            <Button
              size="lg"
              onClick={handleSubmitClick}
              aria-disabled={!ready}
              data-ready={ready}
              data-reason={disabledReason ?? "ok"}
              title={disabledReason ?? "Pronto pra descobrir"}
              className={cn(
                "h-14 px-8 text-base shadow-xl gap-2 transition-all",
                ready
                  ? "bg-gradient-to-r from-primary via-purple-600 to-amber-500 hover:opacity-95 shadow-primary/25"
                  : "bg-muted text-muted-foreground hover:bg-muted shadow-none cursor-not-allowed",
              )}
            >
              <Sparkles className="h-5 w-5" />
              {discover.isPending
                ? "Buscando…"
                : ready
                ? "Descobrir destinos perfeitos"
                : (wantsAutoSubmitRef.current ? "Aguardando você completar…" : "Pesquisar")}
              {ready && !discover.isPending && <ArrowRight className="h-5 w-5" />}
            </Button>

            {/* Motivo do bloqueio · sempre visível quando há */}
            {!ready && disabledReason && (
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  ⚠️ {disabledReason}
                </span>
                {wantsAutoSubmitRef.current && (
                  <span className="text-[10px] text-muted-foreground italic">
                    A busca dispara sozinha quando você completar
                  </span>
                )}
              </div>
            )}

            {/* Hints opcionais quando já está pronto */}
            {ready && hints.length > 0 && (
              <p className="text-[11px] text-muted-foreground italic">
                Dica: você pode adicionar {hints.join(" · ")} pra refinar
              </p>
            )}

            {/* Telemetria mínima · só em dev */}
            {import.meta.env.DEV && (
              <code className="text-[9px] text-muted-foreground/60 font-mono">
                debug · chars:{normalizedStory.length} · words:{wordCount} · latin:{String(looksLatin)} · pending:{String(discover.isPending)}
              </code>
            )}
          </div>

          {/* Stories sugeridas */}
          <div className="pt-6 border-t border-border/40">
            <div className="text-center text-xs text-muted-foreground mb-3">
              Sem ideia? Pega uma história pra começar:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SUGGESTED_STORIES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setStory(s.text)}
                  className="text-left p-4 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl shrink-0 group-hover:scale-110 transition-transform">{s.icon}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm mb-1">{s.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{s.text}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ERRO */}
      {discover.isError && (
        <Alert variant="destructive">
          <AlertDescription>{(discover.error as Error).message}</AlertDescription>
        </Alert>
      )}

      {data && !data.success && (
        <Alert>
          <AlertDescription>
            {(data as any).message || "Não consegui descobrir destinos. Tente reformular sua história."}
            <Button size="sm" variant="link" className="ml-2 p-0 h-auto" onClick={() => discover.reset()}>
              Tentar de novo
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* RESULTADO */}
      {data?.success && data.results.length > 0 && (
        <ResultSection
          data={data}
          onSelectDestination={onSelectDestination}
          onReset={() => { discover.reset(); setStory(""); setExtract(null); }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// SUB: CHIP
// ────────────────────────────────────────────────────────────────

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border bg-card border-border/60",
      className,
    )}>
      {children}
    </span>
  );
}

// ────────────────────────────────────────────────────────────────
// SUB: LOADING CINEMATOGRÁFICO (typewriter)
// ────────────────────────────────────────────────────────────────

function CinematicLoading({ targetLabel }: { targetLabel?: string }) {
  const cities = useMemo(() => {
    if (targetLabel === "Itália") return ["Roma", "Milão", "Veneza", "Florença", "Nápoles"];
    if (targetLabel === "Portugal") return ["Lisboa", "Porto", "Sintra", "Algarve"];
    if (targetLabel === "Brasil") return ["Maceió", "Fortaleza", "Rio", "Foz do Iguaçu", "Gramado"];
    return ["Bali", "Lisboa", "Roma", "Cancún", "Dubai", "Tóquio", "Buenos Aires", "Paris"];
  }, [targetLabel]);

  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"typing" | "holding" | "erasing">("typing");

  useEffect(() => {
    const current = cities[idx % cities.length];
    let timer: any;
    if (phase === "typing") {
      if (typed.length < current.length) {
        timer = setTimeout(() => setTyped(current.slice(0, typed.length + 1)), 60);
      } else {
        timer = setTimeout(() => setPhase("holding"), 600);
      }
    } else if (phase === "holding") {
      timer = setTimeout(() => setPhase("erasing"), 800);
    } else {
      if (typed.length > 0) {
        timer = setTimeout(() => setTyped(typed.slice(0, -1)), 30);
      } else {
        setIdx((i) => i + 1);
        setPhase("typing");
      }
    }
    return () => clearTimeout(timer);
  }, [typed, phase, idx, cities]);

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-background via-primary/5 to-purple-500/5 p-12 md:p-16 text-center min-h-[400px] flex flex-col items-center justify-center">
      <div className="relative inline-block mb-8">
        <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center animate-pulse">
          <Globe2 className="h-12 w-12 text-white animate-spin" style={{ animationDuration: "4s" }} />
        </div>
        <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-amber-500 animate-pulse" />
      </div>

      <h3 className="text-xl md:text-2xl font-bold mb-2"
          style={{ fontFamily: "Georgia, 'Playfair Display', serif" }}>
        Procurando seu destino…
      </h3>

      <div className="text-base md:text-lg text-muted-foreground mb-1">
        Verificando voos pra{" "}
        <span className="font-semibold text-primary inline-block min-w-[120px] text-left">
          {typed}
          <span className="inline-block w-[2px] h-4 bg-primary ml-0.5 animate-pulse align-middle" />
        </span>
      </div>

      <p className="text-xs text-muted-foreground mt-3 max-w-md">
        A IA está consultando até 20 destinos em paralelo. Pode levar até 30 segundos.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-10 w-full max-w-3xl">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-56 w-full" />
        ))}
      </div>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────
// SUB: RESULTADO
// ────────────────────────────────────────────────────────────────

function ResultSection({
  data, onSelectDestination, onReset,
}: {
  data: DiscoverResponse;
  onSelectDestination: (d: DiscoveredDestination, ctx: DiscoverResponse) => void;
  onReset: () => void;
}) {
  const ext = data.extracted;
  const target =
    ext.cities?.length ? ext.cities.join(", ") :
    ext.countries?.length ? ext.countries.join(", ") :
    ext.regions?.length ? ext.regions.join(", ") :
    "vários destinos";

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <Card className="p-5 bg-gradient-to-br from-emerald-500/5 via-background to-primary/5 border-emerald-500/20">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-primary flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="text-base md:text-lg leading-relaxed"
                 style={{ fontFamily: "Georgia, 'Playfair Display', serif" }}>
              Encontrei <strong>{data.results.length} destinos</strong> que combinam com sua história em <strong>{target}</strong>.
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {ext.budget && <Chip>💰 {formatBRL(ext.budget)}</Chip>}
              {ext.origin && <Chip>✈️ {ext.origin}</Chip>}
              {data.period && (
                <Chip>📅 {String(data.period.month).padStart(2, "0")}/{data.period.year}</Chip>
              )}
              {ext.durationDays && <Chip>⏱️ {ext.durationDays} dias</Chip>}
              {ext.paxAdults && <Chip>👥 {ext.paxAdults} adulto{ext.paxAdults > 1 ? "s" : ""}</Chip>}
              {ext.mood && <Chip>🎯 {ext.mood}</Chip>}
            </div>
            <div className="text-[10px] text-muted-foreground pt-1">
              Buscamos em {data.totalCandidates} destinos · {data.totalWithFlights} retornaram preços · {data.totalFitsBudget} cabem no orçamento
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onReset} className="shrink-0">
            <X className="h-4 w-4 mr-1" /> Nova busca
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.results.map((d, i) => (
          <div
            key={d.iata}
            className="animate-in fade-in slide-in-from-bottom-2"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
          >
            <GFlightDestinationCard
              destination={d}
              isCheapest={i === 0}
              departureDate={data.period?.day1}
              returnDate={data.period?.returnDate}
              paxAdults={data.extracted?.paxAdults || 1}
              originIata={data.extracted?.origin || "GRU"}
              onSelectDestination={(dest) => onSelectDestination(dest, data)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
