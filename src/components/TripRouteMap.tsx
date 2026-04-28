import { useEffect, useRef, useMemo } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { isLeafletAvailable, LeafletUnavailableNotice } from "@/components/maps/LeafletGuard";
import { iataToLabel } from "@/lib/iataUtils";
import { formatDateBR, formatTimeBR } from "@/lib/dateFormat";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plane, Hotel, Car, Ticket, Shield, ShoppingBag, Train, MapPin, Clock, Calendar,
} from "lucide-react";

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
  STR: [48.6899, 9.2220],
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const TYPE_ICON: Record<string, typeof Plane> = {
  aereo: Plane, hotel: Hotel, trem: Train, transfer: Car,
  passeio: Ticket, seguro: Shield, ingresso: Ticket,
  aluguel_carro: Car, outros: ShoppingBag,
};

const TYPE_LABEL: Record<string, string> = {
  aereo: "Voo", hotel: "Hospedagem", trem: "Trem", transfer: "Transfer",
  passeio: "Passeio", seguro: "Seguro", ingresso: "Ingresso",
  aluguel_carro: "Aluguel", outros: "Serviço",
};

const TYPE_BG: Record<string, string> = {
  aereo: "bg-blue-500/15 text-blue-400 ring-blue-500/20",
  hotel: "bg-amber-500/15 text-amber-400 ring-amber-500/20",
  trem: "bg-purple-500/15 text-purple-400 ring-purple-500/20",
  transfer: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/20",
  passeio: "bg-pink-500/15 text-pink-400 ring-pink-500/20",
  seguro: "bg-cyan-500/15 text-cyan-400 ring-cyan-500/20",
  ingresso: "bg-orange-500/15 text-orange-400 ring-orange-500/20",
  aluguel_carro: "bg-teal-500/15 text-teal-400 ring-teal-500/20",
  outros: "bg-muted/50 text-muted-foreground ring-border",
};

export interface TripSegment {
  origin_iata?: string;
  destination_iata?: string;
  departure_date?: string;
  departure_time?: string;
  arrival_time?: string;
  airline?: string;
  flight_number?: string;
  flight_class?: string;
  duration_minutes?: number;
  terminal?: string;
  direction?: string;
}

export interface TripService {
  type: string;
  title: string;
  subtitle?: string;
  date?: string;
  time?: string;
  value?: number;
  reservationCode?: string;
  details?: Record<string, string>;
}

interface TripRouteMapProps {
  segments: TripSegment[];
  services: TripService[];
  hotelInfo?: {
    name: string;
    city?: string;
    checkinDate?: string;
    checkoutDate?: string;
    room?: string;
    mealPlan?: string;
    reservationCode?: string;
    address?: string;
  };
  height?: string;
}

