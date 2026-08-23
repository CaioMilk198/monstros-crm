console.info('MONSTROS AI 3.2 - Motor da Decisao');

(function(){
  const $=id=>document.getElementById(id);
  const num=v=>Number(v||0);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const brl=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(num(v));
  const state=()=>{try{return operationState?.()||{}}catch{return {}}};
  const rows=()=>{try{return rankingRows?.()||[]}catch{return []}};
  const attention=r=>{try{return sellerAttention?.(r)||[]}catch{return []}};
  const seller=id=>rows().find(r=>String(r.seller_id)===String(id));
  const today=()=>new Date().toLocaleDateString('pt-BR');
  let missions=[],decisions=[],lastFetch=0,lastSignature='';

  function inferDecisions(){
    const st=state(),all=rows(),out=[];
    const low=all.filter(r=>attention(r).some(x=>/baixo volume|abaixo do ritmo/i.test(x)));
    const cancel=all.filter(r=>attention(r).some(x=>/cancelamento/i.test(x)));
    const lowShare=low.length?num(st.money?.lowVolume)/low.length:0;
    const cancelShare=cancel.length?num(st.money?.cancellation)/cancel.length:0;
    low.forEach((r,i)=>out.push({
      id:`volume-${r.seller_id}`,source:'diagnostic',kind:'productivity',severity:'critical',rank:i+1,seller_id:r.seller_id,seller_name:r.seller_name,
      title:`Recuperar ritmo de ${r.seller_name}`,situation:'Volume abaixo da referência da equipe.',cause:'Produção individual abaixo do ritmo necessário para a meta.',
      evidence:`Faturamento atual ${brl(r.revenue)} • ${r.orders||0} pedido(s).`,action:'Revisar carteira, definir um bloco de contatos e acompanhar o próximo resultado.',
      impact:lowShare,deadline:'Hoje',success:'Registrar avanço de volume no próximo bloco.',confidence:lowShare>0?'Média':'Baixa',status:'recommended',minutes:40
    }));
    cancel.forEach((r,i)=>out.push({
      id:`cancel-${r.seller_id}`,source:'diagnostic',kind:'cancellation',severity:'warning',rank:low.length+i+1,seller_id:r.seller_id,seller_name:r.seller_name,
      title:`Reduzir cancelamento de ${r.seller_name}`,situation:'Cancelamento acima do limite configurado.',cause:'Pedidos precisam de confirmação e compromisso mais estruturados.',
      evidence:`Taxa atual ${(num(r.cancellation_rate)*100).toFixed(1)}%.`,action:'Auditar pedidos recentes e aplicar confirmação estruturada.',
      impact:cancelShare,deadline:'Amanhã',success:'Reduzir a taxa em 2 p.p. na próxima medição.',confidence:cancelShare>0?'Média':'Baixa',status:'recommended',minutes:25
    }));
    return out;
  }

  function missionDecision(m){
    const r=seller(m.seller_id);
    return {id:`mission-${m.id}`,mission_id:m.id,source:'mission',kind:'mission',severity:m.priority==='critical'?'critical':m.priority==='high'?'warning':'normal',
      seller_id:m.seller_id,seller_name:m.seller_name||r?.seller_name||'Equipe',title:m.title||'Missão do gestor',situation:m.reason||'Prioridade registrada pelo gestor.',
      cause:m.reason||'Decisão registrada a partir do diagnóstico operacional.',evidence:m.evidence||'Aguardando evidência de execução.',action:m.action_text||'Executar a ação definida e registrar o resultado.',
      impact:num(m.estimated_impact),deadline:m.due_date?new Date(`${m.due_date}T12:00:00`).toLocaleDateString('pt-BR'):'Sem prazo definido',
      success:m.success_criteria||'Concluir com uma observação de resultado.',confidence:num(m.estimated_impact)>0?'Média':'Baixa',status:m.status||'pending',minutes:num(m.estimated_minutes)||30};
  }

  function rebuild(){
    const inferred=inferDecisions(),activeMissions=missions.filter(m=>!['completed','cancelled'].includes(m.status)).map(missionDecision);
    const covered=new Set(activeMissions.map(d=>String(d.seller_id)+'|'+(/cancel/i.test(d.title)?'cancellation':/volume|ritmo|produt/i.test(d.title)?'productivity':'mission')));
    decisions=[...activeMissions,...inferred.filter(d=>!covered.has(String(d.seller_id)+'|'+d.kind))]
      .sort((a,b)=>(a.status==='in_progress'?-1:0)-(b.status==='in_progress'?-1:0)||({critical:0,warning:1,normal:2}[a.severity]-{critical:0,warning:1,normal:2}[b.severity])||num(b.impact)-num(a.impact));
    window.MonstrosDecisionEngine={all:()=>decisions.slice(),refresh};
  }

  async function fetchMissions(){
    if(!client||Date.now()-lastFetch<12000)return;
    lastFetch=Date.now();
    try{const {data,error}=await client.rpc('list_management_missions',{p_status:null,p_limit:100});if(error)throw error;missions=data||[]}catch(e){console.warn('3.2 missions',e.message||e)}
  }
  async function refresh(){await fetchMissions();rebuild();renderCurrent();}

  function label(d){return d.status==='in_progress'?'EM ANDAMENTO':d.severity==='critical'?'FAÇA HOJE':d.severity==='warning'?'PRÓXIMA AÇÃO':'ACOMPANHAR'}
  function statusText(s){return ({pending:'Não iniciada',recommended:'Recomendada',in_progress:'Em andamento',completed:'Concluída',cancelled:'Descartada'})[s]||s}
  function decisionCard(d,compact=false){
    return `<article class="decision-card ${esc(d.severity)} ${compact?'compact':''}" data-decision-id="${esc(d.id)}">
      <div class="decision-top"><span>${label(d)}</span><small>Confiança ${esc(d.confidence)}</small></div>
      <h3>${esc(d.title)}</h3><p class="decision-situation">${esc(d.situation)}</p>
      <div class="decision-facts"><div><small>Impacto estimado</small><strong>${d.impact>0?brl(d.impact):'A validar'}</strong></div><div><small>Prazo</small><strong>${esc(d.deadline)}</strong></div><div><small>Status</small><strong>${esc(statusText(d.status))}</strong></div></div>
      ${compact?'':`<details><summary>Por que o sistema recomenda isso?</summary><div class="decision-explain"><p><b>Causa provável:</b> ${esc(d.cause)}</p><p><b>Evidência:</b> ${esc(d.evidence)}</p><p><b>Critério de sucesso:</b> ${esc(d.success)}</p><p class="confidence-note">Estimativa de confiança ${esc(d.confidence.toLowerCase())}: usa a comparação com a referência atual da equipe e deve ser confirmada pelo gestor.</p></div></details>`}
      <div class="decision-action"><div><small>PRÓXIMO PASSO</small><b>${esc(d.action)}</b></div><div class="decision-buttons">${d.mission_id&&d.status==='pending'?`<button data-decision-start="${esc(d.mission_id)}">Iniciar</button>`:''}${d.mission_id&&d.status==='in_progress'?`<button data-decision-complete="${esc(d.mission_id)}">Concluir e medir</button>`:''}${!d.mission_id?`<button data-decision-create="${esc(d.id)}">Transformar em missão</button>`:''}<button class="secondary" data-decision-profile="${esc(d.seller_id||'')}">Ver vendedor</button></div></div>
    </article>`;
  }

  function bind(root){
    root.querySelectorAll('[data-decision-profile]').forEach(b=>b.onclick=()=>b.dataset.decisionProfile?window.openSeller360?.(b.dataset.decisionProfile):window.navigateIntegrated?.('ranking'));
    root.querySelectorAll('[data-decision-create]').forEach(b=>b.onclick=()=>{const d=decisions.find(x=>x.id===b.dataset.decisionCreate);if(!d)return;window.prefillMissionFromContext?.({sellerId:d.seller_id,title:d.title,reason:d.cause,action:d.action,impact:d.impact,minutes:d.minutes,priority:'high'});});
    root.querySelectorAll('[data-decision-start]').forEach(b=>b.onclick=async()=>{await window.changeManualMissionStatus?.(b.dataset.decisionStart,'in_progress');lastFetch=0;setTimeout(refresh,500)});
    root.querySelectorAll('[data-decision-complete]').forEach(b=>b.onclick=async()=>{await window.changeManualMissionStatus?.(b.dataset.decisionComplete,'completed');lastFetch=0;setTimeout(refresh,500)});
  }

  function renderHome(){
    const shell=$('operational-feed');if(!shell||$('view-dashboard')?.classList.contains('hidden'))return;
    const st=state(),critical=decisions.filter(d=>['critical','warning'].includes(d.severity));
    const leader=[...rows()].sort((a,b)=>num(b.revenue)-num(a.revenue))[0];
    shell.innerHTML=`<div class="motor-layout"><main class="motor-main">
      <section class="motor-brief"><div><span>MOTOR DE DECISÃO • ${today()}</span><h2>${critical.length?`${critical.length} decisão(ões) exigem sua atenção`:'Operação sem decisão crítica pendente'}</h2><p>${critical.length?'As prioridades abaixo estão ordenadas por urgência, impacto e evidência.':'Acompanhe a execução e reconheça o que está funcionando.'}</p></div><div class="motor-gap"><small>Distância projetada da meta</small><strong>${num(st.gap)>0?brl(st.gap):'Meta projetada'}</strong><span>Projeção ${brl(st.projection)}</span></div></section>
      <nav class="motor-tabs"><button class="active" data-motor-filter="open">Para decidir <b>${critical.length}</b></button><button data-motor-filter="progress">Em andamento <b>${decisions.filter(d=>d.status==='in_progress').length}</b></button><button data-motor-filter="recognition">Reconhecer <b>${leader?1:0}</b></button></nav>
      <section class="motor-list" data-motor-panel="open">${critical.slice(0,6).map(d=>decisionCard(d)).join('')||'<div class="decision-empty"><b>Nenhuma prioridade crítica.</b><span>O sistema continuará acompanhando a próxima atualização.</span></div>'}</section>
      <section class="motor-list hidden" data-motor-panel="progress">${decisions.filter(d=>d.status==='in_progress').map(d=>decisionCard(d)).join('')||'<div class="decision-empty"><b>Nenhuma ação em andamento.</b><span>Inicie uma prioridade para acompanhar o resultado.</span></div>'}</section>
      <section class="motor-list hidden" data-motor-panel="recognition">${leader?`<article class="recognition-card"><span>RECONHECIMENTO RECOMENDADO</span><h3>${esc(leader.seller_name)} lidera o faturamento</h3><p>${brl(leader.revenue)} no período atual. Reconheça a prática específica, não apenas o resultado.</p><button data-decision-profile="${esc(leader.seller_id)}">Ver evidências do vendedor</button></article>`:'<div class="decision-empty">Aguardando dados da equipe.</div>'}</section>
    </main><aside class="motor-side"><section><h3>Resumo de hoje</h3><div class="motor-summary"><span><i class="red"></i>Críticas <b>${decisions.filter(d=>d.severity==='critical').length}</b></span><span><i class="yellow"></i>Acompanhar <b>${decisions.filter(d=>d.severity==='warning').length}</b></span><span><i class="blue"></i>Em execução <b>${decisions.filter(d=>d.status==='in_progress').length}</b></span></div><button data-motor-view="warroom">Abrir Sala de Decisão</button></section><section><h3>Confiabilidade</h3><p><b>Diagnóstico orientativo.</b> Valores são estimativas baseadas na importação atual e ficam explícitos até existir evidência de resultado.</p><button class="secondary" data-motor-view="analytics">Ver evolução</button></section></aside></div>`;
    shell.querySelectorAll('[data-motor-filter]').forEach(b=>b.onclick=()=>{shell.querySelectorAll('[data-motor-filter]').forEach(x=>x.classList.toggle('active',x===b));shell.querySelectorAll('[data-motor-panel]').forEach(x=>x.classList.toggle('hidden',x.dataset.motorPanel!==b.dataset.motorFilter))});
    shell.querySelectorAll('[data-motor-view]').forEach(b=>b.onclick=()=>window.navigateIntegrated?.(b.dataset.motorView));bind(shell);
  }

  function renderDecisionStrip(viewId,title,limit=3){
    const view=$(viewId);if(!view||view.classList.contains('hidden'))return;
    let host=view.querySelector('.decision-strip');if(!host){host=document.createElement('section');host.className='decision-strip';const anchor=view.querySelector('.simple-shortcuts,.warroom-hero,.profile360-hero,.analytics-hero')||view.firstElementChild;anchor?.insertAdjacentElement('afterend',host)}
    host.innerHTML=`<div class="decision-strip-head"><div><small>MESMA FONTE DE VERDADE</small><h3>${esc(title)}</h3></div><span>${decisions.length} aberta(s)</span></div><div class="decision-strip-grid">${decisions.slice(0,limit).map(d=>decisionCard(d,true)).join('')||'<p>Nenhuma decisão pendente.</p>'}</div>`;bind(host);
  }

  function improveSellerEmpty(){
    const view=$('view-profile360');if(!view||view.classList.contains('hidden'))return;
    let picker=$('decision-seller-picker');if(!picker){picker=document.createElement('section');picker.id='decision-seller-picker';picker.className='seller-picker';view.querySelector('#seller-shortcuts')?.insertAdjacentElement('afterend',picker)}
    const active=window.ExecutionContext?.sellerId;if(active){picker.classList.add('hidden');return}picker.classList.remove('hidden');
    picker.innerHTML=`<div><b>Encontre um vendedor</b><span>Busque pelo nome ou escolha quem precisa de atenção.</span></div><input list="decision-seller-list" placeholder="Digite o nome do vendedor"><datalist id="decision-seller-list">${rows().map(r=>`<option value="${esc(r.seller_name)}">`).join('')}</datalist><div class="seller-picker-links">${decisions.slice(0,4).map(d=>`<button data-picker="${esc(d.seller_id)}">${esc(d.seller_name)}</button>`).join('')}</div>`;
    const input=picker.querySelector('input');input.onchange=()=>{const r=rows().find(x=>x.seller_name.toUpperCase()===input.value.trim().toUpperCase());if(r)window.openSeller360?.(r.seller_id)};picker.querySelectorAll('[data-picker]').forEach(b=>b.onclick=()=>window.openSeller360?.(b.dataset.picker));
  }

  function contextualImprovements(){
    renderDecisionStrip('view-ranking','Quem precisa de decisão agora',4);
    renderDecisionStrip('view-warroom','Fila única de execução',5);
    improveSellerEmpty();
    const analytics=$('view-analytics');if(analytics&&!analytics.classList.contains('hidden')){let note=$('history-confidence');if(!note){note=document.createElement('div');note.id='history-confidence';note.className='history-confidence';analytics.querySelector('#evolution-shortcuts')?.insertAdjacentElement('afterend',note)}const count=document.querySelectorAll('#analytics-charts .panel small').length?2:0;note.innerHTML=count<3?'<b>Histórico ainda insuficiente para afirmar tendência.</b><span>Mostramos o valor atual, mas uma linha com apenas 2 registros não representa evolução confiável. Importe novos períodos para comparar antes, agora e variação.</span>':''}
    const brand=document.querySelector('.brand small');if(brand)brand.textContent='3.2 • MOTOR DA DECISÃO';
    const banner=document.querySelector('.pilot-trust-banner b');if(banner)banner.textContent='3.2 • Motor da decisão';
    const notif=$('notification-count');if(notif)notif.textContent=String(decisions.filter(d=>['critical','warning'].includes(d.severity)).length);
    document.querySelectorAll('.call-status').forEach(x=>{const map={uploaded:'Salva • aguardando avaliação',error:'Falha ao salvar',processing:'Em avaliação',analyzed:'Avaliada',analyzed_manual:'Avaliada pelo gestor'};const raw=x.textContent.trim();if(map[raw])x.textContent=map[raw]});
  }

  function renderCurrent(){renderHome();contextualImprovements()}
  const oldOpen=window.openView;
  if(typeof oldOpen==='function')window.openView=function(name){oldOpen(name);setTimeout(renderCurrent,180)};
  document.body.classList.add('decision-mode');
  const floating=$('floating-monstrao');if(floating){floating.innerHTML='<span>AI</span>';floating.title='Abrir Monstrão';}
  async function boot(){const st=state(),sig=[st.date,st.revenue,st.projection,rows().length,window.ExecutionContext?.currentView].join('|');if(sig!==lastSignature||Date.now()-lastFetch>12000){lastSignature=sig;await refresh()}else renderCurrent()}
  setTimeout(boot,1800);setInterval(boot,5000);
})();
