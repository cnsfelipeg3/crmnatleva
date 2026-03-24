import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GlobalRule {
  id: string;
  title: string;
  rule: string;
  category: string;
  priority: number;
  is_active: boolean;
  function_area: string | null;
  estimated_impact: string | null;
}

/**
 * Fetches all active global rules from ai_strategy_knowledge.
 * refetchInterval ensures any CRUD on the rules page is reflected within 5s.
 */
export function useGlobalRules() {
  return useQuery<GlobalRule[]>({
    queryKey: ["global_rules_active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_strategy_knowledge")
        .select("id, title, rule, category, priority, is_active, function_area, estimated_impact")
        .eq("is_active", true)
        .order("priority", { ascending: false });
      return (data as GlobalRule[]) || [];
    },
    refetchInterval: 5000, // auto-sync every 5s
    staleTime: 2000,
  });
}

/**
 * Builds a prompt block from global rules to inject into agent prompts.
 */
export function buildGlobalRulesBlock(rules: GlobalRule[]): string {
  if (!rules || rules.length === 0) return "";
  const grouped: Record<string, GlobalRule[]> = {};
  for (const r of rules) {
    const cat = r.category || "geral";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(r);
  }
  const sections = Object.entries(grouped).map(([cat, items]) => {
    const lines = items.map(r => `- [${(r.estimated_impact || "médio").toUpperCase()}] ${r.title}: ${r.rule}`).join("\n");
    return `[${cat}]\n${lines}`;
  });
  return `\n=== REGRAS GLOBAIS DA AGÊNCIA (OBRIGATÓRIAS — aplicam-se a TODOS os agentes) ===\n${sections.join("\n\n")}`;
}
