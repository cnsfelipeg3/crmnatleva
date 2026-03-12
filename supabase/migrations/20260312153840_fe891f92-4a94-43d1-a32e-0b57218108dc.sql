
-- Add missing columns to conversations table
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS lead_id uuid;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS is_vip boolean DEFAULT false;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS score_potential integer;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS score_risk integer;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS vehicle_interest text;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS price_range text;

-- Messages table (Febeal uses 'messages' not 'chat_messages')
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  external_message_id text,
  sender_type text NOT NULL DEFAULT 'cliente',
  message_type text NOT NULL DEFAULT 'text',
  text text,
  media_url text,
  status text DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage messages" ON public.messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Flows table
CREATE TABLE IF NOT EXISTS public.flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT false,
  trigger_keyword text,
  status text DEFAULT 'rascunho',
  nodes jsonb DEFAULT '[]'::jsonb,
  edges jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage flows" ON public.flows FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Flow nodes
CREATE TABLE IF NOT EXISTS public.flow_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid REFERENCES public.flows(id) ON DELETE CASCADE NOT NULL,
  node_id text NOT NULL,
  node_type text NOT NULL,
  label text DEFAULT '',
  config jsonb DEFAULT '{}'::jsonb,
  position_x double precision DEFAULT 0,
  position_y double precision DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.flow_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage flow_nodes" ON public.flow_nodes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Flow edges
CREATE TABLE IF NOT EXISTS public.flow_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid REFERENCES public.flows(id) ON DELETE CASCADE NOT NULL,
  edge_id text NOT NULL,
  source_node_id text NOT NULL,
  target_node_id text NOT NULL,
  source_handle text,
  target_handle text,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.flow_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage flow_edges" ON public.flow_edges FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Flow execution logs
CREATE TABLE IF NOT EXISTS public.flow_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid REFERENCES public.flows(id) ON DELETE SET NULL,
  conversation_id uuid,
  phone text,
  contact_name text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  status text DEFAULT 'running',
  current_node_id text,
  execution_data jsonb DEFAULT '{}'::jsonb,
  is_simulation boolean DEFAULT false
);
ALTER TABLE public.flow_execution_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage flow_execution_logs" ON public.flow_execution_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Flow versions
CREATE TABLE IF NOT EXISTS public.flow_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid REFERENCES public.flows(id) ON DELETE CASCADE NOT NULL,
  version integer DEFAULT 1,
  nodes_snapshot jsonb DEFAULT '[]'::jsonb,
  edges_snapshot jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.flow_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage flow_versions" ON public.flow_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Flow router rules
CREATE TABLE IF NOT EXISTS public.flow_router_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid REFERENCES public.flows(id) ON DELETE CASCADE NOT NULL,
  label text NOT NULL,
  keywords text[] DEFAULT '{}'::text[],
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.flow_router_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage flow_router_rules" ON public.flow_router_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- AI suggestions
CREATE TABLE IF NOT EXISTS public.ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  suggested_text text,
  suggested_action text,
  suggested_stage text,
  suggested_tags text[],
  used boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage ai_suggestions" ON public.ai_suggestions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Livechat users
CREATE TABLE IF NOT EXISTS public.livechat_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  display_name text,
  role text DEFAULT 'agent',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.livechat_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage livechat_users" ON public.livechat_users FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Z-API contacts
CREATE TABLE IF NOT EXISTS public.zapi_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  lid text,
  name text,
  profile_picture_url text,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.zapi_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage zapi_contacts" ON public.zapi_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Z-API messages
CREATE TABLE IF NOT EXISTS public.zapi_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  message_id text,
  from_me boolean DEFAULT false,
  "timestamp" bigint,
  text text,
  media_url text,
  message_type text DEFAULT 'text',
  status text,
  raw_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.zapi_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage zapi_messages" ON public.zapi_messages FOR ALL TO public USING (true) WITH CHECK (true);

-- WhatsApp templates
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_event text,
  message_body text,
  is_active boolean DEFAULT true,
  delay_minutes integer DEFAULT 0,
  variables jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage whatsapp_templates" ON public.whatsapp_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- WhatsApp dispatch logs
CREATE TABLE IF NOT EXISTS public.whatsapp_dispatch_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
  template_name text,
  trigger_event text,
  client_name text,
  client_phone text,
  client_id uuid,
  vehicle_id text,
  vehicle_description text,
  message_sent text,
  status text DEFAULT 'pending',
  error_message text,
  dispatched_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_dispatch_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage whatsapp_dispatch_logs" ON public.whatsapp_dispatch_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Chatbot sessions
CREATE TABLE IF NOT EXISTS public.chatbot_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  flow_id uuid REFERENCES public.flows(id) ON DELETE SET NULL,
  current_node_id text,
  session_data jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz DEFAULT now(),
  last_activity_at timestamptz DEFAULT now(),
  status text DEFAULT 'active'
);
ALTER TABLE public.chatbot_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage chatbot_sessions" ON public.chatbot_sessions FOR ALL TO public USING (true) WITH CHECK (true);

-- WhatsApp Cloud config
CREATE TABLE IF NOT EXISTS public.whatsapp_cloud_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_id text,
  waba_id text,
  access_token text,
  verify_token text,
  is_active boolean DEFAULT false,
  connected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_cloud_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage whatsapp_cloud_config" ON public.whatsapp_cloud_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- WhatsApp QR sessions
CREATE TABLE IF NOT EXISTS public.whatsapp_qr_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text DEFAULT 'disconnected',
  qr_code text,
  connected_phone text,
  last_check timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_qr_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage whatsapp_qr_sessions" ON public.whatsapp_qr_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.zapi_messages;
