import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { iataToLabel, iataToCityName } from "@/lib/iataUtils";
import { formatDateBR, formatTimeBR } from "@/lib/dateFormat";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Plane, Hotel, Car, Ticket, Shield, MapPin, Calendar, Clock,
  ChevronRight, ChevronDown, ExternalLink, Map as MapIcon, List, Filter,
  Navigation, Maximize2, Eye, LocateFixed, Copy, Info, X,
  Sunrise, Sunset, Luggage, Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  FTE: [-51.6092, -69.3125], AEP: [-34.5592, -58.4156],
};

/* ───────── Types ───────── */
type FilterType = "all" | "flights" | "hotels" | "services";

interface JourneyItem {
  id: string;
  type: "flight" | "hotel" | "service" | "transfer" | "experience";
  title: string;
  subtitle?: string;
  date?: string;
  endDate?: string;
  time?: string;
  iata?: string;
  originIata?: string;
  destIata?: string;
  coords?: [number, number];
  direction?: string;
  details: Record<string, string>;
  isPast: boolean;
  isCurrent: boolean;
}

/* ───────── Constants ───────── */
const TYPE_ICONS: Record<string, typeof Plane> = {
  flight: Plane, hotel: Hotel, service: Ticket, transfer: Car, experience: Compass,
};

/* ───────── Custom Leaflet Icons ───────── */
function createPulsingIcon(color: string, size: number = 14): L.DivIcon {
  return L.divIcon({
    className: "",
    iconSize: [size * 3, size * 3],
    iconAnchor: [size * 1.5, size * 1.5],
    html: `<div style="position:relative;width:${size * 3}px;height:${size * 3}px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:${size * 3}px;height:${size * 3}px;border-radius:50%;background:${color};opacity:0.15;animation:pulse-ring 2s ease-out infinite;"></div>
      <div style="position:absolute;width:${size * 1.5}px;height:${size * 1.5}px;border-radius:50%;background:${color};opacity:0.3;animation:pulse-ring 2s ease-out infinite 0.3s;"></div>
      <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);position:relative;z-index:2;"></div>
    </div>`,
  });
}

