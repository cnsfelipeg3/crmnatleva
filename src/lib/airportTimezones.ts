/**
 * Mapping IATA → IANA timezone para os principais aeroportos do mundo.
 * Usado para cálculos precisos de duração de voo e tempo de conexão (layover),
 * respeitando diferenças de fuso horário entre origem e destino.
 *
 * Padrão IANA (ex: "America/Sao_Paulo") é interpretado nativamente pelo Intl API
 * do JavaScript, lidando automaticamente com horário de verão.
 */

export const AIRPORT_TZ: Record<string, string> = {
  // ============ BRASIL ============
  GRU: "America/Sao_Paulo", CGH: "America/Sao_Paulo", VCP: "America/Sao_Paulo",
  GIG: "America/Sao_Paulo", SDU: "America/Sao_Paulo",
  CNF: "America/Sao_Paulo", PLU: "America/Sao_Paulo",
  BSB: "America/Sao_Paulo", CWB: "America/Sao_Paulo", POA: "America/Sao_Paulo",
  FLN: "America/Sao_Paulo", NAT: "America/Sao_Paulo", REC: "America/Recife",
  SSA: "America/Bahia", FOR: "America/Fortaleza", BEL: "America/Belem",
  MAO: "America/Manaus", CGB: "America/Cuiaba", CGR: "America/Campo_Grande",
  PMW: "America/Sao_Paulo", GYN: "America/Sao_Paulo", VIX: "America/Sao_Paulo",
  IGU: "America/Sao_Paulo", MCZ: "America/Maceio", AJU: "America/Maceio",
  THE: "America/Fortaleza", SLZ: "America/Fortaleza", JPA: "America/Fortaleza",
  PVH: "America/Porto_Velho", RBR: "America/Rio_Branco", BVB: "America/Boa_Vista",
  MCP: "America/Belem", PNZ: "America/Recife",
  IOS: "America/Bahia", LDB: "America/Sao_Paulo", JOI: "America/Sao_Paulo",
  NVT: "America/Sao_Paulo", XAP: "America/Sao_Paulo", UDI: "America/Sao_Paulo",
  RAO: "America/Sao_Paulo", BPS: "America/Bahia", PNB: "America/Belem",

  // ============ AMÉRICA DO SUL ============
  EZE: "America/Argentina/Buenos_Aires", AEP: "America/Argentina/Buenos_Aires",
  SCL: "America/Santiago", LIM: "America/Lima", BOG: "America/Bogota",
  UIO: "America/Guayaquil", GYE: "America/Guayaquil",
  CCS: "America/Caracas", MVD: "America/Montevideo",
  ASU: "America/Asuncion", LPB: "America/La_Paz", VVI: "America/La_Paz",
  CTG: "America/Bogota", MDE: "America/Bogota", CLO: "America/Bogota",
  MZQ: "America/Argentina/Buenos_Aires", COR: "America/Argentina/Buenos_Aires",
  USH: "America/Argentina/Ushuaia", IGR: "America/Argentina/Buenos_Aires",
  CUZ: "America/Lima", AQP: "America/Lima",
  CCP: "America/Santiago", IPC: "Pacific/Easter",

  // ============ AMÉRICA DO NORTE ============
  JFK: "America/New_York", LGA: "America/New_York", EWR: "America/New_York",
  BOS: "America/New_York", PHL: "America/New_York", IAD: "America/New_York",
  DCA: "America/New_York", BWI: "America/New_York", ATL: "America/New_York",
  MIA: "America/New_York", FLL: "America/New_York", MCO: "America/New_York",
  TPA: "America/New_York", CLT: "America/New_York", RDU: "America/New_York",
  DTW: "America/Detroit", CLE: "America/New_York", PIT: "America/New_York",
  ORD: "America/Chicago", MDW: "America/Chicago", MSP: "America/Chicago",
  STL: "America/Chicago", MCI: "America/Chicago", IAH: "America/Chicago",
  HOU: "America/Chicago", DAL: "America/Chicago", DFW: "America/Chicago",
  AUS: "America/Chicago", SAT: "America/Chicago", MEM: "America/Chicago",
  BNA: "America/Chicago", MSY: "America/Chicago",
  DEN: "America/Denver", SLC: "America/Denver", PHX: "America/Phoenix",
  ABQ: "America/Denver", LAS: "America/Los_Angeles",
  LAX: "America/Los_Angeles", SFO: "America/Los_Angeles",
  SAN: "America/Los_Angeles", SJC: "America/Los_Angeles", OAK: "America/Los_Angeles",
  SEA: "America/Los_Angeles", PDX: "America/Los_Angeles",
  ANC: "America/Anchorage", HNL: "Pacific/Honolulu", OGG: "Pacific/Honolulu",
  YYZ: "America/Toronto", YUL: "America/Toronto", YOW: "America/Toronto",
  YVR: "America/Vancouver", YYC: "America/Edmonton", YEG: "America/Edmonton",
  YHZ: "America/Halifax", YWG: "America/Winnipeg",
  MEX: "America/Mexico_City", CUN: "America/Cancun", GDL: "America/Mexico_City",
  MTY: "America/Monterrey", PVR: "America/Mexico_City", SJD: "America/Mazatlan",
  HAV: "America/Havana", SDQ: "America/Santo_Domingo", PUJ: "America/Santo_Domingo",
  SJU: "America/Puerto_Rico", NAS: "America/Nassau", MBJ: "America/Jamaica",
  KIN: "America/Jamaica", BGI: "America/Barbados", AUA: "America/Aruba",
  CUR: "America/Curacao", PTP: "America/Guadeloupe",

  // ============ EUROPA ============
  LHR: "Europe/London", LGW: "Europe/London", STN: "Europe/London",
  LTN: "Europe/London", LCY: "Europe/London", MAN: "Europe/London",
  EDI: "Europe/London", DUB: "Europe/Dublin",
  CDG: "Europe/Paris", ORY: "Europe/Paris", BVA: "Europe/Paris",
  NCE: "Europe/Paris", LYS: "Europe/Paris", MRS: "Europe/Paris",
  TLS: "Europe/Paris", BOD: "Europe/Paris",
  AMS: "Europe/Amsterdam", BRU: "Europe/Brussels", LUX: "Europe/Luxembourg",
  FRA: "Europe/Berlin", MUC: "Europe/Berlin", BER: "Europe/Berlin",
  HAM: "Europe/Berlin", DUS: "Europe/Berlin", CGN: "Europe/Berlin",
  STR: "Europe/Berlin", NUE: "Europe/Berlin", HAJ: "Europe/Berlin",
  ZRH: "Europe/Zurich", GVA: "Europe/Zurich", BSL: "Europe/Zurich",
  VIE: "Europe/Vienna", SZG: "Europe/Vienna", INN: "Europe/Vienna",
  MAD: "Europe/Madrid", BCN: "Europe/Madrid", AGP: "Europe/Madrid",
  PMI: "Europe/Madrid", VLC: "Europe/Madrid", SVQ: "Europe/Madrid",
  BIO: "Europe/Madrid", IBZ: "Europe/Madrid", LPA: "Atlantic/Canary",
  TFS: "Atlantic/Canary", TFN: "Atlantic/Canary", ACE: "Atlantic/Canary",
  LIS: "Europe/Lisbon", OPO: "Europe/Lisbon", FAO: "Europe/Lisbon",
  FNC: "Atlantic/Madeira", PDL: "Atlantic/Azores",
  FCO: "Europe/Rome", CIA: "Europe/Rome", MXP: "Europe/Rome",
  LIN: "Europe/Rome", BGY: "Europe/Rome", VCE: "Europe/Rome",
  NAP: "Europe/Rome", BLQ: "Europe/Rome", FLR: "Europe/Rome",
  PSA: "Europe/Rome", CTA: "Europe/Rome", PMO: "Europe/Rome",
  ATH: "Europe/Athens", SKG: "Europe/Athens", HER: "Europe/Athens",
  JTR: "Europe/Athens", JMK: "Europe/Athens",
  CPH: "Europe/Copenhagen", BLL: "Europe/Copenhagen",
  ARN: "Europe/Stockholm", BMA: "Europe/Stockholm", GOT: "Europe/Stockholm",
  OSL: "Europe/Oslo", BGO: "Europe/Oslo",
  HEL: "Europe/Helsinki",
  KEF: "Atlantic/Reykjavik",
  WAW: "Europe/Warsaw", KRK: "Europe/Warsaw", GDN: "Europe/Warsaw",
  PRG: "Europe/Prague", BUD: "Europe/Budapest", OTP: "Europe/Bucharest",
  SOF: "Europe/Sofia", BEG: "Europe/Belgrade", ZAG: "Europe/Zagreb",
  LJU: "Europe/Ljubljana", SKP: "Europe/Skopje", TIA: "Europe/Tirane",
  IST: "Europe/Istanbul", SAW: "Europe/Istanbul", AYT: "Europe/Istanbul",
  ESB: "Europe/Istanbul", ADB: "Europe/Istanbul",
  SVO: "Europe/Moscow", DME: "Europe/Moscow", VKO: "Europe/Moscow",
  LED: "Europe/Moscow", KBP: "Europe/Kiev", IEV: "Europe/Kiev",
  MLA: "Europe/Malta", LCA: "Asia/Nicosia",

  // ============ ÁSIA ============
  DXB: "Asia/Dubai", DWC: "Asia/Dubai", AUH: "Asia/Dubai",
  DOH: "Asia/Qatar", BAH: "Asia/Bahrain", KWI: "Asia/Kuwait",
  RUH: "Asia/Riyadh", JED: "Asia/Riyadh", MED: "Asia/Riyadh",
  MCT: "Asia/Muscat", AMM: "Asia/Amman", BEY: "Asia/Beirut",
  TLV: "Asia/Jerusalem", CAI: "Africa/Cairo",
  IKA: "Asia/Tehran", THR: "Asia/Tehran",
  BOM: "Asia/Kolkata", DEL: "Asia/Kolkata", BLR: "Asia/Kolkata",
  MAA: "Asia/Kolkata", CCU: "Asia/Kolkata", HYD: "Asia/Kolkata",
  COK: "Asia/Kolkata", GOI: "Asia/Kolkata",
  CMB: "Asia/Colombo", MLE: "Indian/Maldives", KTM: "Asia/Kathmandu",
  DAC: "Asia/Dhaka", KHI: "Asia/Karachi", LHE: "Asia/Karachi", ISB: "Asia/Karachi",
  BKK: "Asia/Bangkok", DMK: "Asia/Bangkok", HKT: "Asia/Bangkok",
  CNX: "Asia/Bangkok", USM: "Asia/Bangkok", KBV: "Asia/Bangkok",
  SIN: "Asia/Singapore", KUL: "Asia/Kuala_Lumpur", PEN: "Asia/Kuala_Lumpur",
  CGK: "Asia/Jakarta", DPS: "Asia/Makassar", SUB: "Asia/Jakarta",
  MNL: "Asia/Manila", CEB: "Asia/Manila",
  HAN: "Asia/Ho_Chi_Minh", SGN: "Asia/Ho_Chi_Minh", DAD: "Asia/Ho_Chi_Minh",
  PNH: "Asia/Phnom_Penh", REP: "Asia/Phnom_Penh", VTE: "Asia/Vientiane",
  RGN: "Asia/Yangon",
  HKG: "Asia/Hong_Kong", MFM: "Asia/Macau", TPE: "Asia/Taipei",
  KHH: "Asia/Taipei",
  PVG: "Asia/Shanghai", SHA: "Asia/Shanghai", PEK: "Asia/Shanghai",
  PKX: "Asia/Shanghai", CAN: "Asia/Shanghai", SZX: "Asia/Shanghai",
  CTU: "Asia/Shanghai", XIY: "Asia/Shanghai", CKG: "Asia/Shanghai",
  HGH: "Asia/Shanghai", WUH: "Asia/Shanghai", KMG: "Asia/Shanghai",
  ICN: "Asia/Seoul", GMP: "Asia/Seoul", PUS: "Asia/Seoul", CJU: "Asia/Seoul",
  NRT: "Asia/Tokyo", HND: "Asia/Tokyo", KIX: "Asia/Tokyo", ITM: "Asia/Tokyo",
  NGO: "Asia/Tokyo", FUK: "Asia/Tokyo", CTS: "Asia/Tokyo", OKA: "Asia/Tokyo",
  ULN: "Asia/Ulaanbaatar",
  TAS: "Asia/Tashkent", ALA: "Asia/Almaty",

  // ============ OCEANIA ============
  SYD: "Australia/Sydney", MEL: "Australia/Melbourne", BNE: "Australia/Brisbane",
  PER: "Australia/Perth", ADL: "Australia/Adelaide", CBR: "Australia/Sydney",
  OOL: "Australia/Brisbane", CNS: "Australia/Brisbane", DRW: "Australia/Darwin",
  HBA: "Australia/Hobart", AKL: "Pacific/Auckland", WLG: "Pacific/Auckland",
  CHC: "Pacific/Auckland", ZQN: "Pacific/Auckland",
  NAN: "Pacific/Fiji", PPT: "Pacific/Tahiti",

  // ============ ÁFRICA ============
  JNB: "Africa/Johannesburg", CPT: "Africa/Johannesburg", DUR: "Africa/Johannesburg",
  NBO: "Africa/Nairobi", ADD: "Africa/Addis_Ababa", DAR: "Africa/Dar_es_Salaam",
  ZNZ: "Africa/Dar_es_Salaam", JRO: "Africa/Dar_es_Salaam", EBB: "Africa/Kampala",
  KGL: "Africa/Kigali", MPM: "Africa/Maputo",
  CMN: "Africa/Casablanca", RAK: "Africa/Casablanca", TNG: "Africa/Casablanca",
  TUN: "Africa/Tunis", ALG: "Africa/Algiers",
  LOS: "Africa/Lagos", ABV: "Africa/Lagos", ACC: "Africa/Accra",
  DKR: "Africa/Dakar", LFW: "Africa/Lome",
  MRU: "Indian/Mauritius", SEZ: "Indian/Mahe",
};

