console.info('MONSTROS AI 3.2 - Executive Experience');

(function(){
  const byId=id=>document.getElementById(id);
  const num=v=>Number(v||0);
  const clamp=(v,min=0,max=100)=>Math.min(max,Math.max(min,num(v)));
  const brl=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(num(v));
  const pctValue=v=>`${num(v).toFixed(1).replace('.',',')}%`;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const appState=()=>{try{return typeof operationState==='function'?operationState():{}}catch{return {}}};
  const sellerRows=()=>{try{return typeof rankingRows==='function'?rankingRows():[]}catch{return []}};
  const sellerTags=row=>{try{return typeof sellerAttention==='function'?sellerAttention(row):[]}catch{return []}};
  const sellerRiskTags=row=>{
    try{
      const dna=(dashboardPayload?.seller_dna||dashboardPayload?.engine?.seller_dna||[]).find(x=>x.seller_id===row.seller_id);
      if(Array.isArray(dna?.attention))return dna.attention;
    }catch{}
    return sellerTags(row).filter(x=>/baix[oa]|abaixo|cancelamento|risco|queda|atraso/i.test(x));
  };
  const coachData=row=>{try{return typeof coachMetrics==='function'?coachMetrics(row):{total:0,revenueGap:0,ticketGap:0,cancelLoss:0}}catch{return {total:0,revenueGap:0,ticketGap:0,cancelLoss:0}}};
  const selected=()=>{try{return typeof selectedSeller==='function'?selectedSeller():null}catch{return null}};
  const currentView=()=>localStorage.getItem('monstros_current_view')||document.querySelector('.nav.active')?.dataset.view||'dashboard';
  const currentSellerId=()=>selected()?.seller_id||localStorage.getItem('monstros_selected_seller')||'';
  const firstName=()=>((document.querySelector('#user-name')?.textContent||'Caio').trim().split(/\s+/)[0]||'Caio');

  window.MONSTROS_CRM_VERSION='3.2.0-executive-experience';

  const iconPaths={
    dashboard:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    warroom:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    director:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
    ranking:'<path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4"/>',
    profile360:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    coach:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M16 11h6"/>',
    calls:'<path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13v5a2 2 0 0 0 2 2h2v-8H6a2 2 0 0 0-2 2M20 13v5a2 2 0 0 1-2 2h-2v-8h2a2 2 0 0 1 2 2"/>',
    academy:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13Z"/><path d="M8 8h8M8 12h6"/>',
    intelligence:'<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
    analytics:'<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-7"/>',
    timeline:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    monstrao:'<rect x="4" y="7" width="16" height="12" rx="3"/><path d="M9 12h.01M15 12h.01M9 16h6M12 3v4"/>',
    import:'<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 21h14a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>'
  };
  const icon=view=>`<svg class="v32-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[view]||iconPaths.dashboard}</svg>`;

  const navigationGroups=[
    {id:'manage',label:'Gestão',views:[['dashboard','Visão geral'],['warroom','Prioridades'],['director','Decisões']]},
    {id:'people',label:'Pessoas',views:[['ranking','Equipe'],['profile360','Perfil 360'],['coach','Monster Coach']]},
    {id:'develop',label:'Desenvolvimento',views:[['calls','Ligações & QA'],['academy','Academy']]},
    {id:'analysis',label:'Inteligência',views:[['intelligence','Diagnóstico'],['analytics','Evolução'],['timeline','Timeline'],['monstrao','Monstrão']]},
    {id:'system',label:'Sistema',views:[['import','Importar dados'],['settings','Configurações']]}
  ];

  function buildNavigation(){
    const nav=document.querySelector('#app > aside nav');
    if(!nav||nav.dataset.v32==='1')return;
    const buttons=new Map([...nav.querySelectorAll('.nav[data-view]')].map(b=>[b.dataset.view,b]));
    nav.innerHTML='';
    navigationGroups.forEach((group,index)=>{
      const section=document.createElement('section');section.className='v32-nav-group';section.dataset.group=group.id;
      const toggle=document.createElement('button');toggle.type='button';toggle.className='v32-nav-toggle';toggle.setAttribute('aria-expanded',index===0?'true':'false');toggle.innerHTML=`<span>${esc(group.label)}</span><b>⌄</b>`;
      const list=document.createElement('div');list.className='v32-nav-list';
      group.views.forEach(([view,label])=>{
        const button=buttons.get(view);if(!button)return;
        button.classList.remove('feed-nav-hidden','simplified-hidden');
        button.innerHTML=`${icon(view)}<span>${esc(label)}</span>`;
        list.appendChild(button);
      });
      toggle.onclick=()=>{const expanded=toggle.getAttribute('aria-expanded')==='true';toggle.setAttribute('aria-expanded',String(!expanded));};
      section.append(toggle,list);nav.appendChild(section);
    });
    nav.dataset.v32='1';
    syncNavigation();
  }

  function syncNavigation(){
    const view=currentView();
    document.querySelectorAll('.v32-nav-group').forEach(group=>{
      const has=!!group.querySelector(`.nav[data-view="${view}"]`);
      if(has)group.querySelector('.v32-nav-toggle')?.setAttribute('aria-expanded','true');
    });
  }

  function inferredRisks(){
    const rows=sellerRows();if(!rows.length)return [];
    const avgRevenue=rows.reduce((s,r)=>s+num(r.revenue),0)/rows.length;
    const cancelValues=rows.map(r=>num(r.cancellation_rate)).filter(v=>Number.isFinite(v));
    const avgCancel=cancelValues.length?cancelValues.reduce((s,v)=>s+v,0)/cancelValues.length:0;
    let configuredLimit=.08;
    try{configuredLimit=num(dashboardPayload?.engine?.settings?.cancellation_limit||dashboardPayload?.cancellation_limit||.08)}catch{}
    if(configuredLimit>1)configuredLimit/=100;
    return rows.filter(row=>{
      const tags=sellerRiskTags(row).join(' ');
      const numericRisk=num(row.revenue)<avgRevenue*.72||num(row.cancellation_rate)>Math.max(configuredLimit,avgCancel*1.25);
      return /baix[oa]|abaixo|cancelamento|risco|queda|atraso/i.test(tags)||numericRisk;
    }).sort((a,b)=>coachData(b).total-coachData(a).total);
  }

  try{window.operationalRisks=inferredRisks}catch{}

  function decisions(){
    const st=appState(),rows=sellerRows(),risks=inferredRisks();
    const avgRevenue=rows.length?rows.reduce((s,r)=>s+num(r.revenue),0)/rows.length:0;
    let configuredLimit=.08;
    try{configuredLimit=num(dashboardPayload?.engine?.settings?.cancellation_limit||dashboardPayload?.cancellation_limit||.08)}catch{}
    if(configuredLimit>1)configuredLimit/=100;
    const low=risks.filter(r=>/baix[oa]|abaixo|ritmo insuficiente|volume insuficiente/i.test(sellerRiskTags(r).join(' '))||num(r.revenue)<avgRevenue*.72);
    const cancel=risks.filter(r=>/cancelamento (alto|elevado|em atenção)|risco.*cancelamento/i.test(sellerRiskTags(r).join(' '))||num(r.cancellation_rate)>Math.max(configuredLimit,num(st.cancellation)*1.15));
    const leader=[...rows].sort((a,b)=>num(b.revenue)-num(a.revenue))[0];
    const items=[];
    if(low.length){
      const impact=num(st.money?.lowVolume)||low.reduce((s,r)=>s+Math.max(0,avgRevenue-num(r.revenue)),0);
      items.push({kind:'critical',label:'FAÇA HOJE',title:`Recuperar o ritmo de ${low.length} vendedor(es)`,reason:`O baixo volume concentra a maior oportunidade mensurável da operação. Comece por ${low.slice(0,2).map(r=>r.seller_name).join(' e ')}.`,impact,sellerId:low[0].seller_id,action:'Abrir plano no Coach',view:'coach',confidence:88});
    }
    if(cancel.length){
      const first=cancel[0],impact=num(st.money?.cancellation)||cancel.reduce((s,r)=>s+coachData(r).cancelLoss,0);
      items.push({kind:'warning',label:'PRÓXIMA AÇÃO',title:`Reduzir cancelamento de ${cancel.length} vendedor(es)`,reason:`O indicador está acima da referência. Audite confirmações e fechamento antes do próximo bloco.`,impact,sellerId:first.seller_id,action:'Ver evidências',view:'profile360',confidence:84});
    }
    if(num(st.money?.ticket)>0){
      items.push({kind:'info',label:'OPORTUNIDADE',title:'Elevar o valor médio por pedido',reason:'O ticket atual ainda deixa potencial capturável sem depender de mais volume de contatos.',impact:num(st.money.ticket),sellerId:risks[0]?.seller_id||leader?.seller_id,action:'Abrir diagnóstico',view:'intelligence',confidence:80});
    }
    if(leader){
      items.push({kind:'positive',label:'RECONHECER',title:`Replicar a prática de ${leader.seller_name}`,reason:`A liderança atual em faturamento é uma evidência concreta para reconhecimento e compartilhamento de uma boa prática.`,impact:0,sellerId:leader.seller_id,action:'Ver destaque',view:'profile360',confidence:92});
    }
    const ranked=items.sort((a,b)=>{
      const rank={critical:4,warning:3,info:2,positive:1};
      return (rank[b.kind]-rank[a.kind])||(num(b.impact)-num(a.impact));
    });
    const financial=ranked.filter(x=>x.impact>0).slice(0,3);
    const recognition=ranked.find(x=>x.kind==='positive');
    return [...financial,...(recognition?[recognition]:[])].slice(0,3);
  }

  function bindActions(root){
    if(!root)return;
    root.querySelectorAll('[data-v32-view]').forEach(b=>b.onclick=()=>window.navigateIntegrated?.(b.dataset.v32View));
    root.querySelectorAll('[data-v32-coach]').forEach(b=>b.onclick=()=>window.openCoach?.(b.dataset.v32Coach));
    root.querySelectorAll('[data-v32-profile]').forEach(b=>b.onclick=()=>window.openSeller360?.(b.dataset.v32Profile));
    root.querySelectorAll('[data-v32-action]').forEach(b=>b.onclick=()=>{
      const item=decisions()[Number(b.dataset.v32Action)];if(!item)return;
      if(item.view==='coach'&&item.sellerId)window.openCoach?.(item.sellerId);
      else if(item.view==='profile360'&&item.sellerId)window.openSeller360?.(item.sellerId);
      else window.navigateIntegrated?.(item.view||'warroom',{sellerId:item.sellerId});
    });
  }

  function metricCard(iconText,label,value,note,tone='blue'){
    return `<article class="v32-metric ${tone}"><span class="v32-metric-icon">${iconText}</span><div><small>${esc(label)}</small><strong>${esc(value)}</strong><p>${esc(note)}</p></div></article>`;
  }

  function renderHome(){
    const host=byId('dashboard-content');if(!host||host.classList.contains('hidden'))return;
    let shell=byId('v32-home');if(!shell){shell=document.createElement('div');shell.id='v32-home';host.prepend(shell)}
    const st=appState(),rows=sellerRows(),items=decisions(),primary=items.find(x=>x.impact>0)||items[0],primaryIndex=Math.max(0,items.indexOf(primary));
    const target=num(st.target),revenue=num(st.revenue),projection=num(st.projection),gap=Math.max(0,target-projection);
    const attainment=target?clamp(revenue/target*100):0,projected=target?clamp(projection/target*100,0,130):0;
    const costs=[['Baixo volume',num(st.money?.lowVolume),'#ff5260'],['Ticket',num(st.money?.ticket),'#5ba5ff'],['Cancelamento',num(st.money?.cancellation),'#fbbf24']];
    const rawCostTotal=costs.reduce((s,x)=>s+x[1],0),costTotal=Math.max(1,rawCostTotal);
    const risks=inferredRisks(),leaders=[...rows].sort((a,b)=>num(b.score)-num(a.score));
    const strong=leaders.filter(r=>num(r.score)>=90&&!risks.some(x=>x.seller_id===r.seller_id)).length;
    const stable=Math.max(0,rows.length-risks.length-strong);
    const dataDate=st.date?new Date(`${st.date}T12:00:00`).toLocaleDateString('pt-BR'):'sem importação';
    const situation=target?(projection>=target?`A projeção está ${brl(projection-target)} acima da meta.`:`A projeção está ${brl(gap)} abaixo da meta.`):'Cadastre a meta para ativar a leitura completa.';

    shell.innerHTML=`
      <section class="v32-home-hero">
        <div class="v32-hero-copy"><span class="v32-eyebrow">VISÃO EXECUTIVA • ${esc(dataDate)}</span><h2>${new Date().getHours()<12?'Bom dia':new Date().getHours()<18?'Boa tarde':'Boa noite'}, ${esc(firstName())}.</h2><p>${esc(situation)}</p><div class="v32-hero-actions"><button data-v32-view="warroom">Abrir prioridades</button><button class="secondary" data-v32-view="director">Ver diagnóstico completo</button></div></div>
        <div class="v32-goal-visual"><div class="v32-ring" style="--ring:${(attainment*3.6).toFixed(1)}deg"><div><strong>${pctValue(attainment)}</strong><span>realizado</span></div></div><div class="v32-goal-copy"><small>PROJEÇÃO DO MÊS</small><strong>${brl(projection)}</strong><span>${pctValue(projected)} da meta • ${num(st.remainingDays)} dias úteis restantes</span></div></div>
      </section>

      <section class="v32-metrics">
        ${metricCard('R$','Faturamento',brl(revenue),target?`${pctValue(attainment)} da meta`:'Meta não definida','blue')}
        ${metricCard('↗','Projeção',brl(projection),gap?`Gap projetado de ${brl(gap)}`:'Meta projetada','violet')}
        ${metricCard('◇','Oportunidade',brl(st.opportunity),'Estimativa recuperável mapeada','green')}
        ${metricCard('M','Índice Monstro',String(Math.round(num(st.monsterIndex))),st.healthStatus||'Leitura da operação','amber')}
      </section>

      <section class="v32-home-grid">
        <article class="v32-primary-decision ${primary?.kind||'info'}">
          <div class="v32-decision-head"><span>${esc(primary?.label||'PRÓXIMA DECISÃO')}</span><em>Confiança ${primary?.confidence||80}%</em></div>
          <h3>${esc(primary?.title||'Acompanhar a evolução da operação')}</h3>
          <p>${esc(primary?.reason||'Os indicadores atuais não mostram uma ação crítica. Preserve o ritmo e acompanhe a próxima atualização.')}</p>
          <div class="v32-decision-proof"><div><small>Impacto estimado</small><strong>${primary?.impact?brl(primary.impact):'Desenvolvimento'}</strong></div><div><small>Base da recomendação</small><strong>Dados da operação</strong></div><div><small>Prazo</small><strong>${primary?.kind==='critical'?'Hoje':'Próximo ciclo'}</strong></div></div>
          <div class="v32-decision-actions"><button data-v32-action="${primaryIndex}">${esc(primary?.action||'Ver prioridade')}</button><button class="secondary" data-v32-view="warroom">Ver fila completa</button></div>
        </article>

        <article class="v32-visual-card"><header><div><small>ONDE ESTÁ O DINHEIRO</small><h3>Composição da oportunidade</h3></div><strong>${brl(st.opportunity)}</strong></header><div class="v32-opportunity"><div class="v32-donut${rawCostTotal?'':' empty'}" style="--a:${costs[0][1]/costTotal*100}%;--b:${(costs[0][1]+costs[1][1])/costTotal*100}%"><span>${Math.round(costs[0][1]/costTotal*100)}%</span></div><div class="v32-legend">${costs.map(c=>`<div><i style="background:${c[2]}"></i><span>${esc(c[0])}</span><b>${brl(c[1])}</b></div>`).join('')}</div></div></article>

        <article class="v32-team-card"><header><div><small>LEITURA DA EQUIPE</small><h3>${rows.length} vendedores analisados</h3></div><button class="v32-text-button" data-v32-view="ranking">Ver equipe</button></header><div class="v32-team-stack"><i class="risk" style="width:${rows.length?risks.length/rows.length*100:0}%"></i><i class="stable" style="width:${rows.length?stable/rows.length*100:0}%"></i><i class="strong" style="width:${rows.length?strong/rows.length*100:0}%"></i></div><div class="v32-team-legend"><span><i class="risk"></i><b>${risks.length}</b> em atenção</span><span><i class="stable"></i><b>${stable}</b> estáveis</span><span><i class="strong"></i><b>${strong}</b> destaques</span></div></article>
      </section>

      <section class="v32-decision-queue"><div class="v32-section-heading"><div><span class="v32-eyebrow">MOTOR DE DECISÃO</span><h3>O que fazer agora</h3><p>Ordem definida por impacto, urgência e evidência disponível.</p></div><button class="secondary" data-v32-view="monstrao">Perguntar ao Monstrão</button></div><div class="v32-decision-cards">${items.map((item,index)=>`<article class="${item.kind}"><span>${esc(item.label)}</span><h4>${esc(item.title)}</h4><p>${esc(item.reason)}</p><footer><b>${item.impact?brl(item.impact):'Sem impacto financeiro'}</b><button data-v32-action="${index}">${esc(item.action)}</button></footer></article>`).join('')||'<article class="positive"><span>OPERAÇÃO ESTÁVEL</span><h4>Nenhuma ação crítica agora</h4><p>Acompanhe a equipe e reconheça a melhor prática do ciclo.</p></article>'}</div></section>`;
    bindActions(shell);
  }

  function updateScope(){
    const strip=byId('pilot-context-strip');if(!strip)return;
    const view=currentView(),row=selected(),collective=new Set(['dashboard','ranking','intelligence','warroom','director','analytics','timeline']);
    const irrelevant=new Set(['import','settings']);
    strip.classList.toggle('v32-scope-hidden',irrelevant.has(view));
    if(irrelevant.has(view))return;
    const title=byId('pilot-context-title'),meta=byId('pilot-context-meta'),label=strip.querySelector('small');
    if(collective.has(view)){
      if(label)label.textContent='ESCOPO DA TELA';
      if(title)title.textContent='EQUIPE MONSTROS';
      if(meta)meta.textContent=row?`${row.seller_name} está selecionado apenas para ações individuais`:'Indicadores consolidados da equipe';
    }else{
      if(label)label.textContent='VENDEDOR EM ANÁLISE';
      if(title)title.textContent=row?.seller_name||'Selecione um vendedor';
      if(meta)meta.textContent=row?`Índice ${Math.round(num(row.score))} • Receita ${brl(row.revenue)} • Ticket ${brl(row.average_ticket)}`:'Escolha um vendedor no Ranking para carregar o contexto';
    }
  }

  function installSystemStatus(){
    const header=document.querySelector('#app main > header');if(!header)return;
    let status=byId('v32-system-status');if(!status){status=document.createElement('div');status.id='v32-system-status';header.querySelector('div')?.appendChild(status)}
    const st=appState();
    status.innerHTML=`<span class="${st.date?'online':'waiting'}"></span><b>${st.date?'Dados conectados':'Aguardando importação'}</b>${st.date?`<small>Atualizado em ${new Date(`${st.date}T12:00:00`).toLocaleDateString('pt-BR')}</small>`:''}`;
    const banner=document.querySelector('.pilot-trust-banner');if(banner)banner.classList.add('v32-banner-collapsed');
  }

  function ensureProfileContext(){
    if(currentView()!=='profile360')return;
    const id=currentSellerId();if(!id)return;
    try{if(typeof renderProfile360Pilot==='function')renderProfile360Pilot(id)}catch(e){console.warn('Perfil 360:',e)}
  }

  function enhanceRanking(){
    const panel=byId('view-ranking')?.querySelector('.panel');if(!panel||byId('v32-ranking-toolbar'))return;
    const rows=sellerRows();
    const toolbar=document.createElement('div');toolbar.id='v32-ranking-toolbar';toolbar.innerHTML=`<div class="v32-table-search">${icon('ranking')}<input id="v32-ranking-search" placeholder="Buscar vendedor" aria-label="Buscar vendedor"></div><div class="v32-ranking-summary"><span><b>${rows.length}</b> vendedores</span><span><b>${inferredRisks().length}</b> em atenção</span></div>`;
    panel.querySelector('.table-wrap')?.before(toolbar);
    byId('v32-ranking-search').oninput=e=>{const q=e.target.value.trim().toUpperCase();byId('ranking-body')?.querySelectorAll('tr').forEach(tr=>tr.classList.toggle('v32-row-hidden',q&&!tr.textContent.toUpperCase().includes(q)))};
    decorateRankingRows();
  }

  function decorateRankingRows(){
    const body=byId('ranking-body');if(!body)return;
    const rows=[...sellerRows()].sort((a,b)=>{
      try{return rankingMode==='monster'?num(b.score)-num(a.score):num(b.revenue)-num(a.revenue)}catch{return num(b.revenue)-num(a.revenue)}
    }),maxRevenue=Math.max(1,...rows.map(r=>num(r.revenue)));
    [...body.querySelectorAll('tr')].forEach((tr,index)=>{
      const cells=tr.children;if(cells.length<6||tr.dataset.v32==='1')return;tr.dataset.v32='1';
      const row=rows[index];if(!row)return;
      cells[3].insertAdjacentHTML('beforeend',`<i class="v32-cell-bar" style="--value:${clamp(num(row.revenue)/maxRevenue*100)}%"></i>`);
      cells[2].style.setProperty('--score',`${clamp(row.score)}%`);
    });
  }

  function historyCount(){
    const fromDom=[...document.querySelectorAll('#view-analytics .mini-chart small')].map(x=>num((x.textContent.match(/\d+/)||[])[0])).reduce((m,v)=>Math.max(m,v),0);
    let snapshots=0;try{snapshots=JSON.parse(localStorage.getItem('monstros_analytics_snapshots')||'[]').length}catch{}
    return Math.max(fromDom,snapshots);
  }

  function gauge(el,value,max,display,note,tone='blue',reverse=false){
    if(!el)return;const ratio=max?clamp(value/max*100):0;const effective=reverse?clamp(100-ratio):ratio;
    el.innerHTML=`<div class="v32-gauge-value"><strong>${esc(display)}</strong><span>${esc(note)}</span></div><div class="v32-gauge"><i class="${tone}" style="width:${effective}%"></i></div>`;
  }

  function enhanceAnalytics(){
    const view=byId('view-analytics');if(!view)return;
    const toolbar=view.querySelector('.analytics-toolbar');let note=byId('v32-analytics-note');
    const count=historyCount();
    if(!note&&toolbar){note=document.createElement('div');note.id='v32-analytics-note';toolbar.after(note)}
    if(note)note.innerHTML=count<3?`<span>!</span><div><b>Histórico em formação</b><p>Há ${count||1} leitura(s). Tendências só serão apresentadas após pelo menos 3 importações comparáveis.</p></div>`:`<span>✓</span><div><b>Histórico confiável para tendência</b><p>${count} leituras disponíveis para comparação.</p></div>`;
    const st=appState();
    if(count<3){
      gauge(byId('chart-revenue'),st.revenue,st.target||st.revenue,brl(st.revenue),st.target?`${pctValue(num(st.attainment)*100)} da meta`:'Meta não definida','blue');
      gauge(byId('chart-index'),st.monsterIndex,100,String(Math.round(num(st.monsterIndex))),'de 100 pontos','violet');
      let targetTicket=1200;try{targetTicket=num(dashboardPayload?.target_ticket||dashboardPayload?.engine?.settings?.target_ticket||1200)}catch{}
      gauge(byId('chart-ticket'),st.ticket,targetTicket,brl(st.ticket),`Meta ${brl(targetTicket)}`,'green');
      gauge(byId('chart-cancel'),st.cancellation,.15,pctValue(num(st.cancellation)*100),'Quanto menor, melhor','red',true);
      const conversion=byId('chart-conversion');if(conversion&&!num(st.conversion))conversion.innerHTML='<div class="chart-empty">Conversão ainda não importada<small>O gráfico será ativado quando o relatório de conversão estiver disponível.</small></div>';
    }
    view.querySelectorAll('.analytics-period').forEach(button=>{
      if(button.dataset.period!=='current'&&count<3){button.disabled=true;button.title='Disponível após pelo menos 3 importações comparáveis';}
    });
    const riskTitle=byId('analytics-bottom')?.closest('.panel')?.querySelector('h3');if(riskTitle)riskTitle.textContent='Maiores oportunidades de desenvolvimento';
  }

  function fixWarRoom(){
    const kpis=byId('warroom-kpis');if(!kpis)return;
    const st=appState(),risks=inferredRisks(),items=decisions().filter(x=>x.impact>0),cards=[...kpis.children];
    const values=[['Oportunidade',brl(st.opportunity)],['Prioridades financeiras',String(items.length)],['Vendedores em atenção',String(risks.length)],['Projeção',brl(st.projection)],['Atingimento projetado',st.target?pctValue(num(st.projectedAttainment)*100):'—']];
    cards.forEach((card,index)=>{const data=values[index];if(!data)return;const small=card.querySelector('small'),strong=card.querySelector('strong');if(small)small.textContent=data[0];if(strong)strong.textContent=data[1];if(index===4)card.title='Projeção dividida pela meta. Não representa probabilidade estatística.';});
    let note=byId('v32-war-note');if(!note){note=document.createElement('div');note.id='v32-war-note';kpis.before(note)}
    note.innerHTML='<b>Mesma fila, uma única verdade.</b><span>As prioridades abaixo são as mesmas usadas na Visão Geral e no Monster Director.</span>';
  }

  function fixDirector(){
    const text=byId('director-briefing-text');if(!text)return;
    const st=appState(),items=decisions(),primary=items.find(x=>x.impact>0)||items[0];
    const gap=Math.max(0,num(st.target)-num(st.projection));
    text.innerHTML=`<b>Situação</b><span>${st.projection>=st.target?`Projeção ${brl(st.projection-st.target)} acima da meta.`:`Projeção ${brl(gap)} abaixo da meta.`}</span><b>Oportunidade</b><span>${brl(st.opportunity)} mapeados em cenários recuperáveis.</span><b>Causa principal</b><span>${inferredRisks().length} vendedor(es) exigem atenção pelos indicadores atuais.</span>${primary?`<b>Ação nº 1</b><span>${esc(primary.title)}${primary.impact?`, com impacto estimado de ${brl(primary.impact)}.`:'.'}</span>`:''}<b>Ritmo</b><span>${brl(st.dailyRate)}/dia atual e ${brl(st.requiredDailyRate)}/dia necessário.</span>`;
    const host=byId('director-priorities');if(host&&items.length){host.innerHTML=items.map((item,index)=>`<article class="v32-director-priority ${item.kind}"><span>${index+1}</span><div><small>${esc(item.label)}</small><h4>${esc(item.title)}</h4><p>${esc(item.reason)}</p><footer><b>${item.impact?`Impacto estimado ${brl(item.impact)}`:'Prioridade de desenvolvimento'}</b><button data-v32-action="${index}">${esc(item.action)}</button></footer></div></article>`).join('');bindActions(host)}
  }

  function polishMonstrao(){
    const box=byId('chat-box');if(!box)return;
    let guide=byId('v32-chat-guide');if(!guide){guide=document.createElement('div');guide.id='v32-chat-guide';guide.innerHTML='<span>Use o Monstrão para decidir</span><b>Ele responde com dados, evidência e um próximo passo executável.</b>';box.before(guide)}
    const quick=box.closest('.monstrao-layout')?.querySelector('.quick-questions');if(quick)quick.classList.add('v32-quick-grid');
  }

  function polishSettings(){
    const role=(byId('user-role')?.textContent||'').toLowerCase();
    const claim=byId('claim-admin-button');if(claim&&role.includes('admin')){claim.classList.add('v32-admin-complete');claim.disabled=true;claim.textContent='Administrador já ativado';}
  }

  function afterView(name=currentView()){
    document.body.classList.add('v32-mode');
    syncNavigation();updateScope();installSystemStatus();
    if(name==='dashboard')renderHome();
    if(name==='ranking'){enhanceRanking();decorateRankingRows()}
    if(name==='profile360')ensureProfileContext();
    if(name==='analytics')setTimeout(enhanceAnalytics,60);
    if(name==='warroom')setTimeout(fixWarRoom,100);
    if(name==='director')setTimeout(fixDirector,100);
    if(name==='monstrao')polishMonstrao();
    if(name==='settings')polishSettings();
  }

  const previousOpen=window.openView;
  if(typeof previousOpen==='function')window.openView=function(name){const result=previousOpen.apply(this,arguments);setTimeout(()=>afterView(name),130);return result};
  const previousNavigate=window.navigateIntegrated;
  if(typeof previousNavigate==='function')window.navigateIntegrated=function(name,options){const result=previousNavigate.apply(this,arguments);setTimeout(()=>afterView(name),160);return result};
  const previousLoad=window.loadDashboard;
  if(typeof previousLoad==='function')window.loadDashboard=async function(){const result=await previousLoad.apply(this,arguments);setTimeout(()=>afterView(currentView()),100);return result};

  let signature='';
  function boot(){
    buildNavigation();
    const brandVersion=document.querySelector('.brand small'),role=(byId('user-role')?.textContent||'').toLowerCase();
    if(brandVersion)brandVersion.textContent=/seller|operator|vendedor/.test(role)?'3.2 • EXPERIÊNCIA DO VENDEDOR':'3.2 • GESTÃO INTELIGENTE';
    const st=appState(),next=[st.date,st.revenue,st.projection,st.opportunity,st.monsterIndex,sellerRows().length,currentView(),currentSellerId()].join('|');
    if(next!==signature){signature=next;afterView(currentView())}
  }
  setTimeout(boot,1500);setInterval(boot,2600);
})();
