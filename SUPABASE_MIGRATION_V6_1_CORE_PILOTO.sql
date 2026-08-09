-- MONSTROS AI 2.4.1 — CORE PILOTO
-- Compatibilidade segura para memória operacional.
begin;

create table if not exists public.operational_events (
  id uuid primary key default gen_random_uuid()
);

alter table public.operational_events
  add column if not exists company_id uuid,
  add column if not exists event_type text,
  add column if not exists title text,
  add column if not exists text text,
  add column if not exists seller_id uuid,
  add column if not exists mission_id uuid,
  add column if not exists impact numeric(14,2) default 0,
  add column if not exists status text,
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz default now();

update public.operational_events set created_at=now() where created_at is null;

create index if not exists operational_events_company_created_idx
  on public.operational_events(company_id,created_at desc);
create index if not exists operational_events_seller_idx
  on public.operational_events(seller_id,created_at desc);
create index if not exists operational_events_mission_idx
  on public.operational_events(mission_id,created_at desc);

alter table public.operational_events enable row level security;
drop policy if exists operational_events_company_read on public.operational_events;
create policy operational_events_company_read on public.operational_events
for select to authenticated using (
  company_id=(select company_id from public.profiles where id=auth.uid() limit 1)
);
drop policy if exists operational_events_company_insert on public.operational_events;
create policy operational_events_company_insert on public.operational_events
for insert to authenticated with check (
  company_id=(select company_id from public.profiles where id=auth.uid() limit 1)
);
grant select,insert on public.operational_events to authenticated;

notify pgrst, 'reload schema';
commit;
