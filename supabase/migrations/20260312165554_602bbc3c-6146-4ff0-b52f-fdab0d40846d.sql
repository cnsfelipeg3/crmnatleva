
CREATE TABLE public.portal_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  notification_type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  channel text NOT NULL DEFAULT 'portal',
  status text NOT NULL DEFAULT 'pending',
  read_status text NOT NULL DEFAULT 'unread',
  scheduled_for timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portal users can read own notifications"
ON public.portal_notifications FOR SELECT TO authenticated
USING (client_id = public.get_portal_client_id(auth.uid()));

CREATE POLICY "Portal users can update own notification read status"
ON public.portal_notifications FOR UPDATE TO authenticated
USING (client_id = public.get_portal_client_id(auth.uid()))
WITH CHECK (client_id = public.get_portal_client_id(auth.uid()));

CREATE POLICY "CRM users can manage all notifications"
ON public.portal_notifications FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));

CREATE INDEX idx_portal_notifications_client ON public.portal_notifications(client_id, read_status);
CREATE INDEX idx_portal_notifications_scheduled ON public.portal_notifications(status, scheduled_for);

ALTER PUBLICATION supabase_realtime ADD TABLE public.portal_notifications;
