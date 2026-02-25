
-- AI Knowledge Base: stores uploaded files metadata
CREATE TABLE public.ai_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'geral',
  file_name TEXT,
  file_url TEXT,
  file_type TEXT,
  content_text TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage ai_knowledge_base" ON public.ai_knowledge_base
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- AI Config: stores AI personality and strategic config
CREATE TABLE public.ai_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT NOT NULL DEFAULT '',
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage ai_config" ON public.ai_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert default config values
INSERT INTO public.ai_config (config_key, config_value) VALUES
  ('tom_comunicacao', 'Profissional e estratégico, como um consultor sênior'),
  ('nivel_formalidade', 'Alto — comunicação premium e executiva'),
  ('prioridade_estrategica', 'Margem acima de volume. Qualidade > Quantidade.'),
  ('cultura_organizacional', 'A NatLeva é uma agência de turismo premium em crescimento. Priorizamos experiências personalizadas e atendimento de alto padrão.'),
  ('diretrizes_internas', 'Sempre pensar como empresa em crescimento. Foco em retenção de VIPs e aumento de margem.'),
  ('nivel_detalhamento', 'Detalhado — com planos de ação práticos, números e prazos'),
  ('perfil_usuario', 'CEO / Gestor Estratégico'),
  ('instrucoes_customizadas', '');

-- AI Chat History: persists conversations
CREATE TABLE public.ai_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  conversation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  title TEXT DEFAULT 'Nova conversa',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own chat history" ON public.ai_chat_history
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Storage bucket for knowledge base files
INSERT INTO storage.buckets (id, name, public) VALUES ('ai-knowledge-base', 'ai-knowledge-base', false);

CREATE POLICY "Authenticated can upload to ai-knowledge-base" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ai-knowledge-base');

CREATE POLICY "Authenticated can read ai-knowledge-base" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'ai-knowledge-base');

CREATE POLICY "Authenticated can delete from ai-knowledge-base" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'ai-knowledge-base');
