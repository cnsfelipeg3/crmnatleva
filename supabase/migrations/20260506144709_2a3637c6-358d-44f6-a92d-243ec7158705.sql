
CREATE TABLE IF NOT EXISTS public.message_shortcuts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'geral',
  content TEXT,
  media_type TEXT,
  media_url TEXT,
  media_filename TEXT,
  media_mimetype TEXT,
  media_size_bytes BIGINT,
  caption TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  usage_count INT NOT NULL DEFAULT 0,
  created_by uuid,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_message_shortcuts_trigger
  ON public.message_shortcuts (LOWER(trigger)) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS ix_message_shortcuts_category_usage
  ON public.message_shortcuts (category, usage_count DESC) WHERE is_active = TRUE;

ALTER TABLE public.message_shortcuts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read shortcuts" ON public.message_shortcuts;
CREATE POLICY "Authenticated read shortcuts" ON public.message_shortcuts
  FOR SELECT TO authenticated USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admin manage shortcuts" ON public.message_shortcuts;
CREATE POLICY "Admin manage shortcuts" ON public.message_shortcuts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER tg_message_shortcuts_updated_at
  BEFORE UPDATE ON public.message_shortcuts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.increment_shortcut_usage(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.message_shortcuts SET usage_count = usage_count + 1 WHERE id = p_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_shortcut_usage(uuid) TO authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('message-shortcuts', 'message-shortcuts', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated read shortcut media" ON storage.objects;
CREATE POLICY "Authenticated read shortcut media" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'message-shortcuts');

DROP POLICY IF EXISTS "Public read shortcut media" ON storage.objects;
CREATE POLICY "Public read shortcut media" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'message-shortcuts');

DROP POLICY IF EXISTS "Admin upload shortcut media" ON storage.objects;
CREATE POLICY "Admin upload shortcut media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'message-shortcuts' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin update shortcut media" ON storage.objects;
CREATE POLICY "Admin update shortcut media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'message-shortcuts' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin delete shortcut media" ON storage.objects;
CREATE POLICY "Admin delete shortcut media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'message-shortcuts' AND public.has_role(auth.uid(), 'admin'));

INSERT INTO public.message_shortcuts (trigger, title, category, content, is_active) VALUES
('pix', 'Dados PIX da NatLeva', 'pagamento', E'Olá {primeiro_nome}! Segue nossa chave PIX para pagamento:\n\nCNPJ: 00.000.000/0001-00\nBanco: XXX\n\nApós o pagamento, envie o comprovante por aqui pra eu confirmar!', TRUE),
('boas-vindas', 'Mensagem de boas-vindas', 'saudacao', E'Oi {primeiro_nome}, tudo bem?\n\nEu sou {nome_consultor} da NatLeva Viagens. Recebi sua solicitação e estou aqui pra te ajudar a planejar a viagem dos seus sonhos!\n\nMe conta um pouco mais sobre o que você tá pensando?', TRUE),
('agradecimento', 'Agradecimento pós-venda', 'pos-venda', E'Muito obrigada pela confiança em nós, {primeiro_nome}!\n\nQualquer dúvida durante a viagem ou depois, pode me chamar aqui. Boa viagem!', TRUE),
('confirmacao-reserva', 'Confirmação de reserva', 'viagem', E'Boa notícia, {primeiro_nome}!\n\nSua reserva foi confirmada com sucesso. Em breve enviarei o voucher por aqui.\n\nQualquer coisa, é só me chamar!', TRUE),
('aguardando', 'Aguardando resposta', 'geral', E'Oi {primeiro_nome}, ainda estou aguardando seu retorno!\n\nQualquer dúvida, é só me chamar. Estou aqui pra te ajudar.', TRUE)
ON CONFLICT DO NOTHING;
