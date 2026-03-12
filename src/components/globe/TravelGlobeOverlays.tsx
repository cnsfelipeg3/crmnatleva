/**
 * TravelGlobe Overlays — Premium UI panels, HUD, fallbacks.
 * Editorial design, mobile-first bottom sheet, journey intelligence.
 */
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, Globe2, MapPin, Maximize2, Minimize2, Satellite,
  Plane, X, Navigation, Ruler, Compass, Play, ChevronDown,
} from "lucide-react";
import type { GlobeStatus, SelectedRouteInfo } from "./travelGlobe.types";

/* ═══ Utility ═══ */
const fmtKm = (km: number) => km.toLocaleString("pt-BR");

const computeDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

const TYPE_LABELS: Record<string, string> = {
  origin: "Origem",
  connection: "Conexão",
  destination: "Destino",
  hotel: "Hospedagem",
  experience: "Experiência",
  poi: "Ponto de Interesse",
};

const STATUS_CONFIG: Record<string, { label: string; class: string; dot: string }> = {
  past:     { label: "Concluído",      class: "border-muted-foreground/20 bg-muted/30 text-muted-foreground", dot: "bg-muted-foreground/50" },
  active:   { label: "Em andamento",   class: "border-primary/30 bg-primary/10 text-primary", dot: "bg-primary" },
  upcoming: { label: "Próximo trecho", class: "border-blue-400/30 bg-blue-500/10 text-blue-400", dot: "bg-blue-400" },
};

/* ═══ Fallback ═══ */
function GlobeFallback({
  status, missingKeys, errorMessage,
}: {
  status: GlobeStatus; missingKeys: string[]; errorMessage?: string | null;
}) {
  const isConfig = status.startsWith("missing");
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center"
      style={{ background: "linear-gradient(135deg, hsl(220 30% 4%), hsl(220 20% 8%))" }}
    >
      <div className="text-center max-w-sm px-6">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/20 bg-muted/20">
          {isConfig ? <AlertTriangle className="h-7 w-7 text-muted-foreground" /> : <Globe2 className="h-7 w-7 text-muted-foreground" />}
        </div>
        <h3 className="mb-2 text-base font-semibold text-foreground/90">
          {isConfig ? "Configuração necessária" : "Globo indisponível"}
        </h3>
        {isConfig ? (
          <div className="mt-3 space-y-1.5">
            {missingKeys.map((k) => (
              <code key={k} className="block rounded bg-muted/30 px-3 py-1.5 font-mono text-[11px] text-muted-foreground">{k}</code>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{errorMessage || "Falha ao carregar o tileset."}</p>
        )}
      </div>
    </motion.div>
  );
}

/* ═══ Loading ═══ */
function GlobeLoading() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center"
      style={{ background: "linear-gradient(135deg, hsl(220 30% 4%), hsl(220 20% 8%))" }}
    >
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="mb-6 h-12 w-12 rounded-full border border-primary/20 border-t-primary"
      />
      <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        Carregando globo 3D
      </span>
    </motion.div>
  );
}

