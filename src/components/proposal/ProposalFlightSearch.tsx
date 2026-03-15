import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Loader2, Plus, Trash2, Edit2, Check, Pen, ArrowDownUp, Plane } from "lucide-react";
import AirlineAutocomplete from "@/components/AirlineAutocomplete";
import AirportAutocomplete from "@/components/AirportAutocomplete";
import FlightSegmentCard from "./FlightSegmentCard";
import FlightSegmentForm from "./FlightSegmentForm";
import ConnectionLayoverBadge from "./ConnectionLayoverBadge";

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
  is_connection?: boolean;
  // Baggage fields
  carry_on_included: boolean;
  carry_on_weight_kg: number;
  checked_bags_included: number;
  checked_bag_weight_kg: number;
  baggage_notes: string;
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

interface SearchFormData {
  airline: string;
  airlineName: string;
  flightNumber: string;
  date: string;
  origin: string;
  destination: string;
}

const emptySegment = (isConnection = false): FlightSegmentData => ({
  airline: "", airline_name: "", flight_number: "", origin_iata: "", destination_iata: "",
  departure_date: "", departure_time: "", arrival_time: "", duration_minutes: 0,
  terminal: "", arrival_terminal: "", aircraft_type: "", notes: "", is_connection: isConnection,
  carry_on_included: true, carry_on_weight_kg: 10, checked_bags_included: 0, checked_bag_weight_kg: 23, baggage_notes: "",
});

