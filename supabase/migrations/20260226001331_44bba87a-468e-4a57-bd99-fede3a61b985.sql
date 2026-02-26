
-- Import jobs table for tracking background imports
CREATE TABLE public.import_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'queued',
  total_rows INTEGER NOT NULL DEFAULT 0,
  processed_rows INTEGER NOT NULL DEFAULT 0,
  progress INTEGER NOT NULL DEFAULT 0,
  conversations_created INTEGER NOT NULL DEFAULT 0,
  conversations_updated INTEGER NOT NULL DEFAULT 0,
  messages_created INTEGER NOT NULL DEFAULT 0,
  messages_deduplicated INTEGER NOT NULL DEFAULT 0,
  contacts_created INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  create_contacts BOOLEAN NOT NULL DEFAULT false,
  storage_path TEXT,
  checkpoint_data JSONB DEFAULT '{}'::jsonb,
  file_names TEXT[] DEFAULT '{}'::text[],
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage import_jobs" ON public.import_jobs FOR ALL USING (true) WITH CHECK (true);

-- Create storage bucket for import data
INSERT INTO storage.buckets (id, name, public) VALUES ('chatguru-imports', 'chatguru-imports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for authenticated users
CREATE POLICY "Authenticated can manage chatguru-imports" ON storage.objects FOR ALL USING (bucket_id = 'chatguru-imports') WITH CHECK (bucket_id = 'chatguru-imports');
