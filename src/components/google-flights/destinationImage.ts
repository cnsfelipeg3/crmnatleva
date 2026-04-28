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
  "buenos-aires": "https://images.unsplash.com/photo-1612294037637-ec328d0e075e?w=1600&q=80&auto=format&fit=crop",
  "santiago": "https://images.unsplash.com/photo-1606298855672-3efb63017be8?w=1600&q=80&auto=format&fit=crop",
  "santiago-do-chile": "https://images.unsplash.com/photo-1606298855672-3efb63017be8?w=1600&q=80&auto=format&fit=crop",
  "lima": "https://images.unsplash.com/photo-1531968455001-5c5272a41129?w=1600&q=80&auto=format&fit=crop",
  "cusco": "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=1600&q=80&auto=format&fit=crop",
  "bariloche": "https://images.unsplash.com/photo-1605547022884-9b6b7e5d7f76?w=1600&q=80&auto=format&fit=crop",
  "mendoza": "https://images.unsplash.com/photo-1601042879364-f3947d3f9c16?w=1600&q=80&auto=format&fit=crop",

  // Brasil
  "rio-de-janeiro": "https://images.unsplash.com/photo-1516306580123-e6e52b1b7b5f?w=1600&q=80&auto=format&fit=crop",
  "rio": "https://images.unsplash.com/photo-1516306580123-e6e52b1b7b5f?w=1600&q=80&auto=format&fit=crop",
  "fernando-de-noronha": "https://images.unsplash.com/photo-1564415300324-b3bd2c83b27d?w=1600&q=80&auto=format&fit=crop",
  "salvador": "https://images.unsplash.com/photo-1591375372269-f3463effe5fc?w=1600&q=80&auto=format&fit=crop",
  "florianopolis": "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1600&q=80&auto=format&fit=crop",
  "porto-de-galinhas": "https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?w=1600&q=80&auto=format&fit=crop",
  "jericoacoara": "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=1600&q=80&auto=format&fit=crop",
  "fortaleza": "https://images.unsplash.com/photo-1518638150340-f706e86654de?w=1600&q=80&auto=format&fit=crop",
  "maceio": "https://images.unsplash.com/photo-1622467827417-bbe2237067a9?w=1600&q=80&auto=format&fit=crop",
  "natal": "https://images.unsplash.com/photo-1544550581-5f7ceaf7f992?w=1600&q=80&auto=format&fit=crop",
  "recife": "https://images.unsplash.com/photo-1583531352515-8884af319dc7?w=1600&q=80&auto=format&fit=crop",
  "gramado": "https://images.unsplash.com/photo-1574006559292-b6e23c1a5b6e?w=1600&q=80&auto=format&fit=crop",
  "foz-do-iguacu": "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1600&q=80&auto=format&fit=crop",
  "iguacu": "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1600&q=80&auto=format&fit=crop",
  "brasilia": "https://images.unsplash.com/photo-1591211432343-23ee16ee03d2?w=1600&q=80&auto=format&fit=crop",
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

