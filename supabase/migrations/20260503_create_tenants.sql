create table public.tenants (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  google_id text,
  created_at timestamptz default now() not null
);

alter table public.tenants enable row level security;

create policy "tenants: select own row"
  on public.tenants for select using (auth.uid() = id);

create policy "tenants: insert own row"
  on public.tenants for insert with check (auth.uid() = id);

create policy "tenants: update own row"
  on public.tenants for update using (auth.uid() = id);
