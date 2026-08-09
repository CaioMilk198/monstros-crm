console.info('MONSTROS AI 2.5 - Piloto Operacional Integrado');

(function(){
  const $p=id=>document.getElementById(id);
  const n=v=>Number(v||0);
  const m=v=>typeof money==='function'?money(v):new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n(v));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let currentCallAnalysis=null;

  function contextSeller(){
    try{return typeof selectedSeller==='function'?selectedSeller():null}catch{return null}
  }
  function updateContextStrip(){
    const bar=$p('pilot-context-strip'); if(!bar)return;
    const s=contextSeller();
    if(!s){bar.classList.add('hidden');return}
    bar.classList.remove('hidden');
    $p('pilot-context-title').textContent=s.seller_name||'Vendedor';
    $p('pilot-context-meta').textContent=`Índice ${Math.round(n(s.score))} • Receita ${m(s.revenue)} • Ticket ${m(s.average_ticket)}`;
  }
  ['context-open-profile','context-open-coach','context-create-mission'].forEach(id=>{const e=$p(id);if(!e)return;e.onclick=()=>{
    const s=contextSeller(); if(!s)return;
    if(id==='context-open-profile') window.openSeller360?.(s.seller_id);
    if(id==='context-open-coach') window.openCoach?.(s.seller_id);
    if(id==='context-create-mission') window.prefillMissionFromContext?.({sellerId:s.seller_id,title:`Plano de ação — ${s.seller_name}`,reason:'Missão criada a partir do contexto ativo do vendedor.',action:'Executar a próxima ação recomendada e registrar evidências.',impact:0,minutes:30});
  }});

  function applyRoleExperience(){
    if(!profile)return;
    document.body.dataset.role=profile.role||'user';
    const sellerRole=['seller','operator','vendedor'].includes(String(profile.role||'').toLowerCase());
    if(sellerRole){
      const allowed=new Set(['profile360','coach','calls','academy','timeline']);
      document.querySelectorAll('.nav[data-view]').forEach(b=>b.classList.toggle('role-hidden',!allowed.has(b.dataset.view)));
      if(profile.seller_id){
        try{selectSeller(profile.seller_id); ExecutionContext.sellerId=profile.seller_id; localStorage.setItem('monstros_selected_seller',profile.seller_id);}catch{}
        setTimeout(()=>{navigateIntegrated?.('profile360',{sellerId:profile.seller_id}); renderProfile360Pilot?.(profile.seller_id);},120);
      }
    }
    updateContextStrip();
  }

  // Navegação fluida: mantém contexto e anima apenas o conteúdo necessário.
  const oldOpenView=window.openView;
  if(typeof openView==='function'){
    const wrapped=function(name){oldOpenView(name);if(name==='calls'){const t=$p('view-title'),st=$p('view-subtitle');if(t)t.textContent='Ligações & QA';if(st)st.textContent='Qualidade de vendas baseada em evidências reais das ligações.';}requestAnimationFrame(()=>{document.querySelector(`#view-${name}`)?.classList.add('view-enter');setTimeout(()=>document.querySelector(`#view-${name}`)?.classList.remove('view-enter'),280);updateContextStrip();if(name==='calls')initCallLab();});};
    window.openView=wrapped;
  }

  function populateCallSellers(){
    const sel=$p('calllab-seller');if(!sel)return;
    const prev=sel.value; let rows=[]; try{rows=rankingRows()}catch{}
    sel.innerHTML='<option value="">Selecione um vendedor</option>'+rows.map(r=>`<option value="${r.seller_id}">${esc(r.seller_name)}</option>`).join('');
    const active=contextSeller(); sel.value=prev||active?.seller_id||profile?.seller_id||'';
  }

  async function loadCallHistory(){
    const box=$p('calllab-history');if(!box||!client||!profile?.company_id)return;
    box.innerHTML='<p class="muted">Carregando...</p>';
    const {data,error}=await client.from('call_recordings').select('id,seller_id,file_name,status,created_at,call_type,analysis_score,summary').eq('company_id',profile.company_id).order('created_at',{ascending:false}).limit(12);
    if(error){box.innerHTML=`<p class="muted">Histórico indisponível: ${esc(error.message)}</p>`;return}
    let rows=[];try{rows=rankingRows()}catch{}
    const names=new Map(rows.map(r=>[r.seller_id,r.seller_name]));
    box.innerHTML=(data||[]).map(r=>`<button class="call-history-row" data-call-id="${r.id}"><div><strong>${esc(names.get(r.seller_id)||'Equipe')}</strong><small>${new Date(r.created_at).toLocaleString('pt-BR')} • ${esc(r.call_type||'ligação')}</small></div><div><span class="call-status ${esc(r.status||'uploaded')}">${esc(r.status||'enviado')}</span>${r.analysis_score!=null?`<b>${Math.round(n(r.analysis_score))}/100</b>`:''}</div></button>`).join('')||'<p class="muted">Nenhuma ligação enviada ainda.</p>';
  }

  function renderCallAnalysis(a){
    currentCallAnalysis=a; const box=$p('calllab-result'),empty=$p('calllab-empty');if(!box)return;
    empty?.classList.add('hidden');box.classList.remove('hidden');
    const list=(x)=>Array.isArray(x)?x:[];
    box.innerHTML=`
      <div class="call-score"><strong>${Math.round(n(a.score))}</strong><span>/100</span><small>${esc(a.verdict||'Análise concluída')}</small></div>
      <div class="call-analysis-grid">
        <div><h4>O que funcionou</h4>${list(a.strengths).map(x=>`<p class="evidence good">✓ ${esc(x)}</p>`).join('')||'<p class="muted">Sem evidência suficiente.</p>'}</div>
        <div><h4>Onde melhorar</h4>${list(a.improvements).map(x=>`<p class="evidence warn">→ ${esc(x)}</p>`).join('')||'<p class="muted">Sem alerta relevante.</p>'}</div>
      </div>
      <div class="call-evidence-block"><h4>Evidências da ligação</h4>${list(a.evidence).map(x=>`<p>“${esc(x)}”</p>`).join('')||'<p class="muted">A análise não retornou trechos específicos.</p>'}</div>
      <div class="call-analysis-grid"><div><h4>Objeções</h4>${list(a.objections).map(x=>`<span class="analysis-chip">${esc(x)}</span>`).join('')||'<span class="muted">Nenhuma mapeada</span>'}</div><div><h4>Treino recomendado</h4><p>${esc(a.training_recommendation||'Revisar a principal oportunidade identificada.')}</p></div></div>
      <div class="call-next-action"><small>PRÓXIMA AÇÃO</small><strong>${esc(a.next_action||'Revisar a ligação com o vendedor.')}</strong></div>
      <details><summary>Ver transcrição</summary><div class="transcript">${esc(a.transcript||'')}</div></details>
      <div class="integrated-actions"><button id="call-open-coach">Abrir Coach</button><button id="call-open-academy" class="secondary">Treinar no Academy</button><button id="call-create-mission" class="secondary">Criar missão</button></div>`;
    const sellerId=$p('calllab-seller')?.value||a.seller_id;
    $p('call-open-coach').onclick=()=>sellerId&&window.openCoach?.(sellerId);
    $p('call-open-academy').onclick=()=>navigateIntegrated?.('academy',{lessonTitle:a.training_recommendation||'Treino da ligação',category:'Call QA',description:a.next_action||'Treino recomendado pela análise da ligação.'});
    $p('call-create-mission').onclick=()=>prefillMissionFromContext?.({sellerId,title:`Aplicar melhoria identificada na ligação`,reason:(a.improvements||[]).slice(0,2).join(' • ')||'Oportunidade identificada pelo Call QA.',action:a.next_action||'Aplicar ajuste e revisar nova ligação.',impact:0,minutes:30});
  }

  async function uploadAndAnalyze(){
    const file=$p('calllab-file')?.files?.[0],sellerId=$p('calllab-seller')?.value;
    if(!sellerId)return setMessage?.('calllab-message','Selecione o vendedor.','error');
    if(!file)return setMessage?.('calllab-message','Escolha um arquivo de áudio.','error');
    if(file.size>25*1024*1024)return setMessage?.('calllab-message','Para o piloto, envie arquivos de até 25 MB.','error');
    setMessage?.('calllab-message','Enviando ligação...');
    const id=crypto.randomUUID(); const ext=(file.name.split('.').pop()||'audio').replace(/[^a-z0-9]/gi,'');
    const path=`${profile.company_id}/${sellerId}/${id}.${ext}`;
    const up=await client.storage.from('call-audio').upload(path,file,{upsert:false,contentType:file.type||'audio/mpeg'});
    if(up.error)return setMessage?.('calllab-message',`Falha no upload: ${up.error.message}`,'error');
    const payload={id,company_id:profile.company_id,seller_id:sellerId,uploaded_by:profile.id,file_name:file.name,storage_path:path,call_type:$p('calllab-type')?.value||'sale',note:$p('calllab-note')?.value||null,status:'uploaded'};
    const ins=await client.from('call_recordings').insert(payload);
    if(ins.error)return setMessage?.('calllab-message',`Áudio enviado, mas o registro falhou: ${ins.error.message}`,'error');
    setMessage?.('calllab-message','Áudio enviado. Monstrão está transcrevendo e analisando...');
    const {data,error}=await client.functions.invoke('monstros-ai',{body:{action:'analyze_call',recording_id:id}});
    if(error){setMessage?.('calllab-message',`Upload concluído. A IA ainda precisa ser ativada: ${error.message}`,'error');await loadCallHistory();return}
    if(data?.analysis){renderCallAnalysis({...data.analysis,seller_id:sellerId});setMessage?.('calllab-message','Análise concluída e conectada ao vendedor.','success');}
    await loadCallHistory();
    try{await logOperationalEvent?.('call_analysis','Ligação analisada',`${contextSeller()?.seller_name||'Vendedor'} teve ligação analisada pelo Call QA. Nota ${Math.round(n(data?.analysis?.score))}/100.`,{sellerId,impact:0});}catch{}
  }

  async function initCallLab(){populateCallSellers();await loadCallHistory();const st=$p('calllab-ai-status');if(st)st.textContent='● IA conectada via Supabase Edge Function';}
  if($p('calllab-upload'))$p('calllab-upload').onclick=uploadAndAnalyze;
  if($p('calllab-refresh'))$p('calllab-refresh').onclick=loadCallHistory;

  function compactAIContext(){
    let rows=[];try{rows=rankingRows()}catch{}
    const st=typeof operationState==='function'?operationState():{};
    return {summary:{revenue:st.revenue,target:st.target,projection:st.projection,gap:st.gap,ticket:st.ticket,cancellation:st.cancellation,opportunity:st.opportunity,monsterIndex:st.monsterIndex},selected_seller:contextSeller(),top_sellers:rows.slice(0,5),attention:rows.slice(-5)};
  }
  async function sendChatAI(){
    const input=$p('chat-input'); const text=input?.value.trim();if(!text)return;
    addChatMessage?.(text,'user');input.value='';addChatMessage?.('Analisando os dados da operação...','bot');
    const box=$p('chat-box'); const pending=box?.lastElementChild;
    try{
      const {data,error}=await client.functions.invoke('monstros-ai',{body:{action:'chat',question:text,context:compactAIContext()}});
      if(error)throw error;
      if(pending)pending.remove(); addChatMessage?.(data?.answer||answerMonstrao?.(text),'bot');
      try{await logOperationalEvent?.('ai','Pergunta ao Monstrão',text,{sellerId:contextSeller()?.seller_id||null});}catch{}
    }catch(e){if(pending)pending.remove();addChatMessage?.(`${answerMonstrao?.(text)||'Não consegui responder agora.'}\n\n[Modo local: ative a Edge Function para respostas de IA completas.]`,'bot');}
  }
  if($p('chat-send'))$p('chat-send').onclick=sendChatAI;
  if($p('chat-input'))$p('chat-input').onkeydown=e=>{if(e.key==='Enter')sendChatAI();};
  document.querySelectorAll('.quick-question').forEach(b=>b.onclick=()=>{$p('chat-input').value=b.textContent;sendChatAI();});

  // Reaplica integrações quando dados e seleção mudam.
  setInterval(()=>{updateContextStrip();populateCallSellers();},2200);
  setTimeout(()=>{applyRoleExperience();updateContextStrip();},900);
})();

