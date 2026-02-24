// IATA code to city name mapping for display purposes
const IATA_CITY_MAP: Record<string, string> = {
  // Brazil
  GRU: "São Paulo", CGH: "São Paulo (Congonhas)", GIG: "Rio de Janeiro", SDU: "Rio (Santos Dumont)",
  BSB: "Brasília", CNF: "Belo Horizonte", SSA: "Salvador", REC: "Recife", FOR: "Fortaleza",
  POA: "Porto Alegre", CWB: "Curitiba", BEL: "Belém", MAO: "Manaus", VCP: "Campinas",
  FLN: "Florianópolis", NAT: "Natal", MCZ: "Maceió", AJU: "Aracaju", SLZ: "São Luís",
  THE: "Teresina", CGB: "Cuiabá", CGR: "Campo Grande", GYN: "Goiânia", PMW: "Palmas",
  PVH: "Porto Velho", BPS: "Porto Seguro", IOS: "Ilhéus", NVT: "Navegantes", VIX: "Vitória",
  JPA: "João Pessoa", IGU: "Foz do Iguaçu", LDB: "Londrina", MGF: "Maringá", UDI: "Uberlândia",
  RAO: "Ribeirão Preto", SJP: "São José do Rio Preto", PPB: "Presidente Prudente",
  // USA
  MIA: "Miami", MCO: "Orlando", JFK: "Nova York (JFK)", EWR: "Nova York (Newark)",
  LAX: "Los Angeles", SFO: "São Francisco", BOS: "Boston", ATL: "Atlanta", ORD: "Chicago",
  DFW: "Dallas", IAH: "Houston", SEA: "Seattle", LAS: "Las Vegas", PHX: "Phoenix",
  DEN: "Denver", IAD: "Washington", DCA: "Washington (Reagan)",
  // Canada
  YYZ: "Toronto", YVR: "Vancouver", YUL: "Montreal",
  // Europe
  LIS: "Lisboa", CDG: "Paris", FCO: "Roma", BCN: "Barcelona", MAD: "Madri",
  LHR: "Londres", AMS: "Amsterdã", FRA: "Frankfurt", MUC: "Munique", ZRH: "Zurique",
  VIE: "Viena", PRG: "Praga", DUB: "Dublin", CPH: "Copenhague", OSL: "Oslo",
  ARN: "Estocolmo", HEL: "Helsinque", WAW: "Varsóvia", BUD: "Budapeste", ATH: "Atenas",
  IST: "Istambul", MXP: "Milão", NAP: "Nápoles", VCE: "Veneza", GVA: "Genebra",
  BRU: "Bruxelas", LUX: "Luxemburgo", EDI: "Edimburgo", OPO: "Porto (Portugal)",
  // Middle East
  DXB: "Dubai", DOH: "Doha", AUH: "Abu Dhabi", JED: "Jeddah", RUH: "Riad",
  AMM: "Amã", TLV: "Tel Aviv", CAI: "Cairo", BAH: "Bahrein", KWI: "Kuwait",
  MCT: "Mascate",
  // Asia
  NRT: "Tóquio (Narita)", HND: "Tóquio (Haneda)", ICN: "Seul", PEK: "Pequim",
  PVG: "Xangai", HKG: "Hong Kong", SIN: "Singapura", BKK: "Bangkok", KUL: "Kuala Lumpur",
  DEL: "Nova Delhi", BOM: "Mumbai", TPE: "Taipei", MNL: "Manila",
  CGK: "Jacarta", DPS: "Bali",
  // Caribbean
  CUN: "Cancún", PUJ: "Punta Cana", SXM: "St. Maarten", AUA: "Aruba", CUR: "Curaçao",
  NAS: "Nassau", MBJ: "Montego Bay", HAV: "Havana", SJU: "San Juan", BGI: "Barbados",
  UVF: "St. Lucia",
  // South America
  SCL: "Santiago", EZE: "Buenos Aires", LIM: "Lima", BOG: "Bogotá", MVD: "Montevidéu",
  UIO: "Quito", CCS: "Caracas", ASU: "Assunção", GYE: "Guayaquil", MDE: "Medellín",
  MEX: "Cidade do México", PTY: "Panamá",
  // Africa
  JNB: "Joanesburgo", CPT: "Cidade do Cabo", NBO: "Nairóbi", CMN: "Casablanca",
  LOS: "Lagos", ADD: "Adis Abeba", DAR: "Dar es Salaam", MPM: "Maputo",
};

/**
 * Returns city name for an IATA code, or the code itself if not found.
 */
export function iataToCityName(iata: string | null | undefined): string {
  if (!iata) return "Desconhecido";
  return IATA_CITY_MAP[iata.toUpperCase()] || iata;
}

/**
 * Returns "City (CODE)" format for display
 */
export function iataToLabel(iata: string | null | undefined): string {
  if (!iata) return "Desconhecido";
  const city = IATA_CITY_MAP[iata.toUpperCase()];
  return city ? `${city} (${iata})` : iata;
}

/**
 * Normalizes product names to consolidate duplicates.
 * "Aéreo" → "Passagem Aérea"
 * "Hotel" → "Hospedagem"
 */
const PRODUCT_NORMALIZE: Record<string, string> = {
  "Aéreo": "Passagem Aérea",
  "Hotel": "Hospedagem",
  "Passagem Aérea e Hospedagem": "Pacote Aéreo + Hotel",
};

export function normalizeProduct(product: string): string {
  return PRODUCT_NORMALIZE[product] || product;
}

/**
 * Normalizes and deduplicates a products array
 */
export function normalizeProducts(products: string[]): string[] {
  const set = new Set<string>();
  products.forEach(p => set.add(normalizeProduct(p)));
  return Array.from(set);
}

/**
 * Known miles portal/program names for identification
 */
export const MILES_PORTALS = [
  "LATAM Pass", "Smiles", "TudoAzul", "Azul", "Interline",
  "Qatar", "Iberia", "Copa", "American Airlines", "Delta SkyMiles",
  "United MileagePlus", "Emirates Skywards", "Decolar",
  "Livelo", "Esfera", "C6 Bank", "Submarino Viagens",
] as const;

export function identifyMilesPortal(sale: {
  miles_program?: string | null;
  emission_source?: string | null;
  airline?: string | null;
}): string | null {
  if (sale.miles_program) return sale.miles_program;
  // Try emission_source
  if (sale.emission_source) {
    const src = sale.emission_source.toLowerCase();
    if (src.includes("latam")) return "LATAM Pass";
    if (src.includes("smiles") || src.includes("gol")) return "Smiles";
    if (src.includes("azul") || src.includes("tudoazul")) return "TudoAzul";
    if (src.includes("decolar")) return "Decolar";
  }
  return null;
}
