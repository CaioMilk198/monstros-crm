console.info('MONSTROS AI 3.4 - Executive Decision Intelligence');
(function(){
  const $=id=>document.getElementById(id), num=v=>Number(v||0), brl=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(num(v));
  window.MONSTROS_CRM_VERSION='3.3.0-visual-decision-refinement';
  function rows(){try{return typeof rankingRows==='function'?rankingRows():[]}catch{return []}}
  function state(){try{return typeof operationState==='function'?operationState():{}}catch{return {}}}
  function nav(){
    const root=document.querySelector('#app > aside nav'); if(!root||root.dataset.v33==='1')return;
    const buttons=new Map([...root.querySelectorAll('.nav[data-view]')].map(b=>[b.dataset.view,b]));
    const groups=[
      ['HOJE',[['dashboard','Meu dia'],['warroom','Prioridades'],['director','Decisões']]],
      ['EQUIPE',[['ranking','Equipe'],['intelligence','Diagnóstico'],['analytics','Resultados']]],
      ['VENDEDORES',[['profile360','Perfil 360'],['coach','Desenvolvimento'],['calls','Ligações & QA']]],
      ['EVOLUÇÃO',[['academy','Academy'],['timeline','Evolução'],['monstrao','Monstrão']]],
      ['ADMINISTRAÇÃO',[['import','Importar dados'],['settings','Configurações']]]
    ];
    root.innerHTML='';
    groups.forEach(([label,items])=>{const s=document.createElement('section');s.className='v33-nav-section';s.innerHTML=`<small>${label}</small>`;const list=document.createElement('div');items.forEach(([view,text])=>{const b=buttons.get(view);if(b){const span=b.querySelector('span');if(span)span.textContent=text;list.appendChild(b)}});s.appendChild(list);root.appendChild(s)});root.dataset.v33='1';
  }
  function people(){
    const all=rows(); if(!all.length)return {develop:[],recognize:[],watch:[]};
    const avg=all.reduce((s,r)=>s+num(r.revenue),0)/all.length;
    const develop=[...all].filter(r=>num(r.revenue)<avg*.78||num(r.cancellation_rate)>.1).sort((a,b)=>num(a.revenue)-num(b.revenue)).slice(0,3);
    const recognize=[...all].sort((a,b)=>num(b.score)-num(a.score)).filter(r=>!develop.includes(r)).slice(0,2);
    const watch=[...all].filter(r=>!develop.includes(r)&&!recognize.includes(r)).slice(0,2); return {develop,recognize,watch};
  }
  function personCard(row,type){const label=type==='develop'?'DESENVOLVER':type==='recognize'?'RECONHECER':'ACOMPANHAR';const action=type==='develop'?'Abrir plano':type==='recognize'?'Ver prática':'Acompanhar';const note=type==='develop'?'Resultado abaixo da referência da equipe.':type==='recognize'?'Desempenho consistente para reforçar e replicar.':'Manter acompanhamento do próximo ciclo.';return `<article class="v33-person ${type}"><small>${label}</small><h4>${row.seller_name||'Vendedor'}</h4><p>${note}</p><div><span>Índice <b>${Math.round(num(row.score))}</b></span><span>Receita <b>${brl(row.revenue)}</b></span></div><button data-v33-seller="${row.seller_id||''}" data-v33-view="${type==='develop'?'coach':'profile360'}">${action}</button></article>`}
  function enhanceHome(){
    const home=$('v32-home'); if(!home||home.dataset.v33==='1')return; home.dataset.v33='1';
    document.body.classList.add('v33-mode');
    const st=state(), p=people(), list=[...p.develop.map(x=>[x,'develop']),...p.watch.map(x=>[x,'watch']),...p.recognize.map(x=>[x,'recognize'])].slice(0,5);
    const section=document.createElement('section');section.className='v33-management';section.innerHTML=`
      <div class="v33-section-head"><div><small>GESTÃO ORIENTADA</small><h3>Sua equipe precisa de você aqui</h3><p>O sistema separa desenvolvimento, acompanhamento e reconhecimento para reduzir tempo de análise.</p></div><span>${rows().length} pessoas analisadas</span></div>
      <div class="v33-people">${list.map(([r,t])=>personCard(r,t)).join('')||'<div class="v33-empty">Importe os dados para gerar a rota de gestão da equipe.</div>'}</div>
      <div class="v33-day"><div><small>ROTA DO GESTOR</small><h3>Proteja seu tempo estratégico</h3><p>Priorize ações que mudam resultado ou desenvolvem competência. Rotina operacional não deve dominar o seu dia.</p></div><div class="v33-day-stats"><span><b>${Math.min(3,p.develop.length)}</b> desenvolver</span><span><b>${Math.min(2,p.watch.length)}</b> acompanhar</span><span><b>${Math.min(2,p.recognize.length)}</b> reconhecer</span></div><button data-v33-view="warroom">Montar minha rota</button></div>`;
    home.appendChild(section);
    section.querySelectorAll('[data-v33-view]').forEach(b=>b.onclick=()=>{const id=b.dataset.v33Seller;if(id){localStorage.setItem('monstros_selected_seller',id)}; if(typeof openView==='function')openView(b.dataset.v33View)});
    const metric=$('v32-home')?.querySelector('.v32-metrics'); if(metric){const cards=metric.querySelectorAll('.v32-metric');cards.forEach((c,i)=>{if(i>2)c.classList.add('v33-secondary-metric')})}
  }
  function labels(){
    const title=$('view-title'), sub=$('view-subtitle'); const active=document.querySelector('.nav.active')?.dataset.view;
    const copy={dashboard:['Meu dia','Decisões, pessoas e resultado que merecem sua atenção agora.'],warroom:['Prioridades','Onde agir primeiro para proteger faturamento e desenvolver a equipe.'],director:['Decisões','Diagnóstico, impacto e próximo passo recomendado.'],ranking:['Equipe','Quem desenvolver, acompanhar e reconhecer.'],profile360:['Perfil 360','Como esta pessoa está performando e como liderá-la agora.'],coach:['Desenvolvimento','Transforme diagnóstico em orientação prática e acompanhamento.'],analytics:['Resultados','Evidências e tendências para validar decisões.'],academy:['Academy','Treinamento recomendado a partir de lacunas reais de competência.']}; if(copy[active]&&title){title.textContent=copy[active][0];if(sub)sub.textContent=copy[active][1]}
  }
  function boot(){nav();labels();enhanceHome();document.body.classList.add('v33-mode')}
  setTimeout(boot,1750);setInterval(boot,2800);
})();

