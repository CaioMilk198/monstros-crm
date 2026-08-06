# MONSTROS CRM v0.7.3

## Corrige

- Ranking principal por faturamento.
- Medalhas por faturamento.
- Score permanece como índice de qualidade.
- Texto percentual da projeção usa o cálculo por dias úteis.
- Índice Monstro recebe penalidade por risco da equipe.
- Saúde da operação deixa de mostrar tudo como 100.
- Onde está o dinheiro nunca fica vazio apenas porque a meta básica foi atingida.
- Diagnóstico do Ranking permite múltiplos atributos.

## Instalação

### Supabase

Execute:

`SUPABASE_HOTFIX_V2_3_INTELLIGENCE.sql`

Resultado esperado:

`monster_engine_v23_existe = true`

### GitHub — substituir

- `app.js`
- `monster-engine.js`
- `index.html`
- `styles.css`

### GitHub — adicionar

- `SUPABASE_HOTFIX_V2_3_INTELLIGENCE.sql`
- `GUIA_ATUALIZACAO_V0.7.3.md`

Commit:

`Corrige ranking e inteligência v0.7.3`

## Teste

1. Aguarde a Vercel ficar Ready.
2. Abra o CRM em janela anônima.
3. Clique em Atualizar.
4. Verifique:
   - Lilian em primeiro lugar por faturamento;
   - projeção de 99,5%, não 268,1%;
   - Índice Monstro abaixo de 100 quando houver riscos;
   - oportunidades financeiras maiores que zero;
   - múltiplos diagnósticos no Ranking.
