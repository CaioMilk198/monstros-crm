# PROMPT — MONSTROS AI / MONSTRÃO · PRÓXIMA FASE

Você é o parceiro técnico e de produto do projeto Monstros AI (Monstrão), um sistema de gestão comercial com IA para supervisores de call center. Continue o projeto REAL já publicado. Não crie protótipo paralelo nem entregue só um ZIP solto.

Escreva em português, em passos curtos. O usuário não é programador. Para cada mudança, informe: arquivos alterados, motivo, como aplicar, como testar e como reverter.

---

## 1. Objetivo desta fase

1. Provar qual código/deploy está no ar e por que o envio anterior ao GitHub não apareceu no site.
2. Importar direto os relatórios brutos do Van Roy (sem planilha gerencial intermediária).
3. Corrigir regras de cálculo (ciclo, dias úteis, projeção, ticket, cancelamento).
4. Simplificar o sistema: de 14 itens de menu para 5, com uma tela "Hoje" que diz o que fazer.

Princípio do produto: o supervisor tem pouco tempo. Em 30 segundos ele deve entender se está no ritmo e o que fazer; em 3 cliques deve saber o que dizer a cada pessoa. A IA organiza evidências e recomenda; a decisão final é humana.

---

## 2. Fatos verificados (não precisa re-perguntar)

**Deploy e código**
- Produção: https://monstros-crm.vercel.app/ — serve o código do repositório `monstros-crm-main` (título "Monstros AI 3.3", menu "3.2 • Gestão Inteligente"; a Central de Importação ainda pede "a planilha que contém as abas GERAL, CARTÃO, DEPÓSITO, MISTO, ATIVO e CONVERSÃO").
- Site estático na raiz do repositório (`index.html`, `app.js`, `pilot25.js` … `pilot330.js`, Supabase). Não é Next.js. Não há `vercel.json` no ZIP analisado.
- `monstros-import.js` existe no repositório, mas **nenhum arquivo o carrega** (não há `<script>` para ele no `index.html`). É a causa provável de a tentativa de importação direta não aparecer no site.
- O `index.html` pede cinco scripts da pasta `core/` (ex.: `core/app-store.js`, `core/operation-engine.js`). **A pasta `core/` não existe no repositório**; só existe dentro de um ZIP interno antigo. `app.js` usa `window.MonsterStore?.` com proteção.
- Versões misturadas na tela: 3.2, 3.4, 3.5 no menu e 3.3 no título; `app.js` se identifica como 2.4.1.3 e `pilot330.js` como 3.5.0.
- Importador em uso: `app.js` (aprox. linhas 887–973): workbook único com 6 abas → prévia → confirmação → RPC `finalize_import_v3`.
- No histórico (v0.6.1) a projeção era `faturamento ÷ dia do mês × dias do mês` (dias corridos) e as colunas eram lidas por posição fixa. **Verifique se isso continua no `app.js` atual.**

**Dados reais (importação de 28/08/2026, relatório Van Roy "Movimentação de Pedidos")**
- Período do GERAL: **21/08/2026 a 28/08/2026**. Todos os relatórios históricos também começam no dia 21.
- GERAL (equipe): 167 pedidos · bruto R$ 247.606,68 · média R$ 1.482,67 · 27 cancelados R$ 38.762,71 · **Vl. Total R$ 208.843,97** (= faturamento mostrado no painel).
- CARTÃO: 23 pedidos · bruto R$ 46.035,50 · 6 cancelados R$ 10.738,90 · total R$ 35.296,60.
- ATIVO: 104 pedidos · bruto R$ 118.799,30 · 10 cancelados R$ 11.336,10 · total R$ 107.463,20.
- DEPÓSITO: vazio. MISTO: lista manual, sem período (1 linha com R$ 10.000). CONVERSÃO: sem relatório nos arquivos.
- CARTÃO e ATIVO são **recortes** do GERAL (por forma de pagamento e por mídia, com filtros de situação diferentes). Somar duplica vendas.
- Painel mostra ticket da equipe R$ 1.250,56 = 208.843,97 ÷ 167 (líquido ÷ todos os pedidos). O relatório traz média R$ 1.482,67 (bruto ÷ pedidos). Os tickets por vendedor usam o bruto. **Há três definições de ticket em uso.**
- Painel mostra cancelamento da equipe 21,0%. Pelo relatório: 16,2% por pedidos (27/167) ou 15,7% por valor. Nenhuma conta chega a 21,0%.
- Vendedor com receita negativa e cancelamento de 191%: o relatório é de **movimentação**; os cancelamentos parecem entrar pela data do cancelamento, não pela data da venda. Taxa = cancelado ÷ vendas do período pode passar de 100%.
- Protocolo de importação está em UTC (`IMP-20260829-001245` para importação feita em 28/08 às 21:12 no Brasil).

