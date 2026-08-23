console.info('MONSTROS AI 2.6.0 - Piloto validável, execução conectada e cockpit de saúde');

(function(){
  const $p=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>Number(v||0);
  const cash=v=>typeof money==='function'?money(v):new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(num(v));
  const fmtPct=v=>typeof pct==='function'?pct(v):`${(num(v)*100).toFixed(1)}%`;
  const roleText=()=>String(profile?.role||'').toLowerCase();
  const isManager=()=>['admin','manager','supervisor'].includes(roleText());
  const activeSeller=()=>{try{return typeof selectedSeller==='function'?selectedSeller():null}catch{return null}};

  let missionCache=[];
  let callCache=[];
  let progressCache=[];
  let eventCache=[];

  function state(){try{return typeof operationState==='function'?operationState():{}}catch{return {}}}
  function rows(){try{return typeof rankingRows==='function'?rankingRows():[]}catch{return []}}

  function sellerName(id){return rows().find(r=>String(r.seller_id)===String(id))?.seller_name||'Equipe'}
  function contextId(){return activeSeller()?.seller_id||profile?.seller_id||window.ExecutionContext?.sellerId||''}

  function ensureContext(){
    const current=contextId();
    if(current){
      try{selectSeller(current)}catch{}
      ['coach-seller-select','calllab-seller','mission-seller'].forEach(id=>{
        const el=$p(id); if(!el)return;
        if([...el.options].some(o=>String(o.value)===String(current))) el.value=current;
      });
    }
  }

  async function fetchMissions(){
    if(!client)return missionCache;
    try{
      const {data,error}=await client.rpc('list_management_missions',{p_status:null,p_limit:100});
      if(error)throw error;
      missionCache=data||[];
    }catch(e){console.warn('2.6 missions',e.message||e)}
    return missionCache;
  }

  async function fetchCalls(){
    if(!client||!profile?.company_id)return callCache;
    try{
      let q=client.from('call_recordings').select('id,seller_id,status,analysis_score,summary,analysis,created_at,analyzed_at,file_name').eq('company_id',profile.company_id).order('created_at',{ascending:false}).limit(60);
      if(!isManager()&&profile?.seller_id) q=q.eq('seller_id',profile.seller_id);
      const {data,error}=await q; if(error)throw error; callCache=data||[];
    }catch(e){console.warn('2.6 calls',e.message||e)}
    return callCache;
  }

  async function fetchProgress(){
    if(!client||!profile?.company_id)return progressCache;
    try{
      let q=client.from('academy_progress').select('seller_id,module_id,progress,status,score,started_at,completed_at').eq('company_id',profile.company_id).limit(200);
      if(!isManager()&&profile?.seller_id) q=q.eq('seller_id',profile.seller_id);
      const {data,error}=await q; if(error)throw error; progressCache=data||[];
    }catch(e){console.warn('2.6 academy progress',e.message||e)}
    return progressCache;
  }

  async function fetchEvents(){
    if(!client||!profile?.company_id)return eventCache;
    try{
      let q=client.from('operational_events').select('id,event_type,title,text,seller_id,mission_id,impact,status,created_at').eq('company_id',profile.company_id).order('created_at',{ascending:false}).limit(150);
      if(!isManager()&&profile?.seller_id) q=q.eq('seller_id',profile.seller_id);
      const {data,error}=await q; if(error)throw error; eventCache=data||[];
    }catch(e){console.warn('2.6 events',e.message||e)}
    return eventCache;
  }

  async function refreshOperationalCaches(){
    await Promise.all([fetchMissions(),fetchCalls(),fetchProgress(),fetchEvents()]);
    ensureContext();
    return true;
  }

  function activeMissionsForSeller(sellerId){
    return missionCache.filter(m=>m.status!=='completed'&&m.status!=='cancelled'&&(!sellerId||String(m.seller_id)===String(sellerId)));
  }

  function latestQA(sellerId){
    return callCache.find(c=>String(c.seller_id)===String(sellerId)&&['analyzed_manual','analyzed'].includes(c.status)&&c.analysis);
  }

  function normalizeAnalysis(v){
    if(!v)return null;
    try{return typeof v==='string'?JSON.parse(v):v}catch{return null}
  }

  // 1) CONTEXTO GLOBAL: evita o estado "vendedor selecionado em cima, vazio no Coach".
  const oldPopulate=window.populateCoachSellerSelect||null;
  if(typeof populateCoachSellerSelect==='function'){
    const original=populateCoachSellerSelect;
    populateCoachSellerSelect=function(){
      const current=contextId(); original();
      const el=$p('coach-seller-select'); if(current&&el&&[...el.options].some(o=>String(o.value)===String(current)))el.value=current;
    };
  }

  const oldOpenView26=window.openView;
  if(typeof oldOpenView26==='function'){
    window.openView=function(name){
      oldOpenView26(name);
      setTimeout(async()=>{
        ensureContext();
        if(name==='coach'&&contextId()) renderCoach?.(contextId());
        if(name==='warroom') await renderWarRoom26();
        if(name==='timeline') await renderTimeline26();
        if(name==='academy') await renderAcademy26();
        if(name==='profile360'&&contextId()) await enrichProfile360(contextId());
        if(name==='settings') await renderPilotHealth();
      },40);
    };
  }

  // 2) SALA DE GUERRA: passa a consumir o estado real + missões persistidas.
  async function renderWarRoom26(){
    const kpis=$p('warroom-kpis'); if(!kpis)return;
    await fetchMissions();
    const st=state();
    if(!st?.date){kpis.innerHTML='<div class="panel">Importe dados para ativar a Sala de Guerra.</div>';return}
    const active=missionCache.filter(m=>!['completed','cancelled'].includes(m.status));
    const critical=active.filter(m=>['critical','high'].includes(m.priority));
    const risks=st.risks||[];
    const wins=[...rows()].sort((a,b)=>num(b.score)-num(a.score)).slice(0,4);
    if($p('warroom-clock'))$p('warroom-clock').textContent=new Date().toLocaleString('pt-BR',{weekday:'long',hour:'2-digit',minute:'2-digit'});
    const target=num(st.target),projection=num(st.projection),chance=target?Math.min(1.5,projection/target):0;
    kpis.innerHTML=[
      ['💰','Oportunidade',cash(st.opportunity||0)],
      ['🚨','Missões críticas',String(critical.length)],
      ['👥','Vendedores em atenção',String(risks.length)],
      ['📈','Projeção',cash(projection)],
      ['🎯','Chance de meta',target?`${(chance*100).toFixed(0)}%`:'—']
    ].map(c=>`<div class="warroom-kpi panel"><span>${c[0]}</span><small>${c[1]}</small><strong>${c[2]}</strong></div>`).join('');

    const priorityList=active.length?active.slice(0,8):risks.slice(0,6).map(r=>({seller_id:r.seller_id,seller_name:r.seller_name,title:`Recuperar ${r.seller_name}`,reason:'Desvio identificado pelos indicadores da operação.',action_text:'Definir meta curta, revisar carteira e acompanhar o próximo bloco.',estimated_impact:typeof coachMetrics==='function'?coachMetrics(r).total:0,priority:'high',status:'pending'}));
    if($p('warroom-priorities'))$p('warroom-priorities').innerHTML=priorityList.map((m,i)=>`<div class="war-task ${esc(m.priority||'medium')}"><b>${i+1}</b><div><h4>${esc(m.title)}</h4><p>${esc(m.reason||m.action_text||'')}</p><strong>${cash(m.estimated_impact||0)} de impacto</strong><div class="war-actions"><button data-war-coach="${m.seller_id||''}">Abrir Coach</button>${m.id?`<button class="secondary" data-war-start="${m.id}">${m.status==='in_progress'?'Em andamento':'Iniciar'}</button>`:`<button class="secondary" data-war-mission="${m.seller_id||''}">Criar missão</button>`}</div></div></div>`).join('')||'<p>Sem prioridades críticas.</p>';
    $p('warroom-priorities')?.querySelectorAll('[data-war-coach]').forEach(b=>b.onclick=()=>b.dataset.warCoach&&window.openCoach?.(b.dataset.warCoach));
    $p('warroom-priorities')?.querySelectorAll('[data-war-start]').forEach(b=>b.onclick=()=>window.changeManualMissionStatus?.(b.dataset.warStart,'in_progress'));
    $p('warroom-priorities')?.querySelectorAll('[data-war-mission]').forEach(b=>b.onclick=()=>window.prefillMissionFromContext?.({sellerId:b.dataset.warMission,title:`Recuperar ${sellerName(b.dataset.warMission)}`,reason:'Prioridade aberta na Sala de Guerra.',action:'Definir bloco de execução e revisar o resultado.',minutes:30,priority:'high'}));
    if($p('warroom-people'))$p('warroom-people').innerHTML=risks.slice(0,8).map(r=>`<button class="war-person" data-seller="${r.seller_id}"><span>${esc(r.seller_name)}</span><small>${esc((typeof sellerAttention==='function'?sellerAttention(r):[]).join(' • ')||'Acompanhar agora')}</small></button>`).join('')||'<p>Nenhum vendedor em risco.</p>';
    $p('warroom-people')?.querySelectorAll('[data-seller]').forEach(b=>b.onclick=()=>window.openCoach?.(b.dataset.seller));
    if($p('warroom-wins'))$p('warroom-wins').innerHTML=wins.map(r=>`<button class="war-person success" data-win="${r.seller_id}"><span>${esc(r.seller_name)}</span><small>Índice ${Math.round(num(r.score))} • ${cash(r.revenue)}</small></button>`).join('');
    $p('warroom-wins')?.querySelectorAll('[data-win]').forEach(b=>b.onclick=()=>window.openSeller360?.(b.dataset.win));
  }

  // 3) TIMELINE: memória real primeiro; eventos calculados entram como contexto, não como substitutos.
  function timelineType(e){
    const t=String(e.event_type||e.type||'').toLowerCase();
    if(/risk|cancel|alert/.test(t))return 'risk';
    if(/training|feedback|recogn|win|academy|call_analysis/.test(t))return 'win';
    if(/mission|decision|ai|coach|call_uploaded/.test(t))return 'ai';
    return 'import';
  }
  function human(iso){
    if(!iso)return 'Agora'; const d=new Date(iso),n=new Date();
    return d.toDateString()===n.toDateString()?d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString('pt-BR');
  }
  async function renderTimeline26(){
    const el=$p('smart-timeline'); if(!el)return;
    await Promise.all([fetchEvents(),fetchMissions()]);
    const missionEvents=[];
    missionCache.forEach(m=>{
      missionEvents.push({id:`m-create-${m.id}`,event_type:'mission',title:'Missão criada',text:`${m.title}${m.seller_name?` • ${m.seller_name}`:''}`,seller_id:m.seller_id,status:'pending',created_at:m.created_at,impact:m.estimated_impact});
      if(m.status==='in_progress')missionEvents.push({id:`m-start-${m.id}`,event_type:'mission',title:'Missão em andamento',text:`${m.title}${m.seller_name?` • ${m.seller_name}`:''}`,seller_id:m.seller_id,status:'in_progress',created_at:m.started_at||m.created_at,impact:m.estimated_impact});
      if(m.status==='completed'&&m.completed_at)missionEvents.push({id:`m-done-${m.id}`,event_type:'mission',title:'Missão concluída',text:`${m.title}${m.seller_name?` • ${m.seller_name}`:''}`,seller_id:m.seller_id,status:'completed',created_at:m.completed_at,impact:m.estimated_impact});
    });
    const local=(()=>{try{return JSON.parse(localStorage.getItem('monstros_operational_events')||'[]')}catch{return []}})();
    const st=state();
    const calculated=[];
    if(st.date)calculated.push({id:`import-${st.date}`,event_type:'import',title:'Dados consolidados',text:`${rows().length} vendedores • ${cash(st.revenue)} realizados • projeção ${cash(st.projection)}.`,created_at:`${st.date}T08:00:00`});
    if(st.leader)calculated.push({id:`leader-${st.date}-${st.leader.seller_id}`,event_type:'recognition',title:'Destaque atual',text:`${st.leader.seller_name} lidera a operação com ${cash(st.leader.revenue)}.`,seller_id:st.leader.seller_id,created_at:`${st.date}T11:30:00`});
    const all=[...eventCache,...missionEvents,...local,...calculated].map(e=>({...e,type:timelineType(e),time:human(e.created_at),text:e.text||e.description||''}));
    const dedup=all.filter((e,i,a)=>a.findIndex(x=>String(x.id||'')===String(e.id||'')||(x.title===e.title&&x.text===e.text&&x.created_at===e.created_at))===i).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))).slice(0,120);
    window.smartTimelineEvents=dedup;
    const active=document.querySelector('.timeline-filter.active')?.dataset.type||'all';
    const filtered=active==='all'?dedup:dedup.filter(e=>e.type===active);
    el.innerHTML=filtered.map(e=>`<div class="smart-event ${e.type}"><div class="event-dot"></div><time>${esc(e.time)}</time><div><h4>${esc(e.title)}</h4><p>${esc(e.text)}</p>${num(e.impact)>0?`<small class="impact-tag">Impacto ${cash(e.impact)}</small>`:''}${e.seller_id?`<button data-timeline-coach="${e.seller_id}">Abrir Coach</button>`:''}</div></div>`).join('')||'<div class="panel">Nenhum evento deste tipo.</div>';
    el.querySelectorAll('[data-timeline-coach]').forEach(b=>b.onclick=()=>window.openCoach?.(b.dataset.timelineCoach));
  }
  window.renderTimeline26=renderTimeline26;
  document.querySelectorAll('.timeline-filter').forEach(b=>b.addEventListener('click',()=>setTimeout(renderTimeline26,10)));

  // 4) COACH: injeta evidência real da última ligação e missões abertas.
  async function enrichCoach(sellerId){
    if(!sellerId)return;
    await Promise.all([fetchCalls(),fetchMissions()]);
    const qa=latestQA(sellerId),analysis=normalizeAnalysis(qa?.analysis);
    const mission=activeMissionsForSeller(sellerId)[0];
    const cause=$p('coach-cause'); if(cause&&(analysis||mission)){
      const block=document.createElement('div'); block.className='coach-live-evidence'; block.id='coach-live-evidence';
      block.innerHTML=`<b>Evidência operacional conectada</b>${analysis?`<span>Último QA: ${Math.round(num(analysis.score||qa?.analysis_score))}/100 • ${esc(analysis.verdict||'avaliado')}</span>${analysis.improvements?.[0]?`<span>Ajuste observado: ${esc(analysis.improvements[0])}</span>`:''}${analysis.training_recommendation?`<span>Treino: ${esc(analysis.training_recommendation)}</span>`:''}`:'<span>Sem QA de ligação concluído para este vendedor.</span>'}${mission?`<span>Missão aberta: ${esc(mission.title)} • ${esc(mission.status)}</span>`:''}`;
      $p('coach-live-evidence')?.remove(); cause.appendChild(block);
    }
    const academy=$p('coach-academy');
    if(academy&&analysis?.training_recommendation){
      academy.insertAdjacentHTML('afterbegin',`<div class="academy-rec call-driven"><span>QA</span><div><h4>${esc(analysis.training_recommendation)}</h4><p>Treino recomendado pela última ligação avaliada.</p><button id="coach-open-call-training">Iniciar treino</button></div></div>`);
      $p('coach-open-call-training').onclick=()=>navigateIntegrated?.('academy',{sellerId,lessonTitle:analysis.training_recommendation,category:'Call QA',description:analysis.next_action||'Treino derivado da evidência da ligação.'});
    }
  }

  const originalRenderCoach=window.renderCoach||renderCoach;
  if(typeof renderCoach==='function'){
    const base=renderCoach;
    renderCoach=function(id){base(id); if(id){try{selectSeller(id)}catch{};setTimeout(()=>enrichCoach(id),20)}};
  }

  // 5) PERFIL 360: resumo de execução real, não apenas indicadores.
  async function enrichProfile360(sellerId){
    await Promise.all([fetchCalls(),fetchMissions(),fetchProgress()]);
    const timeline=$p('p360-timeline');
    if(!timeline)return;
    timeline.querySelectorAll('.profile360-live-event').forEach(x=>x.remove());
    const qa=latestQA(sellerId),analysis=normalizeAnalysis(qa?.analysis);
    const missions=missionCache.filter(m=>String(m.seller_id)===String(sellerId)).slice(0,3);
    const completed=progressCache.filter(p=>String(p.seller_id)===String(sellerId)&&p.status==='completed').length;
    const events=[];
    if(analysis)events.push(['Agora','QA de ligação',`Nota ${Math.round(num(analysis.score||qa.analysis_score))}/100 • ${analysis.improvements?.[0]||analysis.training_recommendation||'Avaliação concluída'}`]);
    missions.forEach(m=>events.push([human(m.completed_at||m.created_at),`Missão ${m.status==='completed'?'concluída':'ativa'}`,m.title]));
    if(completed)events.push(['Histórico','Academy',`${completed} treinamento(s) concluído(s) para este vendedor.`]);
    events.forEach(e=>timeline.insertAdjacentHTML('beforeend',`<div class="timeline-item profile360-live-event"><b>${esc(e[0])}</b><span>${esc(e[1])}</span><small>${esc(e[2])}</small></div>`));
  }

  // 6) ACADEMY: contexto individual + progresso persistido + recomendação derivada de QA.
  async function renderAcademy26(){
    await Promise.all([fetchCalls(),fetchProgress()]);
    ensureContext();
    const sellerId=contextId();
    const qa=latestQA(sellerId),a=normalizeAnalysis(qa?.analysis);
    const title=$p('academy-today-title'),text=$p('academy-today-text');
    if(a?.training_recommendation&&title){
      title.textContent=a.training_recommendation;
      if(text)text.textContent=a.next_action||'Treino recomendado pela última ligação avaliada.';
    }
    const sellerProgress=progressCache.filter(p=>!sellerId||String(p.seller_id)===String(sellerId));
    const done=sellerProgress.filter(p=>p.status==='completed').length;
    const started=sellerProgress.filter(p=>p.status==='started').length;
    if($p('academy-team-progress')){
      if(!isManager()&&sellerId)$p('academy-team-progress').textContent=`${done?Math.min(100,Math.round(done/(Math.max(done+started,6))*100)):0}%`;
      $p('academy-team-progress').title=sellerId?`${sellerName(sellerId)} • ${done} concluído(s) • ${started} iniciado(s)`:'Progresso da equipe';
    }
  }

  // Persiste conclusão do Academy usando os módulos existentes quando houver correspondência.
  async function persistAcademyProgress(title,status='completed'){
    const sellerId=contextId(); if(!client||!profile?.company_id||!sellerId)return;
    try{
      const {data:mods}=await client.from('academy_modules').select('id,title').or(`company_id.is.null,company_id.eq.${profile.company_id}`).eq('is_active',true);
      const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      const module=(mods||[]).find(m=>norm(m.title)===norm(title))||(mods||[]).find(m=>norm(title).includes(norm(m.title))||norm(m.title).includes(norm(title)));
      if(!module)return;
      const payload={company_id:profile.company_id,seller_id:sellerId,module_id:module.id,status,progress:status==='completed'?100:20,completed_at:status==='completed'?new Date().toISOString():null};
      await client.from('academy_progress').upsert(payload,{onConflict:'seller_id,module_id'});
      await fetchProgress();
    }catch(e){console.warn('2.6 academy persist',e.message||e)}
  }

  const oldOpenAcademy=window.openAcademyLesson||openAcademyLesson;
  if(typeof openAcademyLesson==='function'){
    const base=openAcademyLesson;
    openAcademyLesson=function(title,category,description){
      base(title,category,description); persistAcademyProgress(title,'started');
      const btn=$p('complete-lesson'); if(btn){const prev=btn.onclick;btn.onclick=async()=>{prev?.();await persistAcademyProgress(title,'completed');try{await logOperationalEvent?.('training','Treinamento concluído',`${sellerName(contextId())}: ${title}`,{sellerId:contextId(),status:'completed'})}catch{};await renderAcademy26();};}
    };
  }

  // 7) EXPERIÊNCIA DO VENDEDOR: sem menus gerenciais e com início no próprio Perfil 360.
  function applySellerExperience26(){
    if(isManager())return;
    const sellerRole=['seller','operator','vendedor'].includes(roleText()); if(!sellerRole)return;
    const allowed=new Set(['profile360','coach','calls','academy','timeline']);
    document.querySelectorAll('.nav[data-view]').forEach(b=>b.classList.toggle('role-hidden',!allowed.has(b.dataset.view)));
    const brand=document.querySelector('.brand small'); if(brand)brand.textContent='PILOTO 2.6 • VENDEDOR';
    if(profile?.seller_id){
      try{selectSeller(profile.seller_id)}catch{}
      if(!sessionStorage.getItem('monstros26_seller_landed')){sessionStorage.setItem('monstros26_seller_landed','1');setTimeout(()=>navigateIntegrated?.('profile360',{sellerId:profile.seller_id}),150)}
    }
  }

  // 8) COCKPIT DE VALIDAÇÃO: mostra o que realmente está pronto para piloto.
  async function checkTable(name){try{const {error}=await client.from(name).select('*',{head:true,count:'exact'}).limit(1);return !error}catch{return false}}
  async function renderPilotHealth(){
    if(!isManager()||!client||!profile)return;
    const settings=$p('view-settings')?.querySelector('.panel'); if(!settings)return;
    let box=$p('pilot-health26');
    if(!box){
      box=document.createElement('div');box.id='pilot-health26';box.className='pilot-health26';
      const anchor=$p('pilot-access-admin')||$p('reset-config-button');
      anchor?.parentNode?.insertBefore(box,anchor);
    }
    box.innerHTML='<hr class="divider"><div class="panel-title-row"><div><small>VALIDAÇÃO DO PILOTO</small><h3>Cockpit de prontidão</h3><p class="muted">O sistema só fica verde quando dados, execução, pessoas e evidências estão conectados.</p></div><button id="pilot-health-refresh" class="secondary compact-button">Verificar</button></div><div class="health-grid"><span>Verificando...</span></div>';
    $p('pilot-health-refresh').onclick=renderPilotHealth;
    await refreshOperationalCaches();
    const [missionOk,eventOk,callOk,academyOk]=await Promise.all(['management_missions','operational_events','call_recordings','academy_progress'].map(checkTable));
    const hasData=!!state()?.date;
    const linkedUsers=await (async()=>{try{const {count}=await client.from('profiles').select('*',{head:true,count:'exact'}).eq('company_id',profile.company_id).not('seller_id','is',null);return count||0}catch{return 0}})();
    const qaDone=callCache.filter(c=>['analyzed_manual','analyzed'].includes(c.status)).length;
    const activeM=missionCache.filter(m=>!['completed','cancelled'].includes(m.status)).length;
    const tests=[
      ['Dados importados',hasData,hasData?`${rows().length} vendedores carregados`:'Faça uma importação real'],
      ['Missões',missionOk,`${activeM} ativa(s)`],
      ['Timeline',eventOk,`${eventCache.length} evento(s) persistidos`],
      ['Ligações & QA',callOk,`${qaDone} QA(s) concluído(s)`],
      ['Academy',academyOk,`${progressCache.filter(p=>p.status==='completed').length} conclusão(ões)`],
      ['Logins vinculados',linkedUsers>0,`${linkedUsers} usuário(s) com vendedor`],
      ['Contexto entre telas',!!contextId(),contextId()?sellerName(contextId()):'Selecione um vendedor'],
      ['IA de ligação paga',true,'Pausada por decisão do piloto']
    ];
    const score=Math.round(tests.filter(t=>t[1]).length/tests.length*100);
    box.querySelector('.health-grid').innerHTML=`<div class="health-score"><strong>${score}%</strong><span>${score>=85?'Pronto para teste controlado':score>=60?'Quase pronto':'Ainda em preparação'}</span></div>${tests.map(t=>`<div class="health-item ${t[1]?'ok':'warn'}"><b>${t[1]?'✓':'!'}</b><div><strong>${esc(t[0])}</strong><small>${esc(t[2])}</small></div></div>`).join('')}`;
  }

  // 9) MISSÕES: sempre refletem na Sala, Timeline e cockpit após qualquer mudança.
  const prevChange=window.changeManualMissionStatus;
  if(prevChange)window.changeManualMissionStatus=async function(id,status){await prevChange(id,status);await refreshOperationalCaches();await Promise.all([renderWarRoom26(),renderTimeline26()]);};
  const saveBtn=$p('save-mission-button'); if(saveBtn)saveBtn.addEventListener('click',()=>setTimeout(async()=>{await refreshOperationalCaches();await Promise.all([renderWarRoom26(),renderTimeline26()]);},800));

  // 10) BOTÃO ATUALIZAR: refresh real das integrações em vez de apenas redesenhar tela.
  document.querySelectorAll('#refresh-button,.top-actions button').forEach(btn=>{
    if(btn.dataset.monstros26)return;btn.dataset.monstros26='1';
    btn.addEventListener('click',()=>setTimeout(async()=>{await refreshOperationalCaches();ensureContext();const v=localStorage.getItem('monstros_current_view')||'dashboard';if(v==='warroom')await renderWarRoom26();if(v==='timeline')await renderTimeline26();if(v==='academy')await renderAcademy26();if(v==='coach'&&contextId())await enrichCoach(contextId());},250));
  });

  // 11) MONSTRÃO LOCAL: respostas úteis mesmo sem crédito de API.
  const oldAnswer=window.answerMonstrao||answerMonstrao;
  if(typeof oldAnswer==='function'){
    window.answerMonstrao=function(question){
      const q=String(question||'').toUpperCase(); const st=state();
      if(q.includes('MISSAO')||q.includes('MISSÃO')){
        const active=missionCache.filter(m=>!['completed','cancelled'].includes(m.status)).slice(0,5);
        return active.length?`Missões abertas:\n${active.map((m,i)=>`${i+1}. ${m.title}${m.seller_name?` — ${m.seller_name}`:''} (${m.status})`).join('\n')}`:'Não há missões abertas no momento.';
      }
      if(q.includes('LIGAC')||q.includes('QUALIDADE')){
        const seller=contextId();const qa=latestQA(seller);const a=normalizeAnalysis(qa?.analysis);
        if(a)return `${sellerName(seller)}: último QA ${Math.round(num(a.score||qa.analysis_score))}/100. Principal ajuste: ${a.improvements?.[0]||'sem ajuste crítico'}. Treino sugerido: ${a.training_recommendation||'revisar a ligação'}.`;
      }
      return oldAnswer(question);
    };
  }

  async function boot(){
    await refreshOperationalCaches();
    ensureContext();
    applySellerExperience26();
    const v=localStorage.getItem('monstros_current_view')||'dashboard';
    if(v==='warroom')await renderWarRoom26();
    if(v==='timeline')await renderTimeline26();
    if(v==='academy')await renderAcademy26();
    if(v==='coach'&&contextId()){renderCoach?.(contextId());await enrichCoach(contextId())}
    if(v==='profile360'&&contextId())await enrichProfile360(contextId());
    if(v==='settings')await renderPilotHealth();
  }
  setTimeout(boot,1200);
  setInterval(()=>{ensureContext();},3000);

  window.MonstrosPilot26={refresh:refreshOperationalCaches,renderWarRoom:renderWarRoom26,renderTimeline:renderTimeline26,renderAcademy:renderAcademy26,renderHealth:renderPilotHealth};
})();