// Fallbacks por país · genéricos bonitos. Chaves normalizadas (lowercase, sem acentos).
const COUNTRY_FALLBACK: Record<string, string> = {
  // Europa
  "italia": "https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=1600&q=80&auto=format&fit=crop",
  "italy": "https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=1600&q=80&auto=format&fit=crop",
  "franca": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&q=80&auto=format&fit=crop",
  "france": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&q=80&auto=format&fit=crop",
  "espanha": "https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=1600&q=80&auto=format&fit=crop",
  "spain": "https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=1600&q=80&auto=format&fit=crop",
  "portugal": "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1600&q=80&auto=format&fit=crop",
  "grecia": "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1600&q=80&auto=format&fit=crop",
  "greece": "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1600&q=80&auto=format&fit=crop",
  "alemanha": "https://images.unsplash.com/photo-1587330979470-3016b6702d89?w=1600&q=80&auto=format&fit=crop",
  "germany": "https://images.unsplash.com/photo-1587330979470-3016b6702d89?w=1600&q=80&auto=format&fit=crop",
  "reino-unido": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1600&q=80&auto=format&fit=crop",
  "united-kingdom": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1600&q=80&auto=format&fit=crop",
  "inglaterra": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1600&q=80&auto=format&fit=crop",
  "england": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1600&q=80&auto=format&fit=crop",
  "irlanda": "https://images.unsplash.com/photo-1549918864-48ac978761a4?w=1600&q=80&auto=format&fit=crop",
  "ireland": "https://images.unsplash.com/photo-1549918864-48ac978761a4?w=1600&q=80&auto=format&fit=crop",
  "escocia": "https://images.unsplash.com/photo-1566740933430-b5e70b06d2d5?w=1600&q=80&auto=format&fit=crop",
  "scotland": "https://images.unsplash.com/photo-1566740933430-b5e70b06d2d5?w=1600&q=80&auto=format&fit=crop",
  "holanda": "https://images.unsplash.com/photo-1534351590666-13e3e96c5017?w=1600&q=80&auto=format&fit=crop",
  "paises-baixos": "https://images.unsplash.com/photo-1534351590666-13e3e96c5017?w=1600&q=80&auto=format&fit=crop",
  "netherlands": "https://images.unsplash.com/photo-1534351590666-13e3e96c5017?w=1600&q=80&auto=format&fit=crop",
  "belgica": "https://images.unsplash.com/photo-1559113202-c916b8e44373?w=1600&q=80&auto=format&fit=crop",
  "belgium": "https://images.unsplash.com/photo-1559113202-c916b8e44373?w=1600&q=80&auto=format&fit=crop",
  "suica": "https://images.unsplash.com/photo-1530841344095-94d34d92e92f?w=1600&q=80&auto=format&fit=crop",
  "switzerland": "https://images.unsplash.com/photo-1530841344095-94d34d92e92f?w=1600&q=80&auto=format&fit=crop",
  "austria": "https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=1600&q=80&auto=format&fit=crop",
  "republica-tcheca": "https://images.unsplash.com/photo-1541849546-216549ae216d?w=1600&q=80&auto=format&fit=crop",
  "czech-republic": "https://images.unsplash.com/photo-1541849546-216549ae216d?w=1600&q=80&auto=format&fit=crop",
  "tchequia": "https://images.unsplash.com/photo-1541849546-216549ae216d?w=1600&q=80&auto=format&fit=crop",
  "hungria": "https://images.unsplash.com/photo-1541343672885-9be56236302a?w=1600&q=80&auto=format&fit=crop",
  "hungary": "https://images.unsplash.com/photo-1541343672885-9be56236302a?w=1600&q=80&auto=format&fit=crop",
  "polonia": "https://images.unsplash.com/photo-1573599852326-2d4da0bbe613?w=1600&q=80&auto=format&fit=crop",
  "poland": "https://images.unsplash.com/photo-1573599852326-2d4da0bbe613?w=1600&q=80&auto=format&fit=crop",
  "suecia": "https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=1600&q=80&auto=format&fit=crop",
  "sweden": "https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=1600&q=80&auto=format&fit=crop",
  "noruega": "https://images.unsplash.com/photo-1601942217571-cb05c1c5b6e4?w=1600&q=80&auto=format&fit=crop",
  "norway": "https://images.unsplash.com/photo-1601942217571-cb05c1c5b6e4?w=1600&q=80&auto=format&fit=crop",
  "dinamarca": "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=1600&q=80&auto=format&fit=crop",
  "denmark": "https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=1600&q=80&auto=format&fit=crop",
  "finlandia": "https://images.unsplash.com/photo-1543160809-7b5b6c7f4f48?w=1600&q=80&auto=format&fit=crop",
  "finland": "https://images.unsplash.com/photo-1543160809-7b5b6c7f4f48?w=1600&q=80&auto=format&fit=crop",
  "islandia": "https://images.unsplash.com/photo-1504284992200-32555eb1ba00?w=1600&q=80&auto=format&fit=crop",
  "iceland": "https://images.unsplash.com/photo-1504284992200-32555eb1ba00?w=1600&q=80&auto=format&fit=crop",
  "turquia": "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1600&q=80&auto=format&fit=crop",
  "turkey": "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1600&q=80&auto=format&fit=crop",
  "croacia": "https://images.unsplash.com/photo-1555990538-32226a4d61c3?w=1600&q=80&auto=format&fit=crop",
  "croatia": "https://images.unsplash.com/photo-1555990538-32226a4d61c3?w=1600&q=80&auto=format&fit=crop",

  // Américas
  "mexico": "https://images.unsplash.com/photo-1552074284-5e88ef1aef18?w=1600&q=80&auto=format&fit=crop",
  "estados-unidos": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1600&q=80&auto=format&fit=crop",
  "eua": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1600&q=80&auto=format&fit=crop",
  "usa": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1600&q=80&auto=format&fit=crop",
  "united-states": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1600&q=80&auto=format&fit=crop",
  "canada": "https://images.unsplash.com/photo-1517090504586-fde19ea6066f?w=1600&q=80&auto=format&fit=crop",
  "brasil": "https://images.unsplash.com/photo-1516306580123-e6e52b1b7b5f?w=1600&q=80&auto=format&fit=crop",
  "brazil": "https://images.unsplash.com/photo-1516306580123-e6e52b1b7b5f?w=1600&q=80&auto=format&fit=crop",
  "argentina": "https://images.unsplash.com/photo-1612294037637-ec328d0e075e?w=1600&q=80&auto=format&fit=crop",
  "chile": "https://images.unsplash.com/photo-1606298855672-3efb63017be8?w=1600&q=80&auto=format&fit=crop",
  "peru": "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=1600&q=80&auto=format&fit=crop",
  "colombia": "https://images.unsplash.com/photo-1568632234157-ce7aecd03d0d?w=1600&q=80&auto=format&fit=crop",
  "uruguai": "https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=1600&q=80&auto=format&fit=crop",
  "uruguay": "https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=1600&q=80&auto=format&fit=crop",
  "paraguai": "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1600&q=80&auto=format&fit=crop",
  "paraguay": "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1600&q=80&auto=format&fit=crop",
  "bolivia": "https://images.unsplash.com/photo-1531968455001-5c5272a41129?w=1600&q=80&auto=format&fit=crop",
  "equador": "https://images.unsplash.com/photo-1531968455001-5c5272a41129?w=1600&q=80&auto=format&fit=crop",
  "ecuador": "https://images.unsplash.com/photo-1531968455001-5c5272a41129?w=1600&q=80&auto=format&fit=crop",
  "cuba": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600&q=80&auto=format&fit=crop",
  "republica-dominicana": "https://images.unsplash.com/photo-1535498730771-e735b998cd64?w=1600&q=80&auto=format&fit=crop",
  "dominican-republic": "https://images.unsplash.com/photo-1535498730771-e735b998cd64?w=1600&q=80&auto=format&fit=crop",
  "bahamas": "https://images.unsplash.com/photo-1548574505-5e239809ee19?w=1600&q=80&auto=format&fit=crop",
  "jamaica": "https://images.unsplash.com/photo-1559814047-7f788ce93ec5?w=1600&q=80&auto=format&fit=crop",
  "aruba": "https://images.unsplash.com/photo-1559814047-7f788ce93ec5?w=1600&q=80&auto=format&fit=crop",
  "curacao": "https://images.unsplash.com/photo-1559656914-a30970c1affd?w=1600&q=80&auto=format&fit=crop",

  // Ásia
  "japao": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1600&q=80&auto=format&fit=crop",
  "japan": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1600&q=80&auto=format&fit=crop",
  "tailandia": "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1600&q=80&auto=format&fit=crop",
  "thailand": "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1600&q=80&auto=format&fit=crop",
  "indonesia": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1600&q=80&auto=format&fit=crop",
  "china": "https://images.unsplash.com/photo-1536599018102-9f803c140fc1?w=1600&q=80&auto=format&fit=crop",
  "coreia-do-sul": "https://images.unsplash.com/photo-1538485399081-7c8978d8b7b6?w=1600&q=80&auto=format&fit=crop",
  "south-korea": "https://images.unsplash.com/photo-1538485399081-7c8978d8b7b6?w=1600&q=80&auto=format&fit=crop",
  "korea": "https://images.unsplash.com/photo-1538485399081-7c8978d8b7b6?w=1600&q=80&auto=format&fit=crop",
  "vietna": "https://images.unsplash.com/photo-1528127269322-539801943592?w=1600&q=80&auto=format&fit=crop",
  "vietnam": "https://images.unsplash.com/photo-1528127269322-539801943592?w=1600&q=80&auto=format&fit=crop",
  "india": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1600&q=80&auto=format&fit=crop",
  "singapura": "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1600&q=80&auto=format&fit=crop",
  "singapore": "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1600&q=80&auto=format&fit=crop",
  "filipinas": "https://images.unsplash.com/photo-1518509562904-e7ef99cddc85?w=1600&q=80&auto=format&fit=crop",
  "philippines": "https://images.unsplash.com/photo-1518509562904-e7ef99cddc85?w=1600&q=80&auto=format&fit=crop",
  "maldivas": "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1600&q=80&auto=format&fit=crop",
  "maldives": "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1600&q=80&auto=format&fit=crop",

  // Oriente Médio · África
  "emirados-arabes-unidos": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=80&auto=format&fit=crop",
  "united-arab-emirates": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=80&auto=format&fit=crop",
  "uae": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=80&auto=format&fit=crop",
  "catar": "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=1600&q=80&auto=format&fit=crop",
  "qatar": "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=1600&q=80&auto=format&fit=crop",
  "marrocos": "https://images.unsplash.com/photo-1597212720153-f6e0f5e23a3a?w=1600&q=80&auto=format&fit=crop",
  "morocco": "https://images.unsplash.com/photo-1597212720153-f6e0f5e23a3a?w=1600&q=80&auto=format&fit=crop",
  "egito": "https://images.unsplash.com/photo-1539650116574-75c0c6d73d0e?w=1600&q=80&auto=format&fit=crop",
  "egypt": "https://images.unsplash.com/photo-1539650116574-75c0c6d73d0e?w=1600&q=80&auto=format&fit=crop",
  "africa-do-sul": "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1600&q=80&auto=format&fit=crop",
  "south-africa": "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1600&q=80&auto=format&fit=crop",
  "israel": "https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=1600&q=80&auto=format&fit=crop",

  // Oceania
  "australia": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1600&q=80&auto=format&fit=crop",
  "nova-zelandia": "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&q=80&auto=format&fit=crop",
  "new-zealand": "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&q=80&auto=format&fit=crop",
};

