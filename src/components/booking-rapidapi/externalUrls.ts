// Helpers centralizados pra construir URLs externas confiáveis pro Booking.com e Hotels.com.
// IMPORTANTE: Booking não aceita /hotel.html?hotel_id=... como URL pública (404).
// A forma que SEMPRE funciona é cair na busca (`searchresults.html`) com o nome do hotel
// + datas + ocupação. Hotels.com às vezes retorna URL relativa (ex: "/Hotel-Search?..."),
// então normalizamos pro domínio absoluto.

export interface BookingUrlOpts {
  hotelName?: string | null;
  arrival?: string | null; // YYYY-MM-DD
  departure?: string | null; // YYYY-MM-DD
  adults?: number;
  childrenAges?: number[];
  rooms?: number;
}

/** Sempre devolve uma URL de busca do Booking.com — funciona com qualquer hotel. */
export function buildBookingSearchUrl(opts: BookingUrlOpts): string {
  const params = new URLSearchParams();
  if (opts.hotelName) params.set("ss", opts.hotelName);
  if (opts.arrival) params.set("checkin", opts.arrival);
  if (opts.departure) params.set("checkout", opts.departure);
  if (opts.adults) params.set("group_adults", String(opts.adults));
  if (opts.rooms) params.set("no_rooms", String(opts.rooms));
  if (opts.childrenAges?.length) {
    params.set("group_children", String(opts.childrenAges.length));
    opts.childrenAges.forEach((age) => params.append("age", String(age)));
  }
  // Configurações de UX que mantêm o usuário no PT-BR / BRL
  params.set("selected_currency", "BRL");
  params.set("lang", "pt-br");
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

/**
 * Normaliza qualquer URL do Hotels.com pra ficar absoluta.
 * A API às vezes retorna paths relativos ("/Hotel-Search?destination=...").
 */
export function normalizeHotelscomUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("/")) return `https://www.hotels.com${trimmed}`;
  return `https://www.hotels.com/${trimmed}`;
}

/**
 * Fallback para Hotels.com quando não temos URL: busca pelo nome do hotel.
 */
export function buildHotelscomSearchUrl(opts: BookingUrlOpts): string {
  const params = new URLSearchParams();
  if (opts.hotelName) params.set("q-destination", opts.hotelName);
  if (opts.arrival) params.set("q-check-in", opts.arrival);
  if (opts.departure) params.set("q-check-out", opts.departure);
  if (opts.adults) params.set("q-rooms", String(opts.rooms ?? 1));
  if (opts.adults) params.set("q-room-0-adults", String(opts.adults));
  if (opts.childrenAges?.length) {
    params.set("q-room-0-children", String(opts.childrenAges.length));
  }
  return `https://www.hotels.com/Hotel-Search?${params.toString()}`;
}

/** Abre URL em nova aba com segurança (noopener,noreferrer). */
export function openExternal(url: string | null | undefined): void {
  if (!url) return;
  try {
    window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    /* ignora bloqueio de popup */
  }
}
