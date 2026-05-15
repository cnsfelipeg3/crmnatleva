CREATE TABLE IF NOT EXISTS public.megafone_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  variant text NOT NULL DEFAULT 'info',
  icon text,
  link_url text,
  link_label text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  dismissible boolean NOT NULL DEFAULT true,
  position text NOT NULL DEFAULT 'top',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_megafone_active_window
  ON public.megafone_banners (is_active, starts_at, ends_at);

ALTER TABLE public.megafone_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "megafone_select_all" ON public.megafone_banners FOR SELECT USING (true);
CREATE POLICY "megafone_insert_all" ON public.megafone_banners FOR INSERT WITH CHECK (true);
CREATE POLICY "megafone_update_all" ON public.megafone_banners FOR UPDATE USING (true);
CREATE POLICY "megafone_delete_all" ON public.megafone_banners FOR DELETE USING (true);

CREATE TRIGGER trg_megafone_updated
  BEFORE UPDATE ON public.megafone_banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();