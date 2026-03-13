import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { iataToLabel, iataToCityName } from "@/lib/iataUtils";
import { formatDateBR, formatTimeBR } from "@/lib/dateFormat";
import {
  Plane, Hotel, Car, Ticket, Shield, MapPin, Calendar, Clock,
  ChevronRight, ExternalLink, Map as MapIcon, List, Filter,
  Navigation, Maximize2, Eye,
} from "lucide-react";
import { getGoogleMapsApiKey } from "@/lib/cesium/config";

/* ───────── Airport Coordinates ───────── */
const AIRPORT_COORDS: Record<string, [number, number]> = {
  GRU: [-23.4356, -46.4731], CGH: [-23.6261, -46.6564], GIG: [-22.8090, -43.2506],
  SDU: [-22.9104, -43.1631], BSB: [-15.8711, -47.9186], CNF: [-19.6244, -43.9719],
  SSA: [-12.9086, -38.3225], REC: [-8.1264, -34.9236], FOR: [-3.7761, -38.5325],
  POA: [-29.9944, -51.1711], CWB: [-25.5285, -49.1758], BEL: [-1.3793, -48.4764],
  MAO: [-3.0386, -60.0497], VCP: [-23.0074, -47.1345], FLN: [-27.6703, -48.5525],
  NAT: [-5.7681, -35.3764], MCZ: [-9.5108, -35.7917], AJU: [-10.9840, -37.0703],
  IGU: [-25.6001, -54.4897], BPS: [-16.4386, -39.0808], VIX: [-20.2581, -40.2864],
  MIA: [25.7959, -80.2870], JFK: [40.6413, -73.7781], LAX: [33.9425, -118.4081],
  EWR: [40.6895, -74.1745], ORD: [41.9742, -87.9073], MCO: [28.4312, -81.3081],
  SFO: [37.6213, -122.3790], BOS: [42.3656, -71.0096], LAS: [36.0840, -115.1537],
  ATL: [33.6367, -84.4281], DFW: [32.8998, -97.0403],
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
  AUH: [24.4439, 54.6513], BKK: [13.6900, 100.7501], HKG: [22.3080, 113.9185],
  DEL: [28.5562, 77.1000], DPS: [-8.7482, 115.1672], KUL: [2.7456, 101.7099],
  CPH: [55.6180, 12.6508], DUB: [53.4213, -6.2701], BUD: [47.4298, 19.2611],
  ATH: [37.9364, 23.9445], ARN: [59.6519, 17.9186], GVA: [46.2381, 6.1089],
  BRU: [50.9014, 4.4844], EDI: [55.9500, -3.3725], JNB: [-26.1392, 28.2460],
  CPT: [-33.9649, 18.6017], NBO: [-1.3192, 36.9278], FLR: [43.8100, 11.2050],
  SPU: [43.5389, 16.2980], DBV: [42.5614, 18.2682], PMI: [39.5517, 2.7388],
  CGB: [-15.6528, -56.1167], CGR: [-20.4686, -54.6725], GYN: [-16.6319, -49.2206],
  JPA: [-7.1481, -34.9486], LDB: [-23.3336, -51.1301], NVT: [-26.8799, -48.6514],
  SLZ: [-2.5853, -44.2341], THE: [-5.0594, -42.8236], PMW: [-10.2915, -48.3572],
  JED: [21.6706, 39.1506], AMM: [31.7226, 35.9932], TLV: [32.0114, 34.8867],
  PEK: [40.0725, 116.5975], PVG: [31.1434, 121.8052],
};

/* ───────── Types ───────── */
interface JourneyItem {
  id: string;
  type: "flight" | "hotel" | "service" | "transfer" | "experience";
  title: string;
  subtitle?: string;
  date?: string;
  time?: string;
  iata?: string;
  coords?: [number, number];
  details: Record<string, string>;
  direction?: string;
  originIata?: string;
  destIata?: string;
}

interface PortalJourneyMapProps {
  segments: any[];
  hotels: any[];
  lodging: any[];
  services: any[];
  sale: any;
}

