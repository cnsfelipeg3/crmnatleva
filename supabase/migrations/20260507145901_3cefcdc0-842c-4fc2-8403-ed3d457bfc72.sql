
-- Tabela de produtos/experiências (passeios, ingressos, excursões etc) que a NatLeva vende
CREATE TABLE public.experience_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  destination TEXT NOT NULL, -- ex: "Punta Cana", "Paris"
  destination_country TEXT,
  category TEXT, -- "passeio", "excursao", "ingresso", "transfer", "experiencia"
  short_description TEXT,
  description TEXT,
  cover_image_url TEXT,
  gallery JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{url, type:'image'|'video', caption}]
  duration TEXT, -- "Dia inteiro", "4h"
  price_from NUMERIC,
  currency TEXT DEFAULT 'USD',
  includes JSONB NOT NULL DEFAULT '[]'::jsonb, -- string[]
  excludes JSONB NOT NULL DEFAULT '[]'::jsonb, -- string[]
  highlights JSONB NOT NULL DEFAULT '[]'::jsonb, -- string[]
  how_it_works TEXT,
  pickup_info TEXT, -- "Buscamos no hotel", "Ponto de encontro X"
  recommendations TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_experience_products_destination ON public.experience_products(destination);
CREATE INDEX idx_experience_products_active ON public.experience_products(is_active);

ALTER TABLE public.experience_products ENABLE ROW LEVEL SECURITY;

-- Padrão do projeto: anon ALL (RLS desabilitado lógico para testes públicos)
CREATE POLICY "experience_products_all_anon" ON public.experience_products
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_experience_products_updated_at
  BEFORE UPDATE ON public.experience_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed Punta Cana
INSERT INTO public.experience_products (slug, title, destination, destination_country, category, short_description, description, duration, price_from, currency, cover_image_url, gallery, includes, excludes, highlights, how_it_works, pickup_info, recommendations, display_order) VALUES
('isla-saona-punta-cana', 'Isla Saona · Dia Completo', 'Punta Cana', 'República Dominicana', 'passeio',
 'Praia paradisíaca de areia branca e águas cristalinas com catamarã, piscina natural e almoço caribenho.',
 'Um dos passeios mais icônicos do Caribe. Você embarca em um catamarã com música, drinks liberados e parada na piscina natural (estrelas-do-mar), depois chega à Isla Saona para curtir praia paradisíaca, almoço típico caribenho e tarde livre. Volta de lancha rápida ao final do dia.',
 'Dia inteiro · ~9h', 120, 'USD',
 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
 '[{"url":"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80","type":"image"},{"url":"https://images.unsplash.com/photo-1559599238-308793637427?auto=format&fit=crop&w=1600&q=80","type":"image"},{"url":"https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=1600&q=80","type":"image"}]'::jsonb,
 '["Transfer ida e volta hotel","Catamarã com open bar","Parada na piscina natural","Almoço caribenho na ilha","Lancha rápida na volta","Guia bilíngue"]'::jsonb,
 '["Gorjetas","Compras pessoais","Fotos profissionais"]'::jsonb,
 '["Praia top 10 do Caribe","Open bar a bordo","Piscina natural com estrelas-do-mar"]'::jsonb,
 'Buscamos você no hotel pela manhã (08h-08h30), traslado até Bayahibe, embarque no catamarã, parada na piscina natural, chegada na Isla Saona com tempo livre + almoço, retorno de lancha rápida e traslado de volta ao hotel até ~17h30.',
 'Buscamos no hotel · incluso no preço',
 'Levar protetor solar biodegradável, toalha, roupa de banho extra e dinheiro para gorjetas.',
 1),
('hoyo-azul-scape-park', 'Hoyo Azul + Scape Park', 'Punta Cana', 'República Dominicana', 'passeio',
 'Cenote turquesa cravado na selva + tirolesas, trilhas e cavernas em parque ecológico.',
 'O Hoyo Azul é uma piscina natural azul-turquesa no meio da selva de Cap Cana. No mesmo parque você ainda curte tirolesa sobre cenotes, trilhas e cavernas pré-colombianas. Perfeito para casais e famílias aventureiras.',
 'Meio dia · ~5h', 95, 'USD',
 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1600&q=80',
 '[{"url":"https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1600&q=80","type":"image"},{"url":"https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=1600&q=80","type":"image"}]'::jsonb,
 '["Transfer hotel","Entrada no Scape Park","Acesso ao Hoyo Azul","Tirolesa e cavernas","Guia"]'::jsonb,
 '["Almoço","Bebidas extras","Fotos"]'::jsonb,
 '["Cenote azul-turquesa exclusivo","Aventura + natureza no mesmo dia","Ideal para casais e famílias"]'::jsonb,
 'Buscamos no hotel, traslado até Cap Cana, dia no parque com Hoyo Azul + atrações inclusas, retorno no fim da tarde.',
 'Buscamos no hotel · incluso',
 'Calçado fechado, roupa de banho por baixo, repelente.',
 2),
