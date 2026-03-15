import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Loader2, Sparkles, Luggage, Briefcase } from "lucide-react";
import AirlineAutocomplete from "@/components/AirlineAutocomplete";
import AirportAutocomplete from "@/components/AirportAutocomplete";
import type { FlightSegmentData } from "./ProposalFlightSearch";

interface FlightSegmentFormProps {
  seg: FlightSegmentData;
  onUpdate: (field: keyof FlightSegmentData, value: any) => void;
  onUpdateMulti?: (updates: Partial<FlightSegmentData>) => void;
}

export default function FlightSegmentForm({ seg, onUpdate, onUpdateMulti }: FlightSegmentFormProps) {
  const [searching, setSearching] = useState(false);

  const canSearch = !!(seg.airline && seg.flight_number && seg.departure_date);

  const handleAmadeusSearch = async () => {
    if (!canSearch) return;
    setSearching(true);
    try {
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

      const extractSegments = (response: any) => {
        if (!response) return [];
        if (response.segments?.length) return response.segments;
        if (response.data?.segments?.length) return response.data.segments;
        const offers = response.data || response;
        if (Array.isArray(offers)) {
          for (const offer of offers) {
            const itin = offer?.itineraries?.[0];
            if (itin?.segments?.length) return itin.segments;
          }
        }
        return [];
      };

      const segments = extractSegments(res);
      if (!segments?.length) {
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
          const segs2 = extractSegments(res2);
          if (segs2?.length) {
            applySegmentData(segs2[0]);
            toast.success("Dados do voo preenchidos via Amadeus!");
            return;
          }
        }
        toast.info("Voo não encontrado no Amadeus. Preencha manualmente.");
        return;
      }

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
    const updates: Partial<FlightSegmentData> = {};
    if (data.departure_time) updates.departure_time = data.departure_time;
    if (data.arrival_time) updates.arrival_time = data.arrival_time;
    if (data.duration_minutes) updates.duration_minutes = data.duration_minutes;
    if (data.terminal) updates.terminal = data.terminal;
    if (data.arrival_terminal) updates.arrival_terminal = data.arrival_terminal;
    if (data.aircraft_type) updates.aircraft_type = data.aircraft_type;
    if (data.origin_iata && !seg.origin_iata) updates.origin_iata = data.origin_iata;
    if (data.destination_iata && !seg.destination_iata) updates.destination_iata = data.destination_iata;
    if (data.airline_name) updates.airline_name = data.airline_name;
    
    console.log("[Amadeus] Applying segment data:", JSON.stringify(data));
    console.log("[Amadeus] Updates to apply:", JSON.stringify(updates));
    
    if (onUpdateMulti && Object.keys(updates).length > 0) {
      onUpdateMulti(updates);
    } else {
      Object.entries(updates).forEach(([key, value]) => {
        onUpdate(key as keyof FlightSegmentData, value);
      });
    }
  };

  return (
    <div className="space-y-3">
      {/* Flight info grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg border border-border/40">
        <div className="space-y-1">
          <Label className="text-xs">Companhia aérea</Label>
          <AirlineAutocomplete
            value={seg.airline}
            onChange={(iata, name) => {
              if (onUpdateMulti) {
                const updates: Partial<FlightSegmentData> = { airline: iata };
                if (name) updates.airline_name = name;
                onUpdateMulti(updates);
              } else {
                onUpdate("airline", iata);
                if (name) onUpdate("airline_name", name);
              }
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
      </div>

      {/* Baggage section */}
      <div className="p-3 bg-muted/30 rounded-lg border border-border/40 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Luggage className="w-3.5 h-3.5" />
          Bagagem
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Briefcase className="w-3 h-3" /> Bagagem de mão
            </Label>
            <div className="flex items-center gap-2">
              <Switch
                checked={seg.carry_on_included ?? true}
                onCheckedChange={(v) => onUpdate("carry_on_included", v)}
              />
              <span className="text-xs text-muted-foreground">
                {seg.carry_on_included ? "Inclusa" : "Não inclusa"}
              </span>
            </div>
          </div>
          {seg.carry_on_included && (
            <div className="space-y-1">
              <Label className="text-xs">Peso mão (kg)</Label>
              <Select
                value={String(seg.carry_on_weight_kg || 10)}
                onValueChange={(v) => onUpdate("carry_on_weight_kg", parseInt(v))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 kg</SelectItem>
                  <SelectItem value="8">8 kg</SelectItem>
                  <SelectItem value="10">10 kg</SelectItem>
                  <SelectItem value="12">12 kg</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1.5">
              <Luggage className="w-3 h-3" /> Bagagem despachada
            </Label>
            <Select
              value={String(seg.checked_bags_included ?? 0)}
              onValueChange={(v) => onUpdate("checked_bags_included", parseInt(v))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Nenhuma</SelectItem>
                <SelectItem value="1">1 mala</SelectItem>
                <SelectItem value="2">2 malas</SelectItem>
                <SelectItem value="3">3 malas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(seg.checked_bags_included ?? 0) > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">Peso cada (kg)</Label>
              <Select
                value={String(seg.checked_bag_weight_kg || 23)}
                onValueChange={(v) => onUpdate("checked_bag_weight_kg", parseInt(v))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 kg</SelectItem>
                  <SelectItem value="20">20 kg</SelectItem>
                  <SelectItem value="23">23 kg</SelectItem>
                  <SelectItem value="32">32 kg</SelectItem>
                  <SelectItem value="40">40 kg</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Observações bagagem</Label>
          <Input
            value={seg.baggage_notes}
            onChange={(e) => onUpdate("baggage_notes", e.target.value)}
            placeholder="Ex: Bagagem extra pode ser comprada por R$ 150..."
            className="text-xs"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="px-3">
        <div className="space-y-1">
          <Label className="text-xs">Observações gerais</Label>
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
