console.info('MONSTROS CRM v0.7.1 - Intelligence Fix');
window.MONSTROS_CRM_VERSION='0.7.1';
let client = null;
let profile = null;
let preview = null;
let dashboardPayload = null;

const $ = (id) => document.getElementById(id);
const money = (v) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
const pct = (v) => v == null || v === '' ? '—' : `${(Number(v)*100).toFixed(1)}%`;
const normalize = (v) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toUpperCase();
const num = (v) => {
  if(typeof v==='number') return Number.isFinite(v)?v:0;
  const raw=String(v??'').trim();
  if(!raw) return 0;
  const s=raw.includes(',') ? raw.replace(/\./g,'').replace(',','.') : raw.replace(/[^\d.-]/g,'');
  const n=Number(s.replace(/[^\d.-]/g,'')); return Number.isFinite(n)?n:0;
};
const parseBRLInput = (value) => {
  const raw=String(value??'').trim().replace(/\s/g,'');
  if(!raw) return 0;
  const normalized = raw.includes(',')
    ? raw.replace(/\./g,'').replace(',','.').replace(/[^\d.-]/g,'')
    : raw.replace(/[^\d.-]/g,'');
  const parsed=Number(normalized);
  return Number.isFinite(parsed)?parsed:0;
};
const formatBRLInput = (value) => {
  const parsed = typeof value === 'number' ? value : parseBRLInput(value);
  if(!Number.isFinite(parsed) || parsed===0) return '';
  return new Intl.NumberFormat('pt-BR',{
    minimumFractionDigits:2,
    maximumFractionDigits:2
  }).format(parsed);
};
const dateBR = (v) => v ? new Date(v).toLocaleString('pt-BR') : '—';

function initClient(){
  const url=localStorage.getItem('monstros_supabase_url');
  const key=localStorage.getItem('monstros_supabase_key');
  if(!url||!key) return false;
  client=supabase.createClient(url,key);
  return true;
}
function show(id){ document.querySelectorAll('.screen').forEach(x=>x.classList.add('hidden')); $(id).classList.remove('hidden'); }
function showApp(){ document.querySelectorAll('.screen').forEach(x=>x.classList.add('hidden')); $('app').classList.remove('hidden'); }
function setMessage(id,text,type=''){ const el=$(id); el.textContent=text; el.className=`message ${type}`; }

async function boot(){
  if(!initClient()){ show('config-screen'); return; }
  const {data:{session}}=await client.auth.getSession();
  if(!session){ show('auth-screen'); return; }
  await loadProfile();
  showApp();
  await Promise.all([loadDashboard(), loadImportHistory()]);
}
async function loadProfile(){
  const {data:{user}}=await client.auth.getUser();
  let result=await client.from('profiles').select('*').eq('id',user.id).maybeSingle();
  if(!result.data){
    const ensured=await client.rpc('ensure_my_profile');
    if(!ensured.error){ result=await client.from('profiles').select('*').eq('id',user.id).maybeSingle(); }
  }
  if(result.error || !result.data){
    profile=null;
    $('user-name').textContent=user.email;
    $('user-role').textContent='Perfil pendente';
    $('profile-warning').classList.remove('hidden');
    $('profile-warning-text').textContent='Execute a migração V1.2 ou tente sair e entrar novamente.';
    return;
  }
  profile=result.data;
  $('user-name').textContent=result.data.full_name;
  $('user-role').textContent=result.data.role;
  $('profile-warning').classList.toggle('hidden', !!profile);
}

