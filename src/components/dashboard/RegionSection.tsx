import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { iataToLabel } from "@/lib/iataUtils";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const REGION_COLORS: Record<string, string> = {
  "Europa": "hsl(var(--chart-1))", "América do Norte": "hsl(var(--chart-2))",
  "América do Sul": "hsl(var(--chart-4))", "Oriente Médio": "hsl(var(--chart-5))",
  "Ásia": "hsl(var(--chart-3))", "Caribe": "hsl(38, 70%, 55%)",
  "África": "hsl(20, 60%, 50%)", "Outros": "hsl(var(--muted-foreground))",
};

const REGION_EMOJI: Record<string, string> = {
  "Europa": "🌍", "América do Norte": "🗽", "América do Sul": "🌎",
  "Oriente Médio": "🕌", "Ásia": "🏯", "Caribe": "🏖", "África": "🌍", "Outros": "📍",
};

interface Sale {
  id: string; display_id: string; name: string;
  destination_iata: string | null;
  received_value: number; total_cost: number; margin: number;
}

interface Props {
  filtered: Sale[];
  getRegion: (iata: string | null) => string;
}

export default function RegionSection({ filtered, getRegion }: Props) {
  const [drillRegion, setDrillRegion] = useState<string | null>(null);
  const navigate = useNavigate();

  const regionData = useMemo(() => {
    const map: Record<string, { name: string; vendas: number; receita: number; lucro: number; margem: number[]; sales: Sale[] }> = {};
    filtered.forEach(s => {
      const r = getRegion(s.destination_iata);
      if (r === "Desconhecido") return;
      if (!map[r]) map[r] = { name: r, vendas: 0, receita: 0, lucro: 0, margem: [], sales: [] };
      map[r].vendas++;
      map[r].receita += s.received_value || 0;
      map[r].lucro += (s.received_value || 0) - (s.total_cost || 0);
      map[r].margem.push(s.margin || 0);
      map[r].sales.push(s);
    });
    return Object.values(map)
      .map(r => ({ ...r, margemMedia: r.margem.length > 0 ? r.margem.reduce((a, b) => a + b, 0) / r.margem.length : 0 }))
      .sort((a, b) => b.receita - a.receita);
  }, [filtered, getRegion]);

  const pieData = regionData.map(r => ({ name: r.name, value: r.receita }));
  const drillData = drillRegion ? regionData.find(r => r.name === drillRegion) : null;

  if (regionData.length === 0) return null;

  return (
    <>
      <div className="space-y-4">
        <h2 className="section-title">🌍 Faturamento por Região</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-5 glass-card lg:col-span-1">
            <h3 className="text-sm font-semibold text-foreground mb-4 tracking-tight">Distribuição de Receita</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                  onClick={(_, idx) => setDrillRegion(regionData[idx]?.name || null)}
                  className="cursor-pointer"
                >
                  {pieData.map((d, i) => <Cell key={i} fill={REGION_COLORS[d.name] || "hsl(var(--muted))"} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5 glass-card lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-4 tracking-tight">Detalhamento por Região</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Região</TableHead>
                    <TableHead className="text-xs text-right">Vendas</TableHead>
                    <TableHead className="text-xs text-right">Receita</TableHead>
                    <TableHead className="text-xs text-right">Lucro</TableHead>
                    <TableHead className="text-xs text-right">Margem %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regionData.map(r => (
                    <TableRow key={r.name} className="cursor-pointer hover:bg-muted/50" onClick={() => setDrillRegion(r.name)}>
                      <TableCell className="text-xs font-medium">{REGION_EMOJI[r.name] || "📍"} {r.name}</TableCell>
                      <TableCell className="text-xs text-right">{r.vendas}</TableCell>
                      <TableCell className="text-xs text-right font-medium">{fmt(r.receita)}</TableCell>
                      <TableCell className={`text-xs text-right font-medium ${r.lucro >= 0 ? "text-success" : "text-destructive"}`}>{fmt(r.lucro)}</TableCell>
                      <TableCell className={`text-xs text-right font-mono ${r.margemMedia >= 15 ? "text-success" : r.margemMedia >= 8 ? "text-warning" : "text-destructive"}`}>
                        {r.margemMedia.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={!!drillRegion} onOpenChange={() => setDrillRegion(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{REGION_EMOJI[drillRegion || ""] || ""} Vendas — {drillRegion}</DialogTitle>
          </DialogHeader>
          {drillData && (
            <div>
              <div className="flex gap-4 mb-4 text-sm flex-wrap">
                <span className="text-muted-foreground">{drillData.vendas} vendas</span>
                <span className="text-success font-medium">Receita: {fmt(drillData.receita)}</span>
                <span className="text-accent font-medium">Margem: {drillData.margemMedia.toFixed(1)}%</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">ID</TableHead>
                    <TableHead className="text-xs">Nome</TableHead>
                    <TableHead className="text-xs">Destino</TableHead>
                    <TableHead className="text-xs text-right">Valor</TableHead>
                    <TableHead className="text-xs text-right">Margem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drillData.sales.slice(0, 50).map(s => (
                    <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/sales/${s.id}`)}>
                      <TableCell className="text-xs font-mono">{s.display_id}</TableCell>
                      <TableCell className="text-xs">{s.name}</TableCell>
                      <TableCell className="text-xs">{iataToLabel(s.destination_iata)}</TableCell>
                      <TableCell className="text-xs text-right">{fmt(s.received_value)}</TableCell>
                      <TableCell className={`text-xs text-right ${(s.margin || 0) >= 15 ? "text-success" : (s.margin || 0) >= 0 ? "text-warning" : "text-destructive"}`}>{(s.margin || 0).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
