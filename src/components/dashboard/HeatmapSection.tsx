import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { iataToCityName } from "@/lib/iataUtils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Sale {
  destination_iata: string | null;
  received_value: number;
  created_at: string;
}
interface Props { filtered: Sale[]; }

export default function HeatmapSection({ filtered }: Props) {
  // Destination heatmap
  const destHeat = useMemo(() => {
    const map: Record<string, { iata: string; city: string; count: number; revenue: number }> = {};
    filtered.forEach(s => {
      if (!s.destination_iata) return;
      const iata = s.destination_iata;
      if (!map[iata]) map[iata] = { iata, city: iataToCityName(iata), count: 0, revenue: 0 };
      map[iata].count++;
      map[iata].revenue += s.received_value || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 30);
  }, [filtered]);

  // Monthly × Day of week heatmap
  const dayMonthHeat = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(12).fill(0));
    filtered.forEach(s => {
      const d = new Date(s.created_at);
      grid[d.getDay()][d.getMonth()] += 1;
    });
    return grid;
  }, [filtered]);

  const maxDayMonth = Math.max(...dayMonthHeat.flat(), 1);
  const maxDest = Math.max(...destHeat.map(d => d.count), 1);

  const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const monthLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  const getHeatColor = (value: number, max: number) => {
    const intensity = max > 0 ? value / max : 0;
    if (intensity === 0) return "hsl(var(--muted) / 0.3)";
    if (intensity < 0.25) return "hsl(160 60% 50% / 0.2)";
    if (intensity < 0.5) return "hsl(160 60% 50% / 0.4)";
    if (intensity < 0.75) return "hsl(160 60% 50% / 0.65)";
    return "hsl(160 60% 50% / 0.9)";
  };

  return (
    <div className="space-y-4">
      <h2 className="section-title">🔥 Heatmaps</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Destination Heatmap */}
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 tracking-tight">Destinos Mais Vendidos</h3>
          <div className="flex flex-wrap gap-1.5">
            {destHeat.map(d => {
              const intensity = d.count / maxDest;
              return (
                <Tooltip key={d.iata}>
                  <TooltipTrigger asChild>
                    <div
                      className="rounded-md px-2 py-1.5 text-[10px] font-medium cursor-default transition-all hover:scale-105 border"
                      style={{
                        backgroundColor: `hsl(160 60% 50% / ${0.1 + intensity * 0.8})`,
                        borderColor: `hsl(160 60% 50% / ${0.15 + intensity * 0.4})`,
                        color: intensity > 0.5 ? 'white' : 'hsl(var(--foreground))',
                      }}
                    >
                      {d.city} ({d.count})
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs font-semibold">{d.city} ({d.iata})</p>
                    <p className="text-xs">{d.count} vendas • {fmt(d.revenue)}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
          {destHeat.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
        </Card>

        {/* Day of Week × Month Heatmap */}
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 tracking-tight">Vendas por Dia × Mês</h3>
          <div className="overflow-x-auto">
            <div className="inline-grid gap-[2px]" style={{ gridTemplateColumns: `40px repeat(12, 1fr)` }}>
              {/* Header */}
              <div />
              {monthLabels.map(m => (
                <div key={m} className="text-[9px] text-muted-foreground text-center font-medium">{m}</div>
              ))}
              
              {dayLabels.map((day, di) => (
                <>
                  <div key={`label-${di}`} className="text-[9px] text-muted-foreground text-right pr-2 flex items-center justify-end">{day}</div>
                  {monthLabels.map((_, mi) => {
                    const val = dayMonthHeat[di][mi];
                    return (
                      <Tooltip key={`${di}-${mi}`}>
                        <TooltipTrigger asChild>
                          <div
                            className="w-full aspect-square rounded-sm min-w-[20px] min-h-[20px] cursor-default transition-all hover:ring-1 hover:ring-foreground/20"
                            style={{ backgroundColor: getHeatColor(val, maxDayMonth) }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{day} - {monthLabels[mi]}: {val} vendas</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-2 mt-3 justify-end">
            <span className="text-[9px] text-muted-foreground">Menos</span>
            {[0.1, 0.3, 0.5, 0.7, 0.9].map(i => (
              <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: `hsl(160 60% 50% / ${i})` }} />
            ))}
            <span className="text-[9px] text-muted-foreground">Mais</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
