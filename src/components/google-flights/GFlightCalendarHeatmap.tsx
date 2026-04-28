import { useMemo } from "react";
import { Calendar as CalIcon, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatBRL, priceLevelClass, type GCalendarDay } from "./gflightsTypes";
import { cn } from "@/lib/utils";

interface Props {
  days: GCalendarDay[];
  isLoading: boolean;
  selectedDate?: string | null;
  onSelectDate?: (date: string) => void;
}

const DOW_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function GFlightCalendarHeatmap({ days, isLoading, selectedDate, onSelectDate }: Props) {
  // Agrupa por mês
  const months = useMemo(() => {
    const byMonth = new Map<string, GCalendarDay[]>();
    days.forEach((d) => {
      const ym = d.date.slice(0, 7);
      if (!byMonth.has(ym)) byMonth.set(ym, []);
      byMonth.get(ym)!.push(d);
    });
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, list]) => {
        const validPrices = list.map((d) => d.price).filter((p): p is number => typeof p === "number");
        return {
          ym,
          list,
          min: validPrices.length ? Math.min(...validPrices) : undefined,
          max: validPrices.length ? Math.max(...validPrices) : undefined,
        };
      });
  }, [days]);

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <CalIcon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Calendário de preços</h3>
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-auto" />
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded" />
          ))}
        </div>
      </Card>
    );
  }

  if (months.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <CalIcon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground">Calendário de preços</h3>
        </div>
        <p className="text-xs text-muted-foreground">Sem dados de calendário para essa rota.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <CalIcon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Calendário de preços</h3>
        <div className="ml-auto flex items-center gap-2 text-[10px]">
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300">Baixo</Badge>
          <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300">Típico</Badge>
          <Badge variant="outline" className="border-rose-500/40 text-rose-700 dark:text-rose-300">Alto</Badge>
        </div>
      </div>

      {months.map(({ ym, list, min, max }) => {
        const [yy, mm] = ym.split("-").map(Number);
        const monthLabel = new Date(yy, mm - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
        const firstDate = new Date(yy, mm - 1, 1);
        const startDow = firstDate.getDay();
        const daysInMonth = new Date(yy, mm, 0).getDate();
        const cells: (GCalendarDay | null)[] = [];
        for (let i = 0; i < startDow; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${ym}-${String(d).padStart(2, "0")}`;
          const found = list.find((x) => x.date === dateStr);
          cells.push(found ?? { date: dateStr, price: null });
        }

        return (
          <div key={ym}>
            <div className="text-xs font-medium capitalize mb-2 text-muted-foreground">{monthLabel}</div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DOW_LABELS.map((d) => (
                <div key={d} className="text-[9px] text-center text-muted-foreground/60 font-medium">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((cell, i) => {
                if (!cell) return <div key={i} />;
                const dayNum = parseInt(cell.date.slice(-2), 10);
                const isSelected = selectedDate === cell.date;
                const klass = priceLevelClass(cell.level, cell.price, min, max);
                return (
                  <button
                    key={cell.date}
                    type="button"
                    onClick={() => onSelectDate?.(cell.date)}
                    className={cn(
                      "h-12 rounded border text-[10px] flex flex-col items-center justify-center transition-all",
                      klass,
                      isSelected && "ring-2 ring-primary scale-105 shadow-sm",
                      "hover:scale-105 hover:shadow-sm",
                    )}
                  >
                    <div className="font-bold text-[11px] leading-none">{dayNum}</div>
                    {cell.price !== null && cell.price !== undefined ? (
                      <div className="text-[9px] font-medium leading-none mt-0.5">
                        {formatBRL(cell.price).replace("R$", "").trim()}
                      </div>
                    ) : (
                      <div className="text-[9px] text-muted-foreground/40 leading-none mt-0.5">—</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </Card>
  );
}