// Aliases ISO 2/3 e variações sem hífen → chave canônica em COUNTRY_FALLBACK
const COUNTRY_ALIASES: Record<string, string> = {
  // ISO-2
  "br": "brasil", "us": "usa", "ca": "canada", "mx": "mexico",
  "ar": "argentina", "cl": "chile", "pe": "peru", "co": "colombia",
  "uy": "uruguai", "py": "paraguai", "bo": "bolivia", "ec": "equador",
  "fr": "franca", "it": "italia", "es": "espanha", "pt": "portugal",
  "de": "alemanha", "gb": "reino-unido", "uk": "reino-unido",
  "ie": "irlanda", "nl": "holanda", "be": "belgica", "ch": "suica",
  "at": "austria", "cz": "republica-tcheca", "hu": "hungria",
  "pl": "polonia", "se": "suecia", "no": "noruega", "dk": "dinamarca",
  "fi": "finlandia", "is": "islandia", "gr": "grecia", "tr": "turquia",
  "hr": "croacia", "ru": "russia",
  "jp": "japao", "cn": "china", "kr": "coreia-do-sul", "th": "tailandia",
  "id": "indonesia", "vn": "vietna", "in": "india", "sg": "singapura",
  "ph": "filipinas", "mv": "maldivas", "hk": "china",
  "ae": "emirados-arabes-unidos", "qa": "catar", "ma": "marrocos",
  "eg": "egito", "za": "africa-do-sul", "il": "israel",
  "au": "australia", "nz": "nova-zelandia",
  "cu": "cuba", "do": "republica-dominicana", "bs": "bahamas",
  "jm": "jamaica", "aw": "aruba",
  // PT/EN comuns
  "ee-uu": "usa", "estadosunidos": "usa",
  "reinounido": "reino-unido",
  "republicatcheca": "republica-tcheca",
  "africadosul": "africa-do-sul",
  "novazelandia": "nova-zelandia",
  "coreiadosul": "coreia-do-sul",
  "republicadominicana": "republica-dominicana",
};

