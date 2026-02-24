import { useMemo } from "react";
import { Card } from "@/components/ui/card";

interface Sale { status: string; emission_status: string | null; }
interface Props { filtered: Sale[]; }

const FUNNEL_STAGES = [
  { key: "rascunho", label: "Rascunho / Lead", match: (s: Sale) => s.status === "Rascunho" },
  { key: "orcamento", label: "Orçamento Enviado", match: (s: Sale) => s.status === "Orçamento Enviado" || s.status === "Orçamento" },
  { key: "aguardando", label: "Aguardando Pagto", match: (s: Sale) => s.status === "Aguardando Pagamento" },
  { key: "fechado", label: "Fechado", match: (s: Sale) => s.status === "Fechado" },
  { key: "emitido", label: "Emitido", match: (s: Sale) => s.status === "Emitido" || s.emission_status === "emitido" },
  { key: "finalizado", label: "Finalizado", match: (s: Sale) => s.status === "Finalizado" },
];

const COLORS = [
  "hsl(var(--chart-3))", "hsl(var(--chart-2))", "hsl(var(--chart-5))",
  "hsl(var(--chart-1))", "hsl(var(--accent))", "hsl(var(--success))",
];

export default function FunnelSection({ filtered }: Props) {
  const stages = useMemo(() => {
    return FUNNEL_STAGES.map((stage, i) => {
      const count = filtered.filter(stage.match).length;
      return { ...stage, count, color: COLORS[i] };
    });
  }, [filtered]);

  const maxCount = Math.max(...stages.map(s => s.count), 1);
  const totalStart = stages[0]?.count || 0;
  const totalEnd = stages[stages.length - 1]?.count || 0;
  const conversionRate = totalStart > 0 ? ((totalEnd / totalStart) * 100).toFixed(1) : "0";

  return (
    <Card className="p-5 glass-card">
      <h3 className="section-title text-base mb-4">🎯 Funil de Vendas</h3>
      <div className="space-y-2">
        {stages.map((stage, i) => {
          const widthPct = Math.max((stage.count / maxCount) * 100, 8);
          return (
            <div key={stage.key} className="flex items-center gap-3">
              <span className="text-[10px] text-muted-foreground w-28 text-right truncate">{stage.label}</span>
              <div className="flex-1 h-8 bg-muted/30 rounded-md relative overflow-hidden">
                <div
                  className="h-full rounded-md flex items-center justify-end pr-2 transition-all duration-500"
                  style={{ width: `${widthPct}%`, backgroundColor: stage.color, opacity: 0.85 }}
                >
                  <span className="text-[11px] font-bold text-white drop-shadow-sm">{stage.count}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Taxa de conversão total</span>
        <span className="font-bold text-accent">{conversionRate}%</span>
      </div>
    </Card>
  );
}
