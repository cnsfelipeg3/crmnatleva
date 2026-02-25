
-- AI Integrations (provider credentials)
CREATE TABLE public.ai_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'natleva',
  api_key_encrypted TEXT,
  base_url TEXT,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  environment TEXT NOT NULL DEFAULT 'production',
  last_tested_at TIMESTAMPTZ,
  last_test_status TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage ai_integrations" ON public.ai_integrations
  FOR ALL USING (true) WITH CHECK (true);

-- AI Execution Logs
CREATE TABLE public.ai_execution_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID REFERENCES public.automation_flows(id) ON DELETE SET NULL,
  node_id UUID REFERENCES public.automation_nodes(id) ON DELETE SET NULL,
  integration_id UUID REFERENCES public.ai_integrations(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT,
  input_summary TEXT,
  output_summary TEXT,
  response_time_ms INTEGER,
  estimated_cost NUMERIC,
  error_message TEXT,
  metadata_only BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage ai_execution_logs" ON public.ai_execution_logs
  FOR ALL USING (true) WITH CHECK (true);
