-- Make existing bucket public and set file size limit
UPDATE storage.buckets
SET public = true, file_size_limit = 52428800
WHERE id = 'sale-attachments';

-- RLS policies for storage.objects
CREATE POLICY "Public read sale-attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'sale-attachments');

CREATE POLICY "Allow upload sale-attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'sale-attachments');

CREATE POLICY "Allow update sale-attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'sale-attachments');

CREATE POLICY "Allow delete sale-attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'sale-attachments');
