/**
 * TravelGlobe — CesiumJS + Google Photorealistic 3D Tiles
 * 
 * Premium globe experience for Portal do Viajante.
 * Gracefully falls back if API keys are not configured.
 */
import { useEffect, useRef, useState, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe2, AlertTriangle, Satellite, MapPin, Maximize2, Minimize2 } from "lucide-react";

// Types only — actual Cesium imported lazily inside useEffect
import type * as CesiumType from "cesium";

export interface TravelGlobeProps {
  /** Waypoints to display on the globe */
  waypoints?: Array<{
    id: string;
    label: string;
    lat: number;
    lng: number;
    type: "origin" | "connection" | "destination" | "hotel" | "experience" | "poi";
  }>;
  /** Routes between waypoints */
  routes?: Array<{
    fromId: string;
    toId: string;
    status: "active" | "upcoming" | "past";
  }>;
  /** Initial camera target */
  initialTarget?: { lat: number; lng: number; height?: number };
  /** CSS class for the container */
  className?: string;
  /** Callback when a waypoint is clicked */
  onWaypointClick?: (waypointId: string) => void;
}

type GlobeStatus = "loading" | "ready" | "missing-cesium" | "missing-google" | "missing-both" | "error";

function GlobeFallback({ status, missingKeys }: { status: GlobeStatus; missingKeys: string[] }) {
  const isConfigIssue = status.startsWith("missing");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(160,30%,4%)] via-[hsl(160,25%,7%)] to-[hsl(160,20%,5%)]">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "radial-gradient(circle at 30% 40%, hsl(160 60% 42% / 0.15) 0%, transparent 50%), radial-gradient(circle at 70% 60%, hsl(160 60% 42% / 0.08) 0%, transparent 40%)",
        }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-md px-6">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="mx-auto w-20 h-20 rounded-3xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-6"
        >
          {isConfigIssue ? (
            <AlertTriangle className="h-9 w-9 text-accent/60" />
          ) : (
            <Globe2 className="h-9 w-9 text-accent/60" />
          )}
        </motion.div>

        <h3 className="text-lg font-bold text-white/90 tracking-tight mb-2">
          {isConfigIssue ? "Configuração pendente" : "Erro ao carregar globo"}
        </h3>

        {isConfigIssue && (
          <div className="space-y-2 mt-4">
            {missingKeys.map((key) => (
              <div key={key} className="flex items-center gap-2 justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                <code className="text-[11px] font-mono text-white/50 bg-white/[0.04] px-2.5 py-1 rounded-md">
                  {key}
                </code>
              </div>
            ))}
            <p className="text-white/40 text-xs mt-3">
              Configure as variáveis de ambiente para ativar o globo fotorrealístico.
            </p>
          </div>
        )}

        {status === "error" && (
          <p className="text-white/40 text-xs mt-3">
            Ocorreu um erro ao inicializar o globo 3D. Tente recarregar a página.
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
      className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-[hsl(160,30%,4%)]"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        className="w-16 h-16 rounded-full border-2 border-accent/10 border-t-accent mb-6"
      />
      <div className="flex items-center gap-2">
        <Satellite className="h-4 w-4 text-accent/50" />
        <span className="text-white/50 text-xs font-medium tracking-wider uppercase">
          Carregando globo 3D...
        </span>
      </div>
    </motion.div>
  );
}

