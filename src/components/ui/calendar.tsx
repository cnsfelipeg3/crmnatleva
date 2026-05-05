import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, useNavigation, type CaptionProps } from "react-day-picker";
import { ptBR } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function CustomCaption(props: CaptionProps & { fromYear?: number; toYear?: number }) {
  const { goToMonth, nextMonth, previousMonth } = useNavigation();
  const month = props.displayMonth.getMonth();
  const year = props.displayMonth.getFullYear();
  const fromYear = props.fromYear ?? 1900;
  const toYear = props.toYear ?? new Date().getFullYear() + 20;
  const years: number[] = [];
  for (let y = toYear; y >= fromYear; y--) years.push(y);

  return (
    <div className="flex items-center justify-between gap-2 px-1 pb-2">
      <button
        type="button"
        onClick={() => previousMonth && goToMonth(previousMonth)}
        disabled={!previousMonth}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "h-8 w-8 disabled:opacity-30",
        )}
        aria-label="Mês anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-1.5 flex-1 justify-center">
        <Select value={String(month)} onValueChange={(v) => goToMonth(new Date(year, +v, 1))}>
          <SelectTrigger className="h-8 px-2.5 text-xs font-medium border-border/60 bg-background hover:bg-muted/50 focus:ring-1 focus:ring-ring">
            <SelectValue>{MONTHS_PT[month]}</SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {MONTHS_PT.map((name, i) => (
              <SelectItem key={i} value={String(i)} className="text-sm">{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => goToMonth(new Date(+v, month, 1))}>
          <SelectTrigger className="h-8 px-2.5 text-xs font-medium border-border/60 bg-background hover:bg-muted/50 focus:ring-1 focus:ring-ring w-[80px]">
            <SelectValue>{year}</SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {years.map((y) => (
              <SelectItem key={y} value={String(y)} className="text-sm tabular-nums">{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <button
        type="button"
        onClick={() => nextMonth && goToMonth(nextMonth)}
        disabled={!nextMonth}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "h-8 w-8 disabled:opacity-30",
        )}
        aria-label="Próximo mês"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  // Pull fromYear/toYear so we can pass them to the caption while still letting
  // react-day-picker enforce the navigation limits.
  const { fromYear, toYear, locale, ...rest } = props as any;

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={locale ?? ptBR}
      fromYear={fromYear}
      toYear={toYear}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-2",
        caption: "relative",
        caption_label: "hidden",
        caption_dropdowns: "hidden",
        nav: "hidden",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.75rem] uppercase tracking-wide",
        row: "flex w-full mt-1",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-muted"),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-semibold",
        day_today: "ring-1 ring-primary/40 text-foreground font-semibold",
        day_outside:
          "day-outside text-muted-foreground/50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground/40 opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Caption: (capProps) => <CustomCaption {...capProps} fromYear={fromYear} toYear={toYear} />,
      }}
      {...rest}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
