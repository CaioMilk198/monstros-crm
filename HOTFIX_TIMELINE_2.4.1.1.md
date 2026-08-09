# HOTFIX 2.4.1.1 — TIMELINE DE MISSÕES

## Causa encontrada
A tela usa `changeManualMissionStatus()` para os botões **Iniciar/Concluir**, mas a integração 2.4.1 estava observando `changeMissionStatus()`. Essa função não era a executada pelo botão, então a alteração acontecia no banco, porém o evento não era enviado à Timeline.

## Correção
- Integração ligada à função correta `changeManualMissionStatus`.
- Ao iniciar missão: registra `Missão iniciada`.
- Ao concluir: registra `Missão concluída`.
- Preserva mission_id, seller_id e impacto estimado.
- Atualiza a Timeline imediatamente.
- Mantém persistência local e tentativa de persistência em `operational_events`.

## Implantação
Não há SQL novo.
Substitua `app.js` e `index.html` ou publique o ZIP completo.
Depois Ctrl+F5.

## Teste
Criar missão → Iniciar → Timeline.
Deve aparecer `Missão iniciada` imediatamente.
Depois concluir → Timeline → `Missão concluída`.
