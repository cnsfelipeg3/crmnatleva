
CREATE TABLE public.portal_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'documentacao',
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  is_auto_generated BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portal users can view own checklist items"
  ON public.portal_checklist_items
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM public.portal_access WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Authenticated staff can manage all checklist items"
  ON public.portal_checklist_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
