create extension if not exists "pgcrypto";
create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

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

create table if not exists public.ad_libraries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  platform text not null,
  advertiser_name text not null,
  library_url text not null,
  niche text,
  geo text,
  status text not null default 'Ativo',
  current_ad_count integer not null default 0 check (current_ad_count >= 0),
  meta_page_id text,
  scrape_enabled boolean not null default true,
  last_scraped_at timestamptz,
  scrape_status text not null default 'manual',
  scrape_error text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ad_library_snapshots (
  id uuid primary key default gen_random_uuid(),
  ad_library_id uuid references public.ad_libraries(id) on delete cascade,
  swipe_id uuid references public.swipes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  snapshot_date date not null default current_date,
  ad_count integer not null default 0 check (ad_count >= 0),
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  unique(ad_library_id, snapshot_date),
  unique(swipe_id, snapshot_date),
  check (ad_library_id is not null or swipe_id is not null)
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
alter table public.ad_libraries add column if not exists meta_page_id text;
alter table public.ad_libraries add column if not exists scrape_enabled boolean not null default true;
alter table public.ad_libraries add column if not exists last_scraped_at timestamptz;
alter table public.ad_libraries add column if not exists scrape_status text not null default 'manual';
alter table public.ad_libraries add column if not exists scrape_error text;
alter table public.ad_library_snapshots alter column ad_library_id drop not null;
alter table public.ad_library_snapshots add column if not exists swipe_id uuid references public.swipes(id) on delete cascade;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ad_library_snapshots_swipe_id_snapshot_date_key'
  ) then
    alter table public.ad_library_snapshots add constraint ad_library_snapshots_swipe_id_snapshot_date_key unique (swipe_id, snapshot_date);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'ad_library_snapshots_has_owner_link'
  ) then
    alter table public.ad_library_snapshots add constraint ad_library_snapshots_has_owner_link check (ad_library_id is not null or swipe_id is not null);
  end if;
end $$;

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

drop trigger if exists set_ad_libraries_updated_at on public.ad_libraries;
create trigger set_ad_libraries_updated_at
  before update on public.ad_libraries
  for each row execute function public.set_updated_at();

drop trigger if exists set_funnels_updated_at on public.funnels;
create trigger set_funnels_updated_at
  before update on public.funnels
  for each row execute function public.set_updated_at();

create or replace function public.snapshot_ad_libraries_daily()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.ad_library_snapshots (ad_library_id, user_id, snapshot_date, ad_count, source)
  select id, user_id, current_date, current_ad_count, 'daily_snapshot'
  from public.ad_libraries
  where status = 'Ativo'
  on conflict (ad_library_id, snapshot_date)
  do update set
    ad_count = excluded.ad_count,
    source = excluded.source,
    created_at = now();
$$;

revoke all on function public.snapshot_ad_libraries_daily() from public, anon, authenticated;

alter table public.users enable row level security;
alter table public.swipes enable row level security;
alter table public.swipe_analysis enable row level security;
alter table public.swipe_features enable row level security;
alter table public.metrics enable row level security;
alter table public.collections enable row level security;
alter table public.ad_libraries enable row level security;
alter table public.ad_library_snapshots enable row level security;
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

drop policy if exists "users own ad libraries" on public.ad_libraries;
create policy "users own ad libraries" on public.ad_libraries
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "users own ad library snapshots" on public.ad_library_snapshots;
create policy "users own ad library snapshots" on public.ad_library_snapshots
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      exists (
        select 1
        from public.ad_libraries l
        where l.id = ad_library_id
          and l.user_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.swipes s
        where s.id = swipe_id
          and s.user_id = (select auth.uid())
      )
    )
  );

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
create index if not exists ad_libraries_user_id_idx on public.ad_libraries(user_id);
create index if not exists ad_libraries_user_updated_idx on public.ad_libraries(user_id, updated_at desc);
create index if not exists ad_libraries_meta_sync_idx on public.ad_libraries(platform, scrape_enabled, status);
create index if not exists ad_library_snapshots_user_date_idx on public.ad_library_snapshots(user_id, snapshot_date);
create index if not exists ad_library_snapshots_library_date_idx on public.ad_library_snapshots(ad_library_id, snapshot_date);
create index if not exists ad_library_snapshots_swipe_date_idx on public.ad_library_snapshots(swipe_id, snapshot_date);
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

select cron.schedule(
  'snapshot-ad-libraries-daily',
  '5 8 * * *',
  $$select public.snapshot_ad_libraries_daily();$$
)
where not exists (
  select 1 from cron.job where jobname = 'snapshot-ad-libraries-daily'
);
