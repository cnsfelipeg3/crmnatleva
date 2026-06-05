
CREATE TABLE IF NOT EXISTS public.conversation_tag_catalog (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#6366f1',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_tag_catalog TO authenticated;
GRANT ALL ON public.conversation_tag_catalog TO service_role;

ALTER TABLE public.conversation_tag_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tag_catalog_select_authenticated"
  ON public.conversation_tag_catalog FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "tag_catalog_insert_admin"
  ON public.conversation_tag_catalog FOR INSERT
  TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "tag_catalog_update_admin"
  ON public.conversation_tag_catalog FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "tag_catalog_delete_admin"
  ON public.conversation_tag_catalog FOR DELETE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed with common tags + existing distinct tags from conversations
INSERT INTO public.conversation_tag_catalog (name, color) VALUES
  ('Cliente', '#10b981'),
  ('Lead', '#3b82f6'),
  ('VIP', '#f59e0b'),
  ('Prospect', '#8b5cf6'),
  ('Pós-venda', '#14b8a6')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.conversation_tag_catalog (name, color)
SELECT DISTINCT unnest(tags), '#6b7280'
FROM public.conversations
WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
ON CONFLICT (name) DO NOTHING;
