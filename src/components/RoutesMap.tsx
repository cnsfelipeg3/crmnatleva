import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Common airports lat/lon (fallback dataset)
const AIRPORT_COORDS: Record<string, [number, number]> = {
  GRU: [-23.4356, -46.4731], CGH: [-23.6261, -46.6564], GIG: [-22.8090, -43.2506],
  SDU: [-22.9104, -43.1631], BSB: [-15.8711, -47.9186], CNF: [-19.6244, -43.9719],
  SSA: [-12.9086, -38.3225], REC: [-8.1264, -34.9236], FOR: [-3.7761, -38.5325],
  POA: [-29.9944, -51.1711], CWB: [-25.5285, -49.1758], BEL: [-1.3793, -48.4764],
  MAO: [-3.0386, -60.0497], VCP: [-23.0074, -47.1345], FLN: [-27.6703, -48.5525],
  NAT: [-5.7681, -35.3764], MCZ: [-9.5108, -35.7917], AJU: [-10.9840, -37.0703],
  SLZ: [-2.5853, -44.2341], THE: [-5.0594, -42.8236], CGB: [-15.6528, -56.1167],
  CGR: [-20.4686, -54.6725], GYN: [-16.6319, -49.2206], PMW: [-10.2915, -48.3572],
  // International
  MIA: [25.7959, -80.2870], JFK: [40.6413, -73.7781], LAX: [33.9425, -118.4081],
  EWR: [40.6895, -74.1745], ORD: [41.9742, -87.9073], ATL: [33.6367, -84.4281],
  LHR: [51.4700, -0.4543], CDG: [49.0097, 2.5479], FCO: [41.8003, 12.2389],
  MAD: [40.4936, -3.5668], BCN: [41.2971, 2.0785], LIS: [38.7813, -9.1359],
  AMS: [52.3105, 4.7683], FRA: [50.0379, 8.5622], MUC: [48.3537, 11.7750],
  IST: [41.2753, 28.7519], DXB: [25.2532, 55.3657], DOH: [25.2609, 51.6138],
  SIN: [1.3644, 103.9915], HND: [35.5494, 139.7798], NRT: [35.7720, 140.3929],
  ICN: [37.4602, 126.4407], SCL: [-33.3930, -70.7858], EZE: [-34.8222, -58.5358],
  BOG: [4.7016, -74.1469], LIM: [-12.0219, -77.1143], MEX: [19.4363, -99.0721],
  CUN: [21.0365, -86.8771], PTY: [9.0714, -79.3835], MVD: [-34.8384, -56.0308],
  OPO: [41.2481, -8.6814],
};

interface Route {
  origin: string;
  destination: string;
  count: number;
  revenue: number;
}

interface RoutesMapProps {
  routes: Route[];
  height?: string;
}

function FitBounds({ routes }: { routes: Route[] }) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = [];
    routes.forEach(r => {
      const o = AIRPORT_COORDS[r.origin];
      const d = AIRPORT_COORDS[r.destination];
      if (o) points.push(o);
      if (d) points.push(d);
    });
    if (points.length >= 2) {
      map.fitBounds(points, { padding: [30, 30] });
    }
  }, [routes, map]);
  return null;
}

export default function RoutesMap({ routes, height = "360px" }: RoutesMapProps) {
  const validRoutes = routes.filter(
    r => AIRPORT_COORDS[r.origin] && AIRPORT_COORDS[r.destination]
  );

  const airportCounts: Record<string, number> = {};
  validRoutes.forEach(r => {
    airportCounts[r.origin] = (airportCounts[r.origin] || 0) + r.count;
    airportCounts[r.destination] = (airportCounts[r.destination] || 0) + r.count;
  });

  const maxCount = Math.max(...validRoutes.map(r => r.count), 1);

  return (
    <div style={{ height }} className="rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={[-14, -51]}
        zoom={4}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <FitBounds routes={validRoutes} />

        {validRoutes.map((r, i) => {
          const o = AIRPORT_COORDS[r.origin];
          const d = AIRPORT_COORDS[r.destination];
          if (!o || !d) return null;
          const opacity = 0.3 + (r.count / maxCount) * 0.7;
          const weight = 1 + (r.count / maxCount) * 4;
          return (
            <Polyline
              key={i}
              positions={[o, d]}
              pathOptions={{
                color: "hsl(152, 38%, 16%)",
                weight,
                opacity,
                dashArray: "6 4",
              }}
            >
              <Tooltip>
                {r.origin} → {r.destination}: {r.count} venda(s)
              </Tooltip>
            </Polyline>
          );
        })}

        {Object.entries(airportCounts).map(([iata, count]) => {
          const coords = AIRPORT_COORDS[iata];
          if (!coords) return null;
          const radius = 4 + (count / Math.max(...Object.values(airportCounts), 1)) * 10;
          return (
            <CircleMarker
              key={iata}
              center={coords}
              radius={radius}
              pathOptions={{
                fillColor: "hsl(38, 92%, 50%)",
                fillOpacity: 0.85,
                color: "hsl(152, 38%, 16%)",
                weight: 1.5,
              }}
            >
              <Tooltip>
                <strong>{iata}</strong>: {count} voo(s)
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
