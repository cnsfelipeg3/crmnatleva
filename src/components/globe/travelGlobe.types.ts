import type { GlobeFlightRoute, GlobeWaypoint } from "@/lib/cesium";

export interface TravelGlobeProps {
  /** Waypoints to display on the globe */
  waypoints?: GlobeWaypoint[];
  /** Routes between waypoints */
  routes?: Array<{
    fromId: string;
    toId: string;
    status: GlobeFlightRoute["status"];
  }>;
  /** Initial camera target */
  initialTarget?: { lat: number; lng: number; height?: number };
  /** CSS class for the container */
  className?: string;
  /** Callback when a waypoint is clicked */
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
}
