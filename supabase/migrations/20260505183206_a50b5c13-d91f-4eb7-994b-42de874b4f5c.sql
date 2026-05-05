
-- Tabela de anexos do passageiro
CREATE TABLE IF NOT EXISTS public.passenger_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  passenger_id UUID NOT NULL REFERENCES public.passengers(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  category TEXT DEFAULT 'documento',
  description TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_passenger_attachments_passenger ON public.passenger_attachments(passenger_id);

ALTER TABLE public.passenger_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "passenger_attachments_all" ON public.passenger_attachments;
CREATE POLICY "passenger_attachments_all" ON public.passenger_attachments FOR ALL USING (true) WITH CHECK (true);

-- Bucket público de anexos
INSERT INTO storage.buckets (id, name, public)
VALUES ('passenger-attachments', 'passenger-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas no storage.objects para o bucket
DROP POLICY IF EXISTS "passenger_attachments_read" ON storage.objects;
CREATE POLICY "passenger_attachments_read" ON storage.objects FOR SELECT USING (bucket_id = 'passenger-attachments');
DROP POLICY IF EXISTS "passenger_attachments_insert" ON storage.objects;
CREATE POLICY "passenger_attachments_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'passenger-attachments');
DROP POLICY IF EXISTS "passenger_attachments_update" ON storage.objects;
CREATE POLICY "passenger_attachments_update" ON storage.objects FOR UPDATE USING (bucket_id = 'passenger-attachments');
DROP POLICY IF EXISTS "passenger_attachments_delete" ON storage.objects;
CREATE POLICY "passenger_attachments_delete" ON storage.objects FOR DELETE USING (bucket_id = 'passenger-attachments');
