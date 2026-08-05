# MONSTROS CRM v0.5.2 — CORREÇÃO FINAL DO FLUXO

## O que as telas mostraram

1. A meta `1.000000` foi interpretada como R$ 1,00.
2. A prévia da planilha funcionou.
3. A confirmação parou com `Bucket not found`.
4. Por isso o Dashboard e o Ranking continuaram vazios.

## Passo 1 — Supabase

Execute primeiro:

`SUPABASE_HOTFIX_V1_5_BUCKET.sql`

No SQL Editor, o resultado deve mostrar o bucket `crm-imports`.

## Passo 2 — GitHub

Substitua estes arquivos:

- `index.html`
- `styles.css`
- `app.js`
- `CHANGELOG.md`

Envie também:

- `SUPABASE_HOTFIX_V1_5_BUCKET.sql`
- `GUIA_ATUALIZACAO_V0.5.2.md`

Commit:

`Corrige importação e metas v0.5.2`

## Passo 3 — Vercel

Aguarde o deploy ficar `Ready`. Abra o CRM e pressione `Ctrl + F5`.

## Passo 4 — Corrigir a meta

Em Configurações, digite:

`1.000.000,00`

Meta de ticket:

`1.200,00`

Limite de cancelamento:

`15`

Clique em **Salvar metas**.

## Passo 5 — Confirmar a planilha

1. Analise a planilha.
2. Role até o fim da prévia.
3. Clique em **Confirmar importação**.
4. Aguarde a mensagem com o protocolo.
5. O sistema abrirá o Centro de Comando.

## Resultado esperado

- Faturamento: R$ 483.549,17
- Meta: R$ 1.000.000,00
- Atingimento: aproximadamente 48,4%
- Ranking preenchido
- Score calculado
- Missão do Dia criada
- Monstrão respondendo com os dados importados