// Fallback por região / continente · imagens evocativas e neutras
const REGION_FALLBACK: Record<string, string> = {
  "europa": "https://images.unsplash.com/photo-1471623432079-b009d30b6729?w=1600&q=80&auto=format&fit=crop",
  "europe": "https://images.unsplash.com/photo-1471623432079-b009d30b6729?w=1600&q=80&auto=format&fit=crop",
  "america-do-sul": "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=1600&q=80&auto=format&fit=crop",
  "south-america": "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=1600&q=80&auto=format&fit=crop",
  "america-do-norte": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1600&q=80&auto=format&fit=crop",
  "north-america": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1600&q=80&auto=format&fit=crop",
  "america-central": "https://images.unsplash.com/photo-1552074284-5e88ef1aef18?w=1600&q=80&auto=format&fit=crop",
  "central-america": "https://images.unsplash.com/photo-1552074284-5e88ef1aef18?w=1600&q=80&auto=format&fit=crop",
  "caribe": "https://images.unsplash.com/photo-1535498730771-e735b998cd64?w=1600&q=80&auto=format&fit=crop",
  "caribbean": "https://images.unsplash.com/photo-1535498730771-e735b998cd64?w=1600&q=80&auto=format&fit=crop",
  "asia": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1600&q=80&auto=format&fit=crop",
  "sudeste-asiatico": "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1600&q=80&auto=format&fit=crop",
  "southeast-asia": "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1600&q=80&auto=format&fit=crop",
  "oriente-medio": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=80&auto=format&fit=crop",
  "middle-east": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=80&auto=format&fit=crop",
  "africa": "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1600&q=80&auto=format&fit=crop",
  "oceania": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1600&q=80&auto=format&fit=crop",
};

