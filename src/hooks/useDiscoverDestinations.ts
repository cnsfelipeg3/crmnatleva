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
}

export interface DiscoveredDestination {
  iata: string;
  city: string;
  country: string;
  region: string;
  tags: string[];
  hero_image_url?: string;
  description?: string;
  visa_required: boolean;
  avg_trip_days: number;
  minPrice: number;
  sampleFlight: any;
  fromCache: boolean;
  fitsBudget: boolean;
}

export interface DiscoverResponse {
  success: boolean;
  extracted: {
    budget: number | null;
    origin: string;
    monthOffset: number;
    durationDays: number;
    paxAdults: number;
    mood: string | null;
    regions: string[];
  };
  period: { month: number; year: number; day1: string; returnDate: string };
  totalCandidates: number;
  totalWithFlights: number;
  totalFitsBudget: number;
  results: DiscoveredDestination[];
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
