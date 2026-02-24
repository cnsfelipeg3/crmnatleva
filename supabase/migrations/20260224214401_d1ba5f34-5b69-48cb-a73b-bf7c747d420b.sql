
-- =============================================
-- HR MODULE - Complete Database Schema
-- =============================================

-- 1. Employees table
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  position text NOT NULL DEFAULT 'Vendas',
  department text NOT NULL DEFAULT 'Comercial',
  hire_date date NOT NULL DEFAULT CURRENT_DATE,
  contract_type text NOT NULL DEFAULT 'CLT',
  base_salary numeric DEFAULT 0,
  commission_enabled boolean DEFAULT false,
  work_regime text DEFAULT 'presencial',
  work_schedule_start time DEFAULT '09:00',
  work_schedule_end time DEFAULT '18:00',
  lunch_duration_minutes integer DEFAULT 60,
  manager_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  email text,
  phone text,
  status text NOT NULL DEFAULT 'ativo',
  avatar_url text,
  observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage employees" ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Time entries (ponto)
CREATE TABLE IF NOT EXISTS public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  clock_in timestamptz,
  lunch_out timestamptz,
  lunch_in timestamptz,
  clock_out timestamptz,
  worked_minutes integer DEFAULT 0,
  late_minutes integer DEFAULT 0,
  overtime_minutes integer DEFAULT 0,
  status text NOT NULL DEFAULT 'incompleto',
  justification text,
  device_info text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, entry_date)
);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage time_entries" ON public.time_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Time adjustment requests
CREATE TABLE IF NOT EXISTS public.time_adjustment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id uuid REFERENCES public.time_entries(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  requested_field text NOT NULL,
  requested_value timestamptz NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  reviewed_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.time_adjustment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage time_adjustment_requests" ON public.time_adjustment_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Payroll
CREATE TABLE IF NOT EXISTS public.payroll (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  reference_month date NOT NULL,
  base_salary numeric DEFAULT 0,
  commission_value numeric DEFAULT 0,
  bonus_value numeric DEFAULT 0,
  overtime_value numeric DEFAULT 0,
  deductions numeric DEFAULT 0,
  reimbursements numeric DEFAULT 0,
  advances numeric DEFAULT 0,
  net_total numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'previsto',
  paid_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage payroll" ON public.payroll FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Goals
CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  department text,
  title text NOT NULL,
  description text,
  metric_type text NOT NULL DEFAULT 'numero',
  target_value numeric NOT NULL DEFAULT 0,
  current_value numeric DEFAULT 0,
  period_start date NOT NULL,
  period_end date NOT NULL,
  bonus_on_80 numeric DEFAULT 0,
  bonus_on_100 numeric DEFAULT 0,
  bonus_on_120 numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'em_andamento',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage goals" ON public.goals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Performance reviews / KPIs
CREATE TABLE IF NOT EXISTS public.performance_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  attendance_score numeric DEFAULT 0,
  goals_score numeric DEFAULT 0,
  quality_score numeric DEFAULT 0,
  teamwork_score numeric DEFAULT 0,
  initiative_score numeric DEFAULT 0,
  overall_score numeric DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.performance_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage performance_scores" ON public.performance_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Feedbacks & 1:1
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  given_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  feedback_type text NOT NULL DEFAULT 'positivo',
  context text,
  points text NOT NULL,
  action_plan text,
  next_followup date,
  meeting_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'aberto',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage feedbacks" ON public.feedbacks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. Warnings (advertências)
CREATE TABLE IF NOT EXISTS public.warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  warning_type text NOT NULL DEFAULT 'atraso_recorrente',
  severity text NOT NULL DEFAULT 'verbal',
  description text NOT NULL,
  date_issued date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'aberta',
  issued_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.warnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage warnings" ON public.warnings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 9. Employee documents
CREATE TABLE IF NOT EXISTS public.employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT 'contrato',
  title text NOT NULL,
  file_url text,
  file_name text,
  expiry_date date,
  tags text[] DEFAULT '{}',
  uploaded_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage employee_documents" ON public.employee_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 10. Team check-ins (clima)
CREATE TABLE IF NOT EXISTS public.team_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  checkin_date date NOT NULL DEFAULT CURRENT_DATE,
  mood_score integer NOT NULL DEFAULT 3,
  energy_score integer NOT NULL DEFAULT 3,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage team_checkins" ON public.team_checkins FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 11. Access log for HR
CREATE TABLE IF NOT EXISTS public.hr_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  action text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage hr_access_log" ON public.hr_access_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
