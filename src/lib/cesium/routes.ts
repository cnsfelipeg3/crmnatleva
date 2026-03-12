/**
 * Route / waypoint utilities for the Travel Globe.
 * Journey-aware markers, flight arcs, airplane animation, current-location pin.
 */
import * as Cesium from "cesium";

/* ═══ Types ═══ */
export interface GlobeWaypoint {
  id: string;
  label: string;
  lat: number;
  lng: number;
  type: "origin" | "connection" | "destination" | "hotel" | "experience" | "poi";
}

export interface GlobeFlightRoute {
  from: GlobeWaypoint;
  to: GlobeWaypoint;
  status: "active" | "upcoming" | "past";
}

export interface RouteEntityMetadata { kind: "route"; route: GlobeFlightRoute; }
export interface WaypointEntityMetadata { kind: "waypoint"; waypoint: GlobeWaypoint; }
export type GlobeEntityMetadata = RouteEntityMetadata | WaypointEntityMetadata;

const METADATA_KEY = "__globeMeta";

export function getEntityMetadata(entity: Cesium.Entity): GlobeEntityMetadata | null {
  return (entity as unknown as Record<string, unknown>)[METADATA_KEY] as GlobeEntityMetadata | null ?? null;
}

function setEntityMetadata(entity: Cesium.Entity, meta: GlobeEntityMetadata) {
  (entity as unknown as Record<string, unknown>)[METADATA_KEY] = meta;
}

/* ═══ Test data ═══ */
export const TEST_WAYPOINTS: GlobeWaypoint[] = [
  { id: "gru", label: "São Paulo (GRU)", lat: -23.43, lng: -46.47, type: "origin" },
  { id: "mia", label: "Miami (MIA)", lat: 25.79, lng: -80.29, type: "connection" },
  { id: "mco", label: "Orlando (MCO)", lat: 28.43, lng: -81.31, type: "destination" },
];

export const TEST_ROUTES: GlobeFlightRoute[] = [
  { from: TEST_WAYPOINTS[0], to: TEST_WAYPOINTS[1], status: "past" },
  { from: TEST_WAYPOINTS[1], to: TEST_WAYPOINTS[2], status: "active" },
];

/* ═══ Journey intelligence ═══ */
export function resolveCurrentLocation(routes: GlobeFlightRoute[]): string | null {
  const active = routes.find((r) => r.status === "active");
  if (active) return active.from.id; // in transit from this city
  const lastPast = [...routes].reverse().find((r) => r.status === "past");
  if (lastPast) return lastPast.to.id; // arrived at destination
  if (routes.length > 0) return routes[0].from.id; // pre-trip, still at origin
  return null;
}

/* ═══ Colors per status ═══ */
const ROUTE_COLORS: Record<string, { color: string; glow: number; width: number; alpha: number }> = {
  past:     { color: "#94a3b8", glow: 0.08, width: 2,   alpha: 0.35 },
  active:   { color: "#22c55e", glow: 0.35, width: 4,   alpha: 1 },
  upcoming: { color: "#60a5fa", glow: 0.15, width: 2.5, alpha: 0.6 },
};

const WP_COLORS: Record<GlobeWaypoint["type"], string> = {
  origin: "#22c55e",
  connection: "#60a5fa",
  destination: "#f59e0b",
  hotel: "#a78bfa",
  experience: "#ec4899",
  poi: "#94a3b8",
};

