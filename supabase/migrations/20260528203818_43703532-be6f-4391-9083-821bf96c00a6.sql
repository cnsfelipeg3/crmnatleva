
-- ============================================================
-- Fix: remover todos os acessos anônimos/públicos a tabelas sensíveis
-- Mantém: usuários autenticados continuam com acesso total
-- ============================================================

-- 1) audit_log: remover anon ALL
DROP POLICY IF EXISTS "temp_anon_full_audit_log" ON public.audit_log;

-- 2) chat_messages
DROP POLICY IF EXISTS "temp_anon_full_chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Public can manage chat_messages" ON public.chat_messages;

-- 3) conversation_messages
DROP POLICY IF EXISTS "temp_anon_full_conversation_messages" ON public.conversation_messages;

-- 4) messages
DROP POLICY IF EXISTS "temp_anon_full_messages" ON public.messages;

-- 5) megafone_banners: remover public, criar authenticated
DROP POLICY IF EXISTS "megafone_select_all" ON public.megafone_banners;
DROP POLICY IF EXISTS "megafone_insert_all" ON public.megafone_banners;
DROP POLICY IF EXISTS "megafone_update_all" ON public.megafone_banners;
DROP POLICY IF EXISTS "megafone_delete_all" ON public.megafone_banners;
CREATE POLICY "megafone authenticated all" ON public.megafone_banners
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6) portal_* (dados financeiros do portal): autenticado-only
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'portal_expenses','portal_travel_budgets','portal_travel_cards',
    'portal_cash_tracking','portal_budget_categories'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public can manage %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "temp_anon_full_%1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "%1$s authenticated all" ON public.%1$I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- 7) prateleira_viewer_events: habilitar RLS, permitir INSERT público (tracking),
--    SELECT/UPDATE/DELETE apenas autenticado
ALTER TABLE public.prateleira_viewer_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow delete prateleira viewer events" ON public.prateleira_viewer_events;
CREATE POLICY "prateleira_viewer_events public insert" ON public.prateleira_viewer_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "prateleira_viewer_events auth read" ON public.prateleira_viewer_events
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "prateleira_viewer_events auth update" ON public.prateleira_viewer_events
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "prateleira_viewer_events auth delete" ON public.prateleira_viewer_events
  FOR DELETE TO authenticated USING (true);

-- 8) product_marketing_assets: habilitar RLS, autenticado-only
ALTER TABLE public.product_marketing_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_marketing_assets authenticated all" ON public.product_marketing_assets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 9) proposal_viewers: anon pode INSERT/UPDATE (tracking de visualização da proposta
--    pública por slug); SELECT/DELETE apenas autenticado
DROP POLICY IF EXISTS "temp_anon_full_proposal_viewers" ON public.proposal_viewers;
DROP POLICY IF EXISTS "Anyone can select viewer by id" ON public.proposal_viewers;
DROP POLICY IF EXISTS "Allow delete proposal viewers" ON public.proposal_viewers;
CREATE POLICY "proposal_viewers auth select" ON public.proposal_viewers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "proposal_viewers auth delete" ON public.proposal_viewers
  FOR DELETE TO authenticated USING (true);

-- 10) saved_stickers: autenticado-only
DROP POLICY IF EXISTS "saved_stickers anon all" ON public.saved_stickers;
CREATE POLICY "saved_stickers authenticated all" ON public.saved_stickers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 11) whatsapp_events_raw: remover anon + public, service_role only
DROP POLICY IF EXISTS "temp_anon_full_whatsapp_events_raw" ON public.whatsapp_events_raw;
DROP POLICY IF EXISTS "Service role full access on whatsapp_events_raw" ON public.whatsapp_events_raw;
CREATE POLICY "whatsapp_events_raw service_role all" ON public.whatsapp_events_raw
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 12) Revoke grants residuais para anon nas tabelas sensíveis
REVOKE ALL ON public.audit_log, public.chat_messages, public.conversation_messages,
              public.messages, public.megafone_banners, public.portal_expenses,
              public.portal_travel_budgets, public.portal_travel_cards,
              public.portal_cash_tracking, public.portal_budget_categories,
              public.product_marketing_assets, public.saved_stickers,
              public.whatsapp_events_raw
  FROM anon;

-- Garantir que authenticated tenha tudo
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_log, public.chat_messages,
              public.conversation_messages, public.messages,
              public.megafone_banners, public.portal_expenses,
              public.portal_travel_budgets, public.portal_travel_cards,
              public.portal_cash_tracking, public.portal_budget_categories,
              public.product_marketing_assets, public.prateleira_viewer_events,
              public.product_marketing_assets, public.saved_stickers
  TO authenticated;

-- prateleira_viewer_events precisa de INSERT para anon
GRANT INSERT ON public.prateleira_viewer_events TO anon;

-- 13) Corrigir search_path mutável nas funções de email queue
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
