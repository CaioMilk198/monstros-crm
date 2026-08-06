begin;

create table if not exists public.academy_modules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  title text not null,
  category text not null,
  description text,
  duration_minutes integer not null default 5,
  content jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.academy_progress (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  seller_id uuid not null references public.sellers(id) on delete cascade,
  module_id uuid not null references public.academy_modules(id) on delete cascade,
  progress integer not null default 0 check(progress between 0 and 100),
  status text not null default 'started' check(status in ('started','completed')),
  score numeric(5,2),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(seller_id,module_id)
);

create table if not exists public.seller_timeline_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  seller_id uuid references public.sellers(id) on delete cascade,
  event_type text not null,
  title text not null,
  description text,
  previous_value numeric,
  new_value numeric,
  metadata jsonb not null default '{}'::jsonb,
  event_at timestamptz not null default now()
);

alter table public.academy_modules enable row level security;
alter table public.academy_progress enable row level security;
alter table public.seller_timeline_events enable row level security;

drop policy if exists academy_modules_read on public.academy_modules;
create policy academy_modules_read on public.academy_modules for select to authenticated using(company_id is null or company_id=(select company_id from public.current_profile()));

drop policy if exists academy_progress_rw on public.academy_progress;
create policy academy_progress_rw on public.academy_progress for all to authenticated
using(company_id=(select company_id from public.current_profile()))
with check(company_id=(select company_id from public.current_profile()));

drop policy if exists seller_timeline_read on public.seller_timeline_events;
create policy seller_timeline_read on public.seller_timeline_events for select to authenticated
using(company_id=(select company_id from public.current_profile()));

drop policy if exists seller_timeline_write on public.seller_timeline_events;
create policy seller_timeline_write on public.seller_timeline_events for insert to authenticated
with check(company_id=(select company_id from public.current_profile()) and (select role from public.current_profile()) in ('admin','manager','supervisor'));

insert into public.academy_modules(company_id,title,category,description,duration_minutes,content)
select null,'Da abordagem ao fechamento','conversao','Perguntas, diagnóstico e avanço da venda.',12,'{"type":"microtraining"}'::jsonb
where not exists(select 1 from public.academy_modules where title='Da abordagem ao fechamento');

insert into public.academy_modules(company_id,title,category,description,duration_minutes,content)
select null,'Pedido confirmado, cliente comprometido','cancelamento','Resumo, validação e redução de cancelamento.',8,'{"type":"microtraining"}'::jsonb
where not exists(select 1 from public.academy_modules where title='Pedido confirmado, cliente comprometido');

insert into public.academy_modules(company_id,title,category,description,duration_minutes,content)
select null,'Como elevar o valor por pedido','ticket','Pacotes, ancoragem e oferta complementar.',10,'{"type":"microtraining"}'::jsonb
where not exists(select 1 from public.academy_modules where title='Como elevar o valor por pedido');

notify pgrst,'reload schema';
commit;

select
  to_regclass('public.academy_modules') is not null as academy_modules_ok,
  to_regclass('public.academy_progress') is not null as academy_progress_ok,
  to_regclass('public.seller_timeline_events') is not null as seller_timeline_ok;
