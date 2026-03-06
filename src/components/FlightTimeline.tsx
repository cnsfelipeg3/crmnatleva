import { Plane, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTimeBR, formatDateBR } from "@/lib/dateFormat";
import AirlineLogo from "@/components/AirlineLogo";
import { Badge } from "@/components/ui/badge";
import {
  classifyItinerary,
  getItineraryLabel,
  getItineraryBadgeColor,
  type ItineraryClassification,
  type ItineraryLeg,
} from "@/lib/itineraryClassifier";

export interface FlightSegment {
  id?: string;
  direction: "ida" | "volta";
  segment_order: number;
  airline: string;
  flight_number: string;
  origin_iata: string;
  destination_iata: string;
  departure_date: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  flight_class: string;
  cabin_type: string;
  operated_by: string;
  connection_time_minutes: number;
  terminal: string;
}

interface Props {
  segments: FlightSegment[];
  /** @deprecated Use showAll instead for multi-city support */
  direction?: "ida" | "volta";
  /** If true, shows all segments grouped by legs with itinerary classification */
  showAll?: boolean;
}

function formatDuration(mins: number) {
  if (!mins) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m > 0 ? `${m}min` : ""}`;
}

function SegmentRow({ seg }: { seg: FlightSegment }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      {/* Origin */}
      <div className="text-center w-16 shrink-0">
        <p className="text-lg font-bold font-mono text-primary leading-tight">{seg.origin_iata}</p>
        {seg.departure_time && (
          <p className="text-xs text-muted-foreground">{formatTimeBR(seg.departure_time)}</p>
        )}
      </div>

      {/* Line with flight number above, logo below */}
      <div className="flex-1 relative min-w-[80px]">
        {/* Flight number + duration ABOVE the line */}
        <div className="flex justify-center mb-2">
          <div className="text-center space-y-0.5">
            <p className="text-xs font-semibold font-mono text-foreground leading-tight">
              {seg.flight_number || seg.airline}
            </p>
            {seg.duration_minutes > 0 && (
              <p className="text-[10px] text-muted-foreground leading-tight">
                {formatDuration(seg.duration_minutes)}
              </p>
            )}
          </div>
        </div>

        {/* Dashed line */}
        <div className="border-t-2 border-primary/40 border-dashed" />

        {/* Logo + details BELOW the line */}
        <div className="flex justify-center mt-2">
          <div className="flex flex-col items-center gap-1">
            {seg.airline ? (
              <AirlineLogo iata={seg.airline} size={28} />
            ) : (
              <Plane className="w-5 h-5 text-primary" />
            )}
            {seg.flight_class && (
              <p className="text-[10px] text-muted-foreground leading-tight">{seg.flight_class}</p>
            )}
            {seg.operated_by && seg.operated_by !== seg.airline && (
              <p className="text-[10px] text-muted-foreground/60 leading-tight">
                Op. {seg.operated_by}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Destination */}
      <div className="text-center w-16 shrink-0">
        <p className="text-lg font-bold font-mono text-primary leading-tight">{seg.destination_iata}</p>
        {seg.arrival_time && (
          <p className="text-xs text-muted-foreground">{formatTimeBR(seg.arrival_time)}</p>
        )}
      </div>
    </div>
  );
}

function ConnectionIndicator({ minutes }: { minutes: number }) {
  const isCritical = minutes > 0 && minutes < 90;
  const isLong = minutes > 480;

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1.5 py-1.5 mx-16 rounded text-xs transition-colors",
        isCritical
          ? "bg-destructive/10 text-destructive"
          : isLong
          ? "bg-warning/10 text-warning-foreground"
          : "bg-muted text-muted-foreground"
      )}
    >
      <Clock className="w-3 h-3" />
      Conexão: {formatDuration(minutes)}
      {isCritical && (
        <span className="flex items-center gap-0.5">
          <AlertTriangle className="w-3 h-3" /> Crítica
        </span>
      )}
      {isLong && (
        <span className="flex items-center gap-0.5">
          <AlertTriangle className="w-3 h-3" /> Longa
        </span>
      )}
    </div>
  );
}

function LegHeader({ leg, classification }: { leg: ItineraryLeg; classification: ItineraryClassification }) {
  const isMultiCity = classification.type === "MULTI_CITY";
  const isOpenJaw = classification.type === "OPEN_JAW";

  let label: string;
  if (isMultiCity) {
    label = `Trecho ${leg.legNumber}`;
  } else {
    label = leg.legNumber === 1 ? "Ida" : "Volta";
  }

  return (
    <div className="flex items-center gap-2 mb-2">
      <h4 className="text-sm font-semibold text-foreground">{label}</h4>
      {leg.departureDate && (
        <span className="text-xs text-muted-foreground">
          {formatDateBR(leg.departureDate)}
        </span>
      )}
      {isOpenJaw && leg.legNumber === 2 && classification.openJawType === "destination" && (
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-info/30 text-info">
          Origem diferente
        </Badge>
      )}
      {isOpenJaw && leg.legNumber === 2 && classification.openJawType === "origin" && (
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-info/30 text-info">
          Destino diferente
        </Badge>
      )}
    </div>
  );
}

/** Renders all segments with full itinerary classification */
function FullTimeline({ segments }: { segments: FlightSegment[] }) {
  const classification = classifyItinerary(segments);

  if (classification.legs.length === 0) return null;

  const totalDuration = segments.reduce(
    (s, seg) => s + (seg.duration_minutes || 0) + (seg.connection_time_minutes || 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* Header with classification */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant="outline"
          className={cn("text-[10px] font-semibold px-2 py-0.5", getItineraryBadgeColor(classification.type))}
        >
          {getItineraryLabel(classification.type)}
          {classification.type === "MULTI_CITY" && ` · ${classification.legs.length} trechos`}
        </Badge>
        {classification.type === "OPEN_JAW" && classification.openJawType && (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground">
            {classification.openJawType === "destination" ? "no destino" : "na origem"}
          </Badge>
        )}
        {/* Route summary */}
        <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
          {classification.legs.map((leg, i) => (
            <span key={i} className="flex items-center gap-0.5">
              {i > 0 && <ArrowRight className="w-3 h-3 text-muted-foreground/50" />}
              <span className="font-mono font-semibold text-foreground/80">{leg.originIata}</span>
            </span>
          ))}
          <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
          <span className="font-mono font-semibold text-foreground/80">
            {classification.legs[classification.legs.length - 1].destinationIata}
          </span>
          {totalDuration > 0 && (
            <>
              <span className="mx-1">·</span>
              <Clock className="w-3 h-3" />
              {formatDuration(totalDuration)}
            </>
          )}
        </span>
      </div>

      {/* Legs */}
      {classification.legs.map((leg) => {
        const legSegments = leg.segments as FlightSegment[];

        return (
          <div key={leg.legNumber} className="space-y-1">
            <LegHeader leg={leg} classification={classification} />
            <div className="relative">
              {legSegments.map((seg, i) => (
                <div key={i}>
                  <SegmentRow seg={seg} />
                  {seg.connection_time_minutes > 0 && i < legSegments.length - 1 && (
                    <ConnectionIndicator minutes={seg.connection_time_minutes} />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Legacy: renders segments for a single direction */
function DirectionTimeline({ segments, direction }: { segments: FlightSegment[]; direction: string }) {
  const sorted = [...segments]
    .filter((s) => s.direction === direction)
    .sort((a, b) => a.segment_order - b.segment_order);
  if (sorted.length === 0) return null;

  const totalDuration = sorted.reduce(
    (s, seg) => s + (seg.duration_minutes || 0) + (seg.connection_time_minutes || 0),
    0
  );
  const hasConnection = sorted.length > 1;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <h4 className="text-sm font-semibold text-foreground capitalize">{direction}</h4>
        {hasConnection && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {sorted.length - 1} conexão(ões)
          </span>
        )}
        {totalDuration > 0 && (
          <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
            <Clock className="w-3 h-3" /> Total: {formatDuration(totalDuration)}
          </span>
        )}
      </div>

      <div className="relative">
        {sorted.map((seg, i) => (
          <div key={i}>
            <SegmentRow seg={seg} />
            {seg.connection_time_minutes > 0 && i < sorted.length - 1 && (
              <ConnectionIndicator minutes={seg.connection_time_minutes} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FlightTimeline({ segments, direction, showAll }: Props) {
  if (showAll) {
    return <FullTimeline segments={segments} />;
  }

  if (direction) {
    return <DirectionTimeline segments={segments} direction={direction} />;
  }

  // Default: show full timeline
  return <FullTimeline segments={segments} />;
}
