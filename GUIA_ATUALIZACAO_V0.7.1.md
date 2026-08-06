# MONSTROS CRM v0.7.1 — CORREÇÃO DA INTELIGÊNCIA

## 1. Supabase

Execute:

`SUPABASE_MIGRATION_V2_1_INTELLIGENCE_FIX.sql`

Resultado esperado:

`Success. No rows returned`

## 2. GitHub

Substitua:

- `index.html`
- `app.js`
- `monster-engine.js`
- `CHANGELOG.md`

Adicione:

- `SUPABASE_MIGRATION_V2_1_INTELLIGENCE_FIX.sql`
- `GUIA_ATUALIZACAO_V0.7.1.md`

Commit:

`Corrige inteligência e projeção v0.7.1`

## 3. Vercel

Aguarde o deploy ficar `Ready`.
Abra o CRM em janela anônima.

No Console devem aparecer:

- `MONSTROS CRM v0.7 - Monster Engine carregado`
- `MONSTROS CRM v0.7.1 - Intelligence Fix`

## 4. Configurações

Informe os dias úteis corretamente.

Exemplo:

- meta: R$ 1.000.000;
- dias úteis totais: 20;
- dias úteis trabalhados: 8;
- faturamento atual: R$ 520.000.

Resultado:

- média diária: R$ 65.000;
- projeção: R$ 1.300.000;
- faltam 12 dias úteis;
- faltam R$ 480.000;
- ritmo necessário: R$ 40.000/dia.

## 5. Testar

### Centro de Comando
- projeção por dias úteis;
- Índice Monstro;
- Onde estamos;
- Para onde vamos;
- Onde está o dinheiro.

### Inteligência
- Saúde da Operação;
- oportunidades;
- projeção;
- DNA da equipe.

### Ranking
- Score 2.0;
- medalhas;
- menos notas 100.