/* ===== MONSTROS AI 2.6.1 — PILOT HARDENING ===== */
(function(){
  const $=id=>document.getElementById(id), n=v=>Number(v||0);
  const brl=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n(v));
  const esc2=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function state(){try{return operationState()}catch{return {}}}
  function ctx(){try{return contextId()}catch{return null}}
  function contextClarifier(){
    const strip=document.querySelector('.context-strip'); if(!strip)return;
    let note=strip.querySelector('.context-scope-note'); if(!note){note=document.createElement('small');note.className='context-scope-note';strip.appendChild(note)}
    const collective=['dashboard','ranking','intelligence','warroom','director','analytics'];
    let view=localStorage.getItem('monstros_current_view')||'';
    note.textContent=collective.includes(view)?'Contexto de ação selecionado. Os indicadores desta tela continuam sendo da equipe.':'Indicadores e ações desta tela usam o vendedor selecionado.';
  }
  function priorityScore(m){
    const impact=Math.max(0,n(m.estimated_impact??m.impact));
    const p={critical:1,high:.82,medium:.55,low:.3}[String(m.priority||'medium').toLowerCase()]||.5;
    const age=Math.min(.18,Math.max(0,(Date.now()-new Date(m.created_at||Date.now()).getTime())/86400000)*.03);
    return impact*(1+p+age)+(impact>0?100:0);
  }
  async function hardenWarRoom(){
    if(!$('warroom-priorities'))return;
    const st=state(); let missions=[];
    try{missions=(missionCache||[]).filter(m=>!['completed','cancelled'].includes(m.status))}catch{}
    const actionable=missions.filter(m=>n(m.estimated_impact??m.impact)>0).sort((a,b)=>priorityScore(b)-priorityScore(a));
    const watch=missions.filter(m=>n(m.estimated_impact??m.impact)<=0);
    const risks=st.risks||[];
    if($('warroom-kpis')){
      const critical=actionable.filter(m=>['critical','high'].includes(String(m.priority).toLowerCase())).length;
      $('warroom-kpis').innerHTML=[['💰','Oportunidade',brl(st.opportunity)],['🚨','Prioridades com impacto',String(critical)],['👥','Vendedores em atenção',String(risks.length)],['📈','Projeção',brl(st.projection)],['🎯','Chance de meta',`${Math.min(100,Math.round(n(st.projectedAttainment)*100))}%`]].map(x=>`<div class="war-kpi"><span>${x[0]}</span><small>${x[1]}</small><strong>${x[2]}</strong></div>`).join('');
    }
    const list=actionable.slice(0,8);
    $('warroom-priorities').innerHTML=list.map((m,i)=>`<div class="war-task ${esc2(m.priority||'medium')}"><b>${i+1}</b><div><h4>${esc2(m.title)}</h4><p>${esc2(m.reason||m.action_text||'Ação operacional priorizada pelo impacto.')}</p><strong>${brl(m.estimated_impact??m.impact)} de impacto</strong><small class="why-priority">Prioridade calculada por impacto financeiro + urgência.</small><div class="war-actions"><button data-war-coach="${m.seller_id||''}">Abrir Coach</button><button class="secondary" data-war-start="${m.id||''}">${m.status==='in_progress'?'Em andamento':'Iniciar'}</button></div></div></div>`).join('')||'<p>Sem prioridade financeira crítica agora.</p>';
    if(watch.length){$('warroom-priorities').insertAdjacentHTML('beforeend',`<details class="watchlist"><summary>${watch.length} ação(ões) sem impacto financeiro calculado — acompanhar</summary>${watch.slice(0,8).map(m=>`<p>${esc2(m.title)}</p>`).join('')}</details>`)}
    $('warroom-priorities').querySelectorAll('[data-war-coach]').forEach(b=>b.onclick=()=>window.openCoach?.(b.dataset.warCoach));
    $('warroom-priorities').querySelectorAll('[data-war-start]').forEach(b=>b.onclick=async()=>{if(!b.dataset.warStart)return;try{await updateMissionStatus?.(b.dataset.warStart,'in_progress');await refreshOperationalCaches?.();await hardenWarRoom()}catch(e){console.warn(e)}});
  }
  function hardenMonstrao(){
    const el=$('monstrao-summary'); if(!el)return; const st=state(), risk=st.primaryRisk;
    el.innerHTML=`<b>Leitura operacional.</b><br>Potencial financeiro total calculado: <strong>${brl(st.opportunity)}</strong>.${risk?` Prioridade atual: <strong>${esc2(risk.seller_name)}</strong>.`:''}<br><small>Mesma fonte de verdade usada no Centro de Comando, Inteligência e Sala de Guerra.</small>`;
  }
  function analyticsFallback(){
    const rev=$('chart-revenue'); if(!rev||!rev.textContent.includes('Aguardando'))return;
    let rows=[];try{rows=JSON.parse(localStorage.getItem('monstros_analytics_snapshots')||'[]')}catch{}
    if(rows.length<1)return;
    const sorted=[...rows].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
    const map=sorted.map(x=>({revenue:x.revenue,monster_index:x.index,average_ticket:x.ticket,cancellation_rate:x.cancellation,target:state().target,projection:x.projection}));
    try{renderLineChart('chart-revenue',map,'revenue',brl);renderLineChart('chart-index',map,'monster_index',v=>n(v).toFixed(0));renderLineChart('chart-ticket',map,'average_ticket',brl);renderLineChart('chart-cancel',map,'cancellation_rate',pct);renderTargetChart(map)}catch{}
    document.querySelectorAll('.chart-empty').forEach(e=>{if(e.textContent.includes('Aguardando'))e.textContent='Histórico insuficiente: faça novas importações em datas/estados diferentes.'});
  }
  function explainCoachReference(){
    const cards=[...document.querySelectorAll('#view-coach .panel, #view-coach article')];
    const card=cards.find(x=>/Melhor referência para copiar/i.test(x.textContent||'')); if(!card||card.querySelector('.reference-explain'))return;
    const current=(dashboardPayload?.ranking||[]).find(r=>String(r.seller_id)===String(ctx())); if(!current)return;
    const others=(dashboardPayload?.ranking||[]).filter(r=>r.seller_id!==current.seller_id);
    const ref=others.sort((a,b)=>Math.abs(n(a.average_ticket)-n(current.average_ticket))-Math.abs(n(b.average_ticket)-n(current.average_ticket)))[0];
    if(ref)card.insertAdjacentHTML('beforeend',`<p class="reference-explain"><b>Por que esta referência?</b> Perfil comparável por ticket e desempenho. Use como benchmark somente no indicador em que ela supera o vendedor atual; não como cópia integral do perfil.</p>`);
  }
  function addPilotBanner(){
    if(document.querySelector('.pilot-trust-banner'))return;
    const main=document.querySelector('main')||document.querySelector('.content'); if(!main)return;
    const d=document.createElement('div');d.className='pilot-trust-banner';d.innerHTML='<b>2.6.1 • Piloto de validação</b><span>Prioridade agora: coerência dos dados, ciclo operacional e evidência. Recursos demonstrativos devem ser identificados como tal.</span>';main.prepend(d);
  }
  async function refresh261(){contextClarifier();hardenMonstrao();analyticsFallback();explainCoachReference();addPilotBanner();if((localStorage.getItem('monstros_current_view')||'')==='warroom')await hardenWarRoom()}
  const oldNav=window.navigateIntegrated; if(typeof oldNav==='function')window.navigateIntegrated=async function(...a){const r=await oldNav.apply(this,a);setTimeout(refresh261,80);return r};
  const oldOpen=window.openView; if(typeof oldOpen==='function')window.openView=function(...a){const r=oldOpen.apply(this,a);setTimeout(refresh261,80);return r};
  window.MonstrosPilot261={refresh:refresh261,hardenWarRoom};
  setTimeout(refresh261,900);
})();