/* ═══ Waypoint Marker ═══ */
export function addWaypointMarker(
  viewer: Cesium.Viewer,
  wp: GlobeWaypoint,
  isCurrent = false,
): Cesium.Entity {
  const hex = WP_COLORS[wp.type] || "#ffffff";
  const color = Cesium.Color.fromCssColorString(hex);
  const size = isCurrent ? 16 : 10;

  const entity = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(wp.lng, wp.lat, 300),
    point: {
      pixelSize: size,
      color: isCurrent ? color : color.withAlpha(0.85),
      outlineColor: Cesium.Color.WHITE.withAlpha(isCurrent ? 0.9 : 0.5),
      outlineWidth: isCurrent ? 3 : 1.5,
      heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: wp.label,
      font: `${isCurrent ? "600 14px" : "500 12px"} 'Inter', 'SF Pro Display', system-ui, sans-serif`,
      fillColor: Cesium.Color.WHITE.withAlpha(isCurrent ? 1 : 0.8),
      outlineColor: Cesium.Color.BLACK.withAlpha(0.6),
      outlineWidth: 4,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, isCurrent ? -24 : -16),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      showBackground: true,
      backgroundColor: Cesium.Color.fromCssColorString("rgba(2, 6, 14, 0.82)"),
      backgroundPadding: new Cesium.Cartesian2(10, 6),
    },
  });

  setEntityMetadata(entity, { kind: "waypoint", waypoint: wp });
  return entity;
}

/* ═══ Current-location beacon ═══ */
export function addCurrentLocationBeacon(
  viewer: Cesium.Viewer,
  wp: GlobeWaypoint,
): Cesium.Entity {
  return viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(wp.lng, wp.lat, 350),
    ellipse: {
      semiMinorAxis: 35_000,
      semiMajorAxis: 35_000,
      material: Cesium.Color.fromCssColorString("#22c55e").withAlpha(0.12),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString("#22c55e").withAlpha(0.3),
      outlineWidth: 1.5,
      heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
    },
  });
}

/* ═══ Flight Arc ═══ */
export function addFlightArc(
  viewer: Cesium.Viewer,
  route: GlobeFlightRoute,
): Cesium.Entity {
  const style = ROUTE_COLORS[route.status] || ROUTE_COLORS.upcoming;

  const positions = computeArcPositions(
    route.from.lat, route.from.lng,
    route.to.lat, route.to.lng,
    80, 180_000,
  );

  const baseColor = Cesium.Color.fromCssColorString(style.color).withAlpha(style.alpha);

  const entity = viewer.entities.add({
    polyline: {
      positions,
      width: style.width,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: style.glow,
        color: baseColor,
      }),
      clampToGround: false,
    },
  });

  setEntityMetadata(entity, { kind: "route", route });
  return entity;
}

/* ═══ Airplane animation ═══ */
let activeAirplaneEntity: Cesium.Entity | null = null;
let airplaneAnimationId: number | null = null;

export function animateAirplane(
  viewer: Cesium.Viewer,
  route: GlobeFlightRoute,
  durationSec = 6,
): void {
  // Remove previous
  stopAirplaneAnimation(viewer);

  const positions = computeArcPositions(
    route.from.lat, route.from.lng,
    route.to.lat, route.to.lng,
    120, 180_000,
  );

  // Create airplane entity (a small bright point with label)
  activeAirplaneEntity = viewer.entities.add({
    position: positions[0],
    point: {
      pixelSize: 8,
      color: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.fromCssColorString("#22c55e"),
      outlineWidth: 3,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: "  ✈",
      font: "18px system-ui",
      fillColor: Cesium.Color.WHITE,
      style: Cesium.LabelStyle.FILL,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
      pixelOffset: new Cesium.Cartesian2(6, 0),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });

  // Trail polyline (builds up over time)
  const trailPositions = [positions[0]];
  const trailEntity = viewer.entities.add({
    polyline: {
      positions: new Cesium.CallbackProperty(() => trailPositions, false) as unknown as Cesium.Cartesian3[],
      width: 2,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.3,
        color: Cesium.Color.WHITE.withAlpha(0.5),
      }),
      clampToGround: false,
    },
  });

  const startTime = performance.now();
  const totalMs = durationSec * 1000;

  const tick = () => {
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / totalMs, 1);

    // Ease in-out
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const idx = Math.min(Math.floor(eased * (positions.length - 1)), positions.length - 1);

    if (activeAirplaneEntity?.position) {
      (activeAirplaneEntity.position as unknown as Cesium.ConstantPositionProperty).setValue(positions[idx]);
    }

    // Update trail
    if (trailPositions.length < idx + 1) {
      for (let i = trailPositions.length; i <= idx; i++) {
        trailPositions.push(positions[i]);
      }
    }

    if (t < 1) {
      airplaneAnimationId = requestAnimationFrame(tick);
    } else {
      // Clean up after brief pause
      setTimeout(() => {
        if (activeAirplaneEntity && !viewer.isDestroyed()) {
          viewer.entities.remove(activeAirplaneEntity);
          viewer.entities.remove(trailEntity);
          activeAirplaneEntity = null;
        }
      }, 1500);
    }
  };

  airplaneAnimationId = requestAnimationFrame(tick);
}

