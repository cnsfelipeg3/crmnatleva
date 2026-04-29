import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import {
  Lightbulb,
  AlertTriangle,
  Info,
  MapPin,
  Utensils,
  Sparkles,
  Clock,
  Wallet,
  Calendar,
  Plane,
  Hotel,
  Camera,
  Star,
  CheckCircle2,
} from "lucide-react";

/**
 * ConciergeAnswer
 * Renderização rica e elegante das respostas do Concierge.IA.
 * Não altera o conteúdo gerado pela IA — apenas melhora a apresentação.
 *
 * Recursos:
 * - Tipografia hierarquizada com ícones contextuais nos títulos
 * - Callouts automáticos (Dica:, Atenção:, Importante:)
 * - Listas como cards com borda lateral accent
 * - Separadores com gradiente
 * - Animação stagger por bloco
 */

interface Props {
  text: string;
  streaming?: boolean;
}

// Detecta o ícone mais adequado para um título (heading ou strong de seção)
function pickHeadingIcon(text: string) {
  const t = text.toLowerCase();
  if (/restaurante|gastronomia|comida|comer|prato|jantar|almoço|café|bar/.test(t)) return Utensils;
  if (/roteiro|dia \d|agenda|cronograma|programa/.test(t)) return Calendar;
  if (/dica|hack|truque|segredo|atalho/.test(t)) return Lightbulb;
  if (/atenção|cuidado|aviso|alerta|importante|evite|golpe/.test(t)) return AlertTriangle;
  if (/preço|custo|orçamento|barato|caro|valor|gasto/.test(t)) return Wallet;
  if (/hora|horário|quando|melhor época|período/.test(t)) return Clock;
  if (/voo|aéreo|aeroporto|companhia|airline/.test(t)) return Plane;
  if (/hotel|hospedagem|pousada|resort|onde ficar/.test(t)) return Hotel;
  if (/foto|imagem|registro|instagram|paisagem/.test(t)) return Camera;
  if (/imperdível|destaque|top|melhor|recomend|favorito/.test(t)) return Star;
  if (/local|lugar|bairro|região|onde|endereço/.test(t)) return MapPin;
  return Sparkles;
}

// Detecta tipo de callout em um parágrafo
function detectCallout(text: string):
  | { type: "tip" | "warning" | "info" | "success"; cleaned: string }
  | null {
  const trimmed = text.trim();
  const tipMatch = trimmed.match(/^(?:💡\s*)?(?:\*\*)?(?:dica|hack|truque|pro tip)(?:\*\*)?\s*[:!\-—]\s*(.+)/is);
  if (tipMatch) return { type: "tip", cleaned: tipMatch[1] };
  const warnMatch = trimmed.match(/^(?:⚠️\s*)?(?:\*\*)?(?:atenção|cuidado|aviso|importante|alerta)(?:\*\*)?\s*[:!\-—]\s*(.+)/is);
  if (warnMatch) return { type: "warning", cleaned: warnMatch[1] };
  const infoMatch = trimmed.match(/^(?:ℹ️\s*)?(?:\*\*)?(?:nota|observação|info|fyi)(?:\*\*)?\s*[:!\-—]\s*(.+)/is);
  if (infoMatch) return { type: "info", cleaned: infoMatch[1] };
  const okMatch = trimmed.match(/^(?:✅\s*)?(?:\*\*)?(?:confira|recomendado|certeza|garantido)(?:\*\*)?\s*[:!\-—]\s*(.+)/is);
  if (okMatch) return { type: "success", cleaned: okMatch[1] };
  return null;
}

const calloutStyles = {
  tip: {
    bg: "bg-amber-500/8 dark:bg-amber-400/10",
    border: "border-l-amber-500/60",
    icon: Lightbulb,
    iconColor: "text-amber-600 dark:text-amber-400",
    label: "Dica",
    labelColor: "text-amber-700 dark:text-amber-300",
  },
  warning: {
    bg: "bg-orange-500/8 dark:bg-orange-400/10",
    border: "border-l-orange-500/60",
    icon: AlertTriangle,
    iconColor: "text-orange-600 dark:text-orange-400",
    label: "Atenção",
    labelColor: "text-orange-700 dark:text-orange-300",
  },
  info: {
    bg: "bg-sky-500/8 dark:bg-sky-400/10",
    border: "border-l-sky-500/60",
    icon: Info,
    iconColor: "text-sky-600 dark:text-sky-400",
    label: "Nota",
    labelColor: "text-sky-700 dark:text-sky-300",
  },
  success: {
    bg: "bg-emerald-500/8 dark:bg-emerald-400/10",
    border: "border-l-emerald-500/60",
    icon: CheckCircle2,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    label: "Confirmado",
    labelColor: "text-emerald-700 dark:text-emerald-300",
  },
} as const;

