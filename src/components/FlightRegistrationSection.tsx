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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
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
  locator: string;
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
  onGroupLocatorsChange?: (locators: string[]) => void;
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
    locator: "",
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

function formatDuration(mins: number): string {
  if (!mins) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m > 0 ? `${m}m` : ""}`;
}

/* ─── Amadeus Lookup ─────────────────────────── */

interface AmadeusItinerary {
  direction: string;
  segments: any[];
  totalDurationMinutes: number;
}

interface AmadeusOffer {
  itineraries: AmadeusItinerary[];
}

async function lookupAmadeus(origin: string, destination: string, date: string, airline?: string, flightNumber?: string) {
  const body: any = { action: "flight_schedule", origin, destination, departureDate: date };
  if (airline) body.airline = airline;
  if (flightNumber) body.flightNumber = flightNumber;
  const { data, error } = await supabase.functions.invoke("amadeus-search", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return (data?.data || []) as AmadeusOffer[];
}

/* ─── Component ──────────────────────────────── */

export default function FlightRegistrationSection({
  segments, onSegmentsChange,
  formOrigin, formDestination, formDepartureDate, formReturnDate, formAirline,
  formLocator, formFlightClass, onFormChange, onGroupLocatorsChange,
}: Props) {
  const { toast } = useToast();

  const [itineraryType, setItineraryType] = useState<ItineraryStructure>(() => {
    if (formReturnDate) return "ida_volta";
    return "so_ida";
  });

  const [groups, setGroups] = useState<FlightGroup[]>(() => {
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

  // Amadeus offer selection dialog
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [pendingOffers, setPendingOffers] = useState<{ groupId: string; offers: AmadeusOffer[]; direction: string } | null>(null);

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
      onGroupLocatorsChange?.(next.map(g => g.locator).filter(Boolean));
      return next;
    });
  }, [syncSegments, onGroupLocatorsChange]);

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

  const updateGroupSegment = (groupId: string, segIdx: number, field: string, value: any) => {
    updateGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const segs = g.segments.map((s, i) => {
        if (i !== segIdx) return s;
        return { ...s, [field]: value };
      });
      if (field === "destination_iata" && segIdx < segs.length - 1) {
        segs[segIdx + 1] = { ...segs[segIdx + 1], origin_iata: value };
      }
      return { ...g, segments: segs };
    }));
  };

  const addInternalFlight = () => {
    const internal = createGroup("internal", `Voo Interno ${groups.filter(g => g.type === "internal").length + 1}`);
    updateGroups(prev => [...prev, internal]);
    setExpandedGroups(p => new Set([...p, internal.id]));
  };

  const removeGroup = (groupId: string) => {
    updateGroups(prev => prev.filter(g => g.id !== groupId));
  };

  // ─── Amadeus lookup – now shows offer selection dialog ───
  const handleAmadeusLookup = async (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const first = group.segments[0];
    const last = group.segments[group.segments.length - 1];

    // Get effective values (fallback to form-level values)
    const origin = first.origin_iata || (group.type === "main_return" ? formDestination : formOrigin);
    const destination = last.destination_iata || (group.type === "main_return" ? formOrigin : formDestination);
    const date = first.departure_date || (group.type === "main_return" ? formReturnDate : formDepartureDate);
    const airline = first.airline || formAirline;

    if (!origin || !destination || !date) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha companhia, origem, destino e data para consultar no Amadeus.",
        variant: "destructive",
      });
      return;
    }

    if (!airline) {
      toast({
        title: "Companhia aérea necessária",
        description: "Selecione a companhia aérea para filtrar os resultados do Amadeus.",
        variant: "destructive",
      });
      return;
    }

    const flightNumber = first.flight_number || "";
    // Extract just the numeric part if flight_number includes airline code
    const flightNumOnly = flightNumber.replace(/^[A-Z]{2}/i, "").trim();

    setLoadingGroup(groupId);
    try {
      const offers = await lookupAmadeus(origin, destination, date, airline, flightNumber || undefined);
      if (!offers.length) {
        toast({
          title: "Nenhum voo encontrado",
          description: `Não foram encontrados voos ${airline} de ${origin} para ${destination} em ${date}. Preencha manualmente.`,
        });
        return;
      }

      const dir = group.type === "main_return" ? "volta" : "ida";

      // If only 1 offer, apply directly
      if (offers.length === 1) {
        applyOffer(groupId, offers[0], dir);
      } else {
        // Show selection dialog
        setPendingOffers({ groupId, offers, direction: dir });
        setOfferDialogOpen(true);
      }
    } catch (err: any) {
      const msg = err.message || "Erro desconhecido";
      if (msg.includes("auth failed") || msg.includes("invalid_client")) {
        toast({
          title: "Erro de autenticação Amadeus",
          description: "As credenciais do Amadeus estão inválidas. Verifique as configurações.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Não foi possível consultar o Amadeus",
          description: msg.length > 120 ? "Erro na comunicação com o Amadeus. Tente novamente ou preencha manualmente." : msg,
          variant: "destructive",
        });
      }
    } finally {
      setLoadingGroup(null);
    }
  };

  const applyOffer = (groupId: string, offer: AmadeusOffer, direction: string) => {
    const itin = offer.itineraries?.[0];
    if (!itin?.segments?.length) return;

    const dir = direction as "ida" | "volta";
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

    toast({
      title: "✈️ Dados do Amadeus aplicados!",
      description: `${newSegs.length} segmento(s) preenchidos automaticamente. Revise antes de salvar.`,
    });
  };

  const handleSelectOffer = (offerIdx: number) => {
    if (!pendingOffers) return;
    applyOffer(pendingOffers.groupId, pendingOffers.offers[offerIdx], pendingOffers.direction);
    setOfferDialogOpen(false);
    setPendingOffers(null);
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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
          onLocatorChange={(loc) => updateGroups(p => p.map(g => g.id === group.id ? { ...g, locator: loc } : g))}
          defaultAirline={formAirline}
          defaultDate={group.type === "main_return" ? formReturnDate : formDepartureDate}
          defaultOrigin={group.type === "main_return" ? formDestination : formOrigin}
          defaultDestination={group.type === "main_return" ? formOrigin : formDestination}
        />
      ))}

      {/* Add internal flight */}
      <Button variant="outline" onClick={addInternalFlight} className="w-full border-dashed h-12">
        <Plus className="w-4 h-4 mr-2" /> Adicionar Voo Interno / Adicional
      </Button>

      {/* ═══ OFFER SELECTION DIALOG ═══ */}
      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-primary" />
              Selecione o Voo
            </DialogTitle>
            <DialogDescription>
              Foram encontrados {pendingOffers?.offers.length || 0} itinerários. Selecione o correto para preencher automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            {pendingOffers?.offers.map((offer, oi) => {
              const itin = offer.itineraries?.[0];
              if (!itin) return null;
              const segs = itin.segments || [];
              const first = segs[0];
              const last = segs[segs.length - 1];

              return (
                <button
                  key={oi}
                  type="button"
                  onClick={() => handleSelectOffer(oi)}
                  className="w-full text-left border rounded-lg p-4 hover:bg-accent/50 hover:border-primary/40 transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        Opção {oi + 1}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {segs.length === 1 ? "Voo Direto" : `${segs.length} segmento(s)`}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(itin.totalDurationMinutes)}
                    </span>
                  </div>

                  {/* Segments preview */}
                  <div className="space-y-1.5">
                    {segs.map((seg: any, si: number) => (
                      <div key={si} className="flex items-center gap-2 text-sm">
                        <span className="font-mono font-bold text-primary w-16">
                          {seg.airline}{seg.flight_number}
                        </span>
                        <span className="font-mono text-foreground">
                          {seg.origin_iata}
                        </span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="font-mono text-foreground">
                          {seg.destination_iata}
                        </span>
                        <span className="text-muted-foreground text-xs ml-auto flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {seg.departure_time} → {seg.arrival_time}
                        </span>
                        {seg.duration_minutes > 0 && (
                          <span className="text-muted-foreground text-xs">
                            ({formatDuration(seg.duration_minutes)})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    Clique para selecionar este itinerário →
                  </p>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
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
  onLocatorChange: (locator: string) => void;
  defaultAirline: string;
  defaultDate: string;
  defaultOrigin: string;
  defaultDestination: string;
}

function FlightGroupCard({
  group, expanded, onToggle, onConnectionChange, onSegmentUpdate,
  onRemove, onAmadeusLookup, loading, onStopoverChange, onStopoverIataChange,
  onLocatorChange, defaultAirline, defaultDate, defaultOrigin, defaultDestination,
}: FlightGroupCardProps) {
  const isMain = group.type !== "internal";
  const dirIcon = group.type === "main_return" ? "rotate-180" : "";
  const colorClass = group.type === "main_outbound" ? "border-primary/30" :
    group.type === "main_return" ? "border-blue-400/30" : "border-accent/30";
  const bgClass = group.type === "main_outbound" ? "bg-primary/5" :
    group.type === "main_return" ? "bg-blue-400/5" : "bg-accent/5";

  const first = group.segments[0];
  const last = group.segments[group.segments.length - 1];

  const effectiveOrigin = first?.origin_iata || defaultOrigin;
  const effectiveDestination = last?.destination_iata || defaultDestination;
  const effectiveDate = first?.departure_date || defaultDate;
  const effectiveAirline = first?.airline || defaultAirline;

  const routeSummary = effectiveOrigin && effectiveDestination
    ? `${effectiveOrigin} → ${effectiveDestination}` : "";

  const allFilled = group.segments.every(s => s.origin_iata && s.destination_iata && s.flight_number);

  const effectiveFlightNumber = first?.flight_number || "";

  // Can lookup with (airline + flight number) OR (airline + origin + destination + date)
  const canLookup = !!(effectiveAirline && effectiveFlightNumber) || !!(effectiveAirline && effectiveOrigin && effectiveDestination && effectiveDate);

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
          {/* ─── STEP 1: Type + Airline + Origin + Destination + Date ─── */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="space-y-1">
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

            <div className="space-y-1">
              <Label className="text-xs font-medium">Companhia *</Label>
              <AirlineAutocomplete
                value={first?.airline || defaultAirline}
                onChange={(iata) => {
                  group.segments.forEach((_, i) => onSegmentUpdate(i, "airline", iata));
                }}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Origem *</Label>
              <AirportAutocomplete
                value={first?.origin_iata || defaultOrigin}
                onChange={iata => onSegmentUpdate(0, "origin_iata", iata)}
                placeholder="Ex: GRU ou Guarulhos"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Destino *</Label>
              <AirportAutocomplete
                value={last?.destination_iata || defaultDestination}
                onChange={iata => onSegmentUpdate(group.segments.length - 1, "destination_iata", iata)}
                placeholder="Ex: DXB ou Dubai"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Data *</Label>
              <Input
                type="date"
                value={first?.departure_date || defaultDate}
                onChange={e => onSegmentUpdate(0, "departure_date", e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          {/* ─── Nº do Voo + Localizador ─── */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {group.connectionType === "direto" && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">Nº do Voo</Label>
                <Input
                  value={first?.flight_number || ""}
                  onChange={e => onSegmentUpdate(0, "flight_number", e.target.value.toUpperCase())}
                  placeholder="EK262"
                  className="font-mono text-sm"
                />
                <p className="text-[10px] text-muted-foreground">Opcional — ajuda o Amadeus a localizar o voo exato</p>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Localizador</Label>
              <Input
                value={group.locator || ""}
                onChange={e => onLocatorChange(e.target.value.toUpperCase())}
                placeholder="ABC123"
                className="font-mono text-sm"
              />
            </div>
          </div>

          {/* ─── STEP 2: Amadeus Lookup Button ─── */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onAmadeusLookup}
              disabled={loading || !canLookup}
              className={cn(
                "h-9 transition-all",
                canLookup && !loading && "border-primary/50 text-primary hover:bg-primary/10"
              )}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              {loading ? "Consultando Amadeus..." : "Consultar Amadeus"}
            </Button>

            {!canLookup && (
              <span className="text-xs text-muted-foreground">
                Preencha companhia, origem, destino e data para consultar.
              </span>
            )}

            {canLookup && !loading && (
              <span className="text-xs text-muted-foreground">
                Pronto para buscar voos {effectiveAirline} {effectiveOrigin} → {effectiveDestination}
              </span>
            )}

            {/* Stopover */}
            <div className="ml-auto flex items-center gap-2">
              <Label className="text-xs">Stopover?</Label>
              <Select value={group.hasStopover ? "sim" : "nao"} onValueChange={v => onStopoverChange(v === "sim")}>
                <SelectTrigger className="text-sm w-[80px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao">Não</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                </SelectContent>
              </Select>
              {group.hasStopover && (
                <AirportAutocomplete value={group.stopoverIata} onChange={onStopoverIataChange} placeholder="LIS" className="w-[100px]" />
              )}
            </div>
          </div>

          {/* ─── STEP 3: Segment Details (auto-filled or manual) ─── */}
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
  const isSingleSegment = totalSegments === 1;
  const label = isSingleSegment
    ? "Detalhes do Voo"
    : `Segmento ${segIndex + 1} de ${totalSegments}`;

  const hasFlight = !!seg.flight_number;
  const hasRoute = !!(seg.origin_iata && seg.destination_iata);

  return (
    <div className={cn(
      "rounded-lg border p-4 space-y-3 transition-colors",
      hasFlight && hasRoute ? "bg-card border-emerald-200/50" : "bg-card"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
          {isConnection && segIndex > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5">Conexão</Badge>
          )}
        </div>
        {hasFlight && hasRoute ? (
          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Preenchido
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
            Pendente
          </Badge>
        )}
      </div>

      {/* Row 1: Flight Number + Route + Date — only for multi-segment (single already has these in the group header) */}
      {!isSingleSegment && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Nº do Voo *</Label>
            <Input
              value={seg.flight_number}
              onChange={e => onUpdate("flight_number", e.target.value.toUpperCase())}
              placeholder="LA8084"
              className={cn("font-mono text-sm", !hasFlight && "border-amber-300/50")}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Origem</Label>
            <AirportAutocomplete value={seg.origin_iata} onChange={iata => onUpdate("origin_iata", iata)} placeholder="GRU" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Destino</Label>
            <AirportAutocomplete value={seg.destination_iata} onChange={iata => onUpdate("destination_iata", iata)} placeholder="FCO" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Data</Label>
            <Input
              type="date"
              value={seg.departure_date || defaultDate}
              onChange={e => onUpdate("departure_date", e.target.value)}
              className="text-sm"
            />
          </div>
        </div>
      )}

      {/* Times, Duration, Class */}
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
          <Label className="text-xs">Duração</Label>
          <div className="flex gap-1 items-center">
            <Input
              type="number"
              min={0}
              placeholder="h"
              value={seg.duration_minutes ? Math.floor(seg.duration_minutes / 60) : ""}
              onChange={e => {
                const hours = parseInt(e.target.value) || 0;
                const currentMin = (seg.duration_minutes || 0) % 60;
                onUpdate("duration_minutes", hours * 60 + currentMin);
              }}
              className="text-sm w-16"
            />
            <span className="text-xs text-muted-foreground">h</span>
            <Input
              type="number"
              min={0}
              max={59}
              placeholder="min"
              value={seg.duration_minutes ? seg.duration_minutes % 60 : ""}
              onChange={e => {
                const mins = Math.min(parseInt(e.target.value) || 0, 59);
                const currentH = Math.floor((seg.duration_minutes || 0) / 60);
                onUpdate("duration_minutes", currentH * 60 + mins);
              }}
              className="text-sm w-16"
            />
            <span className="text-xs text-muted-foreground">min</span>
          </div>
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

      {/* Terminal, Operated By, Connection Time */}
      <div className={cn("grid gap-3", segIndex > 0 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2")}>
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
