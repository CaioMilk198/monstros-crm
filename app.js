console.info('MONSTEROS v1.0 - Intelligence Pilot');
window.MONSTROS_CRM_VERSION='2.1.0-piloto';
let client = null;
let profile = null;
let preview = null;
let dashboardPayload = null;
let rankingMode = localStorage.getItem('monsteros_ranking_mode') || 'commercial';

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
  const targetView=$(`view-${name}`);
  if(!targetView){console.warn('View não encontrada:',name);return;}
  targetView.classList.remove('hidden');
  const titles={dashboard:['Centro de Comando','O que precisa da sua atenção agora.'],import:['Central de Importação','Valide antes de confirmar.'],ranking:['Ranking','Índice Monstro e DNA Comercial.'],intelligence:['Inteligência Gerencial','Onde estamos, para onde vamos e onde está o dinheiro.'],profile360:['Perfil 360','Dossiê individual do vendedor.'],director:['Monster Director','Decisões priorizadas pelo impacto financeiro.'],analytics:['Monster Analytics','Histórico e evolução da operação.'],monstrao:['Monstrão','Copiloto gerencial baseado nos dados atuais.'],settings:['Configurações','Metas, dias úteis e permissões.']};
  const title=titles[name]||[name,''];
  $('view-title').textContent=title[0]; $('view-subtitle').textContent=title[1];
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
  const revenueRanking=[...(data.ranking||[])].sort((a,b)=>Number(b.revenue||0)-Number(a.revenue||0));
  renderRanking(revenueRanking);
  $('top-list').innerHTML=revenueRanking.slice(0,5).map((r,i)=>`<div class="seller-row"><span><b>${i+1}. ${r.seller_name}</b><small>Score ${Number(r.score||0).toFixed(0)}</small></span><strong>${money(r.revenue)}</strong></div>`).join('');
  $('mission-list').innerHTML=(data.mission||[]).length?(data.mission||[]).map(m=>`<div class="mission ${m.priority}"><strong>${m.sequence}. ${m.title}</strong><small>${m.reason}</small><div>${m.action_text}</div><button onclick="completeMission('${m.id}')">Concluir</button></div>`).join(''):'<p>Nenhuma prioridade gerada para hoje.</p>';
  $('insight-grid').innerHTML=(data.insights||[]).map(x=>`<div class="insight-card"><strong>${x.title}</strong><p>${x.text}</p></div>`).join('');
  $('monstrao-summary').textContent=buildExecutiveSummary(data);
  await loadManualMissions();
  await loadDirectorPilot();
  await loadAnalyticsPilot();
  renderWarRoom();
  if($('monstrao-summary') && dashboardPayload?.date){
    const opportunity=dashboardPayload?.engine?.money?.total_opportunity||0;
    const risk=rankingRows().filter(r=>sellerAttention(r).some(x=>/baixo|cancelamento|risco/i.test(x))).sort((a,b)=>coachMetrics(b).total-coachMetrics(a).total)[0];
    $('monstrao-summary').innerHTML=`<b>Bom dia, Caio.</b><br>Hoje existem ${money(opportunity)} em potencial de recuperação.${risk?` Minha primeira prioridade seria ${risk.seller_name}.`:''}`;
  }
  renderSmartTimeline();
  renderAcademy();
  populateCoachSellerSelect();
  if(window.MonsterEngine){
    const engineData=await window.MonsterEngine.load(client);
    window.MonsterEngine.renderDashboard();
    window.MonsterEngine.renderIntelligence();
    if(engineData?.projection){
      const ep=engineData.projection;
      $('kpi-projection').textContent=money(ep.projected_revenue);
      $('kpi-projected-attainment').textContent=`${pct(ep.projected_attainment)} projetado por dias úteis`;
      const projectionCard=$('kpi-projection')?.closest('.kpi');
      if(projectionCard) projectionCard.title=
        `Média diária: ${money(ep.daily_rate)} | Ritmo necessário: ${money(ep.required_daily_rate)}`;

      const projectionAbove=Number(ep.projected_revenue||0)>=Number(ep.target||0);
      const health=engineData.health||{};
      const moneyData=engineData.money||{};
      $('insight-grid').innerHTML=`
        <div class="insight-card">
          <strong>${projectionAbove?'Projeção acima da meta':'Projeção abaixo da meta'}</strong>
          <p>${projectionAbove
            ? `O ritmo atual projeta ${money(ep.projected_revenue)}, acima da meta.`
            : `Faltam aproximadamente ${money(Number(ep.target||0)-Number(ep.projected_revenue||0))} na projeção. O ritmo necessário é ${money(ep.required_daily_rate)}/dia.`}</p>
        </div>
        <div class="insight-card">
          <strong>Saúde da operação: ${health.status||'—'}</strong>
          <p>${health.low_volume_count||0} vendedor(es) com baixo volume e ${health.cancellation_risk_count||0} com risco de cancelamento.</p>
        </div>
        <div class="insight-card">
          <strong>Potencial financeiro</strong>
          <p>${money(moneyData.total_opportunity)} em cenários de ticket, cancelamento e recuperação de baixo volume.</p>
        </div>`;
    }
    if(engineData?.seller_dna?.length){
      const rankMap=new Map(engineData.seller_dna.map(s=>[s.seller_id,s]));
      const updated=(dashboardPayload?.ranking||[]).map(r=>({
        ...r,
        score:rankMap.get(r.seller_id)?.score ?? r.score
      }));
      renderRanking(updated.sort((a,b)=>Number(b.revenue||0)-Number(a.revenue||0)));
    }
  }
}
function sellerDiagnosis(r,team){
  const avgRevenue=(team||[]).reduce((s,x)=>s+Number(x.revenue||0),0)/Math.max(1,(team||[]).length);
  if(Number(r.cancellation_rate||0)>0.08) return ['Cancelamento alto','risk'];
  if(Number(r.revenue||0)<avgRevenue*0.65) return ['Abaixo do ritmo','risk'];
  if(Number(r.score||0)>=85) return ['Destaque','good'];
  if(Number(r.average_ticket||0)<((team||[]).reduce((s,x)=>s+Number(x.average_ticket||0),0)/Math.max(1,(team||[]).length))*0.85) return ['Ticket em atenção','warn'];
  return ['Consistente','good'];
}
function renderRanking(rows){
  const ordered=[...(rows||[])].sort((a,b)=>rankingMode==='monster'
?Number(b.score||0)-Number(a.score||0):Number(b.revenue||0)-Number(a.revenue||0));
  $('ranking-body').innerHTML=ordered.map((r,i)=>{
    const dna=window.MonsterEngine?.dnaForSeller(r.seller_id);
    const fallback=sellerDiagnosis(r,ordered);
    const tags=[
      ...(dna?.strengths||[]).filter(Boolean).slice(0,2).map(x=>[x,'good']),
      ...(dna?.attention||[]).filter(Boolean).slice(0,2).map(x=>[x,'risk'])
    ];
    if(!tags.length) tags.push(fallback);
    const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`;
    return `<tr>
      <td>${medal}</td>
      <td><button class="seller-link" onclick="openSeller360('${r.seller_id}')">${r.seller_name}</button></td>
      <td><span class="score-badge">${Number(r.score||0).toFixed(0)}</span></td>
      <td>${money(r.revenue)}</td>
      <td>${r.orders||0}</td>
      <td>${money(r.average_ticket)}</td>
      <td>${money(r.active_revenue)}</td>
      <td>${pct(r.cancellation_rate)}</td>
      <td><div class="diagnosis-tags">${tags.map(t=>`<span class="diagnosis ${t[1]}">${t[0]}</span>`).join('')}</div></td>
    </tr>`;
  }).join('');
}
window.completeMission=async(id)=>{
  const {error}=await client.rpc('complete_mission_item',{p_item_id:id});
  if(error) alert(error.message); else loadDashboard();
};


async function populateMissionSellers(){
  const select=$('mission-seller');
  if(!select) return;
  const rows=[...(dashboardPayload?.ranking||[])].sort((a,b)=>Number(b.revenue||0)-Number(a.revenue||0));
  select.innerHTML='<option value="">Equipe / sem vendedor</option>'+
    rows.map(r=>`<option value="${r.seller_id}">${r.seller_name}</option>`).join('');
}

async function loadManualMissions(){
  if(!client || !profile || !$('manual-missions-list')) return;
  const {data,error}=await client.rpc('list_management_missions',{
    p_status:null,
    p_limit:10
  });
  if(error){
    console.warn('Missões manuais:',error);
    $('manual-missions-list').innerHTML='';
    return;
  }
  const active=(data||[]).filter(m=>m.status!=='completed' && m.status!=='cancelled');
  $('manual-missions-list').innerHTML=active.length
    ? `<h4>Missões do gestor</h4>${active.map(m=>`
      <div class="manual-mission ${m.priority}">
        <div class="manual-mission-main">
          <strong>${m.title}</strong>
          <small>${m.seller_name||'Equipe'} • ${m.estimated_minutes} min • impacto ${money(m.estimated_impact)}</small>
          ${m.reason?`<p>${m.reason}</p>`:''}
          ${m.action_text?`<p><b>Ação:</b> ${m.action_text}</p>`:''}
        </div>
        <div class="mission-status-actions">
          ${m.status==='pending'
            ? `<button class="secondary compact-button" onclick="changeManualMissionStatus('${m.id}','in_progress')">Iniciar</button>`
            : '<span class="status in_progress">Em andamento</span>'}
          <button class="compact-button" onclick="changeManualMissionStatus('${m.id}','completed')">Concluir</button>
        </div>
      </div>`).join('')}`
    : '';
}

window.changeManualMissionStatus=async(id,status)=>{
  const note=status==='completed'
    ? (prompt('Resultado ou observação da conclusão (opcional):')||null)
    : null;
  const {error}=await client.rpc('update_management_mission_status',{
    p_mission_id:id,
    p_status:status,
    p_completion_note:note
  });
  if(error) alert(error.message);
  else {
    await loadManualMissions();
  await loadDirectorPilot();
  await loadAnalyticsPilot();
  renderWarRoom();
  if($('monstrao-summary') && dashboardPayload?.date){
    const opportunity=dashboardPayload?.engine?.money?.total_opportunity||0;
    const risk=rankingRows().filter(r=>sellerAttention(r).some(x=>/baixo|cancelamento|risco/i.test(x))).sort((a,b)=>coachMetrics(b).total-coachMetrics(a).total)[0];
    $('monstrao-summary').innerHTML=`<b>Bom dia, Caio.</b><br>Hoje existem ${money(opportunity)} em potencial de recuperação.${risk?` Minha primeira prioridade seria ${risk.seller_name}.`:''}`;
  }
  renderSmartTimeline();
  renderAcademy();
  populateCoachSellerSelect();
    await loadDashboard();
  }
};

$('new-mission-button').onclick=async()=>{
  await populateMissionSellers();
  $('mission-form').classList.remove('hidden');
  $('mission-title').focus();
};

$('cancel-mission-button').onclick=()=>{
  $('mission-form').classList.add('hidden');
  setMessage('mission-form-message','');
};

$('save-mission-button').onclick=async()=>{
  const title=$('mission-title').value.trim();
  if(!title) return setMessage('mission-form-message','Informe o título da missão.','error');

  setMessage('mission-form-message','Criando missão...');
  const {error}=await client.rpc('create_management_mission',{
    p_title:title,
    p_seller_id:$('mission-seller').value||null,
    p_reason:$('mission-reason').value.trim()||null,
    p_action_text:$('mission-action').value.trim()||null,
    p_priority:$('mission-priority').value,
    p_estimated_impact:Number($('mission-impact').value||0),
    p_estimated_minutes:Number($('mission-minutes').value||20),
    p_due_date:$('mission-due').value||null
  });

  if(error) return setMessage('mission-form-message',error.message,'error');

  setMessage('mission-form-message','Missão criada com sucesso.','success');
  ['mission-title','mission-reason','mission-action','mission-impact','mission-due'].forEach(id=>{
    if($(id)) $(id).value=id==='mission-impact'?'0':'';
  });
  $('mission-minutes').value='20';
  setTimeout(()=>$('mission-form').classList.add('hidden'),500);
  await loadManualMissions();
  await loadDirectorPilot();
  await loadAnalyticsPilot();
  renderWarRoom();
  if($('monstrao-summary') && dashboardPayload?.date){
    const opportunity=dashboardPayload?.engine?.money?.total_opportunity||0;
    const risk=rankingRows().filter(r=>sellerAttention(r).some(x=>/baixo|cancelamento|risco/i.test(x))).sort((a,b)=>coachMetrics(b).total-coachMetrics(a).total)[0];
    $('monstrao-summary').innerHTML=`<b>Bom dia, Caio.</b><br>Hoje existem ${money(opportunity)} em potencial de recuperação.${risk?` Minha primeira prioridade seria ${risk.seller_name}.`:''}`;
  }
  renderSmartTimeline();
  renderAcademy();
  populateCoachSellerSelect();
};


async function loadDirectorPilot(){
  if(!client||!profile)return;
  const date=dashboardPayload?.date||new Date().toISOString().slice(0,10);
  await client.rpc('capture_operation_snapshot',{p_date:date});
  const {data,error}=await client.rpc('get_director_payload',{p_date:date});
  if(error){console.warn('Director',error);return}
  directorPayload=data; renderDirectorPilot(data);
}
function renderDirectorPilot(d){
  if(!d?.date)return;
  const r=d.radar||{};
  const cards=[['🟢','Oportunidade',money(r.opportunity||0)],['🔴','Risco',r.risk],['🟡','Atenção',r.attention],['🔵','Destaque',r.highlight],['⚡','Missão',r.mission],['📈','Tendência',r.trend],['💰','Ganho rápido',r.quick_win]];
  if($('director-radar'))$('director-radar').innerHTML=cards.map(c=>`<div class="radar-card"><span>${c[0]}</span><small>${c[1]}</small><strong>${c[2]||'—'}</strong></div>`).join('');
  const list=a=>`<ul>${(a||[]).map(x=>`<li>${x}</li>`).join('')}</ul>`;
  if($('director-happened'))$('director-happened').innerHTML=list(d.what_happened);
  if($('director-why'))$('director-why').innerHTML=list(d.why_it_happened);
  const c=d.cost||{};
  const costs=[['Baixo volume',Number(c.active_opportunity||0)],['Ticket',Number(c.ticket_opportunity||0)],['Cancelamento',Number(c.cancellation_loss||0)]].sort((a,b)=>b[1]-a[1]);
  const total=Math.max(1,costs.reduce((s,x)=>s+x[1],0));
  if($('director-cost'))$('director-cost').innerHTML=`<div class="cost-total">${money(c.total_opportunity||0)}</div>`;
  if($('director-cost-bars'))$('director-cost-bars').innerHTML=costs.map(x=>`<div class="cost-bar-row"><div><span>${x[0]}</span><strong>${money(x[1])}</strong></div><div class="cost-bar-track"><div style="width:${Math.max(2,x[1]/total*100)}%"></div></div><small>${(x[1]/total*100).toFixed(0)}% do potencial</small></div>`).join('');

  const eng=d.engine||{}, proj=eng.projection||{}, health=eng.health||{};
  const recovery=Number(c.total_opportunity||0);
  const expectedRevenue=Number(proj.projected_revenue||0)+recovery;
  const expectedAttainment=Number(proj.target||0)>0?expectedRevenue/Number(proj.target):0;
  const expectedIndex=Math.min(100,Number(health.monster_index||0)+Math.min(18,recovery/Math.max(1,Number(proj.target||1))*100));
  if($('director-expected'))$('director-expected').innerHTML=`
    <div><small>Projeção com recuperação</small><strong>${money(expectedRevenue)}</strong></div>
    <div><small>Atingimento possível</small><strong>${pct(expectedAttainment)}</strong></div>
    <div><small>Índice estimado</small><strong>${Number(health.monster_index||0).toFixed(0)} → ${expectedIndex.toFixed(0)}</strong></div>
    <div><small>Ganho potencial</small><strong>${money(recovery)}</strong></div>`;

  if($('director-priorities'))$('director-priorities').innerHTML=(d.priorities||[]).map((p,i)=>{
    const urgency=i===0?['Faça hoje','today']:i===1?['Faça amanhã','tomorrow']:['Faça esta semana','week'];
    return `<div class="director-priority ${urgency[1]}"><div class="priority-number">${p.order}</div><div class="priority-content"><span class="urgency ${urgency[1]}">${urgency[0]}</span><h4>${p.title}</h4><p>${p.action}</p><b>Impacto ${money(p.impact||0)} • ${p.minutes} min</b><div><button onclick="this.nextElementSibling.classList.toggle('hidden')">Ver vendedores</button><div class="priority-sellers hidden">${(p.seller_names||[]).map((n,j)=>`<button class="seller-chip" onclick="openSeller360('${p.seller_ids[j]}')">${n}</button>`).join('')}</div></div></div></div>`;
  }).join('');
}
function renderLineChart(id,rows,key,formatter=(v)=>String(v),empty='Aguardando histórico'){
  const el=$(id); if(!el)return;
  const data=[...(rows||[])].reverse().filter(r=>r[key]!=null && Number.isFinite(Number(r[key])));
  if(data.length<2){el.innerHTML=`<div class="chart-empty">${empty}<small>O gráfico ganhará evolução após novas importações.</small></div>`;return;}
  const vals=data.map(r=>Number(r[key])); const min=Math.min(...vals),max=Math.max(...vals); const span=Math.max(1,max-min);
  const pts=vals.map((v,i)=>`${10+i*(280/Math.max(1,vals.length-1))},${105-((v-min)/span)*80}`).join(' ');
  const last=vals[vals.length-1];
  el.innerHTML=`<svg viewBox="0 0 300 120" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="3"/><line x1="10" y1="108" x2="290" y2="108" stroke="currentColor" opacity=".2"/></svg><strong>${formatter(last)}</strong><small>${data.length} registros</small>`;
}
function renderTargetChart(rows){
  const el=$('chart-target');if(!el)return;const x=(rows||[])[0];if(!x){el.innerHTML='<div class="chart-empty">Aguardando dados</div>';return;}
  const target=Number(x.target||0),projection=Number(x.projection||0),max=Math.max(1,target,projection);
  el.innerHTML=`<div class="compare-bar"><span>Meta ${money(target)}</span><div><i style="width:${target/max*100}%"></i></div></div><div class="compare-bar projection"><span>Projeção ${money(projection)}</span><div><i style="width:${projection/max*100}%"></i></div></div>`;
}
async function loadAnalyticsPilot(){
  if(!client||!profile)return;
  const {data,error}=await client.rpc('get_operation_timeline',{p_limit:30});
  if(error||!$('analytics-timeline'))return;
  const rows=data||[];
  if(!rows.length){$('analytics-timeline').innerHTML='<p>O histórico aparecerá nas próximas importações.</p>';return}
  const x=rows[0];
  $('analytics-summary').innerHTML=`<div class="analytics-card"><small>Índice</small><strong>${Number(x.monster_index||0).toFixed(0)}</strong></div><div class="analytics-card"><small>Receita</small><strong>${money(x.revenue)}</strong></div><div class="analytics-card"><small>Projeção</small><strong>${money(x.projection)}</strong></div><div class="analytics-card"><small>Oportunidade</small><strong>${money(x.opportunity_total)}</strong></div>`;
  renderLineChart('chart-revenue',rows,'revenue',money);
  renderLineChart('chart-index',rows,'monster_index',v=>Number(v).toFixed(0));
  renderLineChart('chart-ticket',rows,'average_ticket',money);
  renderLineChart('chart-cancel',rows,'cancellation_rate',pct);
  renderLineChart('chart-conversion',rows,'conversion_rate',pct,'Conversão ainda não importada');
  renderTargetChart(rows);
  const ranking=[...(dashboardPayload?.ranking||[])].sort((a,b)=>Number(b.revenue||0)-Number(a.revenue||0));
  if($('analytics-top'))$('analytics-top').innerHTML=ranking.slice(0,5).map((r,i)=>`<button class="analytics-seller" onclick="openSeller360('${r.seller_id}')"><span>${i+1}. ${r.seller_name}</span><strong>${money(r.revenue)}</strong></button>`).join('');
  if($('analytics-bottom'))$('analytics-bottom').innerHTML=ranking.slice(-5).reverse().map(r=>`<button class="analytics-seller risk" onclick="openSeller360('${r.seller_id}')"><span>${r.seller_name}</span><strong>${money(r.revenue)}</strong></button>`).join('');
  $('analytics-timeline').innerHTML=rows.map(r=>`<div class="timeline-item"><b>${new Date(r.indicator_date+'T12:00').toLocaleDateString('pt-BR')}</b><span>Índice ${Number(r.monster_index||0).toFixed(0)}</span><span>${money(r.revenue)}</span><small>${r.revenue_change==null?'Primeiro registro':`${Number(r.revenue_change)>=0?'Subiu':'Caiu'} ${pct(Math.abs(Number(r.revenue_change)))}`}</small></div>`).join('');
}
const rankingCommercialTab=$('ranking-commercial-tab');
const rankingMonsterTab=$('ranking-monster-tab');
if(rankingCommercialTab) rankingCommercialTab.onclick=()=>{rankingMode='commercial';localStorage.setItem('monsteros_ranking_mode',rankingMode);rankingCommercialTab.classList.add('active');rankingMonsterTab?.classList.remove('active');renderRanking(dashboardPayload?.ranking||[])};
if(rankingMonsterTab) rankingMonsterTab.onclick=()=>{rankingMode='monster';localStorage.setItem('monsteros_ranking_mode',rankingMode);rankingMonsterTab.classList.add('active');rankingCommercialTab?.classList.remove('active');renderRanking(dashboardPayload?.ranking||[])};
if(rankingMode==='monster'){ rankingMonsterTab?.classList.add('active'); rankingCommercialTab?.classList.remove('active'); } else { rankingCommercialTab?.classList.add('active'); rankingMonsterTab?.classList.remove('active'); }


function sellerDNA(){
  return dashboardPayload?.seller_dna || dashboardPayload?.engine?.seller_dna || [];
}
function rankingRows(){
  return dashboardPayload?.ranking || [];
}
function sellerAttention(row){
  const dna=sellerDNA().find(x=>x.seller_id===row.seller_id)||{};
  return [...(dna.attention||[]),...(dna.strengths||[])];
}
function initials(name=''){
  return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
}
function renderWarRoom(){
  if(!$('warroom-kpis')) return;
  const p=dashboardPayload;
  if(!p?.date){$('warroom-kpis').innerHTML='<div class="panel">Importe dados para ativar a Sala de Guerra.</div>';return;}
  const eng=p.engine||{}, h=eng.health||{}, m=eng.money||{}, proj=eng.projection||{};
  const missions=[...(p.missions||[])];
  const sellers=rankingRows();
  const risks=sellers.filter(r=>sellerAttention(r).some(x=>/baixo|cancelamento|risco|evolução/i.test(x)));
  const wins=sellers.filter(r=>sellerAttention(r).some(x=>/elite|fechador|premium|destaque|especialista/i.test(x))).slice(0,4);
  $('warroom-clock').textContent=new Date().toLocaleString('pt-BR',{weekday:'long',hour:'2-digit',minute:'2-digit'});
  const cards=[
    ['💰','Oportunidade',money(m.total_opportunity||0)],
    ['🚨','Missões críticas',String(missions.length||risks.length)],
    ['👥','Vendedores em atenção',String(risks.length)],
    ['📈','Projeção',money(proj.projected_revenue||0)],
    ['🎯','Chance de meta',Number(proj.target||0)>0?pct(Math.min(1.25,Number(proj.projected_revenue||0)/Number(proj.target))):'—']
  ];
  $('warroom-kpis').innerHTML=cards.map(c=>`<div class="warroom-kpi panel"><span>${c[0]}</span><small>${c[1]}</small><strong>${c[2]}</strong></div>`).join('');
  $('warroom-priorities').innerHTML=(missions.length?missions.slice(0,6):risks.slice(0,6).map((r,i)=>({title:`Recuperar ${r.seller_name}`,reason:'Indicadores abaixo do potencial da equipe.',action:'Definir meta curta, revisar carteira e acompanhar o próximo bloco.',impact:r.money_left_on_table||0}))).map((x,i)=>`<div class="war-task"><b>${i+1}</b><div><h4>${x.title}</h4><p>${x.reason||x.action||''}</p><strong>${money(x.impact||0)} de impacto</strong></div></div>`).join('')||'<p>Sem missões críticas.</p>';
  $('warroom-people').innerHTML=risks.slice(0,8).map(r=>`<button class="war-person" onclick="openCoach('${r.seller_id}')"><span>${r.seller_name}</span><small>${sellerAttention(r).filter(x=>/baixo|cancelamento|risco|evolução/i.test(x)).join(' • ')||'Acompanhar'}</small></button>`).join('')||'<p>Nenhum vendedor em risco.</p>';
  $('warroom-wins').innerHTML=wins.map(r=>`<button class="war-person success" onclick="openSeller360('${r.seller_id}')"><span>${r.seller_name}</span><small>${sellerAttention(r).filter(x=>/elite|fechador|premium|destaque|especialista/i.test(x)).slice(0,2).join(' • ')}</small></button>`).join('')||'<p>Os destaques aparecerão aqui.</p>';
}
function populateCoachSellerSelect(){
  const el=$('coach-seller-select'); if(!el)return;
  const current=el.value;
  el.innerHTML='<option value="">Selecione um vendedor</option>'+rankingRows().map(r=>`<option value="${r.seller_id}">${r.seller_name}</option>`).join('');
  if(current)el.value=current;
}
function openCoach(id){
  openView('coach'); const el=$('coach-seller-select'); if(el){el.value=id;renderCoach(id);}
}
window.openCoach=openCoach;
function coachMetrics(row){
  const all=rankingRows(), avg=k=>all.length?all.reduce((s,x)=>s+Number(x[k]||0),0)/all.length:0;
  const targetTicket=Number(dashboardPayload?.target_ticket||dashboardPayload?.engine?.settings?.target_ticket||1200);
  const avgRevenue=avg('revenue'),avgActive=avg('active_revenue'),avgCancel=avg('cancellation_rate');
  const revenueGap=Math.max(0,avgRevenue-Number(row.revenue||0));
  const ticketGap=Math.max(0,targetTicket-Number(row.average_ticket||0))*Number(row.orders||0);
  const cancelLoss=Math.max(0,Number(row.cancellation_rate||0)-avgCancel)*Number(row.revenue||0);
  return {avgRevenue,avgActive,avgCancel,targetTicket,revenueGap,ticketGap,cancelLoss,total:revenueGap+ticketGap+cancelLoss};
}
function renderCoach(id){
  const row=rankingRows().find(r=>r.seller_id===id);
  if(!row){$('coach-empty')?.classList.remove('hidden');$('coach-content')?.classList.add('hidden');return;}
  $('coach-empty')?.classList.add('hidden');$('coach-content')?.classList.remove('hidden');
  const dna=sellerDNA().find(x=>x.seller_id===id)||{};
  const tags=[...(dna.strengths||[]),...(dna.attention||[])];
  const cm=coachMetrics(row);
  const benchmark=[...rankingRows()].filter(x=>x.seller_id!==id).sort((a,b)=>{
    const da=Math.abs(Number(a.average_ticket||0)-Number(row.average_ticket||0))+Math.abs(Number(a.active_revenue||0)-Number(row.active_revenue||0))/10;
    const db=Math.abs(Number(b.average_ticket||0)-Number(row.average_ticket||0))+Math.abs(Number(b.active_revenue||0)-Number(row.active_revenue||0))/10;
    return da-db;
  })[0]||rankingRows()[0];
  $('coach-avatar').textContent=initials(row.seller_name);
  $('coach-name').textContent=row.seller_name;
  $('coach-dna').innerHTML=tags.map(t=>`<span class="dna-chip ${/baixo|cancelamento|risco/i.test(t)?'negative':''}">${t}</span>`).join('')||'<span class="dna-chip">Consistente</span>';
  $('coach-money').textContent=money(cm.total);
  $('coach-money-detail').textContent=`Volume ${money(cm.revenueGap)} • Ticket ${money(cm.ticketGap)} • Cancelamento ${money(cm.cancelLoss)}`;
  $('coach-benchmark').textContent=benchmark?.seller_name||'—';
  $('coach-benchmark-reason').textContent='Referência com perfil próximo e desempenho superior em pelo menos um indicador.';
  const diagnoses=[];
  if(Number(row.revenue||0)<cm.avgRevenue*.7) diagnoses.push(`Faturamento está ${pct(1-Number(row.revenue||0)/Math.max(1,cm.avgRevenue))} abaixo da média da equipe.`);
  if(Number(row.average_ticket||0)<cm.targetTicket) diagnoses.push(`Ticket está ${money(cm.targetTicket-Number(row.average_ticket||0))} abaixo da meta.`);
  if(Number(row.cancellation_rate||0)>cm.avgCancel*1.25) diagnoses.push(`Cancelamento está acima da média da equipe.`);
  if(Number(row.active_revenue||0)<cm.avgActive*.7) diagnoses.push('Produção ativa abaixo do potencial.');
  if(!diagnoses.length) diagnoses.push('Desempenho consistente, com espaço para evolução incremental.');
  $('coach-diagnosis').innerHTML='<ul>'+diagnoses.map(x=>`<li>${x}</li>`).join('')+'</ul>';
  const cause=diagnoses.some(x=>/Ticket/i.test(x))?'Oferta curta ou pouco aprofundamento de necessidade.':diagnoses.some(x=>/Cancelamento/i.test(x))?'Confirmação de pedido e criação de compromisso precisam de reforço.':diagnoses.some(x=>/ativa|Faturamento/i.test(x))?'Baixa intensidade de carteira e pouco acompanhamento do próximo bloco de vendas.':'O vendedor está estável; o próximo salto depende de consistência e replicação das melhores práticas.';
  $('coach-cause').innerHTML=`<p>${cause}</p><div class="coach-evidence"><b>Evidências atuais</b><span>${row.orders||0} pedidos</span><span>${money(row.average_ticket||0)} ticket</span><span>${pct(row.cancellation_rate||0)} cancelamento</span></div>`;
  const radar=[
    ['Receita',Math.min(100,Number(row.revenue||0)/Math.max(1,cm.avgRevenue)*70)],
    ['Ticket',Math.min(100,Number(row.average_ticket||0)/Math.max(1,cm.targetTicket)*80)],
    ['Ativo',Math.min(100,Number(row.active_revenue||0)/Math.max(1,cm.avgActive)*70)],
    ['Qualidade',Math.max(0,100-Number(row.cancellation_rate||0)*300)],
    ['Índice',Number(row.score||0)]
  ];
  $('coach-radar').innerHTML=radar.map(x=>`<div><span>${x[0]}</span><div><i style="width:${Math.max(3,Math.min(100,x[1]))}%"></i></div><b>${Math.round(x[1])}</b></div>`).join('');
  const plan=[
    ['Hoje','Revisar carteira e definir uma meta curta para o próximo bloco.'],
    ['Amanhã','Ouvir duas ligações e treinar a objeção principal.'],
    ['Em 3 dias','Comparar ticket, ativo e confirmação de pedido.'],
    ['Em 7 dias','Recalcular potencial e reconhecer evolução.']
  ];
  $('coach-plan').innerHTML=plan.map((x,i)=>`<div class="coach-step"><b>${i+1}</b><div><small>${x[0]}</small><p>${x[1]}</p></div></div>`).join('');
  const feedback=`${row.seller_name}, quero reconhecer seus pontos fortes e trabalhar uma oportunidade objetiva. Hoje seus indicadores mostram ${diagnoses.join(' ')} Nosso foco não é cobrança genérica: é recuperar aproximadamente ${money(cm.total)} de potencial. Para isso, vamos revisar sua carteira, acompanhar o próximo bloco de vendas e comparar sua evolução em 7 dias.`;
  $('coach-feedback').value=feedback;
  const academy=[];
  if(diagnoses.some(x=>/Ticket/i.test(x))) academy.push(['Oferta de valor em 3 minutos','Treine perguntas de necessidade e montagem de pacote.']);
  if(diagnoses.some(x=>/Cancelamento/i.test(x))) academy.push(['Confirmação que reduz cancelamento','Use resumo, compromisso e confirmação final.']);
  if(diagnoses.some(x=>/ativa|Faturamento/i.test(x))) academy.push(['Bloco de produtividade','Planeje 30 contatos com checkpoints de 10 em 10.']);
  if(!academy.length) academy.push(['Consistência de alta performance','Transforme boas práticas em rotina repetível.']);
  $('coach-academy').innerHTML=academy.map((x,i)=>`<div class="academy-rec"><span>${i+1}</span><div><h4>${x[0]}</h4><p>${x[1]}</p><button onclick="alert('Microtreinamento piloto aberto. O conteúdo multimídia entra na próxima etapa.')">Iniciar treino</button></div></div>`).join('');
}
if($('coach-seller-select')) $('coach-seller-select').onchange=e=>renderCoach(e.target.value);
if($('copy-coach-feedback')) $('copy-coach-feedback').onclick=async()=>{await navigator.clipboard.writeText($('coach-feedback').value);$('copy-coach-feedback').textContent='Copiado!';setTimeout(()=>$('copy-coach-feedback').textContent='Copiar feedback',1500);};

function renderSmartTimeline(){
  const el=$('smart-timeline'); if(!el)return;
  const events=[];
  const date=dashboardPayload?.date;
  if(date) events.push({time:'08:00',type:'import',title:'Dados consolidados',text:`Importação de ${new Date(date+'T12:00').toLocaleDateString('pt-BR')} processada.`});
  const risks=rankingRows().filter(r=>sellerAttention(r).some(x=>/baixo|cancelamento|risco/i.test(x))).sort((a,b)=>coachMetrics(b).total-coachMetrics(a).total).slice(0,4);
  risks.forEach((r,i)=>events.push({time:`${String(8+i).padStart(2,'0')}:${15+i*10}`,type:'risk',seller_id:r.seller_id,title:`${r.seller_name} entrou em atenção`,text:`Oportunidade estimada: ${money(coachMetrics(r).total)} • ${sellerAttention(r).join(' • ')||'Acompanhar desempenho'}`}));
  const leader=[...rankingRows()].sort((a,b)=>Number(b.revenue||0)-Number(a.revenue||0))[0];
  if(leader) events.push({time:'11:30',type:'win',title:'Destaque identificado',text:`${leader.seller_name} lidera com ${money(leader.revenue)}.`});
  const potential=dashboardPayload?.engine?.money?.total_opportunity||rankingRows().reduce((s,r)=>s+coachMetrics(r).total,0);
  events.push({time:'Agora',type:'ai',title:'Monster Director recalculado',text:`Potencial estimado: ${money(potential)}. Prioridade: ${risks[0]?.seller_name||'acompanhar evolução da equipe'}.`});
  el.innerHTML=events.map(e=>`<div class="smart-event ${e.type}"><div class="event-dot"></div><time>${e.time}</time><div><h4>${e.title}</h4><p>${e.text}</p>${e.seller_id?`<button onclick="openCoach('${e.seller_id}')">Abrir Coach</button>`:''}</div></div>`).join('');
}
function renderAcademy(){
  const el=$('academy-grid'); if(!el)return;
  const modules=[
    ['🎯','Conversão','Da abordagem ao fechamento','Perguntas, diagnóstico e avanço da venda.'],
    ['🧾','Confirmação','Redução de cancelamento','Criação de compromisso e resumo do pedido.'],
    ['💎','Ticket Premium','Aumento de valor por pedido','Pacotes, ancoragem e oferta complementar.'],
    ['📞','Ativo','Produtividade de carteira','Blocos de contato e cadência de retorno.'],
    ['🛡️','Objeções','Quebra de objeções','Preço, desconfiança, prazo e comparação.'],
    ['🏆','Alta performance','Rotina de elite','Como repetir as práticas dos melhores vendedores.']
  ];
  el.innerHTML=modules.map((m,i)=>`<article class="panel academy-module"><span>${m[0]}</span><small>${m[1]}</small><h3>${m[2]}</h3><p>${m[3]}</p><button onclick="alert('Módulo piloto. Na próxima etapa entra vídeo, script, exercício e avaliação.')">Abrir módulo</button></article>`).join('');
}


function avgMetric(key){
  const rows=rankingRows();
  return rows.length?rows.reduce((s,r)=>s+Number(r[key]||0),0)/rows.length:0;
}
function topFiveAvg(key){
  const rows=[...rankingRows()].sort((a,b)=>Number(b[key]||0)-Number(a[key]||0)).slice(0,5);
  return rows.length?rows.reduce((s,r)=>s+Number(r[key]||0),0)/rows.length:0;
}
function percentDiff(value, benchmark){
  if(!benchmark) return 0;
  return ((Number(value||0)-benchmark)/benchmark)*100;
}
function compactDiff(v){
  const n=Math.round(v);
  return `${n>0?'+':''}${n}%`;
}
function evidenceLine(label,value,benchmark,format='number'){
  const diff=percentDiff(value,benchmark);
  const cls=diff>=0?'positive':'negative';
  const display=format==='money'?money(value):format==='pct'?pct(value):String(value);
  return `<div class="evidence-line"><span>${label}</span><b>${display}</b><em class="${cls}">${compactDiff(diff)} vs equipe</em></div>`;
}
function renderProfile360Pilot(id){
  const row=rankingRows().find(r=>r.seller_id===id);
  if(!row || !$('profile360-name')) return;
  const dna=sellerDNA().find(x=>x.seller_id===id)||{};
  const cm=coachMetrics(row);
  const tags=[...(dna.strengths||[]),...(dna.attention||[])];
  const sorted=[...rankingRows()].sort((a,b)=>Number(b.revenue||0)-Number(a.revenue||0));
  const pos=sorted.findIndex(x=>x.seller_id===id)+1;
  const totalRevenue=rankingRows().reduce((s,x)=>s+Number(x.revenue||0),0);
  $('profile360-avatar').textContent=initials(row.seller_name);
  $('profile360-name').textContent=row.seller_name;
  $('profile360-subtitle').textContent=`${pos}º de ${rankingRows().length} no faturamento • ${pct(Number(row.revenue||0)/Math.max(1,totalRevenue))} da receita da equipe`;
  $('profile360-tags').innerHTML=(tags.length?tags:['Consistente']).map(t=>`<span class="dna-chip ${/baixo|cancelamento|risco/i.test(t)?'negative':''}">${t}</span>`).join('');
  $('profile360-score').textContent=Math.round(Number(row.score||0));
  $('profile360-position').textContent=`${pos}º no ranking`;
  $('p360-revenue').textContent=money(row.revenue||0);
  $('p360-share').textContent=`${pct(Number(row.revenue||0)/Math.max(1,totalRevenue))} da equipe`;
  $('p360-ticket').textContent=money(row.average_ticket||0);
  $('p360-ticket-gap').textContent=`${compactDiff(percentDiff(row.average_ticket,avgMetric('average_ticket')))} vs equipe`;
  $('p360-active').textContent=money(row.active_revenue||0);
  $('p360-active-gap').textContent=`${compactDiff(percentDiff(row.active_revenue,avgMetric('active_revenue')))} vs equipe`;
  $('p360-cancel').textContent=pct(row.cancellation_rate||0);
  $('p360-cancel-gap').textContent=`${compactDiff(percentDiff(row.cancellation_rate,avgMetric('cancellation_rate')))} vs equipe`;
  $('p360-money').textContent=money(cm.total);
  const positives=[], attentions=[];
  if(Number(row.revenue||0)>=avgMetric('revenue')) positives.push('Receita acima da média da equipe'); else attentions.push('Volume abaixo da média da equipe');
  if(Number(row.average_ticket||0)>=avgMetric('average_ticket')) positives.push('Ticket competitivo'); else attentions.push('Ticket com espaço para recuperação');
  if(Number(row.active_revenue||0)>=avgMetric('active_revenue')) positives.push('Boa produção no ativo'); else attentions.push('Ativo abaixo do potencial');
  if(Number(row.cancellation_rate||0)<=avgMetric('cancellation_rate')) positives.push('Qualidade controlada'); else attentions.push('Cancelamento acima da média');
  $('p360-summary').innerHTML=`<p><b>${row.seller_name.split(' ')[0]}</b> apresenta ${positives.length?positives.join(', ').toLowerCase():'desempenho estável'}, mas ${attentions.length?attentions.join(', ').toLowerCase():'ainda pode consolidar consistência'}.</p>
  <div class="summary-columns"><div><small>FORÇAS</small>${positives.map(x=>`<span class="summary-good">✓ ${x}</span>`).join('')||'<span>Em formação</span>'}</div><div><small>ATENÇÃO</small>${attentions.map(x=>`<span class="summary-bad">• ${x}</span>`).join('')||'<span>Sem alerta relevante</span>'}</div></div>`;
  const radar=[
    ['Receita',Math.min(100,Number(row.revenue||0)/Math.max(1,topFiveAvg('revenue'))*100)],
    ['Ticket',Math.min(100,Number(row.average_ticket||0)/Math.max(1,topFiveAvg('average_ticket'))*100)],
    ['Ativo',Math.min(100,Number(row.active_revenue||0)/Math.max(1,topFiveAvg('active_revenue'))*100)],
    ['Qualidade',Math.max(0,100-(Number(row.cancellation_rate||0)/Math.max(.01,avgMetric('cancellation_rate')*2))*50)],
    ['Índice',Number(row.score||0)]
  ];
  $('p360-radar').innerHTML=radar.map(x=>`<div><span>${x[0]}</span><div><i style="width:${Math.max(3,Math.min(100,x[1]))}%"></i></div><b>${Math.round(x[1])}</b></div>`).join('');
  const mainGap=[['volume',cm.revenueGap],['ticket',cm.ticketGap],['cancelamento',cm.cancelLoss]].sort((a,b)=>b[1]-a[1])[0];
  const missionText=mainGap[0]==='volume'?'Aumentar intensidade de carteira mantendo a qualidade atual.':mainGap[0]==='ticket'?'Elevar valor por pedido com oferta complementar e pacote.':'Reduzir cancelamento com confirmação estruturada do pedido.';
  $('p360-mission').innerHTML=`<div class="mission-highlight"><small>PRIORIDADE</small><h4>${missionText}</h4><p>Impacto potencial estimado: <b>${money(mainGap[1])}</b></p><button onclick="openCoach('${id}')">Abrir plano no Coach</button></div>`;
  $('p360-compare').innerHTML=[
    evidenceLine('Receita',row.revenue,avgMetric('revenue'),'money'),
    evidenceLine('Ticket',row.average_ticket,avgMetric('average_ticket'),'money'),
    evidenceLine('Ativo',row.active_revenue,avgMetric('active_revenue'),'money'),
    evidenceLine('Cancelamento',row.cancellation_rate,avgMetric('cancellation_rate'),'pct')
  ].join('');
  $('p360-money-breakdown').innerHTML=`<div class="money-stack"><div><span>Volume</span><b>${money(cm.revenueGap)}</b></div><div><span>Ticket</span><b>${money(cm.ticketGap)}</b></div><div><span>Cancelamento</span><b>${money(cm.cancelLoss)}</b></div><div class="total"><span>Total</span><b>${money(cm.total)}</b></div></div>`;
  const nextScore=Math.min(100,Math.round(Number(row.score||0)+(cm.total>0?8:3)));
  $('p360-next-level').innerHTML=`<p>Se executar o plano recomendado e aproximar os indicadores da referência da equipe:</p><div class="next-level-score"><span>${Math.round(Number(row.score||0))}</span><b>→</b><span>${nextScore}</span></div><p>Meta sugerida para 7 dias: <b>${mainGap[0]==='volume'?'aumentar faturamento em 10%':mainGap[0]==='ticket'?'subir ticket em 5%':'reduzir cancelamento em 2 p.p.'}</b></p>`;
  $('p360-timeline').innerHTML=[
    {time:'Hoje',type:'import',title:'Importação atual',text:`Receita ${money(row.revenue)} • Ticket ${money(row.average_ticket)}`},
    {time:'Agora',type:attentions.length?'risk':'win',title:'Diagnóstico atualizado',text:attentions[0]||'Desempenho consistente'},
    {time:'Agora',type:'ai',title:'Missão recomendada',text:missionText},
    {time:'Em 7 dias',type:'win',title:'Próxima revisão',text:'Comparar evolução e recalcular potencial.'}
  ].map(e=>`<div class="smart-event ${e.type}"><div class="event-dot"></div><time>${e.time}</time><div><h4>${e.title}</h4><p>${e.text}</p></div></div>`).join('');
  $('p360-open-coach').onclick=()=>openCoach(id);
}
function coachToneText(row,cm,diagnoses,tone='human'){
  const first=row.seller_name.split(' ')[0];
  const main=diagnoses[0]||'seu desempenho está estável';
  const opportunity=cm.total>0?`Temos cerca de ${money(cm.total)} de oportunidade para recuperar.`:'Seu resultado está consistente e o foco agora é ganhar mais regularidade.';
  const bodies={
    human:`${first}, seu resultado tem pontos muito bons. O principal ajuste agora é ${main.toLowerCase()}. ${opportunity} Vamos focar em uma mudança por vez e acompanhar juntos durante os próximos 7 dias.`,
    objective:`${first}, o ponto principal é simples: ${main}. ${opportunity} Nesta semana vamos revisar carteira, acompanhar o próximo bloco e medir evolução em 7 dias.`,
    demanding:`${first}, você tem capacidade para entregar mais. Hoje o indicador mostra que ${main.toLowerCase()}. ${opportunity} Quero foco total no plano desta semana e retorno com evolução concreta.`,
    motivational:`${first}, você já mostrou que consegue performar. Agora precisamos transformar isso em constância. ${opportunity} Vamos trabalhar o ponto principal, medir o avanço e buscar um novo patamar nos próximos 7 dias.`
  };
  return bodies[tone]||bodies.human;
}
function updateCoachFeedback(){
  const id=$('coach-seller-select')?.value;
  const row=rankingRows().find(r=>r.seller_id===id); if(!row)return;
  const cm=coachMetrics(row);
  const diagnoses=[];
  if(Number(row.revenue||0)<avgMetric('revenue')*.7) diagnoses.push('seu volume está abaixo da média da equipe');
  if(Number(row.average_ticket||0)<avgMetric('average_ticket')) diagnoses.push('seu ticket tem espaço para crescer');
  if(Number(row.cancellation_rate||0)>avgMetric('cancellation_rate')*1.2) diagnoses.push('seu cancelamento está acima da média');
  if(!diagnoses.length) diagnoses.push('seu desempenho está consistente, mas ainda há espaço para evoluir');
  $('coach-feedback').value=coachToneText(row,cm,diagnoses,$('coach-feedback-tone')?.value||'human');
}
if($('coach-feedback-tone')) $('coach-feedback-tone').onchange=updateCoachFeedback;
if($('regenerate-coach-feedback')) $('regenerate-coach-feedback').onclick=updateCoachFeedback;
function academyModulesFor(mode){
  const common=[
    ['🎯','Conversão','Da abordagem ao fechamento','Perguntas, diagnóstico e avanço da venda.','12 min'],
    ['🧾','Confirmação','Pedido confirmado, cliente comprometido','Resumo, validação e redução de cancelamento.','8 min'],
    ['💎','Ticket Premium','Como elevar o valor por pedido','Pacotes, ancoragem e oferta complementar.','10 min'],
    ['📞','Ativo','Blocos de produtividade','Cadência de contatos, retorno e foco.','7 min'],
    ['🛡️','Objeções','Preço sem desconto automático','Como sustentar valor e conduzir comparação.','6 min'],
    ['🏆','Alta performance','Rotina dos melhores','Como repetir práticas vencedoras todos os dias.','9 min']
  ];
  if(mode==='tracks') return common.map((x,i)=>[x[0],`Trilha ${i+1}`,x[2],x[3],`${i+1}/4 etapas`]);
  if(mode==='objections') return [
    ['💰','Objeção','Está caro','Responda sem correr para desconto.','5 min'],
    ['🤔','Objeção','Vou pensar','Crie compromisso e próximo passo.','4 min'],
    ['👥','Objeção','Preciso falar com alguém','Mantenha a venda viva.','4 min'],
    ['📦','Objeção','Já tenho produto','Descubra lacunas e oportunidade.','5 min'],
    ['🕒','Objeção','Agora não','Transforme adiamento em agenda.','4 min'],
    ['🔒','Objeção','Não confio','Construa segurança com prova e clareza.','6 min']
  ];
  if(mode==='challenges') return [
    ['🔥','Desafio do dia','20 ofertas completas','Faça 20 ofertas com produto principal + complementar.','Hoje'],
    ['🎧','Desafio','Ouvir duas ligações','Identifique uma força e um ponto de melhoria.','Hoje'],
    ['📈','Desafio','Subir ticket em 5%','Compare o resultado do próximo bloco.','3 dias'],
    ['✅','Desafio','Zero pedido sem confirmação','Use o checklist final em todas as vendas.','Hoje'],
    ['🔁','Desafio','30 contatos ativos','Blocos de 10 com checkpoint.','Hoje'],
    ['🏅','Desafio','Registrar boa prática','Compartilhe uma abordagem vencedora.','Semana']
  ];
  return common;
}
function renderAcademyMode(mode='recommended'){
  const el=$('academy-grid'); if(!el)return;
  const modules=academyModulesFor(mode);
  el.innerHTML=modules.map((m,i)=>`<article class="panel academy-module"><span>${m[0]}</span><small>${m[1]}</small><h3>${m[2]}</h3><p>${m[3]}</p><div class="academy-meta"><b>${m[4]}</b><em>${'★'.repeat(Math.max(3,5-(i%3)))}</em></div><button onclick="alert('Treino piloto iniciado. Na próxima fase entram conteúdo, exercício, resposta e avaliação.')">Começar</button></article>`).join('');
}
document.querySelectorAll('.academy-tab').forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll('.academy-tab').forEach(x=>x.classList.remove('active'));
  btn.classList.add('active'); renderAcademyMode(btn.dataset.academy);
});
if($('academy-start-today')) $('academy-start-today').onclick=()=>alert('Treino recomendado iniciado.');
function renderAcademy(){
  const el=$('academy-grid'); if(!el)return;
  const risks=rankingRows().filter(r=>sellerAttention(r).some(x=>/baixo|cancelamento|risco/i.test(x)));
  const biggest=risks.sort((a,b)=>coachMetrics(b).total-coachMetrics(a).total)[0];
  if($('academy-today-title')) $('academy-today-title').textContent=biggest?`Treino recomendado: ${biggest.seller_name}`:'Consistência de alta performance';
  if($('academy-today-text')) $('academy-today-text').textContent=biggest?`O sistema identificou uma oportunidade de ${money(coachMetrics(biggest).total)}. Recomendação: treino de ${coachMetrics(biggest).revenueGap>=coachMetrics(biggest).ticketGap?'produtividade e carteira':'ticket e oferta'}.`:'Transforme boas práticas em rotina repetível.';
  if($('academy-team-progress')) $('academy-team-progress').textContent=`${Math.min(100,Math.round((dashboardPayload?.engine?.health?.monster_index||0)))}%`;
  renderAcademyMode('recommended');
  if($('academy-achievements-grid')) $('academy-achievements-grid').innerHTML=[
    ['🏆','Fechador Elite'],['💎','Especialista em Ticket'],['📞','Rei do Ativo'],['🛡️','Qualidade Controlada'],['🚀','Maior Evolução']
  ].map((x,i)=>`<div class="achievement ${i>1?'locked':''}"><span>${x[0]}</span><b>${x[1]}</b><small>${i>1?'Bloqueado':'Conquistado'}</small></div>`).join('');
}
function enhanceCoachEvidence(id){
  const row=rankingRows().find(r=>r.seller_id===id); if(!row||!$('coach-proof'))return;
  $('coach-proof').innerHTML=[
    evidenceLine('Receita',row.revenue,avgMetric('revenue'),'money'),
    evidenceLine('Ticket',row.average_ticket,avgMetric('average_ticket'),'money'),
    evidenceLine('Ativo',row.active_revenue,avgMetric('active_revenue'),'money'),
    evidenceLine('Cancelamento',row.cancellation_rate,avgMetric('cancellation_rate'),'pct')
  ].join('');
  updateCoachFeedback();
}
const _renderCoachV21=renderCoach;
renderCoach=function(id){_renderCoachV21(id);enhanceCoachEvidence(id);};

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
  const engine=window.MonsterEngine?.payload;
  const s=data.summary||{};
  const ranking=[...(data.ranking||[])].sort((a,b)=>Number(b.revenue||0)-Number(a.revenue||0));
  const top=ranking[0];

  if(engine?.projection){
    const p=engine.projection;
    const h=engine.health||{};
    const m=engine.money||{};
    const above=Number(p.projected_revenue||0)>=Number(p.target||0);
    const state=above
      ? `A projeção está acima da meta em ${money(Number(p.projected_revenue||0)-Number(p.target||0))}.`
      : `A projeção está abaixo da meta em ${money(Number(p.target||0)-Number(p.projected_revenue||0))}.`;
    return `${state} Índice Monstro ${Number(h.monster_index||0).toFixed(0)} (${h.status||'—'}). ${
      top?`${top.seller_name} lidera o faturamento.`:''
    } O potencial financeiro estimado é ${money(m.total_opportunity||0)}.`;
  }

  if(s.target>0){
    const state=Number(s.projection)>=Number(s.target)
      ? 'A projeção cobre a meta'
      : 'A projeção ainda está abaixo da meta';
    return `${state}. ${top?`${top.seller_name} lidera o faturamento.`:''}`;
  }

  return `A equipe faturou ${money(s.revenue)} com ${s.orders||0} pedidos.`;
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

function radarSvg(labels,values){
  const n=labels.length,cx=120,cy=110,R=82;
  const point=(i,r)=>{const a=-Math.PI/2+i*2*Math.PI/n;return [cx+Math.cos(a)*r,cy+Math.sin(a)*r]};
  const rings=[.25,.5,.75,1].map(k=>`<polygon points="${labels.map((_,i)=>point(i,R*k).join(',')).join(' ')}"/>`).join('');
  const axes=labels.map((_,i)=>{const p=point(i,R);return `<line x1="${cx}" y1="${cy}" x2="${p[0]}" y2="${p[1]}"/>`}).join('');
  const poly=values.map((v,i)=>point(i,R*Math.max(0,Math.min(1,v))).join(',')).join(' ');
  const texts=labels.map((l,i)=>{const p=point(i,R+22);return `<text x="${p[0]}" y="${p[1]}" text-anchor="middle">${l}</text>`}).join('');
  return `<svg viewBox="0 0 240 225" class="radar-svg"><g class="radar-grid">${rings}${axes}</g><polygon class="radar-area" points="${poly}"/>${texts}</svg>`;
}
function renderSellerRadar(latest,dna){
  const ranking=dashboardPayload?.ranking||[];
  const maxRev=Math.max(1,...ranking.map(x=>Number(x.revenue||0))),maxTicket=Math.max(1,...ranking.map(x=>Number(x.average_ticket||0))),maxActive=Math.max(1,...ranking.map(x=>Number(x.active_revenue||0)));
  const values=[Number(latest.revenue||0)/maxRev,Number(latest.ticket||0)/maxTicket,Number(latest.active||0)/maxActive,1-Math.min(1,Number(latest.cancellation||0)/.25),Math.min(1,Number(latest.score||0)/100),Math.min(1,Number(dna?.participation||0)/.15)];
  if($('profile360-radar'))$('profile360-radar').innerHTML=radarSvg(['Receita','Ticket','Ativo','Qualidade','Índice','Particip.'],values);
}
function renderSellerMoneyLeft(latest,dna){
  const ranking=dashboardPayload?.ranking||[]; const n=Math.max(1,ranking.length);
  const avgRev=ranking.reduce((s,x)=>s+Number(x.revenue||0),0)/n;
  const avgTicket=ranking.reduce((s,x)=>s+Number(x.average_ticket||0),0)/n;
  const targetCancel=.08;
  const volumeGap=Math.max(0,avgRev-Number(latest.revenue||0));
  const ticketGap=Math.max(0,avgTicket-Number(latest.ticket||0))*Number(latest.orders||0);
  const cancelGap=Math.max(0,Number(latest.cancellation||0)-targetCancel)*Number(latest.revenue||0);
  const total=volumeGap+ticketGap+cancelGap;
  if($('profile360-money'))$('profile360-money').innerHTML=`<div class="money-left-total">${money(total)}</div><small>potencial estimado</small><div class="money-left-list"><span>Volume <b>${money(volumeGap)}</b></span><span>Ticket <b>${money(ticketGap)}</b></span><span>Cancelamento <b>${money(cancelGap)}</b></span></div>`;
  if($('profile360-comparison'))$('profile360-comparison').innerHTML=`<h4>Comparação com a equipe</h4><p>Receita: ${Number(latest.revenue||0)>=avgRev?'acima':'abaixo'} da média de ${money(avgRev)}.</p><p>Ticket: ${Number(latest.ticket||0)>=avgTicket?'acima':'abaixo'} da média de ${money(avgTicket)}.</p>`;
}

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
    <div><small>Representa na receita</small><strong>${pct(dna?.participation)}</strong></div>`;
  renderSellerRadar(latest,dna);
  renderSellerMoneyLeft(latest,dna);
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
