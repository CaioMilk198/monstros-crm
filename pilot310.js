console.info('MONSTROS AI 3.1 - Feed Operacional');

(function(){
  const id=x=>document.getElementById(x);
  const n=v=>Number(v||0);
  const cash=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(n(v));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state=()=>{try{return operationState?.()||{}}catch{return {}}};
  const rows=()=>{try{return rankingRows?.()||[]}catch{return []}};
  const attention=r=>{try{return sellerAttention?.(r)||[]}catch{return []}};

  function nav(){
    const items={dashboard:['⌂','Início'],ranking:['♟','Equipe'],profile360:['♙','Vendedores'],analytics:['↗','Evolução'],settings:['⚙','Administração']};
    document.querySelectorAll('nav .nav[data-view]').forEach(b=>{
      const item=items[b.dataset.view];
      b.classList.toggle('feed-nav-hidden',!item);
      if(item)b.innerHTML=`<span class="feed-nav-icon">${item[0]}</span><span>${item[1]}</span>`;
    });
  }

  function topbar(){
    const main=document.querySelector('#app main'); if(!main||id('social-topbar'))return;
    const bar=document.createElement('div');bar.id='social-topbar';bar.innerHTML=`
      <div class="social-search"><span>⌕</span><input id="seller-global-search" list="seller-search-list" placeholder="Buscar vendedor" aria-label="Buscar vendedor"><datalist id="seller-search-list"></datalist></div>
      <div class="social-top-actions"><span id="data-freshness">Dados conectados</span><button id="feed-notifications" class="social-icon-button" title="Ações pendentes">♢<b id="notification-count">0</b></button><button class="social-avatar" title="Meu perfil">CO</button></div>`;
    main.prepend(bar);
    const search=id('seller-global-search');
    search.addEventListener('focus',fillSearch);
    search.addEventListener('change',()=>{
      const row=rows().find(r=>String(r.seller_name).toUpperCase()===search.value.trim().toUpperCase());
      if(row)window.openSeller360?.(row.seller_id);
    });
    id('feed-notifications').onclick=()=>window.navigateIntegrated?.('dashboard');
  }

  function fillSearch(){
    const list=id('seller-search-list');if(!list)return;
    list.innerHTML=rows().map(r=>`<option value="${esc(r.seller_name)}">`).join('');
  }

  function avatar(name){return String(name||'Equipe').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()}
  function btn(label,attr,value,secondary=false){return `<button class="feed-action ${secondary?'secondary':''}" ${attr}="${esc(value)}">${esc(label)}</button>`}

  function post({type='info',category='follow',icon='M',author='Monstros AI',time='Agora',title,text,meta=[],primary='',secondary='',evidence=''}){
    return `<article class="feed-post ${type}" data-feed-category="${category}">
      <header class="feed-post-head"><div class="post-avatar ${type}">${esc(icon)}</div><div><b>${esc(author)}</b><span>${esc(time)} • Dados da operação</span></div><button class="post-more" title="Mais opções">•••</button></header>
      <div class="feed-post-body"><span class="post-label">${type==='danger'?'PRIORIDADE':type==='success'?'DESTAQUE':type==='warning'?'ACOMPANHAMENTO':'ATUALIZAÇÃO'}</span><h3>${esc(title)}</h3><p>${esc(text)}</p>
      ${meta.length?`<div class="post-metrics">${meta.map(m=>`<div><small>${esc(m[0])}</small><strong>${esc(m[1])}</strong></div>`).join('')}</div>`:''}
      ${evidence?`<details><summary>Entender esta recomendação</summary><p>${esc(evidence)}</p></details>`:''}</div>
      <footer class="feed-post-actions">${primary}${secondary}<button class="feed-link" data-feed-save>Salvar</button></footer>
    </article>`;
  }

  function bind(root){
    root.querySelectorAll('[data-feed-profile]').forEach(b=>b.onclick=()=>window.openSeller360?.(b.dataset.feedProfile));
    root.querySelectorAll('[data-feed-coach]').forEach(b=>b.onclick=()=>window.openCoach?.(b.dataset.feedCoach));
    root.querySelectorAll('[data-feed-view]').forEach(b=>b.onclick=()=>window.navigateIntegrated?.(b.dataset.feedView));
    root.querySelectorAll('[data-feed-save]').forEach(b=>b.onclick=()=>{b.textContent=b.textContent==='Salvo ✓'?'Salvar':'Salvo ✓';b.classList.toggle('saved')});
    root.querySelectorAll('[data-feed-filter]').forEach(b=>b.onclick=()=>{
      root.querySelectorAll('[data-feed-filter]').forEach(x=>x.classList.toggle('active',x===b));
      const f=b.dataset.feedFilter;
      root.querySelectorAll('.feed-post').forEach(p=>p.classList.toggle('feed-filtered',f!=='all'&&p.dataset.feedCategory!==f));
    });
  }

  function renderFeed(){
    const host=id('dashboard-content');if(!host||host.classList.contains('hidden'))return;
    id('simple-cockpit')?.classList.add('feed-superseded');
    let shell=id('operational-feed');if(!shell){shell=document.createElement('div');shell.id='operational-feed';host.prepend(shell)}
    const st=state(),all=rows();
    const low=all.filter(r=>attention(r).some(x=>/baixo volume|abaixo do ritmo/i.test(x)));
    const cancel=all.filter(r=>attention(r).some(x=>/cancelamento/i.test(x)));
    const leader=[...all].sort((a,b)=>n(b.revenue)-n(a.revenue))[0];
    const best=[...all].sort((a,b)=>n(b.score)-n(a.score))[0];
    const gap=n(st.gap),actions=low.length+cancel.length;
    const posts=[];
    if(low.length){
      const first=low[0];posts.push(post({type:'danger',category:'priority',icon:'!',title:`${low.length} vendedor(es) abaixo do ritmo esperado`,text:`Comece por ${low.slice(0,2).map(r=>r.seller_name).join(' e ')}. Revise a carteira, defina um bloco de vendas e acompanhe o próximo resultado.`,meta:[['Potencial estimado',`aprox. ${cash(st.money?.lowVolume)}`],['Tempo sugerido','40 min'],['Revisão','Próximo bloco']],evidence:'Classificação baseada na comparação do volume individual com a referência atual da equipe.',primary:btn('Iniciar ação','data-feed-coach',first.seller_id),secondary:btn('Ver vendedores','data-feed-view','ranking',true)}));
    }
    if(cancel.length){
      const first=cancel[0];posts.push(post({type:'warning',category:'follow',icon:'↻',title:`Revisar cancelamento de ${cancel.length} vendedor(es)`,text:`Audite os pedidos de ${cancel.slice(0,2).map(r=>r.seller_name).join(' e ')} e aplique a confirmação estruturada antes de criar uma missão.`,meta:[['Impacto estimado',`aprox. ${cash(st.money?.cancellation)}`],['Prazo','Amanhã'],['Status','Precisa de evidência']],evidence:'O indicador de cancelamento está acima do limite configurado para a operação.',primary:btn('Abrir vendedor','data-feed-profile',first.seller_id),secondary:btn('Abrir plano','data-feed-coach',first.seller_id,true)}));
    }
    if(leader){posts.push(post({type:'success',category:'recognition',icon:avatar(leader.seller_name),author:'Destaques da equipe',title:`${leader.seller_name} lidera o faturamento`,text:`Resultado atual de ${cash(leader.revenue)}. ${best&&best.seller_id!==leader.seller_id?`${best.seller_name} possui o maior Índice Monstro (${Math.round(n(best.score))}).`:''}`,meta:[['Faturamento',cash(leader.revenue)],['Índice',String(Math.round(n(leader.score)))],['Decisão','Reconhecer']],evidence:'Destaque calculado com os dados da importação atual.',primary:btn('Ver perfil','data-feed-profile',leader.seller_id),secondary:btn('Ver equipe','data-feed-view','ranking',true)}));}
    posts.push(post({type:'info',category:'follow',icon:'AI',title:'Resumo executivo disponível',text:gap>0?`A projeção está aproximadamente ${cash(gap)} abaixo da meta. O Monstrão pode montar uma pauta curta com prioridades, riscos e reconhecimentos.`:'A projeção atual indica atingimento da meta. Use o Monstrão para organizar os próximos passos.',meta:[['Realizado',cash(st.revenue)],['Projeção',cash(st.projection)],['Meta',cash(st.target)]],primary:btn('Conversar com o Monstrão','data-feed-view','monstrao'),secondary:btn('Ver análise','data-feed-view','director',true)}));

    shell.innerHTML=`<div class="feed-layout">
      <section class="feed-center">
        <div class="feed-welcome"><div><span>Feed operacional</span><h2>Boa tarde, ${esc((window.profile?.full_name||'Caio').split(' ')[0])}.</h2><p>Veja o que mudou e aja sem precisar interpretar o sistema inteiro.</p></div><div class="feed-status"><b>${actions}</b><span>pontos de atenção</span></div></div>
        <div class="feed-stories"><button data-feed-view="warroom"><b>!</b><span>Prioridades</span></button><button data-feed-view="ranking"><b>♟</b><span>Equipe</span></button><button data-feed-view="calls"><b>◉</b><span>Ligações</span></button><button data-feed-view="academy"><b>★</b><span>Treinos</span></button><button data-feed-view="timeline"><b>↗</b><span>Histórico</span></button></div>
        <div class="feed-tabs"><button class="active" data-feed-filter="all">Tudo</button><button data-feed-filter="priority">Prioridades</button><button data-feed-filter="follow">Acompanhamentos</button><button data-feed-filter="recognition">Reconhecimentos</button></div>
        <div class="feed-stream">${posts.join('')}</div>
      </section>
      <aside class="feed-right">
        <section class="right-card goal-card"><header><b>Meta do mês</b><button data-feed-view="settings">•••</button></header><strong>${cash(st.revenue)}</strong><span>de ${cash(st.target)}</span><div class="goal-track"><i style="width:${Math.min(100,n(st.attainment)*100)}%"></i></div><small>${(n(st.attainment)*100).toFixed(1)}% realizado • projeção ${cash(st.projection)}</small></section>
        <section class="right-card"><header><b>Para hoje</b><span>${actions}</span></header><ul><li><i class="red"></i><span>Produtividade</span><b>${low.length}</b></li><li><i class="yellow"></i><span>Cancelamento</span><b>${cancel.length}</b></li><li><i class="green"></i><span>Reconhecimento</span><b>${leader?1:0}</b></li></ul><button class="right-primary" data-feed-view="warroom">Ver todas as ações</button></section>
        <section class="right-card"><header><b>Quem acompanhar</b><button data-feed-view="ranking">Ver equipe</button></header>${[...low,...cancel].filter((r,i,a)=>a.findIndex(x=>x.seller_id===r.seller_id)===i).slice(0,4).map(r=>`<button class="mini-person" data-feed-profile="${esc(r.seller_id)}"><span>${avatar(r.seller_name)}</span><div><b>${esc(r.seller_name)}</b><small>${esc(attention(r).join(' • ')||'Acompanhar')}</small></div></button>`).join('')||'<p class="empty-note">Nenhum acompanhamento crítico.</p>'}</section>
      </aside></div>`;
    bind(shell);fillSearch();
    if(id('notification-count'))id('notification-count').textContent=String(actions);
    if(id('data-freshness'))id('data-freshness').textContent=st.date?`Atualizado em ${new Date(`${st.date}T12:00:00`).toLocaleDateString('pt-BR')}`:'Aguardando importação';
  }

  function floatingAI(){
    if(id('floating-monstrao'))return;
    const b=document.createElement('button');b.id='floating-monstrao';b.innerHTML='<span>AI</span><b>Perguntar ao Monstrão</b>';b.onclick=()=>window.navigateIntegrated?.('monstrao');document.body.appendChild(b);
  }

  const previous=window.openView;
  if(typeof previous==='function')window.openView=function(name){previous(name);setTimeout(()=>{nav();topbar();if(name==='dashboard')renderFeed()},120)};
  let sig='';
  function boot(){nav();topbar();floatingAI();document.body.classList.add('feed-mode');const st=state(),s=[st.date,st.revenue,st.projection,st.opportunity,rows().length].join('|');if(s!==sig){sig=s;renderFeed()}}
  setTimeout(boot,1700);setInterval(boot,2600);
})();
