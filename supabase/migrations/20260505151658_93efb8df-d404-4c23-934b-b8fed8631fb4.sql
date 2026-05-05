
-- ============================================================
-- TABELAS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at TIMESTAMPTZ NULL,
  removed_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.conversation_participants IS
  'Participantes (não-donos) de uma conversa. Soft-delete via removed_at.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_part_unique_active
  ON public.conversation_participants (conversation_id, user_id)
  WHERE removed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conv_part_user_active
  ON public.conversation_participants (user_id)
  WHERE removed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conv_part_conv_active
  ON public.conversation_participants (conversation_id)
  WHERE removed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.conversation_assignments_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  from_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  to_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  action TEXT NOT NULL CHECK (action IN ('delegated','added','removed','self_claimed','unassigned')),
  reason TEXT NULL
);

COMMENT ON TABLE public.conversation_assignments_log IS
  'Log imutável de mudanças de atribuição/participação em conversas.';

CREATE INDEX IF NOT EXISTS idx_conv_assign_log_conv ON public.conversation_assignments_log (conversation_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_assign_log_to ON public.conversation_assignments_log (to_user_id, changed_at DESC) WHERE to_user_id IS NOT NULL;

CREATE OR REPLACE VIEW public.conversation_team AS
SELECT
  c.id AS conversation_id,
  c.assigned_to AS owner_user_id,
  COALESCE(
    (SELECT json_agg(json_build_object('user_id', cp.user_id, 'added_at', cp.added_at) ORDER BY cp.added_at)
     FROM public.conversation_participants cp
     WHERE cp.conversation_id = c.id AND cp.removed_at IS NULL),
    '[]'::json
  ) AS participants
FROM public.conversations c;

-- ============================================================
-- RLS conversation_participants
-- ============================================================
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_participants" ON public.conversation_participants;
CREATE POLICY "auth_read_participants" ON public.conversation_participants
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_add_participants" ON public.conversation_participants;
CREATE POLICY "auth_add_participants" ON public.conversation_participants
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = added_by);

DROP POLICY IF EXISTS "gestao_remove_participants" ON public.conversation_participants;
CREATE POLICY "gestao_remove_participants" ON public.conversation_participants
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role));

-- ============================================================
-- RLS conversation_assignments_log
-- ============================================================
ALTER TABLE public.conversation_assignments_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_assign_log" ON public.conversation_assignments_log;
CREATE POLICY "auth_read_assign_log" ON public.conversation_assignments_log
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_assign_log" ON public.conversation_assignments_log;
CREATE POLICY "auth_insert_assign_log" ON public.conversation_assignments_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE policy somente para reason via dono original (best-effort)
DROP POLICY IF EXISTS "auth_update_assign_log_reason" ON public.conversation_assignments_log;
CREATE POLICY "auth_update_assign_log_reason" ON public.conversation_assignments_log
  FOR UPDATE TO authenticated
  USING (auth.uid() = changed_by)
  WITH CHECK (auth.uid() = changed_by);

-- ============================================================
-- TRIGGER: blindagem + audit em conversations.assigned_to
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_audit_conversation_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_gestao BOOLEAN;
BEGIN
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    SELECT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
    INTO is_gestao;

    IF NOT COALESCE(is_gestao, false) THEN
      RAISE EXCEPTION 'Apenas admin ou gestor podem delegar conversas (mudar assigned_to)'
        USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.conversation_assignments_log
      (conversation_id, from_user_id, to_user_id, changed_by, action)
    VALUES
      (NEW.id, OLD.assigned_to, NEW.assigned_to, auth.uid(),
       CASE
         WHEN NEW.assigned_to IS NULL THEN 'unassigned'
         ELSE 'delegated'
       END);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_conversation_assigned ON public.conversations;
CREATE TRIGGER trg_audit_conversation_assigned
  BEFORE UPDATE OF assigned_to ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_audit_conversation_assigned();

-- ============================================================
-- TRIGGER: audit em conversation_participants
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_audit_conversation_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.conversation_assignments_log
      (conversation_id, from_user_id, to_user_id, changed_by, action)
    VALUES
      (NEW.conversation_id, NULL, NEW.user_id, auth.uid(), 'added');
  ELSIF TG_OP = 'UPDATE' AND OLD.removed_at IS NULL AND NEW.removed_at IS NOT NULL THEN
    INSERT INTO public.conversation_assignments_log
      (conversation_id, from_user_id, to_user_id, changed_by, action)
    VALUES
      (NEW.conversation_id, NEW.user_id, NULL, auth.uid(), 'removed');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_conv_participants ON public.conversation_participants;
CREATE TRIGGER trg_audit_conv_participants
  AFTER INSERT OR UPDATE ON public.conversation_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_audit_conversation_participants();

-- ============================================================
-- REALTIME
-- ============================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_assignments_log;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
