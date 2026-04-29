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
  "manhã", "tarde", "noite", "manha",
  "almoço", "jantar", "café", "lanche", "almoco", "cafe", "brunch", "ceia",
  "manhã (café e pastel)", "tarde (ginjinha)",
  "dia", "dia 1", "dia 2", "dia 3", "dia 4", "dia 5", "dia 6", "dia 7",
  "opção", "opção 1", "opção 2", "opção 3", "opcao", "opcao 1", "opcao 2", "opcao 3",
  "sugestão", "sugestões", "sugestao", "sugestoes", "dica", "dicas",
  "atenção", "atencao", "alerta", "aviso",
  "preço", "preco", "barato", "caro", "valor", "custo",
  "importante", "nota", "info", "observação", "observacao",
  "domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado",
  "terca", "sabado",
  "obs", "resumo", "total", "subtotal",
  "essencial", "moderno", "tradicional", "clássico", "classico",
  "manhã", "tarde", "noite",
  "centro", "norte", "sul", "leste", "oeste",
  "hotel", "restaurante", "bar", "cafeteria", "padaria",
]);

const STAGE_PREFIX_RE = /^(manhã|manha|tarde|noite|almoço|almoco|jantar|café|cafe|lanche|brunch|ceia|dia\s*\d+|opção\s*\d+|opcao\s*\d+)\s*[:\-–—]\s*/i;
const PARENTHETICAL_RE = /^([^()]+?)\s*\(([^()]+)\)\s*$/;
const ARTICLE_PREFIX_RE = /^(a|o|as|os|um|uma|uns|umas|d['oa]|de|da|do|das|dos)\s+/i;

/**
 * Extrai o nome "limpo" de um lugar a partir de um trecho em **bold**.
 * - Remove prefixos de etapa: "Manhã (Café): X" → "X"
 * - Para "Mercado da Ribeira (Time Out Market)", retorna ambos pra teste.
 */
function extractCandidates(s: string): string[] {
  const trimmed = s.trim().replace(/[*]/g, "");
  if (!trimmed) return [];

  // "Almoço (Time Out Market):" — descarta a label, fica com o miolo
  const labelMatch = trimmed.match(/^[^:]+:\s*(.+)$/);
  const noLabel = labelMatch ? labelMatch[1] : trimmed;

  // Remove prefixo tipo "Manhã (Café e Pastel): "
  const noStage = noLabel.replace(STAGE_PREFIX_RE, "").trim();

  const candidates: string[] = [];

  // "Mercado da Ribeira (Time Out Market)" → ambos
  const paren = noStage.match(PARENTHETICAL_RE);
  if (paren) {
    candidates.push(paren[1].trim());
    candidates.push(paren[2].trim());
  } else {
    candidates.push(noStage);
  }

  return candidates.filter(Boolean);
}

function isLikelyPlaceName(s: string): boolean {
  const trimmed = s.trim();
  if (trimmed.length < 3) return false;
  if (trimmed.length > 80) return false;

  const lower = trimmed.toLowerCase();
  if (GENERIC_TERMS.has(lower)) return false;

  // Apenas etapas tipo "Manhã (Café e Pastel)" sem nada depois → genérico
  if (STAGE_PREFIX_RE.test(trimmed) && trimmed.replace(STAGE_PREFIX_RE, "").trim().length === 0) {
    return false;
  }

  // Dia/Opção/Etapa puros
  if (/^(dia|opção|opcao|etapa|parte|fase)\s*\d+/i.test(trimmed)) return false;

  // Só números/datas
  if (/^\d+([\s:.\-/]\d+)*$/.test(trimmed)) return false;

  // Símbolos de preço puros: €€€, $$$
  if (/^[€$£¥₽]+$/.test(trimmed)) return false;

  // Tem que começar com maiúscula (nome próprio) OU artigo + maiúscula ("A Ginjinha", "O Trevo")
  const withoutArticle = trimmed.replace(ARTICLE_PREFIX_RE, "");
  if (!/^[A-ZÀ-Ý]/.test(withoutArticle)) return false;

  // Pelo menos 1 letra
  if (!/[A-Za-zÀ-ÿ]/.test(trimmed)) return false;

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
