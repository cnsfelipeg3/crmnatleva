
-- Expense split groups
CREATE TABLE public.portal_expense_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Group members
CREATE TABLE public.portal_expense_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.portal_expense_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_color TEXT DEFAULT '#10b981',
  passenger_id UUID REFERENCES public.passengers(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Group expenses
CREATE TABLE public.portal_group_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.portal_expense_groups(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  category TEXT NOT NULL DEFAULT 'outros',
  paid_by_member_id UUID NOT NULL REFERENCES public.portal_expense_group_members(id) ON DELETE CASCADE,
  split_type TEXT NOT NULL DEFAULT 'equal',
  receipt_url TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- How each expense is split among members
CREATE TABLE public.portal_expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.portal_group_expenses(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.portal_expense_group_members(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Settlement records
CREATE TABLE public.portal_expense_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.portal_expense_groups(id) ON DELETE CASCADE,
  from_member_id UUID NOT NULL REFERENCES public.portal_expense_group_members(id) ON DELETE CASCADE,
  to_member_id UUID NOT NULL REFERENCES public.portal_expense_group_members(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.portal_expense_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_expense_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_group_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_expense_settlements ENABLE ROW LEVEL SECURITY;

-- RLS policies - portal users can manage their own groups
CREATE POLICY "Portal users manage own groups"
  ON public.portal_expense_groups FOR ALL TO authenticated
  USING (client_id IN (SELECT client_id FROM public.portal_access WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (client_id IN (SELECT client_id FROM public.portal_access WHERE user_id = auth.uid() AND is_active = true));

-- Members: accessible if you own the group
CREATE POLICY "Portal users manage group members"
  ON public.portal_expense_group_members FOR ALL TO authenticated
  USING (group_id IN (SELECT id FROM public.portal_expense_groups WHERE client_id IN (SELECT client_id FROM public.portal_access WHERE user_id = auth.uid() AND is_active = true)))
  WITH CHECK (group_id IN (SELECT id FROM public.portal_expense_groups WHERE client_id IN (SELECT client_id FROM public.portal_access WHERE user_id = auth.uid() AND is_active = true)));

-- Expenses: accessible if you own the group
CREATE POLICY "Portal users manage group expenses"
  ON public.portal_group_expenses FOR ALL TO authenticated
  USING (group_id IN (SELECT id FROM public.portal_expense_groups WHERE client_id IN (SELECT client_id FROM public.portal_access WHERE user_id = auth.uid() AND is_active = true)))
  WITH CHECK (group_id IN (SELECT id FROM public.portal_expense_groups WHERE client_id IN (SELECT client_id FROM public.portal_access WHERE user_id = auth.uid() AND is_active = true)));

-- Splits: accessible if you own the group
CREATE POLICY "Portal users manage expense splits"
  ON public.portal_expense_splits FOR ALL TO authenticated
  USING (expense_id IN (SELECT id FROM public.portal_group_expenses WHERE group_id IN (SELECT id FROM public.portal_expense_groups WHERE client_id IN (SELECT client_id FROM public.portal_access WHERE user_id = auth.uid() AND is_active = true))))
  WITH CHECK (expense_id IN (SELECT id FROM public.portal_group_expenses WHERE group_id IN (SELECT id FROM public.portal_expense_groups WHERE client_id IN (SELECT client_id FROM public.portal_access WHERE user_id = auth.uid() AND is_active = true))));

-- Settlements: accessible if you own the group
CREATE POLICY "Portal users manage settlements"
  ON public.portal_expense_settlements FOR ALL TO authenticated
  USING (group_id IN (SELECT id FROM public.portal_expense_groups WHERE client_id IN (SELECT client_id FROM public.portal_access WHERE user_id = auth.uid() AND is_active = true)))
  WITH CHECK (group_id IN (SELECT id FROM public.portal_expense_groups WHERE client_id IN (SELECT client_id FROM public.portal_access WHERE user_id = auth.uid() AND is_active = true)));

-- CRM admin policies
CREATE POLICY "CRM admins manage all expense groups"
  ON public.portal_expense_groups FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "CRM admins manage all group members"
  ON public.portal_expense_group_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "CRM admins manage all group expenses"
  ON public.portal_group_expenses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "CRM admins manage all expense splits"
  ON public.portal_expense_splits FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "CRM admins manage all settlements"
  ON public.portal_expense_settlements FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));
