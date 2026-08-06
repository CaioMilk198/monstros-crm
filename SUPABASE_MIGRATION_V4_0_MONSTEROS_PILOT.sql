begin;

create table if not exists public.operation_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  indicator_date date not null,
  revenue numeric(14,2) not null default 0,
  target numeric(14,2) not null default 0,
  projection numeric(14,2) not null default 0,
  monster_index numeric(8,2) not null default 0,
  opportunity_total numeric(14,2) not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(company_id,indicator_date)
);

alter table public.operation_snapshots enable row level security;

drop policy if exists operation_snapshots_read on public.operation_snapshots;
create policy operation_snapshots_read on public.operation_snapshots
for select to authenticated
using(company_id=(select company_id from public.current_profile()));

drop policy if exists operation_snapshots_write on public.operation_snapshots;
create policy operation_snapshots_write on public.operation_snapshots
for all to authenticated
using(
  company_id=(select company_id from public.current_profile())
  and (select role from public.current_profile()) in ('admin','manager','supervisor')
)
with check(
  company_id=(select company_id from public.current_profile())
  and (select role from public.current_profile()) in ('admin','manager','supervisor')
);

create or replace function public.capture_operation_snapshot(p_date date default current_date)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_profile public.profiles%rowtype; v_payload jsonb; v_date date;
begin
  select * into v_profile from public.profiles where id=auth.uid();
  v_payload:=public.get_monster_engine_payload_v30(p_date);
  if coalesce(v_payload->>'date','')='' then return jsonb_build_object('ok',false); end if;
  v_date:=(v_payload->>'date')::date;
  insert into public.operation_snapshots(
    company_id,indicator_date,revenue,target,projection,monster_index,opportunity_total,payload
  ) values(
    v_profile.company_id,v_date,
    coalesce((v_payload#>>'{projection,current_revenue}')::numeric,0),
    coalesce((v_payload#>>'{projection,target}')::numeric,0),
    coalesce((v_payload#>>'{projection,projected_revenue}')::numeric,0),
    coalesce((v_payload#>>'{health,monster_index}')::numeric,0),
    coalesce((v_payload#>>'{money,total_opportunity}')::numeric,0),
    v_payload
  )
  on conflict(company_id,indicator_date) do update set
    revenue=excluded.revenue,target=excluded.target,projection=excluded.projection,
    monster_index=excluded.monster_index,opportunity_total=excluded.opportunity_total,
    payload=excluded.payload,created_at=now();
  return jsonb_build_object('ok',true,'date',v_date);
end;
$$;
grant execute on function public.capture_operation_snapshot(date) to authenticated;

create or replace function public.get_operation_timeline(p_limit integer default 30)
returns table(
  indicator_date date,revenue numeric,target numeric,projection numeric,
  monster_index numeric,opportunity_total numeric,revenue_change numeric,index_change numeric
)
language sql security definer set search_path=public as $$
  with r as (
    select s.*,
      lag(revenue) over(order by indicator_date) prev_revenue,
      lag(monster_index) over(order by indicator_date) prev_index
    from public.operation_snapshots s
    where company_id=(select company_id from public.current_profile())
  )
  select indicator_date,revenue,target,projection,monster_index,opportunity_total,
    case when prev_revenue>0 then (revenue-prev_revenue)/prev_revenue end,
    monster_index-prev_index
  from r order by indicator_date desc
  limit greatest(1,least(coalesce(p_limit,30),365));
$$;
grant execute on function public.get_operation_timeline(integer) to authenticated;

create or replace function public.get_director_payload(p_date date default current_date)
returns jsonb language plpgsql security definer set search_path=public as $$
declare e jsonb; dna jsonb; low_list jsonb; cancel_list jsonb; leader jsonb; risk jsonb; priorities jsonb:='[]'::jsonb;
begin
  e:=public.get_monster_engine_payload_v30(p_date);
  if coalesce(e->>'date','')='' then return jsonb_build_object('date',null); end if;
  dna:=coalesce(e->'seller_dna','[]'::jsonb);

  select coalesce(jsonb_agg(value),'[]'::jsonb) into low_list
  from jsonb_array_elements(dna)
  where coalesce(value->'attention','[]'::jsonb) @> '["Baixo volume"]'::jsonb;

  select coalesce(jsonb_agg(value),'[]'::jsonb) into cancel_list
  from jsonb_array_elements(dna)
  where coalesce(value->'attention','[]'::jsonb) @> '["Cancelamento elevado"]'::jsonb;

  select value into leader from jsonb_array_elements(dna)
  order by (value->>'revenue')::numeric desc limit 1;

  select value into risk from jsonb_array_elements(dna)
  order by jsonb_array_length(coalesce(value->'attention','[]'::jsonb)) desc,
           (value->>'revenue')::numeric asc limit 1;

  if jsonb_array_length(low_list)>0 then
    priorities:=priorities||jsonb_build_array(jsonb_build_object(
      'order',1,'title','Recuperar vendedores abaixo do ritmo',
      'impact',e#>'{money,active_opportunity}','minutes',20+jsonb_array_length(low_list)*5,
      'seller_ids',(select jsonb_agg(x->>'seller_id') from jsonb_array_elements(low_list)x),
      'seller_names',(select jsonb_agg(x->>'seller_name') from jsonb_array_elements(low_list)x),
      'action','Revisar carteira, definir bloco de vendas e acompanhar o próximo resultado.'
    ));
  end if;

  if jsonb_array_length(cancel_list)>0 then
    priorities:=priorities||jsonb_build_array(jsonb_build_object(
      'order',jsonb_array_length(priorities)+1,'title','Reduzir cancelamentos',
      'impact',e#>'{money,cancellation_loss}','minutes',15+jsonb_array_length(cancel_list)*5,
      'seller_ids',(select jsonb_agg(x->>'seller_id') from jsonb_array_elements(cancel_list)x),
      'seller_names',(select jsonb_agg(x->>'seller_name') from jsonb_array_elements(cancel_list)x),
      'action','Auditar pedidos e aplicar confirmação estruturada.'
    ));
  end if;

  if leader is not null then
    priorities:=priorities||jsonb_build_array(jsonb_build_object(
      'order',jsonb_array_length(priorities)+1,'title','Reconhecer o principal destaque',
      'impact',0,'minutes',3,
      'seller_ids',jsonb_build_array(leader->>'seller_id'),
      'seller_names',jsonb_build_array(leader->>'seller_name'),
      'action','Reconhecer o resultado e registrar as boas práticas.'
    ));
  end if;

  return jsonb_build_object(
    'date',e->'date',
    'radar',jsonb_build_object(
      'opportunity',e#>'{money,total_opportunity}',
      'risk',coalesce(risk->>'seller_name','Sem risco crítico'),
      'attention',concat(e#>>'{health,low_volume_count}',' vendedores abaixo do ritmo'),
      'highlight',coalesce(leader->>'seller_name','Sem destaque'),
      'mission',case when jsonb_array_length(low_list)>0 then 'Recuperar produtividade' else 'Sustentar ritmo' end,
      'trend',case when (e#>>'{projection,projected_revenue}')::numeric >= (e#>>'{projection,target}')::numeric
        then 'Acima da meta' else 'Abaixo da meta' end,
      'quick_win',case when (e#>>'{money,ticket_opportunity}')::numeric >= (e#>>'{money,cancellation_loss}')::numeric
        then 'Elevar ticket' else 'Reduzir cancelamento' end
    ),
    'what_happened',jsonb_build_array(
      concat('Faturamento atual: R$ ',to_char((e#>>'{projection,current_revenue}')::numeric,'FM999G999G990D00')),
      concat('Projeção: R$ ',to_char((e#>>'{projection,projected_revenue}')::numeric,'FM999G999G990D00')),
      concat(e#>>'{health,low_volume_count}',' vendedores abaixo do ritmo'),
      concat(e#>>'{health,cancellation_risk_count}',' vendedores com risco de cancelamento')
    ),
    'why_it_happened',jsonb_build_array(
      case when jsonb_array_length(low_list)>0 then 'A baixa produtividade está concentrada em parte da equipe.' else 'A produtividade está equilibrada.' end,
      case when jsonb_array_length(cancel_list)>0 then 'Há cancelamento acima do limite em vendedores específicos.' else 'O cancelamento está controlado.' end
    ),
    'cost',e->'money','priorities',priorities,'engine',e
  );
end;
$$;
grant execute on function public.get_director_payload(date) to authenticated;

notify pgrst,'reload schema';
commit;

select
  to_regclass('public.operation_snapshots') is not null as snapshots_ok,
  to_regprocedure('public.get_director_payload(date)') is not null as director_ok,
  to_regprocedure('public.get_operation_timeline(integer)') is not null as analytics_ok;
