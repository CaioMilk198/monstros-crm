-- MONSTROS AI 2.6.0 — PILOTO VALIDÁVEL
-- Normaliza memória operacional e endurece o escopo dos logins de vendedor.
-- Rode UMA VEZ no SQL Editor do Supabase antes do deploy 2.6.

begin;

-- 1. Compatibilidade da Timeline com todas as versões anteriores.
alter table public.operational_events
  add column if not exists text text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists mission_id uuid,
  add column if not exists status text,
  add column if not exists created_by uuid;

do $$
begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='operational_events' and column_name='description') then
    execute 'update public.operational_events set text=coalesce(text,description) where text is null';
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='operational_events' and column_name='event_at') then
    execute 'update public.operational_events set created_at=coalesce(created_at,event_at) where created_at is null';
  end if;
end $$;

update public.operational_events set created_at=now() where created_at is null;
create index if not exists operational_events_company_created_idx on public.operational_events(company_id,created_at desc);
create index if not exists operational_events_seller_created_idx on public.operational_events(seller_id,created_at desc);

-- 2. Eventos: gestor vê a empresa; vendedor vê apenas o próprio histórico.
drop policy if exists operational_events_company_read on public.operational_events;
drop policy if exists operational_events_read on public.operational_events;
create policy operational_events_read on public.operational_events
for select to authenticated using (
  company_id=(select company_id from public.profiles where id=auth.uid() limit 1)
  and (
    coalesce((select role::text from public.profiles where id=auth.uid() limit 1),'') in ('admin','manager','supervisor')
    or seller_id=(select seller_id from public.profiles where id=auth.uid() limit 1)
  )
);

drop policy if exists operational_events_company_insert on public.operational_events;
drop policy if exists operational_events_write on public.operational_events;
create policy operational_events_write on public.operational_events
for insert to authenticated with check (
  company_id=(select company_id from public.profiles where id=auth.uid() limit 1)
  and (
    coalesce((select role::text from public.profiles where id=auth.uid() limit 1),'') in ('admin','manager','supervisor')
    or seller_id=(select seller_id from public.profiles where id=auth.uid() limit 1)
  )
);

grant select,insert on public.operational_events to authenticated;

-- 3. Missões: vendedor enxerga apenas as próprias; gestor enxerga todas.
drop policy if exists management_missions_read on public.management_missions;
create policy management_missions_read on public.management_missions
for select to authenticated using (
  company_id=(select company_id from public.profiles where id=auth.uid() limit 1)
  and (
    coalesce((select role::text from public.profiles where id=auth.uid() limit 1),'') in ('admin','manager','supervisor')
    or seller_id=(select seller_id from public.profiles where id=auth.uid() limit 1)
  )
);

-- RPC de listagem com o mesmo escopo da interface.
create or replace function public.list_management_missions(
  p_status text default null,
  p_limit integer default 20
)
returns table(
  id uuid,
  seller_id uuid,
  seller_name text,
  source text,
  title text,
  reason text,
  action_text text,
  priority text,
  status text,
  estimated_impact numeric,
  estimated_minutes integer,
  due_date date,
  created_at timestamptz,
  completed_at timestamptz
)
language sql
security definer
set search_path=public
as $$
  with me as (
    select company_id,seller_id,role::text role from public.profiles where id=auth.uid() limit 1
  )
  select
    m.id,m.seller_id,s.full_name,m.source,m.title,m.reason,m.action_text,m.priority,m.status,
    m.estimated_impact,m.estimated_minutes,m.due_date,m.created_at,m.completed_at
  from public.management_missions m
  left join public.sellers s on s.id=m.seller_id
  cross join me
  where m.company_id=me.company_id
    and (me.role in ('admin','manager','supervisor') or m.seller_id=me.seller_id)
    and (p_status is null or m.status=p_status)
  order by
    case m.status when 'in_progress' then 1 when 'pending' then 2 when 'completed' then 3 else 4 end,
    case m.priority when 'critical' then 1 when 'high' then 2 when 'medium' then 3 else 4 end,
    m.created_at desc
  limit greatest(1,least(coalesce(p_limit,20),100));
