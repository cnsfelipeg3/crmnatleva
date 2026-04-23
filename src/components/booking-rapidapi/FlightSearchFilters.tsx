import { useState } from "react";
import {
  Calendar as CalendarIcon,
  Users,
  Minus,
  Plus,
  Plane,
  ArrowRight,
  ArrowLeftRight,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import type { CabinClass } from "./flightTypes";

export type TripType = "roundtrip" | "oneway";

export interface FlightPassengers {
  adults: number;
  children: number[]; // idades
}

interface Props {
  tripType: TripType;
  onTripTypeChange: (t: TripType) => void;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  oneWayDate: Date | undefined;
  onOneWayDateChange: (date: Date | undefined) => void;
  passengers: FlightPassengers;
  onPassengersChange: (p: FlightPassengers) => void;
  cabinClass: CabinClass;
  onCabinClassChange: (c: CabinClass) => void;
}

export function FlightSearchFilters({
  tripType,
  onTripTypeChange,
  dateRange,
  onDateRangeChange,
  oneWayDate,
  onOneWayDateChange,
  passengers,
  onPassengersChange,
  cabinClass,
  onCabinClassChange,
}: Props) {
  const [paxOpen, setPaxOpen] = useState(false);

  const fmt = (d: Date | undefined) =>
    d ? format(d, "dd 'de' MMM", { locale: ptBR }) : "";

  const dateLabel =
    tripType === "roundtrip"
      ? dateRange?.from && dateRange?.to
        ? `${fmt(dateRange.from)} → ${fmt(dateRange.to)}`
        : dateRange?.from
          ? `${fmt(dateRange.from)} → ...`
          : "Ida e volta"
      : oneWayDate
        ? fmt(oneWayDate)
        : "Data da ida";

  const totalPax = passengers.adults + passengers.children.length;
  const paxLabel = `${totalPax} passageiro${totalPax !== 1 ? "s" : ""}`;

  const updAdults = (d: number) =>
    onPassengersChange({
      ...passengers,
      adults: Math.max(1, Math.min(9, passengers.adults + d)),
    });

  const addChild = () => {
    if (passengers.children.length >= 6) return;
    onPassengersChange({
      ...passengers,
      children: [...passengers.children, 8],
    });
  };

  const removeChild = (idx: number) =>
    onPassengersChange({
      ...passengers,
      children: passengers.children.filter((_, i) => i !== idx),
    });

  const setChildAge = (idx: number, age: number) => {
    const next = [...passengers.children];
    next[idx] = Math.max(0, Math.min(17, age));
    onPassengersChange({ ...passengers, children: next });
  };

  const today = new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <div className="flex flex-col gap-4">
      {/* Tipo de viagem */}
      <ToggleGroup
        type="single"
        value={tripType}
        onValueChange={(v) => v && onTripTypeChange(v as TripType)}
        className="w-fit"
      >
        <ToggleGroupItem value="roundtrip" className="gap-2">
          <ArrowLeftRight className="h-4 w-4" />
          Ida e volta
        </ToggleGroupItem>
        <ToggleGroupItem value="oneway" className="gap-2">
          <ArrowRight className="h-4 w-4" />
          Somente ida
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {/* Datas */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            {tripType === "roundtrip" ? "Datas da viagem" : "Data da ida"}
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start gap-2 font-normal",
                  !dateRange?.from && !oneWayDate && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">{dateLabel}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              {tripType === "roundtrip" ? (
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={onDateRangeChange}
                  numberOfMonths={2}
                  locale={ptBR}
                  disabled={(d) => d < today}
                />
              ) : (
                <Calendar
                  mode="single"
                  selected={oneWayDate}
                  onSelect={onOneWayDateChange}
                  locale={ptBR}
                  disabled={(d) => d < today}
                />
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Passageiros */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            Passageiros
          </Label>
          <Popover open={paxOpen} onOpenChange={setPaxOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 font-normal"
              >
                <Users className="h-4 w-4 shrink-0" />
                <span className="truncate">{paxLabel}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
              <div className="space-y-4">
                {/* Adultos */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Adultos</p>
                    <p className="text-xs text-muted-foreground">
                      A partir de 12 anos
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updAdults(-1)}
                      disabled={passengers.adults <= 1}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-6 text-center text-sm font-medium">
                      {passengers.adults}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updAdults(1)}
                      disabled={passengers.adults >= 9}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Crianças */}
                <div className="space-y-2 border-t border-border pt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Crianças</p>
                      <p className="text-xs text-muted-foreground">0 a 17 anos</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1"
                      onClick={addChild}
                      disabled={passengers.children.length >= 6}
                    >
                      <Plus className="h-3.5 w-3.5" /> Adicionar
                    </Button>
                  </div>
                  {passengers.children.length > 0 && (
                    <div className="space-y-2">
                      {passengers.children.map((age, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1.5"
                        >
                          <span className="text-xs text-muted-foreground">
                            Criança {idx + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={17}
                              value={age}
                              onChange={(e) =>
                                setChildAge(idx, Number(e.target.value))
                              }
                              className="w-14 rounded border border-border bg-background px-2 py-1 text-sm"
                            />
                            <span className="text-xs text-muted-foreground">
                              anos
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeChild(idx)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Classe */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            Classe
          </Label>
          <Select
            value={cabinClass}
            onValueChange={(v) => onCabinClassChange(v as CabinClass)}
          >
            <SelectTrigger className="w-full">
              <Plane className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ECONOMY">Econômica</SelectItem>
              <SelectItem value="PREMIUM_ECONOMY">Econômica Premium</SelectItem>
              <SelectItem value="BUSINESS">Executiva</SelectItem>
              <SelectItem value="FIRST">Primeira Classe</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
