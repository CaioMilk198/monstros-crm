-- MONSTROS AI 2.5.3 — Call Lab sem custo / QA manual
-- Rode UMA VEZ no SQL Editor do Supabase.
-- Permite que gestor/supervisor registre e edite a avaliação manual das ligações.

drop policy if exists call_recordings_company_update on public.call_recordings;
create policy call_recordings_company_update
on public.call_recordings
for update
to authenticated
using (
  company_id=(select company_id from public.profiles where id=auth.uid() limit 1)
  and (
    coalesce((select role::text from public.profiles where id=auth.uid() limit 1),'') in ('admin','manager','supervisor')
    or seller_id=(select seller_id from public.profiles where id=auth.uid() limit 1)
    or uploaded_by=auth.uid()
  )
)
with check (
  company_id=(select company_id from public.profiles where id=auth.uid() limit 1)
  and (
    coalesce((select role::text from public.profiles where id=auth.uid() limit 1),'') in ('admin','manager','supervisor')
    or seller_id=(select seller_id from public.profiles where id=auth.uid() limit 1)
    or uploaded_by=auth.uid()
  )
);

grant update on public.call_recordings to authenticated;
