import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Download, Eye, Plane, Hotel } from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusColor: Record<string, string> = {
  Fechado: "bg-success/15 text-success border-success/20",
  "Em andamento": "bg-warning/15 text-warning-foreground border-warning/20",
  Pendente: "bg-muted text-muted-foreground border-border",
  Rascunho: "bg-info/10 text-info border-info/20",
};

interface SaleRow {
  id: string;
  display_id: string;
  name: string;
  close_date: string | null;
  status: string;
  origin_iata: string | null;
  destination_iata: string | null;
  departure_date: string | null;
  adults: number;
  children: number;
  products: string[];
  received_value: number;
  margin: number;
  score: number;
  airline: string | null;
  locators: string[];
  seller_id: string | null;
}

export default function Sales() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSales = async () => {
      const { data, error } = await supabase.from("sales").select("*").order("created_at", { ascending: false });
      if (error) console.error(error);
      setSales((data || []) as SaleRow[]);
      setLoading(false);
    };
    fetchSales();
  }, []);

  const filtered = sales.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.display_id.toLowerCase().includes(search.toLowerCase()) ||
    s.destination_iata?.toLowerCase().includes(search.toLowerCase()) ||
    s.locators?.some(l => l.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-foreground">Vendas</h1>
          <p className="text-sm text-muted-foreground">{sales.length} vendas registradas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> Exportar</Button>
          <Button size="sm" onClick={() => navigate("/sales/new")}><Plus className="w-4 h-4 mr-1" /> Nova Venda</Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, ID, destino, localizador..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? "Nenhuma venda encontrada." : "Nenhuma venda ainda. Crie a primeira!"}
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
                      <p className="text-xs text-muted-foreground">{sale.display_id} · {sale.close_date || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs">{sale.origin_iata || "?"} → {sale.destination_iata || "?"}</span>
                    </td>
                    <td className="px-4 py-3">{(sale.adults || 0) + (sale.children || 0)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {sale.products?.includes("Aéreo") && <Plane className="w-3.5 h-3.5 text-primary" />}
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
