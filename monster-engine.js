
window.MonsterEngine = {
  payload: null,

  async load(client) {
    const today = new Date().toISOString().slice(0,10);
    const {data,error} = await client.rpc('get_monster_engine_payload',{p_date:today});
    if(error) {
      console.error('Monster Engine:',error);
      const message=error.details||error.hint||error.message||'Falha no motor de inteligência';
      ['monster-status','route-now-detail','route-projection-detail','route-money-detail'].forEach(id=>{
        const el=document.getElementById(id);
        if(el) el.textContent=message;
      });
      return null;
    }
    this.payload=data;
    return data;
  },

  money(value) {
    return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value||0));
  },

  pct(value) {
    return value==null ? '—' : `${(Number(value)*100).toFixed(1)}%`;
  },

  renderDashboard() {
    const p=this.payload;
    if(!p?.date) return;
    const h=p.health||{}, proj=p.projection||{}, m=p.money||{};
    document.getElementById('monster-index').textContent=Number(h.monster_index||0).toFixed(0);
    document.getElementById('monster-status').textContent=h.status||'—';
    document.getElementById('route-now').textContent=this.pct(proj.current_attainment);
    document.getElementById('route-now-detail').textContent=`${this.money(proj.current_revenue)} realizados`;
    document.getElementById('route-projection').textContent=this.money(proj.projected_revenue);
    document.getElementById('route-projection-detail').textContent=
      `${this.pct(proj.projected_attainment)} da meta • ${p.calendar.elapsed_business_days}/${p.calendar.total_business_days} dias úteis`;
    document.getElementById('route-money').textContent=this.money(m.total_opportunity);
    document.getElementById('route-money-detail').textContent='potencial financeiro estimado';
  },

  renderIntelligence() {
    const p=this.payload;
    if(!p?.date) return;
    const h=p.health||{}, m=p.money||{}, c=p.calendar||{}, proj=p.projection||{};
    const health=[
      ['Receita',h.revenue],['Ticket',h.ticket],['Cancelamento',h.cancellation],['Ativo',h.active]
    ];
    document.getElementById('health-bars').innerHTML=health.map(([label,value])=>`
      <div class="health-row">
        <div><span>${label}</span><strong>${Number(value||0).toFixed(0)}</strong></div>
        <div class="health-track"><div style="width:${Math.max(0,Math.min(100,Number(value||0)))}%"></div></div>
      </div>`).join('');

    const opportunities=[
      ['Aumentar ticket',m.ticket_opportunity,'Elevar o ticket até a meta configurada.'],
      ['Reduzir cancelamentos',m.cancellation_loss,'Recuperar perda acima do limite.'],
      ['Fortalecer ativo',m.active_opportunity,'Aproximar ativo de 30% da receita.']
    ].sort((a,b)=>Number(b[1])-Number(a[1]));
    document.getElementById('opportunity-list').innerHTML=opportunities.map((o,i)=>`
      <div class="opportunity-row">
        <span>${i+1}. ${o[0]}<small>${o[2]}</small></span>
        <strong>+${this.money(o[1])}</strong>
      </div>`).join('');

    document.getElementById('calendar-projection').innerHTML=`
      <div class="calendar-numbers">
        <div><strong>${c.elapsed_business_days}</strong><span>trabalhados</span></div>
        <div><strong>${c.remaining_business_days}</strong><span>restantes</span></div>
        <div><strong>${c.total_business_days}</strong><span>total</span></div>
      </div>
      <p>Ritmo atual: <strong>${this.money(c.daily_rate)}/dia</strong></p>
      <p>Ritmo necessário: <strong>${this.money(proj.required_daily_rate)}/dia</strong></p>
      <p>Projeção final: <strong>${this.money(proj.projected_revenue)}</strong></p>`;

    document.getElementById('dna-grid').innerHTML=(p.seller_dna||[]).map(s=>`
      <button class="dna-card" onclick="openSeller360('${s.seller_id}')">
        <div><strong>${s.seller_name}</strong><small>${this.pct(s.participation)} da equipe</small></div>
        <div class="dna-tags">
          ${(s.strengths||[]).filter(Boolean).slice(0,4).map(x=>`<span class="dna-strength">${x}</span>`).join('')}
          ${(s.attention||[]).filter(Boolean).slice(0,2).map(x=>`<span class="dna-attention">${x}</span>`).join('')}
        </div>
      </button>`).join('');
  },

  dnaForSeller(id) {
    return (this.payload?.seller_dna||[]).find(x=>x.seller_id===id);
  }
};
console.info('MONSTROS CRM v0.7 - Monster Engine carregado');