export function stopAirplaneAnimation(viewer: Cesium.Viewer): void {
  if (airplaneAnimationId) {
    cancelAnimationFrame(airplaneAnimationId);
    airplaneAnimationId = null;
  }
  if (activeAirplaneEntity && !viewer.isDestroyed()) {
    viewer.entities.remove(activeAirplaneEntity);
    activeAirplaneEntity = null;
  }
}

/* ═══ Arc geometry ═══ */
export function computeArcPositions(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
  segments: number,
  maxAlt: number,
): Cesium.Cartesian3[] {
  const positions: Cesium.Cartesian3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const lat = lat1 + (lat2 - lat1) * t;
    const lng = lng1 + (lng2 - lng1) * t;
    const alt = maxAlt * Math.sin(Math.PI * t);
    positions.push(Cesium.Cartesian3.fromDegrees(lng, lat, alt));
  }
  return positions;
}

/* ═══ Centroid camera ═══ */
export function computeCenteredView(waypoints: GlobeWaypoint[]): {
  lat: number; lng: number; height: number;
} {
  if (!waypoints.length) return { lat: 0, lng: -50, height: 20_000_000 };

  const latSum = waypoints.reduce((s, w) => s + w.lat, 0);
  const lngSum = waypoints.reduce((s, w) => s + w.lng, 0);
  const centroidLat = latSum / waypoints.length;
  const centroidLng = lngSum / waypoints.length;

  const latMin = Math.min(...waypoints.map((w) => w.lat));
  const latMax = Math.max(...waypoints.map((w) => w.lat));
  const lngMin = Math.min(...waypoints.map((w) => w.lng));
  const lngMax = Math.max(...waypoints.map((w) => w.lng));

  const maxSpan = Math.max(latMax - latMin, lngMax - lngMin);
  const height = Math.max(2_500_000, maxSpan * 130_000);

  return { lat: centroidLat, lng: centroidLng, height: Math.min(height, 20_000_000) };
}

/* ═══ Distance helper ═══ */
export function computeDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
}

/* ═══ Search result marker ═══ */
let _searchMarker: Cesium.Entity | null = null;

export function addSearchMarker(
  viewer: Cesium.Viewer,
  lat: number,
  lng: number,
  label: string,
): Cesium.Entity {
  removeSearchMarker(viewer);

  const entity = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lng, lat, 400),
    point: {
      pixelSize: 14,
      color: Cesium.Color.fromCssColorString("#f43f5e"),
      outlineColor: Cesium.Color.WHITE.withAlpha(0.9),
      outlineWidth: 3,
      heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: label,
      font: "600 13px 'Inter', system-ui, sans-serif",
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK.withAlpha(0.7),
      outlineWidth: 4,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -18),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });

  _searchMarker = entity;
  return entity;
}

export function removeSearchMarker(viewer: Cesium.Viewer) {
  if (_searchMarker) {
    viewer.entities.remove(_searchMarker);
    _searchMarker = null;
  }
}
