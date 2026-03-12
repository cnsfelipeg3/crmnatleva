import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { iataToLabel } from "@/lib/iataUtils";
import { formatDateBR } from "@/lib/dateFormat";

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
  /** Sales data for drill-down popups */
  sales?: RouteSale[];
  /** Called when user clicks a sale in a popup */
  onSaleClick?: (saleId: string) => void;
}

export default function RoutesMap({ routes, height = "400px", sales = [], onSaleClick }: RoutesMapProps) {
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

  // Store onSaleClick in ref so popup event handlers always get latest
  const onSaleClickRef = useRef(onSaleClick);
  onSaleClickRef.current = onSaleClick;

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.eachLayer(layer => {
      if (!(layer instanceof L.TileLayer)) map.removeLayer(layer);
    });

    // Build airport data with associated sales
    const airportData: Record<string, { count: number; revenue: number; salesList: RouteSale[] }> = {};
    const maxCount = Math.max(...validRoutes.map(r => r.count), 1);

    // Initialize airports from routes
    validRoutes.forEach(r => {
      if (!airportData[r.origin]) airportData[r.origin] = { count: 0, revenue: 0, salesList: [] };
      if (!airportData[r.destination]) airportData[r.destination] = { count: 0, revenue: 0, salesList: [] };
      airportData[r.origin].count += r.count;
      airportData[r.destination].count += r.count;
      airportData[r.destination].revenue += r.revenue;
    });

    // Associate sales to airports
    sales.forEach(sale => {
      if (sale.origin_iata && airportData[sale.origin_iata]) {
        const list = airportData[sale.origin_iata].salesList;
        if (!list.find(s => s.id === sale.id)) list.push(sale);
      }
      if (sale.destination_iata && airportData[sale.destination_iata]) {
        const list = airportData[sale.destination_iata].salesList;
        if (!list.find(s => s.id === sale.id)) list.push(sale);
      }
    });

    // Draw route lines
    validRoutes.forEach(r => {
      const o = AIRPORT_COORDS[r.origin];
      const d = AIRPORT_COORDS[r.destination];
      const opacity = 0.3 + (r.count / maxCount) * 0.7;
      const weight = 1 + (r.count / maxCount) * 4;

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

    // Draw airport markers with drill-down popups
    const maxAirport = Math.max(...Object.values(airportData).map(a => a.count), 1);

    Object.entries(airportData).forEach(([iata, data]) => {
      const coords = AIRPORT_COORDS[iata];
      if (!coords) return;
      const radius = 4 + (data.count / maxAirport) * 12;

      const marker = L.circleMarker(coords, {
        radius,
        fillColor: "hsl(38, 92%, 50%)",
        fillOpacity: 0.85,
        color: "hsl(160, 60%, 30%)",
        weight: 1.5,
      });

      // Build popup content
      const hasSales = data.salesList.length > 0;
      const salesRows = data.salesList.slice(0, 15).map(sale => {
        const route = [sale.origin_iata, sale.destination_iata].filter(Boolean).join(" → ");
        return `<tr class="map-sale-row" data-sale-id="${sale.id}" style="cursor:pointer;">
          <td style="padding:3px 6px;font-size:11px;color:#60a5fa;text-decoration:underline;">${sale.display_id || sale.id.slice(0, 8)}</td>
          <td style="padding:3px 6px;font-size:11px;">${sale.name || "—"}</td>
          <td style="padding:3px 6px;font-size:11px;">${route}</td>
          <td style="padding:3px 6px;font-size:11px;">${sale.departure_date ? formatDateBR(sale.departure_date) : "—"}</td>
          <td style="padding:3px 6px;font-size:11px;text-align:right;">${fmt(sale.received_value || 0)}</td>
        </tr>`;
      }).join("");

      const moreText = data.salesList.length > 15 ? `<p style="font-size:10px;color:#888;margin-top:4px;">+ ${data.salesList.length - 15} mais...</p>` : "";

      const popupContent = `
        <div style="font-family:sans-serif;min-width:${hasSales ? '380px' : '140px'};max-width:480px;">
          <div style="font-size:13px;font-weight:700;margin-bottom:6px;">${iataToLabel(iata)}</div>
          <div style="font-size:11px;color:#aaa;margin-bottom:8px;">${data.count} voo(s) · Receita: ${fmt(data.revenue)}</div>
          ${hasSales ? `
            <table style="width:100%;border-collapse:collapse;border-top:1px solid #333;">
              <thead>
                <tr style="background:#1a1a2e;">
                  <th style="padding:4px 6px;font-size:10px;text-align:left;color:#888;font-weight:600;">ID</th>
                  <th style="padding:4px 6px;font-size:10px;text-align:left;color:#888;font-weight:600;">Cliente</th>
                  <th style="padding:4px 6px;font-size:10px;text-align:left;color:#888;font-weight:600;">Rota</th>
                  <th style="padding:4px 6px;font-size:10px;text-align:left;color:#888;font-weight:600;">Data</th>
                  <th style="padding:4px 6px;font-size:10px;text-align:right;color:#888;font-weight:600;">Valor</th>
                </tr>
              </thead>
              <tbody>${salesRows}</tbody>
            </table>
            ${moreText}
          ` : ""}
        </div>
      `;

      const popup = L.popup({ maxWidth: 500, className: "map-drilldown-popup" }).setContent(popupContent);
      marker.bindPopup(popup);

      // Add click handler for sale rows after popup opens
      marker.on("popupopen", () => {
        const container = popup.getElement();
        if (!container) return;
        const rows = container.querySelectorAll(".map-sale-row");
        rows.forEach(row => {
          row.addEventListener("click", () => {
            const saleId = (row as HTMLElement).dataset.saleId;
            if (saleId && onSaleClickRef.current) {
              onSaleClickRef.current(saleId);
            }
          });
          // Hover effect
          (row as HTMLElement).addEventListener("mouseenter", () => {
            (row as HTMLElement).style.background = "rgba(96,165,250,0.1)";
          });
          (row as HTMLElement).addEventListener("mouseleave", () => {
            (row as HTMLElement).style.background = "";
          });
        });
      });

      marker.addTo(map);
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
  }, [validRoutes, sales]);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="rounded-lg overflow-hidden border border-border"
    />
  );
}
