
-- AI Team persistence tables

-- Agent configurations & XP
CREATE TABLE public.ai_team_agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🤖',
  role TEXT NOT NULL,
  squad_id TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  max_xp INTEGER NOT NULL DEFAULT 1000,
  skills TEXT[] NOT NULL DEFAULT '{}',
  persona TEXT,
  status TEXT NOT NULL DEFAULT 'idle',
  success_rate NUMERIC(5,2) DEFAULT 0,
  tasks_today INTEGER DEFAULT 0,
  behavior_prompt TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agent missions
CREATE TABLE public.ai_team_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES public.ai_team_agents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'suggested',
  context TEXT,
  xp_reward INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Evolution improvements
CREATE TABLE public.ai_team_improvements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES public.ai_team_agents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'pending',
  impact_score NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by TEXT
);

-- Lab test results
CREATE TABLE public.ai_team_lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES public.ai_team_agents(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL,
  profile_name TEXT NOT NULL,
  response TEXT,
  aderencia INTEGER DEFAULT 0,
  sentimento INTEGER DEFAULT 0,
  clareza INTEGER DEFAULT 0,
  proatividade INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  response_time_ms INTEGER DEFAULT 0,
  ai_evaluation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agent activity log
CREATE TABLE public.ai_team_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES public.ai_team_agents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'low',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_team_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_team_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_team_improvements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_team_lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_team_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policies (authenticated users can manage)
CREATE POLICY "Authenticated users can manage ai_team_agents" ON public.ai_team_agents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage ai_team_missions" ON public.ai_team_missions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage ai_team_improvements" ON public.ai_team_improvements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage ai_team_lab_results" ON public.ai_team_lab_results FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage ai_team_activity_log" ON public.ai_team_activity_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
