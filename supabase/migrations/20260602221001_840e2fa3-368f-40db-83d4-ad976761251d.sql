CREATE OR REPLACE FUNCTION public.soft_delete_sale(_sale_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  UPDATE public.proposals
  SET sale_id = NULL,
      updated_at = now()
  WHERE sale_id = _sale_id;

  UPDATE public.sales
  SET deleted_at = now(),
      deleted_by = auth.uid(),
      source_proposal_id = NULL,
      updated_at = now()
  WHERE id = _sale_id;
END;
$function$;