/**
 * Retorna a timezone IANA de um IATA, ou null se desconhecida.
 */
export function getAirportTimezone(iata: string | null | undefined): string | null {
  if (!iata) return null;
  return AIRPORT_TZ[iata.toUpperCase().trim()] || null;
}

/**
 * Calcula o offset (em minutos) de uma timezone IANA em relação ao UTC,
 * para uma data/hora específica (respeitando horário de verão).
 *
 * Retorna o offset assinado: +180 = UTC+3, -180 = UTC-3.
 */
export function getTimezoneOffsetMinutes(timezone: string, date: Date): number {
  try {
    // Formata a data como se estivesse na timezone alvo, depois compara com UTC
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = dtf.formatToParts(date);
    const map: Record<string, string> = {};
    parts.forEach((p) => { if (p.type !== "literal") map[p.type] = p.value; });
    const asUTC = Date.UTC(
      parseInt(map.year),
      parseInt(map.month) - 1,
      parseInt(map.day),
      parseInt(map.hour === "24" ? "0" : map.hour),
      parseInt(map.minute),
      parseInt(map.second),
    );
    return Math.round((asUTC - date.getTime()) / 60000);
  } catch {
    return 0;
  }
}

/**
 * Converte uma data/hora local de um aeroporto (IATA) para um instante UTC absoluto.
 *
 * @param iata Código IATA do aeroporto.
 * @param dateStr "YYYY-MM-DD"
 * @param timeStr "HH:MM"
 * @returns Date em UTC, ou null se entradas insuficientes.
 */
export function localTimeToUTC(
  iata: string | null | undefined,
  dateStr: string | null | undefined,
  timeStr: string | null | undefined,
): Date | null {
  if (!dateStr || !timeStr) return null;
  const [y, mo, d] = dateStr.split("T")[0].split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  if (!y || !mo || !d || isNaN(h) || isNaN(mi)) return null;

  // Tenta como UTC e depois ajusta pelo offset
  const naiveUTC = Date.UTC(y, mo - 1, d, h, mi, 0);
  const tz = getAirportTimezone(iata);
  if (!tz) {
    // Fallback: usa horário de Brasília (BRT) como proxy
    return new Date(naiveUTC + 3 * 60 * 60 * 1000);
  }
  // O offset depende da própria data — calculamos iterativamente
  const tentative = new Date(naiveUTC);
  const offset = getTimezoneOffsetMinutes(tz, tentative);
  return new Date(naiveUTC - offset * 60 * 1000);
}
