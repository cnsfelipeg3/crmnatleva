
-- Simulation runs
CREATE TABLE public.simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_leads INTEGER NOT NULL DEFAULT 0,
  leads_closed INTEGER NOT NULL DEFAULT 0,
  leads_lost INTEGER NOT NULL DEFAULT 0,
  conversion_rate NUMERIC(5,2) DEFAULT 0,
  total_revenue NUMERIC(12,2) DEFAULT 0,
  score_geral INTEGER DEFAULT 0,
  debrief JSONB,
  duration_seconds INTEGER DEFAULT 0
);

-- Simulated lead entities
CREATE TABLE public.simulated_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  simulation_id UUID NOT NULL REFERENCES public.simulations(id) ON DELETE CASCADE,
  lead_name TEXT NOT NULL,
  profile_type TEXT NOT NULL,
  destino TEXT,
  orcamento TEXT,
  pax INTEGER DEFAULT 1,
  ticket NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ativo',
  etapa_atual TEXT DEFAULT 'recepcao',
  sentimento_score INTEGER DEFAULT 50,
  paciencia INTEGER DEFAULT 80,
  estado_emocional TEXT DEFAULT 'neutro',
  motivo_perda TEXT,
  score_humanizacao INTEGER DEFAULT 0,
  score_eficacia INTEGER DEFAULT 0,
  score_tecnica INTEGER DEFAULT 0,
  context_summary JSONB DEFAULT '{}'::jsonb,
  total_messages INTEGER DEFAULT 0,
  total_chunks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conversation chunks (blocks of messages with summaries)
CREATE TABLE public.conversation_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.simulated_leads(id) ON DELETE CASCADE,
  simulation_id UUID NOT NULL REFERENCES public.simulations(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  token_estimate INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Simulation events (event-driven log)
CREATE TABLE public.simulation_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  simulation_id UUID NOT NULL REFERENCES public.simulations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.simulated_leads(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  agent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Metrics snapshots (periodic aggregations)
CREATE TABLE public.metrics_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  simulation_id UUID NOT NULL REFERENCES public.simulations(id) ON DELETE CASCADE,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  leads_by_stage JSONB DEFAULT '{}'::jsonb,
  active_leads INTEGER DEFAULT 0,
  closed_leads INTEGER DEFAULT 0,
  lost_leads INTEGER DEFAULT 0,
  avg_sentimento INTEGER DEFAULT 50,
  avg_humanizacao INTEGER DEFAULT 0,
  avg_eficacia INTEGER DEFAULT 0,
  avg_tecnica INTEGER DEFAULT 0,
  bottleneck_stage TEXT,
  revenue_so_far NUMERIC(12,2) DEFAULT 0
);

-- Indexes for performance
CREATE INDEX idx_simulated_leads_sim ON public.simulated_leads(simulation_id);
CREATE INDEX idx_conversation_chunks_lead ON public.conversation_chunks(lead_id);
CREATE INDEX idx_conversation_chunks_sim ON public.conversation_chunks(simulation_id);
CREATE INDEX idx_simulation_events_sim ON public.simulation_events(simulation_id);
CREATE INDEX idx_simulation_events_type ON public.simulation_events(event_type);
CREATE INDEX idx_metrics_snapshots_sim ON public.metrics_snapshots(simulation_id);

-- RLS (open for now since simulations are internal tool)
ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulated_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access" ON public.simulations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.simulated_leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.conversation_chunks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.simulation_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON public.metrics_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);
