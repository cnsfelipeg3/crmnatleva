import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Plane, Plus, Trash2, ChevronDown, ChevronUp, Loader2, Search,
  ArrowRight, Clock, MapPin, RotateCcw, Zap, Route, AlertCircle, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AirportAutocomplete from "@/components/AirportAutocomplete";
import AirlineAutocomplete from "@/components/AirlineAutocomplete";
import FlightTimeline, { type FlightSegment } from "@/components/FlightTimeline";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/* ─── Types ─────────────────────────────────── */

export type ItineraryStructure = "ida_volta" | "so_ida" | "open_jaw" | "multi_trecho";

export interface FlightGroup {
  id: string;
  label: string;
  type: "main_outbound" | "main_return" | "internal";
  connectionType: "direto" | "1_conexao" | "2_conexoes" | "3_mais";
  hasStopover: boolean;
  stopoverIata: string;
  segments: FlightSegment[];
}

interface Props {
  segments: FlightSegment[];
  onSegmentsChange: (segments: FlightSegment[]) => void;
  formOrigin: string;
  formDestination: string;
  formDepartureDate: string;
  formReturnDate: string;
  formAirline: string;
  formLocator: string;
  formFlightClass: string;
  onFormChange: (field: string, value: any) => void;
}

const defaultSegment: FlightSegment = {
  direction: "ida", segment_order: 1, airline: "", flight_number: "",
  origin_iata: "", destination_iata: "", departure_date: "", departure_time: "",
  arrival_time: "", duration_minutes: 0, flight_class: "", cabin_type: "",
  operated_by: "", connection_time_minutes: 0, terminal: "",
};

function createGroup(type: FlightGroup["type"], label: string): FlightGroup {
  return {
    id: crypto.randomUUID(),
    label,
    type,
    connectionType: "direto",
    hasStopover: false,
    stopoverIata: "",
    segments: [{ ...defaultSegment, direction: type === "main_return" ? "volta" : "ida", segment_order: 1 }],
  };
}

function getSegmentCount(connType: FlightGroup["connectionType"]): number {
  switch (connType) {
    case "direto": return 1;
    case "1_conexao": return 2;
    case "2_conexoes": return 3;
    case "3_mais": return 4;
  }
}

/* ─── Amadeus Lookup ─────────────────────────── */

