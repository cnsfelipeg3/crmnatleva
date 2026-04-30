
-- =============================================
-- ERRO A: Drop anon policy on clients
-- =============================================
DROP POLICY IF EXISTS "temp_anon_full_clients" ON public.clients;

-- =============================================
-- ERRO B: Drop public SELECT on sale-attachments storage
-- =============================================
DROP POLICY IF EXISTS "Public read sale-attachments" ON storage.objects;

-- =============================================
-- ERRO C: WhatsApp credentials hardening
-- =============================================

-- 1. Drop permissive policies
DROP POLICY IF EXISTS "temp_anon_full_whatsapp_config" ON public.whatsapp_config;
DROP POLICY IF EXISTS "temp_anon_full_whatsapp_cloud_config" ON public.whatsapp_cloud_config;
DROP POLICY IF EXISTS "Authenticated can manage whatsapp_config" ON public.whatsapp_config;
DROP POLICY IF EXISTS "Authenticated can manage whatsapp_cloud_config" ON public.whatsapp_cloud_config;

-- 2. Admin-only policies
CREATE POLICY "Only admins can manage whatsapp_config"
  ON public.whatsapp_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage whatsapp_cloud_config"
  ON public.whatsapp_cloud_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 4. Add encrypted columns
ALTER TABLE public.whatsapp_config
  ADD COLUMN IF NOT EXISTS access_token_encrypted BYTEA,
  ADD COLUMN IF NOT EXISTS app_secret_encrypted BYTEA;

ALTER TABLE public.whatsapp_cloud_config
  ADD COLUMN IF NOT EXISTS access_token_encrypted BYTEA;

-- 5. Encrypt/decrypt functions
CREATE OR REPLACE FUNCTION public.encrypt_whatsapp_secret(plaintext TEXT)
RETURNS BYTEA
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pgp_sym_encrypt(plaintext, current_setting('app.whatsapp_encryption_key'));
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_whatsapp_secret(ciphertext BYTEA)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pgp_sym_decrypt(ciphertext, current_setting('app.whatsapp_encryption_key'));
END;
$$;

-- Restrict decrypt to service_role only
REVOKE EXECUTE ON FUNCTION public.decrypt_whatsapp_secret(BYTEA) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decrypt_whatsapp_secret(BYTEA) FROM anon;
REVOKE EXECUTE ON FUNCTION public.decrypt_whatsapp_secret(BYTEA) FROM authenticated;

-- 6. Backfill encrypted values from existing plaintext
-- NOTE: This requires app.whatsapp_encryption_key to be set as a DB parameter
-- The edge functions will use Deno.env.get('WHATSAPP_ENCRYPTION_KEY') instead
UPDATE public.whatsapp_config
SET access_token_encrypted = pgp_sym_encrypt(access_token, current_setting('app.whatsapp_encryption_key', true)),
    app_secret_encrypted = pgp_sym_encrypt(app_secret, current_setting('app.whatsapp_encryption_key', true))
WHERE access_token IS NOT NULL
  AND current_setting('app.whatsapp_encryption_key', true) IS NOT NULL
  AND current_setting('app.whatsapp_encryption_key', true) != '';

UPDATE public.whatsapp_cloud_config
SET access_token_encrypted = pgp_sym_encrypt(access_token, current_setting('app.whatsapp_encryption_key', true))
WHERE access_token IS NOT NULL
  AND current_setting('app.whatsapp_encryption_key', true) IS NOT NULL
  AND current_setting('app.whatsapp_encryption_key', true) != '';

-- 7. Rename plaintext columns to _legacy
ALTER TABLE public.whatsapp_config RENAME COLUMN access_token TO access_token_legacy_plaintext;
ALTER TABLE public.whatsapp_config RENAME COLUMN app_secret TO app_secret_legacy_plaintext;
ALTER TABLE public.whatsapp_cloud_config RENAME COLUMN access_token TO access_token_legacy_plaintext;

-- =============================================
-- ERRO D: Rate limit + security audit tables
-- =============================================
CREATE TABLE IF NOT EXISTS public.ai_extraction_rate_limit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  request_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_extraction_rate_limit_user_time
  ON public.ai_extraction_rate_limit (user_id, request_at DESC);

ALTER TABLE public.ai_extraction_rate_limit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own rate limit entries"
  ON public.ai_extraction_rate_limit FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.ai_security_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  reason TEXT NOT NULL,
  raw_input_preview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_security_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view security logs"
  ON public.ai_security_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service can insert security logs"
  ON public.ai_security_log FOR INSERT TO authenticated
  WITH CHECK (true);