const TravelGlobe = memo(function TravelGlobe({
  waypoints,
  routes,
  initialTarget,
  className = "",
  onWaypointClick,
}: TravelGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<CesiumType.Viewer | null>(null);
  const [status, setStatus] = useState<GlobeStatus>("loading");
  const [missingKeys, setMissingKeys] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialise Cesium viewer
  useEffect(() => {
    let destroyed = false;

    const init = async () => {
      try {
        // Dynamic import — only loads Cesium when this component mounts
        const cesiumLib = await import("@/lib/cesium");
        const configStatus = cesiumLib.checkCesiumConfig();

        if (!configStatus.allReady) {
          setMissingKeys(configStatus.missingKeys);
          if (!configStatus.cesiumReady && !configStatus.googleReady) {
            setStatus("missing-both");
          } else if (!configStatus.cesiumReady) {
            setStatus("missing-cesium");
          } else {
            setStatus("missing-google");
          }
          return;
        }

        if (!containerRef.current || destroyed) return;

        // Import Cesium CSS
        await import("cesium/Build/Cesium/Widgets/widgets.css");

        // Initialise Ion token
        cesiumLib.initIon();

        // Create viewer
        const viewer = cesiumLib.createViewer({
          container: containerRef.current,
          minimal: true,
        });

        if (destroyed) {
          viewer.destroy();
          return;
        }

        viewerRef.current = viewer;

        // Add Google 3D Tiles
        await cesiumLib.addGooglePhotorealistic3DTiles(viewer);

        // Add test waypoints if no custom ones provided
        const wps = waypoints?.length
          ? waypoints.map((wp) => ({
              ...wp,
              type: wp.type as any,
            }))
          : cesiumLib.TEST_WAYPOINTS;

        wps.forEach((wp) => cesiumLib.addWaypointMarker(viewer, wp));

        // Add routes
        const rts = routes?.length
          ? routes.map((r) => {
              const from = wps.find((w) => w.id === r.fromId);
              const to = wps.find((w) => w.id === r.toId);
              if (!from || !to) return null;
              return { from, to, status: r.status };
            }).filter(Boolean) as any[]
          : cesiumLib.TEST_ROUTES;

        rts.forEach((r) => cesiumLib.addFlightArc(viewer, r));

        // Initial camera position
        if (initialTarget) {
          cesiumLib.flyTo(viewer, initialTarget.lat, initialTarget.lng, initialTarget.height || 2_000_000, 4);
        } else {
          // Default: orbit view centred on South America
          cesiumLib.orbitView(viewer, 0);
          // Then zoom to first waypoint
          setTimeout(() => {
            if (!destroyed && wps.length > 0) {
              cesiumLib.flyTo(viewer, wps[0].lat, wps[0].lng, 5_000_000, 5);
            }
          }, 500);
        }

        setStatus("ready");
      } catch (err) {
        console.error("[TravelGlobe] Initialization error:", err);
        if (!destroyed) setStatus("error");
      }
    };

    init();

    return () => {
      destroyed = true;
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const showFallback = status !== "loading" && status !== "ready";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border/20 ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""
      } ${className}`}
      style={{ minHeight: isFullscreen ? "100vh" : "500px" }}
    >
      {/* Cesium container */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ display: showFallback ? "none" : "block" }}
      />

      {/* Loading overlay */}
      <AnimatePresence>
        {status === "loading" && <GlobeLoading />}
      </AnimatePresence>

      {/* Fallback for missing config / errors */}
      {showFallback && <GlobeFallback status={status} missingKeys={missingKeys} />}

      {/* UI Overlay — only when ready */}
      {status === "ready" && (
        <>
          {/* Top-left badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-[hsl(160,30%,4%)]/80 backdrop-blur-xl text-white/70 text-[10px] font-bold uppercase tracking-[0.25em] px-4 py-2 rounded-full border border-accent/10"
          >
            <Satellite className="h-3.5 w-3.5 text-accent" />
            Globe 3D — Photorealistic
          </motion.div>

          {/* Waypoint count */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="absolute top-4 right-14 z-10 flex items-center gap-1.5 bg-[hsl(160,30%,4%)]/80 backdrop-blur-xl text-white/60 text-[10px] font-mono px-3 py-2 rounded-full border border-white/[0.06]"
          >
            <MapPin className="h-3 w-3 text-accent/60" />
            {(waypoints?.length || 3)} destinos
          </motion.div>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-[hsl(160,30%,4%)]/80 backdrop-blur-xl rounded-full border border-white/[0.06] text-white/50 hover:text-white transition-colors"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </>
      )}
    </div>
  );
});

export default TravelGlobe;
