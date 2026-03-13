// Maps IATA airport codes to ISO 3166-1 alpha-2 country codes
const IATA_TO_COUNTRY: Record<string, string> = {
  // Brazil
  GRU: "BR", CGH: "BR", GIG: "BR", SDU: "BR", BSB: "BR", CNF: "BR", SSA: "BR",
  REC: "BR", FOR: "BR", POA: "BR", CWB: "BR", BEL: "BR", MAO: "BR", VCP: "BR",
  FLN: "BR", NAT: "BR", MCZ: "BR", AJU: "BR", SLZ: "BR", THE: "BR", CGB: "BR",
  CGR: "BR", GYN: "BR", PMW: "BR", PVH: "BR", BPS: "BR", IOS: "BR", NVT: "BR",
  VIX: "BR", JPA: "BR", IGU: "BR", LDB: "BR", MGF: "BR", UDI: "BR", RAO: "BR",
  SJP: "BR", PPB: "BR",
  // USA
  MIA: "US", MCO: "US", JFK: "US", EWR: "US", LAX: "US", SFO: "US", BOS: "US",
  ATL: "US", ORD: "US", DFW: "US", IAH: "US", SEA: "US", LAS: "US", PHX: "US",
  DEN: "US", IAD: "US", DCA: "US",
  // Canada
  YYZ: "CA", YVR: "CA", YUL: "CA",
  // Portugal
  LIS: "PT", OPO: "PT",
  // France
  CDG: "FR", ORY: "FR", NCE: "FR", TLS: "FR", LYS: "FR", MRS: "FR",
  // Italy
  FCO: "IT", CIA: "IT", MXP: "IT", LIN: "IT", NAP: "IT", VCE: "IT", PSA: "IT",
  FLR: "IT", BLQ: "IT", CTA: "IT", PMO: "IT", BGY: "IT", TRN: "IT",
  // Spain
  BCN: "ES", MAD: "ES", PMI: "ES", AGP: "ES", SVQ: "ES", VLC: "ES", BIO: "ES",
  // UK
  LHR: "GB", LGW: "GB", STN: "GB", EDI: "GB",
  // Netherlands
  AMS: "NL",
  // Germany
  FRA: "DE", MUC: "DE", BER: "DE", HAM: "DE", DUS: "DE", CGN: "DE", STR: "DE",
  NUE: "DE", HAJ: "DE",
  // Switzerland
  ZRH: "CH", GVA: "CH",
  // Austria
  VIE: "AT", SZG: "AT", INN: "AT",
  // Czech Republic
  PRG: "CZ",
  // Ireland
  DUB: "IE",
  // Denmark
  CPH: "DK",
  // Norway
  OSL: "NO",
  // Sweden
  ARN: "SE", GOT: "SE",
  // Finland
  HEL: "FI",
  // Poland
  WAW: "PL", GDN: "PL", KRK: "PL",
  // Hungary
  BUD: "HU",
  // Greece
  ATH: "GR", SKG: "GR", HER: "GR", CFU: "GR", JTR: "GR",
  // Turkey
  IST: "TR", SAW: "TR",
  // Belgium
  BRU: "BE",
  // Luxembourg
  LUX: "LU",
  // Romania
  OTP: "RO",
  // Bulgaria
  SOF: "BG",
  // Serbia
  BEG: "RS",
  // Croatia
  ZAG: "HR", SPU: "HR", DBV: "HR",
  // Slovenia
  LJU: "SI",
  // Malta
  MLA: "MT",
  // Iceland
  RKV: "IS", KEF: "IS",
  // Estonia
  TLL: "EE",
  // Latvia
  RIX: "LV",
  // Lithuania
  VNO: "LT",
  // Moldova
  KIV: "MD",
  // Albania
  TIA: "AL",
  // UAE
  DXB: "AE", AUH: "AE",
  // Qatar
  DOH: "QA",
  // Saudi Arabia
  JED: "SA", RUH: "SA",
  // Jordan
  AMM: "JO",
  // Israel
  TLV: "IL",
  // Egypt
  CAI: "EG",
  // Bahrain
  BAH: "BH",
  // Kuwait
  KWI: "KW",
  // Oman
  MCT: "OM",
  // Japan
  NRT: "JP", HND: "JP",
  // South Korea
  ICN: "KR",
  // China
  PEK: "CN", PVG: "CN",
  // Hong Kong
  HKG: "HK",
  // Singapore
  SIN: "SG",
  // Thailand
  BKK: "TH",
  // Malaysia
  KUL: "MY",
  // India
  DEL: "IN", BOM: "IN",
  // Taiwan
  TPE: "TW",
  // Philippines
  MNL: "PH",
  // Indonesia
  CGK: "ID", DPS: "ID",
  // Mexico
  CUN: "MX", MEX: "MX",
  // Dominican Republic
  PUJ: "DO",
  // St. Maarten
  SXM: "SX",
  // Aruba
  AUA: "AW",
  // Curaçao
  CUR: "CW",
  // Bahamas
  NAS: "BS",
  // Jamaica
  MBJ: "JM",
  // Cuba
  HAV: "CU",
  // Puerto Rico
  SJU: "PR",
  // Barbados
  BGI: "BB",
  // St. Lucia
  UVF: "LC",
  // Chile
  SCL: "CL",
  // Argentina
  EZE: "AR",
  // Peru
  LIM: "PE",
  // Colombia
  BOG: "CO", MDE: "CO",
  // Uruguay
  MVD: "UY",
  // Ecuador
  UIO: "EC", GYE: "EC",
  // Venezuela
  CCS: "VE",
  // Paraguay
  ASU: "PY",
  // Panama
  PTY: "PA",
  // South Africa
  JNB: "ZA", CPT: "ZA",
  // Kenya
  NBO: "KE",
  // Morocco
  CMN: "MA",
  // Nigeria
  LOS: "NG",
  // Ethiopia
  ADD: "ET",
  // Tanzania
  DAR: "TZ",
  // Mozambique
  MPM: "MZ",
};

