/**
 * Mapeia códigos IATA para nome legível "Cidade (IATA) no País".
 * Cobertura focada nos principais aeroportos atendidos pela NatLeva.
 */

export interface AirportInfo {
  city: string;
  country: string;
}

export const AIRPORT_CITIES: Record<string, AirportInfo> = {
  // ===== BRASIL =====
  GRU: { city: "São Paulo", country: "Brasil" },
  CGH: { city: "São Paulo", country: "Brasil" },
  VCP: { city: "Campinas", country: "Brasil" },
  GIG: { city: "Rio de Janeiro", country: "Brasil" },
  SDU: { city: "Rio de Janeiro", country: "Brasil" },
  CNF: { city: "Belo Horizonte", country: "Brasil" },
  PLU: { city: "Belo Horizonte", country: "Brasil" },
  BSB: { city: "Brasília", country: "Brasil" },
  CWB: { city: "Curitiba", country: "Brasil" },
  POA: { city: "Porto Alegre", country: "Brasil" },
  FLN: { city: "Florianópolis", country: "Brasil" },
  NAT: { city: "Natal", country: "Brasil" },
  REC: { city: "Recife", country: "Brasil" },
  SSA: { city: "Salvador", country: "Brasil" },
  FOR: { city: "Fortaleza", country: "Brasil" },
  BEL: { city: "Belém", country: "Brasil" },
  MAO: { city: "Manaus", country: "Brasil" },
  CGB: { city: "Cuiabá", country: "Brasil" },
  CGR: { city: "Campo Grande", country: "Brasil" },
  GYN: { city: "Goiânia", country: "Brasil" },
  VIX: { city: "Vitória", country: "Brasil" },
  IGU: { city: "Foz do Iguaçu", country: "Brasil" },
  MCZ: { city: "Maceió", country: "Brasil" },
  AJU: { city: "Aracaju", country: "Brasil" },
  THE: { city: "Teresina", country: "Brasil" },
  SLZ: { city: "São Luís", country: "Brasil" },
  JPA: { city: "João Pessoa", country: "Brasil" },
  BPS: { city: "Porto Seguro", country: "Brasil" },
  IOS: { city: "Ilhéus", country: "Brasil" },
  NVT: { city: "Navegantes", country: "Brasil" },
  JOI: { city: "Joinville", country: "Brasil" },

  // ===== AMÉRICA DO SUL =====
  EZE: { city: "Buenos Aires", country: "Argentina" },
  AEP: { city: "Buenos Aires", country: "Argentina" },
  COR: { city: "Córdoba", country: "Argentina" },
  MDZ: { city: "Mendoza", country: "Argentina" },
  BRC: { city: "Bariloche", country: "Argentina" },
  USH: { city: "Ushuaia", country: "Argentina" },
  IGR: { city: "Puerto Iguazú", country: "Argentina" },
  SCL: { city: "Santiago", country: "Chile" },
  CCP: { city: "Concepción", country: "Chile" },
  IPC: { city: "Ilha de Páscoa", country: "Chile" },
  LIM: { city: "Lima", country: "Peru" },
  CUZ: { city: "Cusco", country: "Peru" },
  AQP: { city: "Arequipa", country: "Peru" },
  BOG: { city: "Bogotá", country: "Colômbia" },
  CTG: { city: "Cartagena", country: "Colômbia" },
  MDE: { city: "Medellín", country: "Colômbia" },
  CLO: { city: "Cali", country: "Colômbia" },
  UIO: { city: "Quito", country: "Equador" },
  GYE: { city: "Guayaquil", country: "Equador" },
  CCS: { city: "Caracas", country: "Venezuela" },
  MVD: { city: "Montevidéu", country: "Uruguai" },
  ASU: { city: "Assunção", country: "Paraguai" },
  LPB: { city: "La Paz", country: "Bolívia" },
  VVI: { city: "Santa Cruz de la Sierra", country: "Bolívia" },

  // ===== AMÉRICA DO NORTE =====
  JFK: { city: "Nova York", country: "Estados Unidos" },
  LGA: { city: "Nova York", country: "Estados Unidos" },
  EWR: { city: "Newark", country: "Estados Unidos" },
  BOS: { city: "Boston", country: "Estados Unidos" },
  IAD: { city: "Washington D.C.", country: "Estados Unidos" },
  DCA: { city: "Washington D.C.", country: "Estados Unidos" },
  ATL: { city: "Atlanta", country: "Estados Unidos" },
  MIA: { city: "Miami", country: "Estados Unidos" },
  FLL: { city: "Fort Lauderdale", country: "Estados Unidos" },
  MCO: { city: "Orlando", country: "Estados Unidos" },
  TPA: { city: "Tampa", country: "Estados Unidos" },
  ORD: { city: "Chicago", country: "Estados Unidos" },
  MDW: { city: "Chicago", country: "Estados Unidos" },
  DFW: { city: "Dallas", country: "Estados Unidos" },
  IAH: { city: "Houston", country: "Estados Unidos" },
  DEN: { city: "Denver", country: "Estados Unidos" },
  PHX: { city: "Phoenix", country: "Estados Unidos" },
  LAS: { city: "Las Vegas", country: "Estados Unidos" },
  LAX: { city: "Los Angeles", country: "Estados Unidos" },
  SFO: { city: "São Francisco", country: "Estados Unidos" },
  SAN: { city: "San Diego", country: "Estados Unidos" },
  SEA: { city: "Seattle", country: "Estados Unidos" },
  HNL: { city: "Honolulu", country: "Estados Unidos" },
  YYZ: { city: "Toronto", country: "Canadá" },
  YUL: { city: "Montreal", country: "Canadá" },
  YVR: { city: "Vancouver", country: "Canadá" },
  YYC: { city: "Calgary", country: "Canadá" },
  MEX: { city: "Cidade do México", country: "México" },
  CUN: { city: "Cancún", country: "México" },
  GDL: { city: "Guadalajara", country: "México" },
  PVR: { city: "Puerto Vallarta", country: "México" },
  HAV: { city: "Havana", country: "Cuba" },
  PUJ: { city: "Punta Cana", country: "República Dominicana" },
  SDQ: { city: "Santo Domingo", country: "República Dominicana" },
  NAS: { city: "Nassau", country: "Bahamas" },
  MBJ: { city: "Montego Bay", country: "Jamaica" },
  AUA: { city: "Aruba", country: "Aruba" },
  CUR: { city: "Curaçao", country: "Curaçao" },

  // ===== EUROPA =====
  LHR: { city: "Londres", country: "Reino Unido" },
  LGW: { city: "Londres", country: "Reino Unido" },
  STN: { city: "Londres", country: "Reino Unido" },
  LCY: { city: "Londres", country: "Reino Unido" },
  MAN: { city: "Manchester", country: "Reino Unido" },
  EDI: { city: "Edimburgo", country: "Reino Unido" },
  DUB: { city: "Dublin", country: "Irlanda" },
  CDG: { city: "Paris", country: "França" },
  ORY: { city: "Paris", country: "França" },
  NCE: { city: "Nice", country: "França" },
  LYS: { city: "Lyon", country: "França" },
  MRS: { city: "Marselha", country: "França" },
  AMS: { city: "Amsterdã", country: "Holanda" },
  BRU: { city: "Bruxelas", country: "Bélgica" },
  FRA: { city: "Frankfurt", country: "Alemanha" },
  MUC: { city: "Munique", country: "Alemanha" },
  BER: { city: "Berlim", country: "Alemanha" },
  HAM: { city: "Hamburgo", country: "Alemanha" },
  DUS: { city: "Düsseldorf", country: "Alemanha" },
  ZRH: { city: "Zurique", country: "Suíça" },
  GVA: { city: "Genebra", country: "Suíça" },
  VIE: { city: "Viena", country: "Áustria" },
  MAD: { city: "Madri", country: "Espanha" },
  BCN: { city: "Barcelona", country: "Espanha" },
  AGP: { city: "Málaga", country: "Espanha" },
  PMI: { city: "Palma de Mallorca", country: "Espanha" },
  IBZ: { city: "Ibiza", country: "Espanha" },
  LIS: { city: "Lisboa", country: "Portugal" },
  OPO: { city: "Porto", country: "Portugal" },
  FAO: { city: "Faro", country: "Portugal" },
  FNC: { city: "Funchal", country: "Portugal" },
  FCO: { city: "Roma", country: "Itália" },
  CIA: { city: "Roma", country: "Itália" },
  MXP: { city: "Milão", country: "Itália" },
  LIN: { city: "Milão", country: "Itália" },
  BGY: { city: "Milão", country: "Itália" },
  VCE: { city: "Veneza", country: "Itália" },
  NAP: { city: "Nápoles", country: "Itália" },
  FLR: { city: "Florença", country: "Itália" },
  CTA: { city: "Catânia", country: "Itália" },
  ATH: { city: "Atenas", country: "Grécia" },
  JTR: { city: "Santorini", country: "Grécia" },
  JMK: { city: "Mykonos", country: "Grécia" },
  CPH: { city: "Copenhague", country: "Dinamarca" },
  ARN: { city: "Estocolmo", country: "Suécia" },
  OSL: { city: "Oslo", country: "Noruega" },
  HEL: { city: "Helsinque", country: "Finlândia" },
  KEF: { city: "Reykjavík", country: "Islândia" },
  WAW: { city: "Varsóvia", country: "Polônia" },
  KRK: { city: "Cracóvia", country: "Polônia" },
  PRG: { city: "Praga", country: "República Tcheca" },
  BUD: { city: "Budapeste", country: "Hungria" },
  IST: { city: "Istambul", country: "Turquia" },
  SAW: { city: "Istambul", country: "Turquia" },
  SVO: { city: "Moscou", country: "Rússia" },
  DME: { city: "Moscou", country: "Rússia" },

  // ===== ÁSIA =====
  DXB: { city: "Dubai", country: "Emirados Árabes Unidos" },
  AUH: { city: "Abu Dhabi", country: "Emirados Árabes Unidos" },
  DOH: { city: "Doha", country: "Catar" },
  RUH: { city: "Riade", country: "Arábia Saudita" },
  TLV: { city: "Tel Aviv", country: "Israel" },
  CAI: { city: "Cairo", country: "Egito" },
  BOM: { city: "Mumbai", country: "Índia" },
  DEL: { city: "Nova Delhi", country: "Índia" },
  MLE: { city: "Malé", country: "Maldivas" },
  BKK: { city: "Bangkok", country: "Tailândia" },
  HKT: { city: "Phuket", country: "Tailândia" },
  SIN: { city: "Singapura", country: "Singapura" },
  KUL: { city: "Kuala Lumpur", country: "Malásia" },
  CGK: { city: "Jakarta", country: "Indonésia" },
  DPS: { city: "Bali", country: "Indonésia" },
  HKG: { city: "Hong Kong", country: "China" },
  PVG: { city: "Xangai", country: "China" },
  PEK: { city: "Pequim", country: "China" },
  ICN: { city: "Seul", country: "Coreia do Sul" },
  NRT: { city: "Tóquio", country: "Japão" },
  HND: { city: "Tóquio", country: "Japão" },
  KIX: { city: "Osaka", country: "Japão" },

  // ===== OCEANIA =====
  SYD: { city: "Sydney", country: "Austrália" },
  MEL: { city: "Melbourne", country: "Austrália" },
  BNE: { city: "Brisbane", country: "Austrália" },
  PER: { city: "Perth", country: "Austrália" },
  AKL: { city: "Auckland", country: "Nova Zelândia" },
  NAN: { city: "Nadi", country: "Fiji" },
  PPT: { city: "Papeete", country: "Polinésia Francesa" },

  // ===== ÁFRICA =====
  JNB: { city: "Joanesburgo", country: "África do Sul" },
  CPT: { city: "Cidade do Cabo", country: "África do Sul" },
  NBO: { city: "Nairóbi", country: "Quênia" },
  ZNZ: { city: "Zanzibar", country: "Tanzânia" },
  CMN: { city: "Casablanca", country: "Marrocos" },
  RAK: { city: "Marraquexe", country: "Marrocos" },
  MRU: { city: "Maurício", country: "Maurício" },
  SEZ: { city: "Mahé", country: "Seychelles" },
};

