# Atualização para Monstros CRM v0.4

## 1. Supabase

Execute `SUPABASE_MIGRATION_V1_2.sql` no SQL Editor.

Resultado esperado: `Success. No rows returned`.

## 2. GitHub

No repositório `monstros-crm`:

1. Clique em **Add file → Upload files**.
2. Envie e substitua:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `CHANGELOG.md`
3. Envie também:
   - `SUPABASE_MIGRATION_V1_2.sql`
   - `GUIA_ATUALIZACAO_V0.4.md`
4. Confirme **Commit changes**.

A Vercel publicará automaticamente.

## 3. Teste

1. Aguarde a Vercel mostrar `Ready`.
2. Atualize o site com `Ctrl + F5`.
3. Saia e entre novamente.
4. O texto “Perfil pendente” deverá desaparecer.
5. Abra Configurações e ative o primeiro administrador, caso ainda não tenha feito.
6. Abra Importar planilha e teste a análise.
