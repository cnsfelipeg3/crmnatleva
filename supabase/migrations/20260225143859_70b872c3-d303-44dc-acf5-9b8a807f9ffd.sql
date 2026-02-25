
-- AI suggestion logs for tracking
CREATE TABLE public.ai_chat_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id uuid,
  suggestion_text text NOT NULL,
  intent_detected text,
  destination_detected text,
  urgency_level text DEFAULT 'normal',
  tags_suggested text[] DEFAULT '{}'::text[],
  funnel_stage_suggested text,
  action_taken text DEFAULT 'ignored',
  edited_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.ai_chat_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage ai_chat_suggestions"
  ON public.ai_chat_suggestions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Add funnel_stage to conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS funnel_stage text DEFAULT 'novo_lead';
