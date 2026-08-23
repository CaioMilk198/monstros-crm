# MONSTROS AI 3.2 — Motor da Decisão

## O que muda

- Uma única fila de decisões alimenta Início, notificações, Equipe e Sala de Guerra.
- Cada recomendação mostra situação, causa provável, evidência, ação, impacto estimado, prazo, critério de sucesso e confiança.
- A recomendação pode virar missão; missões podem ser iniciadas e concluídas com registro de resultado.
- A navegação preserva o padrão familiar de feed, mas prioriza ação em vez de publicação.
- Estados vazios, histórico insuficiente e estimativas são apresentados com transparência.
- A busca de vendedores não depende mais de o usuário voltar ao ranking.

## Como instalar pelo GitHub

1. Abra o repositório `monstros-crm` e confirme que está conectado na conta correta.
2. Na raiz do repositório, envie todos os arquivos e pastas deste pacote, mantendo a mesma estrutura.
3. Marque a opção para substituir os arquivos com o mesmo nome.
4. Confirme o commit na branch `main`.
5. Aguarde o novo deploy automático da Vercel.
6. Abra o sistema em janela anônima ou use `Ctrl + F5` para evitar cache.

Não é necessário executar SQL novo para testar esta versão. O 3.2 reutiliza as missões e eventos já existentes no Supabase.

## Roteiro de validação

1. **Início:** o número de decisões deve ser igual ao contador de notificações.
2. **Coerência:** compare uma prioridade do Início com a Sala de Guerra; responsável, impacto e status devem coincidir.
3. **Explicação:** abra “Por que o sistema recomenda isso?” e verifique causa, evidência, critério e confiança.
4. **Execução:** transforme uma recomendação em missão, inicie e depois conclua registrando o resultado.
5. **Vendedores:** use a busca direta sem precisar voltar ao ranking.
6. **Evolução:** com poucos registros, o sistema deve avisar que ainda não há histórico confiável.

## Critério de aprovação

Um gestor sem treinamento deve conseguir, em menos de 60 segundos, responder: o que aconteceu, em quem agir, o que fazer, por quê, qual impacto esperado e quando revisar.
