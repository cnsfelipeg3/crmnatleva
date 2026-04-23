// Tipos para o módulo Booking RapidAPI (BETA)
// Isolado do resto do sistema — nada daqui é importado por código antigo.

export type BookingAction =
  | "searchDestinations"
  | "searchHotels"
  | "hotelDetails"
  | "hotelPhotos"
  | "hotelReviews"
  | "roomAvailability"
  | "getRoomList"
  | "getCurrency"
  | "getLanguages";

export interface BookingDestination {
  dest_id: string;
  search_type: string;
  name: string;
  label: string;
  city_name?: string;
  country?: string;
  region?: string;
  hotels?: number;
  image_url?: string;
  latitude?: number;
  longitude?: number;
  type?: string;
}

export interface BookingSearchParams {
  dest_id: string;
  search_type: string;
  arrival_date: string;
  departure_date: string;
  adults?: number;
  children_age?: string;
  room_qty?: number;
  page_number?: number;
  currency_code?: string;
  languagecode?: string;
  // Filtros
  sort_by?: string;
  categories_filter?: string;
  price_min?: number;
  price_max?: number;
}

export interface BookingHotel {
  hotel_id: number | string;
  name?: string;
  class?: number;
  reviewScore?: number;
  reviewScoreWord?: string;
  reviewCount?: number;
  checkin?: { fromTime?: string; untilTime?: string };
  checkout?: { fromTime?: string; untilTime?: string };
  latitude?: number;
  longitude?: number;
  priceBreakdown?: {
    grossPrice?: { value?: number; currency?: string };
    strikethroughPrice?: { value?: number; currency?: string };
    /** Impostos e taxas NÃO incluídos no grossPrice (cobrados separadamente) */
    excludedPrice?: { value?: number; currency?: string };
    benefitBadges?: Array<{
      text?: string;
      variant?: string;
      identifier?: string;
      explanation?: string;
    }>;
  };
  photoUrls?: string[];
  wishlistName?: string;
  main_photo_url?: string;
  countrycode?: string;
  accuratePropertyClass?: number;
  rankingPosition?: number;
  [key: string]: unknown;
}

export interface BookingHotelPhoto {
  id: number | string;
  url: string;
}

export interface BookingHotelReview {
  review_id?: number | string;
  author?: { countrycode?: string; name?: string; type?: string };
  title?: string;
  pros?: string;
  cons?: string;
  score?: number;
  date?: string;
  stay_info?: { check_in?: string; num_nights?: number };
  [key: string]: unknown;
}

export interface BookingApiEnvelope<T> {
  status: boolean;
  message?: string;
  timestamp?: number;
  data: T;
  __cache?: boolean;
}

export type BookingPhotoSize =
  | "square60"
  | "square200"
  | "max500"
  | "max1024x768"
  | "square1024"
  | "max1280x900"
  | "max1440x1080";

/**
 * Troca o tamanho de uma URL de foto do Booking.com.
 * A API retorna `/square1024/` por padrão — podemos pedir outros tamanhos.
 */
export function resizeBookingPhoto(url: string, size: BookingPhotoSize): string {
  if (!url) return url;
  return url.replace(/\/(square\d+|max\d+x?\d*)\//, `/${size}/`);
}

// ------------------------------------------------------------
// Filtros da API (resposta de getHotelFilter)
// ------------------------------------------------------------

export type HotelFilterStyle = "SLIDER" | "CHECKBOX" | "RADIO" | string;

export interface HotelFilterOption {
  title: string;
  genericId: string;
  countNotAutoextended?: number;
  selected?: boolean;
}

export interface HotelFilter {
  title: string;
  field?: string;
  filterStyle: HotelFilterStyle;
  options?: HotelFilterOption[];
  min?: string;
  max?: string;
  minPriceStep?: string;
  minSelected?: string;
  maxSelected?: string;
  histogram?: number[];
  currency?: string;
}

export interface HotelFiltersResponse {
  filters: HotelFilter[];
  pagination?: { nbResultsTotal?: number };
  availabilityInfo?: Record<string, unknown>;
}

export interface HotelFiltersState {
  categoriesSelected: Set<string>;
  priceMin?: number;
  priceMax?: number;
  sortBy?: string;
}

export function emptyHotelFiltersState(): HotelFiltersState {
  return {
    categoriesSelected: new Set(),
    priceMin: undefined,
    priceMax: undefined,
    sortBy: undefined,
  };
}

export function hotelFiltersStateIsEmpty(s: HotelFiltersState): boolean {
  return (
    s.categoriesSelected.size === 0 &&
    s.priceMin === undefined &&
    s.priceMax === undefined &&
    !s.sortBy
  );
}