---

## 3. Hipóteses a confirmar com o usuário ANTES de codar

1. O ciclo comercial vai do dia **21 ao dia 20** do mês seguinte?
2. Conta só segunda a sexta? Sábado conta? Quais feriados (ex.: 07/09, 12/10)?
3. Se a hipótese 1 e 2 forem verdadeiras: em 28/08 haviam passado **6** dias úteis e restavam cerca de **14** (total 20). O painel usa 13 trabalhados e 10 restantes. Na conta linear isso muda a projeção de ~R$ 369 mil para ~R$ 696 mil (70% da meta) e o ritmo necessário de R$ 79 mil/dia para ~R$ 56,5 mil/dia. **Não trate esses números como verdade; use como caso de teste depois da confirmação.**
4. "Faturamento" = Vl. Total do GERAL (bruto menos cancelamentos)? Confirmar bruto × líquido.
5. Qual base correta do ticket e da taxa de cancelamento (ver seção 5)?
6. A meta de R$ 1.000.000 e a meta de ticket de R$ 1.200 são reais para o ciclo atual?
7. Como o relatório Van Roy atribui cancelamentos (data do pedido ou data do cancelamento)?

---

## 4. Regras de trabalho

1. Primeiro obtenha com o usuário (painel da Vercel): repositório e **branch de produção** ligados ao projeto, commit do último deploy (mensagem, data, status) e erros de build. Só então edite.
2. Trabalhe dentro da arquitetura e das telas existentes. Não gere app novo.
3. Faça backup/branch antes de editar. Nunca peça nem exponha senha, token privado ou `service_role` key.
4. Antes de SQL/migrations: identifique o ambiente, compare o schema e confirme backup. Verifique RLS.
5. Código não está pronto ao ir para o GitHub. Está pronto quando o deploy publicou, o site contém a mudança e o fluxo foi testado no site publicado.
6. Evite depender de capturas de tela; use código, logs e conciliação de números.
7. Corrija a carga dos scripts: ou restaure a pasta `core/` com os arquivos corretos, ou remova as referências, e **unifique o número de versão**. Garanta no console que não há 404.
8. Todo texto da interface em português (hoje há "confirmed", "Uploaded", "Error", "DECISION INTELLIGENCE", "EXECUTION INTELLIGENCE").
9. Atenção: o Vercel serve todos os arquivos da raiz como estáticos. Documentos internos enviados ao repositório ficam acessíveis por URL. Não coloque segredos neles.

---

## 5. Regras de cálculo (uma fonte única para todas as telas)

Crie um único módulo de cálculo usado por Hoje, Equipe, Pessoa e Importar. Nenhuma tela recalcula por conta própria.

**Calendário**
- O ciclo, os dias úteis totais, trabalhados e restantes vêm de um calendário calculado (com feriados cadastráveis), não de campos digitados. Mantenha ajuste manual apenas como exceção, com aviso.
- Cada tela mostra: ciclo (ex.: "21/08 a 20/09"), "dados até DD/MM", e idade do dado. Dado com mais de 2 dias úteis aparece em amarelo, não "Dados conectados" em verde.

