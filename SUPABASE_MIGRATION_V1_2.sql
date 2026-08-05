-- MONSTROS CRM - MIGRAÇÃO V1.2
-- Correção de perfil pendente + pré-checagem de duplicidade + histórico de importações.
-- Execute após as migrações anteriores.

begin;

create or replace function public.ensure_my_profile()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user auth.users%rowtype;
  v_company_id uuid;
  v_profile public.profiles%rowtype;
begin
  select * into v_user from auth.users where id = auth.uid();
  if v_user.id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select id into v_company_id
  from public.companies
  where slug = 'monstros-crm-piloto'
  limit 1;

  if v_company_id is null then
    raise exception 'Empresa piloto não encontrada.';
  end if;

  insert into public.profiles(id, company_id, role, full_name, email, active)
  values (
    v_user.id,
    v_company_id,
    'seller',
    coalesce(nullif(v_user.raw_user_meta_data->>'full_name',''), split_part(v_user.email,'@',1)),
    v_user.email,
    true
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = case
      when public.profiles.full_name is null or public.profiles.full_name = '' then excluded.full_name
      else public.profiles.full_name
    end,
    active = true,
    updated_at = now();

  select * into v_profile from public.profiles where id = v_user.id;

  return jsonb_build_object(
    'ok', true,
    'id', v_profile.id,
    'company_id', v_profile.company_id,
    'role', v_profile.role,
    'full_name', v_profile.full_name,
    'email', v_profile.email
  );
end;
$$;

grant execute on function public.ensure_my_profile() to authenticated;

create or replace function public.check_import_duplicate(p_sha256 text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_import public.imports%rowtype;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.id is null then
    raise exception 'Perfil não encontrado.';
  end if;

  select * into v_import
  from public.imports
  where company_id = v_profile.company_id
    and sha256 = p_sha256
    and status = 'confirmed'
  order by confirmed_at desc
  limit 1;

  if v_import.id is null then
    return jsonb_build_object('duplicate', false);
  end if;

  return jsonb_build_object(
    'duplicate', true,
    'import_id', v_import.id,
    'protocol', v_import.protocol,
    'filename', v_import.original_filename,
    'confirmed_at', v_import.confirmed_at,
    'competence', v_import.competence
  );
end;
$$;

grant execute on function public.check_import_duplicate(text) to authenticated;

create or replace function public.list_recent_imports(p_limit integer default 10)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_result jsonb;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.id is null then
    raise exception 'Perfil não encontrado.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id,
    'protocol', i.protocol,
    'filename', i.original_filename,
    'competence', i.competence,
    'status', i.status,
    'summary', i.summary,
    'created_at', i.created_at,
    'confirmed_at', i.confirmed_at,
    'created_by_name', p.full_name
  ) order by i.created_at desc), '[]'::jsonb)
  into v_result
  from (
    select * from public.imports
    where company_id = v_profile.company_id
    order by created_at desc
    limit greatest(1, least(coalesce(p_limit,10),50))
  ) i
  left join public.profiles p on p.id = i.created_by;

  return v_result;
end;
$$;

grant execute on function public.list_recent_imports(integer) to authenticated;

commit;
