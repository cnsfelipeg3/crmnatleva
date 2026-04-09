/**
 * Extracts a short city label and optional IATA code from a city string.
 *
 * Examples:
 *   "São Paulo-Guarulhos International Airport (GRU) - Rodovia..." → { city: "São Paulo", iata: "GRU" }
 *   "Dubai International Airport (DXB) - Dubai - Emirados Árabes Unidos" → { city: "Dubai", iata: "DXB" }
 *   "Orlando, Flórida, EUA" → { city: "Orlando", iata: null }
 *   "São Paulo, SP, Brasil" → { city: "São Paulo", iata: null }
 */
export function extractCityInfo(raw: string | null | undefined): { city: string | null; iata: string | null } {
  if (!raw || !raw.trim()) return { city: null, iata: null };

  const text = raw.trim();

  // Extract IATA code from parentheses like (GRU), (DXB)
  const iataMatch = text.match(/\(([A-Z]{3})\)/);
  const iata = iataMatch ? iataMatch[1] : null;

  // Strategy 1: If it looks like "City Name - Something (CODE) - ...", take text before first " -" or " ("
  // Strategy 2: If "City, State, Country", take first part

  let city: string;

  // Remove airport name patterns first
  // "São Paulo-Guarulhos International Airport (GRU) - ..." → try to get the city
  const airportPattern = /^(.+?)(?:\s*[-–]\s*\w+)?\s+(?:International\s+)?Airport/i;
  const airportMatch = text.match(airportPattern);

  if (airportMatch) {
    // For "São Paulo-Guarulhos International Airport" → "São Paulo"
    city = airportMatch[1].split(/[-–]/)[0].trim();
  } else if (text.includes(",")) {
    // "Orlando, Flórida, EUA" → "Orlando"
    city = text.split(",")[0].trim();
  } else if (text.includes(" - ")) {
    // "Dubai - Emirados Árabes Unidos" → "Dubai"
    city = text.split(" - ")[0].trim();
  } else {
    city = text;
  }

  // Clean up: remove any remaining parenthetical codes
  city = city.replace(/\s*\([A-Z]{3}\)\s*/g, "").trim();

  // If city is too long (>30 chars), it's probably still messy - truncate at first comma or dash
  if (city.length > 30) {
    const short = city.split(/[,\-–]/)[0].trim();
    if (short.length >= 3) city = short;
  }

  return { city: city || null, iata };
}

/**
 * Returns a short display label for a route endpoint.
 * Priority: IATA from city text > explicit IATA param > city name > fallback
 */
export function routeLabel(
  cityText: string | null | undefined,
  iataCode: string | null | undefined,
): string {
  const extracted = extractCityInfo(cityText);
  const iata = extracted.iata || (iataCode?.trim() || null);
  const city = extracted.city;

  if (iata && city) return `${city} (${iata})`;
  if (iata) return iata;
  if (city) return city;
  return "";
}

/**
 * Returns a short code (IATA or abbreviated city) for compact display
 */
export function routeCode(
  cityText: string | null | undefined,
  iataCode: string | null | undefined,
): string {
  const extracted = extractCityInfo(cityText);
  return extracted.iata || iataCode?.trim() || extracted.city || "";
}