function TripRouteMapInner({ segments, services, hotelInfo, height = "450px" }: TripRouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const routePoints = useMemo(() => {
    const points: { iata: string; coords: [number, number]; order: number }[] = [];
    const seen = new Set<string>();

    segments.forEach((seg, i) => {
      if (seg.origin_iata && AIRPORT_COORDS[seg.origin_iata] && !seen.has(seg.origin_iata)) {
        points.push({ iata: seg.origin_iata, coords: AIRPORT_COORDS[seg.origin_iata], order: i * 2 });
        seen.add(seg.origin_iata);
      }
      if (seg.destination_iata && AIRPORT_COORDS[seg.destination_iata] && !seen.has(seg.destination_iata)) {
        points.push({ iata: seg.destination_iata, coords: AIRPORT_COORDS[seg.destination_iata], order: i * 2 + 1 });
        seen.add(seg.destination_iata);
      }
    });

    return points;
  }, [segments]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      scrollWheelZoom: true,
      zoomControl: true,
      dragging: true,
    }).setView([-15, -50], 4);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com">CARTO</a>',
      maxZoom: 18,
    }).addTo(map);

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.eachLayer(layer => {
      if (!(layer instanceof L.TileLayer)) map.removeLayer(layer);
    });

    // Draw route lines
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const o = seg.origin_iata && AIRPORT_COORDS[seg.origin_iata];
      const d = seg.destination_iata && AIRPORT_COORDS[seg.destination_iata];
      if (!o || !d) continue;

      const midLat = (o[0] + d[0]) / 2;
      const midLng = (o[1] + d[1]) / 2;
      const dx = d[1] - o[1];
      const dy = d[0] - o[0];
      const dist = Math.sqrt(dx * dx + dy * dy);
      const curvature = dist * 0.15;
      const curvedMid: [number, number] = [midLat + curvature * 0.3, midLng];

      const isReturn = seg.direction === "volta";
      const color = isReturn ? "hsl(38, 92%, 50%)" : "hsl(160, 60%, 50%)";

      L.polyline([o, curvedMid, d], {
        color,
        weight: 3,
        opacity: 0.8,
        smoothFactor: 3,
        dashArray: isReturn ? "8 6" : undefined,
      }).bindPopup(
        `<div style="font-family:system-ui,sans-serif;font-size:12px;line-height:1.5;">
          <strong>${seg.airline || ""} ${seg.flight_number || ""}</strong><br/>
          ${iataToLabel(seg.origin_iata!)} → ${iataToLabel(seg.destination_iata!)}<br/>
          ${seg.departure_date ? formatDateBR(seg.departure_date) : ""}
          ${seg.departure_time ? ` às ${formatTimeBR(seg.departure_time)}` : ""}
        </div>`
      ).addTo(map);
    }

    // Draw airport markers
    routePoints.forEach((pt, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === routePoints.length - 1;

      const marker = L.circleMarker(pt.coords, {
        radius: isFirst || isLast ? 10 : 7,
        fillColor: isFirst ? "hsl(160, 60%, 50%)" : isLast ? "hsl(38, 92%, 50%)" : "hsl(220, 70%, 60%)",
        fillOpacity: 0.9,
        color: "#fff",
        weight: 2,
      });

      marker.bindPopup(
        `<div style="font-family:system-ui,sans-serif;font-size:13px;font-weight:700;">
          ${isFirst ? "🛫 " : isLast ? "🛬 " : "📍 "}${iataToLabel(pt.iata)}
        </div>`
      );

      const label = L.divIcon({
        className: "",
        html: `<div style="font-family:system-ui,sans-serif;font-size:10px;font-weight:700;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,0.8);white-space:nowrap;transform:translateX(-50%);">${pt.iata}</div>`,
        iconSize: [40, 14],
        iconAnchor: [20, -8],
      });
      L.marker(pt.coords, { icon: label, interactive: false }).addTo(map);
      marker.addTo(map);
    });

    if (routePoints.length >= 2) {
      const bounds = routePoints.map(p => p.coords);
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50] });
    } else if (routePoints.length === 1) {
      map.setView(routePoints[0].coords, 6);
    }
  }, [segments, routePoints]);

  // Build itinerary items
  const allItems = useMemo(() => {
    const items: TripService[] = [];

    segments.forEach(seg => {
      items.push({
        type: "aereo",
        title: `${iataToLabel(seg.origin_iata || "?")} → ${iataToLabel(seg.destination_iata || "?")}`,
        subtitle: [seg.airline, seg.flight_number, seg.flight_class].filter(Boolean).join(" • "),
        date: seg.departure_date,
        time: seg.departure_time,
        details: {
          ...(seg.departure_time ? { "Embarque": formatTimeBR(seg.departure_time) } : {}),
          ...(seg.arrival_time ? { "Pouso": formatTimeBR(seg.arrival_time) } : {}),
          ...(seg.duration_minutes ? { "Duração": `${Math.floor(seg.duration_minutes / 60)}h${seg.duration_minutes % 60 > 0 ? `${String(seg.duration_minutes % 60).padStart(2, "0")}min` : ""}` } : {}),
          ...(seg.terminal ? { "Terminal": seg.terminal } : {}),
        },
      });
    });

    if (hotelInfo?.name) {
      items.push({
        type: "hotel",
        title: hotelInfo.name,
        subtitle: [hotelInfo.city, hotelInfo.room ? `Quarto ${hotelInfo.room}` : null, hotelInfo.mealPlan].filter(Boolean).join(" · "),
        date: hotelInfo.checkinDate,
        time: "14:00",
        reservationCode: hotelInfo.reservationCode,
        details: {
          ...(hotelInfo.room ? { "Quarto": hotelInfo.room } : {}),
          ...(hotelInfo.mealPlan ? { "Refeição": hotelInfo.mealPlan } : {}),
          ...(hotelInfo.address ? { "Endereço": hotelInfo.address } : {}),
        },
      });
      if (hotelInfo.checkoutDate) {
        items.push({
          type: "hotel",
          title: hotelInfo.name,
          subtitle: `Check-out · ${hotelInfo.city || ""}`,
          date: hotelInfo.checkoutDate,
          time: "12:00",
          reservationCode: hotelInfo.reservationCode,
        });
      }
    }

    items.push(...services);

    items.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return (a.time || "").localeCompare(b.time || "");
    });

    return items;
  }, [segments, hotelInfo, services]);

  // Group items by date for cleaner presentation
  const groupedByDate = useMemo(() => {
    const groups: { date: string; items: TripService[] }[] = [];
    let currentDate = "";
    allItems.forEach(item => {
      const d = item.date || "sem-data";
      if (d !== currentDate) {
        currentDate = d;
        groups.push({ date: d, items: [item] });
      } else {
        groups[groups.length - 1].items.push(item);
      }
    });
    return groups;
  }, [allItems]);

  return (
    <div className="flex flex-col lg:flex-row gap-0 rounded-xl overflow-hidden border border-border/50 bg-card shadow-lg" style={{ height }}>
      {/* Map */}
      <div className="flex-1 min-h-[250px] relative">
        <div ref={containerRef} className="absolute inset-0" />
        {/* Legend overlay */}
        <div className="absolute bottom-3 left-3 z-[1000] bg-card/90 backdrop-blur-md rounded-lg px-3.5 py-2.5 border border-border/50 shadow-md flex items-center gap-4">
          <span className="flex items-center gap-2 text-[11px] text-foreground/80 font-medium">
            <span className="w-6 h-0.5 bg-[hsl(160,60%,50%)] inline-block rounded-full" /> Ida
          </span>
          <span className="flex items-center gap-2 text-[11px] text-foreground/80 font-medium">
            <span className="w-6 h-0.5 border-t-2 border-dashed border-[hsl(38,92%,50%)] inline-block" /> Volta
          </span>
        </div>
      </div>

      {/* Sidebar – Itinerário */}
      <div className="lg:w-[370px] w-full border-t lg:border-t-0 lg:border-l border-border/50 bg-gradient-to-b from-card to-card/80 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-border/50 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <MapPin className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="text-[13px] font-bold text-foreground tracking-tight">Itinerário Completo</h4>
            <p className="text-[10px] text-muted-foreground">Cronologia da viagem</p>
          </div>
          <Badge variant="secondary" className="text-[10px] font-semibold tabular-nums px-2.5">
            {allItems.length} {allItems.length === 1 ? "item" : "itens"}
          </Badge>
        </div>

        {/* Items */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-0.5">
            {groupedByDate.map((group, gi) => (
              <div key={gi}>
                {/* Date header */}
                {group.date !== "sem-data" && (
                  <div className="flex items-center gap-2 px-1 pt-3 pb-2 first:pt-0">
                    <Calendar className="w-3.5 h-3.5 text-primary/60" />
                    <span className="text-[11px] font-bold text-foreground/80 tracking-wide">
                      {formatDateBR(group.date)}
                    </span>
                    <div className="flex-1 h-px bg-border/40 ml-1" />
                  </div>
                )}

                {/* Items within date */}
                {group.items.map((item, i) => {
                  const Icon = TYPE_ICON[item.type] || ShoppingBag;
                  const bgClass = TYPE_BG[item.type] || TYPE_BG.outros;
                  const label = TYPE_LABEL[item.type] || "Serviço";
                  const isCheckin = item.title?.toLowerCase().includes("check-in") || 
                    (item.type === "hotel" && !item.subtitle?.toLowerCase().includes("check-out"));
                  const isCheckout = item.subtitle?.toLowerCase().includes("check-out");

                  return (
                    <div
                      key={`${gi}-${i}`}
                      className="group relative flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-muted/20 transition-all duration-200"
                    >
                      {/* Timeline connector */}
                      {i < group.items.length - 1 && (
                        <div className="absolute left-[22px] top-[38px] bottom-0 w-px bg-border/30" />
                      )}

                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-xl ring-1 flex items-center justify-center shrink-0 ${bgClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        {/* Top row: time + type badge */}
                        <div className="flex items-center gap-2">
                          {item.time && (
                            <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                              {formatTimeBR(item.time)}
                            </span>
                          )}
                          <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                            {isCheckin ? "Check-in" : isCheckout ? "Check-out" : label}
                          </span>
                        </div>

                        {/* Title */}
                        <p className="text-[13px] font-semibold text-foreground leading-tight">
                          {item.title}
                        </p>

                        {/* Subtitle */}
                        {item.subtitle && (
                          <p className="text-[11px] text-muted-foreground leading-snug">
                            {item.subtitle}
                          </p>
                        )}

                        {/* Details grid */}
                        {item.details && Object.keys(item.details).length > 0 && (
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                            {Object.entries(item.details).map(([k, v]) => v && (
                              <div key={k} className="flex items-baseline gap-1">
                                <span className="text-[10px] text-muted-foreground/50 font-medium">{k}</span>
                                <span className="text-[11px] font-medium text-foreground/80">{v}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Bottom row: reservation code + value */}
                        {(item.reservationCode || (item.value != null && item.value > 0)) && (
                          <div className="flex items-center gap-3 mt-1.5">
                            {item.reservationCode && (
                              <span className="text-[10px] font-mono font-medium bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-md border border-border/30">
                                {item.reservationCode}
                              </span>
                            )}
                            {item.value != null && item.value > 0 && (
                              <span className="text-[11px] font-bold text-primary">{fmt(item.value)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {allItems.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-5 h-5 opacity-40" />
                </div>
                <p className="text-sm font-medium">Nenhum item no itinerário</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Adicione voos, hospedagens ou serviços</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
