# MONSTROS AI 3.2 — Gestão Inteligente

Esta versão combina a estrutura visual mais confiável da 2.6.1 com os motores e integrações presentes na base 3.1. A alteração é de interface, hierarquia, leitura gerencial e coerência de decisão.

## Instalação

1. Extraia o ZIP.
2. Substitua os arquivos do projeto no GitHub pelos arquivos desta versão.
3. Faça o commit e aguarde a publicação automática.
4. Recarregue o sistema com `Ctrl + F5`.

Não há SQL novo e não é necessário alterar o Supabase.

## Teste principal

1. Confirme a identificação `3.2 • GESTÃO INTELIGENTE` no menu lateral.
2. Abra **Visão geral** e verifique:
   - progresso da meta;
   - faturamento, projeção, oportunidade e Índice Monstro;
   - composição gráfica da oportunidade;
   - leitura visual da equipe;
   - decisão principal e fila de ações.
3. Confirme que ações financeiras aparecem antes de reconhecimento quando houver oportunidade recuperável.
4. Abra **Prioridades** e confira se a quantidade de vendedores em atenção é coerente com a fila de decisão.
5. Confirme o indicador **Atingimento projetado**. Ele representa `projeção ÷ meta`, e não probabilidade.
6. Abra **Decisões** e confirme que a Ação nº 1 é a mesma prioridade mostrada na Visão geral.
7. Selecione um vendedor em **Equipe**, abra **Perfil 360** e confirme que o perfil correto é carregado.
8. Navegue por uma tela coletiva e uma individual. O contexto deve indicar claramente **Equipe Monstros** ou **Vendedor em análise**.
9. Abra **Evolução**. Com menos de três importações, devem aparecer medidores atuais e o aviso **Histórico em formação**, sem uma falsa linha de tendência.
10. Abra **Monstrão** e teste uma pergunta rápida e uma pergunta digitada.

## Teste de regressão funcional

- Importação de planilha continua abrindo normalmente.
- Ranking continua ordenando e abrindo o vendedor selecionado.
- Perfil, Coach e Missão mantêm o mesmo vendedor em contexto.
- Sala de Guerra, Director, Timeline, Academy e Ligações & QA carregam sem erro.
- Atualizar dados continua acionando os motores já existentes.
- Login, Supabase e integrações não exigem nova configuração.

## Critério de aprovação

A versão deve ser aprovada somente se a mesma prioridade, o mesmo vendedor e os mesmos valores principais forem coerentes entre Visão geral, Prioridades e Decisões.
