begin;
alter table public.operation_snapshots add column if not exists orders integer not null default 0;
alter table public.operation_snapshots add column if not exists average_ticket numeric(14,2) not null default 0;
alter table public.operation_snapshots add column if not exists cancellation_rate numeric(10,6) not null default 0;
alter table public.operation_snapshots add column if not exists active_revenue numeric(14,2) not null default 0;
alter table public.operation_snapshots add column if not exists conversion_rate numeric(10,6);

create or replace function public.capture_operation_snapshot(p_date date default current_date)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_profile public.profiles%rowtype; v_payload jsonb; v_date date; v_orders integer:=0; v_ticket numeric:=0; v_cancel numeric:=0; v_active numeric:=0;
begin
  select * into v_profile from public.profiles where id=auth.uid();
  v_payload:=public.get_monster_engine_payload_v30(p_date);
  if coalesce(v_payload->>'date','')='' then return jsonb_build_object('ok',false); end if;
  v_date:=(v_payload->>'date')::date;
  select coalesce(sum((x->>'orders')::integer),0),
    case when sum((x->>'orders')::integer)>0 then sum((x->>'revenue')::numeric)/sum((x->>'orders')::integer) else 0 end,
    coalesce(avg((x->>'cancel')::numeric),0),coalesce(sum((x->>'active')::numeric),0)
  into v_orders,v_ticket,v_cancel,v_active
  from jsonb_array_elements(coalesce(v_payload->'seller_dna','[]'::jsonb)) x;
  insert into public.operation_snapshots(company_id,indicator_date,revenue,target,projection,monster_index,opportunity_total,payload,orders,average_ticket,cancellation_rate,active_revenue)
  values(v_profile.company_id,v_date,coalesce((v_payload#>>'{projection,current_revenue}')::numeric,0),coalesce((v_payload#>>'{projection,target}')::numeric,0),coalesce((v_payload#>>'{projection,projected_revenue}')::numeric,0),coalesce((v_payload#>>'{health,monster_index}')::numeric,0),coalesce((v_payload#>>'{money,total_opportunity}')::numeric,0),v_payload,v_orders,v_ticket,v_cancel,v_active)
  on conflict(company_id,indicator_date) do update set revenue=excluded.revenue,target=excluded.target,projection=excluded.projection,monster_index=excluded.monster_index,opportunity_total=excluded.opportunity_total,payload=excluded.payload,orders=excluded.orders,average_ticket=excluded.average_ticket,cancellation_rate=excluded.cancellation_rate,active_revenue=excluded.active_revenue,created_at=now();
  return jsonb_build_object('ok',true,'date',v_date);
end;$$;
grant execute on function public.capture_operation_snapshot(date) to authenticated;

create or replace function public.get_operation_timeline(p_limit integer default 30)
returns table(indicator_date date,revenue numeric,target numeric,projection numeric,monster_index numeric,opportunity_total numeric,revenue_change numeric,index_change numeric,orders integer,average_ticket numeric,cancellation_rate numeric,active_revenue numeric,conversion_rate numeric)
language sql security definer set search_path=public as $$
with r as(select s.*,lag(revenue)over(order by indicator_date)prev_revenue,lag(monster_index)over(order by indicator_date)prev_index from public.operation_snapshots s where company_id=(select company_id from public.current_profile()))
select indicator_date,revenue,target,projection,monster_index,opportunity_total,case when prev_revenue>0 then(revenue-prev_revenue)/prev_revenue end,monster_index-prev_index,orders,average_ticket,cancellation_rate,active_revenue,conversion_rate from r order by indicator_date desc limit greatest(1,least(coalesce(p_limit,30),365));$$;
grant execute on function public.get_operation_timeline(integer) to authenticated;
notify pgrst,'reload schema';
commit;
select to_regprocedure('public.get_operation_timeline(integer)') is not null as analytics_v10_ok;