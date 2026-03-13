import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { iataToLabel } from "@/lib/iataUtils";
import { loadGoogleMapsCore, hasGoogleMapsAuthFailure } from "@/lib/googleMaps";

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
  FTE: [-51.6092, -69.3125], AEP: [-34.5592, -58.4156],
  FLR: [43.8100, 11.2050], SPU: [43.5389, 16.2980], DBV: [42.5614, 18.2682],
  PMI: [39.5517, 2.7388],
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export interface RouteSale {
  id: string;
  display_id: string;
  name: string;
  origin_iata: string | null;
  destination_iata: string | null;
  departure_date: string | null;
  received_value: number;
}

interface Route {
  origin: string;
  destination: string;
  count: number;
  revenue: number;
}

interface RoutesMapProps {
  routes: Route[];
  height?: string;
  sales?: RouteSale[];
  onSaleClick?: (saleId: string) => void;
}

const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#4b6878" }] },
  { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#0e1626" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4e6d70" }] },
  { featureType: "road", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

function getCurvedPath(from: google.maps.LatLngLiteral, to: google.maps.LatLngLiteral, segments = 40): google.maps.LatLngLiteral[] {
  const points: google.maps.LatLngLiteral[] = [];
  const midLat = (from.lat + to.lat) / 2;
  const midLng = (from.lng + to.lng) / 2;
  const dx = to.lng - from.lng;
  const dy = to.lat - from.lat;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const curvature = Math.min(dist * 0.2, 8);
  const perpLat = midLat + curvature * (-dx / (dist + 0.001));
  const perpLng = midLng + curvature * (dy / (dist + 0.001));

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const lat = (1 - t) * (1 - t) * from.lat + 2 * (1 - t) * t * perpLat + t * t * to.lat;
    const lng = (1 - t) * (1 - t) * from.lng + 2 * (1 - t) * t * perpLng + t * t * to.lng;
    points.push({ lat, lng });
  }

  return points;
}

export default function RoutesMap({ routes, height = "400px", sales = [], onSaleClick }: RoutesMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const googleMapRef = useRef<google.maps.Map | null>(null);
  const googleOverlaysRef = useRef<(google.maps.Polyline | google.maps.Marker | google.maps.InfoWindow)[]>([]);

  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletLayerRef = useRef<L.LayerGroup | null>(null);

  const [fallbackMode, setFallbackMode] = useState(false);

  const validRoutes = routes.filter((r) => AIRPORT_COORDS[r.origin] && AIRPORT_COORDS[r.destination]);

  // Init Google map (primary)
  useEffect(() => {
    if (fallbackMode || !containerRef.current) return;

    let cancelled = false;
    let authTimer: number | undefined;

    loadGoogleMapsCore()
      .then(({ Map }) => {
        if (cancelled || !containerRef.current) return;
        if (hasGoogleMapsAuthFailure()) throw new Error("Google Maps auth failure");

        const map = new Map(containerRef.current, {
          center: { lat: -5, lng: -30 },
          zoom: 3,
          disableDefaultUI: true,
          zoomControl: true,
          styles: DARK_STYLE,
          backgroundColor: "#0e1626",
        });

        googleMapRef.current = map;

        // Detect delayed auth failures and auto-fallback
        authTimer = window.setTimeout(() => {
          const hasDomError = !!containerRef.current?.querySelector(".gm-err-container");
          if ((hasGoogleMapsAuthFailure() || hasDomError) && !cancelled) {
            googleMapRef.current = null;
            if (containerRef.current) containerRef.current.innerHTML = "";
            setFallbackMode(true);
          }
        }, 1200);
      })
      .catch((err) => {
        console.error("Google Maps init error:", err);
        if (!cancelled) setFallbackMode(true);
      });

    return () => {
      cancelled = true;
      if (authTimer) window.clearTimeout(authTimer);
    };
  }, [fallbackMode]);

  // Draw on Google map
  useEffect(() => {
    if (fallbackMode) return;

    const map = googleMapRef.current;
    if (!map) return;

    googleOverlaysRef.current.forEach((o) => {
      if ("setMap" in o) (o as any).setMap(null);
      if ("close" in o) (o as any).close();
    });
    googleOverlaysRef.current = [];

    const maxCount = Math.max(...validRoutes.map((r) => r.count), 1);
    const bounds = new google.maps.LatLngBounds();

    const airportData: Record<string, { count: number; revenue: number; salesList: RouteSale[] }> = {};

    validRoutes.forEach((r) => {
      if (!airportData[r.origin]) airportData[r.origin] = { count: 0, revenue: 0, salesList: [] };
      if (!airportData[r.destination]) airportData[r.destination] = { count: 0, revenue: 0, salesList: [] };
      airportData[r.origin].count += r.count;
      airportData[r.destination].count += r.count;
      airportData[r.destination].revenue += r.revenue;
    });

    sales.forEach((sale) => {
      if (sale.origin_iata && airportData[sale.origin_iata]) {
        const list = airportData[sale.origin_iata].salesList;
        if (!list.find((s) => s.id === sale.id)) list.push(sale);
      }
      if (sale.destination_iata && airportData[sale.destination_iata]) {
        const list = airportData[sale.destination_iata].salesList;
        if (!list.find((s) => s.id === sale.id)) list.push(sale);
      }
    });

    validRoutes.forEach((r) => {
      const o = AIRPORT_COORDS[r.origin];
      const d = AIRPORT_COORDS[r.destination];
      const opacity = 0.3 + (r.count / maxCount) * 0.6;
      const weight = 1.5 + (r.count / maxCount) * 3.5;

      const polyline = new google.maps.Polyline({
        path: getCurvedPath({ lat: o[0], lng: o[1] }, { lat: d[0], lng: d[1] }),
        strokeColor: "#34d399",
        strokeWeight: weight,
        strokeOpacity: opacity,
        geodesic: false,
        map,
      });

      googleOverlaysRef.current.push(polyline);
    });

    const maxAirport = Math.max(...Object.values(airportData).map((a) => a.count), 1);

    Object.entries(airportData).forEach(([iata, data]) => {
      const coords = AIRPORT_COORDS[iata];
      if (!coords) return;

      const pos = { lat: coords[0], lng: coords[1] };
      bounds.extend(pos);

      const marker = new google.maps.Marker({
        position: pos,
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10 + (data.count / maxAirport) * 20,
          fillColor: "#f59e0b",
          fillOpacity: 0.85,
          strokeColor: "#34d399",
          strokeWeight: 2,
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="font-family:system-ui;min-width:180px;"><strong>${iataToLabel(iata)}</strong><br/>${data.count} rota(s) · ${fmt(data.revenue)}</div>`,
      });

      marker.addListener("click", () => {
        googleOverlaysRef.current.forEach((o) => {
          if (o instanceof google.maps.InfoWindow) o.close();
        });
        infoWindow.open(map, marker);
      });

      googleOverlaysRef.current.push(marker, infoWindow);
    });

    if (Object.keys(airportData).length >= 2) {
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    }
  }, [fallbackMode, validRoutes, sales]);

  // Init Leaflet fallback
  useEffect(() => {
    if (!fallbackMode || !containerRef.current || leafletMapRef.current) return;

    const map = L.map(containerRef.current, {
      scrollWheelZoom: true,
      zoomControl: true,
      dragging: true,
    }).setView([-5, -30], 3);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com">CARTO</a>',
      maxZoom: 18,
    }).addTo(map);

    leafletMapRef.current = map;
    leafletLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      leafletMapRef.current = null;
      leafletLayerRef.current = null;
    };
  }, [fallbackMode]);

  // Draw on Leaflet fallback
  useEffect(() => {
    if (!fallbackMode) return;

    const map = leafletMapRef.current;
    const layer = leafletLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const maxCount = Math.max(...validRoutes.map((r) => r.count), 1);
    const bounds: L.LatLngTuple[] = [];

    const airportData: Record<string, { count: number; revenue: number; salesList: RouteSale[] }> = {};

    validRoutes.forEach((r) => {
      if (!airportData[r.origin]) airportData[r.origin] = { count: 0, revenue: 0, salesList: [] };
      if (!airportData[r.destination]) airportData[r.destination] = { count: 0, revenue: 0, salesList: [] };
      airportData[r.origin].count += r.count;
      airportData[r.destination].count += r.count;
      airportData[r.destination].revenue += r.revenue;

      const o = AIRPORT_COORDS[r.origin];
      const d = AIRPORT_COORDS[r.destination];

      L.polyline([o, d], {
        color: "#34d399",
        weight: 2 + (r.count / maxCount) * 3,
        opacity: 0.7,
      }).addTo(layer);

      bounds.push(o, d);
    });

    sales.forEach((sale) => {
      if (sale.origin_iata && airportData[sale.origin_iata]) {
        const list = airportData[sale.origin_iata].salesList;
        if (!list.find((s) => s.id === sale.id)) list.push(sale);
      }
      if (sale.destination_iata && airportData[sale.destination_iata]) {
        const list = airportData[sale.destination_iata].salesList;
        if (!list.find((s) => s.id === sale.id)) list.push(sale);
      }
    });

    const maxAirport = Math.max(...Object.values(airportData).map((a) => a.count), 1);

    Object.entries(airportData).forEach(([iata, data]) => {
      const coords = AIRPORT_COORDS[iata];
      if (!coords) return;

      const radius = 7 + (data.count / maxAirport) * 8;
      const salesHtml = data.salesList
        .slice(0, 6)
        .map((s) => `<div data-sale-id="${s.id}" style="cursor:pointer;color:#60a5fa;text-decoration:underline;margin-top:4px;">${s.display_id || s.id.slice(0, 8)} · ${fmt(s.received_value || 0)}</div>`)
        .join("");

      const marker = L.circleMarker(coords, {
        radius,
        fillColor: "#f59e0b",
        fillOpacity: 0.85,
        color: "#34d399",
        weight: 2,
      }).addTo(layer);

      marker.bindPopup(`<div style="font-family:system-ui;min-width:180px;"><strong>${iataToLabel(iata)}</strong><br/>${data.count} rota(s) · ${fmt(data.revenue)}${salesHtml ? `<div style=\"margin-top:8px\">${salesHtml}</div>` : ""}</div>`);

      marker.on("popupopen", (event) => {
        if (!onSaleClick) return;
        const popupEl = event.popup.getElement();
        if (!popupEl) return;

        popupEl.querySelectorAll("[data-sale-id]").forEach((el) => {
          el.addEventListener("click", () => {
            const saleId = (el as HTMLElement).dataset.saleId;
            if (saleId) onSaleClick(saleId);
          });
        });
      });
    });

    if (bounds.length >= 2) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [fallbackMode, validRoutes, sales, onSaleClick]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        style={{ height }}
        className="rounded-lg overflow-hidden border border-border"
      />
      {fallbackMode && (
        <div className="absolute left-3 top-3 text-[10px] rounded-md border border-border bg-background/90 px-2 py-1 text-muted-foreground">
          Modo compatível ativo
        </div>
      )}
    </div>
  );
}
