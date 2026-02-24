import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { iataToCityName, iataToLabel } from "@/lib/iataUtils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Sale {
  id: string; display_id: string; name: string;
  destination_iata: string | null;
  received_value: number; margin: number;
  created_at: string; status: string;
}
interface Props { filtered: Sale[]; }

export default function HeatmapSection({ filtered }: Props) {
  const navigate = useNavigate();
  const [drilldown, setDrilldown] = useState<{ label: string; sales: Sale[] } | null>(null);

  const destHeat = useMemo(() => {
    const map: Record<string, { iata: string; city: string; count: number; revenue: number; sales: Sale[] }> = {};
    filtered.forEach(s => {
      if (!s.destination_iata) return;
      const iata = s.destination_iata;
      if (!map[iata]) map[iata] = { iata, city: iataToCityName(iata), count: 0, revenue: 0, sales: [] };
      map[iata].count++;
      map[iata].revenue += s.received_value || 0;
      map[iata].sales.push(s);
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 30);
  }, [filtered]);

  const dayMonthHeat = useMemo(() => {
    const grid: { count: number; sales: Sale[] }[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 12 }, () => ({ count: 0, sales: [] }))
    );
    filtered.forEach(s => {
      const d = new Date(s.created_at);
      grid[d.getDay()][d.getMonth()].count++;
      grid[d.getDay()][d.getMonth()].sales.push(s);
    });
    return grid;
  }, [filtered]);

  const maxDayMonth = Math.max(...dayMonthHeat.flat().map(c => c.count), 1);
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
    <>
      <div className="space-y-4">
        <h2 className="section-title">🔥 Heatmaps</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 tracking-tight">Destinos Mais Vendidos</h3>
            <div className="flex flex-wrap gap-1.5">
              {destHeat.map(d => {
                const intensity = d.count / maxDest;
                return (
                  <Tooltip key={d.iata}>
                    <TooltipTrigger asChild>
                      <div
                        className="rounded-md px-2 py-1.5 text-[10px] font-medium cursor-pointer transition-all hover:scale-105 border"
                        style={{
                          backgroundColor: `hsl(160 60% 50% / ${0.1 + intensity * 0.8})`,
                          borderColor: `hsl(160 60% 50% / ${0.15 + intensity * 0.4})`,
                          color: intensity > 0.5 ? 'white' : 'hsl(var(--foreground))',
                        }}
                        onClick={() => setDrilldown({ label: `Destino: ${d.city} (${d.iata})`, sales: d.sales })}
                      >
                        {d.city} ({d.count})
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs font-semibold">{d.city} ({d.iata})</p>
                      <p className="text-xs">{d.count} vendas • {fmt(d.revenue)}</p>
                      <p className="text-[10px] text-muted-foreground">Clique para ver vendas</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
            {destHeat.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
          </Card>

          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 tracking-tight">Vendas por Dia × Mês</h3>
            <div className="overflow-x-auto">
              <div className="inline-grid gap-[2px]" style={{ gridTemplateColumns: `40px repeat(12, 1fr)` }}>
                <div />
                {monthLabels.map(m => (
                  <div key={m} className="text-[9px] text-muted-foreground text-center font-medium">{m}</div>
                ))}
                {dayLabels.map((day, di) => (
                  <>
                    <div key={`label-${di}`} className="text-[9px] text-muted-foreground text-right pr-2 flex items-center justify-end">{day}</div>
                    {monthLabels.map((mLabel, mi) => {
                      const cell = dayMonthHeat[di][mi];
                      return (
                        <Tooltip key={`${di}-${mi}`}>
                          <TooltipTrigger asChild>
                            <div
                              className={`w-full aspect-square rounded-sm min-w-[20px] min-h-[20px] transition-all hover:ring-1 hover:ring-foreground/20 ${cell.count > 0 ? 'cursor-pointer' : 'cursor-default'}`}
                              style={{ backgroundColor: getHeatColor(cell.count, maxDayMonth) }}
                              onClick={() => cell.count > 0 && setDrilldown({ label: `${day} - ${mLabel}: ${cell.count} vendas`, sales: cell.sales })}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">{day} - {mLabel}: {cell.count} vendas</p>
                            {cell.count > 0 && <p className="text-[10px] text-muted-foreground">Clique para ver</p>}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
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

      <Dialog open={!!drilldown} onOpenChange={() => setDrilldown(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{drilldown?.label} — {drilldown?.sales.length} vendas</DialogTitle>
          </DialogHeader>
          {drilldown && (
            <>
              <div className="flex gap-4 text-xs text-muted-foreground mb-2">
                <span>Receita: <strong className="text-foreground">{fmt(drilldown.sales.reduce((s, v) => s + (v.received_value || 0), 0))}</strong></span>
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
                  {drilldown.sales.slice(0, 80).map(s => (
                    <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setDrilldown(null); navigate(`/sales/${s.id}`); }}>
                      <TableCell className="text-xs font-mono">{s.display_id}</TableCell>
                      <TableCell className="text-xs">{s.name}</TableCell>
                      <TableCell className="text-xs">{iataToLabel(s.destination_iata)}</TableCell>
                      <TableCell className="text-xs text-right">{fmt(s.received_value || 0)}</TableCell>
                      <TableCell className="text-xs text-right">{(s.margin || 0).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
