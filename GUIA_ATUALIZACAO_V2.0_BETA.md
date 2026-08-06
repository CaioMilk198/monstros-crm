# Atualização Monstros AI v2.0 Beta

## 1. Supabase
Execute `SUPABASE_MIGRATION_V5_0_MONSTROS_AI_BETA.sql`.

O resultado esperado é:
- coach_feedbacks_ok = true
- development_plans_ok = true
- operational_events_ok = true
- coach_rpc_ok = true

## 2. GitHub
Substitua:
- index.html
- app.js
- styles.css
- CHANGELOG.md

Mantenha o `monster-engine.js` atual, ou envie o arquivo do pacote para garantir a mesma versão.

Adicione:
- SUPABASE_MIGRATION_V5_0_MONSTROS_AI_BETA.sql
- GUIA_ATUALIZACAO_V2.0_BETA.md

Commit sugerido:
`Implanta Monstros AI v2.0 Beta com Coach e Sala de Guerra`

## 3. Teste
Aguarde a Vercel ficar Ready, abra o domínio normal e pressione Ctrl+F5.

Teste:
1. Sala de Guerra
2. Monster Coach e seleção de vendedor
3. Feedback pronto
4. Timeline Inteligente
5. Academy
6. Analytics 2.0
