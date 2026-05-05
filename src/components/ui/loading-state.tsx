import { cn } from "@/lib/utils";

/**
 * Padronização de loading states.
 * - `inline`: pequeno, usado em botões/linhas
 * - `block`: centralizado vertical/horizontal no container pai (use com h-full)
 * - `fullscreen`: cobre toda a tela
 */
type LoadingVariant = "inline" | "block" | "fullscreen";
type LoadingSize = "sm" | "md" | "lg";

interface LoadingStateProps {
  variant?: LoadingVariant;
  size?: LoadingSize;
  label?: string;
  className?: string;
}

const SIZE_MAP: Record<LoadingSize, { dot: string; gap: string; label: string }> = {
  sm: { dot: "h-1.5 w-1.5", gap: "gap-1", label: "text-[11px]" },
  md: { dot: "h-2 w-2", gap: "gap-1.5", label: "text-xs" },
  lg: { dot: "h-2.5 w-2.5", gap: "gap-2", label: "text-sm" },
};

function Pulse({ size = "md" }: { size?: LoadingSize }) {
  const s = SIZE_MAP[size];
  return (
    <div className={cn("flex items-center", s.gap)} aria-hidden>
      <span className={cn("rounded-full bg-primary animate-loader-bounce", s.dot)} style={{ animationDelay: "0ms" }} />
      <span className={cn("rounded-full bg-primary animate-loader-bounce", s.dot)} style={{ animationDelay: "150ms" }} />
      <span className={cn("rounded-full bg-primary animate-loader-bounce", s.dot)} style={{ animationDelay: "300ms" }} />
    </div>
  );
}

export function LoadingState({ variant = "block", size = "md", label, className }: LoadingStateProps) {
  const content = (
    <div className={cn("flex flex-col items-center justify-center gap-2.5", className)} role="status" aria-live="polite">
      <Pulse size={size} />
      {label && <p className={cn("text-muted-foreground", SIZE_MAP[size].label)}>{label}</p>}
      <span className="sr-only">Carregando…</span>
    </div>
  );

  if (variant === "inline") return content;
  if (variant === "fullscreen") {
    return <div className="fixed inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-50">{content}</div>;
  }
  // block: ocupa todo o espaço disponível e centraliza
  return <div className="flex-1 min-h-[200px] w-full h-full flex items-center justify-center">{content}</div>;
}

export default LoadingState;
