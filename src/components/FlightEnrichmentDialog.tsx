import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plane, Clock, AlertTriangle, Check, RefreshCw, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { FlightSegment } from "@/components/FlightTimeline";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  airline?: string;
  currentSegments: FlightSegment[];
  onApply: (segments: FlightSegment[]) => void;
}

interface AmadeusSegment {
  direction: string;
  segment_order: number;
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
  operated_by: string;
  connection_time_minutes: number;
}

interface OfferData {
  itineraries: {
    direction: string;
    segments: AmadeusSegment[];
    totalDurationMinutes: number;
  }[];
}

function formatDuration(mins: number) {
  if (!mins) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m > 0 ? `${m}min` : ""}`;
}

export default function FlightEnrichmentDialog({
  open, onOpenChange, origin, destination, departureDate, returnDate, airline,
  currentSegments, onApply,
}: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState<OfferData[]>([]);
  const [selectedOffer, setSelectedOffer] = useState(0);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setOffers([]);
    setSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke("amadeus-search", {
        body: {
          action: "flight_schedule",
          origin, destination, departureDate, returnDate,
          airline: airline || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOffers(data?.data || []);
      if (!data?.data?.length) {
        toast({ title: "Nenhum voo encontrado", description: "Tente ajustar os parâmetros.", variant: "destructive" });
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro ao consultar Amadeus", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    const offer = offers[selectedOffer];
    if (!offer) return;

    const newSegments: FlightSegment[] = [];
    offer.itineraries.forEach((itin) => {
      itin.segments.forEach((seg) => {
        newSegments.push({
          direction: seg.direction as "ida" | "volta",
          segment_order: seg.segment_order,
          airline: seg.airline,
          flight_number: `${seg.airline}${seg.flight_number}`,
          origin_iata: seg.origin_iata,
          destination_iata: seg.destination_iata,
          departure_date: seg.departure_date,
          departure_time: seg.departure_time,
          arrival_time: seg.arrival_time,
          duration_minutes: seg.duration_minutes,
          terminal: seg.terminal,
          operated_by: seg.operated_by,
          connection_time_minutes: seg.connection_time_minutes,
          flight_class: "",
          cabin_type: "",
        });
      });
    });

    onApply(newSegments);
    onOpenChange(false);
    toast({ title: "Segmentos aplicados!", description: `${newSegments.length} trecho(s) do Amadeus.` });
  };

  const currentOffer = offers[selectedOffer];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-primary" />
            Enriquecimento de Voo — Amadeus
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search params summary */}
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="font-mono">{origin} → {destination}</Badge>
            <Badge variant="outline">{departureDate}</Badge>
            {returnDate && <Badge variant="outline">Volta: {returnDate}</Badge>}
            {airline && <Badge variant="outline">Cia: {airline}</Badge>}
          </div>

          {!searched && (
            <Button onClick={handleSearch} disabled={loading} className="w-full">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Consultando Amadeus...</> : "Buscar Voos no Amadeus"}
            </Button>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
              <span className="text-muted-foreground">Consultando horários...</span>
            </div>
          )}

          {searched && !loading && offers.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Nenhum voo encontrado. Tente alterar parâmetros.
            </div>
          )}

          {/* Offer selector */}
          {offers.length > 1 && (
            <div className="flex gap-2">
              {offers.map((_, i) => (
                <Button
                  key={i}
                  variant={selectedOffer === i ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedOffer(i)}
                >
                  Opção {i + 1}
                </Button>
              ))}
            </div>
          )}

          {/* Selected offer timeline */}
          {currentOffer && (
            <div className="space-y-4">
              {currentOffer.itineraries.map((itin, itinIdx) => (
                <div key={itinIdx} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold capitalize flex items-center gap-2">
                      <Plane className={`w-4 h-4 text-primary ${itin.direction === "volta" ? "rotate-180" : ""}`} />
                      {itin.direction}
                    </h4>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDuration(itin.totalDurationMinutes)}
                      {itin.segments.length > 1 && (
                        <Badge variant="outline" className="ml-1 text-[10px]">
                          {itin.segments.length - 1} conexão(ões)
                        </Badge>
                      )}
                    </span>
                  </div>

                  {itin.segments.map((seg, segIdx) => (
                    <div key={segIdx}>
                      <div className="flex items-center gap-3 py-1.5">
                        <div className="text-center w-14 shrink-0">
                          <p className="text-base font-bold font-mono text-primary">{seg.origin_iata}</p>
                          <p className="text-[10px] text-muted-foreground">{seg.departure_time}</p>
                          {seg.terminal && <p className="text-[10px] text-muted-foreground/60">T{seg.terminal}</p>}
                        </div>
                        <div className="flex-1 relative">
                          <div className="border-t-2 border-primary border-dashed" />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-popover px-1.5">
                            <Plane className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className="flex justify-center mt-1 text-center">
                            <div>
                              <p className="text-[10px] text-muted-foreground font-medium">
                                {seg.airline}{seg.flight_number}
                              </p>
                              <p className="text-[10px] text-muted-foreground">{formatDuration(seg.duration_minutes)}</p>
                              {seg.operated_by && (
                                <p className="text-[10px] text-muted-foreground/60">Op. {seg.operated_by}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-center w-14 shrink-0">
                          <p className="text-base font-bold font-mono text-primary">{seg.destination_iata}</p>
                          <p className="text-[10px] text-muted-foreground">{seg.arrival_time}</p>
                          {seg.arrival_terminal && <p className="text-[10px] text-muted-foreground/60">T{seg.arrival_terminal}</p>}
                        </div>
                      </div>

                      {seg.connection_time_minutes > 0 && segIdx < itin.segments.length - 1 && (
                        <div className={`flex items-center justify-center gap-1 py-1 mx-14 rounded text-[10px] ${
                          seg.connection_time_minutes < 90 ? "bg-destructive/10 text-destructive" :
                          seg.connection_time_minutes > 480 ? "bg-warning/10 text-warning-foreground" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          <Clock className="w-3 h-3" />
                          Conexão: {formatDuration(seg.connection_time_minutes)}
                          {seg.connection_time_minutes < 90 && <><AlertTriangle className="w-3 h-3" /> Crítica</>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}

              {/* Conflict detection */}
              {currentSegments.some(s => s.origin_iata && s.destination_iata) && (
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-xs text-warning-foreground flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Dados existentes detectados</p>
                    <p>Ao aplicar, os segmentos atuais serão substituídos pelos dados do Amadeus.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {currentOffer && (
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => { setSearched(false); setOffers([]); }}>
              <RefreshCw className="w-4 h-4 mr-1" /> Reconsultar
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <Pencil className="w-4 h-4 mr-1" /> Editar Manualmente
            </Button>
            <Button onClick={handleApply}>
              <Check className="w-4 h-4 mr-1" /> Aplicar ao Registro
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
