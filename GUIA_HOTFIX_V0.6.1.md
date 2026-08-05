# MONSTROS CRM v0.6.1 — HOTFIX RPC + JAVASCRIPT

## Erros identificados no Console

### 1. RPC 404
O front-end publicado chamou:

`confirm_dashboard_import`

A função nova se chama:

`finalize_import_v3`

O SQL deste pacote cria uma função de compatibilidade, portanto versões antigas e novas passam a funcionar.

### 2. Função JavaScript ausente
O Console mostrou:

`formatBRLInput is not defined`

O novo `app.js` inclui:

- `parseBRLInput`
- `formatBRLInput`

## Passo 1 — Supabase

Execute:

`SUPABASE_HOTFIX_V1_7_RPC_COMPAT.sql`

O resultado final deverá mostrar três colunas com `true`.

## Passo 2 — GitHub

Substitua somente:

- `app.js`

Adicione:

- `SUPABASE_HOTFIX_V1_7_RPC_COMPAT.sql`
- `GUIA_HOTFIX_V0.6.1.md`

Commit:

`Corrige RPC e JavaScript v0.6.1`

## Passo 3 — Vercel

1. Aguarde o deploy ficar `Ready`.
2. Abra o CRM.
3. Pressione `Ctrl + Shift + R` ou `Ctrl + F5`.
4. Abra novamente a planilha.
5. Clique em **Analisar planilha**.
6. Clique em **Confirmar e gerar Dashboard**.

## Resultado esperado

A mensagem deve informar:

- vendedores gravados;
- protocolo;
- quantidade de missões.

Depois:

- Centro de Comando preenchido;
- Ranking com vendedores;
- Score;
- Missão do Dia;
- Monstrão com dados reais.

## Observação

Mesmo antes de a Vercel atualizar, o SQL de compatibilidade já elimina o erro 404 da função antiga.
