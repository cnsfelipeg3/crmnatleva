import * as L from "leaflet";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Detecta se o módulo Leaflet (`L`) carregou corretamente.
 *
 * Casos onde retorna `false`:
 *  · módulo falhou no bundle (regressão como o erro de export default)
 *  · resolução para `undefined` em ESM/CJS interop
 *  · API mínima ausente (`L.map`, `L.tileLayer`)
 *
 * Use em todo componente que importa Leaflet · evita tela em branco silenciosa.
 */
export function isLeafletAvailable(): boolean {
  try {
    const mod = L as unknown as Record<string, unknown> | undefined | null;
    if (!mod || typeof mod !== "object") return false;
    if (typeof mod.map !== "function") return false;
    if (typeof mod.tileLayer !== "function") return false;
    if (typeof mod.marker !== "function") return false;
    return true;
  } catch {
    return false;
  }
}

interface LeafletUnavailableNoticeProps {
  /** Altura para casar com o slot do mapa · default h-64 */
  className?: string;
  /** Mensagem opcional contextual (ex: "Mapa de rotas indisponível") */
  title?: string;
}

/**
 * Fallback amigável quando Leaflet não está disponível · evita tela em branco
 * e oferece reload rápido. Usar dentro de cada componente de mapa.
 */
export function LeafletUnavailableNotice({
  className = "h-64",
  title = "Mapa indisponível no momento",
}: LeafletUnavailableNoticeProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center ${className}`}
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <AlertTriangle className="size-5" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          A biblioteca de mapas não carregou. Pode ser uma instabilidade temporária do bundle.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.location.reload()}
        className="gap-2"
      >
        <RefreshCw className="size-3.5" />
        Recarregar página
      </Button>
    </div>
  );
}
