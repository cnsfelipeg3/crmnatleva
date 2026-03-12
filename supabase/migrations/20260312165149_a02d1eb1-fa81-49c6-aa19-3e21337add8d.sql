INSERT INTO storage.buckets (id, name, public) VALUES ('portal-documents', 'portal-documents', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Portal users can read trip documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'portal-documents');

CREATE POLICY "CRM users can upload portal documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'portal-documents' AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "CRM users can delete portal documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'portal-documents' AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));