
-- Enrich ai_strategy_knowledge with taxonomy, governance, and relationship fields
ALTER TABLE public.ai_strategy_knowledge
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS function_area text DEFAULT 'geral',
  ADD COLUMN IF NOT EXISTS origin_type text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS confidence integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS estimated_impact text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS context text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS related_rule_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Add comment for documentation
COMMENT ON COLUMN public.ai_strategy_knowledge.origin_type IS 'manual | learned | validated | suggested | rejected | observing';
COMMENT ON COLUMN public.ai_strategy_knowledge.status IS 'active | pending | validated | rejected | observing';
COMMENT ON COLUMN public.ai_strategy_knowledge.function_area IS 'Area funcional: interpretacao_conversa, proposta_ia, sugestao_voos, sugestao_hoteis, estrategia_comercial, follow_up, pricing, perfil_cliente, jornada_cliente, aprendizado_operacional, etc.';

-- Enrich ai_learned_patterns with taxonomy fields
ALTER TABLE public.ai_learned_patterns
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS function_area text DEFAULT 'geral',
  ADD COLUMN IF NOT EXISTS subcategory text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS related_pattern_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS origin_context text DEFAULT NULL;

COMMENT ON COLUMN public.ai_learned_patterns.origin_context IS 'Context where the pattern was detected (e.g., destination, profile, funnel stage)';
