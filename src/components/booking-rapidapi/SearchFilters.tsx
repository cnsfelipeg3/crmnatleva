import { useState } from "react";
import { Calendar as CalendarIcon, Users, Minus, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

export interface GuestsConfig {
  adults: number;
  children: number[];
  rooms: number;
}

interface Props {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  guests: GuestsConfig;
  onGuestsChange: (guests: GuestsConfig) => void;
}

export function SearchFilters({
  dateRange,
  onDateRangeChange,
  guests,
  onGuestsChange,
}: Props) {
  const [guestsOpen, setGuestsOpen] = useState(false);

  const fmt = (d: Date | undefined) =>
    d ? format(d, "dd 'de' MMM", { locale: ptBR }) : "";

  const dateLabel =
    dateRange?.from && dateRange?.to
      ? `${fmt(dateRange.from)} → ${fmt(dateRange.to)}`
      : dateRange?.from
        ? `${fmt(dateRange.from)} → ...`
        : "Selecionar datas";

  const totalGuests = guests.adults + guests.children.length;
  const guestsLabel = `${totalGuests} hóspede${totalGuests !== 1 ? "s" : ""}, ${guests.rooms} quarto${guests.rooms !== 1 ? "s" : ""}`;

  const updAdults = (delta: number) =>
    onGuestsChange({
      ...guests,
      adults: Math.max(1, Math.min(10, guests.adults + delta)),
    });

  const updRooms = (delta: number) =>
    onGuestsChange({
      ...guests,
      rooms: Math.max(1, Math.min(5, guests.rooms + delta)),
    });

  const addChild = () => {
    if (guests.children.length >= 6) return;
    onGuestsChange({ ...guests, children: [...guests.children, 8] });
  };

  const removeChild = (idx: number) =>
    onGuestsChange({
      ...guests,
      children: guests.children.filter((_, i) => i !== idx),
    });

  const setChildAge = (idx: number, age: number) => {
    const next = [...guests.children];
    next[idx] = Math.max(0, Math.min(17, age));
    onGuestsChange({ ...guests, children: next });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Check-in e Check-out</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={onDateRangeChange}
              numberOfMonths={2}
              locale={ptBR}
              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Hóspedes</Label>
        <Popover open={guestsOpen} onOpenChange={setGuestsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start font-normal">
              <Users className="mr-2 h-4 w-4" />
              {guestsLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Adultos</div>
                  <div className="text-xs text-muted-foreground">A partir de 18 anos</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updAdults(-1)}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-6 text-center text-sm font-medium">{guests.adults}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updAdults(1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Crianças</div>
                    <div className="text-xs text-muted-foreground">0 a 17 anos</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={addChild} disabled={guests.children.length >= 6}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar
                  </Button>
                </div>
                {guests.children.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {guests.children.map((age, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <Label className="text-xs">Criança {idx + 1}</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={17}
                            value={age}
                            onChange={(e) => setChildAge(idx, Number(e.target.value))}
                            className="w-14 rounded border border-border bg-background px-2 py-1 text-sm"
                          />
                          <span className="text-xs text-muted-foreground">anos</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeChild(idx)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Quartos</div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updRooms(-1)}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-6 text-center text-sm font-medium">{guests.rooms}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updRooms(1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
