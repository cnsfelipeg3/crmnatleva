import { getAirportTimezone, localTimeToUTC } from "@/lib/airportTimezones";

export interface FlightTimingSegmentLike {
  origin_iata?: string | null;
  destination_iata?: string | null;
  departure_date?: string | null;
  departure_time?: string | null;
  arrival_date?: string | null;
  arrival_time?: string | null;
  duration_minutes?: number | null;
}

function formatDateInTimezone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const lookup = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

export function inferArrivalDate(segment: FlightTimingSegmentLike): string | null {
  const departureDate = segment.departure_date?.slice(0, 10);
  const explicitArrivalDate = segment.arrival_date?.slice(0, 10);

  if (explicitArrivalDate) return explicitArrivalDate;
  if (!departureDate || !segment.arrival_time) return null;

  if (segment.departure_time && Number.isFinite(segment.duration_minutes) && Number(segment.duration_minutes) > 0) {
    const departureUtc = localTimeToUTC(segment.origin_iata, departureDate, segment.departure_time);
    const destinationTimezone = getAirportTimezone(segment.destination_iata);

    if (departureUtc && destinationTimezone) {
      const arrivalUtc = new Date(departureUtc.getTime() + Number(segment.duration_minutes) * 60_000);
      return formatDateInTimezone(arrivalUtc, destinationTimezone);
    }
  }

  if (segment.departure_time) {
    const [depHour, depMin] = segment.departure_time.split(":").map(Number);
    const [arrHour, arrMin] = segment.arrival_time.split(":").map(Number);

    if ((arrHour * 60 + arrMin) < (depHour * 60 + depMin)) {
      const nextDay = new Date(`${departureDate}T00:00:00`);
      nextDay.setDate(nextDay.getDate() + 1);
      return nextDay.toISOString().slice(0, 10);
    }
  }

  return departureDate;
}

export function calcLayoverMinutes(prev: FlightTimingSegmentLike, next: FlightTimingSegmentLike): number | null {
  if (!prev.arrival_time || !next.departure_time) return null;

  const arrivalDate = inferArrivalDate(prev);
  const departureDate = next.departure_date?.slice(0, 10) || arrivalDate;
  if (!arrivalDate || !departureDate) return null;

  const arrivalUtc = localTimeToUTC(prev.destination_iata, arrivalDate, prev.arrival_time);
  const departureUtc = localTimeToUTC(next.origin_iata, departureDate, next.departure_time);
  if (!arrivalUtc || !departureUtc) return null;

  return Math.round((departureUtc.getTime() - arrivalUtc.getTime()) / 60_000);
}