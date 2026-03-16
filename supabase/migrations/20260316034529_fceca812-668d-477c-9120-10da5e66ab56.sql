
-- Cérebro NatLeva: central intelligence insights table
CREATE TABLE public.natleva_brain_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type text NOT NULL, -- 'hot_client','cold_client','ignored_proposal','upsell_opportunity','conversion_pattern','strategy_insight','proposal_metrics'
  category text NOT NULL DEFAULT 'geral', -- 'vendas','proposta','cliente','destino','estrategia'
  subcategory text,
  title text NOT NULL,
  description text,
  confidence numeric NOT NULL DEFAULT 0, -- 0-100
  sample_size integer NOT NULL DEFAULT 0,
  impact_level text DEFAULT 'medium', -- 'low','medium','high','critical'
  related_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  related_proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL,
  related_sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  destination text,
  strategy text,
  client_profile text,
  probability_score numeric, -- 0-100 for hot client scoring
  action_suggested text,
  action_taken boolean DEFAULT false,
  action_taken_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  tags text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  promoted_to_knowledge boolean NOT NULL DEFAULT false,
  promoted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_brain_insights_type ON public.natleva_brain_insights(insight_type);
CREATE INDEX idx_brain_insights_category ON public.natleva_brain_insights(category);
CREATE INDEX idx_brain_insights_client ON public.natleva_brain_insights(related_client_id);
CREATE INDEX idx_brain_insights_active ON public.natleva_brain_insights(is_active, created_at DESC);
CREATE INDEX idx_brain_insights_probability ON public.natleva_brain_insights(probability_score DESC NULLS LAST);

-- RLS
ALTER TABLE public.natleva_brain_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read insights" ON public.natleva_brain_insights FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert insights" ON public.natleva_brain_insights FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update insights" ON public.natleva_brain_insights FOR UPDATE TO authenticated USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.natleva_brain_insights;