// Mapa cidade → país (chaves normalizadas) · usado quando country não é informado.
// Cobre as cidades de CITY_PHOTOS para inferir o país via destino.
const CITY_TO_COUNTRY: Record<string, string> = {
  // ===== Europa =====
  "paris": "franca", "nice": "franca", "lyon": "franca", "marselha": "franca", "marseille": "franca",
  "bordeaux": "franca", "cannes": "franca", "estrasburgo": "franca", "strasbourg": "franca",
  "toulouse": "franca", "montpellier": "franca",
  "londres": "reino-unido", "london": "reino-unido", "manchester": "reino-unido",
  "liverpool": "reino-unido", "birmingham": "reino-unido", "bristol": "reino-unido",
  "edimburgo": "escocia", "edinburgh": "escocia", "glasgow": "escocia",
  "roma": "italia", "rome": "italia", "veneza": "italia", "venice": "italia",
  "florenca": "italia", "florence": "italia", "milao": "italia", "milan": "italia",
  "napoles": "italia", "naples": "italia", "turim": "italia", "turin": "italia",
  "bolonha": "italia", "bologna": "italia", "verona": "italia", "pisa": "italia",
  "palermo": "italia", "catania": "italia", "amalfi": "italia", "capri": "italia",
  "sicilia": "italia", "sardenha": "italia", "cinque-terre": "italia",
  "barcelona": "espanha", "madrid": "espanha", "sevilha": "espanha", "seville": "espanha",
  "valencia": "espanha", "malaga": "espanha", "granada": "espanha", "bilbao": "espanha",
  "ibiza": "espanha", "mallorca": "espanha", "palma-de-mallorca": "espanha",
  "tenerife": "espanha", "san-sebastian": "espanha",
  "lisboa": "portugal", "lisbon": "portugal", "porto": "portugal", "madeira": "portugal",
  "funchal": "portugal", "algarve": "portugal", "faro": "portugal", "cascais": "portugal",
  "sintra": "portugal", "coimbra": "portugal", "braga": "portugal", "acores": "portugal",
  "amsterda": "holanda", "amsterdam": "holanda", "roterda": "holanda", "rotterdam": "holanda",
  "haia": "holanda", "the-hague": "holanda", "utrecht": "holanda",
  "berlim": "alemanha", "berlin": "alemanha", "munique": "alemanha", "munich": "alemanha",
  "munchen": "alemanha", "frankfurt": "alemanha", "hamburgo": "alemanha", "hamburg": "alemanha",
  "colonia": "alemanha", "cologne": "alemanha", "dusseldorf": "alemanha", "stuttgart": "alemanha",
  "praga": "republica-tcheca", "prague": "republica-tcheca",
  "viena": "austria", "vienna": "austria", "salzburgo": "austria", "salzburg": "austria",
  "innsbruck": "austria",
  "bruxelas": "belgica", "brussels": "belgica", "bruges": "belgica", "antuerpia": "belgica",
  "antwerp": "belgica",
  "atenas": "grecia", "athens": "grecia", "santorini": "grecia", "mykonos": "grecia",
  "creta": "grecia", "rodes": "grecia", "rhodes": "grecia", "corfu": "grecia",
  "dublin": "irlanda", "cork": "irlanda", "galway": "irlanda",
  "zurique": "suica", "zurich": "suica", "genebra": "suica", "geneva": "suica",
  "interlaken": "suica", "lucerna": "suica", "lucerne": "suica", "basileia": "suica",
  "basel": "suica", "berna": "suica", "bern": "suica",
  "estocolmo": "suecia", "stockholm": "suecia", "gotemburgo": "suecia", "gothenburg": "suecia",
  "copenhague": "dinamarca", "copenhagen": "dinamarca",
  "oslo": "noruega", "bergen": "noruega", "tromso": "noruega",
  "helsinque": "finlandia", "helsinki": "finlandia",
  "reykjavik": "islandia",
  "varsovia": "polonia", "warsaw": "polonia", "cracovia": "polonia", "krakow": "polonia",
  "budapeste": "hungria", "budapest": "hungria",
  "istambul": "turquia", "istanbul": "turquia", "capadocia": "turquia", "cappadocia": "turquia",
  "antalya": "turquia",
  "dubrovnik": "croacia", "split": "croacia", "zagreb": "croacia",
  "moscou": "russia", "moscow": "russia", "sao-petersburgo": "russia", "st-petersburg": "russia",

  // ===== América do Norte =====
  "miami": "usa", "orlando": "usa", "tampa": "usa", "fort-lauderdale": "usa", "key-west": "usa",
  "nova-york": "usa", "new-york": "usa", "boston": "usa", "filadelfia": "usa", "philadelphia": "usa",
  "washington": "usa", "washington-dc": "usa", "atlanta": "usa", "charlotte": "usa",
  "nashville": "usa", "new-orleans": "usa", "nova-orleans": "usa",
  "los-angeles": "usa", "san-diego": "usa", "las-vegas": "usa", "san-francisco": "usa",
  "sao-francisco": "usa", "seattle": "usa", "portland": "usa", "denver": "usa",
  "chicago": "usa", "houston": "usa", "dallas": "usa", "austin": "usa", "phoenix": "usa",
  "honolulu": "usa", "havai": "usa", "hawaii": "usa", "maui": "usa",
  "sao-paul": "usa", "saint-paul": "usa", "minneapolis": "usa",
  "sao-louis": "usa", "saint-louis": "usa",
  "toronto": "canada", "montreal": "canada", "vancouver": "canada", "ottawa": "canada",
  "quebec": "canada", "calgary": "canada", "banff": "canada",
  "cancun": "mexico", "playa-del-carmen": "mexico", "tulum": "mexico", "cidade-do-mexico": "mexico",
  "ciudad-de-mexico": "mexico", "mexico-city": "mexico", "puerto-vallarta": "mexico",
  "los-cabos": "mexico", "cabo-san-lucas": "mexico", "cozumel": "mexico", "merida": "mexico",
  "guadalajara": "mexico", "oaxaca": "mexico",

  // ===== Caribe / América Central =====
  "punta-cana": "republica-dominicana", "santo-domingo": "republica-dominicana",
  "puerto-plata": "republica-dominicana",
  "aruba": "aruba", "oranjestad": "aruba",
  "curacao": "curacao", "willemstad": "curacao",
  "nassau": "bahamas", "exuma": "bahamas", "bahamas": "bahamas",
  "havana": "cuba", "varadero": "cuba", "cayo-coco": "cuba",
  "san-juan": "usa", "porto-rico": "usa",
  "montego-bay": "jamaica", "kingston": "jamaica", "ocho-rios": "jamaica",
  "san-jose": "costa-rica", "costa-rica": "costa-rica",
  "cidade-do-panama": "panama", "panama-city": "panama",
  "antigua": "antigua", "barbados": "barbados", "saint-lucia": "saint-lucia",
  "sao-lucia": "saint-lucia",

  // ===== América do Sul =====
  "buenos-aires": "argentina", "bariloche": "argentina", "mendoza": "argentina",
  "ushuaia": "argentina", "el-calafate": "argentina", "salta": "argentina",
  "santiago": "chile", "santiago-do-chile": "chile", "valparaiso": "chile",
  "san-pedro-de-atacama": "chile", "atacama": "chile", "ilha-de-pascoa": "chile",
  "easter-island": "chile",
  "lima": "peru", "cusco": "peru", "machu-picchu": "peru", "arequipa": "peru",
  "bogota": "colombia", "cartagena": "colombia", "medellin": "colombia",
  "santa-marta": "colombia",
  "montevideo": "uruguai", "montevideu": "uruguai", "punta-del-este": "uruguai",
  "colonia-del-sacramento": "uruguai",
  "assuncao": "paraguai", "asuncion": "paraguai",
  "la-paz": "bolivia", "uyuni": "bolivia", "salar-de-uyuni": "bolivia",
  "quito": "equador", "galapagos": "equador",
  "caracas": "venezuela",

  // ===== Brasil =====
  "rio-de-janeiro": "brasil", "rio": "brasil", "fernando-de-noronha": "brasil",
  "salvador": "brasil", "florianopolis": "brasil", "porto-de-galinhas": "brasil",
  "jericoacoara": "brasil", "fortaleza": "brasil", "maceio": "brasil",
  "natal": "brasil", "recife": "brasil", "gramado": "brasil", "canela": "brasil",
  "foz-do-iguacu": "brasil", "iguacu": "brasil", "brasilia": "brasil",
  "sao-paulo": "brasil", "sao-paul-br": "brasil", "campinas": "brasil",
  "belo-horizonte": "brasil", "ouro-preto": "brasil", "tiradentes": "brasil",
  "curitiba": "brasil", "porto-alegre": "brasil", "vitoria": "brasil",
  "manaus": "brasil", "belem": "brasil", "goiania": "brasil",
  "cuiaba": "brasil", "campo-grande": "brasil", "bonito": "brasil", "pantanal": "brasil",
  "sao-luis": "brasil", "joao-pessoa": "brasil", "aracaju": "brasil",
  "trancoso": "brasil", "porto-seguro": "brasil", "morro-de-sao-paulo": "brasil",
  "lencois-maranhenses": "brasil", "chapada-diamantina": "brasil",
  "alter-do-chao": "brasil", "buzios": "brasil", "paraty": "brasil", "ilhabela": "brasil",
  "ubatuba": "brasil", "campos-do-jordao": "brasil", "sao-miguel-dos-milagres": "brasil",
  "japaratinga": "brasil", "milos": "grecia",

  // ===== Oriente Médio / África =====
  "dubai": "emirados-arabes-unidos", "abu-dhabi": "emirados-arabes-unidos",
  "doha": "catar", "tel-aviv": "israel", "jerusalem": "israel",
  "amma": "jordania", "amman": "jordania", "petra": "jordania",
  "muscat": "oma", "riyadh": "arabia-saudita",
  "marrakech": "marrocos", "marraquexe": "marrocos", "casablanca": "marrocos",
  "fes": "marrocos", "rabat": "marrocos", "chefchaouen": "marrocos",
  "cairo": "egito", "luxor": "egito", "sharm-el-sheikh": "egito",
  "cape-town": "africa-do-sul", "cidade-do-cabo": "africa-do-sul",
  "joanesburgo": "africa-do-sul", "johannesburg": "africa-do-sul",
  "kruger": "africa-do-sul",
  "nairobi": "quenia", "masai-mara": "quenia",
  "zanzibar": "tanzania", "serengeti": "tanzania", "kilimanjaro": "tanzania",
  "victoria-falls": "zimbabue", "cataratas-vitoria": "zimbabue",

  // ===== Ásia =====
  "toquio": "japao", "tokyo": "japao", "kyoto": "japao", "quioto": "japao",
  "osaka": "japao", "hiroshima": "japao", "nagoya": "japao", "okinawa": "japao",
  "hokkaido": "japao", "sapporo": "japao",
  "seul": "coreia-do-sul", "seoul": "coreia-do-sul", "busan": "coreia-do-sul",
  "pequim": "china", "beijing": "china", "shanghai": "china", "xangai": "china",
  "hong-kong": "china", "macau": "china", "guangzhou": "china",
  "bangkok": "tailandia", "phuket": "tailandia", "chiang-mai": "tailandia",
  "krabi": "tailandia", "koh-samui": "tailandia", "pattaya": "tailandia",
  "bali": "indonesia", "ubud": "indonesia", "jakarta": "indonesia", "yogyakarta": "indonesia",
  "lombok": "indonesia",
  "singapura": "singapura", "singapore": "singapura",
  "kuala-lumpur": "malasia", "penang": "malasia", "langkawi": "malasia",
  "manila": "filipinas", "cebu": "filipinas", "boracay": "filipinas", "palawan": "filipinas",
  "hanoi": "vietna", "ho-chi-minh": "vietna", "ha-long": "vietna", "halong": "vietna",
  "siem-reap": "camboja", "phnom-penh": "camboja", "angkor": "camboja",
  "delhi": "india", "nova-delhi": "india", "new-delhi": "india", "mumbai": "india",
  "bombaim": "india", "agra": "india", "jaipur": "india", "goa": "india",
  "colombo": "sri-lanka",
  "kathmandu": "nepal", "katmandu": "nepal",
  "maldivas": "maldivas", "maldives": "maldivas", "male": "maldivas",
  "taipei": "taiwan",

  // ===== Oceania =====
  "sydney": "australia", "melbourne": "australia", "brisbane": "australia",
  "perth": "australia", "cairns": "australia", "gold-coast": "australia",
  "auckland": "nova-zelandia", "queenstown": "nova-zelandia", "wellington": "nova-zelandia",
  "fiji": "fiji", "bora-bora": "polinesia-francesa", "tahiti": "polinesia-francesa",
};

