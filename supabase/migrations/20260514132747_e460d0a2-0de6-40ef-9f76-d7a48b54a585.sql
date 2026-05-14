
create table if not exists public.product_marketing_assets (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null,
  format text not null,
  url text not null,
  prompt jsonb,
  model text,
  created_at timestamptz not null default now()
);

create index if not exists idx_pma_product on public.product_marketing_assets(product_id, created_at desc);

alter table public.product_marketing_assets disable row level security;

insert into storage.buckets (id, name, public)
values ('marketing-assets', 'marketing-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "marketing-assets public read" on storage.objects;
create policy "marketing-assets public read" on storage.objects
  for select using (bucket_id = 'marketing-assets');

drop policy if exists "marketing-assets anon write" on storage.objects;
create policy "marketing-assets anon write" on storage.objects
  for insert with check (bucket_id = 'marketing-assets');

drop policy if exists "marketing-assets anon update" on storage.objects;
create policy "marketing-assets anon update" on storage.objects
  for update using (bucket_id = 'marketing-assets');

drop policy if exists "marketing-assets anon delete" on storage.objects;
create policy "marketing-assets anon delete" on storage.objects
  for delete using (bucket_id = 'marketing-assets');
