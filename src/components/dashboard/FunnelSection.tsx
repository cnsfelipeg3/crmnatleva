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

const FUNNEL_STAGES = [
  { key: "all", label: "Total de Vendas", match: (_: Sale) => true, color: "hsl(var(--chart-3))" },
  { key: "concluida", label: "Concluída", match: (s: Sale) => s.status === "Concluída", color: "hsl(var(--chart-1))" },
  { key: "rascunho", label: "Rascunho", match: (s: Sale) => s.status === "Rascunho", color: "hsl(var(--chart-5))" },
  { key: "com_receita", label: "Com Receita", match: (s: Sale) => (s.received_value || 0) > 0, color: "hsl(var(--success))" },
  { key: "com_custo", label: "Com Custo Lançado", match: (s: Sale) => (s.total_cost || 0) > 0, color: "hsl(var(--chart-2))" },
  { key: "lucrativa", label: "Lucrativa (margem > 0)", match: (s: Sale) => ((s.received_value || 0) - (s.total_cost || 0)) > 0, color: "hsl(var(--accent))" },
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

  return (
    <>
      <Card className="p-5 glass-card">
        <h3 className="section-title text-base mb-4">🎯 Funil de Vendas</h3>
        <div className="space-y-2.5">
          {stages.map(stage => {
            const widthPct = Math.max((stage.count / maxCount) * 100, 6);
            return (
              <div
                key={stage.key}
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => setDrillStage(stage.key)}
              >
                <span className="text-[10px] text-muted-foreground w-32 text-right truncate group-hover:text-foreground transition-colors">
                  {stage.label}
                </span>
                <div className="flex-1 h-9 bg-muted/20 rounded-lg relative overflow-hidden group-hover:bg-muted/30 transition-colors">
                  <div
                    className="h-full rounded-lg flex items-center justify-between px-3 transition-all duration-500"
                    style={{ width: `${widthPct}%`, backgroundColor: stage.color, opacity: 0.9 }}
                  >
                    <span className="text-[11px] font-bold text-white drop-shadow-sm">{stage.count}</span>
                    {stage.count > 0 && (
                      <span className="text-[9px] text-white/80 font-medium hidden sm:inline">{fmt(stage.receita)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs border-t border-border pt-3">
          <span className="text-muted-foreground">Concluídas / Total</span>
          <span className="font-bold text-accent">
            {stages[0].count > 0 ? ((stages[1].count / stages[0].count) * 100).toFixed(1) : "0"}%
          </span>
        </div>
      </Card>

      <Dialog open={!!drillStage} onOpenChange={() => setDrillStage(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{drillData?.label} — {drillData?.count} vendas</DialogTitle>
          </DialogHeader>
          {drillData && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">ID</TableHead>
                  <TableHead className="text-xs">Nome</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drillData.items.slice(0, 50).map(s => (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/sales/${s.id}`)}>
                    <TableCell className="text-xs font-mono">{s.display_id}</TableCell>
                    <TableCell className="text-xs">{s.name}</TableCell>
                    <TableCell className="text-xs">{s.status}</TableCell>
                    <TableCell className="text-xs text-right">{fmt(s.received_value)}</TableCell>
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
