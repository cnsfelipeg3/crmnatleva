import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Activity, X, Filter, SlidersHorizontal, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface Props {
  period: string; setPeriod: (v: string) => void;
  seller: string; setSeller: (v: string) => void;
  destination: string; setDestination: (v: string) => void;
  product: string; setProduct: (v: string) => void;
  status: string; setStatus: (v: string) => void;
  valueRange: string; setValueRange: (v: string) => void;
  marginRange: string; setMarginRange: (v: string) => void;
  region: string; setRegion: (v: string) => void;
  sellers: string[]; destinations: string[]; statuses: string[];
  activeFilterCount: number;
  onClearAll: () => void;
  totalSales: number;
  filteredCount: number;
  ceoMode?: boolean;
  onToggleCeoMode?: () => void;
}

const STRATEGIC_PRESETS = [
  { label: "🔥 Alta Margem", filters: { marginRange: "30+" } },
  { label: "💎 Alto Ticket", filters: { valueRange: "60k+" } },
  { label: "📉 Baixa Margem", filters: { marginRange: "0-10" } },
  { label: "🌍 Europa", filters: { region: "Europa" } },
  { label: "🏖 Caribe", filters: { region: "Caribe" } },
];

export default function DashboardFilters({
  period, setPeriod, seller, setSeller, destination, setDestination,
  product, setProduct, status, setStatus, valueRange, setValueRange,
  marginRange, setMarginRange, region, setRegion,
  sellers, destinations, statuses,
  activeFilterCount, onClearAll, totalSales, filteredCount,
  ceoMode, onToggleCeoMode,
}: Props) {
  const navigate = useNavigate();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const applyPreset = (preset: typeof STRATEGIC_PRESETS[0]) => {
    onClearAll();
    const f = preset.filters as any;
    if (f.marginRange) setMarginRange(f.marginRange);
    if (f.valueRange) setValueRange(f.valueRange);
    if (f.region) setRegion(f.region);
  };

  return (
    <div className="space-y-4">
      {/* ── Hero Header — NatLeva Power Strip ── */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/10">
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(152,44%,7%)] via-[hsl(153,38%,11%)] to-[hsl(152,32%,14%)]" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(ellipse 60% 80% at 0% 50%, hsl(154 56% 27% / 0.12) 0%, transparent 60%), radial-gradient(ellipse 40% 60% at 100% 30%, hsl(41 51% 57% / 0.06) 0%, transparent 50%)',
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-champagne/25 to-transparent" />

        <div className="relative flex items-center justify-between gap-4 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-champagne/20 to-champagne/5 border border-champagne/15 flex items-center justify-center">
              <Activity className="w-4 h-4 text-champagne" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold tracking-tight leading-none text-primary-foreground">
                {ceoMode ? "Visão CEO" : "Dashboard"}
              </h1>
              <span className="text-[10px] mt-0.5 block text-primary-foreground">
                Operação em tempo real
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onToggleCeoMode && (
              <Button
                variant={ceoMode ? "default" : "outline"}
                size="sm"
                className={`text-xs gap-1.5 h-8 ${ceoMode ? "bg-champagne text-[hsl(153,55%,10%)] hover:bg-champagne/90 shadow-[0_2px_12px_hsl(41,51%,57%,0.2)]" : "border-champagne/25 text-champagne/80 hover:bg-champagne/10 hover:text-champagne"}`}
                onClick={onToggleCeoMode}
              >
                <Crown className="w-3.5 h-3.5" />
                CEO
              </Button>
            )}
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onClearAll} className="text-xs h-8 text-muted-foreground hover:text-destructive">
                <X className="w-3.5 h-3.5 mr-1" /> Limpar ({activeFilterCount})
              </Button>
            )}
            <Button size="sm" className="h-8 glow-hover shadow-[0_2px_10px_hsl(154,56%,27%,0.15)]" onClick={() => navigate("/sales/new")}>
              <Plus className="w-4 h-4 mr-1" /> Nova Venda
            </Button>
          </div>
        </div>
      </div>

      {/* Primary Filters Row */}
      {!ceoMode && (
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px] h-8 text-xs glass-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo período</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="yesterday">Ontem</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="this_month">Este mês</SelectItem>
              <SelectItem value="last_month">Mês anterior</SelectItem>
              <SelectItem value="12m">Último ano</SelectItem>
            </SelectContent>
          </Select>

          {sellers.length > 0 && (
            <Select value={seller} onValueChange={setSeller}>
              <SelectTrigger className="w-[140px] h-8 text-xs glass-card"><SelectValue placeholder="Vendedor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos vendedores</SelectItem>
                {sellers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          <Select value={product} onValueChange={setProduct}>
            <SelectTrigger className="w-[130px] h-8 text-xs glass-card"><SelectValue placeholder="Produto" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Produtos</SelectItem>
              {productCatalog.map(p => (
                <SelectItem key={p.slug} value={p.slug}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="w-[130px] h-8 text-xs glass-card"><SelectValue placeholder="Região" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas regiões</SelectItem>
              <SelectItem value="Europa">🌍 Europa</SelectItem>
              <SelectItem value="América do Norte">🗽 América do Norte</SelectItem>
              <SelectItem value="América do Sul">🌎 América do Sul</SelectItem>
              <SelectItem value="Oriente Médio">🕌 Oriente Médio</SelectItem>
              <SelectItem value="Ásia">🏯 Ásia</SelectItem>
              <SelectItem value="Caribe">🏖 Caribe</SelectItem>
              <SelectItem value="África">🌍 África</SelectItem>
            </SelectContent>
          </Select>

          {/* Advanced Filters */}
          <Sheet open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 glass-card relative">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Avançados</span>
                {activeFilterCount > 2 && (
                  <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[9px] bg-accent text-accent-foreground">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[340px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-accent" /> Filtros Avançados
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Status</label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos status</SelectItem>
                      {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Destino</label>
                  <Select value={destination} onValueChange={setDestination}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos destinos</SelectItem>
                      {destinations.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Faixa de Valor</label>
                  <Select value={valueRange} onValueChange={setValueRange}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas faixas</SelectItem>
                      <SelectItem value="0-5k">Até R$ 5.000</SelectItem>
                      <SelectItem value="5k-10k">R$ 5.000 – 10.000</SelectItem>
                      <SelectItem value="10k-20k">R$ 10.000 – 20.000</SelectItem>
                      <SelectItem value="20k-35k">R$ 20.000 – 35.000</SelectItem>
                      <SelectItem value="35k-60k">R$ 35.000 – 60.000</SelectItem>
                      <SelectItem value="60k+">R$ 60.000+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Faixa de Margem</label>
                  <Select value={marginRange} onValueChange={setMarginRange}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas margens</SelectItem>
                      <SelectItem value="neg">Negativa (prejuízo)</SelectItem>
                      <SelectItem value="0-10">0% – 10%</SelectItem>
                      <SelectItem value="10-20">10% – 20%</SelectItem>
                      <SelectItem value="20-30">20% – 30%</SelectItem>
                      <SelectItem value="30+">30%+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-3 border-t border-border">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 block">Presets Estratégicos</label>
                  <div className="flex flex-wrap gap-2">
                    {STRATEGIC_PRESETS.map(p => (
                      <Button
                        key={p.label}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => { applyPreset(p); setAdvancedOpen(false); }}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => { onClearAll(); setAdvancedOpen(false); }}>
                    Limpar Tudo
                  </Button>
                  <Button size="sm" className="flex-1 text-xs" onClick={() => setAdvancedOpen(false)}>
                    Aplicar
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  );
}