$('save-config').onclick=()=>{
  const url=$('cfg-url').value.trim().replace(/\/$/,'');
  const key=$('cfg-key').value.trim();
  if(!url||!key) return alert('Preencha a URL e a chave publicável.');
  if(!/^https:\/\/.+\.supabase\.co$/.test(url)) return alert('A URL deve terminar em .supabase.co e não deve conter /rest/v1/.');
  localStorage.setItem('monstros_supabase_url',url);
  localStorage.setItem('monstros_supabase_key',key);
  location.reload();
};
document.querySelectorAll('[data-auth-tab]').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('[data-auth-tab]').forEach(x=>x.classList.remove('active')); b.classList.add('active');
  $('login-form').classList.toggle('hidden',b.dataset.authTab!=='login');
  $('signup-form').classList.toggle('hidden',b.dataset.authTab!=='signup');
});
$('login-button').onclick=async()=>{
  setMessage('auth-message','Entrando...');
  const {error}=await client.auth.signInWithPassword({email:$('login-email').value,password:$('login-password').value});
  if(error){setMessage('auth-message',error.message,'error');return;} location.reload();
};
$('signup-button').onclick=async()=>{
  setMessage('auth-message','Criando conta...');
  const {error}=await client.auth.signUp({
    email:$('signup-email').value,
    password:$('signup-password').value,
    options:{data:{full_name:$('signup-name').value}}
  });
  setMessage('auth-message',error?error.message:'Conta criada. Confira o e-mail se a confirmação estiver ativada.',error?'error':'success');
};
$('logout-button').onclick=async()=>{await client.auth.signOut();location.reload();};

document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>openView(b.dataset.view));
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>openView(b.dataset.go));
function openView(name){
  document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.view===name));
  document.querySelectorAll('.view').forEach(x=>x.classList.add('hidden'));
  $(`view-${name}`).classList.remove('hidden');
  const titles={dashboard:['Centro de Comando','O que precisa da sua atenção agora.'],import:['Central de Importação','Valide antes de confirmar.'],ranking:['Ranking','Índice Monstro e DNA Comercial.'],intelligence:['Inteligência Gerencial','Onde estamos, para onde vamos e onde está o dinheiro.'],profile360:['Perfil 360','Dossiê individual do vendedor.'],monstrao:['Monstrão','Copiloto gerencial baseado nos dados atuais.'],settings:['Configurações','Metas, dias úteis e permissões.']};
  $('view-title').textContent=titles[name][0]; $('view-subtitle').textContent=titles[name][1];
  if(name==='import') loadImportHistory();
}
$('refresh-button').onclick=async()=>{await loadProfile();await loadDashboard();};