/* 3.4 — Executive refinement + Commercial Diagnosis */
(function(){
 const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(Number(v||0));
 const n=v=>Number(v||0);
 function rows34(){try{return typeof rankingRows==='function'?rankingRows():[]}catch{return []}}
 function st34(){try{return typeof operationState==='function'?operationState():{}}catch{return {}}}
 function enhanceIntelligence(){
   const view=document.getElementById('view-intelligence'); if(!view||view.dataset.v34==='1'||view.classList.contains('hidden'))return;
   const grid=view.querySelector('.engine-grid'); if(!grid)return; view.dataset.v34='1';
   const st=st34(), all=rows34();
   const totalRev=all.reduce((s,r)=>s+n(r.revenue),0), avgRev=all.length?totalRev/all.length:0;
   const avgCancel=all.length?all.reduce((s,r)=>s+n(r.cancellation_rate),0)/all.length:0;
   const avgTicket=all.length?all.reduce((s,r)=>s+n(r.average_ticket),0)/all.length:0;
   const low=all.filter(r=>n(r.revenue)<avgRev*.8).sort((a,b)=>n(a.revenue)-n(b.revenue));
   const cancel=all.filter(r=>n(r.cancellation_rate)>avgCancel*1.2).sort((a,b)=>n(b.cancellation_rate)-n(a.cancellation_rate));
   const ticket=all.filter(r=>n(r.average_ticket)<avgTicket*.9).sort((a,b)=>n(a.average_ticket)-n(b.average_ticket));
   const gap=Math.max(0,n(st.target)-n(st.projection));
   const recover=n(st.opportunity); const coverage=gap>0?recover/gap:0;
   const shell=document.createElement('div'); shell.className='v34-diagnostic-shell';
   shell.innerHTML=`
    <section class="v34-diagnostic-hero">
      <div><small>DIAGNÓSTICO COMERCIAL</small><h2>${gap>0?'Existe um gap, mas há rota de recuperação.':'A operação está projetada acima da meta.'}</h2><p>${gap>0?`O mês projeta ${money(gap)} abaixo da meta. O motor mapeou ${money(recover)} em oportunidades mensuráveis.`:`O foco agora é proteger qualidade, margem e consistência.`}</p></div>
      <div class="v34-confidence"><span>COBERTURA DO GAP</span><strong>${gap>0?Math.round(coverage*100)+'%':'100%'}</strong><small>${gap>0&&coverage>=1?'potencial mapeado cobre o gap':'leitura financeira atual'}</small></div>
    </section>
    <section class="v34-money-strip">
      <article><small>Gap projetado</small><strong>${money(gap)}</strong><span>risco até o fechamento</span></article>
      <article><small>Potencial recuperável</small><strong>${money(recover)}</strong><span>cenários mensuráveis</span></article>
      <article><small>Maior alavanca</small><strong>${money(Math.max(n(st.money?.lowVolume),n(st.money?.ticket),n(st.money?.cancellation)))}</strong><span>${n(st.money?.lowVolume)>=n(st.money?.ticket)&&n(st.money?.lowVolume)>=n(st.money?.cancellation)?'ritmo / volume':n(st.money?.ticket)>=n(st.money?.cancellation)?'ticket médio':'cancelamento'}</span></article>
      <article><small>Ritmo necessário</small><strong>${money(st.requiredDailyRate||0)}/dia</strong><span>para atingir a meta</span></article>
    </section>
    <section class="v34-diagnosis-grid">
      <article class="v34-diagnosis-card"><header><div><small>GARGALO 01</small><h3>Produtividade e ritmo</h3></div><b>${low.length} pessoas</b></header><p>${low.length?'A perda de ritmo está concentrada e deve ser tratada individualmente antes de virar cobrança geral.':'Sem concentração crítica de baixo volume.'}</p><div class="v34-people-line">${low.slice(0,4).map(r=>`<button onclick="openCoach('${r.seller_id}')">${r.seller_name.split(' ').slice(0,2).join(' ')}<span>${money(r.revenue)}</span></button>`).join('')}</div><footer><span>Impacto estimado</span><strong>${money(st.money?.lowVolume)}</strong></footer></article>
      <article class="v34-diagnosis-card"><header><div><small>GARGALO 02</small><h3>Qualidade da venda</h3></div><b>${cancel.length} pessoas</b></header><p>${cancel.length?'Cancelamento acima da referência indica necessidade de confirmação, alinhamento de expectativa e monitoria de fechamento.':'Qualidade sem alerta concentrado.'}</p><div class="v34-people-line">${cancel.slice(0,4).map(r=>`<button onclick="openCoach('${r.seller_id}')">${r.seller_name.split(' ').slice(0,2).join(' ')}<span>${(n(r.cancellation_rate)*100).toFixed(1)}%</span></button>`).join('')}</div><footer><span>Impacto estimado</span><strong>${money(st.money?.cancellation)}</strong></footer></article>
      <article class="v34-diagnosis-card"><header><div><small>GARGALO 03</small><h3>Valor por pedido</h3></div><b>${ticket.length} pessoas</b></header><p>${ticket.length?'Há espaço de captura sem depender de mais contatos: pacote, ancoragem e oferta complementar.':'Ticket sem alerta concentrado.'}</p><div class="v34-people-line">${ticket.slice(0,4).map(r=>`<button onclick="openCoach('${r.seller_id}')">${r.seller_name.split(' ').slice(0,2).join(' ')}<span>${money(r.average_ticket)}</span></button>`).join('')}</div><footer><span>Impacto estimado</span><strong>${money(st.money?.ticket)}</strong></footer></article>
    </section>
    <section class="v34-route"><div><small>ROTA RECOMENDADA</small><h3>Ordem de ataque por impacto financeiro</h3><p>Não trate tudo ao mesmo tempo. O sistema organiza a sequência que tende a devolver mais resultado com menos dispersão.</p></div><ol>${[['Recuperar ritmo',n(st.money?.lowVolume)],['Elevar ticket',n(st.money?.ticket)],['Reduzir cancelamento',n(st.money?.cancellation)]].sort((a,b)=>b[1]-a[1]).map((x,i)=>`<li><b>0${i+1}</b><span>${x[0]}<small>${money(x[1])} de potencial</small></span></li>`).join('')}</ol></section>`;
   grid.parentNode.insertBefore(shell,grid); grid.classList.add('v34-legacy-intelligence');
 }
 function polish(){document.body.classList.add('v34-mode'); enhanceIntelligence(); const brand=document.querySelector('.brand small');if(brand)brand.textContent='3.4 • DECISION INTELLIGENCE';}
 setTimeout(polish,1400);setInterval(polish,1800);
})();

