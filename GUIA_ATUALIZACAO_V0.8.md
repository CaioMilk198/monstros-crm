# MONSTROS CRM v0.8 — CONTROLE DE MISSÕES

## 1. Supabase

Execute:

`SUPABASE_MIGRATION_V3_0_MISSION_CONTROL.sql`

No final devem aparecer três valores `true`.

## 2. GitHub — substituir

- `index.html`
- `app.js`
- `monster-engine.js`
- `styles.css`
- `CHANGELOG.md`

## 3. GitHub — adicionar

- `SUPABASE_MIGRATION_V3_0_MISSION_CONTROL.sql`
- `GUIA_ATUALIZACAO_V0.8.md`

Commit:

`Adiciona Controle de Missões v0.8`

## 4. Testar

1. Aguarde a Vercel ficar Ready.
2. Abra em janela anônima.
3. Entre no Centro de Comando.
4. Clique em `Nova missão`.
5. Crie uma missão com vendedor, impacto e prazo.
6. Clique em `Iniciar`.
7. Clique em `Concluir`.

## Correções visíveis

- O Monstrão deve dizer que a projeção está abaixo da meta em aproximadamente R$ 5.440,96.
- O Ranking compacto deve mostrar o Score em uma linha separada.
- Índice Monstro 78 deve aparecer como `Atenção`.