async function loadDashboard(){
  if(!profile) return;
  const {data,error}=await client.rpc('get_dashboard_payload',{p_date:new Date().toISOString().slice(0,10)});
  if(error){console.error(error);return;}
  dashboardPayload=data;
  const has=data && data.date;
  $('empty-dashboard').classList.toggle('hidden',has);
  $('dashboard-content').classList.toggle('hidden',!has);
  if(!has) return;
  const s=data.summary||{};
  $('kpi-revenue').textContent=money(s.revenue);
  $('kpi-target').textContent=money(s.target);
  $('kpi-projection').textContent=money(s.projection);
  $('kpi-orders').textContent=s.orders||0;
  $('kpi-ticket').textContent=money(s.average_ticket);
  $('kpi-cancellation').textContent=pct(s.cancellation_rate);
  $('kpi-attainment').textContent=s.target>0?`${(Number(s.attainment||0)*100).toFixed(1)}% da meta`:'Meta não definida';
  $('kpi-gap').textContent=`Gap: ${money(s.gap||0)}`;
  $('kpi-projected-attainment').textContent=s.target>0?`${(Number(s.projected_attainment||0)*100).toFixed(1)}% projetado`:'Cadastre a meta';
  renderRanking(data.ranking||[]);
  $('top-list').innerHTML=(data.ranking||[]).slice(0,5).map((r,i)=>`<div class="seller-row"><span>${i+1}. ${r.seller_name}<small>Score ${Number(r.score||0).toFixed(0)}</small></span><strong>${money(r.revenue)}</strong></div>`).join('');
  $('mission-list').innerHTML=(data.mission||[]).length?(data.mission||[]).map(m=>`<div class="mission ${m.priority}"><strong>${m.sequence}. ${m.title}</strong><small>${m.reason}</small><div>${m.action_text}</div><button onclick="completeMission('${m.id}')">Concluir</button></div>`).join(''):'<p>Nenhuma prioridade gerada para hoje.</p>';
  $('insight-grid').innerHTML=(data.insights||[]).map(x=>`<div class="insight-card"><strong>${x.title}</strong><p>${x.text}</p></div>`).join('');
  $('monstrao-summary').textContent=buildExecutiveSummary(data);
  if(window.MonsterEngine){
    const engineData=await window.MonsterEngine.load(client);
    window.MonsterEngine.renderDashboard();
    window.MonsterEngine.renderIntelligence();
    if(engineData?.projection){
      const ep=engineData.projection;
      $('kpi-projection').textContent=money(ep.projected_revenue);
      $('kpi-projection-sub').textContent=`${pct(ep.projected_attainment)} projetado por dias úteis`;
      const projectionCard=$('kpi-projection')?.closest('.kpi');
      if(projectionCard) projectionCard.title=
        `Média diária: ${money(ep.daily_rate)} | Ritmo necessário: ${money(ep.required_daily_rate)}`;
    }
    if(engineData?.seller_dna?.length){
      const rankMap=new Map(engineData.seller_dna.map(s=>[s.seller_id,s]));
      const updated=(dashboardPayload?.ranking||[]).map(r=>({
        ...r,
        score:rankMap.get(r.seller_id)?.score ?? r.score
      }));
      renderRanking(updated);
    }
  }
}
function sellerDiagnosis(r,team){
  const avgRevenue=(team||[]).reduce((s,x)=>s+Number(x.revenue||0),0)/Math.max(1,(team||[]).length);
  if(Number(r.cancellation_rate||0)>0.08) return ['Cancelamento alto','risk'];
  if(Number(r.revenue||0)<avgRevenue*0.65) return ['Abaixo do ritmo','risk'];
  if(Number(r.score||0)>=85) return ['Destaque','good'];
  if(Number(r.average_ticket||0)<((team||[]).reduce((s,x)=>s+Number(x.average_ticket||0),0)/Math.max(1,(team||[]).length))*0.85) return ['Ticket em atenção','warn'];
  return ['Acompanhar','warn'];
}
function renderRanking(rows){
  $('ranking-body').innerHTML=rows.map((r,i)=>{
    const d=sellerDiagnosis(r,rows);
    const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`;
    return `<tr><td>${medal}</td><td><button class="seller-link" onclick="openSeller360('${r.seller_id}')">${r.seller_name}</button></td><td><span class="score-badge">${Number(r.score||0).toFixed(0)}</span></td><td>${money(r.revenue)}</td><td>${r.orders||0}</td><td>${money(r.average_ticket)}</td><td>${money(r.active_revenue)}</td><td>${pct(r.cancellation_rate)}</td><td><span class="diagnosis ${d[1]}">${d[0]}</span></td></tr>`;
  }).join('');
}
window.completeMission=async(id)=>{
  const {error}=await client.rpc('complete_mission_item',{p_item_id:id});
  if(error) alert(error.message); else loadDashboard();
};

$('claim-admin-button').onclick=async()=>{
  setMessage('settings-message','Ativando...');
  if(!profile) await loadProfile();
  const {error}=await client.rpc('claim_pilot_admin');
  setMessage('settings-message',error?error.message:'Administrador ativado com sucesso.',error?'error':'success');
  if(!error){await loadProfile();await loadDashboard();}
};
$('reset-config-button').onclick=()=>{localStorage.removeItem('monstros_supabase_url');localStorage.removeItem('monstros_supabase_key');location.reload();};

function findSheet(wb,name){
  const target=normalize(name);
  const aliases={CARTAO:['CARTAO','CARTÃO'],DEPOSITO:['DEPOSITO','DEPÓSITO'],CONVERSAO:['CONVERSAO','CONVERSÃO']};
  const targets=aliases[target]||[target];
  const found=wb.SheetNames.find(n=>targets.includes(normalize(n)));
  return found?{name:found,sheet:wb.Sheets[found]}:null;
}
function rows(sheetInfo){return sheetInfo?XLSX.utils.sheet_to_json(sheetInfo.sheet,{header:1,defval:null,raw:true}):[];}
function movementMap(data,source){
  const map=new Map();
  data.forEach(r=>{
    const name=normalize(r[3]);
    if(!name||name==='VENDEDOR'||name.startsWith('EQUIPE ')||name==='TOTAL GERAL') return;
    if(!/[A-Z]{3}/.test(name)) return;
    map.set(name,{seller_name:String(r[3]).trim(),orders:num(r[5]),revenue:num(r[21])||num(r[7]),average_ticket:num(r[14]),cancelled_value:num(r[20]),gross_value:num(r[7]),source});
  }); return map;
}
function simpleMap(data){
  const map=new Map(); data.forEach(r=>{const name=normalize(r[0]);if(!name||!/[A-Z]{3}/.test(name))return;map.set(name,num(r[1]));});return map;
}
function conversionMap(data){
  const map=new Map(); data.slice(1).forEach(r=>{const name=normalize(r[2]);if(!name||name==='TOTAL')return;const calls=num(r[3]),orders=num(r[4]);map.set(name,{extension:r[0]?String(r[0]):'',calls,orders,conversion_rate:calls>0?orders/calls:null});});return map;
}
async function hashFile(file){
  const buf=await file.arrayBuffer(); const hash=await crypto.subtle.digest('SHA-256',buf);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function calculateProjection(revenue, indicatorDate){
  const d=new Date(`${indicatorDate}T12:00:00`);
  const daysInMonth=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
  const elapsed=Math.max(1,d.getDate());
  return revenue/elapsed*daysInMonth;
}
function renderSheetAudit(audit){
  $('sheet-audit').classList.remove('hidden');
  $('sheet-audit').innerHTML=`<strong>Auditoria das abas</strong><div class="audit-grid">${audit.map(x=>`<span class="audit-item ${x.found?'ok':'missing'}">${x.found?'✓':'!'} ${x.label}${x.name?` <small>(${x.name})</small>`:''}</span>`).join('')}</div>`;
}

$('analyze-button').onclick=async()=>{
  const file=$('workbook-file').files[0];
  if(!file) return setMessage('import-status','Selecione uma planilha.','error');
  if(!profile) return setMessage('import-status','Seu perfil ainda não foi preparado. Abra Configurações e tente ativar o administrador.','error');
  setMessage('import-status','Lendo, auditando e validando...');
  $('preview-panel').classList.add('hidden');
  try{
    const sha256=await hashFile(file);
    const duplicateCheck=await client.rpc('check_import_duplicate',{p_sha256:sha256});
    if(!duplicateCheck.error && duplicateCheck.data?.duplicate){
      throw new Error(`Arquivo já importado. Protocolo: ${duplicateCheck.data.protocol} em ${dateBR(duplicateCheck.data.confirmed_at)}.`);
    }
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});
    const infos={
      geral:findSheet(wb,'GERAL'), cartao:findSheet(wb,'CARTAO'), deposito:findSheet(wb,'DEPOSITO'),
      misto:findSheet(wb,'MISTO'), ativo:findSheet(wb,'ATIVO'), conversao:findSheet(wb,'CONVERSAO')
    };
    renderSheetAudit([
      {label:'GERAL',found:!!infos.geral,name:infos.geral?.name},{label:'CARTÃO',found:!!infos.cartao,name:infos.cartao?.name},
      {label:'DEPÓSITO',found:!!infos.deposito,name:infos.deposito?.name},{label:'MISTO',found:!!infos.misto,name:infos.misto?.name},
      {label:'ATIVO',found:!!infos.ativo,name:infos.ativo?.name},{label:'CONVERSÃO',found:!!infos.conversao,name:infos.conversao?.name}
    ]);
    const geral=movementMap(rows(infos.geral),'GERAL');
    const cartao=movementMap(rows(infos.cartao),'CARTAO');
    const deposito=movementMap(rows(infos.deposito),'DEPOSITO');
    const ativo=movementMap(rows(infos.ativo),'ATIVO');
    const misto=simpleMap(rows(infos.misto));
    const conv=conversionMap(rows(infos.conversao));
    if(!geral.size) throw new Error('Não encontrei vendedores válidos na aba GERAL. Confira se é a planilha operacional correta.');
    const indicatorDate=$('indicator-date').value || new Date().toISOString().slice(0,10);
    const list=[...geral.entries()].map(([key,g])=>{
      const c=cartao.get(key),d=deposito.get(key),a=ativo.get(key),cv=conv.get(key);
      const canc=g.gross_value>0?g.cancelled_value/g.gross_value:null;
      return {seller_name:g.seller_name,extension:cv?.extension||'',revenue:g.revenue,orders:g.orders,average_ticket:g.average_ticket|| (g.orders?g.revenue/g.orders:0),card_revenue:c?.revenue||0,deposit_revenue:d?.revenue||0,mixed_revenue:misto.get(key)||0,active_revenue:a?.revenue||0,conversion_rate:cv?.conversion_rate??'',cancellation_rate:canc??'',projection:calculateProjection(g.revenue,indicatorDate),data_confidence:conv.has(key)?0.95:0.80};
    });
    const warnings=[];
    if(!infos.conversao) warnings.push('Aba CONVERSÃO ausente: conversão ficará sem dados.');
    const missingConversion=list.filter(x=>x.conversion_rate==='').length;
    if(missingConversion) warnings.push(`${missingConversion} vendedor(es) sem correspondência na aba CONVERSÃO.`);
    preview={file,sha256,rows:list,summary:{sellers:list.length,revenue:list.reduce((s,x)=>s+x.revenue,0),orders:list.reduce((s,x)=>s+x.orders,0),warnings}};
    $('preview-summary').innerHTML=`<div class="panel kpi"><small>Vendedores</small><strong>${list.length}</strong></div><div class="panel kpi"><small>Faturamento</small><strong>${money(preview.summary.revenue)}</strong></div><div class="panel kpi"><small>Pedidos</small><strong>${preview.summary.orders}</strong></div><div class="panel kpi"><small>Alertas</small><strong>${warnings.length}</strong></div>`;
    $('preview-body').innerHTML=list.map(x=>`<tr><td>${x.seller_name}</td><td>${money(x.revenue)}</td><td>${x.orders}</td><td>${money(x.average_ticket)}</td><td>${pct(x.conversion_rate)}</td><td>${pct(x.cancellation_rate)}</td></tr>`).join('');
    $('preview-panel').classList.remove('hidden');
    setMessage('import-status',warnings.length?`Planilha analisada com alertas:\n- ${warnings.join('\n- ')}`:'Planilha analisada sem alertas críticos. Confira a prévia.','success');
  }catch(e){setMessage('import-status','Erro: '+e.message,'error');}
};

$('confirm-button').onclick=async()=>{
  if(!preview) return;
  const competence=$('competence').value, date=$('indicator-date').value;
  if(!competence||!date) return alert('Preencha competência e data do indicador.');
  setMessage('import-status','Enviando arquivo e confirmando importação...');
  $('confirm-button').disabled=true;
  try{
    setMessage('import-status','Confirmando dados no banco e gerando Dashboard, Ranking e Missão do Dia...','success');
    const companyId=profile.company_id;
    const safeName=preview.file.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]/g,'_');
    const path=`${companyId}/${competence}/${Date.now()}-${safeName}`;
    let storagePath=null;
    const {error:upError}=await client.storage.from('crm-imports').upload(path,preview.file,{upsert:false});
    if(!upError){
      storagePath=path;
    }else{
      console.warn('Arquivo original não foi armazenado; a importação continuará.',upError);
      setMessage('import-status','O arquivo original não pôde ser armazenado, mas os dados serão confirmados normalmente...');
    }
    const {data,error}=await client.rpc('finalize_import_v3',{
      p_filename:preview.file.name,p_sha256:preview.sha256,p_file_size:preview.file.size,p_storage_path:storagePath,
      p_competence:`${competence}-01`,p_indicator_date:date,p_team_name:'Equipe Monstros',
      p_summary:preview.summary,p_rows:preview.rows
    });
    if(error) throw error;
    const missionResponse=await client.rpc('get_today_mission');
    if(missionResponse.error) console.warn('Missão não carregada:',missionResponse.error);
    setMessage(
      'import-status',
      `Importação confirmada. ${data.rows_saved||preview.rows.length} vendedores gravados. Protocolo: ${data.protocol}. Missões: ${data.mission_items||0}.`,
      'success'
    );
    preview=null; $('preview-panel').classList.add('hidden');
    await Promise.all([loadDashboard(),loadImportHistory()]); openView('dashboard');
  }catch(e){
    console.error('Falha na confirmação da importação:',e);
    const details=e?.details||e?.hint||e?.message||String(e);
    setMessage('import-status','Erro ao confirmar: '+details,'error');
  }
  finally{$('confirm-button').disabled=false;}
};

async function loadImportHistory(){
  if(!client || !profile) return;
  const {data,error}=await client.rpc('list_recent_imports',{p_limit:10});
  if(error){$('import-history').innerHTML=`<p class="error-text">${error.message}</p>`;return;}
  const items=data||[];
  $('import-history').innerHTML=items.length?items.map(i=>`<div class="history-item"><div><strong>${i.protocol}</strong><small>${i.filename}</small></div><div><span class="status ${i.status}">${i.status}</span><small>${dateBR(i.confirmed_at||i.created_at)}</small></div></div>`).join(''):'<p class="muted">Nenhuma importação registrada.</p>';
}
$('refresh-history').onclick=loadImportHistory;


function buildExecutiveSummary(data){
  if(!data?.date) return 'Importe os dados para receber um diagnóstico.';
  const s=data.summary||{}, ranking=data.ranking||[], mission=data.mission||[];
  const top=ranking[0];
  const risks=ranking.filter(r=>sellerDiagnosis(r,ranking)[1]==='risk');
  if(s.target>0){
    const state=Number(s.projection)>=Number(s.target)?'A projeção cobre a meta':'A projeção ainda está abaixo da meta';
    return `${state}. ${top?`${top.seller_name} lidera o ranking.`:''} ${risks.length?`${risks.length} vendedor(es) exigem ação prioritária.`:'A equipe não possui riscos críticos pelos critérios atuais.'}`;
  }
  return `A equipe faturou ${money(s.revenue)} com ${s.orders||0} pedidos. ${top?`${top.seller_name} lidera o ranking.`:''} Cadastre a meta mensal para ativar o diagnóstico completo.`;
}

function addChatMessage(text,type){
  const div=document.createElement('div');
  div.className=`chat-message ${type}`;
  div.textContent=text;
  $('chat-box').appendChild(div);
  $('chat-box').scrollTop=$('chat-box').scrollHeight;
}
function answerMonstrao(question){
  const data=dashboardPayload;
  if(!data?.date) return 'Ainda não existem dados confirmados. Faça a primeira importação.';
  const q=normalize(question), rows=data.ranking||[], s=data.summary||{}, mission=data.mission||[];
  const top=rows[0], bottom=[...rows].sort((a,b)=>Number(a.revenue||0)-Number(b.revenue||0))[0];
  const highCancel=[...rows].sort((a,b)=>Number(b.cancellation_rate||0)-Number(a.cancellation_rate||0))[0];
  const risks=rows.filter(r=>sellerDiagnosis(r,rows)[1]==='risk');
  if(q.includes('COBRAR')||q.includes('ATENCAO')||q.includes('PRIORIDADE')){
    if(mission.length) return `Prioridades de hoje:\n${mission.slice(0,5).map(m=>`${m.sequence}. ${m.title}: ${m.action_text}`).join('\n')}`;
    return risks.length?`Comece por ${risks.slice(0,3).map(r=>r.seller_name).join(', ')}. Eles apresentam maior desvio nos critérios atuais.`:'Não há vendedor em situação crítica pelos critérios atuais.';
  }
  if(q.includes('RECONHEC')){
    return top?`${top.seller_name} merece reconhecimento. Lidera o ranking com ${money(top.revenue)} e Score ${Number(top.score||0).toFixed(0)}.`:'Não encontrei um destaque.';
  }
  if(q.includes('RISCO')){
    const parts=[];
    if(s.target>0 && Number(s.projection)<Number(s.target)) parts.push(`projeção ${money(s.projection)} abaixo da meta ${money(s.target)}`);
    if(highCancel && Number(highCancel.cancellation_rate||0)>Number(s.cancellation_limit||0.08)) parts.push(`${highCancel.seller_name} com cancelamento de ${pct(highCancel.cancellation_rate)}`);
    return parts.length?`Maior risco: ${parts.join('; ')}.`:'Os principais indicadores estão dentro dos limites configurados.';
  }
  if(q.includes('REUNIAO')||q.includes('PAUTA')){
    return `Pauta sugerida:\n1. Resultado: ${money(s.revenue)} e ${s.orders||0} pedidos.\n2. Projeção: ${money(s.projection)}${s.target>0?` para meta de ${money(s.target)}`:''}.\n3. Reconhecimento: ${top?.seller_name||'definir'}.\n4. Atenção: ${risks.slice(0,3).map(r=>r.seller_name).join(', ')||'nenhum caso crítico'}.\n5. Ações: revisar cancelamentos, ticket e prioridades da Missão do Dia.`;
  }
  if(q.includes('EQUIPE')||q.includes('COMO ESTA')){
    return `O que aconteceu: faturamento de ${money(s.revenue)}, ${s.orders||0} pedidos e ticket de ${money(s.average_ticket)}.\nPor que importa: ${s.target>0?`${(Number(s.attainment||0)*100).toFixed(1)}% da meta e projeção de ${(Number(s.projected_attainment||0)*100).toFixed(1)}%.`:'a meta ainda não foi cadastrada.'}\nO que fazer agora: ${mission[0]?.action_text||'acompanhar os vendedores com maior desvio.'}`;
  }
  if(q.includes('FEEDBACK')){
    const target=risks[0]||bottom;
    return target?`Feedback sugerido para ${target.seller_name}: "Percebi um desvio no seu resultado atual. Vamos revisar os dados, identificar o principal gargalo e combinar uma ação objetiva para as próximas vendas. Acompanharemos o resultado após a aplicação."`:'Não encontrei vendedor para priorizar.';
  }
  return buildExecutiveSummary(data)+' Pergunte sobre prioridades, riscos, reconhecimento, feedback ou reunião.';
}
function sendChat(){
  const text=$('chat-input').value.trim();
  if(!text)return;
  addChatMessage(text,'user'); $('chat-input').value='';
  setTimeout(()=>addChatMessage(answerMonstrao(text),'bot'),150);
}
$('chat-send').onclick=sendChat;
$('chat-input').addEventListener('keydown',e=>{if(e.key==='Enter')sendChat();});
document.querySelectorAll('.quick-question').forEach(b=>b.onclick=()=>{ $('chat-input').value=b.textContent; sendChat(); });


['target-revenue','target-ticket'].forEach(id=>{
  $(id).addEventListener('blur',()=>{$(id).value=formatBRLInput($(id).value);});
  $(id).addEventListener('focus',()=>{$(id).select();});
});

$('save-target-button').onclick=async()=>{
  const competence=$('target-competence').value;
  const revenue=parseBRLInput($('target-revenue').value);
  const ticket=parseBRLInput($('target-ticket').value);
  const cancel=Number($('target-cancellation').value||8)/100;
  if(!competence) return setMessage('target-message','Informe a competência.','error');
  const {error}=await client.rpc('set_team_targets',{
    p_competence:`${competence}-01`,p_revenue_target:revenue,
    p_ticket_target:ticket,p_cancellation_limit:cancel
  });
  setMessage('target-message',error?error.message:`Metas salvas: ${money(revenue)} por mês e ticket de ${money(ticket)}.`,error?'error':'success');
  if(!error){
    $('target-revenue').value=formatBRLInput(revenue);
    $('target-ticket').value=formatBRLInput(ticket);
    await loadDashboard();
  }
};


$('save-calendar-button').onclick=async()=>{
  const competence=$('target-competence').value;
  const total=Number($('business-total').value||0);
  const elapsed=Number($('business-elapsed').value||0);
  if(!competence) return setMessage('target-message','Informe a competência.','error');
  const {data,error}=await client.rpc('set_business_calendar',{
    p_competence:`${competence}-01`,
    p_total_business_days:total,
    p_elapsed_business_days:elapsed
  });
  setMessage('target-message',error?error.message:`Dias úteis salvos: ${elapsed} trabalhados de ${total}.`,error?'error':'success');
  if(!error) await loadDashboard();
};

window.openSeller360=async(id)=>{
  openView('profile360');
  const dna=window.MonsterEngine?.dnaForSeller(id);
  const {data,error}=await client.rpc('get_seller_360',{p_seller_id:id});
  if(error){console.error(error);return;}
  const latest=data?.latest||{};
  $('profile360-name').textContent=data?.seller?.name||'Vendedor';
  $('profile360-score').textContent=Number(latest.score||0).toFixed(0);
  $('profile360-dna').innerHTML=[
    ...(dna?.strengths||[]).filter(Boolean).slice(0,4).map(x=>`<span class="dna-strength">${x}</span>`),
    ...(dna?.attention||[]).filter(Boolean).slice(0,2).map(x=>`<span class="dna-attention">${x}</span>`)
  ].join('');
  $('profile360-kpis').innerHTML=`
    <div><small>Faturamento</small><strong>${money(latest.revenue)}</strong></div>
    <div><small>Pedidos</small><strong>${latest.orders||0}</strong></div>
    <div><small>Ticket</small><strong>${money(latest.ticket)}</strong></div>
    <div><small>Ativo</small><strong>${money(latest.active)}</strong></div>
    <div><small>Cancelamento</small><strong>${pct(latest.cancellation)}</strong></div>
    <div><small>Participação</small><strong>${pct(dna?.participation)}</strong></div>`;
  const mission = Number(latest.cancellation||0)>0.15
    ? 'Auditar três vendas e aplicar feedback de confirmação.'
    : Number(latest.revenue||0)<((dashboardPayload?.summary?.revenue||0)/(dashboardPayload?.summary?.seller_count||1))*0.65
      ? 'Revisar carteira e acompanhar o próximo bloco de vendas.'
      : 'Reconhecer o desempenho e registrar a melhor prática.';
  $('profile360-mission').innerHTML=`<strong>${mission}</strong><p>O Monstrão usa os dados atuais para orientar a próxima ação.</p>`;
  const history=data?.history||[];
  $('profile360-history').innerHTML=history.length
    ? `<table><thead><tr><th>Data</th><th>Faturamento</th><th>Ticket</th><th>Cancelamento</th><th>Índice</th></tr></thead><tbody>${history.map(h=>`<tr><td>${new Date(h.date+'T12:00:00').toLocaleDateString('pt-BR')}</td><td>${money(h.revenue)}</td><td>${money(h.ticket)}</td><td>${pct(h.cancellation)}</td><td>${Number(h.score||0).toFixed(0)}</td></tr>`).join('')}</tbody></table>`
    : '<p>O histórico crescerá a cada nova importação.</p>';
};

const today=new Date().toISOString().slice(0,10); $('indicator-date').value=today; $('competence').value=today.slice(0,7); $('target-competence').value=today.slice(0,7);
boot();
