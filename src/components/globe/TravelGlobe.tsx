/**
 * TravelGlobe — CesiumJS + Google Photorealistic 3D Tiles
 * Premium journey exploration experience for Portal do Viajante.
 */
import { useEffect, useRef, useState, useCallback, memo } from "react";
import { AnimatePresence } from "framer-motion";
import type * as CesiumType from "cesium";
import type { GlobeFlightRoute, GlobeWaypoint } from "@/lib/cesium";
import { GlobeFallback, GlobeHud, GlobeLoading, RouteInfoPanel, SearchResultPanel } from "./TravelGlobeOverlays";
import MapSearchBar, { type SearchResult } from "./MapSearchBar";
import type { GlobeStatus, SelectedRouteInfo, TravelGlobeProps } from "./travelGlobe.types";

/* ═══ Helpers ═══ */
function resolveStatusFromConfig(cfg: { cesiumReady: boolean; googleReady: boolean }): GlobeStatus {
  if (!cfg.cesiumReady && !cfg.googleReady) return "missing-both";
  if (!cfg.cesiumReady) return "missing-cesium";
  if (!cfg.googleReady) return "missing-google";
  return "loading";
}

function resolveWaypoints(input: TravelGlobeProps["waypoints"], fallback: GlobeWaypoint[]): GlobeWaypoint[] {
  return input?.length ? input.map((wp) => ({ ...wp })) : fallback;
}

function resolveRoutes(
  input: TravelGlobeProps["routes"],
  waypoints: GlobeWaypoint[],
  fallback: GlobeFlightRoute[],
): GlobeFlightRoute[] {
  if (!input?.length) return fallback;
  return input
    .map((r) => {
      const from = waypoints.find((w) => w.id === r.fromId);
      const to = waypoints.find((w) => w.id === r.toId);
      return from && to ? { from, to, status: r.status } satisfies GlobeFlightRoute : null;
    })
    .filter((r): r is GlobeFlightRoute => r !== null);
}

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return mobile;
}

