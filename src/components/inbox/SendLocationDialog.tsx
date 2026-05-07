import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, MapPin, Crosshair, Send } from "lucide-react";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default icon path
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSend: (params: { latitude: number; longitude: number; title?: string; address?: string }) => Promise<void> | void;
}

function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom() < 13 ? 15 : map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export function SendLocationDialog({ open, onOpenChange, onSend }: Props) {
  const [tab, setTab] = useState<"search" | "manual">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [latStr, setLatStr] = useState("");
  const [lngStr, setLngStr] = useState("");
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [sending, setSending] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  const validCoords = Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery(""); setResults([]); setLatStr(""); setLngStr("");
      setTitle(""); setAddress(""); setTab("search");
    }
  }, [open]);

  // Debounced geocoding
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (query.trim().length < 3) { setResults([]); return; }
    debounceRef.current = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=pt-BR`,
          { headers: { "Accept-Language": "pt-BR" } }
        );
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("[Nominatim] error", err);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [query]);

  const handlePickResult = (r: NominatimResult) => {
    setLatStr(r.lat);
    setLngStr(r.lon);
    setAddress(r.display_name);
    if (!title) setTitle(r.display_name.split(",")[0] || "");
  };

  const handleDetectMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não disponível neste navegador");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatStr(String(pos.coords.latitude));
        setLngStr(String(pos.coords.longitude));
        toast.success("Localização detectada");
      },
      (err) => toast.error(`Não foi possível obter localização: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSend = async () => {
    if (!validCoords) {
      toast.error("Coordenadas inválidas");
      return;
    }
    setSending(true);
    try {
      await onSend({
        latitude: lat,
        longitude: lng,
        title: title.trim() || undefined,
        address: address.trim() || undefined,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Falha ao enviar localização · ${err?.message || "tente novamente"}`);
    } finally {
      setSending(false);
    }
  };

  const previewCenter = useMemo<[number, number]>(() => {
    if (validCoords) return [lat, lng];
    return [-15.78, -47.93]; // Brasília fallback
  }, [validCoords, lat, lng]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-emerald-600" />
            Enviar localização
          </DialogTitle>
          <DialogDescription>
            Busque um endereço ou informe coordenadas manualmente.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Buscar endereço</TabsTrigger>
            <TabsTrigger value="manual">Coordenadas</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-3 mt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex.: Aeroporto de Guarulhos, Av. Paulista 1000..."
                className="pl-8"
              />
              {searching && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            {results.length > 0 && (
              <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                {results.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handlePickResult(r)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex items-start gap-2"
                  >
                    <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    <span className="break-words">{r.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Latitude</Label>
                <Input value={latStr} onChange={(e) => setLatStr(e.target.value)} placeholder="-23.5505" inputMode="decimal" />
              </div>
              <div>
                <Label className="text-xs">Longitude</Label>
                <Input value={lngStr} onChange={(e) => setLngStr(e.target.value)} placeholder="-46.6333" inputMode="decimal" />
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleDetectMyLocation} className="w-full">
              <Crosshair className="h-4 w-4 mr-2" /> Detectar minha localização
            </Button>
          </TabsContent>
        </Tabs>

        {/* Optional title + address */}
        <div className="grid gap-2 mt-1">
          <div>
            <Label className="text-xs">Nome do local (opcional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Aeroporto de Guarulhos" />
          </div>
          <div>
            <Label className="text-xs">Endereço (opcional)</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Endereço completo" />
          </div>
        </div>

        {/* Preview map */}
        <div className="rounded-md overflow-hidden border" style={{ height: 200 }}>
          <MapContainer
            center={previewCenter}
            zoom={validCoords ? 15 : 4}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {validCoords && <Marker position={[lat, lng]} icon={defaultIcon} />}
            {validCoords && <MapRecenter lat={lat} lng={lng} />}
          </MapContainer>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Cancelar</Button>
          <Button onClick={handleSend} disabled={!validCoords || sending}>
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
