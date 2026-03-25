import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AgencyConfig {
  // Identity
  agency_name: string;
  segment: string;
  slogan: string;
  tom_comunicacao: string;
  diretrizes_comunicacao: string;
  cultura_organizacional: string;
  diretrizes_internas: string;
  prioridade_estrategica: string;
  // Model
  default_provider: string;
  default_model: string;
  // Operations
  horario_operacao: string;
  max_response_time: string;
  criterios_escalonamento: string;
  auto_approve_low_risk: string;
  night_mode: string;
  // Safety
  vigil_gate: string;
  bloqueio_dados_sensiveis: string;
  auditoria_orion: string;
  limite_acoes_agente: string;
  sandbox_novos_agentes: string;
  // Tone configs
  ai_tone: string;
  ai_formality: string;
  ai_guidelines: string;
  ai_forbidden: string;
  instrucoes_customizadas: string;
  nivel_detalhamento: string;
  nivel_formalidade: string;
  perfil_usuario: string;
}

const DEFAULTS: AgencyConfig = {
  agency_name: "NatLeva Viagens",
  segment: "Viagens Premium",
  slogan: "Transformando sonhos em experiências inesquecíveis",
  tom_comunicacao: "Profissional e estratégico, como um consultor sênior",
  diretrizes_comunicacao: `1. Sempre cumprimentar pelo nome\n2. Usar emojis com moderação (máx. 2 por mensagem)\n3. Nunca usar gírias ou linguagem informal excessiva\n4. Sempre fechar com CTA claro\n5. Mencionar exclusividade quando aplicável\n6. Adaptar tom ao perfil do cliente`,
  cultura_organizacional: "A NatLeva é uma agência de turismo premium em crescimento. Priorizamos experiências personalizadas e atendimento de alto padrão.",
  diretrizes_internas: "Sempre pensar como empresa em crescimento. Foco em retenção de VIPs e aumento de margem.",
  prioridade_estrategica: "Margem acima de volume. Qualidade > Quantidade.",
  default_provider: "anthropic",
  default_model: "claude-sonnet-4-20250514",
  horario_operacao: "08:00 - 22:00",
  max_response_time: "30",
  criterios_escalonamento: "Escalonar quando: score de confiança < 60%, objeção não mapeada, solicitação de cancelamento, cliente irritado, ou mencionar reclamação em redes sociais.",
  auto_approve_low_risk: "false",
  night_mode: "true",
  vigil_gate: "true",
  bloqueio_dados_sensiveis: "true",
  auditoria_orion: "true",
  limite_acoes_agente: "true",
  sandbox_novos_agentes: "false",
  ai_tone: "premium",
  ai_formality: "informal",
  ai_guidelines: "",
  ai_forbidden: "",
  instrucoes_customizadas: "",
  nivel_detalhamento: "Detalhado — com planos de ação práticos, números e prazos",
  nivel_formalidade: "Alto — comunicação premium e executiva",
  perfil_usuario: "CEO / Gestor Estratégico",
};

const QUERY_KEY = ["agency_config"];

export function useAgencyConfig() {
  const queryClient = useQueryClient();

  const query = useQuery<AgencyConfig>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_config")
        .select("config_key, config_value");
      if (error) throw error;

      const map: Record<string, string> = {};
      (data || []).forEach((row: any) => {
        map[row.config_key] = row.config_value;
      });

      return {
        ...DEFAULTS,
        ...Object.fromEntries(
          Object.keys(DEFAULTS).map(key => [key, map[key] ?? (DEFAULTS as any)[key]])
        ),
      } as AgencyConfig;
    },
    staleTime: 3000,
    refetchInterval: 5000,
  });

  const mutation = useMutation({
    mutationFn: async (updates: Partial<AgencyConfig>) => {
      const entries = Object.entries(updates).filter(([, v]) => v !== undefined);
      for (const [key, value] of entries) {
        const { error } = await supabase
          .from("ai_config")
          .upsert({ config_key: key, config_value: String(value) }, { onConflict: "config_key" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Configurações salvas e sincronizadas em todo o sistema!");
    },
    onError: (e: any) => {
      toast.error("Erro ao salvar: " + e.message);
    },
  });

  return {
    config: query.data ?? DEFAULTS,
    isLoading: query.isLoading,
    saveConfig: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
