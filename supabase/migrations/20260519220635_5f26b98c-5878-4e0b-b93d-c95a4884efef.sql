
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_message_id uuid REFERENCES public.conversation_messages(id) ON DELETE CASCADE,
  external_message_id text,
  emoji text NOT NULL,
  reactor_type text NOT NULL DEFAULT 'atendente',
  reactor_id uuid,
  reactor_phone text,
  reactor_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_msg ON public.message_reactions(conversation_message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_external ON public.message_reactions(external_message_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_message_reactions_per_reactor
  ON public.message_reactions(conversation_message_id, reactor_type, COALESCE(reactor_id::text, reactor_phone, 'anon'));

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon all message_reactions" ON public.message_reactions
  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth all message_reactions" ON public.message_reactions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;
