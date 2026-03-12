
CREATE TABLE public.portal_assistant_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  sale_id uuid,
  question text NOT NULL,
  answer text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_assistant_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portal users can view own logs"
  ON public.portal_assistant_logs
  FOR SELECT
  TO authenticated
  USING (client_id IN (
    SELECT client_id FROM portal_access WHERE user_id = auth.uid() AND is_active = true
  ));

CREATE POLICY "Service role can insert logs"
  ON public.portal_assistant_logs
  FOR INSERT
  TO public
  WITH CHECK (true);
