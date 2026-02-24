import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { MapPin } from "lucide-react";

const CITY_COORDS: Record<string, [number, number]> = {
  "São Paulo": [-23.5505, -46.6333], "Rio de Janeiro": [-22.9068, -43.1729],
  "Brasília": [-15.7975, -47.8919], "Belo Horizonte": [-19.9167, -43.9345],
  "Salvador": [-12.9714, -38.5124], "Recife": [-8.0476, -34.8770],
  "Fortaleza": [-3.7172, -38.5433], "Porto Alegre": [-30.0346, -51.2177],
  "Curitiba": [-25.4284, -49.2733], "Manaus": [-3.1190, -60.0217],
  "Belém": [-1.4558, -48.5024], "Goiânia": [-16.6869, -49.2648],
  "Campinas": [-22.9099, -47.0626], "São Luís": [-2.5297, -44.2825],
  "Natal": [-5.7945, -35.2110], "Maceió": [-9.6658, -35.7353],
  "Florianópolis": [-27.5954, -48.5480], "Cuiabá": [-15.6014, -56.0979],
  "Campo Grande": [-20.4697, -54.6201], "João Pessoa": [-7.1195, -34.8450],
  "Vitória": [-20.3155, -40.3128], "Aracaju": [-10.9091, -37.0677],
  "Teresina": [-5.0892, -42.8019], "Londrina": [-23.3045, -51.1696],
  "Ribeirão Preto": [-21.1704, -47.8103], "Santos": [-23.9608, -46.3336],
  "Niterói": [-22.8833, -43.1036], "Uberlândia": [-18.9186, -48.2772],
  "Sorocaba": [-23.5015, -47.4526], "Joinville": [-26.3045, -48.8487],
};

interface CityData {
  city: string; state: string; clients: number; sales: number; revenue: number;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ClientDistributionMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [cityData, setCityData] = useState<CityData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: passengers } = await supabase
        .from("passengers")
        .select("id, address_city, address_state");
      const { data: salePassengers } = await supabase
        .from("sale_passengers")
        .select("passenger_id, sale_id");
      const { data: sales } = await supabase
        .from("sales")
        .select("id, received_value");

      if (!passengers || !salePassengers || !sales) { setLoading(false); return; }

      const salesMap = new Map(sales.map(s => [s.id, s.received_value || 0]));
      const passengerSales = new Map<string, Set<string>>();
      salePassengers.forEach(sp => {
        if (!passengerSales.has(sp.passenger_id)) passengerSales.set(sp.passenger_id, new Set());
        passengerSales.get(sp.passenger_id)!.add(sp.sale_id);
      });

      const cityMap: Record<string, CityData> = {};
      passengers.forEach(p => {
        if (!p.address_city) return;
        const key = `${p.address_city}|${p.address_state || ""}`;
        if (!cityMap[key]) cityMap[key] = { city: p.address_city, state: p.address_state || "", clients: 0, sales: 0, revenue: 0 };
        cityMap[key].clients++;
        const pSales = passengerSales.get(p.id);
        if (pSales) {
          cityMap[key].sales += pSales.size;
          pSales.forEach(sId => { cityMap[key].revenue += salesMap.get(sId) || 0; });
        }
      });

      setCityData(Object.values(cityMap).sort((a, b) => b.clients - a.clients));
      setLoading(false);
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      scrollWheelZoom: true,
      zoomControl: true,
      dragging: true,
      doubleClickZoom: true,
      touchZoom: true,
    }).setView([-14, -51], 4);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com">CARTO</a>',
      maxZoom: 18,
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || cityData.length === 0) return;

    map.eachLayer(layer => {
      if (!(layer instanceof L.TileLayer)) map.removeLayer(layer);
    });

    const maxClients = Math.max(...cityData.map(c => c.clients), 1);

    cityData.forEach(c => {
      const coords = CITY_COORDS[c.city];
      if (!coords) return;
      const radius = 6 + (c.clients / maxClients) * 18;
      L.circleMarker(coords, {
        radius,
        fillColor: "hsl(210, 80%, 52%)",
        fillOpacity: 0.7,
        color: "hsl(160, 60%, 30%)",
        weight: 1.5,
      }).bindPopup(
        `<div style="font-family: sans-serif; font-size: 12px;">
          <strong>${c.city}</strong> - ${c.state}<br/>
          Clientes: ${c.clients}<br/>
          Vendas: ${c.sales}<br/>
          Receita: ${fmt(c.revenue)}
        </div>`
      ).addTo(map);
    });

    const points = cityData.map(c => CITY_COORDS[c.city]).filter(Boolean) as [number, number][];
    if (points.length >= 2) map.fitBounds(points as L.LatLngBoundsExpression, { padding: [30, 30] });
  }, [cityData]);

  if (loading) return <div className="text-center py-8 text-muted-foreground text-sm">Carregando distribuição...</div>;
  if (cityData.length === 0) return null;

  return (
    <div className="space-y-4">
      <div ref={containerRef} style={{ height: "360px" }} className="rounded-lg overflow-hidden border border-border" />
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Cidade</TableHead>
              <TableHead className="text-xs">Estado</TableHead>
              <TableHead className="text-xs text-right">Clientes</TableHead>
              <TableHead className="text-xs text-right">Vendas</TableHead>
              <TableHead className="text-xs text-right">Receita</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cityData.slice(0, 10).map((c, i) => (
              <TableRow key={i}>
                <TableCell className="text-xs font-medium flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-muted-foreground" /> {c.city}
                </TableCell>
                <TableCell className="text-xs">{c.state}</TableCell>
                <TableCell className="text-xs text-right">{c.clients}</TableCell>
                <TableCell className="text-xs text-right">{c.sales}</TableCell>
                <TableCell className="text-xs text-right font-medium">{fmt(c.revenue)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
