
-- MONSTROS CRM — MIGRAÇÃO V2.1
-- Correção do Monster Engine:
-- projeção por dias úteis, Score 2.0, Índice Monstro e DNA composto.
-- Seguro para executar após a V2.0.

begin;

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
  v_total_days integer := 20;
  v_elapsed_days integer := 1;
  v_remaining_days integer := 19;
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
  v_required_daily numeric := 0;
  v_revenue_health numeric := 0;
  v_ticket_health numeric := 0;
  v_cancel_health numeric := 0;
  v_active_health numeric := 0;
  v_monster_index numeric := 0;
  v_ticket_opportunity numeric := 0;
  v_cancel_loss numeric := 0;
  v_active_opportunity numeric := 0;
  v_total_opportunity numeric := 0;
  v_prev_revenue numeric := 0;
  v_avg_revenue numeric := 0;
  v_avg_ticket numeric := 0;
  v_avg_active numeric := 0;
  v_result jsonb;
begin
  select * into v_profile
  from public.profiles
  where id=auth.uid();

  if v_profile.id is null then
    raise exception 'Perfil não encontrado.';
  end if;

  select max(indicator_date)
  into v_latest
  from public.daily_indicators
  where company_id=v_profile.company_id
    and indicator_date<=p_date;

  if v_latest is null then
    return jsonb_build_object(
      'date',null,
      'message','Nenhum indicador confirmado.',
      'seller_dna','[]'::jsonb
    );
  end if;

  v_competence := date_trunc('month',v_latest)::date;

  select
    coalesce(total_business_days,20),
    coalesce(elapsed_business_days,1)
  into v_total_days,v_elapsed_days
  from public.business_calendars
  where company_id=v_profile.company_id
    and competence=v_competence;

  v_total_days := greatest(coalesce(v_total_days,20),1);
  v_elapsed_days := greatest(1,least(coalesce(v_elapsed_days,1),v_total_days));
  v_remaining_days := greatest(v_total_days-v_elapsed_days,0);

  select
    coalesce(revenue_target,0),
    coalesce(ticket_target,0),
    coalesce(cancellation_limit,0.15)
  into v_target,v_ticket_target,v_cancel_limit
  from public.targets
  where company_id=v_profile.company_id
    and seller_id is null
    and competence=v_competence
  order by created_at desc
  limit 1;

  select
    coalesce(sum(revenue),0),
    coalesce(sum(orders),0),
    case when sum(orders)>0 then sum(revenue)/sum(orders) else 0 end,
    coalesce(avg(cancellation_rate),0),
    coalesce(sum(active_revenue),0),
    coalesce(avg(revenue),0),
    coalesce(avg(nullif(average_ticket,0)),0),
    coalesce(avg(active_revenue),0)
  into
    v_revenue,v_orders,v_ticket,v_cancel,v_active,
    v_avg_revenue,v_avg_ticket,v_avg_active
  from public.daily_indicators
  where company_id=v_profile.company_id
    and indicator_date=v_latest;

  v_daily_rate := case when v_elapsed_days>0 then v_revenue/v_elapsed_days else 0 end;
  v_projection := v_daily_rate*v_total_days;
  v_required_daily := case
    when v_remaining_days>0 then greatest(v_target-v_revenue,0)/v_remaining_days
    else 0
  end;

  select max(indicator_date)
  into v_previous
  from public.daily_indicators
  where company_id=v_profile.company_id
    and indicator_date<v_latest;

  if v_previous is not null then
    select coalesce(sum(revenue),0)
    into v_prev_revenue
    from public.daily_indicators
    where company_id=v_profile.company_id
      and indicator_date=v_previous;
  end if;

  -- Saúde operacional, limitada a 100.
  v_revenue_health := case
    when v_target>0 then least(100,(v_projection/v_target)*100)
    else 70
  end;

  v_ticket_health := case
    when v_ticket_target>0 then least(100,(v_ticket/v_ticket_target)*100)
    else 70
  end;

  v_cancel_health := case
    when v_cancel_limit>0 then greatest(0,least(100,(v_cancel_limit/greatest(v_cancel,0.0001))*100))
    else 70
  end;

  v_active_health := case
    when v_revenue>0 then least(100,(v_active/(v_revenue*0.30))*100)
    else 0
  end;

  v_monster_index := round(
    v_revenue_health*0.40 +
    v_ticket_health*0.20 +
    v_cancel_health*0.25 +
    v_active_health*0.15
  ,1);

  -- Oportunidades financeiras.
  v_ticket_opportunity := greatest(v_ticket_target-v_ticket,0)*v_orders;
  v_cancel_loss := greatest(v_cancel-v_cancel_limit,0)*v_revenue;
  v_active_opportunity := greatest((v_revenue*0.30)-v_active,0);
  v_total_opportunity := v_ticket_opportunity+v_cancel_loss+v_active_opportunity;

  -- Score 2.0 individual:
  -- 35% faturamento, 20% ticket, 20% ativo, 15% cancelamento, 10% pedidos.
  with metrics as (
    select
      di.id,
      di.seller_id,
      di.revenue,
      di.orders,
      di.average_ticket,
      di.active_revenue,
      di.cancellation_rate,
      greatest(v_avg_revenue,1) avg_revenue,
      greatest(v_avg_ticket,1) avg_ticket,
      greatest(v_avg_active,1) avg_active,
      greatest(v_cancel_limit,0.01) cancel_limit
    from public.daily_indicators di
    where di.company_id=v_profile.company_id
      and di.indicator_date=v_latest
  ),
  scored as (
    select
      id,
      round(least(100,greatest(0,
        least(revenue/avg_revenue,1.35)/1.35*35 +
        least(coalesce(average_ticket,0)/avg_ticket,1.30)/1.30*20 +
        least(coalesce(active_revenue,0)/avg_active,1.40)/1.40*20 +
        greatest(0,least(1,cancel_limit/greatest(coalesce(cancellation_rate,0),0.01)))*15 +
        least(orders/greatest((select avg(orders) from metrics),1),1.40)/1.40*10
      )),1) new_score
    from metrics
  )
  update public.daily_indicators di
  set score=scored.new_score,
      calculated_at=now()
  from scored
  where di.id=scored.id;

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
      'current_attainment',case when v_target>0 then v_revenue/v_target else 0 end,
      'gap',greatest(v_target-v_revenue,0),
      'required_daily_rate',v_required_daily,
      'daily_rate',v_daily_rate,
      'pace_difference',v_daily_rate-v_required_daily
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
      'revenue_change',case
        when v_prev_revenue>0 then (v_revenue-v_prev_revenue)/v_prev_revenue
        else null
      end
    ),

    'seller_dna',(
      with base as (
        select
          s.id seller_id,
          s.full_name seller_name,
          di.revenue,
          di.orders,
          di.average_ticket ticket,
          di.active_revenue active,
          di.cancellation_rate cancel,
          di.score,
          case when v_revenue>0 then di.revenue/v_revenue else 0 end participation
        from public.daily_indicators di
        join public.sellers s on s.id=di.seller_id
        where di.company_id=v_profile.company_id
          and di.indicator_date=v_latest
      )
      select coalesce(jsonb_agg(jsonb_build_object(
        'seller_id',seller_id,
        'seller_name',seller_name,
        'revenue',revenue,
        'orders',orders,
        'ticket',ticket,
        'active',active,
        'cancel',cancel,
        'score',score,
        'participation',participation,
        'strengths',to_jsonb(array_remove(array[
          case when revenue>=v_avg_revenue*1.25 then 'Fechador' end,
          case when ticket>=v_avg_ticket*1.10 then 'Ticket Premium' end,
          case when active>=v_avg_active*1.20 then 'Especialista em Ativo' end,
          case when score>=85 then 'Elite' end
        ],null)),
        'attention',to_jsonb(array_remove(array[
          case when coalesce(cancel,0)>v_cancel_limit then 'Cancelamento elevado' end,
          case when revenue<v_avg_revenue*0.65 then 'Baixo volume' end
        ],null))
      ) order by revenue desc),'[]'::jsonb)
      from base
    )
  )
  into v_result;

  return v_result;
end;
$$;

grant execute on function public.get_monster_engine_payload(date) to authenticated;

notify pgrst, 'reload schema';

commit;

-- Teste rápido da função para o usuário autenticado será feito pelo CRM.
