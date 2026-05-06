ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS group_subject TEXT,
  ADD COLUMN IF NOT EXISTS group_description TEXT,
  ADD COLUMN IF NOT EXISTS group_participants JSONB,
  ADD COLUMN IF NOT EXISTS group_metadata_fetched_at TIMESTAMPTZ;

UPDATE public.conversations
SET is_group = true
WHERE (phone LIKE '%-group' OR phone LIKE '%@g.us' OR length(regexp_replace(phone, '\D', '', 'g')) >= 15)
  AND is_group IS DISTINCT FROM true;

UPDATE public.conversations
SET profile_picture_url = NULL,
    profile_picture_fetched_at = NULL
WHERE is_group = true
  AND profile_picture_url IS NOT NULL;

UPDATE public.conversations
SET group_metadata_fetched_at = NULL
WHERE is_group = true;

CREATE INDEX IF NOT EXISTS ix_conversations_is_group ON public.conversations (is_group) WHERE is_group = true;