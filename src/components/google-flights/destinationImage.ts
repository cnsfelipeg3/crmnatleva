/**
 * Resolve uma URL de imagem temática (capa) para o destino do card.
 *
 * Estratégia (carregamento IMEDIATO · sem redirects lentos):
 *   1. Se o backend mandou hero_image_url, usa.
 *   2. Mapa curado de fotos diretas do Unsplash CDN (images.unsplash.com)
 *      para os destinos mais frequentes · servem instantâneo, sem
 *      o redirect de ~5s do source.unsplash.com (deprecado).
 *   3. Fallback temático determinístico via Unsplash CDN com query string
 *      direta (não redirect).
 */

// Fotos diretas (CDN) · 1600w otimizadas. Tudo licença Unsplash gratuita.
// Chave normalizada: lowercase sem acentos.
const CITY_PHOTOS: Record<string, string> = {
  // Europa
  "paris": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&q=80&auto=format&fit=crop",
  "londres": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1600&q=80&auto=format&fit=crop",
  "london": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1600&q=80&auto=format&fit=crop",
  "roma": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1600&q=80&auto=format&fit=crop",
  "rome": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1600&q=80&auto=format&fit=crop",
  "veneza": "https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=1600&q=80&auto=format&fit=crop",
  "venice": "https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=1600&q=80&auto=format&fit=crop",
  "florenca": "https://images.unsplash.com/photo-1543429776-2782fc8e1acd?w=1600&q=80&auto=format&fit=crop",
  "florence": "https://images.unsplash.com/photo-1543429776-2782fc8e1acd?w=1600&q=80&auto=format&fit=crop",
  "milao": "https://images.unsplash.com/photo-1520440229-6469a149ac59?w=1600&q=80&auto=format&fit=crop",
  "milan": "https://images.unsplash.com/photo-1520440229-6469a149ac59?w=1600&q=80&auto=format&fit=crop",
  "napoles": "https://images.unsplash.com/photo-1517541866997-12c5d978c425?w=1600&q=80&auto=format&fit=crop",
  "naples": "https://images.unsplash.com/photo-1517541866997-12c5d978c425?w=1600&q=80&auto=format&fit=crop",
  "barcelona": "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1600&q=80&auto=format&fit=crop",
  "madrid": "https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=1600&q=80&auto=format&fit=crop",
  "lisboa": "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1600&q=80&auto=format&fit=crop",
  "lisbon": "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1600&q=80&auto=format&fit=crop",
  "porto": "https://images.unsplash.com/photo-1555990538-32226a4d61c3?w=1600&q=80&auto=format&fit=crop",
  "amsterda": "https://images.unsplash.com/photo-1534351590666-13e3e96c5017?w=1600&q=80&auto=format&fit=crop",
  "amsterdam": "https://images.unsplash.com/photo-1534351590666-13e3e96c5017?w=1600&q=80&auto=format&fit=crop",
  "berlim": "https://images.unsplash.com/photo-1587330979470-3016b6702d89?w=1600&q=80&auto=format&fit=crop",
  "berlin": "https://images.unsplash.com/photo-1587330979470-3016b6702d89?w=1600&q=80&auto=format&fit=crop",
  "praga": "https://images.unsplash.com/photo-1541849546-216549ae216d?w=1600&q=80&auto=format&fit=crop",
  "prague": "https://images.unsplash.com/photo-1541849546-216549ae216d?w=1600&q=80&auto=format&fit=crop",
  "viena": "https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=1600&q=80&auto=format&fit=crop",
  "vienna": "https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=1600&q=80&auto=format&fit=crop",
  "atenas": "https://images.unsplash.com/photo-1555993539-1732b0258235?w=1600&q=80&auto=format&fit=crop",
  "athens": "https://images.unsplash.com/photo-1555993539-1732b0258235?w=1600&q=80&auto=format&fit=crop",
  "santorini": "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1600&q=80&auto=format&fit=crop",
  "mykonos": "https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?w=1600&q=80&auto=format&fit=crop",
  "dublin": "https://images.unsplash.com/photo-1549918864-48ac978761a4?w=1600&q=80&auto=format&fit=crop",
  "edimburgo": "https://images.unsplash.com/photo-1566740933430-b5e70b06d2d5?w=1600&q=80&auto=format&fit=crop",
  "edinburgh": "https://images.unsplash.com/photo-1566740933430-b5e70b06d2d5?w=1600&q=80&auto=format&fit=crop",
  "zurique": "https://images.unsplash.com/photo-1530841344095-94d34d92e92f?w=1600&q=80&auto=format&fit=crop",
  "zurich": "https://images.unsplash.com/photo-1530841344095-94d34d92e92f?w=1600&q=80&auto=format&fit=crop",
  "genebra": "https://images.unsplash.com/photo-1573599852326-2d4da0bbe613?w=1600&q=80&auto=format&fit=crop",
  "geneva": "https://images.unsplash.com/photo-1573599852326-2d4da0bbe613?w=1600&q=80&auto=format&fit=crop",
  "interlaken": "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=1600&q=80&auto=format&fit=crop",
  "estocolmo": "https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=1600&q=80&auto=format&fit=crop",
  "stockholm": "https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=1600&q=80&auto=format&fit=crop",
  "copenhague": "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=1600&q=80&auto=format&fit=crop",
  "copenhagen": "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=1600&q=80&auto=format&fit=crop",
  "oslo": "https://images.unsplash.com/photo-1601942217571-cb05c1c5b6e4?w=1600&q=80&auto=format&fit=crop",
  "reykjavik": "https://images.unsplash.com/photo-1504284992200-32555eb1ba00?w=1600&q=80&auto=format&fit=crop",

  // Caribe / Américas
  "cancun": "https://images.unsplash.com/photo-1552074284-5e88ef1aef18?w=1600&q=80&auto=format&fit=crop",
  "playa-del-carmen": "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=1600&q=80&auto=format&fit=crop",
  "tulum": "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=1600&q=80&auto=format&fit=crop",
  "cidade-do-mexico": "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=1600&q=80&auto=format&fit=crop",
  "punta-cana": "https://images.unsplash.com/photo-1535498730771-e735b998cd64?w=1600&q=80&auto=format&fit=crop",
  "aruba": "https://images.unsplash.com/photo-1559814047-7f788ce93ec5?w=1600&q=80&auto=format&fit=crop",
  "curacao": "https://images.unsplash.com/photo-1559656914-a30970c1affd?w=1600&q=80&auto=format&fit=crop",
  "nassau": "https://images.unsplash.com/photo-1548574505-5e239809ee19?w=1600&q=80&auto=format&fit=crop",
  "havana": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600&q=80&auto=format&fit=crop",
  "san-juan": "https://images.unsplash.com/photo-1579532582937-16c108930bf6?w=1600&q=80&auto=format&fit=crop",
  "miami": "https://images.unsplash.com/photo-1535498730771-e735b998cd64?w=1600&q=80&auto=format&fit=crop",
  "orlando": "https://images.unsplash.com/photo-1597466765990-64ad1c35dafc?w=1600&q=80&auto=format&fit=crop",
  "nova-york": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1600&q=80&auto=format&fit=crop",
  "new-york": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1600&q=80&auto=format&fit=crop",
  "los-angeles": "https://images.unsplash.com/photo-1503891450247-ee5f8ec46dc3?w=1600&q=80&auto=format&fit=crop",
  "las-vegas": "https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?w=1600&q=80&auto=format&fit=crop",
  "san-francisco": "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1600&q=80&auto=format&fit=crop",
  "chicago": "https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=1600&q=80&auto=format&fit=crop",
  "toronto": "https://images.unsplash.com/photo-1517090504586-fde19ea6066f?w=1600&q=80&auto=format&fit=crop",
  "buenos-aires": "https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=1600&q=80&auto=format&fit=crop",
  "santiago": "https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=1600&q=80&auto=format&fit=crop",
  "lima": "https://images.unsplash.com/photo-1531968455001-5c5272a41129?w=1600&q=80&auto=format&fit=crop",
  "cusco": "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=1600&q=80&auto=format&fit=crop",
  "bariloche": "https://images.unsplash.com/photo-1605547022884-9b6b7e5d7f76?w=1600&q=80&auto=format&fit=crop",
  "mendoza": "https://images.unsplash.com/photo-1601042879364-f3947d3f9c16?w=1600&q=80&auto=format&fit=crop",

  // Brasil
  "rio-de-janeiro": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=1600&q=80&auto=format&fit=crop",
  "fernando-de-noronha": "https://images.unsplash.com/photo-1564415300324-b3bd2c83b27d?w=1600&q=80&auto=format&fit=crop",
  "salvador": "https://images.unsplash.com/photo-1551272744-3e7c8e7eaa50?w=1600&q=80&auto=format&fit=crop",
  "florianopolis": "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1600&q=80&auto=format&fit=crop",
  "porto-de-galinhas": "https://images.unsplash.com/photo-1583286814682-6cb7d59ca6f1?w=1600&q=80&auto=format&fit=crop",
  "jericoacoara": "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=1600&q=80&auto=format&fit=crop",
  "fortaleza": "https://images.unsplash.com/photo-1564604644537-0c87a45f4f53?w=1600&q=80&auto=format&fit=crop",
  "maceio": "https://images.unsplash.com/photo-1599050751795-6cdaafbc2319?w=1600&q=80&auto=format&fit=crop",
  "natal": "https://images.unsplash.com/photo-1583286814682-6cb7d59ca6f1?w=1600&q=80&auto=format&fit=crop",
  "gramado": "https://images.unsplash.com/photo-1574006559292-b6e23c1a5b6e?w=1600&q=80&auto=format&fit=crop",
  "sao-paulo": "https://images.unsplash.com/photo-1543059080-f9b1272213d5?w=1600&q=80&auto=format&fit=crop",

  // Oriente Médio · África
  "dubai": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=80&auto=format&fit=crop",
  "abu-dhabi": "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1600&q=80&auto=format&fit=crop",
  "doha": "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=1600&q=80&auto=format&fit=crop",
  "marrakech": "https://images.unsplash.com/photo-1597212720153-f6e0f5e23a3a?w=1600&q=80&auto=format&fit=crop",
  "cairo": "https://images.unsplash.com/photo-1539650116574-75c0c6d73d0e?w=1600&q=80&auto=format&fit=crop",
  "cape-town": "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1600&q=80&auto=format&fit=crop",
  "cidade-do-cabo": "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1600&q=80&auto=format&fit=crop",

  // Ásia
  "toquio": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1600&q=80&auto=format&fit=crop",
  "tokyo": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1600&q=80&auto=format&fit=crop",
  "kyoto": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1600&q=80&auto=format&fit=crop",
  "quioto": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1600&q=80&auto=format&fit=crop",
  "seul": "https://images.unsplash.com/photo-1538485399081-7c8978d8b7b6?w=1600&q=80&auto=format&fit=crop",
  "seoul": "https://images.unsplash.com/photo-1538485399081-7c8978d8b7b6?w=1600&q=80&auto=format&fit=crop",
  "bangkok": "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1600&q=80&auto=format&fit=crop",
  "phuket": "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=1600&q=80&auto=format&fit=crop",
  "bali": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1600&q=80&auto=format&fit=crop",
  "singapura": "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1600&q=80&auto=format&fit=crop",
  "singapore": "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1600&q=80&auto=format&fit=crop",
  "hong-kong": "https://images.unsplash.com/photo-1536599018102-9f803c140fc1?w=1600&q=80&auto=format&fit=crop",
  "maldivas": "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1600&q=80&auto=format&fit=crop",
  "maldives": "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1600&q=80&auto=format&fit=crop",

  // Oceania
  "sydney": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1600&q=80&auto=format&fit=crop",
  "melbourne": "https://images.unsplash.com/photo-1545044846-351ba102b6d5?w=1600&q=80&auto=format&fit=crop",
};

