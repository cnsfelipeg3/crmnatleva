import { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Search, ZoomIn, ZoomOut, Maximize2, LocateFixed, Layers, Filter, Download } from "lucide-react";

// Expanded coordinates for Brazilian cities
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
  "Guarulhos": [-23.4538, -46.5333], "São Bernardo do Campo": [-23.6914, -46.5646],
  "Osasco": [-23.5325, -46.7917], "Santo André": [-23.6737, -46.5432],
  "São José dos Campos": [-23.1896, -45.8841], "Jundiaí": [-23.1857, -46.8978],
  "Piracicaba": [-22.7343, -47.6481], "Bauru": [-22.3246, -49.0871],
  "Maringá": [-23.4209, -51.9331], "Cascavel": [-24.9555, -53.4552],
  "Foz do Iguaçu": [-25.5163, -54.5854], "Blumenau": [-26.9194, -49.0661],
  "Chapecó": [-27.1006, -52.6155], "Caxias do Sul": [-29.1681, -51.1794],
  "Pelotas": [-31.7654, -52.3376], "Santa Maria": [-29.6842, -53.8069],
  "Juiz de Fora": [-21.7642, -43.3503], "Montes Claros": [-16.7351, -43.8616],
  "Uberaba": [-19.7489, -47.9318], "Governador Valadares": [-18.8510, -41.9454],
  "Feira de Santana": [-12.2669, -38.9666], "Ilhéus": [-14.7939, -39.0455],
  "Caruaru": [-8.2828, -35.9761], "Petrolina": [-9.3889, -40.5028],
  "Mossoró": [-5.1877, -37.3441], "Imperatriz": [-5.5188, -47.4735],
  "Palmas": [-10.1689, -48.3317], "Porto Velho": [-8.7612, -63.9004],
  "Rio Branco": [-9.9753, -67.8100], "Macapá": [-0.0346, -51.0694],
  "Boa Vista": [2.8195, -60.6735],
};

// State abbreviation mapping
const STATE_NAMES: Record<string, string> = {
  SP: "São Paulo", RJ: "Rio de Janeiro", MG: "Minas Gerais", BA: "Bahia",
  PR: "Paraná", RS: "Rio Grande do Sul", PE: "Pernambuco", CE: "Ceará",
  PA: "Pará", SC: "Santa Catarina", MA: "Maranhão", GO: "Goiás",
  AM: "Amazonas", ES: "Espírito Santo", PB: "Paraíba", RN: "Rio Grande do Norte",
  AL: "Alagoas", PI: "Piauí", MT: "Mato Grosso", MS: "Mato Grosso do Sul",
  DF: "Distrito Federal", SE: "Sergipe", RO: "Rondônia", TO: "Tocantins",
  AC: "Acre", AP: "Amapá", RR: "Roraima",
};

