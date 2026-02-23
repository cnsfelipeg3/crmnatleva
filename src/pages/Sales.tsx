import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MOCK_SALES } from "@/data/mockData";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Download, Eye, Plane, Hotel } from "lucide-react";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusColor: Record<string, string> = {
  Fechado: "bg-success/15 text-success border-success/20",
  "Em andamento": "bg-warning/15 text-warning-foreground border-warning/20",
  Pendente: "bg-muted text-muted-foreground border-border",
};

export default function Sales() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filtered = MOCK_SALES.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.seller.name.toLowerCase().includes(search.toLowerCase()) ||
      s.destination.city.toLowerCase().includes(search.toLowerCase()) ||
      s.locator.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-foreground">Vendas</h1>
          <p className="text-sm text-muted-foreground">{MOCK_SALES.length} vendas registradas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1" /> Exportar
          </Button>
          <Button size="sm" onClick={() => navigate("/sales/new")}>
            <Plus className="w-4 h-4 mr-1" /> Nova Venda
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, vendedor, destino, localizador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Venda</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Vendedor</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Rota</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">PAX</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Produtos</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Receita</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Margem</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Score</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sale) => (
                <tr
                  key={sale.id}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/sales/${sale.id}`)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{sale.name}</p>
                    <p className="text-xs text-muted-foreground">{sale.id} · {sale.closeDate}</p>
                  </td>
                  <td className="px-4 py-3 text-foreground">{sale.seller.name}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs">
                      {sale.origin.iata} → {sale.destination.iata}
                    </span>
                  </td>
                  <td className="px-4 py-3">{sale.pax.adults + sale.pax.children}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {sale.products.includes("Aéreo") && <Plane className="w-3.5 h-3.5 text-primary" />}
                      {sale.products.includes("Hotel") && <Hotel className="w-3.5 h-3.5 text-accent" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(sale.receivedValue)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={sale.margin > 25 ? "text-success font-semibold" : "text-foreground"}>
                      {sale.margin.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={statusColor[sale.status] || ""}>
                      {sale.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                        sale.score >= 90
                          ? "bg-success/15 text-success"
                          : sale.score >= 70
                          ? "bg-warning/15 text-warning-foreground"
                          : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {sale.score}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
