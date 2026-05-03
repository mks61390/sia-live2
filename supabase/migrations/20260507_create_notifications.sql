create table public.notifications (
  id         uuid        primary key default gen_random_uuid(),
  tenant_id  uuid        not null references auth.users(id) on delete cascade,
  listing_id uuid        not null,
  channel    text        not null check (channel in ('email', 'in_app')),
  sent_at    timestamptz not null default now(),
  read_at    timestamptz,
  unique (tenant_id, listing_id, channel)
);

alter table public.notifications enable row level security;

-- Tenants can read their own notifications; mark them read via service role
create policy "notifications: tenant select own"
  on public.notifications for select
  using (auth.uid() = tenant_id);

create policy "notifications: tenant update own read_at"
  on public.notifications for update
  using (auth.uid() = tenant_id);
