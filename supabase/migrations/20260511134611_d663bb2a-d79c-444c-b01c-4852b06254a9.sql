
-- Heatmap de cliques
CREATE TABLE IF NOT EXISTS public.proposal_clicks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES public.proposal_viewers(id) ON DELETE CASCADE,
  section_name text,
  target_tag text,
  target_text text,
  rel_x double precision NOT NULL,
  rel_y double precision NOT NULL,
  viewport_w integer NOT NULL,
  viewport_h integer NOT NULL,
  page_y integer,
  device_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_proposal_clicks_proposal ON public.proposal_clicks(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_clicks_section ON public.proposal_clicks(proposal_id, section_name);

ALTER TABLE public.proposal_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_insert_clicks" ON public.proposal_clicks FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_read_clicks" ON public.proposal_clicks FOR SELECT TO anon, authenticated USING (true);

-- Compartilhamentos
CREATE TABLE IF NOT EXISTS public.proposal_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  shared_by_viewer_id uuid REFERENCES public.proposal_viewers(id) ON DELETE SET NULL,
  shared_by_email text,
  shared_by_name text,
  channel text NOT NULL DEFAULT 'whatsapp',
  share_token text NOT NULL UNIQUE,
  recipient_hint text,
  open_count integer NOT NULL DEFAULT 0,
  last_opened_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_proposal_shares_proposal ON public.proposal_shares(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_shares_token ON public.proposal_shares(share_token);

ALTER TABLE public.proposal_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_insert_shares" ON public.proposal_shares FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_shares" ON public.proposal_shares FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_read_shares" ON public.proposal_shares FOR SELECT TO anon, authenticated USING (true);

-- Vincula visitante ao share que o trouxe
ALTER TABLE public.proposal_viewers
  ADD COLUMN IF NOT EXISTS referred_by_share_id uuid REFERENCES public.proposal_shares(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS share_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_seconds integer NOT NULL DEFAULT 0;
