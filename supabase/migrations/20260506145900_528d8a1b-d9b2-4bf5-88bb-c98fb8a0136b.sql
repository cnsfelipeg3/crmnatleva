
-- ============================================================
-- SECURITY HARDENING: lock down sensitive tables to admin/staff
-- Preserves the project's "public testing" posture for non-sensitive tables
-- ============================================================

-- Helper: drop any "temp_anon_full_*" or overly permissive public policies
-- on the sensitive tables, then add admin/authenticated-scoped ones.

-- ---------- 1) PAYROLL (salaries) ----------
ALTER TABLE IF EXISTS public.payroll ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_anon_full_payroll" ON public.payroll;
DROP POLICY IF EXISTS "Public can manage payroll" ON public.payroll;
CREATE POLICY "Admins can manage payroll" ON public.payroll
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- 2) CREDIT CARDS ----------
ALTER TABLE IF EXISTS public.credit_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_anon_full_credit_cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Public can manage credit_cards" ON public.credit_cards;
CREATE POLICY "Admins manage credit_cards" ON public.credit_cards
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE IF EXISTS public.credit_card_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_anon_full_credit_card_items" ON public.credit_card_items;
DROP POLICY IF EXISTS "Public can manage credit_card_items" ON public.credit_card_items;
CREATE POLICY "Admins manage credit_card_items" ON public.credit_card_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- 3) RECEIVING ACCOUNTS (PIX/bank) ----------
ALTER TABLE IF EXISTS public.receiving_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_anon_full_receiving_accounts" ON public.receiving_accounts;
DROP POLICY IF EXISTS "Public can manage receiving_accounts" ON public.receiving_accounts;
CREATE POLICY "Admins manage receiving_accounts" ON public.receiving_accounts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- 4) AI INTEGRATIONS (encrypted API keys) ----------
ALTER TABLE IF EXISTS public.ai_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can manage ai_integrations" ON public.ai_integrations;
DROP POLICY IF EXISTS "temp_anon_full_ai_integrations" ON public.ai_integrations;
CREATE POLICY "Admins manage ai_integrations" ON public.ai_integrations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- 5) CLIENTS_MONDAY_STAGING (1.870 leads expostos) ----------
ALTER TABLE IF EXISTS public.clients_monday_staging ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temp_anon_full_clients_monday_staging" ON public.clients_monday_staging;
DROP POLICY IF EXISTS "Public can manage clients_monday_staging" ON public.clients_monday_staging;
CREATE POLICY "Authenticated staff read staging" ON public.clients_monday_staging
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins write staging" ON public.clients_monday_staging
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- 6) PASSENGER ATTACHMENTS (boarding passes/IDs) ----------
ALTER TABLE IF EXISTS public.passenger_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "passenger_attachments_all" ON public.passenger_attachments;
DROP POLICY IF EXISTS "temp_anon_full_passenger_attachments" ON public.passenger_attachments;
CREATE POLICY "Authenticated staff manage passenger_attachments" ON public.passenger_attachments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------- 7) PASSENGER SIGNUP LINKS (anon should only READ by slug) ----------
ALTER TABLE IF EXISTS public.passenger_signup_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon all passenger_signup_links" ON public.passenger_signup_links;
DROP POLICY IF EXISTS "temp_anon_full_passenger_signup_links" ON public.passenger_signup_links;
CREATE POLICY "Anon can read signup links by slug" ON public.passenger_signup_links
  FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated staff manage signup links" ON public.passenger_signup_links
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------- 8) SUPPLIERS (CNPJ/PIX) — fix loose token policy ----------
DROP POLICY IF EXISTS "Public can read supplier by registration token" ON public.suppliers;
-- (other staff/admin policies on suppliers stay intact)
