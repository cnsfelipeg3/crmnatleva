ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS commission_rules jsonb NOT NULL DEFAULT jsonb_build_object(
    'mode', 'default',
    'base', 'individual',
    'tiers', '[]'::jsonb
  );

COMMENT ON COLUMN public.employees.commission_rules IS
'Regras de comissão personalizadas. Schema: {mode: "default"|"tiers", base: "company"|"individual", tiers: [{up_to: number|null, percent: number}]}. Quando mode=default usa o padrão 7%/20% por origem do lead. Quando mode=tiers aplica progressivo sobre o lucro acumulado da base escolhida (company ou individual) no mês.';
