import { Clock, MapPin } from "lucide-react";
import type { FlightSegmentData } from "./ProposalFlightSearch";

function calcLayoverMinutes(prev: FlightSegmentData, next: FlightSegmentData): number | null {
  if (!prev.arrival_time || !next.departure_time) return null;

  const prevDate = prev.departure_date || "";
  const nextDate = next.departure_date || prevDate;

  const [ph, pm] = prev.arrival_time.split(":").map(Number);
  const [nh, nm] = next.departure_time.split(":").map(Number);

  let prevMinutes = ph * 60 + pm;
  let nextMinutes = nh * 60 + nm;

  // If dates differ, add day difference
  if (prevDate && nextDate && nextDate > prevDate) {
    const diffDays = Math.round(
      (new Date(nextDate + "T00:00:00").getTime() - new Date(prevDate + "T00:00:00").getTime()) / 86400000
    );
    nextMinutes += diffDays * 1440;
  } else if (nextMinutes <= prevMinutes) {
    // Same date but next time is earlier => next day
    nextMinutes += 1440;
  }

  return nextMinutes - prevMinutes;
}

function formatLayover(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) return `${h}h${m > 0 ? `${m}min` : ""}`;
  return `${m}min`;
}

function getLayoverColor(min: number): string {
  if (min < 60) return "text-destructive bg-destructive/10 border-destructive/30"; // tight
  if (min <= 180) return "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800"; // good
  return "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800"; // long
}

interface ConnectionLayoverBadgeProps {
  prevSegment: FlightSegmentData;
  nextSegment: FlightSegmentData;
}

export default function ConnectionLayoverBadge({ prevSegment, nextSegment }: ConnectionLayoverBadgeProps) {
  const layover = calcLayoverMinutes(prevSegment, nextSegment);
  const city = prevSegment.destination_iata;

  return (
    <div className="flex items-center justify-center py-2">
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${layover !== null ? getLayoverColor(layover) : "text-muted-foreground bg-muted/50 border-border"}`}>
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span>Conexão{city ? ` em ${city}` : ""}</span>
        </div>
        {layover !== null && (
          <>
            <span className="text-muted-foreground/50">•</span>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatLayover(layover)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export { calcLayoverMinutes };
