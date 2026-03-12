import type { GlobeFlightRoute, GlobeWaypoint } from "@/lib/cesium/routes";

export interface TravelGlobeProps {
  waypoints?: GlobeWaypoint[];
  routes?: Array<{
    fromId: string;
    toId: string;
    status: GlobeFlightRoute["status"];
  }>;
  initialTarget?: { lat: number; lng: number; height?: number };
  className?: string;
  onWaypointClick?: (waypointId: string) => void;
}

export type GlobeStatus =
  | "loading"
  | "ready"
  | "missing-cesium"
  | "missing-google"
  | "missing-both"
  | "tileset-unavailable"
  | "error";

export interface SelectedRouteInfo {
  route: GlobeFlightRoute;
  screenX: number;
  screenY: number;
  allRoutes: GlobeFlightRoute[];
  allWaypoints: GlobeWaypoint[];
  currentLocationId?: string | null;
}

export interface JourneyState {
  currentLocationId: string | null;
  currentRouteIndex: number;
  phase: "pre-trip" | "in-transit" | "at-destination" | "post-trip";
}
