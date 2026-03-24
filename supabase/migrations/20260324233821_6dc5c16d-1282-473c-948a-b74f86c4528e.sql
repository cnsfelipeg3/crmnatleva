
CREATE TABLE public.simulation_observations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  simulation_id TEXT,
  lead_id TEXT,
  lead_name TEXT,
  agent_id TEXT,
  agent_name TEXT,
  scope TEXT NOT NULL DEFAULT 'session' CHECK (scope IN ('message', 'session')),
  message_content TEXT,
  message_role TEXT,
  observation_text TEXT NOT NULL,
  converted_to TEXT,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.simulation_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage observations"
ON public.simulation_observations
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
