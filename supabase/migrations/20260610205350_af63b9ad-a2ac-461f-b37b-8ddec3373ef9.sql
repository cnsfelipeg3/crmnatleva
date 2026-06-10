ALTER TABLE public.portal_published_sales
  ADD COLUMN IF NOT EXISTS welcome_message text,
  ADD COLUMN IF NOT EXISTS concierge_brief text;