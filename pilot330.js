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
