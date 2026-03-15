import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Search, Loader2, Sparkles } from "lucide-react";
import AirlineAutocomplete from "@/components/AirlineAutocomplete";
import AirportAutocomplete from "@/components/AirportAutocomplete";
import type { FlightSegmentData } from "./ProposalFlightSearch";

interface FlightSegmentFormProps {
  seg: FlightSegmentData;
  onUpdate: (field: keyof FlightSegmentData, value: any) => void;
}

export default function FlightSegmentForm({ seg, onUpdate }: FlightSegmentFormProps) {
  const [searching, setSearching] = useState(false);

  const canSearch = !!(seg.airline && seg.flight_number && seg.departure_date);

  const handleAmadeusSearch = async () => {
    if (!canSearch) return;
    setSearching(true);
    try {
      // Try flight_by_number first
      const flightNum = seg.flight_number.replace(/\D/g, "");
      const { data: res, error } = await supabase.functions.invoke("amadeus-search", {
        body: {
          action: "flight_by_number",
          airline: seg.airline.toUpperCase(),
          flightNumber: flightNum,
          departureDate: seg.departure_date,
        },
      });

      if (error) throw error;

      const segments = res?.segments || res?.data?.segments;
      if (!segments?.length) {
        // Fallback: try flight_schedule if origin/destination available
        if (seg.origin_iata && seg.destination_iata) {
          const { data: res2, error: err2 } = await supabase.functions.invoke("amadeus-search", {
            body: {
              action: "flight_schedule",
              origin: seg.origin_iata.toUpperCase(),
              destination: seg.destination_iata.toUpperCase(),
              departureDate: seg.departure_date,
              airline: seg.airline.toUpperCase(),
              flightNumber: seg.airline.toUpperCase() + flightNum,
            },
          });
          if (err2) throw err2;
          const segs2 = res2?.segments || res2?.data?.segments;
          if (segs2?.length) {
            applySegmentData(segs2[0]);
            return;
          }
        }
        toast.info("Voo não encontrado no Amadeus. Preencha manualmente.");
        return;
      }

      // Find the matching segment by origin/dest if available
      let match = segments[0];
      if (seg.origin_iata) {
        const found = segments.find((s: any) =>
          s.origin_iata?.toUpperCase() === seg.origin_iata.toUpperCase()
        );
        if (found) match = found;
      }

      applySegmentData(match);
      toast.success("Dados do voo preenchidos via Amadeus!");
    } catch (err: any) {
      console.error("Amadeus search error:", err);
      toast.error("Erro ao buscar no Amadeus: " + (err.message || "Tente novamente"));
    } finally {
      setSearching(false);
    }
  };

  const applySegmentData = (data: any) => {
    if (data.departure_time) onUpdate("departure_time", data.departure_time);
    if (data.arrival_time) onUpdate("arrival_time", data.arrival_time);
    if (data.duration_minutes) onUpdate("duration_minutes", data.duration_minutes);
    if (data.terminal) onUpdate("terminal", data.terminal);
    if (data.arrival_terminal) onUpdate("arrival_terminal", data.arrival_terminal);
    if (data.aircraft_type) onUpdate("aircraft_type", data.aircraft_type);
    if (data.origin_iata && !seg.origin_iata) onUpdate("origin_iata", data.origin_iata);
    if (data.destination_iata && !seg.destination_iata) onUpdate("destination_iata", data.destination_iata);
    if (data.airline_name && !seg.airline_name) onUpdate("airline_name", data.airline_name);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg border border-border/40">
        <div className="space-y-1">
          <Label className="text-xs">Companhia aérea</Label>
          <AirlineAutocomplete
            value={seg.airline}
            onChange={(iata, name) => {
              // Must update both fields at once to avoid stale state overwrite
              const updates: Partial<FlightSegmentData> = { airline: iata };
              if (name) updates.airline_name = name;
              Object.entries(updates).forEach(([k, v]) => onUpdate(k as keyof FlightSegmentData, v));
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

      {/* Amadeus search button */}
      <Button
        variant="outline"
        size="sm"
        disabled={!canSearch || searching}
        onClick={handleAmadeusSearch}
        className="gap-2 w-full sm:w-auto border-primary/30 text-primary hover:bg-primary/5"
      >
        {searching ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando no Amadeus...</>
        ) : (
          <><Sparkles className="w-3.5 h-3.5" /> Completar dados via Amadeus</>
        )}
      </Button>
    </div>
  );
}