export function getAirportInfo(iata: string | null | undefined): AirportInfo | null {
  if (!iata) return null;
  return AIRPORT_CITIES[iata.toUpperCase().trim()] || null;
}

/**
 * Formata um IATA como "Cidade no País (IATA)" ou fallback para apenas o IATA.
 * Usa preposição correta: "no/na/nos/nas" baseado no gênero/número do país.
 */
export function formatAirportName(iata: string | null | undefined): string {
  if (!iata) return "";
  const info = getAirportInfo(iata);
  if (!info) return iata.toUpperCase();
  const prep = countryPreposition(info.country);
  return `${info.city} ${prep} ${info.country} (${iata.toUpperCase()})`;
}

/**
 * Retorna a preposição correta em português para o país.
 */
export function countryPreposition(country: string): string {
  const c = country.toLowerCase();
  // Países com artigo masculino "o"
  const masculino = ["brasil", "chile", "peru", "equador", "uruguai", "paraguai", "japão", "egito", "catar", "líbano", "irã", "iraque", "marrocos", "méxico", "canadá", "panamá", "vietnã"];
  // Países com artigo feminino "a"
  const feminino = ["argentina", "colômbia", "venezuela", "bolívia", "frança", "alemanha", "itália", "espanha", "grécia", "rússia", "china", "índia", "tailândia", "indonésia", "malásia", "austrália", "áfrica do sul", "arábia saudita", "coreia do sul", "polônia", "hungria", "turquia", "suíça", "áustria", "bélgica", "holanda", "dinamarca", "suécia", "noruega", "finlândia", "islândia", "irlanda", "jamaica", "república dominicana", "república tcheca", "polinésia francesa"];
  // Países plural "os"
  const masculinoPlural = ["estados unidos", "emirados árabes unidos"];
  // Plural "as"
  const femininoPlural = ["bahamas", "maldivas", "seychelles"];
  // Sem artigo (usar "em")
  const semArtigo = ["portugal", "cuba", "israel", "singapura", "hong kong", "aruba", "curaçao", "fiji", "nova zelândia", "maurício"];

  if (masculino.includes(c)) return "no";
  if (feminino.includes(c)) return "na";
  if (masculinoPlural.includes(c)) return "nos";
  if (femininoPlural.includes(c)) return "nas";
  if (semArtigo.includes(c)) return "em";
  // Fallback
  return "em";
}

