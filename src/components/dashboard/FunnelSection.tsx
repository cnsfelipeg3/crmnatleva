import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Sale {
  id: string; display_id: string; name: string;
  status: string; emission_status: string | null;
  received_value: number; total_cost: number;
}
interface Props { filtered: Sale[]; }

// Real sales lifecycle funnel
const FUNNEL_STAGES = [
  { key: "total", label: "Total de Vendas", match: (_: Sale) => true, color: "hsl(var(--chart-3))" },
  { key: "com_receita", label: "Com Receita Registrada", match: (s: Sale) => (s.received_value || 0) > 0, color: "hsl(var(--chart-1))" },
  { key: "com_custo", label: "Com Custo Lançado", match: (s: Sale) => (s.total_cost || 0) > 0, color: "hsl(var(--chart-2))" },
  { key: "concluida", label: "Concluída / Emitida", match: (s: Sale) => s.status === "Concluída" || s.status === "Emitido", color: "hsl(var(--success))" },
  { key: "lucrativa", label: "Lucrativa (Lucro > 0)", match: (s: Sale) => ((s.received_value || 0) - (s.total_cost || 0)) > 0, color: "hsl(var(--accent))" },
];

export default function FunnelSection({ filtered }: Props) {
  const [drillStage, setDrillStage] = useState<string | null>(null);
  const navigate = useNavigate();

  const stages = useMemo(() => {
    return FUNNEL_STAGES.map(stage => {
      const items = filtered.filter(stage.match);
      const receita = items.reduce((s, v) => s + (v.received_value || 0), 0);
      return { ...stage, count: items.length, receita, items };
    });
  }, [filtered]);

  const maxCount = Math.max(...stages.map(s => s.count), 1);
  const drillData = drillStage ? stages.find(s => s.key === drillStage) : null;

  // Conversion rates
  const convRates = useMemo(() => {
    const rates: { from: string; to: string; rate: number }[] = [];
    for (let i = 0; i < stages.length - 1; i++) {
      if (stages[i].count > 0) {
        rates.push({
          from: stages[i].label,
          to: stages[i + 1].label,
          rate: (stages[i + 1].count / stages[i].count) * 100,
        });
      }
    }
    return rates;
  }, [stages]);

  return (
    <>
      <Card className="p-5 glass-card">
        <h3 className="section-title text-base mb-4">🎯 Funil de Vendas</h3>
        <div className="space-y-2">
          {stages.map((stage, idx) => {
            const widthPct = Math.max((stage.count / maxCount) * 100, 8);
            // Funnel shape: progressively narrower
            const paddingPct = idx * 3;
            return (
              <div key={stage.key} className="cursor-pointer group" onClick={() => setDrillStage(stage.key)}>
                <div className="flex items-center gap-3" style={{ paddingLeft: `${paddingPct}%`, paddingRight: `${paddingPct}%` }}>
                  <div className="flex-1 h-10 bg-muted/20 rounded-lg relative overflow-hidden group-hover:bg-muted/30 transition-colors">
                    <div
                      className="h-full rounded-lg flex items-center justify-between px-3 transition-all duration-500"
                      style={{ width: `${widthPct}%`, backgroundColor: stage.color, opacity: 0.85 }}
                    >
                      <span className="text-[11px] font-bold text-white drop-shadow-sm">{stage.count}</span>
                      <span className="text-[9px] text-white/80 font-medium hidden sm:inline">{fmt(stage.receita)}</span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 group-hover:text-foreground transition-colors" style={{ paddingLeft: `${paddingPct}%` }}>
                  {stage.label}
                  {idx > 0 && stages[idx - 1].count > 0 && (
                    <span className="ml-2 text-accent font-medium">
                      ({((stage.count / stages[idx - 1].count) * 100).toFixed(0)}%)
                    </span>
                  )}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-border space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Taxas de Conversão</p>
          {convRates.map((r, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate">{r.from} → {r.to}</span>
              <span className={`font-bold ${r.rate >= 70 ? "text-success" : r.rate >= 40 ? "text-warning" : "text-destructive"}`}>
                {r.rate.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={!!drillStage} onOpenChange={() => setDrillStage(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{drillData?.label} — {drillData?.count} vendas ({fmt(drillData?.receita || 0)})</DialogTitle>
          </DialogHeader>
          {drillData && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">ID</TableHead>
                  <TableHead className="text-xs">Nome</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                  <TableHead className="text-xs text-right">Lucro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drillData.items.slice(0, 50).map(s => (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setDrillStage(null); navigate(`/sales/${s.id}`); }}>
                    <TableCell className="text-xs font-mono">{s.display_id}</TableCell>
                    <TableCell className="text-xs">{s.name}</TableCell>
                    <TableCell className="text-xs">{s.status}</TableCell>
                    <TableCell className="text-xs text-right">{fmt(s.received_value)}</TableCell>
                    <TableCell className="text-xs text-right">{fmt((s.received_value || 0) - (s.total_cost || 0))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