// Fallback final · paisagem genérica de viagem (Unsplash CDN direto)
const GENERIC_TRAVEL = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&q=80&auto=format&fit=crop";

function resolveCountryKey(rawCountry?: string): string | null {
  const k = normalize(rawCountry);
  if (!k) return null;
  if (COUNTRY_FALLBACK[k]) return k;
  if (COUNTRY_ALIASES[k]) return COUNTRY_ALIASES[k];
  const noHyphen = k.replace(/-/g, "");
  if (COUNTRY_ALIASES[noHyphen]) return COUNTRY_ALIASES[noHyphen];
  for (const key of Object.keys(COUNTRY_FALLBACK)) {
    if (key.replace(/-/g, "") === noHyphen) return key;
  }
  return null;
}

function resolveRegionKey(rawRegion?: string): string | null {
  const k = normalize(rawRegion);
  if (!k) return null;
  if (REGION_FALLBACK[k]) return k;
  const noHyphen = k.replace(/-/g, "");
  for (const key of Object.keys(REGION_FALLBACK)) {
    if (key.replace(/-/g, "") === noHyphen) return key;
  }
  return null;
}

/**
 * Normalizador robusto de chave de destino.
 *
 * Trata:
 *  · acentos (NFD)
 *  · caixa (lowercase)
 *  · espaços múltiplos / inicio / fim
 *  · separadores variados ("_", ".", ",", "/", "·")
 *  · ausência de espaço ("RiodeJaneiro" -> "rio-de-janeiro" via aliases)
 *  · sufixos comuns "(Brasil)", " - BR", ", Brasil"
 *  · prefixos "São", "Sao", "St."
 */
