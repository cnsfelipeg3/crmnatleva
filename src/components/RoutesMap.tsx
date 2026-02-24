import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { iataToLabel } from "@/lib/iataUtils";

const AIRPORT_COORDS: Record<string, [number, number]> = {
  GRU: [-23.4356, -46.4731], CGH: [-23.6261, -46.6564], GIG: [-22.8090, -43.2506],
  SDU: [-22.9104, -43.1631], BSB: [-15.8711, -47.9186], CNF: [-19.6244, -43.9719],
  SSA: [-12.9086, -38.3225], REC: [-8.1264, -34.9236], FOR: [-3.7761, -38.5325],
  POA: [-29.9944, -51.1711], CWB: [-25.5285, -49.1758], BEL: [-1.3793, -48.4764],
  MAO: [-3.0386, -60.0497], VCP: [-23.0074, -47.1345], FLN: [-27.6703, -48.5525],
  NAT: [-5.7681, -35.3764], MCZ: [-9.5108, -35.7917], AJU: [-10.9840, -37.0703],
  SLZ: [-2.5853, -44.2341], THE: [-5.0594, -42.8236], CGB: [-15.6528, -56.1167],
  CGR: [-20.4686, -54.6725], GYN: [-16.6319, -49.2206], PMW: [-10.2915, -48.3572],
  NVT: [-26.8799, -48.6514], BPS: [-16.4386, -39.0808], IGU: [-25.6001, -54.4897],
  VIX: [-20.2581, -40.2864], JPA: [-7.1481, -34.9486], LDB: [-23.3336, -51.1301],
  MIA: [25.7959, -80.2870], JFK: [40.6413, -73.7781], LAX: [33.9425, -118.4081],
  EWR: [40.6895, -74.1745], ORD: [41.9742, -87.9073], ATL: [33.6367, -84.4281],
  MCO: [28.4312, -81.3081], SFO: [37.6213, -122.3790], BOS: [42.3656, -71.0096],
  LAS: [36.0840, -115.1537], DFW: [32.8998, -97.0403],
  LHR: [51.4700, -0.4543], CDG: [49.0097, 2.5479], FCO: [41.8003, 12.2389],
  MAD: [40.4936, -3.5668], BCN: [41.2971, 2.0785], LIS: [38.7813, -9.1359],
  AMS: [52.3105, 4.7683], FRA: [50.0379, 8.5622], MUC: [48.3537, 11.7750],
  IST: [41.2753, 28.7519], DXB: [25.2532, 55.3657], DOH: [25.2609, 51.6138],
  SIN: [1.3644, 103.9915], HND: [35.5494, 139.7798], NRT: [35.7720, 140.3929],
  ICN: [37.4602, 126.4407], SCL: [-33.3930, -70.7858], EZE: [-34.8222, -58.5358],
  BOG: [4.7016, -74.1469], LIM: [-12.0219, -77.1143], MEX: [19.4363, -99.0721],
  CUN: [21.0365, -86.8771], PTY: [9.0714, -79.3835], MVD: [-34.8384, -56.0308],
  OPO: [41.2481, -8.6814], MXP: [45.6306, 8.7231], VCE: [45.5053, 12.3519],
  CAI: [30.1219, 31.4056], PUJ: [18.5674, -68.3634], NAP: [40.8860, 14.2908],
  ZRH: [47.4647, 8.5492], VIE: [48.1103, 16.5697], PRG: [50.1008, 14.2632],
  AUH: [24.4439, 54.6513], JED: [21.6706, 39.1506], AMM: [31.7226, 35.9932],
  TLV: [32.0114, 34.8867], BKK: [13.6900, 100.7501], HKG: [22.3080, 113.9185],
  PEK: [40.0725, 116.5975], PVG: [31.1434, 121.8052], DEL: [28.5562, 77.1000],
  DPS: [-8.7482, 115.1672], KUL: [2.7456, 101.7099],
  CPH: [55.6180, 12.6508], DUB: [53.4213, -6.2701], BUD: [47.4298, 19.2611],
  ATH: [37.9364, 23.9445], WAW: [52.1672, 20.9679], ARN: [59.6519, 17.9186],
  GVA: [46.2381, 6.1089], BRU: [50.9014, 4.4844], EDI: [55.9500, -3.3725],
  JNB: [-26.1392, 28.2460], CPT: [-33.9649, 18.6017], NBO: [-1.3192, 36.9278],
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

export default function RoutesMap({ routes, height = "400px" }: RoutesMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const validRoutes = routes.filter(
    r => AIRPORT_COORDS[r.origin] && AIRPORT_COORDS[r.destination]
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      scrollWheelZoom: true,
      zoomControl: true,
      dragging: true,
      doubleClickZoom: true,
      touchZoom: true,
      boxZoom: true,
    }).setView([-5, -30], 3);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com">CARTO</a>',
      maxZoom: 18,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.eachLayer(layer => {
      if (!(layer instanceof L.TileLayer)) map.removeLayer(layer);
    });

    const airportCounts: Record<string, { count: number; revenue: number }> = {};
    const maxCount = Math.max(...validRoutes.map(r => r.count), 1);

    validRoutes.forEach(r => {
      if (!airportCounts[r.origin]) airportCounts[r.origin] = { count: 0, revenue: 0 };
      if (!airportCounts[r.destination]) airportCounts[r.destination] = { count: 0, revenue: 0 };
      airportCounts[r.origin].count += r.count;
      airportCounts[r.destination].count += r.count;
      airportCounts[r.destination].revenue += r.revenue;

      const o = AIRPORT_COORDS[r.origin];
      const d = AIRPORT_COORDS[r.destination];
      const opacity = 0.3 + (r.count / maxCount) * 0.7;
      const weight = 1 + (r.count / maxCount) * 4;

      // Create curved line
      const midLat = (o[0] + d[0]) / 2;
      const midLng = (o[1] + d[1]) / 2;
      const dx = d[1] - o[1];
      const dy = d[0] - o[0];
      const dist = Math.sqrt(dx * dx + dy * dy);
      const curvature = dist * 0.15;
      const curvedMid: [number, number] = [midLat + curvature * 0.3, midLng];

      L.polyline([o, curvedMid, d], {
        color: "hsl(160, 60%, 50%)",
        weight,
        opacity,
        smoothFactor: 3,
      }).bindPopup(
        `<div style="font-family: sans-serif; font-size: 12px;">
          <strong>${iataToLabel(r.origin)} → ${iataToLabel(r.destination)}</strong><br/>
          <span>${r.count} venda(s)</span><br/>
          <span>Receita: ${fmt(r.revenue)}</span>
        </div>`
      ).addTo(map);
    });

    const maxAirport = Math.max(...Object.values(airportCounts).map(a => a.count), 1);
    Object.entries(airportCounts).forEach(([iata, data]) => {
      const coords = AIRPORT_COORDS[iata];
      if (!coords) return;
      const radius = 4 + (data.count / maxAirport) * 12;
      L.circleMarker(coords, {
        radius,
        fillColor: "hsl(38, 92%, 50%)",
        fillOpacity: 0.85,
        color: "hsl(160, 60%, 30%)",
        weight: 1.5,
      }).bindPopup(
        `<div style="font-family: sans-serif; font-size: 12px;">
          <strong>${iataToLabel(iata)}</strong><br/>
          <span>${data.count} voo(s)</span><br/>
          <span>Receita: ${fmt(data.revenue)}</span>
        </div>`
      ).addTo(map);
    });

    // Fit bounds
    const points: [number, number][] = [];
    validRoutes.forEach(r => {
      points.push(AIRPORT_COORDS[r.origin]);
      points.push(AIRPORT_COORDS[r.destination]);
    });
    if (points.length >= 2) {
      map.fitBounds(points as L.LatLngBoundsExpression, { padding: [40, 40] });
    }
  }, [validRoutes]);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="rounded-lg overflow-hidden border border-border"
    />
  );
}
