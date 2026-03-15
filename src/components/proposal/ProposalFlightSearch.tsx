import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Search, Loader2, Plus, Trash2, Edit2, Check, PlaneTakeoff, PlaneLanding, Clock, Terminal } from "lucide-react";
import AirlineLogo from "@/components/AirlineLogo";
import AirlineAutocomplete from "@/components/AirlineAutocomplete";
import AirportAutocomplete from "@/components/AirportAutocomplete";

export interface FlightSegmentData {
  airline: string;
  airline_name: string;
  flight_number: string;
  origin_iata: string;
  destination_iata: string;
  departure_date: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  terminal: string;
  arrival_terminal: string;
  aircraft_type: string;
  notes: string;
}

interface ProposalFlightSearchProps {
  segments: FlightSegmentData[];
  onSegmentsChange: (segments: FlightSegmentData[]) => void;
}

const flightCache: Record<string, { data: any; ts: number }> = {};
const CACHE_TTL = 24 * 60 * 60 * 1000;

function getCacheKey(airline: string, flightNumber: string, date: string) {
  return `${airline}-${flightNumber}-${date}`.toUpperCase();
}

function formatDuration(min: number): string {
  if (!min || min <= 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ""}` : `${m}min`;
}

function getNextDayIndicator(depTime: string, arrTime: string): string {
  if (!depTime || !arrTime) return "";
  const [dh] = depTime.split(":").map(Number);
  const [ah] = arrTime.split(":").map(Number);
  if (ah < dh || (ah === dh && arrTime < depTime)) return " (+1)";
  return "";
}

interface SearchFormData {
  airline: string;
  airlineName: string;
  flightNumber: string;
  date: string;
  origin: string;
  destination: string;
}

const emptySegment = (): FlightSegmentData => ({
  airline: "", airline_name: "", flight_number: "", origin_iata: "", destination_iata: "",
  departure_date: "", departure_time: "", arrival_time: "", duration_minutes: 0,
  terminal: "", arrival_terminal: "", aircraft_type: "", notes: "",
});

export default function ProposalFlightSearch({ segments, onSegmentsChange }: ProposalFlightSearchProps) {
  const [searchForms, setSearchForms] = useState<Record<number, SearchFormData>>({});
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const addSegment = () => onSegmentsChange([...segments, emptySegment()]);
  const removeSegment = (idx: number) => onSegmentsChange(segments.filter((_, i) => i !== idx));
  const updateSegment = (idx: number, field: keyof FlightSegmentData, value: any) => {
    onSegmentsChange(segments.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const getForm = (idx: number): SearchFormData => {
    return searchForms[idx] || { airline: "", airlineName: "", flightNumber: "", date: "", origin: "", destination: "" };
  };

  const setForm = (idx: number, form: SearchFormData) => {
    setSearchForms((prev) => ({ ...prev, [idx]: form }));
  };

  const searchFlight = async (idx: number) => {
    const form = getForm(idx);
    if (!form.airline || !form.flightNumber || !form.date) {
      toast.error("Preencha companhia aérea, número do voo e data.");
      return;
    }

    const cacheKey = getCacheKey(form.airline, form.flightNumber, form.date);
    const cached = flightCache[cacheKey];
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      applyFlightData(idx, cached.data, form);
      toast.success("Dados do voo carregados (cache).");
      return;
    }

    setLoadingIdx(idx);
    try {
      // Strategy 1: flight_by_number (Schedule API)
      let seg = await tryFlightByNumber(form);

      // Strategy 2: flight_schedule (Flight Offers) as fallback
      if (!seg && form.origin && form.destination) {
        seg = await tryFlightSchedule(form);
      }

      if (seg) {
        flightCache[cacheKey] = { data: seg, ts: Date.now() };
        applyFlightData(idx, seg, form);
        toast.success("Informações do voo preenchidas automaticamente!");
      } else {
        toast.warning("Voo não encontrado na API Amadeus. Preencha os dados manualmente.");
      }
    } catch (err: any) {
      console.error("Flight search error:", err);
      toast.error(`Erro ao buscar voo: ${err.message}`);
    } finally {
      setLoadingIdx(null);
    }
  };

  const tryFlightByNumber = async (form: SearchFormData) => {
    try {
      const { data: res, error } = await supabase.functions.invoke("amadeus-search", {
        body: {
          action: "flight_by_number",
          airline: form.airline.toUpperCase(),
          flightNumber: form.flightNumber,
          departureDate: form.date,
        },
      });
      if (error || res?.error) return null;
      const flights = res?.data || [];
      if (flights.length > 0 && flights[0].itineraries?.[0]?.segments?.length > 0) {
        return flights[0].itineraries[0].segments[0];
      }
    } catch { /* fall through */ }
    return null;
  };

  const tryFlightSchedule = async (form: SearchFormData) => {
    try {
      const { data: res, error } = await supabase.functions.invoke("amadeus-search", {
        body: {
          action: "flight_schedule",
          origin: form.origin.toUpperCase(),
          destination: form.destination.toUpperCase(),
          departureDate: form.date,
          airline: form.airline.toUpperCase(),
          flightNumber: form.airline.toUpperCase() + form.flightNumber,
        },
      });
      if (error || res?.error) return null;
      const offers = res?.data || [];
      if (offers.length > 0 && offers[0].itineraries?.[0]?.segments?.length > 0) {
        return offers[0].itineraries[0].segments[0];
      }
    } catch { /* fall through */ }
    return null;
  };

  const applyFlightData = (idx: number, seg: any, form: SearchFormData) => {
    const updated: FlightSegmentData = {
      airline: seg.airline || form.airline.toUpperCase(),
      airline_name: seg.airline_name || form.airlineName || form.airline.toUpperCase(),
      flight_number: seg.flight_number || form.flightNumber,
      origin_iata: seg.origin_iata || form.origin?.toUpperCase() || "",
      destination_iata: seg.destination_iata || form.destination?.toUpperCase() || "",
      departure_date: seg.departure_date || form.date,
      departure_time: seg.departure_time || "",
      arrival_time: seg.arrival_time || "",
      duration_minutes: seg.duration_minutes || 0,
      terminal: seg.terminal || "",
      arrival_terminal: seg.arrival_terminal || "",
      aircraft_type: seg.aircraft_type || "",
      notes: segments[idx]?.notes || "",
    };
    onSegmentsChange(segments.map((s, i) => (i === idx ? updated : s)));
  };

  if (segments.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground mb-3">Adicione trechos de voo à proposta</p>
        <Button variant="outline" onClick={addSegment} className="gap-1.5">
          <Plus className="w-4 h-4" /> Adicionar trecho de voo
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {segments.map((seg, idx) => {
        const isLoading = loadingIdx === idx;
        const isEditing = editingIdx === idx;
        const hasFilled = !!seg.origin_iata && !!seg.destination_iata && !!seg.departure_time;
        const form = getForm(idx);

        return (
          <div key={idx} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Trecho {idx + 1}
              </span>
              <div className="flex items-center gap-1">
                {hasFilled && (
                  <Button variant="ghost" size="sm" onClick={() => setEditingIdx(isEditing ? null : idx)} className="gap-1 text-xs h-7">
                    {isEditing ? <Check className="w-3 h-3" /> : <Edit2 className="w-3 h-3" />}
                    {isEditing ? "Fechar" : "Editar"}
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeSegment(idx)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Search form */}
            {(!hasFilled || isEditing) && (
              <Card className="p-4 border-dashed border-primary/30 bg-primary/5">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Companhia aérea</Label>
                    <AirlineAutocomplete
                      value={form.airline}
                      onChange={(iata, name) => setForm(idx, { ...form, airline: iata, airlineName: name || "" })}
                      placeholder="Digite ou selecione..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nº do voo</Label>
                    <Input
                      value={form.flightNumber}
                      onChange={(e) => setForm(idx, { ...form, flightNumber: e.target.value.replace(/\D/g, "") })}
                      placeholder="8084"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Data do voo</Label>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm(idx, { ...form, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Origem</Label>
                    <AirportAutocomplete
                      value={form.origin}
                      onChange={(iata) => setForm(idx, { ...form, origin: iata })}
                      placeholder="GRU, São Paulo..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Destino</Label>
                    <AirportAutocomplete
                      value={form.destination}
                      onChange={(iata) => setForm(idx, { ...form, destination: iata })}
                      placeholder="FCO, Roma..."
                    />
                  </div>
                </div>
                <Button
                  onClick={() => searchFlight(idx)}
                  disabled={isLoading || !form.airline || !form.flightNumber || !form.date}
                  className="mt-3 gap-2 w-full sm:w-auto"
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Buscando informações do voo...</>
                  ) : (
                    <><Search className="w-4 h-4" /> Buscar informações do voo</>
                  )}
                </Button>
              </Card>
            )}

            {/* Visual Flight Card */}
            {hasFilled && !isEditing && (
              <Card className="overflow-hidden border-border/60">
                <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 sm:p-5">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-14 h-14 rounded-xl bg-background/80 backdrop-blur border border-border/50 flex items-center justify-center shadow-sm">
                      <AirlineLogo iata={seg.airline} size={40} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-semibold text-sm text-foreground">{seg.airline_name || seg.airline}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-medium">
                          {seg.airline}{seg.flight_number}
                        </span>
                        {seg.departure_date && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(seg.departure_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 sm:gap-6">
                        <div className="text-center min-w-[60px]">
                          <p className="text-xl sm:text-2xl font-bold text-foreground leading-none">{seg.departure_time || "—"}</p>
                          <p className="text-lg font-bold text-primary mt-1">{seg.origin_iata}</p>
                          {seg.terminal && (
                            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5 mt-0.5">
                              <Terminal className="w-2.5 h-2.5" /> T{seg.terminal}
                            </p>
                          )}
                        </div>
                        <div className="flex-1 flex flex-col items-center gap-1 px-2">
                          <div className="flex items-center w-full gap-1">
                            <PlaneTakeoff className="w-3.5 h-3.5 text-primary shrink-0" />
                            <div className="flex-1 h-px bg-gradient-to-r from-primary/60 via-primary/30 to-primary/60 relative">
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                              </div>
                            </div>
                            <PlaneLanding className="w-3.5 h-3.5 text-primary shrink-0" />
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="w-2.5 h-2.5" /> {formatDuration(seg.duration_minutes)}
                          </div>
                        </div>
                        <div className="text-center min-w-[60px]">
                          <p className="text-xl sm:text-2xl font-bold text-foreground leading-none">
                            {seg.arrival_time || "—"}
                            <span className="text-xs font-normal text-muted-foreground">
                              {getNextDayIndicator(seg.departure_time, seg.arrival_time)}
                            </span>
                          </p>
                          <p className="text-lg font-bold text-primary mt-1">{seg.destination_iata}</p>
                          {seg.arrival_terminal && (
                            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5 mt-0.5">
                              <Terminal className="w-2.5 h-2.5" /> T{seg.arrival_terminal}
                            </p>
                          )}
                        </div>
                      </div>
                      {(seg.aircraft_type || seg.notes) && (
                        <div className="mt-3 pt-2.5 border-t border-border/40 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {seg.aircraft_type && <span className="flex items-center gap-1">✈ {seg.aircraft_type}</span>}
                          {seg.notes && <span className="italic">{seg.notes}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Editable fields */}
            {hasFilled && isEditing && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg border border-border/40">
                <div className="space-y-1">
                  <Label className="text-xs">Companhia (IATA)</Label>
                  <Input value={seg.airline} onChange={(e) => updateSegment(idx, "airline", e.target.value.toUpperCase())} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nome da companhia</Label>
                  <Input value={seg.airline_name} onChange={(e) => updateSegment(idx, "airline_name", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nº do voo</Label>
                  <Input value={seg.flight_number} onChange={(e) => updateSegment(idx, "flight_number", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Origem (IATA)</Label>
                  <Input value={seg.origin_iata} onChange={(e) => updateSegment(idx, "origin_iata", e.target.value.toUpperCase())} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Destino (IATA)</Label>
                  <Input value={seg.destination_iata} onChange={(e) => updateSegment(idx, "destination_iata", e.target.value.toUpperCase())} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Data</Label>
                  <Input type="date" value={seg.departure_date} onChange={(e) => updateSegment(idx, "departure_date", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Horário saída</Label>
                  <Input type="time" value={seg.departure_time} onChange={(e) => updateSegment(idx, "departure_time", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Horário chegada</Label>
                  <Input type="time" value={seg.arrival_time} onChange={(e) => updateSegment(idx, "arrival_time", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Duração (min)</Label>
                  <Input type="number" value={seg.duration_minutes} onChange={(e) => updateSegment(idx, "duration_minutes", parseInt(e.target.value) || 0)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Terminal saída</Label>
                  <Input value={seg.terminal} onChange={(e) => updateSegment(idx, "terminal", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Terminal chegada</Label>
                  <Input value={seg.arrival_terminal} onChange={(e) => updateSegment(idx, "arrival_terminal", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Aeronave</Label>
                  <Input value={seg.aircraft_type} onChange={(e) => updateSegment(idx, "aircraft_type", e.target.value)} placeholder="Boeing 777-300ER" />
                </div>
                <div className="col-span-2 md:col-span-3 space-y-1">
                  <Label className="text-xs">Observações</Label>
                  <Textarea rows={2} value={seg.notes} onChange={(e) => updateSegment(idx, "notes", e.target.value)} placeholder="Observações sobre este trecho..." />
                </div>
              </div>
            )}
          </div>
        );
      })}

      <Button variant="outline" size="sm" onClick={addSegment} className="gap-1.5">
        <Plus className="w-3.5 h-3.5" /> Adicionar trecho
      </Button>
    </div>
  );
}