$$;
grant execute on function public.list_management_missions(text,integer) to authenticated;

-- Status da missão: gestor altera qualquer missão da empresa; vendedor somente a própria.
create or replace function public.update_management_mission_status(
  p_mission_id uuid,
  p_status text,
  p_completion_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_company uuid;
  v_seller uuid;
  v_role text;
  v_row public.management_missions%rowtype;
begin
  select company_id,seller_id,role::text into v_company,v_seller,v_role from public.profiles where id=auth.uid() limit 1;
  if v_company is null then raise exception 'Perfil não encontrado.'; end if;
  if p_status not in ('pending','in_progress','completed','cancelled') then raise exception 'Status inválido.'; end if;

  update public.management_missions
  set status=p_status,
      started_at=case when p_status='in_progress' and started_at is null then now() else started_at end,
      completed_at=case when p_status='completed' then now() when p_status<>'completed' then null else completed_at end,
      completion_note=case when p_status='completed' then p_completion_note else completion_note end,
      updated_at=now()
  where id=p_mission_id
    and company_id=v_company
    and (v_role in ('admin','manager','supervisor') or seller_id=v_seller)
  returning * into v_row;

  if v_row.id is null then raise exception 'Missão não encontrada ou sem permissão.'; end if;
  return jsonb_build_object('ok',true,'id',v_row.id,'status',v_row.status,'completed_at',v_row.completed_at);
end;
$$;
grant execute on function public.update_management_mission_status(uuid,text,text) to authenticated;

-- 4. Academy: vendedor só lê/escreve seu próprio progresso.
drop policy if exists academy_progress_rw on public.academy_progress;
drop policy if exists academy_progress_select on public.academy_progress;
drop policy if exists academy_progress_insert on public.academy_progress;
drop policy if exists academy_progress_update on public.academy_progress;
create policy academy_progress_select on public.academy_progress
for select to authenticated using (
  company_id=(select company_id from public.profiles where id=auth.uid() limit 1)
  and (
    coalesce((select role::text from public.profiles where id=auth.uid() limit 1),'') in ('admin','manager','supervisor')
    or seller_id=(select seller_id from public.profiles where id=auth.uid() limit 1)
  )
);
create policy academy_progress_insert on public.academy_progress
for insert to authenticated with check (
  company_id=(select company_id from public.profiles where id=auth.uid() limit 1)
  and (
    coalesce((select role::text from public.profiles where id=auth.uid() limit 1),'') in ('admin','manager','supervisor')
    or seller_id=(select seller_id from public.profiles where id=auth.uid() limit 1)
  )
);
create policy academy_progress_update on public.academy_progress
for update to authenticated using (
  company_id=(select company_id from public.profiles where id=auth.uid() limit 1)
  and (
    coalesce((select role::text from public.profiles where id=auth.uid() limit 1),'') in ('admin','manager','supervisor')
    or seller_id=(select seller_id from public.profiles where id=auth.uid() limit 1)
  )
)
with check (
  company_id=(select company_id from public.profiles where id=auth.uid() limit 1)
  and (
    coalesce((select role::text from public.profiles where id=auth.uid() limit 1),'') in ('admin','manager','supervisor')
    or seller_id=(select seller_id from public.profiles where id=auth.uid() limit 1)
  )
);
grant select,insert,update on public.academy_progress to authenticated;

-- 5. Call Lab: mantém o modo sem custo e reforça o escopo do vendedor.
-- (as policies 2.5 já são compatíveis; aqui apenas garantimos os grants)
grant select,insert,update on public.call_recordings to authenticated;

notify pgrst,'reload schema';
commit;

select
  to_regclass('public.management_missions') is not null as missions_ok,
  to_regclass('public.operational_events') is not null as timeline_ok,
  to_regclass('public.call_recordings') is not null as calls_ok,
  to_regclass('public.academy_progress') is not null as academy_ok,
  to_regprocedure('public.list_management_missions(text,integer)') is not null as missions_rpc_ok;
