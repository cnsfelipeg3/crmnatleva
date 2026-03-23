
CREATE TABLE public.proposal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  theme_config JSONB DEFAULT '{}'::jsonb,
  sections JSONB DEFAULT '[]'::jsonb,
  font_heading TEXT DEFAULT 'Playfair Display',
  font_body TEXT DEFAULT 'Inter',
  primary_color TEXT DEFAULT '#1a472a',
  accent_color TEXT DEFAULT '#d4a853',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view templates"
  ON public.proposal_templates FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert templates"
  ON public.proposal_templates FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update templates"
  ON public.proposal_templates FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete templates"
  ON public.proposal_templates FOR DELETE
  TO authenticated USING (true);

-- Seed some default templates
INSERT INTO public.proposal_templates (name, description, primary_color, accent_color, font_heading, font_body, is_default, theme_config, sections) VALUES
('Elegância Clássica', 'Template sofisticado com tons escuros e dourado, ideal para viagens de luxo', '#1a2332', '#c9a84c', 'Playfair Display', 'Inter', true, '{"style":"classic","backgroundPattern":"none"}', '[{"type":"hero","enabled":true},{"type":"destinations","enabled":true},{"type":"flights","enabled":true},{"type":"hotels","enabled":true},{"type":"experiences","enabled":true},{"type":"pricing","enabled":true}]'),
('Tropical Vibrante', 'Cores vivas e layout dinâmico para destinos de praia e aventura', '#0e7c61', '#f59e0b', 'Montserrat', 'Open Sans', false, '{"style":"tropical","backgroundPattern":"waves"}', '[{"type":"hero","enabled":true},{"type":"destinations","enabled":true},{"type":"flights","enabled":true},{"type":"hotels","enabled":true},{"type":"experiences","enabled":true},{"type":"pricing","enabled":true}]'),
('Minimalista Premium', 'Design limpo e espaçoso com foco nas imagens dos destinos', '#111827', '#6366f1', 'DM Sans', 'DM Sans', false, '{"style":"minimal","backgroundPattern":"none"}', '[{"type":"hero","enabled":true},{"type":"destinations","enabled":true},{"type":"flights","enabled":true},{"type":"hotels","enabled":true},{"type":"experiences","enabled":true},{"type":"pricing","enabled":true}]'),
('Romance & Lua de Mel', 'Template romântico com tons rosé e tipografia elegante', '#4a1942', '#e8a0bf', 'Cormorant Garamond', 'Lato', false, '{"style":"romantic","backgroundPattern":"petals"}', '[{"type":"hero","enabled":true},{"type":"destinations","enabled":true},{"type":"flights","enabled":true},{"type":"hotels","enabled":true},{"type":"experiences","enabled":true},{"type":"pricing","enabled":true}]');
