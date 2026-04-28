import { Loader2 } from "lucide-react";

interface Props {
  message?: string;
  size?: "sm" | "md" | "lg";
  inline?: boolean;
}

/**
 * LoadingState padronizado · spinner + mensagem opcional.
 * Modo inline (linha) ou bloco centralizado.
 */
export function LoadingState({ message, size = "md", inline = false }: Props) {
  const sizes = {
    sm: { icon: "h-4 w-4", padding: "py-2" },
    md: { icon: "h-6 w-6", padding: "py-6" },
    lg: { icon: "h-8 w-8", padding: "py-12" },
  } as const;
  const s = sizes[size];

  if (inline) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className={`${s.icon} animate-spin`} aria-hidden="true" />
        {message}
      </span>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center ${s.padding}`}
      role="status"
      aria-busy="true"
    >
      <Loader2 className={`${s.icon} animate-spin text-muted-foreground`} aria-hidden="true" />
      {message && <p className="text-sm text-muted-foreground mt-2">{message}</p>}
    </div>
  );
}

export default LoadingState;
