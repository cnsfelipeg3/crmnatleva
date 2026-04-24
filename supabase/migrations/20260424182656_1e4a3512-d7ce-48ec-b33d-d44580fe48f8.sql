-- Soft delete em sales/viagens
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID;

CREATE INDEX IF NOT EXISTS idx_sales_deleted_at ON public.sales(deleted_at) WHERE deleted_at IS NULL;

-- Recriar políticas de SELECT/UPDATE para esconder soft-deleted de todos os usuários
DROP POLICY IF EXISTS "Authenticated users can view sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can update sales" ON public.sales;
DROP POLICY IF EXISTS "temp_anon_full_sales" ON public.sales;

-- SELECT: qualquer leitura autenticada NÃO vê registros soft-deletados
CREATE POLICY "Users view non-deleted sales"
ON public.sales
FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

-- UPDATE: usuários autenticados podem atualizar vendas não excluídas;
-- admins adicionalmente podem marcar/desmarcar deleted_at (soft delete/restore)
CREATE POLICY "Users update non-deleted sales"
ON public.sales
FOR UPDATE
TO authenticated
USING (deleted_at IS NULL)
WITH CHECK (true);

CREATE POLICY "Admins can soft delete sales"
ON public.sales
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));