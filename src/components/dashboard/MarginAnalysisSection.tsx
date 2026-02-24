import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis } from "recharts";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Sale {
  destination_iata: string | null;
  received_value: number;
  total_cost: number;
  margin: number;
  seller_id: string | null;
  products: string[];
}

interface Props {
  filtered: Sale[];
  sellerNames: Record<string, string>;
  getRegion: (iata: string | null) => string;
}

export default function MarginAnalysisSection({ filtered, sellerNames, getRegion }: Props) {
  // Margin by destination
  const destMargin = useMemo(() => {
    const map: Record<string, { name: string; receita: number; custo: number; lucro: number; margem: number[]; count: number }> = {};
    filtered.forEach(s => {
      const d = s.destination_iata || "N/A";
      if (d === "N/A") return;
      if (!map[d]) map[d] = { name: d, receita: 0, custo: 0, lucro: 0, margem: [], count: 0 };
      map[d].receita += s.received_value || 0;
      map[d].custo += s.total_cost || 0;
      map[d].lucro += (s.received_value || 0) - (s.total_cost || 0);
      map[d].margem.push(s.margin || 0);
      map[d].count++;
    });
    return Object.values(map)
      .filter(d => d.count >= 2)
      .map(d => ({ ...d, margemMedia: d.margem.reduce((a, b) => a + b, 0) / d.margem.length }))
      .sort((a, b) => b.margemMedia - a.margemMedia);
  }, [filtered]);

  const topDest = destMargin.slice(0, 8);
  const bottomDest = destMargin.filter(d => d.margemMedia < 10).slice(-5).reverse();

  // Margin by product
  const productMargin = useMemo(() => {
    const map: Record<string, { name: string; receita: number; lucro: number; margem: number[]; count: number }> = {};
    filtered.forEach(s => {
      (s.products || []).forEach(p => {
        if (!map[p]) map[p] = { name: p, receita: 0, lucro: 0, margem: [], count: 0 };
        map[p].receita += s.received_value || 0;
        map[p].lucro += (s.received_value || 0) - (s.total_cost || 0);
        map[p].margem.push(s.margin || 0);
        map[p].count++;
      });
    });
    return Object.values(map)
      .map(d => ({ ...d, margemMedia: d.margem.reduce((a, b) => a + b, 0) / d.margem.length }))
      .sort((a, b) => b.margemMedia - a.margemMedia);
  }, [filtered]);

  return (
    <div className="space-y-4">
      <h2 className="section-title">📊 Análise de Margem</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top destinations by margin */}
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 tracking-tight">🟢 Destinos Mais Rentáveis</h3>
          {topDest.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topDest} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis type="number" unit="%" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={50} />
                <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                <Bar dataKey="margemMedia" name="Margem %" radius={[0, 4, 4, 0]}>
                  {topDest.map((d, i) => (
                    <Cell key={i} fill={d.margemMedia >= 20 ? "hsl(var(--success))" : d.margemMedia >= 10 ? "hsl(var(--chart-1))" : "hsl(var(--warning))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados suficientes</p>}
        </Card>

        {/* Product margin */}
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 tracking-tight">Margem por Produto</h3>
          {productMargin.length > 0 ? (
            <div className="space-y-3">
              {productMargin.map(p => {
                const barColor = p.margemMedia >= 20 ? "bg-success" : p.margemMedia >= 10 ? "bg-accent" : p.margemMedia >= 0 ? "bg-warning" : "bg-destructive";
                return (
                  <div key={p.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-foreground font-medium">{p.name}</span>
                      <span className="text-muted-foreground">{p.count} vendas • {p.margemMedia.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${Math.min(Math.max(p.margemMedia, 0), 50) * 2}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
        </Card>
      </div>

      {/* Destination detail table */}
      {destMargin.length > 0 && (
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 tracking-tight">Tabela Dinâmica: Margem por Destino</h3>
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Destino</TableHead>
                  <TableHead className="text-xs text-right">Vendas</TableHead>
                  <TableHead className="text-xs text-right">Receita</TableHead>
                  <TableHead className="text-xs text-right">Custo</TableHead>
                  <TableHead className="text-xs text-right">Lucro</TableHead>
                  <TableHead className="text-xs text-right">Margem %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {destMargin.slice(0, 15).map(d => (
                  <TableRow key={d.name}>
                    <TableCell className="text-xs font-mono font-medium">{d.name}</TableCell>
                    <TableCell className="text-xs text-right">{d.count}</TableCell>
                    <TableCell className="text-xs text-right">{fmt(d.receita)}</TableCell>
                    <TableCell className="text-xs text-right">{fmt(d.custo)}</TableCell>
                    <TableCell className={`text-xs text-right font-medium ${d.lucro >= 0 ? "text-success" : "text-destructive"}`}>{fmt(d.lucro)}</TableCell>
                    <TableCell className={`text-xs text-right font-mono font-bold ${d.margemMedia >= 15 ? "text-success" : d.margemMedia >= 8 ? "text-warning" : "text-destructive"}`}>
                      {d.margemMedia.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
