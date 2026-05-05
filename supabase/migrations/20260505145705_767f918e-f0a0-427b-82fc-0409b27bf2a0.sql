DROP POLICY IF EXISTS "temp_anon_full_employees" ON public.employees;
DROP POLICY IF EXISTS "temp_anon_full_profiles" ON public.profiles;
DROP POLICY IF EXISTS "temp_anon_full_ai_integrations" ON public.ai_integrations;
DROP POLICY IF EXISTS "Authenticated can manage ai_integrations" ON public.ai_integrations;
CREATE POLICY "Authenticated can manage ai_integrations"
  ON public.ai_integrations FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "temp_anon_full_portal_access" ON public.portal_access;
DROP POLICY IF EXISTS "temp_anon_full_suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "temp_anon_full_zapi_contacts" ON public.zapi_contacts;
DROP POLICY IF EXISTS "temp_anon_full_conversations" ON public.conversations;

ALTER TABLE public.watchdog_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read watchdog_runs" ON public.watchdog_runs;
CREATE POLICY "Admins can read watchdog_runs"
  ON public.watchdog_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));