function normalize(s?: string): string {
  if (!s) return "";
  let out = s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  // Remove qualquer coisa entre parenteses ou após vírgula/traço (país, UF)
  out = out.replace(/\(.*?\)/g, "");
  out = out.replace(/[,/·|].*$/g, "");
  out = out.replace(/\s-\s.*$/g, "");

  // Expande abreviações comuns ANTES de remover pontos
  // "st." / "st " / "saint " -> "sao " (alinhando com chaves canônicas pt-br)
  // ex: "St. Paul" -> "sao paul" -> alias canônico
  out = out.replace(/\bst\.?\s+/g, "sao ");
  out = out.replace(/\bsaint\s+/g, "sao ");
  out = out.replace(/\bsainte\s+/g, "sao ");
  out = out.replace(/\bs\.\s+/g, "sao ");
  // "Ft." / "Fort " mantemos como "fort"
  out = out.replace(/\bft\.?\s+/g, "fort ");
  // "Mt." -> "monte"
  out = out.replace(/\bmt\.?\s+/g, "monte ");
  // "N.Y." colapsa
  out = out.replace(/\bn\.?\s*y\.?\b/g, "ny");

  // Troca separadores por hífen
  out = out.replace(/[_./\\]+/g, "-");

  // Remove caracteres não [a-z0-9-\s]
  out = out.replace(/[^a-z0-9\s-]/g, "");

  // Colapsa espaços e troca por hífen
  out = out.replace(/\s+/g, "-");

  // Colapsa hífens múltiplos e tira das pontas
  out = out.replace(/-+/g, "-").replace(/^-|-$/g, "");

  return out;
}

/**
 * Aliases · variações conhecidas que mapeiam para a chave canônica do CITY_PHOTOS.
 * Inclui IATA, abreviações, formas sem espaço (CamelCase já normalizado vira tudo junto).
 */
const CITY_ALIASES: Record<string, string> = {
  // Rio
  "rio": "rio-de-janeiro",
  "riodejaneiro": "rio-de-janeiro",
  "rio-janeiro": "rio-de-janeiro",
  "gig": "rio-de-janeiro",
  "sdu": "rio-de-janeiro",
  // SP
  "sp": "sao-paulo",
  "saopaulo": "sao-paulo",
  "gru": "sao-paulo",
  "cgh": "sao-paulo",
  // Foz
  "foz": "foz-do-iguacu",
  "fozdoiguacu": "foz-do-iguacu",
  "iguazu": "foz-do-iguacu",
  "igu": "foz-do-iguacu",
  // Maceió
  "mcz": "maceio",
  // Salvador
  "ssa": "salvador",
  // Recife
  "rec": "recife",
  // Fortaleza
  "for": "fortaleza",
  // Natal
  "nat": "natal",
  // Floripa
  "fln": "florianopolis",
  "floripa": "florianopolis",
  // Brasília
  "bsb": "brasilia",
  // Buenos Aires
  "buenosaires": "buenos-aires",
  "bue": "buenos-aires",
  "eze": "buenos-aires",
  "aep": "buenos-aires",
  // Santiago
  "santiagochile": "santiago",
  "santiago-chile": "santiago",
  "scl": "santiago",
  // Outros LatAm
  "lim": "lima",
  "cuz": "cusco",
  // EUA
  "ny": "nova-york",
  "nyc": "nova-york",
  "newyork": "new-york",
  "novayork": "nova-york",
  "jfk": "nova-york",
  "lga": "nova-york",
  "ewr": "nova-york",
  "lax": "los-angeles",
  "losangeles": "los-angeles",
  "las": "las-vegas",
  "lasvegas": "las-vegas",
  "mia": "miami",
  "mco": "orlando",
  "sfo": "san-francisco",
  "sanfrancisco": "san-francisco",
  // Europa
  "cdg": "paris",
  "ory": "paris",
  "lhr": "londres",
  "lgw": "londres",
  "fco": "roma",
  "vce": "veneza",
  "mxp": "milao",
  "lin": "milao",
  "bcn": "barcelona",
  "mad": "madrid",
  "lis": "lisboa",
  "opo": "porto",
  "ams": "amsterda",
  "ber": "berlim",
  "txl": "berlim",
  "prg": "praga",
  "vie": "viena",
  "ath": "atenas",
  "jtr": "santorini",
  "jmk": "mykonos",
  "dub": "dublin",
  "edi": "edimburgo",
  "zrh": "zurique",
  "gva": "genebra",
  "arn": "estocolmo",
  "cph": "copenhague",
  "osl": "oslo",
  "kef": "reykjavik",
  // Caribe
  "cun": "cancun",
  "pun": "punta-cana",
  "aua": "aruba",
  "cur": "curacao",
  "nas": "nassau",
  "hav": "havana",
  "sju": "san-juan",
  // Médio Oriente / África
  "dxb": "dubai",
  "auh": "abu-dhabi",
  "doh": "doha",
  "rak": "marrakech",
  "cai": "cairo",
  "cpt": "cape-town",
  "cidadedocabo": "cape-town",
  // Ásia
  "hnd": "toquio",
  "nrt": "toquio",
  "tokyo": "toquio",
  "kix": "kyoto",
  "icn": "seul",
  "bkk": "bangkok",
  "hkt": "phuket",
  "dps": "bali",
  "denpasar": "bali",
  "sin": "singapura",
  "hkg": "hong-kong",
  "hongkong": "hong-kong",
  "male": "maldivas",
  // Oceania
  "syd": "sydney",
  "mel": "melbourne",
};

