CREATE TABLE IF NOT EXISTS public.prateleira_viewer_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id    uuid REFERENCES public.prateleira_product_viewers(id) ON DELETE CASCADE,
  product_id   uuid NOT NULL REFERENCES public.experience_products(id) ON DELETE CASCADE,
  email        text NOT NULL,
  event_type   text NOT NULL,
  section      text,
  target       text,
  metadata     jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pve_product_email_ts
  ON public.prateleira_viewer_events (product_id, email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pve_viewer_ts
  ON public.prateleira_viewer_events (viewer_id, created_at DESC);

ALTER TABLE public.prateleira_viewer_events DISABLE ROW LEVEL SECURITY;