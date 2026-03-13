/**
 * Client-side Google Places helpers using Maps JavaScript Places Library.
 * More reliable for browser-restricted API keys.
 */

import { loadGoogleMapsCore, loadGoogleMapsPlaces } from "@/lib/googleMaps";

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

let placesServicePromise: Promise<google.maps.places.PlacesService> | null = null;

async function getPlacesService(): Promise<google.maps.places.PlacesService> {
  if (typeof window === "undefined") {
    throw new Error("Google Places disponível apenas no navegador");
  }

  if (!placesServicePromise) {
    placesServicePromise = (async () => {
      await loadGoogleMapsPlaces();
      const { Map } = await loadGoogleMapsCore();
      const container = document.createElement("div");
      const map = new Map(container);
      return new google.maps.places.PlacesService(map);
    })();
  }

  return placesServicePromise;
}

function getLocation(
  geometry?: google.maps.places.PlaceGeometry
): { lat: number; lng: number } | null {
  const loc = geometry?.location;
  if (!loc) return null;
  return { lat: loc.lat(), lng: loc.lng() };
}

export async function searchPlaces(
  query: string,
  locationBias?: { lat: number; lng: number }
): Promise<PlaceSearchResult[]> {
  if (!query || query.length < 2) return [];

  const service = await getPlacesService();

  const request: google.maps.places.TextSearchRequest = {
    query,
    language: "pt-BR",
  };

  if (locationBias) {
    request.location = new google.maps.LatLng(locationBias.lat, locationBias.lng);
    request.radius = 50000;
  }

  const places = await new Promise<google.maps.places.PlaceResult[]>((resolve, reject) => {
    service.textSearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
        resolve([]);
        return;
      }

      if (status !== google.maps.places.PlacesServiceStatus.OK) {
        reject(new Error(`Places search failed: ${status}`));
        return;
      }

      resolve(results || []);
    });
  });

  return places.slice(0, 8).map((p) => ({
    place_id: p.place_id || "",
    name: p.name || "",
    address: p.formatted_address || p.vicinity || "",
    rating: p.rating ?? null,
    user_ratings_total: p.user_ratings_total || 0,
    types: p.types || [],
    photo_reference: p.photos?.[0]?.getUrl({ maxWidth: 800 }) || null,
    location: getLocation(p.geometry),
    price_level: p.price_level ?? null,
  }));
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetailsResult> {
  const service = await getPlacesService();

  const p = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
    service.getDetails(
      {
        placeId,
        language: "pt-BR",
        fields: [
          "place_id",
          "name",
          "formatted_address",
          "formatted_phone_number",
          "website",
          "rating",
          "user_ratings_total",
          "price_level",
          "types",
          "geometry",
          "photos",
          "editorial_summary",
          "reviews",
        ],
      },
      (result, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !result) {
          reject(new Error(`Place details failed: ${status}`));
          return;
        }
        resolve(result);
      }
    );
  });

  const photos: PlacePhoto[] = (p.photos || []).slice(0, 10).map((ph) => ({
    photo_reference: ph.getUrl({ maxWidth: 1600 }),
    width: ph.width || 800,
    height: ph.height || 600,
  }));

  return {
    place_id: p.place_id || placeId,
    name: p.name || "",
    address: p.formatted_address || "",
    phone: p.formatted_phone_number || null,
    website: p.website || null,
    rating: p.rating ?? null,
    user_ratings_total: p.user_ratings_total || 0,
    price_level: p.price_level ?? null,
    types: p.types || [],
    location: getLocation(p.geometry),
    photos,
    editorial_summary: (p as any).editorial_summary?.overview || null,
    reviews: (p.reviews || []).slice(0, 3).map((r) => ({
      author: r.author_name || "",
      rating: r.rating || 0,
      text: r.text || "",
      time: r.relative_time_description || "",
    })),
  };
}

export function getPhotoUrl(photoReference: string, maxWidth = 800): string {
  if (/^https?:\/\//i.test(photoReference)) return photoReference;
  return `https://places.googleapis.com/v1/${photoReference}/media?maxWidthPx=${maxWidth}&key=${API_KEY}`;
}