export default function ProposalFlightSearch({ segments, onSegmentsChange }: ProposalFlightSearchProps) {
  const [searchForms, setSearchForms] = useState<Record<number, SearchFormData>>({});
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [manualIdx, setManualIdx] = useState<Set<number>>(new Set());

  const addSegment = (isConnection = false) => {
    const newSeg = emptySegment(isConnection);
    // If connection, pre-fill date/origin from previous segment
    if (isConnection && segments.length > 0) {
      const prev = segments[segments.length - 1];
      newSeg.departure_date = prev.departure_date;
      newSeg.origin_iata = prev.destination_iata;
    }
    onSegmentsChange([...segments, newSeg]);
    // Auto-open manual mode for new segments
    setManualIdx((prev) => new Set(prev).add(segments.length));
  };

  const addConnectionAfter = (idx: number) => {
    const newSeg = emptySegment(true);
    const prev = segments[idx];
    if (prev) {
      newSeg.departure_date = prev.departure_date;
      newSeg.origin_iata = prev.destination_iata;
    }
    const updated = [...segments];
    updated.splice(idx + 1, 0, newSeg);
    onSegmentsChange(updated);
    setManualIdx((prev) => new Set(prev).add(idx + 1));
  };

  const removeSegment = (idx: number) => {
    const updated = segments.filter((_, i) => i !== idx);
    // If removing a non-connection segment, unmark the next one as connection
    if (!segments[idx]?.is_connection && updated[idx]?.is_connection) {
      updated[idx] = { ...updated[idx], is_connection: false };
    }
    onSegmentsChange(updated);
    setManualIdx((prev) => {
      const n = new Set<number>();
      prev.forEach((v) => { if (v < idx) n.add(v); else if (v > idx) n.add(v - 1); });
      return n;
    });
  };

  const updateSegment = (idx: number, field: keyof FlightSegmentData, value: any) => {
    onSegmentsChange(segments.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const updateSegmentMulti = (idx: number, updates: Partial<FlightSegmentData>) => {
    onSegmentsChange(segments.map((s, i) => (i === idx ? { ...s, ...updates } : s)));
  };

  const getForm = (idx: number): SearchFormData => {
    return searchForms[idx] || { airline: "", airlineName: "", flightNumber: "", date: "", origin: "", destination: "" };
  };

  const setForm = (idx: number, form: SearchFormData) => {
    setSearchForms((prev) => ({ ...prev, [idx]: form }));
  };

  const toggleManual = (idx: number) => {
    setManualIdx((prev) => {
      const n = new Set(prev);
      if (n.has(idx)) n.delete(idx); else n.add(idx);
      return n;
    });
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
      let seg = await tryFlightByNumber(form);
      if (!seg && form.origin && form.destination) {
        seg = await tryFlightSchedule(form);
      }
      if (seg) {
        flightCache[cacheKey] = { data: seg, ts: Date.now() };
        applyFlightData(idx, seg, form);
        toast.success("Informações do voo preenchidas automaticamente!");
        setManualIdx((prev) => { const n = new Set(prev); n.delete(idx); return n; });
      } else {
        toast.warning("Voo não encontrado. Use o preenchimento manual.");
        setManualIdx((prev) => new Set(prev).add(idx));
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
        body: { action: "flight_by_number", airline: form.airline.toUpperCase(), flightNumber: form.flightNumber, departureDate: form.date },
      });
      if (error || res?.error) return null;
      const flights = res?.data || [];
      if (flights.length > 0 && flights[0].itineraries?.[0]?.segments?.length > 0) return flights[0].itineraries[0].segments[0];
    } catch { /* fall through */ }
    return null;
  };

  const tryFlightSchedule = async (form: SearchFormData) => {
    try {
      const { data: res, error } = await supabase.functions.invoke("amadeus-search", {
        body: { action: "flight_schedule", origin: form.origin.toUpperCase(), destination: form.destination.toUpperCase(), departureDate: form.date, airline: form.airline.toUpperCase(), flightNumber: form.airline.toUpperCase() + form.flightNumber },
      });
      if (error || res?.error) return null;
      const offers = res?.data || [];
      if (offers.length > 0 && offers[0].itineraries?.[0]?.segments?.length > 0) return offers[0].itineraries[0].segments[0];
    } catch { /* fall through */ }
    return null;
  };

  const applyFlightData = (idx: number, seg: any, form: SearchFormData) => {
    const prev = segments[idx];
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
      notes: prev?.notes || "",
      is_connection: prev?.is_connection || false,
      carry_on_included: prev?.carry_on_included ?? true,
      carry_on_weight_kg: prev?.carry_on_weight_kg ?? 10,
      checked_bags_included: prev?.checked_bags_included ?? 0,
      checked_bag_weight_kg: prev?.checked_bag_weight_kg ?? 23,
      baggage_notes: prev?.baggage_notes || "",
    };
    onSegmentsChange(segments.map((s, i) => (i === idx ? updated : s)));
  };

  // Group segments into legs (a leg = first segment + its connections)
  const legs: { startIdx: number; segments: { seg: FlightSegmentData; idx: number }[] }[] = [];
  segments.forEach((seg, idx) => {
    if (!seg.is_connection || legs.length === 0) {
      legs.push({ startIdx: idx, segments: [{ seg, idx }] });
    } else {
      legs[legs.length - 1].segments.push({ seg, idx });
    }
  });

  if (segments.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground mb-3">Adicione trechos de voo à proposta</p>
        <Button variant="outline" onClick={() => addSegment(false)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Adicionar trecho de voo
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {legs.map((leg, legIdx) => {
        const isMultiSeg = leg.segments.length > 1;
        const firstSeg = leg.segments[0].seg;
        const lastSeg = leg.segments[leg.segments.length - 1].seg;

        return (
          <div key={leg.startIdx} className="space-y-0">
            {/* Leg header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Trecho {legIdx + 1}
                </span>
                {isMultiSeg ? (
                  <Badge variant="outline" className="text-[10px] gap-1 h-5 border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-950/30">
                    <ArrowDownUp className="w-2.5 h-2.5" />
                    {leg.segments.length - 1} conexão{leg.segments.length > 2 ? "ões" : ""}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] gap-1 h-5 border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950/30">
                    <Plane className="w-2.5 h-2.5" />
                    Voo direto
                  </Badge>
                )}
              </div>
            </div>

            {/* Segments within leg */}
            <div className={isMultiSeg ? "border border-border/60 rounded-lg overflow-hidden" : ""}>
              {leg.segments.map(({ seg, idx }, segInLeg) => {
                const isLoading = loadingIdx === idx;
                const isEditing = editingIdx === idx;
                const isManual = manualIdx.has(idx);
                const hasFilled = !!seg.origin_iata && !!seg.destination_iata && (!!seg.departure_time || isManual);
                const form = getForm(idx);
                const prevInLeg = segInLeg > 0 ? leg.segments[segInLeg - 1].seg : null;

                return (
                  <div key={idx}>
                    {/* Connection layover badge */}
                    {prevInLeg && seg.is_connection && (
                      <ConnectionLayoverBadge prevSegment={prevInLeg} nextSegment={seg} />
                    )}

                    <div className="relative">
                      {/* Segment actions */}
                      <div className="flex items-center justify-end gap-1 px-2 pt-1">
                        {seg.is_connection && (
                          <span className="text-[10px] text-muted-foreground mr-auto pl-1">
                            Segmento {segInLeg + 1}
                          </span>
                        )}
                        {hasFilled && !isManual && (
                          <Button variant="ghost" size="sm" onClick={() => setEditingIdx(isEditing ? null : idx)} className="gap-1 text-xs h-6">
                            {isEditing ? <Check className="w-3 h-3" /> : <Edit2 className="w-3 h-3" />}
                            {isEditing ? "Fechar" : "Editar"}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeSegment(idx)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>

                      {/* Search form - shown when empty and not manual */}
                      {(!hasFilled && !isManual) && (
                        <Card className="p-4 border-dashed border-primary/30 bg-primary/5 mx-1 mb-2">
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
                              <Input type="date" value={form.date} onChange={(e) => setForm(idx, { ...form, date: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Origem</Label>
                              <AirportAutocomplete
                                value={form.origin || seg.origin_iata}
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
                          <div className="flex flex-wrap gap-2 mt-3">
                            <Button
                              onClick={() => searchFlight(idx)}
                              disabled={isLoading || !form.airline || !form.flightNumber || !form.date}
                              className="gap-2"
                            >
                              {isLoading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Buscando...</>
                              ) : (
                                <><Search className="w-4 h-4" /> Buscar voo</>
                              )}
                            </Button>
                            <Button variant="outline" onClick={() => toggleManual(idx)} className="gap-1.5">
                              <Pen className="w-3.5 h-3.5" /> Preencher manualmente
                            </Button>
                          </div>
                        </Card>
                      )}

                      {/* Manual fill form */}
                      {isManual && (
                        <div className="mx-1 mb-2">
                          <FlightSegmentForm seg={seg} onUpdate={(field, value) => updateSegment(idx, field, value)} onUpdateMulti={(updates) => updateSegmentMulti(idx, updates)} />
                          {seg.origin_iata && seg.destination_iata && (
                            <div className="flex justify-end mt-2">
                              <Button size="sm" onClick={() => toggleManual(idx)} className="gap-1 text-xs">
                                <Check className="w-3 h-3" /> Concluir
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Visual flight card */}
                      {hasFilled && !isEditing && !isManual && (
                        <div className="px-1 pb-1">
                          <FlightSegmentCard seg={seg} compact={isMultiSeg} />
                        </div>
                      )}

                      {/* Edit mode */}
                      {hasFilled && isEditing && !isManual && (
                        <div className="mx-1 mb-2">
                          <FlightSegmentForm seg={seg} onUpdate={(field, value) => updateSegment(idx, field, value)} onUpdateMulti={(updates) => updateSegmentMulti(idx, updates)} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add connection button */}
            <div className="flex items-center gap-2 mt-2 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addConnectionAfter(leg.segments[leg.segments.length - 1].idx)}
                className="gap-1 text-xs h-7 text-muted-foreground hover:text-primary"
              >
                <ArrowDownUp className="w-3 h-3" /> Adicionar conexão
              </Button>
            </div>
          </div>
        );
      })}

      <Button variant="outline" size="sm" onClick={() => addSegment(false)} className="gap-1.5">
        <Plus className="w-3.5 h-3.5" /> Adicionar trecho
      </Button>
    </div>
  );
}
