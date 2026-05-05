import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Loader2, Plus, Trash2, Edit2, Check, Pen, ArrowDownUp, Plane, PlaneTakeoff, PlaneLanding } from "lucide-react";
import AirlineAutocomplete from "@/components/AirlineAutocomplete";
import AirportAutocomplete from "@/components/AirportAutocomplete";
import FlightSegmentCard from "./FlightSegmentCard";
import FlightSegmentForm from "./FlightSegmentForm";
import ConnectionLayoverBadge from "./ConnectionLayoverBadge";
import { UnifiedLegCard } from "./ProposalPreviewRenderer";
import { buildFlightLegGroups } from "@/lib/flightLegGrouping";
import { DatePartsInput } from "@/components/ui/date-parts-input";

export interface FlightSegmentData {
  airline: string;
  airline_name: string;
  flight_number: string;
  origin_iata: string;
  destination_iata: string;
  departure_date: string;
  departure_time: string;
  arrival_date?: string;
  arrival_time: string;
  duration_minutes: number;
  terminal: string;
  arrival_terminal: string;
  aircraft_type: string;
  notes: string;
  direction?: "ida" | "volta" | "trecho";
  is_connection?: boolean;
  // Baggage fields
  personal_item_included?: boolean;
  personal_item_weight_kg?: number;
  carry_on_included: boolean;
  carry_on_weight_kg: number;
  checked_bags_included: number;
  checked_bag_weight_kg: number;
  baggage_notes: string;
  // Header overrides (only used on the FIRST segment of each leg)
  leg_title_override?: string;
  leg_origin_label_override?: string;
  leg_destination_label_override?: string;
  leg_date_override?: string;
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
  departure_date: "", departure_time: "", arrival_date: "", arrival_time: "", duration_minutes: 0,
  terminal: "", arrival_terminal: "", aircraft_type: "", notes: "", is_connection: isConnection,
  direction: "ida",
  personal_item_included: true, personal_item_weight_kg: 10,
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
      personal_item_included: prev?.personal_item_included ?? true,
      personal_item_weight_kg: prev?.personal_item_weight_kg ?? 10,
      carry_on_included: prev?.carry_on_included ?? true,
      carry_on_weight_kg: prev?.carry_on_weight_kg ?? 10,
      checked_bags_included: prev?.checked_bags_included ?? 0,
      checked_bag_weight_kg: prev?.checked_bag_weight_kg ?? 23,
      baggage_notes: prev?.baggage_notes || "",
    };
    onSegmentsChange(segments.map((s, i) => (i === idx ? updated : s)));
  };

  const grouped = buildFlightLegGroups(segments);
  const usedIndices = new Set<number>();
  const legs = grouped.legs
    .map((leg) => {
      const resolvedSegments = leg.segments
        .map((legSeg) => {
          const matchedIdx = segments.findIndex((seg, idx) => (
            !usedIndices.has(idx) &&
            seg.origin_iata === legSeg.origin_iata &&
            seg.destination_iata === legSeg.destination_iata &&
            seg.departure_date === legSeg.departure_date &&
            (seg.departure_time || "") === (legSeg.departure_time || "")
          ));

          if (matchedIdx === -1) return null;
          usedIndices.add(matchedIdx);
          return { seg: segments[matchedIdx], idx: matchedIdx };
        })
        .filter(Boolean) as { seg: FlightSegmentData; idx: number }[];

      if (resolvedSegments.length === 0) return null;

      return {
        startIdx: resolvedSegments[0].idx,
        label: leg.label,
        direction: leg.direction,
        segments: resolvedSegments,
      };
    })
    .filter(Boolean) as { startIdx: number; label: string; direction: string; segments: { seg: FlightSegmentData; idx: number }[] }[];

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
      {legs.map((leg) => {
        const isMultiSeg = leg.segments.length > 1;
        const directionLabel = leg.label;
        const isReturn = directionLabel === "Volta";
        const isOutbound = directionLabel === "Ida";
        const accent = isOutbound
          ? "border-primary/40 bg-primary/[0.04]"
          : isReturn
            ? "border-info/40 bg-info/[0.04]"
            : "border-border/60 bg-muted/30";
        const banner = isOutbound
          ? "bg-primary/10 text-primary border-primary/30"
          : isReturn
            ? "bg-info/10 text-info border-info/30"
            : "bg-muted text-muted-foreground border-border/60";
        const DirIcon = isReturn ? PlaneLanding : PlaneTakeoff;

        return (
          <div key={leg.startIdx} className={`rounded-xl border-2 ${accent} overflow-hidden`}>
            {/* Leg banner */}
            <div className={`flex items-center justify-between gap-2 px-3 py-2 border-b ${banner}`}>
              <div className="flex items-center gap-2 min-w-0">
                <DirIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {directionLabel}
                </span>
                <span className="text-[10px] opacity-70 truncate">
                  {leg.segments[0].seg.origin_iata || "?"} → {leg.segments[leg.segments.length - 1].seg.destination_iata || "?"}
                </span>
              </div>
              {isMultiSeg ? (
                <Badge variant="outline" className="text-[10px] gap-1 h-5 bg-background/60 shrink-0">
                  <ArrowDownUp className="w-2.5 h-2.5" />
                  {leg.segments.length - 1} conexão{leg.segments.length > 2 ? "ões" : ""}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] gap-1 h-5 bg-background/60 shrink-0">
                  <Plane className="w-2.5 h-2.5" />
                  Voo direto
                </Badge>
              )}
            </div>
            <div className="p-3 space-y-0">

            {/* Cabeçalho exibido ao cliente (editável) */}
            {(() => {
              const headSeg = leg.segments[0].seg;
              const headIdx = leg.segments[0].idx;
              const lastSegLeg = leg.segments[leg.segments.length - 1].seg;
              const autoTitle = `Passagem aérea - ${directionLabel}`;
              const autoDate = headSeg.departure_date || "";
              return (
                <Card className="p-3 mx-1 mb-3 border-dashed border-primary/20 bg-primary/[0.03]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-primary">
                      Cabeçalho exibido ao cliente
                    </span>
                    <span className="text-[10px] text-muted-foreground">— preenchido automaticamente, edite se quiser</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-[11px]">Título</Label>
                      <Input
                        value={headSeg.leg_title_override ?? ""}
                        onChange={(e) => updateSegment(headIdx, "leg_title_override", e.target.value)}
                        placeholder={autoTitle}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Origem (cidade)</Label>
                      <Input
                        value={headSeg.leg_origin_label_override ?? ""}
                        onChange={(e) => updateSegment(headIdx, "leg_origin_label_override", e.target.value)}
                        placeholder={headSeg.origin_iata || "Ex: São Paulo"}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Destino (cidade)</Label>
                      <Input
                        value={headSeg.leg_destination_label_override ?? ""}
                        onChange={(e) => updateSegment(headIdx, "leg_destination_label_override", e.target.value)}
                        placeholder={lastSegLeg.destination_iata || "Ex: Maldivas"}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-[11px]">Data exibida</Label>
                      <DatePartsInput value={headSeg.leg_date_override ?? ""} onChange={(iso) => updateSegment(headIdx, "leg_date_override", iso)} inputClassName="h-8 text-sm" />
                    </div>
                  </div>
                </Card>
              );
            })()}

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
                    {prevInLeg && segInLeg > 0 && (
                      <ConnectionLayoverBadge prevSegment={prevInLeg} nextSegment={seg} />
                    )}

                    <div className="relative">
                      {/* Segment actions */}
                      <div className="flex items-center justify-end gap-1 px-2 pt-1">
                        {segInLeg > 0 && (
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
                              <DatePartsInput value={form.date} onChange={(iso) => setForm(idx, { ...form, date: iso })} />
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
          </div>
        );
      })}

      <Button variant="outline" size="sm" onClick={() => addSegment(false)} className="gap-1.5">
        <Plus className="w-3.5 h-3.5" /> Adicionar trecho
      </Button>
    </div>
  );
}
