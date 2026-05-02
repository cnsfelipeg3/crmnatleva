-- Set explicit search_path on all functions to prevent search-path injection
ALTER FUNCTION public.cleanup_client_names() SET search_path = public;
ALTER FUNCTION public.deduplicate_passengers() SET search_path = public;
ALTER FUNCTION public.deduplicate_sales() SET search_path = public;
ALTER FUNCTION public.extract_person_name(text) SET search_path = public;
ALTER FUNCTION public.generate_sale_display_id() SET search_path = public;
ALTER FUNCTION public.reindex_conversation(uuid) SET search_path = public;
ALTER FUNCTION public.smart_capitalize_name(text) SET search_path = public;