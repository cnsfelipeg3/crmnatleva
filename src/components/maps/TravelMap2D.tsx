import { useMemo, useRef, useCallback, useState } from "react";
import {
  GoogleMap,
  useLoadScript,
  MarkerF,
  PolylineF,
  InfoWindowF,
} from "@react-google-maps/api";
import { cn } from "@/lib/utils";
import { Loader2, MapPin } from "lucide-react";

export interface TravelMap2DWaypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  color?: "primary" | "accent" | "success" | "muted";
}

export interface TravelMap2DRoute {
  fromId: string;
  toId: string;
  status?: "completed" | "in-progress" | "upcoming";
}

interface Props {
  waypoints?: TravelMap2DWaypoint[];
  routes?: TravelMap2DRoute[];
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  className?: string;
  onWaypointClick?: (waypointId: string) => void;
}

const containerStyle = { width: "100%", height: "100%" };

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

const ROUTE_COLOR_BY_STATUS: Record<NonNullable<TravelMap2DRoute["status"]>, string> = {
  completed: "#10b981",
  "in-progress": "#f59e0b",
  upcoming: "#94a3b8",
};

const PIN_COLOR: Record<NonNullable<TravelMap2DWaypoint["color"]>, string> = {
  primary: "#3b82f6",
  accent: "#8b5cf6",
  success: "#10b981",
  muted: "#94a3b8",
};

const LIBRARIES: ("places")[] = ["places"];

export function TravelMap2D({
  waypoints = [],
  routes = [],
  initialCenter = { lat: -14.235, lng: -51.9253 },
  initialZoom = 3,
  className,
  onWaypointClick,
}: Props) {
  const apiKey = (import.meta as { env?: Record<string, string> }).env?.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey ?? "",
    libraries: LIBRARIES,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const bounds = useMemo(() => {
    if (waypoints.length < 2) return null;
    return waypoints.reduce(
      (acc, w) => ({
        min: { lat: Math.min(acc.min.lat, w.lat), lng: Math.min(acc.min.lng, w.lng) },
        max: { lat: Math.max(acc.max.lat, w.lat), lng: Math.max(acc.max.lng, w.lng) },
      }),
      { min: { lat: 90, lng: 180 }, max: { lat: -90, lng: -180 } },
    );
  }, [waypoints]);

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      if (bounds && waypoints.length >= 2) {
        const b = new google.maps.LatLngBounds(bounds.min, bounds.max);
        map.fitBounds(b, 80);
      } else if (waypoints.length === 1) {
        map.setCenter({ lat: waypoints[0].lat, lng: waypoints[0].lng });
        map.setZoom(5);
      }
    },
    [bounds, waypoints],
  );

  const waypointById = useMemo(() => {
    const m = new Map<string, TravelMap2DWaypoint>();
    waypoints.forEach((w) => m.set(w.id, w));
    return m;
  }, [waypoints]);

  if (!apiKey) {
    return (
      <div className={cn("flex items-center justify-center rounded-2xl bg-muted/40 text-sm text-muted-foreground", className)}>
        Configure VITE_GOOGLE_MAPS_API_KEY pra ver o mapa.
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={cn("flex items-center justify-center rounded-2xl bg-destructive/10 text-sm text-destructive", className)}>
        Erro ao carregar Google Maps · verifique a API key
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={cn("flex items-center justify-center rounded-2xl bg-muted/40", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border/40", className)}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={initialCenter}
        zoom={initialZoom}
        onLoad={onMapLoad}
        options={{
          styles: MAP_STYLES,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          backgroundColor: "#0f172a",
        }}
      >
        {waypoints.map((w) => {
          const color = PIN_COLOR[w.color ?? "primary"];
          const icon: google.maps.Symbol = {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          };
          return (
            <MarkerF
              key={w.id}
              position={{ lat: w.lat, lng: w.lng }}
              title={w.name}
              icon={icon}
              onClick={() => {
                setSelectedId(w.id);
                onWaypointClick?.(w.id);
              }}
            />
          );
        })}

        {routes.map((r, i) => {
          const from = waypointById.get(r.fromId);
          const to = waypointById.get(r.toId);
          if (!from || !to) return null;
          const color = ROUTE_COLOR_BY_STATUS[r.status ?? "upcoming"];
          return (
            <PolylineF
              key={`${r.fromId}-${r.toId}-${i}`}
              path={[
                { lat: from.lat, lng: from.lng },
                { lat: to.lat, lng: to.lng },
              ]}
              options={{
                strokeColor: color,
                strokeOpacity: 0.85,
                strokeWeight: 3,
                geodesic: true,
              }}
            />
          );
        })}

        {selectedId && waypointById.get(selectedId) && (
          <InfoWindowF
            position={{
              lat: waypointById.get(selectedId)!.lat,
              lng: waypointById.get(selectedId)!.lng,
            }}
            onCloseClick={() => setSelectedId(null)}
          >
            <div className="flex items-center gap-2 px-1 py-0.5 text-sm font-semibold text-slate-900">
              <MapPin className="h-3.5 w-3.5" />
              {waypointById.get(selectedId)!.name}
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
}

export default TravelMap2D;
