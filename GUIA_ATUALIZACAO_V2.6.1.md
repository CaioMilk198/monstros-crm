# MONSTROS AI 2.6.1 — PILOT HARDENING

Objetivo: parar expansão e aumentar confiança antes do piloto real.

## Correções desta entrega
- Sala de Guerra separa prioridade financeira de ações sem impacto calculado.
- Prioridades são ordenadas por impacto + urgência, não apenas pela ordem da lista.
- Contagem de vendedores em atenção usa a mesma fonte operacional do restante do sistema.
- Monstrão passa a exibir o mesmo potencial financeiro da fonte única `operationState()`.
- Contexto ativo deixa explícito quando a tela continua mostrando números da equipe.
- Analytics tenta usar snapshots locais quando o RPC histórico ainda não devolve série suficiente.
- Coach ganha explicação de benchmark para reduzir recomendações que parecem arbitrárias.
- Banner identifica claramente o estágio de validação.

## O que ainda bloqueia um piloto 10/10
1. QA: player de áudio interno + filtro Este vendedor/Toda equipe.
2. Academy: lições reais com conteúdo, exercício, resposta e avaliação; não apenas cards/progresso.
3. Missões: medir baseline, resultado realizado e delta antes/depois.
4. Analytics: snapshots persistidos no Supabase por importação, com granularidade diária/semanal/mensal.
5. Diagnóstico: versão explícita das regras, evidências e confiança de cada recomendação.
6. Permissões: teste de RLS e perfis Admin/Supervisor/Vendedor em ambiente separado.
7. Testes de regressão: validar que Centro, Inteligência, Sala, Director e Monstrão retornam os mesmos KPIs-base.

## Implantação
Substitua `index.html` pelo arquivo `index_261.html` (renomeando para `index.html`), adicione `pilot261.js` e use o `styles.css` incluído. Não remova os demais arquivos atuais.