function Callout({ type, children }: { type: keyof typeof calloutStyles; children: React.ReactNode }) {
  const s = calloutStyles[type];
  const Icon = s.icon;
  return (
    <div className={`my-3 rounded-xl border-l-[3px] ${s.border} ${s.bg} px-3.5 py-2.5 not-prose`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${s.iconColor}`} />
        <span className={`text-[10px] font-bold uppercase tracking-wider ${s.labelColor}`}>{s.label}</span>
      </div>
      <div className="text-sm text-foreground/90 leading-relaxed">{children}</div>
    </div>
  );
}

function HeadingWithIcon({
  level,
  children,
  raw,
}: {
  level: 1 | 2 | 3;
  children: React.ReactNode;
  raw: string;
}) {
  const Icon = pickHeadingIcon(raw);
  const sizes = {
    1: "text-[17px] font-bold",
    2: "text-[15px] font-bold",
    3: "text-[14px] font-semibold",
  } as const;
  return (
    <div className="flex items-center gap-2 mt-4 mb-2 first:mt-1 not-prose">
      <div className="flex items-center justify-center w-6 h-6 rounded-md bg-accent/10 text-accent shrink-0">
        <Icon className="w-3.5 h-3.5" />
      </div>
      <h3 className={`${sizes[level]} text-foreground leading-tight tracking-tight m-0`}>{children}</h3>
      <div className="flex-1 h-px bg-gradient-to-r from-border/50 to-transparent" />
    </div>
  );
}

function flattenChildren(node: any): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(flattenChildren).join("");
  if (node && typeof node === "object" && "props" in node) return flattenChildren(node.props.children);
  return "";
}

export const ConciergeAnswer = memo(function ConciergeAnswer({ text, streaming }: Props) {
  // Pré-processamento: separa o texto em "blocos" lógicos (parágrafos, separados por dupla quebra)
  // para podermos animar com stagger e detectar callouts antes de passar pro markdown.
  const blocks = useMemo(() => {
    if (!text) return [] as string[];
    // Normaliza quebras
    const normalized = text.replace(/\r\n/g, "\n").trim();
    // Divide em blocos por linhas em branco, preservando listas e código
    const raw = normalized.split(/\n{2,}/);
    return raw.filter((b) => b.trim().length > 0);
  }, [text]);

  return (
    <div className="space-y-1">
      {blocks.map((block, idx) => {
        // Tenta detectar se o bloco inteiro é um callout
        const callout = detectCallout(block);

        return (
          <motion.div
            key={idx}
            initial={streaming && idx === blocks.length - 1 ? { opacity: 0, y: 4 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {callout ? (
              <Callout type={callout.type}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <span>{children}</span>,
                    strong: ({ children }) => (
                      <strong className="font-semibold text-foreground">{children}</strong>
                    ),
                  }}
                >
                  {callout.cleaned}
                </ReactMarkdown>
              </Callout>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <HeadingWithIcon level={1} raw={flattenChildren(children)}>
                      {children}
                    </HeadingWithIcon>
                  ),
                  h2: ({ children }) => (
                    <HeadingWithIcon level={2} raw={flattenChildren(children)}>
                      {children}
                    </HeadingWithIcon>
                  ),
                  h3: ({ children }) => (
                    <HeadingWithIcon level={3} raw={flattenChildren(children)}>
                      {children}
                    </HeadingWithIcon>
                  ),
                  h4: ({ children }) => (
                    <HeadingWithIcon level={3} raw={flattenChildren(children)}>
                      {children}
                    </HeadingWithIcon>
                  ),
                  p: ({ children }) => (
                    <p className="text-sm leading-[1.65] text-foreground/90 my-2 first:mt-0 last:mb-0">
                      {children}
                    </p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground bg-accent/10 px-1 py-0.5 rounded-md decoration-accent/40">
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => <em className="italic text-foreground/85">{children}</em>,
                  ul: ({ children }) => (
                    <ul className="my-2 space-y-1.5 not-prose list-none pl-0">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="my-2 space-y-1.5 not-prose list-none pl-0 counter-reset-[step]">
                      {children}
                    </ol>
                  ),
                  li: ({ children, ...props }) => {
                    // Detecta se está dentro de ordered list pelo parent (heurística simples via counter)
                    const isOrdered = (props as any).node?.position && false; // fallback
                    return (
                      <li className="group flex gap-2.5 items-start text-sm leading-[1.6] text-foreground/90 pl-3 border-l-2 border-accent/25 hover:border-accent/60 transition-colors py-0.5">
                        <span className="flex-1 min-w-0">{children}</span>
                      </li>
                    );
                  },
                  blockquote: ({ children }) => (
                    <Callout type="info">{children}</Callout>
                  ),
                  hr: () => (
                    <div className="my-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-accent/10 text-accent hover:bg-accent/20 text-[13px] font-medium no-underline transition-colors"
                    >
                      {children}
                    </a>
                  ),
                  code: ({ children, className }) => {
                    const isInline = !className?.includes("language-");
                    if (isInline) {
                      return (
                        <code className="px-1.5 py-0.5 rounded-md bg-muted text-foreground text-[12.5px] font-mono">
                          {children}
                        </code>
                      );
                    }
                    return (
                      <pre className="my-2 p-3 rounded-xl bg-muted/80 overflow-x-auto text-[12.5px] not-prose">
                        <code className="font-mono text-foreground">{children}</code>
                      </pre>
                    );
                  },
                  table: ({ children }) => (
                    <div className="my-3 overflow-x-auto rounded-xl border border-border/40 not-prose">
                      <table className="w-full text-xs">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="px-3 py-2 text-left font-semibold bg-muted/60 text-foreground border-b border-border/40">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-3 py-2 text-foreground/85 border-b border-border/20 last:border-0">
                      {children}
                    </td>
                  ),
                }}
              >
                {block}
              </ReactMarkdown>
            )}
          </motion.div>
        );
      })}
      {streaming && (
        <span
          className="inline-block w-1.5 h-3.5 ml-0.5 bg-accent rounded-sm align-text-bottom animate-pulse"
          aria-hidden
        />
      )}
    </div>
  );
});

export default ConciergeAnswer;
