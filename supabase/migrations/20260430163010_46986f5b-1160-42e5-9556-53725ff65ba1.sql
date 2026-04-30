-- ERRO 1: Remove anon access to passengers (LGPD critical)
DROP POLICY IF EXISTS "temp_anon_full_passengers" ON public.passengers;

-- ERRO 2: Remove anon access to user_roles (privilege escalation)
DROP POLICY IF EXISTS "temp_anon_full_user_roles" ON public.user_roles;

-- ERRO 3: Remove public write policies on sale-attachments storage
DROP POLICY IF EXISTS "Allow upload sale-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow update sale-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete sale-attachments" ON storage.objects;

-- Add authenticated-only delete policy for sale-attachments (was missing)
CREATE POLICY "Authenticated can delete sale-attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'sale-attachments');