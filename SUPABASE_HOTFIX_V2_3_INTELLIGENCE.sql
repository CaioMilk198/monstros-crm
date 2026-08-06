
-- MONSTROS CRM — HOTFIX V2.3
-- Inteligência realista, oportunidades permanentes e penalidade de risco.
-- Requer o HOTFIX V2.2 já executado.

begin;

create or replace function public.get_monster_engine_payload_v23(
  p_date date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_payload jsonb;
  v_dna jsonb;
  v_item jsonb;
  v_count integer := 0;
  v_low_volume integer := 0;
  v_cancel_risk integer := 0;
  v_avg_revenue numeric := 0;
  v_reactivation_opportunity numeric := 0;
  v_ticket_opportunity numeric := 0;
  v_cancel_opportunity numeric := 0;
  v_total_opportunity numeric := 0;
  v_current_revenue numeric := 0;
  v_orders numeric := 0;
  v_old_index numeric := 0;
  v_new_index numeric := 0;
  v_revenue_health numeric := 0;
  v_ticket_health numeric := 0;
  v_cancel_health numeric := 0;
  v_active_health numeric := 0;
  v_status text;
begin
  v_payload := public.get_monster_engine_payload(p_date);

  if coalesce(v_payload->>'date','')='' then
    return v_payload;
  end if;

  v_dna := coalesce(v_payload->'seller_dna','[]'::jsonb);
  v_current_revenue := coalesce((v_payload#>>'{projection,current_revenue}')::numeric,0);
  v_orders := coalesce((
    select sum((x->>'orders')::numeric)
    from jsonb_array_elements(v_dna) x
  ),0);

  select
    count(*),
    coalesce(avg((x->>'revenue')::numeric),0)
  into v_count,v_avg_revenue
  from jsonb_array_elements(v_dna) x;

  for v_item in
    select value from jsonb_array_elements(v_dna)
  loop
    if coalesce(v_item->'attention','[]'::jsonb) @> '["Baixo volume"]'::jsonb then
      v_low_volume := v_low_volume + 1;
    end if;

    if coalesce(v_item->'attention','[]'::jsonb) @> '["Cancelamento elevado"]'::jsonb then
      v_cancel_risk := v_cancel_risk + 1;
    end if;

    v_reactivation_opportunity :=
      v_reactivation_opportunity +
      greatest(
        (v_avg_revenue*0.80) - coalesce((v_item->>'revenue')::numeric,0),
        0
      );
  end loop;

  -- O sistema sempre apresenta oportunidades práticas.
  -- Ticket: cenário mínimo de +R$ 100 por pedido.
  v_ticket_opportunity := greatest(
    coalesce((v_payload#>>'{money,ticket_opportunity}')::numeric,0),
    v_orders*100
  );

  -- Cancelamento: cenário mínimo de melhoria de 1 ponto percentual.
  v_cancel_opportunity := greatest(
    coalesce((v_payload#>>'{money,cancellation_loss}')::numeric,0),
    v_current_revenue*0.01
  );

  v_total_opportunity :=
    v_ticket_opportunity +
    v_cancel_opportunity +
    v_reactivation_opportunity;

  -- Saúde deixa de ser simplesmente "bateu a meta = 100".
  v_revenue_health := least(
    100,
    coalesce((v_payload#>>'{projection,projected_attainment}')::numeric,0)*100
  );

  v_ticket_health := greatest(
    0,
    least(
      100,
      coalesce((v_payload#>>'{health,ticket}')::numeric,0)
    )
  );

  v_cancel_health := greatest(0,100-(v_cancel_risk*7));
  v_active_health := greatest(0,100-(v_low_volume*8));

  v_old_index := round(
    v_revenue_health*0.40 +
    v_ticket_health*0.20 +
    v_cancel_health*0.25 +
    v_active_health*0.15
  ,1);

  -- Penalidade adicional quando muitos vendedores exigem ação.
  v_new_index := greatest(
    0,
    round(
      v_old_index -
      least(18,(v_low_volume*1.5)+(v_cancel_risk*1.0))
    ,1)
  );

  v_status := case
    when v_new_index>=90 then 'Excelente'
    when v_new_index>=78 then 'Saudável'
    when v_new_index>=62 then 'Atenção'
    else 'Crítica'
  end;

  v_payload := jsonb_set(
    v_payload,
    '{health}',
    jsonb_build_object(
      'monster_index',v_new_index,
      'revenue',round(v_revenue_health,1),
      'ticket',round(v_ticket_health,1),
      'cancellation',round(v_cancel_health,1),
      'active',round(v_active_health,1),
      'status',v_status,
      'low_volume_count',v_low_volume,
      'cancellation_risk_count',v_cancel_risk
    ),
    true
  );

  v_payload := jsonb_set(
    v_payload,
    '{money}',
    jsonb_build_object(
      'total_opportunity',v_total_opportunity,
      'ticket_opportunity',v_ticket_opportunity,
      'cancellation_loss',v_cancel_opportunity,
      'active_opportunity',v_reactivation_opportunity,
      'scenario_note','Cenários estimados: +R$100 no ticket, -1 p.p. no cancelamento e recuperação dos vendedores abaixo de 80% da média.'
    ),
    true
  );

  return v_payload;
end;
$$;

grant execute on function public.get_monster_engine_payload_v23(date)
to authenticated;

notify pgrst, 'reload schema';

commit;

select
  to_regprocedure(
    'public.get_monster_engine_payload_v23(date)'
  ) is not null as monster_engine_v23_existe;
