create extension if not exists "pgcrypto";

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.swipes (
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.swipe_analysis (
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

create table public.swipe_features (
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

create table public.metrics (
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

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  description text,
  cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collection_swipes (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  swipe_id uuid not null references public.swipes(id) on delete cascade,
  unique(collection_id, swipe_id)
);

create table public.funnels (
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.funnel_steps (
  id uuid primary key default gen_random_uuid(),
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  swipe_id uuid references public.swipes(id) on delete set null,
  step_type text not null,
  step_order int not null,
  notes text
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  color text,
  unique(user_id, name)
);

create table public.swipe_tags (
  id uuid primary key default gen_random_uuid(),
  swipe_id uuid not null references public.swipes(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  unique(swipe_id, tag_id)
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  swipe_id uuid not null references public.swipes(id) on delete cascade,
  file_url text not null,
  file_type text,
  file_name text,
  created_at timestamptz not null default now()
);

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

create policy "users own profile" on public.users for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "users own swipes" on public.swipes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own collections" on public.collections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own funnels" on public.funnels for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own tags" on public.tags for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users own swipe analysis" on public.swipe_analysis
  for all using (exists (select 1 from public.swipes s where s.id = swipe_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.swipes s where s.id = swipe_id and s.user_id = auth.uid()));

create policy "users own swipe features" on public.swipe_features
  for all using (exists (select 1 from public.swipes s where s.id = swipe_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.swipes s where s.id = swipe_id and s.user_id = auth.uid()));

create policy "users own metrics" on public.metrics
  for all using (exists (select 1 from public.swipes s where s.id = swipe_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.swipes s where s.id = swipe_id and s.user_id = auth.uid()));

create policy "users own collection links" on public.collection_swipes
  for all using (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid()));

create policy "users own funnel steps" on public.funnel_steps
  for all using (exists (select 1 from public.funnels f where f.id = funnel_id and f.user_id = auth.uid()))
  with check (exists (select 1 from public.funnels f where f.id = funnel_id and f.user_id = auth.uid()));

create policy "users own swipe tags" on public.swipe_tags
  for all using (exists (select 1 from public.swipes s where s.id = swipe_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.swipes s where s.id = swipe_id and s.user_id = auth.uid()));

create policy "users own attachments" on public.attachments
  for all using (exists (select 1 from public.swipes s where s.id = swipe_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.swipes s where s.id = swipe_id and s.user_id = auth.uid()));

create index swipes_user_id_idx on public.swipes(user_id);
create index swipes_type_idx on public.swipes(type);
create index swipes_niche_idx on public.swipes(niche);
create index swipes_geo_idx on public.swipes(geo);
create index funnel_steps_order_idx on public.funnel_steps(funnel_id, step_order);
