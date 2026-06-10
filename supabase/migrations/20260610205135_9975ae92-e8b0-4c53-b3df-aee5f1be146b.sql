CREATE TABLE IF NOT EXISTS public.portal_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'global' UNIQUE,
  show_financial boolean NOT NULL DEFAULT true,
  show_checklist boolean NOT NULL DEFAULT true,
  show_documents boolean NOT NULL DEFAULT true,
  auto_publish boolean NOT NULL DEFAULT false,
  cover_strategy text NOT NULL DEFAULT 'hybrid',
  auto_enrich boolean NOT NULL DEFAULT true,
  ai_welcome boolean NOT NULL DEFAULT true,
  default_welcome_message text NOT NULL DEFAULT 'Bem-vindo ao seu portal de viagens! 🌍',
  support_whatsapp text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_settings TO anon, authenticated;
GRANT ALL ON public.portal_settings TO service_role;

ALTER TABLE public.portal_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portal_settings_all_access" ON public.portal_settings;
CREATE POLICY "portal_settings_all_access" ON public.portal_settings FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_portal_settings_updated_at ON public.portal_settings;
CREATE TRIGGER trg_portal_settings_updated_at
  BEFORE UPDATE ON public.portal_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.portal_settings (scope) VALUES ('global')
ON CONFLICT (scope) DO NOTHING;