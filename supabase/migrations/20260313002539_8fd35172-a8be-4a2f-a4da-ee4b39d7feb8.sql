
-- Create 'media' bucket for general media uploads (images, videos, documents)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Create 'audios' bucket for audio recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('audios', 'audios', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for media bucket: allow authenticated users to upload/read
CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');

CREATE POLICY "Anyone can view media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');

CREATE POLICY "Authenticated users can update media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media');

CREATE POLICY "Authenticated users can delete media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media');

-- RLS policies for audios bucket
CREATE POLICY "Authenticated users can upload audios"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audios');

CREATE POLICY "Anyone can view audios"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'audios');

CREATE POLICY "Authenticated users can update audios"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'audios');

CREATE POLICY "Authenticated users can delete audios"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'audios');
