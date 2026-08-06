
-- MONSTROS CRM — MIGRAÇÃO V2.0
-- Monster Engine Beta: dias úteis, projeção, Índice Monstro,
-- oportunidades, perdas, DNA Comercial e Perfil 360.
-- Execute após as migrações anteriores.

begin;

create table if not exists public.business_calendars (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  competence date not null,
  total_business_days integer not null default 22 check(total_business_days > 0),
  elapsed_business_days integer not null default 1 check(elapsed_business_days > 0),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique(company_id, competence)
);

alter table public.business_calendars enable row level security;

drop policy if exists business_calendars_read on public.business_calendars;
create policy business_calendars_read
on public.business_calendars for select to authenticated
using (company_id = (select company_id from public.current_profile()));

drop policy if exists business_calendars_write on public.business_calendars;
create policy business_calendars_write
on public.business_calendars for all to authenticated
using (
  company_id = (select company_id from public.current_profile())
  and (select role from public.current_profile()) in ('admin','manager','supervisor')
)
with check (
  company_id = (select company_id from public.current_profile())
  and (select role from public.current_profile()) in ('admin','manager','supervisor')
);

create or replace function public.set_business_calendar(
  p_competence date,
  p_total_business_days integer,
  p_elapsed_business_days integer
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_profile public.profiles%rowtype;
begin
  select * into v_profile from public.profiles where id=auth.uid();
  if v_profile.id is null then raise exception 'Perfil não encontrado.'; end if;
  if v_profile.role not in ('admin','manager','supervisor') then
    raise exception 'Seu perfil não pode alterar dias úteis.';
  end if;
  if p_total_business_days < 1 then raise exception 'Dias úteis totais deve ser maior que zero.'; end if;
  if p_elapsed_business_days < 1 or p_elapsed_business_days > p_total_business_days then
    raise exception 'Dias trabalhados deve estar entre 1 e o total de dias úteis.';
  end if;

  insert into public.business_calendars(
    company_id,competence,total_business_days,elapsed_business_days,updated_by,updated_at
  )
  values(
    v_profile.company_id,date_trunc('month',p_competence)::date,
    p_total_business_days,p_elapsed_business_days,auth.uid(),now()
  )
  on conflict(company_id,competence)
  do update set
    total_business_days=excluded.total_business_days,
    elapsed_business_days=excluded.elapsed_business_days,
    updated_by=excluded.updated_by,
    updated_at=now();

  return jsonb_build_object(
    'ok',true,
    'total_business_days',p_total_business_days,
    'elapsed_business_days',p_elapsed_business_days,
    'remaining_business_days',p_total_business_days-p_elapsed_business_days
  );
end;
$$;

grant execute on function public.set_business_calendar(date,integer,integer) to authenticated;

create or replace function public.get_monster_engine_payload(p_date date default current_date)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_profile public.profiles%rowtype;
  v_latest date;
  v_previous date;
  v_competence date;
  v_total_days integer := 22;
  v_elapsed_days integer := 1;
  v_remaining_days integer := 21;
  v_target numeric := 0;
  v_ticket_target numeric := 0;
  v_cancel_limit numeric := 0.15;
  v_revenue numeric := 0;
  v_orders numeric := 0;
  v_ticket numeric := 0;
  v_cancel numeric := 0;
  v_active numeric := 0;
  v_projection numeric := 0;
  v_daily_rate numeric := 0;
  v_revenue_health numeric := 50;
  v_ticket_health numeric := 50;
  v_cancel_health numeric := 50;
  v_active_health numeric := 50;
  v_monster_index numeric := 50;
  v_ticket_opportunity numeric := 0;
  v_cancel_loss numeric := 0;
  v_active_opportunity numeric := 0;
  v_total_opportunity numeric := 0;
  v_prev_revenue numeric := 0;
  v_result jsonb;
begin
  select * into v_profile from public.profiles where id=auth.uid();
  if v_profile.id is null then raise exception 'Perfil não encontrado.'; end if;

  select max(indicator_date) into v_latest
  from public.daily_indicators
  where company_id=v_profile.company_id and indicator_date<=p_date;

  if v_latest is null then
    return jsonb_build_object('date',null,'health',jsonb_build_object('monster_index',0));
  end if;

  v_competence := date_trunc('month',v_latest)::date;

  select total_business_days,elapsed_business_days
  into v_total_days,v_elapsed_days
  from public.business_calendars
  where company_id=v_profile.company_id and competence=v_competence;

  v_total_days := coalesce(v_total_days,22);
  v_elapsed_days := greatest(1,least(coalesce(v_elapsed_days,1),v_total_days));
  v_remaining_days := greatest(v_total_days-v_elapsed_days,0);

  select coalesce(revenue_target,0),coalesce(ticket_target,0),coalesce(cancellation_limit,0.15)
  into v_target,v_ticket_target,v_cancel_limit
  from public.targets
  where company_id=v_profile.company_id
    and seller_id is null
    and competence=v_competence
  order by created_at desc limit 1;

  select
    coalesce(sum(revenue),0),
    coalesce(sum(orders),0),
    case when sum(orders)>0 then sum(revenue)/sum(orders) else 0 end,
    coalesce(avg(cancellation_rate),0),
    coalesce(sum(active_revenue),0)
  into v_revenue,v_orders,v_ticket,v_cancel,v_active
  from public.daily_indicators
  where company_id=v_profile.company_id and indicator_date=v_latest;

  v_daily_rate := v_revenue/v_elapsed_days;
  v_projection := v_daily_rate*v_total_days;

  select max(indicator_date) into v_previous
  from public.daily_indicators
  where company_id=v_profile.company_id and indicator_date<v_latest;

  if v_previous is not null then
    select coalesce(sum(revenue),0) into v_prev_revenue
    from public.daily_indicators
    where company_id=v_profile.company_id and indicator_date=v_previous;
  end if;

  v_revenue_health := case when v_target>0 then least(100,(v_projection/v_target)*100) else 70 end;
  v_ticket_health := case when v_ticket_target>0 then least(100,(v_ticket/v_ticket_target)*100) else 70 end;
  v_cancel_health := greatest(0,least(100,(1-(v_cancel/greatest(v_cancel_limit,0.01)))*100));
  v_active_health := case when v_revenue>0 then least(100,(v_active/v_revenue)*250) else 0 end;

  v_monster_index := round(
    v_revenue_health*0.40 +
    v_ticket_health*0.22 +
    v_cancel_health*0.23 +
    v_active_health*0.15
  ,1);

  v_ticket_opportunity := greatest(v_ticket_target-v_ticket,0)*v_orders;
  v_cancel_loss := greatest(v_cancel-v_cancel_limit,0)*v_revenue;
  v_active_opportunity := greatest((v_revenue*0.30)-v_active,0);
  v_total_opportunity := v_ticket_opportunity+v_cancel_loss+v_active_opportunity;

  select jsonb_build_object(
    'date',v_latest,
    'competence',v_competence,
    'calendar',jsonb_build_object(
      'total_business_days',v_total_days,
      'elapsed_business_days',v_elapsed_days,
      'remaining_business_days',v_remaining_days,
      'daily_rate',v_daily_rate
    ),
    'projection',jsonb_build_object(
      'current_revenue',v_revenue,
      'target',v_target,
      'projected_revenue',v_projection,
      'projected_attainment',case when v_target>0 then v_projection/v_target else 0 end,
      'gap',greatest(v_target-v_revenue,0),
      'required_daily_rate',case when v_remaining_days>0 then greatest(v_target-v_revenue,0)/v_remaining_days else 0 end
    ),
    'health',jsonb_build_object(
      'monster_index',v_monster_index,
      'revenue',round(v_revenue_health,1),
      'ticket',round(v_ticket_health,1),
      'cancellation',round(v_cancel_health,1),
      'active',round(v_active_health,1),
      'status',case
        when v_monster_index>=85 then 'Excelente'
        when v_monster_index>=70 then 'Saudável'
        when v_monster_index>=55 then 'Atenção'
        else 'Crítica'
      end
    ),
    'money',jsonb_build_object(
      'total_opportunity',v_total_opportunity,
      'ticket_opportunity',v_ticket_opportunity,
      'cancellation_loss',v_cancel_loss,
      'active_opportunity',v_active_opportunity
    ),
    'trend',jsonb_build_object(
      'previous_date',v_previous,
      'previous_revenue',v_prev_revenue,
      'revenue_change',case when v_prev_revenue>0 then (v_revenue-v_prev_revenue)/v_prev_revenue else null end
    ),
    'seller_dna',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'seller_id',s.id,
        'seller_name',s.full_name,
        'revenue',di.revenue,
        'orders',di.orders,
        'ticket',di.average_ticket,
        'active',di.active_revenue,
        'cancel',di.cancellation_rate,
        'score',di.score,
        'participation',case when v_revenue>0 then di.revenue/v_revenue else 0 end,
        'strengths',jsonb_strip_nulls(jsonb_build_array(
          case when di.revenue >= avg(di.revenue) over()*1.20 then 'Fechador' end,
          case when di.average_ticket >= avg(di.average_ticket) over()*1.12 then 'Ticket Premium' end,
          case when di.active_revenue >= avg(di.active_revenue) over()*1.20 then 'Especialista em Ativo' end,
          case when coalesce(di.score,0)>=85 then 'Elite' end
        )),
        'attention',jsonb_strip_nulls(jsonb_build_array(
          case when coalesce(di.cancellation_rate,0)>v_cancel_limit then 'Cancelamento elevado' end,
          case when di.revenue<avg(di.revenue) over()*0.65 then 'Baixo volume' end
        ))
      ) order by di.revenue desc),'[]'::jsonb)
      from public.daily_indicators di
      join public.sellers s on s.id=di.seller_id
      where di.company_id=v_profile.company_id and di.indicator_date=v_latest
    )
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.get_monster_engine_payload(date) to authenticated;

