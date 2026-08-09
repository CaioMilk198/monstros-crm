# MONSTROS AI 2.4.1 — CORE PILOTO

## Objetivo
Começar o piloto real sem reescrever o produto inteiro. Esta versão introduz uma camada modular por baixo da interface atual.

## Entregas
- AppStore: contexto persistente de vendedor/tela/missão.
- OperationEngine: fonte única para números operacionais.
- EventEngine: memória operacional local + Supabase.
- MissionEngine: API única para missões.
- SnapshotEngine: fotografia da operação por importação/carregamento.
- Interface atual preservada.

## Critérios de aceite
1. Login e importação continuam funcionando.
2. Centro de Comando mantém os números atuais.
3. Ranking abre Perfil 360 sem perder vendedor.
4. Perfil abre Coach com o mesmo vendedor.
5. Ações geram eventos.
6. Missões continuam podendo ser criadas/iniciadas/concluídas.
7. Atualização/F5 preserva contexto.
8. Nenhuma tela deve recalcular projeção com fórmula própria quando o OperationEngine possuir o dado.

## Próxima sprint
Persistir feedback/treinamento no banco, comparar snapshots e exibir 'o que mudou desde a última importação'.
