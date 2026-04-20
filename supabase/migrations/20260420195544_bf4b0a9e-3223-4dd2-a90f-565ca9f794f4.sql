DROP POLICY IF EXISTS "Authenticated users can view templates" ON public.proposal_templates;

CREATE POLICY "Anyone can view templates"
ON public.proposal_templates
FOR SELECT
TO anon, authenticated
USING (true);