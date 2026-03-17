
-- Pipeline rebuild tracking
CREATE TABLE public.pipeline_rebuild_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number integer NOT NULL,
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  total_processed integer DEFAULT 0,
  total_updated integer DEFAULT 0,
  total_errors integer DEFAULT 0,
  notes text,
  detail jsonb DEFAULT '[]'::jsonb
);

ALTER TABLE public.pipeline_rebuild_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read rebuild logs"
  ON public.pipeline_rebuild_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can manage rebuild logs"
  ON public.pipeline_rebuild_log FOR ALL USING (true) WITH CHECK (true);
