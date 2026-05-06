
-- Add group sender fields to conversation_messages
ALTER TABLE public.conversation_messages
  ADD COLUMN IF NOT EXISTS sender_name text,
  ADD COLUMN IF NOT EXISTS sender_phone text,
  ADD COLUMN IF NOT EXISTS sender_photo text;

-- Add group flags + cached metadata to conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS is_group boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_description text,
  ADD COLUMN IF NOT EXISTS group_subject text,
  ADD COLUMN IF NOT EXISTS group_metadata jsonb,
  ADD COLUMN IF NOT EXISTS group_metadata_fetched_at timestamptz;

-- Backfill is_group flag for existing groups (phone length >= 15 or contains -group / @g.us)
UPDATE public.conversations
   SET is_group = true
 WHERE is_group = false
   AND (
     length(regexp_replace(coalesce(phone,''), '\D','','g')) >= 15
     OR phone ILIKE '%-group%'
     OR phone ILIKE '%@g.us%'
   );

CREATE INDEX IF NOT EXISTS idx_conversations_is_group ON public.conversations(is_group) WHERE is_group = true;