function resolveCityKey(rawCity?: string): string | null {
  const k = normalize(rawCity);
  if (!k) return null;

  // 1. match direto
  if (CITY_PHOTOS[k]) return k;

  // 2. alias
  if (CITY_ALIASES[k]) return CITY_ALIASES[k];

  // 3. variação sem hífen ("riodejaneiro" -> sem hífen na chave)
  const noHyphen = k.replace(/-/g, "");
  if (CITY_ALIASES[noHyphen]) return CITY_ALIASES[noHyphen];
  for (const key of Object.keys(CITY_PHOTOS)) {
    if (key.replace(/-/g, "") === noHyphen) return key;
  }

  // 4. primeira palavra (ex: "Rio Tropical" -> "rio")
  const first = k.split("-")[0];
  if (first && first !== k) {
    if (CITY_PHOTOS[first]) return first;
    if (CITY_ALIASES[first]) return CITY_ALIASES[first];
  }

  return null;
}

/**
 * Resolve a melhor capa para um destino, com cadeia de fallback:
 *   1. override (hero_image_url do backend)
 *   2. cidade exata (CITY_PHOTOS + aliases)
 *   3. país explícito (COUNTRY_FALLBACK + ISO aliases)
 *   4. país inferido a partir da cidade (CITY_TO_COUNTRY)
 *   5. região / continente (REGION_FALLBACK)
 *   6. paisagem genérica de viagem
 */
export function getDestinationCoverUrl(
  city: string,
  country?: string,
  override?: string | null,
  region?: string,
): string {
  if (override && override.trim().length > 0) return override;

  // 1. cidade
  const cityKey = resolveCityKey(city);
  if (cityKey && CITY_PHOTOS[cityKey]) return CITY_PHOTOS[cityKey];

  // 2. país informado
  const countryKey = resolveCountryKey(country);
  if (countryKey && COUNTRY_FALLBACK[countryKey]) return COUNTRY_FALLBACK[countryKey];

  // 3. país inferido pela cidade (mesmo sem `country` no payload)
  let inferredCountry: string | null = null;
  if (cityKey && CITY_TO_COUNTRY[cityKey]) {
    inferredCountry = CITY_TO_COUNTRY[cityKey];
    if (COUNTRY_FALLBACK[inferredCountry]) return COUNTRY_FALLBACK[inferredCountry];
  }

  // 4. região / continente (explícita ou derivada do país conhecido)
  const baseCountry = countryKey || inferredCountry;
  const regionKey =
    resolveRegionKey(region) ||
    (baseCountry ? resolveRegionKey(countryToRegion(baseCountry) ?? undefined) : null);
  if (regionKey && REGION_FALLBACK[regionKey]) return REGION_FALLBACK[regionKey];

  return GENERIC_TRAVEL;
}

// Mapeamento país → região para alimentar o fallback regional.
function countryToRegion(countryKey: string): string | null {
  const europa = new Set([
    "italia","franca","espanha","portugal","grecia","alemanha","reino-unido",
    "irlanda","escocia","holanda","belgica","suica","austria","republica-tcheca",
    "hungria","polonia","suecia","noruega","dinamarca","finlandia","islandia",
    "turquia","croacia","russia",
  ]);
  const americaNorte = new Set(["usa","canada","mexico"]);
  const americaSul = new Set([
    "brasil","argentina","chile","peru","colombia","uruguai","paraguai","bolivia","equador",
  ]);
  const caribe = new Set(["cuba","republica-dominicana","bahamas","jamaica","aruba","curacao"]);
  const asia = new Set([
    "japao","china","coreia-do-sul","tailandia","indonesia","vietna","india",
    "singapura","filipinas","maldivas",
  ]);
  const orienteMedio = new Set(["emirados-arabes-unidos","catar","israel"]);
  const africa = new Set(["marrocos","egito","africa-do-sul"]);
  const oceania = new Set(["australia","nova-zelandia"]);

  if (europa.has(countryKey)) return "europa";
  if (americaNorte.has(countryKey)) return "america-do-norte";
  if (americaSul.has(countryKey)) return "america-do-sul";
  if (caribe.has(countryKey)) return "caribe";
  if (asia.has(countryKey)) return "asia";
  if (orienteMedio.has(countryKey)) return "oriente-medio";
  if (africa.has(countryKey)) return "africa";
  if (oceania.has(countryKey)) return "oceania";
  return null;
}

// Exposto APENAS para testes automatizados · não usar em runtime de produção.
export const __testing = {
  CITY_PHOTOS,
  COUNTRY_FALLBACK,
  REGION_FALLBACK,
  CITY_TO_COUNTRY,
  GENERIC_TRAVEL,
};