/**
 * Constrói título descritivo de voo no padrão NatLeva:
 * "Voo de ida e volta, saindo do Rio de Janeiro (GIG) para Santiago no Chile (SCL)"
 */
export function buildFlightTitle(
  originIata: string,
  destIata: string,
  itineraryType: "ROUND_TRIP" | "ONE_WAY" | "OPEN_JAW" | "MULTI_CITY" | string,
): string {
  const originInfo = getAirportInfo(originIata);
  const destInfo = getAirportInfo(destIata);

  const originLabel = originInfo
    ? `${originInfo.city} (${originIata.toUpperCase()})`
    : originIata.toUpperCase();
  const destLabel = destInfo
    ? `${destInfo.city} ${countryPreposition(destInfo.country)} ${destInfo.country} (${destIata.toUpperCase()})`
    : destIata.toUpperCase();

  // Preposição "do/da" para origem
  const originPrep = originInfo
    ? originPreposition(originInfo.country)
    : "de";

  let prefix: string;
  switch (itineraryType) {
    case "ROUND_TRIP":
      prefix = "Voo de ida e volta";
      break;
    case "ONE_WAY":
      prefix = "Voo só de ida";
      break;
    case "OPEN_JAW":
      prefix = "Voo multi-destino (open-jaw)";
      break;
    case "MULTI_CITY":
      prefix = "Voo multi-trecho";
      break;
    default:
      prefix = "Voo";
  }

  return `${prefix}, saindo ${originPrep} ${originLabel} para ${destLabel}`;
}

