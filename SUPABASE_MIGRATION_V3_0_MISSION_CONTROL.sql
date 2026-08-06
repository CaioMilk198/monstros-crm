
-- MONSTROS CRM — MIGRAÇÃO V3.0
-- Controle de Missões: missões manuais, andamento, conclusão e impacto.
-- Execute após o HOTFIX V2.3.

begin;

create table if not exists public.management_missions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  seller_id uuid references public.sellers(id) on delete set null,
  created_by uuid not null references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  source text not null default 'manual'
    check(source in ('manual','automatic','monstrao')),
  title text not null,
  reason text,
  action_text text,
  priority text not null default 'medium'
    check(priority in ('critical','high','medium','low')),
  status text not null default 'pending'
    check(status in ('pending','in_progress','completed','cancelled')),
  estimated_impact numeric(14,2) not null default 0,
  estimated_minutes integer not null default 20,
  due_date date,
  started_at timestamptz,
  completed_at timestamptz,
  completion_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists management_missions_company_status_idx
  on public.management_missions(company_id,status,created_at desc);

create index if not exists management_missions_seller_idx
  on public.management_missions(seller_id,created_at desc);

alter table public.management_missions enable row level security;

drop policy if exists management_missions_read
on public.management_missions;

create policy management_missions_read
on public.management_missions
for select to authenticated
using (
  company_id=(select company_id from public.current_profile())
);

drop policy if exists management_missions_write
on public.management_missions;

create policy management_missions_write
on public.management_missions
for all to authenticated
using (
  company_id=(select company_id from public.current_profile())
  and (select role from public.current_profile())
      in ('admin','manager','supervisor')
)
with check (
  company_id=(select company_id from public.current_profile())
  and (select role from public.current_profile())
      in ('admin','manager','supervisor')
);

create or replace function public.create_management_mission(
  p_title text,
  p_seller_id uuid default null,
  p_reason text default null,
  p_action_text text default null,
  p_priority text default 'medium',
  p_estimated_impact numeric default 0,
  p_estimated_minutes integer default 20,
  p_due_date date default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_profile public.profiles%rowtype;
  v_id uuid;
begin
  select * into v_profile
  from public.profiles
  where id=auth.uid();

  if v_profile.id is null then
    raise exception 'Perfil não encontrado.';
  end if;

  if v_profile.role not in ('admin','manager','supervisor') then
    raise exception 'Seu perfil não pode criar missões.';
  end if;

  if nullif(trim(p_title),'') is null then
    raise exception 'Informe o título da missão.';
  end if;

  insert into public.management_missions(
    company_id,seller_id,created_by,assigned_to,source,
    title,reason,action_text,priority,status,
    estimated_impact,estimated_minutes,due_date
  )
  values(
    v_profile.company_id,p_seller_id,auth.uid(),auth.uid(),'manual',
    trim(p_title),p_reason,p_action_text,
    case when p_priority in ('critical','high','medium','low')
      then p_priority else 'medium' end,
    'pending',
    greatest(coalesce(p_estimated_impact,0),0),
    greatest(coalesce(p_estimated_minutes,20),1),
    p_due_date
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.create_management_mission(
  text,uuid,text,text,text,numeric,integer,date
) to authenticated;

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
  select
    m.id,
    m.seller_id,
    s.full_name,
    m.source,
    m.title,
    m.reason,
    m.action_text,
    m.priority,
    m.status,
    m.estimated_impact,
    m.estimated_minutes,
    m.due_date,
    m.created_at,
    m.completed_at
  from public.management_missions m
  left join public.sellers s on s.id=m.seller_id
  where m.company_id=(select company_id from public.current_profile())
    and (p_status is null or m.status=p_status)
  order by
    case m.status
      when 'in_progress' then 1
      when 'pending' then 2
      when 'completed' then 3
      else 4
    end,
    case m.priority
      when 'critical' then 1
      when 'high' then 2
      when 'medium' then 3
      else 4
    end,
    m.created_at desc
  limit greatest(1,least(coalesce(p_limit,20),100));
$$;

grant execute on function public.list_management_missions(text,integer)
to authenticated;

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
  v_profile public.profiles%rowtype;
  v_row public.management_missions%rowtype;
begin
  select * into v_profile
  from public.profiles
  where id=auth.uid();

  if v_profile.id is null then
    raise exception 'Perfil não encontrado.';
  end if;

  if p_status not in ('pending','in_progress','completed','cancelled') then
    raise exception 'Status inválido.';
  end if;

  update public.management_missions
  set
    status=p_status,
    started_at=case
      when p_status='in_progress' and started_at is null then now()
      else started_at
    end,
    completed_at=case
      when p_status='completed' then now()
      when p_status<>'completed' then null
      else completed_at
    end,
    completion_note=case
      when p_status='completed' then p_completion_note
      else completion_note
    end,
    updated_at=now()
  where id=p_mission_id
    and company_id=v_profile.company_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Missão não encontrada.';
  end if;

  return jsonb_build_object(
    'ok',true,
    'id',v_row.id,
    'status',v_row.status,
    'completed_at',v_row.completed_at
  );
end;
$$;

grant execute on function public.update_management_mission_status(
  uuid,text,text
) to authenticated;

-- Ajuste de classificação do Índice Monstro.
create or replace function public.get_monster_engine_payload_v30(
  p_date date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_payload jsonb;
  v_index numeric;
  v_status text;
begin
  v_payload := public.get_monster_engine_payload_v23(p_date);

  if coalesce(v_payload->>'date','')='' then
    return v_payload;
  end if;

  v_index := coalesce((v_payload#>>'{health,monster_index}')::numeric,0);

  v_status := case
    when v_index>=90 then 'Excelente'
    when v_index>=80 then 'Saudável'
    when v_index>=65 then 'Atenção'
    else 'Crítica'
  end;

  return jsonb_set(
    v_payload,
    '{health,status}',
    to_jsonb(v_status),
    true
  );
end;
$$;

grant execute on function public.get_monster_engine_payload_v30(date)
to authenticated;

notify pgrst, 'reload schema';

commit;

select
  to_regclass('public.management_missions') is not null
    as tabela_missoes_existe,
  to_regprocedure(
    'public.create_management_mission(text,uuid,text,text,text,numeric,integer,date)'
  ) is not null as criar_missao_existe,
  to_regprocedure(
    'public.get_monster_engine_payload_v30(date)'
  ) is not null as engine_v30_existe;
