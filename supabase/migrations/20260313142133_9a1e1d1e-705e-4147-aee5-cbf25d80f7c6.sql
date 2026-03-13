
-- Proposals table
CREATE TABLE public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL,
  client_name TEXT,
  origin TEXT,
  destinations TEXT[],
  travel_start_date DATE,
  travel_end_date DATE,
  passenger_count INTEGER DEFAULT 1,
  consultant_name TEXT,
  intro_text TEXT,
  cover_image_url TEXT,
  total_value NUMERIC,
  value_per_person NUMERIC,
  payment_conditions JSONB DEFAULT '[]'::jsonb,
  views_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Proposal items (flights, hotels, experiences, destinations)
CREATE TABLE public.proposal_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, -- 'destination', 'flight', 'hotel', 'experience'
  position INTEGER NOT NULL DEFAULT 0,
  title TEXT,
  description TEXT,
  image_url TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Proposal views tracking
CREATE TABLE public.proposal_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_seconds INTEGER,
  device_type TEXT,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_views ENABLE ROW LEVEL SECURITY;

-- Proposals: authenticated users can CRUD
CREATE POLICY "Authenticated users can manage proposals"
  ON public.proposals FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Proposals: public can read by slug (for public links)
CREATE POLICY "Public can read proposals by slug"
  ON public.proposals FOR SELECT TO anon
  USING (status IN ('sent', 'negotiation', 'approved'));

-- Proposal items: authenticated can manage
CREATE POLICY "Authenticated users can manage proposal items"
  ON public.proposal_items FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Proposal items: public can read if proposal is public
CREATE POLICY "Public can read proposal items"
  ON public.proposal_items FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id = proposal_id AND p.status IN ('sent', 'negotiation', 'approved')
  ));

-- Proposal views: anyone can insert (tracking)
CREATE POLICY "Anyone can insert proposal views"
  ON public.proposal_views FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Proposal views: authenticated can read
CREATE POLICY "Authenticated users can read proposal views"
  ON public.proposal_views FOR SELECT TO authenticated
  USING (true);

-- Index for slug lookups
CREATE INDEX idx_proposals_slug ON public.proposals(slug);
CREATE INDEX idx_proposal_items_proposal_id ON public.proposal_items(proposal_id);
CREATE INDEX idx_proposal_views_proposal_id ON public.proposal_views(proposal_id);