async function lookupAmadeus(origin: string, destination: string, date: string, airline?: string) {
  const { data, error } = await supabase.functions.invoke("amadeus-search", {
    body: { action: "flight_schedule", origin, destination, departureDate: date, airline: airline || undefined },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.data || [];
}

/* ─── Component ──────────────────────────────── */

export default function FlightRegistrationSection({
  segments, onSegmentsChange,
  formOrigin, formDestination, formDepartureDate, formReturnDate, formAirline,
  formLocator, formFlightClass, onFormChange,
}: Props) {
  const { toast } = useToast();

  const [itineraryType, setItineraryType] = useState<ItineraryStructure>(() => {
    if (formReturnDate) return "ida_volta";
    return "so_ida";
  });

  const [groups, setGroups] = useState<FlightGroup[]>(() => {
    // Initialize from existing segments
    const idaSegs = segments.filter(s => s.direction === "ida");
    const voltaSegs = segments.filter(s => s.direction === "volta");

    const result: FlightGroup[] = [];

    const outbound = createGroup("main_outbound", "Voo de Ida");
    if (idaSegs.length > 0) outbound.segments = idaSegs;
    if (idaSegs.length > 1) outbound.connectionType = idaSegs.length === 2 ? "1_conexao" : idaSegs.length === 3 ? "2_conexoes" : "3_mais";
    result.push(outbound);

    if (formReturnDate || voltaSegs.length > 0) {
      const ret = createGroup("main_return", "Voo de Volta");
      if (voltaSegs.length > 0) ret.segments = voltaSegs;
      if (voltaSegs.length > 1) ret.connectionType = voltaSegs.length === 2 ? "1_conexao" : voltaSegs.length === 3 ? "2_conexoes" : "3_mais";
      result.push(ret);
    }

    return result;
  });

  const [loadingGroup, setLoadingGroup] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(groups.map(g => g.id)));

  // Sync groups → flat segments for parent
  const syncSegments = useCallback((newGroups: FlightGroup[]) => {
    const flat: FlightSegment[] = [];
    for (const g of newGroups) {
      for (const seg of g.segments) {
        if (seg.origin_iata || seg.destination_iata) {
          flat.push(seg);
        }
      }
    }
    onSegmentsChange(flat);
  }, [onSegmentsChange]);

  const updateGroups = useCallback((fn: (prev: FlightGroup[]) => FlightGroup[]) => {
    setGroups(prev => {
      const next = fn(prev);
      syncSegments(next);
      return next;
    });
  }, [syncSegments]);

  // ─── Itinerary type change ─────────────────
  const handleItineraryChange = (type: ItineraryStructure) => {
    setItineraryType(type);
    updateGroups(prev => {
      let next = [...prev];
      const hasReturn = next.some(g => g.type === "main_return");

      if (type === "so_ida" && hasReturn) {
        next = next.filter(g => g.type !== "main_return");
      } else if ((type === "ida_volta" || type === "open_jaw") && !hasReturn) {
        const ret = createGroup("main_return", "Voo de Volta");
        const insertIdx = next.findIndex(g => g.type === "internal");
        if (insertIdx >= 0) next.splice(insertIdx, 0, ret);
        else next.push(ret);
        setExpandedGroups(p => new Set([...p, ret.id]));
      }
      return next;
    });
  };

  // ─── Connection type change ────────────────
  const handleConnectionChange = (groupId: string, connType: FlightGroup["connectionType"]) => {
    updateGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const needed = getSegmentCount(connType);
      const dir = g.type === "main_return" ? "volta" as const : "ida" as const;
      let segs = [...g.segments];
      while (segs.length < needed) {
        const last = segs[segs.length - 1];
        segs.push({
          ...defaultSegment,
          direction: dir,
          segment_order: segs.length + 1,
          origin_iata: last?.destination_iata || "",
          departure_date: last?.departure_date || "",
          airline: last?.airline || "",
        });
      }
      while (segs.length > needed) segs.pop();
      return { ...g, connectionType: connType, segments: segs };
    }));
  };

  // ─── Segment update ────────────────────────
  const updateGroupSegment = (groupId: string, segIdx: number, field: string, value: any) => {
    updateGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const segs = g.segments.map((s, i) => {
        if (i !== segIdx) return s;
        const updated = { ...s, [field]: value };
        return updated;
      });
      // Auto-chain: if destination changed and next segment exists, update its origin
      if (field === "destination_iata" && segIdx < segs.length - 1) {
        segs[segIdx + 1] = { ...segs[segIdx + 1], origin_iata: value };
      }
      return { ...g, segments: segs };
    }));
  };

  // ─── Add internal flight ───────────────────
  const addInternalFlight = () => {
    const internal = createGroup("internal", `Voo Interno ${groups.filter(g => g.type === "internal").length + 1}`);
    updateGroups(prev => [...prev, internal]);
    setExpandedGroups(p => new Set([...p, internal.id]));
  };

  // ─── Remove group ─────────────────────────
  const removeGroup = (groupId: string) => {
    updateGroups(prev => prev.filter(g => g.id !== groupId));
  };

  // ─── Amadeus auto-lookup for group ─────────
  const handleAmadeusLookup = async (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const first = group.segments[0];
    const last = group.segments[group.segments.length - 1];
    if (!first.origin_iata || !last.destination_iata || !first.departure_date) {
      toast({ title: "Preencha origem, destino e data para consultar", variant: "destructive" });
      return;
    }
    setLoadingGroup(groupId);
    try {
      const offers = await lookupAmadeus(first.origin_iata, last.destination_iata, first.departure_date, first.airline);
      if (!offers.length) {
        toast({ title: "Nenhum voo encontrado", variant: "destructive" });
        return;
      }
      // Use first offer's first itinerary
      const itin = offers[0]?.itineraries?.[0];
      if (!itin?.segments?.length) {
        toast({ title: "Sem dados de segmentos", variant: "destructive" });
        return;
      }
      const dir = group.type === "main_return" ? "volta" as const : "ida" as const;
      const newSegs: FlightSegment[] = itin.segments.map((s: any, i: number) => ({
        ...defaultSegment,
        direction: dir,
        segment_order: i + 1,
        airline: s.airline || "",
        flight_number: `${s.airline || ""}${s.flight_number || ""}`,
        origin_iata: s.origin_iata || "",
        destination_iata: s.destination_iata || "",
        departure_date: s.departure_date || "",
        departure_time: s.departure_time || "",
        arrival_time: s.arrival_time || "",
        duration_minutes: s.duration_minutes || 0,
        terminal: s.terminal || "",
        operated_by: s.operated_by || "",
        connection_time_minutes: s.connection_time_minutes || 0,
      }));

      const connType = newSegs.length === 1 ? "direto" : newSegs.length === 2 ? "1_conexao" : newSegs.length === 3 ? "2_conexoes" : "3_mais";

      updateGroups(prev => prev.map(g =>
        g.id === groupId ? { ...g, segments: newSegs, connectionType: connType as FlightGroup["connectionType"] } : g
      ));
      toast({ title: "Dados do Amadeus aplicados!", description: `${newSegs.length} segmento(s) encontrados.` });
    } catch (err: any) {
      toast({ title: "Erro Amadeus", description: err.message, variant: "destructive" });
    } finally {
      setLoadingGroup(null);
    }
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ─── All valid segments for timeline ───────
  const allValidSegments = groups.flatMap(g => g.segments.filter(s => s.origin_iata && s.destination_iata));

  return (
    <div className="space-y-4">
      {/* ═══ HEADER ═══ */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Plane className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Estrutura Aérea da Viagem</h2>
            <p className="text-sm text-muted-foreground">Monte os voos principais e internos da viagem</p>
          </div>
        </div>

        {/* Itinerary type selector */}
        <div className="space-y-3 mb-6">
          <Label className="text-sm font-semibold">Tipo de Estrutura</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { value: "ida_volta" as const, label: "Ida e Volta", icon: RotateCcw },
              { value: "so_ida" as const, label: "Somente Ida", icon: ArrowRight },
              { value: "open_jaw" as const, label: "Open-Jaw", icon: Route },
              { value: "multi_trecho" as const, label: "Multi-trecho", icon: MapPin },
            ].map(opt => (
              <Button
                key={opt.value}
                type="button"
                variant={itineraryType === opt.value ? "default" : "outline"}
                className={cn("flex items-center gap-2 h-auto py-3 px-3 text-xs", itineraryType === opt.value && "ring-2 ring-primary/30")}
                onClick={() => handleItineraryChange(opt.value)}
              >
                <opt.icon className="w-4 h-4 shrink-0" />
                {opt.label}
              </Button>
            ))}
          </div>
          {itineraryType === "open_jaw" && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
              ✈️ <strong>Open-Jaw:</strong> Chegada por uma cidade e retorno por outra. Ex: Ida São Paulo → Milão / Volta Roma → São Paulo.
            </p>
          )}
        </div>

        {/* Global fields */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="space-y-1">
            <Label className="text-xs">Localizador</Label>
            <Input value={formLocator} onChange={e => onFormChange("locator", e.target.value.toUpperCase())} className="font-mono text-sm" placeholder="ABC123" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Classe Geral</Label>
            <Select value={formFlightClass} onValueChange={v => onFormChange("flight_class", v)}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Econômica">Econômica</SelectItem>
                <SelectItem value="Premium Economy">Premium Economy</SelectItem>
                <SelectItem value="Executiva">Executiva</SelectItem>
                <SelectItem value="Primeira">Primeira</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cia Aérea Principal</Label>
            <AirlineAutocomplete value={formAirline} onChange={iata => onFormChange("airline", iata)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Data Ida</Label>
            <Input type="date" value={formDepartureDate} onChange={e => onFormChange("departure_date", e.target.value)} className="text-sm" />
          </div>
        </div>

        {/* Timeline preview */}
        {allValidSegments.length > 0 && (
          <Card className="p-4 bg-muted/30 mt-4">
            <FlightTimeline segments={allValidSegments} showAll />
          </Card>
        )}
      </Card>

      {/* ═══ FLIGHT GROUPS ═══ */}
      {groups.map((group, gi) => (
        <FlightGroupCard
          key={group.id}
          group={group}
          groupIndex={gi}
          expanded={expandedGroups.has(group.id)}
          onToggle={() => toggleGroup(group.id)}
          onConnectionChange={(ct) => handleConnectionChange(group.id, ct)}
          onSegmentUpdate={(si, f, v) => updateGroupSegment(group.id, si, f, v)}
          onRemove={group.type === "internal" ? () => removeGroup(group.id) : undefined}
          onAmadeusLookup={() => handleAmadeusLookup(group.id)}
          loading={loadingGroup === group.id}
          onStopoverChange={(has) => updateGroups(p => p.map(g => g.id === group.id ? { ...g, hasStopover: has } : g))}
          onStopoverIataChange={(iata) => updateGroups(p => p.map(g => g.id === group.id ? { ...g, stopoverIata: iata } : g))}
          defaultAirline={formAirline}
          defaultDate={group.type === "main_return" ? formReturnDate : formDepartureDate}
        />
      ))}

      {/* Add internal flight */}
      <Button variant="outline" onClick={addInternalFlight} className="w-full border-dashed h-12">
        <Plus className="w-4 h-4 mr-2" /> Adicionar Voo Interno / Adicional
      </Button>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/* ─── Flight Group Card ────────────────────── */
/* ═══════════════════════════════════════════════ */

interface FlightGroupCardProps {
  group: FlightGroup;
  groupIndex: number;
  expanded: boolean;
  onToggle: () => void;
  onConnectionChange: (ct: FlightGroup["connectionType"]) => void;
  onSegmentUpdate: (segIdx: number, field: string, value: any) => void;
  onRemove?: () => void;
  onAmadeusLookup: () => void;
  loading: boolean;
  onStopoverChange: (has: boolean) => void;
  onStopoverIataChange: (iata: string) => void;
  defaultAirline: string;
  defaultDate: string;
}

function FlightGroupCard({
  group, expanded, onToggle, onConnectionChange, onSegmentUpdate,
  onRemove, onAmadeusLookup, loading, onStopoverChange, onStopoverIataChange,
  defaultAirline, defaultDate,
}: FlightGroupCardProps) {
  const isMain = group.type !== "internal";
  const dirIcon = group.type === "main_return" ? "rotate-180" : "";
  const colorClass = group.type === "main_outbound" ? "border-primary/30" :
    group.type === "main_return" ? "border-info/30" : "border-accent/30";
  const bgClass = group.type === "main_outbound" ? "bg-primary/5" :
    group.type === "main_return" ? "bg-info/5" : "bg-accent/5";

  const first = group.segments[0];
  const last = group.segments[group.segments.length - 1];
  const routeSummary = first?.origin_iata && last?.destination_iata
    ? `${first.origin_iata} → ${last.destination_iata}` : "";

  const allFilled = group.segments.every(s => s.origin_iata && s.destination_iata && s.flight_number);

  return (
    <Card className={cn("overflow-hidden border", colorClass)}>
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className={cn("w-full flex items-center justify-between px-5 py-3.5", bgClass)}
      >
        <div className="flex items-center gap-3">
          <Plane className={cn("w-5 h-5 text-primary", dirIcon)} />
          <div className="text-left">
            <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
            {routeSummary && <span className="text-xs font-mono text-muted-foreground">{routeSummary}</span>}
          </div>
          {group.hasStopover && <Badge variant="outline" className="text-[10px] ml-2">Stopover</Badge>}
          {allFilled ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-2" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-500 ml-2" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {onRemove && (
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 py-4 space-y-4">
          {/* Connection type & stopover */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1 flex-1 min-w-[160px]">
              <Label className="text-xs font-medium">Tipo de Voo</Label>
              <Select value={group.connectionType} onValueChange={(v) => onConnectionChange(v as FlightGroup["connectionType"])}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="direto">Voo Direto</SelectItem>
                  <SelectItem value="1_conexao">1 Conexão</SelectItem>
                  <SelectItem value="2_conexoes">2 Conexões</SelectItem>
                  <SelectItem value="3_mais">3+ Conexões</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 min-w-[120px]">
              <Label className="text-xs font-medium">Stopover?</Label>
              <Select value={group.hasStopover ? "sim" : "nao"} onValueChange={v => onStopoverChange(v === "sim")}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao">Não</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {group.hasStopover && (
              <div className="space-y-1 min-w-[100px]">
                <Label className="text-xs font-medium">Stopover em</Label>
                <AirportAutocomplete value={group.stopoverIata} onChange={onStopoverIataChange} placeholder="LIS" />
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onAmadeusLookup}
              disabled={loading}
              className="h-9"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Zap className="w-4 h-4 mr-1" />}
              Amadeus
            </Button>
          </div>

          {/* Segments */}
          <div className="space-y-3">
            {group.segments.map((seg, si) => (
              <SegmentCard
                key={si}
                seg={seg}
                segIndex={si}
                totalSegments={group.segments.length}
                onUpdate={(f, v) => onSegmentUpdate(si, f, v)}
                defaultAirline={defaultAirline}
                defaultDate={defaultDate}
                isConnection={group.segments.length > 1}
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════════ */
/* ─── Segment Card ─────────────────────────── */
/* ═══════════════════════════════════════════════ */

interface SegmentCardProps {
  seg: FlightSegment;
  segIndex: number;
  totalSegments: number;
  onUpdate: (field: string, value: any) => void;
  defaultAirline: string;
  defaultDate: string;
  isConnection: boolean;
}

function SegmentCard({ seg, segIndex, totalSegments, onUpdate, defaultAirline, defaultDate, isConnection }: SegmentCardProps) {
  const label = totalSegments === 1
    ? "Voo Direto"
    : `Segmento ${segIndex + 1} de ${totalSegments}`;

  const missingFlightNum = !seg.flight_number;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
          {isConnection && segIndex > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5">Conexão</Badge>
          )}
        </div>
        {missingFlightNum && (
          <Badge variant="destructive" className="text-[10px]">Nº voo obrigatório</Badge>
        )}
      </div>

      {/* Row 1: Airline, Flight Number, Date */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Companhia Aérea *</Label>
          <AirlineAutocomplete
            value={seg.airline || defaultAirline}
            onChange={(iata) => onUpdate("airline", iata)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Nº do Voo *</Label>
          <Input
            value={seg.flight_number}
            onChange={e => onUpdate("flight_number", e.target.value.toUpperCase())}
            placeholder="LA8084"
            className={cn("font-mono text-sm", missingFlightNum && "border-destructive/50")}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Data do Voo *</Label>
          <Input
            type="date"
            value={seg.departure_date || defaultDate}
            onChange={e => onUpdate("departure_date", e.target.value)}
            className="text-sm"
          />
        </div>
      </div>

      {/* Row 2: Origin, Destination */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Origem *</Label>
          <AirportAutocomplete value={seg.origin_iata} onChange={iata => onUpdate("origin_iata", iata)} placeholder="GRU" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Destino *</Label>
          <AirportAutocomplete value={seg.destination_iata} onChange={iata => onUpdate("destination_iata", iata)} placeholder="FCO" />
        </div>
      </div>

      {/* Row 3: Times, Duration, Class */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Horário Saída</Label>
          <Input type="time" value={seg.departure_time} onChange={e => onUpdate("departure_time", e.target.value)} className="text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Horário Chegada</Label>
          <Input type="time" value={seg.arrival_time} onChange={e => onUpdate("arrival_time", e.target.value)} className="text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Duração (min)</Label>
          <Input type="number" value={seg.duration_minutes || ""} onChange={e => onUpdate("duration_minutes", parseInt(e.target.value) || 0)} className="text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Classe</Label>
          <Select value={seg.flight_class || ""} onValueChange={v => onUpdate("flight_class", v)}>
            <SelectTrigger className="text-sm"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Econômica">Econômica</SelectItem>
              <SelectItem value="Premium Economy">Premium Economy</SelectItem>
              <SelectItem value="Executiva">Executiva</SelectItem>
              <SelectItem value="Primeira">Primeira</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 4: Terminal, Operated By */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Terminal</Label>
          <Input value={seg.terminal} onChange={e => onUpdate("terminal", e.target.value)} className="text-sm" placeholder="T3" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Operado por</Label>
          <Input value={seg.operated_by} onChange={e => onUpdate("operated_by", e.target.value)} className="text-sm" placeholder="Codeshare" />
        </div>
        {segIndex > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">Tempo Conexão (min)</Label>
            <Input type="number" value={seg.connection_time_minutes || ""} onChange={e => onUpdate("connection_time_minutes", parseInt(e.target.value) || 0)} className="text-sm" />
          </div>
        )}
      </div>
    </div>
  );
}
