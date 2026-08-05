
-- MONSTROS CRM — HOTFIX V1.5
-- Cria o armazenamento da planilha e mantém a importação funcional.
-- Seguro para executar mais de uma vez.

begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'crm-imports',
  'crm-imports',
  false,
  52428800,
  array[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/octet-stream'
  ]
)
on conflict (id)
do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists crm_imports_insert on storage.objects;
create policy crm_imports_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'crm-imports'
  and (storage.foldername(name))[1] =
      (select company_id::text from public.current_profile())
  and (select role from public.current_profile())
      in ('admin','manager','supervisor')
);

drop policy if exists crm_imports_read on storage.objects;
create policy crm_imports_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'crm-imports'
  and (storage.foldername(name))[1] =
      (select company_id::text from public.current_profile())
  and (select role from public.current_profile())
      in ('admin','director','manager','supervisor')
);

drop policy if exists crm_imports_delete on storage.objects;
create policy crm_imports_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'crm-imports'
  and (storage.foldername(name))[1] =
      (select company_id::text from public.current_profile())
  and (select role from public.current_profile())
      in ('admin','manager')
);

notify pgrst, 'reload schema';

commit;

-- Resultado de conferência:
select id, name, public, file_size_limit
from storage.buckets
where id = 'crm-imports';
