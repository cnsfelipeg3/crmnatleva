// Tipos para o módulo Booking RapidAPI (BETA)
// Isolado do resto do sistema — nada daqui é importado por código antigo.

export type BookingAction =
  | "searchDestinations"
  | "searchHotels"
  | "hotelDetails"
  | "hotelPhotos"
  | "hotelReviews"
  | "roomAvailability"
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