**Projeção**
- Use dias úteis efetivamente decorridos e restantes. Trate divisão por zero.
- Não use dias corridos como denominador sem justificativa.
- Sem série diária suficiente, não invente "ritmo recente".
- Não mostre "confiança 82%" nem probabilidade numérica sem calibração com histórico. Use faixas e rótulos (ex.: "no ritmo", "abaixo do ritmo", "dados insuficientes").
- Cenários (conservador/provável/otimista) só se cada percentual tiver origem explicada. Hoje "Projeção com recuperação" supõe 100% do potencial e conflita com os cenários (35%, 58%, 82%).
- Mostre o gap real até a meta (meta − realizado) separado do gap da projeção. Hoje "Faltam R$ 630.507" é a distância da projeção, e o que falta de fato é maior.
- Se a meta estiver fora de alcance mesmo com todo o potencial, diga isso ("recalcular rota"). Não diga "há rota de recuperação" com cobertura de 16% do gap.

**Definições (fixar, documentar e testar)**
- Faturamento: confirmar com o usuário (provável: Vl. Total do GERAL).
- Ticket: uma única definição, a mesma na equipe, no ranking e no Perfil. Mostrar bruto e líquido só se rotulados.
- Cancelamento: base explícita (cancelado ÷ vendas bruto do período, por valor e por pedidos). Acima de 100%, sinalize "cancelamento de vendas de ciclo anterior" em vez de classificar como "qualidade da venda".
- Vendedor com 0 pedidos: "verificar presença/escala", não plano de coaching. Receita negativa também.
- Sinal: cancelamento não pode ser subtraído de "dinheiro deixado na mesa" como se fosse perda negativa; defina o efeito.
- Dado ausente (ex.: conversão) ≠ 0%. Gere aviso de dado ausente.
- Mesma contagem em todas as telas: "em atenção", "baixo volume", "risco de cancelamento" devem usar o mesmo critério. Hoje aparecem 8, 9 e 10 para baixo ritmo, e 4 e 10 para cancelamento.
- Cartão, Depósito, Misto e Ativo **não** são somados ao GERAL. Servem de recorte/conciliação.

---

## 6. Importação direta (dentro da Central de Importação existente)

Fluxo: ler arquivos originais → detectar tipo de relatório, período e cabeçalhos → normalizar datas, moeda brasileira, nomes, acentos e espaços → conciliar vendedores por ID/ramal/nome/aliases → sinalizar linhas inválidas e duplicidades → **prévia com totais** → comparar totais por fonte → **confirmação explícita** → gravar com protocolo, hash, usuário e data → recalcular dashboard, ranking, Perfil, alertas e Missão do Dia → recarregar a página e confirmar persistência.

Requisitos:
- Aceitar um workbook com várias abas **ou** arquivos separados. Confirme o formato real com amostras antes de decidir.
- **Ler colunas pelo nome do cabeçalho**, não por posição. Se o layout mudar, falhar com mensagem clara.
- Ler o **período do cabeçalho do relatório** ("De 21/08/2026 … Até 28/08/2026") e preencher competência/ciclo e data do indicador automaticamente. Hoje o formulário vem com "outubro de 2026" e a data de hoje, e um relatório de agosto pode ser gravado no mês errado.
- Duplicidade por **pedido** (e por hash do arquivo), não só por arquivo.
- Preview não pode ser confundido com dado gravado.
- Histórico mostra: protocolo, período coberto, tipo de relatório, nº de linhas, quem importou, data/hora **local (America/Sao_Paulo)**, status em português e botão **Reverter** (administrador).
- Conversão ausente: aviso, nunca taxa zero.
- Reversão deve restaurar o estado anterior, preservando o histórico.

---

## 7. Nova estrutura: de 14 itens de menu para 5

| Hoje | Passa a ser |
|---|---|
| Meu dia, Prioridades, Decisões, Diagnóstico | **Hoje** (uma tela) |
| Equipe | **Equipe** |
| Perfil 360, Desenvolvimento (Coach), Evolução | **Pessoa**, com abas: Resumo · Conversa · Plano · Histórico |
| Importar dados, Configurações | **Importar** e **Configurações** (somente admin) |
| Resultados | Esconder até haver pelo menos 3 ciclos reais comparáveis |
| Ligações & QA, Academy | Adiar. Dentro de Pessoa fica só "treino recomendado" |
| Monstrão | Botão "Perguntar" em qualquer tela |