/* ═══ Main Component ═══ */
const TravelGlobe = memo(function TravelGlobe(props: TravelGlobeProps) {
  const { waypoints, routes, initialTarget, className = "" } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<CesiumType.Viewer | null>(null);
  const cesiumLibRef = useRef<typeof import("@/lib/cesium") | null>(null);
  const cesiumRef = useRef<typeof import("cesium") | null>(null);
  const resolvedRoutesRef = useRef<GlobeFlightRoute[]>([]);
  const resolvedWaypointsRef = useRef<GlobeWaypoint[]>([]);

  const [status, setStatus] = useState<GlobeStatus>("loading");
  const [missingKeys, setMissingKeys] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<SelectedRouteInfo | null>(null);
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);

  const isMobile = useIsMobile();

  // ── Init ──
  useEffect(() => {
    let destroyed = false;

    const init = async () => {
      try {
        const cesiumLib = await import("@/lib/cesium");
        const Cesium = await import("cesium");
        cesiumLibRef.current = cesiumLib;
        cesiumRef.current = Cesium;

        const configStatus = cesiumLib.checkCesiumConfig();
        if (!configStatus.allReady) {
          setMissingKeys(configStatus.missingKeys);
          setStatus(resolveStatusFromConfig(configStatus));
          return;
        }

        if (!containerRef.current || destroyed) return;

        await import("cesium/Build/Cesium/Widgets/widgets.css");
        cesiumLib.initIon();

        const viewer = cesiumLib.createViewer({ container: containerRef.current, minimal: true });
        if (destroyed) { viewer.destroy(); return; }
        viewerRef.current = viewer;

        // 3D Tiles
        const tilesLoad = await cesiumLib.addGooglePhotorealistic3DTiles(viewer);
        if (!tilesLoad.tileset) {
          setErrorMessage(tilesLoad.errorMessage || "Tileset fotorealista indisponível.");
          setStatus("tileset-unavailable");
          return;
        }

        // ── Entities ──
        const rWaypoints = resolveWaypoints(waypoints, cesiumLib.TEST_WAYPOINTS);
        const rRoutes = resolveRoutes(routes, rWaypoints, cesiumLib.TEST_ROUTES);
        resolvedRoutesRef.current = rRoutes;
        resolvedWaypointsRef.current = rWaypoints;

        // Journey intelligence
        const curLocId = cesiumLib.resolveCurrentLocation(rRoutes);
        setCurrentLocationId(curLocId);

        // Markers
        rWaypoints.forEach((wp) => {
          cesiumLib.addWaypointMarker(viewer, wp, wp.id === curLocId);
        });

        // Current location beacon
        if (curLocId) {
          const curWp = rWaypoints.find((w) => w.id === curLocId);
          if (curWp) cesiumLib.addCurrentLocationBeacon(viewer, curWp);
        }

        // Routes
        rRoutes.forEach((route) => cesiumLib.addFlightArc(viewer, route));

        // ── Camera ──
        if (initialTarget) {
          cesiumLib.flyTo(viewer, initialTarget.lat, initialTarget.lng, initialTarget.height || 8_000_000, 4);
        } else {
          const centered = cesiumLib.computeCenteredView(rWaypoints);
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(centered.lng, centered.lat, centered.height),
            orientation: {
              heading: Cesium.Math.toRadians(0),
              pitch: Cesium.Math.toRadians(-90),
              roll: 0,
            },
            duration: 3.5,
            easingFunction: Cesium.EasingFunction.QUINTIC_IN_OUT,
          });
        }

        // ── Click handler ──
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
            handleRouteSelect(meta.route, click.position, viewer, Cesium, cesiumLib);
          } else if (meta?.kind === "waypoint") {
            const matchingRoute = rRoutes.find(
              (r) => r.from.id === meta.waypoint.id || r.to.id === meta.waypoint.id
            );
            if (matchingRoute) {
              handleRouteSelect(matchingRoute, click.position, viewer, Cesium, cesiumLib);
            }
          } else {
            setSelectedRoute(null);
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        setStatus("ready");
      } catch (err) {
        console.error("[TravelGlobe] Init error:", err);
        setErrorMessage(err instanceof Error ? err.message : "Falha na inicialização.");
        if (!destroyed) setStatus("error");
      }
    };

    const handleRouteSelect = (
      route: GlobeFlightRoute,
      position: CesiumType.Cartesian2,
      viewer: CesiumType.Viewer,
      Cesium: typeof import("cesium"),
      cesiumLib: typeof import("@/lib/cesium"),
    ) => {
      setSelectedRoute({
        route,
        screenX: position.x,
        screenY: position.y,
        allRoutes: resolvedRoutesRef.current,
        allWaypoints: resolvedWaypointsRef.current,
        currentLocationId: currentLocationId,
      });

      // Fly camera to show the route nicely
      const midLat = (route.from.lat + route.to.lat) / 2;
      const midLng = (route.from.lng + route.to.lng) / 2;
      const dist = cesiumLib.computeDistanceKm(route.from.lat, route.from.lng, route.to.lat, route.to.lng);
      const camHeight = Math.max(500_000, dist * 2000);

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(midLng, midLat, camHeight),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-55),
          roll: 0,
        },
        duration: 2,
        easingFunction: Cesium.EasingFunction.QUINTIC_IN_OUT,
      });
    };

    init();

    return () => {
      destroyed = true;
      if (viewerRef.current && !viewerRef.current.isDestroyed()) viewerRef.current.destroy();
      viewerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Resize ──
  useEffect(() => {
    if (!viewerRef.current || status !== "ready") return;
    const raf = requestAnimationFrame(() => viewerRef.current?.resize());
    return () => cancelAnimationFrame(raf);
  }, [isFullscreen, status]);

  // ── Handlers ──
  const toggleFullscreen = useCallback(() => setIsFullscreen((p) => !p), []);

  const handleAnimate = useCallback(() => {
    if (!selectedRoute || !viewerRef.current || !cesiumLibRef.current) return;
    cesiumLibRef.current.animateAirplane(viewerRef.current, selectedRoute.route, 5);
  }, [selectedRoute]);

  const showFallback = status !== "loading" && status !== "ready";

  // Current location label for HUD
  const currentLocationLabel = currentLocationId
    ? resolvedWaypointsRef.current.find((w) => w.id === currentLocationId)?.label || null
    : null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border/15 ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""
      } ${className}`}
      style={{ minHeight: isFullscreen ? "100vh" : isMobile ? "400px" : "500px" }}
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
            waypointCount={waypoints?.length || resolvedWaypointsRef.current.length}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            currentLocation={currentLocationLabel}
          />
          {selectedRoute && (
            <RouteInfoPanel
              info={{ ...selectedRoute, currentLocationId }}
              onClose={() => setSelectedRoute(null)}
              onAnimate={handleAnimate}
              isMobile={isMobile}
            />
          )}
        </>
      )}
    </div>
  );
});

export default TravelGlobe;
