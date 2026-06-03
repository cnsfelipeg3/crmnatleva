
-- 1. affiliate_levels (config)
CREATE TABLE IF NOT EXISTS public.affiliate_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  emoji text,
  color text,
  display_order integer NOT NULL DEFAULT 0,
  min_sales_count integer NOT NULL DEFAULT 0,
  min_revenue numeric NOT NULL DEFAULT 0,
  commission_bonus_percent numeric NOT NULL DEFAULT 0,
  perks jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_levels TO authenticated;
GRANT SELECT ON public.affiliate_levels TO anon;
GRANT ALL ON public.affiliate_levels TO service_role;

ALTER TABLE public.affiliate_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads levels" ON public.affiliate_levels FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin manages levels insert" ON public.affiliate_levels FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin manages levels update" ON public.affiliate_levels FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin manages levels delete" ON public.affiliate_levels FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_affiliate_levels_updated_at BEFORE UPDATE ON public.affiliate_levels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default levels
INSERT INTO public.affiliate_levels (slug, name, emoji, color, display_order, min_sales_count, min_revenue, commission_bonus_percent, perks) VALUES
  ('bronze', 'Bronze', '🥉', '#cd7f32', 1, 0, 0, 0, '["Acesso à vitrine completa", "Link personalizado", "Suporte por WhatsApp"]'::jsonb),
  ('prata', 'Prata', '🥈', '#c0c0c0', 2, 3, 15000, 1, '["+1% de comissão extra", "Materiais exclusivos", "Destaque no ranking"]'::jsonb),
  ('ouro', 'Ouro', '🥇', '#d4af37', 3, 8, 50000, 2, '["+2% de comissão extra", "Vitrine premium antecipada", "Bônus mensal de R$ 500"]'::jsonb),
  ('platina', 'Platina', '💎', '#7fdbff', 4, 15, 120000, 3, '["+3% de comissão extra", "Concierge dedicado", "Bônus mensal de R$ 1.500", "Viagem anual NatLeva"]'::jsonb),
  ('diamante', 'Diamante', '💠', '#a78bfa', 5, 30, 300000, 5, '["+5% de comissão extra", "Co-branding NatLeva", "Bônus mensal de R$ 3.000", "Convenção anual VIP"]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- 2. affiliate_achievements
CREATE TABLE IF NOT EXISTS public.affiliate_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  code text NOT NULL,
  title text NOT NULL,
  description text,
  icon text,
  earned_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(affiliate_id, code)
);

CREATE INDEX IF NOT EXISTS idx_affiliate_achievements_affiliate ON public.affiliate_achievements(affiliate_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_achievements TO authenticated;
GRANT ALL ON public.affiliate_achievements TO service_role;

ALTER TABLE public.affiliate_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliate sees own achievements" ON public.affiliate_achievements FOR SELECT TO authenticated
  USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY "Admin inserts achievements" ON public.affiliate_achievements FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin updates achievements" ON public.affiliate_achievements FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin deletes achievements" ON public.affiliate_achievements FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. affiliate_goals
CREATE TABLE IF NOT EXISTS public.affiliate_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE CASCADE,
  reference_month date NOT NULL,
  target_sales integer NOT NULL DEFAULT 0,
  target_revenue numeric NOT NULL DEFAULT 0,
  bonus_value numeric NOT NULL DEFAULT 0,
  description text,
  is_global boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_goals_month ON public.affiliate_goals(reference_month);
CREATE INDEX IF NOT EXISTS idx_affiliate_goals_affiliate ON public.affiliate_goals(affiliate_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_goals TO authenticated;
GRANT ALL ON public.affiliate_goals TO service_role;

ALTER TABLE public.affiliate_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliate sees own or global goals" ON public.affiliate_goals FOR SELECT TO authenticated
  USING (
    is_global = true
    OR affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY "Admin inserts goals" ON public.affiliate_goals FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin updates goals" ON public.affiliate_goals FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin deletes goals" ON public.affiliate_goals FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_affiliate_goals_updated_at BEFORE UPDATE ON public.affiliate_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed a global goal for current month
INSERT INTO public.affiliate_goals (reference_month, target_sales, target_revenue, bonus_value, description, is_global)
VALUES (date_trunc('month', current_date)::date, 5, 30000, 500, 'Feche 5 viagens este mês e ganhe um bônus extra de R$ 500 no PIX.', true)
ON CONFLICT DO NOTHING;

-- 4. affiliate_materials
CREATE TABLE IF NOT EXISTS public.affiliate_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'image' CHECK (kind IN ('image','video','text','document')),
  format text,
  media_url text,
  thumbnail_url text,
  width integer,
  height integer,
  duration_seconds integer,
  destination_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  copy_text text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_materials_active ON public.affiliate_materials(is_active, display_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_materials TO authenticated;
GRANT SELECT ON public.affiliate_materials TO anon;
GRANT ALL ON public.affiliate_materials TO service_role;

ALTER TABLE public.affiliate_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active materials" ON public.affiliate_materials FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin inserts materials" ON public.affiliate_materials FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin updates materials" ON public.affiliate_materials FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin deletes materials" ON public.affiliate_materials FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_affiliate_materials_updated_at BEFORE UPDATE ON public.affiliate_materials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. RPC: ranking mensal de afiliados
CREATE OR REPLACE FUNCTION public.affiliate_monthly_ranking(p_month date DEFAULT NULL)
RETURNS TABLE(
  affiliate_id uuid,
  full_name text,
  avatar_url text,
  sales_count integer,
  total_revenue numeric,
  total_commission numeric,
  rank integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH month_start AS (
    SELECT COALESCE(date_trunc('month', p_month)::date, date_trunc('month', current_date)::date) AS d
  ),
  agg AS (
    SELECT
      c.affiliate_id,
      COUNT(*)::int AS sales_count,
      COALESCE(SUM(c.sale_value), 0)::numeric AS total_revenue,
      COALESCE(SUM(c.commission_value), 0)::numeric AS total_commission
    FROM public.affiliate_commissions c, month_start
    WHERE c.created_at >= month_start.d
      AND c.created_at < (month_start.d + interval '1 month')
      AND c.status <> 'canceled'
    GROUP BY c.affiliate_id
  )
  SELECT
    a.id,
    a.full_name,
    a.avatar_url,
    COALESCE(g.sales_count, 0)::int,
    COALESCE(g.total_revenue, 0)::numeric,
    COALESCE(g.total_commission, 0)::numeric,
    (ROW_NUMBER() OVER (ORDER BY COALESCE(g.total_commission, 0) DESC, COALESCE(g.sales_count, 0) DESC))::int
  FROM public.affiliates a
  LEFT JOIN agg g ON g.affiliate_id = a.id
  WHERE a.status = 'approved'
  ORDER BY COALESCE(g.total_commission, 0) DESC, COALESCE(g.sales_count, 0) DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.affiliate_monthly_ranking(date) TO authenticated, anon;