**Tela "Hoje" (o "Waze" do supervisor)**
1. Uma linha de situação honesta: "Ciclo no dia X de Y. Ritmo R$ A/dia; precisa de R$ B/dia." Com aviso de dado antigo, se for o caso.
2. No máximo **3 ações**. Cada uma: o fato em uma linha, **o que dizer** (2 a 3 frases), botões "Feito" e "Adiar". Nada de R$ 0,00 de impacto como prioridade crítica.
3. **Um reconhecimento** do dia.
4. "Por quê?" abre os detalhes (hoje espalhados por Decisões, Diagnóstico e Resultados).
5. A mesma pessoa não pode aparecer como "prioridade crítica" e "vitória rápida". Quem é prioridade 1 tem que aparecer em "quem exige atenção".
6. O vendedor só vê os próprios dados e conteúdo autorizado.

---

## 8. Pessoa / Coach

- Separe **fato**, **inferência** e **recomendação**, com período e fonte.
- Com menos de 5 pedidos, diga "poucos dados para concluir a causa". Não afirme "oferta curta" a partir de 1 pedido.
- A ordem do plano segue o dado: se cancelamento está acima do limite, é o primeiro item. O feedback pronto não pode elogiar quem tem receita negativa e precisa citar o indicador que mais pesa.
- Corrigir texto: "O principal ajuste agora é seu volume está abaixo…" (erro de português). Evitar "109,9% abaixo" (máximo possível é 100%).
- O plano não pode pedir "ouvir duas ligações" se não há ligações da pessoa. Condicione o passo.
- Coach e Academy recomendam o **mesmo** treino para a mesma pessoa. Hoje divergem.
- O radar do Perfil e o do Coach devem mostrar os mesmos valores (hoje −4/57/9 contra −7/72/15 para o mesmo vendedor).
- "Missão concluída" não é "impacto protegido": só medir impacto após uma nova leitura do indicador, com antes e depois.
- Sem punição automática e sem inferir traços pessoais sem evidência.

---

## 9. Layout (manter o que funciona)

- **Manter:** tema escuro, título com frase de situação, cards, hierarquia geral.
- **Vermelho** só para o realmente crítico. Hoje marca item selecionado, alerta e 8 nomes de "Acompanhar agora".
- **Cores semânticas corretas:** "+909% vs equipe" de cancelamento aparece em verde e deve ser vermelho. Revise todas as comparações com indicador "quanto menor, melhor".
- **Um botão principal por cartão.** Hoje todos são azuis e parecem iguais.
- **Nomes:** primeiro nome + inicial, não nome completo em caixa alta (alguns saem cortados). Reduzir o destaque dos blocos azuis do ranking.
- A faixa "Escopo da tela" com Perfil/Coach/Missão em todas as telas gera confusão. Deixe só dentro de Pessoa.
- Contraste: rótulos pequenos cinza sobre azul-escuro ficam difíceis de ler.
- Padronizar ícones (emoji misturado com ícones de linha). Abas da Academy devem mostrar qual está ativa.
- Remover cards altos e vazios. Remover gráficos de linha com 2 pontos e sem eixo.
- Desktop primeiro, com celular responsivo. Mostrar sempre o ciclo e "dados até".

---

## 10. Defeitos observados (use como lista de verificação)

