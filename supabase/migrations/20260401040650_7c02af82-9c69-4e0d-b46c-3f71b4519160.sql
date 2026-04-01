CREATE TABLE public.chameleon_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  profile_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  debrief JSONB,
  agents_tested TEXT[] NOT NULL DEFAULT '{}',
  score_final NUMERIC,
  max_exchanges INTEGER NOT NULL DEFAULT 20,
  status TEXT NOT NULL DEFAULT 'active',
  session_type TEXT NOT NULL DEFAULT 'random',
  user_id UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chameleon_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage chameleon sessions"
  ON public.chameleon_sessions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);