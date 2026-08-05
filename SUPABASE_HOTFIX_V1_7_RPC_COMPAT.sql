
-- MONSTROS CRM — HOTFIX V1.7
-- Corrige 404 da RPC antiga e mantém compatibilidade com versões anteriores.
-- Execute após a migração V1.6.

begin;

-- Compatibilidade: versões antigas do front-end chamam confirm_dashboard_import.
create or replace function public.confirm_dashboard_import(
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
language sql
security definer
set search_path = public
as $$
  select public.finalize_import_v3(
    p_filename,
    p_sha256,
    p_file_size,
    p_storage_path,
    p_competence,
    p_indicator_date,
    p_team_name,
    p_summary,
    p_rows
  );
$$;

revoke all on function public.confirm_dashboard_import(
  text,text,bigint,text,date,date,text,jsonb,jsonb
) from public;

grant execute on function public.confirm_dashboard_import(
  text,text,bigint,text,date,date,text,jsonb,jsonb
) to authenticated;

notify pgrst, 'reload schema';

commit;

-- Verificação
select
  to_regprocedure(
    'public.finalize_import_v3(text,text,bigint,text,date,date,text,jsonb,jsonb)'
  ) is not null as finalize_import_v3_existe,
  to_regprocedure(
    'public.confirm_dashboard_import(text,text,bigint,text,date,date,text,jsonb,jsonb)'
  ) is not null as compatibilidade_existe,
  to_regprocedure('public.get_today_mission()') is not null as missao_existe;
