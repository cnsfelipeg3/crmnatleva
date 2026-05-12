import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProposalsPulseTopEngaged = {
  id: string;
  title: string;
  client_name: string | null;
  total_value: number | null;
  slug: string;
  total_active_seconds: number;
  viewers_count: number;
  whatsapp_clicked: boolean;
  cta_clicked: boolean;
  shared: boolean;
};

export type ProposalsPulseData = {
  window_hours: number;
  generated_at: string;
  margin_used: number;
  sent_count: number;
  total_value: number;
  avg_ticket: number;
  estimated_profit: number;
  proposals_opened: number;
  unique_viewers: number;
  open_rate: number;
  avg_active_seconds: number;
  high_engagement_count: number;
  shares_count: number;
  whatsapp_clicks: number;
  cta_clicks: number;
  top_engaged: ProposalsPulseTopEngaged[];
};

export function useProposalsPulse(hours: number = 24) {
  return useQuery({
    queryKey: ["proposals-pulse", hours],
    queryFn: async (): Promise<ProposalsPulseData> => {
      const { data, error } = await supabase.rpc("proposals_pulse" as any, {
        p_hours: hours,
      });
      if (error) throw error;
      return data as unknown as ProposalsPulseData;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}
