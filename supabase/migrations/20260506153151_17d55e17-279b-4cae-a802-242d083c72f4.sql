-- Promove Tassia e Nikoly para gestor para visualizarem e atuarem em todas as conversas do inbox
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'gestor'::app_role
FROM public.profiles p
WHERE p.email IN ('tassia@natleva.com', 'nikoly@natleva.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- Remove o role antigo 'vendedor' para evitar conflito de menor permissão
DELETE FROM public.user_roles
WHERE role = 'vendedor'
  AND user_id IN (
    SELECT id FROM public.profiles WHERE email IN ('tassia@natleva.com', 'nikoly@natleva.com')
  );