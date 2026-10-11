# Monstrão BI — Importação direta (teste)

## O que este pacote faz
- Lê um Excel exportado do Van Roy com abas GERAL, CARTAO, DEPOSITO, MISTO e ATIVO; também aceita arquivos separados por categoria.
- Extrai os dados por vendedor e consolida os números no navegador.
- Calcula uma projeção linear inicial: faturamento líquido / dias trabalhados × dias úteis do mês.
- Exibe alertas quando alguma aba não é reconhecida.
- Permite exportar o resultado consolidado em CSV.
- Não depende da planilha calculadora nem envia os arquivos para um servidor.

## Teste rápido
1. Extraia o ZIP.
2. Abra `demo.html` em um navegador com internet (a biblioteca SheetJS é carregada por CDN).
3. Escolha o arquivo Excel exportado pelo sistema. Se ele contiver as abas nomeadas, basta selecionar esse arquivo no primeiro campo; se forem arquivos separados, selecione cada um no campo correto.
4. Informe os dias trabalhados e dias úteis e clique em **Ler dados e calcular**.

## Integrar ao site existente
1. Copie `monstros-import.js` para a pasta pública de scripts do Monstrão.
2. Inclua SheetJS e o módulo na página de implantação, antes do script que chama a importação:

```html
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
<script src="/caminho/monstros-import.js"></script>
```

3. Em seu código de tela, use:

```js
// Um arquivo Excel com várias abas:
const resultado = await MonstrosImport.parseWorkbook(fileInput.files[0]);

// Ou um arquivo por categoria:
const resultado = await MonstrosImport.parseFiles({
  GERAL: geralFile,
  CARTAO: cartaoFile,
  DEPOSITO: depositoFile,
  MISTO: mistoFile,
  ATIVO: ativoFile,
  CONVERSAO: conversaoFile // opcional
});

console.log(resultado.vendedores, resultado.totais, resultado.warnings);
```

`resultado.vendedores` inclui `vendedor`, `geral`, `cartao`, `deposito`, `misto`, `ativo`, `pedidos`, `ticket`, `valorCancelado` e dados de origem. `resultado.totais` inclui totais consolidados.

## Importante antes de produção
Este é um módulo inicial para teste, não uma alteração já implantada no site. A regra da projeção linear é provisória e precisa ser validada com a operação. A leitura depende de o relatório manter cabeçalhos/colunas semelhantes ao arquivo de exemplo. Não publique métricas como definitivas até comparar os totais com um dia conhecido. O módulo não grava no Supabase e não modifica dashboards automaticamente; isso precisa ser ligado aos componentes/estado existentes do site.
