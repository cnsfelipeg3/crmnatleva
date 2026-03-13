
-- Media Places: represents a hotel, attraction, restaurant, etc.
CREATE TABLE public.media_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  place_id TEXT, -- Google Places ID
  place_type TEXT NOT NULL DEFAULT 'hotel', -- hotel, attraction, restaurant, destination, airline, transfer, institutional
  city TEXT,
  country TEXT,
  address TEXT,
  rating NUMERIC(2,1),
  user_ratings_total INTEGER DEFAULT 0,
  website TEXT,
  phone TEXT,
  location JSONB, -- {lat, lng}
  types TEXT[] DEFAULT '{}',
  editorial_summary TEXT,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Media Items: individual images belonging to a place
CREATE TABLE public.media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL REFERENCES public.media_places(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  storage_path TEXT, -- if stored in Supabase Storage
  label TEXT, -- Fachada, Lobby, Quarto Deluxe, etc.
  image_type TEXT DEFAULT 'geral', -- fachada, lobby, quarto, suite, piscina, restaurante, vista, exterior, geral
  room_name TEXT, -- Deluxe Room, Junior Suite, etc.
  is_cover BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  source TEXT DEFAULT 'google', -- google, manual, hotel, natleva
  status TEXT DEFAULT 'aprovada', -- aprovada, capa, quarto, revisao, descartada, baixa_qualidade, duplicada
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_media_places_place_id ON public.media_places(place_id);
CREATE INDEX idx_media_places_type ON public.media_places(place_type);
CREATE INDEX idx_media_places_city ON public.media_places(city);
CREATE INDEX idx_media_places_name ON public.media_places(name);
CREATE INDEX idx_media_items_place_id ON public.media_items(place_id);
CREATE INDEX idx_media_items_status ON public.media_items(status);
CREATE INDEX idx_media_items_type ON public.media_items(image_type);

-- RLS
ALTER TABLE public.media_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read media_places" ON public.media_places FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert media_places" ON public.media_places FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update media_places" ON public.media_places FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete media_places" ON public.media_places FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read media_items" ON public.media_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert media_items" ON public.media_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update media_items" ON public.media_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete media_items" ON public.media_items FOR DELETE TO authenticated USING (true);
