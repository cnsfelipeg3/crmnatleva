/**
 * TravelGlobe — CesiumJS + Google Photorealistic 3D Tiles
 * Premium globe experience for Portal do Viajante.
 */
import { useEffect, useRef, useState, useCallback, memo } from "react";
import { AnimatePresence } from "framer-motion";
import type * as CesiumType from "cesium";
import type { GlobeFlightRoute, GlobeWaypoint } from "@/lib/cesium";
import { GlobeFallback, GlobeHud, GlobeLoading, RouteInfoPanel } from "./TravelGlobeOverlays";
import type { GlobeStatus, SelectedRouteInfo, TravelGlobeProps } from "./travelGlobe.types";

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
      return { from, to, status: route.status } satisfies GlobeFlightRoute;
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
  const [selectedRoute, setSelectedRoute] = useState<SelectedRouteInfo | null>(null);

  useEffect(() => {
    let destroyed = false;

    const init = async () => {
      try {
        const cesiumLib = await import("@/lib/cesium");
        const Cesium = await import("cesium");
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

        // ── Camera: center globe perfectly with equal margins ──
        if (initialTarget) {
          cesiumLib.flyTo(
            viewer,
            initialTarget.lat,
            initialTarget.lng,
            initialTarget.height || 8_000_000,
            4
          );
        } else {
          const centered = cesiumLib.computeCenteredView(resolvedWaypoints);
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(centered.lng, centered.lat, centered.height),
            orientation: {
              heading: Cesium.Math.toRadians(0),
              pitch: Cesium.Math.toRadians(-90),
              roll: 0,
            },
            duration: 3.5,
          });
        }

        // ── Click handler for routes & waypoints ──
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((click: { position: CesiumType.Cartesian2 }) => {
          const picked = viewer.scene.pick(click.position);
          if (!Cesium.defined(picked) || !picked?.id) {
            setSelectedRoute(null);
            return;
          }

          const entity = picked.id as CesiumType.Entity;
          const meta = cesiumLib.getEntityMetadata(entity);

          if (meta?.kind === "route") {
            setSelectedRoute({
              route: meta.route,
              screenX: click.position.x,
              screenY: click.position.y,
            });
          } else if (meta?.kind === "waypoint") {
            // Find any route that includes this waypoint
            const matchingRoute = resolvedRoutes.find(
              (r) => r.from.id === meta.waypoint.id || r.to.id === meta.waypoint.id
            );
            if (matchingRoute) {
              setSelectedRoute({
                route: matchingRoute,
                screenX: click.position.x,
                screenY: click.position.y,
              });
            }
          } else {
            setSelectedRoute(null);
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        setStatus("ready");
      } catch (err) {
        console.error("[TravelGlobe] Initialization error:", err);
        setErrorMessage(
          err instanceof Error ? err.message : "Falha inesperada na inicialização do globo 3D."
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
    const raf = requestAnimationFrame(() => viewerRef.current?.resize());
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
        <GlobeFallback status={status} missingKeys={missingKeys} errorMessage={errorMessage} />
      )}

      {status === "ready" && (
        <>
          <GlobeHud
            waypointCount={waypoints?.length || 3}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
          {selectedRoute && (
            <RouteInfoPanel
              info={selectedRoute}
              onClose={() => setSelectedRoute(null)}
            />
          )}
        </>
      )}
    </div>
  );
});

export default TravelGlobe;
