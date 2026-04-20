import { calcLayoverMinutes } from "@/lib/flightTiming";

/**
 * Itinerary classification utility.
 * Classifies flight segments as ROUND_TRIP, OPEN_JAW, MULTI_CITY, or ONE_WAY.
 */

// City code mapping for major airports sharing a city
const CITY_CODES: Record<string, string> = {
  // São Paulo
  GRU: "SAO", CGH: "SAO", VCP: "SAO",
  // Rio de Janeiro
  GIG: "RIO", SDU: "RIO",
  // Rome
  FCO: "ROM", CIA: "ROM",
  // London
  LHR: "LON", LGW: "LON", STN: "LON", LTN: "LON", LCY: "LON",
  // Paris
  CDG: "PAR", ORY: "PAR",
  // New York
  JFK: "NYC", LGA: "NYC", EWR: "NYC",
  // Tokyo
  NRT: "TYO", HND: "TYO",
  // Buenos Aires
  EZE: "BUE", AEP: "BUE",
  // Milan
  MXP: "MIL", LIN: "MIL", BGY: "MIL",
  // Chicago
  ORD: "CHI", MDW: "CHI",
  // Washington DC
  IAD: "WAS", DCA: "WAS", BWI: "WAS",
  // Moscow
  SVO: "MOW", DME: "MOW", VKO: "MOW",
  // Stockholm
  ARN: "STO", BMA: "STO",
  // Istanbul
  IST: "IST", SAW: "IST",
  // Shanghai
  PVG: "SHA", SHA: "SHA",
  // Beijing
  PEK: "BJS", PKX: "BJS",
  // Osaka
  KIX: "OSA", ITM: "OSA",
  // Seoul
  ICN: "SEL", GMP: "SEL",
  // Dubai (single but included)
  DXB: "DXB", DWC: "DXB",
};

export type ItineraryType = "ROUND_TRIP" | "OPEN_JAW" | "MULTI_CITY" | "ONE_WAY";
export type OpenJawType = "origin" | "destination" | null;

export interface ItineraryClassification {
  type: ItineraryType;
  openJawType: OpenJawType;
  legs: ItineraryLeg[];
  globalOrigin: string;
  globalDestination: string;
}

export interface ItineraryLeg {
  legNumber: number;
  originIata: string;
  destinationIata: string;
  departureDate: string | null;
  segments: FlightSegmentInput[];
}

export interface FlightSegmentInput {
  origin_iata: string;
  destination_iata: string;
  departure_date?: string | null;
  departure_time?: string | null;
  direction?: string;
  segment_order?: number;
  [key: string]: any;
}

function getCityCode(iata: string): string {
  const code = iata?.toUpperCase().trim();
  return CITY_CODES[code] || code;
}

/**
 * Groups consecutive segments into legs.
 * A new leg starts when there's a gap in dates (>= different day with no continuity).
 */
function groupIntoLegs(segments: FlightSegmentInput[]): ItineraryLeg[] {
  if (segments.length === 0) return [];

  const sorted = [...segments].sort((a, b) => {
    const dateA = a.departure_date || "";
    const dateB = b.departure_date || "";
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    const timeA = a.departure_time || "";
    const timeB = b.departure_time || "";
    return timeA.localeCompare(timeB);
  });

  const legs: ItineraryLeg[] = [];
  let currentLeg: FlightSegmentInput[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    const sameAirport = prev.destination_iata?.toUpperCase() === curr.origin_iata?.toUpperCase();
    const layoverMinutes = sameAirport ? calcLayoverMinutes(prev, curr) : null;
    const isValidConnection = layoverMinutes !== null && layoverMinutes >= 0 && layoverMinutes <= 24 * 60;
    const sameDayFallback = sameAirport && prev.departure_date === curr.departure_date;
    const isContinuation = isValidConnection || (layoverMinutes === null && sameDayFallback);

    if (isContinuation) {
      currentLeg.push(curr);
    } else {
      legs.push({
        legNumber: legs.length + 1,
        originIata: currentLeg[0].origin_iata?.toUpperCase() || "",
        destinationIata: currentLeg[currentLeg.length - 1].destination_iata?.toUpperCase() || "",
        departureDate: currentLeg[0].departure_date || null,
        segments: currentLeg,
      });
      currentLeg = [curr];
    }
  }

  // Push last leg
  legs.push({
    legNumber: legs.length + 1,
    originIata: currentLeg[0].origin_iata?.toUpperCase() || "",
    destinationIata: currentLeg[currentLeg.length - 1].destination_iata?.toUpperCase() || "",
    departureDate: currentLeg[0].departure_date || null,
    segments: currentLeg,
  });

  return legs;
}

