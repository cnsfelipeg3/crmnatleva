// City images keyed by IATA code — Unsplash source photos
// Format: https://source.unsplash.com/400x200/?{city}+skyline
// We use a curated map for top destinations, fallback to dynamic URL

const CURATED: Record<string, string> = {
  // Japan
  HND: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=200&fit=crop",
  NRT: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=200&fit=crop",
  // USA
  MIA: "https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=400&h=200&fit=crop",
  JFK: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=200&fit=crop",
  EWR: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=200&fit=crop",
  LAX: "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=400&h=200&fit=crop",
  SFO: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=200&fit=crop",
  MCO: "https://images.unsplash.com/photo-1575089976121-8ed7b2a54265?w=400&h=200&fit=crop",
  LAS: "https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?w=400&h=200&fit=crop",
  ORD: "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=400&h=200&fit=crop",
  BOS: "https://images.unsplash.com/photo-1501979376754-2ff867a4f659?w=400&h=200&fit=crop",
  ATL: "https://images.unsplash.com/photo-1575917649111-0cee4e0e5c76?w=400&h=200&fit=crop",
  DFW: "https://images.unsplash.com/photo-1545194445-dddb8f4487c6?w=400&h=200&fit=crop",
  // Europe
  LIS: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=400&h=200&fit=crop",
  OPO: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400&h=200&fit=crop",
  CDG: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=200&fit=crop",
  FCO: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=200&fit=crop",
  BCN: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&h=200&fit=crop",
  MAD: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400&h=200&fit=crop",
  LHR: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=200&fit=crop",
  AMS: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400&h=200&fit=crop",
  FRA: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400&h=200&fit=crop",
  MUC: "https://images.unsplash.com/photo-1595867818082-083862f3d630?w=400&h=200&fit=crop",
  ZRH: "https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=400&h=200&fit=crop",
  VIE: "https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=400&h=200&fit=crop",
  PRG: "https://images.unsplash.com/photo-1541849546-216549ae216d?w=400&h=200&fit=crop",
  IST: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=400&h=200&fit=crop",
  ATH: "https://images.unsplash.com/photo-1555993539-1732b0258235?w=400&h=200&fit=crop",
  DUB: "https://images.unsplash.com/photo-1549918864-48ac978761a4?w=400&h=200&fit=crop",
  CPH: "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=400&h=200&fit=crop",
  EDI: "https://images.unsplash.com/photo-1506377585622-bedcbb027afc?w=400&h=200&fit=crop",
  BUD: "https://images.unsplash.com/photo-1541343672885-9be56236302a?w=400&h=200&fit=crop",
  WAW: "https://images.unsplash.com/photo-1519197924294-4ba991a11128?w=400&h=200&fit=crop",
  MXP: "https://images.unsplash.com/photo-1520440229-6469d149e4e0?w=400&h=200&fit=crop",
  VCE: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=400&h=200&fit=crop",
  NAP: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=400&h=200&fit=crop",
  FLR: "https://images.unsplash.com/photo-1543429258-fa5d1eea7e65?w=400&h=200&fit=crop",
  GVA: "https://images.unsplash.com/photo-1504711434969-e33886168d5c?w=400&h=200&fit=crop",
  BRU: "https://images.unsplash.com/photo-1559113202-c916b8e44373?w=400&h=200&fit=crop",
  PMI: "https://images.unsplash.com/photo-1558642084-fd07fae5282e?w=400&h=200&fit=crop",
  ARN: "https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=400&h=200&fit=crop",
  SPU: "https://images.unsplash.com/photo-1555990793-da11153b2473?w=400&h=200&fit=crop",
  DBV: "https://images.unsplash.com/photo-1555990793-da11153b2473?w=400&h=200&fit=crop",
  // Middle East
  DXB: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=200&fit=crop",
  DOH: "https://images.unsplash.com/photo-1548017058-0e0d6f5a46e4?w=400&h=200&fit=crop",
  AUH: "https://images.unsplash.com/photo-1512632578888-169bbbc64f33?w=400&h=200&fit=crop",
  // Asia
  SIN: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=400&h=200&fit=crop",
  BKK: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=400&h=200&fit=crop",
  HKG: "https://images.unsplash.com/photo-1536599018102-9f803c140fc1?w=400&h=200&fit=crop",
  ICN: "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=400&h=200&fit=crop",
  DPS: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&h=200&fit=crop",
  KUL: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=400&h=200&fit=crop",
  PEK: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=400&h=200&fit=crop",
  DEL: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=200&fit=crop",
  // South America
  EZE: "https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=400&h=200&fit=crop",
  SCL: "https://images.unsplash.com/photo-1510070009289-b5bc15e97de5?w=400&h=200&fit=crop",
  BOG: "https://images.unsplash.com/photo-1536702455216-b7fca87b1b84?w=400&h=200&fit=crop",
  LIM: "https://images.unsplash.com/photo-1531968455001-5c5272a67c12?w=400&h=200&fit=crop",
  CUN: "https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=400&h=200&fit=crop",
  MVD: "https://images.unsplash.com/photo-1569074187119-c87815b476da?w=400&h=200&fit=crop",
  PUJ: "https://images.unsplash.com/photo-1580237541049-2d715a09486e?w=400&h=200&fit=crop",
  // Brazil
  GRU: "https://images.unsplash.com/photo-1543059080-f9b1272213d5?w=400&h=200&fit=crop",
  CGH: "https://images.unsplash.com/photo-1543059080-f9b1272213d5?w=400&h=200&fit=crop",
  GIG: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400&h=200&fit=crop",
  SDU: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400&h=200&fit=crop",
  BSB: "https://images.unsplash.com/photo-1553711256-063f6cce3296?w=400&h=200&fit=crop",
  SSA: "https://images.unsplash.com/photo-1560093247-1cfb2a07f3cc?w=400&h=200&fit=crop",
  REC: "https://images.unsplash.com/photo-1598146621261-01b3f383bf7c?w=400&h=200&fit=crop",
  FOR: "https://images.unsplash.com/photo-1611956425642-d5a8169abd63?w=400&h=200&fit=crop",
  FLN: "https://images.unsplash.com/photo-1588625500633-a612964e9567?w=400&h=200&fit=crop",
  POA: "https://images.unsplash.com/photo-1587329310977-e5e07c2ff8ef?w=400&h=200&fit=crop",
  CWB: "https://images.unsplash.com/photo-1598901847919-b8b3a4573860?w=400&h=200&fit=crop",
  BPS: "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=400&h=200&fit=crop",
  IGU: "https://images.unsplash.com/photo-1588001832198-c15cff59b078?w=400&h=200&fit=crop",
  FTE: "https://images.unsplash.com/photo-1589128777073-263566ae5e4d?w=400&h=200&fit=crop",
  // Africa
  JNB: "https://images.unsplash.com/photo-1577948000111-9c970dfe3743?w=400&h=200&fit=crop",
  CPT: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=400&h=200&fit=crop",
  CAI: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=400&h=200&fit=crop",
};

