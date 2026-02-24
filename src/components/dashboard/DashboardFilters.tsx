import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  period: string;
  setPeriod: (v: string) => void;
  seller: string;
  setSeller: (v: string) => void;
  destination: string;
  setDestination: (v: string) => void;
  product: string;
  setProduct: (v: string) => void;
  sellers: string[];
  destinations: string[];
}

export default function DashboardFilters({
  period, setPeriod, seller, setSeller, destination, setDestination,
  product, setProduct, sellers, destinations,
}: Props) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
          <Activity className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-[10px] sm:text-xs text-muted-foreground font-mono tracking-wider">VISÃO ESTRATÉGICA</p>
        </div>
      </div>
      <div className="flex gap-2 items-center flex-wrap w-full sm:w-auto">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[130px] h-9 text-xs glass-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo período</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="12m">Último ano</SelectItem>
          </SelectContent>
        </Select>
        {sellers.length > 0 && (
          <Select value={seller} onValueChange={setSeller}>
            <SelectTrigger className="w-[140px] h-9 text-xs glass-card"><SelectValue placeholder="Vendedor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos vendedores</SelectItem>
              {sellers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {destinations.length > 0 && (
          <Select value={destination} onValueChange={setDestination}>
            <SelectTrigger className="w-[120px] h-9 text-xs glass-card"><SelectValue placeholder="Destino" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos destinos</SelectItem>
              {destinations.slice(0, 15).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={product} onValueChange={setProduct}>
          <SelectTrigger className="w-[110px] h-9 text-xs glass-card"><SelectValue placeholder="Produto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Aéreo">Aéreo</SelectItem>
            <SelectItem value="Hotel">Hotel</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" className="glow-hover" onClick={() => navigate("/sales/new")}>
          <Plus className="w-4 h-4 mr-1" /> Nova Venda
        </Button>
      </div>
    </div>
  );
}