// Country names in Portuguese
const COUNTRY_NAMES: Record<string, string> = {
  BR: "Brasil", US: "Estados Unidos", CA: "Canadá", PT: "Portugal", FR: "França",
  IT: "Itália", ES: "Espanha", GB: "Reino Unido", NL: "Holanda", DE: "Alemanha",
  CH: "Suíça", AT: "Áustria", CZ: "Rep. Tcheca", IE: "Irlanda", DK: "Dinamarca",
  NO: "Noruega", SE: "Suécia", FI: "Finlândia", PL: "Polônia", HU: "Hungria",
  GR: "Grécia", TR: "Turquia", BE: "Bélgica", LU: "Luxemburgo", RO: "Romênia",
  BG: "Bulgária", RS: "Sérvia", HR: "Croácia", SI: "Eslovênia", MT: "Malta",
  IS: "Islândia", EE: "Estônia", LV: "Letônia", LT: "Lituânia", MD: "Moldávia",
  AL: "Albânia", AE: "Emirados Árabes", QA: "Catar", SA: "Arábia Saudita",
  JO: "Jordânia", IL: "Israel", EG: "Egito", BH: "Bahrein", KW: "Kuwait",
  OM: "Omã", JP: "Japão", KR: "Coreia do Sul", CN: "China", HK: "Hong Kong",
  SG: "Singapura", TH: "Tailândia", MY: "Malásia", IN: "Índia", TW: "Taiwan",
  PH: "Filipinas", ID: "Indonésia", MX: "México", DO: "Rep. Dominicana",
  SX: "St. Maarten", AW: "Aruba", CW: "Curaçao", BS: "Bahamas", JM: "Jamaica",
  CU: "Cuba", PR: "Porto Rico", BB: "Barbados", LC: "Santa Lúcia", CL: "Chile",
  AR: "Argentina", PE: "Peru", CO: "Colômbia", UY: "Uruguai", EC: "Equador",
  VE: "Venezuela", PY: "Paraguai", PA: "Panamá", ZA: "África do Sul", KE: "Quênia",
  MA: "Marrocos", NG: "Nigéria", ET: "Etiópia", TZ: "Tanzânia", MZ: "Moçambique",
};

/**
 * Convert ISO country code to flag emoji
 */
export function countryCodeToFlag(code: string): string {
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

/**
 * Get country code from IATA airport code
 */
export function iataToCountryCode(iata: string): string | null {
  return IATA_TO_COUNTRY[iata.toUpperCase()] || null;
}

/**
 * Get country name in Portuguese
 */
export function countryName(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] || code;
}

/**
 * Extract unique visited countries (excluding home country) from sales destination IATAs
 */
export function getVisitedCountries(
  destinationIatas: (string | null)[],
  homeCountryCode = "BR"
): { code: string; flag: string; name: string }[] {
  const countries = new Set<string>();
  destinationIatas.forEach((iata) => {
    if (!iata) return;
    const cc = iataToCountryCode(iata);
    if (cc && cc !== homeCountryCode) countries.add(cc);
  });
  return Array.from(countries)
    .sort((a, b) => countryName(a).localeCompare(countryName(b)))
    .map((code) => ({
      code,
      flag: countryCodeToFlag(code),
      name: countryName(code),
    }));
}