type FilterType = "all" | "flights" | "hotels" | "experiences";

const FILTER_OPTIONS: { key: FilterType; label: string; icon: typeof Plane }[] = [
  { key: "all", label: "Tudo", icon: MapIcon },
  { key: "flights", label: "Voos", icon: Plane },
  { key: "hotels", label: "Hotéis", icon: Hotel },
  { key: "experiences", label: "Serviços", icon: Ticket },
];

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string; marker: string }> = {
  flight: { bg: "bg-accent/10", border: "border-accent/30", text: "text-accent", marker: "#34d399" },
  hotel: { bg: "bg-warning/10", border: "border-warning/30", text: "text-warning", marker: "#f59e0b" },
  service: { bg: "bg-info/10", border: "border-info/30", text: "text-info", marker: "#60a5fa" },
  transfer: { bg: "bg-success/10", border: "border-success/30", text: "text-success", marker: "#34d399" },
  experience: { bg: "bg-primary/10", border: "border-primary/30", text: "text-primary", marker: "#a78bfa" },
};

const TYPE_ICONS: Record<string, typeof Plane> = {
  flight: Plane, hotel: Hotel, service: Ticket, transfer: Car, experience: Ticket,
};

/* ───────── Google Maps Loader Singleton ───────── */
let googleMapsReady: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (googleMapsReady) return googleMapsReady;
  if (typeof google !== "undefined" && google.maps) {
    googleMapsReady = Promise.resolve();
    return googleMapsReady;
  }
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) return Promise.reject(new Error("Google Maps API key missing"));

  googleMapsReady = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) { resolve(); return; }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&language=pt-BR&region=BR`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return googleMapsReady;
}

/* ───────── Pin SVG Generators ───────── */
function createPinSvg(color: string, emoji: string, size: number = 36): string {
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 8}" viewBox="0 0 ${size} ${size + 8}">
      <filter id="s"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.25"/></filter>
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${color}" stroke="white" stroke-width="2.5" filter="url(#s)"/>
      <text x="${size / 2}" y="${size / 2 + 1}" text-anchor="middle" dominant-baseline="central" font-size="${size * 0.4}" font-family="system-ui">${emoji}</text>
      <polygon points="${size / 2 - 4},${size - 2} ${size / 2},${size + 6} ${size / 2 + 4},${size - 2}" fill="${color}"/>
    </svg>
  `)}`;
}

/* ═══════════════════════════════════════════════════════════ */

export default function PortalJourneyMap({ segments, hotels, lodging, services, sale }: PortalJourneyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<(google.maps.Marker | google.maps.Polyline | google.maps.InfoWindow)[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [mapReady, setMapReady] = useState(false);

  // ───── Build journey items (unchanged logic) ─────
  const journeyItems = useMemo(() => {
    const items: JourneyItem[] = [];

    (segments || []).forEach((seg: any, i: number) => {
      items.push({
        id: `flight-${i}`,
        type: "flight",
        title: `${iataToCityName(seg.origin_iata)} → ${iataToCityName(seg.destination_iata)}`,
        subtitle: [seg.airline, seg.flight_number, seg.flight_class].filter(Boolean).join(" · "),
        date: seg.departure_date,
        time: seg.departure_time,
        iata: seg.origin_iata,
        originIata: seg.origin_iata,
        destIata: seg.destination_iata,
        coords: AIRPORT_COORDS[seg.origin_iata],
        direction: seg.direction,
        details: {
          ...(seg.departure_time ? { Embarque: seg.departure_time } : {}),
          ...(seg.arrival_time ? { Chegada: seg.arrival_time } : {}),
          ...(seg.terminal ? { Terminal: seg.terminal } : {}),
          ...(seg.flight_class ? { Classe: seg.flight_class } : {}),
        },
      });
    });

    (lodging || []).forEach((h: any, i: number) => {
      items.push({
        id: `hotel-${i}`,
        type: "hotel",
        title: h.hotel_name || "Hotel",
        subtitle: [h.city, h.room_type].filter(Boolean).join(" · "),
        date: h.checkin_date,
        time: "14:00",
        details: {
          ...(h.checkin_date ? { "Check-in": formatDateBR(h.checkin_date) } : {}),
          ...(h.checkout_date ? { "Check-out": formatDateBR(h.checkout_date) } : {}),
          ...(h.room_type ? { Quarto: h.room_type } : {}),
          ...(h.confirmation_number ? { Reserva: h.confirmation_number } : {}),
        },
      });
    });

    (hotels || []).forEach((h: any, i: number) => {
      if (lodging?.some((l: any) => l.hotel_name === h.description)) return;
      items.push({
        id: `hotel-cost-${i}`,
        type: "hotel",
        title: h.description || "Hotel",
        subtitle: h.reservation_code ? `Reserva: ${h.reservation_code}` : undefined,
        details: {
          ...(h.reservation_code ? { Reserva: h.reservation_code } : {}),
        },
      });
    });

    (services || []).forEach((s: any, i: number) => {
      const cat = s.product_type || s.category || "";
      const isTransfer = cat.toLowerCase().includes("transfer");
      items.push({
        id: `service-${i}`,
        type: isTransfer ? "transfer" : "service",
        title: s.description || s.category || "Serviço",
        subtitle: s.reservation_code ? `Código: ${s.reservation_code}` : undefined,
        details: {
          ...(s.product_type ? { Tipo: s.product_type } : {}),
          ...(s.reservation_code ? { Código: s.reservation_code } : {}),
        },
      });
    });

    items.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return (a.time || "").localeCompare(b.time || "");
    });

    return items;
  }, [segments, hotels, lodging, services]);

  const filteredItems = useMemo(() => {
    if (filter === "all") return journeyItems;
    if (filter === "flights") return journeyItems.filter(i => i.type === "flight");
    if (filter === "hotels") return journeyItems.filter(i => i.type === "hotel");
    return journeyItems.filter(i => i.type === "service" || i.type === "transfer" || i.type === "experience");
  }, [journeyItems, filter]);

  const uniqueCities = useMemo(() => {
    const cities = new Set<string>();
    segments?.forEach((s: any) => {
      if (s.origin_iata) cities.add(s.origin_iata);
      if (s.destination_iata) cities.add(s.destination_iata);
    });
    return cities.size;
  }, [segments]);

  const routePoints = useMemo(() => {
    const points: { iata: string; coords: [number, number]; order: number }[] = [];
    const seen = new Set<string>();
    (segments || []).forEach((seg: any, i: number) => {
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

  // ───── Initialize Google Map ─────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let cancelled = false;

    loadGoogleMaps().then(() => {
      if (cancelled || !mapContainerRef.current) return;

      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: { lat: -15, lng: -50 },
        zoom: 3,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        zoomControlOptions: { position: window.google.maps.ControlPosition.TOP_RIGHT },
        gestureHandling: "greedy",
        styles: [
          { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
          { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#c9e8f5" }] },
          { featureType: "landscape.natural", stylers: [{ color: "#f0f4e8" }] },
        ],
      });

      infoWindowRef.current = new window.google.maps.InfoWindow();
      mapRef.current = map;
      setMapReady(true);
    }).catch((err) => {
      console.error("Failed to load Google Maps:", err);
    });

    return () => {
      cancelled = true;
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // ───── Update markers & polylines ─────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Clear previous overlays
    overlaysRef.current.forEach(o => {
      if (o instanceof google.maps.Marker) o.setMap(null);
      else if (o instanceof google.maps.Polyline) o.setMap(null);
      else if (o instanceof google.maps.InfoWindow) o.close();
    });
    overlaysRef.current = [];

    const bounds = new google.maps.LatLngBounds();

    // ── Draw flight routes ──
    if (filter === "all" || filter === "flights") {
      (segments || []).forEach((seg: any) => {
        const o = seg.origin_iata && AIRPORT_COORDS[seg.origin_iata];
        const d = seg.destination_iata && AIRPORT_COORDS[seg.destination_iata];
        if (!o || !d) return;

        const isReturn = seg.direction === "volta";

        // Create a curved path using geodesic polyline
        const path = [
          { lat: o[0], lng: o[1] },
          { lat: d[0], lng: d[1] },
        ];

        const polyline = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: isReturn ? "#f59e0b" : "#34d399",
          strokeOpacity: 0.8,
          strokeWeight: 3,
          icons: isReturn ? [{
            icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 },
            offset: "0",
            repeat: "16px",
          }] : [{
            icon: {
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 3,
              strokeColor: "#34d399",
              fillColor: "#34d399",
              fillOpacity: 1,
            },
            offset: "50%",
          }],
        });
        polyline.setMap(map);
        overlaysRef.current.push(polyline);
      });
    }

    // ── City markers ──
    const showFlights = filter === "all" || filter === "flights";
    if (showFlights) {
      routePoints.forEach((pt, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === routePoints.length - 1;
        const emoji = isFirst ? "🛫" : isLast ? "🛬" : "📍";
        const color = isFirst ? "#34d399" : isLast ? "#f59e0b" : "#60a5fa";

        const marker = new google.maps.Marker({
          position: { lat: pt.coords[0], lng: pt.coords[1] },
          map,
          icon: {
            url: createPinSvg(color, emoji, isFirst || isLast ? 40 : 32),
            scaledSize: new google.maps.Size(
              isFirst || isLast ? 40 : 32,
              isFirst || isLast ? 48 : 40,
            ),
            anchor: new google.maps.Point(
              (isFirst || isLast ? 40 : 32) / 2,
              isFirst || isLast ? 48 : 40,
            ),
          },
          title: iataToCityName(pt.iata),
          zIndex: isFirst || isLast ? 10 : 5,
        });

        // InfoWindow on click
        marker.addListener("click", () => {
          const iw = infoWindowRef.current;
          if (!iw) return;
          iw.setContent(`
            <div style="font-family:system-ui;padding:6px 2px;min-width:120px;">
              <p style="font-size:15px;font-weight:700;margin:0 0 2px;">${emoji} ${iataToCityName(pt.iata)}</p>
              <p style="font-size:12px;color:#666;margin:0;">Parada ${idx + 1} de ${routePoints.length}</p>
            </div>
          `);
          iw.open(map, marker);
        });

        overlaysRef.current.push(marker);
        bounds.extend({ lat: pt.coords[0], lng: pt.coords[1] });

        // City label
        const label = new google.maps.Marker({
          position: { lat: pt.coords[0], lng: pt.coords[1] },
          map,
          icon: {
            url: `data:image/svg+xml,${encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="120" height="28">
                <rect x="0" y="0" width="120" height="28" rx="8" fill="white" fill-opacity="0.92" stroke="#e2e2e2" stroke-width="1"/>
                <text x="60" y="18" text-anchor="middle" font-size="11" font-weight="700" font-family="system-ui" fill="#333">${iataToCityName(pt.iata)}</text>
              </svg>
            `)}`,
            scaledSize: new google.maps.Size(120, 28),
            anchor: new google.maps.Point(60, -8),
          },
          clickable: false,
          zIndex: 3,
        });
        overlaysRef.current.push(label);
      });
    }

    // ── Fit bounds ──
    if (routePoints.length >= 2 && showFlights) {
      map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
    } else if (routePoints.length === 1) {
      map.setCenter({ lat: routePoints[0].coords[0], lng: routePoints[0].coords[1] });
      map.setZoom(6);
    }
  }, [segments, routePoints, filter, filteredItems, mapReady]);

  // ───── Sidebar item click → fly to ─────
  const handleItemClick = useCallback((item: JourneyItem) => {
    setSelectedItem(item.id === selectedItem ? null : item.id);
    const map = mapRef.current;
    if (!map) return;

    let target: [number, number] | undefined;
    let zoom = 6;
    if (item.originIata && AIRPORT_COORDS[item.originIata]) {
      target = AIRPORT_COORDS[item.originIata];
    } else if (item.iata && AIRPORT_COORDS[item.iata]) {
      target = AIRPORT_COORDS[item.iata];
      zoom = 8;
    }

    if (target) {
      map.panTo({ lat: target[0], lng: target[1] });
      map.setZoom(zoom);
    }
  }, [selectedItem]);

  const handleFitAll = useCallback(() => {
    const map = mapRef.current;
    if (!map || routePoints.length < 2) return;
    const bounds = new google.maps.LatLngBounds();
    routePoints.forEach(p => bounds.extend({ lat: p.coords[0], lng: p.coords[1] }));
    map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
  }, [routePoints]);

  const handleOpenExternal = useCallback((item: JourneyItem) => {
    const coords = item.originIata ? AIRPORT_COORDS[item.originIata] : item.coords;
    if (coords) {
      window.open(`https://www.google.com/maps?q=${coords[0]},${coords[1]}`, "_blank");
    }
  }, []);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: { date: string; label: string; items: JourneyItem[] }[] = [];
    let current = "";
    filteredItems.forEach(item => {
      const d = item.date || "sem-data";
      if (d !== current) {
        current = d;
        groups.push({
          date: d,
          label: d !== "sem-data" ? formatDateBR(d) : "Sem data",
          items: [item],
        });
      } else {
        groups[groups.length - 1].items.push(item);
      }
    });
    return groups;
  }, [filteredItems]);

  const summaryStats = useMemo(() => ({
    cities: uniqueCities,
    flights: (segments || []).length,
    hotels: [...(hotels || []), ...(lodging || [])].length,
    services: (services || []).length,
  }), [uniqueCities, segments, hotels, lodging, services]);

  return (
    <div className="space-y-4">
      {/* Unified Stats + Filters Bar */}
      <div className="bg-card border border-border rounded-2xl p-3 space-y-3">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: MapPin, label: "cidades", value: summaryStats.cities, accent: true },
            { icon: Plane, label: "voos", value: summaryStats.flights, accent: false },
            { icon: Hotel, label: "hotéis", value: summaryStats.hotels, accent: false },
            { icon: Ticket, label: "serviços", value: summaryStats.services, accent: false },
          ].map(stat => (
            <div
              key={stat.label}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-colors ${
                stat.accent
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-muted/60 text-muted-foreground"
              }`}
            >
              <stat.icon className="h-3.5 w-3.5" />
              <span className="font-semibold">{stat.value}</span>
              <span className="hidden sm:inline">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Filters + View Toggle Row */}
        <div className="space-y-2">
          <div className="bg-muted/50 rounded-2xl p-1.5 border border-border/50">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {FILTER_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setFilter(opt.key)}
                  className={`h-9 flex items-center justify-center gap-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                    filter === opt.key
                      ? "bg-background text-foreground border border-border shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                  }`}
                >
                  <opt.icon className="h-3.5 w-3.5" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-end gap-1.5">
            <div className="flex items-center bg-muted/50 rounded-xl p-1 gap-0.5 border border-border/40">
              <Button
                size="sm"
                variant={viewMode === "map" ? "default" : "ghost"}
                className="h-8 px-3 text-xs gap-1.5 rounded-lg"
                onClick={() => setViewMode("map")}
              >
                <MapIcon className="h-3.5 w-3.5" /> Mapa
              </Button>
              <Button
                size="sm"
                variant={viewMode === "list" ? "default" : "ghost"}
                className="h-8 px-3 text-xs gap-1.5 rounded-lg"
                onClick={() => setViewMode("list")}
              >
                <List className="h-3.5 w-3.5" /> Lista
              </Button>
            </div>
            {viewMode === "map" && routePoints.length >= 2 && (
              <button
                onClick={handleFitAll}
                className="h-8 px-3 flex items-center gap-1.5 rounded-xl text-xs font-medium bg-muted/50 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted transition-all whitespace-nowrap"
              >
                <Maximize2 className="h-3 w-3" /> Ajustar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Map + Sidebar Layout */}
      {viewMode === "map" ? (
        <div className="flex flex-col lg:flex-row gap-0 rounded-2xl overflow-hidden border border-border bg-card shadow-lg">
          {/* Map Container */}
          <div className="flex-1 min-h-[300px] lg:min-h-[480px] relative">
            <div ref={mapContainerRef} className="absolute inset-0" />
            {/* Legend */}
            <div className="absolute bottom-3 left-3 z-[10] bg-card/90 backdrop-blur-md rounded-xl px-3.5 py-2 border border-border shadow-md flex items-center gap-4">
              <span className="flex items-center gap-2 text-[11px] text-foreground/80 font-medium">
                <span className="w-5 h-0.5 bg-accent inline-block rounded-full" /> Ida
              </span>
              <span className="flex items-center gap-2 text-[11px] text-foreground/80 font-medium">
                <span className="w-5 h-0.5 border-t-2 border-dashed border-warning inline-block" /> Volta
              </span>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:w-[340px] w-full border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col max-h-[320px] lg:max-h-[480px]">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Navigation className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold text-foreground">Roteiro</span>
              <Badge variant="secondary" className="ml-auto text-[10px]">{filteredItems.length}</Badge>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-1">
                {groupedByDate.map((group, gi) => (
                  <div key={gi}>
                    {group.date !== "sem-data" && (
                      <div className="flex items-center gap-2 px-2 pt-3 pb-1.5 first:pt-0">
                        <Calendar className="w-3 h-3 text-accent/60" />
                        <span className="text-[11px] font-bold text-foreground/70 tracking-wide">{group.label}</span>
                        <div className="flex-1 h-px bg-border/30 ml-1" />
                      </div>
                    )}
                    {group.items.map((item) => {
                      const Icon = TYPE_ICONS[item.type] || Ticket;
                      const colors = TYPE_COLORS[item.type] || TYPE_COLORS.service;
                      const isSelected = selectedItem === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleItemClick(item)}
                          className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all ${
                            isSelected ? `${colors.bg} ${colors.border} border` : "hover:bg-muted/50 border border-transparent"
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg ${colors.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                            <Icon className={`h-3.5 w-3.5 ${colors.text}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                            {item.subtitle && <p className="text-[10px] text-muted-foreground truncate">{item.subtitle}</p>}
                            {item.time && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Clock className="h-2.5 w-2.5" /> {item.time}
                              </span>
                            )}
                          </div>
                          {item.originIata && AIRPORT_COORDS[item.originIata] && (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
                {filteredItems.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">Nenhum item nesta categoria</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {groupedByDate.map((group, gi) => (
            <div key={gi}>
              {group.date !== "sem-data" && (
                <div className="flex items-center gap-2 px-1 pt-4 pb-2">
                  <Calendar className="w-4 h-4 text-accent" />
                  <span className="text-sm font-bold text-foreground">{group.label}</span>
                  <div className="flex-1 h-px bg-border/40 ml-2" />
                </div>
              )}
              {group.items.map((item) => {
                const Icon = TYPE_ICONS[item.type] || Ticket;
                const colors = TYPE_COLORS[item.type] || TYPE_COLORS.service;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all`}
                  >
                    <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-5 w-5 ${colors.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      {item.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>}
                      {Object.keys(item.details).length > 0 && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                          {Object.entries(item.details).map(([k, v]) => v && (
                            <div key={k} className="flex items-baseline gap-1">
                              <span className="text-[10px] text-muted-foreground/60 font-medium">{k}</span>
                              <span className="text-[11px] font-medium text-foreground/80">{v}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {item.time && (
                        <Badge variant="secondary" className="text-[10px]">
                          <Clock className="h-2.5 w-2.5 mr-1" /> {item.time}
                        </Badge>
                      )}
                      {item.originIata && AIRPORT_COORDS[item.originIata] && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[10px] gap-1"
                          onClick={() => handleOpenExternal(item)}
                        >
                          <ExternalLink className="h-2.5 w-2.5" /> Maps
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <MapIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum item nesta categoria</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
