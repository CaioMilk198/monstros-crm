# CHANGELOG

## v0.5.2 — Hotfix de importação e metas

### Corrigido
- Criação do bucket privado `crm-imports`.
- Importação não é mais bloqueada se o arquivo original não puder ser armazenado.
- Campo da meta mensal aceita formato brasileiro.
- `1.000.000` e `1.000.000,00` passam a ser interpretados como um milhão.
- Meta e ticket são exibidos formatados após salvar.

### Resultado esperado
Após confirmar a planilha, os dados são gravados no banco e alimentam:
- Centro de Comando;
- Ranking;
- Score;
- Missão do Dia;
- Monstrão Lite.
