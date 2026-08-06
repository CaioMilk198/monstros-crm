# Hotfix v1.0.1 — Timeline

O PostgreSQL não permite alterar as colunas de retorno de uma função existente usando `CREATE OR REPLACE FUNCTION`.

Esta versão remove a função antiga antes de recriá-la com o novo retorno.

## Instalação
1. Abra o SQL Editor do Supabase.
2. Cole todo o conteúdo de `SUPABASE_MIGRATION_V4_1_INTELIGENCIA.sql`.
3. Clique em Run.
4. O resultado esperado é `analytics_v10_ok = true`.
