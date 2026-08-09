-- MONSTROS AI 2.5 — PILOTO OPERACIONAL
-- Acessos por vendedor + Call Lab / QA + base de análises

alter table public.profiles add column if not exists seller_id uuid references public.sellers(id) on delete set null;
create index if not exists profiles_seller_id_idx on public.profiles(seller_id);

create table if not exists public.call_recordings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  seller_id uuid references public.sellers(id) on delete set null,
  uploaded_by uuid references auth.users(id) on delete set null,
  file_name text not null,
  storage_path text not null,
  call_type text not null default 'sale',
  note text,
  status text not null default 'uploaded',
  transcript text,
  analysis jsonb,
  analysis_score numeric(5,2),
  summary text,
  created_at timestamptz not null default now(),
  analyzed_at timestamptz
);
create index if not exists call_recordings_company_created_idx on public.call_recordings(company_id,created_at desc);
create index if not exists call_recordings_seller_created_idx on public.call_recordings(seller_id,created_at desc);
alter table public.call_recordings enable row level security;

drop policy if exists call_recordings_company_read on public.call_recordings;
create policy call_recordings_company_read on public.call_recordings for select to authenticated using (
  company_id=(select company_id from public.profiles where id=auth.uid() limit 1)
  and (
    coalesce((select role::text from public.profiles where id=auth.uid() limit 1),'') in ('admin','manager','supervisor')
    or seller_id=(select seller_id from public.profiles where id=auth.uid() limit 1)
    or uploaded_by=auth.uid()
  )
);

drop policy if exists call_recordings_company_insert on public.call_recordings;
create policy call_recordings_company_insert on public.call_recordings for insert to authenticated with check (
  company_id=(select company_id from public.profiles where id=auth.uid() limit 1)
  and (
    coalesce((select role::text from public.profiles where id=auth.uid() limit 1),'') in ('admin','manager','supervisor')
    or seller_id=(select seller_id from public.profiles where id=auth.uid() limit 1)
  )
);

grant select,insert on public.call_recordings to authenticated;

-- Bucket privado de ligações
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('call-audio','call-audio',false,26214400,array['audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/x-wav','audio/ogg','audio/webm'])
on conflict (id) do update set public=false,file_size_limit=26214400;

-- Usuários autenticados da empresa podem enviar para a própria pasta da empresa.
drop policy if exists call_audio_insert on storage.objects;
create policy call_audio_insert on storage.objects for insert to authenticated with check (
  bucket_id='call-audio'
  and (storage.foldername(name))[1]::text = (select company_id::text from public.profiles where id=auth.uid() limit 1)
);

drop policy if exists call_audio_read on storage.objects;
create policy call_audio_read on storage.objects for select to authenticated using (
  bucket_id='call-audio'
  and (storage.foldername(name))[1]::text = (select company_id::text from public.profiles where id=auth.uid() limit 1)
);

-- Admin/supervisor consegue vincular um login ao vendedor do piloto.
create or replace function public.assign_pilot_user(p_user_id uuid,p_seller_id uuid,p_role text default 'seller')
returns void language plpgsql security definer set search_path=public as $$
declare v_company uuid;
begin
  select company_id into v_company from public.profiles where id=auth.uid();
  if coalesce((select role::text from public.profiles where id=auth.uid()),'') not in ('admin','manager','supervisor') then
    raise exception 'Sem permissão';
  end if;
  if not exists(select 1 from public.sellers where id=p_seller_id and company_id=v_company) then
    raise exception 'Vendedor inválido para esta empresa';
  end if;
  update public.profiles set seller_id=p_seller_id,role=p_role::public.user_role where id=p_user_id and company_id=v_company;
end $$;
grant execute on function public.assign_pilot_user(uuid,uuid,text) to authenticated;
