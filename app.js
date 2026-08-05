
let client = null;
let profile = null;
let preview = null;
let dashboardPayload = null;

const $ = (id) => document.getElementById(id);
const money = (v) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
const pct = (v) => v == null ? '—' : `${(Number(v)*100).toFixed(1)}%`;
const normalize = (v) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toUpperCase();
const num = (v) => {
  if(typeof v==='number') return Number.isFinite(v)?v:0;
  const s=String(v??'').replace(/\./g,'').replace(',','.').replace(/[^\d.-]/g,'');
  const n=Number(s); return Number.isFinite(n)?n:0;
};

function initClient(){
  const url=localStorage.getItem('monstros_supabase_url');
  const key=localStorage.getItem('monstros_supabase_key');
  if(!url||!key) return false;
  client=supabase.createClient(url,key);
  return true;
}
function show(id){ document.querySelectorAll('.screen').forEach(x=>x.classList.add('hidden')); $(id).classList.remove('hidden'); }
function showApp(){ document.querySelectorAll('.screen').forEach(x=>x.classList.add('hidden')); $('app').classList.remove('hidden'); }

async function boot(){
  if(!initClient()){ show('config-screen'); return; }
  const {data:{session}}=await client.auth.getSession();
  if(!session){ show('auth-screen'); return; }
  await loadProfile();
  showApp();
  await loadDashboard();
}
async function loadProfile(){
  const {data:{user}}=await client.auth.getUser();
  const {data,error}=await client.from('profiles').select('*').eq('id',user.id).single();
  if(error){ profile=null; $('user-name').textContent=user.email; $('user-role').textContent='Perfil pendente'; return; }
  profile=data; $('user-name').textContent=data.full_name; $('user-role').textContent=data.role;
}

$('save-config').onclick=()=>{
  const url=$('cfg-url').value.trim(), key=$('cfg-key').value.trim();
  if(!url||!key) return alert('Preencha a URL e a chave publicável.');
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
  $('auth-message').textContent='Entrando...';
  const {error}=await client.auth.signInWithPassword({email:$('login-email').value,password:$('login-password').value});
  if(error){$('auth-message').textContent=error.message;return;} location.reload();
};
$('signup-button').onclick=async()=>{
  $('auth-message').textContent='Criando conta...';
  const {error}=await client.auth.signUp({
    email:$('signup-email').value,
    password:$('signup-password').value,
    options:{data:{full_name:$('signup-name').value}}
  });
  $('auth-message').textContent=error?error.message:'Conta criada. Confira o e-mail se a confirmação estiver ativada.';
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
}
$('refresh-button').onclick=loadDashboard;

async function loadDashboard(){
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
  $('settings-message').textContent='Ativando...';
  const {data,error}=await client.rpc('claim_pilot_admin');
  $('settings-message').textContent=error?error.message:'Administrador ativado com sucesso.';
  if(!error){await loadProfile();}
};
$('reset-config-button').onclick=()=>{localStorage.removeItem('monstros_supabase_url');localStorage.removeItem('monstros_supabase_key');location.reload();};

