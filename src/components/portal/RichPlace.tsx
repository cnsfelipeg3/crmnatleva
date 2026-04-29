import { useState, useRef, useEffect } from "react";
import { MapPin, Star, Loader2 } from "lucide-react";
import { useConciergePlace } from "@/hooks/useConciergePlace";
import { ConciergePlaceModal } from "./ConciergePlaceModal";
import { cn } from "@/lib/utils";

interface Props {
  name: string;
  city?: string;
  /** Heurística: só tenta resolver se o nome parecer "name-y". */
  tryResolve?: boolean;
}

const GENERIC_TERMS = new Set([
  "manhã", "tarde", "noite", "almoço", "jantar", "café", "lanche",
  "manha", "almoco", "cafe",
  "dia 1", "dia 2", "dia 3", "dia 4", "dia 5", "dia 6", "dia 7",
  "opção 1", "opção 2", "opção 3", "opcao 1", "opcao 2", "opcao 3",
  "sugestões", "sugestoes", "dica", "atenção", "atencao",
  "preço", "preco", "barato", "caro", "importante", "nota", "info",
  "domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado",
  "terca", "sabado",
  "obs", "resumo", "total",
]);

function isLikelyPlaceName(s: string): boolean {
  const trimmed = s.trim();
  if (trimmed.length < 2) return false;
  if (GENERIC_TERMS.has(trimmed.toLowerCase())) return false;
  if (trimmed.startsWith("(") && trimmed.endsWith(")")) return false;
  if (!/^[A-ZÀ-Ý]/.test(trimmed)) return false;
  // Skip pure numbers / dates
  if (/^\d+(\s|[:.\-/]).*$/.test(trimmed) === false && /^\d+$/.test(trimmed)) return false;
  return true;
}

export function RichPlace({ name, city, tryResolve = true }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement | HTMLButtonElement>(null);

  const shouldTry = tryResolve && isLikelyPlaceName(name);

  useEffect(() => {
    if (!shouldTry) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "100px" },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [shouldTry]);

  const { data: place, isFetching } = useConciergePlace(
    name,
    city,
    shouldTry && isVisible,
  );

  if (!shouldTry || !place || !place.resolved) {
    return (
      <span
        ref={ref as React.RefObject<HTMLSpanElement>}
        className="font-semibold text-foreground bg-accent/10 px-1 py-0.5 rounded-md"
      >
        {name}
        {isFetching && (
          <Loader2 className="inline-block w-3 h-3 ml-1 animate-spin text-muted-foreground" />
        )}
      </span>
    );
  }

  return (
    <>
      <button
        ref={ref as React.RefObject<HTMLButtonElement>}
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md",
          "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300",
          "border border-emerald-500/30 font-semibold transition-all hover:scale-[1.02]",
          "cursor-pointer align-baseline",
        )}
        title={`${place.name} · ${place.address}`}
      >
        <MapPin className="w-3 h-3" />
        <span>{name}</span>
        {place.rating !== null && place.rating >= 4 && (
          <span className="inline-flex items-center gap-0.5 text-[10px] opacity-80">
            <Star className="w-2.5 h-2.5 fill-current" />
            {place.rating.toFixed(1)}
          </span>
        )}
      </button>
      {open && <ConciergePlaceModal place={place} onClose={() => setOpen(false)} />}
    </>
  );
}