// Acessos do piloto: vínculo simples entre login e vendedor.
(function(){
  const el=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function loadPilotUsers(){
    const box=el('pilot-users-list');if(!box||!profile)return;
    const allowed=['admin','manager','supervisor'].includes(String(profile.role||'').toLowerCase());
    el('pilot-access-admin')?.classList.toggle('hidden',!allowed);if(!allowed)return;
    let sellers=[];try{sellers=rankingRows()}catch{}
    const {data,error}=await client.from('profiles').select('id,full_name,email,role,seller_id').eq('company_id',profile.company_id).order('full_name');
    if(error){box.innerHTML=`<p class="muted">Não foi possível listar os perfis: ${esc(error.message)}</p>`;return}
    box.innerHTML=(data||[]).map(u=>`<div class="pilot-user-row"><div><strong>${esc(u.full_name||u.email)}</strong><small>${esc(u.email||'')} • ${esc(u.role||'user')}</small></div><select data-user="${u.id}" class="pilot-user-seller"><option value="">Sem vendedor vinculado</option>${sellers.map(s=>`<option value="${s.seller_id}" ${u.seller_id===s.seller_id?'selected':''}>${esc(s.seller_name)}</option>`).join('')}</select><button data-save-user="${u.id}" class="secondary compact-button">Salvar</button></div>`).join('')||'<p class="muted">Nenhum outro login criado.</p>';
    box.querySelectorAll('[data-save-user]').forEach(b=>b.onclick=async()=>{const uid=b.dataset.saveUser,select=box.querySelector(`select[data-user="${uid}"]`);if(!select?.value)return alert('Selecione um vendedor.');b.disabled=true;b.textContent='Salvando...';const {error}=await client.rpc('assign_pilot_user',{p_user_id:uid,p_seller_id:select.value,p_role:'seller'});b.disabled=false;b.textContent=error?'Erro':'Salvo';if(error)alert(error.message);});
  }
  el('pilot-users-refresh')?.addEventListener('click',loadPilotUsers);
  setTimeout(loadPilotUsers,1200);
})();