/**
 * Preposição usada com "saindo {prep}" — muda baseado no artigo do país de origem.
 * Ex: "saindo do Brasil", "saindo da França", "saindo dos Estados Unidos", "saindo de Portugal".
 */
function originPreposition(country: string): string {
  const prep = countryPreposition(country);
  switch (prep) {
    case "no": return "do";
    case "na": return "da";
    case "nos": return "dos";
    case "nas": return "das";
    default: return "de";
  }
}

/**
 * Constrói título descritivo de hotel no padrão NatLeva:
 * "Hospedagem em Santiago no Chile · Hotel El Rosedal · 3★ · Café da manhã"
 */
export function buildHotelTitle(opts: {
  hotelName?: string;
  city?: string;
  country?: string;
  stars?: string | number;
  mealPlan?: string;
  iata?: string;
}): string {
  const { hotelName, city: cityRaw, country: countryRaw, stars, mealPlan, iata } = opts;

  // Tenta inferir cidade/país pelo IATA se ausente
  let city = cityRaw?.trim() || "";
  let country = countryRaw?.trim() || "";
  if ((!city || !country) && iata) {
    const info = getAirportInfo(iata);
    if (info) {
      if (!city) city = info.city;
      if (!country) country = info.country;
    }
  }

  const parts: string[] = [];
  if (city) {
    const prep = country ? countryPreposition(country) : "em";
    const local = country ? `${city} ${prep} ${country}` : city;
    parts.push(`Hospedagem em ${local}`);
  } else {
    parts.push("Hospedagem");
  }

  if (hotelName) parts.push(hotelName);
  if (stars) parts.push(`${stars}★`);
  if (mealPlan) parts.push(mealPlan);

  return parts.join(" · ");
}
