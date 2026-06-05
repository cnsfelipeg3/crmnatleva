
CREATE TABLE public.conversation_companions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  passenger_id uuid NOT NULL REFERENCES public.passengers(id) ON DELETE CASCADE,
  relationship text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, passenger_id)
);

CREATE INDEX idx_conv_companions_conv ON public.conversation_companions(conversation_id);
CREATE INDEX idx_conv_companions_pax ON public.conversation_companions(passenger_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_companions TO authenticated, anon;
GRANT ALL ON public.conversation_companions TO service_role;

ALTER TABLE public.conversation_companions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open access conversation_companions"
ON public.conversation_companions FOR ALL
USING (true) WITH CHECK (true);

CREATE TRIGGER update_conversation_companions_updated_at
BEFORE UPDATE ON public.conversation_companions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
