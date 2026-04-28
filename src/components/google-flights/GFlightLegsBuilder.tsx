import { Plus, X, Calendar as CalIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { GFlightAirportAutocomplete } from "./GFlightAirportAutocomplete";
import type { GAirport } from "./gflightsTypes";
import { cn } from "@/lib/utils";

export interface MultiLeg {
  from: GAirport | null;
  to: GAirport | null;
  date: Date | undefined;
}

interface Props {
  legs: MultiLeg[];
  onChange: (legs: MultiLeg[]) => void;
  minLegs?: number;
  maxLegs?: number;
}

export function GFlightLegsBuilder({ legs, onChange, minLegs = 2, maxLegs = 6 }: Props) {
  function updateLeg(i: number, patch: Partial<MultiLeg>) {
    onChange(legs.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLeg() {
    if (legs.length >= maxLegs) return;
    const last = legs[legs.length - 1];
    onChange([
      ...legs,
      { from: last?.to ?? null, to: null, date: undefined },
    ]);
  }
  function removeLeg(i: number) {
    if (legs.length <= minLegs) return;
    onChange(legs.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      {legs.map((leg, i) => (
        <Card key={i} className="relative p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Trecho {i + 1}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Origem</Label>
              <GFlightAirportAutocomplete
                value={leg.from}
                onChange={(v) => updateLeg(i, { from: v })}
                placeholder="GRU, São Paulo..."
                icon="plane"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Destino</Label>
              <GFlightAirportAutocomplete
                value={leg.to}
                onChange={(v) => updateLeg(i, { to: v })}
                placeholder="FCO, Roma..."
                icon="mapPin"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start", !leg.date && "text-muted-foreground")}
                  >
                    <CalIcon className="mr-2 h-4 w-4" />
                    {leg.date ? format(leg.date, "dd/MM/yyyy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={leg.date}
                    onSelect={(d) => updateLeg(i, { date: d })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {legs.length > minLegs && (
            <button
              type="button"
              onClick={() => removeLeg(i)}
              className="absolute top-2 right-2 h-6 w-6 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive flex items-center justify-center transition-colors"
              title="Remover trecho"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </Card>
      ))}
      {legs.length < maxLegs && (
        <Button type="button" variant="outline" size="sm" onClick={addLeg} className="gap-2">
          <Plus className="h-4 w-4" /> Adicionar trecho ({legs.length}/{maxLegs})
        </Button>
      )}
    </div>
  );
}
