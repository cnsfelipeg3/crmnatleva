import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ResolvedPlace {
  place_id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  user_ratings_total: number;
  photo_reference: string | null;
  types: string[];
  price_level: number | null;
  business_status: string | null;
  google_maps_url: string;
  resolved: true;
  fromCache?: boolean;
}

export interface UnresolvedPlace {
  resolved: false;
  name: string;
}

export type Place = ResolvedPlace | UnresolvedPlace;

/**
 * Resolve um nome de lugar via Google Places, com cache 30d em DB.
 * Lazy: só dispara quando enabled=true (visível no viewport).
 */
export function useConciergePlace(name: string, city?: string, enabled = true) {
  return useQuery({
    queryKey: ["concierge-place", name, city ?? null],
    queryFn: async (): Promise<Place> => {
      const { data, error } = await supabase.functions.invoke(
        "concierge-resolve-place",
        { body: { name, city } },
      );
      if (error) throw new Error(error.message);
      if (!data?.resolved) return { resolved: false, name };
      return { ...data, resolved: true };
    },
    enabled: enabled && !!name && name.length >= 2,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
  });
}
