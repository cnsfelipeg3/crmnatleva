-- Soft-delete support for conversations (idempotent, non-destructive)
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS excluded_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS excluded_reason TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_excluded_at
  ON public.conversations (excluded_at);