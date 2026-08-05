# MONSTROS CRM v0.6 — IMPLANTAÇÃO

## Diagnóstico das fotos

A planilha foi analisada, mas ainda estava somente em **Prévia**.
Prévia não significa importação confirmada. Por isso:

- Ranking vazio;
- Monstrão sem dados;
- Missão do Dia ausente.

A v0.6 deixa essa diferença explícita e torna a confirmação reparável.

## Passo 1 — Supabase

Execute:

`SUPABASE_MIGRATION_V1_6_FLUXO_COMPLETO.sql`

Resultado esperado:

`Success. No rows returned`

## Passo 2 — GitHub

Substitua:

- `index.html`
- `styles.css`
- `app.js`
- `CHANGELOG.md`

Adicione:

- `SUPABASE_MIGRATION_V1_6_FLUXO_COMPLETO.sql`
- `GUIA_ATUALIZACAO_V0.6.md`

Commit:

`Completa fluxo de importação v0.6`

## Passo 3 — Vercel

Aguarde `Ready`, abra o CRM e pressione `Ctrl + F5`.

## Passo 4 — Importação

1. Escolha a planilha.
2. Clique em **Analisar planilha**.
3. Confira a prévia.
4. Clique no botão destacado:
   **Confirmar e gerar Dashboard**
5. Aguarde a mensagem com:
   - vendedores gravados;
   - protocolo;
   - quantidade de missões.

## Resultado esperado

- Dashboard preenchido;
- Ranking com 16 vendedores;
- Score visível;
- Missão do Dia;
- Monstrão respondendo com dados reais.

O mesmo arquivo pode ser usado novamente para reparar a tentativa anterior.
