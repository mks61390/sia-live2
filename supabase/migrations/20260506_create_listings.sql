create table public.listings (
  id            uuid        primary key default gen_random_uuid(),
  source        text        not null,
  source_id     text        not null,
  source_url    text        not null,
  title         text        not null,
  description   text,
  price         int,
  bedrooms      numeric(3,1),
  area_sqm      int,
  lat           float8,
  lng           float8,
  neighborhood  text,
  photos        jsonb       not null default '[]',
  published_at  timestamptz,
  last_seen_at  timestamptz not null default now(),
  is_stale      boolean     not null default false,
  geo_enrichment jsonb,
  created_at    timestamptz not null default now(),
  unique (source, source_id)
);

-- Tenants can read all listings; writes are service-role only (bypasses RLS).
alter table public.listings enable row level security;

create policy "listings: authenticated read"
  on public.listings for select using (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────────────────
-- Staleness: mark listings not re-confirmed within 48 h as is_stale = true.
-- Requires pg_cron extension (enabled by default on Supabase Pro/Team plans).
-- Run the block below manually in the Supabase SQL editor after enabling pg_cron.
-- ─────────────────────────────────────────────────────────────────────────────

-- create or replace function public.mark_stale_listings()
-- returns void language sql as $$
--   update public.listings
--   set    is_stale = true
--   where  last_seen_at < now() - interval '48 hours'
--     and  is_stale = false;
-- $$;
--
-- select cron.schedule(
--   'mark-stale-listings',   -- job name
--   '0 */6 * * *',           -- every 6 hours
--   'select public.mark_stale_listings()'
-- );
