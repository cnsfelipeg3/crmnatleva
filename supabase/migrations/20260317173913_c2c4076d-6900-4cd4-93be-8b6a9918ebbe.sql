
-- ═══ PIPELINE INTELLIGENCE COLUMNS ═══

-- Add pipeline tracking columns to conversations
ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS stage_entered_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS engagement_level text DEFAULT 'medio',
  ADD COLUMN IF NOT EXISTS close_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proposal_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_margin numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS interaction_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS proposal_viewed_at timestamptz;

-- Index for pipeline sorting
CREATE INDEX IF NOT EXISTS idx_conversations_stage_entered ON public.conversations USING btree (stage, stage_entered_at);
CREATE INDEX IF NOT EXISTS idx_conversations_close_score ON public.conversations USING btree (close_score DESC) WHERE close_score > 0;