// Fallbacks por país · genéricos bonitos
const COUNTRY_FALLBACK: Record<string, string> = {
  "italia": "https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=1600&q=80&auto=format&fit=crop",
  "italy": "https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=1600&q=80&auto=format&fit=crop",
  "franca": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&q=80&auto=format&fit=crop",
  "france": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&q=80&auto=format&fit=crop",
  "espanha": "https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=1600&q=80&auto=format&fit=crop",
  "spain": "https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=1600&q=80&auto=format&fit=crop",
  "portugal": "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1600&q=80&auto=format&fit=crop",
  "grecia": "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1600&q=80&auto=format&fit=crop",
  "greece": "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1600&q=80&auto=format&fit=crop",
  "mexico": "https://images.unsplash.com/photo-1552074284-5e88ef1aef18?w=1600&q=80&auto=format&fit=crop",
  "estados-unidos": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1600&q=80&auto=format&fit=crop",
  "eua": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1600&q=80&auto=format&fit=crop",
  "usa": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1600&q=80&auto=format&fit=crop",
  "brasil": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=1600&q=80&auto=format&fit=crop",
  "argentina": "https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=1600&q=80&auto=format&fit=crop",
  "japao": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1600&q=80&auto=format&fit=crop",
  "japan": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1600&q=80&auto=format&fit=crop",
  "tailandia": "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1600&q=80&auto=format&fit=crop",
  "thailand": "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1600&q=80&auto=format&fit=crop",
  "indonesia": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1600&q=80&auto=format&fit=crop",
  "emirados-arabes-unidos": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=80&auto=format&fit=crop",
  "marrocos": "https://images.unsplash.com/photo-1597212720153-f6e0f5e23a3a?w=1600&q=80&auto=format&fit=crop",
  "morocco": "https://images.unsplash.com/photo-1597212720153-f6e0f5e23a3a?w=1600&q=80&auto=format&fit=crop",
};

// Fallback final · paisagem genérica de viagem (Unsplash CDN direto)
const GENERIC_TRAVEL = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&q=80&auto=format&fit=crop";

function normalize(s?: string): string {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
}

export function getDestinationCoverUrl(
  city: string,
  country?: string,
  override?: string | null,
): string {
  if (override && override.trim().length > 0) return override;

  const cityKey = normalize(city);
  if (CITY_PHOTOS[cityKey]) return CITY_PHOTOS[cityKey];

  const countryKey = normalize(country);
  if (COUNTRY_FALLBACK[countryKey]) return COUNTRY_FALLBACK[countryKey];

  return GENERIC_TRAVEL;
}
