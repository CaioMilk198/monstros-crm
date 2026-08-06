begin;

create table if not exists public.coach_feedbacks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  seller_id uuid references public.sellers(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  feedback_text text not null,
  diagnosis jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check(status in ('draft','applied','acknowledged')),
  created_at timestamptz not null default now()
);

create table if not exists public.development_plans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  seller_id uuid references public.sellers(id) on delete cascade,
  title text not null,
  plan jsonb not null default '[]'::jsonb,
  status text not null default 'active' check(status in ('active','completed','cancelled')),
  due_date date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.operational_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  seller_id uuid references public.sellers(id) on delete cascade,
  event_type text not null,
  title text not null,
  description text,
  impact numeric(14,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  event_at timestamptz not null default now()
);

alter table public.coach_feedbacks enable row level security;
alter table public.development_plans enable row level security;
alter table public.operational_events enable row level security;

do $$
declare t text;
begin
  foreach t in array array['coach_feedbacks','development_plans','operational_events'] loop
    execute format('drop policy if exists %I_read on public.%I',t,t);
    execute format('create policy %I_read on public.%I for select to authenticated using(company_id=(select company_id from public.current_profile()))',t,t);
    execute format('drop policy if exists %I_write on public.%I',t,t);
    execute format('create policy %I_write on public.%I for all to authenticated using(company_id=(select company_id from public.current_profile()) and (select role from public.current_profile()) in (''admin'',''manager'',''supervisor'')) with check(company_id=(select company_id from public.current_profile()) and (select role from public.current_profile()) in (''admin'',''manager'',''supervisor''))',t,t);
  end loop;
end $$;

create or replace function public.log_operational_event(
  p_event_type text,p_title text,p_description text default null,p_seller_id uuid default null,p_impact numeric default 0,p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_company uuid; v_id uuid;
begin
  select company_id into v_company from public.current_profile();
  insert into public.operational_events(company_id,seller_id,event_type,title,description,impact,metadata)
  values(v_company,p_seller_id,p_event_type,p_title,p_description,coalesce(p_impact,0),coalesce(p_metadata,'{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.log_operational_event(text,text,text,uuid,numeric,jsonb) to authenticated;

create or replace function public.save_coach_feedback(
  p_seller_id uuid,p_feedback_text text,p_diagnosis jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_company uuid; v_id uuid;
begin
  select company_id into v_company from public.current_profile();
  insert into public.coach_feedbacks(company_id,seller_id,author_id,feedback_text,diagnosis)
  values(v_company,p_seller_id,auth.uid(),p_feedback_text,coalesce(p_diagnosis,'{}'::jsonb))
  returning id into v_id;
  perform public.log_operational_event('coach_feedback','Feedback do Monster Coach criado',left(p_feedback_text,240),p_seller_id,0,jsonb_build_object('feedback_id',v_id));
  return v_id;
end;
$$;
grant execute on function public.save_coach_feedback(uuid,text,jsonb) to authenticated;

notify pgrst,'reload schema';
commit;

select
  to_regclass('public.coach_feedbacks') is not null as coach_feedbacks_ok,
  to_regclass('public.development_plans') is not null as development_plans_ok,
  to_regclass('public.operational_events') is not null as operational_events_ok,
  to_regprocedure('public.save_coach_feedback(uuid,text,jsonb)') is not null as coach_rpc_ok;
