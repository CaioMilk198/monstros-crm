# GUIA DE IMPLANTAÇÃO — 2.4.1 CORE PILOTO

1. Faça backup/commit da versão atual no GitHub.
2. No Supabase SQL Editor, execute `SUPABASE_MIGRATION_V6_1_CORE_PILOTO.sql`.
3. Envie para a raiz do repositório:
   - `index.html`
   - `app.js`
   - pasta `core/` completa
   - opcionalmente os documentos desta entrega.
4. Não apague `monster-engine.js`, `styles.css` nem migrations antigas.
5. Aguarde o deploy da Vercel ficar Ready.
6. Abra o sistema e use Ctrl+F5.
7. Confira no console/versão: `2.4.1-core-piloto`.

## Teste rápido
Ranking → Perfil 360 → Coach → Academy → criar missão → iniciar/concluir → Timeline → F5.

## Rollback
Se houver regressão, reverta o commit do GitHub. O SQL desta versão é aditivo e não remove dados.