function findSheet(wb,name){
  const target=normalize(name);
  const found=wb.SheetNames.find(n=>normalize(n)===target);
  return found?wb.Sheets[found]:null;
}
function rows(sheet){return sheet?XLSX.utils.sheet_to_json(sheet,{header:1,defval:null,raw:true}):[];}
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
  const map=new Map(); data.slice(1).forEach(r=>{const name=normalize(r[2]);if(!name||name==='TOTAL')return;const calls=num(r[3]),orders=num(r[4]);map.set(name,{extension:r[0]?String(r[0]):'',conversion_rate:calls>0?orders/calls:null});});return map;
}
async function hashFile(file){
  const buf=await file.arrayBuffer(); const hash=await crypto.subtle.digest('SHA-256',buf);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
$('analyze-button').onclick=async()=>{
  const file=$('workbook-file').files[0];
  if(!file) return $('import-status').textContent='Selecione uma planilha.';
  $('import-status').textContent='Lendo e validando...';
  try{
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});
    const geral=movementMap(rows(findSheet(wb,'GERAL')),'GERAL');
    const cartao=movementMap(rows(findSheet(wb,'CARTAO')),'CARTAO');
    const deposito=movementMap(rows(findSheet(wb,'DEPOSITO')),'DEPOSITO');
    const ativo=movementMap(rows(findSheet(wb,'ATIVO')),'ATIVO');
    const misto=simpleMap(rows(findSheet(wb,'MISTO')));
    const conv=conversionMap(rows(findSheet(wb,'CONVERSAO')));
    if(!geral.size) throw new Error('Não encontrei vendedores válidos na aba GERAL.');
    const list=[...geral.entries()].map(([key,g])=>{
      const c=cartao.get(key),d=deposito.get(key),a=ativo.get(key),cv=conv.get(key);
      const canc=g.gross_value>0?g.cancelled_value/g.gross_value:null;
      return {seller_name:g.seller_name,extension:cv?.extension||'',revenue:g.revenue,orders:g.orders,average_ticket:g.average_ticket|| (g.orders?g.revenue/g.orders:0),card_revenue:c?.revenue||0,deposit_revenue:d?.revenue||0,mixed_revenue:misto.get(key)||0,active_revenue:a?.revenue||0,conversion_rate:cv?.conversion_rate??'',cancellation_rate:canc??'',projection:g.revenue,data_confidence:conv.has(key)?0.95:0.80};
    });
    preview={file,sha256:await hashFile(file),rows:list,summary:{sellers:list.length,revenue:list.reduce((s,x)=>s+x.revenue,0),orders:list.reduce((s,x)=>s+x.orders,0)}};
    $('preview-summary').innerHTML=`<div class="panel kpi"><small>Vendedores</small><strong>${list.length}</strong></div><div class="panel kpi"><small>Faturamento</small><strong>${money(preview.summary.revenue)}</strong></div><div class="panel kpi"><small>Pedidos</small><strong>${preview.summary.orders}</strong></div><div class="panel kpi"><small>SHA-256</small><strong style="font-size:11px">${preview.sha256.slice(0,16)}...</strong></div>`;
    $('preview-body').innerHTML=list.map(x=>`<tr><td>${x.seller_name}</td><td>${money(x.revenue)}</td><td>${x.orders}</td><td>${money(x.average_ticket)}</td><td>${pct(x.conversion_rate===''?null:x.conversion_rate)}</td><td>${pct(x.cancellation_rate===''?null:x.cancellation_rate)}</td></tr>`).join('');
    $('preview-panel').classList.remove('hidden'); $('import-status').textContent='Planilha analisada. Confira a prévia.';
  }catch(e){$('import-status').textContent='Erro: '+e.message;}
};
$('confirm-button').onclick=async()=>{
  if(!preview) return;
  const competence=$('competence').value, date=$('indicator-date').value;
  if(!competence||!date) return alert('Preencha competência e data do indicador.');
  $('import-status').textContent='Enviando arquivo e confirmando importação...';
  try{
    const companyId=profile.company_id;
    const path=`${companyId}/${competence}/${Date.now()}-${preview.file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    const {error:upError}=await client.storage.from('crm-imports').upload(path,preview.file,{upsert:false});
    if(upError) throw upError;
    const {data,error}=await client.rpc('confirm_dashboard_import',{
      p_filename:preview.file.name,p_sha256:preview.sha256,p_file_size:preview.file.size,p_storage_path:path,
      p_competence:`${competence}-01`,p_indicator_date:date,p_team_name:'Equipe Monstros',
      p_summary:preview.summary,p_rows:preview.rows
    });
    if(error) throw error;
    if(data.duplicate){$('import-status').textContent=data.message;return;}
    $('import-status').textContent=`Importação confirmada. Protocolo: ${data.protocol}`;
    await loadDashboard(); openView('dashboard');
  }catch(e){$('import-status').textContent='Erro ao confirmar: '+e.message;}
};

const today=new Date().toISOString().slice(0,10); $('indicator-date').value=today; $('competence').value=today.slice(0,7);
boot();
