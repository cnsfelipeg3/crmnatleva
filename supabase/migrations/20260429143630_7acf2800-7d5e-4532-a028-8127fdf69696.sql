-- Add profile picture cache to conversations
ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS profile_picture_url text,
  ADD COLUMN IF NOT EXISTS profile_picture_fetched_at timestamp with time zone;

-- Index for backfill jobs (find conversations missing pictures)
CREATE INDEX IF NOT EXISTS idx_conversations_pic_missing 
  ON public.conversations (last_message_at DESC NULLS LAST) 
  WHERE profile_picture_url IS NULL;

-- Backfill from zapi_contacts where we already have pictures
UPDATE public.conversations c
SET profile_picture_url = zc.profile_picture_url,
    profile_picture_fetched_at = now()
FROM public.zapi_contacts zc
WHERE c.phone IS NOT NULL
  AND c.phone = zc.phone
  AND zc.profile_picture_url IS NOT NULL
  AND c.profile_picture_url IS NULL;