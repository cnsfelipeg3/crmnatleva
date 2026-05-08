
CREATE TABLE IF NOT EXISTS public.saved_stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_url text NOT NULL,
  storage_path text,
  mime_type text,
  width int,
  height int,
  is_animated boolean DEFAULT false,
  source_message_id uuid,
  created_by uuid,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_stickers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_stickers anon all" ON public.saved_stickers;
CREATE POLICY "saved_stickers anon all" ON public.saved_stickers
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_saved_stickers_created_at ON public.saved_stickers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_stickers_last_used ON public.saved_stickers(last_used_at DESC NULLS LAST);

INSERT INTO storage.buckets (id, name, public)
VALUES ('stickers', 'stickers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "stickers public read" ON storage.objects;
CREATE POLICY "stickers public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'stickers');

DROP POLICY IF EXISTS "stickers anon write" ON storage.objects;
CREATE POLICY "stickers anon write" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'stickers');

DROP POLICY IF EXISTS "stickers anon update" ON storage.objects;
CREATE POLICY "stickers anon update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'stickers');

DROP POLICY IF EXISTS "stickers anon delete" ON storage.objects;
CREATE POLICY "stickers anon delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'stickers');