// Search-term fallback for IATA to English city name
const IATA_SEARCH: Record<string, string> = {
  GRU: "sao-paulo", CGH: "sao-paulo", GIG: "rio-de-janeiro", SDU: "rio-de-janeiro",
  BSB: "brasilia", SSA: "salvador-brazil", REC: "recife", FOR: "fortaleza",
  FLN: "florianopolis", POA: "porto-alegre", CWB: "curitiba", MAO: "manaus",
  BPS: "porto-seguro", IGU: "iguazu-falls", MIA: "miami", JFK: "new-york",
  LAX: "los-angeles", SFO: "san-francisco", MCO: "orlando", LIS: "lisbon",
  CDG: "paris", FCO: "rome", BCN: "barcelona", MAD: "madrid", LHR: "london",
  AMS: "amsterdam", IST: "istanbul", DXB: "dubai", SIN: "singapore",
  HND: "tokyo", NRT: "tokyo", BKK: "bangkok", HKG: "hong-kong",
  DPS: "bali", EZE: "buenos-aires", SCL: "santiago-chile", CUN: "cancun",
};

export function getCityImageUrl(iata: string): string {
  if (CURATED[iata]) return CURATED[iata];
  const search = IATA_SEARCH[iata] || iata.toLowerCase();
  return `https://images.unsplash.com/photo-1500835556837-99ac94a94552?w=400&h=200&fit=crop`; // generic travel fallback
}
