/**
 * TravelGlobe — CesiumJS + Google Photorealistic 3D Tiles
 * Premium globe experience for Portal do Viajante.
 */
import { useEffect, useRef, useState, useCallback, memo } from "react";
import { AnimatePresence } from "framer-motion";
import type * as CesiumType from "cesium";
import type { GlobeFlightRoute, GlobeWaypoint } from "@/lib/cesium";
import { GlobeFallback, GlobeHud, GlobeLoading } from "./TravelGlobeOverlays";
import type { GlobeStatus, TravelGlobeProps } from "./travelGlobe.types";

const DEFAULT_ORLANDO_TARGET = {
  lat: 28.5383,
  lng: -81.3792,
  height: 165_000,
};

function resolveStatusFromConfig(configStatus: {
  cesiumReady: boolean;
  googleReady: boolean;
}): GlobeStatus {
  if (!configStatus.cesiumReady && !configStatus.googleReady) return "missing-both";
  if (!configStatus.cesiumReady) return "missing-cesium";
  if (!configStatus.googleReady) return "missing-google";
  return "loading";
}

function resolveWaypoints(
  input: TravelGlobeProps["waypoints"],
  fallback: GlobeWaypoint[]
): GlobeWaypoint[] {
  if (!input?.length) return fallback;
  return input.map((wp) => ({ ...wp }));
}

function resolveRoutes(
  input: TravelGlobeProps["routes"],
  waypoints: GlobeWaypoint[],
  fallback: GlobeFlightRoute[]
): GlobeFlightRoute[] {
  if (!input?.length) return fallback;

  return input
    .map((route) => {
      const from = waypoints.find((wp) => wp.id === route.fromId);
      const to = waypoints.find((wp) => wp.id === route.toId);
      if (!from || !to) return null;
      return {
        from,
        to,
        status: route.status,
      } satisfies GlobeFlightRoute;
    })
    .filter((route): route is GlobeFlightRoute => route !== null);
}

const TravelGlobe = memo(function TravelGlobe(props: TravelGlobeProps) {
  const { waypoints, routes, initialTarget, className = "" } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<CesiumType.Viewer | null>(null);

  const [status, setStatus] = useState<GlobeStatus>("loading");
  const [missingKeys, setMissingKeys] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let destroyed = false;

    const init = async () => {
      try {
        const cesiumLib = await import("@/lib/cesium");
        const configStatus = cesiumLib.checkCesiumConfig();

        if (!configStatus.allReady) {
          setMissingKeys(configStatus.missingKeys);
          setStatus(resolveStatusFromConfig(configStatus));
          return;
        }

        if (!containerRef.current || destroyed) return;

        await import("cesium/Build/Cesium/Widgets/widgets.css");
        cesiumLib.initIon();

        const viewer = cesiumLib.createViewer({
          container: containerRef.current,
          minimal: true,
        });

        if (destroyed) {
          viewer.destroy();
          return;
        }

        viewerRef.current = viewer;

        const tilesLoad = await cesiumLib.addGooglePhotorealistic3DTiles(viewer);
        if (!tilesLoad.tileset) {
          setErrorMessage(
            tilesLoad.errorMessage ||
              "O tileset fotorealista não foi carregado. Verifique permissões da Map Tiles API e restrições da chave."
          );
          setStatus("tileset-unavailable");
          return;
        }

        const resolvedWaypoints = resolveWaypoints(waypoints, cesiumLib.TEST_WAYPOINTS);
        resolvedWaypoints.forEach((wp) => cesiumLib.addWaypointMarker(viewer, wp));

        const resolvedRoutes = resolveRoutes(routes, resolvedWaypoints, cesiumLib.TEST_ROUTES);
        resolvedRoutes.forEach((route) => cesiumLib.addFlightArc(viewer, route));

        const target = initialTarget || DEFAULT_ORLANDO_TARGET;
        cesiumLib.flyTo(
          viewer,
          target.lat,
          target.lng,
          target.height || DEFAULT_ORLANDO_TARGET.height,
          4
        );

        setStatus("ready");
      } catch (err) {
        console.error("[TravelGlobe] Initialization error:", err);
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Falha inesperada na inicialização do globo 3D."
        );
        if (!destroyed) setStatus("error");
      }
    };

    init();

    return () => {
      destroyed = true;
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
      }
      viewerRef.current = null;
    };
  }, []); // intencional: inicialização única do engine Cesium

  useEffect(() => {
    if (!viewerRef.current || status !== "ready") return;

    const raf = requestAnimationFrame(() => {
      viewerRef.current?.resize();
    });

    return () => cancelAnimationFrame(raf);
  }, [isFullscreen, status]);

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
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ display: showFallback ? "none" : "block" }}
      />

      <AnimatePresence>{status === "loading" && <GlobeLoading />}</AnimatePresence>

      {showFallback && (
        <GlobeFallback
          status={status}
          missingKeys={missingKeys}
          errorMessage={errorMessage}
        />
      )}

      {status === "ready" && (
        <GlobeHud
          waypointCount={waypoints?.length || 3}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      )}
    </div>
  );
});

export default TravelGlobe;
