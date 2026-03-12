import { motion } from "framer-motion";
import { AlertTriangle, Globe2, MapPin, Maximize2, Minimize2, Satellite } from "lucide-react";
import type { GlobeStatus } from "./travelGlobe.types";

function GlobeFallback({
  status,
  missingKeys,
  errorMessage,
}: {
  status: GlobeStatus;
  missingKeys: string[];
  errorMessage?: string | null;
}) {
  const isConfigIssue = status.startsWith("missing");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/95"
    >
      <div className="text-center max-w-md px-6">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-border/40 bg-muted"
        >
          {isConfigIssue ? (
            <AlertTriangle className="h-9 w-9 text-warning" />
          ) : (
            <Globe2 className="h-9 w-9 text-primary" />
          )}
        </motion.div>

        <h3 className="mb-2 text-lg font-bold tracking-tight text-foreground">
          {isConfigIssue ? "Configuração pendente" : "Globo indisponível"}
        </h3>

        {isConfigIssue && (
          <div className="mt-4 space-y-2">
            {missingKeys.map((key) => (
              <div key={key} className="flex items-center justify-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-warning" />
                <code className="rounded-md bg-muted px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
                  {key}
                </code>
              </div>
            ))}
            <p className="mt-3 text-xs text-muted-foreground">
              Configure as variáveis para ativar o Google Photorealistic 3D Tiles.
            </p>
          </div>
        )}

        {!isConfigIssue && (
          <p className="mt-3 text-xs text-muted-foreground">
            {errorMessage || "Não foi possível carregar o tileset fotorealista. Verifique as chaves e permissões da Map Tiles API."}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function GlobeLoading() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/95"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        className="mb-6 h-16 w-16 rounded-full border-2 border-primary/20 border-t-primary"
      />
      <div className="flex items-center gap-2">
        <Satellite className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Carregando Google Photorealistic 3D Tiles...
        </span>
      </div>
    </motion.div>
  );
}

function GlobeHud({
  waypointCount,
  isFullscreen,
  onToggleFullscreen,
}: {
  waypointCount: number;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-border/40 bg-background/80 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground backdrop-blur-xl"
      >
        <Satellite className="h-3.5 w-3.5 text-primary" />
        Globe 3D — Photorealistic
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
        className="absolute right-14 top-4 z-10 flex items-center gap-1.5 rounded-full border border-border/40 bg-background/80 px-3 py-2 font-mono text-[10px] text-muted-foreground backdrop-blur-xl"
      >
        <MapPin className="h-3 w-3 text-primary" />
        {waypointCount} destinos
      </motion.div>

      <button
        onClick={onToggleFullscreen}
        className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border/40 bg-background/80 text-muted-foreground transition-colors hover:text-foreground"
        aria-label={isFullscreen ? "Sair da tela cheia" : "Entrar em tela cheia"}
      >
        {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
      </button>
    </>
  );
}

export { GlobeFallback, GlobeHud, GlobeLoading };