/* ═══ HUD ═══ */
function GlobeHud({
  waypointCount, isFullscreen, onToggleFullscreen, currentLocation,
}: {
  waypointCount: number; isFullscreen: boolean; onToggleFullscreen: () => void; currentLocation?: string | null;
}) {
  return (
    <>
      {/* Top-left badge */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-lg border border-border/20 bg-background/60 px-3 py-1.5 backdrop-blur-xl sm:left-4 sm:top-4"
      >
        <Satellite className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-foreground/80">Journey Globe</span>
      </motion.div>

      {/* Current location indicator */}
      {currentLocation && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
          className="absolute left-3 top-12 z-10 flex items-center gap-1.5 rounded-lg border border-primary/15 bg-primary/[0.06] px-3 py-1.5 backdrop-blur-xl sm:left-4 sm:top-14"
        >
          <div className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </div>
          <span className="text-[10px] font-semibold text-primary">{currentLocation}</span>
        </motion.div>
      )}

      {/* Top-right controls */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
        className="absolute right-3 top-3 z-10 flex items-center gap-1.5 sm:right-4 sm:top-4"
      >
        <div className="flex items-center gap-1.5 rounded-lg border border-border/20 bg-background/60 px-3 py-1.5 backdrop-blur-xl">
          <MapPin className="h-3 w-3 text-primary/70" />
          <span className="font-mono text-[10px] text-muted-foreground">{waypointCount}</span>
        </div>
        <button onClick={onToggleFullscreen}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/20 bg-background/60 text-muted-foreground backdrop-blur-xl transition-colors hover:text-foreground"
        >
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </motion.div>
    </>
  );
}

/* ═══ Premium Route Detail Panel ═══ */
function RouteInfoPanel({
  info, onClose, onAnimate, isMobile,
}: {
  info: SelectedRouteInfo; onClose: () => void; onAnimate: () => void; isMobile: boolean;
}) {
  const { route, allRoutes, currentLocationId } = info;
  const statusCfg = STATUS_CONFIG[route.status] || STATUS_CONFIG.upcoming;
  const dist = computeDistanceKm(route.from.lat, route.from.lng, route.to.lat, route.to.lng);

  // Journey position
  const routeIdx = allRoutes.findIndex(
    (r) => r.from.id === route.from.id && r.to.id === route.to.id
  );
  const journeyLabel = routeIdx >= 0
    ? `Trecho ${routeIdx + 1} de ${allRoutes.length}`
    : "Trecho da jornada";

  const panelContent = (
    <>
      {/* Close */}
      <button onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-lg border border-border/20 bg-muted/20 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${statusCfg.class}`}>
          <div className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
          {statusCfg.label}
        </div>
        <span className="text-[10px] text-muted-foreground/50">{journeyLabel}</span>
      </div>

      {/* Route visual */}
      <div className="mb-5 flex items-center gap-4">
        {/* Origin */}
        <div className="flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1">
            {TYPE_LABELS[route.from.type] || "Origem"}
          </p>
          <p className="text-lg font-bold tracking-tight text-foreground leading-tight">
            {route.from.id.toUpperCase()}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {route.from.label.replace(/ \(.+\)/, "")}
          </p>
          {currentLocationId === route.from.id && (
            <div className="mt-1 flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[9px] font-semibold text-primary">Posição atual</span>
            </div>
          )}
        </div>

        {/* Connector */}
        <div className="flex flex-col items-center gap-1 px-2">
          <div className="flex items-center gap-1 rounded-full border border-border/20 bg-muted/15 px-3 py-1.5">
            <Plane className="h-3.5 w-3.5 text-foreground/50 -rotate-45" />
          </div>
          <div className="h-px w-10 bg-gradient-to-r from-transparent via-border/30 to-transparent" />
          <span className="text-[9px] font-mono text-muted-foreground/40">
            {fmtKm(dist)} km
          </span>
        </div>

        {/* Destination */}
        <div className="flex-1 text-right">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1">
            {TYPE_LABELS[route.to.type] || "Destino"}
          </p>
          <p className="text-lg font-bold tracking-tight text-foreground leading-tight">
            {route.to.id.toUpperCase()}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {route.to.label.replace(/ \(.+\)/, "")}
          </p>
          {currentLocationId === route.to.id && (
            <div className="mt-1 flex items-center gap-1 justify-end">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[9px] font-semibold text-primary">Posição atual</span>
            </div>
          )}
        </div>
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border/15 bg-border/10">
        <MetricCell icon={<Ruler className="h-3.5 w-3.5" />} label="Distância" value={`${fmtKm(dist)} km`} />
        <MetricCell icon={<Compass className="h-3.5 w-3.5" />} label="Lat/Lng" value={`${route.to.lat.toFixed(1)}° / ${route.to.lng.toFixed(1)}°`} />
        <MetricCell icon={<Navigation className="h-3.5 w-3.5" />} label="Tipo" value="Aéreo" />
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <button onClick={onAnimate}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/[0.06] px-4 py-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          <Play className="h-3.5 w-3.5" />
          Animar trecho
        </button>
      </div>
    </>
  );

  // Mobile: bottom sheet
  if (isMobile) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute inset-x-0 bottom-0 z-20 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-border/20 bg-background/95 p-5 pb-8 shadow-2xl backdrop-blur-2xl"
        >
          {/* Drag handle */}
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border/30" />
          {panelContent}
        </motion.div>
      </AnimatePresence>
    );
  }

  // Desktop: floating panel
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="absolute bottom-5 left-1/2 z-20 w-[460px] -translate-x-1/2 rounded-xl border border-border/20 bg-background/90 p-5 shadow-2xl backdrop-blur-2xl"
      >
        {panelContent}
      </motion.div>
    </AnimatePresence>
  );
}

function MetricCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 bg-background/40 px-3 py-3">
      <span className="text-muted-foreground/40">{icon}</span>
      <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/50">{label}</span>
      <span className="text-[11px] font-semibold tabular-nums text-foreground/80">{value}</span>
    </div>
  );
}

/* ═══ Search Result Detail Panel ═══ */
function SearchResultPanel({
  result, onClose, onRecenter, isMobile,
}: {
  result: { name: string; address: string; category: string; lat: number; lng: number };
  onClose: () => void;
  onRecenter: () => void;
  isMobile: boolean;
}) {
  const content = (
    <>
      <button onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-lg border border-border/20 bg-muted/20 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/15 bg-rose-500/10">
          <MapPin className="h-4 w-4 text-rose-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">{result.name}</p>
          <p className="text-[11px] text-muted-foreground/60">{result.category}</p>
        </div>
      </div>

      {/* Address */}
      <div className="mb-4 rounded-lg border border-border/10 bg-muted/10 px-3.5 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50 mb-1">Endereço</p>
        <p className="text-xs text-foreground/80">{result.address}</p>
      </div>

      {/* Coordinates */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border/15 bg-border/10">
        <MetricCell icon={<Compass className="h-3.5 w-3.5" />} label="Latitude" value={result.lat.toFixed(4) + "°"} />
        <MetricCell icon={<Compass className="h-3.5 w-3.5" />} label="Longitude" value={result.lng.toFixed(4) + "°"} />
      </div>

      {/* Action */}
      <div className="mt-4">
        <button onClick={onRecenter}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/[0.06] px-4 py-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          <Navigation className="h-3.5 w-3.5" />
          Centralizar no globo
        </button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute inset-x-0 bottom-0 z-20 max-h-[60vh] overflow-y-auto rounded-t-2xl border-t border-border/20 bg-background/95 p-5 pb-8 shadow-2xl backdrop-blur-2xl"
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border/30" />
          {content}
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="absolute right-4 top-14 z-20 w-[320px] rounded-xl border border-border/20 bg-background/90 p-5 shadow-2xl backdrop-blur-2xl"
      >
        {content}
      </motion.div>
    </AnimatePresence>
  );
}

export { GlobeFallback, GlobeHud, GlobeLoading, RouteInfoPanel, SearchResultPanel };
