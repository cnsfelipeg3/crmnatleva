
-- Assign skills to agents based on current ai_team_agents.skills arrays
-- Maya
INSERT INTO public.agent_skill_assignments (agent_id, skill_id)
SELECT 'maya', s.id FROM public.agent_skills s WHERE s.name IN ('Rapport genuíno', 'Leitura emocional', 'Perguntas abertas', 'Acolhimento premium', 'Encantamento', 'Condução natural', 'Adaptação por perfil', 'Curiosidade inteligente', 'Venda invisível', 'Proibição do uso de travessão')
ON CONFLICT DO NOTHING;

-- Atlas
INSERT INTO public.agent_skill_assignments (agent_id, skill_id)
SELECT 'atlas', s.id FROM public.agent_skills s WHERE s.name IN ('Qualificação consultiva', 'Perguntas estratégicas', 'Scoring comportamental', 'Perfil de viajante', 'Leitura de contexto', 'Micro-validações', 'Condução natural', 'Adaptação por perfil', 'Curiosidade inteligente', 'Venda invisível', 'Venda Consultiva High-End vs. Transacional', 'Detecção de Objeções Emocionais e Climáticas', 'Análise de Sentimento e Fechamento Ativo', 'Personalização Proativa via Preferências', 'Proibição do uso de travessão')
ON CONFLICT DO NOTHING;

-- Habibi
INSERT INTO public.agent_skill_assignments (agent_id, skill_id)
SELECT 'habibi', s.id FROM public.agent_skills s WHERE s.name IN ('Storytelling de destinos', 'Venda invisível', 'Condução natural', 'Personalização Proativa via Preferências', 'Proibição do uso de travessão')
ON CONFLICT DO NOTHING;

-- Nemo
INSERT INTO public.agent_skill_assignments (agent_id, skill_id)
SELECT 'nemo', s.id FROM public.agent_skills s WHERE s.name IN ('Storytelling de destinos', 'Venda invisível', 'Condução natural', 'Personalização Proativa via Preferências', 'Proibição do uso de travessão')
ON CONFLICT DO NOTHING;

-- Dante
INSERT INTO public.agent_skill_assignments (agent_id, skill_id)
SELECT 'dante', s.id FROM public.agent_skills s WHERE s.name IN ('Storytelling de destinos', 'Venda invisível', 'Condução natural', 'Montagem narrativa', 'Personalização Proativa via Preferências', 'Proibição do uso de travessão')
ON CONFLICT DO NOTHING;

-- Luna
INSERT INTO public.agent_skill_assignments (agent_id, skill_id)
SELECT 'luna', s.id FROM public.agent_skills s WHERE s.name IN ('Montagem narrativa', 'Precificação estratégica', 'Venda invisível', 'Condução natural', 'Personalização Proativa via Preferências', 'Proibição do uso de travessão')
ON CONFLICT DO NOTHING;

-- Nero
INSERT INTO public.agent_skill_assignments (agent_id, skill_id)
SELECT 'nero', s.id FROM public.agent_skills s WHERE s.name IN ('Negociação elegante', 'Tratamento de objeções', 'Urgência natural', 'Fechamento consultivo', 'Venda invisível', 'Adaptação por perfil', 'Venda Consultiva High-End vs. Transacional', 'Proibição do uso de travessão')
ON CONFLICT DO NOTHING;

-- Iris
INSERT INTO public.agent_skill_assignments (agent_id, skill_id)
SELECT 'iris', s.id FROM public.agent_skills s WHERE s.name IN ('Pós-venda encantador', 'Rapport genuíno', 'Proibição do uso de travessão')
ON CONFLICT DO NOTHING;

-- Aegis
INSERT INTO public.agent_skill_assignments (agent_id, skill_id)
SELECT 'aegis', s.id FROM public.agent_skills s WHERE s.name IN ('Detecção de churn', 'Reativação de lead frio', 'Análise de Sentimento e Fechamento Ativo', 'Venda Consultiva High-End vs. Transacional', 'Proibição do uso de travessão')
ON CONFLICT DO NOTHING;

-- Athos
INSERT INTO public.agent_skill_assignments (agent_id, skill_id)
SELECT 'athos', s.id FROM public.agent_skills s WHERE s.name IN ('Venda Consultiva High-End vs. Transacional', 'Detecção de Objeções Emocionais e Climáticas', 'Análise de Sentimento e Fechamento Ativo', 'Personalização Proativa via Preferências', 'Proibição do uso de travessão')
ON CONFLICT DO NOTHING;

-- Zara
INSERT INTO public.agent_skill_assignments (agent_id, skill_id)
SELECT 'zara', s.id FROM public.agent_skills s WHERE s.name IN ('Concierge VIP', 'Proibição do uso de travessão')
ON CONFLICT DO NOTHING;

-- All remaining agents get at least the universal skills
INSERT INTO public.agent_skill_assignments (agent_id, skill_id)
SELECT a.id, s.id FROM (VALUES ('nath-ai'), ('hunter'), ('nurture'), ('opex'), ('sage'), ('sentinel'), ('spark'), ('vigil'), ('finx'), ('orion')) a(id)
CROSS JOIN public.agent_skills s WHERE s.name = 'Proibição do uso de travessão'
ON CONFLICT DO NOTHING;
