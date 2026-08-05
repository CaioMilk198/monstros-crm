
-- MONSTROS CRM - MIGRAÇÃO V1.3
-- Centro de Comando Inteligente, metas, score e resumo gerencial.
-- Execute após as migrações anteriores.

begin;

-- Configurar metas da equipe para uma competência
create or replace function public.set_team_targets(
  p_competence date,
  p_revenue_target numeric,
  p_ticket_target numeric default 0,
  p_cancellation_limit numeric default 0.08
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_team_id uuid;
  v_target_id uuid;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.id is null then raise exception 'Perfil não encontrado.'; end if;
  if v_profile.role not in ('admin','manager','supervisor') then
    raise exception 'Seu perfil não pode alterar metas.';
  end if;

  select id into v_team_id
  from public.teams
  where company_id = v_profile.company_id
    and (supervisor_id = auth.uid() or v_profile.role in ('admin','manager'))
  order by created_at
  limit 1;

  if v_team_id is null then raise exception 'Equipe não encontrada.'; end if;

  select id into v_target_id
  from public.targets
  where company_id = v_profile.company_id
    and team_id = v_team_id
    and seller_id is null
    and competence = date_trunc('month',p_competence)::date
  order by created_at desc
  limit 1;

  if v_target_id is null then
    insert into public.targets(
      company_id,team_id,seller_id,competence,revenue_target,
      ticket_target,cancellation_limit
    )
    values(
      v_profile.company_id,v_team_id,null,
      date_trunc('month',p_competence)::date,
      greatest(coalesce(p_revenue_target,0),0),
      greatest(coalesce(p_ticket_target,0),0),
      greatest(coalesce(p_cancellation_limit,0.08),0)
    )
    returning id into v_target_id;
  else
    update public.targets
    set revenue_target=greatest(coalesce(p_revenue_target,0),0),
        ticket_target=greatest(coalesce(p_ticket_target,0),0),
        cancellation_limit=greatest(coalesce(p_cancellation_limit,0.08),0)
    where id=v_target_id;
  end if;

  return jsonb_build_object('ok',true,'target_id',v_target_id);
end;
$$;

grant execute on function public.set_team_targets(date,numeric,numeric,numeric) to authenticated;

-- Recalcular score dos vendedores do último dia importado.
create or replace function public.recalculate_scores(p_indicator_date date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_team_avg_revenue numeric;
  v_team_avg_ticket numeric;
  v_team_avg_active numeric;
  v_updated integer;
begin
  select * into v_profile from public.profiles where id=auth.uid();
  if v_profile.id is null then raise exception 'Perfil não encontrado.'; end if;

  select avg(revenue), avg(nullif(average_ticket,0)), avg(active_revenue)
  into v_team_avg_revenue, v_team_avg_ticket, v_team_avg_active
  from public.daily_indicators
  where company_id=v_profile.company_id and indicator_date=p_indicator_date;

  update public.daily_indicators di
  set score = round((
      least(1.5, di.revenue / nullif(v_team_avg_revenue,0)) * 45
      + least(1.5, coalesce(di.average_ticket,0) / nullif(v_team_avg_ticket,0)) * 20
      + least(1.5, coalesce(di.active_revenue,0) / nullif(v_team_avg_active,0)) * 15
      + greatest(0, 1 - coalesce(di.cancellation_rate,0) / 0.08) * 20
    )::numeric,2),
    calculated_at=now()
  where di.company_id=v_profile.company_id
    and di.indicator_date=p_indicator_date;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

grant execute on function public.recalculate_scores(date) to authenticated;

-- Substitui a função de Dashboard com metas e inteligência gerencial.
create or replace function public.get_dashboard_payload(p_date date default current_date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_latest_date date;
  v_competence date;
  v_target numeric := 0;
  v_ticket_target numeric := 0;
  v_cancel_limit numeric := 0.08;
  v_result jsonb;
begin
  select * into v_profile from public.profiles where id=auth.uid();
  if v_profile.id is null then raise exception 'Perfil não encontrado.'; end if;

  select max(indicator_date) into v_latest_date
  from public.daily_indicators
  where company_id=v_profile.company_id and indicator_date<=p_date;

  if v_latest_date is null then
    return jsonb_build_object(
      'date',null,
      'summary',jsonb_build_object(
        'revenue',0,'orders',0,'average_ticket',0,'conversion_rate',null,
        'cancellation_rate',null,'projection',0,'target',0,'attainment',0,'gap',0
      ),
      'ranking','[]'::jsonb,'mission','[]'::jsonb,'insights','[]'::jsonb
    );
  end if;

  v_competence := date_trunc('month',v_latest_date)::date;

  select coalesce(revenue_target,0),coalesce(ticket_target,0),coalesce(cancellation_limit,0.08)
  into v_target,v_ticket_target,v_cancel_limit
  from public.targets
  where company_id=v_profile.company_id
    and team_id is not null and seller_id is null
    and competence=v_competence
  order by created_at desc
  limit 1;

  select jsonb_build_object(
    'date',v_latest_date,
    'competence',v_competence,
    'summary',jsonb_build_object(
      'revenue',coalesce(sum(di.revenue),0),
      'orders',coalesce(sum(di.orders),0),
      'average_ticket',case when sum(di.orders)>0 then sum(di.revenue)/sum(di.orders) else 0 end,
      'conversion_rate',avg(di.conversion_rate),
      'cancellation_rate',avg(di.cancellation_rate),
      'projection',coalesce(sum(di.projection),0),
      'card_revenue',coalesce(sum(di.card_revenue),0),
      'deposit_revenue',coalesce(sum(di.deposit_revenue),0),
      'mixed_revenue',coalesce(sum(di.mixed_revenue),0),
      'active_revenue',coalesce(sum(di.active_revenue),0),
      'target',v_target,
      'ticket_target',v_ticket_target,
      'cancellation_limit',v_cancel_limit,
      'attainment',case when v_target>0 then sum(di.revenue)/v_target else 0 end,
      'gap',greatest(v_target-sum(di.revenue),0),
      'projected_attainment',case when v_target>0 then sum(di.projection)/v_target else 0 end,
      'seller_count',count(*)
    ),
    'ranking',(
      select coalesce(jsonb_agg(x order by (x->>'score')::numeric desc nulls last,(x->>'revenue')::numeric desc),'[]'::jsonb)
      from(
        select jsonb_build_object(
          'seller_id',s.id,'seller_name',s.full_name,
          'revenue',di2.revenue,'orders',di2.orders,
          'average_ticket',di2.average_ticket,
          'conversion_rate',di2.conversion_rate,
          'cancellation_rate',di2.cancellation_rate,
          'active_revenue',di2.active_revenue,
          'projection',di2.projection,'score',coalesce(di2.score,0)
        ) x
        from public.daily_indicators di2
        join public.sellers s on s.id=di2.seller_id
        where di2.company_id=v_profile.company_id and di2.indicator_date=v_latest_date
      ) q
    ),
    'mission',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'id',dmi.id,'sequence',dmi.sequence,'priority',dmi.priority,
        'title',dmi.title,'reason',dmi.reason,'action_text',dmi.action_text,
        'status',dmi.status
      ) order by dmi.sequence),'[]'::jsonb)
      from public.daily_missions dm
      join public.daily_mission_items dmi on dmi.mission_id=dm.id
      where dm.supervisor_id=auth.uid() and dm.mission_date=current_date
    ),
    'insights',jsonb_build_array(
      jsonb_build_object(
        'type','projection',
        'title',case
          when v_target=0 then 'Cadastre a meta mensal'
          when sum(di.projection)>=v_target then 'Projeção acima da meta'
          else 'Projeção abaixo da meta'
        end,
        'text',case
          when v_target=0 then 'Defina a meta nas Configurações para medir o atingimento.'
          when sum(di.projection)>=v_target then 'O ritmo atual projeta fechamento acima da meta mensal.'
          else 'O ritmo atual ainda não cobre a meta mensal. Priorize os vendedores com maior potencial de recuperação.'
        end
      ),
      jsonb_build_object(
        'type','quality',
        'title',case when avg(di.cancellation_rate)>v_cancel_limit then 'Qualidade em atenção' else 'Qualidade controlada' end,
        'text',case when avg(di.cancellation_rate)>v_cancel_limit
          then 'O cancelamento médio está acima do limite configurado.'
          else 'O cancelamento médio está dentro do limite configurado.'
        end
      ),
      jsonb_build_object(
        'type','ticket',
        'title',case when v_ticket_target>0 and (sum(di.revenue)/nullif(sum(di.orders),0))<v_ticket_target
          then 'Ticket abaixo da meta' else 'Ticket dentro do esperado' end,
        'text',case when v_ticket_target=0 then 'Cadastre uma meta de ticket para ativar este diagnóstico.'
          when (sum(di.revenue)/nullif(sum(di.orders),0))<v_ticket_target
          then 'Treine oferta completa, ancoragem e upsell.'
          else 'O ticket médio está no nível configurado.'
        end
      )
    )
  )
  into v_result
  from public.daily_indicators di
  where di.company_id=v_profile.company_id and di.indicator_date=v_latest_date;

  return v_result;
end;
$$;

grant execute on function public.get_dashboard_payload(date) to authenticated;

commit;
