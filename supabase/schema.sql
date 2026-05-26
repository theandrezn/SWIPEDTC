create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.swipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  url text not null,
  type text not null,
  niche text,
  subniche text,
  geo text,
  language text,
  traffic_source text,
  platform text,
  brand text,
  product text,
  price text,
  status text not null default 'Para analisar',
  rating int not null default 3 check (rating between 1 and 5),
  is_favorite boolean not null default false,
  screenshot_url text,
  og_title text,
  og_description text,
  og_image text,
  ad_library_url text,
  creative_url text,
  notes text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.swipe_analysis (
  id uuid primary key default gen_random_uuid(),
  swipe_id uuid not null references public.swipes(id) on delete cascade,
  headline text,
  subheadline text,
  lead text,
  hook text,
  big_idea text,
  promise text,
  problem_mechanism text,
  solution_mechanism text,
  unique_mechanism text,
  proof text,
  story text,
  authority text,
  objections text,
  offer text,
  guarantee text,
  cta text,
  scarcity text,
  urgency text,
  trust_elements text,
  conversion_elements text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.swipe_features (
  id uuid primary key default gen_random_uuid(),
  swipe_id uuid not null references public.swipes(id) on delete cascade,
  has_social_proof boolean not null default false,
  has_testimonials boolean not null default false,
  has_before_after boolean not null default false,
  has_expert boolean not null default false,
  has_studies boolean not null default false,
  has_guarantee boolean not null default false,
  has_bonuses boolean not null default false,
  has_faq boolean not null default false,
  has_comparison boolean not null default false,
  has_price_anchor boolean not null default false,
  has_limited_offer boolean not null default false,
  has_repeated_cta boolean not null default false,
  has_sticky_bar boolean not null default false,
  has_vsl boolean not null default false,
  has_quiz boolean not null default false,
  has_external_checkout boolean not null default false,
  has_order_bump boolean not null default false,
  has_upsell boolean not null default false
);

create table if not exists public.metrics (
  id uuid primary key default gen_random_uuid(),
  swipe_id uuid not null references public.swipes(id) on delete cascade,
  ctr numeric,
  cpc numeric,
  cpm numeric,
  cpa numeric,
  roas numeric,
  conversion_rate numeric,
  epc numeric,
  aov numeric,
  estimated_revenue numeric,
  estimated_spend numeric,
  source text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  description text,
  cover_url text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collection_swipes (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  swipe_id uuid not null references public.swipes(id) on delete cascade,
  unique(collection_id, swipe_id)
);

create table if not exists public.funnels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  niche text,
  product text,
  brand text,
  geo text,
  language text,
  traffic_source text,
  ticket text,
  objective text,
  notes text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.funnel_steps (
  id uuid primary key default gen_random_uuid(),
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  swipe_id uuid references public.swipes(id) on delete set null,
  step_type text not null,
  step_order int not null,
  notes text
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  color text,
  unique(user_id, name)
);

create table if not exists public.swipe_tags (
  id uuid primary key default gen_random_uuid(),
  swipe_id uuid not null references public.swipes(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  unique(swipe_id, tag_id)
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  swipe_id uuid not null references public.swipes(id) on delete cascade,
  file_url text not null,
  file_type text,
  file_name text,
  created_at timestamptz not null default now()
);

alter table public.swipes add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.collections add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.funnels add column if not exists payload jsonb not null default '{}'::jsonb;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        name = coalesce(public.users.name, excluded.name),
        avatar_url = coalesce(public.users.avatar_url, excluded.avatar_url);

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists set_swipes_updated_at on public.swipes;
create trigger set_swipes_updated_at
  before update on public.swipes
  for each row execute function public.set_updated_at();

drop trigger if exists set_swipe_analysis_updated_at on public.swipe_analysis;
create trigger set_swipe_analysis_updated_at
  before update on public.swipe_analysis
  for each row execute function public.set_updated_at();

drop trigger if exists set_metrics_updated_at on public.metrics;
create trigger set_metrics_updated_at
  before update on public.metrics
  for each row execute function public.set_updated_at();

drop trigger if exists set_collections_updated_at on public.collections;
create trigger set_collections_updated_at
  before update on public.collections
  for each row execute function public.set_updated_at();

drop trigger if exists set_funnels_updated_at on public.funnels;
create trigger set_funnels_updated_at
  before update on public.funnels
  for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.swipes enable row level security;
alter table public.swipe_analysis enable row level security;
alter table public.swipe_features enable row level security;
alter table public.metrics enable row level security;
alter table public.collections enable row level security;
alter table public.collection_swipes enable row level security;
alter table public.funnels enable row level security;
alter table public.funnel_steps enable row level security;
alter table public.tags enable row level security;
alter table public.swipe_tags enable row level security;
alter table public.attachments enable row level security;

drop policy if exists "users own profile" on public.users;
create policy "users own profile" on public.users
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "users own swipes" on public.swipes;
create policy "users own swipes" on public.swipes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "users own collections" on public.collections;
create policy "users own collections" on public.collections
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "users own funnels" on public.funnels;
create policy "users own funnels" on public.funnels
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "users own tags" on public.tags;
create policy "users own tags" on public.tags
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "users own swipe analysis" on public.swipe_analysis;
create policy "users own swipe analysis" on public.swipe_analysis
  for all to authenticated
  using (exists (select 1 from public.swipes s where s.id = swipe_id and s.user_id = (select auth.uid())))
  with check (exists (select 1 from public.swipes s where s.id = swipe_id and s.user_id = (select auth.uid())));

drop policy if exists "users own swipe features" on public.swipe_features;
create policy "users own swipe features" on public.swipe_features
  for all to authenticated
  using (exists (select 1 from public.swipes s where s.id = swipe_id and s.user_id = (select auth.uid())))
  with check (exists (select 1 from public.swipes s where s.id = swipe_id and s.user_id = (select auth.uid())));

drop policy if exists "users own metrics" on public.metrics;
create policy "users own metrics" on public.metrics
  for all to authenticated
  using (exists (select 1 from public.swipes s where s.id = swipe_id and s.user_id = (select auth.uid())))
  with check (exists (select 1 from public.swipes s where s.id = swipe_id and s.user_id = (select auth.uid())));

drop policy if exists "users own collection links" on public.collection_swipes;
create policy "users own collection links" on public.collection_swipes
  for all to authenticated
  using (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = (select auth.uid())));

drop policy if exists "users own funnel steps" on public.funnel_steps;
create policy "users own funnel steps" on public.funnel_steps
  for all to authenticated
  using (exists (select 1 from public.funnels f where f.id = funnel_id and f.user_id = (select auth.uid())))
  with check (exists (select 1 from public.funnels f where f.id = funnel_id and f.user_id = (select auth.uid())));

drop policy if exists "users own swipe tags" on public.swipe_tags;
create policy "users own swipe tags" on public.swipe_tags
  for all to authenticated
  using (exists (select 1 from public.swipes s where s.id = swipe_id and s.user_id = (select auth.uid())))
  with check (exists (select 1 from public.swipes s where s.id = swipe_id and s.user_id = (select auth.uid())));

drop policy if exists "users own attachments" on public.attachments;
create policy "users own attachments" on public.attachments
  for all to authenticated
  using (exists (select 1 from public.swipes s where s.id = swipe_id and s.user_id = (select auth.uid())))
  with check (exists (select 1 from public.swipes s where s.id = swipe_id and s.user_id = (select auth.uid())));

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage on sequences to authenticated;

create index if not exists swipes_user_id_idx on public.swipes(user_id);
create index if not exists swipes_type_idx on public.swipes(type);
create index if not exists swipes_niche_idx on public.swipes(niche);
create index if not exists swipes_geo_idx on public.swipes(geo);
create index if not exists swipes_user_created_idx on public.swipes(user_id, created_at desc);
create index if not exists swipe_analysis_swipe_id_idx on public.swipe_analysis(swipe_id);
create index if not exists swipe_features_swipe_id_idx on public.swipe_features(swipe_id);
create index if not exists metrics_swipe_id_idx on public.metrics(swipe_id);
create index if not exists collections_user_id_idx on public.collections(user_id);
create index if not exists collection_swipes_swipe_id_idx on public.collection_swipes(swipe_id);
create index if not exists funnels_user_id_idx on public.funnels(user_id);
create index if not exists funnel_steps_order_idx on public.funnel_steps(funnel_id, step_order);
create index if not exists funnel_steps_swipe_id_idx on public.funnel_steps(swipe_id);
create index if not exists swipe_tags_tag_id_idx on public.swipe_tags(tag_id);
create index if not exists attachments_swipe_id_idx on public.attachments(swipe_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'swipe-screenshots',
  'swipe-screenshots',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users can read own screenshots" on storage.objects;
create policy "users can read own screenshots" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'swipe-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "users can upload own screenshots" on storage.objects;
create policy "users can upload own screenshots" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'swipe-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "users can update own screenshots" on storage.objects;
create policy "users can update own screenshots" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'swipe-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'swipe-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "users can delete own screenshots" on storage.objects;
create policy "users can delete own screenshots" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'swipe-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
