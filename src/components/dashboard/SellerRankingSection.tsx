import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Crown, Trophy, Medal, TrendingUp } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Sale {
  received_value: number;
  total_cost: number;
  margin: number;
  seller_id: string | null;
}

interface Props {
  filtered: Sale[];
  sellerNames: Record<string, string>;
}

export default function SellerRankingSection({ filtered, sellerNames }: Props) {
  const ranking = useMemo(() => {
    const map: Record<string, { name: string; receita: number; lucro: number; vendas: number; margem: number[] }> = {};
    filtered.forEach(s => {
      const sid = s.seller_id || "sem";
      const name = sellerNames[sid] || "Sem vendedor";
      if (!map[sid]) map[sid] = { name, receita: 0, lucro: 0, vendas: 0, margem: [] };
      map[sid].receita += s.received_value || 0;
      map[sid].lucro += (s.received_value || 0) - (s.total_cost || 0);
      map[sid].vendas++;
      map[sid].margem.push(s.margin || 0);
    });
    return Object.values(map)
      .map(v => ({
        ...v,
        ticket: v.vendas > 0 ? v.receita / v.vendas : 0,
        margemMedia: v.margem.length > 0 ? v.margem.reduce((a, b) => a + b, 0) / v.margem.length : 0,
      }))
      .sort((a, b) => b.receita - a.receita);
  }, [filtered, sellerNames]);

  const topPerformer = ranking[0];
  const Icons = [Crown, Trophy, Medal];

  return (
    <div className="space-y-4">
      <h2 className="section-title">🏆 Ranking de Vendedores</h2>

      {/* Top Performer Highlight */}
      {topPerformer && topPerformer.vendas > 1 && (
        <Card className="p-5 glass-card border-accent/30 bg-gradient-to-r from-accent/5 to-transparent">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-accent/15">
              <Crown className="w-6 h-6 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">🔥 Top Performer do Período</p>
              <p className="text-lg font-bold text-foreground">{topPerformer.name}</p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground">Receita</p>
              <p className="text-base font-bold text-success">{fmt(topPerformer.receita)}</p>
            </div>
            <div className="text-right hidden md:block">
              <p className="text-xs text-muted-foreground">Vendas</p>
              <p className="text-base font-bold text-foreground">{topPerformer.vendas}</p>
            </div>
            <div className="text-right hidden md:block">
              <p className="text-xs text-muted-foreground">Margem</p>
              <p className="text-base font-bold text-accent">{topPerformer.margemMedia.toFixed(1)}%</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue chart */}
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 tracking-tight">Receita por Vendedor</h3>
          {ranking.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, ranking.length * 35)}>
              <BarChart data={ranking} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={100} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                <Bar dataKey="receita" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} name="Receita" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
        </Card>

        {/* Full ranking table */}
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 tracking-tight">Ranking Completo</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-8">#</TableHead>
                  <TableHead className="text-xs">Vendedor</TableHead>
                  <TableHead className="text-xs text-right">Vendas</TableHead>
                  <TableHead className="text-xs text-right">Receita</TableHead>
                  <TableHead className="text-xs text-right">Lucro</TableHead>
                  <TableHead className="text-xs text-right">Ticket</TableHead>
                  <TableHead className="text-xs text-right">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.map((s, i) => {
                  const Icon = Icons[i] || TrendingUp;
                  return (
                    <TableRow key={s.name}>
                      <TableCell className="text-xs">
                        {i < 3 ? <Icon className={`w-4 h-4 ${i === 0 ? "text-warning" : i === 1 ? "text-muted-foreground" : "text-amber-700"}`} /> : <span className="text-muted-foreground">{i + 1}</span>}
                      </TableCell>
                      <TableCell className="text-xs font-medium">{s.name}</TableCell>
                      <TableCell className="text-xs text-right">{s.vendas}</TableCell>
                      <TableCell className="text-xs text-right text-success font-medium">{fmt(s.receita)}</TableCell>
                      <TableCell className="text-xs text-right">{fmt(s.lucro)}</TableCell>
                      <TableCell className="text-xs text-right">{fmt(s.ticket)}</TableCell>
                      <TableCell className={`text-xs text-right font-mono ${s.margemMedia >= 15 ? "text-success" : s.margemMedia >= 8 ? "text-warning" : "text-destructive"}`}>
                        {s.margemMedia.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