interface CityData {
  city: string; state: string; clients: number; sales: number; revenue: number;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const TILE_LAYERS = {
  dark: { url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", name: "Escuro" },
  light: { url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", name: "Claro" },
  satellite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", name: "Satélite" },
};

export default function ClientDistributionMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const [cityData, setCityData] = useState<CityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"clients" | "revenue" | "sales">("clients");
  const [mapStyle, setMapStyle] = useState<keyof typeof TILE_LAYERS>("dark");
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const isDark = document.documentElement.classList.contains("dark");
    const initialStyle = isDark ? "dark" : "light";
    setMapStyle(initialStyle);

    const map = L.map(containerRef.current, {
      scrollWheelZoom: true,
      zoomControl: false,
      dragging: true,
      doubleClickZoom: true,
      touchZoom: true,
      attributionControl: false,
    }).setView([-14, -51], 4);

    const tile = L.tileLayer(TILE_LAYERS[initialStyle].url, { maxZoom: 18 }).addTo(map);
    tileRef.current = tile;
    mapRef.current = map;

    // Attribution in bottom right
    L.control.attribution({ position: 'bottomright', prefix: '' }).addTo(map);

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Switch tile layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !tileRef.current) return;
    tileRef.current.setUrl(TILE_LAYERS[mapStyle].url);
  }, [mapStyle]);

  // Filtered data
  const filtered = useMemo(() => {
    let data = cityData;
    if (stateFilter !== "all") data = data.filter(c => c.state === stateFilter);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(c => c.city.toLowerCase().includes(q) || c.state.toLowerCase().includes(q));
    }
    return data.sort((a, b) => b[sortBy] - a[sortBy]);
  }, [cityData, stateFilter, search, sortBy]);

  const states = useMemo(() => [...new Set(cityData.map(c => c.state).filter(Boolean))].sort(), [cityData]);
  const totalClients = filtered.reduce((s, c) => s + c.clients, 0);
  const totalRevenue = filtered.reduce((s, c) => s + c.revenue, 0);

  // Update markers when filtered data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || cityData.length === 0) return;

    // Remove existing markers
    map.eachLayer(layer => {
      if (!(layer instanceof L.TileLayer)) map.removeLayer(layer);
    });

    const maxClients = Math.max(...filtered.map(c => c.clients), 1);
    const maxRevenue = Math.max(...filtered.map(c => c.revenue), 1);

    filtered.forEach(c => {
      const coords = CITY_COORDS[c.city];
      if (!coords) return;

      const sizeByClients = 8 + (c.clients / maxClients) * 22;
      const intensity = c.revenue / maxRevenue;

      // Gradient color based on revenue intensity
      const hue = 160 + (1 - intensity) * 60; // green to teal
      const sat = 50 + intensity * 30;
      const light = 40 + intensity * 15;

      const marker = L.circleMarker(coords, {
        radius: sizeByClients,
        fillColor: `hsl(${hue}, ${sat}%, ${light}%)`,
        fillOpacity: 0.65,
        color: `hsl(${hue}, ${sat + 10}%, ${light - 10}%)`,
        weight: 2,
      });

      // Custom popup
      marker.bindPopup(`
        <div style="font-family: 'Inter', sans-serif; font-size: 12px; min-width: 180px; line-height: 1.6;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px; color: hsl(${hue}, ${sat}%, ${light}%);">
            📍 ${c.city}
          </div>
          <div style="color: #999; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
            ${STATE_NAMES[c.state] || c.state}
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <div style="background: rgba(255,255,255,0.05); padding: 6px 8px; border-radius: 6px;">
              <div style="font-size: 10px; color: #888;">Clientes</div>
              <div style="font-weight: 700; font-size: 16px;">${c.clients}</div>
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 6px 8px; border-radius: 6px;">
              <div style="font-size: 10px; color: #888;">Vendas</div>
              <div style="font-weight: 700; font-size: 16px;">${c.sales}</div>
            </div>
          </div>
          <div style="margin-top: 8px; padding: 6px 8px; background: rgba(76,175,80,0.1); border-radius: 6px;">
            <div style="font-size: 10px; color: #888;">Receita Total</div>
            <div style="font-weight: 700; font-size: 14px; color: hsl(160, 60%, 50%);">${fmt(c.revenue)}</div>
          </div>
        </div>
      `, { className: 'custom-popup', maxWidth: 250 });

      // Pulse animation for top cities
      if (c.clients === Math.max(...filtered.map(x => x.clients))) {
        L.circleMarker(coords, {
          radius: sizeByClients + 6,
          fillColor: `hsl(${hue}, ${sat}%, ${light}%)`,
          fillOpacity: 0.15,
          color: `hsl(${hue}, ${sat}%, ${light}%)`,
          weight: 1,
          dashArray: "4 4",
        }).addTo(map);
      }

      marker.addTo(map);
    });

    // Fit bounds
    const points = filtered.map(c => CITY_COORDS[c.city]).filter(Boolean) as [number, number][];
    if (points.length >= 2) {
      map.fitBounds(points as L.LatLngBoundsExpression, { padding: [40, 40], maxZoom: 8 });
    } else if (points.length === 1) {
      map.setView(points[0], 8);
    }
  }, [filtered, cityData]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleResetView = () => mapRef.current?.setView([-14, -51], 4);
  const handleLocate = () => {
    const points = filtered.map(c => CITY_COORDS[c.city]).filter(Boolean) as [number, number][];
    if (points.length >= 2) mapRef.current?.fitBounds(points as L.LatLngBoundsExpression, { padding: [40, 40] });
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => mapRef.current?.invalidateSize(), 300);
  };

  const exportCSV = () => {
    const headers = "Cidade,Estado,Clientes,Vendas,Receita\n";
    const rows = filtered.map(c => `${c.city},${c.state},${c.clients},${c.sales},${c.revenue}`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "distribuicao-clientes.csv"; a.click();
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground text-sm">Carregando distribuição geográfica...</div>;
  if (cityData.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">Sem dados de localização</p>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Buscar cidade..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
        </div>
        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos estados</SelectItem>
            {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="clients">Por clientes</SelectItem>
            <SelectItem value="revenue">Por receita</SelectItem>
            <SelectItem value="sales">Por vendas</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={exportCSV}>
          <Download className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Summary badges */}
      <div className="flex gap-3 text-xs">
        <span className="text-muted-foreground">{filtered.length} cidades</span>
        <span className="text-muted-foreground">•</span>
        <span className="text-primary font-semibold">{totalClients} clientes</span>
        <span className="text-muted-foreground">•</span>
        <span className="text-emerald-500 font-semibold">{fmt(totalRevenue)}</span>
      </div>

      {/* Map container */}
      <div className={`relative rounded-xl overflow-hidden border border-border/50 transition-all duration-300 ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
        <div
          ref={containerRef}
          style={{ height: isFullscreen ? "100%" : "420px" }}
          className="w-full"
        />

        {/* Map controls overlay */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-[1000]">
          <Button size="sm" variant="secondary" className="w-8 h-8 p-0 shadow-lg backdrop-blur-md bg-card/80" onClick={handleZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="secondary" className="w-8 h-8 p-0 shadow-lg backdrop-blur-md bg-card/80" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="secondary" className="w-8 h-8 p-0 shadow-lg backdrop-blur-md bg-card/80" onClick={handleLocate}>
            <LocateFixed className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="secondary" className="w-8 h-8 p-0 shadow-lg backdrop-blur-md bg-card/80" onClick={handleResetView}>
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="secondary" className="w-8 h-8 p-0 shadow-lg backdrop-blur-md bg-card/80" onClick={toggleFullscreen}>
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Layer switcher */}
        <div className="absolute bottom-3 right-3 flex gap-1 z-[1000]">
          {(Object.keys(TILE_LAYERS) as Array<keyof typeof TILE_LAYERS>).map(key => (
            <Button
              key={key}
              size="sm"
              variant={mapStyle === key ? "default" : "secondary"}
              className="h-7 px-2 text-[10px] shadow-lg backdrop-blur-md bg-card/80"
              onClick={() => setMapStyle(key)}
            >
              {TILE_LAYERS[key].name}
            </Button>
          ))}
        </div>

        {/* Stats overlay */}
        <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-1.5">
          <div className="bg-card/90 backdrop-blur-md rounded-lg px-3 py-2 shadow-lg border border-border/30">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">Distribuição</p>
            <p className="text-lg font-bold text-primary font-display">{totalClients}</p>
            <p className="text-[10px] text-muted-foreground">clientes em {filtered.length} cidades</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border/50">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead className="text-xs cursor-pointer hover:text-primary" onClick={() => setSortBy("clients")}>#</TableHead>
              <TableHead className="text-xs">Cidade</TableHead>
              <TableHead className="text-xs">UF</TableHead>
              <TableHead className="text-xs text-right cursor-pointer hover:text-primary" onClick={() => setSortBy("clients")}>
                Clientes {sortBy === "clients" && "▼"}
              </TableHead>
              <TableHead className="text-xs text-right cursor-pointer hover:text-primary" onClick={() => setSortBy("sales")}>
                Vendas {sortBy === "sales" && "▼"}
              </TableHead>
              <TableHead className="text-xs text-right cursor-pointer hover:text-primary" onClick={() => setSortBy("revenue")}>
                Receita {sortBy === "revenue" && "▼"}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, 20).map((c, i) => (
              <TableRow
                key={`${c.city}-${c.state}`}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  const coords = CITY_COORDS[c.city];
                  if (coords && mapRef.current) mapRef.current.setView(coords, 10, { animate: true });
                }}
              >
                <TableCell className="text-xs font-mono text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="text-xs font-medium flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-primary" /> {c.city}
                </TableCell>
                <TableCell className="text-xs">{c.state}</TableCell>
                <TableCell className="text-xs text-right font-semibold">{c.clients}</TableCell>
                <TableCell className="text-xs text-right">{c.sales}</TableCell>
                <TableCell className="text-xs text-right font-medium text-emerald-500">{fmt(c.revenue)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
