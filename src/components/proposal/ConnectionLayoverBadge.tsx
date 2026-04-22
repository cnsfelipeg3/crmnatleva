import { Clock, MapPin, AlertTriangle } from "lucide-react";
import type { FlightSegmentData } from "./ProposalFlightSearch";
import { localTimeToUTC, getAirportTimezone } from "@/lib/airportTimezones";

/**
 * Calcula o tempo real de conexão em minutos, respeitando os fusos horários
 * dos aeroportos de chegada e partida (não apenas comparando "HH:MM" locais).
 *
 * Suporta também voos com chegada no dia seguinte (overnight).
 */
export function calcLayoverMinutes(prev: FlightSegmentData, next: FlightSegmentData): number | null {
  if (!prev.arrival_time || !next.departure_time) return null;

  // Estima a data/hora de chegada do voo anterior:
  // arrival_date ≈ departure_date + (arrival_time < departure_time ? 1 dia : 0)
  const prevDepDate = prev.departure_date;
  if (!prevDepDate) return null;

  let prevArrDate = prevDepDate;
  if (prev.departure_time && prev.arrival_time) {
    const [dh, dm] = prev.departure_time.split(":").map(Number);
    const [ah, am] = prev.arrival_time.split(":").map(Number);
    // Se a duração é conhecida e > 0, usamos para detectar overnight com mais segurança
    if (prev.duration_minutes && prev.duration_minutes > 0) {
      const depUTC = localTimeToUTC(prev.origin_iata, prevDepDate, prev.departure_time);
      if (depUTC) {
        const arrUTC = new Date(depUTC.getTime() + prev.duration_minutes * 60_000);
        const tz = getAirportTimezone(prev.destination_iata);
        if (tz) {
          // extrai data local no destino
          const local = new Intl.DateTimeFormat("en-CA", {
            timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
          }).format(arrUTC);
          prevArrDate = local; // YYYY-MM-DD
        }
      }
    } else if (ah * 60 + am < dh * 60 + dm) {
      // sem duration: assume que chegada antes da partida = dia seguinte
      const d = new Date(prevDepDate + "T00:00:00");
      d.setDate(d.getDate() + 1);
      prevArrDate = d.toISOString().slice(0, 10);
    }
  }

  const arrUTC = localTimeToUTC(prev.destination_iata, prevArrDate, prev.arrival_time);
  const depUTC = localTimeToUTC(next.origin_iata, next.departure_date || prevArrDate, next.departure_time);
  if (!arrUTC || !depUTC) return null;

  const diff = Math.round((depUTC.getTime() - arrUTC.getTime()) / 60_000);
  return diff;
}

function formatLayover(min: number): string {
  const abs = Math.abs(min);
  const days = Math.floor(abs / 1440);
  const hours = Math.floor((abs % 1440) / 60);
  const mins = abs % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 && days === 0) parts.push(`${mins}min`);
  return (min < 0 ? "−" : "") + (parts.join(" ") || "0min");
}

function getLayoverColor(min: number): string {
  // Conexão muito apertada (< 45min) → destaque crítico vermelho
  if (min < 45) return "text-destructive bg-destructive/10 border-destructive/30";
  // Qualquer outra conexão → padrão amarelo (alinhado ao preview do cliente)
  return "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800";
}

interface ConnectionLayoverBadgeProps {
  prevSegment: FlightSegmentData;
  nextSegment: FlightSegmentData;
}

export default function ConnectionLayoverBadge({ prevSegment, nextSegment }: ConnectionLayoverBadgeProps) {
  const layover = calcLayoverMinutes(prevSegment, nextSegment);
  const city = prevSegment.destination_iata;
  const tooTight = layover !== null && layover < 45;
  const negative = layover !== null && layover < 0;

  return (
    <div className="flex items-center justify-center py-2">
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${
          layover !== null ? getLayoverColor(layover) : "text-muted-foreground bg-muted/50 border-border"
        }`}
      >
        <div className="flex items-center gap-1">
          {(tooTight || negative) ? <AlertTriangle className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
          <span>Conexão{city ? ` em ${city}` : ""}</span>
        </div>
        {layover !== null && (
          <>
            <span className="text-muted-foreground/50">•</span>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{negative ? "Inválido" : formatLayover(layover)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
