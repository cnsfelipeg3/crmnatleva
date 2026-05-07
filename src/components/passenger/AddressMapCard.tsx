import { useEffect, useRef, useState } from "react";
import { loadGoogleMapsScript, hasGoogleMapsAuthFailure } from "@/lib/googleMaps";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin, Navigation, Loader2 } from "lucide-react";

interface Props {
  query: string; // ex.: "Rua X, 90 - Buriti, Pacajus/CE, 62870-000"
  height?: number;
}

export default function AddressMapCard({ query, height = 260 }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "notfound" | "error">("loading");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setCoords(null);

    (async () => {
      try {
        await loadGoogleMapsScript();
        if (cancelled) return;
        if (hasGoogleMapsAuthFailure()) {
          setStatus("error");
          return;
        }
        const geocoder = new window.google.maps.Geocoder();
        const result = await geocoder.geocode({ address: query, region: "br" });
        if (cancelled) return;
        if (!result.results || result.results.length === 0) {
          setStatus("notfound");
          return;
        }
        const loc = result.results[0].geometry.location;
        const c = { lat: loc.lat(), lng: loc.lng() };
        setCoords(c);
        if (mapRef.current) {
          const map = new window.google.maps.Map(mapRef.current, {
            center: c,
            zoom: 16,
            mapTypeControl: false,
            streetViewControl: true,
            fullscreenControl: true,
            zoomControl: true,
          });
          new window.google.maps.Marker({ position: c, map, animation: window.google.maps.Animation.DROP });
        }
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => { cancelled = true; };
  }, [query]);

  const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  const streetViewUrl = coords
    ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${coords.lat},${coords.lng}`
    : `https://www.google.com/maps?q=&layer=c&cbll=${encodeURIComponent(query)}`;

  return (
    <div className="rounded-lg border border-border/60 overflow-hidden bg-card">
      <div className="relative" style={{ height }}>
        <div ref={mapRef} className="w-full h-full" />
        {status !== "ready" && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30 text-xs text-muted-foreground">
            {status === "loading" && (<><Loader2 className="w-4 h-4 animate-spin mr-2" /> Carregando mapa...</>)}
            {status === "notfound" && (<><MapPin className="w-4 h-4 mr-2" /> Endereço não localizado no mapa</>)}
            {status === "error" && (<><MapPin className="w-4 h-4 mr-2" /> Mapa indisponível</>)}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border/60 bg-muted/20">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
          <span className="truncate">{query}</span>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => window.open(streetViewUrl, "_blank")}>
            <Navigation className="w-3 h-3 mr-1" /> Street View
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => window.open(gmapsUrl, "_blank")}>
            <ExternalLink className="w-3 h-3 mr-1" /> Google Maps
          </Button>
        </div>
      </div>
    </div>
  );
}
