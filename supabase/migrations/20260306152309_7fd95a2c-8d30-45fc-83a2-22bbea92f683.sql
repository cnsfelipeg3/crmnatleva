
-- Create storage bucket for employee documents
INSERT INTO storage.buckets (id, name, public) VALUES ('employee-documents', 'employee-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for employee-documents bucket
CREATE POLICY "Authenticated can upload employee docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'employee-documents');

CREATE POLICY "Authenticated can view employee docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'employee-documents');

CREATE POLICY "Authenticated can delete employee docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'employee-documents');