/**
 * Classify an itinerary based on its segments.
 */
export function classifyItinerary(segments: FlightSegmentInput[]): ItineraryClassification {
  const validSegments = segments.filter(s => s.origin_iata && s.destination_iata);

  if (validSegments.length === 0) {
    return {
      type: "ONE_WAY",
      openJawType: null,
      legs: [],
      globalOrigin: "",
      globalDestination: "",
    };
  }

  const legs = groupIntoLegs(validSegments);
  const globalOrigin = legs[0].originIata;
  const globalDestination = legs[legs.length - 1].destinationIata;

  if (legs.length === 1) {
    return {
      type: "ONE_WAY",
      openJawType: null,
      legs,
      globalOrigin,
      globalDestination,
    };
  }

  if (legs.length === 2) {
    const o1City = getCityCode(legs[0].originIata);
    const d1City = getCityCode(legs[0].destinationIata);
    const o2City = getCityCode(legs[1].originIata);
    const d2City = getCityCode(legs[1].destinationIata);

    const roundTrip = o1City === d2City && d1City === o2City;
    if (roundTrip) {
      return { type: "ROUND_TRIP", openJawType: null, legs, globalOrigin, globalDestination };
    }

    const destOpenJaw = o1City === d2City && d1City !== o2City;
    if (destOpenJaw) {
      return { type: "OPEN_JAW", openJawType: "destination", legs, globalOrigin, globalDestination };
    }

    const originOpenJaw = d1City === o2City && o1City !== d2City;
    if (originOpenJaw) {
      return { type: "OPEN_JAW", openJawType: "origin", legs, globalOrigin, globalDestination };
    }
  }

  return {
    type: "MULTI_CITY",
    openJawType: null,
    legs,
    globalOrigin,
    globalDestination,
  };
}

/**
 * Assigns correct direction labels to segments based on itinerary classification.
 * For ROUND_TRIP: leg1 = "ida", leg2 = "volta"
 * For OPEN_JAW: leg1 = "ida", leg2 = "volta"
 * For MULTI_CITY: all segments get direction "trecho" with leg number
 */
export function assignDirections(
  segments: FlightSegmentInput[],
  classification: ItineraryClassification
): FlightSegmentInput[] {
  const result = [...segments];

  for (const leg of classification.legs) {
    for (const seg of leg.segments) {
      const idx = result.findIndex(
        s => s.origin_iata === seg.origin_iata &&
             s.destination_iata === seg.destination_iata &&
             s.departure_date === seg.departure_date
      );
      if (idx !== -1) {
        if (classification.type === "ROUND_TRIP" || classification.type === "OPEN_JAW") {
          result[idx] = { ...result[idx], direction: leg.legNumber === 1 ? "ida" : "volta" };
        } else {
          result[idx] = { ...result[idx], direction: "ida" }; // Keep as ida for compatibility
        }
      }
    }
  }

  return result;
}

export function getItineraryLabel(type: ItineraryType): string {
  switch (type) {
    case "ROUND_TRIP": return "Ida/Volta";
    case "OPEN_JAW": return "Open-Jaw";
    case "MULTI_CITY": return "Multi-City";
    case "ONE_WAY": return "Somente Ida";
  }
}

export function getItineraryBadgeColor(type: ItineraryType): string {
  switch (type) {
    case "ROUND_TRIP": return "bg-primary/10 text-primary";
    case "OPEN_JAW": return "bg-info/10 text-info";
    case "MULTI_CITY": return "bg-accent/10 text-accent-foreground";
    case "ONE_WAY": return "bg-muted text-muted-foreground";
  }
}
