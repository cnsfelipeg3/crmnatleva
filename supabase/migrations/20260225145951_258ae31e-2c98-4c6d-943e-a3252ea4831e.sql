
-- Flow Builder tables
CREATE TABLE public.automation_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  version integer NOT NULL DEFAULT 1,
  is_template boolean NOT NULL DEFAULT false,
  template_category text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.automation_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid NOT NULL REFERENCES public.automation_flows(id) ON DELETE CASCADE,
  node_type text NOT NULL,
  label text NOT NULL DEFAULT '',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  position_x double precision NOT NULL DEFAULT 0,
  position_y double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.automation_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid NOT NULL REFERENCES public.automation_flows(id) ON DELETE CASCADE,
  source_node_id uuid NOT NULL REFERENCES public.automation_nodes(id) ON DELETE CASCADE,
  target_node_id uuid NOT NULL REFERENCES public.automation_nodes(id) ON DELETE CASCADE,
  source_handle text,
  target_handle text,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.automation_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid NOT NULL REFERENCES public.automation_flows(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id),
  status text NOT NULL DEFAULT 'running',
  trace jsonb NOT NULL DEFAULT '[]'::jsonb,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error_message text
);

-- RLS
ALTER TABLE public.automation_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage automation_flows" ON public.automation_flows FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage automation_nodes" ON public.automation_nodes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage automation_edges" ON public.automation_edges FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage automation_executions" ON public.automation_executions FOR ALL TO authenticated USING (true) WITH CHECK (true);
