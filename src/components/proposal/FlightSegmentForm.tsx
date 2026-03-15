import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AirlineAutocomplete from "@/components/AirlineAutocomplete";
import AirportAutocomplete from "@/components/AirportAutocomplete";
import type { FlightSegmentData } from "./ProposalFlightSearch";

interface FlightSegmentFormProps {
  seg: FlightSegmentData;
  onUpdate: (field: keyof FlightSegmentData, value: any) => void;
}

export default function FlightSegmentForm({ seg, onUpdate }: FlightSegmentFormProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg border border-border/40">
      <div className="space-y-1">
        <Label className="text-xs">Companhia aérea</Label>
        <AirlineAutocomplete
          value={seg.airline}
          onChange={(iata, name) => {
            onUpdate("airline", iata);
            if (name) onUpdate("airline_name", name);
          }}
          placeholder="Digite ou selecione..."
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Nome da companhia</Label>
        <Input value={seg.airline_name} onChange={(e) => onUpdate("airline_name", e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Nº do voo</Label>
        <Input value={seg.flight_number} onChange={(e) => onUpdate("flight_number", e.target.value)} className="font-mono" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Origem (IATA)</Label>
        <AirportAutocomplete
          value={seg.origin_iata}
          onChange={(iata) => onUpdate("origin_iata", iata)}
          placeholder="GRU..."
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Destino (IATA)</Label>
        <AirportAutocomplete
          value={seg.destination_iata}
          onChange={(iata) => onUpdate("destination_iata", iata)}
          placeholder="FCO..."
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Data</Label>
        <Input type="date" value={seg.departure_date} onChange={(e) => onUpdate("departure_date", e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Horário saída</Label>
        <Input type="time" value={seg.departure_time} onChange={(e) => onUpdate("departure_time", e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Horário chegada</Label>
        <Input type="time" value={seg.arrival_time} onChange={(e) => onUpdate("arrival_time", e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Duração (min)</Label>
        <Input type="number" value={seg.duration_minutes} onChange={(e) => onUpdate("duration_minutes", parseInt(e.target.value) || 0)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Terminal saída</Label>
        <Input value={seg.terminal} onChange={(e) => onUpdate("terminal", e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Terminal chegada</Label>
        <Input value={seg.arrival_terminal} onChange={(e) => onUpdate("arrival_terminal", e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Aeronave</Label>
        <Input value={seg.aircraft_type} onChange={(e) => onUpdate("aircraft_type", e.target.value)} placeholder="Boeing 777-300ER" />
      </div>
      <div className="col-span-2 md:col-span-3 space-y-1">
        <Label className="text-xs">Observações</Label>
        <Textarea rows={2} value={seg.notes} onChange={(e) => onUpdate("notes", e.target.value)} placeholder="Observações sobre este trecho..." />
      </div>
    </div>
  );
}