const CITY_SVGS: Record<string, string> = {
  origin: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`,
  connection: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>`,
  destination: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  current: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2"/></svg>`,
  finish: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>`,
};

function createCityMarker(type: string, name: string, isCurrent: boolean): L.DivIcon {
  const colors: Record<string, string> = {
    origin: "#10b981",
    connection: "#60a5fa",
    destination: "#f59e0b",
    current: "#10b981",
    finish: "#f59e0b",
  };
  const color = isCurrent ? "#10b981" : (colors[type] || "#94a3b8");
  const dotSize = isCurrent ? 12 : 9;
  const outerGlow = isCurrent ? `box-shadow:0 0 0 4px ${color}33, 0 1px 4px rgba(0,0,0,0.3);` : `box-shadow:0 1px 4px rgba(0,0,0,0.3);`;

  return L.divIcon({
    className: "",
    iconSize: [80, 30],
    iconAnchor: [dotSize / 2 + 4, 15],
    popupAnchor: [36, -10],
    html: `<div style="display:flex;align-items:center;gap:6px;pointer-events:auto;">
      <div style="width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.9);${outerGlow}flex-shrink:0;"></div>
      <div style="background:rgba(15,23,42,0.82);backdrop-filter:blur(6px);border-radius:6px;padding:2px 8px;font-size:10px;font-weight:600;color:white;white-space:nowrap;font-family:'Inter',system-ui,sans-serif;letter-spacing:0.01em;line-height:1.4;border:1px solid rgba(255,255,255,0.1);">${name}</div>
    </div>`,
  });
}

function createAirplaneIcon(angle: number): L.DivIcon {
  return L.divIcon({
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    html: `<div style="width:20px;height:20px;display:flex;align-items:center;justify-content:center;transform:rotate(${angle}deg);filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3));">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="#34d399" stroke="white" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>
    </div>`,
  });
}

/* Curved polyline helper */
function getCurvedPoints(from: L.LatLng, to: L.LatLng, segments = 50): L.LatLng[] {
  const points: L.LatLng[] = [];
  const midLat = (from.lat + to.lat) / 2;
  const midLng = (from.lng + to.lng) / 2;
  const dist = from.distanceTo(to);
  const curvature = Math.min(dist / 4000000, 0.3) * 15;
  const dx = to.lng - from.lng;
  const dy = to.lat - from.lat;
  const perpLat = midLat + curvature * (-dx / Math.sqrt(dx * dx + dy * dy + 0.001));
  const perpLng = midLng + curvature * (dy / Math.sqrt(dx * dx + dy * dy + 0.001));

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const lat = (1 - t) * (1 - t) * from.lat + 2 * (1 - t) * t * perpLat + t * t * to.lat;
    const lng = (1 - t) * (1 - t) * from.lng + 2 * (1 - t) * t * perpLng + t * t * to.lng;
    points.push(L.latLng(lat, lng));
  }
  return points;
}

/* ───────── Determine traveler's current location ───────── */
function inferCurrentLocation(segments: any[]): { iata: string; coords: [number, number] } | null {
  if (!segments || segments.length === 0) return null;
  const now = new Date();

  // Sort segments by departure
  const sorted = [...segments]
    .filter((s: any) => s.departure_date)
    .sort((a: any, b: any) => {
      const da = `${a.departure_date}T${a.departure_time || "00:00"}`;
      const db = `${b.departure_date}T${b.departure_time || "00:00"}`;
      return da.localeCompare(db);
    });

  if (sorted.length === 0) return null;

  // Check if trip hasn't started yet
  const firstDeparture = new Date(`${sorted[0].departure_date}T${sorted[0].departure_time || "00:00"}`);
  if (now < firstDeparture) return null;

  // Check if trip is over
  const lastSeg = sorted[sorted.length - 1];
  const lastArrival = new Date(`${lastSeg.departure_date}T${lastSeg.arrival_time || "23:59"}`);
  if (now > new Date(lastArrival.getTime() + 24 * 60 * 60 * 1000)) return null;

  // Find current segment — traveler is at the destination of the last departed flight
  for (let i = sorted.length - 1; i >= 0; i--) {
    const dep = new Date(`${sorted[i].departure_date}T${sorted[i].departure_time || "00:00"}`);
    if (now >= dep) {
      const destIata = sorted[i].destination_iata;
      if (destIata && AIRPORT_COORDS[destIata]) {
        return { iata: destIata, coords: AIRPORT_COORDS[destIata] };
      }
    }
  }

  return null;
}

/* ───────── Props ───────── */
interface PortalJourneyMapProps {
  segments: any[];
  hotels: any[];
  lodging?: any[];
  services?: any[];
  sale?: any;
}

/* ═══════════════════════════════════════════════════════════ */
export default function PortalJourneyMap({ segments, hotels, lodging, services, sale }: PortalJourneyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapStyle, setMapStyle] = useState<"light" | "dark" | "satellite">("dark");
  const containerRef = useRef<HTMLDivElement>(null);

  const now = useMemo(() => new Date(), []);

  const currentLocation = useMemo(() => inferCurrentLocation(segments), [segments]);
  const isTraveling = currentLocation !== null;

  // ───── Build journey items ─────
  const journeyItems = useMemo(() => {
    const items: JourneyItem[] = [];

    (segments || []).forEach((seg: any, i: number) => {
      const depDate = seg.departure_date ? new Date(`${seg.departure_date}T${seg.departure_time || "23:59"}`) : null;
      const isPast = depDate ? depDate < now : false;
      const isCurrent = depDate ? (Math.abs(depDate.getTime() - now.getTime()) < 12 * 60 * 60 * 1000) : false;

      const locatorInfo = seg.locator || seg.reservation_code || "";

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
        isPast,
        isCurrent,
        details: {
          ...(seg.departure_time ? { "Embarque": seg.departure_time } : {}),
          ...(seg.arrival_time ? { "Chegada": seg.arrival_time } : {}),
          ...(seg.terminal ? { "Terminal": seg.terminal } : {}),
          ...(seg.flight_class ? { "Classe": seg.flight_class } : {}),
          ...(seg.airline ? { "Cia Aérea": seg.airline } : {}),
          ...(seg.flight_number ? { "Voo": seg.flight_number } : {}),
          ...(locatorInfo ? { "Localizador": locatorInfo } : {}),
          ...(seg.seat ? { "Assento": seg.seat } : {}),
          ...(seg.baggage ? { "Bagagem": seg.baggage } : {}),
        },
      });
    });

    (lodging || []).forEach((h: any, i: number) => {
      const checkinDate = h.checkin_date ? new Date(h.checkin_date) : null;
      const checkoutDate = h.checkout_date ? new Date(h.checkout_date) : null;
      const isPast = checkoutDate ? checkoutDate < now : false;
      const isCurrent = checkinDate && checkoutDate ? (now >= checkinDate && now <= checkoutDate) : false;

      items.push({
        id: `hotel-${i}`,
        type: "hotel",
        title: h.hotel_name || "Hotel",
        subtitle: [h.city, h.room_type].filter(Boolean).join(" · "),
        date: h.checkin_date,
        endDate: h.checkout_date,
        time: "14:00",
        isPast,
        isCurrent,
        details: {
          ...(h.checkin_date ? { "Check-in": formatDateBR(h.checkin_date) } : {}),
          ...(h.checkout_date ? { "Check-out": formatDateBR(h.checkout_date) } : {}),
          ...(h.room_type ? { "Quarto": h.room_type } : {}),
          ...(h.confirmation_number ? { "Reserva": h.confirmation_number } : {}),
          ...(h.meal_plan ? { "Regime": h.meal_plan } : {}),
          ...(h.address ? { "Endereço": h.address } : {}),
          ...(h.phone ? { "Telefone": h.phone } : {}),
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
        isPast: false,
        isCurrent: false,
        details: {
          ...(h.reservation_code ? { "Reserva": h.reservation_code } : {}),
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
        isPast: false,
        isCurrent: false,
        details: {
          ...(s.product_type ? { "Tipo": s.product_type } : {}),
          ...(s.reservation_code ? { "Código": s.reservation_code } : {}),
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
  }, [segments, hotels, lodging, services, now]);

  const filteredItems = useMemo(() => {
    if (filter === "all") return journeyItems;
    if (filter === "flights") return journeyItems.filter(i => i.type === "flight");
    if (filter === "hotels") return journeyItems.filter(i => i.type === "hotel");
    return journeyItems.filter(i => i.type === "service" || i.type === "transfer" || i.type === "experience");
  }, [journeyItems, filter]);

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

  /* ── Tile URLs ── */
  const tileUrl = useMemo(() => {
    switch (mapStyle) {
      case "dark": return "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
      case "satellite": return "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
      default: return "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
    }
  }, [mapStyle]);

  // ───── Initialize Leaflet Map (once) ─────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-15, -50],
      zoom: 3,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: "topright" }).addTo(map);

    tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);
    layerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
      tileLayerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ───── Swap tile layer on style change ─────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);
    // Ensure overlay stays on top by re-adding
    if (layerGroupRef.current) {
      layerGroupRef.current.removeFrom(map);
      layerGroupRef.current.addTo(map);
    }
  }, [tileUrl]);

  // ───── Update markers & polylines ─────
  useEffect(() => {
    const map = mapRef.current;
    const lg = layerGroupRef.current;
    if (!map || !lg) return;

    lg.clearLayers();
    const bounds = L.latLngBounds([]);

    // ── Draw curved flight routes ──
    if (filter === "all" || filter === "flights") {
      (segments || []).forEach((seg: any) => {
        const o = seg.origin_iata && AIRPORT_COORDS[seg.origin_iata];
        const d = seg.destination_iata && AIRPORT_COORDS[seg.destination_iata];
        if (!o || !d) return;

        const isReturn = seg.direction === "volta";
        const from = L.latLng(o[0], o[1]);
        const to = L.latLng(d[0], d[1]);
        const curvedPts = getCurvedPoints(from, to);

        // Shadow line for depth
        const shadowLine = L.polyline(curvedPts, {
          color: isReturn ? "#f59e0b" : "#10b981",
          weight: 6,
          opacity: 0.12,
          smoothFactor: 2,
          lineCap: "round",
          lineJoin: "round",
        });
        lg.addLayer(shadowLine);

        const polyline = L.polyline(curvedPts, {
          color: isReturn ? "#f59e0b" : "#34d399",
          weight: 2.5,
          opacity: isReturn ? 0.65 : 0.85,
          dashArray: isReturn ? "8 6" : undefined,
          smoothFactor: 2,
          lineCap: "round",
          lineJoin: "round",
        });
        lg.addLayer(polyline);

        // Airplane on midpoint
        const midPt = curvedPts[Math.floor(curvedPts.length / 2)];
        const nextPt = curvedPts[Math.floor(curvedPts.length / 2) + 1] || midPt;
        const angle = Math.atan2(nextPt.lng - midPt.lng, nextPt.lat - midPt.lat) * (180 / Math.PI);
        const airplane = L.marker(midPt, { icon: createAirplaneIcon(90 - angle), interactive: false, zIndexOffset: 600 });
        lg.addLayer(airplane);
      });
    }

    // ── City markers ──
    const showFlights = filter === "all" || filter === "flights";
    if (showFlights) {
      routePoints.forEach((pt, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === routePoints.length - 1;
        const isCurrent = currentLocation?.iata === pt.iata;
        const markerType = isCurrent ? "current" : isFirst ? "origin" : isLast ? "finish" : "connection";

        const marker = L.marker([pt.coords[0], pt.coords[1]], {
          icon: createCityMarker(markerType, iataToCityName(pt.iata), isCurrent),
          zIndexOffset: isCurrent ? 2000 : isFirst || isLast ? 1000 : 500,
        });

        marker.on("click", () => {
          // Find first flight related to this city
          const item = journeyItems.find(
            i => i.type === "flight" && (i.originIata === pt.iata || i.destIata === pt.iata)
          );
          if (item) {
            setSelectedItem(item.id);
            setExpandedItem(item.id);
          }
        });

        lg.addLayer(marker);
        bounds.extend([pt.coords[0], pt.coords[1]]);
      });
    }

    // ── Current location pulsing marker ──
    if (currentLocation) {
      const pulsingMarker = L.marker(
        [currentLocation.coords[0], currentLocation.coords[1]],
        { icon: createPulsingIcon("#10b981"), zIndexOffset: 3000, interactive: false }
      );
      lg.addLayer(pulsingMarker);
      bounds.extend([currentLocation.coords[0], currentLocation.coords[1]]);
    }

    // ── Fit bounds ──
    if (bounds.isValid() && routePoints.length >= 2) {
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 8 });
    } else if (routePoints.length === 1) {
      map.setView([routePoints[0].coords[0], routePoints[0].coords[1]], 6);
    }
  }, [segments, routePoints, filter, currentLocation, journeyItems]);

  // ───── Sidebar item click → fly to ─────
  const handleItemClick = useCallback((item: JourneyItem) => {
    const newSelected = item.id === selectedItem ? null : item.id;
    setSelectedItem(newSelected);

    if (newSelected) {
      setExpandedItem(item.id);
      const map = mapRef.current;
      if (!map) return;

      let target: [number, number] | undefined;
      if (item.destIata && AIRPORT_COORDS[item.destIata]) {
        target = AIRPORT_COORDS[item.destIata];
      } else if (item.originIata && AIRPORT_COORDS[item.originIata]) {
        target = AIRPORT_COORDS[item.originIata];
      }
      if (target) {
        map.flyTo([target[0], target[1]], 7, { duration: 1.2 });
      }
    } else {
      setExpandedItem(null);
    }
  }, [selectedItem]);

  const handleFitAll = useCallback(() => {
    const map = mapRef.current;
    if (!map || routePoints.length < 2) return;
    const bounds = L.latLngBounds(routePoints.map(p => L.latLng(p.coords[0], p.coords[1])));
    map.fitBounds(bounds, { padding: [80, 80] });
  }, [routePoints]);

  const handleLocateMe = useCallback(() => {
    if (currentLocation) {
      mapRef.current?.flyTo([currentLocation.coords[0], currentLocation.coords[1]], 10, { duration: 1.5 });
    }
  }, [currentLocation]);

  const handleCopyDetail = useCallback((value: string) => {
    navigator.clipboard.writeText(value);
    toast.success("Copiado!");
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Invalidate map size on fullscreen change
  useEffect(() => {
    setTimeout(() => mapRef.current?.invalidateSize(), 300);
  }, [isFullscreen]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: { date: string; label: string; items: JourneyItem[] }[] = [];
    let current = "";
    filteredItems.forEach(item => {
      const d = item.date || "sem-data";
      if (d !== current) {
        current = d;
        groups.push({ date: d, label: d !== "sem-data" ? formatDateBR(d) : "Sem data", items: [item] });
      } else {
        groups[groups.length - 1].items.push(item);
      }
    });
    return groups;
  }, [filteredItems]);

  const stats = useMemo(() => {
    const cities = new Set<string>();
    segments?.forEach((s: any) => {
      if (s.origin_iata) cities.add(s.origin_iata);
      if (s.destination_iata) cities.add(s.destination_iata);
    });
    return {
      cities: cities.size,
      flights: (segments || []).length,
      hotels: [...(hotels || []), ...(lodging || [])].length,
    };
  }, [segments, hotels, lodging]);

  /* ═══ Render ═══ */
  return (
    <div ref={containerRef} className={cn("relative", isFullscreen && "bg-background")}>
      {/* ── Current Location Banner ── */}
      <AnimatePresence>
        {isTraveling && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-3 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-2xl px-4 py-3 flex items-center gap-3"
          >
            <div className="relative">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500/40 animate-ping" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Você está em <span className="text-emerald-600">{iataToCityName(currentLocation!.iata)}</span>
              </p>
              <p className="text-[10px] text-muted-foreground">Baseado no cronograma da sua viagem</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLocateMe} className="h-8 gap-1.5 text-xs shrink-0">
              <LocateFixed className="h-3.5 w-3.5" /> Ver no mapa
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Map + Panel ── */}
      <div className={cn(
        "flex flex-col lg:flex-row rounded-2xl overflow-hidden border border-border shadow-xl",
        isFullscreen ? "h-screen" : "h-[560px]"
      )}>
        {/* Map Container */}
        <div className="flex-1 relative bg-muted/30 min-h-0">
          <div ref={mapContainerRef} className="absolute inset-0 z-0" />

          {/* Floating map controls */}
          <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-1.5">
            {/* Map Style Switcher */}
            <div className="bg-card/90 backdrop-blur-md rounded-xl border border-border shadow-lg p-1 flex gap-0.5">
              {(["light", "dark", "satellite"] as const).map(style => (
                <button
                  key={style}
                  onClick={() => setMapStyle(style)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all",
                    mapStyle === style
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  {style === "light" ? "Claro" : style === "dark" ? "Escuro" : "Satélite"}
                </button>
              ))}
            </div>
          </div>

          {/* Floating action buttons */}
          <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-1.5">
            <button
              onClick={handleFitAll}
              className="h-9 px-3.5 flex items-center gap-2 rounded-xl text-xs font-semibold bg-card/90 backdrop-blur-md border border-border shadow-lg text-foreground hover:bg-card transition-all"
            >
              <Maximize2 className="h-3.5 w-3.5" /> Ver tudo
            </button>
            <button
              onClick={toggleFullscreen}
              className="h-9 w-9 flex items-center justify-center rounded-xl bg-card/90 backdrop-blur-md border border-border shadow-lg text-foreground hover:bg-card transition-all"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            {isTraveling && (
              <button
                onClick={handleLocateMe}
                className="h-9 px-3.5 flex items-center gap-2 rounded-xl text-xs font-semibold bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 transition-all"
              >
                <LocateFixed className="h-3.5 w-3.5" /> Onde estou
              </button>
            )}
          </div>

          {/* Legend */}
          <div className="absolute bottom-3 right-3 z-[1000] bg-card/90 backdrop-blur-md rounded-xl px-3.5 py-2 border border-border shadow-lg flex items-center gap-4">
            <span className="flex items-center gap-2 text-[10px] text-foreground/70 font-medium">
              <span className="w-5 h-0.5 bg-emerald-400 inline-block rounded-full" /> Ida
            </span>
            <span className="flex items-center gap-2 text-[10px] text-foreground/70 font-medium">
              <span className="w-5 h-0.5 border-t-2 border-dashed border-amber-400 inline-block" /> Volta
            </span>
            {isTraveling && (
              <span className="flex items-center gap-2 text-[10px] text-emerald-500 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" /> Agora
              </span>
            )}
          </div>

          {/* Stats overlay */}
          <div className="absolute top-3 right-14 z-[1000] flex items-center gap-1.5">
            {[
              { icon: MapPin, value: stats.cities, label: "cidades" },
              { icon: Plane, value: stats.flights, label: "voos" },
              { icon: Hotel, value: stats.hotels, label: "hotéis" },
            ].map(s => (
              <div key={s.label} className="bg-card/90 backdrop-blur-md rounded-xl border border-border shadow-lg px-2.5 py-1.5 flex items-center gap-1.5">
                <s.icon className="h-3 w-3 text-primary" />
                <span className="text-xs font-bold text-foreground">{s.value}</span>
                <span className="text-[9px] text-muted-foreground hidden sm:inline">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Sidebar Panel ── */}
        <div className="lg:w-[380px] w-full border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col min-h-0">
          {/* Panel Header */}
          <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Compass className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-foreground">Roteiro da Viagem</h3>
              <p className="text-[10px] text-muted-foreground">{filteredItems.length} itens · Toque para navegar</p>
            </div>
          </div>

          {/* Filters */}
          <div className="px-3 py-2 border-b border-border/50 shrink-0">
            <div className="flex gap-1">
              {([
                { key: "all" as FilterType, label: "Tudo", icon: Navigation },
                { key: "flights" as FilterType, label: "Voos", icon: Plane },
                { key: "hotels" as FilterType, label: "Hotéis", icon: Hotel },
                { key: "services" as FilterType, label: "Serviços", icon: Ticket },
              ]).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setFilter(opt.key)}
                  className={cn(
                    "flex-1 h-8 flex items-center justify-center gap-1.5 rounded-lg text-[10px] font-semibold transition-all",
                    filter === opt.key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <opt.icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Items List */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-2 space-y-0.5">
              {groupedByDate.map((group, gi) => (
                <div key={gi}>
                  {group.date !== "sem-data" && (
                    <div className="flex items-center gap-2 px-2 pt-3 pb-1.5 first:pt-1">
                      <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Calendar className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-[11px] font-bold text-foreground tracking-wide">{group.label}</span>
                      <div className="flex-1 h-px bg-border/40 ml-1" />
                    </div>
                  )}
                  {group.items.map((item) => {
                    const Icon = TYPE_ICONS[item.type] || Ticket;
                    const isSelected = selectedItem === item.id;
                    const isExpanded = expandedItem === item.id;
                    const hasDetails = Object.keys(item.details).length > 0;

                    return (
                      <div key={item.id}>
                        <button
                          onClick={() => handleItemClick(item)}
                          className={cn(
                            "w-full text-left flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-all group",
                            isSelected
                              ? "bg-primary/10 border border-primary/20 shadow-sm"
                              : "hover:bg-muted/50 border border-transparent",
                            item.isPast && !item.isCurrent && "opacity-50"
                          )}
                        >
                          {/* Type Icon */}
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                            item.isCurrent
                              ? "bg-emerald-500/10 text-emerald-600"
                              : item.type === "flight"
                                ? "bg-primary/10 text-primary"
                                : item.type === "hotel"
                                  ? "bg-accent/10 text-accent"
                                  : "bg-muted text-muted-foreground"
                          )}>
                            <Icon className="h-4 w-4" />
                            {item.isCurrent && (
                              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                              {item.isCurrent && (
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[8px] h-4 px-1.5">
                                  AGORA
                                </Badge>
                              )}
                            </div>
                            {item.subtitle && (
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{item.subtitle}</p>
                            )}
                            {item.details["Localizador"] && (
                              <span className="text-[10px] text-primary/80 font-mono font-semibold flex items-center gap-1 mt-0.5">
                                📋 {item.details["Localizador"]}
                              </span>
                            )}
                            {item.time && (
                              <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                                <Clock className="h-2.5 w-2.5" /> {item.time}
                              </span>
                            )}
                          </div>

                          <div className="shrink-0 mt-1 flex items-center gap-1">
                            {item.direction === "volta" && (
                              <Badge variant="outline" className="text-[8px] h-4 px-1.5 border-amber-400/40 text-amber-600">
                                Volta
                              </Badge>
                            )}
                            {hasDetails && (
                              <ChevronDown className={cn(
                                "h-3.5 w-3.5 text-muted-foreground/40 transition-transform",
                                isExpanded && "rotate-180"
                              )} />
                            )}
                          </div>
                        </button>

                        {/* Expanded Details */}
                        <AnimatePresence>
                          {isExpanded && hasDetails && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="mx-3 mb-2 p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2">
                                {Object.entries(item.details).map(([key, value]) => value && (
                                  <div key={key} className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] text-muted-foreground font-medium">{key}</span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[11px] font-semibold text-foreground">{value}</span>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleCopyDetail(value); }}
                                        className="w-5 h-5 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-all"
                                      >
                                        <Copy className="h-2.5 w-2.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}

                                {/* Quick Actions */}
                                <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/30">
                                  {item.originIata && AIRPORT_COORDS[item.originIata] && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-[10px] gap-1 flex-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const coords = AIRPORT_COORDS[item.originIata!];
                                        window.open(`https://www.google.com/maps?q=${coords[0]},${coords[1]}`, "_blank");
                                      }}
                                    >
                                      <ExternalLink className="h-2.5 w-2.5" /> Google Maps
                                    </Button>
                                  )}
                                  {item.destIata && AIRPORT_COORDS[item.destIata] && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-[10px] gap-1 flex-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const coords = AIRPORT_COORDS[item.destIata!];
                                        window.open(`https://www.google.com/maps?q=${coords[0]},${coords[1]}`, "_blank");
                                      }}
                                    >
                                      <MapPin className="h-2.5 w-2.5" /> Destino
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="text-center py-12">
                  <Navigation className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Nenhum item nesta categoria</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* CSS for pulsing animation */}
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.5); opacity: 0.4; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
