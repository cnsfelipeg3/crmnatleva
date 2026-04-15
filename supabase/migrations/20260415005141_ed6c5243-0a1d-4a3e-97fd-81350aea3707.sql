-- Make agent_id nullable to allow global improvements (not tied to a specific agent)
ALTER TABLE public.ai_team_improvements ALTER COLUMN agent_id DROP NOT NULL;

-- Allow anon/service role to read improvements (needed by edge function agent-chat)
CREATE POLICY "Anyone can read approved improvements"
  ON public.ai_team_improvements FOR SELECT
  USING (true);
