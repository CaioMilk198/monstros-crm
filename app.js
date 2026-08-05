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
  const titles={dashboard:['Centro de Comando','O que precisa da sua atenção agora.'],import:['Central de Importação','Valide antes de confirmar.'],ranking:['Ranking','Visão atual dos vendedores.'],settings:['Configurações','Ambiente piloto e permissões.']};
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
  $('kpi-revenue').textContent=money(s.revenue); $('kpi-orders').textContent=s.orders||0;
  $('kpi-ticket').textContent=money(s.average_ticket); $('kpi-conversion').textContent=pct(s.conversion_rate);
  $('kpi-cancellation').textContent=pct(s.cancellation_rate); $('kpi-projection').textContent=money(s.projection);
  renderRanking(data.ranking||[]);
  $('top-list').innerHTML=(data.ranking||[]).slice(0,5).map((r,i)=>`<div class="seller-row"><span>${i+1}. ${r.seller_name}</span><strong>${money(r.revenue)}</strong></div>`).join('');
  $('mission-list').innerHTML=(data.mission||[]).length?(data.mission||[]).map(m=>`<div class="mission ${m.priority}"><strong>${m.sequence}. ${m.title}</strong><small>${m.reason}</small><div>${m.action_text}</div><button onclick="completeMission('${m.id}')">Concluir</button></div>`).join(''):'<p>Nenhuma prioridade gerada para hoje.</p>';
}
function renderRanking(rows){
  $('ranking-body').innerHTML=rows.map((r,i)=>`<tr><td>${i+1}</td><td>${r.seller_name}</td><td>${money(r.revenue)}</td><td>${r.orders||0}</td><td>${money(r.average_ticket)}</td><td>${pct(r.conversion_rate)}</td><td>${pct(r.cancellation_rate)}</td></tr>`).join('');
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
    const duplicateCheck=await client.rpc('check_import_duplicate',{p_sha256:preview.sha256});
    if(!duplicateCheck.error && duplicateCheck.data?.duplicate) throw new Error(`Importação duplicada. Protocolo já existente: ${duplicateCheck.data.protocol}.`);
    const companyId=profile.company_id;
    const safeName=preview.file.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]/g,'_');
    const path=`${companyId}/${competence}/${Date.now()}-${safeName}`;
    const {error:upError}=await client.storage.from('crm-imports').upload(path,preview.file,{upsert:false});
    if(upError) throw upError;
    const {data,error}=await client.rpc('confirm_dashboard_import',{
      p_filename:preview.file.name,p_sha256:preview.sha256,p_file_size:preview.file.size,p_storage_path:path,
      p_competence:`${competence}-01`,p_indicator_date:date,p_team_name:'Equipe Monstros',
      p_summary:preview.summary,p_rows:preview.rows
    });
    if(error) throw error;
    if(data.duplicate) throw new Error(data.message);
    setMessage('import-status',`Importação confirmada. Protocolo: ${data.protocol}`,'success');
    preview=null; $('preview-panel').classList.add('hidden');
    await Promise.all([loadDashboard(),loadImportHistory()]); openView('dashboard');
  }catch(e){setMessage('import-status','Erro ao confirmar: '+e.message,'error');}
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

const today=new Date().toISOString().slice(0,10); $('indicator-date').value=today; $('competence').value=today.slice(0,7);
boot();
