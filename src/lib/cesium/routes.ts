/**
 * Route / waypoint utilities for the Travel Globe.
 * Provides helpers to create flight arcs, markers, and animated paths.
 */
import * as Cesium from "cesium";

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

/** Metadata attached to route entities for click handling */
export interface RouteEntityMetadata {
  kind: "route";
  route: GlobeFlightRoute;
}

/** Metadata attached to waypoint entities for click handling */
export interface WaypointEntityMetadata {
  kind: "waypoint";
  waypoint: GlobeWaypoint;
}

export type GlobeEntityMetadata = RouteEntityMetadata | WaypointEntityMetadata;

/** Custom property key used to store metadata on Cesium entities */
const METADATA_KEY = "__globeMeta";

export function getEntityMetadata(entity: Cesium.Entity): GlobeEntityMetadata | null {
  return (entity as unknown as Record<string, unknown>)[METADATA_KEY] as GlobeEntityMetadata | null ?? null;
}

function setEntityMetadata(entity: Cesium.Entity, meta: GlobeEntityMetadata) {
  (entity as unknown as Record<string, unknown>)[METADATA_KEY] = meta;
}

/** Test waypoints for initial validation */
export const TEST_WAYPOINTS: GlobeWaypoint[] = [
  { id: "gru", label: "São Paulo (GRU)", lat: -23.43, lng: -46.47, type: "origin" },
  { id: "mia", label: "Miami (MIA)", lat: 25.79, lng: -80.29, type: "connection" },
  { id: "mco", label: "Orlando (MCO)", lat: 28.43, lng: -81.31, type: "destination" },
];

/** Test routes */
export const TEST_ROUTES: GlobeFlightRoute[] = [
  { from: TEST_WAYPOINTS[0], to: TEST_WAYPOINTS[1], status: "upcoming" },
  { from: TEST_WAYPOINTS[1], to: TEST_WAYPOINTS[2], status: "active" },
];

/**
 * Add a pulsing point marker at a waypoint location.
 */
export function addWaypointMarker(
  viewer: Cesium.Viewer,
  wp: GlobeWaypoint
): Cesium.Entity {
  const colorMap: Record<GlobeWaypoint["type"], Cesium.Color> = {
    origin: Cesium.Color.fromCssColorString("#22c55e"),
    connection: Cesium.Color.fromCssColorString("#4ade80"),
    destination: Cesium.Color.fromCssColorString("#16a34a"),
    hotel: Cesium.Color.fromCssColorString("#facc15"),
    experience: Cesium.Color.fromCssColorString("#f97316"),
    poi: Cesium.Color.fromCssColorString("#8b5cf6"),
  };

  const entity = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(wp.lng, wp.lat, 200),
    point: {
      pixelSize: 12,
      color: colorMap[wp.type] || Cesium.Color.WHITE,
      outlineColor: Cesium.Color.WHITE.withAlpha(0.6),
      outlineWidth: 2,
      heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: wp.label,
      font: "13px 'Space Grotesk', sans-serif",
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -18),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      showBackground: true,
      backgroundColor: Cesium.Color.fromCssColorString("rgba(10, 22, 40, 0.85)"),
      backgroundPadding: new Cesium.Cartesian2(8, 5),
    },
  });

  setEntityMetadata(entity, { kind: "waypoint", waypoint: wp });
  return entity;
}

/**
 * Draw a flight arc between two waypoints.
 * Uses a polyline with altitude for a visible arc effect.
 */
export function addFlightArc(
  viewer: Cesium.Viewer,
  route: GlobeFlightRoute
): Cesium.Entity {
  const colorMap: Record<string, string> = {
    active: "#22c55e",
    upcoming: "#4ade80",
    past: "#0d3a1e",
  };

  const positions = computeArcPositions(
    route.from.lat, route.from.lng,
    route.to.lat, route.to.lng,
    60, 150_000
  );

  const entity = viewer.entities.add({
    polyline: {
      positions,
      width: route.status === "past" ? 1.5 : 3,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.25,
        color: Cesium.Color.fromCssColorString(colorMap[route.status] || "#22c55e"),
      }),
      clampToGround: false,
    },
  });

  setEntityMetadata(entity, { kind: "route", route });
  return entity;
}

/** Compute arc positions with altitude curve */
function computeArcPositions(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
  segments: number,
  maxAlt: number
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

/**
 * Compute centroid camera view to perfectly center all waypoints with equal margins.
 */
export function computeCenteredView(waypoints: GlobeWaypoint[]): {
  lat: number;
  lng: number;
  height: number;
} {
  if (!waypoints.length) return { lat: 0, lng: -50, height: 20_000_000 };

  const latSum = waypoints.reduce((s, w) => s + w.lat, 0);
  const lngSum = waypoints.reduce((s, w) => s + w.lng, 0);
  const centroidLat = latSum / waypoints.length;
  const centroidLng = lngSum / waypoints.length;

  // Compute span to determine altitude
  const latMin = Math.min(...waypoints.map((w) => w.lat));
  const latMax = Math.max(...waypoints.map((w) => w.lat));
  const lngMin = Math.min(...waypoints.map((w) => w.lng));
  const lngMax = Math.max(...waypoints.map((w) => w.lng));

  const latSpan = latMax - latMin;
  const lngSpan = lngMax - lngMin;
  const maxSpan = Math.max(latSpan, lngSpan);

  // Map span to camera height — generous padding for equal margins
  const height = Math.max(2_000_000, maxSpan * 120_000);

  return { lat: centroidLat, lng: centroidLng, height: Math.min(height, 20_000_000) };
}
