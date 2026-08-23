console.info('MONSTROS AI 3.0 - Simplificacao Operacional');

(function(){
  const byId=id=>document.getElementById(id);
  const n=v=>Number(v||0);
  const brl=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(n(v));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state=()=>{try{return typeof operationState==='function'?operationState():{}}catch{return {}}};
  const rows=()=>{try{return typeof rankingRows==='function'?rankingRows():[]}catch{return []}};
  const attention=row=>{try{return typeof sellerAttention==='function'?sellerAttention(row):[]}catch{return []}};

  function simplifyNavigation(){
    const labels={dashboard:'Hoje',ranking:'Equipe',profile360:'Vendedores',analytics:'Evolução',settings:'Administração'};
    const visible=new Set(Object.keys(labels));
    document.querySelectorAll('nav .nav[data-view]').forEach(btn=>{
      const view=btn.dataset.view;
      btn.classList.toggle('simplified-hidden',!visible.has(view));
      if(labels[view])btn.textContent=labels[view];
    });
  }

  function sellerLink(row,label,kind='coach'){
    if(!row)return '';
    return `<button class="simple-action secondary" data-simple-${kind}="${esc(row.seller_id)}">${esc(label)}</button>`;
  }

  function priorityCard({level='red',tag,title,why,person,impact,action,buttons=''}){
    return `<article class="simple-priority ${level}">
      <div class="simple-priority-number"></div>
      <div class="simple-priority-body">
        <span class="simple-tag">${esc(tag)}</span>
        <h4>${esc(title)}</h4>
        <p><b>Por quê:</b> ${esc(why)}</p>
        ${person?`<p><b>Começar por:</b> ${esc(person)}</p>`:''}
        ${impact>0?`<p class="simple-impact">Impacto estimado: aproximadamente ${brl(impact)}</p>`:'<p class="simple-development">Prioridade de desenvolvimento • sem impacto financeiro validado</p>'}
        <p><b>Ação:</b> ${esc(action)}</p>
        <div class="simple-actions">${buttons}</div>
      </div>
    </article>`;
  }

  function bindActions(root){
    root.querySelectorAll('[data-simple-coach]').forEach(b=>b.onclick=()=>window.openCoach?.(b.dataset.simpleCoach));
    root.querySelectorAll('[data-simple-profile]').forEach(b=>b.onclick=()=>window.openSeller360?.(b.dataset.simpleProfile));
    root.querySelectorAll('[data-simple-view]').forEach(b=>b.onclick=()=>window.navigateIntegrated?.(b.dataset.simpleView));
    root.querySelectorAll('[data-simple-mission]').forEach(b=>b.onclick=()=>{
      const id=b.dataset.simpleMission,row=rows().find(r=>String(r.seller_id)===String(id));
      window.prefillMissionFromContext?.({sellerId:id,title:`Plano de ação — ${row?.seller_name||'vendedor'}`,reason:'Prioridade definida no painel Hoje.',action:'Executar a ação recomendada e registrar evidências.',minutes:30,priority:'high'});
    });
  }

  function renderToday(){
    const host=byId('dashboard-content');
    if(!host||host.classList.contains('hidden'))return;
    let cockpit=byId('simple-cockpit');
    if(!cockpit){
      cockpit=document.createElement('div');cockpit.id='simple-cockpit';
      host.prepend(cockpit);
    }
    const st=state(),all=rows();
    const low=all.filter(r=>attention(r).some(x=>/baixo volume|abaixo do ritmo/i.test(x)));
    const cancel=all.filter(r=>attention(r).some(x=>/cancelamento/i.test(x)));
    const leader=[...all].sort((a,b)=>n(b.revenue)-n(a.revenue))[0];
    const bestIndex=[...all].sort((a,b)=>n(b.score)-n(a.score))[0];
    const lowImpact=n(st.money?.lowVolume);
    const cancelImpact=n(st.money?.cancellation);
    const gap=n(st.gap);
    const status=gap>0
      ? `A projeção está aproximadamente ${brl(gap)} abaixo da meta.`
      : `A projeção indica atingimento da meta.`;
    const mainCause=low.length
      ? `${low.length} vendedor(es) estão abaixo do ritmo esperado.`
      : cancel.length?`${cancel.length} vendedor(es) exigem atenção em cancelamento.`:'Nenhum desvio crítico foi encontrado.';
    const lowNames=low.slice(0,2).map(r=>r.seller_name).join(' e ');
    const cancelNames=cancel.slice(0,2).map(r=>r.seller_name).join(' e ');

    const cards=[];
    if(low.length)cards.push(priorityCard({
      level:'red',tag:'FAÇA HOJE',title:`Recuperar produtividade de ${low.length} vendedor(es)`,
      why:'o baixo volume é hoje a maior oportunidade mensurável da operação.',person:lowNames,impact:lowImpact,
      action:'revisar carteira, definir um bloco de vendas e acompanhar o próximo resultado.',
      buttons:sellerLink(low[0],'Abrir plano no Coach')+sellerLink(low[0],'Ver evidências','profile')
    }));
    if(cancel.length)cards.push(priorityCard({
      level:'yellow',tag:'PRÓXIMA AÇÃO',title:`Reduzir cancelamento de ${cancel.length} vendedor(es)`,
      why:'o indicador está acima do limite configurado.',person:cancelNames,impact:cancelImpact,
      action:'auditar pedidos e aplicar confirmação estruturada antes de criar uma missão.',
      buttons:sellerLink(cancel[0],'Abrir vendedor','profile')+sellerLink(cancel[0],'Gerar plano','coach')
    }));
    if(leader||bestIndex)cards.push(priorityCard({
      level:'green',tag:'RECONHECER',title:'Reforçar o comportamento que está funcionando',
      why:`${leader?.seller_name||bestIndex?.seller_name} lidera em faturamento${bestIndex&&leader?.seller_id!==bestIndex?.seller_id?` e ${bestIndex.seller_name} tem o melhor índice`:''}.`,
      impact:0,action:'reconhecer o resultado e compartilhar uma prática objetiva com a equipe.',
      buttons:sellerLink(leader||bestIndex,'Ver destaque','profile')
    }));

    cockpit.innerHTML=`
      <section class="simple-brief">
        <div><span class="simple-eyebrow">LEITURA DE AGORA</span><h3>${esc(status)}</h3><p>${esc(mainCause)}</p></div>
        <div class="simple-summary">
          <div><small>Realizado</small><strong>${brl(st.revenue)}</strong></div>
          <div><small>Projeção</small><strong>${brl(st.projection)}</strong></div>
          <div><small>Distância da meta</small><strong class="${gap>0?'bad':'good'}">${gap>0?brl(gap):'Meta projetada'}</strong></div>
        </div>
      </section>
      <section class="simple-today-head"><div><span class="simple-eyebrow">DECISÃO, NÃO SÓ NÚMERO</span><h3>O que fazer agora</h3><p>Prioridades ordenadas para agir sem precisar interpretar o painel inteiro.</p></div><button class="secondary" data-simple-view="monstrao">Perguntar ao Monstrão</button></section>
      <section class="simple-priority-list">${cards.slice(0,3).join('')||'<div class="panel"><h3>Nenhuma prioridade crítica.</h3><p>Use o tempo para acompanhar a equipe e reconhecer os destaques.</p></div>'}</section>
      <section class="simple-more"><button data-simple-view="warroom">Ver Sala de Guerra completa</button><button class="secondary" data-simple-view="director">Abrir análise executiva</button><button class="secondary" data-simple-view="calls">Revisar ligações</button></section>`;
    bindActions(cockpit);
  }

  function addSectionShortcuts(){
    const ranking=byId('view-ranking');
    if(ranking&&!byId('team-shortcuts'))ranking.insertAdjacentHTML('afterbegin','<div id="team-shortcuts" class="simple-shortcuts"><b>Equipe</b><span>Compare resultados e escolha quem precisa de ação.</span><button data-simple-view="intelligence">Ver diagnóstico da equipe</button><button class="secondary" data-simple-view="warroom">Ver prioridades</button></div>');
    const profile=byId('view-profile360');
    if(profile&&!byId('seller-shortcuts'))profile.insertAdjacentHTML('afterbegin','<div id="seller-shortcuts" class="simple-shortcuts"><b>Vendedor 360</b><span>Resultado, diagnóstico, plano, ligações e treinamento em um único fluxo.</span><button data-simple-view="coach">Abrir plano de ação</button><button class="secondary" data-simple-view="calls">Ver ligações</button><button class="secondary" data-simple-view="academy">Treinamentos</button></div>');
    const analytics=byId('view-analytics');
    if(analytics&&!byId('evolution-shortcuts'))analytics.insertAdjacentHTML('afterbegin','<div id="evolution-shortcuts" class="simple-shortcuts"><b>Evolução</b><span>Acompanhe se as decisões realmente produziram resultado.</span><button data-simple-view="timeline">Abrir histórico de decisões</button></div>');
    const settings=byId('view-settings');
    if(settings&&!byId('admin-shortcuts'))settings.insertAdjacentHTML('afterbegin','<div id="admin-shortcuts" class="simple-shortcuts"><b>Administração</b><span>Dados, metas, usuários e parâmetros do sistema.</span><button data-simple-view="import">Importar nova planilha</button></div>');
    document.querySelectorAll('.simple-shortcuts').forEach(bindActions);
  }

  const previousOpen=window.openView;
  if(typeof previousOpen==='function')window.openView=function(name){
    previousOpen(name);
    const titles={dashboard:['Hoje','Entenda e aja em menos de um minuto.'],ranking:['Equipe','Compare resultados e identifique onde agir.'],profile360:['Vendedores','Resultado, evidência e plano de ação.'],analytics:['Evolução','Veja se as decisões produziram resultado.'],settings:['Administração','Dados, metas, usuários e parâmetros.']};
    if(titles[name]){if(byId('view-title'))byId('view-title').textContent=titles[name][0];if(byId('view-subtitle'))byId('view-subtitle').textContent=titles[name][1];}
    setTimeout(()=>{simplifyNavigation();addSectionShortcuts();if(name==='dashboard')renderToday();},80);
  };

  let signature='';
  function boot(){
    simplifyNavigation();addSectionShortcuts();
    document.body.classList.add('simple-mode');
    const s=state(),next=[s.date,s.revenue,s.projection,s.opportunity,rows().length].join('|');
    if(next!==signature){signature=next;renderToday();}
  }
  setTimeout(boot,1400);
  setInterval(boot,2500);
})();
