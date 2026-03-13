/**
 * Client-side Google Places API helpers.
 * Uses the VITE_GOOGLE_MAPS_API_KEY which has browser referer restrictions.
 */

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export interface PlaceSearchResult {
  place_id: string;
  name: string;
  address: string;
  rating: number | null;
  user_ratings_total: number;
  types: string[];
  photo_reference: string | null;
  location: { lat: number; lng: number } | null;
  price_level: number | null;
}

export interface PlacePhoto {
  photo_reference: string;
  width: number;
  height: number;
}

export interface PlaceDetailsResult {
  place_id: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  rating: number | null;
  user_ratings_total: number;
  price_level: number | null;
  types: string[];
  location: { lat: number; lng: number } | null;
  photos: PlacePhoto[];
  editorial_summary: string | null;
  reviews: { author: string; rating: number; text: string; time: string }[];
}

// Use the Places API (New) with field masks - supports API key restrictions
const BASE = "https://places.googleapis.com/v1/places";

export async function searchPlaces(query: string, locationBias?: { lat: number; lng: number }): Promise<PlaceSearchResult[]> {
  if (!query || query.length < 2) return [];

  const body: any = {
    textQuery: query,
    languageCode: "pt-BR",
    includedType: undefined, // search all types
  };

  if (locationBias) {
    body.locationBias = {
      circle: { center: { latitude: locationBias.lat, longitude: locationBias.lng }, radius: 50000 },
    };
  }

  const resp = await fetch(`${BASE}:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.photos,places.location,places.priceLevel",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    console.error("Places searchText error:", err);
    throw new Error(err?.error?.message || "Places API error");
  }

  const data = await resp.json();
  return (data.places || []).slice(0, 8).map((p: any) => ({
    place_id: p.id || "",
    name: p.displayName?.text || "",
    address: p.formattedAddress || "",
    rating: p.rating ?? null,
    user_ratings_total: p.userRatingCount || 0,
    types: p.types || [],
    photo_reference: p.photos?.[0]?.name || null,
    location: p.location ? { lat: p.location.latitude, lng: p.location.longitude } : null,
    price_level: p.priceLevel != null ? parsePriceLevel(p.priceLevel) : null,
  }));
}

function parsePriceLevel(pl: string | number): number | null {
  if (typeof pl === "number") return pl;
  const map: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  return map[pl] ?? null;
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetailsResult> {
  const resp = await fetch(`${BASE}/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": "id,displayName,formattedAddress,internationalPhoneNumber,websiteUri,rating,userRatingCount,priceLevel,types,location,photos,editorialSummary,reviews",
    },
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Place details error");
  }

  const p = await resp.json();
  const photos: PlacePhoto[] = (p.photos || []).slice(0, 10).map((ph: any) => ({
    photo_reference: ph.name,
    width: ph.widthPx || 800,
    height: ph.heightPx || 600,
  }));

  return {
    place_id: p.id,
    name: p.displayName?.text || "",
    address: p.formattedAddress || "",
    phone: p.internationalPhoneNumber || null,
    website: p.websiteUri || null,
    rating: p.rating ?? null,
    user_ratings_total: p.userRatingCount || 0,
    price_level: p.priceLevel != null ? parsePriceLevel(p.priceLevel) : null,
    types: p.types || [],
    location: p.location ? { lat: p.location.latitude, lng: p.location.longitude } : null,
    photos,
    editorial_summary: p.editorialSummary?.text || null,
    reviews: (p.reviews || []).slice(0, 3).map((r: any) => ({
      author: r.authorAttribution?.displayName || "",
      rating: r.rating || 0,
      text: r.text?.text || "",
      time: r.relativePublishTimeDescription || "",
    })),
  };
}

export function getPhotoUrl(photoReference: string, maxWidth = 800): string {
  // Places API (New) photo URL format
  return `${BASE}/${photoReference}/media?maxWidthPx=${maxWidth}&key=${API_KEY}`;
}
