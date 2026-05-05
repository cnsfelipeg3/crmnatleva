
INSERT INTO storage.buckets (id, name, public)
VALUES ('passenger-uploads', 'passenger-uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "anon upload passenger-uploads" ON storage.objects;
CREATE POLICY "anon upload passenger-uploads" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'passenger-uploads');

DROP POLICY IF EXISTS "public read passenger-uploads" ON storage.objects;
CREATE POLICY "public read passenger-uploads" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'passenger-uploads');
