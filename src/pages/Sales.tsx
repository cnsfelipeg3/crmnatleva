import { useState, useEffect, useMemo } from "react";
import { formatDateBR } from "@/lib/dateFormat";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAll";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Download, Eye, Plane, Hotel, Filter, X } from "lucide-react";
import AirlineLogo from "@/components/AirlineLogo";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusColor: Record<string, string> = {
  Fechado: "bg-success/15 text-success border-success/20",
  "Em andamento": "bg-warning/15 text-warning-foreground border-warning/20",
  Pendente: "bg-muted text-muted-foreground border-border",
  Rascunho: "bg-info/10 text-info border-info/20",
  Emitido: "bg-primary/10 text-primary border-primary/20",
};

interface SaleRow {
  id: string; display_id: string; name: string; close_date: string | null;
  status: string; origin_iata: string | null; destination_iata: string | null;
  departure_date: string | null; adults: number; children: number;
  products: string[]; received_value: number; margin: number; score: number;
  airline: string | null; locators: string[]; seller_id: string | null;
  created_at: string; client_id: string | null;
}

export default function Sales() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [destFilter, setDestFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllRows("sales", "*", { order: { column: "created_at", ascending: false } }).then((data) => {
      setSales(data as SaleRow[]);
      setLoading(false);
    }).catch(err => { console.error(err); setLoading(false); });
  }, []);

  const statuses = useMemo(() => [...new Set(sales.map(s => s.status))], [sales]);
  const destinations = useMemo(() => [...new Set(sales.map(s => s.destination_iata).filter(Boolean))].sort(), [sales]);

  const filtered = useMemo(() => {
    let result = sales;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.display_id.toLowerCase().includes(q) ||
        s.destination_iata?.toLowerCase().includes(q) ||
        s.locators?.some(l => l.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== "all") result = result.filter(s => s.status === statusFilter);
    if (destFilter) result = result.filter(s => s.destination_iata === destFilter);
    if (periodFilter !== "all") {
      const now = new Date();
      const months = periodFilter === "30d" ? 1 : periodFilter === "90d" ? 3 : 12;
      const cutoff = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
      result = result.filter(s => new Date(s.created_at) >= cutoff);
    }

    return result;
  }, [sales, search, statusFilter, destFilter, periodFilter]);

  const hasFilters = statusFilter !== "all" || destFilter || periodFilter !== "all";

  const handleExport = () => {
    const headers = ["ID", "Nome", "Status", "Origem", "Destino", "PAX", "Receita", "Margem%", "Data"];
    const rows = filtered.map(s => [
      s.display_id, s.name, s.status, s.origin_iata || "", s.destination_iata || "",
      (s.adults || 0) + (s.children || 0), s.received_value || 0, (s.margin || 0).toFixed(1),
      s.close_date || s.created_at?.slice(0, 10) || "",
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `vendas-natleva-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-foreground">Vendas</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} de {sales.length} vendas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-1" /> Exportar</Button>
          <Button size="sm" onClick={() => navigate("/sales/new")}><Plus className="w-4 h-4 mr-1" /> Nova Venda</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, ID, destino, localizador..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={destFilter || "all"} onValueChange={v => setDestFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue placeholder="Destino" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos destinos</SelectItem>
            {destinations.map(d => <SelectItem key={d!} value={d!}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo período</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="12m">Último ano</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter("all"); setDestFilter(""); setPeriodFilter("all"); }}>
            <X className="w-3.5 h-3.5 mr-1" /> Limpar
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search || hasFilters ? "Nenhuma venda encontrada com os filtros aplicados." : "Nenhuma venda ainda. Crie a primeira!"}
        </div>
      ) : (
        <Card className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Venda</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Rota</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">PAX</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Produtos</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Receita</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Margem</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sale) => (
                  <tr key={sale.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/sales/${sale.id}`)}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{sale.name}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{sale.display_id} · {formatDateBR(sale.close_date)}</span>
                        {sale.client_id && (
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/clients/${sale.client_id}`); }}
                            className="text-primary hover:underline font-medium"
                          >
                            👤
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs">{sale.origin_iata || "?"} → {sale.destination_iata || "?"}</span>
                    </td>
                    <td className="px-4 py-3">{(sale.adults || 0) + (sale.children || 0)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 items-center">
                        {sale.airline && <AirlineLogo iata={sale.airline} size={18} />}
                        {sale.products?.includes("Aéreo") && !sale.airline && <Plane className="w-3.5 h-3.5 text-primary" />}
                        {sale.products?.includes("Hotel") && <Hotel className="w-3.5 h-3.5 text-accent" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{fmt(sale.received_value || 0)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={(sale.margin || 0) > 25 ? "text-success font-semibold" : "text-foreground"}>
                        {(sale.margin || 0).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={statusColor[sale.status] || ""}>{sale.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
