/* Monstros BI — Importação direta Van Roy
 * Requer SheetJS (XLSX) no browser. Não altera nem depende da planilha calculadora.
 * Uso: MonstrosImport.parseWorkbook(file) ou MonstrosImport.parseFiles({GERAL:file,...})
 */
(function (global) {
  'use strict';
  const CATEGORIES = ['GERAL', 'CARTAO', 'DEPOSITO', 'MISTO', 'ATIVO', 'CONVERSAO'];
  const norm = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase().replace(/\s+/g, ' ');
  const money = v => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    if (v == null || v === '') return 0;
    let s = String(v).trim().replace(/R\$\s?/gi, '').replace(/\s/g, '');
    if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.includes(',')) s = s.replace(',', '.');
    const n = Number(s.replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };
  const num = v => money(v);
  const cleanName = v => String(v ?? '').trim().replace(/\s+/g, ' ');
  const isName = v => {
    const s = cleanName(v);
    return s.length >= 4 && /[A-Za-zÀ-ÿ]/.test(s) && !/^(EQUIPE\b|TOTAL\b|VENDEDOR\b|NOME\b)/i.test(s);
  };
  function findHeaderRow(rows) {
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const row = (rows[i] || []).map(norm);
      if (row.some(x => x === 'VENDEDOR' || x === 'NOME DO VENDEDOR') && row.some(x => /VL\.?\s*(BRUTO|LIQUIDO|TOTAL)|FATURAMENTO|VALOR/.test(x))) return i;
    }
    return -1;
  }
  function findCol(headers, regexes, fallback) {
    for (let i = 0; i < headers.length; i++) if (regexes.some(r => r.test(norm(headers[i])))) return i;
    return fallback;
  }
  function parseSummaryRows(rows, category) {
    const headerIndex = findHeaderRow(rows);
    if (headerIndex < 0) return { category, rows: [], warnings: [`Não encontrei o cabeçalho de vendedor na aba/arquivo ${category}.`] };
    const headers = rows[headerIndex] || [];
    const cName = findCol(headers, [/^VENDEDOR$/, /^NOME DO VENDEDOR$/], 3);
    const cOrders = findCol(headers, [/^TOT\.?\s*PED/, /^PEDIDOS?$/], 5);
    const cGross = findCol(headers, [/^VL\.?\s*BRUTO$/, /^FATURAMENTO BRUTO$/], 7);
    const cNet = findCol(headers, [/^VL\.?\s*LIQUIDO$/, /^VALOR LIQUIDO$/], 12);
    const cCancelCount = findCol(headers, [/^TOT\.?\s*CANC/, /^QTD\.?\s*CANCEL/], 16);
    const cCancelGross = findCol(headers, [/^VL\.?\s*BRUTO.*CANC/, /^VALOR.*CANCEL/], 17);
    const cTotal = findCol(headers, [/^VL\.?\s*TOTAL$/, /^TOTAL LIQUIDO$/], 21);
    const result = [];
    for (let i = headerIndex + 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const name = cleanName(row[cName]);
      if (!isName(name)) continue;
      result.push({
        vendedor: name,
        pedidos: num(row[cOrders]),
        bruto: num(row[cGross]),
        liquido: num(row[cNet]) || num(row[cGross]),
        cancelamentos: num(row[cCancelCount]),
        valorCancelado: num(row[cCancelGross]),
        liquidoAposCancelamento: (row[cTotal] !== undefined && row[cTotal] !== null && row[cTotal] !== '') ? num(row[cTotal]) : (num(row[cNet]) || num(row[cGross])) - num(row[cCancelGross]),
        categoria: category,
        linhaOrigem: i + 1
      });
    }
    return { category, rows: result, warnings: result.length ? [] : [`Nenhuma linha de vendedor reconhecida em ${category}.`] };
  }
  function parseSimpleRows(rows, category) {
    const result = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || [];
      const name = cleanName(row[0]);
      if (!isName(name)) continue;
      result.push({ vendedor: name, valor: num(row[1]), categoria: category, linhaOrigem: i + 1 });
    }
    return { category, rows: result, warnings: result.length ? [] : [`Nenhuma linha de vendedor reconhecida em ${category}.`] };
  }
  function parseSheet(sheet, category) {
    const rows = global.XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null, blankrows: false });
    if (category === 'MISTO') return parseSimpleRows(rows, category);
    if (category === 'CONVERSAO') return parseSimpleRows(rows, category);
    return parseSummaryRows(rows, category);
  }
  function categoryFromSheetName(name) {
    const n = norm(name).replace(/[^A-Z]/g, '');
    if (n.includes('CARTAO') || n.includes('CREDITO')) return 'CARTAO';
    if (n.includes('DEPOSITO') || n.includes('PIX') || n.includes('BOLETO')) return 'DEPOSITO';
    if (n.includes('MISTO')) return 'MISTO';
    if (n.includes('ATIVO')) return 'ATIVO';
    if (n.includes('CONVERSAO') || n.includes('LIGACAO')) return 'CONVERSAO';
    if (n === 'GERAL' || n.includes('FATURAMENTO') || n.includes('VENDAS')) return 'GERAL';
    return null;
  }
  async function readFile(file) {
    if (!global.XLSX) throw new Error('Biblioteca XLSX não carregada. Inclua o script SheetJS antes de monstros-import.js.');
    const buf = await file.arrayBuffer();
    return global.XLSX.read(buf, { type: 'array', cellDates: true });
  }
  async function parseWorkbook(file) {
    const wb = await readFile(file);
    const categories = {};
    const warnings = [];
    for (const sheetName of wb.SheetNames) {
      const category = categoryFromSheetName(sheetName);
      if (!category || categories[category]) continue;
      const parsed = parseSheet(wb.Sheets[sheetName], category);
      if (parsed.rows.length || !categories[category]) categories[category] = parsed;
      warnings.push(...parsed.warnings);
    }
    return calculate(categories, warnings, [file.name]);
  }
  async function parseFiles(filesByCategory) {
    const categories = {};
    const warnings = [];
    const fileNames = [];
    for (const category of CATEGORIES) {
      const file = filesByCategory[category];
      if (!file) continue;
      fileNames.push(file.name);
      const wb = await readFile(file);
      let sheet = wb.Sheets[category] || wb.Sheets[wb.SheetNames[0]];
      // Se o arquivo individual contiver a aba correspondente, prioriza-a; senão usa a primeira aba.
      const parsed = parseSheet(sheet, category);
      categories[category] = parsed;
      warnings.push(...parsed.warnings);
    }
    return calculate(categories, warnings, fileNames);
  }
  function calculate(categories, warnings = [], files = []) {
    const byName = new Map();
    const add = name => {
      const key = norm(name);
      if (!byName.has(key)) byName.set(key, { vendedor: cleanName(name), geral: 0, brutoGeral: 0, pedidos: 0, cancelamentos: 0, valorCancelado: 0, cartao: 0, deposito: 0, misto: 0, ativo: 0, conversao: null, fontes: {} });
      return byName.get(key);
    };
    const source = (cat) => categories[cat]?.rows || [];
    for (const r of source('GERAL')) {
      const v = add(r.vendedor); v.geral = r.liquidoAposCancelamento; v.brutoGeral = r.bruto; v.pedidos = r.pedidos; v.cancelamentos = r.cancelamentos; v.valorCancelado = r.valorCancelado; v.fontes.GERAL = r;
    }
    for (const r of source('CARTAO')) { const v = add(r.vendedor); v.cartao = r.liquidoAposCancelamento; v.fontes.CARTAO = r; }
    for (const r of source('DEPOSITO')) { const v = add(r.vendedor); v.deposito = r.liquidoAposCancelamento; v.fontes.DEPOSITO = r; }
    for (const r of source('MISTO')) { const v = add(r.vendedor); v.misto = r.valor; v.fontes.MISTO = r; }
    for (const r of source('ATIVO')) { const v = add(r.vendedor); v.ativo = r.bruto; v.fontes.ATIVO = r; }
    for (const r of source('CONVERSAO')) { const v = add(r.vendedor); v.conversao = r.valor; v.fontes.CONVERSAO = r; }
    const sellers = [...byName.values()].map(v => ({
      ...v,
      ticket: v.pedidos > 0 ? v.geral / v.pedidos : 0,
      percentualCancelamento: (v.brutoGeral + v.valorCancelado) > 0 ? v.valorCancelado / (v.brutoGeral + v.valorCancelado) : 0,
      formasPagamento: v.cartao + v.deposito + v.misto
    })).sort((a,b) => b.geral - a.geral);
    const totals = sellers.reduce((t,v) => {
      t.faturamento = t.faturamento + v.geral; t.pedidos += v.pedidos; t.cancelamentos += v.cancelamentos;
      t.valorCancelado += v.valorCancelado; t.ativo += v.ativo; t.cartao += v.cartao; t.deposito += v.deposito; t.misto += v.misto;
      return t;
    }, { faturamento:0, pedidos:0, cancelamentos:0, valorCancelado:0, ativo:0, cartao:0, deposito:0, misto:0 });
    totals.ticketMedio = totals.pedidos ? totals.faturamento / totals.pedidos : 0;
    return { version: '2.1-direct-import-test', importedAt: new Date().toISOString(), files, categories, vendedores: sellers, totais: totals, warnings: [...new Set(warnings)], missingCategories: CATEGORIES.filter(c => !categories[c]) };
  }
  global.MonstrosImport = { categories: CATEGORIES, parseWorkbook, parseFiles, calculate, money };
})(window);
