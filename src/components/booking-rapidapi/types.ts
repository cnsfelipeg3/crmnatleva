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
  | "getLanguages"
  | "hotelscomAutocomplete"
  | "hotelscomSearch"
  | "hotelscomDetails";

export interface BookingDestination {
  dest_id: string;
  search_type: string; // "CITY" | "REGION" | "LANDMARK" | ...
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
  arrival_date: string; // YYYY-MM-DD
  departure_date: string; // YYYY-MM-DD
  adults?: number;
  children_age?: string; // "5,10" (vírgula separando idades)
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

// ============================================================
// Tipos auxiliares ricos do JSON bruto do Booking
// ============================================================

/** Formato monetário detalhado com rounded/unrounded */
export interface BookingMoney {
  value?: number;
  amount_rounded?: string;
  amount_unrounded?: string;
  currency?: string;
}

/** Item do price breakdown — imposto, desconto, etc */
export interface BookingPriceItem {
  name?: string;
  kind?: "charge" | "discount" | string;
  inclusion_type?: "included" | "excluded" | string;
  item_amount?: BookingMoney;
  base?: { kind?: string; percentage?: number };
  details?: string;
  identifier?: string;
}

/** Badge de benefício/promoção */
export interface BookingBenefit {
  kind?: string;
  badge_variant?: string;
  name?: string;
  details?: string;
  identifier?: string;
  icon?: string | null;
}

/** Breakdown de preço completo do product_price_breakdown ou composite_price_breakdown */
export interface BookingProductPriceBreakdown {
  gross_amount?: BookingMoney;
  gross_amount_per_night?: BookingMoney;
  strikethrough_amount?: BookingMoney;
  strikethrough_amount_per_night?: BookingMoney;
  discounted_amount?: BookingMoney;
  all_inclusive_amount?: BookingMoney;
  all_inclusive_amount_hotel_currency?: BookingMoney;
  gross_amount_hotel_currency?: BookingMoney;
  net_amount?: BookingMoney;
  included_taxes_and_charges_amount?: BookingMoney;
  excluded_amount?: BookingMoney;
  items?: BookingPriceItem[];
  benefits?: BookingBenefit[];
  charges_details?: { mode?: string; amount?: BookingMoney };
  nr_stays?: number;
  has_long_stays_monthly_rate_price?: number;
  has_long_stays_weekly_rate_price?: number;
}

/** Comodidade/facility com ícone */
export interface BookingFacility {
  icon?: string;
  name?: string;
  translated_name?: string;
  id?: number;
}

/** Bloco de comodidades (mais populares, etc) */
export interface BookingFacilitiesBlock {
  name?: string;
  type?: string;
  facilities?: BookingFacility[];
}

/** Regra da casa (fumantes, festas, etc) */
export interface BookingHouseRule {
  title?: string;
  icon?: string;
  type?: string;
  description?: string;
}

/** Configuração de tipo de cama */
export interface BookingBedType {
  name?: string;
  name_with_count?: string;
  description?: string;
  description_localized?: string;
  description_imperial?: string;
  count?: number;
  bed_type?: number;
}

export interface BookingBedConfig {
  bed_types?: BookingBedType[];
}

/** Highlight de quarto (WiFi, TV, etc) */
export interface BookingRoomHighlight {
  icon?: string;
  translated_name?: string;
  id?: number;
}

/** Detalhes de 1 quarto (dentro de `rooms`) */
export interface BookingRoomDetails {
  description?: string;
  highlights?: BookingRoomHighlight[];
  facilities?: BookingFacility[];
  bed_configurations?: BookingBedConfig[];
  private_bathroom_count?: number;
  private_bathroom_highlight?: { has_highlight?: number };
  photos?: Array<{
    photo_id?: number;
    url_max300?: string;
    url_max500?: string;
    url_max750?: string;
    url_max1280?: string;
    url_original?: string;
    url_square60?: string;
    url_square180?: string;
    url_640x200?: string;
    ratio?: number;
  }>;
  children_and_beds_text?: {
    allow_children?: number;
    cribs_and_extra_beds?: Array<{ text?: string; highlight?: number }>;
    age_intervals?: unknown[];
    children_at_the_property?: Array<{ text?: string; highlight?: number }>;
  };
}

/** Política de pagamento (cancelamento ou pré-pagamento) */
export interface BookingPaymentTerms {
  cancellation?: {
    type?: string;
    type_translation?: string;
    description?: string;
    non_refundable_anymore?: number;
    bucket?: string;
    info?: {
      date?: string;
      refundable?: number;
      refundable_date?: string;
      time?: string;
      time_before_midnight?: string;
    };
  };
  prepayment?: {
    type?: string;
    type_extended?: string;
    type_translation?: string;
    extended_type_translation?: string;
    simple_translation?: string;
    description?: string;
    info?: { prepayment_at_booktime?: number };
  };
}

/** Bloco (oferta reservável) dentro do hotel */
export interface BookingBlock {
  block_id?: string;
  room_id?: number;
  name?: string;
  name_without_policy?: string;
  room_name?: string;
  max_occupancy?: number | string;
  nr_adults?: number;
  nr_children?: number;
  room_surface_in_m2?: number;
  room_surface_in_feet2?: number;
  number_of_bathrooms?: number;
  number_of_bedrooms?: number;
  breakfast_included?: number;
  half_board?: number;
  full_board?: number;
  all_inclusive?: number;
  can_reserve_free_parking?: number;
  must_reserve_free_parking?: number;
  refundable?: number;
  refundable_until?: string;
  smoking?: number;
  is_flash_deal?: number;
  is_smart_deal?: number;
  is_last_minute_deal?: number;
  is_vp2_enrolled?: number;
  genius_discount_percentage?: number;
  deposit_required?: number;
  pay_in_advance?: number;
  extrabed_available?: number;
  babycots_available?: number;
  mealplan?: string;
  paymentterms?: BookingPaymentTerms;
  block_text?: {
    policies?: Array<{
      class?: string;
      content?: string;
      title?: string;
      mealplan_vector?: string;
    }>;
  };
}

/** Score específico (ex: café da manhã, wifi) */
export interface BookingReviewScore {
  rating?: number;
  review_number?: number;
  review_score_word?: string;
  review_count?: number;
  review_score?: number;
  review_snippet?: string;
}

export interface BookingHotel {
  hotel_id: number | string;
  name?: string;
  hotel_name?: string;
  hotel_name_trans?: string;
  url?: string;
  class?: number;
  reviewScore?: number;
  reviewScoreWord?: string;
  reviewCount?: number;
  review_nr?: number;
  checkin?: { fromTime?: string; untilTime?: string };
  checkout?: { fromTime?: string; untilTime?: string };
  latitude?: number;
  longitude?: number;
  // Localização rica
  address?: string;
  address_trans?: string;
  city?: string;
  city_trans?: string;
  city_in_trans?: string;
  city_name_en?: string;
  district?: string;
  country_trans?: string;
  zip?: string;
  timezone?: string;
  default_language?: string;
  currency_code?: string;
  // Metadados
  accommodation_type_name?: string;
  distance_to_cc?: number;
  ufi?: number;
  available_rooms?: number;
  max_rooms_in_reservation?: number;
  average_room_size_for_ufi_m2?: string;
  is_family_friendly?: number;
  is_closed?: number;
  hotel_include_breakfast?: number;
  qualifies_for_no_cc_reservation?: number;
  // Ricos
  family_facilities?: string[];
  languages_spoken?: { languagecode?: string[] };
  spoken_languages?: string[];
  breakfast_review_score?: BookingReviewScore;
  facilities_block?: BookingFacilitiesBlock;
  top_ufi_benefits?: BookingFacility[];
  booking_home?: {
    is_booking_home?: number;
    is_vacation_rental?: number;
    is_aparthotel?: number;
    is_single_type_property?: number;
    is_single_unit_property?: number;
    group?: string;
    segment?: number;
    house_rules?: BookingHouseRule[];
    checkin_methods?: unknown[];
    quality_class?: number | null;
  };
  aggregated_data?: {
    has_refundable?: number;
    has_nonrefundable?: number;
    has_kitchen?: number;
    has_seating?: number;
    common_kitchen_fac?: Array<{ name?: string; id?: number }>;
  };
  hotel_important_information_with_codes?: Array<{
    sentence_id?: number;
    phrase?: string;
    executing_phase?: number;
  }>;
  rare_find_state?: string;
  priceBreakdown?: {
    grossPrice?: { value?: number; currency?: string };
    strikethroughPrice?: { value?: number; currency?: string };
    /** Impostos e taxas NÃO incluídos no grossPrice (são cobrados separadamente) */
    excludedPrice?: { value?: number; currency?: string };
    benefitBadges?: Array<{
      text?: string;
      variant?: string;
      identifier?: string;
      explanation?: string;
    }>;
  };
  /** Breakdown de preço MUITO mais rico (impostos, descontos, benefícios) */
  product_price_breakdown?: BookingProductPriceBreakdown;
  composite_price_breakdown?: BookingProductPriceBreakdown;
  /** Detalhes de cada quarto — vindo de getRoomList */
  rooms?: Record<string, BookingRoomDetails>;
  /** Ofertas reserváveis — vindo de getRoomList */
  block?: BookingBlock[];
  photoUrls?: string[];
  wishlistName?: string;
  main_photo_url?: string;
  countrycode?: string;
  accuratePropertyClass?: number;
  rankingPosition?: number;
  accessibilityLabel?: string;
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
