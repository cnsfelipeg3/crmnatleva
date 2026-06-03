import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AffiliateProfile = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: "pending" | "approved" | "rejected";
  approved_at: string | null;
  created_at: string;
};

export function useAffiliateProfile() {
  return useQuery({
    queryKey: ["affiliate-self-profile"],
    queryFn: async (): Promise<AffiliateProfile | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("affiliates")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as AffiliateProfile) || null;
    },
    staleTime: 60_000,
  });
}
