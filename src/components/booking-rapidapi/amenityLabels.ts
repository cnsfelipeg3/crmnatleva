// Tradução e ordenação de amenidades (IDs em inglês vindos do Hotels.com / Booking)
// para labels curtos em pt-BR. Usado nos cards de hotel.

const AMENITY_MAP: Record<string, string> = {
  // Comuns
  pool: "Piscina",
  swimming_pool: "Piscina",
  outdoor_pool: "Piscina externa",
  indoor_pool: "Piscina interna",
  hot_tub: "Hidromassagem",
  kitchen: "Cozinha",
  kitchenette: "Cozinha compacta",
  free_breakfast: "Café incluso",
  breakfast: "Café da manhã",
  free_wifi: "Wi-Fi grátis",
  wifi: "Wi-Fi",
  free_parking: "Estacionamento grátis",
  parking: "Estacionamento",
  local_parking: "Estacionamento",
  air_conditioning: "Ar-condicionado",
  ac_unit: "Ar-condicionado",
  gym: "Academia",
  fitness_center: "Academia",
  spa: "Spa",
  bar: "Bar",
  local_bar: "Bar",
  restaurant: "Restaurante",
  local_dining: "Restaurante",
  beach: "Praia",
  beach_access: "Acesso à praia",
  pet_friendly: "Aceita pets",
  pets: "Aceita pets",
  laundry: "Lavanderia",
  local_laundry_service: "Lavanderia",
  business_center: "Centro de negócios",
  meeting_rooms: "Salas de reunião",
  airport_shuttle: "Traslado aeroporto",
  shuttle: "Traslado",
  room_service: "Serviço de quarto",
  concierge: "Concierge",
  family_friendly: "Para famílias",
  accessible: "Acessível",
  accessibility: "Acessível",
  non_smoking: "Não fumante",
  smoke_free_property: "Não fumante",
  ev_charging: "Carregador elétrico",
  microwave: "Micro-ondas",
  refrigerator: "Geladeira",
  tv: "TV",
  cable_tv: "TV a cabo",
  view: "Vista",
  ocean_view: "Vista pro mar",
  mountain_view: "Vista pra montanha",
  garden: "Jardim",
  terrace: "Terraço",
  balcony: "Sacada",
  sauna: "Sauna",
  jacuzzi: "Jacuzzi",
  reception_24h: "Recepção 24h",
  front_desk_24h: "Recepção 24h",
  local_convenience_store: "Loja de conveniência",
  elevator: "Elevador",
  safe: "Cofre",
};

/** Prioridade pra ordenar — quanto menor, mais relevante */
const AMENITY_PRIORITY: Record<string, number> = {
  Piscina: 1,
  "Piscina externa": 1,
  "Piscina interna": 1,
  "Café incluso": 2,
  "Café da manhã": 2,
  "Wi-Fi grátis": 3,
  "Wi-Fi": 3,
  "Ar-condicionado": 4,
  "Estacionamento grátis": 5,
  Estacionamento: 5,
  Academia: 6,
  Spa: 7,
  Restaurante: 8,
  Bar: 9,
  "Acesso à praia": 10,
  Praia: 10,
  "Aceita pets": 11,
  "Recepção 24h": 12,
};

/**
 * Traduz um ID/label de amenidade para pt-BR.
 * Se não houver tradução, capitaliza e remove underscores.
 */
export function translateAmenity(raw: string): string {
  if (!raw) return raw;
  const key = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (AMENITY_MAP[key]) return AMENITY_MAP[key];
  // Match parcial (ex: "Free WiFi" → free_wifi)
  for (const [k, v] of Object.entries(AMENITY_MAP)) {
    if (key.includes(k)) return v;
  }
  // Fallback: remove underscores e capitaliza
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Normaliza, traduz, dedupa e ordena uma lista de amenidades.
 */
export function normalizeAmenities(list: string[] | undefined): string[] {
  if (!list || list.length === 0) return [];
  const translated = list.map(translateAmenity);
  const unique = Array.from(new Set(translated.filter(Boolean)));
  return unique.sort((a, b) => {
    const pa = AMENITY_PRIORITY[a] ?? 999;
    const pb = AMENITY_PRIORITY[b] ?? 999;
    if (pa !== pb) return pa - pb;
    return a.localeCompare(b, "pt-BR");
  });
}
