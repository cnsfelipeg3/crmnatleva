CREATE OR REPLACE FUNCTION public.soft_delete_sale(_sale_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem excluir vendas';
  END IF;

  UPDATE public.sales
  SET deleted_at = now(),
      deleted_by = auth.uid()
  WHERE id = _sale_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_sale(uuid) TO authenticated;