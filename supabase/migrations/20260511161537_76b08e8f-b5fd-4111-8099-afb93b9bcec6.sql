-- 1. Drop overly-permissive duplicate policies on sensitive financial tables
DROP POLICY IF EXISTS "Authenticated can manage receiving_accounts" ON public.receiving_accounts;
DROP POLICY IF EXISTS "Authenticated can manage credit_cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Authenticated can manage credit_card_items" ON public.credit_card_items;
DROP POLICY IF EXISTS "Authenticated can manage payroll" ON public.payroll;

-- 2. Drop supplier token privilege escalation policy
DROP POLICY IF EXISTS "Public can update supplier via registration token" ON public.suppliers;

-- 3. Enable RLS on backup tables (no policies = no access)
ALTER TABLE public._backup_proposals_pre_migration_2026_05 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._backup_quotation_briefings_pre_migration_2026_05 ENABLE ROW LEVEL SECURITY;

-- 4. Enable RLS on whatsapp_statuses_quarantine + admin-only access
ALTER TABLE public.whatsapp_statuses_quarantine ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage whatsapp_statuses_quarantine" ON public.whatsapp_statuses_quarantine;
CREATE POLICY "Admins manage whatsapp_statuses_quarantine"
  ON public.whatsapp_statuses_quarantine
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