create or replace function public.get_seller_360(p_seller_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_profile public.profiles%rowtype;
  v_result jsonb;
begin
  select * into v_profile from public.profiles where id=auth.uid();
  if v_profile.id is null then raise exception 'Perfil não encontrado.'; end if;

  select jsonb_build_object(
    'seller',jsonb_build_object(
      'id',s.id,'name',s.full_name,'extension',s.extension,'active',s.active
    ),
    'latest',(
      select jsonb_build_object(
        'date',di.indicator_date,'revenue',di.revenue,'orders',di.orders,
        'ticket',di.average_ticket,'active',di.active_revenue,
        'cancellation',di.cancellation_rate,'score',di.score
      )
      from public.daily_indicators di
      where di.seller_id=s.id order by di.indicator_date desc limit 1
    ),
    'history',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'date',x.indicator_date,'revenue',x.revenue,'orders',x.orders,
        'ticket',x.average_ticket,'active',x.active_revenue,
        'cancellation',x.cancellation_rate,'score',x.score
      ) order by x.indicator_date),'[]'::jsonb)
      from (
        select * from public.daily_indicators
        where seller_id=s.id order by indicator_date desc limit 30
      ) x
    ),
    'feedbacks',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'id',f.id,'date',f.created_at,'type',f.feedback_type,
        'summary',f.summary,'status',f.status
      ) order by f.created_at desc),'[]'::jsonb)
      from public.feedbacks f where f.seller_id=s.id
    )
  ) into v_result
  from public.sellers s
  where s.id=p_seller_id and s.company_id=v_profile.company_id;

  return coalesce(v_result,'{}'::jsonb);
end;
$$;

grant execute on function public.get_seller_360(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