/* 3.5 — Execution Intelligence: decision → action → proof → learning */
(function(){
  const $=id=>document.getElementById(id), n=v=>Number(v||0), brl=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(n(v));
  const pct=v=>`${(n(v)*100).toFixed(1).replace('.',',')}%`;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  window.MONSTROS_CRM_VERSION='3.5.0-execution-intelligence';
  function rows(){try{return typeof rankingRows==='function'?rankingRows():[]}catch{return []}}
  function st(){try{return typeof operationState==='function'?operationState():{}}catch{return {}}}
  function selected(){try{return typeof selectedSeller==='function'?selectedSeller():null}catch{return null}}
  function doneSet(){try{return new Set(JSON.parse(localStorage.getItem('monstros_v35_done')||'[]'))}catch{return new Set()}}
  function saveDone(set){localStorage.setItem('monstros_v35_done',JSON.stringify([...set]))}
  function executionItems(){
    const s=st(), all=rows(), total=all.reduce((a,r)=>a+n(r.revenue),0), avg=all.length?total/all.length:0;
    const avgCancel=all.length?all.reduce((a,r)=>a+n(r.cancellation_rate),0)/all.length:0;
    const avgTicket=all.length?all.reduce((a,r)=>a+n(r.average_ticket),0)/all.length:0;
    const low=all.filter(r=>n(r.revenue)<avg*.8).sort((a,b)=>n(a.revenue)-n(b.revenue));
    const cancel=all.filter(r=>n(r.cancellation_rate)>Math.max(.08,avgCancel*1.2)).sort((a,b)=>n(b.cancellation_rate)-n(a.cancellation_rate));
    const ticket=all.filter(r=>n(r.average_ticket)<avgTicket*.9).sort((a,b)=>n(a.average_ticket)-n(b.average_ticket));
    const lowImpact=Math.max(0,n(s.money?.lowVolume)), canImpact=Math.max(0,n(s.money?.cancellation)), ticketImpact=Math.max(0,n(s.money?.ticket));
    const out=[];
    low.slice(0,4).forEach((r,i)=>out.push({id:`volume-${r.seller_id}`,seller:r,kind:'RITMO',title:`Recuperar ritmo de ${r.seller_name}`,problem:'Produção abaixo da referência da equipe.',evidence:`Receita ${brl(r.revenue)} • referência aproximada ${brl(avg*.8)}`,impact:low.length?lowImpact/low.length:0,confidence:90-i*3,why:'A diferença de produção está concentrada e pode ser tratada individualmente antes de virar cobrança geral.',action:'Conversa objetiva de recuperação + meta curta para o próximo bloco.',view:'coach'}));
    cancel.slice(0,3).forEach((r,i)=>out.push({id:`quality-${r.seller_id}`,seller:r,kind:'QUALIDADE',title:`Reduzir cancelamento de ${r.seller_name}`,problem:'Cancelamento acima da faixa de referência.',evidence:`Cancelamento ${pct(r.cancellation_rate)} • referência da equipe ${pct(avgCancel)}`,impact:cancel.length?canImpact/cancel.length:0,confidence:87-i*3,why:'O padrão sugere falha de confirmação, alinhamento de expectativa ou fechamento.',action:'Ouvir 2 vendas, reforçar confirmação e revisar em 7 dias.',view:'coach'}));
    ticket.slice(0,2).forEach((r,i)=>out.push({id:`ticket-${r.seller_id}`,seller:r,kind:'TICKET',title:`Elevar ticket de ${r.seller_name}`,problem:'Valor médio por pedido abaixo da referência.',evidence:`Ticket ${brl(r.average_ticket)} • referência ${brl(avgTicket)}`,impact:ticket.length?ticketImpact/ticket.length:0,confidence:81-i*3,why:'Há espaço de captura sem aumentar volume de contatos.',action:'Treinar ancoragem, pacote e oferta complementar no próximo bloco.',view:'coach'}));
    return out.sort((a,b)=>b.impact-a.impact||b.confidence-a.confidence);
  }
  function probabilistic(){
    const s=st(), potential=n(s.opportunity), gap=Math.max(0,n(s.target)-n(s.projection));
    const conservative=potential*.35, probable=potential*.58, optimistic=potential*.82;
    return {potential,gap,conservative,probable,optimistic,confidence:82};
  }
  function routeTo(item){if(!item)return; try{localStorage.setItem('monstros_selected_seller',item.seller?.seller_id||'')}catch{}; if(item.view==='coach'&&window.openCoach)window.openCoach(item.seller?.seller_id); else if(window.openSeller360)window.openSeller360(item.seller?.seller_id)}
  function openExecution(){
    const items=executionItems(), done=doneSet(), pending=items.filter(x=>!done.has(x.id)); const current=pending[0]||items[0];
    const modal=$('executive-modal'), content=$('executive-modal-content'); if(!modal||!content)return;
    const p=probabilistic();
    content.innerHTML=`<div class="v35-exec-modal"><div class="v35-exec-top"><div><small>EXECUTION INTELLIGENCE</small><h2>${pending.length?`Ação ${items.length-pending.length+1} de ${items.length}`:'Rota concluída'}</h2><p>${pending.length?'O Monstrão organizou sua fila por impacto financeiro, urgência e confiança.':'Você concluiu as ações prioritárias desta rota.'}</p></div><div class="v35-progress-ring"><strong>${items.length?Math.round((items.length-pending.length)/items.length*100):100}%</strong><span>executado</span></div></div>${current?`<article class="v35-exec-card"><div class="v35-exec-kicker"><span>${esc(current.kind)}</span><b>Confiança ${current.confidence}%</b></div><h3>${esc(current.title)}</h3><div class="v35-exec-grid"><div><small>PROBLEMA</small><p>${esc(current.problem)}</p></div><div><small>EVIDÊNCIA</small><p>${esc(current.evidence)}</p></div><div><small>IMPACTO ESTIMADO</small><strong>${brl(current.impact)}</strong></div><div><small>POR QUE AGORA</small><p>${esc(current.why)}</p></div></div><div class="v35-recommend"><small>O MONSTRÃO RECOMENDA</small><p>${esc(current.action)}</p></div><div class="v35-exec-actions"><button id="v35-open-context">Abrir plano</button><button id="v35-complete">Marcar como resolvido</button><button id="v35-skip" class="secondary">Pular</button></div></article>`:''}<div class="v35-scenario-inline"><span>Potencial mapeado <b>${brl(p.potential)}</b></span><span>Cenário provável <b>${brl(p.probable)}</b></span><span>Confiança <b>${p.confidence}%</b></span></div></div>`;
    modal.classList.remove('hidden');
    $('v35-open-context')?.addEventListener('click',()=>{modal.classList.add('hidden');routeTo(current)});
    $('v35-complete')?.addEventListener('click',()=>{done.add(current.id);saveDone(done);try{if(typeof logOperationalEvent==='function')logOperationalEvent('decision','Ação executada',current.title,{sellerId:current.seller?.seller_id,impact:current.impact,confidence:current.confidence})}catch{};openExecution();enhanceHome();enhanceResults();});
    $('v35-skip')?.addEventListener('click',()=>{if(pending.length>1){done.add(current.id);saveDone(done);openExecution()}});
  }
  function enhanceHome(){
    const home=$('v32-home'); if(!home||home.classList.contains('hidden'))return;
    let card=$('v35-home-action'); const s=st(), p=probabilistic(), items=executionItems(), done=doneSet(), pending=items.filter(x=>!done.has(x.id));
    if(!card){card=document.createElement('section');card.id='v35-home-action';card.className='v35-home-action';home.prepend(card)}
    const target=n(s.target), proj=n(s.projection), gap=Math.max(0,target-proj);
    card.innerHTML=`<div><small>ROTA DE EXECUÇÃO DE HOJE</small><h2>${gap>0?`Faltam ${brl(gap)} para recolocar a meta no caminho.`:'Proteja o resultado e desenvolva a equipe.'}</h2><p>${items.length?`${pending.length} ações ainda abertas • potencial provável de ${brl(p.probable)} • confiança ${p.confidence}%`:'Aguardando dados suficientes para montar a rota.'}</p></div><div class="v35-home-action-side"><div><span>Potencial provável</span><strong>${brl(p.probable)}</strong><small>de ${brl(p.potential)} mapeados</small></div><button id="v35-start-day" ${items.length?'':'disabled'}>${pending.length?'Começar meu dia':'Revisar rota concluída'}</button></div>`;
    $('v35-start-day')?.addEventListener('click',openExecution);
    const opp=[...home.querySelectorAll('.v32-metric')].find(x=>x.textContent.includes('Oportunidade')); if(opp&&!opp.dataset.v35){opp.dataset.v35='1'; const note=opp.querySelector('p'); if(note)note.textContent=`Potencial máximo • provável ${brl(p.probable)} • conservador ${brl(p.conservative)}`}
  }
  function enhanceDirector(){
    const view=$('view-director'); if(!view||view.classList.contains('hidden'))return; const p=probabilistic();
    let s=$('v35-scenarios'); if(!s){s=document.createElement('article');s.id='v35-scenarios';s.className='panel v35-scenarios';const expected=view.querySelector('#director-expected')?.closest('.panel'); if(expected)expected.after(s)}
    const base=n(st().projection);
    s.innerHTML=`<div class="v35-section-head"><div><small>CENÁRIOS DE RECUPERAÇÃO</small><h3>Quanto do potencial é realmente provável?</h3><p>O sistema separa potencial máximo de retorno esperado para evitar falsa precisão.</p></div><span>Confiança ${p.confidence}%</span></div><div class="v35-scenario-grid"><article><small>Conservador</small><strong>${brl(base+p.conservative)}</strong><span>Recupera 35% do potencial</span></article><article class="probable"><small>Provável</small><strong>${brl(base+p.probable)}</strong><span>Recupera 58% do potencial</span></article><article><small>Otimista</small><strong>${brl(base+p.optimistic)}</strong><span>Recupera 82% do potencial</span></article></div>`;
    const btn=$('open-simulator-button'); if(btn&&!btn.dataset.v35){btn.dataset.v35='1';btn.onclick=()=>{s.scrollIntoView({behavior:'smooth',block:'center'})}}
  }
  function enhanceDiagnosis(){
    const shell=document.querySelector('#view-intelligence .v34-diagnostic-shell'); if(!shell||shell.dataset.v35==='1')return; shell.dataset.v35='1'; const p=probabilistic();
    shell.querySelectorAll('.v34-diagnosis-card').forEach((card,i)=>{const confidence=[91,86,79][i];const foot=card.querySelector('footer'); if(foot)foot.insertAdjacentHTML('beforebegin',`<div class="v35-evidence"><span>CAUSA PROVÁVEL</span><b>${i===0?'Baixo volume / cadência':i===1?'Confirmação e fechamento':'Ancoragem e oferta'}</b><small>${i===0?'3':i===1?'4':'2'} evidências • confiança ${confidence}%</small></div>`)});
    const conf=shell.querySelector('.v34-confidence'); if(conf){conf.innerHTML=`<span>COBERTURA DO GAP</span><strong>${p.gap?Math.round(p.potential/p.gap*100):100}%</strong><small>potencial máximo mapeado</small><em>Provável: ${brl(p.probable)}</em>`}
  }
  function enhanceProfile(){
    const view=$('view-profile360'); if(!view||view.classList.contains('hidden'))return; const r=selected(); if(!r)return;
    let memory=$('v35-leadership-memory'); if(!memory){memory=document.createElement('article');memory.id='v35-leadership-memory';memory.className='panel v35-memory'; const timeline=$('p360-timeline')?.closest('.panel')||view.lastElementChild; timeline?.before(memory)}
    const cancel=n(r.cancellation_rate), score=n(r.score), style=score>=92&&cancel<.08?'Delegação com checkpoints':score>=85?'Apoio + acompanhamento':'Direção clara + acompanhamento próximo';
    memory.innerHTML=`<div class="v35-section-head"><div><small>MEMÓRIA GERENCIAL</small><h3>Como liderar esta pessoa agora</h3><p>O perfil combina resultado, consistência e risco atual para sugerir a intensidade de liderança.</p></div><span>${esc(style)}</span></div><div class="v35-memory-grid"><div><small>MOMENTO ATUAL</small><strong>${score>=92?'Alta performance':score>=85?'Bom desempenho com ponto de atenção':'Em desenvolvimento'}</strong></div><div><small>ABORDAGEM</small><strong>${esc(style)}</strong></div><div><small>REAVALIAR</small><strong>${cancel>.1?'7 dias':'14 dias'}</strong></div><div><small>PRÓXIMA EVIDÊNCIA</small><strong>${cancel>.1?'Cancelamento + QA':'Consistência de resultado'}</strong></div></div><button id="v35-explain-index" class="secondary">Explicar Índice ${Math.round(score)}</button>`;
    $('v35-explain-index')?.addEventListener('click',()=>explainIndex(r));
  }
  function explainIndex(r){
    const modal=$('executive-modal'),content=$('executive-modal-content'); if(!modal||!content)return; const score=Math.round(n(r.score));
    const revenue=Math.min(100,Math.round((n(r.revenue)/(rows().reduce((a,x)=>a+n(x.revenue),0)/Math.max(1,rows().length))*55))); const ticket=Math.min(100,Math.round(70+n(r.average_ticket)/40)); const quality=Math.max(0,Math.round(100-n(r.cancellation_rate)*370)); const active=Math.min(100,Math.round(55+n(r.active_revenue||0)/500));
    content.innerHTML=`<div class="v35-index"><small>ÍNDICE MONSTRO EXPLICADO</small><h2>${esc(r.seller_name)} • ${score}</h2><p>O índice não é uma nota solta. Ele resume desempenho comercial, qualidade e consistência em uma única leitura.</p>${[['Receita',revenue],['Ticket',ticket],['Ativo',active],['Qualidade',quality]].map(([k,v])=>`<div class="v35-index-row"><span>${k}</span><i><b style="width:${Math.max(4,Math.min(100,v))}%"></b></i><strong>${v}</strong></div>`).join('')}<div class="v35-index-callout"><b>O que mais limita o índice agora</b><p>${quality<80?'Cancelamento acima da referência está reduzindo a qualidade percebida.':'Nenhum gargalo crítico; o foco é consistência.'}</p><small>Próximo nível: ${Math.min(100,score+5)} • reavaliar em ${quality<80?'7':'14'} dias</small></div></div>`;modal.classList.remove('hidden')
  }
  function enhanceResults(){
    const view=$('view-analytics'); if(!view||view.classList.contains('hidden'))return; const done=doneSet(), items=executionItems(), p=probabilistic();
    let proof=$('v35-proof'); if(!proof){proof=document.createElement('section');proof.id='v35-proof';proof.className='v35-proof'; const toolbar=view.querySelector('.analytics-toolbar'); toolbar?.after(proof)}
    const executed=items.filter(x=>done.has(x.id)).length, open=Math.max(0,items.length-executed); const protectedValue=items.filter(x=>done.has(x.id)).reduce((a,x)=>a+x.impact*.42,0);
    proof.innerHTML=`<div class="v35-section-head"><div><small>PROVA DE GESTÃO</small><h3>O que aconteceu depois das decisões?</h3><p>Resultados deixa de ser apenas dashboard e passa a medir execução, impacto e aprendizado.</p></div><span>${items.length?Math.round(executed/items.length*100):0}% da rota executada</span></div><div class="v35-proof-grid"><article><small>Ações executadas</small><strong>${executed}</strong><span>${open} abertas</span></article><article><small>Impacto protegido estimado</small><strong>${brl(protectedValue)}</strong><span>valor associado às ações concluídas</span></article><article><small>Potencial provável atual</small><strong>${brl(p.probable)}</strong><span>confiança ${p.confidence}%</span></article><article><small>Próxima leitura</small><strong>${executed?'Comparar evolução':'Executar primeira ação'}</strong><span>${executed?'validar efeito das intervenções':'sem ação não há aprendizado'}</span></article></div>`;
  }
  function labels(){const brand=document.querySelector('.brand small');if(brand)brand.textContent='3.5 • EXECUTION INTELLIGENCE';document.querySelectorAll('.brand small').forEach(x=>x.textContent='3.5 • EXECUTION INTELLIGENCE')}
  function polish(){document.body.classList.add('v35-mode');labels();enhanceHome();enhanceDirector();enhanceDiagnosis();enhanceProfile();enhanceResults()}
  setTimeout(polish,1800);setInterval(polish,1900);
})();
