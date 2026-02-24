import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { normalizeProduct } from "@/lib/iataUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const RANGES = [
  { key: "0-5k", label: "Até 5k", min: 0, max: 5000 },
  { key: "5-10k", label: "5k-10k", min: 5000, max: 10000 },
  { key: "10-20k", label: "10k-20k", min: 10000, max: 20000 },
  { key: "20-35k", label: "20k-35k", min: 20000, max: 35000 },
  { key: "35-60k", label: "35k-60k", min: 35000, max: 60000 },
  { key: "60k+", label: "60k+", min: 60000, max: Infinity },
];

const COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--accent))",
];

interface Sale { id: string; display_id: string; name: string; received_value: number; total_cost: number; margin: number; destination_iata: string | null; }
interface Props { filtered: Sale[]; }

export default function ValueRangeSection({ filtered }: Props) {
  const [drillRange, setDrillRange] = useState<string | null>(null);
  const navigate = useNavigate();

  const data = useMemo(() => {
    return RANGES.map((r, idx) => {
      const items = filtered.filter(s => (s.received_value || 0) >= r.min && (s.received_value || 0) < r.max);
      const receita = items.reduce((s, v) => s + (v.received_value || 0), 0);
      const margem = items.length > 0 ? items.reduce((s, v) => s + (v.margin || 0), 0) / items.length : 0;
      return { name: r.label, vendas: items.length, receita, margem: Number(margem.toFixed(1)), color: COLORS[idx], items };
    });
  }, [filtered]);

  const drillData = drillRange ? data.find(d => d.name === drillRange) : null;

  return (
    <>
      <Card className="p-5 glass-card">
        <h3 className="section-title text-base mb-4">💰 Análise por Faixa de Valor</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} onClick={(e) => e?.activeLabel && setDrillRange(e.activeLabel)}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip
              formatter={(v: number, name: string) => name === "receita" ? fmt(v) : name === "margem" ? `${v}%` : v}
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }}
            />
            <Bar dataKey="vendas" name="Vendas" radius={[4, 4, 0, 0]} className="cursor-pointer">
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2">
          {data.map(d => (
            <div key={d.name} className="text-center p-2 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/60 transition-colors" onClick={() => setDrillRange(d.name)}>
              <p className="text-[10px] text-muted-foreground uppercase">{d.name}</p>
              <p className="text-xs font-bold text-foreground">{d.vendas} vendas</p>
              <p className="text-[10px] text-muted-foreground">Margem {d.margem}%</p>
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={!!drillRange} onOpenChange={() => setDrillRange(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vendas — Faixa {drillRange}</DialogTitle>
          </DialogHeader>
          {drillData && (
            <div>
              <div className="flex gap-4 mb-4 text-sm">
                <span className="text-muted-foreground">{drillData.items.length} vendas</span>
                <span className="text-success font-medium">{fmt(drillData.receita)}</span>
                <span className="text-muted-foreground">Margem {drillData.margem}%</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">ID</TableHead>
                    <TableHead className="text-xs">Nome</TableHead>
                    <TableHead className="text-xs text-right">Valor</TableHead>
                    <TableHead className="text-xs text-right">Margem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drillData.items.slice(0, 50).map(s => (
                    <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/sales/${s.id}`)}>
                      <TableCell className="text-xs font-mono">{s.display_id}</TableCell>
                      <TableCell className="text-xs">{s.name}</TableCell>
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
