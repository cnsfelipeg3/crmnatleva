// Mapa estático cia → domínio oficial (BR-friendly).
// Usado como fallback quando getBookingDetails não retorna providers
// ou quando provider não tem website.

export interface AirlineEntry {
  code: string;
  name: string;
  domain: string;
  bookingPathPt?: string;
}

export const AIRLINE_REGISTRY: Record<string, AirlineEntry> = {
  LA: { code: "LA", name: "LATAM", domain: "latam.com", bookingPathPt: "/pt_br/" },
  AD: { code: "AD", name: "Azul", domain: "voeazul.com.br" },
  G3: { code: "G3", name: "GOL", domain: "voegol.com.br" },
  AR: { code: "AR", name: "Aerolineas Argentinas", domain: "aerolineas.com.ar" },
  AC: { code: "AC", name: "Air Canada", domain: "aircanada.com" },
  AF: { code: "AF", name: "Air France", domain: "airfrance.com.br" },
  AA: { code: "AA", name: "American Airlines", domain: "aa.com" },
  UA: { code: "UA", name: "United", domain: "united.com" },
  DL: { code: "DL", name: "Delta", domain: "delta.com" },
  IB: { code: "IB", name: "Iberia", domain: "iberia.com", bookingPathPt: "/br/" },
  TP: { code: "TP", name: "TAP Portugal", domain: "flytap.com", bookingPathPt: "/pt-br/" },
  LH: { code: "LH", name: "Lufthansa", domain: "lufthansa.com" },
  AZ: { code: "AZ", name: "ITA Airways", domain: "itaspa.com" },
  KL: { code: "KL", name: "KLM", domain: "klm.com.br" },
  BA: { code: "BA", name: "British Airways", domain: "britishairways.com" },
  EK: { code: "EK", name: "Emirates", domain: "emirates.com" },
  QR: { code: "QR", name: "Qatar Airways", domain: "qatarairways.com" },
  TK: { code: "TK", name: "Turkish", domain: "turkishairlines.com" },
  EY: { code: "EY", name: "Etihad", domain: "etihad.com" },
  AM: { code: "AM", name: "Aeroméxico", domain: "aeromexico.com" },
  CM: { code: "CM", name: "Copa", domain: "copaair.com" },
  AV: { code: "AV", name: "Avianca", domain: "avianca.com" },
  JJ: { code: "JJ", name: "LATAM Brasil", domain: "latam.com", bookingPathPt: "/pt_br/" },
  NK: { code: "NK", name: "Spirit", domain: "spirit.com" },
  B6: { code: "B6", name: "JetBlue", domain: "jetblue.com" },
};

/**
 * Resolve URL oficial da cia a partir de nome ou código IATA.
 */
export function resolveAirlineWebsite(
  nameOrCode: string | undefined | null,
): string | null {
  if (!nameOrCode) return null;
  const upper = String(nameOrCode).toUpperCase().trim();
  if (AIRLINE_REGISTRY[upper]) {
    const e = AIRLINE_REGISTRY[upper];
    return `https://www.${e.domain}${e.bookingPathPt || ""}`;
  }
  const lower = String(nameOrCode).toLowerCase().trim();
  for (const e of Object.values(AIRLINE_REGISTRY)) {
    const en = e.name.toLowerCase();
    if (en === lower || en.includes(lower) || lower.includes(en)) {
      return `https://www.${e.domain}${e.bookingPathPt || ""}`;
    }
  }
  return null;
}
