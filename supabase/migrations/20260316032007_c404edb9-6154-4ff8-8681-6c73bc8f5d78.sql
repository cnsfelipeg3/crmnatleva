
-- Table: ai_learning_events
-- Captures every meaningful commercial event for the AI to learn from
CREATE TABLE public.ai_learning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL DEFAULT 'proposal_created',
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  destination text,
  trip_type text,
  client_profile text,
  passenger_count integer,
  strategy_chosen text,
  flight_option_chosen text,
  hotel_option_chosen text,
  proposal_text_summary text,
  client_responded boolean,
  client_opened boolean,
  deal_won boolean,
  time_to_response_hours numeric,
  time_to_close_hours numeric,
  loss_reason text,
  observations text,
  metadata jsonb DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: ai_learned_patterns
-- Stores patterns discovered by the AI from analyzing learning events
CREATE TABLE public.ai_learned_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'geral',
  title text NOT NULL,
  description text,
  detected_rule text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0,
  sample_size integer NOT NULL DEFAULT 0,
  estimated_impact text,
  is_active boolean NOT NULL DEFAULT true,
  is_promoted boolean NOT NULL DEFAULT false,
  promoted_to_rule_id uuid REFERENCES public.ai_strategy_knowledge(id) ON DELETE SET NULL,
  data_source text DEFAULT 'proposals',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.ai_learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_learned_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage ai_learning_events" ON public.ai_learning_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage ai_learned_patterns" ON public.ai_learned_patterns FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Index for fast queries
CREATE INDEX idx_learning_events_type ON public.ai_learning_events(event_type);
CREATE INDEX idx_learning_events_strategy ON public.ai_learning_events(strategy_chosen);
CREATE INDEX idx_learning_events_destination ON public.ai_learning_events(destination);
CREATE INDEX idx_learning_events_deal_won ON public.ai_learning_events(deal_won);
CREATE INDEX idx_learned_patterns_category ON public.ai_learned_patterns(category);
