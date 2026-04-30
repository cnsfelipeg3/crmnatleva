
-- Create whatsapp-media bucket (public read)
INSERT INTO storage.buckets (id, name, public) VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO NOTHING;

-- Public read policy
CREATE POLICY "Public read whatsapp-media" ON storage.objects FOR SELECT USING (bucket_id = 'whatsapp-media');
