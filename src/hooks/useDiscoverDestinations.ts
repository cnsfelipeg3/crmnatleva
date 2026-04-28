import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DiscoverInput {
  naturalQuery?: string;
  budget?: number;
  origin?: string;
  monthOffset?: number;
  durationDays?: number;
  paxAdults?: number;
  mood?: string;
  regions?: string[];
  countries?: string[];
  cities?: string[];
  excludeCountries?: string[];
}

export interface DiscoveredDestination {
  iata: string;
  city: string;
  country: string;
  country_code?: string;
  region: string;
  tags: string[];
  hero_image_url?: string;
  hero_photographer?: string;
  hero_photographer_url?: string;
  description?: string;
  visa_required: boolean;
  avg_trip_days: number;
  minPrice: number;
  sampleFlight: any;
  fromCache: boolean;
  fitsBudget: boolean;
  flightDeparture?: string | null;
  flightArrival?: string | null;
  flightDuration?: string | null;
  flightStops?: number;
  flightAirline?: string | null;
  flightAirlineLogo?: string | null;
  flightLayovers?: Array<{
    id: string;
    city?: string;
    duration?: number;
    durationText?: string;
  }>;
}

export interface DiscoverExtracted {
  budget: number | null;
  origin: string;
  monthOffset: number;
  durationDays: number;
  paxAdults: number;
  mood: string | null;
  regions: string[];
  countries: string[];
  cities: string[];
  excludeCountries: string[];
}

export interface DiscoverResponse {
  success: boolean;
  extracted: DiscoverExtracted;
  period: { month: number; year: number; day1: string; returnDate: string };
  totalCandidates: number;
  totalWithFlights: number;
  totalFitsBudget: number;
  results: DiscoveredDestination[];
  cache_stats?: {
    total_checked: number;
    cache_hits: number;
    api_calls: number;
    hit_rate_percent: number;
  };
}


export function useDiscoverDestinations() {
  return useMutation({
    mutationFn: async (input: DiscoverInput): Promise<DiscoverResponse> => {
      const { data, error } = await supabase.functions.invoke("gflights-discover", { body: input });
      if (error) throw new Error(error.message || "Erro na descoberta");
      if (data?.error) throw new Error(data.message || data.error);
      return data as DiscoverResponse;
    },
  });
}
