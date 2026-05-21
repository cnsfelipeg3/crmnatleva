import { supabase } from "@/integrations/supabase/client";

export interface ConvertProposalResult {
  sale_id: string;
  already_existed: boolean;
}

export async function convertProposalToSale(
  proposalId: string,
): Promise<ConvertProposalResult> {
  const { data, error } = await supabase.functions.invoke<
    ConvertProposalResult & { error?: string }
  >("proposal-to-sale", {
    body: { proposal_id: proposalId },
  });

  if (error) throw new Error(error.message || "Falha ao converter proposta");
  if (!data || (data as any).error) {
    throw new Error((data as any)?.error || "Falha ao converter proposta");
  }
  return data as ConvertProposalResult;
}
