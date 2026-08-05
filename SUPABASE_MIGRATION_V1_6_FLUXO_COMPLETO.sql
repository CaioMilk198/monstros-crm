
-- MONSTROS CRM — MIGRAÇÃO V1.6
-- Finalização robusta da importação, Score e Missão do Dia.
-- Pode ser executada mais de uma vez.

begin;

create or replace function public.finalize_import_v3(
  p_filename text,
  p_sha256 text,
  p_file_size bigint,
  p_storage_path text,
  p_competence date,
  p_indicator_date date,
  p_team_name text,
  p_summary jsonb,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_team_id uuid;
  v_import_id uuid;
  v_protocol text;
  v_row jsonb;
  v_seller_id uuid;
  v_name text;
  v_norm text;
  v_avg_revenue numeric := 0;
  v_avg_ticket numeric := 0;
  v_avg_active numeric := 0;
  v_cancel_limit numeric := 0.15;
  v_target numeric := 0;
  v_mission_id uuid;
  v_rec_id uuid;
  v_seq integer := 0;
  v_count integer := 0;
begin
  select * into v_profile
  from public.profiles
  where id = auth.uid();

  if v_profile.id is null then
    raise exception 'Perfil do usuário não encontrado.';
  end if;

  if v_profile.role not in ('admin','manager','supervisor') then
    raise exception 'Seu perfil não pode confirmar importações.';
  end if;

  insert into public.teams(company_id, supervisor_id, name, shift, active)
  values (
    v_profile.company_id,
    auth.uid(),
    coalesce(nullif(p_team_name,''),'Equipe Monstros'),
    'Integral',
    true
  )
  on conflict (company_id,name)
  do update set
    supervisor_id = coalesce(public.teams.supervisor_id, excluded.supervisor_id),
    active = true
  returning id into v_team_id;

  -- Reutiliza importação anterior do mesmo arquivo para reparar tentativas incompletas.
  select id, protocol
  into v_import_id, v_protocol
  from public.imports
  where company_id = v_profile.company_id
    and sha256 = p_sha256
  order by created_at desc
  limit 1;

  if v_import_id is null then
    v_protocol := 'IMP-' || to_char(now(),'YYYYMMDD-HH24MISS') || '-' ||
                  upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));

    insert into public.imports(
      company_id, created_by, protocol, report_type, competence,
      original_filename, storage_path, sha256, file_size_bytes,
      status, summary, confirmed_by, confirmed_at
    )
    values(
      v_profile.company_id, auth.uid(), v_protocol, 'WORKBOOK',
      date_trunc('month',p_competence)::date,
      p_filename, p_storage_path, p_sha256, p_file_size,
      'confirmed', coalesce(p_summary,'{}'::jsonb), auth.uid(), now()
    )
    returning id into v_import_id;
  else
    update public.imports
    set original_filename = p_filename,
        storage_path = coalesce(p_storage_path, storage_path),
        file_size_bytes = p_file_size,
        competence = date_trunc('month',p_competence)::date,
        status = 'confirmed',
        summary = coalesce(p_summary,'{}'::jsonb),
        confirmed_by = auth.uid(),
        confirmed_at = now(),
        error_report = '[]'::jsonb
    where id = v_import_id;
  end if;

  for v_row in select * from jsonb_array_elements(coalesce(p_rows,'[]'::jsonb))
  loop
    v_name := trim(coalesce(v_row->>'seller_name',''));
    v_norm := public.normalize_name(v_name);
    if v_norm = '' then continue; end if;

    select s.id into v_seller_id
    from public.sellers s
    left join public.seller_aliases a
      on a.seller_id = s.id
     and a.company_id = s.company_id
    where s.company_id = v_profile.company_id
      and (
        public.normalize_name(s.full_name) = v_norm
        or a.normalized_value = v_norm
      )
    limit 1;

    if v_seller_id is null then
      insert into public.sellers(
        company_id, team_id, full_name, employee_code, extension, active
      )
      values(
        v_profile.company_id,
        v_team_id,
        v_name,
        'AUTO-' || upper(substr(md5(v_norm),1,10)),
        nullif(v_row->>'extension',''),
        true
      )
      returning id into v_seller_id;
    else
      update public.sellers
      set team_id = v_team_id,
          full_name = v_name,
          extension = coalesce(nullif(v_row->>'extension',''), extension),
          active = true,
          updated_at = now()
      where id = v_seller_id;
    end if;

    insert into public.seller_aliases(
      company_id,seller_id,source_type,original_value,normalized_value,
      confidence,confirmed_by,confirmed_at
    )
    values(
      v_profile.company_id,v_seller_id,'WORKBOOK',v_name,v_norm,
      1,auth.uid(),now()
    )
    on conflict(company_id,source_type,normalized_value)
    do update set
      seller_id = excluded.seller_id,
      original_value = excluded.original_value,
      confidence = 1,
      confirmed_by = excluded.confirmed_by,
      confirmed_at = excluded.confirmed_at;

    insert into public.daily_indicators(
      company_id,team_id,seller_id,indicator_date,revenue,orders,
      conversion_rate,average_ticket,card_revenue,deposit_revenue,
      mixed_revenue,active_revenue,cancellation_rate,score,projection,
      data_confidence,source_import_ids,calculated_at
    )
    values(
      v_profile.company_id,
      v_team_id,
      v_seller_id,
      p_indicator_date,
      coalesce(nullif(v_row->>'revenue','')::numeric,0),
      coalesce(nullif(v_row->>'orders','')::integer,0),
      nullif(v_row->>'conversion_rate','')::numeric,
      coalesce(
        nullif(v_row->>'average_ticket','')::numeric,
        case
          when coalesce(nullif(v_row->>'orders','')::numeric,0)>0
          then coalesce(nullif(v_row->>'revenue','')::numeric,0) /
               nullif(v_row->>'orders','')::numeric
          else 0
        end
      ),
      coalesce(nullif(v_row->>'card_revenue','')::numeric,0),
      coalesce(nullif(v_row->>'deposit_revenue','')::numeric,0),
      coalesce(nullif(v_row->>'mixed_revenue','')::numeric,0),
      coalesce(nullif(v_row->>'active_revenue','')::numeric,0),
      nullif(v_row->>'cancellation_rate','')::numeric,
      0,
      coalesce(nullif(v_row->>'projection','')::numeric,0),
      coalesce(nullif(v_row->>'data_confidence','')::numeric,0.80),
      array[v_import_id],
      now()
    )
    on conflict(seller_id,indicator_date)
    do update set
      company_id = excluded.company_id,
      team_id = excluded.team_id,
      revenue = excluded.revenue,
      orders = excluded.orders,
      conversion_rate = excluded.conversion_rate,
      average_ticket = excluded.average_ticket,
      card_revenue = excluded.card_revenue,
      deposit_revenue = excluded.deposit_revenue,
      mixed_revenue = excluded.mixed_revenue,
      active_revenue = excluded.active_revenue,
      cancellation_rate = excluded.cancellation_rate,
      projection = excluded.projection,
      data_confidence = excluded.data_confidence,
      source_import_ids = array[v_import_id],
      calculated_at = now();

    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception 'Nenhum vendedor válido foi recebido para confirmação.';
  end if;

  select
    coalesce(avg(revenue),0),
    coalesce(avg(nullif(average_ticket,0)),0),
    coalesce(avg(active_revenue),0)
  into v_avg_revenue,v_avg_ticket,v_avg_active
  from public.daily_indicators
  where company_id=v_profile.company_id
    and indicator_date=p_indicator_date;

  select
    coalesce(revenue_target,0),
    coalesce(cancellation_limit,0.15)
  into v_target,v_cancel_limit
  from public.targets
  where company_id=v_profile.company_id
    and team_id=v_team_id
    and seller_id is null
    and competence=date_trunc('month',p_indicator_date)::date
  order by created_at desc
  limit 1;

  update public.daily_indicators di
  set score = round(least(100,greatest(0,
      least(1.5, di.revenue/nullif(v_avg_revenue,0))*45
      + case when v_avg_ticket>0
          then least(1.5,coalesce(di.average_ticket,0)/v_avg_ticket)*20
          else 10 end
      + case when v_avg_active>0
          then least(1.5,coalesce(di.active_revenue,0)/v_avg_active)*15
          else 7.5 end
      + greatest(0,1-coalesce(di.cancellation_rate,0)/greatest(v_cancel_limit,0.01))*20
    ))::numeric,2),
    calculated_at=now()
  where di.company_id=v_profile.company_id
    and di.indicator_date=p_indicator_date;

  delete from public.ai_recommendations
  where company_id=v_profile.company_id
    and team_id=v_team_id
    and created_at::date=current_date
    and status='open';

  -- Cancelamento alto
  insert into public.ai_recommendations(
    company_id,team_id,seller_id,recommendation_type,priority,title,
    explanation,evidence,suggested_action,expected_impact,valid_until
  )
  select
    v_profile.company_id,v_team_id,di.seller_id,'HIGH_CANCELLATION','critical',
    'Auditar cancelamentos de '||s.full_name,
    s.full_name||' apresenta cancelamento de '||
      round(coalesce(di.cancellation_rate,0)*100,1)||'%.',
    jsonb_build_array(jsonb_build_object(
      'indicator','cancellation_rate',
      'value',di.cancellation_rate,
      'limit',v_cancel_limit
    )),
    'Auditar três vendas, revisar a confirmação do pedido e aplicar feedback de qualidade.',
    'Reduzir perdas e proteger o faturamento.',
    now()+interval '3 days'
  from public.daily_indicators di
  join public.sellers s on s.id=di.seller_id
  where di.company_id=v_profile.company_id
    and di.indicator_date=p_indicator_date
    and coalesce(di.cancellation_rate,0)>v_cancel_limit;

  -- Abaixo do ritmo
  insert into public.ai_recommendations(
    company_id,team_id,seller_id,recommendation_type,priority,title,
    explanation,evidence,suggested_action,expected_impact,valid_until
  )
  select
    v_profile.company_id,v_team_id,di.seller_id,'LOW_REVENUE','high',
    'Acompanhar resultado de '||s.full_name,
    s.full_name||' está abaixo de 65% da média de faturamento da equipe.',
    jsonb_build_array(jsonb_build_object(
      'indicator','revenue',
      'value',di.revenue,
      'team_average',v_avg_revenue
    )),
    'Fazer uma conversa objetiva, revisar carteira e acompanhar o próximo bloco de vendas.',
    'Recuperar ritmo individual e reduzir o gap da equipe.',
    now()+interval '3 days'
  from public.daily_indicators di
  join public.sellers s on s.id=di.seller_id
  where di.company_id=v_profile.company_id
    and di.indicator_date=p_indicator_date
    and di.revenue<v_avg_revenue*0.65
    and not exists(
      select 1 from public.ai_recommendations ar
      where ar.company_id=v_profile.company_id
        and ar.seller_id=di.seller_id
        and ar.created_at::date=current_date
        and ar.status='open'
    );

  -- Melhor resultado / reconhecimento
  insert into public.ai_recommendations(
    company_id,team_id,seller_id,recommendation_type,priority,title,
    explanation,evidence,suggested_action,expected_impact,valid_until
  )
  select
    v_profile.company_id,v_team_id,di.seller_id,'HIGH_PERFORMANCE','medium',
    'Reconhecer '||s.full_name,
    s.full_name||' lidera o resultado da equipe com '||to_char(di.revenue,'FM999G999G990D00')||'.',
    jsonb_build_array(jsonb_build_object(
      'indicator','revenue',
      'value',di.revenue,
      'score',di.score
    )),
    'Reconhecer o desempenho e registrar qual abordagem está funcionando.',
    'Reforçar comportamento positivo e compartilhar boas práticas.',
    now()+interval '5 days'
  from public.daily_indicators di
  join public.sellers s on s.id=di.seller_id
  where di.company_id=v_profile.company_id
    and di.indicator_date=p_indicator_date
  order by di.revenue desc
  limit 1;

  insert into public.daily_missions(
    company_id,supervisor_id,mission_date,summary,status
  )
  values(
    v_profile.company_id,
    auth.uid(),
    current_date,
    'Prioridades geradas após a confirmação do protocolo '||v_protocol||'.',
    'open'
  )
  on conflict(supervisor_id,mission_date)
  do update set
    summary=excluded.summary,
    status='open',
    generated_at=now()
  returning id into v_mission_id;

  delete from public.daily_mission_items where mission_id=v_mission_id;

  for v_rec_id in
    select id
    from public.ai_recommendations
    where company_id=v_profile.company_id
      and team_id=v_team_id
      and status='open'
      and created_at::date=current_date
    order by
      case priority
        when 'critical' then 1
        when 'high' then 2
        when 'medium' then 3
        else 4
      end,
      created_at
    limit 8
  loop
    v_seq := v_seq+1;
    insert into public.daily_mission_items(
      mission_id,recommendation_id,sequence,priority,title,reason,
      action_text,status
    )
    select
      v_mission_id,id,v_seq,priority,title,explanation,
      suggested_action,'pending'
    from public.ai_recommendations
    where id=v_rec_id;
  end loop;

  -- Garante uma missão mesmo se nenhuma regra excepcional disparar.
  if v_seq=0 then
    insert into public.daily_mission_items(
      mission_id,sequence,priority,title,reason,action_text,status
    )
    values(
      v_mission_id,1,'medium',
      'Acompanhar ritmo da equipe',
      'A importação foi confirmada, mas nenhum desvio crítico foi encontrado.',
      'Revisar os três primeiros e os três últimos do ranking e registrar uma ação.',
      'pending'
    );
  end if;

  return jsonb_build_object(
    'ok',true,
    'protocol',v_protocol,
    'import_id',v_import_id,
    'team_id',v_team_id,
    'rows_saved',v_count,
    'mission_id',v_mission_id,
    'mission_items',greatest(v_seq,1),
    'repaired',true
  );
end;
$$;

revoke all on function public.finalize_import_v3(
  text,text,bigint,text,date,date,text,jsonb,jsonb
) from public;

grant execute on function public.finalize_import_v3(
  text,text,bigint,text,date,date,text,jsonb,jsonb
) to authenticated;

-- Recupera a missão do dia independentemente da data do relatório importado.
create or replace function public.get_today_mission()
returns jsonb
language sql
security definer
set search_path=public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',dmi.id,
    'sequence',dmi.sequence,
    'priority',dmi.priority,
    'title',dmi.title,
    'reason',dmi.reason,
    'action_text',dmi.action_text,
    'status',dmi.status
  ) order by dmi.sequence),'[]'::jsonb)
  from public.daily_missions dm
  join public.daily_mission_items dmi on dmi.mission_id=dm.id
  where dm.supervisor_id=auth.uid()
    and dm.mission_date=current_date;
$$;

grant execute on function public.get_today_mission() to authenticated;

notify pgrst, 'reload schema';

commit;
