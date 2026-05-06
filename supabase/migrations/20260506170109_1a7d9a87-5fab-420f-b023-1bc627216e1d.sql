-- ═══════════════════════════════════════════════════════════
-- WhatsApp Status (Stories) infrastructure
-- ═══════════════════════════════════════════════════════════

CREATE TABLE public.whatsapp_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  contact_name text,
  is_mine boolean NOT NULL DEFAULT false,
  status_type text NOT NULL CHECK (status_type IN ('text', 'image', 'video')),
  text_content text,
  media_url text,
  media_thumbnail_url text,
  media_mimetype text,
  caption text,
  background_color text,
  font text,
  posted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  external_status_id text UNIQUE,
  external_zaap_id text,
  raw_payload jsonb,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_status_phone_posted ON public.whatsapp_statuses (phone, posted_at DESC);
CREATE INDEX ix_status_expires ON public.whatsapp_statuses (expires_at);
CREATE INDEX ix_status_mine_posted ON public.whatsapp_statuses (is_mine, posted_at DESC) WHERE is_mine = true;
CREATE INDEX ix_status_active ON public.whatsapp_statuses (phone, expires_at);

CREATE TABLE public.whatsapp_status_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_id uuid NOT NULL REFERENCES public.whatsapp_statuses(id) ON DELETE CASCADE,
  viewer_phone text NOT NULL,
  viewer_name text,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (status_id, viewer_phone)
);

CREATE INDEX ix_status_views_status ON public.whatsapp_status_views (status_id);

CREATE TABLE public.whatsapp_status_seen_by_me (
  status_id uuid PRIMARY KEY REFERENCES public.whatsapp_statuses(id) ON DELETE CASCADE,
  seen_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Trigger: expira em 24h após posted_at ───
CREATE OR REPLACE FUNCTION public.set_status_expires_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.expires_at = NEW.posted_at + interval '24 hours';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_status_expires
BEFORE INSERT ON public.whatsapp_statuses
FOR EACH ROW EXECUTE FUNCTION public.set_status_expires_at();

-- ─── Trigger: mantém view_count denormalizado ───
CREATE OR REPLACE FUNCTION public.update_status_view_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.whatsapp_statuses
  SET view_count = (SELECT COUNT(*) FROM public.whatsapp_status_views WHERE status_id = NEW.status_id)
  WHERE id = NEW.status_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_status_view_count
AFTER INSERT ON public.whatsapp_status_views
FOR EACH ROW EXECUTE FUNCTION public.update_status_view_count();

-- ─── RLS: liberada para authenticated (padrão WhatsApp do projeto) ───
ALTER TABLE public.whatsapp_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_status_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_status_seen_by_me ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth all on whatsapp_statuses" ON public.whatsapp_statuses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth all on whatsapp_status_views" ON public.whatsapp_status_views
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth all on whatsapp_status_seen_by_me" ON public.whatsapp_status_seen_by_me
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Service role (edge functions) também precisa
CREATE POLICY "service all on whatsapp_statuses" ON public.whatsapp_statuses
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service all on whatsapp_status_views" ON public.whatsapp_status_views
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service all on whatsapp_status_seen_by_me" ON public.whatsapp_status_seen_by_me
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── Realtime ───
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_statuses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_status_views;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_status_seen_by_me;

-- ─── Storage bucket público para mídias dos status ───
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-status', 'whatsapp-status', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read whatsapp-status"
ON storage.objects FOR SELECT
USING (bucket_id = 'whatsapp-status');

CREATE POLICY "Authenticated upload whatsapp-status"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'whatsapp-status');

CREATE POLICY "Service write whatsapp-status"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'whatsapp-status') WITH CHECK (bucket_id = 'whatsapp-status');