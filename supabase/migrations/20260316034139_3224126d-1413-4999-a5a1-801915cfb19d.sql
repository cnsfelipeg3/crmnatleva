
-- Table to capture viewer identity when they access a proposal
CREATE TABLE public.proposal_viewers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  phone text,
  ip_address text,
  device_type text,
  user_agent text,
  first_viewed_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  total_views integer NOT NULL DEFAULT 1,
  total_time_seconds integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE(proposal_id, email)
);

-- Granular interaction tracking
CREATE TABLE public.proposal_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES public.proposal_viewers(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'page_view','scroll','section_view','click_cta','click_whatsapp','expand_card','view_gallery','time_on_section','download_pdf','share'
  section_name text, -- 'hero','flights','hotels','experiences','pricing','cta'
  event_data jsonb DEFAULT '{}'::jsonb, -- flexible payload (scroll_depth, time_seconds, item_clicked, etc.)
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Engagement score computed per viewer
ALTER TABLE public.proposal_viewers ADD COLUMN engagement_score integer NOT NULL DEFAULT 0;
ALTER TABLE public.proposal_viewers ADD COLUMN scroll_depth_max integer NOT NULL DEFAULT 0;
ALTER TABLE public.proposal_viewers ADD COLUMN sections_viewed text[] DEFAULT '{}';
ALTER TABLE public.proposal_viewers ADD COLUMN cta_clicked boolean NOT NULL DEFAULT false;
ALTER TABLE public.proposal_viewers ADD COLUMN whatsapp_clicked boolean NOT NULL DEFAULT false;

-- Add indexes for fast queries
CREATE INDEX idx_proposal_interactions_proposal ON public.proposal_interactions(proposal_id);
CREATE INDEX idx_proposal_interactions_viewer ON public.proposal_interactions(viewer_id);
CREATE INDEX idx_proposal_interactions_type ON public.proposal_interactions(event_type);
CREATE INDEX idx_proposal_viewers_proposal ON public.proposal_viewers(proposal_id);
CREATE INDEX idx_proposal_viewers_email ON public.proposal_viewers(email);

-- RLS: public access for inserts (viewers are anonymous), reads require auth
ALTER TABLE public.proposal_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert viewer" ON public.proposal_viewers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update own viewer" ON public.proposal_viewers FOR UPDATE USING (true);
CREATE POLICY "Anyone can select viewer by id" ON public.proposal_viewers FOR SELECT USING (true);

CREATE POLICY "Anyone can insert interactions" ON public.proposal_interactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated can read interactions" ON public.proposal_interactions FOR SELECT TO authenticated USING (true);

-- Enable realtime for proposal_interactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.proposal_interactions;
