import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarTask {
  id: string;
  date: string | null; // ISO date string
  label: string;
  sublabel?: string;
  statusDot: string; // tailwind bg class for dot
  statusLabel?: string;
  statusColor?: string; // tailwind classes for badge
  onClick?: () => void;
}

interface Props {
  tasks: CalendarTask[];
  emptyMessage?: string;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TaskCalendarView({ tasks, emptyMessage = "Sem tarefas" }: Props) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const tasksByDate = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    tasks.forEach((t) => {
      if (!t.date) return;
      const d = new Date(t.date);
      const key = toDateKey(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return map;
  }, [tasks]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = firstDay.getDay();

    const days: { date: Date; inMonth: boolean }[] = [];

    // Previous month padding
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, inMonth: false });
    }

    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), inMonth: true });
    }

    // Next month padding to fill 6 rows
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), inMonth: false });
    }

    return days;
  }, [currentMonth]);

  const todayKey = toDateKey(new Date());

  const goToPrev = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const goToNext = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const goToToday = () => setCurrentMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={goToPrev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={goToNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <h3 className="text-sm font-semibold text-foreground ml-1">
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
        </div>
        <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={goToToday}>
          Hoje
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border/50">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="text-[10px] font-semibold text-muted-foreground uppercase text-center py-2">
            {wd}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map(({ date, inMonth }, idx) => {
          const key = toDateKey(date);
          const isToday = key === todayKey;
          const dayTasks = tasksByDate.get(key) || [];

          return (
            <div
              key={idx}
              className={cn(
                "min-h-[100px] border-b border-r border-border/30 p-1.5 transition-colors",
                !inMonth && "bg-muted/20",
                isToday && "bg-primary/5",
                idx % 7 === 6 && "border-r-0",
              )}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                    !inMonth && "text-muted-foreground/40",
                    inMonth && "text-foreground",
                    isToday && "bg-primary text-primary-foreground font-bold",
                  )}
                >
                  {date.getDate()}
                </span>
                {dayTasks.length > 0 && (
                  <Badge variant="secondary" className="text-[8px] h-4 px-1.5">
                    {dayTasks.length}
                  </Badge>
                )}
              </div>

              {/* Tasks */}
              <div className="space-y-0.5 overflow-hidden">
                {dayTasks.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    onClick={t.onClick}
                    className={cn(
                      "w-full text-left px-1.5 py-0.5 rounded text-[9px] leading-tight truncate flex items-center gap-1",
                      "hover:bg-accent/50 transition-colors",
                      t.onClick ? "cursor-pointer" : "cursor-default",
                    )}
                    title={`${t.label}${t.sublabel ? ` — ${t.sublabel}` : ""}`}
                  >
                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", t.statusDot)} />
                    <span className="truncate text-foreground font-medium">{t.label}</span>
                  </button>
                ))}
                {dayTasks.length > 3 && (
                  <p className="text-[8px] text-muted-foreground px-1.5">+{dayTasks.length - 3} mais</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
