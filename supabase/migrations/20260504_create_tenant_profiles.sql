create table public.tenant_profiles (
  tenant_id uuid references public.tenants(id) on delete cascade primary key,
  budget_max int,
  bedrooms int,
  move_in_date date,
  neighborhoods text[] not null default '{}',
  lifestyle_signals jsonb not null default '{}',
  interview_state jsonb not null default '{}',
  completed_blocks int not null default 0,
  extracted_fields text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tenant_profiles enable row level security;

create policy "tenant_profiles: select own row"
  on public.tenant_profiles for select using (auth.uid() = tenant_id);

create policy "tenant_profiles: insert own row"
  on public.tenant_profiles for insert with check (auth.uid() = tenant_id);

create policy "tenant_profiles: update own row"
  on public.tenant_profiles for update using (auth.uid() = tenant_id);