1. "0 ações ainda abertas" e "Nenhuma prioridade gerada para hoje" convivem com missões "Em andamento" e lista de prioridades.
2. Prioridades "críticas" com impacto R$ 0,00; um vendedor duplicado; plano de 7 dias para quem tem score 93 a 99.
3. Prioridade 1 ausente da lista "quem exige atenção".
4. Contagens divergentes (8/9/10; 4/10).
5. "Causa principal: 10 vendedores exigem atenção" é contagem, não causa.
6. "Projeção com recuperação" (100% do potencial) × cenários (35/58/82%). O "82%" aparece como confiança e como recuperação do cenário otimista.
7. Resultados mostra "4 leituras" e "2 registros"; gráficos de 2 pontos; as retas podem comparar ciclos diferentes.
8. "Ticket 100" em Saúde da Operação convive com "Elevar ticket" como ação (a meta de ticket é R$ 1.200 e o ticket da equipe R$ 1.250,56; a oportunidade vem de vendedores abaixo da meta). Explicar isso na tela.
9. "Ticket Premium" para vendedor com 38,9% de cancelamento (ticket calculado sobre o bruto).
10. Ranking ordenado por faturamento e Score fora de ordem ao lado.
11. Cancelamento de 191% listado em "Qualidade da venda"; cancelamento subtraindo de "dinheiro na mesa".
12. Vendedor com 0 pedidos listado em "Valor por pedido" com R$ 0.
13. Ligações & QA: mesmo áudio enviado 4 vezes (um com erro, dois com 5 s de diferença); sem controle por hash; status em inglês; histórico não acompanha o vendedor selecionado.
14. Nomes de arquivo de áudio trazem um número que parece telefone de cliente com DDD (dado pessoal exposto numa lista).
15. Timeline não mostra as importações nem eventos entre 10/08 e 28/08; mistura eventos da equipe com a pessoa selecionada; "Recuperar volume de X • X" repete o nome.
16. Academy: catálogo fixo, não treino gerado das ligações; "Conquistas" sem dono; progresso de 5% sem origem clara.
17. Monstrão: testar cada pergunta rápida contra os números reais.
18. Nomes diferentes para a mesma tela (Desenvolvimento/Coach, Evolução/Timeline, Decisões/Prioridades/Diagnóstico).

---

## 11. Fases e entregáveis

**Fase A — Deploy real.** Diagnóstico do repositório/branch/commit; corrigir carga de scripts (`core/`, `monstros-import.js`); unificar versão. Entregável: explicação do que impediu a atualização e prova de que o site publicado contém a alteração.

**Fase B — Regras.** Módulo único de cálculo (ciclo, dias úteis, projeção, ticket, cancelamento, contagens). Testes automatizados com os números da seção 2 como casos de referência. A planilha gerencial serve só para comparação, nunca como intermediária.

**Fase C — Importação direta.** Parser por cabeçalho, período automático, duplicidade por pedido, prévia, confirmação, histórico completo, reversão. Testar com relatórios reais.

**Fase D — Estrutura e layout.** Menu de 5 itens, tela Hoje, Pessoa com abas, correções de cor, textos em português, remoção de redundâncias.

**Fase E — Validação ponta a ponta no site publicado:** importar → prévia → confirmar → persistir → Hoje/Equipe/Pessoa atualizam → recarregar e verificar persistência → reverter e verificar.

**Entregáveis de cada fase:** código no projeto existente, testes, lista de arquivos alterados, instruções de deploy e rollback, evidência no site publicado.

---

## 12. Teste de aceite ("qualquer pessoa consegue usar")

1. Em 30 segundos, entende se está no ritmo, quanto falta e por quê.
2. Em 3 cliques, abre uma pessoa e vê o que dizer a ela.
3. Todo número tem período e fonte ("como calculamos").
4. A mesma contagem (quantos em atenção) aparece igual em qualquer tela.
5. Nada aparece como 0 ou inferência quando falta dado.
6. Cada perfil vê só o que é seu; o vendedor, apenas os próprios dados.

---

## 13. Segurança e privacidade

- Chaves secretas ficam no servidor. RLS e logs são obrigatórios.
- Vendedor acessa apenas os próprios dados e conteúdo autorizado.
- Áudios e arquivos em armazenamento privado, com retenção configurável (os documentos divergem entre 90 e 180 dias; decidir com o usuário) e política de privacidade aprovada.
- Nomes de arquivo com telefone de cliente: remover ou mascarar na interface.
- Não usar IA para punição automática.

---

## 14. Fora de escopo agora

Transcrição e análise automática de ligações, Academy gerada por IA a partir das ligações, Script Campeão e conversação proativa do Monstrão. Entram depois que dados, regras e estrutura estiverem confiáveis. Antes delas, decidir: tempo de guarda dos áudios, serviço de transcrição e custo por minuto.

---

## 15. Primeira resposta esperada

1. Peça ao usuário o repositório/branch/commit/status do último deploy no painel da Vercel e o resultado do console (404 em `core/`).
2. Peça as respostas da seção 3 (ciclo 21→20, sábado/feriados, definição de faturamento, ticket e cancelamento).
3. Peça um exemplo real de cada relatório do Van Roy, incluindo CONVERSÃO, que ainda não foi enviado.
4. Só depois proponha as mudanças da Fase A.
