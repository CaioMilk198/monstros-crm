# ATUALIZAÇÃO PARA V0.5 — PASSO A PASSO

## 1. Supabase

1. Abra o arquivo `SUPABASE_MIGRATION_V1_3.sql`.
2. No Supabase, entre em **SQL Editor → New query**.
3. Cole todo o conteúdo.
4. Clique em **Run**.
5. Resultado esperado: `Success. No rows returned`.

## 2. GitHub

No repositório `monstros-crm`:

1. Clique em **Add file → Upload files**.
2. Envie e substitua:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `CHANGELOG.md`
3. Envie também:
   - `SUPABASE_MIGRATION_V1_3.sql`
   - `GUIA_ATUALIZACAO_V0.5.md`
4. Clique em **Commit changes**.

## 3. Vercel

A Vercel publicará automaticamente.

Quando ficar `Ready`:

1. Abra `https://monstros-crm.vercel.app`.
2. Pressione `Ctrl + F5`.
3. Entre normalmente.

## 4. Configurar metas

1. Abra **Configurações**.
2. Informe competência.
3. Informe meta mensal da equipe.
4. Informe meta de ticket.
5. Confirme o limite de cancelamento.
6. Clique em **Salvar metas**.

## 5. Importar e confirmar

1. Abra **Importar planilha**.
2. Analise o arquivo.
3. Clique em **Confirmar importação**.
4. O sistema gravará os dados, recalculará o Score e abrirá o Centro de Comando.

## 6. Testar o Monstrão

Abra **Monstrão** e pergunte:

- Como está a equipe?
- Quem devo cobrar hoje?
- Quem merece reconhecimento?
- Qual é o maior risco?
- Monte a pauta da reunião.

Nesta versão, o Monstrão usa regras e os dados reais. Não existe cobrança de API.
