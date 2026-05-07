import { useEffect, useRef } from "react";
import { MapPin, ExternalLink, Navigation } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Props {
  latitude: number;
  longitude: number;
  title?: string | null;
  address?: string | null;
}

export function LocationBubble({ latitude, longitude, title, address }: Props) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;

  return (
    <div className="rounded-lg overflow-hidden border border-border max-w-[280px] bg-background/40">
      <div className="h-36 w-full relative" style={{ minWidth: 240 }}>
        <MapContainer
          center={[lat, lng]}
          zoom={15}
          scrollWheelZoom={false}
          dragging={false}
          doubleClickZoom={false}
          zoomControl={false}
          attributionControl={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[lat, lng]} icon={markerIcon} />
        </MapContainer>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 z-[400]"
          aria-label="Abrir no Google Maps"
        />
      </div>
      <div className="p-2.5 flex items-start gap-2">
        <MapPin className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-1">
          {title && <div className="font-semibold text-sm break-words leading-tight">{title}</div>}
          {address && <div className="text-xs text-muted-foreground line-clamp-2 break-words">{address}</div>}
          <div className="flex items-center gap-3 pt-1">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" /> Google Maps
            </a>
            <a
              href={streetViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-primary hover:underline flex items-center gap-1"
            >
              <Navigation className="h-3 w-3" /> Street View
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
