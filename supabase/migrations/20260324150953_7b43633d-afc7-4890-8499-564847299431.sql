
CREATE TABLE public.ai_team_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  entity_name text,
  agent_id text,
  agent_name text,
  description text NOT NULL,
  details jsonb,
  performed_by text,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_team_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ai_team_audit_log"
  ON public.ai_team_audit_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert ai_team_audit_log"
  ON public.ai_team_audit_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_ai_team_audit_log_created ON public.ai_team_audit_log(created_at DESC);
CREATE INDEX idx_ai_team_audit_log_agent ON public.ai_team_audit_log(agent_id);
CREATE INDEX idx_ai_team_audit_log_entity ON public.ai_team_audit_log(entity_type);
