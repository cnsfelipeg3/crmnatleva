
-- Fix passengers DELETE policy: was allowing public (unauthenticated) role
DROP POLICY IF EXISTS "Authenticated can delete passengers" ON public.passengers;
CREATE POLICY "Authenticated can delete passengers" ON public.passengers
  FOR DELETE TO authenticated USING (true);

-- Fix portal_assistant_logs INSERT policy: was allowing public role  
DROP POLICY IF EXISTS "Service role can insert logs" ON public.portal_assistant_logs;
CREATE POLICY "Service role can insert logs" ON public.portal_assistant_logs
  FOR INSERT TO authenticated WITH CHECK (true);