('catamara-festa-punta-cana', 'Catamarã Party + Snorkel', 'Punta Cana', 'República Dominicana', 'passeio',
 'Catamarã com open bar, música, snorkel em recife e parada na piscina natural.',
 'Programa para quem quer curtir o mar com música boa, drinks liberados e snorkel em recife colorido. Tarde inesquecível com parada para nadar e dançar a bordo.',
 'Meio dia · ~3h30', 75, 'USD',
 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=1600&q=80',
 '[{"url":"https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=1600&q=80","type":"image"}]'::jsonb,
 '["Transfer hotel","Catamarã","Open bar","Snorkel com equipamento","Música ao vivo"]'::jsonb,
 '["Almoço","Fotos profissionais"]'::jsonb,
 '["Open bar premium","Snorkel em recife","Vibe festa caribenha"]'::jsonb,
 'Saída do hotel início da tarde, embarque no catamarã, parada para snorkel e piscina natural, retorno ao porto e traslado.',
 'Buscamos no hotel',
 'Roupa de banho, protetor solar, câmera à prova d''água.',
 3),
('safari-dominicano', 'Safari Dominicano Cultural', 'Punta Cana', 'República Dominicana', 'excursao',
 'Tour 4x4 pelo interior · plantação de cacau, café, vila típica e praia escondida.',
 'Vivência autêntica fora dos resorts: caminhão safári pelo campo dominicano, visita a plantações de cacau e café, casa típica de uma família local, almoço caseiro e parada em praia paradisíaca pouco visitada.',
 'Dia inteiro · ~8h', 110, 'USD',
 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1600&q=80',
 '[{"url":"https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1600&q=80","type":"image"}]'::jsonb,
 '["Transfer hotel","Safari 4x4","Visitas culturais","Almoço típico","Parada na praia","Guia bilíngue"]'::jsonb,
 '["Bebidas extras","Gorjetas"]'::jsonb,
 '["Cultura dominicana de verdade","Saída dos resorts","Praia escondida"]'::jsonb,
 'Buscamos cedo no hotel, dia inteiro de tour com paradas culturais, almoço, praia e retorno no fim da tarde.',
 'Buscamos no hotel · incluso',
 'Roupa confortável, tênis, repelente, dinheiro pequeno para gorjetas.',
 4),
('santo-domingo-city-tour', 'Santo Domingo Colonial', 'Punta Cana', 'República Dominicana', 'passeio',
 'Bate-volta à cidade colonial mais antiga das Américas · Patrimônio UNESCO.',
 'Conheça a Zona Colonial de Santo Domingo · primeira cidade europeia das Américas. Catedral primada, Alcázar de Colón, ruas de pedra e gastronomia local.',
 'Dia inteiro · ~10h', 130, 'USD',
 'https://images.unsplash.com/photo-1568849676085-51415703900f?auto=format&fit=crop&w=1600&q=80',
 '[{"url":"https://images.unsplash.com/photo-1568849676085-51415703900f?auto=format&fit=crop&w=1600&q=80","type":"image"}]'::jsonb,
 '["Transfer ida e volta","Guia bilíngue","Almoço típico","Entradas dos monumentos"]'::jsonb,
 '["Compras pessoais","Bebidas alcoólicas"]'::jsonb,
 '["Patrimônio UNESCO","História de 500 anos","Gastronomia dominicana"]'::jsonb,
 'Saída cedo do hotel (~07h), traslado a Santo Domingo, tour guiado pela Zona Colonial, almoço, tempo livre e retorno à noite.',
 'Buscamos no hotel · incluso',
 'Calçado confortável para caminhar, roupa leve, câmera.',
 5);
