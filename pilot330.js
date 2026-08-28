console.info('MONSTROS AI 3.3 - Visual & Decision Refinement');
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
