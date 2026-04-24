ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS daily_schedule JSONB;

COMMENT ON COLUMN public.employees.daily_schedule IS 'Horário detalhado por dia da semana. Estrutura: { seg: { active, modality: presencial|home_office|hibrido|folga, start, end, lunch_minutes }, ter: {...}, ... }';