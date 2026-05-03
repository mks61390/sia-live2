create table saved_listings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null,
  saved_at timestamptz not null default now(),
  unique (tenant_id, listing_id)
);
